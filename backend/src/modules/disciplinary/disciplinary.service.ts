import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PermissionsService } from '../permissions/permissions.service';
import { SmartPolicyTriggerService } from "../smart-policies/smart-policy-trigger.service";
import { CreateCaseDto } from './dto/create-case.dto';
import { HRReviewDto, HRInitialAction } from './dto/hr-review.dto';
import { IssueDecisionDto } from './dto/issue-decision.dto';
import { EmployeeResponseDto, EmployeeAction } from './dto/employee-response.dto';
import { ObjectionReviewDto, HRObjectionAction } from './dto/objection-review.dto';
import {
    DisciplinaryStatus,
    DisciplinaryStage,
    CaseEventType,
    DecisionType,
    PayrollAdjustmentStatus,
    DeductionBasePolicy
} from '@prisma/client';

@Injectable()
export class DisciplinaryService {
    private readonly logger = new Logger(DisciplinaryService.name);

    constructor(
        private prisma: PrismaService,
        private notificationsService: NotificationsService,
        private permissionsService: PermissionsService,
        private smartPolicyTrigger: SmartPolicyTriggerService,
    ) { }

    /**
     * الحصول على سياسة الشركة للجزاءات أو الإعدادات الافتراضية
     */
    async getPolicy(companyId: string) {
        const policy = await this.prisma.companyDisciplinaryPolicy.findUnique({
            where: { companyId },
        });

        if (policy) return policy;

        // Default policy if not set
        return {
            incidentMaxAgeDays: 30,
            decisionDeadlineDays: 30,
            objectionWindowDays: 15,
            allowRetrospectiveIncidents: false,
            autoApplyToOpenPayrollPeriod: true,
            deductionBasePolicy: DeductionBasePolicy.BASIC_FIXED,
        };
    }

    /**
     * إنشاء طلب تحقيق جديد (بواسطة مدير مباشر)
     */
    async createCase(managerId: string, companyId: string, dto: CreateCaseDto) {
        const { employeeId, title, violationType, incidentDate, incidentLocation, involvedParties, description, retrospectiveReason } = dto;

        const policy = await this.getPolicy(companyId);
        const incidentDateObj = new Date(incidentDate);
        const now = new Date();
        const ageInDays = Math.floor((now.getTime() - incidentDateObj.getTime()) / (1000 * 60 * 60 * 24));

        // Validation: Incident Age
        if (ageInDays > policy.incidentMaxAgeDays && !policy.allowRetrospectiveIncidents) {
            throw new BadRequestException(`تاريخ الواقعة قديم جداً (الحد الأقصى ${policy.incidentMaxAgeDays} يوماً)`);
        }

        if (ageInDays > policy.incidentMaxAgeDays && policy.allowRetrospectiveIncidents && !retrospectiveReason) {
            throw new BadRequestException('يجب ذكر سبب لإدخال واقعة قديمة');
        }

        // Generate Case Code (e.g., INV-2025-001)
        const year = now.getFullYear();
        const count = await this.prisma.disciplinaryCase.count({
            where: { companyId, createdAt: { gte: new Date(year, 0, 1) } }
        });
        const caseCode = `INV-${year}-${(count + 1).toString().padStart(4, '0')}`;

        const disciplinaryCase = await this.prisma.disciplinaryCase.create({
            data: {
                companyId,
                caseCode,
                employeeId,
                managerId,
                title,
                incidentDate: incidentDateObj,
                incidentLocation,
                involvedParties: involvedParties || {},
                description,
                status: DisciplinaryStatus.SUBMITTED_TO_HR,
                stage: DisciplinaryStage.MANAGER_REQUEST,
                // Snapshots
                incidentMaxAgeDaysSnapshot: policy.incidentMaxAgeDays,
                decisionDeadlineDaysSnapshot: policy.decisionDeadlineDays,
                objectionWindowDaysSnapshot: policy.objectionWindowDays,
                allowRetrospectiveSnapshot: policy.allowRetrospectiveIncidents,
                deductionBasePolicySnapshot: policy.deductionBasePolicy,
                // Retrospective
                isRetrospective: ageInDays > policy.incidentMaxAgeDays,
                retrospectiveReason,
            }
        });

        // Log Event
        await this.logEvent(disciplinaryCase.id, managerId, CaseEventType.CASE_CREATED, 'تم إنشاء طلب تحقيق جديد');

        // Notify HR
        const employee = await this.prisma.user.findUnique({
            where: { id: employeeId },
            select: { firstName: true, lastName: true }
        });
        const employeeName = `${employee?.firstName} ${employee?.lastName}`;

        await this.notificationsService.notifyHRCaseSubmitted(
            companyId,
            disciplinaryCase.id,
            disciplinaryCase.caseCode,
            employeeName
        );

        return disciplinaryCase;
    }

