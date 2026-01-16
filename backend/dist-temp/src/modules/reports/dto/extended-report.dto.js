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
exports.REPORTS_CATALOG = exports.CustodyReportQueryDto = exports.DisciplinaryReportQueryDto = exports.DocumentExpiryQueryDto = exports.ContractExpiryQueryDto = exports.EmployeeReportQueryDto = exports.LeaveReportQueryDto = exports.AdvanceReportQueryDto = exports.PayrollReportQueryDto = exports.OvertimeReportQueryDto = exports.LateReportQueryDto = exports.AttendanceDetailedQueryDto = exports.ExtendedReportQueryDto = exports.ExportFormat = exports.ReportPeriod = exports.ReportCategory = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
var ReportCategory;
(function (ReportCategory) {
    ReportCategory["ATTENDANCE"] = "ATTENDANCE";
    ReportCategory["PAYROLL"] = "PAYROLL";
    ReportCategory["LEAVES"] = "LEAVES";
    ReportCategory["HR"] = "HR";
    ReportCategory["DISCIPLINARY"] = "DISCIPLINARY";
    ReportCategory["CUSTODY"] = "CUSTODY";
    ReportCategory["EXECUTIVE"] = "EXECUTIVE";
})(ReportCategory || (exports.ReportCategory = ReportCategory = {}));
var ReportPeriod;
(function (ReportPeriod) {
    ReportPeriod["DAILY"] = "DAILY";
    ReportPeriod["WEEKLY"] = "WEEKLY";
    ReportPeriod["MONTHLY"] = "MONTHLY";
    ReportPeriod["QUARTERLY"] = "QUARTERLY";
    ReportPeriod["YEARLY"] = "YEARLY";
    ReportPeriod["CUSTOM"] = "CUSTOM";
})(ReportPeriod || (exports.ReportPeriod = ReportPeriod = {}));
var ExportFormat;
(function (ExportFormat) {
    ExportFormat["JSON"] = "JSON";
    ExportFormat["EXCEL"] = "EXCEL";
    ExportFormat["PDF"] = "PDF";
    ExportFormat["CSV"] = "CSV";
})(ExportFormat || (exports.ExportFormat = ExportFormat = {}));
class ExtendedReportQueryDto {
    constructor() {
        this.page = 1;
        this.limit = 50;
        this.sortOrder = 'desc';
    }
}
exports.ExtendedReportQueryDto = ExtendedReportQueryDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'تاريخ البداية' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], ExtendedReportQueryDto.prototype, "startDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'تاريخ النهاية' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], ExtendedReportQueryDto.prototype, "endDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'معرف الفرع' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ExtendedReportQueryDto.prototype, "branchId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'معرف القسم' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ExtendedReportQueryDto.prototype, "departmentId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'معرف الموظف' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ExtendedReportQueryDto.prototype, "userId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'الفترة', enum: ReportPeriod }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(ReportPeriod),
    __metadata("design:type", String)
], ExtendedReportQueryDto.prototype, "period", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'رقم الصفحة', default: 1 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], ExtendedReportQueryDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'حجم الصفحة', default: 50 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(500),
    __metadata("design:type", Number)
], ExtendedReportQueryDto.prototype, "limit", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'الترتيب حسب' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ExtendedReportQueryDto.prototype, "sortBy", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'اتجاه الترتيب', enum: ['asc', 'desc'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ExtendedReportQueryDto.prototype, "sortOrder", void 0);
class AttendanceDetailedQueryDto extends ExtendedReportQueryDto {
}
exports.AttendanceDetailedQueryDto = AttendanceDetailedQueryDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'حالة الحضور', enum: ['PRESENT', 'LATE', 'ABSENT', 'ON_LEAVE', 'EARLY_LEAVE'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AttendanceDetailedQueryDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'العمل من المنزل فقط' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], AttendanceDetailedQueryDto.prototype, "isWorkFromHome", void 0);
class LateReportQueryDto extends ExtendedReportQueryDto {
}
exports.LateReportQueryDto = LateReportQueryDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'الحد الأدنى لدقائق التأخير' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], LateReportQueryDto.prototype, "minLateMinutes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'الحد الأقصى لدقائق التأخير' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], LateReportQueryDto.prototype, "maxLateMinutes", void 0);
class OvertimeReportQueryDto extends ExtendedReportQueryDto {
}
exports.OvertimeReportQueryDto = OvertimeReportQueryDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'الحد الأدنى لساعات العمل الإضافي' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], OvertimeReportQueryDto.prototype, "minOvertimeHours", void 0);
class PayrollReportQueryDto extends ExtendedReportQueryDto {
}
exports.PayrollReportQueryDto = PayrollReportQueryDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'السنة' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], PayrollReportQueryDto.prototype, "year", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'الشهر' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(12),
    __metadata("design:type", Number)
], PayrollReportQueryDto.prototype, "month", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'معرف مسير الرواتب' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PayrollReportQueryDto.prototype, "payrollRunId", void 0);
class AdvanceReportQueryDto extends ExtendedReportQueryDto {
}
exports.AdvanceReportQueryDto = AdvanceReportQueryDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'حالة السلفة', enum: ['PENDING', 'APPROVED', 'REJECTED', 'PAID', 'COMPLETED'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AdvanceReportQueryDto.prototype, "status", void 0);
class LeaveReportQueryDto extends ExtendedReportQueryDto {
}
exports.LeaveReportQueryDto = LeaveReportQueryDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'نوع الإجازة' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], LeaveReportQueryDto.prototype, "leaveType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'حالة الطلب' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], LeaveReportQueryDto.prototype, "status", void 0);
class EmployeeReportQueryDto extends ExtendedReportQueryDto {
}
exports.EmployeeReportQueryDto = EmployeeReportQueryDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'حالة الموظف', enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], EmployeeReportQueryDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'الجنسية' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], EmployeeReportQueryDto.prototype, "nationality", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'سعودي فقط' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], EmployeeReportQueryDto.prototype, "isSaudi", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'نوع العقد' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], EmployeeReportQueryDto.prototype, "contractType", void 0);
class ContractExpiryQueryDto extends ExtendedReportQueryDto {
    constructor() {
        super(...arguments);
        this.daysBeforeExpiry = 30;
    }
}
exports.ContractExpiryQueryDto = ContractExpiryQueryDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'أيام قبل الانتهاء' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], ContractExpiryQueryDto.prototype, "daysBeforeExpiry", void 0);
class DocumentExpiryQueryDto extends ExtendedReportQueryDto {
    constructor() {
        super(...arguments);
        this.daysBeforeExpiry = 30;
    }
}
exports.DocumentExpiryQueryDto = DocumentExpiryQueryDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'نوع الوثيقة', enum: ['IQAMA', 'PASSPORT', 'LICENSE'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DocumentExpiryQueryDto.prototype, "documentType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'أيام قبل الانتهاء' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], DocumentExpiryQueryDto.prototype, "daysBeforeExpiry", void 0);
class DisciplinaryReportQueryDto extends ExtendedReportQueryDto {
}
exports.DisciplinaryReportQueryDto = DisciplinaryReportQueryDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'حالة القضية' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DisciplinaryReportQueryDto.prototype, "caseStatus", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'نوع المخالفة' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DisciplinaryReportQueryDto.prototype, "violationType", void 0);
class CustodyReportQueryDto extends ExtendedReportQueryDto {
}
exports.CustodyReportQueryDto = CustodyReportQueryDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'حالة العهدة' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CustodyReportQueryDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'فئة العهدة' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CustodyReportQueryDto.prototype, "categoryId", void 0);
exports.REPORTS_CATALOG = [
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
    { id: 'leave-balance', name: 'رصيد الإجازات', nameEn: 'Leave Balance', description: 'أرصدة الإجازات لكل موظف', descriptionEn: 'Leave balances per employee', category: ReportCategory.LEAVES, endpoint: '/reports/leaves/balance', icon: 'EventAvailable', supportsExport: [ExportFormat.EXCEL, ExportFormat.PDF], requiredPermission: 'LEAVES_VIEW' },
    { id: 'leave-requests', name: 'طلبات الإجازات', nameEn: 'Leave Requests', description: 'حالة طلبات الإجازات', descriptionEn: 'Leave requests status', category: ReportCategory.LEAVES, endpoint: '/reports/leaves/requests', icon: 'ListAlt', supportsExport: [ExportFormat.EXCEL, ExportFormat.PDF], requiredPermission: 'LEAVES_VIEW' },
    { id: 'annual-consumption', name: 'استهلاك الإجازات', nameEn: 'Annual Consumption', description: 'تحليل استخدام الإجازات', descriptionEn: 'Leave usage analysis', category: ReportCategory.LEAVES, endpoint: '/reports/leaves/consumption', icon: 'DonutLarge', supportsExport: [ExportFormat.EXCEL, ExportFormat.PDF], requiredPermission: 'LEAVES_VIEW' },
    { id: 'sick-leaves', name: 'الإجازات المرضية', nameEn: 'Sick Leaves', description: 'سجل الإجازات المرضية', descriptionEn: 'Sick leave records', category: ReportCategory.LEAVES, endpoint: '/reports/leaves/sick', icon: 'LocalHospital', supportsExport: [ExportFormat.EXCEL, ExportFormat.PDF], requiredPermission: 'LEAVES_VIEW' },
    { id: 'leaves-by-type', name: 'الإجازات حسب النوع', nameEn: 'Leaves by Type', description: 'توزيع الإجازات', descriptionEn: 'Leave distribution', category: ReportCategory.LEAVES, endpoint: '/reports/leaves/by-type', icon: 'PieChart', supportsExport: [ExportFormat.EXCEL, ExportFormat.PDF], requiredPermission: 'LEAVES_VIEW' },
    { id: 'unjustified-absence', name: 'الغياب غير المبرر', nameEn: 'Unjustified Absence', description: 'غياب بدون إجازة', descriptionEn: 'Absence without leave', category: ReportCategory.LEAVES, endpoint: '/reports/leaves/unjustified', icon: 'ReportProblem', supportsExport: [ExportFormat.EXCEL, ExportFormat.PDF], requiredPermission: 'LEAVES_VIEW' },
    { id: 'carried-forward', name: 'الإجازات المتراكمة', nameEn: 'Carried Forward', description: 'الإجازات المرحّلة', descriptionEn: 'Carried forward leaves', category: ReportCategory.LEAVES, endpoint: '/reports/leaves/carried-forward', icon: 'EventRepeat', supportsExport: [ExportFormat.EXCEL, ExportFormat.PDF], requiredPermission: 'LEAVES_VIEW' },
    { id: 'leave-forecast', name: 'توقعات الإجازات', nameEn: 'Leave Forecast', description: 'المواعيد المتوقعة', descriptionEn: 'Expected dates', category: ReportCategory.LEAVES, endpoint: '/reports/leaves/forecast', icon: 'CalendarMonth', supportsExport: [ExportFormat.EXCEL, ExportFormat.PDF], requiredPermission: 'LEAVES_VIEW' },
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
    { id: 'disciplinary-cases', name: 'القضايا التأديبية', nameEn: 'Disciplinary Cases', description: 'جميع القضايا وحالاتها', descriptionEn: 'All cases and statuses', category: ReportCategory.DISCIPLINARY, endpoint: '/reports/disciplinary/cases', icon: 'Gavel', supportsExport: [ExportFormat.EXCEL, ExportFormat.PDF], requiredPermission: 'DISCIPLINARY_VIEW' },
    { id: 'violations-by-type', name: 'المخالفات حسب النوع', nameEn: 'Violations by Type', description: 'توزيع المخالفات', descriptionEn: 'Violations distribution', category: ReportCategory.DISCIPLINARY, endpoint: '/reports/disciplinary/violations', icon: 'Error', supportsExport: [ExportFormat.EXCEL, ExportFormat.PDF], requiredPermission: 'DISCIPLINARY_VIEW' },
    { id: 'penalties', name: 'العقوبات المطبقة', nameEn: 'Applied Penalties', description: 'سجل العقوبات', descriptionEn: 'Penalties record', category: ReportCategory.DISCIPLINARY, endpoint: '/reports/disciplinary/penalties', icon: 'Block', supportsExport: [ExportFormat.EXCEL, ExportFormat.PDF], requiredPermission: 'DISCIPLINARY_VIEW' },
    { id: 'investigations', name: 'تقرير التحقيقات', nameEn: 'Investigations Report', description: 'التحقيقات الجارية والمنتهية', descriptionEn: 'Ongoing and completed investigations', category: ReportCategory.DISCIPLINARY, endpoint: '/reports/disciplinary/investigations', icon: 'Search', supportsExport: [ExportFormat.EXCEL, ExportFormat.PDF], requiredPermission: 'DISCIPLINARY_VIEW' },
    { id: 'employee-record', name: 'السجل التأديبي', nameEn: 'Employee Disciplinary Record', description: 'السجل التأديبي لكل موظف', descriptionEn: 'Disciplinary record per employee', category: ReportCategory.DISCIPLINARY, endpoint: '/reports/disciplinary/employee-record', icon: 'PersonOff', supportsExport: [ExportFormat.EXCEL, ExportFormat.PDF], requiredPermission: 'DISCIPLINARY_VIEW' },
    { id: 'warnings', name: 'تقرير الإنذارات', nameEn: 'Warnings Report', description: 'الإنذارات الصادرة', descriptionEn: 'Issued warnings', category: ReportCategory.DISCIPLINARY, endpoint: '/reports/disciplinary/warnings', icon: 'NotificationImportant', supportsExport: [ExportFormat.EXCEL, ExportFormat.PDF], requiredPermission: 'DISCIPLINARY_VIEW' },
    { id: 'custody-inventory', name: 'جرد العهد', nameEn: 'Custody Inventory', description: 'كل العهد وحالاتها', descriptionEn: 'All custody and statuses', category: ReportCategory.CUSTODY, endpoint: '/reports/custody/inventory', icon: 'Inventory', supportsExport: [ExportFormat.EXCEL, ExportFormat.PDF], requiredPermission: 'CUSTODY_VIEW' },
    { id: 'custody-by-employee', name: 'عهد الموظفين', nameEn: 'Custody by Employee', description: 'العهد حسب الموظف', descriptionEn: 'Custody by employee', category: ReportCategory.CUSTODY, endpoint: '/reports/custody/by-employee', icon: 'Person', supportsExport: [ExportFormat.EXCEL, ExportFormat.PDF], requiredPermission: 'CUSTODY_VIEW' },
    { id: 'custody-returns', name: 'إرجاع العهد', nameEn: 'Custody Returns', description: 'سجل الإرجاعات', descriptionEn: 'Returns record', category: ReportCategory.CUSTODY, endpoint: '/reports/custody/returns', icon: 'AssignmentReturn', supportsExport: [ExportFormat.EXCEL, ExportFormat.PDF], requiredPermission: 'CUSTODY_VIEW' },
    { id: 'custody-maintenance', name: 'العهد بحاجة للصيانة', nameEn: 'Custody Maintenance', description: 'العهد التي تحتاج صيانة', descriptionEn: 'Custody needing maintenance', category: ReportCategory.CUSTODY, endpoint: '/reports/custody/maintenance', icon: 'Build', supportsExport: [ExportFormat.EXCEL, ExportFormat.PDF], requiredPermission: 'CUSTODY_VIEW' },
    { id: 'asset-value', name: 'قيمة الأصول', nameEn: 'Asset Value', description: 'إجمالي قيمة العهد', descriptionEn: 'Total custody value', category: ReportCategory.CUSTODY, endpoint: '/reports/custody/value', icon: 'PriceCheck', supportsExport: [ExportFormat.EXCEL, ExportFormat.PDF], requiredPermission: 'CUSTODY_VIEW' },
    { id: 'executive-dashboard', name: 'لوحة التحكم التنفيذية', nameEn: 'Executive Dashboard', description: 'ملخص شامل للمدير العام', descriptionEn: 'Comprehensive summary for CEO', category: ReportCategory.EXECUTIVE, endpoint: '/reports/executive/dashboard', icon: 'Dashboard', supportsExport: [ExportFormat.PDF], requiredPermission: 'REPORTS_VIEW' },
    { id: 'risk-alerts', name: 'تنبيهات المخاطر', nameEn: 'Risk Alerts', description: 'تنبيهات ذكية للمشاكل', descriptionEn: 'Smart alerts for issues', category: ReportCategory.EXECUTIVE, endpoint: '/reports/executive/alerts', icon: 'ReportProblem', supportsExport: [ExportFormat.PDF], requiredPermission: 'REPORTS_VIEW' },
    { id: 'kpis', name: 'مؤشرات الأداء', nameEn: 'KPIs', description: 'مؤشرات الأداء الرئيسية', descriptionEn: 'Key Performance Indicators', category: ReportCategory.EXECUTIVE, endpoint: '/reports/executive/kpis', icon: 'Speed', supportsExport: [ExportFormat.PDF], requiredPermission: 'REPORTS_VIEW' },
    { id: 'compliance-score', name: 'تقرير الامتثال', nameEn: 'Compliance Score', description: 'مستوى الامتثال للسياسات', descriptionEn: 'Policy compliance level', category: ReportCategory.EXECUTIVE, endpoint: '/reports/executive/compliance', icon: 'VerifiedUser', supportsExport: [ExportFormat.PDF], requiredPermission: 'REPORTS_VIEW' },
];
//# sourceMappingURL=extended-report.dto.js.map