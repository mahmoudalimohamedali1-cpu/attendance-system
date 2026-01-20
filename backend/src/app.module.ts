import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './common/prisma/prisma.module';
import { UploadModule } from './common/upload/upload.module';
import { RedisModule } from './common/redis/redis.module';
import { QueueModule } from './common/queue/queue.module';
import { AppController } from './app.controller';

// Feature Modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { BranchesModule } from './modules/branches/branches.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { LeavesModule } from './modules/leaves/leaves.module';
import { LettersModule } from './modules/letters/letters.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AuditModule } from './modules/audit/audit.module';
import { SettingsModule } from './modules/settings/settings.module';
import { FaceRecognitionModule } from './modules/face-recognition/face-recognition.module';
import { DevicesModule } from './modules/devices/devices.module';
import { DataUpdateModule } from './modules/data-update/data-update.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { JobTitlesModule } from './modules/job-titles/job-titles.module';
import { RaisesModule } from './modules/raises/raises.module';
import { AdvancesModule } from './modules/advances/advances.module';
import { SalaryComponentsModule } from './modules/salary-components/salary-components.module';
import { SalaryStructuresModule } from './modules/salary-structures/salary-structures.module';
import { SalaryAssignmentsModule } from './modules/salary-assignments/salary-assignments.module';
import { PayrollPeriodsModule } from './modules/payroll-periods/payroll-periods.module';
import { PayrollRunsModule } from './modules/payroll-runs/payroll-runs.module';
import { BankAccountsModule } from './modules/bank-accounts/bank-accounts.module';
import { CompanyBankAccountsModule } from './modules/company-bank-accounts/company-bank-accounts.module';
import { GosiModule } from './modules/gosi/gosi.module';
import { EosModule } from './modules/eos/eos.module';
import { PdfModule } from './common/pdf/pdf.module';
import { ExcelModule } from './common/excel/excel.module';
import { EmailModule } from './common/email/email.module';
import { RetroPayModule } from './modules/retro-pay/retro-pay.module';
import { PoliciesModule } from './modules/policies/policies.module';
import { LoanPaymentsModule } from './modules/loan-payments/loan-payments.module';
import { PayrollCalculationModule } from './modules/payroll-calculation/payroll-calculation.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { WpsExportModule } from './modules/wps-export/wps-export.module';
import { ExceptionsModule } from './modules/exceptions/exceptions.module';
import { ContractsModule } from './modules/contracts/contracts.module';
import { PayslipsModule } from './modules/payslips/payslips.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { MudadModule } from './modules/mudad/mudad.module';
import { QiwaModule } from './modules/qiwa/qiwa.module';
import { WpsTrackingModule } from './modules/wps-tracking/wps-tracking.module';
import { AuditLogsModule } from './modules/audit/audit-logs.module';
import { DisciplinaryModule } from './modules/disciplinary/disciplinary.module';
import { CustodyModule } from './modules/custody/custody.module';
import { EmployeeProfileModule } from './modules/employee-profile/employee-profile.module';
import { PayrollSettingsModule } from './modules/payroll-settings/payroll-settings.module';
import { AiModule } from './modules/ai/ai.module';
import { SmartPoliciesModule } from './modules/smart-policies/smart-policies.module';
import { LocationTrackingModule } from './modules/location-tracking/location-tracking.module';
import { OrganizationModule } from './modules/organization/organization.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { AiChatModule } from './modules/ai-chat/ai-chat.module';
import { AiAnalyticsModule } from './modules/ai-analytics/ai-analytics.module';
import { AiPayrollModule } from './modules/ai-payroll/ai-payroll.module';
import { GoalsModule } from './modules/goals/goals.module';
import { AiManagerModule } from './modules/ai-manager/ai-manager.module';
import { AiHrModule } from './modules/ai-hr/ai-hr.module';
import { AiPredictiveModule } from './modules/ai-predictive/ai-predictive.module';
import { CostCentersModule } from './modules/cost-centers/cost-centers.module';
import { PerformanceReviewsModule } from './modules/performance-reviews/performance-reviews.module';
import { RecognitionModule } from './modules/recognition/recognition.module';
import { CompanyConfigModule } from './modules/company-config/company-config.module';
import { KPIModule } from './modules/kpi/kpi.module';
import { LogisticsModule } from './modules/logistics/logistics.module';
import { SaudizationModule } from './modules/saudization/saudization.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { ProgramsModule } from './modules/programs/programs.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { SocialFeedModule } from './modules/social-feed/social-feed.module';
import { CalendarEventsModule } from './modules/calendar-events/calendar-events.module';
import { EmployeeDebtModule } from './modules/employee-debt/employee-debt.module';
// import { EmployeeDebtModule } from './modules/employee-debt/employee-debt.module'; // DISABLED: Prisma schema desync
import { SecurityModule } from './common/security/security.module';
import { TenantInterceptor } from './common/interceptors/tenant.interceptor';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Scheduler for cron jobs
    ScheduleModule.forRoot(),

    // Core
    PrismaModule,
    UploadModule,
    RedisModule,
    QueueModule,

    // Features
    AuthModule,
    UsersModule,
    BranchesModule,
    AttendanceModule,
    LeavesModule,
    LettersModule,
    RaisesModule,         // طلبات الزيادة
    AdvancesModule,       // طلبات السلف
    NotificationsModule,
    ReportsModule,
    AuditModule,
    SettingsModule,
    FaceRecognitionModule, // التعرف على الوجه
    DevicesModule,        // إدارة الأجهزة المسجلة
    DataUpdateModule,     // طلبات تحديث البيانات
    PermissionsModule,    // نظام الصلاحيات
    JobTitlesModule,      // الدرجات الوظيفية
    SalaryComponentsModule, // مكونات الراتب
    SalaryStructuresModule, // هياكل الرواتب
    SalaryAssignmentsModule, // تعيينات الرواتب
    PayrollPeriodsModule,   // فترات الرواتب
    PoliciesModule,         // محرك السياسات
    PayrollCalculationModule, // محرك الحساب
    BankAccountsModule,     // الحسابات البنكية للموظفين
    CompanyBankAccountsModule, // الحسابات البنكية للشركات
    GosiModule,             // التأمينات الاجتماعية
    EosModule,              // مكافأة نهاية الخدمة
    PdfModule,              // توليد PDF
    ExcelModule,            // تصدير Excel
    EmailModule,            // إرسال البريد الإلكتروني
    RetroPayModule,         // الفروقات
    PayrollRunsModule,      // مسيرات الرواتب
    LoanPaymentsModule,     // تتبع سداد السلف
    CompaniesModule,        // إدارة الشركات
    WpsExportModule,        // تصدير WPS للبنوك
    ExceptionsModule,       // مركز الاستثناءات
    ContractsModule,        // إدارة العقود
    PayslipsModule,         // قسائم الرواتب
    DashboardModule,        // لوحة التحكم
    MudadModule,            // تتبع مُدد
    QiwaModule,             // تصدير قوى
    WpsTrackingModule,      // تتبع WPS
    AuditLogsModule,        // سجل التدقيق
    DisciplinaryModule,     // موديول الجزاءات
    CustodyModule,          // موديول العهد
    EmployeeProfileModule,  // بروفايل الموظف الشامل
    PayrollSettingsModule,  // إعدادات الرواتب
    AiModule,               // الذكاء الاصطناعي لمحرك السياسات
    SmartPoliciesModule,    // السياسات الذكية المُحللة بالـ AI
    LocationTrackingModule, // نظام تتبع موقع الموظفين
    OrganizationModule,     // الهيكل التنظيمي
    TasksModule,            // نظام المهام
    AiChatModule,           // مساعد الموظفين الذكي
    AiAnalyticsModule,      // تحليلات الأداء الذكية
    AiPayrollModule,        // تحليلات الرواتب الذكية
    AiManagerModule,        // لوحة المدير الذكية
    AiHrModule,             // أتمتة الموارد البشرية
    AiPredictiveModule,     // التحليلات التنبؤية
    CostCentersModule,      // مراكز التكلفة Enterprise
    PerformanceReviewsModule, // نظام تقييم الأداء
    GoalsModule,              // نظام الأهداف و OKRs
    RecognitionModule,        // جدار التقدير (Kudos)
    CompanyConfigModule,      // 🆕 إعدادات الشركة للتقييم (U-PEE)
    KPIModule,                // 🆕 محرك مؤشرات الأداء (KPI Engine)
    LogisticsModule,          // 🚛 نظام اللوجستيات والتوصيل
    SaudizationModule,        // 🇸🇦 نظام السعودة ونطاقات
    ProjectsModule,           // 📊 إدارة المشاريع والمحفظة
    ProgramsModule,           // 📊 إدارة البرامج
    IntegrationsModule,       // 🔗 التكاملات الخارجية (Slack, Teams, GitHub, etc.)
    SocialFeedModule,         // 📢 جدار الشركة الاجتماعي (إعلانات، أخبار، ترويج)
    CalendarEventsModule,     // 📅 أحداث التقويم (عطل، فعاليات، تواريخ مهمة)
    EmployeeDebtModule,       // 💰 دفتر ديون الموظفين
    // EmployeeDebtModule,       // 💰 دفتر ديون الموظفين - DISABLED: Prisma schema desync
    SecurityModule,           // 🔒 أمان المعادلات
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantInterceptor,
    },
  ],
})
export class AppModule { }
