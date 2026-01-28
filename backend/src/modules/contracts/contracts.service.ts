import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
    CreateContractDto,
    UpdateContractDto,
    TerminateContractDto,
    RenewContractDto,
    SignContractDto,
    RejectContractDto,
    UpdateQiwaStatusDto,
    ContractStatus,
    QiwaAuthStatus
} from './dto/contract.dto';

@Injectable()
export class ContractsService {
    constructor(
        private prisma: PrismaService,
        private auditService: AuditService,
        private notificationsService: NotificationsService,
    ) { }


    async findAll(companyId: string, filters?: { status?: string; qiwaStatus?: string }) {
        const where: any = { user: { companyId } };

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
                        nationalId: true,
                        iqamaNumber: true,
                        isSaudi: true,
                        phone: true,
                        email: true,
                    },
                },
            },
        });

        if (!contract) throw new NotFoundException('العقد غير موجود');
        return contract;
    }

    async create(dto: CreateContractDto, companyId: string, createdById?: string) {
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

        // حساب إجمالي الراتب
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
                salaryCycle: (dto.salaryCycle as any) || 'MONTHLY',
                // حقول الراتب
                basicSalary: dto.basicSalary,
                housingAllowance: dto.housingAllowance,
                transportAllowance: dto.transportAllowance,
                otherAllowances: dto.otherAllowances,
                totalSalary: totalSalary > 0 ? totalSalary : null,
                // بيانات العمل
                contractJobTitle: dto.contractJobTitle,
                workLocation: dto.workLocation,
                workingHoursPerWeek: dto.workingHoursPerWeek || 48,
                annualLeaveDays: dto.annualLeaveDays || 21,
                noticePeriodDays: dto.noticePeriodDays || 30,
                // مستندات
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

        // Log audit
        await this.auditService.log(
            'CREATE',
            'Contract',
            contract.id,
            createdById,
            null,
            { contractNumber, type: dto.type, userId: dto.userId, basicSalary: dto.basicSalary },
            `إنشاء عقد جديد: ${contractNumber}`,
        );

        return contract;
    }

    async update(id: string, dto: UpdateContractDto, companyId: string, updatedById?: string) {
        const oldContract = await this.findOne(id, companyId);

        // حساب إجمالي الراتب إذا تغير أي من مكونات الراتب
        let totalSalary: number | null = oldContract.totalSalary ? Number(oldContract.totalSalary) : null;
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
                ...(dto.salaryCycle && { salaryCycle: dto.salaryCycle as any }),
                // حقول الراتب
                ...(dto.basicSalary !== undefined && { basicSalary: dto.basicSalary }),
                ...(dto.housingAllowance !== undefined && { housingAllowance: dto.housingAllowance }),
                ...(dto.transportAllowance !== undefined && { transportAllowance: dto.transportAllowance }),
                ...(dto.otherAllowances !== undefined && { otherAllowances: dto.otherAllowances }),
                totalSalary,
                // بيانات العمل
                ...(dto.contractJobTitle !== undefined && { contractJobTitle: dto.contractJobTitle }),
                ...(dto.workLocation !== undefined && { workLocation: dto.workLocation }),
                ...(dto.workingHoursPerWeek !== undefined && { workingHoursPerWeek: dto.workingHoursPerWeek }),
                ...(dto.annualLeaveDays !== undefined && { annualLeaveDays: dto.annualLeaveDays }),
                ...(dto.noticePeriodDays !== undefined && { noticePeriodDays: dto.noticePeriodDays }),
                // مستندات
                ...(dto.documentUrl !== undefined && { documentUrl: dto.documentUrl }),
                ...(dto.additionalTerms !== undefined && { additionalTerms: dto.additionalTerms }),
                ...(dto.notes !== undefined && { notes: dto.notes }),
                // قوى
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

        // Log audit
        await this.auditService.log(
            'UPDATE',
            'Contract',
            id,
            updatedById,
            { type: oldContract.type, status: oldContract.status, basicSalary: oldContract.basicSalary },
            { type: contract.type, status: contract.status, basicSalary: contract.basicSalary },
            `تعديل عقد: ${contract.contractNumber}`,
        );

        return contract;
    }

    // ===== إرسال العقد للموظف للتوقيع =====
    async sendToEmployee(id: string, companyId: string, userId: string) {
        const contract = await this.findOne(id, companyId);

        if (contract.status !== 'DRAFT') {
            throw new BadRequestException('يمكن إرسال العقود المسودة فقط');
        }

        const updated = await this.prisma.contract.update({
            where: { id },
            data: { status: 'PENDING_EMPLOYEE' },
        });

        await this.auditService.log(
            'UPDATE',
            'Contract',
            id,
            userId,
            { status: 'DRAFT' },
            { status: 'PENDING_EMPLOYEE' },
            `إرسال العقد للموظف للتوقيع: ${contract.contractNumber}`,
        );

        // إرسال إشعار للموظف
        await this.notificationsService.sendNotification(
            contract.userId,
            'GENERAL',
            '📝 عقد جديد بانتظار توقيعك',
            `تم إرسال عقد عمل جديد لك للمراجعة والتوقيع. رقم العقد: ${contract.contractNumber}`,
            { contractId: id, actionUrl: '/my-contracts' },
        );

        return updated;
    }

    // ===== توقيع الموظف على العقد =====
    async employeeSign(id: string, companyId: string, employeeId: string, dto: SignContractDto) {
        const contract = await this.findOne(id, companyId);

        if (contract.userId !== employeeId) {
            throw new ForbiddenException('لا يمكنك التوقيع على عقد موظف آخر');
        }

        if (contract.status !== 'PENDING_EMPLOYEE') {
            throw new BadRequestException('العقد ليس بانتظار توقيع الموظف');
        }

        // جلب بيانات الموظف
        const employee = await this.prisma.user.findUnique({
            where: { id: employeeId },
            select: { firstName: true, lastName: true },
        });

        const updated = await this.prisma.contract.update({
            where: { id },
            data: {
                employeeSignature: true,
                employeeSignedAt: new Date(),
                status: 'PENDING_EMPLOYER',
            },
        });

        await this.auditService.log(
            'UPDATE',
            'Contract',
            id,
            employeeId,
            { employeeSignature: false },
            { employeeSignature: true },
            `توقيع الموظف على العقد: ${contract.contractNumber}`,
        );

        // إشعار HR/Admin بأن الموظف وقع العقد
        const hrUsers = await this.prisma.user.findMany({
            where: { companyId, role: 'ADMIN', status: 'ACTIVE' },
            select: { id: true },
        });

        for (const hrUser of hrUsers) {
            await this.notificationsService.sendNotification(
                hrUser.id,
                'GENERAL',
                '✅ موظف وقّع على عقده',
                `وقّع الموظف ${employee?.firstName || ''} ${employee?.lastName || 'موظف'} على العقد رقم ${contract.contractNumber}. العقد جاهز لتوقيع صاحب العمل.`,
                { contractId: id, actionUrl: '/contracts' },
            );
        }

        return updated;
    }

    // ===== رفض الموظف للعقد =====
    async employeeReject(id: string, companyId: string, employeeId: string, dto: RejectContractDto) {
        const contract = await this.findOne(id, companyId);

        if (contract.userId !== employeeId) {
            throw new ForbiddenException('لا يمكنك رفض عقد موظف آخر');
        }

        if (contract.status !== 'PENDING_EMPLOYEE') {
            throw new BadRequestException('العقد ليس بانتظار توقيع الموظف');
        }

        const updated = await this.prisma.contract.update({
            where: { id },
            data: {
                status: 'DRAFT',
                notes: `رفض الموظف: ${dto.rejectionReason}\n${contract.notes || ''}`,
            },
        });

        await this.auditService.log(
            'UPDATE',
            'Contract',
            id,
            employeeId,
            { status: 'PENDING_EMPLOYEE' },
            { status: 'DRAFT', rejectionReason: dto.rejectionReason },
            `رفض الموظف للعقد: ${contract.contractNumber}`,
        );

        return updated;
    }

    // ===== توقيع صاحب العمل على العقد =====
    async employerSign(id: string, companyId: string, signerId: string, dto: SignContractDto) {
        const contract = await this.findOne(id, companyId);

        if (contract.status !== 'PENDING_EMPLOYER') {
            throw new BadRequestException('العقد ليس بانتظار توقيع صاحب العمل');
        }

        const updated = await this.prisma.contract.update({
            where: { id },
            data: {
                employerSignature: true,
                employerSignedAt: new Date(),
                signedByUserId: signerId,
                status: 'ACTIVE', // أو PENDING_QIWA إذا كان التوثيق مطلوب
            },
        });

        await this.auditService.log(
            'UPDATE',
            'Contract',
            id,
            signerId,
            { employerSignature: false },
            { employerSignature: true },
            `توقيع صاحب العمل على العقد: ${contract.contractNumber}`,
        );

        return updated;
    }

    // ===== تحديث حالة قوى =====
    async updateQiwaStatus(id: string, companyId: string, dto: UpdateQiwaStatusDto, userId: string) {
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

        await this.auditService.log(
            'UPDATE',
            'Contract',
            id,
            userId,
            { qiwaStatus: contract.qiwaStatus },
            { qiwaStatus: dto.qiwaStatus },
            `تحديث حالة قوى للعقد: ${contract.contractNumber}`,
        );

        return updated;
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

    async renew(id: string, dto: RenewContractDto, companyId: string, userId?: string) {
        const oldContract = await this.findOne(id, companyId);

        // تحديث العقد القديم
        await this.prisma.contract.update({
            where: { id },
            data: { status: 'RENEWED' },
        });

        // إنشاء عقد جديد
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
                // نسخ بيانات الراتب
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

        await this.auditService.log(
            'CREATE',
            'Contract',
            newContract.id,
            userId,
            null,
            { renewedFrom: oldContract.id, contractNumber: newContract.contractNumber },
            `تجديد عقد: ${newContract.contractNumber} (من ${oldContract.contractNumber})`,
        );

        return newContract;
    }

    async delete(id: string, companyId: string, deletedById?: string) {
        const contract = await this.findOne(id, companyId);

        if (contract.status !== 'DRAFT') {
            throw new BadRequestException('لا يمكن حذف عقد غير مسودة');
        }

        await this.prisma.contract.delete({ where: { id } });

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
                        phone: true,
                        email: true,
                    },
                },
            },
            orderBy: { endDate: 'asc' },
        });
    }

    // ===== العقود بانتظار التوقيع (للموظف) =====
    async getPendingForEmployee(employeeId: string, companyId: string) {
        return this.prisma.contract.findMany({
            where: {
                userId: employeeId,
                user: { companyId },
                status: 'PENDING_EMPLOYEE',
            },
        });
    }

    // ===== العقود بانتظار توقيع صاحب العمل =====
    async getPendingForEmployer(companyId: string) {
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

    // ===== إحصائيات العقود =====
    async getStats(companyId: string) {
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
            expiringSoon: contracts.filter(c =>
                c.status === 'ACTIVE' &&
                c.endDate &&
                c.endDate <= thirtyDaysFromNow &&
                c.endDate >= now
            ).length,
            byType: {
                permanent: contracts.filter(c => c.type === 'PERMANENT').length,
                fixedTerm: contracts.filter(c => c.type === 'FIXED_TERM').length,
                partTime: contracts.filter(c => c.type === 'PART_TIME').length,
            },
        };
    }
}
