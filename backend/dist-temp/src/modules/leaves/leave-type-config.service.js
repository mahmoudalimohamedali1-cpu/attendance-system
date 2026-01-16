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
exports.LeaveTypeConfigService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const client_1 = require("@prisma/client");
let LeaveTypeConfigService = class LeaveTypeConfigService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getActiveLeaveTypes(companyId) {
        return this.prisma.leaveTypeConfig.findMany({
            where: { companyId, isActive: true },
            include: {
                entitlementTiers: {
                    orderBy: { minServiceYears: 'asc' },
                },
                sickPayTiers: {
                    orderBy: { fromDay: 'asc' },
                },
            },
            orderBy: { sortOrder: 'asc' },
        });
    }
    async getLeaveTypeByCode(companyId, code) {
        const leaveType = await this.prisma.leaveTypeConfig.findUnique({
            where: { companyId_code: { companyId, code } },
            include: {
                entitlementTiers: { orderBy: { minServiceYears: 'asc' } },
                sickPayTiers: { orderBy: { fromDay: 'asc' } },
            },
        });
        if (!leaveType) {
            throw new common_1.NotFoundException(`نوع الإجازة ${code} غير موجود`);
        }
        return leaveType;
    }
    async calculateEntitlement(leaveTypeId, hireDate) {
        const leaveType = await this.prisma.leaveTypeConfig.findUnique({
            where: { id: leaveTypeId },
            include: { entitlementTiers: { orderBy: { minServiceYears: 'asc' } } },
        });
        if (!leaveType) {
            throw new common_1.NotFoundException('نوع الإجازة غير موجود');
        }
        if (!leaveType.isEntitlementBased) {
            return leaveType.defaultEntitlement;
        }
        const serviceYears = this.calculateServiceYears(hireDate);
        const tier = leaveType.entitlementTiers.find((t) => serviceYears >= t.minServiceYears && serviceYears < t.maxServiceYears);
        return tier?.entitlementDays || leaveType.defaultEntitlement;
    }
    async calculateSickLeavePayment(leaveTypeId, totalSickDaysThisYear, requestedDays, dailySalary) {
        const leaveType = await this.prisma.leaveTypeConfig.findUnique({
            where: { id: leaveTypeId },
            include: { sickPayTiers: { orderBy: { fromDay: 'asc' } } },
        });
        if (!leaveType || leaveType.sickPayTiers.length === 0) {
            return {
                fullPayDays: requestedDays,
                partialPayDays: 0,
                unpaidDays: 0,
                totalPayment: requestedDays * dailySalary,
                totalDeduction: 0,
            };
        }
        let fullPayDays = 0;
        let partialPayDays = 0;
        let unpaidDays = 0;
        let totalPayment = 0;
        for (let i = 0; i < requestedDays; i++) {
            const dayNumber = totalSickDaysThisYear + i + 1;
            const tier = leaveType.sickPayTiers.find((t) => dayNumber >= t.fromDay && dayNumber <= t.toDay);
            const payPercent = tier?.paymentPercent ?? 0;
            if (payPercent === 100) {
                fullPayDays++;
                totalPayment += dailySalary;
            }
            else if (payPercent > 0) {
                partialPayDays++;
                totalPayment += dailySalary * (payPercent / 100);
            }
            else {
                unpaidDays++;
            }
        }
        const fullPay = requestedDays * dailySalary;
        const totalDeduction = fullPay - totalPayment;
        return {
            fullPayDays,
            partialPayDays,
            unpaidDays,
            totalPayment,
            totalDeduction,
        };
    }
    async seedDefaultLeaveTypes(companyId) {
        const existingTypes = await this.prisma.leaveTypeConfig.count({
            where: { companyId },
        });
        if (existingTypes > 0) {
            throw new common_1.BadRequestException('يوجد بالفعل أنواع إجازات لهذه الشركة');
        }
        const defaultTypes = [
            {
                code: 'ANNUAL',
                nameAr: 'إجازة سنوية',
                nameEn: 'Annual Leave',
                category: client_1.LeaveCategory.BALANCED,
                isEntitlementBased: true,
                defaultEntitlement: 21,
                maxBalanceCap: 60,
                allowCarryForward: true,
                maxCarryForwardDays: 30,
                isPaid: true,
                paymentPercentage: 100,
                minNoticeDays: 7,
                sortOrder: 1,
                entitlementTiers: [
                    { minServiceYears: 0, maxServiceYears: 5, entitlementDays: 21 },
                    { minServiceYears: 5, maxServiceYears: 10, entitlementDays: 25 },
                    { minServiceYears: 10, maxServiceYears: 999, entitlementDays: 30 },
                ],
            },
            {
                code: 'SICK',
                nameAr: 'إجازة مرضية',
                nameEn: 'Sick Leave',
                category: client_1.LeaveCategory.SICK,
                isEntitlementBased: true,
                defaultEntitlement: 30,
                allowCarryForward: false,
                isPaid: true,
                requiresAttachment: true,
                attachmentRequiredAfterDays: 3,
                sortOrder: 2,
                sickPayTiers: [
                    { fromDay: 1, toDay: 30, paymentPercent: 100 },
                    { fromDay: 31, toDay: 90, paymentPercent: 75 },
                    { fromDay: 91, toDay: 120, paymentPercent: 0 },
                ],
            },
            {
                code: 'MARRIAGE',
                nameAr: 'إجازة زواج',
                nameEn: 'Marriage Leave',
                category: client_1.LeaveCategory.CASUAL,
                isEntitlementBased: false,
                defaultEntitlement: 5,
                allowCarryForward: false,
                isPaid: true,
                isOneTimeOnly: true,
                requiresAttachment: true,
                sortOrder: 3,
            },
            {
                code: 'BEREAVEMENT',
                nameAr: 'إجازة وفاة',
                nameEn: 'Bereavement Leave',
                category: client_1.LeaveCategory.CASUAL,
                isEntitlementBased: false,
                defaultEntitlement: 5,
                allowCarryForward: false,
                isPaid: true,
                requiresAttachment: true,
                sortOrder: 4,
            },
            {
                code: 'NEW_BABY',
                nameAr: 'إجازة مولود جديد',
                nameEn: 'Paternity Leave',
                category: client_1.LeaveCategory.CASUAL,
                isEntitlementBased: false,
                defaultEntitlement: 3,
                allowCarryForward: false,
                isPaid: true,
                requiresAttachment: true,
                sortOrder: 5,
            },
            {
                code: 'HAJJ',
                nameAr: 'إجازة حج',
                nameEn: 'Hajj Leave',
                category: client_1.LeaveCategory.CASUAL,
                isEntitlementBased: false,
                defaultEntitlement: 15,
                allowCarryForward: false,
                isPaid: true,
                isOneTimeOnly: true,
                minNoticeDays: 30,
                sortOrder: 6,
            },
            {
                code: 'EXAM',
                nameAr: 'إجازة اختبارات',
                nameEn: 'Exam Leave',
                category: client_1.LeaveCategory.CASUAL,
                isEntitlementBased: false,
                defaultEntitlement: 0,
                allowCarryForward: false,
                isPaid: true,
                requiresAttachment: true,
                sortOrder: 7,
            },
            {
                code: 'UNPAID',
                nameAr: 'إجازة بدون راتب',
                nameEn: 'Unpaid Leave',
                category: client_1.LeaveCategory.UNPAID,
                isEntitlementBased: false,
                defaultEntitlement: 0,
                allowCarryForward: false,
                isPaid: false,
                allowNegativeBalance: true,
                sortOrder: 10,
            },
        ];
        for (const typeData of defaultTypes) {
            const { entitlementTiers, sickPayTiers, ...leaveTypeData } = typeData;
            const leaveType = await this.prisma.leaveTypeConfig.create({
                data: {
                    companyId,
                    ...leaveTypeData,
                },
            });
            if (entitlementTiers) {
                await this.prisma.leaveEntitlementTier.createMany({
                    data: entitlementTiers.map((tier) => ({
                        leaveTypeId: leaveType.id,
                        ...tier,
                    })),
                });
            }
            if (sickPayTiers) {
                await this.prisma.sickPayTier.createMany({
                    data: sickPayTiers.map((tier) => ({
                        leaveTypeId: leaveType.id,
                        ...tier,
                    })),
                });
            }
        }
        return { message: 'تم إعداد أنواع الإجازات الافتراضية بنجاح', count: defaultTypes.length };
    }
    calculateServiceYears(hireDate) {
        const now = new Date();
        const diffMs = now.getTime() - new Date(hireDate).getTime();
        return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365));
    }
};
exports.LeaveTypeConfigService = LeaveTypeConfigService;
exports.LeaveTypeConfigService = LeaveTypeConfigService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], LeaveTypeConfigService);
//# sourceMappingURL=leave-type-config.service.js.map