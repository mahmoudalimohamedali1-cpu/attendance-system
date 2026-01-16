"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const schedule_1 = require("@nestjs/schedule");
const core_1 = require("@nestjs/core");
const prisma_module_1 = require("./common/prisma/prisma.module");
const upload_module_1 = require("./common/upload/upload.module");
const redis_module_1 = require("./common/redis/redis.module");
const queue_module_1 = require("./common/queue/queue.module");
const app_controller_1 = require("./app.controller");
const auth_module_1 = require("./modules/auth/auth.module");
const users_module_1 = require("./modules/users/users.module");
const branches_module_1 = require("./modules/branches/branches.module");
const attendance_module_1 = require("./modules/attendance/attendance.module");
const leaves_module_1 = require("./modules/leaves/leaves.module");
const letters_module_1 = require("./modules/letters/letters.module");
const notifications_module_1 = require("./modules/notifications/notifications.module");
const reports_module_1 = require("./modules/reports/reports.module");
const audit_module_1 = require("./modules/audit/audit.module");
const settings_module_1 = require("./modules/settings/settings.module");
const face_recognition_module_1 = require("./modules/face-recognition/face-recognition.module");
const devices_module_1 = require("./modules/devices/devices.module");
const data_update_module_1 = require("./modules/data-update/data-update.module");
const permissions_module_1 = require("./modules/permissions/permissions.module");
const job_titles_module_1 = require("./modules/job-titles/job-titles.module");
const raises_module_1 = require("./modules/raises/raises.module");
const advances_module_1 = require("./modules/advances/advances.module");
const salary_components_module_1 = require("./modules/salary-components/salary-components.module");
const salary_structures_module_1 = require("./modules/salary-structures/salary-structures.module");
const salary_assignments_module_1 = require("./modules/salary-assignments/salary-assignments.module");
const payroll_periods_module_1 = require("./modules/payroll-periods/payroll-periods.module");
const payroll_runs_module_1 = require("./modules/payroll-runs/payroll-runs.module");
const bank_accounts_module_1 = require("./modules/bank-accounts/bank-accounts.module");
const company_bank_accounts_module_1 = require("./modules/company-bank-accounts/company-bank-accounts.module");
const gosi_module_1 = require("./modules/gosi/gosi.module");
const eos_module_1 = require("./modules/eos/eos.module");
const pdf_module_1 = require("./common/pdf/pdf.module");
const excel_module_1 = require("./common/excel/excel.module");
const email_module_1 = require("./common/email/email.module");
const retro_pay_module_1 = require("./modules/retro-pay/retro-pay.module");
const policies_module_1 = require("./modules/policies/policies.module");
const loan_payments_module_1 = require("./modules/loan-payments/loan-payments.module");
const payroll_calculation_module_1 = require("./modules/payroll-calculation/payroll-calculation.module");
const companies_module_1 = require("./modules/companies/companies.module");
const wps_export_module_1 = require("./modules/wps-export/wps-export.module");
const exceptions_module_1 = require("./modules/exceptions/exceptions.module");
const contracts_module_1 = require("./modules/contracts/contracts.module");
const payslips_module_1 = require("./modules/payslips/payslips.module");
const dashboard_module_1 = require("./modules/dashboard/dashboard.module");
const mudad_module_1 = require("./modules/mudad/mudad.module");
const qiwa_module_1 = require("./modules/qiwa/qiwa.module");
const wps_tracking_module_1 = require("./modules/wps-tracking/wps-tracking.module");
const audit_logs_module_1 = require("./modules/audit/audit-logs.module");
const disciplinary_module_1 = require("./modules/disciplinary/disciplinary.module");
const custody_module_1 = require("./modules/custody/custody.module");
const employee_profile_module_1 = require("./modules/employee-profile/employee-profile.module");
const payroll_settings_module_1 = require("./modules/payroll-settings/payroll-settings.module");
const ai_module_1 = require("./modules/ai/ai.module");
const smart_policies_module_1 = require("./modules/smart-policies/smart-policies.module");
const location_tracking_module_1 = require("./modules/location-tracking/location-tracking.module");
const organization_module_1 = require("./modules/organization/organization.module");
const tasks_module_1 = require("./modules/tasks/tasks.module");
const ai_chat_module_1 = require("./modules/ai-chat/ai-chat.module");
const ai_analytics_module_1 = require("./modules/ai-analytics/ai-analytics.module");
const ai_payroll_module_1 = require("./modules/ai-payroll/ai-payroll.module");
const goals_module_1 = require("./modules/goals/goals.module");
const ai_manager_module_1 = require("./modules/ai-manager/ai-manager.module");
const ai_hr_module_1 = require("./modules/ai-hr/ai-hr.module");
const ai_predictive_module_1 = require("./modules/ai-predictive/ai-predictive.module");
const cost_centers_module_1 = require("./modules/cost-centers/cost-centers.module");
const performance_reviews_module_1 = require("./modules/performance-reviews/performance-reviews.module");
const recognition_module_1 = require("./modules/recognition/recognition.module");
const company_config_module_1 = require("./modules/company-config/company-config.module");
const kpi_module_1 = require("./modules/kpi/kpi.module");
const tenant_interceptor_1 = require("./common/interceptors/tenant.interceptor");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: '.env',
            }),
            schedule_1.ScheduleModule.forRoot(),
            prisma_module_1.PrismaModule,
            upload_module_1.UploadModule,
            redis_module_1.RedisModule,
            queue_module_1.QueueModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            branches_module_1.BranchesModule,
            attendance_module_1.AttendanceModule,
            leaves_module_1.LeavesModule,
            letters_module_1.LettersModule,
            raises_module_1.RaisesModule,
            advances_module_1.AdvancesModule,
            notifications_module_1.NotificationsModule,
            reports_module_1.ReportsModule,
            audit_module_1.AuditModule,
            settings_module_1.SettingsModule,
            face_recognition_module_1.FaceRecognitionModule,
            devices_module_1.DevicesModule,
            data_update_module_1.DataUpdateModule,
            permissions_module_1.PermissionsModule,
            job_titles_module_1.JobTitlesModule,
            salary_components_module_1.SalaryComponentsModule,
            salary_structures_module_1.SalaryStructuresModule,
            salary_assignments_module_1.SalaryAssignmentsModule,
            payroll_periods_module_1.PayrollPeriodsModule,
            policies_module_1.PoliciesModule,
            payroll_calculation_module_1.PayrollCalculationModule,
            bank_accounts_module_1.BankAccountsModule,
            company_bank_accounts_module_1.CompanyBankAccountsModule,
            gosi_module_1.GosiModule,
            eos_module_1.EosModule,
            pdf_module_1.PdfModule,
            excel_module_1.ExcelModule,
            email_module_1.EmailModule,
            retro_pay_module_1.RetroPayModule,
            payroll_runs_module_1.PayrollRunsModule,
            loan_payments_module_1.LoanPaymentsModule,
            companies_module_1.CompaniesModule,
            wps_export_module_1.WpsExportModule,
            exceptions_module_1.ExceptionsModule,
            contracts_module_1.ContractsModule,
            payslips_module_1.PayslipsModule,
            dashboard_module_1.DashboardModule,
            mudad_module_1.MudadModule,
            qiwa_module_1.QiwaModule,
            wps_tracking_module_1.WpsTrackingModule,
            audit_logs_module_1.AuditLogsModule,
            disciplinary_module_1.DisciplinaryModule,
            custody_module_1.CustodyModule,
            employee_profile_module_1.EmployeeProfileModule,
            payroll_settings_module_1.PayrollSettingsModule,
            ai_module_1.AiModule,
            smart_policies_module_1.SmartPoliciesModule,
            location_tracking_module_1.LocationTrackingModule,
            organization_module_1.OrganizationModule,
            tasks_module_1.TasksModule,
            ai_chat_module_1.AiChatModule,
            ai_analytics_module_1.AiAnalyticsModule,
            ai_payroll_module_1.AiPayrollModule,
            ai_manager_module_1.AiManagerModule,
            ai_hr_module_1.AiHrModule,
            ai_predictive_module_1.AiPredictiveModule,
            cost_centers_module_1.CostCentersModule,
            performance_reviews_module_1.PerformanceReviewsModule,
            goals_module_1.GoalsModule,
            recognition_module_1.RecognitionModule,
            company_config_module_1.CompanyConfigModule,
            kpi_module_1.KPIModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [
            {
                provide: core_1.APP_INTERCEPTOR,
                useClass: tenant_interceptor_1.TenantInterceptor,
            },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map