"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var DisciplinaryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DisciplinaryService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const notifications_service_1 = require("../notifications/notifications.service");
const permissions_service_1 = require("../permissions/permissions.service");
const smart_policy_trigger_service_1 = require("../smart-policies/smart-policy-trigger.service");
const hr_review_dto_1 = require("./dto/hr-review.dto");
const employee_response_dto_1 = require("./dto/employee-response.dto");
const objection_review_dto_1 = require("./dto/objection-review.dto");
const client_1 = require("@prisma/client");
let DisciplinaryService = DisciplinaryService_1 = class DisciplinaryService {
    constructor(prisma, notificationsService, permissionsService, smartPolicyTrigger) {
        this.prisma = prisma;
        this.notificationsService = notificationsService;
        this.permissionsService = permissionsService;
        this.smartPolicyTrigger = smartPolicyTrigger;
        this.logger = new common_1.Logger(DisciplinaryService_1.name);
    }
    async getPolicy(companyId) {
        const policy = await this.prisma.companyDisciplinaryPolicy.findUnique({
            where: { companyId },
        });
        if (policy)
            return policy;
        return {
            incidentMaxAgeDays: 30,
            decisionDeadlineDays: 30,
            objectionWindowDays: 15,
            allowRetrospectiveIncidents: false,
            autoApplyToOpenPayrollPeriod: true,
            deductionBasePolicy: client_1.DeductionBasePolicy.BASIC_FIXED,
        };
    }
    async createCase(managerId, companyId, dto) {
        const { employeeId, title, violationType, incidentDate, incidentLocation, involvedParties, description, retrospectiveReason } = dto;
        const policy = await this.getPolicy(companyId);
        const incidentDateObj = new Date(incidentDate);
        const now = new Date();
        const ageInDays = Math.floor((now.getTime() - incidentDateObj.getTime()) / (1000 * 60 * 60 * 24));
        if (ageInDays > policy.incidentMaxAgeDays && !policy.allowRetrospectiveIncidents) {
            throw new common_1.BadRequestException(`تاريخ الواقعة قديم جداً (الحد الأقصى ${policy.incidentMaxAgeDays} يوماً)`);
        }
        if (ageInDays > policy.incidentMaxAgeDays && policy.allowRetrospectiveIncidents && !retrospectiveReason) {
            throw new common_1.BadRequestException('يجب ذكر سبب لإدخال واقعة قديمة');
        }
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
                status: client_1.DisciplinaryStatus.SUBMITTED_TO_HR,
                stage: client_1.DisciplinaryStage.MANAGER_REQUEST,
                incidentMaxAgeDaysSnapshot: policy.incidentMaxAgeDays,
                decisionDeadlineDaysSnapshot: policy.decisionDeadlineDays,
                objectionWindowDaysSnapshot: policy.objectionWindowDays,
                allowRetrospectiveSnapshot: policy.allowRetrospectiveIncidents,
                deductionBasePolicySnapshot: policy.deductionBasePolicy,
                isRetrospective: ageInDays > policy.incidentMaxAgeDays,
                retrospectiveReason,
            }
        });
        await this.logEvent(disciplinaryCase.id, managerId, client_1.CaseEventType.CASE_CREATED, 'تم إنشاء طلب تحقيق جديد');
        const employee = await this.prisma.user.findUnique({
            where: { id: employeeId },
            select: { firstName: true, lastName: true }
        });
        const employeeName = `${employee?.firstName} ${employee?.lastName}`;
        await this.notificationsService.notifyHRCaseSubmitted(companyId, disciplinaryCase.id, disciplinaryCase.caseCode, employeeName);
        return disciplinaryCase;
    }
    async hrInitialReview(caseId, hrId, companyId, dto) {
        const disciplinaryCase = await this.findCaseOrThrow(caseId, companyId);
        if (disciplinaryCase.status !== client_1.DisciplinaryStatus.SUBMITTED_TO_HR &&
            disciplinaryCase.status !== client_1.DisciplinaryStatus.EMPLOYEE_REJECTED_INFORMAL) {
            throw new common_1.BadRequestException('هذا الطلب ليس في مرحلة المراجعة الأولية');
        }
        const { action, reason, hearingDatetime, hearingLocation } = dto;
        const updateData = {
            hrInitialReason: reason,
        };
        if (action === hr_review_dto_1.HRInitialAction.REJECT) {
            updateData.status = client_1.DisciplinaryStatus.HR_REJECTED;
            updateData.stage = client_1.DisciplinaryStage.FINAL;
            updateData.finalizedAt = new Date();
            await this.logEvent(caseId, hrId, client_1.CaseEventType.CANCELLED, `تم رفض الطلب: ${reason}`);
        }
        else if (action === hr_review_dto_1.HRInitialAction.INFORMAL_NOTICE || action === hr_review_dto_1.HRInitialAction.INFORMAL_WARNING) {
            updateData.status = client_1.DisciplinaryStatus.HR_INFORMAL_SENT;
            updateData.stage = client_1.DisciplinaryStage.EMPLOYEE_INFORMAL_RESPONSE;
            updateData.hrInitialAction = action === hr_review_dto_1.HRInitialAction.INFORMAL_NOTICE ? 'NOTICE' : 'WARNING';
            await this.logEvent(caseId, hrId, client_1.CaseEventType.INFORMAL_ACTION_SENT, `تم إرسال إجراء غير رسمي: ${updateData.hrInitialAction}`);
        }
        else if (action === hr_review_dto_1.HRInitialAction.APPROVE_OFFICIAL) {
            updateData.status = client_1.DisciplinaryStatus.OFFICIAL_INVESTIGATION_OPENED;
            updateData.stage = client_1.DisciplinaryStage.OFFICIAL_INVESTIGATION;
            updateData.officialInvestigationOpenedAt = new Date();
            if (hearingDatetime) {
                updateData.status = client_1.DisciplinaryStatus.HEARING_SCHEDULED;
                updateData.hearingDatetime = new Date(hearingDatetime);
                updateData.hearingLocation = hearingLocation;
            }
            await this.logEvent(caseId, hrId, client_1.CaseEventType.OFFICIAL_INVESTIGATION_OPENED, 'تم فتح تحقيق رسمي');
            if (hearingDatetime) {
                await this.logEvent(caseId, hrId, client_1.CaseEventType.HEARING_SCHEDULED, `تم تحديد موعد جلسة: ${hearingDatetime}`);
            }
        }
        const updatedCase = await this.prisma.disciplinaryCase.update({
            where: { id: caseId },
            data: updateData
        });
        if (action === hr_review_dto_1.HRInitialAction.APPROVE_OFFICIAL && hearingDatetime) {
            await this.notificationsService.notifyEmployeeHearingScheduled(companyId, disciplinaryCase.employeeId, caseId, disciplinaryCase.caseCode, new Date(hearingDatetime), hearingLocation || '');
        }
        return updatedCase;
    }
    async employeeInformalResponse(caseId, employeeId, companyId, dto) {
        const disciplinaryCase = await this.findCaseOrThrow(caseId, companyId);
        if (disciplinaryCase.employeeId !== employeeId)
            throw new common_1.ForbiddenException('لا يمكنك الرد على قضية موظف آخر');
        if (disciplinaryCase.status !== client_1.DisciplinaryStatus.HR_INFORMAL_SENT)
            throw new common_1.BadRequestException('لا يوجد إجراء غير رسمي للرد عليه');
        if (dto.action === employee_response_dto_1.EmployeeAction.ACCEPT) {
            await this.prisma.$transaction(async (tx) => {
                await tx.disciplinaryCase.update({
                    where: { id: caseId },
                    data: {
                        status: client_1.DisciplinaryStatus.FINALIZED_APPROVED,
                        stage: client_1.DisciplinaryStage.FINAL,
                        employeeAckStatus: 'ACCEPTED',
                        employeeAckAt: new Date(),
                        finalizedAt: new Date(),
                    }
                });
                await tx.employeeDisciplinaryRecord.create({
                    data: {
                        employeeId,
                        caseId,
                        decisionType: disciplinaryCase.hrInitialAction === 'NOTICE' ? 'NOTICE' : 'WARNING',
                        reason: disciplinaryCase.hrInitialReason,
                        effectiveDate: new Date(),
                    }
                });
                await this.logEvent(caseId, employeeId, client_1.CaseEventType.EMPLOYEE_ACKNOWLEDGED, 'وافق الموظف على الإجراء غير الرسمي', tx);
            });
        }
        else {
            await this.prisma.disciplinaryCase.update({
                where: { id: caseId },
                data: {
                    status: client_1.DisciplinaryStatus.EMPLOYEE_REJECTED_INFORMAL,
                    stage: client_1.DisciplinaryStage.HR_INITIAL_REVIEW,
                    employeeAckStatus: 'REJECTED',
                    employeeAckAt: new Date(),
                }
            });
            await this.logEvent(caseId, employeeId, client_1.CaseEventType.EMPLOYEE_INFORMAL_RESPONSE, `رفض الموظف الإجراء الرسمي: ${dto.comment}`);
        }
        return this.prisma.disciplinaryCase.findUnique({ where: { id: caseId } });
    }
    async issueDecision(caseId, hrId, companyId, dto) {
        const disciplinaryCase = await this.findCaseOrThrow(caseId, companyId);
        if (disciplinaryCase.stage !== client_1.DisciplinaryStage.OFFICIAL_INVESTIGATION) {
            throw new common_1.BadRequestException('يجب أن تكون القضية في مرحلة التحقيق الرسمي لإصدار قرار');
        }
        const openDate = disciplinaryCase.officialInvestigationOpenedAt;
        if (openDate) {
            const deadlineDays = disciplinaryCase.decisionDeadlineDaysSnapshot;
            const deadline = new Date(openDate.getTime() + deadlineDays * 24 * 60 * 60 * 1000);
            if (new Date() > deadline) {
                throw new common_1.BadRequestException(`انتهت المدة المسموحة لإصدار القرار (${deadlineDays} يوماً)`);
            }
        }
        if (dto.payrollPeriodId) {
            const period = await this.prisma.payrollPeriod.findUnique({
                where: { id: dto.payrollPeriodId }
            });
            if (period && (period.status === 'LOCKED' || period.lockedAt)) {
                throw new common_1.BadRequestException('دورة الرواتب المختارة مغلقة نهائياً، لا يمكن إضافة جزاءات إليها');
            }
        }
        if (dto.decisionType === client_1.DecisionType.FINAL_WARNING_TERMINATION) {
            const priorWarnings = await this.prisma.employeeDisciplinaryRecord.count({
                where: {
                    employeeId: disciplinaryCase.employeeId,
                    decisionType: { in: [client_1.DecisionType.FIRST_WARNING, client_1.DecisionType.SECOND_WARNING, client_1.DecisionType.WARNING] }
                }
            });
            if (priorWarnings < 2) {
                throw new common_1.BadRequestException('لا يمكن اختيار إنذار نهائي بالفصل بدون وجود إنذارين سابقين على الأقل');
            }
        }
        if (dto.decisionType === client_1.DecisionType.SUSPENSION_WITHOUT_PAY) {
            if (!dto.penaltyValue || dto.penaltyValue < 3 || dto.penaltyValue > 5) {
                throw new common_1.BadRequestException('الإيقاف بدون أجر يجب أن يكون بين 3 و 5 أيام');
            }
        }
        const updated = await this.prisma.disciplinaryCase.update({
            where: { id: caseId },
            data: {
                status: client_1.DisciplinaryStatus.DECISION_ISSUED,
                stage: client_1.DisciplinaryStage.DECISION,
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
        await this.logEvent(caseId, hrId, client_1.CaseEventType.DECISION_ISSUED, `تم إصدار القرار: ${dto.decisionType}${penaltyMsg}`);
        const policy = await this.getPolicy(companyId);
        await this.notificationsService.notifyEmployeeDecisionIssued(companyId, disciplinaryCase.employeeId, caseId, disciplinaryCase.caseCode, policy.objectionWindowDays);
        return updated;
    }
    async toggleLegalHold(caseId, hrId, companyId, hold) {
        const disciplinaryCase = await this.findCaseOrThrow(caseId, companyId);
        await this.prisma.disciplinaryCase.update({
            where: { id: caseId },
            data: { legalHold: hold }
        });
        const actionMsg = hold ? 'تم تفعيل الحجز القانوني' : 'تم رفع الحجز القانوني';
        await this.logEvent(caseId, hrId, client_1.CaseEventType.OBJECTION_REVIEWED, actionMsg);
        return { success: true, legalHold: hold };
    }
    async objectionReview(caseId, hrId, companyId, dto) {
        const disciplinaryCase = await this.findCaseOrThrow(caseId, companyId);
        if (disciplinaryCase.status !== client_1.DisciplinaryStatus.EMPLOYEE_OBJECTED) {
            throw new common_1.BadRequestException('القضية ليست في حالة انتظار مراجعة الاعتراض');
        }
        const { action, reason } = dto;
        const updateData = {
            hrAfterObjectionAction: action,
            hrAfterObjectionReason: reason,
        };
        if (action === objection_review_dto_1.HRObjectionAction.CONFIRM) {
            updateData.status = client_1.DisciplinaryStatus.FINALIZED_APPROVED;
            updateData.stage = client_1.DisciplinaryStage.FINAL;
            updateData.finalizedAt = new Date();
            await this.finalizeCase(caseId, hrId, companyId);
        }
        else if (action === objection_review_dto_1.HRObjectionAction.CANCEL) {
            updateData.status = client_1.DisciplinaryStatus.FINALIZED_CANCELLED;
            updateData.stage = client_1.DisciplinaryStage.FINAL;
            updateData.finalizedAt = new Date();
            await this.logEvent(caseId, hrId, client_1.CaseEventType.CANCELLED, `تم قبول الاعتراض وإلغاء الجزاء: ${reason}`);
        }
        else if (action === objection_review_dto_1.HRObjectionAction.CONTINUE) {
            updateData.status = client_1.DisciplinaryStatus.INVESTIGATION_IN_PROGRESS;
            updateData.stage = client_1.DisciplinaryStage.OFFICIAL_INVESTIGATION;
            await this.logEvent(caseId, hrId, client_1.CaseEventType.OBJECTION_REVIEWED, `تم رفض الاعتراض واستكمال التحقيق: ${reason}`);
        }
        return this.prisma.disciplinaryCase.update({
            where: { id: caseId },
            data: updateData
        });
    }
    async finalizeCase(caseId, actorId, companyId) {
        return this.prisma.$transaction(async (tx) => {
            const disciplinaryCase = await tx.$queryRaw `
        SELECT * FROM disciplinary_cases WHERE id = ${caseId} AND company_id = ${companyId} FOR UPDATE
      `.then(rows => rows[0]);
            if (!disciplinaryCase)
                throw new common_1.NotFoundException('القضية غير موجودة');
            if (disciplinaryCase.finalizedAt)
                return disciplinaryCase;
            if (disciplinaryCase.legal_hold) {
                throw new common_1.BadRequestException('لا يمكن اعتماد القضية بسبب وجود حجز قانوني (Legal Hold)');
            }
            const finalized = await tx.disciplinaryCase.update({
                where: { id: caseId },
                data: {
                    status: client_1.DisciplinaryStatus.FINALIZED_APPROVED,
                    stage: client_1.DisciplinaryStage.FINAL,
                    finalizedAt: new Date(),
                }
            });
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
            if (disciplinaryCase.decision_type === client_1.DecisionType.SALARY_DEDUCTION ||
                disciplinaryCase.decision_type === client_1.DecisionType.SUSPENSION_WITHOUT_PAY) {
                if (!disciplinaryCase.payroll_period_id) {
                    throw new common_1.BadRequestException('يجب اختيار دورة راتب لتطبيق الخصم المالي');
                }
                await tx.payrollAdjustment.create({
                    data: {
                        companyId,
                        employeeId: disciplinaryCase.employee_id,
                        caseId: disciplinaryCase.id,
                        payrollPeriodId: disciplinaryCase.payroll_period_id,
                        adjustmentType: disciplinaryCase.decision_type === client_1.DecisionType.SALARY_DEDUCTION ? 'DEDUCTION' : 'SUSPENSION_UNPAID',
                        unit: disciplinaryCase.penalty_unit || 'DAYS',
                        value: disciplinaryCase.penalty_value,
                        effectiveDate: disciplinaryCase.penalty_effective_date,
                        status: client_1.PayrollAdjustmentStatus.PENDING,
                        description: `جزاء إداري - ${disciplinaryCase.case_code}`,
                    }
                });
            }
            await this.logEvent(caseId, actorId, client_1.CaseEventType.FINALIZED, 'تم اعتماد القضية نهائياً', tx);
            await this.notificationsService.notifyCaseFinalized(companyId, disciplinaryCase.employee_id, disciplinaryCase.manager_id, disciplinaryCase.id, disciplinaryCase.case_code, disciplinaryCase.decision_type);
            return finalized;
        });
    }
    async findCaseOrThrow(id, companyId) {
        const disciplinaryCase = await this.prisma.disciplinaryCase.findFirst({
            where: { id, companyId },
        });
        if (!disciplinaryCase)
            throw new common_1.NotFoundException('القضية غير موجودة');
        return disciplinaryCase;
    }
    async logEvent(caseId, actorId, type, message, tx) {
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
    async scheduleHearing(caseId, hrId, companyId, dto) {
        const disciplinaryCase = await this.findCaseOrThrow(caseId, companyId);
        if (disciplinaryCase.status !== client_1.DisciplinaryStatus.OFFICIAL_INVESTIGATION_OPENED &&
            disciplinaryCase.status !== client_1.DisciplinaryStatus.INVESTIGATION_IN_PROGRESS) {
            throw new common_1.BadRequestException('لا يمكن تحديد موعد إلا بعد فتح التحقيق الرسمي');
        }
        const updated = await this.prisma.disciplinaryCase.update({
            where: { id: caseId },
            data: {
                hearingDatetime: new Date(dto.hearingDatetime),
                hearingLocation: dto.hearingLocation,
                status: client_1.DisciplinaryStatus.HEARING_SCHEDULED,
            }
        });
        await this.logEvent(caseId, hrId, client_1.CaseEventType.HEARING_SCHEDULED, `تم تحديد جلسة: ${dto.hearingDatetime} - ${dto.hearingLocation}`);
        await this.notificationsService.notifyEmployeeHearingScheduled(companyId, disciplinaryCase.employeeId, caseId, disciplinaryCase.caseCode, new Date(dto.hearingDatetime), dto.hearingLocation);
        return updated;
    }
    async uploadMinutes(caseId, hrId, companyId, dto) {
        const disciplinaryCase = await this.findCaseOrThrow(caseId, companyId);
        if (disciplinaryCase.stage !== client_1.DisciplinaryStage.OFFICIAL_INVESTIGATION) {
            throw new common_1.BadRequestException('لا يمكن رفع محاضر إلا أثناء التحقيق الرسمي');
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
        await this.prisma.disciplinaryCase.update({
            where: { id: caseId },
            data: { status: client_1.DisciplinaryStatus.INVESTIGATION_IN_PROGRESS }
        });
        await this.logEvent(caseId, hrId, client_1.CaseEventType.MINUTES_UPLOADED, `تم رفع محضر الجلسة رقم ${dto.sessionNo}`);
        return minute;
    }
    async employeeDecisionResponse(caseId, employeeId, companyId, dto) {
        const disciplinaryCase = await this.findCaseOrThrow(caseId, companyId);
        if (disciplinaryCase.employeeId !== employeeId) {
            throw new common_1.ForbiddenException('لا يمكنك الرد على قرار خاص بموظف آخر');
        }
        if (disciplinaryCase.status !== client_1.DisciplinaryStatus.DECISION_ISSUED) {
            throw new common_1.BadRequestException('لا يوجد قرار للرد عليه');
        }
        const decisionDate = disciplinaryCase.decisionCreatedAt;
        if (decisionDate) {
            const windowDays = disciplinaryCase.objectionWindowDaysSnapshot;
            const deadline = new Date(decisionDate.getTime() + windowDays * 24 * 60 * 60 * 1000);
            if (new Date() > deadline) {
                throw new common_1.BadRequestException(`انتهت مدة الاعتراض (${windowDays} يوماً)`);
            }
        }
        if (dto.action === 'ACCEPT') {
            return this.finalizeCase(caseId, employeeId, companyId);
        }
        else {
            if (!dto.objectionText) {
                throw new common_1.BadRequestException('يجب كتابة نص الاعتراض');
            }
            const updated = await this.prisma.disciplinaryCase.update({
                where: { id: caseId },
                data: {
                    employeeAckStatus: 'REJECTED',
                    employeeAckAt: new Date(),
                    objectionText: dto.objectionText,
                    objectionSubmittedAt: new Date(),
                    status: client_1.DisciplinaryStatus.EMPLOYEE_OBJECTED,
                    stage: client_1.DisciplinaryStage.OBJECTION,
                }
            });
            await this.logEvent(caseId, employeeId, client_1.CaseEventType.EMPLOYEE_OBJECTED, `اعتراض الموظف: ${dto.objectionText.substring(0, 100)}...`);
            const employee = await this.prisma.user.findUnique({
                where: { id: employeeId },
                select: { firstName: true, lastName: true }
            });
            const employeeName = `${employee?.firstName} ${employee?.lastName}`;
            await this.notificationsService.notifyHREmployeeObjected(companyId, caseId, disciplinaryCase.caseCode, employeeName);
            return updated;
        }
    }
    async getCasesForRole(userId, companyId, role) {
        let where = { companyId };
        if (role === 'manager') {
            where.managerId = userId;
        }
        else if (role === 'employee') {
            where.employeeId = userId;
        }
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
    async getCaseDetail(caseId, companyId) {
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
        if (!disciplinaryCase)
            throw new common_1.NotFoundException('القضية غير موجودة');
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
    async uploadAttachment(caseId, userId, companyId, dto) {
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
    async uploadFiles(caseId, userId, companyId, files) {
        await this.findCaseOrThrow(caseId, companyId);
        const savedAttachments = [];
        for (const file of files) {
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
};
exports.DisciplinaryService = DisciplinaryService;
exports.DisciplinaryService = DisciplinaryService = DisciplinaryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService,
        permissions_service_1.PermissionsService,
        smart_policy_trigger_service_1.SmartPolicyTriggerService])
], DisciplinaryService);
//# sourceMappingURL=disciplinary.service.js.map