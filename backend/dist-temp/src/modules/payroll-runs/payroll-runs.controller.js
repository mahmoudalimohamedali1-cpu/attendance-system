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
exports.PayrollRunsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const payroll_runs_service_1 = require("./payroll-runs.service");
const create_payroll_run_dto_1 = require("./dto/create-payroll-run.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const pdf_service_1 = require("../../common/pdf/pdf.service");
const excel_service_1 = require("../../common/excel/excel.service");
const email_service_1 = require("../../common/email/email.service");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let PayrollRunsController = class PayrollRunsController {
    constructor(service, pdfService, excelService, emailService, prisma) {
        this.service = service;
        this.pdfService = pdfService;
        this.excelService = excelService;
        this.emailService = emailService;
        this.prisma = prisma;
    }
    preview(dto, companyId) {
        return this.service.preview(dto, companyId);
    }
    async downloadPayslipPdf(payslipId, res) {
        const buffer = await this.pdfService.generatePayslipPdf(payslipId);
        res.set({
            'Content-Disposition': `attachment; filename="payslip-${payslipId}.pdf"`,
            'Content-Length': buffer.length,
        });
        res.end(buffer);
    }
    create(dto, companyId, userId) {
        return this.service.create(dto, companyId, userId);
    }
    findAll(companyId) {
        return this.service.findAll(companyId);
    }
    findOne(id, companyId) {
        return this.service.findOne(id, companyId);
    }
    approve(id, companyId) {
        return this.service.approve(id, companyId);
    }
    pay(id, companyId) {
        return this.service.pay(id, companyId);
    }
    async downloadExcel(id, res) {
        const buffer = await this.excelService.generatePayrollRunExcel(id);
        res.set({
            'Content-Disposition': `attachment; filename="payroll-${id}.xlsx"`,
            'Content-Length': buffer.length,
        });
        res.end(buffer);
    }
    async sendPayslipEmails(id, companyId) {
        const run = await this.prisma.payrollRun.findFirst({
            where: { id, companyId },
            include: {
                period: true,
                payslips: { include: { employee: true } },
            },
        });
        if (!run)
            throw new Error('Payroll run not found');
        const results = { sent: 0, failed: 0 };
        for (const payslip of run.payslips) {
            if (!payslip.employee.email) {
                results.failed++;
                continue;
            }
            const pdfBuffer = await this.pdfService.generatePayslipPdf(payslip.id);
            const sent = await this.emailService.sendPayslipEmail(payslip.employee.email, `${payslip.employee.firstName} ${payslip.employee.lastName}`, run.period.month, run.period.year, pdfBuffer);
            if (sent)
                results.sent++;
            else
                results.failed++;
        }
        return { message: `تم إرسال ${results.sent} قسيمة، فشل ${results.failed}`, ...results };
    }
};
exports.PayrollRunsController = PayrollRunsController;
__decorate([
    (0, common_1.Post)('preview'),
    (0, roles_decorator_1.Roles)('ADMIN', 'HR'),
    (0, swagger_1.ApiOperation)({ summary: 'معاينة مسير الرواتب قبل التشغيل' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_payroll_run_dto_1.CreatePayrollRunDto, String]),
    __metadata("design:returntype", void 0)
], PayrollRunsController.prototype, "preview", null);
__decorate([
    (0, common_1.Get)('payslip/:payslipId/pdf'),
    (0, swagger_1.ApiOperation)({ summary: 'تحميل قسيمة الراتب PDF' }),
    (0, common_1.Header)('Content-Type', 'application/pdf'),
    __param(0, (0, common_1.Param)('payslipId')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PayrollRunsController.prototype, "downloadPayslipPdf", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'تشغيل احتساب مسير الرواتب' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_payroll_run_dto_1.CreatePayrollRunDto, String, String]),
    __metadata("design:returntype", void 0)
], PayrollRunsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'عرض جميع تشغيلات الرواتب' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PayrollRunsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'تفاصيل تشغيل معين والمسودات الناتجة' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], PayrollRunsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id/approve'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'اعتماد مسير الرواتب' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], PayrollRunsController.prototype, "approve", null);
__decorate([
    (0, common_1.Patch)(':id/pay'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'تأكيد صرف الرواتب' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], PayrollRunsController.prototype, "pay", null);
__decorate([
    (0, common_1.Get)(':id/excel'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'تحميل مسير الرواتب Excel' }),
    (0, common_1.Header)('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PayrollRunsController.prototype, "downloadExcel", null);
__decorate([
    (0, common_1.Post)(':id/send-emails'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'إرسال قسائم الرواتب بالبريد الإلكتروني' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PayrollRunsController.prototype, "sendPayslipEmails", null);
exports.PayrollRunsController = PayrollRunsController = __decorate([
    (0, swagger_1.ApiTags)('Payroll Runs'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('payroll-runs'),
    __metadata("design:paramtypes", [payroll_runs_service_1.PayrollRunsService,
        pdf_service_1.PdfService,
        excel_service_1.ExcelService,
        email_service_1.EmailService,
        prisma_service_1.PrismaService])
], PayrollRunsController);
//# sourceMappingURL=payroll-runs.controller.js.map