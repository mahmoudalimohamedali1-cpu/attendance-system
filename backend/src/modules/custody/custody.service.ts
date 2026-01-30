import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SmartPolicyTriggerService } from "../smart-policies/smart-policy-trigger.service";
import { AuditService } from '../audit/audit.service';
import { User, NotificationType, CustodyItemStatus, CustodyAssignmentStatus, CustodyReturnStatus, CustodyTransferStatus, CustodyMaintenanceStatus, CustodyCondition, MaintenanceType, SmartPolicyTrigger, AuditAction } from '@prisma/client';
import {
    CreateCategoryCto, UpdateCategoryCto,
    CreateItemDto, UpdateItemDto,
    AssignCustodyDto, ApproveAssignmentDto, RejectAssignmentDto, SignAssignmentDto,
    RequestReturnDto, ReviewReturnDto,
    RequestTransferDto, ApproveTransferDto, RejectTransferDto,
    CreateMaintenanceDto, UpdateMaintenanceDto,
    CustodyQueryDto
} from './dto/custody.dto';
import * as QRCode from 'qrcode';

@Injectable()
export class CustodyService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly notificationsService: NotificationsService,
        private readonly smartPolicyTrigger: SmartPolicyTriggerService,
        private readonly auditService: AuditService,
    ) { }

    // ==================== Categories ====================

    async createCategory(companyId: string, userId: string, dto: CreateCategoryCto) {
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

        // Audit: تسجيل إنشاء فئة عهد
        await this.auditService.log(
            AuditAction.CREATE,
            'CustodyCategory',
            category.id,
            userId,
            null,
            { name: category.name, nameEn: category.nameEn },
            `إنشاء فئة عهد جديدة: ${category.name}`,
        );

        return category;
    }

    async getCategories(companyId: string) {
        return this.prisma.custodyCategory.findMany({
            where: { companyId, isActive: true },
            include: {
                _count: { select: { items: true } },
            },
            orderBy: { name: 'asc' },
        });
    }

    async updateCategory(companyId: string, categoryId: string, userId: string, dto: UpdateCategoryCto) {
        const existing = await this.prisma.custodyCategory.findFirst({
            where: { id: categoryId, companyId },
        });
        if (!existing) throw new NotFoundException('الفئة غير موجودة');

        const updated = await this.prisma.custodyCategory.update({
            where: { id: categoryId },
            data: dto,
        });

        // Audit: تسجيل تحديث فئة عهد
        await this.auditService.log(
            AuditAction.UPDATE,
            'CustodyCategory',
            categoryId,
            userId,
            { name: existing.name, nameEn: existing.nameEn, requiresApproval: existing.requiresApproval },
            { name: updated.name, nameEn: updated.nameEn, requiresApproval: updated.requiresApproval },
            `تحديث فئة عهد: ${updated.name}`,
        );

        return updated;
    }

    async deleteCategory(companyId: string, categoryId: string, userId: string) {
        const existing = await this.prisma.custodyCategory.findFirst({
            where: { id: categoryId, companyId },
            include: { _count: { select: { items: true } } },
        });
        if (!existing) throw new NotFoundException('الفئة غير موجودة');

        const isSoftDelete = existing._count.items > 0;

        if (isSoftDelete) {
            // Soft delete
            await this.prisma.custodyCategory.update({
                where: { id: categoryId },
                data: { isActive: false },
            });
        } else {
            await this.prisma.custodyCategory.delete({ where: { id: categoryId } });
        }

        // Audit: تسجيل حذف فئة عهد
        await this.auditService.log(
            AuditAction.DELETE,
            'CustodyCategory',
            categoryId,
            userId,
            { name: existing.name, nameEn: existing.nameEn, itemCount: existing._count.items },
            null,
            isSoftDelete
                ? `إلغاء تفعيل فئة عهد: ${existing.name} (لديها ${existing._count.items} عناصر)`
                : `حذف فئة عهد نهائياً: ${existing.name}`,
        );

        return { success: true };
    }

    // ==================== Items ====================

    async createItem(companyId: string, userId: string, dto: CreateItemDto) {
        // Check category exists
        const category = await this.prisma.custodyCategory.findFirst({
            where: { id: dto.categoryId, companyId, isActive: true },
        });
        if (!category) throw new NotFoundException('الفئة غير موجودة');

        // Check code uniqueness
        const existingCode = await this.prisma.custodyItem.findFirst({
            where: { companyId, code: dto.code },
        });
        if (existingCode) throw new BadRequestException('كود العهدة مستخدم مسبقاً');

        // Generate QR Code
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
                purchasePrice: dto.purchasePrice as any,
                warrantyExpiry: dto.warrantyExpiry ? new Date(dto.warrantyExpiry) : null,
                vendor: dto.vendor,
                invoiceNumber: dto.invoiceNumber,
                currentLocation: dto.currentLocation,
                notes: dto.notes,
                imageUrl: dto.imageUrl,
                branchId: dto.branchId,
                condition: (dto.condition as CustodyCondition) || CustodyCondition.NEW,
                status: CustodyItemStatus.AVAILABLE,
            },
            include: { category: true, branch: true },
        });

        // Audit: تسجيل إنشاء عهدة جديدة
        await this.auditService.log(
            AuditAction.CREATE,
            'CustodyItem',
            item.id,
            userId,
            null,
            {
                code: item.code,
                name: item.name,
                serialNumber: item.serialNumber,
                category: item.category?.name,
                purchasePrice: item.purchasePrice,
            },
            `إنشاء عهدة جديدة: ${item.code} - ${item.name}`,
        );

        return item;
    }

    async getItems(companyId: string, query: CustodyQueryDto) {
        const where: any = { companyId };

        if (query.status) where.status = query.status;
        if (query.categoryId) where.categoryId = query.categoryId;
        if (query.branchId) where.branchId = query.branchId;
        if (query.employeeId) where.currentAssigneeId = query.employeeId;
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

    async getItemById(companyId: string, itemId: string) {
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
        if (!item) throw new NotFoundException('العهدة غير موجودة');
        return item;
    }

    async updateItem(companyId: string, itemId: string, userId: string, dto: UpdateItemDto) {
        const existing = await this.prisma.custodyItem.findFirst({
            where: { id: itemId, companyId },
        });
        if (!existing) throw new NotFoundException('العهدة غير موجودة');

        const updated = await this.prisma.custodyItem.update({
            where: { id: itemId },
            data: {
                ...dto,
                purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : undefined,
                warrantyExpiry: dto.warrantyExpiry ? new Date(dto.warrantyExpiry) : undefined,
                purchasePrice: dto.purchasePrice as any,
                condition: dto.condition as CustodyCondition,
                status: dto.status as CustodyItemStatus,
            },
            include: { category: true, branch: true },
        });

        // Audit: تسجيل تحديث عهدة
        await this.auditService.log(
            AuditAction.UPDATE,
            'CustodyItem',
            itemId,
            userId,
            {
                code: existing.code,
                name: existing.name,
                status: existing.status,
                condition: existing.condition,
            },
            {
                code: updated.code,
                name: updated.name,
                status: updated.status,
                condition: updated.condition,
            },
            `تحديث عهدة: ${updated.code} - ${updated.name}`,
        );

        return updated;
    }

    async deleteItem(companyId: string, itemId: string, userId: string) {
        const existing = await this.prisma.custodyItem.findFirst({
            where: { id: itemId, companyId },
        });
        if (!existing) throw new NotFoundException('العهدة غير موجودة');

        if (existing.status === CustodyItemStatus.ASSIGNED) {
            throw new BadRequestException('لا يمكن حذف عهدة مسلمة لموظف');
        }

        await this.prisma.custodyItem.update({
            where: { id: itemId },
            data: { status: CustodyItemStatus.DISPOSED },
        });

        // Audit: تسجيل التخلص من عهدة
        await this.auditService.log(
            AuditAction.DELETE,
            'CustodyItem',
            itemId,
            userId,
            {
                code: existing.code,
                name: existing.name,
                serialNumber: existing.serialNumber,
                status: existing.status,
            },
            { status: CustodyItemStatus.DISPOSED },
            `التخلص من عهدة: ${existing.code} - ${existing.name}`,
        );

        return { success: true };
    }

    // ==================== Assignments ====================

    async assignCustody(companyId: string, userId: string, dto: AssignCustodyDto) {
        // Check item is available
        const item = await this.prisma.custodyItem.findFirst({
            where: { id: dto.custodyItemId, companyId },
            include: { category: true },
        });
        if (!item) throw new NotFoundException('العهدة غير موجودة');
        if (item.status !== CustodyItemStatus.AVAILABLE) {
            throw new BadRequestException('العهدة غير متاحة للتسليم');
        }

        // Check employee exists
        const employee = await this.prisma.user.findFirst({
            where: { id: dto.employeeId, companyId, status: 'ACTIVE' },
        });
        if (!employee) throw new NotFoundException('الموظف غير موجود');

        const requiresApproval = item.category?.requiresApproval ?? true;

        const assignment = await this.prisma.custodyAssignment.create({
            data: {
                companyId,
                custodyItemId: dto.custodyItemId,
                employeeId: dto.employeeId,
                assignedById: userId,
                expectedReturn: dto.expectedReturn ? new Date(dto.expectedReturn) : null,
                conditionOnAssign: (dto.conditionOnAssign as CustodyCondition) || item.condition,
                notes: dto.notes,
                attachments: dto.attachments || [],
                status: requiresApproval ? CustodyAssignmentStatus.PENDING : CustodyAssignmentStatus.DELIVERED,
            },
            include: {
                custodyItem: true,
                employee: { select: { id: true, firstName: true, lastName: true } },
            },
        });

        // Update item status
        if (!requiresApproval) {
            await this.prisma.custodyItem.update({
                where: { id: dto.custodyItemId },
                data: {
                    status: CustodyItemStatus.ASSIGNED,
                    currentAssigneeId: dto.employeeId,
                },
            });
        }

        // Notify employee
        await this.notificationsService.sendNotification(
            dto.employeeId,
            NotificationType.GENERAL,
            '📦 عهدة جديدة',
            `تم تسليمك عهدة: ${item.name}`,
            { type: 'custody', assignmentId: assignment.id },
        );

        // Audit: تسجيل تسليم عهدة
        await this.auditService.log(
            AuditAction.CREATE,
            'CustodyAssignment',
            assignment.id,
            userId,
            null,
            {
                itemCode: item.code,
                itemName: item.name,
                employeeId: employee.id,
                employeeName: `${employee.firstName} ${employee.lastName}`,
                status: assignment.status,
            },
            `تسليم عهدة ${item.code} إلى ${employee.firstName} ${employee.lastName}`,
        );

        return assignment;
    }

    async getMyAssignments(companyId: string, employeeId: string) {
        return this.prisma.custodyAssignment.findMany({
            where: {
                companyId,
                employeeId,
                status: { in: [CustodyAssignmentStatus.DELIVERED, CustodyAssignmentStatus.APPROVED] },
            },
            include: {
                custodyItem: { include: { category: true } },
            },
            orderBy: { assignedAt: 'desc' },
        });
    }

    async getPendingAssignments(companyId: string) {
        return this.prisma.custodyAssignment.findMany({
            where: { companyId, status: CustodyAssignmentStatus.PENDING },
            include: {
                custodyItem: { include: { category: true } },
                employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
                assignedBy: { select: { id: true, firstName: true, lastName: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async approveAssignment(companyId: string, userId: string, dto: ApproveAssignmentDto) {
        const assignment = await this.prisma.custodyAssignment.findFirst({
            where: { id: dto.assignmentId, companyId, status: CustodyAssignmentStatus.PENDING },
            include: { custodyItem: true, employee: true },
        });
        if (!assignment) throw new NotFoundException('طلب التسليم غير موجود');

        await this.prisma.$transaction([
            this.prisma.custodyAssignment.update({
                where: { id: dto.assignmentId },
                data: {
                    status: CustodyAssignmentStatus.APPROVED,
                    approvedById: userId,
                    approvedAt: new Date(),
                    notes: dto.notes || assignment.notes,
                },
            }),
            this.prisma.custodyItem.update({
                where: { id: assignment.custodyItemId },
                data: {
                    status: CustodyItemStatus.ASSIGNED,
                    currentAssigneeId: assignment.employeeId,
                },
            }),
        ]);

        // Notify employee
        await this.notificationsService.sendNotification(
            assignment.employeeId,
            NotificationType.GENERAL,
            '✅ تمت الموافقة على العهدة',
            `تمت الموافقة على تسليمك عهدة: ${assignment.custodyItem.name}`,
            { type: 'custody', assignmentId: assignment.id },
        );

        // Audit: تسجيل اعتماد تسليم العهدة
        await this.auditService.log(
            AuditAction.UPDATE,
            'CustodyAssignment',
            dto.assignmentId,
            userId,
            { status: CustodyAssignmentStatus.PENDING },
            { status: CustodyAssignmentStatus.APPROVED },
            `اعتماد تسليم عهدة ${assignment.custodyItem.code} إلى ${assignment.employee.firstName} ${assignment.employee.lastName}`,
        );

        return { success: true };
    }

    async rejectAssignment(companyId: string, userId: string, dto: RejectAssignmentDto) {
        const assignment = await this.prisma.custodyAssignment.findFirst({
            where: { id: dto.assignmentId, companyId, status: CustodyAssignmentStatus.PENDING },
            include: { custodyItem: true, employee: true },
        });
        if (!assignment) throw new NotFoundException('طلب التسليم غير موجود');

        await this.prisma.custodyAssignment.update({
            where: { id: dto.assignmentId },
            data: {
                status: CustodyAssignmentStatus.REJECTED,
                approvedById: userId,
                approvedAt: new Date(),
                notes: dto.reason,
            },
        });

        // Notify employee
        await this.notificationsService.sendNotification(
            assignment.employeeId,
            NotificationType.GENERAL,
            '❌ تم رفض طلب العهدة',
            `تم رفض طلب تسليمك عهدة: ${assignment.custodyItem.name} - السبب: ${dto.reason}`,
            { type: 'custody', assignmentId: assignment.id },
        );

        // Audit: تسجيل رفض تسليم العهدة
        await this.auditService.log(
            AuditAction.UPDATE,
            'CustodyAssignment',
            dto.assignmentId,
            userId,
            { status: CustodyAssignmentStatus.PENDING },
            { status: CustodyAssignmentStatus.REJECTED, reason: dto.reason },
            `رفض تسليم عهدة ${assignment.custodyItem.code} إلى ${assignment.employee.firstName} ${assignment.employee.lastName} - السبب: ${dto.reason}`,
        );

        return { success: true };
    }

    async signAssignment(companyId: string, employeeId: string, dto: SignAssignmentDto) {
        const assignment = await this.prisma.custodyAssignment.findFirst({
            where: {
                id: dto.assignmentId,
                companyId,
                employeeId,
                status: { in: [CustodyAssignmentStatus.APPROVED, CustodyAssignmentStatus.DELIVERED] },
            },
            include: { custodyItem: true, employee: true },
        });
        if (!assignment) throw new NotFoundException('العهدة غير موجودة');

        await this.prisma.custodyAssignment.update({
            where: { id: dto.assignmentId },
            data: {
                employeeSignature: dto.signature,
                signatureDate: new Date(),
                status: CustodyAssignmentStatus.DELIVERED,
            },
        });

        // Audit: تسجيل توقيع الموظف على استلام العهدة
        await this.auditService.log(
            AuditAction.UPDATE,
            'CustodyAssignment',
            dto.assignmentId,
            employeeId,
            { signed: false },
            { signed: true, signatureDate: new Date() },
            `توقيع استلام عهدة ${assignment.custodyItem.code} من قبل ${assignment.employee.firstName} ${assignment.employee.lastName}`,
        );

        return { success: true };
    }

    // ==================== Returns ====================

    async requestReturn(companyId: string, employeeId: string, dto: RequestReturnDto) {
        const assignment = await this.prisma.custodyAssignment.findFirst({
            where: {
                id: dto.assignmentId,
                companyId,
                employeeId,
                status: CustodyAssignmentStatus.DELIVERED,
            },
            include: { custodyItem: true, employee: true },
        });
        if (!assignment) throw new NotFoundException('العهدة غير مسلمة لك');

        const returnRequest = await this.prisma.custodyReturn.create({
            data: {
                companyId,
                custodyItemId: assignment.custodyItemId,
                assignmentId: dto.assignmentId,
                returnedById: employeeId,
                returnReason: dto.returnReason,
                conditionOnReturn: dto.conditionOnReturn as CustodyCondition,
                damageDescription: dto.damageDescription,
                attachments: dto.attachments || [],
            },
            include: { custodyItem: true },
        });

        // Audit: تسجيل طلب إرجاع عهدة
        await this.auditService.log(
            AuditAction.CREATE,
            'CustodyReturn',
            returnRequest.id,
            employeeId,
            null,
            {
                itemCode: assignment.custodyItem.code,
                itemName: assignment.custodyItem.name,
                returnReason: dto.returnReason,
                conditionOnReturn: dto.conditionOnReturn,
                hasDamage: !!dto.damageDescription,
            },
            `طلب إرجاع عهدة ${assignment.custodyItem.code} من قبل ${assignment.employee.firstName} ${assignment.employee.lastName}`,
        );

        // Notify HR/Admin
        // TODO: Get HR users and notify them

        return returnRequest;
    }

    async getPendingReturns(companyId: string) {
        return this.prisma.custodyReturn.findMany({
            where: { companyId, status: CustodyReturnStatus.PENDING },
            include: {
                custodyItem: { include: { category: true } },
                returnedBy: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
                assignment: true,
            },
            orderBy: { returnDate: 'desc' },
        });
    }

    async reviewReturn(companyId: string, userId: string, dto: ReviewReturnDto) {
        const returnRequest = await this.prisma.custodyReturn.findFirst({
            where: { id: dto.returnId, companyId, status: CustodyReturnStatus.PENDING },
            include: { custodyItem: true, assignment: true },
        });
        if (!returnRequest) throw new NotFoundException('طلب الإرجاع غير موجود');

        const isApproved = dto.decision === 'APPROVED';

        if (isApproved) {
            const operations = [
                this.prisma.custodyReturn.update({
                    where: { id: dto.returnId },
                    data: {
                        status: CustodyReturnStatus.COMPLETED,
                        reviewedById: userId,
                        reviewedAt: new Date(),
                        reviewNotes: dto.reviewNotes,
                        estimatedCost: dto.estimatedCost as any,
                        chargeEmployee: dto.chargeEmployee || false,
                    },
                }),
                this.prisma.custodyAssignment.update({
                    where: { id: returnRequest.assignmentId },
                    data: {
                        status: CustodyAssignmentStatus.RETURNED,
                        actualReturn: new Date(),
                        conditionOnReturn: returnRequest.conditionOnReturn,
                    },
                }),
                this.prisma.custodyItem.update({
                    where: { id: returnRequest.custodyItemId },
                    data: {
                        status: CustodyItemStatus.AVAILABLE,
                        currentAssigneeId: null,
                        condition: returnRequest.conditionOnReturn,
                    },
                }),
            ];

            // Create deduction approval if employee is charged
            if (dto.chargeEmployee && Number(dto.estimatedCost) > 0) {
                // Fetch current open payroll period for this company
                const currentDate = new Date();
                const currentMonth = currentDate.getMonth() + 1;
                const currentYear = currentDate.getFullYear();

                const openPeriod = await this.prisma.payrollPeriod.findFirst({
                    where: {
                        companyId,
                        status: { in: ['DRAFT', 'PROCESSING'] },
                        OR: [
                            { month: currentMonth, year: currentYear },
                            { month: currentMonth === 12 ? 1 : currentMonth + 1, year: currentMonth === 12 ? currentYear + 1 : currentYear }
                        ]
                    },
                    orderBy: { createdAt: 'desc' }
                });

                operations.push(
                    this.prisma.deductionApproval.create({
                        data: {
                            companyId,
                            employeeId: returnRequest.returnedById,
                            deductionType: 'CUSTODY' as any,
                            referenceId: dto.returnId,
                            periodId: openPeriod?.id || null, // Link to current period if exists
                            originalAmount: Number(dto.estimatedCost),
                            approvedAmount: Number(dto.estimatedCost), // Same as original for custody
                            status: 'APPROVED' as any, // Auto-approve since HR already reviewed the return
                            reason: `خصم عهده تالفه: ${returnRequest.custodyItem.name} (${returnRequest.custodyItem.code})`,
                            notes: dto.reviewNotes,
                            approvedById: userId, // The reviewer is the approver
                            approvedAt: new Date(),
                        }
                    }) as any
                );
            }

            await this.prisma.$transaction(operations);
        } else {
            await this.prisma.custodyReturn.update({
                where: { id: dto.returnId },
                data: {
                    status: CustodyReturnStatus.REJECTED,
                    reviewedById: userId,
                    reviewedAt: new Date(),
                    reviewNotes: dto.reviewNotes,
                },
            });
        }

        // Notify employee
        await this.notificationsService.sendNotification(
            returnRequest.returnedById,
            NotificationType.GENERAL,
            isApproved ? '✅ تم قبول إرجاع العهدة' : '❌ تم رفض إرجاع العهدة',
            isApproved
                ? `تم قبول إرجاع العهدة: ${returnRequest.custodyItem.name}`
                : `تم رفض إرجاع العهدة: ${returnRequest.custodyItem.name} - ${dto.reviewNotes || ''}`,
            { type: 'custody', returnId: dto.returnId },
        );

        // Audit: تسجيل مراجعة طلب إرجاع العهدة
        await this.auditService.log(
            AuditAction.UPDATE,
            'CustodyReturn',
            dto.returnId,
            userId,
            { status: CustodyReturnStatus.PENDING },
            {
                status: isApproved ? CustodyReturnStatus.COMPLETED : CustodyReturnStatus.REJECTED,
                reviewNotes: dto.reviewNotes,
                chargeEmployee: dto.chargeEmployee,
                estimatedCost: dto.estimatedCost,
            },
            isApproved
                ? `قبول إرجاع عهدة ${returnRequest.custodyItem.code}`
                : `رفض إرجاع عهدة ${returnRequest.custodyItem.code} - ${dto.reviewNotes || ''}`,
        );

        return { success: true };
    }

    // ==================== Transfers ====================

    async requestTransfer(companyId: string, user: User, dto: RequestTransferDto) {
        // Get current assignment
        const currentAssignment = await this.prisma.custodyAssignment.findFirst({
            where: {
                custodyItemId: dto.custodyItemId,
                companyId,
                status: CustodyAssignmentStatus.DELIVERED,
            },
            include: { custodyItem: true, employee: true },
        });
        if (!currentAssignment) throw new NotFoundException('العهدة غير مسلمة حالياً');

        // Check if user is the current holder or admin
        if (currentAssignment.employeeId !== user.id && user.role !== 'ADMIN') {
            throw new ForbiddenException('ليس لديك صلاحية لطلب تحويل هذه العهدة');
        }

        // Check target employee exists
        const toEmployee = await this.prisma.user.findFirst({
            where: { id: dto.toEmployeeId, companyId, status: 'ACTIVE' },
        });
        if (!toEmployee) throw new NotFoundException('الموظف المستلم غير موجود');

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

        // Notify target employee
        await this.notificationsService.sendNotification(
            dto.toEmployeeId,
            NotificationType.GENERAL,
            '🔄 طلب تحويل عهدة',
            `تم طلب تحويل عهدة: ${transfer.custodyItem.name} إليك`,
            { type: 'custody', transferId: transfer.id },
        );

        // Audit: تسجيل طلب تحويل عهدة
        await this.auditService.log(
            AuditAction.CREATE,
            'CustodyTransfer',
            transfer.id,
            user.id,
            null,
            {
                itemCode: transfer.custodyItem.code,
                itemName: transfer.custodyItem.name,
                fromEmployee: `${currentAssignment.employee.firstName} ${currentAssignment.employee.lastName}`,
                toEmployee: `${toEmployee.firstName} ${toEmployee.lastName}`,
                reason: dto.reason,
            },
            `طلب تحويل عهدة ${transfer.custodyItem.code} من ${currentAssignment.employee.firstName} ${currentAssignment.employee.lastName} إلى ${toEmployee.firstName} ${toEmployee.lastName}`,
        );

        return transfer;
    }

    async getPendingTransfers(companyId: string, userId?: string) {
        const where: any = { companyId, status: CustodyTransferStatus.PENDING };
        if (userId) where.toEmployeeId = userId;

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

    async approveTransfer(companyId: string, userId: string, dto: ApproveTransferDto) {
        const transfer = await this.prisma.custodyTransfer.findFirst({
            where: { id: dto.transferId, companyId, toEmployeeId: userId, status: CustodyTransferStatus.PENDING },
            include: { custodyItem: true },
        });
        if (!transfer) throw new NotFoundException('طلب التحويل غير موجود');

        await this.prisma.$transaction([
            // Update transfer
            this.prisma.custodyTransfer.update({
                where: { id: dto.transferId },
                data: {
                    status: CustodyTransferStatus.COMPLETED,
                    approvedById: userId,
                    approvedAt: new Date(),
                    toSignature: dto.signature,
                    notes: dto.notes,
                },
            }),
            // Close old assignment
            this.prisma.custodyAssignment.updateMany({
                where: { custodyItemId: transfer.custodyItemId, status: CustodyAssignmentStatus.DELIVERED },
                data: { status: CustodyAssignmentStatus.TRANSFERRED, actualReturn: new Date() },
            }),
            // Create new assignment
            this.prisma.custodyAssignment.create({
                data: {
                    companyId,
                    custodyItemId: transfer.custodyItemId,
                    employeeId: transfer.toEmployeeId,
                    assignedById: transfer.initiatedById,
                    status: CustodyAssignmentStatus.DELIVERED,
                    approvedById: userId,
                    approvedAt: new Date(),
                    conditionOnAssign: transfer.custodyItem.condition,
                },
            }),
            // Update item
            this.prisma.custodyItem.update({
                where: { id: transfer.custodyItemId },
                data: { currentAssigneeId: transfer.toEmployeeId },
            }),
        ]);

        // Notify from employee
        await this.notificationsService.sendNotification(
            transfer.fromEmployeeId,
            NotificationType.GENERAL,
            '✅ تم تحويل العهدة',
            `تم تحويل العهدة: ${transfer.custodyItem.name} إلى الموظف الآخر`,
            { type: 'custody', transferId: dto.transferId },
        );

        // Audit: تسجيل قبول تحويل العهدة
        await this.auditService.log(
            AuditAction.UPDATE,
            'CustodyTransfer',
            dto.transferId,
            userId,
            { status: CustodyTransferStatus.PENDING },
            { status: CustodyTransferStatus.COMPLETED },
            `قبول تحويل عهدة ${transfer.custodyItem.code}`,
        );

        return { success: true };
    }

    async rejectTransfer(companyId: string, userId: string, dto: RejectTransferDto) {
        const transfer = await this.prisma.custodyTransfer.findFirst({
            where: { id: dto.transferId, companyId, toEmployeeId: userId, status: CustodyTransferStatus.PENDING },
            include: { custodyItem: true },
        });
        if (!transfer) throw new NotFoundException('طلب التحويل غير موجود');

        await this.prisma.custodyTransfer.update({
            where: { id: dto.transferId },
            data: { status: CustodyTransferStatus.REJECTED, notes: dto.reason },
        });

        // Notify initiator
        await this.notificationsService.sendNotification(
            transfer.initiatedById,
            NotificationType.GENERAL,
            '❌ تم رفض تحويل العهدة',
            `تم رفض تحويل العهدة: ${transfer.custodyItem.name} - ${dto.reason}`,
            { type: 'custody', transferId: dto.transferId },
        );

        // Audit: تسجيل رفض تحويل العهدة
        await this.auditService.log(
            AuditAction.UPDATE,
            'CustodyTransfer',
            dto.transferId,
            userId,
            { status: CustodyTransferStatus.PENDING },
            { status: CustodyTransferStatus.REJECTED, reason: dto.reason },
            `رفض تحويل عهدة ${transfer.custodyItem.code} - السبب: ${dto.reason}`,
        );

        return { success: true };
    }

    // ==================== Maintenance ====================

    async createMaintenance(companyId: string, userId: string, dto: CreateMaintenanceDto) {
        const item = await this.prisma.custodyItem.findFirst({
            where: { id: dto.custodyItemId, companyId },
        });
        if (!item) throw new NotFoundException('العهدة غير موجودة');

        const maintenance = await this.prisma.custodyMaintenance.create({
            data: {
                companyId,
                custodyItemId: dto.custodyItemId,
                type: dto.type as MaintenanceType,
                description: dto.description,
                reportedById: userId,
                estimatedCost: dto.estimatedCost as any,
                vendor: dto.vendor,
                vendorContact: dto.vendorContact,
                vendorEmail: dto.vendorEmail,
                attachments: dto.attachments || [],
            },
            include: { custodyItem: true },
        });

        // Update item status
        await this.prisma.custodyItem.update({
            where: { id: dto.custodyItemId },
            data: { status: CustodyItemStatus.IN_MAINTENANCE },
        });

        // Audit: تسجيل طلب صيانة عهدة
        await this.auditService.log(
            AuditAction.CREATE,
            'CustodyMaintenance',
            maintenance.id,
            userId,
            null,
            {
                itemCode: item.code,
                itemName: item.name,
                type: dto.type,
                description: dto.description,
                estimatedCost: dto.estimatedCost,
                vendor: dto.vendor,
            },
            `طلب صيانة عهدة ${item.code} - ${item.name} (${dto.type})`,
        );

        return maintenance;
    }

    async getMaintenances(companyId: string, status?: string) {
        const where: any = { companyId };
        if (status) where.status = status;

        return this.prisma.custodyMaintenance.findMany({
            where,
            include: {
                custodyItem: { include: { category: true } },
                reportedBy: { select: { id: true, firstName: true, lastName: true } },
            },
            orderBy: { reportedAt: 'desc' },
        });
    }

    async updateMaintenance(companyId: string, maintenanceId: string, userId: string, dto: UpdateMaintenanceDto) {
        const existing = await this.prisma.custodyMaintenance.findFirst({
            where: { id: maintenanceId, companyId },
            include: { custodyItem: true },
        });
        if (!existing) throw new NotFoundException('طلب الصيانة غير موجود');

        const updated = await this.prisma.custodyMaintenance.update({
            where: { id: maintenanceId },
            data: {
                status: dto.status as CustodyMaintenanceStatus,
                actualCost: dto.actualCost as any,
                result: dto.result,
                conditionAfter: dto.conditionAfter as CustodyCondition,
                invoiceNumber: dto.invoiceNumber,
                attachments: dto.attachments,
                startedAt: dto.status === 'IN_PROGRESS' && !existing.startedAt ? new Date() : undefined,
                completedAt: dto.status === 'COMPLETED' || dto.status === 'CANNOT_REPAIR' ? new Date() : undefined,
            },
        });

        // Update item status if maintenance completed
        if (dto.status === 'COMPLETED' || dto.status === 'CANNOT_REPAIR') {
            const newStatus = dto.status === 'CANNOT_REPAIR'
                ? CustodyItemStatus.DAMAGED
                : (existing.custodyItem.currentAssigneeId ? CustodyItemStatus.ASSIGNED : CustodyItemStatus.AVAILABLE);

            await this.prisma.custodyItem.update({
                where: { id: existing.custodyItemId },
                data: {
                    status: newStatus,
                    condition: dto.conditionAfter as CustodyCondition || existing.custodyItem.condition,
                },
            });
        }

        // Audit: تسجيل تحديث حالة الصيانة
        await this.auditService.log(
            AuditAction.UPDATE,
            'CustodyMaintenance',
            maintenanceId,
            userId,
            {
                status: existing.status,
                actualCost: existing.actualCost,
            },
            {
                status: dto.status,
                actualCost: dto.actualCost,
                result: dto.result,
                conditionAfter: dto.conditionAfter,
            },
            `تحديث صيانة عهدة ${existing.custodyItem.code} - الحالة: ${dto.status}`,
        );

        return updated;
    }

    // ==================== Dashboard & Reports ====================

    async getDashboard(companyId: string) {
        const [
            totalItems,
            availableItems,
            assignedItems,
            maintenanceItems,
            lostItems,
            categoryStats,
            recentAssignments,
            pendingReturns,
        ] = await Promise.all([
            this.prisma.custodyItem.count({ where: { companyId } }),
            this.prisma.custodyItem.count({ where: { companyId, status: CustodyItemStatus.AVAILABLE } }),
            this.prisma.custodyItem.count({ where: { companyId, status: CustodyItemStatus.ASSIGNED } }),
            this.prisma.custodyItem.count({ where: { companyId, status: CustodyItemStatus.IN_MAINTENANCE } }),
            this.prisma.custodyItem.count({ where: { companyId, status: CustodyItemStatus.LOST } }),
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
            this.prisma.custodyReturn.count({ where: { companyId, status: CustodyReturnStatus.PENDING } }),
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

    async getEmployeeCustodyReport(companyId: string, employeeId: string) {
        const [current, history, totalValue] = await Promise.all([
            this.prisma.custodyAssignment.findMany({
                where: { companyId, employeeId, status: CustodyAssignmentStatus.DELIVERED },
                include: { custodyItem: { include: { category: true } } },
            }),
            this.prisma.custodyAssignment.findMany({
                where: { companyId, employeeId, status: { in: [CustodyAssignmentStatus.RETURNED, CustodyAssignmentStatus.TRANSFERRED] } },
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

    // ==================== Helpers ====================

    private async generateQRCode(companyId: string, itemCode: string): Promise<string | null> {
        try {
            const data = `CUSTODY:${companyId}:${itemCode}`;
            const qrCodeDataUrl = await QRCode.toDataURL(data, { width: 200 });
            return qrCodeDataUrl;
        } catch (error) {
            console.error('Failed to generate QR code:', error);
            return null;
        }
    }
}

