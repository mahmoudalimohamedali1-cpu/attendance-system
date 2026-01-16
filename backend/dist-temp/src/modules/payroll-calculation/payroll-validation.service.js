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
exports.PayrollValidationService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let PayrollValidationService = class PayrollValidationService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async validatePeriod(periodId, companyId, employeeIds) {
        const period = await this.prisma.payrollPeriod.findFirst({
            where: { id: periodId, companyId }
        });
        if (!period) {
            throw new Error('فترة الرواتب غير موجودة');
        }
        const issues = [];
        const employees = await this.prisma.user.findMany({
            where: {
                id: employeeIds ? { in: employeeIds } : undefined,
                companyId,
                status: 'ACTIVE',
            },
            include: {
                bankAccounts: { where: { isPrimary: true }, take: 1 },
                contracts: {
                    where: {
                        status: 'ACTIVE',
                    },
                    orderBy: { startDate: 'desc' },
                    take: 1
                },
                salaryAssignments: { where: { isActive: true }, take: 1 },
            }
        });
        for (const emp of employees) {
            const name = `${emp.firstName} ${emp.lastName}`;
            const code = emp.employeeCode || emp.id;
            if (emp.bankAccounts.length === 0) {
                issues.push({
                    employeeId: emp.id,
                    employeeName: name,
                    employeeCode: code,
                    type: 'ERROR',
                    module: 'BANK',
                    messageAr: 'الموظف ليس لديه حساب بنكي أساسي',
                    messageEn: 'Employee has no primary bank account',
                });
            }
            else {
                const iban = emp.bankAccounts[0].iban;
                if (!iban || iban.length < 15) {
                    issues.push({
                        employeeId: emp.id,
                        employeeName: name,
                        employeeCode: code,
                        type: 'ERROR',
                        module: 'BANK',
                        messageAr: 'رقم الـ IBAN غير مكتمل أو خاطئ',
                        messageEn: 'IBAN is incomplete or invalid',
                    });
                }
            }
            if (emp.contracts.length === 0) {
                issues.push({
                    employeeId: emp.id,
                    employeeName: name,
                    employeeCode: code,
                    type: 'WARNING',
                    module: 'CONTRACT',
                    messageAr: 'لا يوجد عقد ساري موثق للموظف',
                    messageEn: 'No active contract found for employee',
                });
            }
            else {
                const contract = emp.contracts[0];
                if (contract.endDate && contract.endDate < period.endDate) {
                    issues.push({
                        employeeId: emp.id,
                        employeeName: name,
                        employeeCode: code,
                        type: 'ERROR',
                        module: 'CONTRACT',
                        messageAr: 'عقد الموظف ينتهي قبل نهاية فترة الرواتب',
                        messageEn: 'Contract expires before payroll period end',
                    });
                }
            }
            if (emp.salaryAssignments.length === 0) {
                issues.push({
                    employeeId: emp.id,
                    employeeName: name,
                    employeeCode: code,
                    type: 'ERROR',
                    module: 'SALARY',
                    messageAr: 'الموظف ليس له هيكل راتب نشط',
                    messageEn: 'No active salary structure assigned',
                });
            }
            const attendanceCount = await this.prisma.attendance.count({
                where: {
                    userId: emp.id,
                    companyId,
                    date: {
                        gte: period.startDate,
                        lte: period.endDate,
                    }
                }
            });
            if (attendanceCount === 0) {
                issues.push({
                    employeeId: emp.id,
                    employeeName: name,
                    employeeCode: code,
                    type: 'WARNING',
                    module: 'ATTENDANCE',
                    messageAr: 'لا توجد سجلات حضور للموظف في هذه الفترة',
                    messageEn: 'No attendance records found for this period',
                });
            }
        }
        const errorsCount = issues.filter(i => i.type === 'ERROR').length;
        return {
            periodId,
            isValid: errorsCount === 0,
            errorsCount,
            warningsCount: issues.length - errorsCount,
            issues,
        };
    }
};
exports.PayrollValidationService = PayrollValidationService;
exports.PayrollValidationService = PayrollValidationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PayrollValidationService);
//# sourceMappingURL=payroll-validation.service.js.map