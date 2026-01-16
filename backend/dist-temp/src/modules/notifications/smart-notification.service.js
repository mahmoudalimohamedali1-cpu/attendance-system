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
var SmartNotificationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmartNotificationService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const notifications_service_1 = require("./notifications.service");
const permissions_service_1 = require("../permissions/permissions.service");
const client_1 = require("@prisma/client");
let SmartNotificationService = SmartNotificationService_1 = class SmartNotificationService {
    constructor(prisma, notificationsService, permissionsService) {
        this.prisma = prisma;
        this.notificationsService = notificationsService;
        this.permissionsService = permissionsService;
        this.logger = new common_1.Logger(SmartNotificationService_1.name);
        this.REMINDER_DAYS = 3;
        this.DAILY_SUMMARY_ENABLED = true;
    }
    async sendDailyReminders() {
        this.logger.log('🔔 Running daily reminder job...');
        try {
            await this.sendPendingRequestReminders('leaves');
            await this.sendPendingRequestReminders('letters');
            await this.sendPendingRequestReminders('raises');
            this.logger.log('✅ Daily reminders sent successfully');
        }
        catch (error) {
            this.logger.error('❌ Error sending daily reminders:', error);
        }
    }
    async checkOverdueRequests() {
        this.logger.log('⏰ Checking for overdue requests...');
        try {
            const overdueDate = new Date();
            overdueDate.setDate(overdueDate.getDate() - this.REMINDER_DAYS);
            await this.sendOverdueReminders('leaves', overdueDate);
            await this.sendOverdueReminders('letters', overdueDate);
            await this.sendOverdueReminders('raises', overdueDate);
            this.logger.log('✅ Overdue check completed');
        }
        catch (error) {
            this.logger.error('❌ Error checking overdue requests:', error);
        }
    }
    async sendPendingRequestReminders(type) {
        const approvers = await this.getApprovers(type);
        for (const approver of approvers) {
            const pendingCount = await this.getPendingCountForApprover(type, approver.id, approver.companyId);
            if (pendingCount > 0) {
                await this.notificationsService.sendNotification(approver.id, client_1.NotificationType.GENERAL, this.getRequestTypeLabel(type) + ' معلقة', `لديك ${pendingCount} طلب بانتظار موافقتك`, { type, count: pendingCount }, `Pending ${type}`, `You have ${pendingCount} pending ${type} requests`);
            }
        }
    }
    async sendOverdueReminders(type, overdueDate) {
        const overdueRequests = await this.getOverdueRequests(type, overdueDate);
        for (const request of overdueRequests) {
            const { approverId, companyId } = await this.getApproverForRequest(type, request);
            if (approverId) {
                const daysOverdue = this.getDaysOverdue(request.createdAt);
                await this.notificationsService.sendNotification(approverId, client_1.NotificationType.GENERAL, '⚠️ طلب متأخر', `طلب ${this.getRequestTypeLabel(type)} من ${request.userName} معلق منذ ${daysOverdue} أيام`, {
                    type,
                    requestId: request.id,
                    urgent: true,
                }, '⚠️ Overdue Request', `${type} request from ${request.userName} pending for ${daysOverdue} days`);
            }
        }
    }
    async getApprovers(type, companyId) {
        const permissionCode = `${type.toUpperCase()}_APPROVE_MANAGER`;
        const hrPermissionCode = `${type.toUpperCase()}_APPROVE_HR`;
        const users = await this.prisma.userPermission.findMany({
            where: {
                permission: {
                    code: { in: [permissionCode, hrPermissionCode] }
                },
                companyId: companyId || undefined,
                user: { status: 'ACTIVE' }
            },
            select: {
                userId: true,
                companyId: true
            },
            distinct: ['userId'],
        });
        return users.map(u => ({ id: u.userId, companyId: u.companyId || '' }));
    }
    async getPendingCountForApprover(type, approverId, companyId) {
        const accessibleManagerIds = await this.permissionsService.getAccessibleEmployeeIds(approverId, companyId, `${type.toUpperCase()}_APPROVE_MANAGER`);
        const accessibleHrIds = await this.permissionsService.getAccessibleEmployeeIds(approverId, companyId, `${type.toUpperCase()}_APPROVE_HR`);
        const accessibleIds = [...new Set([...accessibleManagerIds, ...accessibleHrIds])];
        if (accessibleIds.length === 0)
            return 0;
        if (type === 'leaves') {
            const managerCount = await this.prisma.leaveRequest.count({
                where: {
                    companyId,
                    userId: { in: accessibleManagerIds },
                    currentStep: client_1.ApprovalStep.MANAGER,
                    status: 'PENDING',
                },
            });
            const hrCount = await this.prisma.leaveRequest.count({
                where: {
                    companyId,
                    userId: { in: accessibleHrIds },
                    currentStep: client_1.ApprovalStep.HR,
                    status: 'MGR_APPROVED',
                },
            });
            return managerCount + hrCount;
        }
        else if (type === 'letters') {
            const managerCount = await this.prisma.letterRequest.count({
                where: {
                    companyId,
                    userId: { in: accessibleManagerIds },
                    currentStep: 'MANAGER',
                    status: 'PENDING',
                },
            });
            const hrCount = await this.prisma.letterRequest.count({
                where: {
                    companyId,
                    userId: { in: accessibleHrIds },
                    currentStep: 'HR',
                    status: 'MGR_APPROVED',
                },
            });
            return managerCount + hrCount;
        }
        else {
            const managerCount = await this.prisma.raiseRequest.count({
                where: {
                    companyId,
                    userId: { in: accessibleManagerIds },
                    currentStep: 'MANAGER',
                    status: 'PENDING',
                },
            });
            const hrCount = await this.prisma.raiseRequest.count({
                where: {
                    companyId,
                    userId: { in: accessibleHrIds },
                    currentStep: 'HR',
                    status: 'MGR_APPROVED',
                },
            });
            return managerCount + hrCount;
        }
    }
    async getOverdueRequests(type, overdueDate) {
        if (type === 'leaves') {
            const requests = await this.prisma.leaveRequest.findMany({
                where: {
                    status: { in: ['PENDING', 'MGR_APPROVED'] },
                    createdAt: { lt: overdueDate },
                },
                include: {
                    user: { select: { firstName: true, lastName: true } }
                },
            });
            return requests.map(r => ({
                id: r.id,
                createdAt: r.createdAt,
                userName: `${r.user.firstName} ${r.user.lastName}`,
                currentStep: r.currentStep,
                companyId: r.companyId || '',
            }));
        }
        else if (type === 'letters') {
            const requests = await this.prisma.letterRequest.findMany({
                where: {
                    status: { in: ['PENDING', 'MGR_APPROVED'] },
                    createdAt: { lt: overdueDate },
                },
                include: {
                    user: { select: { firstName: true, lastName: true } }
                },
            });
            return requests.map(r => ({
                id: r.id,
                createdAt: r.createdAt,
                userName: `${r.user.firstName} ${r.user.lastName}`,
                currentStep: r.currentStep,
                companyId: r.companyId || '',
            }));
        }
        else {
            const requests = await this.prisma.raiseRequest.findMany({
                where: {
                    status: { in: ['PENDING', 'MGR_APPROVED'] },
                    createdAt: { lt: overdueDate },
                },
                include: {
                    user: { select: { firstName: true, lastName: true } }
                },
            });
            return requests.map(r => ({
                id: r.id,
                createdAt: r.createdAt,
                userName: `${r.user.firstName} ${r.user.lastName}`,
                currentStep: r.currentStep,
                companyId: r.companyId || '',
            }));
        }
    }
    async getApproverForRequest(type, request) {
        const permissionCode = request.currentStep === 'MANAGER'
            ? `${type.toUpperCase()}_APPROVE_MANAGER`
            : `${type.toUpperCase()}_APPROVE_HR`;
        const approver = await this.prisma.userPermission.findFirst({
            where: {
                permission: { code: permissionCode },
                companyId: request.companyId,
            },
            select: {
                userId: true,
                companyId: true
            },
        });
        return {
            approverId: approver?.userId || null,
            companyId: approver?.companyId || null
        };
    }
    getRequestTypeLabel(type) {
        const labels = {
            leaves: 'إجازة',
            letters: 'خطاب',
            raises: 'زيادة',
        };
        return labels[type];
    }
    getDaysOverdue(createdAt) {
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - createdAt.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    async triggerReminderManually() {
        this.logger.log('⚡ Manual trigger for reminders...');
        await this.sendDailyReminders();
        await this.checkOverdueRequests();
        return { message: 'Reminders triggered successfully' };
    }
};
exports.SmartNotificationService = SmartNotificationService;
__decorate([
    (0, schedule_1.Cron)('0 9 * * *', { timeZone: 'Asia/Riyadh' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SmartNotificationService.prototype, "sendDailyReminders", null);
__decorate([
    (0, schedule_1.Cron)('0 9,14 * * *', { timeZone: 'Asia/Riyadh' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SmartNotificationService.prototype, "checkOverdueRequests", null);
exports.SmartNotificationService = SmartNotificationService = SmartNotificationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService,
        permissions_service_1.PermissionsService])
], SmartNotificationService);
//# sourceMappingURL=smart-notification.service.js.map