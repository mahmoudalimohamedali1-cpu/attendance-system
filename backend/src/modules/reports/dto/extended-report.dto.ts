import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

// ===================== ENUMS =====================

export enum ReportCategory {
    ATTENDANCE = 'ATTENDANCE',
    PAYROLL = 'PAYROLL',
    LEAVES = 'LEAVES',
    HR = 'HR',
    DISCIPLINARY = 'DISCIPLINARY',
    CUSTODY = 'CUSTODY',
    EXECUTIVE = 'EXECUTIVE',
}

export enum ReportPeriod {
    DAILY = 'DAILY',
    WEEKLY = 'WEEKLY',
    MONTHLY = 'MONTHLY',
    QUARTERLY = 'QUARTERLY',
    YEARLY = 'YEARLY',
    CUSTOM = 'CUSTOM',
}

export enum ExportFormat {
    JSON = 'JSON',
    EXCEL = 'EXCEL',
    PDF = 'PDF',
    CSV = 'CSV',
}

// ===================== BASE QUERY DTO =====================

export class ExtendedReportQueryDto {
    @ApiPropertyOptional({ description: 'تاريخ البداية' })
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @ApiPropertyOptional({ description: 'تاريخ النهاية' })
    @IsOptional()
    @IsDateString()
    endDate?: string;

    @ApiPropertyOptional({ description: 'معرف الفرع' })
    @IsOptional()
    @IsString()
    branchId?: string;

    @ApiPropertyOptional({ description: 'معرف القسم' })
    @IsOptional()
    @IsString()
    departmentId?: string;

    @ApiPropertyOptional({ description: 'معرف الموظف' })
    @IsOptional()
    @IsString()
    userId?: string;

    @ApiPropertyOptional({ description: 'الفترة', enum: ReportPeriod })
    @IsOptional()
    @IsEnum(ReportPeriod)
    period?: ReportPeriod;

