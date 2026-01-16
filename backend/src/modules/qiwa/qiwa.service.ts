import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

export interface QiwaContractExport {
    contractNumber: string;
    employeeId: string;
    employeeName: string;
    nationalId: string;
    iqamaNumber: string | null;
    isSaudi: boolean;
    contractType: string;
    startDate: string;
    endDate: string | null;
    probationEndDate: string | null;
    jobTitle: string;
    workLocation: string | null;
    workingHoursPerWeek: number;
    // تفاصيل الراتب (مطلوبة لقوى)
    basicSalary: number | null;
    housingAllowance: number | null;
    transportAllowance: number | null;
    otherAllowances: number | null;
    totalSalary: number | null;
    // الإجازات
    annualLeaveDays: number;
    noticePeriodDays: number;
    // التوقيعات
    employeeSignature: boolean;
    employerSignature: boolean;
    // حالة قوى
    qiwaContractId: string | null;
    qiwaStatus: string;
    status: string;
}

@Injectable()
export class QiwaService {
    constructor(
        private prisma: PrismaService,
        private auditService: AuditService,
    ) { }

    /**
     * تصدير العقود بصيغة متوافقة مع قوى
     */
    async exportContracts(companyId: string, status?: string, qiwaStatus?: string): Promise<QiwaContractExport[]> {
        const where: any = { user: { companyId } };
        if (status) where.status = status;
        if (qiwaStatus) where.qiwaStatus = qiwaStatus;

        const contracts = await this.prisma.contract.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        nationalId: true,
                        iqamaNumber: true,
                        isSaudi: true,
                        employeeCode: true,
                        profession: true,
                    },
                },
            },
            orderBy: { startDate: 'desc' },
        });

        return contracts.map(c => ({
            contractNumber: c.contractNumber || '',
            employeeId: c.user.employeeCode || c.user.id,
            employeeName: `${c.user.firstName} ${c.user.lastName}`,
            nationalId: c.user.nationalId || '',
            iqamaNumber: c.user.iqamaNumber,
            isSaudi: c.user.isSaudi,
            contractType: this.mapContractType(String(c.type)),
            startDate: c.startDate.toISOString().split('T')[0],
            endDate: c.endDate?.toISOString().split('T')[0] || null,
            probationEndDate: c.probationEndDate?.toISOString().split('T')[0] || null,
            jobTitle: c.contractJobTitle || c.user.profession || '',
            workLocation: c.workLocation,
            workingHoursPerWeek: c.workingHoursPerWeek || 48,
            // تفاصيل الراتب
            basicSalary: c.basicSalary ? Number(c.basicSalary) : null,
            housingAllowance: c.housingAllowance ? Number(c.housingAllowance) : null,
            transportAllowance: c.transportAllowance ? Number(c.transportAllowance) : null,
            otherAllowances: c.otherAllowances ? Number(c.otherAllowances) : null,
            totalSalary: c.totalSalary ? Number(c.totalSalary) : null,
            // الإجازات
            annualLeaveDays: c.annualLeaveDays || 21,
            noticePeriodDays: c.noticePeriodDays || 30,
            // التوقيعات
            employeeSignature: c.employeeSignature || false,
            employerSignature: c.employerSignature || false,
            // حالة قوى
            qiwaContractId: c.qiwaContractId,
            qiwaStatus: this.mapQiwaStatus(String(c.qiwaStatus)),
            status: this.mapContractStatus(String(c.status)),
        }));
    }

    /**
     * تصدير CSV متوافق مع قوى
     */
    async exportContractsCsv(companyId: string, status?: string): Promise<string> {
        const contracts = await this.exportContracts(companyId, status);

        // Header row - تتوافق مع متطلبات قوى
        const headers = [
            'رقم العقد',
            'رقم الموظف',
            'اسم الموظف',
            'رقم الهوية/الإقامة',
            'الجنسية',
            'نوع العقد',
            'المسمى الوظيفي',
            'مقر العمل',
            'تاريخ البداية',
            'تاريخ النهاية',
            'نهاية فترة التجربة',
            'ساعات العمل الأسبوعية',
            'الراتب الأساسي',
            'بدل السكن',
            'بدل المواصلات',
            'بدلات أخرى',
            'إجمالي الراتب',
            'أيام الإجازة السنوية',
            'فترة الإشعار',
            'توقيع الموظف',
            'توقيع صاحب العمل',
            'رقم العقد في قوى',
            'حالة التوثيق',
            'حالة العقد',
        ];

        const rows = contracts.map(c => [
            c.contractNumber,
            c.employeeId,
            c.employeeName,
            c.iqamaNumber || c.nationalId,
            c.isSaudi ? 'سعودي' : 'غير سعودي',
            c.contractType,
            c.jobTitle,
            c.workLocation || '',
            c.startDate,
            c.endDate || '',
            c.probationEndDate || '',
            c.workingHoursPerWeek,
            c.basicSalary || '',
            c.housingAllowance || '',
            c.transportAllowance || '',
            c.otherAllowances || '',
            c.totalSalary || '',
            c.annualLeaveDays,
            c.noticePeriodDays,
            c.employeeSignature ? 'نعم' : 'لا',
            c.employerSignature ? 'نعم' : 'لا',
            c.qiwaContractId || '',
            c.qiwaStatus,
            c.status,
        ]);

        // Add BOM for Arabic support in Excel
        const bom = '\uFEFF';
        return bom + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    }

    /**
     * تسجيل عقد في منصة قوى
     */
    async registerContract(contractId: string, companyId: string, userId?: string) {
        // جلب العقد مع بيانات الموظف
        const contract = await this.prisma.contract.findFirst({
            where: { id: contractId, user: { companyId } },
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
                        profession: true,
                    },
                },
            },
        });

        if (!contract) {
            throw new NotFoundException('العقد غير موجود');
        }

        // التحقق من جاهزية العقد للتسجيل
        this.validateContractForQiwa(contract);

        // تحضير بيانات التسجيل
        const qiwaData = {
            contractNumber: contract.contractNumber,
            employeeName: `${contract.user.firstName} ${contract.user.lastName}`,
            nationalId: contract.user.nationalId || contract.user.iqamaNumber,
            isSaudi: contract.user.isSaudi,
            contractType: String(contract.type),
            startDate: contract.startDate,
            endDate: contract.endDate,
            jobTitle: contract.contractJobTitle || contract.user.profession,
            basicSalary: contract.basicSalary ? Number(contract.basicSalary) : null,
            totalSalary: contract.totalSalary ? Number(contract.totalSalary) : null,
        };

        // محاكاة استدعاء API قوى (سيتم استبداله بالاستدعاء الحقيقي لاحقاً)
        const qiwaResponse = await this.simulateQiwaApiCall(qiwaData);

        // تحديث العقد بمعرف قوى والحالة
        const updatedContract = await this.prisma.contract.update({
            where: { id: contractId },
            data: {
                qiwaContractId: qiwaResponse.contractId,
                qiwaStatus: 'PENDING',
                status: contract.status === 'DRAFT' ? 'PENDING_QIWA' : contract.status,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        employeeCode: true,
                        nationalId: true,
                        iqamaNumber: true,
                    },
                },
            },
        });

        // تسجيل في سجل المراجعة
        await this.auditService.log(
            'UPDATE',
            'Contract',
            contractId,
            userId,
            { qiwaStatus: contract.qiwaStatus },
            { qiwaStatus: 'PENDING', qiwaContractId: qiwaResponse.contractId },
            `تسجيل عقد في منصة قوى: ${contract.contractNumber}`,
        );

        return {
            success: true,
            contract: updatedContract,
            qiwaContractId: qiwaResponse.contractId,
            message: 'تم تسجيل العقد في منصة قوى بنجاح',
        };
    }

    /**
     * التحقق من جاهزية العقد للتسجيل في قوى
     */
    private validateContractForQiwa(contract: any): void {
        const errors: string[] = [];

        // التحقق من الحقول المطلوبة
        if (!contract.contractNumber) errors.push('رقم العقد مطلوب');
        if (!contract.startDate) errors.push('تاريخ بداية العقد مطلوب');
        if (!contract.contractJobTitle && !contract.user.profession) {
            errors.push('المسمى الوظيفي مطلوب');
        }
        if (!contract.user.nationalId && !contract.user.iqamaNumber) {
            errors.push('رقم الهوية أو الإقامة مطلوب');
        }
        if (!contract.basicSalary && !contract.totalSalary) {
            errors.push('الراتب الأساسي مطلوب');
        }

        // التحقق من التوقيعات
        if (!contract.employeeSignature) {
            errors.push('توقيع الموظف مطلوب');
        }
        if (!contract.employerSignature) {
            errors.push('توقيع صاحب العمل مطلوب');
        }

        // التحقق من أن العقد غير مسجل مسبقاً
        if (contract.qiwaContractId && contract.qiwaStatus === 'AUTHENTICATED') {
            errors.push('العقد مسجل ومصدق في قوى بالفعل');
        }

        if (errors.length > 0) {
            throw new BadRequestException({
                message: 'العقد غير جاهز للتسجيل في قوى',
                errors,
            });
        }
    }

    /**
     * محاكاة استدعاء API قوى (مؤقت - للتطوير)
     */
    private async simulateQiwaApiCall(data: any): Promise<{ contractId: string; status: string }> {
        // محاكاة تأخير الشبكة
        await new Promise(resolve => setTimeout(resolve, 500));

        // إرجاع معرف عقد وهمي
        const qiwaContractId = `QIWA-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        return {
            contractId: qiwaContractId,
            status: 'PENDING',
        };
    }

    /**
     * إحصائيات العقود
     */
    async getContractStats(companyId: string) {
        const contracts = await this.prisma.contract.findMany({
            where: { user: { companyId } },
        });

        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

        return {
            total: contracts.length,
            active: contracts.filter(c => String(c.status) === 'ACTIVE').length,
            expired: contracts.filter(c => String(c.status) === 'EXPIRED').length,
            terminated: contracts.filter(c => String(c.status) === 'TERMINATED').length,
            draft: contracts.filter(c => String(c.status) === 'DRAFT').length,
            pendingSignatures: contracts.filter(c =>
                ['PENDING_EMPLOYEE', 'PENDING_EMPLOYER'].includes(String(c.status))
            ).length,
            expiringSoon30: contracts.filter(c =>
                String(c.status) === 'ACTIVE' &&
                c.endDate &&
                c.endDate <= thirtyDaysFromNow &&
                c.endDate >= now
            ).length,
            expiringSoon60: contracts.filter(c =>
                String(c.status) === 'ACTIVE' &&
                c.endDate &&
                c.endDate <= sixtyDaysFromNow &&
                c.endDate >= now
            ).length,
            byType: {
                permanent: contracts.filter(c => String(c.type) === 'PERMANENT').length,
                fixedTerm: contracts.filter(c => String(c.type) === 'FIXED_TERM').length,
                partTime: contracts.filter(c => String(c.type) === 'PART_TIME').length,
                probation: contracts.filter(c => String(c.type) === 'PROBATION').length,
            },
            byQiwaStatus: {
                notSubmitted: contracts.filter(c => String(c.qiwaStatus) === 'NOT_SUBMITTED').length,
                pending: contracts.filter(c => String(c.qiwaStatus) === 'PENDING').length,
                authenticated: contracts.filter(c => String(c.qiwaStatus) === 'AUTHENTICATED').length,
                rejected: contracts.filter(c => String(c.qiwaStatus) === 'REJECTED').length,
            },
        };
    }

    /**
     * العقود المنتهية قريباً (لتوثيقها في قوى)
     */
    async getContractsRequiringAction(companyId: string) {
        const now = new Date();
        const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

        return this.prisma.contract.findMany({
            where: {
                user: { companyId },
                status: 'ACTIVE',
                endDate: {
                    lte: sixtyDaysFromNow,
                    gte: now,
                },
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        employeeCode: true,
                        nationalId: true,
                        iqamaNumber: true,
                        phone: true,
                        email: true,
                    },
                },
            },
            orderBy: { endDate: 'asc' },
        });
    }

    /**
     * العقود التي تحتاج توثيق في قوى
     */
    async getContractsPendingQiwa(companyId: string) {
        return this.prisma.contract.findMany({
            where: {
                user: { companyId },
                status: 'ACTIVE',
                qiwaStatus: 'NOT_SUBMITTED',
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        employeeCode: true,
                        nationalId: true,
                        iqamaNumber: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    // Helper: Map contract type to Qiwa format
    private mapContractType(type: string): string {
        const map: Record<string, string> = {
            PERMANENT: 'دائم (غير محدد المدة)',
            FIXED_TERM: 'محدد المدة',
            PROBATION: 'تحت التجربة',
            PART_TIME: 'دوام جزئي',
            SEASONAL: 'موسمي',
        };
        return map[type] || type;
    }

    // Helper: Map contract status to Qiwa format
    private mapContractStatus(status: string): string {
        const map: Record<string, string> = {
            DRAFT: 'مسودة',
            PENDING_EMPLOYEE: 'بانتظار توقيع الموظف',
            PENDING_EMPLOYER: 'بانتظار توقيع صاحب العمل',
            PENDING_QIWA: 'بانتظار التوثيق',
            ACTIVE: 'ساري',
            EXPIRED: 'منتهي',
            TERMINATED: 'منهي',
            RENEWED: 'مجدد',
            SUSPENDED: 'موقوف',
            REJECTED: 'مرفوض',
        };
        return map[status] || status;
    }

    // Helper: Map Qiwa auth status
    private mapQiwaStatus(status: string): string {
        const map: Record<string, string> = {
            NOT_SUBMITTED: 'لم يرسل للتوثيق',
            PENDING: 'بانتظار التوثيق',
            AUTHENTICATED: 'موثق',
            REJECTED: 'مرفوض',
            EXPIRED: 'منتهي التوثيق',
        };
        return map[status] || status;
    }
}
