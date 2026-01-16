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
exports.CustodyService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const notifications_service_1 = require("../notifications/notifications.service");
const smart_policy_trigger_service_1 = require("../smart-policies/smart-policy-trigger.service");
const client_1 = require("@prisma/client");
const QRCode = require("qrcode");
let CustodyService = class CustodyService {
    constructor(prisma, notificationsService, smartPolicyTrigger) {
        this.prisma = prisma;
        this.notificationsService = notificationsService;
        this.smartPolicyTrigger = smartPolicyTrigger;
    }
    async createCategory(companyId, userId, dto) {
        const category = await this.prisma.custodyCategory.create({
            data: {
                companyId,
                name: dto.name,
                nameEn: dto.nameEn,
                description: dto.description,
                icon: dto.icon,
                requiresApproval: dto.requiresApproval ?? true,
                requiresSerialNumber: dto.requiresSerialNumber ?? true,
                depreciationYears: dto.depreciationYears,
            },
        });
        return category;
    }
    async getCategories(companyId) {
        return this.prisma.custodyCategory.findMany({
            where: { companyId, isActive: true },
            include: {
                _count: { select: { items: true } },
            },
            orderBy: { name: 'asc' },
        });
    }
    async updateCategory(companyId, categoryId, userId, dto) {
        const existing = await this.prisma.custodyCategory.findFirst({
            where: { id: categoryId, companyId },
        });
        if (!existing)
            throw new common_1.NotFoundException('الفئة غير موجودة');
        const updated = await this.prisma.custodyCategory.update({
            where: { id: categoryId },
            data: dto,
        });
        return updated;
    }
    async deleteCategory(companyId, categoryId, userId) {
        const existing = await this.prisma.custodyCategory.findFirst({
            where: { id: categoryId, companyId },
            include: { _count: { select: { items: true } } },
        });
        if (!existing)
            throw new common_1.NotFoundException('الفئة غير موجودة');
        if (existing._count.items > 0) {
            await this.prisma.custodyCategory.update({
                where: { id: categoryId },
                data: { isActive: false },
            });
        }
        else {
            await this.prisma.custodyCategory.delete({ where: { id: categoryId } });
        }
        return { success: true };
    }
    async createItem(companyId, userId, dto) {
        const category = await this.prisma.custodyCategory.findFirst({
            where: { id: dto.categoryId, companyId, isActive: true },
        });
        if (!category)
            throw new common_1.NotFoundException('الفئة غير موجودة');
        const existingCode = await this.prisma.custodyItem.findFirst({
            where: { companyId, code: dto.code },
        });
        if (existingCode)
            throw new common_1.BadRequestException('كود العهدة مستخدم مسبقاً');
        const qrCodeUrl = await this.generateQRCode(companyId, dto.code);
        const item = await this.prisma.custodyItem.create({
            data: {
                companyId,
                categoryId: dto.categoryId,
                code: dto.code,
                name: dto.name,
                nameEn: dto.nameEn,
                description: dto.description,
                serialNumber: dto.serialNumber,
                model: dto.model,
                brand: dto.brand,
                barcode: dto.barcode,
                qrCode: qrCodeUrl,
                purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : null,
                purchasePrice: dto.purchasePrice,
                warrantyExpiry: dto.warrantyExpiry ? new Date(dto.warrantyExpiry) : null,
                vendor: dto.vendor,
                invoiceNumber: dto.invoiceNumber,
                currentLocation: dto.currentLocation,
                notes: dto.notes,
                imageUrl: dto.imageUrl,
                branchId: dto.branchId,
                condition: dto.condition || client_1.CustodyCondition.NEW,
                status: client_1.CustodyItemStatus.AVAILABLE,
            },
            include: { category: true, branch: true },
        });
        return item;
    }
    async getItems(companyId, query) {
        const where = { companyId };
        if (query.status)
            where.status = query.status;
        if (query.categoryId)
            where.categoryId = query.categoryId;
        if (query.branchId)
            where.branchId = query.branchId;
        if (query.employeeId)
            where.currentAssigneeId = query.employeeId;
        if (query.search) {
            where.OR = [
                { name: { contains: query.search, mode: 'insensitive' } },
                { code: { contains: query.search, mode: 'insensitive' } },
                { serialNumber: { contains: query.search, mode: 'insensitive' } },
            ];
        }
        const [items, total] = await Promise.all([
            this.prisma.custodyItem.findMany({
                where,
                include: {
                    category: true,
                    branch: true,
                },
                skip: ((query.page || 1) - 1) * (query.limit || 20),
                take: query.limit || 20,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.custodyItem.count({ where }),
        ]);
        return { items, total, page: query.page || 1, limit: query.limit || 20 };
    }
    async getItemById(companyId, itemId) {
        const item = await this.prisma.custodyItem.findFirst({
            where: { id: itemId, companyId },
            include: {
                category: true,
                branch: true,
                assignments: {
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
                    },
                },
                maintenances: {
                    take: 5,
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
        if (!item)
            throw new common_1.NotFoundException('العهدة غير موجودة');
        return item;
    }
    async updateItem(companyId, itemId, userId, dto) {
        const existing = await this.prisma.custodyItem.findFirst({
            where: { id: itemId, companyId },
        });
        if (!existing)
            throw new common_1.NotFoundException('العهدة غير موجودة');
        const updated = await this.prisma.custodyItem.update({
            where: { id: itemId },
            data: {
                ...dto,
                purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : undefined,
                warrantyExpiry: dto.warrantyExpiry ? new Date(dto.warrantyExpiry) : undefined,
                purchasePrice: dto.purchasePrice,
                condition: dto.condition,
                status: dto.status,
            },
            include: { category: true, branch: true },
        });
        return updated;
    }
    async deleteItem(companyId, itemId, userId) {
        const existing = await this.prisma.custodyItem.findFirst({
            where: { id: itemId, companyId },
        });
        if (!existing)
            throw new common_1.NotFoundException('العهدة غير موجودة');
        if (existing.status === client_1.CustodyItemStatus.ASSIGNED) {
            throw new common_1.BadRequestException('لا يمكن حذف عهدة مسلمة لموظف');
        }
        await this.prisma.custodyItem.update({
            where: { id: itemId },
            data: { status: client_1.CustodyItemStatus.DISPOSED },
        });
        return { success: true };
    }
    async assignCustody(companyId, userId, dto) {
        const item = await this.prisma.custodyItem.findFirst({
            where: { id: dto.custodyItemId, companyId },
            include: { category: true },
        });
        if (!item)
            throw new common_1.NotFoundException('العهدة غير موجودة');
        if (item.status !== client_1.CustodyItemStatus.AVAILABLE) {
            throw new common_1.BadRequestException('العهدة غير متاحة للتسليم');
        }
        const employee = await this.prisma.user.findFirst({
            where: { id: dto.employeeId, companyId, status: 'ACTIVE' },
        });
        if (!employee)
            throw new common_1.NotFoundException('الموظف غير موجود');
        const requiresApproval = item.category?.requiresApproval ?? true;
        const assignment = await this.prisma.custodyAssignment.create({
            data: {
                companyId,
                custodyItemId: dto.custodyItemId,
                employeeId: dto.employeeId,
                assignedById: userId,
                expectedReturn: dto.expectedReturn ? new Date(dto.expectedReturn) : null,
                conditionOnAssign: dto.conditionOnAssign || item.condition,
                notes: dto.notes,
                attachments: dto.attachments || [],
                status: requiresApproval ? client_1.CustodyAssignmentStatus.PENDING : client_1.CustodyAssignmentStatus.DELIVERED,
            },
            include: {
                custodyItem: true,
                employee: { select: { id: true, firstName: true, lastName: true } },
            },
        });
        if (!requiresApproval) {
            await this.prisma.custodyItem.update({
                where: { id: dto.custodyItemId },
                data: {
                    status: client_1.CustodyItemStatus.ASSIGNED,
                    currentAssigneeId: dto.employeeId,
                },
            });
        }
        await this.notificationsService.sendNotification(dto.employeeId, client_1.NotificationType.GENERAL, '📦 عهدة جديدة', `تم تسليمك عهدة: ${item.name}`, { type: 'custody', assignmentId: assignment.id });
        return assignment;
    }
    async getMyAssignments(companyId, employeeId) {
        return this.prisma.custodyAssignment.findMany({
            where: {
                companyId,
                employeeId,
                status: { in: [client_1.CustodyAssignmentStatus.DELIVERED, client_1.CustodyAssignmentStatus.APPROVED] },
            },
            include: {
                custodyItem: { include: { category: true } },
            },
            orderBy: { assignedAt: 'desc' },
        });
    }
    async getPendingAssignments(companyId) {
        return this.prisma.custodyAssignment.findMany({
            where: { companyId, status: client_1.CustodyAssignmentStatus.PENDING },
            include: {
                custodyItem: { include: { category: true } },
                employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
                assignedBy: { select: { id: true, firstName: true, lastName: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async approveAssignment(companyId, userId, dto) {
        const assignment = await this.prisma.custodyAssignment.findFirst({
            where: { id: dto.assignmentId, companyId, status: client_1.CustodyAssignmentStatus.PENDING },
            include: { custodyItem: true, employee: true },
        });
        if (!assignment)
            throw new common_1.NotFoundException('طلب التسليم غير موجود');
        await this.prisma.$transaction([
            this.prisma.custodyAssignment.update({
                where: { id: dto.assignmentId },
                data: {
                    status: client_1.CustodyAssignmentStatus.APPROVED,
                    approvedById: userId,
                    approvedAt: new Date(),
                    notes: dto.notes || assignment.notes,
                },
            }),
            this.prisma.custodyItem.update({
                where: { id: assignment.custodyItemId },
                data: {
                    status: client_1.CustodyItemStatus.ASSIGNED,
                    currentAssigneeId: assignment.employeeId,
                },
            }),
        ]);
        await this.notificationsService.sendNotification(assignment.employeeId, client_1.NotificationType.GENERAL, '✅ تمت الموافقة على العهدة', `تمت الموافقة على تسليمك عهدة: ${assignment.custodyItem.name}`, { type: 'custody', assignmentId: assignment.id });
        return { success: true };
    }
    async rejectAssignment(companyId, userId, dto) {
        const assignment = await this.prisma.custodyAssignment.findFirst({
            where: { id: dto.assignmentId, companyId, status: client_1.CustodyAssignmentStatus.PENDING },
            include: { custodyItem: true },
        });
        if (!assignment)
            throw new common_1.NotFoundException('طلب التسليم غير موجود');
        await this.prisma.custodyAssignment.update({
            where: { id: dto.assignmentId },
            data: {
                status: client_1.CustodyAssignmentStatus.REJECTED,
                approvedById: userId,
                approvedAt: new Date(),
                notes: dto.reason,
            },
        });
        await this.notificationsService.sendNotification(assignment.employeeId, client_1.NotificationType.GENERAL, '❌ تم رفض طلب العهدة', `تم رفض طلب تسليمك عهدة: ${assignment.custodyItem.name} - السبب: ${dto.reason}`, { type: 'custody', assignmentId: assignment.id });
        return { success: true };
    }
    async signAssignment(companyId, employeeId, dto) {
        const assignment = await this.prisma.custodyAssignment.findFirst({
            where: {
                id: dto.assignmentId,
                companyId,
                employeeId,
                status: { in: [client_1.CustodyAssignmentStatus.APPROVED, client_1.CustodyAssignmentStatus.DELIVERED] },
            },
        });
        if (!assignment)
            throw new common_1.NotFoundException('العهدة غير موجودة');
        await this.prisma.custodyAssignment.update({
            where: { id: dto.assignmentId },
            data: {
                employeeSignature: dto.signature,
                signatureDate: new Date(),
                status: client_1.CustodyAssignmentStatus.DELIVERED,
            },
        });
        return { success: true };
    }
    async requestReturn(companyId, employeeId, dto) {
        const assignment = await this.prisma.custodyAssignment.findFirst({
            where: {
                id: dto.assignmentId,
                companyId,
                employeeId,
                status: client_1.CustodyAssignmentStatus.DELIVERED,
            },
            include: { custodyItem: true },
        });
        if (!assignment)
            throw new common_1.NotFoundException('العهدة غير مسلمة لك');
        const returnRequest = await this.prisma.custodyReturn.create({
            data: {
                companyId,
                custodyItemId: assignment.custodyItemId,
                assignmentId: dto.assignmentId,
                returnedById: employeeId,
                returnReason: dto.returnReason,
                conditionOnReturn: dto.conditionOnReturn,
                damageDescription: dto.damageDescription,
                attachments: dto.attachments || [],
            },
            include: { custodyItem: true },
        });
        return returnRequest;
    }
    async getPendingReturns(companyId) {
        return this.prisma.custodyReturn.findMany({
            where: { companyId, status: client_1.CustodyReturnStatus.PENDING },
            include: {
                custodyItem: { include: { category: true } },
                returnedBy: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
                assignment: true,
            },
            orderBy: { returnDate: 'desc' },
        });
    }
    async reviewReturn(companyId, userId, dto) {
        const returnRequest = await this.prisma.custodyReturn.findFirst({
            where: { id: dto.returnId, companyId, status: client_1.CustodyReturnStatus.PENDING },
            include: { custodyItem: true, assignment: true },
        });
        if (!returnRequest)
            throw new common_1.NotFoundException('طلب الإرجاع غير موجود');
        const isApproved = dto.decision === 'APPROVED';
        if (isApproved) {
            await this.prisma.$transaction([
                this.prisma.custodyReturn.update({
                    where: { id: dto.returnId },
                    data: {
                        status: client_1.CustodyReturnStatus.COMPLETED,
                        reviewedById: userId,
                        reviewedAt: new Date(),
                        reviewNotes: dto.reviewNotes,
                        estimatedCost: dto.estimatedCost,
                        chargeEmployee: dto.chargeEmployee || false,
                    },
                }),
                this.prisma.custodyAssignment.update({
                    where: { id: returnRequest.assignmentId },
                    data: {
                        status: client_1.CustodyAssignmentStatus.RETURNED,
                        actualReturn: new Date(),
                        conditionOnReturn: returnRequest.conditionOnReturn,
                    },
                }),
                this.prisma.custodyItem.update({
                    where: { id: returnRequest.custodyItemId },
                    data: {
                        status: client_1.CustodyItemStatus.AVAILABLE,
                        currentAssigneeId: null,
                        condition: returnRequest.conditionOnReturn,
                    },
                }),
            ]);
        }
        else {
            await this.prisma.custodyReturn.update({
                where: { id: dto.returnId },
                data: {
                    status: client_1.CustodyReturnStatus.REJECTED,
                    reviewedById: userId,
                    reviewedAt: new Date(),
                    reviewNotes: dto.reviewNotes,
                },
            });
        }
        await this.notificationsService.sendNotification(returnRequest.returnedById, client_1.NotificationType.GENERAL, isApproved ? '✅ تم قبول إرجاع العهدة' : '❌ تم رفض إرجاع العهدة', isApproved
            ? `تم قبول إرجاع العهدة: ${returnRequest.custodyItem.name}`
            : `تم رفض إرجاع العهدة: ${returnRequest.custodyItem.name} - ${dto.reviewNotes || ''}`, { type: 'custody', returnId: dto.returnId });
        return { success: true };
    }
    async requestTransfer(companyId, user, dto) {
        const currentAssignment = await this.prisma.custodyAssignment.findFirst({
            where: {
                custodyItemId: dto.custodyItemId,
                companyId,
                status: client_1.CustodyAssignmentStatus.DELIVERED,
            },
            include: { custodyItem: true, employee: true },
        });
        if (!currentAssignment)
            throw new common_1.NotFoundException('العهدة غير مسلمة حالياً');
        if (currentAssignment.employeeId !== user.id && user.role !== 'ADMIN') {
            throw new common_1.ForbiddenException('ليس لديك صلاحية لطلب تحويل هذه العهدة');
        }
        const toEmployee = await this.prisma.user.findFirst({
            where: { id: dto.toEmployeeId, companyId, status: 'ACTIVE' },
        });
        if (!toEmployee)
            throw new common_1.NotFoundException('الموظف المستلم غير موجود');
        const transfer = await this.prisma.custodyTransfer.create({
            data: {
                companyId,
                custodyItemId: dto.custodyItemId,
                fromEmployeeId: currentAssignment.employeeId,
                toEmployeeId: dto.toEmployeeId,
                initiatedById: user.id,
                reason: dto.reason,
                notes: dto.notes,
            },
            include: { custodyItem: true, toEmployee: { select: { firstName: true, lastName: true } } },
        });
        await this.notificationsService.sendNotification(dto.toEmployeeId, client_1.NotificationType.GENERAL, '🔄 طلب تحويل عهدة', `تم طلب تحويل عهدة: ${transfer.custodyItem.name} إليك`, { type: 'custody', transferId: transfer.id });
        return transfer;
    }
    async getPendingTransfers(companyId, userId) {
        const where = { companyId, status: client_1.CustodyTransferStatus.PENDING };
        if (userId)
            where.toEmployeeId = userId;
        return this.prisma.custodyTransfer.findMany({
            where,
            include: {
                custodyItem: { include: { category: true } },
                fromEmployee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
                toEmployee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
            },
            orderBy: { transferDate: 'desc' },
        });
    }
    async approveTransfer(companyId, userId, dto) {
        const transfer = await this.prisma.custodyTransfer.findFirst({
            where: { id: dto.transferId, companyId, toEmployeeId: userId, status: client_1.CustodyTransferStatus.PENDING },
            include: { custodyItem: true },
        });
        if (!transfer)
            throw new common_1.NotFoundException('طلب التحويل غير موجود');
        await this.prisma.$transaction([
            this.prisma.custodyTransfer.update({
                where: { id: dto.transferId },
                data: {
                    status: client_1.CustodyTransferStatus.COMPLETED,
                    approvedById: userId,
                    approvedAt: new Date(),
                    toSignature: dto.signature,
                    notes: dto.notes,
                },
            }),
            this.prisma.custodyAssignment.updateMany({
                where: { custodyItemId: transfer.custodyItemId, status: client_1.CustodyAssignmentStatus.DELIVERED },
                data: { status: client_1.CustodyAssignmentStatus.TRANSFERRED, actualReturn: new Date() },
            }),
            this.prisma.custodyAssignment.create({
                data: {
                    companyId,
                    custodyItemId: transfer.custodyItemId,
                    employeeId: transfer.toEmployeeId,
                    assignedById: transfer.initiatedById,
                    status: client_1.CustodyAssignmentStatus.DELIVERED,
                    approvedById: userId,
                    approvedAt: new Date(),
                    conditionOnAssign: transfer.custodyItem.condition,
                },
            }),
            this.prisma.custodyItem.update({
                where: { id: transfer.custodyItemId },
                data: { currentAssigneeId: transfer.toEmployeeId },
            }),
        ]);
        await this.notificationsService.sendNotification(transfer.fromEmployeeId, client_1.NotificationType.GENERAL, '✅ تم تحويل العهدة', `تم تحويل العهدة: ${transfer.custodyItem.name} إلى الموظف الآخر`, { type: 'custody', transferId: dto.transferId });
        return { success: true };
    }
    async rejectTransfer(companyId, userId, dto) {
        const transfer = await this.prisma.custodyTransfer.findFirst({
            where: { id: dto.transferId, companyId, toEmployeeId: userId, status: client_1.CustodyTransferStatus.PENDING },
            include: { custodyItem: true },
        });
        if (!transfer)
            throw new common_1.NotFoundException('طلب التحويل غير موجود');
        await this.prisma.custodyTransfer.update({
            where: { id: dto.transferId },
            data: { status: client_1.CustodyTransferStatus.REJECTED, notes: dto.reason },
        });
        await this.notificationsService.sendNotification(transfer.initiatedById, client_1.NotificationType.GENERAL, '❌ تم رفض تحويل العهدة', `تم رفض تحويل العهدة: ${transfer.custodyItem.name} - ${dto.reason}`, { type: 'custody', transferId: dto.transferId });
        return { success: true };
    }
    async createMaintenance(companyId, userId, dto) {
        const item = await this.prisma.custodyItem.findFirst({
            where: { id: dto.custodyItemId, companyId },
        });
        if (!item)
            throw new common_1.NotFoundException('العهدة غير موجودة');
        const maintenance = await this.prisma.custodyMaintenance.create({
            data: {
                companyId,
                custodyItemId: dto.custodyItemId,
                type: dto.type,
                description: dto.description,
                reportedById: userId,
                estimatedCost: dto.estimatedCost,
                vendor: dto.vendor,
                vendorContact: dto.vendorContact,
                vendorEmail: dto.vendorEmail,
                attachments: dto.attachments || [],
            },
            include: { custodyItem: true },
        });
        await this.prisma.custodyItem.update({
            where: { id: dto.custodyItemId },
            data: { status: client_1.CustodyItemStatus.IN_MAINTENANCE },
        });
        return maintenance;
    }
    async getMaintenances(companyId, status) {
        const where = { companyId };
        if (status)
            where.status = status;
        return this.prisma.custodyMaintenance.findMany({
            where,
            include: {
                custodyItem: { include: { category: true } },
                reportedBy: { select: { id: true, firstName: true, lastName: true } },
            },
            orderBy: { reportedAt: 'desc' },
        });
    }
    async updateMaintenance(companyId, maintenanceId, userId, dto) {
        const existing = await this.prisma.custodyMaintenance.findFirst({
            where: { id: maintenanceId, companyId },
            include: { custodyItem: true },
        });
        if (!existing)
            throw new common_1.NotFoundException('طلب الصيانة غير موجود');
        const updated = await this.prisma.custodyMaintenance.update({
            where: { id: maintenanceId },
            data: {
                status: dto.status,
                actualCost: dto.actualCost,
                result: dto.result,
                conditionAfter: dto.conditionAfter,
                invoiceNumber: dto.invoiceNumber,
                attachments: dto.attachments,
                startedAt: dto.status === 'IN_PROGRESS' && !existing.startedAt ? new Date() : undefined,
                completedAt: dto.status === 'COMPLETED' || dto.status === 'CANNOT_REPAIR' ? new Date() : undefined,
            },
        });
        if (dto.status === 'COMPLETED' || dto.status === 'CANNOT_REPAIR') {
            const newStatus = dto.status === 'CANNOT_REPAIR'
                ? client_1.CustodyItemStatus.DAMAGED
                : (existing.custodyItem.currentAssigneeId ? client_1.CustodyItemStatus.ASSIGNED : client_1.CustodyItemStatus.AVAILABLE);
            await this.prisma.custodyItem.update({
                where: { id: existing.custodyItemId },
                data: {
                    status: newStatus,
                    condition: dto.conditionAfter || existing.custodyItem.condition,
                },
            });
        }
        return updated;
    }
    async getDashboard(companyId) {
        const [totalItems, availableItems, assignedItems, maintenanceItems, lostItems, categoryStats, recentAssignments, pendingReturns,] = await Promise.all([
            this.prisma.custodyItem.count({ where: { companyId } }),
            this.prisma.custodyItem.count({ where: { companyId, status: client_1.CustodyItemStatus.AVAILABLE } }),
            this.prisma.custodyItem.count({ where: { companyId, status: client_1.CustodyItemStatus.ASSIGNED } }),
            this.prisma.custodyItem.count({ where: { companyId, status: client_1.CustodyItemStatus.IN_MAINTENANCE } }),
            this.prisma.custodyItem.count({ where: { companyId, status: client_1.CustodyItemStatus.LOST } }),
            this.prisma.custodyCategory.findMany({
                where: { companyId, isActive: true },
                include: { _count: { select: { items: true } } },
            }),
            this.prisma.custodyAssignment.findMany({
                where: { companyId },
                take: 5,
                orderBy: { assignedAt: 'desc' },
                include: {
                    custodyItem: true,
                    employee: { select: { firstName: true, lastName: true } },
                },
            }),
            this.prisma.custodyReturn.count({ where: { companyId, status: client_1.CustodyReturnStatus.PENDING } }),
        ]);
        return {
            summary: {
                total: totalItems,
                available: availableItems,
                assigned: assignedItems,
                maintenance: maintenanceItems,
                lost: lostItems,
            },
            categoryStats,
            recentAssignments,
            pendingReturns,
        };
    }
    async getEmployeeCustodyReport(companyId, employeeId) {
        const [current, history, totalValue] = await Promise.all([
            this.prisma.custodyAssignment.findMany({
                where: { companyId, employeeId, status: client_1.CustodyAssignmentStatus.DELIVERED },
                include: { custodyItem: { include: { category: true } } },
            }),
            this.prisma.custodyAssignment.findMany({
                where: { companyId, employeeId, status: { in: [client_1.CustodyAssignmentStatus.RETURNED, client_1.CustodyAssignmentStatus.TRANSFERRED] } },
                include: { custodyItem: true },
                take: 20,
                orderBy: { actualReturn: 'desc' },
            }),
            this.prisma.custodyItem.aggregate({
                where: {
                    currentAssigneeId: employeeId,
                    companyId,
                },
                _sum: { purchasePrice: true },
            }),
        ]);
        return { current, history, totalValue: totalValue._sum.purchasePrice || 0 };
    }
    async generateQRCode(companyId, itemCode) {
        try {
            const data = `CUSTODY:${companyId}:${itemCode}`;
            const qrCodeDataUrl = await QRCode.toDataURL(data, { width: 200 });
            return qrCodeDataUrl;
        }
        catch (error) {
            console.error('Failed to generate QR code:', error);
            return null;
        }
    }
};
exports.CustodyService = CustodyService;
exports.CustodyService = CustodyService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService,
        smart_policy_trigger_service_1.SmartPolicyTriggerService])
], CustodyService);
//# sourceMappingURL=custody.service.js.map