    /**
     * مراجعة أولية من قبل الموارد البشرية
     */
    async hrInitialReview(caseId: string, hrId: string, companyId: string, dto: HRReviewDto) {
        const disciplinaryCase = await this.findCaseOrThrow(caseId, companyId);

        if (disciplinaryCase.status !== DisciplinaryStatus.SUBMITTED_TO_HR &&
            disciplinaryCase.status !== DisciplinaryStatus.EMPLOYEE_REJECTED_INFORMAL) {
            throw new BadRequestException('هذا الطلب ليس في مرحلة المراجعة الأولية');
        }

        const { action, reason, hearingDatetime, hearingLocation } = dto;

        const updateData: any = {
            hrInitialReason: reason,
        };

        if (action === HRInitialAction.REJECT) {
            updateData.status = DisciplinaryStatus.HR_REJECTED;
            updateData.stage = DisciplinaryStage.FINAL;
            updateData.finalizedAt = new Date();
            await this.logEvent(caseId, hrId, CaseEventType.CANCELLED, `تم رفض الطلب: ${reason}`);
        } else if (action === HRInitialAction.INFORMAL_NOTICE || action === HRInitialAction.INFORMAL_WARNING) {
            updateData.status = DisciplinaryStatus.HR_INFORMAL_SENT;
            updateData.stage = DisciplinaryStage.EMPLOYEE_INFORMAL_RESPONSE;
            updateData.hrInitialAction = action === HRInitialAction.INFORMAL_NOTICE ? 'NOTICE' : 'WARNING';
            await this.logEvent(caseId, hrId, CaseEventType.INFORMAL_ACTION_SENT, `تم إرسال إجراء غير رسمي: ${updateData.hrInitialAction}`);
        } else if (action === HRInitialAction.APPROVE_OFFICIAL) {
            updateData.status = DisciplinaryStatus.OFFICIAL_INVESTIGATION_OPENED;
            updateData.stage = DisciplinaryStage.OFFICIAL_INVESTIGATION;
            updateData.officialInvestigationOpenedAt = new Date();

            if (hearingDatetime) {
                updateData.status = DisciplinaryStatus.HEARING_SCHEDULED;
                updateData.hearingDatetime = new Date(hearingDatetime);
                updateData.hearingLocation = hearingLocation;
            }

            await this.logEvent(caseId, hrId, CaseEventType.OFFICIAL_INVESTIGATION_OPENED, 'تم فتح تحقيق رسمي');
            if (hearingDatetime) {
                await this.logEvent(caseId, hrId, CaseEventType.HEARING_SCHEDULED, `تم تحديد موعد جلسة: ${hearingDatetime}`);
            }
        }

        const updatedCase = await this.prisma.disciplinaryCase.update({
            where: { id: caseId },
            data: updateData
        });

        // Notifications
        if (action === HRInitialAction.APPROVE_OFFICIAL && hearingDatetime) {
            await this.notificationsService.notifyEmployeeHearingScheduled(
                companyId,
                disciplinaryCase.employeeId,
                caseId,
                disciplinaryCase.caseCode,
                new Date(hearingDatetime),
                hearingLocation || ''
            );
        }

        return updatedCase;
    }