    @ApiPropertyOptional({ description: 'رقم الصفحة', default: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({ description: 'حجم الصفحة', default: 50 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(500)
    limit?: number = 50;

    @ApiPropertyOptional({ description: 'الترتيب حسب' })
    @IsOptional()
    @IsString()
    sortBy?: string;

    @ApiPropertyOptional({ description: 'اتجاه الترتيب', enum: ['asc', 'desc'] })
    @IsOptional()
    @IsString()
    sortOrder?: 'asc' | 'desc' = 'desc';
}

// ===================== ATTENDANCE REPORTS =====================

export class AttendanceDetailedQueryDto extends ExtendedReportQueryDto {
    @ApiPropertyOptional({ description: 'حالة الحضور', enum: ['PRESENT', 'LATE', 'ABSENT', 'ON_LEAVE', 'EARLY_LEAVE'] })
    @IsOptional()
    @IsString()
    status?: string;

    @ApiPropertyOptional({ description: 'العمل من المنزل فقط' })
    @IsOptional()
    isWorkFromHome?: boolean;
}

export class LateReportQueryDto extends ExtendedReportQueryDto {
    @ApiPropertyOptional({ description: 'الحد الأدنى لدقائق التأخير' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    minLateMinutes?: number;

    @ApiPropertyOptional({ description: 'الحد الأقصى لدقائق التأخير' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    maxLateMinutes?: number;
}

export class OvertimeReportQueryDto extends ExtendedReportQueryDto {
    @ApiPropertyOptional({ description: 'الحد الأدنى لساعات العمل الإضافي' })
    @IsOptional()
    @Type(() => Number)
    minOvertimeHours?: number;
}

// ===================== PAYROLL REPORTS =====================

export class PayrollReportQueryDto extends ExtendedReportQueryDto {
    @ApiPropertyOptional({ description: 'السنة' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    year?: number;

    @ApiPropertyOptional({ description: 'الشهر' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(12)
    month?: number;

    @ApiPropertyOptional({ description: 'معرف مسير الرواتب' })
    @IsOptional()
    @IsString()
    payrollRunId?: string;
}

export class AdvanceReportQueryDto extends ExtendedReportQueryDto {
    @ApiPropertyOptional({ description: 'حالة السلفة', enum: ['PENDING', 'APPROVED', 'REJECTED', 'PAID', 'COMPLETED'] })
    @IsOptional()
    @IsString()
    status?: string;
}

// ===================== LEAVE REPORTS =====================

export class LeaveReportQueryDto extends ExtendedReportQueryDto {
    @ApiPropertyOptional({ description: 'نوع الإجازة' })
    @IsOptional()
    @IsString()
    leaveType?: string;

    @ApiPropertyOptional({ description: 'حالة الطلب' })
    @IsOptional()
    @IsString()
    status?: string;
}

// ===================== HR REPORTS =====================

export class EmployeeReportQueryDto extends ExtendedReportQueryDto {
    @ApiPropertyOptional({ description: 'حالة الموظف', enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'] })
    @IsOptional()
    @IsString()
    status?: string;

    @ApiPropertyOptional({ description: 'الجنسية' })
    @IsOptional()
    @IsString()
    nationality?: string;

    @ApiPropertyOptional({ description: 'سعودي فقط' })
    @IsOptional()
    isSaudi?: boolean;

    @ApiPropertyOptional({ description: 'نوع العقد' })
    @IsOptional()
    @IsString()
    contractType?: string;
}

export class ContractExpiryQueryDto extends ExtendedReportQueryDto {
    @ApiPropertyOptional({ description: 'أيام قبل الانتهاء' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    daysBeforeExpiry?: number = 30;
}

export class DocumentExpiryQueryDto extends ExtendedReportQueryDto {
    @ApiPropertyOptional({ description: 'نوع الوثيقة', enum: ['IQAMA', 'PASSPORT', 'LICENSE'] })
    @IsOptional()
    @IsString()
    documentType?: string;

    @ApiPropertyOptional({ description: 'أيام قبل الانتهاء' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    daysBeforeExpiry?: number = 30;
}

// ===================== DISCIPLINARY REPORTS =====================

export class DisciplinaryReportQueryDto extends ExtendedReportQueryDto {
    @ApiPropertyOptional({ description: 'حالة القضية' })
    @IsOptional()
    @IsString()
    caseStatus?: string;

    @ApiPropertyOptional({ description: 'نوع المخالفة' })
    @IsOptional()
    @IsString()
    violationType?: string;
}

// ===================== CUSTODY REPORTS =====================

export class CustodyReportQueryDto extends ExtendedReportQueryDto {
    @ApiPropertyOptional({ description: 'حالة العهدة' })
    @IsOptional()
    @IsString()
    status?: string;

    @ApiPropertyOptional({ description: 'فئة العهدة' })
    @IsOptional()
    @IsString()
    categoryId?: string;
}

// ===================== RESPONSE INTERFACES =====================

export interface ReportMetadata {
    reportName: string;
    reportNameEn: string;
    generatedAt: Date;
    filters: Record<string, any>;
    totalCount: number;
    page?: number;
    limit?: number;
    totalPages?: number;
}

export interface PaginatedReportResponse<T> {
    metadata: ReportMetadata;
    data: T[];
    summary?: Record<string, any>;
}

export interface ChartDataPoint {
    label: string;
    value: number;
    color?: string;
}

export interface KPIData {
    name: string;
    nameEn: string;
    value: number;
    target?: number;
    unit: string;
    trend?: 'up' | 'down' | 'stable';
    changePercent?: number;
}

export interface ExecutiveDashboardData {
    kpis: KPIData[];
    alerts: AlertItem[];
    charts: {
        attendanceTrend: ChartDataPoint[];
        payrollDistribution: ChartDataPoint[];
        leaveDistribution: ChartDataPoint[];
        employeesByDepartment: ChartDataPoint[];
    };
    quickStats: {
        totalEmployees: number;
        activeEmployees: number;
        presentToday: number;
        onLeaveToday: number;
        pendingRequests: number;
        upcomingExpiries: number;
    };
}

export interface AlertItem {
    id: string;
    type: 'WARNING' | 'DANGER' | 'INFO';
    title: string;
    titleEn: string;
    message: string;
    messageEn: string;
    entityType?: string;
    entityId?: string;
    createdAt: Date;
}

// ===================== REPORT CATALOG =====================

export interface ReportDefinition {
    id: string;
    name: string;
    nameEn: string;
    description: string;
    descriptionEn: string;
    category: ReportCategory;
    endpoint: string;
    icon: string;
    supportsExport: ExportFormat[];
    requiredPermission: string;
}

export const REPORTS_CATALOG: ReportDefinition[] = [
    // ===== ATTENDANCE REPORTS =====
    { id: 'daily-attendance', name: 'تقرير الحضور اليومي', nameEn: 'Daily Attendance Report', description: 'بيانات الحضور لليوم', descriptionEn: 'Daily attendance data', category: ReportCategory.ATTENDANCE, endpoint: '/reports/attendance/daily', icon: 'CalendarToday', supportsExport: [ExportFormat.EXCEL, ExportFormat.PDF], requiredPermission: 'REPORTS_VIEW' },
    { id: 'late-detailed', name: 'تقرير التأخيرات التفصيلي', nameEn: 'Late Arrivals Detailed Report', description: 'تفاصيل تأخيرات الموظفين', descriptionEn: 'Employee late arrivals details', category: ReportCategory.ATTENDANCE, endpoint: '/reports/attendance/late-detailed', icon: 'AccessTime', supportsExport: [ExportFormat.EXCEL, ExportFormat.PDF], requiredPermission: 'REPORTS_VIEW' },
    { id: 'absence', name: 'تقرير الغياب', nameEn: 'Absence Report', description: 'سجل الغياب وتحليل الأنماط', descriptionEn: 'Absence records and patterns', category: ReportCategory.ATTENDANCE, endpoint: '/reports/attendance/absence', icon: 'PersonOff', supportsExport: [ExportFormat.EXCEL, ExportFormat.PDF], requiredPermission: 'REPORTS_VIEW' },
    { id: 'early-leave', name: 'تقرير الانصراف المبكر', nameEn: 'Early Leave Report', description: 'من خرج قبل الوقت', descriptionEn: 'Early departures', category: ReportCategory.ATTENDANCE, endpoint: '/reports/attendance/early-leave', icon: 'ExitToApp', supportsExport: [ExportFormat.EXCEL, ExportFormat.PDF], requiredPermission: 'REPORTS_VIEW' },
    { id: 'overtime', name: 'تقرير العمل الإضافي', nameEn: 'Overtime Report', description: 'ساعات العمل الإضافي', descriptionEn: 'Overtime hours', category: ReportCategory.ATTENDANCE, endpoint: '/reports/attendance/overtime', icon: 'MoreTime', supportsExport: [ExportFormat.EXCEL, ExportFormat.PDF], requiredPermission: 'REPORTS_VIEW' },
    { id: 'wfh', name: 'تقرير العمل من المنزل', nameEn: 'Work From Home Report', description: 'أيام العمل عن بُعد', descriptionEn: 'Remote work days', category: ReportCategory.ATTENDANCE, endpoint: '/reports/attendance/work-from-home', icon: 'Home', supportsExport: [ExportFormat.EXCEL, ExportFormat.PDF], requiredPermission: 'REPORTS_VIEW' },
    { id: 'branch-summary', name: 'ملخص الفرع', nameEn: 'Branch Summary', description: 'إحصائيات حسب الفرع', descriptionEn: 'Statistics by branch', category: ReportCategory.ATTENDANCE, endpoint: '/reports/attendance/by-branch', icon: 'Business', supportsExport: [ExportFormat.EXCEL, ExportFormat.PDF], requiredPermission: 'REPORTS_VIEW' },
    { id: 'department-summary', name: 'ملخص القسم', nameEn: 'Department Summary', description: 'إحصائيات حسب القسم', descriptionEn: 'Statistics by department', category: ReportCategory.ATTENDANCE, endpoint: '/reports/attendance/by-department', icon: 'AccountTree', supportsExport: [ExportFormat.EXCEL, ExportFormat.PDF], requiredPermission: 'REPORTS_VIEW' },
    { id: 'compliance', name: 'تقرير الالتزام', nameEn: 'Compliance Report', description: 'نسب الالتزام بالدوام', descriptionEn: 'Attendance compliance rates', category: ReportCategory.ATTENDANCE, endpoint: '/reports/attendance/compliance', icon: 'VerifiedUser', supportsExport: [ExportFormat.EXCEL, ExportFormat.PDF], requiredPermission: 'REPORTS_VIEW' },
    { id: 'suspicious', name: 'المحاولات المشبوهة', nameEn: 'Suspicious Attempts', description: 'محاولات التلاعب', descriptionEn: 'Tampering attempts', category: ReportCategory.ATTENDANCE, endpoint: '/reports/attendance/suspicious', icon: 'Warning', supportsExport: [ExportFormat.EXCEL, ExportFormat.PDF], requiredPermission: 'REPORTS_VIEW' },

    // ===== PAYROLL REPORTS =====
    { id: 'payroll-summary', name: 'ملخص الرواتب الشهري', nameEn: 'Monthly Payroll Summary', description: 'إجمالي الرواتب والخصومات', descriptionEn: 'Total salaries and deductions', category: ReportCategory.PAYROLL, endpoint: '/reports/payroll/summary', icon: 'Payments', supportsExport: [ExportFormat.EXCEL, ExportFormat.PDF], requiredPermission: 'PAYROLL_VIEW' },
    { id: 'payslip-details', name: 'تفاصيل قسائم الرواتب', nameEn: 'Payslip Details', description: 'تفاصيل كل قسيمة', descriptionEn: 'Each payslip details', category: ReportCategory.PAYROLL, endpoint: '/reports/payroll/payslips', icon: 'Receipt', supportsExport: [ExportFormat.EXCEL, ExportFormat.PDF], requiredPermission: 'PAYROLL_VIEW' },
    { id: 'late-deductions', name: 'خصومات التأخير', nameEn: 'Late Deductions', description: 'خصومات بسبب التأخير', descriptionEn: 'Deductions for lateness', category: ReportCategory.PAYROLL, endpoint: '/reports/payroll/late-deductions', icon: 'MoneyOff', supportsExport: [ExportFormat.EXCEL, ExportFormat.PDF], requiredPermission: 'PAYROLL_VIEW' },
    { id: 'absence-deductions', name: 'خصومات الغياب', nameEn: 'Absence Deductions', description: 'خصومات الغياب التفصيلية', descriptionEn: 'Detailed absence deductions', category: ReportCategory.PAYROLL, endpoint: '/reports/payroll/absence-deductions', icon: 'EventBusy', supportsExport: [ExportFormat.EXCEL, ExportFormat.PDF], requiredPermission: 'PAYROLL_VIEW' },
    { id: 'overtime-allowances', name: 'بدلات العمل الإضافي', nameEn: 'Overtime Allowances', description: 'بدلات الأوفرتايم', descriptionEn: 'Overtime allowances', category: ReportCategory.PAYROLL, endpoint: '/reports/payroll/overtime-allowances', icon: 'AttachMoney', supportsExport: [ExportFormat.EXCEL, ExportFormat.PDF], requiredPermission: 'PAYROLL_VIEW' },
    { id: 'gosi', name: 'تقرير التأمينات GOSI', nameEn: 'GOSI Report', description: 'مساهمات التأمينات', descriptionEn: 'GOSI contributions', category: ReportCategory.PAYROLL, endpoint: '/reports/payroll/gosi', icon: 'Security', supportsExport: [ExportFormat.EXCEL, ExportFormat.PDF], requiredPermission: 'PAYROLL_VIEW' },
    { id: 'wps', name: 'تقرير WPS', nameEn: 'WPS Report', description: 'ملف البنك للرواتب', descriptionEn: 'Bank file for salaries', category: ReportCategory.PAYROLL, endpoint: '/reports/payroll/wps', icon: 'AccountBalance', supportsExport: [ExportFormat.EXCEL, ExportFormat.CSV], requiredPermission: 'PAYROLL_VIEW' },
    { id: 'advances', name: 'السلف والقروض', nameEn: 'Advances & Loans', description: 'السلف المعتمدة والمتبقي', descriptionEn: 'Approved advances and remaining', category: ReportCategory.PAYROLL, endpoint: '/reports/payroll/advances', icon: 'CreditCard', supportsExport: [ExportFormat.EXCEL, ExportFormat.PDF], requiredPermission: 'PAYROLL_VIEW' },
    { id: 'raises', name: 'تقرير الزيادات', nameEn: 'Raises Report', description: 'زيادات الرواتب والمكافآت', descriptionEn: 'Salary raises and bonuses', category: ReportCategory.PAYROLL, endpoint: '/reports/payroll/raises', icon: 'TrendingUp', supportsExport: [ExportFormat.EXCEL, ExportFormat.PDF], requiredPermission: 'PAYROLL_VIEW' },
    { id: 'payroll-comparison', name: 'مقارنة الرواتب', nameEn: 'Payroll Comparison', description: 'مقارنة بين الفترات', descriptionEn: 'Period comparison', category: ReportCategory.PAYROLL, endpoint: '/reports/payroll/comparison', icon: 'CompareArrows', supportsExport: [ExportFormat.EXCEL, ExportFormat.PDF], requiredPermission: 'PAYROLL_VIEW' },
    { id: 'employee-cost', name: 'تكلفة الموظف', nameEn: 'Employee Cost', description: 'إجمالي تكلفة كل موظف', descriptionEn: 'Total cost per employee', category: ReportCategory.PAYROLL, endpoint: '/reports/payroll/employee-cost', icon: 'PriceCheck', supportsExport: [ExportFormat.EXCEL, ExportFormat.PDF], requiredPermission: 'PAYROLL_VIEW' },
    { id: 'retro-pay', name: 'التسويات بأثر رجعي', nameEn: 'Retro Payments', description: 'سجل التسويات', descriptionEn: 'Retro payments record', category: ReportCategory.PAYROLL, endpoint: '/reports/payroll/retro', icon: 'History', supportsExport: [ExportFormat.EXCEL, ExportFormat.PDF], requiredPermission: 'PAYROLL_VIEW' },

    // ===== LEAVE REPORTS =====
    { id: 'leave-balance', name: 'رصيد الإجازات', nameEn: 'Leave Balance', description: 'أرصدة الإجازات لكل موظف', descriptionEn: 'Leave balances per employee', category: ReportCategory.LEAVES, endpoint: '/reports/leaves/balance', icon: 'EventAvailable', supportsExport: [ExportFormat.EXCEL, ExportFormat.PDF], requiredPermission: 'LEAVES_VIEW' },
    { id: 'leave-requests', name: 'طلبات الإجازات', nameEn: 'Leave Requests', description: 'حالة طلبات الإجازات', descriptionEn: 'Leave requests status', category: ReportCategory.LEAVES, endpoint: '/reports/leaves/requests', icon: 'ListAlt', supportsExport: [ExportFormat.EXCEL, ExportFormat.PDF], requiredPermission: 'LEAVES_VIEW' },
    { id: 'annual-consumption', name: 'استهلاك الإجازات', nameEn: 'Annual Consumption', description: 'تحليل استخدام الإجازات', descriptionEn: 'Leave usage analysis', category: ReportCategory.LEAVES, endpoint: '/reports/leaves/consumption', icon: 'DonutLarge', supportsExport: [ExportFormat.EXCEL, ExportFormat.PDF], requiredPermission: 'LEAVES_VIEW' },
    { id: 'sick-leaves', name: 'الإجازات المرضية', nameEn: 'Sick Leaves', description: 'سجل الإجازات المرضية', descriptionEn: 'Sick leave records', category: ReportCategory.LEAVES, endpoint: '/reports/leaves/sick', icon: 'LocalHospital', supportsExport: [ExportFormat.EXCEL, ExportFormat.PDF], requiredPermission: 'LEAVES_VIEW' },
    { id: 'leaves-by-type', name: 'الإجازات حسب النوع', nameEn: 'Leaves by Type', description: 'توزيع الإجازات', descriptionEn: 'Leave distribution', category: ReportCategory.LEAVES, endpoint: '/reports/leaves/by-type', icon: 'PieChart', supportsExport: [ExportFormat.EXCEL, ExportFormat.PDF], requiredPermission: 'LEAVES_VIEW' },
    { id: 'unjustified-absence', name: 'الغياب غير المبرر', nameEn: 'Unjustified Absence', description: 'غياب بدون إجازة', descriptionEn: 'Absence without leave', category: ReportCategory.LEAVES, endpoint: '/reports/leaves/unjustified', icon: 'ReportProblem', supportsExport: [ExportFormat.EXCEL, ExportFormat.PDF], requiredPermission: 'LEAVES_VIEW' },
    { id: 'carried-forward', name: 'الإجازات المتراكمة', nameEn: 'Carried Forward', description: 'الإجازات المرحّلة', descriptionEn: 'Carried forward leaves', category: ReportCategory.LEAVES, endpoint: '/reports/leaves/carried-forward', icon: 'EventRepeat', supportsExport: [ExportFormat.EXCEL, ExportFormat.PDF], requiredPermission: 'LEAVES_VIEW' },
    { id: 'leave-forecast', name: 'توقعات الإجازات', nameEn: 'Leave Forecast', description: 'المواعيد المتوقعة', descriptionEn: 'Expected dates', category: ReportCategory.LEAVES, endpoint: '/reports/leaves/forecast', icon: 'CalendarMonth', supportsExport: [ExportFormat.EXCEL, ExportFormat.PDF], requiredPermission: 'LEAVES_VIEW' },

    // ===== HR REPORTS =====
    { id: 'employee-list', name: 'سجل الموظفين', nameEn: 'Employee List', description: 'قائمة كاملة بالموظفين', descriptionEn: 'Complete employee list', category: ReportCategory.HR, endpoint: '/reports/hr/employees', icon: 'Groups', supportsExport: [ExportFormat.EXCEL, ExportFormat.PDF], requiredPermission: 'USERS_VIEW' },
    { id: 'new-hires', name: 'التوظيف الجديد', nameEn: 'New Hires', description: 'الموظفين الجدد', descriptionEn: 'New employees', category: ReportCategory.HR, endpoint: '/reports/hr/new-hires', icon: 'PersonAdd', supportsExport: [ExportFormat.EXCEL, ExportFormat.PDF], requiredPermission: 'USERS_VIEW' },
    { id: 'contract-expiry', name: 'انتهاء العقود', nameEn: 'Contract Expiry', description: 'العقود القريبة للانتهاء', descriptionEn: 'Expiring contracts', category: ReportCategory.HR, endpoint: '/reports/hr/contract-expiry', icon: 'WorkOff', supportsExport: [ExportFormat.EXCEL, ExportFormat.PDF], requiredPermission: 'USERS_VIEW' },
    { id: 'employee-distribution', name: 'توزيع الموظفين', nameEn: 'Employee Distribution', description: 'توزيع حسب الفرع/القسم', descriptionEn: 'Distribution by branch/dept', category: ReportCategory.HR, endpoint: '/reports/hr/distribution', icon: 'AccountTree', supportsExport: [ExportFormat.EXCEL, ExportFormat.PDF], requiredPermission: 'USERS_VIEW' },
    { id: 'nationality-analysis', name: 'تحليل الجنسيات', nameEn: 'Nationality Analysis', description: 'توزيع حسب الجنسية', descriptionEn: 'Distribution by nationality', category: ReportCategory.HR, endpoint: '/reports/hr/nationalities', icon: 'Public', supportsExport: [ExportFormat.EXCEL, ExportFormat.PDF], requiredPermission: 'USERS_VIEW' },
    { id: 'iqama-expiry', name: 'انتهاء الإقامات', nameEn: 'Iqama Expiry', description: 'الإقامات القريبة للانتهاء', descriptionEn: 'Expiring Iqamas', category: ReportCategory.HR, endpoint: '/reports/hr/iqama-expiry', icon: 'Badge', supportsExport: [ExportFormat.EXCEL, ExportFormat.PDF], requiredPermission: 'USERS_VIEW' },
    { id: 'passport-expiry', name: 'انتهاء الجوازات', nameEn: 'Passport Expiry', description: 'الجوازات القريبة للانتهاء', descriptionEn: 'Expiring passports', category: ReportCategory.HR, endpoint: '/reports/hr/passport-expiry', icon: 'CardTravel', supportsExport: [ExportFormat.EXCEL, ExportFormat.PDF], requiredPermission: 'USERS_VIEW' },
    { id: 'promotions', name: 'تقرير الترقيات', nameEn: 'Promotions Report', description: 'سجل الترقيات', descriptionEn: 'Promotions record', category: ReportCategory.HR, endpoint: '/reports/hr/promotions', icon: 'ArrowUpward', supportsExport: [ExportFormat.EXCEL, ExportFormat.PDF], requiredPermission: 'USERS_VIEW' },
    { id: 'turnover', name: 'معدل دوران الموظفين', nameEn: 'Turnover Rate', description: 'تحليل الدوران', descriptionEn: 'Turnover analysis', category: ReportCategory.HR, endpoint: '/reports/hr/turnover', icon: 'SwapHoriz', supportsExport: [ExportFormat.EXCEL, ExportFormat.PDF], requiredPermission: 'USERS_VIEW' },
    { id: 'demographics', name: 'التحليل الديموغرافي', nameEn: 'Demographics', description: 'تحليل الأعمار والخبرات', descriptionEn: 'Age and experience analysis', category: ReportCategory.HR, endpoint: '/reports/hr/demographics', icon: 'Analytics', supportsExport: [ExportFormat.EXCEL, ExportFormat.PDF], requiredPermission: 'USERS_VIEW' },

    // ===== DISCIPLINARY REPORTS =====
    { id: 'disciplinary-cases', name: 'القضايا التأديبية', nameEn: 'Disciplinary Cases', description: 'جميع القضايا وحالاتها', descriptionEn: 'All cases and statuses', category: ReportCategory.DISCIPLINARY, endpoint: '/reports/disciplinary/cases', icon: 'Gavel', supportsExport: [ExportFormat.EXCEL, ExportFormat.PDF], requiredPermission: 'DISCIPLINARY_VIEW' },
    { id: 'violations-by-type', name: 'المخالفات حسب النوع', nameEn: 'Violations by Type', description: 'توزيع المخالفات', descriptionEn: 'Violations distribution', category: ReportCategory.DISCIPLINARY, endpoint: '/reports/disciplinary/violations', icon: 'Error', supportsExport: [ExportFormat.EXCEL, ExportFormat.PDF], requiredPermission: 'DISCIPLINARY_VIEW' },
    { id: 'penalties', name: 'العقوبات المطبقة', nameEn: 'Applied Penalties', description: 'سجل العقوبات', descriptionEn: 'Penalties record', category: ReportCategory.DISCIPLINARY, endpoint: '/reports/disciplinary/penalties', icon: 'Block', supportsExport: [ExportFormat.EXCEL, ExportFormat.PDF], requiredPermission: 'DISCIPLINARY_VIEW' },
    { id: 'investigations', name: 'تقرير التحقيقات', nameEn: 'Investigations Report', description: 'التحقيقات الجارية والمنتهية', descriptionEn: 'Ongoing and completed investigations', category: ReportCategory.DISCIPLINARY, endpoint: '/reports/disciplinary/investigations', icon: 'Search', supportsExport: [ExportFormat.EXCEL, ExportFormat.PDF], requiredPermission: 'DISCIPLINARY_VIEW' },
    { id: 'employee-record', name: 'السجل التأديبي', nameEn: 'Employee Disciplinary Record', description: 'السجل التأديبي لكل موظف', descriptionEn: 'Disciplinary record per employee', category: ReportCategory.DISCIPLINARY, endpoint: '/reports/disciplinary/employee-record', icon: 'PersonOff', supportsExport: [ExportFormat.EXCEL, ExportFormat.PDF], requiredPermission: 'DISCIPLINARY_VIEW' },
    { id: 'warnings', name: 'تقرير الإنذارات', nameEn: 'Warnings Report', description: 'الإنذارات الصادرة', descriptionEn: 'Issued warnings', category: ReportCategory.DISCIPLINARY, endpoint: '/reports/disciplinary/warnings', icon: 'NotificationImportant', supportsExport: [ExportFormat.EXCEL, ExportFormat.PDF], requiredPermission: 'DISCIPLINARY_VIEW' },

    // ===== CUSTODY REPORTS =====
    { id: 'custody-inventory', name: 'جرد العهد', nameEn: 'Custody Inventory', description: 'كل العهد وحالاتها', descriptionEn: 'All custody and statuses', category: ReportCategory.CUSTODY, endpoint: '/reports/custody/inventory', icon: 'Inventory', supportsExport: [ExportFormat.EXCEL, ExportFormat.PDF], requiredPermission: 'CUSTODY_VIEW' },
    { id: 'custody-by-employee', name: 'عهد الموظفين', nameEn: 'Custody by Employee', description: 'العهد حسب الموظف', descriptionEn: 'Custody by employee', category: ReportCategory.CUSTODY, endpoint: '/reports/custody/by-employee', icon: 'Person', supportsExport: [ExportFormat.EXCEL, ExportFormat.PDF], requiredPermission: 'CUSTODY_VIEW' },
    { id: 'custody-returns', name: 'إرجاع العهد', nameEn: 'Custody Returns', description: 'سجل الإرجاعات', descriptionEn: 'Returns record', category: ReportCategory.CUSTODY, endpoint: '/reports/custody/returns', icon: 'AssignmentReturn', supportsExport: [ExportFormat.EXCEL, ExportFormat.PDF], requiredPermission: 'CUSTODY_VIEW' },
    { id: 'custody-maintenance', name: 'العهد بحاجة للصيانة', nameEn: 'Custody Maintenance', description: 'العهد التي تحتاج صيانة', descriptionEn: 'Custody needing maintenance', category: ReportCategory.CUSTODY, endpoint: '/reports/custody/maintenance', icon: 'Build', supportsExport: [ExportFormat.EXCEL, ExportFormat.PDF], requiredPermission: 'CUSTODY_VIEW' },
    { id: 'asset-value', name: 'قيمة الأصول', nameEn: 'Asset Value', description: 'إجمالي قيمة العهد', descriptionEn: 'Total custody value', category: ReportCategory.CUSTODY, endpoint: '/reports/custody/value', icon: 'PriceCheck', supportsExport: [ExportFormat.EXCEL, ExportFormat.PDF], requiredPermission: 'CUSTODY_VIEW' },

    // ===== EXECUTIVE REPORTS =====
    { id: 'executive-dashboard', name: 'لوحة التحكم التنفيذية', nameEn: 'Executive Dashboard', description: 'ملخص شامل للمدير العام', descriptionEn: 'Comprehensive summary for CEO', category: ReportCategory.EXECUTIVE, endpoint: '/reports/executive/dashboard', icon: 'Dashboard', supportsExport: [ExportFormat.PDF], requiredPermission: 'REPORTS_VIEW' },
    { id: 'risk-alerts', name: 'تنبيهات المخاطر', nameEn: 'Risk Alerts', description: 'تنبيهات ذكية للمشاكل', descriptionEn: 'Smart alerts for issues', category: ReportCategory.EXECUTIVE, endpoint: '/reports/executive/alerts', icon: 'ReportProblem', supportsExport: [ExportFormat.PDF], requiredPermission: 'REPORTS_VIEW' },
    { id: 'kpis', name: 'مؤشرات الأداء', nameEn: 'KPIs', description: 'مؤشرات الأداء الرئيسية', descriptionEn: 'Key Performance Indicators', category: ReportCategory.EXECUTIVE, endpoint: '/reports/executive/kpis', icon: 'Speed', supportsExport: [ExportFormat.PDF], requiredPermission: 'REPORTS_VIEW' },
    { id: 'compliance-score', name: 'تقرير الامتثال', nameEn: 'Compliance Score', description: 'مستوى الامتثال للسياسات', descriptionEn: 'Policy compliance level', category: ReportCategory.EXECUTIVE, endpoint: '/reports/executive/compliance', icon: 'VerifiedUser', supportsExport: [ExportFormat.PDF], requiredPermission: 'REPORTS_VIEW' },
];
