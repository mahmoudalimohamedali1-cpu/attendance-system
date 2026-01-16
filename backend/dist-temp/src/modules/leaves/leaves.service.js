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
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeavesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const notifications_service_1 = require("../notifications/notifications.service");
const permissions_service_1 = require("../permissions/permissions.service");
const timezone_service_1 = require("../../common/services/timezone.service");
const client_1 = require("@prisma/client");
const smart_policy_trigger_service_1 = require("../smart-policies/smart-policy-trigger.service");
let LeavesService = class LeavesService {
    constructor(prisma, notificationsService, permissionsService, smartPolicyTrigger, timezoneService) {
        this.prisma = prisma;
        this.notificationsService = notificationsService;
        this.permissionsService = permissionsService;
        this.smartPolicyTrigger = smartPolicyTrigger;
        this.timezoneService = timezoneService;
    }
    async createLeaveRequest(userId, companyId, createLeaveDto) {
        const { type, startDate, endDate, reason, notes, attachments } = createLeaveDto;
        const leaveNotes = reason || notes || '';
        console.log('📎 Received attachments:', JSON.stringify(attachments));
        console.log('📎 Attachments type:', typeof attachments);
        console.log('📎 Is Array:', Array.isArray(attachments));
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (end < start) {
            throw new common_1.BadRequestException('تاريخ النهاية يجب أن يكون بعد تاريخ البداية');
        }
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const requestedDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        const user = await this.prisma.user.findFirst({ where: { id: userId, companyId } });
        if (user && user.remainingLeaveDays < requestedDays) {
            throw new common_1.BadRequestException(`رصيد الإجازات غير كافي. المتبقي: ${user.remainingLeaveDays} يوم`);
        }
        const existingLeave = await this.prisma.leaveRequest.findFirst({
            where: {
                userId,
                companyId,
                status: { in: ['PENDING', 'APPROVED', 'MGR_APPROVED', 'DELAYED'] },
                OR: [
                    { startDate: { lte: end }, endDate: { gte: start } },
                ],
            },
        });
        if (existingLeave) {
            throw new common_1.BadRequestException('يوجد طلب إجازة متداخل مع هذه الفترة');
        }
        const userWithManager = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { managerId: true },
        });
        const leaveRequest = await this.prisma.leaveRequest.create({
            data: {
                userId,
                companyId,
                type,
                startDate: start,
                endDate: end,
                requestedDays,
                notes: leaveNotes,
                reason: leaveNotes,
                attachments: attachments && attachments.length > 0
                    ? attachments
                    : undefined,
                currentStep: 'MANAGER',
                managerApproverId: userWithManager?.managerId || null,
                managerDecision: 'PENDING',
                hrDecision: 'PENDING',
            },
            include: {
                user: {
                    select: { firstName: true, lastName: true, managerId: true },
                },
            },
        });
        const leaveWithUser = leaveRequest;
        const notificationPromises = [];
        const notificationMessage = `${leaveWithUser.user.firstName} ${leaveWithUser.user.lastName} طلب ${this.getLeaveTypeName(type)}`;
        if (leaveWithUser.user?.managerId) {
            notificationPromises.push(this.notificationsService.sendNotification(leaveWithUser.user.managerId, client_1.NotificationType.GENERAL, 'طلب إجازة جديد', notificationMessage, { leaveRequestId: leaveRequest.id }));
        }
        const hrUsers = await this.prisma.user.findMany({
            where: { companyId, role: 'HR', status: 'ACTIVE' },
            select: { id: true },
            take: 5,
        });
        for (const hr of hrUsers) {
            notificationPromises.push(this.notificationsService.sendNotification(hr.id, client_1.NotificationType.GENERAL, 'طلب إجازة جديد للمراجعة', notificationMessage, { leaveRequestId: leaveRequest.id }));
        }
        await Promise.allSettled(notificationPromises);
        return leaveRequest;
    }
    async getMyLeaveRequests(userId, companyId, query) {
        const { status, type, page = 1, limit = 20 } = query;
        const where = { userId, companyId };
        if (status)
            where.status = status;
        if (type)
            where.type = type;
        const [requests, total] = await Promise.all([
            this.prisma.leaveRequest.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    approver: { select: { firstName: true, lastName: true } },
                },
            }),
            this.prisma.leaveRequest.count({ where }),
        ]);
        return {
            data: requests,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async getLeaveRequestById(id, companyId, userId) {
        const leaveRequest = await this.prisma.leaveRequest.findFirst({
            where: { id, companyId },
            include: {
                user: {
                    select: { id: true, firstName: true, lastName: true, employeeCode: true },
                },
                approver: { select: { firstName: true, lastName: true } },
            },
        });
        if (!leaveRequest) {
            throw new common_1.NotFoundException('طلب الإجازة غير موجود');
        }
        if (userId && leaveRequest.userId !== userId) {
            const user = await this.prisma.user.findUnique({ where: { id: userId } });
            if (user?.role === 'EMPLOYEE') {
                throw new common_1.ForbiddenException('غير مصرح بالوصول لهذا الطلب');
            }
        }
        return leaveRequest;
    }
    async getLeaveRequestWithEmployeeContext(id, companyId, requesterId) {
        const leaveRequest = await this.prisma.leaveRequest.findFirst({
            where: { id, companyId },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        employeeCode: true,
                        jobTitle: true,
                        hireDate: true,
                        annualLeaveDays: true,
                        usedLeaveDays: true,
                        remainingLeaveDays: true,
                        branch: { select: { id: true, name: true } },
                        department: { select: { id: true, name: true } },
                    },
                },
                approver: { select: { firstName: true, lastName: true } },
                managerApprover: { select: { firstName: true, lastName: true } },
                hrApprover: { select: { firstName: true, lastName: true } },
            },
        });
        if (!leaveRequest) {
            throw new common_1.NotFoundException('طلب الإجازة غير موجود');
        }
        const requester = await this.prisma.user.findUnique({ where: { id: requesterId } });
        if (!requester) {
            throw new common_1.ForbiddenException('مستخدم غير موجود');
        }
        if (requester.role === 'EMPLOYEE' && leaveRequest.userId !== requesterId) {
            throw new common_1.ForbiddenException('غير مصرح بالوصول لهذا الطلب');
        }
        const currentYear = new Date().getFullYear();
        const { startOfYear, endOfYear } = this.timezoneService.getYearRange(currentYear);
        const currentYearLeaveRequests = await this.prisma.leaveRequest.findMany({
            where: {
                userId: leaveRequest.userId,
                createdAt: {
                    gte: startOfYear,
                    lte: endOfYear,
                },
            },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                type: true,
                startDate: true,
                endDate: true,
                requestedDays: true,
                approvedDays: true,
                status: true,
                createdAt: true,
            },
        });
        const leaveSummary = {
            totalRequests: currentYearLeaveRequests.length,
            approvedDays: currentYearLeaveRequests
                .filter(r => r.status === 'APPROVED')
                .reduce((sum, r) => sum + (r.approvedDays || r.requestedDays), 0),
            pendingDays: currentYearLeaveRequests
                .filter(r => r.status === 'PENDING')
                .reduce((sum, r) => sum + r.requestedDays, 0),
            rejectedRequests: currentYearLeaveRequests.filter(r => r.status === 'REJECTED').length,
        };
        const leaveData = leaveRequest;
        return {
            ...leaveData,
            employeeContext: {
                hireDate: leaveData.user?.hireDate,
                annualLeaveDays: leaveData.user?.annualLeaveDays,
                usedLeaveDays: leaveData.user?.usedLeaveDays,
                remainingLeaveDays: leaveData.user?.remainingLeaveDays,
                branch: leaveData.user?.branch,
                department: leaveData.user?.department,
            },
            currentYearLeaveRequests,
            leaveSummary,
        };
    }
    async cancelLeaveRequest(id, companyId, userId) {
        const leaveRequest = await this.prisma.leaveRequest.findFirst({
            where: { id, companyId },
        });
        if (!leaveRequest) {
            throw new common_1.NotFoundException('طلب الإجازة غير موجود');
        }
        if (leaveRequest.userId !== userId) {
            throw new common_1.ForbiddenException('لا يمكنك إلغاء طلب إجازة شخص آخر');
        }
        if (!['PENDING', 'MGR_APPROVED'].includes(leaveRequest.status)) {
            throw new common_1.BadRequestException('لا يمكن إلغاء طلب تمت الموافقة عليه بالكامل');
        }
        return this.prisma.leaveRequest.update({
            where: { id },
            data: { status: 'CANCELLED' },
        });
    }
    async getPendingRequests(userId, companyId, query) {
        const { page = 1, limit = 20, status = 'PENDING' } = query || {};
        const [viewAccessible, approveAccessible] = await Promise.all([
            this.permissionsService.getAccessibleEmployeeIds(userId, companyId, 'LEAVES_VIEW'),
            this.permissionsService.getAccessibleEmployeeIds(userId, companyId, 'LEAVES_APPROVE_MANAGER'),
        ]);
        const accessibleEmployeeIds = [...new Set([...viewAccessible, ...approveAccessible])];
        if (accessibleEmployeeIds.length === 0) {
            return {
                data: [],
                pagination: { page, limit, total: 0, totalPages: 0 },
            };
        }
        const where = {
            status,
            companyId,
            userId: { in: accessibleEmployeeIds },
        };
        const [requests, total] = await Promise.all([
            this.prisma.leaveRequest.findMany({
                where,
                orderBy: { createdAt: 'asc' },
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            employeeCode: true,
                            jobTitle: true,
                            department: { select: { name: true } },
                        },
                    },
                },
            }),
            this.prisma.leaveRequest.count({ where }),
        ]);
        return {
            data: requests,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async approveLeaveRequest(id, companyId, approverId, notes) {
        const leaveRequest = await this.prisma.leaveRequest.findFirst({
            where: { id, companyId },
            include: { user: true },
        });
        if (!leaveRequest) {
            throw new common_1.NotFoundException('طلب الإجازة غير موجود');
        }
        const currentStep = leaveRequest.currentStep || 'MANAGER';
        if (currentStep === 'MANAGER') {
            if (leaveRequest.managerApproverId === approverId) {
                return this.managerDecision(id, companyId, approverId, 'APPROVED', notes);
            }
            const canApprove = await this.permissionsService.canAccessEmployee(approverId, companyId, 'LEAVES_APPROVE_MANAGER', leaveRequest.userId);
            if (canApprove.hasAccess) {
                return this.managerDecision(id, companyId, approverId, 'APPROVED', notes);
            }
            throw new common_1.ForbiddenException('ليس لديك صلاحية الموافقة على طلبات هذا الموظف');
        }
        else if (currentStep === 'HR') {
            return this.hrDecision(id, companyId, approverId, 'APPROVED', notes);
        }
        else {
            throw new common_1.BadRequestException('هذا الطلب تم البت فيه مسبقاً');
        }
    }
    async rejectLeaveRequest(id, companyId, approverId, notes) {
        const leaveRequest = await this.prisma.leaveRequest.findFirst({
            where: { id, companyId },
        });
        if (!leaveRequest) {
            throw new common_1.NotFoundException('طلب الإجازة غير موجود');
        }
        const currentStep = leaveRequest.currentStep || 'MANAGER';
        if (currentStep === 'MANAGER') {
            if (leaveRequest.managerApproverId === approverId) {
                return this.managerDecision(id, companyId, approverId, 'REJECTED', notes);
            }
            const canApprove = await this.permissionsService.canAccessEmployee(approverId, companyId, 'LEAVES_APPROVE_MANAGER', leaveRequest.userId);
            if (canApprove.hasAccess) {
                return this.managerDecision(id, companyId, approverId, 'REJECTED', notes);
            }
            throw new common_1.ForbiddenException('ليس لديك صلاحية رفض طلبات هذا الموظف');
        }
        else if (currentStep === 'HR') {
            return this.hrDecision(id, companyId, approverId, 'REJECTED', notes);
        }
        else {
            throw new common_1.BadRequestException('هذا الطلب تم البت فيه مسبقاً');
        }
    }
    async getAllLeaveRequests(companyId, query) {
        const { status, type, userId, page = 1, limit = 20 } = query;
        const where = { companyId };
        if (status)
            where.status = status;
        if (type)
            where.type = type;
        if (userId)
            where.userId = userId;
        const [requests, total] = await Promise.all([
            this.prisma.leaveRequest.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            employeeCode: true,
                            department: { select: { name: true } },
                        },
                    },
                    approver: { select: { firstName: true, lastName: true } },
                },
            }),
            this.prisma.leaveRequest.count({ where }),
        ]);
        return {
            data: requests,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async enableWorkFromHome(userId, companyId, date, reason, approverId) {
        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);
        const existingWfh = await this.prisma.workFromHome.findUnique({
            where: {
                userId_date: {
                    userId,
                    date: targetDate,
                },
            },
        });
        if (existingWfh) {
            throw new common_1.BadRequestException('العمل من المنزل مفعل مسبقاً لهذا اليوم');
        }
        const MAX_CONSECUTIVE_WFH_DAYS = 7;
        const recentWfhCount = await this.prisma.workFromHome.count({
            where: {
                userId,
                date: {
                    gte: new Date(targetDate.getTime() - (MAX_CONSECUTIVE_WFH_DAYS - 1) * 24 * 60 * 60 * 1000),
                    lt: targetDate,
                },
            },
        });
        if (recentWfhCount >= MAX_CONSECUTIVE_WFH_DAYS - 1) {
            throw new common_1.BadRequestException(`لا يمكن العمل من المنزل أكثر من ${MAX_CONSECUTIVE_WFH_DAYS} أيام متتالية`);
        }
        return this.prisma.workFromHome.create({
            data: {
                userId,
                companyId,
                date: targetDate,
                reason,
                approvedBy: approverId,
            },
        });
    }
    async disableWorkFromHome(userId, companyId, date) {
        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);
        const existingWfh = await this.prisma.workFromHome.findUnique({
            where: {
                userId_date: {
                    userId,
                    date: targetDate,
                },
            },
        });
        if (!existingWfh) {
            throw new common_1.NotFoundException('لا يوجد سجل عمل من المنزل لهذا اليوم');
        }
        if (existingWfh.companyId !== companyId) {
            throw new common_1.ForbiddenException('لا يمكنك إلغاء سجل عمل من شركة أخرى');
        }
        await this.prisma.workFromHome.delete({
            where: {
                userId_date: {
                    userId,
                    date: targetDate,
                },
            },
        });
        return { message: 'تم إلغاء العمل من المنزل' };
    }
    getLeaveTypeName(type) {
        const types = {
            ANNUAL: 'إجازة سنوية',
            SICK: 'إجازة مرضية',
            NEW_BABY: 'مولود جديد',
            MARRIAGE: 'إجازة زواج',
            BEREAVEMENT: 'إجازة وفاة',
            HAJJ: 'إجازة حج',
            EXAM: 'إجازة اختبارات',
            WORK_MISSION: 'مهمة عمل',
            UNPAID: 'إجازة بدون راتب',
        };
        return types[type] || type;
    }
    async createLeaveAttendanceRecords(leaveRequest) {
        const user = await this.prisma.user.findFirst({
            where: { id: leaveRequest.userId, companyId: leaveRequest.companyId },
        });
        if (!user?.branchId)
            return;
        const start = new Date(leaveRequest.startDate);
        const end = new Date(leaveRequest.endDate);
        for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
            const targetDate = new Date(date);
            targetDate.setHours(0, 0, 0, 0);
            await this.prisma.attendance.upsert({
                where: {
                    userId_date: {
                        userId: leaveRequest.userId,
                        date: targetDate,
                    },
                },
                create: {
                    userId: leaveRequest.userId,
                    companyId: leaveRequest.companyId,
                    branchId: user.branchId,
                    date: targetDate,
                    status: 'ON_LEAVE',
                    notes: `${this.getLeaveTypeName(leaveRequest.type)}${leaveRequest.notes ? ': ' + leaveRequest.notes : ''}`,
                },
                update: {
                    status: 'ON_LEAVE',
                    notes: `${this.getLeaveTypeName(leaveRequest.type)}${leaveRequest.notes ? ': ' + leaveRequest.notes : ''}`,
                },
            });
        }
    }
    async deductLeaveBalance(userId, companyId, days, leaveTypeId) {
        const user = await this.prisma.user.findFirst({
            where: { id: userId, companyId },
            select: { remainingLeaveDays: true, annualLeaveDays: true },
        });
        if (user) {
            const remaining = Number(user.remainingLeaveDays) || 0;
            if (remaining < days) {
                console.warn(`⚠️ Insufficient leave balance for user ${userId}: remaining=${remaining}, deducting=${days}`);
            }
        }
        await this.prisma.user.updateMany({
            where: { id: userId, companyId },
            data: {
                usedLeaveDays: { increment: days },
                remainingLeaveDays: { decrement: days },
            },
        });
    }
    async getManagerInbox(managerId, companyId) {
        const accessibleEmployeeIds = await this.permissionsService.getAccessibleEmployeeIds(managerId, companyId, 'LEAVES_APPROVE_MANAGER');
        if (accessibleEmployeeIds.length === 0) {
            return [];
        }
        return this.prisma.leaveRequest.findMany({
            where: {
                companyId,
                userId: { in: accessibleEmployeeIds },
                currentStep: 'MANAGER',
                status: 'PENDING',
            },
            orderBy: { createdAt: 'asc' },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        employeeCode: true,
                        jobTitle: true,
                        department: { select: { name: true } },
                    },
                },
            },
        });
    }
    async getHRInbox(hrUserId, companyId) {
        const accessibleEmployeeIds = await this.permissionsService.getAccessibleEmployeeIds(hrUserId, companyId, 'LEAVES_APPROVE_HR');
        if (accessibleEmployeeIds.length === 0) {
            return [];
        }
        return this.prisma.leaveRequest.findMany({
            where: {
                companyId,
                userId: { in: accessibleEmployeeIds },
                currentStep: 'HR',
                status: 'MGR_APPROVED',
            },
            orderBy: { createdAt: 'asc' },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        employeeCode: true,
                        jobTitle: true,
                        department: { select: { name: true } },
                        branch: { select: { name: true } },
                    },
                },
                managerApprover: {
                    select: { firstName: true, lastName: true },
                },
            },
        });
    }
    async managerDecision(requestId, companyId, managerId, decision, notes) {
        const request = await this.prisma.leaveRequest.findFirst({
            where: { id: requestId, companyId },
            include: { user: true },
        });
        if (!request) {
            throw new common_1.NotFoundException('طلب الإجازة غير موجود');
        }
        if (request.managerApproverId !== managerId) {
            throw new common_1.ForbiddenException('ليس لديك صلاحية للموافقة على هذا الطلب');
        }
        if (request.currentStep !== 'MANAGER') {
            throw new common_1.BadRequestException('هذا الطلب ليس في مرحلة موافقة المدير');
        }
        if (decision === 'APPROVED') {
            await this.prisma.leaveRequest.update({
                where: { id: requestId },
                data: {
                    managerDecision: 'APPROVED',
                    managerDecisionAt: new Date(),
                    managerNotes: notes,
                    currentStep: 'HR',
                    status: 'MGR_APPROVED',
                },
            });
            const hrUsers = await this.prisma.user.findMany({
                where: {
                    companyId,
                    role: { in: ['HR', 'ADMIN'] },
                },
                select: { id: true },
            });
            for (const hrUser of hrUsers) {
                await this.notificationsService.sendNotification(hrUser.id, 'GENERAL', 'طلب إجازة يحتاج موافقتك', `${request.user.firstName} ${request.user.lastName} - طلب ${this.getLeaveTypeName(request.type)} يحتاج موافقة HR`, { leaveRequestId: requestId, employeeId: request.userId });
            }
        }
        else {
            await this.prisma.leaveRequest.update({
                where: { id: requestId },
                data: {
                    managerDecision: 'REJECTED',
                    managerDecisionAt: new Date(),
                    managerNotes: notes,
                    currentStep: 'COMPLETED',
                    status: 'MGR_REJECTED',
                },
            });
            await this.notificationsService.sendNotification(request.userId, 'LEAVE_REJECTED', 'تم رفض طلب الإجازة', `تم رفض طلب إجازتك من قبل المدير${notes ? ': ' + notes : ''}`, { leaveRequestId: requestId });
        }
        await this.prisma.approvalLog.create({
            data: {
                companyId,
                requestType: 'LEAVE',
                requestId,
                step: 'MANAGER',
                decision,
                notes,
                byUserId: managerId,
            },
        });
        return this.prisma.leaveRequest.findUnique({
            where: { id: requestId },
            include: { user: true, managerApprover: true },
        });
    }
    async hrDecision(requestId, companyId, hrUserId, decision, notes) {
        const request = await this.prisma.leaveRequest.findFirst({
            where: { id: requestId, companyId },
            include: { user: true },
        });
        if (!request) {
            throw new common_1.NotFoundException('طلب الإجازة غير موجود');
        }
        if (request.currentStep !== 'HR') {
            throw new common_1.BadRequestException('هذا الطلب ليس في مرحلة موافقة HR');
        }
        const accessibleIds = await this.permissionsService.getAccessibleEmployeeIds(hrUserId, companyId, 'LEAVES_APPROVE_HR');
        if (!accessibleIds.includes(request.userId)) {
            throw new common_1.ForbiddenException('ليس لديك صلاحية للموافقة على طلب هذا الموظف');
        }
        if (decision === 'APPROVED') {
            await this.prisma.leaveRequest.update({
                where: { id: requestId },
                data: {
                    hrDecision: 'APPROVED',
                    hrDecisionAt: new Date(),
                    hrDecisionNotes: notes,
                    hrApproverId: hrUserId,
                    currentStep: 'COMPLETED',
                    status: 'APPROVED',
                    approvedDays: request.requestedDays,
                    approvedAt: new Date(),
                },
            });
            await this.deductLeaveBalance(request.userId, companyId, request.requestedDays);
            await this.createLeaveAttendanceRecords(request);
            await this.notificationsService.sendNotification(request.userId, 'LEAVE_APPROVED', 'تمت الموافقة على طلب الإجازة', `تمت الموافقة النهائية على طلب إجازتك`, { leaveRequestId: requestId });
        }
        else if (decision === 'REJECTED') {
            await this.prisma.leaveRequest.update({
                where: { id: requestId },
                data: {
                    hrDecision: 'REJECTED',
                    hrDecisionAt: new Date(),
                    hrDecisionNotes: notes,
                    hrApproverId: hrUserId,
                    currentStep: 'COMPLETED',
                    status: 'REJECTED',
                },
            });
            await this.notificationsService.sendNotification(request.userId, 'LEAVE_REJECTED', 'تم رفض طلب الإجازة', `تم رفض طلب إجازتك من قبل HR${notes ? ': ' + notes : ''}`, { leaveRequestId: requestId });
        }
        else if (decision === 'DELAYED') {
            await this.prisma.leaveRequest.update({
                where: { id: requestId },
                data: {
                    hrDecision: 'DELAYED',
                    hrDecisionAt: new Date(),
                    hrDecisionNotes: notes,
                    hrApproverId: hrUserId,
                    status: 'DELAYED',
                },
            });
            await this.notificationsService.sendNotification(request.userId, 'GENERAL', 'تم تأجيل طلب الإجازة', `تم تأجيل طلب إجازتك${notes ? ': ' + notes : ''}`, { leaveRequestId: requestId });
        }
        await this.prisma.approvalLog.create({
            data: {
                companyId,
                requestType: 'LEAVE',
                requestId,
                step: 'HR',
                decision,
                notes,
                byUserId: hrUserId,
            },
        });
        return this.prisma.leaveRequest.findUnique({
            where: { id: requestId },
            include: { user: true, managerApprover: true, hrApprover: true },
        });
    }
};
exports.LeavesService = LeavesService;
exports.LeavesService = LeavesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService,
        permissions_service_1.PermissionsService,
        smart_policy_trigger_service_1.SmartPolicyTriggerService,
        timezone_service_1.TimezoneService])
], LeavesService);
//# sourceMappingURL=leaves.service.js.map