    /**
     * رد الموظف على الإجراء غير الرسمي
     */
    async employeeInformalResponse(caseId: string, employeeId: string, companyId: string, dto: EmployeeResponseDto) {
        const disciplinaryCase = await this.findCaseOrThrow(caseId, companyId);

        if (disciplinaryCase.employeeId !== employeeId) throw new ForbiddenException('لا يمكنك الرد على قضية موظف آخر');
        if (disciplinaryCase.status !== DisciplinaryStatus.HR_INFORMAL_SENT) throw new BadRequestException('لا يوجد إجراء غير رسمي للرد عليه');

        if (dto.action === EmployeeAction.ACCEPT) {
            await this.prisma.$transaction(async (tx) => {
                await tx.disciplinaryCase.update({
                    where: { id: caseId },
                    data: {
                        status: DisciplinaryStatus.FINALIZED_APPROVED,
                        stage: DisciplinaryStage.FINAL,
                        employeeAckStatus: 'ACCEPTED',
                        employeeAckAt: new Date(),
                        finalizedAt: new Date(),
                    }
                });

                // Record it in Disciplinary Record
                await tx.employeeDisciplinaryRecord.create({
                    data: {
                        employeeId,
                        caseId,
                        decisionType: disciplinaryCase.hrInitialAction === 'NOTICE' ? 'NOTICE' : 'WARNING',
                        reason: disciplinaryCase.hrInitialReason,
                        effectiveDate: new Date(),
                    }
                });

                await this.logEvent(caseId, employeeId, CaseEventType.EMPLOYEE_ACKNOWLEDGED, 'وافق الموظف على الإجراء غير الرسمي', tx);
            });
        } else {
            await this.prisma.disciplinaryCase.update({
                where: { id: caseId },
                data: {
                    status: DisciplinaryStatus.EMPLOYEE_REJECTED_INFORMAL,
                    stage: DisciplinaryStage.HR_INITIAL_REVIEW,
                    employeeAckStatus: 'REJECTED',
                    employeeAckAt: new Date(),
                }
            });
            await this.logEvent(caseId, employeeId, CaseEventType.EMPLOYEE_INFORMAL_RESPONSE, `رفض الموظف الإجراء الرسمي: ${dto.comment}`);
        }

        return this.prisma.disciplinaryCase.findUnique({ where: { id: caseId } });
    }

    /**
     * إصدار قرار التحقيق
     */
    async issueDecision(caseId: string, hrId: string, companyId: string, dto: IssueDecisionDto) {
        const disciplinaryCase = await this.findCaseOrThrow(caseId, companyId);

        // Validation: Stage
        if (disciplinaryCase.stage !== DisciplinaryStage.OFFICIAL_INVESTIGATION) {
            throw new BadRequestException('يجب أن تكون القضية في مرحلة التحقيق الرسمي لإصدار قرار');
        }

        // Validation: Deadline (30 days from official open)
        const openDate = disciplinaryCase.officialInvestigationOpenedAt;
        if (openDate) {
            const deadlineDays = disciplinaryCase.decisionDeadlineDaysSnapshot;
            const deadline = new Date(openDate.getTime() + deadlineDays * 24 * 60 * 60 * 1000);
            if (new Date() > deadline) {
                throw new BadRequestException(`انتهت المدة المسموحة لإصدار القرار (${deadlineDays} يوماً)`);
            }
        }

        // Validation: Payroll Period (Must not be locked)
        if (dto.payrollPeriodId) {
            const period = await this.prisma.payrollPeriod.findUnique({
                where: { id: dto.payrollPeriodId }
            });
            if (period && (period.status === 'LOCKED' || period.lockedAt)) {
                throw new BadRequestException('دورة الرواتب المختارة مغلقة نهائياً، لا يمكن إضافة جزاءات إليها');
            }
        }

        // Validation: Penalty Rules (Final Warning needs 2 prior)
        if (dto.decisionType === DecisionType.FINAL_WARNING_TERMINATION) {
            const priorWarnings = await this.prisma.employeeDisciplinaryRecord.count({
                where: {
                    employeeId: disciplinaryCase.employeeId,
                    decisionType: { in: [DecisionType.FIRST_WARNING, DecisionType.SECOND_WARNING, DecisionType.WARNING] }
                }
            });
            if (priorWarnings < 2) {
                throw new BadRequestException('لا يمكن اختيار إنذار نهائي بالفصل بدون وجود إنذارين سابقين على الأقل');
            }
        }

        // Validation: Suspension duration
        if (dto.decisionType === DecisionType.SUSPENSION_WITHOUT_PAY) {
            if (!dto.penaltyValue || dto.penaltyValue < 3 || dto.penaltyValue > 5) {
                throw new BadRequestException('الإيقاف بدون أجر يجب أن يكون بين 3 و 5 أيام');
            }
        }

        const updated = await this.prisma.disciplinaryCase.update({
            where: { id: caseId },
            data: {
                status: DisciplinaryStatus.DECISION_ISSUED,
                stage: DisciplinaryStage.DECISION,
                decisionType: dto.decisionType,
                decisionReason: dto.decisionReason,
                decisionCreatedAt: new Date(),
                penaltyUnit: dto.penaltyUnit,
                penaltyValue: dto.penaltyValue,
                penaltyEffectiveDate: dto.penaltyEffectiveDate ? new Date(dto.penaltyEffectiveDate) : null,
                payrollPeriodId: dto.payrollPeriodId,
            }
        });

        const penaltyMsg = dto.penaltyValue ? ` (الجزاء: ${dto.penaltyValue} ${dto.penaltyUnit})` : '';
        await this.logEvent(caseId, hrId, CaseEventType.DECISION_ISSUED, `تم إصدار القرار: ${dto.decisionType}${penaltyMsg}`);

        // Notify Employee
        const policy = await this.getPolicy(companyId);
        await this.notificationsService.notifyEmployeeDecisionIssued(
            companyId,
            disciplinaryCase.employeeId,
            caseId,
            disciplinaryCase.caseCode,
            policy.objectionWindowDays
        );

        return updated;
    }

