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
exports.EmployeeProfileService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const profile_dto_1 = require("./dto/profile.dto");
let EmployeeProfileService = class EmployeeProfileService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getFullProfile(userId, companyId, requesterId) {
        await this.checkAccess(userId, companyId, requesterId);
        const user = await this.prisma.user.findFirst({
            where: { id: userId, companyId },
            include: {
                branch: true,
                department: true,
                jobTitleRef: true,
                manager: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        avatar: true,
                        email: true,
                        jobTitle: true,
                    },
                },
                contracts: {
                    where: { status: 'ACTIVE' },
                    take: 1,
                    orderBy: { createdAt: 'desc' },
                },
                bankAccounts: {
                    where: { isPrimary: true },
                    take: 1,
                },
                custodyAssignments: {
                    where: { status: 'DELIVERED' },
                    include: {
                        custodyItem: {
                            include: { category: true },
                        },
                    },
                    orderBy: { assignedAt: 'desc' },
                },
                disciplinaryCases: {
                    orderBy: { createdAt: 'desc' },
                    take: 5,
                },
                customFields: true,
            },
        });
        if (!user) {
            throw new common_1.NotFoundException('الموظف غير موجود');
        }
        const yearsOfService = user.hireDate
            ? this.calculateYearsOfService(user.hireDate)
            : 0;
        return {
            ...user,
            yearsOfService,
            password: undefined,
        };
    }
    async getOverview(userId, companyId) {
        const user = await this.prisma.user.findFirst({
            where: { id: userId, companyId },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                avatar: true,
                employeeCode: true,
                jobTitle: true,
                role: true,
                status: true,
                hireDate: true,
                isSaudi: true,
                nationality: true,
                faceRegistered: true,
                remainingLeaveDays: true,
                jobTitleRef: {
                    select: {
                        id: true,
                        name: true,
                        nameEn: true,
                        level: true,
                    },
                },
                branch: {
                    select: {
                        id: true,
                        name: true,
                        nameEn: true,
                    },
                },
                department: {
                    select: {
                        id: true,
                        name: true,
                        nameEn: true,
                    },
                },
                manager: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        avatar: true,
                    },
                },
            },
        });
        if (!user) {
            throw new common_1.NotFoundException('الموظف غير موجود');
        }
        const yearsOfService = user.hireDate
            ? this.calculateYearsOfService(user.hireDate)
            : 0;
        return { ...user, yearsOfService };
    }
    async getAttendanceStats(userId, companyId, startDate, endDate) {
        const start = startDate
            ? new Date(startDate)
            : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const end = endDate ? new Date(endDate) : new Date();
        const attendances = await this.prisma.attendance.findMany({
            where: {
                userId,
                companyId,
                date: {
                    gte: start,
                    lte: end,
                },
            },
        });
        const stats = {
            totalDays: attendances.length,
            presentDays: attendances.filter((a) => a.status === 'PRESENT' || a.status === 'LATE').length,
            absentDays: attendances.filter((a) => a.status === 'ABSENT').length,
            lateDays: attendances.filter((a) => a.status === 'LATE').length,
            earlyLeaveDays: attendances.filter((a) => a.status === 'EARLY_LEAVE')
                .length,
            workFromHomeDays: attendances.filter((a) => a.isWorkFromHome).length,
            totalWorkingMinutes: attendances.reduce((sum, a) => sum + (a.workingMinutes || 0), 0),
            totalOvertimeMinutes: attendances.reduce((sum, a) => sum + (a.overtimeMinutes || 0), 0),
            averageCheckInTime: null,
            averageCheckOutTime: null,
            attendanceRate: 0,
        };
        if (stats.totalDays > 0) {
            stats.attendanceRate = Math.round((stats.presentDays / stats.totalDays) * 100);
        }
        return stats;
    }
    async getLeaveHistory(userId, companyId) {
        const user = await this.prisma.user.findFirst({
            where: { id: userId, companyId },
            select: {
                annualLeaveDays: true,
                usedLeaveDays: true,
                remainingLeaveDays: true,
            },
        });
        if (!user) {
            throw new common_1.NotFoundException('الموظف غير موجود');
        }
        const leaveRequests = await this.prisma.leaveRequest.findMany({
            where: { userId, companyId },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
        const leavesByType = leaveRequests.reduce((acc, req) => {
            const existing = acc.find((t) => t.type === req.type);
            if (existing) {
                if (req.status === 'APPROVED') {
                    existing.used += req.approvedDays || req.requestedDays;
                }
                else if (req.status === 'PENDING' || req.status === 'MGR_APPROVED') {
                    existing.pending += req.requestedDays;
                }
            }
            else {
                acc.push({
                    type: req.type,
                    used: req.status === 'APPROVED'
                        ? req.approvedDays || req.requestedDays
                        : 0,
                    pending: req.status === 'PENDING' || req.status === 'MGR_APPROVED'
                        ? req.requestedDays
                        : 0,
                });
            }
            return acc;
        }, []);
        return {
            annualLeaveDays: user.annualLeaveDays,
            usedLeaveDays: user.usedLeaveDays,
            remainingLeaveDays: user.remainingLeaveDays,
            leavesByType,
            requests: leaveRequests,
        };
    }
    async getSalaryInfo(userId, companyId) {
        const user = await this.prisma.user.findFirst({
            where: { id: userId, companyId },
            select: {
                salary: true,
                gosiNumber: true,
                bankAccounts: {
                    where: { isPrimary: true },
                    take: 1,
                },
            },
        });
        if (!user) {
            throw new common_1.NotFoundException('الموظف غير موجود');
        }
        const gosiConfig = await this.prisma.gosiConfig.findFirst({
            where: { companyId, isActive: true },
            orderBy: { effectiveDate: 'desc' },
        });
        const salaryAssignment = await this.prisma.employeeSalaryAssignment.findFirst({
            where: { employeeId: userId, isActive: true },
            orderBy: { effectiveDate: 'desc' },
        });
        let salaryStructure = null;
        if (salaryAssignment?.structureId) {
            const structure = await this.prisma.salaryStructure.findUnique({
                where: { id: salaryAssignment.structureId },
            });
            if (structure) {
                salaryStructure = {
                    id: structure.id,
                    name: structure.name,
                    components: [],
                };
            }
        }
        return {
            basicSalary: user.salary ? Number(user.salary) : null,
            totalSalary: salaryAssignment?.baseSalary
                ? Number(salaryAssignment.baseSalary)
                : Number(user.salary) || null,
            salaryStructure,
            gosiInfo: gosiConfig
                ? {
                    gosiNumber: user.gosiNumber,
                    employeeContribution: gosiConfig.employeeRate
                        ? Number(gosiConfig.employeeRate)
                        : null,
                    employerContribution: gosiConfig.employerRate
                        ? Number(gosiConfig.employerRate)
                        : null,
                }
                : null,
            bankAccount: user.bankAccounts[0]
                ? {
                    bankName: user.bankAccounts[0].bankName,
                    accountNumber: user.bankAccounts[0].iban,
                    iban: user.bankAccounts[0].iban,
                }
                : null,
        };
    }
    async getDocuments(userId, companyId) {
        return {
            documents: [],
            byType: {},
            expiringDocuments: [],
            totalCount: 0,
        };
    }
    async uploadDocument(userId, companyId, uploadedById, data) {
        throw new common_1.BadRequestException('تحميل المستندات غير متاح حالياً');
    }
    async getActivityTimeline(userId, companyId, limit = 20) {
        const activities = [];
        const attendances = await this.prisma.attendance.findMany({
            where: { userId, companyId },
            orderBy: { date: 'desc' },
            take: 5,
        });
        attendances.forEach((att) => {
            activities.push({
                id: att.id,
                type: 'ATTENDANCE',
                title: `Attendance Record`,
                titleAr: 'سجل حضور',
                description: `${att.status} - ${att.checkInTime ? 'Check-in recorded' : 'No check-in'}`,
                date: att.date,
                status: att.status,
            });
        });
        const leaves = await this.prisma.leaveRequest.findMany({
            where: { userId, companyId },
            orderBy: { createdAt: 'desc' },
            take: 5,
        });
        leaves.forEach((leave) => {
            activities.push({
                id: leave.id,
                type: 'LEAVE',
                title: `Leave Request - ${leave.type}`,
                titleAr: `طلب إجازة - ${this.getLeaveTypeAr(leave.type)}`,
                description: `${leave.requestedDays} days from ${leave.startDate.toLocaleDateString()}`,
                date: leave.createdAt,
                status: leave.status,
            });
        });
        const letters = await this.prisma.letterRequest.findMany({
            where: { userId, companyId },
            orderBy: { createdAt: 'desc' },
            take: 5,
        });
        letters.forEach((letter) => {
            activities.push({
                id: letter.id,
                type: 'LETTER',
                title: `Letter Request - ${letter.type}`,
                titleAr: `طلب خطاب - ${this.getLetterTypeAr(letter.type)}`,
                description: `Requested on ${letter.createdAt.toLocaleDateString()}`,
                date: letter.createdAt,
                status: letter.status,
            });
        });
        return activities
            .sort((a, b) => b.date.getTime() - a.date.getTime())
            .slice(0, limit);
    }
    async updateProfile(userId, companyId, requesterId, data) {
        await this.checkAccess(userId, companyId, requesterId, 'EDIT');
        const requester = await this.prisma.user.findUnique({
            where: { id: requesterId },
            select: { role: true, isSuperAdmin: true },
        });
        if (!requester) {
            throw new common_1.ForbiddenException('المستخدم غير موجود');
        }
        return this.prisma.user.update({
            where: { id: userId },
            data: {
                ...data,
                dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
                iqamaExpiryDate: data.iqamaExpiryDate
                    ? new Date(data.iqamaExpiryDate)
                    : undefined,
                passportExpiryDate: data.passportExpiryDate
                    ? new Date(data.passportExpiryDate)
                    : undefined,
            },
        });
    }
    async approveProfileUpdate(requestId, reviewerId, companyId) {
        throw new common_1.BadRequestException('نظام طلبات تحديث البروفايل غير متاح حالياً');
    }
    async createRequestOnBehalf(userId, companyId, requesterId, data) {
        await this.checkAccess(userId, companyId, requesterId, 'MANAGE');
        const user = await this.prisma.user.findFirst({
            where: { id: userId, companyId },
        });
        if (!user) {
            throw new common_1.NotFoundException('الموظف غير موجود');
        }
        switch (data.requestType) {
            case profile_dto_1.RequestOnBehalfType.LEAVE:
                if (!data.leaveData) {
                    throw new common_1.BadRequestException('بيانات الإجازة مطلوبة');
                }
                return this.createLeaveOnBehalf(userId, companyId, data.leaveData);
            case profile_dto_1.RequestOnBehalfType.LETTER:
                if (!data.letterData) {
                    throw new common_1.BadRequestException('بيانات الخطاب مطلوبة');
                }
                return this.createLetterOnBehalf(userId, companyId, data.letterData);
            case profile_dto_1.RequestOnBehalfType.ADVANCE:
                if (!data.advanceData) {
                    throw new common_1.BadRequestException('بيانات السلفة مطلوبة');
                }
                return this.createAdvanceOnBehalf(userId, companyId, data.advanceData);
            default:
                throw new common_1.BadRequestException('نوع الطلب غير صالح');
        }
    }
    async checkAccess(userId, companyId, requesterId, level = 'VIEW') {
        const requester = await this.prisma.user.findFirst({
            where: { id: requesterId, companyId },
        });
        if (!requester) {
            throw new common_1.ForbiddenException('غير مصرح لك');
        }
        if (userId === requesterId)
            return;
        if (requester.role === 'ADMIN' || requester.isSuperAdmin)
            return;
        const employee = await this.prisma.user.findFirst({
            where: { id: userId, companyId },
        });
        if (employee?.managerId === requesterId)
            return;
        if (requester.role === 'MANAGER') {
            if (employee?.branchId === requester.branchId ||
                employee?.departmentId === requester.departmentId) {
                return;
            }
        }
        throw new common_1.ForbiddenException('غير مصرح لك بالوصول لهذا الملف');
    }
    calculateYearsOfService(hireDate) {
        const now = new Date();
        const years = (now.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
        return Math.floor(years * 10) / 10;
    }
    getLeaveTypeAr(type) {
        const types = {
            ANNUAL: 'سنوية',
            SICK: 'مرضية',
            PERSONAL: 'شخصية',
            EMERGENCY: 'طارئة',
            NEW_BABY: 'مولود جديد',
            MARRIAGE: 'زواج',
            BEREAVEMENT: 'وفاة',
            HAJJ: 'حج',
            EXAM: 'اختبارات',
            WORK_MISSION: 'مهمة عمل',
            UNPAID: 'بدون راتب',
        };
        return types[type] || type;
    }
    getLetterTypeAr(type) {
        const types = {
            SALARY_DEFINITION: 'تعريف راتب',
            SERVICE_CONFIRMATION: 'تأكيد خدمة',
            EXPERIENCE: 'خبرة',
            NOC: 'عدم ممانعة',
            CLEARANCE: 'إخلاء طرف',
        };
        return types[type] || type;
    }
    async createLeaveOnBehalf(userId, companyId, data) {
        const startDate = new Date(data.startDate);
        const endDate = new Date(data.endDate);
        const requestedDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        return this.prisma.leaveRequest.create({
            data: {
                userId,
                companyId,
                type: data.type,
                startDate,
                endDate,
                requestedDays,
                reason: data.reason,
                notes: data.notes || 'تم الإنشاء بالنيابة عن الموظف',
                status: 'PENDING',
                currentStep: 'MANAGER',
            },
        });
    }
    async createLetterOnBehalf(userId, companyId, data) {
        return this.prisma.letterRequest.create({
            data: {
                userId,
                companyId,
                type: data.type,
                notes: data.notes || 'تم الإنشاء بالنيابة عن الموظف',
                status: 'PENDING',
                currentStep: 'MANAGER',
            },
        });
    }
    async createAdvanceOnBehalf(userId, companyId, data) {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + (data.repaymentMonths || 1));
        const monthlyDeduction = data.amount / (data.repaymentMonths || 1);
        return this.prisma.advanceRequest.create({
            data: {
                userId,
                companyId,
                type: 'BANK_TRANSFER',
                amount: data.amount,
                startDate,
                endDate,
                periodMonths: data.repaymentMonths || 1,
                monthlyDeduction,
                notes: data.reason,
                status: 'PENDING',
                currentStep: 'MANAGER',
            },
        });
    }
    async deleteDocument(userId, docId, companyId) {
        throw new common_1.BadRequestException('حذف المستندات غير متاح حالياً');
    }
};
exports.EmployeeProfileService = EmployeeProfileService;
exports.EmployeeProfileService = EmployeeProfileService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], EmployeeProfileService);
//# sourceMappingURL=employee-profile.service.js.map