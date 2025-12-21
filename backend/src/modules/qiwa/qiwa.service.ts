import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface QiwaContractExport {
    contractNumber: string;
    employeeId: string;
    employeeName: string;
    nationalId: string;
    contractType: string;
    startDate: string;
    endDate: string | null;
    probationEndDate: string | null;
    salaryCycle: string;
    status: string;
}

@Injectable()
export class QiwaService {
    constructor(private prisma: PrismaService) { }

    /**
     * تصدير العقود بصيغة متوافقة مع قوى
     */
    async exportContracts(companyId: string, status?: string): Promise<QiwaContractExport[]> {
        const where: any = { user: { companyId } };
        if (status) where.status = status;

        const contracts = await this.prisma.contract.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        nationalId: true,
                        employeeCode: true,
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
            contractType: this.mapContractType(String(c.type)),
            startDate: c.startDate.toISOString().split('T')[0],
            endDate: c.endDate?.toISOString().split('T')[0] || null,
            probationEndDate: c.probationEndDate?.toISOString().split('T')[0] || null,
            salaryCycle: c.salaryCycle,
            status: this.mapContractStatus(String(c.status)),
        }));
    }

    /**
     * تصدير CSV متوافق مع قوى
     */
    async exportContractsCsv(companyId: string, status?: string): Promise<string> {
        const contracts = await this.exportContracts(companyId, status);

        // Header row
        const headers = [
            'رقم العقد',
            'رقم الموظف',
            'اسم الموظف',
            'رقم الهوية',
            'نوع العقد',
            'تاريخ البداية',
            'تاريخ النهاية',
            'نهاية فترة التجربة',
            'دورة الراتب',
            'الحالة',
        ];

        const rows = contracts.map(c => [
            c.contractNumber,
            c.employeeId,
            c.employeeName,
            c.nationalId,
            c.contractType,
            c.startDate,
            c.endDate || '',
            c.probationEndDate || '',
            c.salaryCycle,
            c.status,
        ]);

        // Add BOM for Arabic support in Excel
        const bom = '\uFEFF';
        return bom + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
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

        return {
            total: contracts.length,
            active: contracts.filter(c => String(c.status) === 'ACTIVE').length,
            expired: contracts.filter(c => String(c.status) === 'EXPIRED').length,
            terminated: contracts.filter(c => String(c.status) === 'TERMINATED').length,
            expiringSoon: contracts.filter(c =>
                String(c.status) === 'ACTIVE' &&
                c.endDate &&
                c.endDate <= thirtyDaysFromNow &&
                c.endDate >= now
            ).length,
            byType: {
                permanent: contracts.filter(c => String(c.type) === 'PERMANENT').length,
                temporary: contracts.filter(c => String(c.type) === 'TEMPORARY').length,
                probation: contracts.filter(c => String(c.type) === 'PROBATION').length,
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
                    },
                },
            },
            orderBy: { endDate: 'asc' },
        });
    }

    // Helper: Map contract type to Qiwa format
    private mapContractType(type: string): string {
        const map: Record<string, string> = {
            PERMANENT: 'دائم',
            TEMPORARY: 'مؤقت',
            PROBATION: 'تحت التجربة',
            PART_TIME: 'دوام جزئي',
        };
        return map[type] || type;
    }

    // Helper: Map contract status to Qiwa format
    private mapContractStatus(status: string): string {
        const map: Record<string, string> = {
            ACTIVE: 'ساري',
            EXPIRED: 'منتهي',
            TERMINATED: 'مفسوخ',
            RENEWED: 'مجدد',
        };
        return map[status] || status;
    }
}