    /**
     * تبديل حالة الحجز القانوني (Legal Hold)
     */
    async toggleLegalHold(caseId: string, hrId: string, companyId: string, hold: boolean) {
        const disciplinaryCase = await this.findCaseOrThrow(caseId, companyId);

        await this.prisma.disciplinaryCase.update({
            where: { id: caseId },
            data: { legalHold: hold }
        });

        const actionMsg = hold ? 'تم تفعيل الحجز القانوني' : 'تم رفع الحجز القانوني';
        await this.logEvent(caseId, hrId, CaseEventType.OBJECTION_REVIEWED, actionMsg);

        return { success: true, legalHold: hold };
    }

    /**
     * مراجعة الاعتراض من قبل الموارد البشرية
     */
    async objectionReview(caseId: string, hrId: string, companyId: string, dto: ObjectionReviewDto) {
        const disciplinaryCase = await this.findCaseOrThrow(caseId, companyId);

        if (disciplinaryCase.status !== DisciplinaryStatus.EMPLOYEE_OBJECTED) {
            throw new BadRequestException('القضية ليست في حالة انتظار مراجعة الاعتراض');
        }

        const { action, reason } = dto;
        const updateData: any = {
            hrAfterObjectionAction: action,
            hrAfterObjectionReason: reason,
        };

        if (action === HRObjectionAction.CONFIRM) {
            // Confirm previous decision, proceed to finalization (HR can then finalize manually if they want, or we can auto-finalize)
            // But usually we allow them to see it confirmed first.
            updateData.status = DisciplinaryStatus.FINALIZED_APPROVED;
            updateData.stage = DisciplinaryStage.FINAL;
            updateData.finalizedAt = new Date();
            await this.finalizeCase(caseId, hrId, companyId);
        } else if (action === HRObjectionAction.CANCEL) {
            updateData.status = DisciplinaryStatus.FINALIZED_CANCELLED;
            updateData.stage = DisciplinaryStage.FINAL;
            updateData.finalizedAt = new Date();
            await this.logEvent(caseId, hrId, CaseEventType.CANCELLED, `تم قبول الاعتراض وإلغاء الجزاء: ${reason}`);
        } else if (action === HRObjectionAction.CONTINUE) {
            updateData.status = DisciplinaryStatus.INVESTIGATION_IN_PROGRESS;
            updateData.stage = DisciplinaryStage.OFFICIAL_INVESTIGATION;
            await this.logEvent(caseId, hrId, CaseEventType.OBJECTION_REVIEWED, `تم رفض الاعتراض واستكمال التحقيق: ${reason}`);
        }

        return this.prisma.disciplinaryCase.update({
            where: { id: caseId },
            data: updateData
        });
    }

