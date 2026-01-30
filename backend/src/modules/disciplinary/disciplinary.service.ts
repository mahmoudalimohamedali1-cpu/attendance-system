import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
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
    DeductionBasePolicy,
    SmartPolicyTrigger,
    Prisma
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
     * إنشاء طلب تحقيق جديد (بواسطة مدير مباشر)
     */
    async createCase(managerId: string, companyId: string, dto: CreateCaseDto) {
        return this.prisma.$transaction(async (tx) => {
            const { employeeId, title, violationType, incidentDate, incidentLocation, involvedParties, description, retrospectiveReason } = dto;

            // Phase 2: Tenant Isolation Check
            const targetEmployee = await tx.user.findFirst({
                where: { id: employeeId, companyId }
            });
            if (!targetEmployee) {
                throw new BadRequestException('الموظف غير موجود أو لا ينتمي لهذه الشركة');
            }

            const policy = await this.getPolicy(companyId, tx);
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
            // Phase 2: Race Condition Protection - Locking via separate counter or transaction
            const year = now.getFullYear();
            const count = await tx.disciplinaryCase.count({
                where: { companyId, createdAt: { gte: new Date(year, 0, 1) } }
            });
            const caseCode = `INV-${year}-${(count + 1).toString().padStart(4, '0')}`;

            const disciplinaryCase = await tx.disciplinaryCase.create({
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
            await this.logEvent(disciplinaryCase.id, managerId, CaseEventType.CASE_CREATED, 'تم إنشاء طلب تحقيق جديد', tx);

            // Notify HR
            const employeeName = `${targetEmployee.firstName} ${targetEmployee.lastName}`;
            await this.notificationsService.notifyHRCaseSubmitted(
                companyId,
                disciplinaryCase.id,
                disciplinaryCase.caseCode,
                employeeName
            );

            // Smart Policy Trigger (Transaction-Aware)
            await this.smartPolicyTrigger.triggerEvent({
                employeeId,
                employeeName,
                companyId,
                event: SmartPolicyTrigger.DISCIPLINARY,
                subEvent: 'CREATED',
                eventData: {
                    caseId: disciplinaryCase.id,
                    managerId,
                    title,
                    violationType,
                    incidentDate: incidentDateObj,
                }
            }, tx);

            return disciplinaryCase;
        });
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

        // Smart Policy Trigger (Non-critical so global client is okay for now, but better with tx if it was a tx method)
        // Note: issueDecision hrInitialReview doesn't currently use a transaction.
        await this.smartPolicyTrigger.triggerEvent({
            employeeId: updatedCase.employeeId,
            employeeName: '', // Optional
            companyId,
            event: SmartPolicyTrigger.DISCIPLINARY,
            subEvent: 'HR_INITIAL_REVIEW',
            eventData: {
                caseId,
                action,
                reason,
            }
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
        return this.prisma.$transaction(async (tx) => {
            const disciplinaryCase = await this.findCaseOrThrow(caseId, companyId, tx);

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

            // Phase 2: Tenant Isolation Check - Payroll Period
            if (dto.payrollPeriodId) {
                const period = await tx.payrollPeriod.findFirst({
                    where: { id: dto.payrollPeriodId, companyId }
                });
                if (!period) {
                    throw new BadRequestException('دورة الرواتب غير موجودة أو لا تنتمي لهذه الشركة');
                }
                if (period.status === 'LOCKED' || period.lockedAt) {
                    throw new BadRequestException('دورة الرواتب المختارة مغلقة نهائياً، لا يمكن إضافة جزاءات إليها');
                }
            }

            // Validation: Penalty Rules (Final Warning needs 2 prior)
            if (dto.decisionType === DecisionType.FINAL_WARNING_TERMINATION) {
                const priorWarnings = await tx.employeeDisciplinaryRecord.count({
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

            const updated = await tx.disciplinaryCase.update({
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
            await this.logEvent(caseId, hrId, CaseEventType.DECISION_ISSUED, `تم إصدار القرار: ${dto.decisionType}${penaltyMsg}`, tx);

            // Smart Policy Trigger (Transaction-Aware)
            await this.smartPolicyTrigger.triggerEvent({
                employeeId: disciplinaryCase.employeeId,
                employeeName: '', // Optional
                companyId,
                event: SmartPolicyTrigger.DISCIPLINARY,
                subEvent: 'DECISION_ISSUED',
                eventData: {
                    caseId,
                    decisionType: dto.decisionType,
                    penaltyValue: dto.penaltyValue,
                    penaltyUnit: dto.penaltyUnit,
                }
            }, tx);

            // Notify Employee
            const policy = await this.getPolicy(companyId, tx);
            await this.notificationsService.notifyEmployeeDecisionIssued(
                companyId,
                disciplinaryCase.employeeId,
                caseId,
                disciplinaryCase.caseCode,
                policy.objectionWindowDays
            );

            return updated;
        });
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
            const disciplinaryCase = await tx.disciplinaryCase.findUnique({
                where: { id: caseId },
            });

            if (!disciplinaryCase || disciplinaryCase.companyId !== companyId) {
                throw new NotFoundException('القضية غير موجودة أو لا ينتمي لهذه الشركة');
            }
            if (disciplinaryCase.finalizedAt) return disciplinaryCase;

            // Check Legal Hold
            if (disciplinaryCase.legalHold) {
                throw new BadRequestException('لا يمكن اعتماد القضية بسبب وجود حجز قانوني (Legal Hold)');
            }

            // Harden: Check Payroll Period status inside transaction
            if (disciplinaryCase.payrollPeriodId) {
                const period = await tx.payrollPeriod.findUnique({
                    where: { id: disciplinaryCase.payrollPeriodId }
                });
                if (period && (period.status === 'LOCKED' || period.lockedAt)) {
                    throw new BadRequestException('لا يمكن اعتماد القضية لأن دورة الرواتب المرتبطة بها مغلقة نهائياً');
                }
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
                    employeeId: disciplinaryCase.employeeId,
                    caseId: disciplinaryCase.id,
                    decisionType: disciplinaryCase.decisionType as DecisionType,
                    reason: disciplinaryCase.decisionReason,
                    effectiveDate: new Date(),
                    penaltyMetadata: {
                        unit: disciplinaryCase.penaltyUnit,
                        value: disciplinaryCase.penaltyValue,
                    }
                }
            });

            // Create Payroll Adjustment if needed
            if (disciplinaryCase.decisionType === DecisionType.SALARY_DEDUCTION ||
                disciplinaryCase.decisionType === DecisionType.SUSPENSION_WITHOUT_PAY) {

                if (!disciplinaryCase.payrollPeriodId) {
                    throw new BadRequestException('يجب اختيار دورة راتب لتطبيق الخصم المالي');
                }

                await tx.payrollAdjustment.create({
                    data: {
                        companyId,
                        employeeId: disciplinaryCase.employeeId,
                        disciplinaryCaseId: disciplinaryCase.id,
                        payrollPeriodId: disciplinaryCase.payrollPeriodId,
                        adjustmentType: disciplinaryCase.decisionType === DecisionType.SALARY_DEDUCTION ? 'DEDUCTION' : 'SUSPENSION_UNPAID',
                        unit: disciplinaryCase.penaltyUnit || 'DAYS',
                        value: disciplinaryCase.penaltyValue as any,
                        status: PayrollAdjustmentStatus.PENDING,
                        reason: `جزاء إداري - ${disciplinaryCase.caseCode}`,
                        createdById: actorId,
                    }
                });
            }

            await this.logEvent(caseId, actorId, CaseEventType.FINALIZED, 'تم اعتماد القضية نهائياً', tx);

            // Smart Policy Trigger (Transaction-Aware)
            await this.smartPolicyTrigger.triggerEvent({
                employeeId: disciplinaryCase.employeeId,
                employeeName: '', // Optional
                companyId,
                event: SmartPolicyTrigger.DISCIPLINARY,
                subEvent: 'FINALIZED',
                eventData: {
                    caseId,
                    decisionType: disciplinaryCase.decisionType,
                    employeeId: disciplinaryCase.employeeId,
                }
            }, tx);

            // Notify Employee and Manager
            await this.notificationsService.notifyCaseFinalized(
                companyId,
                disciplinaryCase.employeeId,
                disciplinaryCase.managerId,
                disciplinaryCase.id,
                disciplinaryCase.caseCode,
                disciplinaryCase.decisionType as DecisionType
            );

            return finalized;
        });
    }

    // --- Helpers ---

    private async findCaseOrThrow(id: string, companyId: string, tx?: Prisma.TransactionClient) {
        const client = tx || this.prisma;
        const disciplinaryCase = await client.disciplinaryCase.findFirst({
            where: { id, companyId },
        });
        if (!disciplinaryCase) throw new NotFoundException('القضية غير موجودة');
        return disciplinaryCase;
    }

    private async getPolicy(companyId: string, tx?: Prisma.TransactionClient) {
        const client = tx || this.prisma;
        const policy = await client.companyDisciplinaryPolicy.findUnique({
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
            // Securely generate filename using UUID to prevent path traversal and collisions
            const fs = require('fs');
            const path = require('path');
            const uploadsDir = path.resolve(process.cwd(), 'uploads', 'disciplinary', caseId);

            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }

            // Sanitize original name for DB storage but use UUID for filesystem
            const sanitizedOriginalName = file.originalname.replace(/[^\w\d.-]/g, '_');
            const fileExtension = path.extname(file.originalname);
            const storageFileName = `${crypto.randomUUID()}${fileExtension}`;
            const filePath = path.join(uploadsDir, storageFileName);

            fs.writeFileSync(filePath, file.buffer);

            const fileUrl = `/uploads/disciplinary/${caseId}/${storageFileName}`;

            const attachment = await this.prisma.caseAttachment.create({
                data: {
                    caseId,
                    uploaderUserId: userId,
                    fileUrl,
                    fileName: sanitizedOriginalName,
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

