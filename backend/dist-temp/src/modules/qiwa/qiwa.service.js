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
exports.QiwaService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let QiwaService = class QiwaService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async exportContracts(companyId, status, qiwaStatus) {
        const where = { user: { companyId } };
        if (status)
            where.status = status;
        if (qiwaStatus)
            where.qiwaStatus = qiwaStatus;
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
            basicSalary: c.basicSalary ? Number(c.basicSalary) : null,
            housingAllowance: c.housingAllowance ? Number(c.housingAllowance) : null,
            transportAllowance: c.transportAllowance ? Number(c.transportAllowance) : null,
            otherAllowances: c.otherAllowances ? Number(c.otherAllowances) : null,
            totalSalary: c.totalSalary ? Number(c.totalSalary) : null,
            annualLeaveDays: c.annualLeaveDays || 21,
            noticePeriodDays: c.noticePeriodDays || 30,
            employeeSignature: c.employeeSignature || false,
            employerSignature: c.employerSignature || false,
            qiwaContractId: c.qiwaContractId,
            qiwaStatus: this.mapQiwaStatus(String(c.qiwaStatus)),
            status: this.mapContractStatus(String(c.status)),
        }));
    }
    async exportContractsCsv(companyId, status) {
        const contracts = await this.exportContracts(companyId, status);
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
        const bom = '\uFEFF';
        return bom + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    }
    async getContractStats(companyId) {
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
            pendingSignatures: contracts.filter(c => ['PENDING_EMPLOYEE', 'PENDING_EMPLOYER'].includes(String(c.status))).length,
            expiringSoon30: contracts.filter(c => String(c.status) === 'ACTIVE' &&
                c.endDate &&
                c.endDate <= thirtyDaysFromNow &&
                c.endDate >= now).length,
            expiringSoon60: contracts.filter(c => String(c.status) === 'ACTIVE' &&
                c.endDate &&
                c.endDate <= sixtyDaysFromNow &&
                c.endDate >= now).length,
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
    async getContractsRequiringAction(companyId) {
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
    async getContractsPendingQiwa(companyId) {
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
    mapContractType(type) {
        const map = {
            PERMANENT: 'دائم (غير محدد المدة)',
            FIXED_TERM: 'محدد المدة',
            PROBATION: 'تحت التجربة',
            PART_TIME: 'دوام جزئي',
            SEASONAL: 'موسمي',
        };
        return map[type] || type;
    }
    mapContractStatus(status) {
        const map = {
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
    mapQiwaStatus(status) {
        const map = {
            NOT_SUBMITTED: 'لم يرسل للتوثيق',
            PENDING: 'بانتظار التوثيق',
            AUTHENTICATED: 'موثق',
            REJECTED: 'مرفوض',
            EXPIRED: 'منتهي التوثيق',
        };
        return map[status] || status;
    }
};
exports.QiwaService = QiwaService;
exports.QiwaService = QiwaService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], QiwaService);
//# sourceMappingURL=qiwa.service.js.map