    /**
     * الاعتماد النهائي للقضية (بعد موافقة الموظف أو انتهاء مدة الاعتراض)
     */
    async finalizeCase(caseId: string, actorId: string, companyId: string) {
        return this.prisma.$transaction(async (tx) => {
            // Locking row to prevent concurrency issues
            const disciplinaryCase = await tx.$queryRaw<any[]>`
        SELECT * FROM disciplinary_cases WHERE id = ${caseId} AND company_id = ${companyId} FOR UPDATE
      `.then(rows => rows[0]);

            if (!disciplinaryCase) throw new NotFoundException('القضية غير موجودة');
            if (disciplinaryCase.finalizedAt) return disciplinaryCase;

            // Check Legal Hold
            if (disciplinaryCase.legal_hold) {
                throw new BadRequestException('لا يمكن اعتماد القضية بسبب وجود حجز قانوني (Legal Hold)');
            }

            // Update Case
            const finalized = await tx.disciplinaryCase.update({
                where: { id: caseId },
                data: {
                    status: DisciplinaryStatus.FINALIZED_APPROVED,
                    stage: DisciplinaryStage.FINAL,
                    finalizedAt: new Date(),
                }
            });

            // Create Record
            await tx.employeeDisciplinaryRecord.create({
                data: {
                    employeeId: disciplinaryCase.employee_id,
                    caseId: disciplinaryCase.id,
                    decisionType: disciplinaryCase.decision_type,
                    reason: disciplinaryCase.decision_reason,
                    effectiveDate: new Date(),
                    penaltyMetadata: {
                        unit: disciplinaryCase.penalty_unit,
                        value: disciplinaryCase.penalty_value,
                    }
                }
            });

            // Create Payroll Adjustment if needed
            if (disciplinaryCase.decision_type === DecisionType.SALARY_DEDUCTION ||
                disciplinaryCase.decision_type === DecisionType.SUSPENSION_WITHOUT_PAY) {

                if (!disciplinaryCase.payroll_period_id) {
                    throw new BadRequestException('يجب اختيار دورة راتب لتطبيق الخصم المالي');
                }

                await tx.payrollAdjustment.create({
                    data: {
                        companyId,
                        employeeId: disciplinaryCase.employee_id,
                        caseId: disciplinaryCase.id,
                        payrollPeriodId: disciplinaryCase.payroll_period_id,
                        adjustmentType: disciplinaryCase.decision_type === DecisionType.SALARY_DEDUCTION ? 'DEDUCTION' : 'SUSPENSION_UNPAID',
                        unit: disciplinaryCase.penalty_unit || 'DAYS',
                        value: disciplinaryCase.penalty_value,
                        effectiveDate: disciplinaryCase.penalty_effective_date,
                        status: PayrollAdjustmentStatus.PENDING,
                        description: `جزاء إداري - ${disciplinaryCase.case_code}`,
                    }
                });
            }

            await this.logEvent(caseId, actorId, CaseEventType.FINALIZED, 'تم اعتماد القضية نهائياً', tx);

            // Notify Employee and Manager
            await this.notificationsService.notifyCaseFinalized(
                companyId,
                disciplinaryCase.employee_id,
                disciplinaryCase.manager_id,
                disciplinaryCase.id,
                disciplinaryCase.case_code,
                disciplinaryCase.decision_type
            );

            return finalized;
        });
    }

    // --- Helpers ---

    private async findCaseOrThrow(id: string, companyId: string) {
        const disciplinaryCase = await this.prisma.disciplinaryCase.findFirst({
            where: { id, companyId },
        });
        if (!disciplinaryCase) throw new NotFoundException('القضية غير موجودة');
        return disciplinaryCase;
    }

    private async logEvent(caseId: string, actorId: string, type: CaseEventType, message: string, tx?: any) {
        const client = tx || this.prisma;
        return client.caseEvent.create({
            data: {
                caseId,
                actorUserId: actorId,
                eventType: type,
                message,
            }
        });
    }

    /**
     * تحديد موعد جلسة التحقيق
     */
    async scheduleHearing(caseId: string, hrId: string, companyId: string, dto: { hearingDatetime: string; hearingLocation: string }) {
        const disciplinaryCase = await this.findCaseOrThrow(caseId, companyId);

        if (disciplinaryCase.status !== DisciplinaryStatus.OFFICIAL_INVESTIGATION_OPENED &&
            disciplinaryCase.status !== DisciplinaryStatus.INVESTIGATION_IN_PROGRESS) {
            throw new BadRequestException('لا يمكن تحديد موعد إلا بعد فتح التحقيق الرسمي');
        }

        const updated = await this.prisma.disciplinaryCase.update({
            where: { id: caseId },
            data: {
                hearingDatetime: new Date(dto.hearingDatetime),
                hearingLocation: dto.hearingLocation,
                status: DisciplinaryStatus.HEARING_SCHEDULED,
            }
        });

        await this.logEvent(caseId, hrId, CaseEventType.HEARING_SCHEDULED, `تم تحديد جلسة: ${dto.hearingDatetime} - ${dto.hearingLocation}`);

        // Notify employee
        await this.notificationsService.notifyEmployeeHearingScheduled(
            companyId,
            disciplinaryCase.employeeId,
            caseId,
            disciplinaryCase.caseCode,
            new Date(dto.hearingDatetime),
            dto.hearingLocation
        );

        return updated;
    }

