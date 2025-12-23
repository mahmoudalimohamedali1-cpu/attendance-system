import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateContractDto, UpdateContractDto, TerminateContractDto, RenewContractDto } from './dto/contract.dto';

@Injectable()
export class ContractsService {
    constructor(
        private prisma: PrismaService,
        private auditService: AuditService,
    ) { }

    async findAll(companyId: string) {
        return this.prisma.contract.findMany({
            where: { user: { companyId } },
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
            orderBy: { createdAt: 'desc' },
        });
    }

    async findByEmployee(userId: string, companyId: string) {
        return this.prisma.contract.findMany({
            where: { userId, user: { companyId } },
            orderBy: { startDate: 'desc' },
        });
    }

    async findOne(id: string, companyId: string) {
        const contract = await this.prisma.contract.findFirst({
            where: { id, user: { companyId } },
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

        if (!contract) throw new NotFoundException('العقد غير موجود');
        return contract;
    }

    async create(dto: CreateContractDto, companyId: string) {
        // التحقق من أن الموظف في نفس الشركة
        const user = await this.prisma.user.findFirst({
            where: { id: dto.userId, companyId },
        });
        if (!user) throw new NotFoundException('الموظف غير موجود');

        // إلغاء العقد النشط الحالي إن وجد
        await this.prisma.contract.updateMany({
            where: { userId: dto.userId, status: 'ACTIVE' },
            data: { status: 'EXPIRED' },
        });

        // إنشاء رقم عقد فريد
        const contractNumber = dto.contractNumber || `CTR-${Date.now()}`;

        const contract = await this.prisma.contract.create({
            data: {
                userId: dto.userId,
                contractNumber,
                type: dto.type,
                status: 'ACTIVE',
                startDate: new Date(dto.startDate),
                endDate: dto.endDate ? new Date(dto.endDate) : null,
                probationEndDate: dto.probationEndDate ? new Date(dto.probationEndDate) : null,
                salaryCycle: dto.salaryCycle || 'MONTHLY',
                documentUrl: dto.documentUrl,
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

        // Log audit
        await this.auditService.log(
            'CREATE',
            'Contract',
            contract.id,
            undefined,
            null,
            { contractNumber, type: dto.type, userId: dto.userId },
            `إنشاء عقد جديد: ${contractNumber}`,
        );

        return contract;
    }

    async update(id: string, dto: UpdateContractDto, companyId: string, updatedById?: string) {
        const oldContract = await this.findOne(id, companyId);

        const contract = await this.prisma.contract.update({
            where: { id },
            data: {
                ...(dto.type && { type: dto.type }),
                ...(dto.startDate && { startDate: new Date(dto.startDate) }),
                ...(dto.endDate && { endDate: new Date(dto.endDate) }),
                ...(dto.probationEndDate && { probationEndDate: new Date(dto.probationEndDate) }),
                ...(dto.salaryCycle && { salaryCycle: dto.salaryCycle }),
                ...(dto.documentUrl !== undefined && { documentUrl: dto.documentUrl }),
                ...(dto.status && { status: dto.status }),
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

        // Log audit
        await this.auditService.log(
            'UPDATE',
            'Contract',
            id,
            updatedById,
            { type: oldContract.type, status: oldContract.status },
            { type: contract.type, status: contract.status },
            `تعديل عقد: ${contract.contractNumber}`,
        );

        return contract;
    }

    async terminate(id: string, dto: TerminateContractDto, companyId: string, userId: string) {
        const contract = await this.findOne(id, companyId);

        if (contract.status !== 'ACTIVE') {
            throw new BadRequestException('لا يمكن إنهاء عقد غير نشط');
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

        // Log audit
        await this.auditService.log(
            'UPDATE',
            'Contract',
            id,
            userId,
            { status: 'ACTIVE' },
            { status: 'TERMINATED', terminationReason: dto.terminationReason },
            `إنهاء عقد: ${contract.contractNumber}`,
        );

        return terminatedContract;
    }

    async renew(id: string, dto: RenewContractDto, companyId: string) {
        const oldContract = await this.findOne(id, companyId);

        // تحديث العقد القديم
        await this.prisma.contract.update({
            where: { id },
            data: { status: 'RENEWED' },
        });

        // إنشاء عقد جديد
        return this.prisma.contract.create({
            data: {
                userId: oldContract.userId,
                contractNumber: `CTR-${Date.now()}`,
                type: dto.newType || oldContract.type,
                status: 'ACTIVE',
                startDate: oldContract.endDate || new Date(),
                endDate: new Date(dto.newEndDate),
                salaryCycle: oldContract.salaryCycle,
                renewalCount: oldContract.renewalCount + 1,
                previousContractId: oldContract.id,
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

    async delete(id: string, companyId: string, deletedById?: string) {
        const contract = await this.findOne(id, companyId);

        await this.prisma.contract.delete({ where: { id } });

        // Log audit
        await this.auditService.log(
            'DELETE',
            'Contract',
            id,
            deletedById,
            { contractNumber: contract.contractNumber, type: contract.type },
            null,
            `حذف عقد: ${contract.contractNumber}`,
        );

        return { success: true };
    }

    async getExpiring(companyId: string, days: number = 30) {
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
                    },
                },
            },
            orderBy: { endDate: 'asc' },
        });
    }
}
