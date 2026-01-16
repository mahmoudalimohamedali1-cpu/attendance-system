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
exports.ContractsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
let ContractsService = class ContractsService {
    constructor(prisma, auditService) {
        this.prisma = prisma;
        this.auditService = auditService;
    }
    async findAll(companyId, filters) {
        const where = { user: { companyId } };
        if (filters?.status) {
            where.status = filters.status;
        }
        if (filters?.qiwaStatus) {
            where.qiwaStatus = filters.qiwaStatus;
        }
        return this.prisma.contract.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        employeeCode: true,
                        nationalId: true,
                        iqamaNumber: true,
                        isSaudi: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findByEmployee(userId, companyId) {
        return this.prisma.contract.findMany({
            where: { userId, user: { companyId } },
            orderBy: { startDate: 'desc' },
        });
    }
    async findOne(id, companyId) {
        const contract = await this.prisma.contract.findFirst({
            where: { id, user: { companyId } },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        employeeCode: true,
                        nationalId: true,
                        iqamaNumber: true,
                        isSaudi: true,
                        phone: true,
                        email: true,
                    },
                },
            },
        });
        if (!contract)
            throw new common_1.NotFoundException('العقد غير موجود');
        return contract;
    }
    async create(dto, companyId, createdById) {
        const user = await this.prisma.user.findFirst({
            where: { id: dto.userId, companyId },
        });
        if (!user)
            throw new common_1.NotFoundException('الموظف غير موجود');
        await this.prisma.contract.updateMany({
            where: { userId: dto.userId, status: 'ACTIVE' },
            data: { status: 'EXPIRED' },
        });
        const contractNumber = dto.contractNumber || `CTR-${Date.now()}`;
        const totalSalary = (dto.basicSalary || 0) +
            (dto.housingAllowance || 0) +
            (dto.transportAllowance || 0) +
            (dto.otherAllowances || 0);
        const contract = await this.prisma.contract.create({
            data: {
                userId: dto.userId,
                contractNumber,
                type: dto.type,
                status: 'DRAFT',
                startDate: new Date(dto.startDate),
                endDate: dto.endDate ? new Date(dto.endDate) : null,
                probationEndDate: dto.probationEndDate ? new Date(dto.probationEndDate) : null,
                salaryCycle: dto.salaryCycle || 'MONTHLY',
                basicSalary: dto.basicSalary,
                housingAllowance: dto.housingAllowance,
                transportAllowance: dto.transportAllowance,
                otherAllowances: dto.otherAllowances,
                totalSalary: totalSalary > 0 ? totalSalary : null,
                contractJobTitle: dto.contractJobTitle,
                workLocation: dto.workLocation,
                workingHoursPerWeek: dto.workingHoursPerWeek || 48,
                annualLeaveDays: dto.annualLeaveDays || 21,
                noticePeriodDays: dto.noticePeriodDays || 30,
                documentUrl: dto.documentUrl,
                additionalTerms: dto.additionalTerms,
                notes: dto.notes,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        employeeCode: true,
                    },
                },
            },
        });
        await this.auditService.log('CREATE', 'Contract', contract.id, createdById, null, { contractNumber, type: dto.type, userId: dto.userId, basicSalary: dto.basicSalary }, `إنشاء عقد جديد: ${contractNumber}`);
        return contract;
    }
    async update(id, dto, companyId, updatedById) {
        const oldContract = await this.findOne(id, companyId);
        let totalSalary = oldContract.totalSalary ? Number(oldContract.totalSalary) : null;
        if (dto.basicSalary !== undefined || dto.housingAllowance !== undefined ||
            dto.transportAllowance !== undefined || dto.otherAllowances !== undefined) {
            totalSalary = (dto.basicSalary ?? Number(oldContract.basicSalary) ?? 0) +
                (dto.housingAllowance ?? Number(oldContract.housingAllowance) ?? 0) +
                (dto.transportAllowance ?? Number(oldContract.transportAllowance) ?? 0) +
                (dto.otherAllowances ?? Number(oldContract.otherAllowances) ?? 0);
        }
        const contract = await this.prisma.contract.update({
            where: { id },
            data: {
                ...(dto.type && { type: dto.type }),
                ...(dto.status && { status: dto.status }),
                ...(dto.startDate && { startDate: new Date(dto.startDate) }),
                ...(dto.endDate && { endDate: new Date(dto.endDate) }),
                ...(dto.probationEndDate && { probationEndDate: new Date(dto.probationEndDate) }),
                ...(dto.salaryCycle && { salaryCycle: dto.salaryCycle }),
                ...(dto.basicSalary !== undefined && { basicSalary: dto.basicSalary }),
                ...(dto.housingAllowance !== undefined && { housingAllowance: dto.housingAllowance }),
                ...(dto.transportAllowance !== undefined && { transportAllowance: dto.transportAllowance }),
                ...(dto.otherAllowances !== undefined && { otherAllowances: dto.otherAllowances }),
                totalSalary,
                ...(dto.contractJobTitle !== undefined && { contractJobTitle: dto.contractJobTitle }),
                ...(dto.workLocation !== undefined && { workLocation: dto.workLocation }),
                ...(dto.workingHoursPerWeek !== undefined && { workingHoursPerWeek: dto.workingHoursPerWeek }),
                ...(dto.annualLeaveDays !== undefined && { annualLeaveDays: dto.annualLeaveDays }),
                ...(dto.noticePeriodDays !== undefined && { noticePeriodDays: dto.noticePeriodDays }),
                ...(dto.documentUrl !== undefined && { documentUrl: dto.documentUrl }),
                ...(dto.additionalTerms !== undefined && { additionalTerms: dto.additionalTerms }),
                ...(dto.notes !== undefined && { notes: dto.notes }),
                ...(dto.qiwaContractId !== undefined && { qiwaContractId: dto.qiwaContractId }),
                ...(dto.qiwaStatus !== undefined && { qiwaStatus: dto.qiwaStatus }),
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        employeeCode: true,
                    },
                },
            },
        });
        await this.auditService.log('UPDATE', 'Contract', id, updatedById, { type: oldContract.type, status: oldContract.status, basicSalary: oldContract.basicSalary }, { type: contract.type, status: contract.status, basicSalary: contract.basicSalary }, `تعديل عقد: ${contract.contractNumber}`);
        return contract;
    }
    async sendToEmployee(id, companyId, userId) {
        const contract = await this.findOne(id, companyId);
        if (contract.status !== 'DRAFT') {
            throw new common_1.BadRequestException('يمكن إرسال العقود المسودة فقط');
        }
        const updated = await this.prisma.contract.update({
            where: { id },
            data: { status: 'PENDING_EMPLOYEE' },
        });
        await this.auditService.log('UPDATE', 'Contract', id, userId, { status: 'DRAFT' }, { status: 'PENDING_EMPLOYEE' }, `إرسال العقد للموظف للتوقيع: ${contract.contractNumber}`);
        return updated;
    }
    async employeeSign(id, companyId, employeeId, dto) {
        const contract = await this.findOne(id, companyId);
        if (contract.userId !== employeeId) {
            throw new common_1.ForbiddenException('لا يمكنك التوقيع على عقد موظف آخر');
        }
        if (contract.status !== 'PENDING_EMPLOYEE') {
            throw new common_1.BadRequestException('العقد ليس بانتظار توقيع الموظف');
        }
        const updated = await this.prisma.contract.update({
            where: { id },
            data: {
                employeeSignature: true,
                employeeSignedAt: new Date(),
                status: 'PENDING_EMPLOYER',
            },
        });
        await this.auditService.log('UPDATE', 'Contract', id, employeeId, { employeeSignature: false }, { employeeSignature: true }, `توقيع الموظف على العقد: ${contract.contractNumber}`);
        return updated;
    }
    async employeeReject(id, companyId, employeeId, dto) {
        const contract = await this.findOne(id, companyId);
        if (contract.userId !== employeeId) {
            throw new common_1.ForbiddenException('لا يمكنك رفض عقد موظف آخر');
        }
        if (contract.status !== 'PENDING_EMPLOYEE') {
            throw new common_1.BadRequestException('العقد ليس بانتظار توقيع الموظف');
        }
        const updated = await this.prisma.contract.update({
            where: { id },
            data: {
                status: 'DRAFT',
                notes: `رفض الموظف: ${dto.rejectionReason}\n${contract.notes || ''}`,
            },
        });
        await this.auditService.log('UPDATE', 'Contract', id, employeeId, { status: 'PENDING_EMPLOYEE' }, { status: 'DRAFT', rejectionReason: dto.rejectionReason }, `رفض الموظف للعقد: ${contract.contractNumber}`);
        return updated;
    }
    async employerSign(id, companyId, signerId, dto) {
        const contract = await this.findOne(id, companyId);
        if (contract.status !== 'PENDING_EMPLOYER') {
            throw new common_1.BadRequestException('العقد ليس بانتظار توقيع صاحب العمل');
        }
        const updated = await this.prisma.contract.update({
            where: { id },
            data: {
                employerSignature: true,
                employerSignedAt: new Date(),
                signedByUserId: signerId,
                status: 'ACTIVE',
            },
        });
        await this.auditService.log('UPDATE', 'Contract', id, signerId, { employerSignature: false }, { employerSignature: true }, `توقيع صاحب العمل على العقد: ${contract.contractNumber}`);
        return updated;
    }
    async updateQiwaStatus(id, companyId, dto, userId) {
        const contract = await this.findOne(id, companyId);
        const updated = await this.prisma.contract.update({
            where: { id },
            data: {
                qiwaContractId: dto.qiwaContractId,
                qiwaStatus: dto.qiwaStatus,
                qiwaRejectReason: dto.rejectReason,
                qiwaAuthDate: dto.authDate ? new Date(dto.authDate) : undefined,
                qiwaLastSync: new Date(),
            },
        });
        await this.auditService.log('UPDATE', 'Contract', id, userId, { qiwaStatus: contract.qiwaStatus }, { qiwaStatus: dto.qiwaStatus }, `تحديث حالة قوى للعقد: ${contract.contractNumber}`);
        return updated;
    }
    async terminate(id, dto, companyId, userId) {
        const contract = await this.findOne(id, companyId);
        if (contract.status !== 'ACTIVE') {
            throw new common_1.BadRequestException('لا يمكن إنهاء عقد غير نشط');
        }
        const terminatedContract = await this.prisma.contract.update({
            where: { id },
            data: {
                status: 'TERMINATED',
                terminatedAt: new Date(),
                terminationReason: dto.terminationReason,
                terminatedBy: userId,
            },
        });
        await this.auditService.log('UPDATE', 'Contract', id, userId, { status: 'ACTIVE' }, { status: 'TERMINATED', terminationReason: dto.terminationReason }, `إنهاء عقد: ${contract.contractNumber}`);
        return terminatedContract;
    }
    async renew(id, dto, companyId, userId) {
        const oldContract = await this.findOne(id, companyId);
        await this.prisma.contract.update({
            where: { id },
            data: { status: 'RENEWED' },
        });
        const newContract = await this.prisma.contract.create({
            data: {
                userId: oldContract.userId,
                contractNumber: `CTR-${Date.now()}`,
                type: dto.newType || oldContract.type,
                status: 'DRAFT',
                startDate: oldContract.endDate || new Date(),
                endDate: new Date(dto.newEndDate),
                salaryCycle: oldContract.salaryCycle,
                renewalCount: oldContract.renewalCount + 1,
                previousContractId: oldContract.id,
                basicSalary: dto.newBasicSalary || oldContract.basicSalary,
                housingAllowance: oldContract.housingAllowance,
                transportAllowance: oldContract.transportAllowance,
                otherAllowances: oldContract.otherAllowances,
                contractJobTitle: oldContract.contractJobTitle,
                workLocation: oldContract.workLocation,
                workingHoursPerWeek: oldContract.workingHoursPerWeek,
                annualLeaveDays: oldContract.annualLeaveDays,
                noticePeriodDays: oldContract.noticePeriodDays,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        employeeCode: true,
                    },
                },
            },
        });
        await this.auditService.log('CREATE', 'Contract', newContract.id, userId, null, { renewedFrom: oldContract.id, contractNumber: newContract.contractNumber }, `تجديد عقد: ${newContract.contractNumber} (من ${oldContract.contractNumber})`);
        return newContract;
    }
    async delete(id, companyId, deletedById) {
        const contract = await this.findOne(id, companyId);
        if (contract.status !== 'DRAFT') {
            throw new common_1.BadRequestException('لا يمكن حذف عقد غير مسودة');
        }
        await this.prisma.contract.delete({ where: { id } });
        await this.auditService.log('DELETE', 'Contract', id, deletedById, { contractNumber: contract.contractNumber, type: contract.type }, null, `حذف عقد: ${contract.contractNumber}`);
        return { success: true };
    }
    async getExpiring(companyId, days = 30) {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + days);
        return this.prisma.contract.findMany({
            where: {
                user: { companyId },
                status: 'ACTIVE',
                endDate: {
                    lte: expiryDate,
                    gte: new Date(),
                },
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        employeeCode: true,
                        phone: true,
                        email: true,
                    },
                },
            },
            orderBy: { endDate: 'asc' },
        });
    }
    async getPendingForEmployee(employeeId, companyId) {
        return this.prisma.contract.findMany({
            where: {
                userId: employeeId,
                user: { companyId },
                status: 'PENDING_EMPLOYEE',
            },
        });
    }
    async getPendingForEmployer(companyId) {
        return this.prisma.contract.findMany({
            where: {
                user: { companyId },
                status: 'PENDING_EMPLOYER',
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        employeeCode: true,
                    },
                },
            },
        });
    }
    async getStats(companyId) {
        const contracts = await this.prisma.contract.findMany({
            where: { user: { companyId } },
        });
        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        return {
            total: contracts.length,
            byStatus: {
                draft: contracts.filter(c => c.status === 'DRAFT').length,
                pendingEmployee: contracts.filter(c => c.status === 'PENDING_EMPLOYEE').length,
                pendingEmployer: contracts.filter(c => c.status === 'PENDING_EMPLOYER').length,
                active: contracts.filter(c => c.status === 'ACTIVE').length,
                expired: contracts.filter(c => c.status === 'EXPIRED').length,
                terminated: contracts.filter(c => c.status === 'TERMINATED').length,
            },
            byQiwaStatus: {
                notSubmitted: contracts.filter(c => c.qiwaStatus === 'NOT_SUBMITTED').length,
                pending: contracts.filter(c => c.qiwaStatus === 'PENDING').length,
                authenticated: contracts.filter(c => c.qiwaStatus === 'AUTHENTICATED').length,
                rejected: contracts.filter(c => c.qiwaStatus === 'REJECTED').length,
            },
            expiringSoon: contracts.filter(c => c.status === 'ACTIVE' &&
                c.endDate &&
                c.endDate <= thirtyDaysFromNow &&
                c.endDate >= now).length,
            byType: {
                permanent: contracts.filter(c => c.type === 'PERMANENT').length,
                fixedTerm: contracts.filter(c => c.type === 'FIXED_TERM').length,
                partTime: contracts.filter(c => c.type === 'PART_TIME').length,
            },
        };
    }
};
exports.ContractsService = ContractsService;
exports.ContractsService = ContractsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], ContractsService);
//# sourceMappingURL=contracts.service.js.map