    /**
     * رفع محضر جلسة
     */
    async uploadMinutes(caseId: string, hrId: string, companyId: string, dto: { sessionNo: number; minutesText?: string; minutesFileUrl?: string }) {
        const disciplinaryCase = await this.findCaseOrThrow(caseId, companyId);

        if (disciplinaryCase.stage !== DisciplinaryStage.OFFICIAL_INVESTIGATION) {
            throw new BadRequestException('لا يمكن رفع محاضر إلا أثناء التحقيق الرسمي');
        }

        const minute = await this.prisma.caseMinute.create({
            data: {
                caseId,
                sessionNo: dto.sessionNo,
                minutesText: dto.minutesText,
                minutesFileUrl: dto.minutesFileUrl,
                createdByHrId: hrId,
            }
        });

        // Update status to in progress
        await this.prisma.disciplinaryCase.update({
            where: { id: caseId },
            data: { status: DisciplinaryStatus.INVESTIGATION_IN_PROGRESS }
        });

        await this.logEvent(caseId, hrId, CaseEventType.MINUTES_UPLOADED, `تم رفع محضر الجلسة رقم ${dto.sessionNo}`);

        return minute;
    }

    /**
     * رد الموظف على القرار النهائي (قبول أو اعتراض)
     */
    async employeeDecisionResponse(caseId: string, employeeId: string, companyId: string, dto: { action: 'ACCEPT' | 'OBJECT'; objectionText?: string }) {
        const disciplinaryCase = await this.findCaseOrThrow(caseId, companyId);

        if (disciplinaryCase.employeeId !== employeeId) {
            throw new ForbiddenException('لا يمكنك الرد على قرار خاص بموظف آخر');
        }

        if (disciplinaryCase.status !== DisciplinaryStatus.DECISION_ISSUED) {
            throw new BadRequestException('لا يوجد قرار للرد عليه');
        }

        // Check objection window using snapshot
        const decisionDate = disciplinaryCase.decisionCreatedAt;
        if (decisionDate) {
            const windowDays = disciplinaryCase.objectionWindowDaysSnapshot;
            const deadline = new Date(decisionDate.getTime() + windowDays * 24 * 60 * 60 * 1000);
            if (new Date() > deadline) {
                throw new BadRequestException(`انتهت مدة الاعتراض (${windowDays} يوماً)`);
            }
        }

        if (dto.action === 'ACCEPT') {
            // Employee accepts - finalize the case
            return this.finalizeCase(caseId, employeeId, companyId);
        } else {
            // Employee objects
            if (!dto.objectionText) {
                throw new BadRequestException('يجب كتابة نص الاعتراض');
            }

            const updated = await this.prisma.disciplinaryCase.update({
                where: { id: caseId },
                data: {
                    employeeAckStatus: 'REJECTED',
                    employeeAckAt: new Date(),
                    objectionText: dto.objectionText,
                    objectionSubmittedAt: new Date(),
                    status: DisciplinaryStatus.EMPLOYEE_OBJECTED,
                    stage: DisciplinaryStage.OBJECTION,
                }
            });

            await this.logEvent(caseId, employeeId, CaseEventType.EMPLOYEE_OBJECTED, `اعتراض الموظف: ${dto.objectionText.substring(0, 100)}...`);

            // Notify HR
            const employee = await this.prisma.user.findUnique({
                where: { id: employeeId },
                select: { firstName: true, lastName: true }
            });
            const employeeName = `${employee?.firstName} ${employee?.lastName}`;

            await this.notificationsService.notifyHREmployeeObjected(
                companyId,
                caseId,
                disciplinaryCase.caseCode,
                employeeName
            );

            return updated;
        }
    }

