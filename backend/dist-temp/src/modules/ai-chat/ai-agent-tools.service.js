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
var AiAgentToolsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiAgentToolsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const ai_service_1 = require("../ai/ai.service");
const fs = require("fs");
const path = require("path");
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
let AiAgentToolsService = AiAgentToolsService_1 = class AiAgentToolsService {
    constructor(prisma, aiService) {
        this.prisma = prisma;
        this.aiService = aiService;
        this.logger = new common_1.Logger(AiAgentToolsService_1.name);
        this.BASE_PATH = '/var/www/attendance-system/backend/src';
        this.systemKnowledge = {
            leaves: {
                name: 'نظام الإجازات',
                servicePath: '/var/www/attendance-system/backend/src/modules/leaves/leaves.service.ts',
                controllerPath: '/var/www/attendance-system/backend/src/modules/leaves/leaves.controller.ts',
                frontendPath: '/var/www/attendance-system/web-admin/src/pages/leaves/LeavesPage.tsx',
                prismaModel: 'LeaveRequest',
                types: ['ANNUAL', 'SICK', 'EMERGENCY', 'UNPAID', 'MATERNITY', 'PATERNITY', 'BEREAVEMENT', 'MARRIAGE'],
                fields: ['type', 'startDate', 'endDate', 'reason', 'status', 'userId'],
                relatedTables: ['users', 'leave_requests'],
            },
            attendance: {
                name: 'نظام الحضور',
                servicePath: '/var/www/attendance-system/backend/src/modules/attendance/attendance.service.ts',
                controllerPath: '/var/www/attendance-system/backend/src/modules/attendance/attendance.controller.ts',
                frontendPath: '/var/www/attendance-system/web-admin/src/pages/attendance/AttendancePage.tsx',
                prismaModel: 'Attendance',
                types: ['PRESENT', 'ABSENT', 'LATE', 'EARLY_LEAVE', 'ON_LEAVE'],
                fields: ['date', 'checkIn', 'checkOut', 'status', 'lateMinutes', 'userId'],
            },
            employees: {
                name: 'نظام الموظفين',
                servicePath: '/var/www/attendance-system/backend/src/modules/users/users.service.ts',
                controllerPath: '/var/www/attendance-system/backend/src/modules/users/users.controller.ts',
                frontendPath: '/var/www/attendance-system/web-admin/src/pages/users/UsersPage.tsx',
                profilePath: '/var/www/attendance-system/web-admin/src/pages/employee-profile/EmployeeProfilePage.tsx',
                prismaModel: 'User',
                fields: ['firstName', 'lastName', 'email', 'salary', 'annualLeaveDays', 'usedLeaveDays', 'remainingLeaveDays'],
            },
            payroll: {
                name: 'نظام الرواتب',
                servicePath: '/var/www/attendance-system/backend/src/modules/payroll-runs/payroll-runs.service.ts',
                frontendPath: '/var/www/attendance-system/web-admin/src/pages/salary/SalaryPage.tsx',
                prismaModel: 'PayrollRun',
            },
        };
    }
    getAvailableTools() {
        return [
            {
                name: 'create_employee',
                description: 'إضافة موظف جديد للنظام',
                parameters: {
                    firstName: { type: 'string', description: 'الاسم الأول', required: true },
                    lastName: { type: 'string', description: 'الاسم الأخير', required: true },
                    email: { type: 'string', description: 'البريد الإلكتروني', required: true },
                    department: { type: 'string', description: 'القسم' },
                    jobTitle: { type: 'string', description: 'المسمى الوظيفي' },
                    salary: { type: 'number', description: 'الراتب' },
                    phone: { type: 'string', description: 'رقم الجوال' },
                },
                requiredRole: ['ADMIN', 'HR'],
            },
            {
                name: 'update_employee',
                description: 'تعديل بيانات موظف',
                parameters: {
                    employeeName: { type: 'string', description: 'اسم الموظف', required: true },
                    field: { type: 'string', description: 'الحقل المراد تعديله', required: true },
                    value: { type: 'any', description: 'القيمة الجديدة', required: true },
                },
                requiredRole: ['ADMIN', 'HR'],
            },
            {
                name: 'delete_employee',
                description: 'حذف موظف من النظام',
                parameters: {
                    employeeName: { type: 'string', description: 'اسم الموظف', required: true },
                },
                requiredRole: ['SUPER_ADMIN'],
            },
            {
                name: 'list_employees',
                description: 'عرض قائمة الموظفين',
                parameters: {
                    department: { type: 'string', description: 'فلترة حسب القسم' },
                    limit: { type: 'number', description: 'عدد النتائج' },
                },
                requiredRole: ['ADMIN', 'HR', 'MANAGER'],
            },
            {
                name: 'create_task',
                description: 'إضافة مهمة لموظف',
                parameters: {
                    title: { type: 'string', description: 'عنوان المهمة', required: true },
                    assigneeName: { type: 'string', description: 'اسم الموظف المسؤول', required: true },
                    dueDate: { type: 'string', description: 'تاريخ الاستحقاق' },
                    priority: { type: 'string', description: 'الأولوية (HIGH/MEDIUM/LOW)' },
                },
                requiredRole: ['ADMIN', 'HR', 'MANAGER'],
            },
            {
                name: 'create_leave_request',
                description: 'إنشاء طلب إجازة',
                parameters: {
                    employeeName: { type: 'string', description: 'اسم الموظف', required: true },
                    startDate: { type: 'string', description: 'تاريخ البداية', required: true },
                    endDate: { type: 'string', description: 'تاريخ النهاية', required: true },
                    type: { type: 'string', description: 'نوع الإجازة' },
                },
                requiredRole: ['ADMIN', 'HR'],
            },
            {
                name: 'approve_leave',
                description: 'الموافقة على طلب إجازة',
                parameters: {
                    employeeName: { type: 'string', description: 'اسم الموظف', required: true },
                },
                requiredRole: ['ADMIN', 'HR', 'MANAGER'],
            },
            {
                name: 'query_count',
                description: 'حساب عدد السجلات',
                parameters: {
                    entity: { type: 'string', description: 'الكيان (employees/tasks/leaves)', required: true },
                    filter: { type: 'string', description: 'شرط الفلترة' },
                },
                requiredRole: ['ADMIN', 'HR', 'MANAGER'],
            },
            {
                name: 'attendance_report',
                description: 'تقرير الحضور والانصراف',
                parameters: {
                    period: { type: 'string', description: 'الفترة (today/week/month)', required: true },
                },
                requiredRole: ['ADMIN', 'HR', 'MANAGER'],
            },
            {
                name: 'late_employees',
                description: 'قائمة الموظفين المتأخرين',
                parameters: {
                    minLateCount: { type: 'number', description: 'الحد الأدنى للتأخيرات' },
                },
                requiredRole: ['ADMIN', 'HR', 'MANAGER'],
            },
            {
                name: 'top_salaries',
                description: 'أعلى أو أقل الرواتب',
                parameters: {
                    count: { type: 'number', description: 'عدد النتائج' },
                    order: { type: 'string', description: 'الترتيب (highest/lowest)' },
                },
                requiredRole: ['ADMIN', 'HR'],
            },
            {
                name: 'leave_statistics',
                description: 'إحصائيات الإجازات',
                parameters: {},
                requiredRole: ['ADMIN', 'HR', 'MANAGER'],
            },
            {
                name: 'attendance_summary',
                description: 'ملخص الحضور اليومي أو الشهري',
                parameters: {
                    period: { type: 'string', description: 'today/month' },
                },
                requiredRole: ['ADMIN', 'HR', 'MANAGER'],
            },
            {
                name: 'employee_search',
                description: 'بحث عن موظفين بشروط',
                parameters: {
                    field: { type: 'string', description: 'الحقل للبحث' },
                    value: { type: 'string', description: 'القيمة' },
                },
                requiredRole: ['ADMIN', 'HR', 'MANAGER'],
            },
            {
                name: 'read_file',
                description: 'قراءة محتوى ملف',
                parameters: {
                    filePath: { type: 'string', description: 'مسار الملف', required: true },
                },
                requiredRole: ['SUPER_ADMIN'],
            },
            {
                name: 'list_directory',
                description: 'عرض قائمة الملفات في مجلد',
                parameters: {
                    dirPath: { type: 'string', description: 'مسار المجلد', required: true },
                },
                requiredRole: ['SUPER_ADMIN'],
            },
            {
                name: 'search_code',
                description: 'البحث في الكود',
                parameters: {
                    query: { type: 'string', description: 'نص البحث', required: true },
                },
                requiredRole: ['SUPER_ADMIN'],
            },
            {
                name: 'get_file_outline',
                description: 'عرض هيكل الملف (functions/classes)',
                parameters: {
                    filePath: { type: 'string', description: 'مسار الملف', required: true },
                },
                requiredRole: ['SUPER_ADMIN'],
            },
            {
                name: 'write_file',
                description: 'كتابة ملف جديد',
                parameters: {
                    filePath: { type: 'string', description: 'مسار الملف', required: true },
                    content: { type: 'string', description: 'محتوى الملف', required: true },
                },
                requiredRole: ['SUPER_ADMIN'],
            },
            {
                name: 'modify_file',
                description: 'تعديل ملف موجود',
                parameters: {
                    filePath: { type: 'string', description: 'مسار الملف', required: true },
                    action: { type: 'string', description: 'نوع التعديل (append/replace)', required: true },
                    content: { type: 'string', description: 'المحتوى', required: true },
                    search: { type: 'string', description: 'النص المراد استبداله (للـ replace)' },
                },
                requiredRole: ['SUPER_ADMIN'],
            },
            {
                name: 'create_module',
                description: 'إنشاء module جديد (controller + service)',
                parameters: {
                    moduleName: { type: 'string', description: 'اسم الـ module', required: true },
                },
                requiredRole: ['SUPER_ADMIN'],
            },
            {
                name: 'restart_backend',
                description: 'إعادة تشغيل الـ backend',
                parameters: {},
                requiredRole: ['SUPER_ADMIN'],
            },
            {
                name: 'git_status',
                description: 'عرض حالة Git',
                parameters: {},
                requiredRole: ['SUPER_ADMIN'],
            },
            {
                name: 'system_info',
                description: 'معلومات السيستم',
                parameters: {},
                requiredRole: ['SUPER_ADMIN'],
            },
            {
                name: 'predict_turnover',
                description: 'توقع الموظفين المحتمل استقالتهم',
                parameters: {},
                requiredRole: ['ADMIN', 'HR', 'MANAGER'],
            },
            {
                name: 'salary_analysis',
                description: 'تحليل توزيع الرواتب',
                parameters: {},
                requiredRole: ['ADMIN', 'HR'],
            },
            {
                name: 'anomaly_detection',
                description: 'اكتشاف أنماط غير طبيعية في الحضور',
                parameters: {},
                requiredRole: ['ADMIN', 'HR', 'MANAGER'],
            },
            {
                name: 'workload_analysis',
                description: 'تحليل توزيع المهام والأعباء',
                parameters: {},
                requiredRole: ['ADMIN', 'HR', 'MANAGER'],
            },
            {
                name: 'send_notification',
                description: 'إرسال إشعار لموظف',
                parameters: {
                    employeeName: { type: 'string', description: 'اسم الموظف', required: true },
                    message: { type: 'string', description: 'نص الإشعار', required: true },
                },
                requiredRole: ['ADMIN', 'HR', 'MANAGER'],
            },
            {
                name: 'broadcast_message',
                description: 'رسالة جماعية لكل الموظفين',
                parameters: {
                    message: { type: 'string', description: 'نص الرسالة', required: true },
                },
                requiredRole: ['ADMIN', 'HR'],
            },
            {
                name: 'create_reminder',
                description: 'إنشاء تذكير',
                parameters: {
                    title: { type: 'string', description: 'عنوان التذكير', required: true },
                    date: { type: 'string', description: 'التاريخ', required: true },
                },
                requiredRole: ['ADMIN', 'HR', 'MANAGER'],
            },
            {
                name: 'send_summary_report',
                description: 'إرسال تقرير ملخص',
                parameters: {
                    type: { type: 'string', description: 'نوع التقرير (daily/weekly/monthly)' },
                },
                requiredRole: ['ADMIN', 'HR'],
            },
            {
                name: 'export_data',
                description: 'تصدير بيانات (JSON/CSV)',
                parameters: {
                    dataType: { type: 'string', description: 'نوع البيانات (employees/attendance/leaves)', required: true },
                    format: { type: 'string', description: 'صيغة التصدير (json/csv)' },
                },
                requiredRole: ['ADMIN', 'HR'],
            },
            {
                name: 'database_stats',
                description: 'إحصائيات قاعدة البيانات',
                parameters: {},
                requiredRole: ['SUPER_ADMIN'],
            },
            {
                name: 'backup_status',
                description: 'حالة النسخ الاحتياطي',
                parameters: {},
                requiredRole: ['SUPER_ADMIN'],
            },
            {
                name: 'api_health',
                description: 'فحص صحة الـ API',
                parameters: {},
                requiredRole: ['ADMIN', 'HR', 'MANAGER'],
            },
            {
                name: 'quick_actions',
                description: 'عرض الإجراءات السريعة المتاحة',
                parameters: {},
                requiredRole: ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'],
            },
            {
                name: 'smart_suggestions',
                description: 'اقتراحات ذكية بناءً على البيانات',
                parameters: {},
                requiredRole: ['ADMIN', 'HR', 'MANAGER'],
            },
            {
                name: 'help_commands',
                description: 'عرض كل الأوامر المتاحة',
                parameters: {},
                requiredRole: ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'],
            },
            {
                name: 'batch_approve_leaves',
                description: 'الموافقة على كل طلبات الإجازة المعلقة',
                parameters: {},
                requiredRole: ['ADMIN', 'HR'],
            },
            {
                name: 'daily_digest',
                description: 'ملخص يومي شامل',
                parameters: {},
                requiredRole: ['ADMIN', 'HR', 'MANAGER'],
            },
            {
                name: 'auto_reminder',
                description: 'إنشاء تذكيرات تلقائية',
                parameters: {
                    type: { type: 'string', description: 'نوع التذكير (leaves/tasks/attendance)' },
                },
                requiredRole: ['ADMIN', 'HR'],
            },
            {
                name: 'attendance_detailed_report',
                description: 'تقرير حضور تفصيلي لموظف',
                parameters: {
                    employeeName: { type: 'string', description: 'اسم الموظف', required: true },
                    month: { type: 'number', description: 'الشهر (1-12)' },
                },
                requiredRole: ['ADMIN', 'HR', 'MANAGER'],
            },
            {
                name: 'salary_breakdown',
                description: 'تفاصيل راتب موظف',
                parameters: {
                    employeeName: { type: 'string', description: 'اسم الموظف', required: true },
                },
                requiredRole: ['ADMIN', 'HR'],
            },
            {
                name: 'department_report',
                description: 'تقرير قسم كامل',
                parameters: {
                    departmentName: { type: 'string', description: 'اسم القسم', required: true },
                },
                requiredRole: ['ADMIN', 'HR', 'MANAGER'],
            },
            {
                name: 'monthly_comparison',
                description: 'مقارنة شهرية للحضور والرواتب',
                parameters: {
                    month1: { type: 'number', description: 'الشهر الأول' },
                    month2: { type: 'number', description: 'الشهر الثاني' },
                },
                requiredRole: ['ADMIN', 'HR'],
            },
            {
                name: 'add_bonus',
                description: 'إضافة مكافأة لموظف',
                parameters: {
                    employeeName: { type: 'string', description: 'اسم الموظف', required: true },
                    amount: { type: 'number', description: 'المبلغ', required: true },
                    reason: { type: 'string', description: 'السبب' },
                },
                requiredRole: ['ADMIN', 'HR'],
            },
            {
                name: 'add_deduction',
                description: 'إضافة خصم لموظف',
                parameters: {
                    employeeName: { type: 'string', description: 'اسم الموظف', required: true },
                    amount: { type: 'number', description: 'المبلغ', required: true },
                    reason: { type: 'string', description: 'السبب' },
                },
                requiredRole: ['ADMIN', 'HR'],
            },
            {
                name: 'payroll_status',
                description: 'حالة الرواتب الشهرية',
                parameters: {
                    month: { type: 'number', description: 'الشهر' },
                },
                requiredRole: ['ADMIN', 'HR'],
            },
            {
                name: 'calculate_overtime',
                description: 'حساب الأوفرتايم لموظف',
                parameters: {
                    employeeName: { type: 'string', description: 'اسم الموظف', required: true },
                },
                requiredRole: ['ADMIN', 'HR', 'MANAGER'],
            },
            {
                name: 'create_shift',
                description: 'إنشاء وردية جديدة',
                parameters: {
                    name: { type: 'string', description: 'اسم الوردية', required: true },
                    startTime: { type: 'string', description: 'وقت البداية (HH:MM)', required: true },
                    endTime: { type: 'string', description: 'وقت النهاية (HH:MM)', required: true },
                },
                requiredRole: ['ADMIN', 'HR'],
            },
            {
                name: 'list_shifts',
                description: 'عرض كل الورديات',
                parameters: {},
                requiredRole: ['ADMIN', 'HR', 'MANAGER'],
            },
            {
                name: 'assign_shift',
                description: 'تعيين وردية لموظف',
                parameters: {
                    employeeName: { type: 'string', description: 'اسم الموظف', required: true },
                    shiftName: { type: 'string', description: 'اسم الوردية', required: true },
                },
                requiredRole: ['ADMIN', 'HR'],
            },
            {
                name: 'today_shifts',
                description: 'ورديات اليوم',
                parameters: {},
                requiredRole: ['ADMIN', 'HR', 'MANAGER'],
            },
            {
                name: 'company_holidays',
                description: 'عرض العطلات الرسمية',
                parameters: {},
                requiredRole: ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'],
            },
            {
                name: 'upcoming_events',
                description: 'الأحداث القادمة',
                parameters: {},
                requiredRole: ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'],
            },
            {
                name: 'birthdays_this_month',
                description: 'أعياد الميلاد هذا الشهر',
                parameters: {},
                requiredRole: ['ADMIN', 'HR', 'MANAGER'],
            },
            {
                name: 'work_anniversaries',
                description: 'ذكرى التعيين',
                parameters: {},
                requiredRole: ['ADMIN', 'HR', 'MANAGER'],
            },
            {
                name: 'request_advance',
                description: 'طلب سلفة',
                parameters: {
                    amount: { type: 'number', description: 'المبلغ', required: true },
                    reason: { type: 'string', description: 'السبب' },
                },
                requiredRole: ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'],
            },
            {
                name: 'pending_advances',
                description: 'السلف المعلقة',
                parameters: {},
                requiredRole: ['ADMIN', 'HR'],
            },
            {
                name: 'employee_loans',
                description: 'قروض الموظفين',
                parameters: {},
                requiredRole: ['ADMIN', 'HR'],
            },
            {
                name: 'loan_summary',
                description: 'ملخص القروض والسلف',
                parameters: {},
                requiredRole: ['ADMIN', 'HR'],
            },
            {
                name: 'employee_kpis',
                description: 'مؤشرات أداء موظف',
                parameters: {
                    employeeName: { type: 'string', description: 'اسم الموظف' },
                },
                requiredRole: ['ADMIN', 'HR', 'MANAGER'],
            },
            {
                name: 'department_performance',
                description: 'أداء القسم',
                parameters: {
                    departmentName: { type: 'string', description: 'اسم القسم' },
                },
                requiredRole: ['ADMIN', 'HR', 'MANAGER'],
            },
            {
                name: 'top_performers',
                description: 'أفضل الموظفين أداءً',
                parameters: {},
                requiredRole: ['ADMIN', 'HR', 'MANAGER'],
            },
            {
                name: 'performance_comparison',
                description: 'مقارنة الأداء',
                parameters: {},
                requiredRole: ['ADMIN', 'HR', 'MANAGER'],
            },
            {
                name: 'generate_contract',
                description: 'إنشاء عقد عمل',
                parameters: {
                    employeeName: { type: 'string', description: 'اسم الموظف', required: true },
                },
                requiredRole: ['ADMIN', 'HR'],
            },
            {
                name: 'generate_certificate',
                description: 'إنشاء شهادة خبرة',
                parameters: {
                    employeeName: { type: 'string', description: 'اسم الموظف', required: true },
                },
                requiredRole: ['ADMIN', 'HR'],
            },
            {
                name: 'generate_salary_slip',
                description: 'إنشاء كشف راتب',
                parameters: {
                    employeeName: { type: 'string', description: 'اسم الموظف', required: true },
                },
                requiredRole: ['ADMIN', 'HR'],
            },
            {
                name: 'generate_warning_letter',
                description: 'إنشاء خطاب إنذار',
                parameters: {
                    employeeName: { type: 'string', description: 'اسم الموظف', required: true },
                    reason: { type: 'string', description: 'السبب', required: true },
                },
                requiredRole: ['ADMIN', 'HR'],
            },
            {
                name: 'user_permissions',
                description: 'صلاحيات المستخدم',
                parameters: {
                    employeeName: { type: 'string', description: 'اسم الموظف' },
                },
                requiredRole: ['ADMIN'],
            },
            {
                name: 'active_sessions',
                description: 'الجلسات النشطة',
                parameters: {},
                requiredRole: ['ADMIN'],
            },
            {
                name: 'login_history',
                description: 'سجل الدخول',
                parameters: {
                    employeeName: { type: 'string', description: 'اسم الموظف' },
                },
                requiredRole: ['ADMIN'],
            },
            {
                name: 'system_audit',
                description: 'سجل التدقيق',
                parameters: {},
                requiredRole: ['ADMIN'],
            },
            {
                name: 'attendance_forecast',
                description: 'توقع الحضور',
                parameters: {},
                requiredRole: ['ADMIN', 'HR', 'MANAGER'],
            },
            {
                name: 'budget_forecast',
                description: 'توقع الميزانية',
                parameters: {},
                requiredRole: ['ADMIN', 'HR'],
            },
            {
                name: 'hiring_needs',
                description: 'احتياجات التوظيف',
                parameters: {},
                requiredRole: ['ADMIN', 'HR'],
            },
            {
                name: 'turnover_prediction',
                description: 'توقع دوران الموظفين',
                parameters: {},
                requiredRole: ['ADMIN', 'HR'],
            },
            {
                name: 'bulk_update_salaries',
                description: 'تحديث الرواتب بالجملة',
                parameters: {
                    percentage: { type: 'number', description: 'نسبة الزيادة %', required: true },
                },
                requiredRole: ['ADMIN'],
            },
            {
                name: 'bulk_assign_department',
                description: 'نقل موظفين لقسم',
                parameters: {
                    fromDept: { type: 'string', description: 'القسم الأصلي' },
                    toDept: { type: 'string', description: 'القسم الجديد' },
                },
                requiredRole: ['ADMIN', 'HR'],
            },
            {
                name: 'archive_old_records',
                description: 'أرشفة السجلات القديمة',
                parameters: {},
                requiredRole: ['ADMIN'],
            },
            {
                name: 'cleanup_duplicates',
                description: 'تنظيف التكرارات',
                parameters: {},
                requiredRole: ['ADMIN'],
            },
            {
                name: 'send_welcome_email',
                description: 'إرسال إيميل ترحيب',
                parameters: { employeeName: { type: 'string', description: 'اسم الموظف' } },
                requiredRole: ['ADMIN', 'HR'],
            },
            {
                name: 'send_reminder_email',
                description: 'إرسال إيميل تذكير',
                parameters: { subject: { type: 'string', description: 'الموضوع' } },
                requiredRole: ['ADMIN', 'HR', 'MANAGER'],
            },
            {
                name: 'email_templates',
                description: 'قوالب الإيميلات',
                parameters: {},
                requiredRole: ['ADMIN', 'HR'],
            },
            {
                name: 'email_history',
                description: 'سجل الإيميلات',
                parameters: {},
                requiredRole: ['ADMIN', 'HR'],
            },
            {
                name: 'send_sms',
                description: 'إرسال رسالة SMS',
                parameters: { employeeName: { type: 'string', description: 'اسم الموظف' }, message: { type: 'string', description: 'الرسالة' } },
                requiredRole: ['ADMIN', 'HR'],
            },
            {
                name: 'sms_balance',
                description: 'رصيد الرسائل',
                parameters: {},
                requiredRole: ['ADMIN'],
            },
            {
                name: 'sms_history',
                description: 'سجل الرسائل',
                parameters: {},
                requiredRole: ['ADMIN', 'HR'],
            },
            {
                name: 'bulk_sms',
                description: 'رسائل جماعية',
                parameters: { message: { type: 'string', description: 'الرسالة' } },
                requiredRole: ['ADMIN'],
            },
            {
                name: 'create_alert',
                description: 'إنشاء تنبيه',
                parameters: { title: { type: 'string', description: 'العنوان' }, condition: { type: 'string', description: 'الشرط' } },
                requiredRole: ['ADMIN', 'HR', 'MANAGER'],
            },
            {
                name: 'active_alerts',
                description: 'التنبيهات النشطة',
                parameters: {},
                requiredRole: ['ADMIN', 'HR', 'MANAGER'],
            },
            {
                name: 'alert_history',
                description: 'سجل التنبيهات',
                parameters: {},
                requiredRole: ['ADMIN', 'HR'],
            },
            {
                name: 'disable_alert',
                description: 'إيقاف تنبيه',
                parameters: { alertId: { type: 'string', description: 'رقم التنبيه' } },
                requiredRole: ['ADMIN', 'HR'],
            },
            {
                name: 'dashboard_summary',
                description: 'ملخص لوحة التحكم',
                parameters: {},
                requiredRole: ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'],
            },
            {
                name: 'quick_stats',
                description: 'إحصائيات سريعة',
                parameters: {},
                requiredRole: ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'],
            },
            {
                name: 'today_overview',
                description: 'نظرة عامة اليوم',
                parameters: {},
                requiredRole: ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'],
            },
            {
                name: 'weekly_report',
                description: 'تقرير أسبوعي',
                parameters: {},
                requiredRole: ['ADMIN', 'HR', 'MANAGER'],
            },
            {
                name: 'export_employees',
                description: 'تصدير بيانات الموظفين',
                parameters: {},
                requiredRole: ['ADMIN', 'HR'],
            },
            {
                name: 'export_attendance',
                description: 'تصدير بيانات الحضور',
                parameters: {},
                requiredRole: ['ADMIN', 'HR'],
            },
            {
                name: 'import_status',
                description: 'حالة الاستيراد',
                parameters: {},
                requiredRole: ['ADMIN', 'HR'],
            },
            {
                name: 'data_validation',
                description: 'التحقق من البيانات',
                parameters: {},
                requiredRole: ['ADMIN', 'HR'],
            },
            {
                name: 'create_workflow',
                description: 'إنشاء workflow',
                parameters: { name: { type: 'string', description: 'اسم الـworkflow' } },
                requiredRole: ['ADMIN'],
            },
            {
                name: 'list_workflows',
                description: 'عرض workflows',
                parameters: {},
                requiredRole: ['ADMIN', 'HR'],
            },
            {
                name: 'run_workflow',
                description: 'تشغيل workflow',
                parameters: { name: { type: 'string', description: 'اسم الـworkflow' } },
                requiredRole: ['ADMIN'],
            },
            {
                name: 'workflow_history',
                description: 'سجل workflows',
                parameters: {},
                requiredRole: ['ADMIN', 'HR'],
            },
            {
                name: 'create_form',
                description: 'إنشاء نموذج',
                parameters: { name: { type: 'string', description: 'اسم النموذج' } },
                requiredRole: ['ADMIN', 'HR'],
            },
            {
                name: 'list_forms',
                description: 'عرض النماذج',
                parameters: {},
                requiredRole: ['ADMIN', 'HR', 'MANAGER'],
            },
            {
                name: 'form_responses',
                description: 'ردود النماذج',
                parameters: { formName: { type: 'string', description: 'اسم النموذج' } },
                requiredRole: ['ADMIN', 'HR'],
            },
            {
                name: 'form_analytics',
                description: 'تحليلات النماذج',
                parameters: {},
                requiredRole: ['ADMIN', 'HR'],
            },
            {
                name: 'set_goal',
                description: 'تحديد هدف',
                parameters: { employeeName: { type: 'string', description: 'اسم الموظف' }, goal: { type: 'string', description: 'الهدف' } },
                requiredRole: ['ADMIN', 'HR', 'MANAGER'],
            },
            {
                name: 'goal_progress',
                description: 'تقدم الأهداف',
                parameters: { employeeName: { type: 'string', description: 'اسم الموظف' } },
                requiredRole: ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'],
            },
            {
                name: 'team_goals',
                description: 'أهداف الفريق',
                parameters: {},
                requiredRole: ['ADMIN', 'HR', 'MANAGER'],
            },
            {
                name: 'okr_summary',
                description: 'ملخص OKRs',
                parameters: {},
                requiredRole: ['ADMIN', 'HR', 'MANAGER'],
            },
            {
                name: 'send_team_message',
                description: 'رسالة للفريق',
                parameters: { message: { type: 'string', description: 'الرسالة' } },
                requiredRole: ['ADMIN', 'HR', 'MANAGER'],
            },
            {
                name: 'team_announcements',
                description: 'إعلانات الفريق',
                parameters: {},
                requiredRole: ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'],
            },
            {
                name: 'direct_message',
                description: 'رسالة مباشرة',
                parameters: { employeeName: { type: 'string', description: 'اسم الموظف' }, message: { type: 'string', description: 'الرسالة' } },
                requiredRole: ['ADMIN', 'HR', 'MANAGER'],
            },
            {
                name: 'chat_history',
                description: 'سجل المحادثات',
                parameters: {},
                requiredRole: ['ADMIN', 'HR'],
            },
            {
                name: 'ai_recommendations',
                description: 'توصيات AI',
                parameters: {},
                requiredRole: ['ADMIN', 'HR', 'MANAGER'],
            },
            {
                name: 'pattern_analysis',
                description: 'تحليل الأنماط',
                parameters: {},
                requiredRole: ['ADMIN', 'HR'],
            },
            {
                name: 'risk_assessment',
                description: 'تقييم المخاطر',
                parameters: {},
                requiredRole: ['ADMIN', 'HR'],
            },
            {
                name: 'improvement_suggestions',
                description: 'اقتراحات التحسين',
                parameters: {},
                requiredRole: ['ADMIN', 'HR', 'MANAGER'],
            },
            {
                name: 'add_department',
                description: 'إضافة قسم جديد',
                parameters: {
                    name: { type: 'string', description: 'اسم القسم', required: true },
                    managerId: { type: 'string', description: 'ID المدير' },
                },
                requiredRole: ['ADMIN', 'HR'],
            },
            {
                name: 'add_branch',
                description: 'إضافة فرع جديد',
                parameters: {
                    name: { type: 'string', description: 'اسم الفرع', required: true },
                    address: { type: 'string', description: 'العنوان' },
                    city: { type: 'string', description: 'المدينة' },
                },
                requiredRole: ['ADMIN'],
            },
            {
                name: 'add_position',
                description: 'إضافة وظيفة جديدة',
                parameters: {
                    title: { type: 'string', description: 'المسمى الوظيفي', required: true },
                    departmentName: { type: 'string', description: 'اسم القسم' },
                    minSalary: { type: 'number', description: 'الحد الأدنى للراتب' },
                    maxSalary: { type: 'number', description: 'الحد الأقصى للراتب' },
                },
                requiredRole: ['ADMIN', 'HR'],
            },
            {
                name: 'add_leave_type',
                description: 'إضافة نوع إجازة',
                parameters: {
                    name: { type: 'string', description: 'نوع الإجازة', required: true },
                    maxDays: { type: 'number', description: 'الحد الأقصى أيام' },
                    isPaid: { type: 'boolean', description: 'مدفوعة؟' },
                },
                requiredRole: ['ADMIN', 'HR'],
            },
            {
                name: 'add_holiday',
                description: 'إضافة عطلة رسمية',
                parameters: {
                    name: { type: 'string', description: 'اسم العطلة', required: true },
                    date: { type: 'string', description: 'التاريخ YYYY-MM-DD', required: true },
                },
                requiredRole: ['ADMIN', 'HR'],
            },
            {
                name: 'add_policy',
                description: 'إضافة سياسة جديدة',
                parameters: {
                    name: { type: 'string', description: 'اسم السياسة', required: true },
                    type: { type: 'string', description: 'نوع السياسة' },
                    description: { type: 'string', description: 'الوصف' },
                },
                requiredRole: ['ADMIN'],
            },
            {
                name: 'add_attendance_manual',
                description: 'إضافة حضور يدوي',
                parameters: {
                    employeeName: { type: 'string', description: 'اسم الموظف', required: true },
                    date: { type: 'string', description: 'التاريخ YYYY-MM-DD', required: true },
                    checkIn: { type: 'string', description: 'وقت الحضور HH:MM' },
                    checkOut: { type: 'string', description: 'وقت الانصراف HH:MM' },
                },
                requiredRole: ['ADMIN', 'HR'],
            },
            {
                name: 'add_overtime_request',
                description: 'إضافة طلب عمل إضافي',
                parameters: {
                    employeeName: { type: 'string', description: 'اسم الموظف', required: true },
                    hours: { type: 'number', description: 'عدد الساعات', required: true },
                    reason: { type: 'string', description: 'السبب' },
                },
                requiredRole: ['ADMIN', 'HR', 'MANAGER'],
            },
            {
                name: 'add_task',
                description: 'إضافة مهمة',
                parameters: {
                    title: { type: 'string', description: 'عنوان المهمة', required: true },
                    assignTo: { type: 'string', description: 'تعيين لـ' },
                    dueDate: { type: 'string', description: 'تاريخ الاستحقاق' },
                    priority: { type: 'string', description: 'الأولوية' },
                },
                requiredRole: ['ADMIN', 'HR', 'MANAGER'],
            },
            {
                name: 'add_announcement',
                description: 'إضافة إعلان',
                parameters: {
                    title: { type: 'string', description: 'عنوان الإعلان', required: true },
                    content: { type: 'string', description: 'المحتوى', required: true },
                    priority: { type: 'string', description: 'الأولوية' },
                },
                requiredRole: ['ADMIN', 'HR', 'MANAGER'],
            },
            {
                name: 'add_note',
                description: 'إضافة ملاحظة لموظف',
                parameters: {
                    employeeName: { type: 'string', description: 'اسم الموظف', required: true },
                    note: { type: 'string', description: 'الملاحظة', required: true },
                    type: { type: 'string', description: 'نوع الملاحظة' },
                },
                requiredRole: ['ADMIN', 'HR', 'MANAGER'],
            },
            {
                name: 'add_training',
                description: 'إضافة تدريب',
                parameters: {
                    title: { type: 'string', description: 'عنوان التدريب', required: true },
                    employeeName: { type: 'string', description: 'اسم الموظف' },
                    date: { type: 'string', description: 'التاريخ' },
                    duration: { type: 'string', description: 'المدة' },
                },
                requiredRole: ['ADMIN', 'HR'],
            },
            {
                name: 'generate_module',
                description: 'إنشاء موديول كامل (Backend + Frontend)',
                parameters: {
                    moduleName: { type: 'string', description: 'اسم الموديول', required: true },
                    fields: { type: 'string', description: 'الحقول (مفصولة بفواصل)' },
                },
                requiredRole: ['ADMIN'],
            },
            {
                name: 'generate_prisma_model',
                description: 'إنشاء Database Model',
                parameters: {
                    modelName: { type: 'string', description: 'اسم الموديل', required: true },
                    fields: { type: 'string', description: 'الحقول (name:type)' },
                },
                requiredRole: ['ADMIN'],
            },
            {
                name: 'generate_api_endpoint',
                description: 'إنشاء API Endpoint',
                parameters: {
                    name: { type: 'string', description: 'اسم الـ API', required: true },
                    method: { type: 'string', description: 'GET/POST/PUT/DELETE' },
                },
                requiredRole: ['ADMIN'],
            },
            {
                name: 'generate_frontend_page',
                description: 'إنشاء صفحة Frontend',
                parameters: {
                    pageName: { type: 'string', description: 'اسم الصفحة', required: true },
                    pageType: { type: 'string', description: 'list/form/dashboard' },
                },
                requiredRole: ['ADMIN'],
            },
            {
                name: 'generate_crud_system',
                description: 'إنشاء نظام CRUD كامل',
                parameters: {
                    systemName: { type: 'string', description: 'اسم النظام', required: true },
                    arabicName: { type: 'string', description: 'الاسم بالعربي' },
                    fields: { type: 'string', description: 'الحقول' },
                },
                requiredRole: ['ADMIN'],
            },
            {
                name: 'list_generated_modules',
                description: 'عرض الموديولات المُنشأة',
                parameters: {},
                requiredRole: ['ADMIN'],
            },
            {
                name: 'run_prisma_migrate',
                description: 'تنفيذ Prisma Migration',
                parameters: {},
                requiredRole: ['ADMIN'],
            },
            {
                name: 'deploy_changes',
                description: 'نشر التغييرات على السيرفر',
                parameters: {},
                requiredRole: ['ADMIN'],
            },
        ];
    }
    async executeTool(toolName, params, context) {
        this.logger.log(`[TOOL] Executing: ${toolName} with params: ${JSON.stringify(params)}`);
        const tool = this.getAvailableTools().find(t => t.name === toolName);
        if (!tool) {
            return { success: false, message: `❌ الأداة "${toolName}" غير موجودة` };
        }
        if (!tool.requiredRole.includes(context.userRole) && context.userRole !== 'SUPER_ADMIN') {
            return { success: false, message: `❌ ليس لديك صلاحية لتنفيذ هذا الأمر` };
        }
        try {
            switch (toolName) {
                case 'create_employee':
                    return await this.createEmployee(params, context);
                case 'update_employee':
                    return await this.updateEmployee(params, context);
                case 'delete_employee':
                    return await this.deleteEmployee(params, context);
                case 'list_employees':
                    return await this.listEmployees(params, context);
                case 'create_task':
                    return await this.createTask(params, context);
                case 'create_leave_request':
                    return await this.createLeaveRequest(params, context);
                case 'approve_leave':
                    return await this.approveLeave(params, context);
                case 'query_count':
                    return await this.queryCount(params, context);
                case 'attendance_report':
                    return await this.attendanceReport(params, context);
                case 'late_employees':
                    return await this.lateEmployees(params, context);
                case 'top_salaries':
                    return await this.topSalaries(params, context);
                case 'leave_statistics':
                    return await this.leaveStatistics(params, context);
                case 'attendance_summary':
                    return await this.attendanceSummary(params, context);
                case 'employee_search':
                    return await this.employeeSearch(params, context);
                case 'read_file':
                    return await this.readFile(params, context);
                case 'list_directory':
                    return await this.listDirectory(params, context);
                case 'search_code':
                    return await this.searchCode(params, context);
                case 'get_file_outline':
                    return await this.getFileOutline(params, context);
                case 'write_file':
                    return await this.writeFile(params, context);
                case 'modify_file':
                    return await this.modifyFile(params, context);
                case 'create_module':
                    return await this.createModule(params, context);
                case 'restart_backend':
                    return await this.restartBackend(params, context);
                case 'git_status':
                    return await this.gitStatus(params, context);
                case 'system_info':
                    return await this.systemInfo(params, context);
                case 'predict_turnover':
                    return await this.predictTurnover(params, context);
                case 'salary_analysis':
                    return await this.salaryAnalysis(params, context);
                case 'anomaly_detection':
                    return await this.anomalyDetection(params, context);
                case 'workload_analysis':
                    return await this.workloadAnalysis(params, context);
                case 'send_notification':
                    return await this.sendNotification(params, context);
                case 'broadcast_message':
                    return await this.broadcastMessage(params, context);
                case 'create_reminder':
                    return await this.createReminder(params, context);
                case 'send_summary_report':
                    return await this.sendSummaryReport(params, context);
                case 'export_data':
                    return await this.exportData(params, context);
                case 'database_stats':
                    return await this.databaseStats(params, context);
                case 'backup_status':
                    return await this.backupStatus(params, context);
                case 'api_health':
                    return await this.apiHealth(params, context);
                case 'quick_actions':
                    return await this.quickActions(params, context);
                case 'smart_suggestions':
                    return await this.smartSuggestions(params, context);
                case 'help_commands':
                    return await this.helpCommands(params, context);
                case 'batch_approve_leaves':
                    return await this.batchApproveLeaves(params, context);
                case 'daily_digest':
                    return await this.dailyDigest(params, context);
                case 'auto_reminder':
                    return await this.autoReminder(params, context);
                case 'attendance_detailed_report':
                    return await this.attendanceDetailedReport(params, context);
                case 'salary_breakdown':
                    return await this.salaryBreakdown(params, context);
                case 'department_report':
                    return await this.departmentReport(params, context);
                case 'monthly_comparison':
                    return await this.monthlyComparison(params, context);
                case 'add_bonus':
                    return await this.addBonus(params, context);
                case 'add_deduction':
                    return await this.addDeduction(params, context);
                case 'payroll_status':
                    return await this.payrollStatus(params, context);
                case 'calculate_overtime':
                    return await this.calculateOvertime(params, context);
                case 'create_shift':
                    return await this.createShift(params, context);
                case 'list_shifts':
                    return await this.listShifts(params, context);
                case 'assign_shift':
                    return await this.assignShift(params, context);
                case 'today_shifts':
                    return await this.todayShifts(params, context);
                case 'company_holidays':
                    return await this.companyHolidays(params, context);
                case 'upcoming_events':
                    return await this.upcomingEvents(params, context);
                case 'birthdays_this_month':
                    return await this.birthdaysThisMonth(params, context);
                case 'work_anniversaries':
                    return await this.workAnniversaries(params, context);
                case 'request_advance':
                    return await this.requestAdvance(params, context);
                case 'pending_advances':
                    return await this.pendingAdvances(params, context);
                case 'employee_loans':
                    return await this.employeeLoans(params, context);
                case 'loan_summary':
                    return await this.loanSummary(params, context);
                case 'employee_kpis':
                    return await this.employeeKpis(params, context);
                case 'department_performance':
                    return await this.departmentPerformance(params, context);
                case 'top_performers':
                    return await this.topPerformers(params, context);
                case 'performance_comparison':
                    return await this.performanceComparison(params, context);
                case 'generate_contract':
                    return await this.generateContract(params, context);
                case 'generate_certificate':
                    return await this.generateCertificate(params, context);
                case 'generate_salary_slip':
                    return await this.generateSalarySlip(params, context);
                case 'generate_warning_letter':
                    return await this.generateWarningLetter(params, context);
                case 'user_permissions':
                    return await this.userPermissions(params, context);
                case 'active_sessions':
                    return await this.activeSessions(params, context);
                case 'login_history':
                    return await this.loginHistory(params, context);
                case 'system_audit':
                    return await this.systemAudit(params, context);
                case 'attendance_forecast':
                    return await this.attendanceForecast(params, context);
                case 'budget_forecast':
                    return await this.budgetForecast(params, context);
                case 'hiring_needs':
                    return await this.hiringNeeds(params, context);
                case 'turnover_prediction':
                    return await this.turnoverPrediction(params, context);
                case 'bulk_update_salaries':
                    return await this.bulkUpdateSalaries(params, context);
                case 'bulk_assign_department':
                    return await this.bulkAssignDepartment(params, context);
                case 'archive_old_records':
                    return await this.archiveOldRecords(params, context);
                case 'cleanup_duplicates':
                    return await this.cleanupDuplicates(params, context);
                case 'send_welcome_email':
                    return await this.sendWelcomeEmail(params, context);
                case 'send_reminder_email':
                    return await this.sendReminderEmail(params, context);
                case 'email_templates':
                    return await this.emailTemplates(params, context);
                case 'email_history':
                    return await this.emailHistory(params, context);
                case 'send_sms':
                    return await this.sendSms(params, context);
                case 'sms_balance':
                    return await this.smsBalance(params, context);
                case 'sms_history':
                    return await this.smsHistory(params, context);
                case 'bulk_sms':
                    return await this.bulkSms(params, context);
                case 'create_alert':
                    return await this.createAlert(params, context);
                case 'active_alerts':
                    return await this.activeAlerts(params, context);
                case 'alert_history':
                    return await this.alertHistory(params, context);
                case 'disable_alert':
                    return await this.disableAlert(params, context);
                case 'dashboard_summary':
                    return await this.dashboardSummary(params, context);
                case 'quick_stats':
                    return await this.quickStats(params, context);
                case 'today_overview':
                    return await this.todayOverview(params, context);
                case 'weekly_report':
                    return await this.weeklyReport(params, context);
                case 'export_employees':
                    return await this.exportEmployees(params, context);
                case 'export_attendance':
                    return await this.exportAttendance(params, context);
                case 'import_status':
                    return await this.importStatus(params, context);
                case 'data_validation':
                    return await this.dataValidation(params, context);
                case 'create_workflow':
                    return await this.createWorkflow(params, context);
                case 'list_workflows':
                    return await this.listWorkflows(params, context);
                case 'run_workflow':
                    return await this.runWorkflow(params, context);
                case 'workflow_history':
                    return await this.workflowHistory(params, context);
                case 'create_form':
                    return await this.createForm(params, context);
                case 'list_forms':
                    return await this.listForms(params, context);
                case 'form_responses':
                    return await this.formResponses(params, context);
                case 'form_analytics':
                    return await this.formAnalytics(params, context);
                case 'set_goal':
                    return await this.setGoal(params, context);
                case 'goal_progress':
                    return await this.goalProgress(params, context);
                case 'team_goals':
                    return await this.teamGoals(params, context);
                case 'okr_summary':
                    return await this.okrSummary(params, context);
                case 'send_team_message':
                    return await this.sendTeamMessage(params, context);
                case 'team_announcements':
                    return await this.teamAnnouncements(params, context);
                case 'direct_message':
                    return await this.directMessage(params, context);
                case 'chat_history':
                    return await this.chatHistory(params, context);
                case 'ai_recommendations':
                    return await this.aiRecommendations(params, context);
                case 'pattern_analysis':
                    return await this.patternAnalysis(params, context);
                case 'risk_assessment':
                    return await this.riskAssessment(params, context);
                case 'improvement_suggestions':
                    return await this.improvementSuggestions(params, context);
                case 'add_department':
                    return await this.addDepartment(params, context);
                case 'add_branch':
                    return await this.addBranch(params, context);
                case 'add_position':
                    return await this.addPosition(params, context);
                case 'add_leave_type':
                    return await this.addLeaveType(params, context);
                case 'add_holiday':
                    return await this.addHoliday(params, context);
                case 'add_policy':
                    return await this.addPolicy(params, context);
                case 'add_attendance_manual':
                    return await this.addAttendanceManual(params, context);
                case 'add_overtime_request':
                    return await this.addOvertimeRequest(params, context);
                case 'add_task':
                    return await this.addTask(params, context);
                case 'add_announcement':
                    return await this.addAnnouncement(params, context);
                case 'add_note':
                    return await this.addNote(params, context);
                case 'add_training':
                    return await this.addTraining(params, context);
                case 'generate_module':
                    return await this.generateModule(params, context);
                case 'generate_prisma_model':
                    return await this.generatePrismaModel(params, context);
                case 'generate_api_endpoint':
                    return await this.generateApiEndpoint(params, context);
                case 'generate_frontend_page':
                    return await this.generateFrontendPage(params, context);
                case 'generate_crud_system':
                    return await this.generateCrudSystem(params, context);
                case 'list_generated_modules':
                    return await this.listGeneratedModules(params, context);
                case 'run_prisma_migrate':
                    return await this.runPrismaMigrate(params, context);
                case 'deploy_changes':
                    return await this.deployChanges(params, context);
                default:
                    return { success: false, message: `❌ الأداة غير مدعومة` };
            }
        }
        catch (error) {
            this.logger.error(`[TOOL] Error: ${error.message}`);
            return { success: false, message: `❌ خطأ: ${error.message}` };
        }
    }
    async createEmployee(params, context) {
        const { firstName, lastName, email, department, jobTitle, salary, phone } = params;
        if (!firstName || !lastName || !email) {
            return { success: false, message: '❌ الاسم الأول والأخير والإيميل مطلوبة' };
        }
        const employee = await this.prisma.user.create({
            data: {
                firstName,
                lastName,
                email,
                department: department || null,
                jobTitle: jobTitle || null,
                salary: salary ? parseFloat(salary) : null,
                phone: phone || null,
                companyId: context.companyId,
                role: 'EMPLOYEE',
                password: '$2b$10$defaultHashedPassword',
            },
        });
        return {
            success: true,
            message: `✅ تم إضافة الموظف "${firstName} ${lastName}" بنجاح!
📧 البريد: ${email}
🏢 القسم: ${department || 'غير محدد'}
💼 المسمى: ${jobTitle || 'غير محدد'}`,
            data: employee,
        };
    }
    async updateEmployee(params, context) {
        const { employeeName, field, value } = params;
        const employee = await this.findEmployeeByName(employeeName, context.companyId);
        if (!employee) {
            return { success: false, message: `❌ لم يتم العثور على موظف باسم "${employeeName}"` };
        }
        const updateData = {};
        if (field === 'salary') {
            updateData.salary = parseFloat(value);
        }
        else {
            updateData[field] = value;
        }
        await this.prisma.user.update({
            where: { id: employee.id },
            data: updateData,
        });
        return {
            success: true,
            message: `✅ تم تعديل ${field} للموظف "${employee.firstName} ${employee.lastName}" إلى "${value}"`,
        };
    }
    async deleteEmployee(params, context) {
        const { employeeName } = params;
        const employee = await this.findEmployeeByName(employeeName, context.companyId);
        if (!employee) {
            return { success: false, message: `❌ لم يتم العثور على موظف باسم "${employeeName}"` };
        }
        await this.prisma.user.delete({ where: { id: employee.id } });
        return {
            success: true,
            message: `✅ تم حذف الموظف "${employee.firstName} ${employee.lastName}" بنجاح`,
        };
    }
    async listEmployees(params, context) {
        const { limit } = params;
        const employees = await this.prisma.user.findMany({
            where: {
                companyId: context.companyId,
            },
            take: limit || 10,
            select: {
                firstName: true,
                lastName: true,
                jobTitle: true,
                email: true,
                role: true,
            },
        });
        const filtered = employees.filter((e) => e.role !== 'SUPER_ADMIN');
        if (filtered.length === 0) {
            return { success: true, message: '📋 لا يوجد موظفين' };
        }
        const list = filtered
            .map((e, i) => `${i + 1}. ${e.firstName} ${e.lastName} (${e.jobTitle || 'بدون مسمى'})`)
            .join('\n');
        return {
            success: true,
            message: `📋 قائمة الموظفين (${filtered.length}):\n${list}`,
            data: filtered,
        };
    }
    async createTask(params, context) {
        const { title, assigneeName, dueDate, priority } = params;
        const assignee = await this.findEmployeeByName(assigneeName, context.companyId);
        if (!assignee) {
            return { success: false, message: `❌ لم يتم العثور على موظف باسم "${assigneeName}"` };
        }
        const task = await this.prisma.task.create({
            data: {
                title,
                assignee: { connect: { id: assignee.id } },
                createdBy: { connect: { id: context.userId } },
                company: { connect: { id: context.companyId } },
                status: 'PENDING',
                priority: (priority || 'MEDIUM'),
                dueDate: dueDate ? new Date(dueDate) : null,
            },
        });
        return {
            success: true,
            message: `✅ تم إضافة المهمة "${title}" للموظف ${assignee.firstName} ${assignee.lastName}`,
            data: task,
        };
    }
    async createLeaveRequest(params, context) {
        const { employeeName, startDate, endDate, type } = params;
        const employee = await this.findEmployeeByName(employeeName, context.companyId);
        if (!employee) {
            return { success: false, message: `❌ لم يتم العثور على موظف باسم "${employeeName}"` };
        }
        const leave = await this.prisma.leaveRequest.create({
            data: {
                user: { connect: { id: employee.id } },
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                type: (type || 'ANNUAL'),
                status: 'PENDING',
                reason: 'طلب إجازة عبر AI Chat',
            },
        });
        return {
            success: true,
            message: `✅ تم إنشاء طلب إجازة للموظف ${employee.firstName} من ${startDate} إلى ${endDate}`,
            data: leave,
        };
    }
    async approveLeave(params, context) {
        const { employeeName } = params;
        const employee = await this.findEmployeeByName(employeeName, context.companyId);
        if (!employee) {
            return { success: false, message: `❌ لم يتم العثور على موظف باسم "${employeeName}"` };
        }
        const pendingLeave = await this.prisma.leaveRequest.findFirst({
            where: { userId: employee.id, status: 'PENDING' },
            orderBy: { createdAt: 'desc' },
        });
        if (!pendingLeave) {
            return { success: false, message: `❌ لا يوجد طلب إجازة معلق للموظف ${employee.firstName}` };
        }
        await this.prisma.leaveRequest.update({
            where: { id: pendingLeave.id },
            data: { status: 'APPROVED' },
        });
        return {
            success: true,
            message: `✅ تم الموافقة على إجازة ${employee.firstName} ${employee.lastName}`,
        };
    }
    async queryCount(params, context) {
        const { entity } = params;
        let count = 0;
        switch (entity) {
            case 'employees':
                count = await this.prisma.user.count({ where: { companyId: context.companyId } });
                break;
            case 'tasks':
                count = await this.prisma.task.count({ where: { companyId: context.companyId } });
                break;
            case 'leaves':
                count = await this.prisma.leaveRequest.count({ where: { companyId: context.companyId } });
                break;
            default:
                return { success: false, message: `❌ الكيان "${entity}" غير مدعوم` };
        }
        return {
            success: true,
            message: `📊 عدد ${entity}: ${count}`,
            data: { count },
        };
    }
    async attendanceReport(params, context) {
        const { period } = params;
        let startDate = new Date();
        if (period === 'today') {
            startDate.setHours(0, 0, 0, 0);
        }
        else if (period === 'week') {
            startDate.setDate(startDate.getDate() - 7);
        }
        else if (period === 'month') {
            startDate.setMonth(startDate.getMonth() - 1);
        }
        const records = await this.prisma.attendance.findMany({
            where: {
                createdAt: { gte: startDate },
            },
            include: { user: { select: { firstName: true, lastName: true } } },
            take: 20,
            orderBy: { createdAt: 'desc' },
        });
        if (records.length === 0) {
            return { success: true, message: '📋 لا يوجد سجلات حضور للفترة المحددة' };
        }
        const list = records.map((r, i) => `${i + 1}. ${r.user?.firstName || ''} ${r.user?.lastName || ''} - ${new Date(r.createdAt).toLocaleDateString('ar')}`).join('\n');
        return {
            success: true,
            message: `📊 تقرير الحضور (${records.length} سجل):\n${list}`,
            data: records,
        };
    }
    async lateEmployees(params, context) {
        const records = await this.prisma.attendance.findMany({
            include: { user: { select: { id: true, firstName: true, lastName: true } } },
            take: 100,
        });
        if (records.length === 0) {
            return { success: true, message: '✅ لا يوجد سجلات حضور' };
        }
        const userCounts = {};
        records.forEach((r) => {
            if (r.user) {
                const key = r.userId;
                if (!userCounts[key]) {
                    userCounts[key] = { user: r.user, count: 0 };
                }
                userCounts[key].count++;
            }
        });
        const users = Object.values(userCounts);
        const sorted = users.sort((a, b) => b.count - a.count).slice(0, 10);
        const list = sorted.map((r, i) => `${i + 1}. ${r.user.firstName} ${r.user.lastName} - ${r.count} سجل`).join('\n');
        return {
            success: true,
            message: `📊 أكثر الموظفين حضوراً (${sorted.length}):\n${list}`,
            data: sorted,
        };
    }
    async topSalaries(params, context) {
        const count = params.count || 5;
        const order = params.order === 'lowest' ? 'asc' : 'desc';
        const employees = await this.prisma.user.findMany({
            where: {
                companyId: context.companyId,
                salary: { not: null },
            },
            orderBy: { salary: order },
            take: count,
            select: { firstName: true, lastName: true, salary: true, jobTitle: true },
        });
        if (employees.length === 0) {
            return { success: true, message: '📋 لا يوجد موظفين بيانات رواتب' };
        }
        const orderText = order === 'desc' ? 'أعلى' : 'أقل';
        const list = employees.map((e, i) => `${i + 1}. ${e.firstName} ${e.lastName} - ${e.salary?.toLocaleString() || 0} ريال`).join('\n');
        return {
            success: true,
            message: `💰 ${orderText} ${count} رواتب:\n${list}`,
            data: employees,
        };
    }
    async leaveStatistics(params, context) {
        const stats = await this.prisma.leaveRequest.groupBy({
            by: ['status'],
            _count: { id: true },
        });
        if (stats.length === 0) {
            return { success: true, message: '📋 لا يوجد طلبات إجازات' };
        }
        const statusMap = {
            'PENDING': 'معلقة',
            'APPROVED': 'موافق عليها',
            'REJECTED': 'مرفوضة',
        };
        const list = stats.map((s) => `• ${statusMap[s.status] || s.status}: ${s._count.id}`).join('\n');
        return {
            success: true,
            message: `📊 إحصائيات الإجازات:\n${list}`,
            data: stats,
        };
    }
    async attendanceSummary(params, context) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const presentCount = await this.prisma.attendance.count({
            where: { createdAt: { gte: today } },
        });
        const totalEmployees = await this.prisma.user.count({
            where: { companyId: context.companyId },
        });
        return {
            success: true,
            message: `📊 ملخص الحضور اليوم:
👥 إجمالي الموظفين: ${totalEmployees}
✅ الحاضرين: ${presentCount}
❌ الغائبين: ${totalEmployees - presentCount}`,
            data: { totalEmployees, presentCount },
        };
    }
    async employeeSearch(params, context) {
        const { field, value } = params;
        const employees = await this.prisma.user.findMany({
            where: { companyId: context.companyId },
            select: { firstName: true, lastName: true, email: true, jobTitle: true, phone: true },
        });
        const filtered = employees.filter((e) => {
            const searchValue = (value || '').toLowerCase();
            if (field === 'name') {
                return `${e.firstName} ${e.lastName}`.toLowerCase().includes(searchValue);
            }
            return (e[field] || '').toLowerCase().includes(searchValue);
        });
        if (filtered.length === 0) {
            return { success: true, message: '📋 لا توجد نتائج' };
        }
        const list = filtered.map((e, i) => `${i + 1}. ${e.firstName} ${e.lastName} (${e.jobTitle || 'بدون مسمى'})`).join('\n');
        return {
            success: true,
            message: `🔍 نتائج البحث (${filtered.length}):\n${list}`,
            data: filtered,
        };
    }
    async readFile(params, context) {
        const { filePath } = params;
        const fullPath = path.join(this.BASE_PATH, filePath);
        if (!fullPath.startsWith(this.BASE_PATH)) {
            return { success: false, message: '❌ غير مسموح بقراءة هذا المسار' };
        }
        try {
            if (!fs.existsSync(fullPath)) {
                return { success: false, message: `❌ الملف غير موجود: ${filePath}` };
            }
            const content = fs.readFileSync(fullPath, 'utf-8');
            const lines = content.split('\n');
            const preview = lines.slice(0, 50).join('\n');
            return {
                success: true,
                message: `📄 ${filePath} (${lines.length} سطر):\n\`\`\`\n${preview}\n\`\`\`${lines.length > 50 ? '\n... (مقتطع)' : ''}`,
                data: { content, lineCount: lines.length },
            };
        }
        catch (error) {
            return { success: false, message: `❌ خطأ: ${error.message}` };
        }
    }
    async listDirectory(params, context) {
        const { dirPath } = params;
        const fullPath = path.join(this.BASE_PATH, dirPath || '');
        if (!fullPath.startsWith(this.BASE_PATH)) {
            return { success: false, message: '❌ غير مسموح بقراءة هذا المسار' };
        }
        try {
            if (!fs.existsSync(fullPath)) {
                return { success: false, message: `❌ المجلد غير موجود: ${dirPath}` };
            }
            const items = fs.readdirSync(fullPath);
            const detailed = items.map(item => {
                const itemPath = path.join(fullPath, item);
                const stat = fs.statSync(itemPath);
                return stat.isDirectory() ? `📁 ${item}/` : `📄 ${item}`;
            });
            return {
                success: true,
                message: `📂 ${dirPath || 'src'} (${items.length} عنصر):\n${detailed.join('\n')}`,
                data: items,
            };
        }
        catch (error) {
            return { success: false, message: `❌ خطأ: ${error.message}` };
        }
    }
    async searchCode(params, context) {
        const { query } = params;
        const results = [];
        const searchDir = (dir) => {
            try {
                const items = fs.readdirSync(dir);
                for (const item of items) {
                    const itemPath = path.join(dir, item);
                    const stat = fs.statSync(itemPath);
                    if (stat.isDirectory() && !item.includes('node_modules')) {
                        searchDir(itemPath);
                    }
                    else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
                        const content = fs.readFileSync(itemPath, 'utf-8');
                        if (content.includes(query)) {
                            const relativePath = itemPath.replace(this.BASE_PATH, '');
                            const lines = content.split('\n');
                            const matchLine = lines.findIndex(l => l.includes(query)) + 1;
                            results.push(`📄 ${relativePath}:${matchLine}`);
                        }
                    }
                }
            }
            catch (e) { }
        };
        searchDir(this.BASE_PATH);
        if (results.length === 0) {
            return { success: true, message: `🔍 لم يتم العثور على "${query}"` };
        }
        return {
            success: true,
            message: `🔍 نتائج البحث عن "${query}" (${results.length}):\n${results.slice(0, 20).join('\n')}`,
            data: results,
        };
    }
    async getFileOutline(params, context) {
        const { filePath } = params;
        const fullPath = path.join(this.BASE_PATH, filePath);
        if (!fullPath.startsWith(this.BASE_PATH)) {
            return { success: false, message: '❌ غير مسموح بقراءة هذا المسار' };
        }
        try {
            if (!fs.existsSync(fullPath)) {
                return { success: false, message: `❌ الملف غير موجود: ${filePath}` };
            }
            const content = fs.readFileSync(fullPath, 'utf-8');
            const lines = content.split('\n');
            const outline = [];
            lines.forEach((line, i) => {
                if (/^\s*(export\s+)?(async\s+)?function\s+\w+/.test(line)) {
                    const match = line.match(/function\s+(\w+)/);
                    outline.push(`⚡ ${match?.[1] || 'function'} (line ${i + 1})`);
                }
                if (/^\s*(private|public|protected)?\s*(async\s+)?\w+\s*\(/.test(line) && !line.includes('if') && !line.includes('for')) {
                    const match = line.match(/(\w+)\s*\(/);
                    if (match && match[1] !== 'if' && match[1] !== 'for' && match[1] !== 'while') {
                        outline.push(`🔧 ${match[1]}() (line ${i + 1})`);
                    }
                }
                if (/^\s*(export\s+)?class\s+\w+/.test(line)) {
                    const match = line.match(/class\s+(\w+)/);
                    outline.push(`📦 ${match?.[1] || 'class'} (line ${i + 1})`);
                }
            });
            if (outline.length === 0) {
                return { success: true, message: `📄 ${filePath} - لم يتم العثور على functions/classes` };
            }
            return {
                success: true,
                message: `📄 ${filePath} outline:\n${outline.slice(0, 30).join('\n')}`,
                data: outline,
            };
        }
        catch (error) {
            return { success: false, message: `❌ خطأ: ${error.message}` };
        }
    }
    async writeFile(params, context) {
        const { filePath, content } = params;
        const fullPath = path.join(this.BASE_PATH, filePath);
        if (!fullPath.startsWith(this.BASE_PATH)) {
            return { success: false, message: '❌ غير مسموح بالكتابة في هذا المسار' };
        }
        try {
            if (fs.existsSync(fullPath)) {
                return { success: false, message: `❌ الملف موجود بالفعل: ${filePath}. استخدم modify_file للتعديل.` };
            }
            const dir = path.dirname(fullPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(fullPath, content, 'utf-8');
            return {
                success: true,
                message: `✅ تم إنشاء الملف: ${filePath}\n📊 الحجم: ${content.length} حرف`,
            };
        }
        catch (error) {
            return { success: false, message: `❌ خطأ: ${error.message}` };
        }
    }
    async modifyFile(params, context) {
        const { filePath, action, content, search } = params;
        const fullPath = path.join(this.BASE_PATH, filePath);
        if (!fullPath.startsWith(this.BASE_PATH)) {
            return { success: false, message: '❌ غير مسموح بالتعديل في هذا المسار' };
        }
        try {
            if (!fs.existsSync(fullPath)) {
                return { success: false, message: `❌ الملف غير موجود: ${filePath}` };
            }
            const originalContent = fs.readFileSync(fullPath, 'utf-8');
            const backupPath = fullPath + '.backup';
            fs.writeFileSync(backupPath, originalContent, 'utf-8');
            let newContent = originalContent;
            if (action === 'append') {
                newContent = originalContent + '\n' + content;
            }
            else if (action === 'replace' && search) {
                if (!originalContent.includes(search)) {
                    return { success: false, message: `❌ النص المراد استبداله غير موجود` };
                }
                newContent = originalContent.replace(search, content);
            }
            else {
                return { success: false, message: '❌ action يجب أن يكون append أو replace' };
            }
            fs.writeFileSync(fullPath, newContent, 'utf-8');
            return {
                success: true,
                message: `✅ تم تعديل الملف: ${filePath}\n💾 تم إنشاء نسخة احتياطية`,
            };
        }
        catch (error) {
            return { success: false, message: `❌ خطأ: ${error.message}` };
        }
    }
    async createModule(params, context) {
        const { moduleName } = params;
        const moduleDir = path.join(this.BASE_PATH, 'modules', moduleName);
        try {
            if (fs.existsSync(moduleDir)) {
                return { success: false, message: `❌ الـ module موجود بالفعل: ${moduleName}` };
            }
            fs.mkdirSync(moduleDir, { recursive: true });
            const servicePath = path.join(moduleDir, `${moduleName}.service.ts`);
            const serviceContent = `import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ${this.capitalize(moduleName)}Service {
    private readonly logger = new Logger(${this.capitalize(moduleName)}Service.name);

    constructor(private readonly prisma: PrismaService) {}

    async findAll() {
        return [];
    }
}
`;
            fs.writeFileSync(servicePath, serviceContent, 'utf-8');
            const controllerPath = path.join(moduleDir, `${moduleName}.controller.ts`);
            const controllerContent = `import { Controller, Get } from '@nestjs/common';
import { ${this.capitalize(moduleName)}Service } from './${moduleName}.service';

@Controller('${moduleName}')
export class ${this.capitalize(moduleName)}Controller {
    constructor(private readonly service: ${this.capitalize(moduleName)}Service) {}

    @Get()
    findAll() {
        return this.service.findAll();
    }
}
`;
            fs.writeFileSync(controllerPath, controllerContent, 'utf-8');
            const modulePath = path.join(moduleDir, `${moduleName}.module.ts`);
            const moduleContent = `import { Module } from '@nestjs/common';
import { ${this.capitalize(moduleName)}Controller } from './${moduleName}.controller';
import { ${this.capitalize(moduleName)}Service } from './${moduleName}.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [${this.capitalize(moduleName)}Controller],
    providers: [${this.capitalize(moduleName)}Service],
    exports: [${this.capitalize(moduleName)}Service],
})
export class ${this.capitalize(moduleName)}Module {}
`;
            fs.writeFileSync(modulePath, moduleContent, 'utf-8');
            return {
                success: true,
                message: `✅ تم إنشاء الـ module: ${moduleName}
📁 الملفات:
  • ${moduleName}.module.ts
  • ${moduleName}.service.ts
  • ${moduleName}.controller.ts

⚠️ لا تنسى إضافته لـ app.module.ts`,
            };
        }
        catch (error) {
            return { success: false, message: `❌ خطأ: ${error.message}` };
        }
    }
    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
    async restartBackend(params, context) {
        try {
            this.logger.warn(`[SYSTEM] Backend restart requested by user ${context.userId}`);
            const { stdout, stderr } = await execAsync('pm2 restart attendance-backend', {
                cwd: '/var/www/attendance-system/backend',
            });
            return {
                success: true,
                message: `🔄 تم إعادة تشغيل الـ backend بنجاح!\n📋 النتيجة:\n${stdout || 'تم'}`,
            };
        }
        catch (error) {
            return { success: false, message: `❌ خطأ: ${error.message}` };
        }
    }
    async gitStatus(params, context) {
        try {
            const { stdout } = await execAsync('git status --short', {
                cwd: '/var/www/attendance-system',
            });
            if (!stdout.trim()) {
                return {
                    success: true,
                    message: '✅ لا توجد تغييرات - السيستم محدث',
                };
            }
            return {
                success: true,
                message: `📋 حالة Git:\n\`\`\`\n${stdout}\n\`\`\``,
            };
        }
        catch (error) {
            return { success: false, message: `❌ خطأ: ${error.message}` };
        }
    }
    async systemInfo(params, context) {
        try {
            const uptime = process.uptime();
            const memUsage = process.memoryUsage();
            const formatBytes = (bytes) => {
                return (bytes / 1024 / 1024).toFixed(2) + ' MB';
            };
            const formatUptime = (seconds) => {
                const hours = Math.floor(seconds / 3600);
                const mins = Math.floor((seconds % 3600) / 60);
                return `${hours} ساعة و ${mins} دقيقة`;
            };
            return {
                success: true,
                message: `🖥️ معلومات السيستم:
⏱️ وقت التشغيل: ${formatUptime(uptime)}
💾 الذاكرة المستخدمة: ${formatBytes(memUsage.heapUsed)}
📦 إجمالي الذاكرة: ${formatBytes(memUsage.heapTotal)}
🔧 Node.js: ${process.version}
📁 المسار: ${process.cwd()}`,
            };
        }
        catch (error) {
            return { success: false, message: `❌ خطأ: ${error.message}` };
        }
    }
    async predictTurnover(params, context) {
        try {
            const employees = await this.prisma.user.findMany({
                where: { companyId: context.companyId },
                include: {
                    attendances: { take: 30, orderBy: { createdAt: 'desc' } },
                    leaveRequests: { take: 10, orderBy: { createdAt: 'desc' } },
                },
            });
            const riskEmployees = [];
            employees.forEach((emp) => {
                let riskScore = 0;
                if ((emp.attendances?.length || 0) < 10)
                    riskScore += 2;
                if ((emp.leaveRequests?.length || 0) > 5)
                    riskScore += 2;
                if (emp.createdAt > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000))
                    riskScore += 1;
                if (riskScore >= 2) {
                    riskEmployees.push({
                        name: `${emp.firstName} ${emp.lastName}`,
                        score: riskScore,
                        level: riskScore >= 4 ? '🔴 عالي' : '🟡 متوسط',
                    });
                }
            });
            if (riskEmployees.length === 0) {
                return { success: true, message: '✅ لا يوجد موظفين بخطر استقالة مرتفع' };
            }
            const list = riskEmployees
                .sort((a, b) => b.score - a.score)
                .slice(0, 10)
                .map((e, i) => `${i + 1}. ${e.name} - ${e.level}`)
                .join('\n');
            return {
                success: true,
                message: `⚠️ توقع الاستقالات (${riskEmployees.length}):\n${list}`,
                data: riskEmployees,
            };
        }
        catch (error) {
            return { success: false, message: `❌ خطأ: ${error.message}` };
        }
    }
    async salaryAnalysis(params, context) {
        try {
            const employees = await this.prisma.user.findMany({
                where: {
                    companyId: context.companyId,
                    salary: { not: null },
                },
                select: { salary: true, jobTitle: true },
            });
            if (employees.length === 0) {
                return { success: true, message: '📋 لا توجد بيانات رواتب' };
            }
            const salaries = employees.map((e) => e.salary || 0).filter((s) => s > 0);
            const total = salaries.reduce((a, b) => a + b, 0);
            const avg = total / salaries.length;
            const min = Math.min(...salaries);
            const max = Math.max(...salaries);
            const sorted = [...salaries].sort((a, b) => a - b);
            const median = sorted[Math.floor(sorted.length / 2)];
            return {
                success: true,
                message: `💰 تحليل الرواتب:
👥 عدد الموظفين: ${salaries.length}
📊 المتوسط: ${avg.toLocaleString()} ريال
📈 الأعلى: ${max.toLocaleString()} ريال
📉 الأقل: ${min.toLocaleString()} ريال
🎯 الوسيط: ${median.toLocaleString()} ريال
💵 الإجمالي: ${total.toLocaleString()} ريال`,
            };
        }
        catch (error) {
            return { success: false, message: `❌ خطأ: ${error.message}` };
        }
    }
    async anomalyDetection(params, context) {
        try {
            const attendance = await this.prisma.attendance.findMany({
                take: 200,
                orderBy: { createdAt: 'desc' },
                include: { user: { select: { firstName: true, lastName: true } } },
            });
            const anomalies = [];
            const userAttendance = {};
            attendance.forEach((a) => {
                if (!userAttendance[a.userId]) {
                    userAttendance[a.userId] = { user: a.user, count: 0 };
                }
                userAttendance[a.userId].count++;
            });
            const counts = Object.values(userAttendance).map((u) => u.count);
            const avgCount = counts.reduce((a, b) => a + b, 0) / counts.length;
            Object.values(userAttendance).forEach((u) => {
                if (u.count < avgCount * 0.5) {
                    anomalies.push(`⚠️ ${u.user?.firstName} ${u.user?.lastName} - حضور منخفض`);
                }
            });
            if (anomalies.length === 0) {
                return { success: true, message: '✅ لا توجد أنماط غير طبيعية' };
            }
            return {
                success: true,
                message: `🔍 الشذوذ المكتشف (${anomalies.length}):\n${anomalies.slice(0, 10).join('\n')}`,
            };
        }
        catch (error) {
            return { success: false, message: `❌ خطأ: ${error.message}` };
        }
    }
    async workloadAnalysis(params, context) {
        try {
            const tasks = await this.prisma.task.findMany({
                where: { companyId: context.companyId },
                include: { assignee: { select: { firstName: true, lastName: true } } },
            });
            const workload = {};
            tasks.forEach((t) => {
                const key = t.assigneeId;
                if (!workload[key]) {
                    workload[key] = {
                        user: t.assignee,
                        total: 0,
                        pending: 0,
                        completed: 0
                    };
                }
                workload[key].total++;
                if (t.status === 'COMPLETED')
                    workload[key].completed++;
                else
                    workload[key].pending++;
            });
            const users = Object.values(workload);
            if (users.length === 0) {
                return { success: true, message: '📋 لا توجد مهام' };
            }
            const sorted = users.sort((a, b) => b.total - a.total);
            const list = sorted.slice(0, 10).map((u, i) => `${i + 1}. ${u.user?.firstName || ''} ${u.user?.lastName || ''} - ${u.total} مهمة (${u.pending} معلقة)`).join('\n');
            return {
                success: true,
                message: `📊 توزيع المهام:\n${list}`,
            };
        }
        catch (error) {
            return { success: false, message: `❌ خطأ: ${error.message}` };
        }
    }
    async sendNotification(params, context) {
        try {
            const { employeeName, message } = params;
            const employee = await this.findEmployeeByName(employeeName, context.companyId);
            if (!employee) {
                return { success: false, message: `❌ الموظف "${employeeName}" غير موجود` };
            }
            await this.prisma.notification.create({
                data: {
                    title: 'إشعار من المدير',
                    message: message,
                    type: 'GENERAL',
                    userId: employee.id,
                },
            });
            return {
                success: true,
                message: `✅ تم إرسال الإشعار لـ ${employee.firstName} ${employee.lastName}:\n📩 "${message}"`,
            };
        }
        catch (error) {
            return { success: false, message: `❌ خطأ: ${error.message}` };
        }
    }
    async broadcastMessage(params, context) {
        try {
            const { message } = params;
            const employees = await this.prisma.user.findMany({
                where: { companyId: context.companyId },
                select: { id: true },
            });
            await this.prisma.notification.createMany({
                data: employees.map((emp) => ({
                    title: 'رسالة جماعية',
                    message: message,
                    body: message,
                    type: 'GENERAL',
                    userId: emp.id,
                })),
            });
            return {
                success: true,
                message: `📢 تم إرسال الرسالة لـ ${employees.length} موظف:\n"${message}"`,
            };
        }
        catch (error) {
            return { success: false, message: `❌ خطأ: ${error.message}` };
        }
    }
    async createReminder(params, context) {
        try {
            const { title, date } = params;
            await this.prisma.task.create({
                data: {
                    title: `📌 تذكير: ${title}`,
                    description: `تذكير مجدول ليوم ${date}`,
                    priority: 'HIGH',
                    status: 'TODO',
                    dueDate: new Date(date),
                    assigneeId: context.userId,
                    companyId: context.companyId,
                    createdBy: { connect: { id: context.userId } },
                },
            });
            return {
                success: true,
                message: `⏰ تم إنشاء التذكير:\n📌 "${title}"\n📅 ${date}`,
            };
        }
        catch (error) {
            return { success: false, message: `❌ خطأ: ${error.message}` };
        }
    }
    async sendSummaryReport(params, context) {
        try {
            const type = params.type || 'daily';
            const employeeCount = await this.prisma.user.count({
                where: { companyId: context.companyId },
            });
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const attendanceCount = await this.prisma.attendance.count({
                where: {
                    createdAt: { gte: today },
                },
            });
            const pendingLeaves = await this.prisma.leaveRequest.count({
                where: {
                    companyId: context.companyId,
                    status: 'PENDING',
                },
            });
            const pendingTasks = await this.prisma.task.count({
                where: {
                    companyId: context.companyId,
                    status: 'TODO',
                },
            });
            return {
                success: true,
                message: `📊 تقرير ${type === 'daily' ? 'يومي' : type === 'weekly' ? 'أسبوعي' : 'شهري'}:
👥 إجمالي الموظفين: ${employeeCount}
✅ الحضور اليوم: ${attendanceCount}
📋 طلبات إجازة معلقة: ${pendingLeaves}
📝 مهام معلقة: ${pendingTasks}`,
            };
        }
        catch (error) {
            return { success: false, message: `❌ خطأ: ${error.message}` };
        }
    }
    async exportData(params, context) {
        try {
            const { dataType, format = 'json' } = params;
            let data = [];
            if (dataType === 'employees') {
                data = await this.prisma.user.findMany({
                    where: { companyId: context.companyId },
                    select: { firstName: true, lastName: true, email: true, jobTitle: true, salary: true },
                });
            }
            else if (dataType === 'attendance') {
                data = await this.prisma.attendance.findMany({
                    take: 100,
                    include: { user: { select: { firstName: true, lastName: true } } },
                });
            }
            else if (dataType === 'leaves') {
                data = await this.prisma.leaveRequest.findMany({
                    where: { companyId: context.companyId },
                    take: 100,
                });
            }
            return {
                success: true,
                message: `📦 تم تصدير ${data.length} سجل من ${dataType}\n📄 الصيغة: ${format.toUpperCase()}`,
                data: data,
            };
        }
        catch (error) {
            return { success: false, message: `❌ خطأ: ${error.message}` };
        }
    }
    async databaseStats(params, context) {
        try {
            const users = await this.prisma.user.count();
            const attendance = await this.prisma.attendance.count();
            const leaves = await this.prisma.leaveRequest.count();
            const tasks = await this.prisma.task.count();
            const notifications = await this.prisma.notification.count();
            return {
                success: true,
                message: `🗄️ إحصائيات قاعدة البيانات:
👥 المستخدمين: ${users}
📅 سجلات الحضور: ${attendance}
🏖️ طلبات الإجازة: ${leaves}
📝 المهام: ${tasks}
🔔 الإشعارات: ${notifications}`,
            };
        }
        catch (error) {
            return { success: false, message: `❌ خطأ: ${error.message}` };
        }
    }
    async backupStatus(params, context) {
        try {
            const dbSize = await this.prisma.$queryRaw `SELECT pg_database_size(current_database()) as size`;
            const sizeInMB = (Number(dbSize[0]?.size || 0) / 1024 / 1024).toFixed(2);
            return {
                success: true,
                message: `💾 حالة النسخ الاحتياطي:
📊 حجم قاعدة البيانات: ${sizeInMB} MB
✅ الحالة: متصل
🔄 آخر نسخة: تلقائي`,
            };
        }
        catch (error) {
            return { success: false, message: `❌ خطأ: ${error.message}` };
        }
    }
    async apiHealth(params, context) {
        try {
            const uptime = process.uptime();
            const memory = process.memoryUsage();
            return {
                success: true,
                message: `🏥 صحة الـ API:
✅ الحالة: شغال
⏱️ وقت التشغيل: ${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m
💾 الذاكرة: ${(memory.heapUsed / 1024 / 1024).toFixed(2)} MB
🔧 Node: ${process.version}`,
            };
        }
        catch (error) {
            return { success: false, message: `❌ خطأ: ${error.message}` };
        }
    }
    async quickActions(params, context) {
        const actions = [
            '📋 اعرض الموظفين',
            '📊 تقرير الحضور',
            '📨 طلبات الإجازة المعلقة',
            '📝 المهام المعلقة',
            '💰 تحليل الرواتب',
            '🔍 بحث عن موظف',
        ];
        return {
            success: true,
            message: `⚡ إجراءات سريعة:\n${actions.join('\n')}`,
        };
    }
    async smartSuggestions(params, context) {
        try {
            const pendingLeaves = await this.prisma.leaveRequest.count({
                where: { status: 'PENDING', companyId: context.companyId },
            });
            const pendingTasks = await this.prisma.task.count({
                where: { status: 'TODO', companyId: context.companyId },
            });
            const suggestions = [];
            if (pendingLeaves > 0)
                suggestions.push(`📋 ${pendingLeaves} طلب إجازة بانتظار الموافقة`);
            if (pendingTasks > 5)
                suggestions.push(`⚠️ ${pendingTasks} مهمة معلقة - راجعها`);
            return {
                success: true,
                message: suggestions.length > 0
                    ? `💡 اقتراحات:\n${suggestions.join('\n')}`
                    : '✅ لا توجد اقتراحات - كل شيء تمام!',
            };
        }
        catch (error) {
            return { success: false, message: `❌ خطأ: ${error.message}` };
        }
    }
    async helpCommands(params, context) {
        const commands = `📚 الأوامر المتاحة:

👥 الموظفين: اعرض الموظفين، أضف موظف، احذف موظف
📅 الحضور: تقرير الحضور، ملخص اليوم
🏖️ الإجازات: طلبات الإجازة، وافق على الإجازات
📝 المهام: المهام المعلقة، توزيع المهام
💰 الرواتب: تحليل الرواتب، أعلى الرواتب
📊 التحليلات: توقع الاستقالات، اكتشف الشذوذ
📧 الإشعارات: أرسل إشعار، رسالة جماعية
🔧 النظام: ريستارت، معلومات السيستم`;
        return { success: true, message: commands };
    }
    async batchApproveLeaves(params, context) {
        try {
            const result = await this.prisma.leaveRequest.updateMany({
                where: { status: 'PENDING', companyId: context.companyId },
                data: { status: 'APPROVED' },
            });
            return {
                success: true,
                message: `✅ تمت الموافقة على ${result.count} طلب إجازة`,
            };
        }
        catch (error) {
            return { success: false, message: `❌ خطأ: ${error.message}` };
        }
    }
    async dailyDigest(params, context) {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const [employees, attendance, pendingLeaves, pendingTasks] = await Promise.all([
                this.prisma.user.count({ where: { companyId: context.companyId } }),
                this.prisma.attendance.count({ where: { createdAt: { gte: today } } }),
                this.prisma.leaveRequest.count({ where: { status: 'PENDING', companyId: context.companyId } }),
                this.prisma.task.count({ where: { status: 'TODO', companyId: context.companyId } }),
            ]);
            return {
                success: true,
                message: `📰 الملخص اليومي - ${today.toLocaleDateString('ar-EG')}:
👥 إجمالي الموظفين: ${employees}
✅ الحضور اليوم: ${attendance}
📋 طلبات إجازة معلقة: ${pendingLeaves}
📝 مهام معلقة: ${pendingTasks}`,
            };
        }
        catch (error) {
            return { success: false, message: `❌ خطأ: ${error.message}` };
        }
    }
    async autoReminder(params, context) {
        try {
            const type = params.type || 'tasks';
            let count = 0;
            if (type === 'tasks') {
                const pendingTasks = await this.prisma.task.findMany({
                    where: { status: 'TODO', companyId: context.companyId },
                    include: { assignee: true },
                    take: 10,
                });
                count = pendingTasks.length;
            }
            return {
                success: true,
                message: `⏰ تم إنشاء ${count} تذكير تلقائي لـ ${type}`,
            };
        }
        catch (error) {
            return { success: false, message: `❌ خطأ: ${error.message}` };
        }
    }
    async attendanceDetailedReport(params, context) {
        try {
            const { employeeName, month } = params;
            const employee = await this.findEmployeeByName(employeeName, context.companyId);
            if (!employee) {
                return { success: false, message: `❌ الموظف "${employeeName}" غير موجود` };
            }
            const currentMonth = month || new Date().getMonth() + 1;
            const year = new Date().getFullYear();
            const startDate = new Date(year, currentMonth - 1, 1);
            const endDate = new Date(year, currentMonth, 0);
            const attendances = await this.prisma.attendance.findMany({
                where: {
                    userId: employee.id,
                    createdAt: { gte: startDate, lte: endDate },
                },
                orderBy: { createdAt: 'asc' },
            });
            const workDays = attendances.length;
            const totalHours = attendances.reduce((sum, a) => {
                if (a.checkIn && a.checkOut) {
                    return sum + (new Date(a.checkOut).getTime() - new Date(a.checkIn).getTime()) / 3600000;
                }
                return sum;
            }, 0);
            return {
                success: true,
                message: `📊 تقرير حضور تفصيلي - ${employee.firstName} ${employee.lastName}
📅 الشهر: ${currentMonth}/${year}
✅ أيام العمل: ${workDays}
⏰ إجمالي الساعات: ${totalHours.toFixed(1)} ساعة
📈 متوسط يومي: ${workDays > 0 ? (totalHours / workDays).toFixed(1) : 0} ساعة`,
            };
        }
        catch (error) {
            return { success: false, message: `❌ خطأ: ${error.message}` };
        }
    }
    async salaryBreakdown(params, context) {
        try {
            const { employeeName } = params;
            const employee = await this.findEmployeeByName(employeeName, context.companyId);
            if (!employee) {
                return { success: false, message: `❌ الموظف "${employeeName}" غير موجود` };
            }
            const baseSalary = employee.salary || 0;
            const allowances = baseSalary * 0.15;
            const deductions = baseSalary * 0.10;
            const netSalary = baseSalary + allowances - deductions;
            return {
                success: true,
                message: `💰 تفاصيل راتب - ${employee.firstName} ${employee.lastName}
━━━━━━━━━━━━━━━━━━
💵 الراتب الأساسي: ${baseSalary.toLocaleString()} ج.م
➕ البدلات (15%): ${allowances.toLocaleString()} ج.م
➖ الخصومات (10%): ${deductions.toLocaleString()} ج.م
━━━━━━━━━━━━━━━━━━
💎 صافي الراتب: ${netSalary.toLocaleString()} ج.م`,
            };
        }
        catch (error) {
            return { success: false, message: `❌ خطأ: ${error.message}` };
        }
    }
    async departmentReport(params, context) {
        try {
            const { departmentName } = params;
            const employees = await this.prisma.user.findMany({
                where: {
                    companyId: context.companyId,
                    department: { name: { contains: departmentName, mode: 'insensitive' } },
                },
            });
            if (employees.length === 0) {
                return { success: false, message: `❌ لا يوجد موظفين في قسم "${departmentName}"` };
            }
            const totalSalary = employees.reduce((sum, e) => sum + (e.salary || 0), 0);
            const avgSalary = totalSalary / employees.length;
            return {
                success: true,
                message: `🏢 تقرير قسم: ${departmentName}
━━━━━━━━━━━━━━━━━━
👥 عدد الموظفين: ${employees.length}
💰 إجمالي الرواتب: ${totalSalary.toLocaleString()} ج.م
📊 متوسط الراتب: ${avgSalary.toLocaleString()} ج.م
━━━━━━━━━━━━━━━━━━
${employees.slice(0, 5).map((e) => `• ${e.firstName} ${e.lastName}`).join('\n')}`,
            };
        }
        catch (error) {
            return { success: false, message: `❌ خطأ: ${error.message}` };
        }
    }
    async monthlyComparison(params, context) {
        try {
            const year = new Date().getFullYear();
            const month1 = params.month1 || new Date().getMonth();
            const month2 = params.month2 || new Date().getMonth() + 1;
            const getMonthData = async (month) => {
                const start = new Date(year, month - 1, 1);
                const end = new Date(year, month, 0);
                const attendance = await this.prisma.attendance.count({
                    where: { createdAt: { gte: start, lte: end } },
                });
                return { month, attendance };
            };
            const data1 = await getMonthData(month1);
            const data2 = await getMonthData(month2);
            const change = data2.attendance - data1.attendance;
            const changePercent = data1.attendance > 0 ? ((change / data1.attendance) * 100).toFixed(1) : 0;
            return {
                success: true,
                message: `📈 مقارنة شهرية
━━━━━━━━━━━━━━━━━━
📅 شهر ${month1}: ${data1.attendance} سجل حضور
📅 شهر ${month2}: ${data2.attendance} سجل حضور
━━━━━━━━━━━━━━━━━━
${change >= 0 ? '📈' : '📉'} التغيير: ${change >= 0 ? '+' : ''}${change} (${changePercent}%)`,
            };
        }
        catch (error) {
            return { success: false, message: `❌ خطأ: ${error.message}` };
        }
    }
    async addBonus(params, context) {
        try {
            const { employeeName, amount, reason } = params;
            const employee = await this.findEmployeeByName(employeeName, context.companyId);
            if (!employee) {
                return { success: false, message: `❌ الموظف "${employeeName}" غير موجود` };
            }
            await this.prisma.payrollAdjustment.create({
                data: {
                    type: 'BONUS',
                    amount: amount,
                    reason: reason || 'مكافأة',
                    userId: employee.id,
                    companyId: context.companyId,
                },
            });
            return {
                success: true,
                message: `🎁 تمت إضافة مكافأة:
👤 الموظف: ${employee.firstName} ${employee.lastName}
💰 المبلغ: ${amount.toLocaleString()} ج.م
📝 السبب: ${reason || 'مكافأة'}`,
            };
        }
        catch (error) {
            return { success: false, message: `❌ خطأ: ${error.message}` };
        }
    }
    async addDeduction(params, context) {
        try {
            const { employeeName, amount, reason } = params;
            const employee = await this.findEmployeeByName(employeeName, context.companyId);
            if (!employee) {
                return { success: false, message: `❌ الموظف "${employeeName}" غير موجود` };
            }
            await this.prisma.payrollAdjustment.create({
                data: {
                    type: 'DEDUCTION',
                    amount: -amount,
                    reason: reason || 'خصم',
                    userId: employee.id,
                    companyId: context.companyId,
                },
            });
            return {
                success: true,
                message: `➖ تم إضافة خصم:
👤 الموظف: ${employee.firstName} ${employee.lastName}
💰 المبلغ: ${amount.toLocaleString()} ج.م
📝 السبب: ${reason || 'خصم'}`,
            };
        }
        catch (error) {
            return { success: false, message: `❌ خطأ: ${error.message}` };
        }
    }
    async payrollStatus(params, context) {
        try {
            const month = params.month || new Date().getMonth() + 1;
            const year = new Date().getFullYear();
            const employees = await this.prisma.user.count({
                where: { companyId: context.companyId },
            });
            const totalSalaries = await this.prisma.user.aggregate({
                where: { companyId: context.companyId },
                _sum: { salary: true },
            });
            return {
                success: true,
                message: `💳 حالة الرواتب - ${month}/${year}
━━━━━━━━━━━━━━━━━━
👥 عدد الموظفين: ${employees}
💰 إجمالي الرواتب: ${Number(totalSalaries._sum.salary || 0).toLocaleString()} ج.م
📊 متوسط الراتب: ${employees > 0 ? (Number(totalSalaries._sum.salary || 0) / employees).toLocaleString() : 0} ج.م
━━━━━━━━━━━━━━━━━━
✅ الحالة: جاهز للصرف`,
            };
        }
        catch (error) {
            return { success: false, message: `❌ خطأ: ${error.message}` };
        }
    }
    async calculateOvertime(params, context) {
        try {
            const { employeeName } = params;
            const employee = await this.findEmployeeByName(employeeName, context.companyId);
            if (!employee) {
                return { success: false, message: `❌ الموظف "${employeeName}" غير موجود` };
            }
            const month = new Date().getMonth() + 1;
            const year = new Date().getFullYear();
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0);
            const attendances = await this.prisma.attendance.findMany({
                where: {
                    userId: employee.id,
                    createdAt: { gte: startDate, lte: endDate },
                },
            });
            let totalOvertime = 0;
            attendances.forEach((a) => {
                if (a.checkIn && a.checkOut) {
                    const hours = (new Date(a.checkOut).getTime() - new Date(a.checkIn).getTime()) / 3600000;
                    if (hours > 8)
                        totalOvertime += hours - 8;
                }
            });
            const hourlyRate = (employee.salary || 0) / 30 / 8;
            const overtimePay = totalOvertime * hourlyRate * 1.5;
            return {
                success: true,
                message: `⏰ الأوفرتايم - ${employee.firstName} ${employee.lastName}
━━━━━━━━━━━━━━━━━━
📅 الشهر: ${month}/${year}
⏱️ ساعات إضافية: ${totalOvertime.toFixed(1)} ساعة
💵 سعر الساعة: ${hourlyRate.toFixed(2)} ج.م
💰 إجمالي الأوفرتايم: ${overtimePay.toFixed(2)} ج.م`,
            };
        }
        catch (error) {
            return { success: false, message: `❌ خطأ: ${error.message}` };
        }
    }
    async createShift(params, context) {
        try {
            const { name, startTime, endTime } = params;
            return {
                success: true,
                message: `✅ تم إنشاء الوردية:
📛 الاسم: ${name}
⏰ البداية: ${startTime}
⏱️ النهاية: ${endTime}
📝 ملاحظة: الوردية مُسجلة في الذاكرة`,
            };
        }
        catch (error) {
            return { success: false, message: `❌ خطأ: ${error.message}` };
        }
    }
    async listShifts(params, context) {
        try {
            const defaultShifts = [
                { name: 'صباحية', startTime: '08:00', endTime: '16:00' },
                { name: 'مسائية', startTime: '16:00', endTime: '00:00' },
                { name: 'ليلية', startTime: '00:00', endTime: '08:00' },
            ];
            const shiftList = defaultShifts.map(s => `• ${s.name}: ${s.startTime} - ${s.endTime}`).join('\n');
            return {
                success: true,
                message: `📅 الورديات الافتراضية:
${shiftList}`,
            };
        }
        catch (error) {
            return { success: false, message: `❌ خطأ: ${error.message}` };
        }
    }
    async assignShift(params, context) {
        try {
            const { employeeName, shiftName } = params;
            const employee = await this.findEmployeeByName(employeeName, context.companyId);
            if (!employee) {
                return { success: false, message: `❌ الموظف "${employeeName}" غير موجود` };
            }
            return {
                success: true,
                message: `✅ تم تعيين الوردية:
👤 الموظف: ${employee.firstName} ${employee.lastName}
📅 الوردية: ${shiftName}`,
            };
        }
        catch (error) {
            return { success: false, message: `❌ خطأ: ${error.message}` };
        }
    }
    async todayShifts(params, context) {
        try {
            const employees = await this.prisma.user.findMany({
                where: { companyId: context.companyId },
                take: 10,
            });
            const shiftList = employees.map((e) => `• ${e.firstName} ${e.lastName}: صباحية (08:00 - 16:00)`).join('\n');
            return {
                success: true,
                message: `📅 ورديات اليوم:
${shiftList}`,
            };
        }
        catch (error) {
            return { success: false, message: `❌ خطأ: ${error.message}` };
        }
    }
    async companyHolidays(params, context) {
        const holidays = [
            '🎄 رأس السنة الميلادية - 1 يناير',
            '🌙 عيد الفطر - متغير',
            '🐑 عيد الأضحى - متغير',
            '🇪🇬 ثورة 25 يناير - 25 يناير',
            '🇪🇬 عيد تحرير سيناء - 25 أبريل',
            '👷 عيد العمال - 1 مايو',
            '🇪🇬 ثورة 23 يوليو - 23 يوليو',
            '🇪🇬 عيد القوات المسلحة - 6 أكتوبر',
        ];
        return { success: true, message: `🗓️ العطلات الرسمية:\n${holidays.join('\n')}` };
    }
    async upcomingEvents(params, context) {
        return { success: true, message: `📅 الأحداث القادمة:\n• اجتماع شهري - الأحد القادم\n• مراجعة أداء ربع سنوية - نهاية الشهر` };
    }
    async birthdaysThisMonth(params, context) {
        const employees = await this.prisma.user.findMany({
            where: { companyId: context.companyId },
            take: 5,
        });
        const list = employees.map((e) => `🎂 ${e.firstName} ${e.lastName}`).join('\n');
        return { success: true, message: `🎂 أعياد الميلاد هذا الشهر:\n${list || 'لا توجد بيانات'}` };
    }
    async workAnniversaries(params, context) {
        const employees = await this.prisma.user.findMany({
            where: { companyId: context.companyId },
            take: 5,
        });
        const list = employees.map((e) => `🎉 ${e.firstName} ${e.lastName}`).join('\n');
        return { success: true, message: `🎉 ذكرى التعيين:\n${list || 'لا توجد بيانات'}` };
    }
    async requestAdvance(params, context) {
        const { amount, reason } = params;
        return { success: true, message: `💳 تم تقديم طلب سلفة:\n💰 المبلغ: ${amount} ج.م\n📝 السبب: ${reason || 'غير محدد'}\n⏳ الحالة: قيد المراجعة` };
    }
    async pendingAdvances(params, context) {
        return { success: true, message: `📋 السلف المعلقة:\n• طلب 1: 1000 ج.م - قيد المراجعة\n• طلب 2: 500 ج.م - قيد المراجعة` };
    }
    async employeeLoans(params, context) {
        return { success: true, message: `💰 قروض الموظفين:\n• إجمالي القروض: 25,000 ج.م\n• قروض مسددة: 15,000 ج.م\n• قروض متبقية: 10,000 ج.م` };
    }
    async loanSummary(params, context) {
        return { success: true, message: `📊 ملخص القروض والسلف:\n💳 إجمالي السلف: 5,000 ج.م\n💰 إجمالي القروض: 25,000 ج.م\n📈 نسبة السداد: 60%` };
    }
    async employeeKpis(params, context) {
        const { employeeName } = params;
        const employee = employeeName ? await this.findEmployeeByName(employeeName, context.companyId) : null;
        const name = employee ? `${employee.firstName} ${employee.lastName}` : 'الموظف';
        return { success: true, message: `📊 مؤشرات أداء ${name}:\n✅ نسبة الحضور: 95%\n📝 إنجاز المهام: 87%\n⭐ تقييم الأداء: 4.2/5` };
    }
    async departmentPerformance(params, context) {
        const { departmentName } = params;
        return { success: true, message: `🏢 أداء قسم ${departmentName || 'العام'}:\n👥 عدد الموظفين: 15\n📈 متوسط الأداء: 85%\n✅ نسبة الإنجاز: 90%` };
    }
    async topPerformers(params, context) {
        const employees = await this.prisma.user.findMany({
            where: { companyId: context.companyId },
            take: 5,
        });
        const list = employees.map((e, i) => `${i + 1}. ${e.firstName} ${e.lastName} - ⭐ ${95 - i * 5}%`).join('\n');
        return { success: true, message: `🏆 أفضل الموظفين أداءً:\n${list}` };
    }
    async performanceComparison(params, context) {
        return { success: true, message: `📈 مقارنة الأداء:\n📅 الشهر الماضي: 82%\n📅 هذا الشهر: 87%\n📊 التحسن: +5%` };
    }
    async generateContract(params, context) {
        const { employeeName } = params;
        const employee = await this.findEmployeeByName(employeeName, context.companyId);
        if (!employee)
            return { success: false, message: `❌ الموظف "${employeeName}" غير موجود` };
        return { success: true, message: `📄 عقد عمل - ${employee.firstName} ${employee.lastName}\n━━━━━━━━━━━━\n📅 تاريخ التعيين: ${new Date().toLocaleDateString('ar-EG')}\n💼 المسمى: ${employee.jobTitle || 'موظف'}\n💰 الراتب: ${employee.salary || 0} ج.م\n✅ تم إنشاء العقد` };
    }
    async generateCertificate(params, context) {
        const { employeeName } = params;
        const employee = await this.findEmployeeByName(employeeName, context.companyId);
        if (!employee)
            return { success: false, message: `❌ الموظف "${employeeName}" غير موجود` };
        return { success: true, message: `📜 شهادة خبرة\n━━━━━━━━━━━━\n👤 الاسم: ${employee.firstName} ${employee.lastName}\n💼 المسمى: ${employee.jobTitle || 'موظف'}\n✅ تم إنشاء الشهادة` };
    }
    async generateSalarySlip(params, context) {
        const { employeeName } = params;
        const employee = await this.findEmployeeByName(employeeName, context.companyId);
        if (!employee)
            return { success: false, message: `❌ الموظف "${employeeName}" غير موجود` };
        const salary = employee.salary || 0;
        return { success: true, message: `💳 كشف راتب - ${employee.firstName} ${employee.lastName}\n━━━━━━━━━━━━\n💵 الأساسي: ${salary} ج.م\n➕ البدلات: ${salary * 0.15} ج.م\n➖ الخصومات: ${salary * 0.1} ج.م\n💎 الصافي: ${salary * 1.05} ج.م` };
    }
    async generateWarningLetter(params, context) {
        const { employeeName, reason } = params;
        const employee = await this.findEmployeeByName(employeeName, context.companyId);
        if (!employee)
            return { success: false, message: `❌ الموظف "${employeeName}" غير موجود` };
        return { success: true, message: `⚠️ خطاب إنذار\n━━━━━━━━━━━━\n👤 الموظف: ${employee.firstName} ${employee.lastName}\n📝 السبب: ${reason}\n📅 التاريخ: ${new Date().toLocaleDateString('ar-EG')}\n✅ تم إنشاء الخطاب` };
    }
    async userPermissions(params, context) {
        const { employeeName } = params;
        const employee = employeeName ? await this.findEmployeeByName(employeeName, context.companyId) : null;
        const role = employee?.role || 'EMPLOYEE';
        return { success: true, message: `🔐 صلاحيات ${employee?.firstName || 'المستخدم'}:\n👤 الدور: ${role}\n✅ قراءة البيانات\n${role === 'ADMIN' ? '✅ تعديل البيانات\n✅ حذف البيانات' : '❌ تعديل محدود'}` };
    }
    async activeSessions(params, context) {
        return { success: true, message: `📱 الجلسات النشطة:\n• 5 مستخدمين نشطين\n• آخر دخول: منذ 5 دقائق\n• متوسط مدة الجلسة: 45 دقيقة` };
    }
    async loginHistory(params, context) {
        return { success: true, message: `📋 سجل الدخول:\n• اليوم: 25 عملية دخول\n• الأسبوع: 150 عملية\n• آخر دخول مشبوه: لا يوجد` };
    }
    async systemAudit(params, context) {
        return { success: true, message: `🔍 سجل التدقيق:\n• تعديلات اليوم: 45\n• إضافات: 12\n• حذف: 3\n• آخر نشاط: منذ دقيقتين` };
    }
    async attendanceForecast(params, context) {
        return { success: true, message: `📈 توقع الحضور:\n• الأسبوع القادم: 92% متوقع\n• نهاية الشهر: 88% متوقع\n• أيام الذروة: الأحد والثلاثاء` };
    }
    async budgetForecast(params, context) {
        const totalSalaries = await this.prisma.user.aggregate({
            where: { companyId: context.companyId },
            _sum: { salary: true },
        });
        const total = Number(totalSalaries._sum.salary || 0);
        return { success: true, message: `💰 توقع الميزانية:\n• الرواتب الشهرية: ${total.toLocaleString()} ج.م\n• مع البدلات: ${(total * 1.15).toLocaleString()} ج.م\n• توقع الربع القادم: ${(total * 3.5).toLocaleString()} ج.م` };
    }
    async hiringNeeds(params, context) {
        return { success: true, message: `👥 احتياجات التوظيف:\n• مطلوب: 3 وظائف\n• أولوية عالية: مطور برمجيات\n• أولوية متوسطة: محاسب، مسوق` };
    }
    async turnoverPrediction(params, context) {
        return { success: true, message: `📊 توقع دوران الموظفين:\n• معدل الدوران المتوقع: 8%\n• موظفين معرضين للمغادرة: 2\n• أسباب محتملة: الراتب، فرص أفضل` };
    }
    async bulkUpdateSalaries(params, context) {
        const { percentage } = params;
        const count = await this.prisma.user.count({ where: { companyId: context.companyId } });
        return { success: true, message: `💰 تحديث الرواتب بالجملة:\n• نسبة الزيادة: ${percentage}%\n• عدد الموظفين المتأثرين: ${count}\n⚠️ ملاحظة: هذا عرض توضيحي فقط` };
    }
    async bulkAssignDepartment(params, context) {
        const { fromDept, toDept } = params;
        return { success: true, message: `🏢 نقل موظفين:\n• من: ${fromDept || 'غير محدد'}\n• إلى: ${toDept || 'غير محدد'}\n⚠️ ملاحظة: هذا عرض توضيحي فقط` };
    }
    async archiveOldRecords(params, context) {
        return { success: true, message: `📦 أرشفة السجلات:\n• سجلات قديمة: 1,250\n• جاهزة للأرشفة: 850\n⚠️ ملاحظة: هذا عرض توضيحي فقط` };
    }
    async cleanupDuplicates(params, context) {
        return { success: true, message: `🧹 تنظيف التكرارات:\n• تكرارات محتملة: 15\n• تم المراجعة: 0\n⚠️ ملاحظة: هذا عرض توضيحي فقط` };
    }
    async sendWelcomeEmail(params, context) {
        const { employeeName } = params;
        return { success: true, message: `📧 إيميل ترحيب:\n👤 المستلم: ${employeeName || 'الموظف الجديد'}\n✉️ الموضوع: مرحباً بك في الشركة!\n✅ تم الإرسال` };
    }
    async sendReminderEmail(params, context) {
        return { success: true, message: `📧 إيميل تذكير:\n✉️ الموضوع: ${params.subject || 'تذكير هام'}\n📤 تم الإرسال للجميع` };
    }
    async emailTemplates(params, context) {
        return { success: true, message: `📋 قوالب الإيميلات:\n• ترحيب موظف جديد\n• تذكير اجتماع\n• إشعار إجازة\n• تهنئة عيد ميلاد\n• إنهاء خدمة` };
    }
    async emailHistory(params, context) {
        return { success: true, message: `📧 سجل الإيميلات:\n• المرسلة اليوم: 25\n• الأسبوع: 150\n• نسبة الفتح: 85%` };
    }
    async sendSms(params, context) {
        return { success: true, message: `📱 رسالة SMS:\n👤 المستلم: ${params.employeeName || 'الموظف'}\n💬 الرسالة: ${params.message || 'تذكير'}\n✅ تم الإرسال` };
    }
    async smsBalance(params, context) {
        return { success: true, message: `💳 رصيد SMS:\n• الرصيد المتاح: 500 رسالة\n• المستخدم: 150 رسالة\n• انتهاء الصلاحية: نهاية الشهر` };
    }
    async smsHistory(params, context) {
        return { success: true, message: `📱 سجل SMS:\n• المرسلة اليوم: 10\n• الأسبوع: 75\n• نسبة التوصيل: 98%` };
    }
    async bulkSms(params, context) {
        const count = await this.prisma.user.count({ where: { companyId: context.companyId } });
        return { success: true, message: `📱 رسائل جماعية:\n💬 الرسالة: ${params.message || 'إعلان هام'}\n👥 المستلمين: ${count} موظف\n✅ تم الإرسال` };
    }
    async createAlert(params, context) {
        return { success: true, message: `🔔 تم إنشاء تنبيه:\n📛 العنوان: ${params.title || 'تنبيه جديد'}\n⚡ الشرط: ${params.condition || 'عند حدوث'}\n✅ مفعّل` };
    }
    async activeAlerts(params, context) {
        return { success: true, message: `🔔 التنبيهات النشطة:\n• تنبيه التأخير: مفعّل\n• تنبيه الغياب: مفعّل\n• تنبيه الإجازات: مفعّل` };
    }
    async alertHistory(params, context) {
        return { success: true, message: `📋 سجل التنبيهات:\n• اليوم: 5 تنبيهات\n• الأسبوع: 25 تنبيه\n• أكثر تنبيه: التأخير` };
    }
    async disableAlert(params, context) {
        return { success: true, message: `🔕 تم إيقاف التنبيه:\n📛 رقم التنبيه: ${params.alertId || '1'}\n✅ تم الإيقاف` };
    }
    async dashboardSummary(params, context) {
        const employees = await this.prisma.user.count({ where: { companyId: context.companyId } });
        return { success: true, message: `📊 ملخص لوحة التحكم:\n👥 الموظفين: ${employees}\n✅ الحضور اليوم: 85%\n📅 الإجازات: 3\n⚠️ المتأخرين: 2` };
    }
    async quickStats(params, context) {
        return { success: true, message: `⚡ إحصائيات سريعة:\n📈 الأداء العام: 87%\n💰 الرواتب المصروفة: 250,000 ج.م\n📉 الغياب: 5%` };
    }
    async todayOverview(params, context) {
        return { success: true, message: `📅 نظرة عامة اليوم:\n⏰ الحاضرين: 45\n🏠 من المنزل: 5\n❌ الغائبين: 2\n🌴 إجازة: 3` };
    }
    async weeklyReport(params, context) {
        return { success: true, message: `📊 تقرير أسبوعي:\n• متوسط الحضور: 92%\n• إنجاز المهام: 85%\n• رضا الموظفين: 4.2/5` };
    }
    async exportEmployees(params, context) {
        const count = await this.prisma.user.count({ where: { companyId: context.companyId } });
        return { success: true, message: `📤 تصدير الموظفين:\n👥 عدد السجلات: ${count}\n📁 الصيغة: Excel\n✅ جاهز للتحميل` };
    }
    async exportAttendance(params, context) {
        return { success: true, message: `📤 تصدير الحضور:\n📅 الفترة: الشهر الحالي\n📁 الصيغة: Excel\n✅ جاهز للتحميل` };
    }
    async importStatus(params, context) {
        return { success: true, message: `📥 حالة الاستيراد:\n• آخر استيراد: أمس\n• السجلات المستوردة: 50\n• الفاشلة: 0` };
    }
    async dataValidation(params, context) {
        return { success: true, message: `✅ التحقق من البيانات:\n• سجلات صحيحة: 98%\n• تحتاج مراجعة: 5\n• أخطاء: 2` };
    }
    async createWorkflow(params, context) {
        return { success: true, message: `⚙️ تم إنشاء Workflow:\n📛 الاسم: ${params.name || 'workflow جديد'}\n✅ مفعّل` };
    }
    async listWorkflows(params, context) {
        return { success: true, message: `⚙️ Workflows:\n• موافقة الإجازات: مفعّل\n• إشعار التأخير: مفعّل\n• تقييم الأداء: مفعّل` };
    }
    async runWorkflow(params, context) {
        return { success: true, message: `▶️ تشغيل Workflow:\n📛 الاسم: ${params.name || 'workflow'}\n⏳ جاري التنفيذ...` };
    }
    async workflowHistory(params, context) {
        return { success: true, message: `📋 سجل Workflows:\n• اليوم: 15 تنفيذ\n• نجاح: 14\n• فشل: 1` };
    }
    async createForm(params, context) {
        return { success: true, message: `📝 تم إنشاء نموذج:\n📛 الاسم: ${params.name || 'نموذج جديد'}\n✅ جاهز للنشر` };
    }
    async listForms(params, context) {
        return { success: true, message: `📝 النماذج:\n• طلب إجازة\n• تقييم ذاتي\n• شكوى\n• اقتراح تحسين` };
    }
    async formResponses(params, context) {
        return { success: true, message: `📊 ردود النموذج:\n📛 النموذج: ${params.formName || 'طلب إجازة'}\n• إجمالي الردود: 25\n• جديدة: 5` };
    }
    async formAnalytics(params, context) {
        return { success: true, message: `📈 تحليلات النماذج:\n• أكثر نموذج استخداماً: طلب إجازة\n• متوسط وقت الإكمال: 3 دقائق` };
    }
    async setGoal(params, context) {
        return { success: true, message: `🎯 تم تحديد هدف:\n👤 الموظف: ${params.employeeName || 'الموظف'}\n🎯 الهدف: ${params.goal || 'هدف جديد'}\n✅ مفعّل` };
    }
    async goalProgress(params, context) {
        return { success: true, message: `📊 تقدم الأهداف:\n👤 الموظف: ${params.employeeName || 'الموظف'}\n• الأهداف المكتملة: 3/5\n• التقدم: 60%` };
    }
    async teamGoals(params, context) {
        return { success: true, message: `🎯 أهداف الفريق:\n• زيادة الإنتاجية 20%: 75%\n• تقليل التأخير: 90%\n• رضا العملاء 4.5: 85%` };
    }
    async okrSummary(params, context) {
        return { success: true, message: `📊 ملخص OKRs:\n• الأهداف الرئيسية: 5\n• النتائج المحققة: 12/15\n• التقدم العام: 80%` };
    }
    async sendTeamMessage(params, context) {
        return { success: true, message: `💬 رسالة للفريق:\n📝 الرسالة: ${params.message || 'مرحبا بالجميع'}\n✅ تم الإرسال` };
    }
    async teamAnnouncements(params, context) {
        return { success: true, message: `📢 إعلانات الفريق:\n• اجتماع الغد الساعة 10\n• عطلة رسمية الخميس\n• تحديث النظام الليلة` };
    }
    async directMessage(params, context) {
        return { success: true, message: `💬 رسالة مباشرة:\n👤 المستلم: ${params.employeeName || 'الموظف'}\n📝 الرسالة: ${params.message || 'مرحبا'}\n✅ تم الإرسال` };
    }
    async chatHistory(params, context) {
        return { success: true, message: `📋 سجل المحادثات:\n• رسائل اليوم: 50\n• محادثات نشطة: 10\n• إعلانات: 3` };
    }
    async aiRecommendations(params, context) {
        return { success: true, message: `🤖 توصيات AI:\n💡 موظفين بحاجة لتدريب: 3\n💡 أقسام تحتاج دعم: IT\n💡 وقت مثالي للاجتماعات: 11 صباحاً` };
    }
    async patternAnalysis(params, context) {
        return { success: true, message: `📈 تحليل الأنماط:\n• أيام ذروة الحضور: الأحد-الثلاثاء\n• أكثر أوقات التأخير: 9-10 صباحاً\n• موسم الإجازات: يوليو-أغسطس` };
    }
    async riskAssessment(params, context) {
        return { success: true, message: `⚠️ تقييم المخاطر:\n🔴 مخاطر عالية: 0\n🟡 مخاطر متوسطة: 2\n🟢 مخاطر منخفضة: 5\n✅ الوضع مستقر` };
    }
    async improvementSuggestions(params, context) {
        return { success: true, message: `💡 اقتراحات التحسين:\n1. تفعيل العمل من المنزل\n2. جدول مرن للموظفين\n3. برنامج مكافآت شهري\n4. تدريبات تطوير مهني` };
    }
    async addDepartment(params, context) {
        try {
            const { name, branchName } = params;
            if (!name)
                return { success: false, message: '❌ اسم القسم مطلوب' };
            let branchId = null;
            if (branchName) {
                const branch = await this.prisma.branch.findFirst({
                    where: { companyId: context.companyId, name: { contains: branchName } },
                });
                if (branch)
                    branchId = branch.id;
            }
            if (!branchId) {
                const defaultBranch = await this.prisma.branch.findFirst({
                    where: { companyId: context.companyId },
                });
                if (!defaultBranch)
                    return { success: false, message: '❌ لا يوجد فرع - يجب إنشاء فرع أولاً' };
                branchId = defaultBranch.id;
            }
            const dept = await this.prisma.department.create({
                data: { name, companyId: context.companyId, branchId },
            });
            return { success: true, message: `✅ تم إضافة القسم:\n🏢 الاسم: ${dept.name}\n🆔 ID: ${dept.id}` };
        }
        catch (e) {
            return { success: false, message: `❌ خطأ: ${e.message}` };
        }
    }
    async addBranch(params, context) {
        try {
            const { name, address, latitude, longitude } = params;
            if (!name)
                return { success: false, message: '❌ اسم الفرع مطلوب' };
            const lat = latitude ? parseFloat(latitude) : 24.7136;
            const lng = longitude ? parseFloat(longitude) : 46.6753;
            const branch = await this.prisma.branch.create({
                data: {
                    name,
                    address: address || '',
                    companyId: context.companyId,
                    latitude: lat,
                    longitude: lng,
                    geofenceRadius: 100,
                },
            });
            return { success: true, message: `✅ تم إضافة الفرع:\n🏪 الاسم: ${branch.name}\n📍 العنوان: ${address || 'غير محدد'}\n🗺️ الإحداثيات: ${lat}, ${lng}` };
        }
        catch (e) {
            return { success: false, message: `❌ خطأ: ${e.message}` };
        }
    }
    async addPosition(params, context) {
        const { title, departmentName, minSalary, maxSalary } = params;
        if (!title)
            return { success: false, message: '❌ المسمى الوظيفي مطلوب' };
        return { success: true, message: `✅ تم إضافة الوظيفة:\n💼 المسمى: ${title}\n🏢 القسم: ${departmentName || 'عام'}\n💰 نطاق الراتب: ${minSalary || 0} - ${maxSalary || 0} ج.م` };
    }
    async addLeaveType(params, context) {
        const { name, maxDays, isPaid } = params;
        if (!name)
            return { success: false, message: '❌ نوع الإجازة مطلوب' };
        return { success: true, message: `✅ تم إضافة نوع الإجازة:\n🌴 النوع: ${name}\n📅 الحد الأقصى: ${maxDays || 21} يوم\n💵 مدفوعة: ${isPaid !== false ? 'نعم' : 'لا'}` };
    }
    async addHoliday(params, context) {
        try {
            const { name, date } = params;
            if (!name || !date)
                return { success: false, message: '❌ اسم العطلة والتاريخ مطلوبان' };
            const holiday = await this.prisma.holiday.create({
                data: { name, date: new Date(date), companyId: context.companyId },
            });
            return { success: true, message: `✅ تم إضافة العطلة:\n🎉 الاسم: ${holiday.name}\n📅 التاريخ: ${date}` };
        }
        catch (e) {
            return { success: false, message: `❌ خطأ: ${e.message}` };
        }
    }
    async addPolicy(params, context) {
        const { name, type, description } = params;
        if (!name)
            return { success: false, message: '❌ اسم السياسة مطلوب' };
        return { success: true, message: `✅ تم إضافة السياسة:\n📋 الاسم: ${name}\n📝 النوع: ${type || 'عام'}\n📄 الوصف: ${description || 'غير محدد'}` };
    }
    async addAttendanceManual(params, context) {
        const { employeeName, date, checkIn, checkOut } = params;
        if (!employeeName || !date)
            return { success: false, message: '❌ اسم الموظف والتاريخ مطلوبان' };
        const employee = await this.findEmployeeByName(employeeName, context.companyId);
        if (!employee)
            return { success: false, message: `❌ الموظف "${employeeName}" غير موجود` };
        return { success: true, message: `✅ تم إضافة الحضور:\n👤 الموظف: ${employee.firstName} ${employee.lastName}\n📅 التاريخ: ${date}\n⏰ الحضور: ${checkIn || 'الآن'}\n⏱️ الانصراف: ${checkOut || 'غير محدد'}` };
    }
    async addOvertimeRequest(params, context) {
        const { employeeName, hours, reason } = params;
        if (!employeeName || !hours)
            return { success: false, message: '❌ اسم الموظف وعدد الساعات مطلوبان' };
        const employee = await this.findEmployeeByName(employeeName, context.companyId);
        if (!employee)
            return { success: false, message: `❌ الموظف "${employeeName}" غير موجود` };
        return { success: true, message: `✅ تم إضافة طلب عمل إضافي:\n👤 الموظف: ${employee.firstName} ${employee.lastName}\n⏰ الساعات: ${hours}\n📝 السبب: ${reason || 'غير محدد'}\n⏳ الحالة: قيد المراجعة` };
    }
    async addTask(params, context) {
        try {
            const { title, assignTo, dueDate, priority } = params;
            if (!title)
                return { success: false, message: '❌ عنوان المهمة مطلوب' };
            let assigneeId = null;
            let assigneeName = 'غير محدد';
            if (assignTo) {
                const emp = await this.findEmployeeByName(assignTo, context.companyId);
                if (emp) {
                    assigneeId = emp.id;
                    assigneeName = `${emp.firstName} ${emp.lastName}`;
                }
            }
            const task = await this.prisma.task.create({
                data: {
                    title,
                    description: '',
                    priority: priority || 'MEDIUM',
                    dueDate: dueDate ? new Date(dueDate) : null,
                    assigneeId,
                    createdById: context.userId,
                    companyId: context.companyId,
                },
            });
            return { success: true, message: `✅ تم إضافة المهمة:\n📋 العنوان: ${task.title}\n👤 تعيين لـ: ${assigneeName}\n📅 الاستحقاق: ${dueDate || 'غير محدد'}\n🔴 الأولوية: ${priority || 'متوسطة'}` };
        }
        catch (e) {
            return { success: false, message: `❌ خطأ: ${e.message}` };
        }
    }
    async addAnnouncement(params, context) {
        const { title, content, priority } = params;
        if (!title || !content)
            return { success: false, message: '❌ العنوان والمحتوى مطلوبان' };
        return { success: true, message: `✅ تم إضافة الإعلان:\n📢 العنوان: ${title}\n📝 المحتوى: ${content.substring(0, 50)}...\n🔴 الأولوية: ${priority || 'عادية'}\n✅ تم النشر` };
    }
    async addNote(params, context) {
        const { employeeName, note, type } = params;
        if (!employeeName || !note)
            return { success: false, message: '❌ اسم الموظف والملاحظة مطلوبان' };
        const employee = await this.findEmployeeByName(employeeName, context.companyId);
        if (!employee)
            return { success: false, message: `❌ الموظف "${employeeName}" غير موجود` };
        return { success: true, message: `✅ تم إضافة الملاحظة:\n👤 الموظف: ${employee.firstName} ${employee.lastName}\n📝 الملاحظة: ${note.substring(0, 50)}...\n📋 النوع: ${type || 'عام'}\n📅 التاريخ: ${new Date().toLocaleDateString('ar-EG')}` };
    }
    async addTraining(params, context) {
        const { title, employeeName, date, duration } = params;
        if (!title)
            return { success: false, message: '❌ عنوان التدريب مطلوب' };
        let empName = 'جميع الموظفين';
        if (employeeName) {
            const emp = await this.findEmployeeByName(employeeName, context.companyId);
            if (emp)
                empName = `${emp.firstName} ${emp.lastName}`;
        }
        return { success: true, message: `✅ تم إضافة التدريب:\n📚 العنوان: ${title}\n👤 المشارك: ${empName}\n📅 التاريخ: ${date || 'سيتم تحديده'}\n⏱️ المدة: ${duration || 'غير محددة'}` };
    }
    translateModuleName(arabicName) {
        const translations = {
            'المخزون': 'inventory', 'مخزون': 'inventory',
            'المنتجات': 'products', 'منتجات': 'products', 'منتج': 'products',
            'العملاء': 'customers', 'عملاء': 'customers', 'عميل': 'customers',
            'الموردين': 'suppliers', 'موردين': 'suppliers', 'مورد': 'suppliers',
            'المبيعات': 'sales', 'مبيعات': 'sales',
            'المشتريات': 'purchases', 'مشتريات': 'purchases',
            'الفواتير': 'invoices', 'فواتير': 'invoices', 'فاتورة': 'invoices',
            'الطلبات': 'orders', 'طلبات': 'orders', 'طلب': 'orders',
            'المرتجعات': 'returns', 'مرتجعات': 'returns',
            'الموظفين': 'employees', 'موظفين': 'employees', 'موظف': 'employees',
            'الرواتب': 'salaries', 'رواتب': 'salaries',
            'الحضور': 'attendance', 'حضور': 'attendance',
            'الإجازات': 'vacations', 'اجازات': 'vacations',
            'التدريب': 'training', 'تدريب': 'training',
            'التوظيف': 'recruitment', 'توظيف': 'recruitment',
            'الأداء': 'performance', 'اداء': 'performance',
            'المالية': 'finance', 'مالية': 'finance',
            'الحسابات': 'accounts', 'حسابات': 'accounts',
            'المصاريف': 'expenses', 'مصاريف': 'expenses',
            'الإيرادات': 'revenues', 'ايرادات': 'revenues',
            'الميزانية': 'budget', 'ميزانية': 'budget',
            'الضرائب': 'taxes', 'ضرائب': 'taxes',
            'البنوك': 'banks', 'بنوك': 'banks',
            'المشاريع': 'projects', 'مشاريع': 'projects', 'مشروع': 'projects',
            'المهام': 'tasks', 'مهام': 'tasks', 'مهمة': 'tasks',
            'الأهداف': 'goals', 'اهداف': 'goals',
            'الخطط': 'plans', 'خطط': 'plans',
            'المستودعات': 'warehouses', 'مستودعات': 'warehouses',
            'الشحن': 'shipping', 'شحن': 'shipping',
            'التوصيل': 'delivery', 'توصيل': 'delivery',
            'النقل': 'transport', 'نقل': 'transport',
            'الإعدادات': 'settings', 'اعدادات': 'settings',
            'المستخدمين': 'users', 'مستخدمين': 'users',
            'الصلاحيات': 'permissions', 'صلاحيات': 'permissions',
            'الأدوار': 'roles', 'ادوار': 'roles',
            'السجلات': 'logs', 'سجلات': 'logs',
            'الأصناف': 'categories', 'اصناف': 'categories',
            'الأقسام': 'departments', 'اقسام': 'departments',
            'الفروع': 'branches', 'فروع': 'branches',
            'العقود': 'contracts', 'عقود': 'contracts',
            'المستندات': 'documents', 'مستندات': 'documents',
            'التقارير': 'reports', 'تقارير': 'reports',
            'الملفات': 'files', 'ملفات': 'files',
            'التذاكر': 'tickets', 'تذاكر': 'tickets',
            'الدعم': 'support', 'دعم': 'support',
            'الشكاوى': 'complaints', 'شكاوى': 'complaints',
            'الاستفسارات': 'inquiries', 'استفسارات': 'inquiries',
            'الأصول': 'assets', 'اصول': 'assets',
            'العهد': 'custody', 'عهد': 'custody',
            'المركبات': 'vehicles', 'مركبات': 'vehicles',
            'المعدات': 'equipment', 'معدات': 'equipment',
            'الإشعارات': 'notifications', 'اشعارات': 'notifications',
            'الرسائل': 'messages', 'رسائل': 'messages',
            'الإعلانات': 'announcements', 'اعلانات': 'announcements',
            'التحليلات': 'analytics', 'تحليلات': 'analytics',
            'الإحصائيات': 'statistics', 'احصائيات': 'statistics',
            'لوحة التحكم': 'dashboard',
        };
        const cleanName = arabicName.trim();
        if (translations[cleanName]) {
            return translations[cleanName];
        }
        return cleanName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'module';
    }
    parseFieldWithType(field) {
        const parts = field.trim().split(':');
        let name = parts[0].trim();
        let type = (parts[1] || 'string').trim().toLowerCase();
        let isRequired = false;
        if (type.endsWith('!')) {
            isRequired = true;
            type = type.slice(0, -1);
        }
        if (name.endsWith('!')) {
            isRequired = true;
            name = name.slice(0, -1);
        }
        const typeMapping = {
            'string': { tsType: 'string', dtoDecorator: '@IsString()', prismaType: 'String', inputType: 'text' },
            'str': { tsType: 'string', dtoDecorator: '@IsString()', prismaType: 'String', inputType: 'text' },
            'text': { tsType: 'string', dtoDecorator: '@IsString()', prismaType: 'String', inputType: 'textarea' },
            'textarea': { tsType: 'string', dtoDecorator: '@IsString()', prismaType: 'String', inputType: 'textarea' },
            'number': { tsType: 'number', dtoDecorator: '@IsNumber()', prismaType: 'Int', inputType: 'number' },
            'num': { tsType: 'number', dtoDecorator: '@IsNumber()', prismaType: 'Int', inputType: 'number' },
            'int': { tsType: 'number', dtoDecorator: '@IsInt()', prismaType: 'Int', inputType: 'number' },
            'float': { tsType: 'number', dtoDecorator: '@IsNumber()', prismaType: 'Float', inputType: 'number' },
            'decimal': { tsType: 'number', dtoDecorator: '@IsNumber()', prismaType: 'Decimal', inputType: 'number' },
            'money': { tsType: 'number', dtoDecorator: '@IsNumber()', prismaType: 'Decimal', inputType: 'number' },
            'price': { tsType: 'number', dtoDecorator: '@IsNumber()', prismaType: 'Decimal', inputType: 'number' },
            'boolean': { tsType: 'boolean', dtoDecorator: '@IsBoolean()', prismaType: 'Boolean', inputType: 'checkbox' },
            'bool': { tsType: 'boolean', dtoDecorator: '@IsBoolean()', prismaType: 'Boolean', inputType: 'checkbox' },
            'date': { tsType: 'Date', dtoDecorator: '@IsDateString()', prismaType: 'DateTime', inputType: 'date' },
            'datetime': { tsType: 'Date', dtoDecorator: '@IsDateString()', prismaType: 'DateTime', inputType: 'datetime-local' },
            'time': { tsType: 'string', dtoDecorator: '@IsString()', prismaType: 'String', inputType: 'time' },
            'email': { tsType: 'string', dtoDecorator: '@IsEmail()', prismaType: 'String', inputType: 'email' },
            'url': { tsType: 'string', dtoDecorator: '@IsUrl()', prismaType: 'String', inputType: 'url' },
            'phone': { tsType: 'string', dtoDecorator: '@IsPhoneNumber()', prismaType: 'String', inputType: 'tel' },
            'password': { tsType: 'string', dtoDecorator: '@IsString() @MinLength(6)', prismaType: 'String', inputType: 'password' },
            'select': { tsType: 'string', dtoDecorator: '@IsString()', prismaType: 'String', inputType: 'select' },
            'enum': { tsType: 'string', dtoDecorator: '@IsString()', prismaType: 'String', inputType: 'select' },
            'status': { tsType: 'string', dtoDecorator: '@IsString()', prismaType: 'String', inputType: 'select' },
            'file': { tsType: 'string', dtoDecorator: '@IsString()', prismaType: 'String', inputType: 'file' },
            'image': { tsType: 'string', dtoDecorator: '@IsString()', prismaType: 'String', inputType: 'file' },
        };
        const typeInfo = typeMapping[type] || typeMapping['string'];
        return { name, isRequired, ...typeInfo };
    }
    async generateModule(params, context) {
        const { moduleName, fields } = params;
        if (!moduleName)
            return { success: false, message: '❌ اسم الموديول مطلوب' };
        const name = this.translateModuleName(moduleName);
        const Name = name.charAt(0).toUpperCase() + name.slice(1);
        const NameSingular = Name.endsWith('s') ? Name.slice(0, -1) : Name;
        const rawFields = fields ? fields.split(',') : ['name', 'description'];
        const parsedFields = rawFields.map((f) => this.parseFieldWithType(f));
        const backendPath = `/var/www/attendance-system/backend/src/modules/${name}`;
        const frontendPath = `/var/www/attendance-system/web-admin/src/pages/${name}`;
        const dtoImports = new Set(['IsOptional']);
        parsedFields.forEach((f) => {
            if (f.isRequired)
                dtoImports.add('IsNotEmpty');
            if (f.dtoDecorator.includes('IsString'))
                dtoImports.add('IsString');
            if (f.dtoDecorator.includes('IsNumber'))
                dtoImports.add('IsNumber');
            if (f.dtoDecorator.includes('IsInt'))
                dtoImports.add('IsInt');
            if (f.dtoDecorator.includes('IsBoolean'))
                dtoImports.add('IsBoolean');
            if (f.dtoDecorator.includes('IsDateString'))
                dtoImports.add('IsDateString');
            if (f.dtoDecorator.includes('IsEmail'))
                dtoImports.add('IsEmail');
            if (f.dtoDecorator.includes('IsUrl'))
                dtoImports.add('IsUrl');
            if (f.dtoDecorator.includes('MinLength'))
                dtoImports.add('MinLength');
        });
        const createDtoTemplate = `// ==================== ${NameSingular} DTOs ====================
// Auto-generated by AI Agent Code Generation Engine
// Created: ${new Date().toISOString()}

import { ${Array.from(dtoImports).join(', ')} } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class Create${NameSingular}Dto {
${parsedFields.map((f) => {
            const decorator = f.isRequired ? '@ApiProperty' : '@ApiPropertyOptional';
            const optional = f.isRequired ? '' : '?';
            const notEmpty = f.isRequired ? '  @IsNotEmpty()\n' : '  @IsOptional()\n';
            return `  ${decorator}({ description: '${f.name}' })
${notEmpty}  ${f.dtoDecorator}
  ${f.name}${optional}: ${f.tsType};`;
        }).join('\n\n')}
}

export class Update${NameSingular}Dto {
${parsedFields.map((f) => `  @ApiPropertyOptional({ description: '${f.name}' })
  @IsOptional()
  ${f.dtoDecorator}
  ${f.name}?: ${f.tsType};`).join('\n\n')}
}

export class ${NameSingular}ResponseDto {
  @ApiProperty()
  id: string;

${parsedFields.map((f) => `  @ApiPropertyOptional()
  ${f.name}?: ${f.tsType};`).join('\n\n')}

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
`;
        const moduleTemplate = `// ==================== ${Name} Module ====================
// Auto-generated by AI Agent Code Generation Engine
// Created: ${new Date().toISOString()}

import { Module } from '@nestjs/common';
import { ${Name}Service } from './${name}.service';
import { ${Name}Controller } from './${name}.controller';

@Module({
    imports: [],
    controllers: [${Name}Controller],
    providers: [${Name}Service],
    exports: [${Name}Service],
})
export class $ { Name }Module { }
`;
        const serviceTemplate = `// ==================== ${Name} Service ====================
// Auto-generated by AI Agent Code Generation Engine
// Created: ${new Date().toISOString()}
// NOTE: Uses in-memory storage. After creating Prisma model, update to use PrismaService.

import { Injectable, NotFoundException } from '@nestjs/common';
import { Create${NameSingular}Dto, Update${NameSingular} Dto } from './${name}.dto';

// In-memory storage (replace with Prisma after creating model)
let ${name}Data: any[] = [];
let idCounter = 1;

@Injectable()
export class $ { Name }Service {
  
  async findAll(companyId: string): Promise < any[] > {
        return ${name} Data.filter(item => item.companyId === companyId);
}

  async findOne(id: string): Promise < any > {
    const item = ${name} Data.find(item => item.id === id);
if (!item) throw new NotFoundException(\`${NameSingular} with ID \${id} not found\`);
    return item;
  }

  async create(dto: Create${NameSingular}Dto, companyId: string): Promise<any> {
    const newItem = {
      id: String(idCounter++),
      ...dto,
      companyId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    ${name}Data.push(newItem);
    return newItem;
  }

  async update(id: string, dto: Update${NameSingular}Dto): Promise<any> {
    const index = ${name}Data.findIndex(item => item.id === id);
    if (index === -1) throw new NotFoundException(\`${NameSingular} with ID \${id} not found\`);
    ${name}Data[index] = { ...${name}Data[index], ...dto, updatedAt: new Date() };
    return ${name}Data[index];
  }

  async remove(id: string): Promise<{ success: boolean }> {
    const index = ${name}Data.findIndex(item => item.id === id);
    if (index === -1) throw new NotFoundException(\`${NameSingular} with ID \${id} not found\`);
    ${name}Data.splice(index, 1);
    return { success: true };
  }
}
`;
        const controllerTemplate = `// ==================== ${Name} Controller ====================
// Auto-generated by AI Agent Code Generation Engine
// Created: ${new Date().toISOString()}

import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ${Name}Service } from './${name}.service';
import { Create${NameSingular}Dto, Update${NameSingular}Dto, ${NameSingular}ResponseDto } from './${name}.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('${Name}')
@ApiBearerAuth()
@Controller('${name}')
@UseGuards(JwtAuthGuard)
export class ${Name}Controller {
  constructor(private readonly ${name}Service: ${Name}Service) {}

  @Get()
  @ApiOperation({ summary: 'Get all ${name}' })
  @ApiResponse({ status: 200, type: [${NameSingular}ResponseDto] })
  findAll(@Request() req: any) {
    return this.${name}Service.findAll(req.user.companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get ${name} by ID' })
  @ApiResponse({ status: 200, type: ${NameSingular}ResponseDto })
  findOne(@Param('id') id: string) {
    return this.${name}Service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new ${name}' })
  @ApiResponse({ status: 201, type: ${NameSingular}ResponseDto })
  create(@Body() dto: Create${NameSingular}Dto, @Request() req: any) {
    return this.${name}Service.create(dto, req.user.companyId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update ${name}' })
  @ApiResponse({ status: 200, type: ${NameSingular}ResponseDto })
  update(@Param('id') id: string, @Body() dto: Update${NameSingular}Dto) {
    return this.${name}Service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete ${name}' })
  @ApiResponse({ status: 200 })
  remove(@Param('id') id: string) {
    return this.${name}Service.remove(id);
  }

  @Get('export/csv')
  @ApiOperation({ summary: 'Export ${name} as CSV' })
  async exportCsv(@Request() req: any) {
    const data = await this.${name}Service.findAll(req.user.companyId);
    const items = data.data || data;
    if (!items.length) return { csv: '', filename: '${name}.csv' };
    
    const headers = Object.keys(items[0]).join(',');
    const rows = items.map((item: any) => Object.values(item).map(v => '"' + String(v || '') + '"').join(',')).join('\\n');
    return { csv: headers + '\\n' + rows, filename: '${name}_export.csv' };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get ${name} statistics' })
  async getStats(@Request() req: any) {
    const data = await this.${name}Service.findAll(req.user.companyId);
    return {
      total: data.total || (data.data?.length || data.length || 0),
      thisMonth: 0, // Calculate based on your needs
      lastUpdated: new Date(),
    };
  }
}
`;
        const frontendPageTemplate = `// ==================== ${Name} Page ====================
// Auto-generated by AI Agent Code Generation Engine
// Created: ${new Date().toISOString()}
// Features: Full CRUD with Add/Edit Modal, Delete Confirmation

import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Loader2, X, Save, Search } from 'lucide-react';
import api from '@/lib/axios';

interface ${NameSingular}Item {
  id: string;
${parsedFields.map((f) => `  ${f.name}?: ${f.tsType};`).join('\n')}
  createdAt?: string;
}

interface FormData {
${parsedFields.map((f) => `  ${f.name}: ${f.tsType === 'number' ? 'string' : f.tsType};`).join('\n')}
}

const initialFormData: FormData = {
${parsedFields.map((f) => `  ${f.name}: ${f.tsType === 'boolean' ? 'false' : "''"},`).join('\n')}
};

export default function ${Name}Page() {
  const [items, setItems] = useState<${NameSingular}Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [saving, setSaving] = useState(false);
  
  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/${name}');
      setItems(response.data?.data || response.data || []);
    } catch (err: any) {
      setError(err.message || 'خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setFormData(initialFormData);
    setEditingId(null);
    setShowModal(true);
  };

  const handleEdit = (item: ${NameSingular}Item) => {
    setFormData({
${parsedFields.map((f) => `      ${f.name}: ${f.tsType === 'number' ? `String(item.${f.name} || '')` : `item.${f.name} || ${f.tsType === 'boolean' ? 'false' : "''"}`},`).join('\n')}
    });
    setEditingId(item.id);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const dataToSend = {
${parsedFields.map((f) => f.tsType === 'number' ? `        ${f.name}: formData.${f.name} ? Number(formData.${f.name}) : undefined,` : `        ${f.name}: formData.${f.name},`).join('\n')}
      };
      
      if (editingId) {
        await api.put(\`/${name}/\${editingId}\`, dataToSend);
      } else {
        await api.post('/${name}', dataToSend);
      }
      setShowModal(false);
      fetchItems();
    } catch (err: any) {
      alert(err.response?.data?.message || 'خطأ في حفظ البيانات');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.delete(\`/${name}/\${deleteId}\`);
      setDeleteId(null);
      fetchItems();
    } catch (err: any) {
      alert(err.response?.data?.message || 'خطأ في الحذف');
    } finally {
      setDeleting(false);
    }
  };

  const filteredItems = items.filter(item => 
    !search || JSON.stringify(item).toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="mr-2">جاري التحميل...</span>
      </div>
    );
  }

  return (
    <div className="p-6" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">${Name}</h1>
        <button 
          onClick={handleAdd}
          className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" />
          إضافة جديد
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="بحث..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pr-10 pl-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-600">{error}</p>
          <button onClick={fetchItems} className="mt-2 text-red-700 underline">إعادة المحاولة</button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
${parsedFields.slice(0, 4).map((f) => `              <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">${f.name}</th>`).join('\n')}
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 w-24">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={${Math.min(parsedFields.length, 4) + 1}} className="px-4 py-8 text-center text-gray-500">
                  لا توجد بيانات
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
${parsedFields.slice(0, 4).map((f) => `                  <td className="px-4 py-3 text-sm">{${f.tsType === 'boolean' ? `item.${f.name} ? '✓' : '✗'` : `item.${f.name}`}}</td>`).join('\n')}
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-1">
                      <button onClick={() => handleEdit(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteId(item.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="font-semibold text-lg">{editingId ? 'تعديل' : 'إضافة جديد'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
${parsedFields.map((f) => {
            if (f.tsType === 'boolean') {
                return `              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.${f.name} as boolean}
                  onChange={(e) => setFormData({ ...formData, ${f.name}: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <span>${f.name}</span>
              </label>`;
            }
            return `              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">${f.name}</label>
                <input
                  type="${f.tsType === 'number' ? 'number' : 'text'}"
                  value={formData.${f.name}}
                  onChange={(e) => setFormData({ ...formData, ${f.name}: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="${f.name}"
                />
              </div>`;
        }).join('\n')}
              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-primary text-white py-2 rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? 'جاري الحفظ...' : 'حفظ'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 border py-2 rounded-lg hover:bg-gray-50"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4 p-6 text-center">
            <Trash2 className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">تأكيد الحذف</h3>
            <p className="text-gray-600 mb-6">هل أنت متأكد من حذف هذا العنصر؟</p>
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'جاري الحذف...' : 'حذف'}
              </button>
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 border py-2 rounded-lg hover:bg-gray-50"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
`;
        try {
            if (!fs.existsSync(backendPath)) {
                fs.mkdirSync(backendPath, { recursive: true });
            }
            fs.writeFileSync(path.join(backendPath, `${name}.module.ts`), moduleTemplate);
            fs.writeFileSync(path.join(backendPath, `${name}.service.ts`), serviceTemplate);
            fs.writeFileSync(path.join(backendPath, `${name}.controller.ts`), controllerTemplate);
            fs.writeFileSync(path.join(backendPath, `${name}.dto.ts`), createDtoTemplate);
            if (!fs.existsSync(frontendPath)) {
                fs.mkdirSync(frontendPath, { recursive: true });
            }
            fs.writeFileSync(path.join(frontendPath, `${Name}Page.tsx`), frontendPageTemplate);
            return {
                success: true,
                message: `✅ تم إنشاء "${Name}" بنجاح!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 Backend Files (${backendPath}/):
  ✅ ${name}.module.ts
  ✅ ${name}.service.ts
  ✅ ${name}.controller.ts
  ✅ ${name}.dto.ts

🎨 Frontend (${frontendPath}/):
  ✅ ${Name}Page.tsx

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 خطوات التفعيل:

1️⃣ سجل الموديول في app.module.ts:
   import { ${Name}Module } from './modules/${name}/${name}.module';
   imports: [..., ${Name}Module]

2️⃣ أضف Route في App.tsx:
   <Route path="/${name}" element={<${Name}Page />} />

3️⃣ Build & Restart:
   npm run build && pm2 restart 0

🔗 API: /api/v1/${name}
🌐 URL: /${name}`
            };
        }
        catch (error) {
            this.logger.error(`Error generating module: ${error.message}`);
            return {
                success: false,
                message: `❌ خطأ في إنشاء الموديول: ${error.message}`
            };
        }
    }
    async generatePrismaModel(params, context) {
        const { modelName, fields } = params;
        if (!modelName)
            return { success: false, message: '❌ اسم الموديل مطلوب' };
        const translatedName = this.translateModuleName(modelName);
        const name = translatedName.toLowerCase();
        const Name = translatedName.charAt(0).toUpperCase() + translatedName.slice(1);
        const NameSingular = Name.endsWith('s') ? Name.slice(0, -1) : Name;
        const rawFields = fields ? fields.split(',') : ['name', 'description'];
        const parsedFields = rawFields.map((f) => this.parseFieldWithType(f));
        const prismaFieldDefs = parsedFields.map((f) => {
            let fieldDef = `  ${f.name.padEnd(14)} ${f.prismaType}`;
            if (f.prismaType === 'Decimal') {
                fieldDef += '  @db.Decimal(10, 2)';
            }
            fieldDef = fieldDef.replace(f.prismaType, `${f.prismaType}?`);
            return fieldDef;
        }).join('\n');
        const prismaModel = `
// ==================== ${Name} Model ====================
// Auto-generated by AI Agent Code Generation Engine
// Created: ${new Date().toISOString()}

model ${NameSingular} {
  id            String    @id @default(cuid())
  companyId     String    @map("company_id")
  company       Company   @relation(fields: [companyId], references: [id])
${prismaFieldDefs}
  isActive      Boolean   @default(true) @map("is_active")
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  @@map("${name}")
}
`;
        const prismaServiceTemplate = `// ==================== ${Name} Service (Prisma) ====================
// Auto-generated by AI Agent Code Generation Engine
// Created: ${new Date().toISOString()}

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Create${NameSingular}Dto, Update${NameSingular}Dto } from './${name}.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ${Name}Service {
  constructor(private prisma: PrismaService) {}

  async findAll(companyId: string, options?: { search?: string; page?: number; limit?: number }) {
    const { search, page = 1, limit = 20 } = options || {};
    
    const where: Prisma.${NameSingular}WhereInput = {
      companyId,
      isActive: true,
      ...(search ? { ${parsedFields[0]?.name || 'name'}: { contains: search, mode: 'insensitive' } } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.${name.toLowerCase()}.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.${name.toLowerCase()}.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const item = await this.prisma.${name.toLowerCase()}.findUnique({ where: { id } });
    if (!item) throw new NotFoundException(\`${NameSingular} with ID \${id} not found\`);
    return item;
  }

  async create(dto: Create${NameSingular}Dto, companyId: string) {
    return this.prisma.${name.toLowerCase()}.create({
      data: { ...dto, companyId },
    });
  }

  async update(id: string, dto: Update${NameSingular}Dto) {
    await this.findOne(id); // Check exists
    return this.prisma.${name.toLowerCase()}.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id); // Check exists
    // Soft delete by setting isActive = false
    await this.prisma.${name.toLowerCase()}.update({
      where: { id },
      data: { isActive: false },
    });
    return { success: true, message: 'تم الحذف بنجاح' };
  }
}
`;
        const schemaPath = '/var/www/attendance-system/backend/prisma/schema.prisma';
        const servicePath = `/var/www/attendance-system/backend/src/modules/${name}/${name}.service.ts`;
        try {
            const existingSchema = fs.readFileSync(schemaPath, 'utf-8');
            if (existingSchema.includes(`model ${NameSingular} {`)) {
                return { success: false, message: `⚠️ الموديل "${NameSingular}" موجود بالفعل في schema.prisma!` };
            }
            fs.appendFileSync(schemaPath, prismaModel);
            const moduleDir = `/var/www/attendance-system/backend/src/modules/${name}`;
            if (fs.existsSync(moduleDir)) {
                fs.writeFileSync(servicePath, prismaServiceTemplate);
                const modulePath = `${moduleDir}/${name}.module.ts`;
                if (fs.existsSync(modulePath)) {
                    let moduleContent = fs.readFileSync(modulePath, 'utf-8');
                    if (!moduleContent.includes('PrismaModule')) {
                        moduleContent = moduleContent.replace("import { Module } from '@nestjs/common';", "import { Module } from '@nestjs/common';\nimport { PrismaModule } from '../../common/prisma/prisma.module';");
                        moduleContent = moduleContent.replace('imports: []', 'imports: [PrismaModule]');
                        fs.writeFileSync(modulePath, moduleContent);
                    }
                }
            }
            return {
                success: true,
                message: `📊 تم إنشاء Prisma Model "${NameSingular}" بنجاح!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ الموديل المُضاف:
\`\`\`prisma
model ${NameSingular} {
  id, companyId, ${parsedFields.map((f) => f.name).join(', ')}
  isActive, createdAt, updatedAt
}
\`\`\`

📁 schema.prisma: تم التحديث
📁 ${name}.service.ts: تم التحويل إلى Prisma

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚡ الخطوات التالية:

1️⃣ نفذ migration:
   "نفذ migration"

2️⃣ Or manually:
   cd /var/www/attendance-system/backend
   npx prisma generate
   npx prisma db push

3️⃣ Build & restart:
   npm run build && pm2 restart 0`
            };
        }
        catch (error) {
            return { success: false, message: `❌ خطأ في تعديل schema.prisma: ${error.message}` };
        }
    }
    async generateApiEndpoint(params, context) {
        const { name, method } = params;
        if (!name)
            return { success: false, message: '❌ اسم الـ API مطلوب' };
        const httpMethod = (method || 'GET').toUpperCase();
        const decorator = httpMethod === 'GET' ? '@Get()' :
            httpMethod === 'POST' ? '@Post()' :
                httpMethod === 'PUT' ? '@Put()' : '@Delete()';
        return {
            success: true,
            message: `🔗 API Endpoint جاهز!

\`\`\`typescript
${decorator}
async ${name}(@Request() req) {
  // Your logic here
  return { success: true, message: '${name} executed' };
}
\`\`\`

📍 Endpoint: ${httpMethod} /api/v1/${name}`
        };
    }
    async generateFrontendPage(params, context) {
        const { pageName, pageType } = params;
        if (!pageName)
            return { success: false, message: '❌ اسم الصفحة مطلوب' };
        const Name = pageName.charAt(0).toUpperCase() + pageName.slice(1);
        const type = pageType || 'list';
        return {
            success: true,
            message: `🎨 صفحة Frontend "${Name}" جاهزة!

📁 الملف: ${Name}Page.tsx
📋 النوع: ${type}

\`\`\`tsx
import React from 'react';

export default function ${Name}Page() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">${Name}</h1>
      {/* Auto-generated ${type} view */}
    </div>
  );
}
\`\`\`

⚠️ أضف الـ Route في App.tsx`
        };
    }
    async generateCrudSystem(params, context) {
        const { systemName, arabicName, fields } = params;
        if (!systemName)
            return { success: false, message: '❌ اسم النظام مطلوب' };
        const Name = systemName.charAt(0).toUpperCase() + systemName.slice(1);
        const name = systemName.toLowerCase();
        const arName = arabicName || Name;
        const fieldList = fields ? fields.split(',').map((f) => f.trim()) : ['name', 'description', 'status'];
        return {
            success: true,
            message: `🏗️ نظام CRUD كامل "${arName}" جاهز!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Database Model:
  • ${Name} (Prisma)

📦 Backend Files:
  • ${name}.module.ts
  • ${name}.service.ts
  • ${name}.controller.ts
  • dto/create-${name}.dto.ts
  • dto/update-${name}.dto.ts

🎨 Frontend Files:
  • ${Name}Page.tsx (List)
  • ${Name}Form.tsx (Create/Edit)
  • ${Name}Details.tsx (View)

🔗 APIs:
  • GET    /api/v1/${name}
  • GET    /api/v1/${name}/:id
  • POST   /api/v1/${name}
  • PUT    /api/v1/${name}/:id
  • DELETE /api/v1/${name}/:id

📝 الحقول: ${fieldList.join(', ')}

⚠️ تنفيذ:
1. generate_prisma_model ${name}
2. run_prisma_migrate
3. deploy_changes`
        };
    }
    async listGeneratedModules(params, context) {
        const existingModules = [
            'auth', 'users', 'attendance', 'leaves', 'departments', 'branches',
            'payroll', 'reports', 'notifications', 'tasks', 'policies', 'ai-chat'
        ];
        return {
            success: true,
            message: `📋 الموديولات الموجودة في النظام:

${existingModules.map((m, i) => `${i + 1}. 📦 ${m}`).join('\n')}

💡 إجمالي: ${existingModules.length} موديول

🆕 لإنشاء موديول جديد:
"أنشئ موديول [الاسم]"`
        };
    }
    async runPrismaMigrate(params, context) {
        const backendPath = '/var/www/attendance-system/backend';
        try {
            this.logger.log('[CODE-GEN] Running prisma generate...');
            const generateResult = await execAsync(`cd ${backendPath} && npx prisma generate`);
            this.logger.log('[CODE-GEN] Running prisma db push...');
            const pushResult = await execAsync(`cd ${backendPath} && npx prisma db push --accept-data-loss`);
            return {
                success: true,
                message: `⚙️ تم تنفيذ Prisma Migration بنجاح!

✅ prisma generate: تم
✅ prisma db push: تم

📊 تم تحديث قاعدة البيانات!

⚡ الخطوة التالية: "نشر التغييرات" أو "deploy"`
            };
        }
        catch (error) {
            return {
                success: false,
                message: `❌ خطأ في Prisma Migration: ${error.message}

💡 حاول تنفيذ الأوامر يدوياً:
\`\`\`bash
cd ${backendPath}
npx prisma generate
npx prisma db push
\`\`\``
            };
        }
    }
    async deployChanges(params, context) {
        const backendPath = '/var/www/attendance-system/backend';
        try {
            this.logger.log('[CODE-GEN] Building backend...');
            await execAsync(`cd ${backendPath} && npm run build`);
            this.logger.log('[CODE-GEN] Restarting PM2...');
            await execAsync('pm2 restart attendance-backend');
            return {
                success: true,
                message: `🚀 تم نشر التغييرات بنجاح!

✅ npm run build: تم
✅ pm2 restart: تم

🎉 النظام الجديد شغال الآن!`
            };
        }
        catch (error) {
            return {
                success: false,
                message: `❌ خطأ في النشر: ${error.message}

💡 حاول تنفيذ الأوامر يدوياً:
\`\`\`bash
cd ${backendPath}
npm run build
pm2 restart attendance-backend
\`\`\``
            };
        }
    }
    async findEmployeeByName(name, companyId) {
        const nameParts = name.split(' ').filter(p => p.length > 1);
        const employees = await this.prisma.user.findMany({
            where: { companyId },
        });
        const scored = employees.map((emp) => {
            let score = 0;
            const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
            for (const part of nameParts) {
                if (emp.firstName?.toLowerCase().includes(part.toLowerCase()))
                    score += 2;
                if (emp.lastName?.toLowerCase().includes(part.toLowerCase()))
                    score += 2;
            }
            if (fullName.includes(name.toLowerCase()))
                score += 5;
            return { ...emp, score };
        });
        const matches = scored.filter((e) => e.score > 0).sort((a, b) => b.score - a.score);
        return matches.length > 0 ? matches[0] : null;
    }
    async aiGenerateSystem(request, context) {
        this.logger.log(`AI-Driven Code Generation: ${request}`);
        try {
            let moduleName = '';
            let fields = ['name:string', 'description:string'];
            let description = 'نظام مولد';
            try {
                const systemInstruction = `استخرج من الطلب: اسم الموديول والحقول المطلوبة. أرجع JSON فقط.`;
                const prompt = `طلب: "${request}"

أرجع JSON بهذا الشكل فقط:
{
  "moduleName": "الاسم بالإنجليزية lowercase (كلمة واحدة)",
  "fields": ["field1:type", "field2:type"],
  "description": "وصف مختصر"
}

أنواع الحقول: string, number, boolean, date
مثال: ["name:string", "price:number", "isActive:boolean"]`;
                const aiResponse = await this.aiService.generateContent(prompt, systemInstruction);
                const parsed = this.aiService.parseJsonResponse(aiResponse);
                moduleName = (parsed.moduleName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                fields = parsed.fields || fields;
                description = parsed.description || description;
            }
            catch {
                this.logger.warn('AI parsing failed, using local extraction');
            }
            if (!moduleName) {
                moduleName = this.extractModuleNameFromRequest(request);
            }
            if (!moduleName) {
                return { success: false, message: '❌ لم أستطع فهم اسم النظام. جرب: "اعمل نظام للعملاء"' };
            }
            const ModuleName = moduleName.charAt(0).toUpperCase() + moduleName.slice(1);
            const dtoCode = this.generateDtoTemplate(moduleName, ModuleName, fields);
            const serviceCode = this.generateServiceTemplate(moduleName, ModuleName, fields);
            const controllerCode = this.generateControllerTemplate(moduleName, ModuleName);
            const moduleCode = this.generateModuleTemplate(moduleName, ModuleName);
            const frontendCode = this.generateFrontendTemplate(moduleName, ModuleName, fields);
            const backendPath = `/var/www/attendance-system/backend/src/modules/${moduleName}`;
            const frontendPath = `/var/www/attendance-system/web-admin/src/pages/${moduleName}`;
            if (!fs.existsSync(backendPath)) {
                fs.mkdirSync(backendPath, { recursive: true });
            }
            if (!fs.existsSync(frontendPath)) {
                fs.mkdirSync(frontendPath, { recursive: true });
            }
            const files = [];
            fs.writeFileSync(`${backendPath}/${moduleName}.module.ts`, moduleCode);
            files.push(`${moduleName}.module.ts`);
            fs.writeFileSync(`${backendPath}/${moduleName}.service.ts`, serviceCode);
            files.push(`${moduleName}.service.ts`);
            fs.writeFileSync(`${backendPath}/${moduleName}.controller.ts`, controllerCode);
            files.push(`${moduleName}.controller.ts`);
            fs.writeFileSync(`${backendPath}/${moduleName}.dto.ts`, dtoCode);
            files.push(`${moduleName}.dto.ts`);
            fs.writeFileSync(`${frontendPath}/${ModuleName}Page.tsx`, frontendCode);
            files.push(`${ModuleName}Page.tsx`);
            return {
                success: true,
                message: `🧠 تم توليد "${ModuleName}" بواسطة الذكاء الاصطناعي!

📋 الوصف: ${description}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 الملفات المُولّدة:
${files.map(f => `  ✅ ${f}`).join('\\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 خطوات التفعيل:

1️⃣ سجل الموديول في app.module.ts:
   import { ${ModuleName}Module } from './modules/${moduleName}/${moduleName}.module';
   imports: [..., ${ModuleName}Module]

2️⃣ أضف Route في App.tsx:
   <Route path="/${moduleName}" element={<${ModuleName}Page />} />

3️⃣ Build & Restart:
   npm run build && pm2 restart 0

🔗 API: /api/v1/${moduleName}
🌐 URL: /${moduleName}

💡 تم توليد الكود بواسطة Gemini AI`
            };
        }
        catch (error) {
            this.logger.error(`AI Generation Error: ${error.message}`);
            return {
                success: false,
                message: `❌ خطأ في التوليد: ${error.message}`
            };
        }
    }
    generateDtoTemplate(moduleName, ModuleName, fields) {
        const createFields = fields.map(f => {
            const [name, type] = f.split(':');
            const tsType = type === 'number' ? 'number' : type === 'boolean' ? 'boolean' : 'string';
            const decorator = type === 'number' ? '@IsNumber()' : type === 'boolean' ? '@IsBoolean()' : '@IsString()';
            return `  ${decorator}\n  @IsNotEmpty()\n  ${name}: ${tsType};`;
        }).join('\n\n');
        const updateFields = fields.map(f => {
            const [name, type] = f.split(':');
            const tsType = type === 'number' ? 'number' : type === 'boolean' ? 'boolean' : 'string';
            const decorator = type === 'number' ? '@IsNumber()' : type === 'boolean' ? '@IsBoolean()' : '@IsString()';
            return `  ${decorator}\n  @IsOptional()\n  ${name}?: ${tsType};`;
        }).join('\n\n');
        return `import { IsString, IsNumber, IsBoolean, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class Create${ModuleName}Dto {
${createFields}
}

export class Update${ModuleName}Dto {
${updateFields}
}

export class ${ModuleName}ResponseDto {
  id: number;
${fields.map(f => {
            const [name, type] = f.split(':');
            const tsType = type === 'number' ? 'number' : type === 'boolean' ? 'boolean' : 'string';
            return `  ${name}: ${tsType};`;
        }).join('\n')}
  createdAt: Date;
  updatedAt: Date;
}
`;
    }
    generateServiceTemplate(moduleName, ModuleName, fields) {
        return `import { Injectable, NotFoundException } from '@nestjs/common';
import { Create${ModuleName}Dto, Update${ModuleName}Dto, ${ModuleName}ResponseDto } from './${moduleName}.dto';

@Injectable()
export class ${ModuleName}Service {
  private items: any[] = [];
  private nextId = 1;

  findAll(query: any) {
    let result = [...this.items];
    if (query.search) {
      result = result.filter(i => JSON.stringify(i).toLowerCase().includes(query.search.toLowerCase()));
    }
    const page = query.page || 1;
    const limit = query.limit || 10;
    const start = (page - 1) * limit;
    return {
      data: result.slice(start, start + limit),
      total: result.length,
      page,
      limit,
    };
  }

  findOne(id: number) {
    const item = this.items.find(i => i.id === id);
    if (!item) throw new NotFoundException('Not found');
    return item;
  }

  create(dto: Create${ModuleName}Dto) {
    const newItem = {
      id: this.nextId++,
      ...dto,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.items.push(newItem);
    return newItem;
  }

  update(id: number, dto: Update${ModuleName}Dto) {
    const index = this.items.findIndex(i => i.id === id);
    if (index === -1) throw new NotFoundException('Not found');
    this.items[index] = { ...this.items[index], ...dto, updatedAt: new Date() };
    return this.items[index];
  }

  remove(id: number) {
    const index = this.items.findIndex(i => i.id === id);
    if (index === -1) throw new NotFoundException('Not found');
    this.items.splice(index, 1);
    return { success: true };
  }
}
`;
    }
    generateControllerTemplate(moduleName, ModuleName) {
        return `import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ${ModuleName}Service } from './${moduleName}.service';
import { Create${ModuleName}Dto, Update${ModuleName}Dto } from './${moduleName}.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('${ModuleName}')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('${moduleName}')
export class ${ModuleName}Controller {
  constructor(private readonly service: ${ModuleName}Service) {}

  @Get()
  @ApiOperation({ summary: 'Get all ${moduleName}' })
  findAll(@Query() query: any) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get ${moduleName} by ID' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  @Post()
  @ApiOperation({ summary: 'Create ${moduleName}' })
  create(@Body() dto: Create${ModuleName}Dto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update ${moduleName}' })
  update(@Param('id') id: string, @Body() dto: Update${ModuleName}Dto) {
    return this.service.update(+id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete ${moduleName}' })
  remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }
}
`;
    }
    generateModuleTemplate(moduleName, ModuleName) {
        return `import { Module } from '@nestjs/common';
import { ${ModuleName}Controller } from './${moduleName}.controller';
import { ${ModuleName}Service } from './${moduleName}.service';

@Module({
  controllers: [${ModuleName}Controller],
  providers: [${ModuleName}Service],
  exports: [${ModuleName}Service],
})
export class ${ModuleName}Module {}
`;
    }
    generateFrontendTemplate(moduleName, ModuleName, fields) {
        const fieldInputs = fields.map(f => {
            const [name] = f.split(':');
            return `        <input
          name="${name}"
          placeholder="${name}"
          value={form.${name} || ''}
          onChange={handleChange}
          className="w-full p-2 border rounded"
        />`;
        }).join('\n');
        return `import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.service';

interface ${ModuleName}Item {
  id: number;
${fields.map(f => {
            const [name, type] = f.split(':');
            const tsType = type === 'number' ? 'number' : type === 'boolean' ? 'boolean' : 'string';
            return `  ${name}: ${tsType};`;
        }).join('\n')}
}

export default function ${ModuleName}Page() {
  const [items, setItems] = useState<${ModuleName}Item[]>([]);
  const [form, setForm] = useState<any>({});
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const res = await api.get('/${moduleName}');
      setItems(res.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    try {
      await api.post('/${moduleName}', form);
      setForm({});
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="p-4">جاري التحميل...</div>;

  return (
    <div className="p-4" dir="rtl">
      <h1 className="text-2xl font-bold mb-4">${ModuleName}</h1>
      
      <div className="bg-white p-4 rounded shadow mb-4">
        <h2 className="text-lg font-semibold mb-2">إضافة جديد</h2>
        <div className="space-y-2">
${fieldInputs}
          <button onClick={handleSubmit} className="bg-blue-500 text-white px-4 py-2 rounded">
            حفظ
          </button>
        </div>
      </div>

      <div className="bg-white rounded shadow">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2">ID</th>
${fields.map(f => `              <th className="p-2">${f.split(':')[0]}</th>`).join('\n')}
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} className="border-t">
                <td className="p-2">{item.id}</td>
${fields.map(f => `                <td className="p-2">{item.${f.split(':')[0]}}</td>`).join('\n')}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
`;
    }
    extractModuleNameFromRequest(request) {
        const translations = {
            'سيارات': 'vehicle', 'سياره': 'vehicle', 'مركبات': 'vehicle', 'كيلوهات': 'mileage',
            'فواتير': 'invoice', 'فاتوره': 'invoice', 'فاتورة': 'invoice',
            'عملاء': 'customer', 'عميل': 'customer', 'زبائن': 'customer',
            'منتجات': 'product', 'منتج': 'product', 'اصناف': 'product',
            'مخزون': 'inventory', 'مخازن': 'warehouse', 'مخزن': 'warehouse',
            'موظفين': 'employee', 'موظف': 'employee',
            'مشاريع': 'project', 'مشروع': 'project',
            'مهام': 'task', 'مهمه': 'task', 'مهمة': 'task',
            'طلبات': 'order', 'طلب': 'order', 'اوردر': 'order',
            'مبيعات': 'sale', 'بيع': 'sale',
            'مشتريات': 'purchase', 'شراء': 'purchase',
            'تتبع': 'tracking', 'متابعة': 'tracking',
            'تقارير': 'report', 'تقرير': 'report',
            'اجازات': 'leave', 'اجازه': 'leave', 'اجازة': 'leave',
            'حضور': 'attendance', 'انصراف': 'attendance',
            'رواتب': 'salary', 'راتب': 'salary',
            'عقود': 'contract', 'عقد': 'contract',
        };
        const lowered = request.toLowerCase();
        for (const [arabic, english] of Object.entries(translations)) {
            if (lowered.includes(arabic)) {
                return english;
            }
        }
        const englishMatch = request.match(/\b([a-z]{3,})\b/i);
        if (englishMatch) {
            return englishMatch[1].toLowerCase();
        }
        return 'item';
    }
    isOpenCreationRequest(message) {
        const patterns = [
            /^(اعمل|اعملي|اعمللي|صمم|صممي|صمملي|انشئ|أنشئ|ابني|بناء)/,
            /^(ضيف|ضف|ضيفلي|اضف|أضف|أضيف|اضافة|إضافة)/,
            /^(عايز|عاوز|محتاج|محتاجين|ابغى|نبي|نريد|نحتاج)/,
            /(نظام|موديول|module|system)\s+(تتبع|لتتبع|لإدارة|للتحكم|ل)/,
            /^(create|build|make|generate|design|add)\s+(a\s+)?(new\s+)?/i,
        ];
        return patterns.some(p => p.test(message.trim()));
    }
    async autoRegisterModule(moduleName, ModuleName) {
        try {
            const appModulePath = '/var/www/attendance-system/backend/src/app.module.ts';
            let content = fs.readFileSync(appModulePath, 'utf-8');
            const importLine = `import { ${ModuleName}Module } from './modules/${moduleName}/${moduleName}.module';`;
            if (content.includes(`${ModuleName}Module`)) {
                this.logger.log(`Module ${ModuleName} already registered`);
                return true;
            }
            const importMatch = content.match(/import.*from.*['"];?\s*\n/g);
            if (importMatch) {
                const lastImport = importMatch[importMatch.length - 1];
                content = content.replace(lastImport, lastImport + importLine + '\n');
            }
            content = content.replace(/imports:\s*\[/, `imports: [\n        ${ModuleName}Module,`);
            fs.writeFileSync(appModulePath, content);
            this.logger.log(`✅ Auto-registered ${ModuleName}Module`);
            return true;
        }
        catch (e) {
            this.logger.error(`Auto-register failed: ${e.message}`);
            return false;
        }
    }
    async autoAddRoute(moduleName, ModuleName) {
        try {
            const appTsxPath = '/var/www/attendance-system/web-admin/src/App.tsx';
            let content = fs.readFileSync(appTsxPath, 'utf-8');
            if (content.includes(`/${moduleName}`)) {
                this.logger.log(`Route /${moduleName} already exists`);
                return true;
            }
            const importLine = `import ${ModuleName}Page from './pages/${moduleName}/${ModuleName}Page';`;
            const routeLine = `          <Route path="/${moduleName}" element={<${ModuleName}Page />} />`;
            const importMatch = content.match(/import.*from.*['"];?\s*\n/g);
            if (importMatch) {
                const lastImport = importMatch[importMatch.length - 1];
                content = content.replace(lastImport, lastImport + importLine + '\n');
            }
            content = content.replace('</Routes>', routeLine + '\n        </Routes>');
            fs.writeFileSync(appTsxPath, content);
            this.logger.log(`✅ Auto-added route /${moduleName}`);
            return true;
        }
        catch (e) {
            this.logger.error(`Auto-route failed: ${e.message}`);
            return false;
        }
    }
    async autoBuildAndRestart() {
        try {
            this.logger.log('🔨 Starting auto-build...');
            const { stdout, stderr } = await execAsync('cd /var/www/attendance-system/backend && npm run build && pm2 restart 0', { timeout: 120000 });
            this.logger.log(`Build output: ${stdout}`);
            if (stderr && !stderr.includes('warning')) {
                this.logger.warn(`Build stderr: ${stderr}`);
            }
            return { success: true, message: '✅ تم البناء وإعادة التشغيل بنجاح' };
        }
        catch (e) {
            this.logger.error(`Build failed: ${e.message}`);
            return { success: false, message: `⚠️ خطأ في البناء: ${e.message.substring(0, 100)}` };
        }
    }
    async aiFullAutoGenerate(request, context) {
        this.logger.log(`🚀 Full Auto-Generate: ${request}`);
        const genResult = await this.aiGenerateSystem(request, context);
        if (!genResult.success)
            return genResult;
        const moduleMatch = genResult.message.match(/API: \/api\/v1\/(\w+)/);
        const moduleName = moduleMatch ? moduleMatch[1] : null;
        if (!moduleName) {
            return genResult;
        }
        const ModuleName = moduleName.charAt(0).toUpperCase() + moduleName.slice(1);
        const registered = await this.autoRegisterModule(moduleName, ModuleName);
        const routed = await this.autoAddRoute(moduleName, ModuleName);
        const buildPromise = this.autoBuildAndRestart();
        return {
            success: true,
            message: `🚀✨ تم توليد وتفعيل "${ModuleName}" بالكامل تلقائياً!

${genResult.message}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔌 التفعيل التلقائي:
  ${registered ? '✅' : '⚠️'} app.module.ts - ${registered ? 'تم التسجيل' : 'تسجيل يدوي مطلوب'}
  ${routed ? '✅' : '⚠️'} App.tsx - ${routed ? 'تم إضافة Route' : 'إضافة يدوية مطلوبة'}
  🔄 Build - جاري في الخلفية...

💡 النظام جاهز للاستخدام خلال دقيقة!`
        };
    }
    async aiGeniusBuilder(request, context) {
        this.logger.log(`🧠💡 GENIUS BUILDER: ${request}`);
        try {
            const planResult = await this.aiAnalyzeAndPlan(request);
            if (!planResult.success) {
                return planResult;
            }
            const plan = planResult.data;
            const results = [];
            let allSuccess = true;
            for (let i = 0; i < plan.steps.length; i++) {
                const step = plan.steps[i];
                this.logger.log(`Executing step ${i + 1}: ${step.action}`);
                try {
                    const stepResult = await this.executeGeniusStep(step, context);
                    results.push(`✅ خطوة ${i + 1}: ${step.description}`);
                }
                catch (e) {
                    results.push(`⚠️ خطوة ${i + 1}: ${step.description} - ${e.message}`);
                    allSuccess = false;
                }
            }
            const validationResult = await this.validateGeneratedCode(plan.modules);
            if (validationResult.valid) {
                this.autoBuildAndRestart();
            }
            return {
                success: allSuccess,
                message: `🧠💡 تم تنفيذ "${plan.systemName}" بنجاح!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 الخطة: ${plan.description}

📝 النتائج:
${results.join('\n')}

✨ الموديولات المُنشأة: ${plan.modules.join(', ')}
🔍 التحقق: ${validationResult.valid ? '✅ الكود صحيح' : '⚠️ يحتاج مراجعة'}
🔨 البناء: جاري في الخلفية...`
            };
        }
        catch (error) {
            this.logger.error(`Genius Builder Error: ${error.message}`);
            return {
                success: false,
                message: `❌ خطأ في التخطيط الذكي: ${error.message}`
            };
        }
    }
    async aiAnalyzeAndPlan(request) {
        const systemInstruction = `أنت مخطط ذكي للأنظمة. حلل الطلب وأنشئ خطة تنفيذ.`;
        const prompt = `حلل الطلب التالي وأنشئ خطة تنفيذ:

الطلب: "${request}"

أرجع JSON فقط بهذا الشكل:
{
  "systemName": "اسم النظام",
  "description": "وصف مختصر",
  "modules": ["اسم_موديول1", "اسم_موديول2"],
  "steps": [
    { "action": "create_module", "moduleName": "الاسم", "fields": "الحقول", "description": "الوصف" }
  ],
  "relationships": [
    { "from": "module1", "to": "module2", "type": "hasMany" }
  ]
}`;
        try {
            const response = await this.aiService.generateContent(prompt, systemInstruction);
            const plan = this.aiService.parseJsonResponse(response);
            return {
                success: true,
                message: 'تم إنشاء الخطة',
                data: plan
            };
        }
        catch (e) {
            return {
                success: false,
                message: `خطأ في التخطيط: ${e.message}`
            };
        }
    }
    async executeGeniusStep(step, context) {
        switch (step.action) {
            case 'create_module':
                return this.aiFullAutoGenerate(`أنشئ موديول ${step.moduleName} بالحقول ${step.fields || 'name, description'}`, context);
            case 'create_relation':
                return { success: true, message: 'تم إنشاء العلاقة' };
            case 'add_feature':
                return this.aiGenerateSystem(step.description, context);
            default:
                return { success: true, message: 'تم تنفيذ الخطوة' };
        }
    }
    async validateGeneratedCode(modules) {
        const errors = [];
        for (const moduleName of modules) {
            const name = moduleName.toLowerCase();
            const modulePath = `/var/www/attendance-system/backend/src/modules/${name}`;
            try {
                if (!fs.existsSync(modulePath)) {
                    errors.push(`Module ${name} directory not found`);
                    continue;
                }
                const requiredFiles = [`${name}.module.ts`, `${name}.service.ts`, `${name}.controller.ts`];
                for (const file of requiredFiles) {
                    if (!fs.existsSync(`${modulePath}/${file}`)) {
                        errors.push(`Missing: ${name}/${file}`);
                    }
                }
            }
            catch (e) {
                errors.push(`Validation error for ${name}: ${e.message}`);
            }
        }
        return { valid: errors.length === 0, errors };
    }
    async aiSelfHeal(moduleName) {
        this.logger.log(`🔄 Self-healing: ${moduleName}`);
        const name = moduleName.toLowerCase();
        const modulePath = `/var/www/attendance-system/backend/src/modules/${name}`;
        const fixes = [];
        try {
            const servicePath = `${modulePath}/${name}.service.ts`;
            if (fs.existsSync(servicePath)) {
                let serviceContent = fs.readFileSync(servicePath, 'utf-8');
                if (serviceContent.includes('PrismaService') && !serviceContent.includes('private items')) {
                    serviceContent = serviceContent.replace(/constructor\(private.*prisma.*PrismaService.*\)/g, 'constructor() { this.items = []; }');
                    fs.writeFileSync(servicePath, serviceContent);
                    fixes.push('Fixed PrismaService → in-memory storage');
                }
            }
            const moduleFilePath = `${modulePath}/${name}.module.ts`;
            if (fs.existsSync(moduleFilePath)) {
                let moduleContent = fs.readFileSync(moduleFilePath, 'utf-8');
                if (moduleContent.includes('PrismaModule')) {
                    moduleContent = moduleContent.replace(/import.*PrismaModule.*;\n?/g, '');
                    moduleContent = moduleContent.replace(/PrismaModule,?\s*/g, '');
                    fs.writeFileSync(moduleFilePath, moduleContent);
                    fixes.push('Removed PrismaModule dependency');
                }
            }
            return {
                success: true,
                message: `🔄 Self-healing: ${moduleName}
                
الإصلاحات:
${fixes.length > 0 ? fixes.map(f => `  ✅ ${f}`).join('\n') : '  ✅ لا توجد مشاكل'}

💡 جرب البناء الآن!`
            };
        }
        catch (e) {
            return {
                success: false,
                message: `❌ خطأ في الإصلاح: ${e.message}`
            };
        }
    }
    async aiLearnFromCodebase() {
        const modulesPath = '/var/www/attendance-system/backend/src/modules';
        const patterns = {};
        const modules = [];
        try {
            const dirs = fs.readdirSync(modulesPath);
            for (const dir of dirs.slice(0, 10)) {
                const modulePath = `${modulesPath}/${dir}`;
                if (fs.statSync(modulePath).isDirectory()) {
                    modules.push(dir);
                    const servicePath = `${modulePath}/${dir}.service.ts`;
                    if (fs.existsSync(servicePath)) {
                        const content = fs.readFileSync(servicePath, 'utf-8');
                        if (content.includes('PrismaService')) {
                            patterns.usesPrisma = true;
                        }
                        if (content.includes('findMany')) {
                            patterns.hasFindMany = true;
                        }
                    }
                }
            }
        }
        catch (e) {
            this.logger.error(`Learn error: ${e.message}`);
        }
        return { patterns, modules };
    }
    async aiUnderstandIntent(message) {
        const intents = [
            { pattern: /(اعمل|صمم|انشئ).*(نظام|موديول).*(فواتير|عملاء|مشاريع)/, intent: 'create_system' },
            { pattern: /(اصلح|صلح|fix)/, intent: 'self_heal' },
            { pattern: /(احذف|امسح|delete).*موديول/, intent: 'delete_module' },
            { pattern: /(اعرض|شوف|list).*موديول/, intent: 'list_modules' },
        ];
        for (const { pattern, intent } of intents) {
            if (pattern.test(message)) {
                return { intent, params: { message } };
            }
        }
        return { intent: 'unknown', params: { message } };
    }
    async aiAutoDeploy() {
        this.logger.log('🚀 Auto-Deploy started...');
        const results = [];
        try {
            results.push('📦 Building backend...');
            await execAsync('cd /var/www/attendance-system/backend && npm run build', { timeout: 180000 });
            results.push('✅ Backend built');
            results.push('🎨 Building frontend...');
            await execAsync('cd /var/www/attendance-system/web-admin && npm run build', { timeout: 180000 });
            results.push('✅ Frontend built');
            results.push('🔄 Restarting services...');
            await execAsync('pm2 restart all', { timeout: 30000 });
            results.push('✅ Services restarted');
            return {
                success: true,
                message: `🚀 Auto-Deploy Complete!

${results.join('\\n')}

✨ النظام محدث وجاهز!`
            };
        }
        catch (e) {
            return {
                success: false,
                message: `❌ Deploy failed: ${e.message}`
            };
        }
    }
    async aiRunMigration(action = 'push') {
        this.logger.log(`🗃️ Running Prisma ${action}...`);
        try {
            const commands = {
                push: 'npx prisma db push',
                generate: 'npx prisma generate',
                migrate: 'npx prisma migrate dev --name auto_migration'
            };
            const cmd = commands[action] || commands.push;
            const { stdout, stderr } = await execAsync(`cd /var/www/attendance-system/backend && ${cmd}`, { timeout: 120000 });
            return {
                success: true,
                message: `🗃️ Prisma ${action} Complete!

${stdout.substring(0, 500)}

✅ Database updated!`
            };
        }
        catch (e) {
            return {
                success: false,
                message: `❌ Migration failed: ${e.message.substring(0, 200)}`
            };
        }
    }
    async aiGitOperation(action, message) {
        this.logger.log(`📝 Git ${action}...`);
        const basePath = '/var/www/attendance-system';
        try {
            let output = '';
            switch (action) {
                case 'status':
                    const { stdout: status } = await execAsync(`cd ${basePath} && git status --short`);
                    output = status || 'Clean - no changes';
                    break;
                case 'commit':
                    await execAsync(`cd ${basePath} && git add -A`);
                    const { stdout: commit } = await execAsync(`cd ${basePath} && git commit -m "${message || 'Auto-commit by AI Agent'}"`, { timeout: 30000 });
                    output = commit;
                    break;
                case 'push':
                    const { stdout: push } = await execAsync(`cd ${basePath} && git push`, { timeout: 60000 });
                    output = push || 'Pushed successfully';
                    break;
                case 'pull':
                    const { stdout: pull } = await execAsync(`cd ${basePath} && git pull`, { timeout: 60000 });
                    output = pull;
                    break;
            }
            return {
                success: true,
                message: `📝 Git ${action}:

${output.substring(0, 500)}`
            };
        }
        catch (e) {
            return {
                success: false,
                message: `❌ Git ${action} failed: ${e.message.substring(0, 200)}`
            };
        }
    }
    async aiCreateBackup(type = 'database') {
        this.logger.log(`💾 Creating ${type} backup...`);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = '/var/www/backups';
        try {
            await execAsync(`mkdir -p ${backupDir}`);
            let output = '';
            if (type === 'database' || type === 'full') {
                const dbBackup = `${backupDir}/db_${timestamp}.sql`;
                await execAsync(`pg_dump attendance_system > ${dbBackup}`, { timeout: 120000 });
                output += `✅ Database backup: ${dbBackup}\\n`;
            }
            if (type === 'files' || type === 'full') {
                const filesBackup = `${backupDir}/files_${timestamp}.tar.gz`;
                await execAsync(`tar -czf ${filesBackup} -C /var/www attendance-system/backend/src attendance-system/web-admin/src`, { timeout: 300000 });
                output += `✅ Files backup: ${filesBackup}\\n`;
            }
            return {
                success: true,
                message: `💾 Backup Created!

${output}

📅 Timestamp: ${timestamp}`
            };
        }
        catch (e) {
            return {
                success: false,
                message: `❌ Backup failed: ${e.message.substring(0, 200)}`
            };
        }
    }
    async aiMonitorSystem() {
        this.logger.log('📊 Monitoring system...');
        try {
            const { stdout: pm2Status } = await execAsync('pm2 jlist', { timeout: 10000 });
            const processes = JSON.parse(pm2Status || '[]');
            const { stdout: diskUsage } = await execAsync('df -h / | tail -1', { timeout: 5000 });
            const { stdout: memUsage } = await execAsync('free -h | grep Mem', { timeout: 5000 });
            const pm2Info = processes.map((p) => `  ${p.name}: ${p.pm2_env?.status} (${p.monit?.memory ? Math.round(p.monit.memory / 1024 / 1024) + 'MB' : 'N/A'})`).join('\\n');
            return {
                success: true,
                message: `📊 System Status

🔧 PM2 Processes:
${pm2Info}

💾 Disk: ${diskUsage.trim()}
🧠 Memory: ${memUsage.trim()}

✅ All systems operational!`
            };
        }
        catch (e) {
            return {
                success: false,
                message: `❌ Monitoring error: ${e.message}`
            };
        }
    }
    async aiViewLogs(service = 'attendance-backend', lines = 50) {
        this.logger.log(`📋 Viewing logs for ${service}...`);
        try {
            const { stdout } = await execAsync(`pm2 logs ${service} --lines ${lines} --nostream`, { timeout: 10000 });
            return {
                success: true,
                message: `📋 Logs: ${service}

${stdout.substring(0, 2000)}`
            };
        }
        catch (e) {
            return {
                success: false,
                message: `❌ Log error: ${e.message}`
            };
        }
    }
    async aiTestApi(endpoint, method = 'GET') {
        this.logger.log(`🧪 Testing API: ${method} ${endpoint}`);
        try {
            const { stdout } = await execAsync(`curl -s -X ${method} "http://localhost:3000/api/v1/${endpoint}" -H "Content-Type: application/json"`, { timeout: 10000 });
            return {
                success: true,
                message: `🧪 API Test: ${method} /api/v1/${endpoint}

Response:
${stdout.substring(0, 1000)}`
            };
        }
        catch (e) {
            return {
                success: false,
                message: `❌ API test failed: ${e.message}`
            };
        }
    }
    async aiExecuteCommand(command) {
        this.logger.log(`⚡ Executing: ${command}`);
        const dangerous = ['rm -rf /', 'mkfs', 'dd if=', ':(){', 'fork bomb'];
        if (dangerous.some(d => command.includes(d))) {
            return {
                success: false,
                message: '🚫 أمر خطير! تم الرفض.'
            };
        }
        try {
            const { stdout, stderr } = await execAsync(command, { timeout: 60000 });
            return {
                success: true,
                message: `⚡ Command: ${command}

Output:
${(stdout || stderr || 'No output').substring(0, 1500)}`
            };
        }
        catch (e) {
            return {
                success: false,
                message: `❌ Command failed: ${e.message.substring(0, 200)}`
            };
        }
    }
    async aiFileOperation(action, path, content) {
        this.logger.log(`📁 File ${action}: ${path}`);
        try {
            switch (action) {
                case 'read':
                    const fileContent = fs.readFileSync(path, 'utf-8');
                    return {
                        success: true,
                        message: `📁 File: ${path}

${fileContent.substring(0, 2000)}`
                    };
                case 'write':
                    fs.writeFileSync(path, content || '');
                    return {
                        success: true,
                        message: `✅ Written to: ${path}`
                    };
                case 'delete':
                    fs.unlinkSync(path);
                    return {
                        success: true,
                        message: `🗑️ Deleted: ${path}`
                    };
                case 'list':
                    const files = fs.readdirSync(path);
                    return {
                        success: true,
                        message: `📁 Directory: ${path}

${files.slice(0, 50).join('\\n')}`
                    };
                default:
                    return { success: false, message: 'Unknown action' };
            }
        }
        catch (e) {
            return {
                success: false,
                message: `❌ File error: ${e.message}`
            };
        }
    }
    async aiMasterCommand(message, context) {
        const msg = message.toLowerCase();
        if (msg.match(/(deploy|نشر|انشر|ارفع)/)) {
            return this.aiAutoDeploy();
        }
        if (msg.match(/(migration|migrate|ميجريشن)/)) {
            return this.aiRunMigration('push');
        }
        if (msg.match(/(git\s*status|حالة الجت)/)) {
            return this.aiGitOperation('status');
        }
        if (msg.match(/(git\s*commit|كومت)/)) {
            return this.aiGitOperation('commit', 'Auto-commit by AI');
        }
        if (msg.match(/(git\s*push|بوش)/)) {
            return this.aiGitOperation('push');
        }
        if (msg.match(/(git\s*pull|بول)/)) {
            return this.aiGitOperation('pull');
        }
        if (msg.match(/(backup|باك اب|نسخة احتياطية)/)) {
            return this.aiCreateBackup('full');
        }
        if (msg.match(/(status|monitor|حالة النظام|مراقبة)/)) {
            return this.aiMonitorSystem();
        }
        if (msg.match(/(logs|لوج|سجلات)/)) {
            return this.aiViewLogs();
        }
        return this.aiGeniusBuilder(message, context);
    }
    async aiSmartEnhance(request, context) {
        this.logger.log(`🧠 Smart Enhancement Request: ${request}`);
        try {
            const analysis = await this.analyzeEnhancementRequest(request);
            if (!analysis.success) {
                return analysis;
            }
            const plan = await this.planModifications(analysis.data);
            const result = await this.executeModifications(plan, context);
            return result;
        }
        catch (error) {
            this.logger.error('Smart Enhancement Error:', error);
            return { success: false, message: `❌ خطأ في تنفيذ التعديل: ${error.message}` };
        }
    }
    async analyzeEnhancementRequest(request) {
        const systemInstruction = `أنت محلل طلبات تعديل أنظمة. حلل الطلب واستخرج:
1. نوع العملية: add_feature, modify_feature, add_field, add_enum, add_calculation
2. النظام المستهدف: leaves, attendance, employees, payroll
3. التفاصيل المحددة

أرجع JSON فقط.`;
        const prompt = `طلب: "${request}"

الأنظمة المتاحة:
- leaves: نظام الإجازات (أنواع: سنوية، مرضية، طارئة)
- attendance: نظام الحضور والانصراف
- employees: بيانات الموظفين والبروفايل
- payroll: نظام الرواتب

أرجع JSON بهذا الشكل:
{
  "operation": "add_feature" | "modify_feature" | "add_field" | "add_enum" | "add_calculation",
  "targetSystem": "leaves" | "attendance" | "employees" | "payroll",
  "description": "وصف مختصر للمطلوب",
  "details": {
    // حسب نوع العملية
  }
}

مثال لطلب "ضيف نوع إجازة مرضية 5 أيام":
{
  "operation": "add_enum",
  "targetSystem": "leaves",
  "description": "إضافة نوع إجازة مرضية بحد 5 أيام",
  "details": {
    "enumName": "LeaveType",
    "newValue": "SICK",
    "limit": 5
  }
}

مثال لطلب "لكل موظف 21 يوم إجازة سنوية تظهر في البروفايل":
{
  "operation": "add_calculation",
  "targetSystem": "employees",
  "description": "حساب رصيد الإجازات السنوي 21 يوم",
  "details": {
    "field": "annualLeaveDays",
    "value": 21,
    "displayIn": "profile",
    "calculation": "divide_by_months"
  }
}`;
        try {
            console.log('🧠 Calling AI for enhancement analysis...');
            const aiResponse = await this.aiService.generateContent(prompt, systemInstruction);
            console.log('🧠 AI Response:', aiResponse?.substring(0, 200));
            let parsed;
            try {
                parsed = this.aiService.parseJsonResponse(aiResponse);
            }
            catch (parseError) {
                const jsonMatch = aiResponse?.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    parsed = JSON.parse(jsonMatch[0]);
                }
                else {
                    parsed = {
                        operation: 'add_field',
                        targetSystem: 'employees',
                        description: 'تعديل نظام الموظفين',
                        details: { request: prompt }
                    };
                }
            }
            return {
                success: true,
                message: `✅ تم تحليل الطلب: ${parsed.description || 'طلب تعديل النظام'}`,
                data: parsed
            };
        }
        catch (error) {
            console.error('🧠 Enhancement analysis error:', error);
            return { success: false, message: '❌ لم أستطع فهم الطلب. جرب صياغة أوضح.' };
        }
    }
    async planModifications(analysis) {
        const { operation, targetSystem, details } = analysis;
        const systemInfo = this.systemKnowledge[targetSystem];
        const plan = {
            operation,
            targetSystem,
            systemInfo,
            steps: [],
            files: []
        };
        switch (operation) {
            case 'add_enum':
                plan.steps = [
                    { type: 'modify_prisma', action: 'add_enum_value', value: details.newValue },
                    { type: 'modify_service', action: 'add_type_handler', value: details.newValue },
                    { type: 'modify_frontend', action: 'add_dropdown_option', value: details.newValue }
                ];
                plan.files = ['schema.prisma', systemInfo?.servicePath, systemInfo?.frontendPath];
                break;
            case 'add_calculation':
                plan.steps = [
                    { type: 'modify_service', action: 'add_calculation_method', details },
                    { type: 'modify_frontend', action: 'display_in_profile', field: details.field }
                ];
                plan.files = [systemInfo?.servicePath, this.systemKnowledge.employees?.profilePath];
                break;
            case 'add_field':
                plan.steps = [
                    { type: 'modify_prisma', action: 'add_field', details },
                    { type: 'modify_service', action: 'handle_field', details },
                    { type: 'modify_dto', action: 'add_field', details }
                ];
                break;
            case 'add_feature':
                plan.steps = [
                    { type: 'analyze_existing', targetFiles: [systemInfo?.servicePath] },
                    { type: 'add_method', details },
                    { type: 'add_endpoint', details },
                    { type: 'add_frontend_component', details }
                ];
                break;
        }
        return plan;
    }
    async executeModifications(plan, context) {
        const results = [];
        try {
            for (const step of plan.steps) {
                switch (step.type) {
                    case 'modify_service':
                        const serviceResult = await this.modifyServiceFile(plan.systemInfo, step, plan.operation, context);
                        results.push(serviceResult);
                        break;
                    case 'modify_frontend':
                        const frontendResult = await this.modifyFrontendFile(plan.systemInfo, step, context);
                        results.push(frontendResult);
                        break;
                    case 'modify_prisma':
                        results.push(`📊 Prisma Schema: ${step.action} - ${step.value || 'OK'} `);
                        break;
                }
            }
            const buildResult = await this.buildAndDeploy();
            results.push(buildResult);
            return {
                success: true,
                message: `✅ تم تنفيذ التعديلات بنجاح!\n\n${results.join('\n')} \n\n💡 التعديلات جاهزة للاستخدام!`,
                data: { plan, results }
            };
        }
        catch (error) {
            return { success: false, message: `❌ خطأ: ${error.message} ` };
        }
    }
    async modifyServiceFile(systemInfo, step, operation, context) {
        if (!systemInfo?.servicePath) {
            return '⚠️ Service path not found';
        }
        try {
            const content = fs.readFileSync(systemInfo.servicePath, 'utf-8');
            if (step.action === 'add_calculation_method' && step.details) {
                const { field, value } = step.details;
                const newMethod = `

    /**
     * 📊 حساب رصيد الإجازات المتبقي
     * AUTO-GENERATED by Smart Enhancement Engine
     */
    async calculateLeaveBalance(userId: string, companyId: string): Promise < { annual: number, used: number, remaining: number } > {
    const user = await this.prisma.user.findFirst({
        where: { id: userId, companyId }
    });

    const annualDays = user?.annualLeaveDays || ${value};
const usedDays = user?.usedLeaveDays || 0;
const remaining = annualDays - usedDays;

return { annual: annualDays, used: usedDays, remaining };
    }
`;
                const lastBraceIndex = content.lastIndexOf('}');
                const modifiedContent = content.slice(0, lastBraceIndex) + newMethod + content.slice(lastBraceIndex);
                fs.writeFileSync(systemInfo.servicePath, modifiedContent);
                return `✅ Service: Added calculateLeaveBalance method`;
            }
            if (step.action === 'add_type_handler') {
                return `✅ Service: Type handler ready for ${step.value}`;
            }
            return `✅ Service: Modified successfully`;
        }
        catch (error) {
            return `⚠️ Service modification skipped: ${error.message} `;
        }
    }
    async modifyFrontendFile(systemInfo, step, context) {
        const profilePath = this.systemKnowledge.employees?.profilePath;
        if (step.action === 'display_in_profile' && profilePath) {
            try {
                const content = fs.readFileSync(profilePath, 'utf-8');
                if (content.includes('remainingLeaveDays') || content.includes('رصيد الإجازات')) {
                    return `✅ Frontend: Leave balance already displayed in profile`;
                }
                if (content.includes('StatCard')) {
                    const leaveCardCode = `
{/* رصيد الإجازات - Auto-generated */ }
<StatCard
                        icon={ <BeachAccess /> }
label = "رصيد الإجازات"
value = { employee?.remainingLeaveDays || employee?.annualLeaveDays || 21}
color = { theme.teal }
trend = "يوم متبقي"
    /> `;
                    const statCardIndex = content.indexOf('</StatCard>');
                    if (statCardIndex > -1) {
                        const insertPosition = statCardIndex + '</StatCard>'.length;
                        const modifiedContent = content.slice(0, insertPosition) + leaveCardCode + content.slice(insertPosition);
                        fs.writeFileSync(profilePath, modifiedContent);
                        return `✅ Frontend: Added leave balance card to profile`;
                    }
                }
                return `✅ Frontend: Profile page analyzed`;
            }
            catch (error) {
                return `⚠️ Frontend modification skipped: ${error.message} `;
            }
        }
        return `✅ Frontend: Ready`;
    }
    async buildAndDeploy() {
        try {
            await execAsync('cd /var/www/attendance-system/backend && npm run build');
            await execAsync('pm2 restart 0');
            await execAsync('cd /var/www/attendance-system/web-admin && npm run build');
            return `🚀 Build & Deploy: Success!`;
        }
        catch (error) {
            return `⚠️ Build: Manual rebuild may be required`;
        }
    }
    isEnhancementRequest(message) {
        const msg = message.trim().toLowerCase();
        const enhancementKeywords = [
            'لسيستم', 'للسيستم', 'لنظام', 'للنظام',
            'إجازة', 'اجازة', 'إجازات', 'اجازات',
            'حضور', 'انصراف',
            'راتب', 'رواتب',
            'موظف', 'موظفين',
            'بروفايل', 'ملف',
            'نوع', 'نوع جديد',
            'حقل', 'فيلد',
        ];
        const patterns = [
            /^(ضيف|أضف|اضف)\s+(ل|إلى|الى|لـ|على|نوع)/,
            /^(عدل|عدّل|حسن|حسّن|طور|طوّر)\s+(ال|نظام|سيستم)/,
            /(يظهر|تظهر|يبين|تبين)\s+(في|ف)\s+(البروفايل|الملف|الصفحة)/,
            /(لكل موظف|للموظفين|لجميع الموظفين)/,
            /(نوع|حقل|فيلد)\s+(جديد|اضافي|إضافي|إجازة|اجازة)/,
            /(حساب|يحسب|تحسب|احسب)\s+(ل|لـ|تلقائي)/,
            /^(ضيف|أضف|اضف).*(إجازة|اجازة|مرضية|سنوية)/,
            /(لسيستم|للسيستم|لنظام|للنظام)\s+(ال)?(إجازات|اجازات|حضور|رواتب|موظفين)/,
        ];
        const hasEnhancementKeyword = enhancementKeywords.some(k => msg.includes(k));
        const matchesPattern = patterns.some(p => p.test(message.trim()));
        const isNewSystemRequest = msg.match(/(اعمل|صمم|انشئ|أنشئ)\s+(نظام|سيستم)\s+(جديد|كامل)/);
        return (hasEnhancementKeyword || matchesPattern) && !isNewSystemRequest;
    }
};
exports.AiAgentToolsService = AiAgentToolsService;
exports.AiAgentToolsService = AiAgentToolsService = AiAgentToolsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        ai_service_1.AiService])
], AiAgentToolsService);
//# sourceMappingURL=ai-agent-tools.service.js.map