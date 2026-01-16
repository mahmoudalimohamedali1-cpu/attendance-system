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
var LettersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LettersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const client_1 = require("@prisma/client");
const notifications_service_1 = require("../notifications/notifications.service");
const upload_service_1 = require("../../common/upload/upload.service");
const permissions_service_1 = require("../permissions/permissions.service");
let LettersService = LettersService_1 = class LettersService {
    constructor(prisma, notificationsService, uploadService, permissionsService) {
        this.prisma = prisma;
        this.notificationsService = notificationsService;
        this.uploadService = uploadService;
        this.permissionsService = permissionsService;
        this.logger = new common_1.Logger(LettersService_1.name);
    }
    async createLetterRequest(userId, createLetterDto) {
        const { type, notes, attachments } = createLetterDto;
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, managerId: true, firstName: true, lastName: true },
        });
        const letterRequest = await this.prisma.letterRequest.create({
            data: {
                userId,
                type,
                notes: notes || undefined,
                attachments: attachments && attachments.length > 0
                    ? attachments
                    : undefined,
                status: client_1.LetterStatus.PENDING,
                currentStep: 'MANAGER',
                managerApproverId: user?.managerId || undefined,
                managerDecision: 'PENDING',
                hrDecision: 'PENDING',
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        managerId: true,
                        email: true,
                    },
                },
            },
        });
        const letterWithUser = letterRequest;
        if (letterWithUser.user?.managerId) {
            await this.notificationsService.sendNotification(letterWithUser.user.managerId, 'GENERAL', 'طلب خطاب جديد', `${letterWithUser.user.firstName} ${letterWithUser.user.lastName} طلب خطاب (${this.getLetterTypeName(type)})`, { letterRequestId: letterRequest.id });
        }
        return letterRequest;
    }
    async getMyLetterRequests(userId, query) {
        const { status, type, page = 1, limit = 20 } = query;
        const where = { userId };
        if (status) {
            const statuses = status.split(',').map(s => s.trim());
            where.status = statuses.length === 1 ? statuses[0] : { in: statuses };
        }
        if (type)
            where.type = type;
        const [requests, total] = await Promise.all([
            this.prisma.letterRequest.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    approver: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                        },
                    },
                },
            }),
            this.prisma.letterRequest.count({ where }),
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
    async getPendingRequests(userId, companyId, query) {
        const { page = 1, limit = 20, status = 'PENDING' } = query || {};
        const [viewAccessible, approveAccessible] = await Promise.all([
            this.permissionsService.getAccessibleEmployeeIds(userId, companyId, 'LETTERS_VIEW'),
            this.permissionsService.getAccessibleEmployeeIds(userId, companyId, 'LETTERS_APPROVE_MANAGER'),
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
            userId: { in: accessibleEmployeeIds },
        };
        const [requests, total] = await Promise.all([
            this.prisma.letterRequest.findMany({
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
            this.prisma.letterRequest.count({ where }),
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
    async getLetterRequestById(id, userId) {
        const letterRequest = await this.prisma.letterRequest.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        employeeCode: true,
                        jobTitle: true,
                        email: true,
                        department: { select: { name: true } },
                    },
                },
                approver: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });
        if (!letterRequest) {
            throw new common_1.NotFoundException('طلب الخطاب غير موجود');
        }
        if (letterRequest.userId !== userId) {
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                select: { role: true, id: true },
            });
            if (user?.role !== 'ADMIN' && user?.role !== 'MANAGER') {
                throw new common_1.BadRequestException('غير مصرح لك بالوصول لهذا الطلب');
            }
        }
        return letterRequest;
    }
    async approveLetterRequest(id, approverId, notes, attachments) {
        const letterRequest = await this.prisma.letterRequest.findUnique({
            where: { id },
            include: { user: true },
        });
        if (!letterRequest) {
            throw new common_1.NotFoundException('طلب الخطاب غير موجود');
        }
        const currentStep = letterRequest.currentStep || 'MANAGER';
        if (currentStep === 'MANAGER') {
            if (letterRequest.managerApproverId === approverId) {
                return this.managerDecision(id, approverId, 'APPROVED', notes, attachments);
            }
            const canApprove = await this.permissionsService.canAccessEmployee(approverId, letterRequest.companyId || '', 'LETTERS_APPROVE_MANAGER', letterRequest.userId);
            if (canApprove.hasAccess) {
                return this.managerDecision(id, approverId, 'APPROVED', notes, attachments);
            }
            throw new common_1.ForbiddenException('ليس لديك صلاحية الموافقة على طلبات هذا الموظف');
        }
        else if (currentStep === 'HR') {
            return this.hrDecision(id, approverId, 'APPROVED', notes, attachments);
        }
        else {
            throw new common_1.BadRequestException('هذا الطلب تم البت فيه مسبقاً');
        }
    }
    async rejectLetterRequest(id, approverId, notes, attachments) {
        const letterRequest = await this.prisma.letterRequest.findUnique({
            where: { id },
            include: { user: true },
        });
        if (!letterRequest) {
            throw new common_1.NotFoundException('طلب الخطاب غير موجود');
        }
        const currentStep = letterRequest.currentStep || 'MANAGER';
        if (currentStep === 'MANAGER') {
            if (letterRequest.managerApproverId === approverId) {
                return this.managerDecision(id, approverId, 'REJECTED', notes, attachments);
            }
            const canApprove = await this.permissionsService.canAccessEmployee(approverId, letterRequest.companyId || '', 'LETTERS_APPROVE_MANAGER', letterRequest.userId);
            if (canApprove.hasAccess) {
                return this.managerDecision(id, approverId, 'REJECTED', notes, attachments);
            }
            throw new common_1.ForbiddenException('ليس لديك صلاحية رفض طلبات هذا الموظف');
        }
        else if (currentStep === 'HR') {
            return this.hrDecision(id, approverId, 'REJECTED', notes, attachments);
        }
        else {
            throw new common_1.BadRequestException('هذا الطلب تم البت فيه مسبقاً');
        }
    }
    async cancelLetterRequest(id, userId) {
        const letterRequest = await this.prisma.letterRequest.findUnique({
            where: { id },
        });
        if (!letterRequest) {
            throw new common_1.NotFoundException('طلب الخطاب غير موجود');
        }
        if (letterRequest.userId !== userId) {
            throw new common_1.BadRequestException('لا يمكنك إلغاء طلب خطاب شخص آخر');
        }
        if (letterRequest.status !== 'PENDING') {
            throw new common_1.BadRequestException('لا يمكن إلغاء طلب تم البت فيه');
        }
        return this.prisma.letterRequest.update({
            where: { id },
            data: { status: client_1.LetterStatus.CANCELLED },
        });
    }
    async getManagerInbox(managerId, companyId) {
        const accessibleEmployeeIds = await this.permissionsService.getAccessibleEmployeeIds(managerId, companyId, 'LETTERS_APPROVE_MANAGER');
        if (accessibleEmployeeIds.length === 0) {
            return [];
        }
        return this.prisma.letterRequest.findMany({
            where: {
                userId: { in: accessibleEmployeeIds },
                currentStep: 'MANAGER',
                status: 'PENDING',
            },
            include: {
                user: {
                    select: { id: true, firstName: true, lastName: true, email: true, employeeCode: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getHRInbox(hrUserId, companyId) {
        const accessibleIds = await this.permissionsService.getAccessibleEmployeeIds(hrUserId, companyId, 'LETTERS_APPROVE_HR');
        return this.prisma.letterRequest.findMany({
            where: {
                currentStep: 'HR',
                status: 'MGR_APPROVED',
                userId: accessibleIds.length > 0 ? { in: accessibleIds } : undefined,
            },
            include: {
                user: {
                    select: { id: true, firstName: true, lastName: true, email: true, employeeCode: true },
                },
                managerApprover: {
                    select: { id: true, firstName: true, lastName: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async managerDecision(id, managerId, decision, notes, attachments) {
        const letterRequest = await this.prisma.letterRequest.findUnique({
            where: { id },
            include: { user: true },
        });
        if (!letterRequest) {
            throw new common_1.NotFoundException('طلب الخطاب غير موجود');
        }
        if (letterRequest.managerApproverId !== managerId) {
            throw new common_1.ForbiddenException('ليس لديك صلاحية الموافقة على هذا الطلب');
        }
        if (letterRequest.currentStep !== 'MANAGER') {
            throw new common_1.BadRequestException('هذا الطلب ليس في مرحلة موافقة المدير');
        }
        const updateData = {
            managerDecision: decision,
            managerDecisionAt: new Date(),
            managerNotes: notes,
            managerAttachments: attachments,
        };
        if (decision === 'APPROVED') {
            updateData.status = 'MGR_APPROVED';
            updateData.currentStep = 'HR';
        }
        else {
            updateData.status = 'MGR_REJECTED';
            updateData.currentStep = 'COMPLETED';
        }
        const updated = await this.prisma.letterRequest.update({
            where: { id },
            data: updateData,
            include: {
                user: true,
                managerApprover: {
                    select: { id: true, firstName: true, lastName: true },
                },
            },
        });
        await this.prisma.approvalLog.create({
            data: {
                requestType: 'LETTER',
                requestId: id,
                step: 'MANAGER',
                decision,
                notes,
                byUserId: managerId,
            },
        });
        await this.notificationsService.sendNotification(letterRequest.userId, decision === 'APPROVED' ? 'GENERAL' : 'GENERAL', decision === 'APPROVED' ? 'موافقة المدير على طلب الخطاب' : 'رفض المدير لطلب الخطاب', decision === 'APPROVED'
            ? `وافق مديرك على طلب الخطاب (${this.getLetterTypeName(letterRequest.type)}) - في انتظار موافقة HR`
            : `رفض مديرك طلب الخطاب (${this.getLetterTypeName(letterRequest.type)})${notes ? ': ' + notes : ''}`, { letterRequestId: id });
        return updated;
    }
    async hrDecision(id, hrUserId, decision, notes, attachments) {
        const letterRequest = await this.prisma.letterRequest.findUnique({
            where: { id },
            include: { user: true },
        });
        if (!letterRequest) {
            throw new common_1.NotFoundException('طلب الخطاب غير موجود');
        }
        if (letterRequest.currentStep !== 'HR') {
            throw new common_1.BadRequestException('هذا الطلب ليس في مرحلة موافقة HR');
        }
        const accessibleIds = await this.permissionsService.getAccessibleEmployeeIds(hrUserId, letterRequest.companyId || '', 'LETTERS_APPROVE_HR');
        if (!accessibleIds.includes(letterRequest.userId)) {
            throw new common_1.ForbiddenException('ليس لديك صلاحية الموافقة على طلبات هذا الموظف');
        }
        const updateData = {
            hrApproverId: hrUserId,
            hrDecision: decision,
            hrDecisionAt: new Date(),
            hrDecisionNotes: notes,
            hrAttachments: attachments,
        };
        if (decision === 'APPROVED') {
            updateData.status = 'APPROVED';
            updateData.currentStep = 'COMPLETED';
        }
        else if (decision === 'REJECTED') {
            updateData.status = 'REJECTED';
            updateData.currentStep = 'COMPLETED';
        }
        else {
            updateData.status = 'DELAYED';
        }
        const updated = await this.prisma.letterRequest.update({
            where: { id },
            data: updateData,
            include: {
                user: true,
                managerApprover: {
                    select: { id: true, firstName: true, lastName: true },
                },
                hrApprover: {
                    select: { id: true, firstName: true, lastName: true },
                },
            },
        });
        await this.prisma.approvalLog.create({
            data: {
                requestType: 'LETTER',
                requestId: id,
                step: 'HR',
                decision,
                notes,
                byUserId: hrUserId,
            },
        });
        let message = '';
        if (decision === 'APPROVED') {
            message = `تمت الموافقة النهائية على طلب الخطاب (${this.getLetterTypeName(letterRequest.type)})`;
        }
        else if (decision === 'REJECTED') {
            message = `تم رفض طلب الخطاب من HR (${this.getLetterTypeName(letterRequest.type)})${notes ? ': ' + notes : ''}`;
        }
        else {
            message = `تم تأجيل طلب الخطاب (${this.getLetterTypeName(letterRequest.type)})${notes ? ': ' + notes : ''}`;
        }
        await this.notificationsService.sendNotification(letterRequest.userId, 'GENERAL', decision === 'APPROVED' ? 'الموافقة النهائية على الخطاب' : decision === 'REJECTED' ? 'رفض طلب الخطاب' : 'تأجيل طلب الخطاب', message, { letterRequestId: id });
        return updated;
    }
    getLetterTypeName(type) {
        const names = {
            SALARY_DEFINITION: 'خطاب تعريف راتب',
            SERVICE_CONFIRMATION: 'خطاب تأكيد خدمة',
            SALARY_ADJUSTMENT: 'خطاب تعديل راتب',
            PROMOTION: 'خطاب ترقية',
            TRANSFER_ASSIGNMENT: 'خطاب نقل / تكليف',
            RESIGNATION: 'خطاب استقالة',
            TERMINATION: 'خطاب إنهاء خدمة',
            CLEARANCE: 'خطاب إخلاء طرف',
            EXPERIENCE: 'خطاب خبرة',
            SALARY_DEFINITION_DIRECTED: 'خطاب تعريف راتب (موجّه)',
            NOC: 'خطاب عدم ممانعة',
            DELEGATION: 'خطاب تفويض',
            REQUEST: 'طلب',
            COMPLAINT: 'شكوى',
            CERTIFICATION: 'تصديق',
        };
        return names[type] || type;
    }
};
exports.LettersService = LettersService;
exports.LettersService = LettersService = LettersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService,
        upload_service_1.UploadService,
        permissions_service_1.PermissionsService])
], LettersService);
//# sourceMappingURL=letters.service.js.map