    /**
     * جلب القضايا حسب الدور
     */
    async getCasesForRole(userId: string, companyId: string, role: 'manager' | 'hr' | 'employee') {
        let where: any = { companyId };

        if (role === 'manager') {
            where.managerId = userId;
        } else if (role === 'employee') {
            where.employeeId = userId;
        }
        // HR sees all cases in company

        return this.prisma.disciplinaryCase.findMany({
            where,
            include: {
                employee: { select: { id: true, firstName: true, lastName: true } },
                manager: { select: { id: true, firstName: true, lastName: true } },
                events: { orderBy: { createdAt: 'desc' }, take: 5 },
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    /**
     * جلب تفاصيل قضية واحدة
     */
    async getCaseDetail(caseId: string, companyId: string, userId?: string, userRole?: string) {
        const disciplinaryCase = await this.prisma.disciplinaryCase.findFirst({
            where: { id: caseId, companyId },
            include: {
                employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
                manager: { select: { id: true, firstName: true, lastName: true } },
                events: { orderBy: { createdAt: 'asc' } },
                attachments: true,
                minutes: { orderBy: { sessionNo: 'asc' } },
                records: true,
                adjustments: true,
                payrollPeriod: true,
            }
        });

        if (!disciplinaryCase) throw new NotFoundException('القضية غير موجودة');

        // Authorization check: Only employee, manager, or HR/Admin can view case details
        if (userId && userRole) {
            const isEmployee = disciplinaryCase.employeeId === userId;
            const isManager = disciplinaryCase.managerId === userId;
            const isHROrAdmin = ['HR', 'ADMIN'].includes(userRole);

            if (!isEmployee && !isManager && !isHROrAdmin) {
                throw new ForbiddenException('لا يمكنك الوصول لتفاصيل هذه القضية');
            }
        }

        // Calculate deadlines
        const now = new Date();
        let decisionDeadline = null;
        let objectionDeadline = null;

        if (disciplinaryCase.officialInvestigationOpenedAt) {
            const deadline = new Date(disciplinaryCase.officialInvestigationOpenedAt.getTime() +
                disciplinaryCase.decisionDeadlineDaysSnapshot * 24 * 60 * 60 * 1000);
            decisionDeadline = {
                date: deadline,
                daysRemaining: Math.max(0, Math.floor((deadline.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))),
                isExpired: now > deadline,
            };
        }

        if (disciplinaryCase.decisionCreatedAt) {
            const deadline = new Date(disciplinaryCase.decisionCreatedAt.getTime() +
                disciplinaryCase.objectionWindowDaysSnapshot * 24 * 60 * 60 * 1000);
            objectionDeadline = {
                date: deadline,
                daysRemaining: Math.max(0, Math.floor((deadline.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))),
                isExpired: now > deadline,
            };
        }

        return {
            ...disciplinaryCase,
            deadlines: {
                decision: decisionDeadline,
                objection: objectionDeadline,
            }
        };
    }

    /**
     * Upload attachment to case
     */
    async uploadAttachment(caseId: string, userId: string, companyId: string, dto: { fileUrl: string; fileName: string; fileType: string }) {
        await this.findCaseOrThrow(caseId, companyId);

        return this.prisma.caseAttachment.create({
            data: {
                caseId,
                uploaderUserId: userId,
                fileUrl: dto.fileUrl,
                fileName: dto.fileName,
                fileType: dto.fileType,
            }
        });
    }

    /**
     * Upload multiple files to case (Multipart)
     */
    async uploadFiles(caseId: string, userId: string, companyId: string, files: Express.Multer.File[]) {
        await this.findCaseOrThrow(caseId, companyId);

        const savedAttachments = [];

        for (const file of files) {
            // حفظ الملف في مجلد uploads
            const fs = require('fs');
            const path = require('path');
            const uploadsDir = path.join(process.cwd(), 'uploads', 'disciplinary', caseId);

            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }

            const fileName = `${Date.now()}-${file.originalname}`;
            const filePath = path.join(uploadsDir, fileName);
            fs.writeFileSync(filePath, file.buffer);

            const fileUrl = `/uploads/disciplinary/${caseId}/${fileName}`;

            const attachment = await this.prisma.caseAttachment.create({
                data: {
                    caseId,
                    uploaderUserId: userId,
                    fileUrl,
                    fileName: file.originalname,
                    fileType: file.mimetype,
                }
            });

            savedAttachments.push(attachment);
        }

        return {
            message: `تم رفع ${savedAttachments.length} ملف بنجاح`,
            attachments: savedAttachments
        };
    }
}

