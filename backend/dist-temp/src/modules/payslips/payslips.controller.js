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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayslipsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const pdf_service_1 = require("../../common/pdf/pdf.service");
const permissions_service_1 = require("../permissions/permissions.service");
let PayslipsController = class PayslipsController {
    constructor(prisma, pdfService, permissionsService) {
        this.prisma = prisma;
        this.pdfService = pdfService;
        this.permissionsService = permissionsService;
    }
    async getMyPayslips(userId, companyId) {
        const payslips = await this.prisma.payslip.findMany({
            where: {
                employeeId: userId,
                companyId,
                status: { in: ['PAID', 'LOCKED', 'FINANCE_APPROVED'] },
            },
            include: {
                period: {
                    select: {
                        month: true,
                        year: true,
                    },
                },
                lines: {
                    include: {
                        component: {
                            select: {
                                code: true,
                                nameAr: true,
                                nameEn: true,
                            },
                        },
                    },
                },
            },
            orderBy: [
                { period: { year: 'desc' } },
                { period: { month: 'desc' } },
            ],
        });
        return payslips.map(payslip => {
            const earnings = payslip.lines.filter(l => l.sign === 'EARNING');
            const deductions = payslip.lines.filter(l => l.sign === 'DEDUCTION');
            return {
                id: payslip.id,
                month: payslip.period.month,
                year: payslip.period.year,
                periodLabel: `${payslip.period.month}/${payslip.period.year}`,
                baseSalary: Number(payslip.baseSalary),
                grossSalary: Number(payslip.grossSalary),
                totalDeductions: Number(payslip.totalDeductions),
                netSalary: Number(payslip.netSalary),
                status: payslip.status,
                earnings: earnings.map(l => ({
                    name: l.component?.nameAr || l.component?.nameEn || l.component?.code,
                    amount: Number(l.amount),
                    description: l.descriptionAr,
                })),
                deductions: deductions.map(l => ({
                    name: l.component?.nameAr || l.component?.nameEn || l.component?.code,
                    amount: Number(l.amount),
                    description: l.descriptionAr,
                })),
            };
        });
    }
    async findAll(userId, companyId, payrollRunId, periodId, search) {
        const accessibleIds = await this.permissionsService.getAccessibleEmployeeIds(userId, companyId, 'PAYROLL_VIEW');
        const where = {
            companyId,
            employeeId: { in: accessibleIds }
        };
        if (payrollRunId) {
            where.runId = payrollRunId;
        }
        if (periodId) {
            where.periodId = periodId;
        }
        if (search) {
            where.employee = {
                OR: [
                    { firstName: { contains: search, mode: 'insensitive' } },
                    { lastName: { contains: search, mode: 'insensitive' } },
                    { employeeCode: { contains: search, mode: 'insensitive' } },
                ],
            };
        }
        const payslips = await this.prisma.payslip.findMany({
            where,
            include: {
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        employeeCode: true,
                        jobTitle: true,
                        department: { select: { name: true } },
                    },
                },
                period: {
                    select: {
                        month: true,
                        year: true,
                    },
                },
                run: {
                    select: {
                        id: true,
                        status: true,
                    },
                },
                lines: {
                    include: {
                        component: {
                            select: {
                                code: true,
                                nameAr: true,
                                nameEn: true,
                            },
                        },
                    },
                },
            },
            orderBy: [
                { employee: { firstName: 'asc' } },
            ],
        });
        return payslips.map(payslip => {
            const gosiEmployeeLines = payslip.lines.filter(l => l.component?.code === 'GOSI_EMP' || l.component?.code === 'GOSI_DED');
            const gosiEmployee = gosiEmployeeLines.reduce((sum, l) => sum + Number(l.amount), 0);
            const gosiEmployerLines = payslip.lines.filter(l => l.component?.code === 'GOSI_EMPLOYER' || l.component?.code === 'GOSI_CO');
            const gosiEmployer = gosiEmployerLines.reduce((sum, l) => sum + Number(l.amount), 0);
            return {
                ...payslip,
                user: payslip.employee,
                baseSalary: Number(payslip.baseSalary),
                grossSalary: Number(payslip.grossSalary),
                totalDeductions: Number(payslip.totalDeductions),
                netSalary: Number(payslip.netSalary),
                gosiEmployee,
                gosiEmployer,
                lines: payslip.lines.map(line => ({
                    ...line,
                    amount: Number(line.amount),
                    units: line.units ? Number(line.units) : null,
                    rate: line.rate ? Number(line.rate) : null,
                    type: line.sign === 'EARNING' ? 'EARNING' : 'DEDUCTION',
                    componentCode: line.component?.code,
                    componentName: line.component?.nameAr || line.component?.nameEn,
                })),
            };
        });
    }
    async findOne(id, companyId) {
        const payslip = await this.prisma.payslip.findFirst({
            where: { id, companyId },
            include: {
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        employeeCode: true,
                        jobTitle: true,
                        department: { select: { name: true } },
                    },
                },
                period: {
                    select: {
                        month: true,
                        year: true,
                    },
                },
                lines: {
                    include: {
                        component: {
                            select: {
                                code: true,
                                nameAr: true,
                                nameEn: true,
                            },
                        },
                    },
                },
            },
        });
        if (!payslip)
            return null;
        const gosiEmployeeLines = payslip.lines.filter(l => l.component?.code === 'GOSI_EMP' || l.component?.code === 'GOSI_DED');
        const gosiEmployee = gosiEmployeeLines.reduce((sum, l) => sum + Number(l.amount), 0);
        const gosiEmployerLines = payslip.lines.filter(l => l.component?.code === 'GOSI_EMPLOYER' || l.component?.code === 'GOSI_CO');
        const gosiEmployer = gosiEmployerLines.reduce((sum, l) => sum + Number(l.amount), 0);
        return {
            ...payslip,
            user: payslip.employee,
            baseSalary: Number(payslip.baseSalary),
            grossSalary: Number(payslip.grossSalary),
            totalDeductions: Number(payslip.totalDeductions),
            netSalary: Number(payslip.netSalary),
            gosiEmployee,
            gosiEmployer,
            lines: payslip.lines.map(line => ({
                ...line,
                amount: Number(line.amount),
                units: line.units ? Number(line.units) : null,
                rate: line.rate ? Number(line.rate) : null,
                type: line.sign === 'EARNING' ? 'EARNING' : 'DEDUCTION',
                componentCode: line.component?.code,
                componentName: line.component?.nameAr || line.component?.nameEn,
            })),
        };
    }
    async downloadPdf(id, res) {
        const buffer = await this.pdfService.generatePayslipPdf(id);
        res.set({
            'Content-Disposition': `attachment; filename="payslip-${id}.pdf"`,
            'Content-Length': buffer.length,
        });
        res.end(buffer);
    }
};
exports.PayslipsController = PayslipsController;
__decorate([
    (0, common_1.Get)('my'),
    (0, swagger_1.ApiOperation)({ summary: 'Get my payslips (Employee Self-Service)' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PayslipsController.prototype, "getMyPayslips", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get payslips with filters' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __param(2, (0, common_1.Query)('payrollRunId')),
    __param(3, (0, common_1.Query)('periodId')),
    __param(4, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], PayslipsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get single payslip details' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PayslipsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)(':id/pdf'),
    (0, swagger_1.ApiOperation)({ summary: 'Download payslip as PDF' }),
    (0, common_1.Header)('Content-Type', 'application/pdf'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PayslipsController.prototype, "downloadPdf", null);
exports.PayslipsController = PayslipsController = __decorate([
    (0, swagger_1.ApiTags)('Payslips'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('payslips'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        pdf_service_1.PdfService,
        permissions_service_1.PermissionsService])
], PayslipsController);
//# sourceMappingURL=payslips.controller.js.map