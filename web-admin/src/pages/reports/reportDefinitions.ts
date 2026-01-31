/**
 * Report Definitions - Synced with Backend API
 * Only includes reports with actual backend implementation (22 reports)
 */

import {
    CalendarToday,
    AccessTime,
    PersonOff,
    ExitToApp,
    MoreTime,
    Home,
    Business,
    AccountTree,
    VerifiedUser,
    Warning,
    Payments,
    Security,
    CreditCard,
    EventAvailable,
    ListAlt,
    Groups,
    WorkOff,
    Public,
    Badge,
    Inventory,
    Dashboard,
} from '@mui/icons-material';
import { ElementType } from 'react';

export type ReportCategory =
    | 'ATTENDANCE'
    | 'PAYROLL'
    | 'LEAVES'
    | 'HR'
    | 'CUSTODY'
    | 'EXECUTIVE';

export type AccessLevel = 'ALL' | 'MANAGER' | 'ADMIN';

export interface ReportDefinition {
    id: string;
    name: string;
    nameEn: string;
    description: string;
    category: ReportCategory;
    accessLevel: AccessLevel;
    icon: ElementType;
    apiEndpoint: string;
    exportFormats: ('pdf' | 'excel' | 'csv')[];
    color: string;
}

export const REPORT_CATEGORIES: Record<ReportCategory, { name: string; icon: ElementType; color: string }> = {
    ATTENDANCE: { name: 'الحضور والانصراف', icon: AccessTime, color: '#4caf50' },
    LEAVES: { name: 'الإجازات', icon: EventAvailable, color: '#2196f3' },
    PAYROLL: { name: 'الرواتب والمالية', icon: Payments, color: '#ff9800' },
    HR: { name: 'الموارد البشرية', icon: Groups, color: '#9c27b0' },
    CUSTODY: { name: 'العهد والأصول', icon: Inventory, color: '#00bcd4' },
    EXECUTIVE: { name: 'تقارير تنفيذية', icon: Dashboard, color: '#607d8b' },
};

// ===================== ALL REPORTS (22 with actual backend APIs) =====================

export const REPORTS: ReportDefinition[] = [
    // ===== ATTENDANCE REPORTS (10) - All implemented =====
    {
        id: 'daily-attendance',
        name: 'تقرير الحضور اليومي',
        nameEn: 'Daily Attendance Report',
        description: 'بيانات الحضور لليوم مع تفاصيل الدخول والخروج',
        category: 'ATTENDANCE',
        accessLevel: 'ALL',
        icon: CalendarToday,
        apiEndpoint: '/reports/attendance/daily',
        exportFormats: ['pdf', 'excel'],
        color: '#4caf50',
    },
    {
        id: 'late-detailed',
        name: 'تقرير التأخيرات التفصيلي',
        nameEn: 'Late Arrivals Detailed Report',
        description: 'تفاصيل تأخيرات الموظفين مع المدة والتكرار',
        category: 'ATTENDANCE',
        accessLevel: 'MANAGER',
        icon: AccessTime,
        apiEndpoint: '/reports/attendance/late-detailed',
        exportFormats: ['pdf', 'excel'],
        color: '#ff9800',
    },
    {
        id: 'absence',
        name: 'تقرير الغياب',
        nameEn: 'Absence Report',
        description: 'سجل الغياب وتحليل الأنماط',
        category: 'ATTENDANCE',
        accessLevel: 'MANAGER',
        icon: PersonOff,
        apiEndpoint: '/reports/attendance/absence',
        exportFormats: ['pdf', 'excel'],
        color: '#f44336',
    },
    {
        id: 'early-leave',
        name: 'تقرير الانصراف المبكر',
        nameEn: 'Early Leave Report',
        description: 'الموظفين الذين خرجوا قبل انتهاء الدوام',
        category: 'ATTENDANCE',
        accessLevel: 'MANAGER',
        icon: ExitToApp,
        apiEndpoint: '/reports/attendance/early-leave',
        exportFormats: ['pdf', 'excel'],
        color: '#ff5722',
    },
    {
        id: 'overtime',
        name: 'تقرير العمل الإضافي',
        nameEn: 'Overtime Report',
        description: 'ساعات العمل الإضافي لكل موظف',
        category: 'ATTENDANCE',
        accessLevel: 'MANAGER',
        icon: MoreTime,
        apiEndpoint: '/reports/attendance/overtime',
        exportFormats: ['pdf', 'excel'],
        color: '#9c27b0',
    },
    {
        id: 'wfh',
        name: 'تقرير العمل من المنزل',
        nameEn: 'Work From Home Report',
        description: 'أيام العمل عن بُعد لجميع الموظفين',
        category: 'ATTENDANCE',
        accessLevel: 'ALL',
        icon: Home,
        apiEndpoint: '/reports/attendance/work-from-home',
        exportFormats: ['pdf', 'excel'],
        color: '#00bcd4',
    },
    {
        id: 'branch-summary',
        name: 'ملخص الحضور حسب الفرع',
        nameEn: 'Attendance by Branch',
        description: 'إحصائيات الحضور موزعة على الفروع',
        category: 'ATTENDANCE',
        accessLevel: 'ADMIN',
        icon: Business,
        apiEndpoint: '/reports/attendance/by-branch',
        exportFormats: ['pdf', 'excel'],
        color: '#3f51b5',
    },
    {
        id: 'department-summary',
        name: 'ملخص الحضور حسب القسم',
        nameEn: 'Attendance by Department',
        description: 'إحصائيات الحضور موزعة على الأقسام',
        category: 'ATTENDANCE',
        accessLevel: 'ADMIN',
        icon: AccountTree,
        apiEndpoint: '/reports/attendance/by-department',
        exportFormats: ['pdf', 'excel'],
        color: '#673ab7',
    },
    {
        id: 'compliance',
        name: 'تقرير الالتزام بالدوام',
        nameEn: 'Compliance Report',
        description: 'نسب الالتزام بمواعيد الحضور لكل موظف',
        category: 'ATTENDANCE',
        accessLevel: 'ADMIN',
        icon: VerifiedUser,
        apiEndpoint: '/reports/attendance/compliance',
        exportFormats: ['pdf', 'excel'],
        color: '#009688',
    },
    {
        id: 'suspicious',
        name: 'المحاولات المشبوهة',
        nameEn: 'Suspicious Attempts',
        description: 'محاولات التلاعب والبصمات المشبوهة',
        category: 'ATTENDANCE',
        accessLevel: 'ADMIN',
        icon: Warning,
        apiEndpoint: '/reports/attendance/suspicious',
        exportFormats: ['pdf', 'excel'],
        color: '#ff5722',
    },

    // ===== PAYROLL REPORTS (3) - Backend has these =====
    {
        id: 'payroll-summary',
        name: 'ملخص الرواتب الشهري',
        nameEn: 'Monthly Payroll Summary',
        description: 'إجمالي الرواتب والخصومات لجميع الموظفين',
        category: 'PAYROLL',
        accessLevel: 'ADMIN',
        icon: Payments,
        apiEndpoint: '/reports/payroll/summary',
        exportFormats: ['pdf', 'excel'],
        color: '#4caf50',
    },
    {
        id: 'gosi',
        name: 'تقرير التأمينات GOSI',
        nameEn: 'GOSI Report',
        description: 'مساهمات التأمينات الاجتماعية',
        category: 'PAYROLL',
        accessLevel: 'ADMIN',
        icon: Security,
        apiEndpoint: '/reports/payroll/gosi',
        exportFormats: ['pdf', 'excel'],
        color: '#607d8b',
    },
    {
        id: 'advances',
        name: 'السلف والقروض',
        nameEn: 'Advances & Loans',
        description: 'السلف المعتمدة والمتبقي منها',
        category: 'PAYROLL',
        accessLevel: 'ADMIN',
        icon: CreditCard,
        apiEndpoint: '/reports/payroll/advances',
        exportFormats: ['pdf', 'excel'],
        color: '#795548',
    },

    // ===== LEAVE REPORTS (2) - Backend has these =====
    {
        id: 'leave-balance',
        name: 'رصيد الإجازات',
        nameEn: 'Leave Balance',
        description: 'أرصدة الإجازات لكل موظف',
        category: 'LEAVES',
        accessLevel: 'ALL',
        icon: EventAvailable,
        apiEndpoint: '/reports/leaves/balance',
        exportFormats: ['pdf', 'excel'],
        color: '#2196f3',
    },
    {
        id: 'leave-requests',
        name: 'طلبات الإجازات',
        nameEn: 'Leave Requests',
        description: 'حالة طلبات الإجازات (معتمدة/معلقة/مرفوضة)',
        category: 'LEAVES',
        accessLevel: 'MANAGER',
        icon: ListAlt,
        apiEndpoint: '/reports/leaves/requests',
        exportFormats: ['pdf', 'excel'],
        color: '#ff9800',
    },

    // ===== HR REPORTS (4) - Backend has these =====
    {
        id: 'employee-list',
        name: 'سجل الموظفين',
        nameEn: 'Employee List',
        description: 'قائمة كاملة بجميع الموظفين',
        category: 'HR',
        accessLevel: 'ADMIN',
        icon: Groups,
        apiEndpoint: '/reports/hr/employees',
        exportFormats: ['pdf', 'excel'],
        color: '#9c27b0',
    },
    {
        id: 'contract-expiry',
        name: 'انتهاء العقود',
        nameEn: 'Contract Expiry',
        description: 'العقود القريبة للانتهاء',
        category: 'HR',
        accessLevel: 'ADMIN',
        icon: WorkOff,
        apiEndpoint: '/reports/hr/contract-expiry',
        exportFormats: ['pdf', 'excel'],
        color: '#ff9800',
    },
    {
        id: 'iqama-expiry',
        name: 'انتهاء الإقامات',
        nameEn: 'Iqama Expiry',
        description: 'الإقامات القريبة للانتهاء',
        category: 'HR',
        accessLevel: 'ADMIN',
        icon: Badge,
        apiEndpoint: '/reports/hr/iqama-expiry',
        exportFormats: ['pdf', 'excel'],
        color: '#f44336',
    },
    {
        id: 'nationality-analysis',
        name: 'تحليل الجنسيات (السعودة)',
        nameEn: 'Nationality Analysis',
        description: 'توزيع الموظفين حسب الجنسية',
        category: 'HR',
        accessLevel: 'ADMIN',
        icon: Public,
        apiEndpoint: '/reports/hr/nationalities',
        exportFormats: ['pdf', 'excel'],
        color: '#2e7d32',
    },

    // ===== CUSTODY REPORTS (1) - Backend has this =====
    {
        id: 'custody-inventory',
        name: 'جرد العهد',
        nameEn: 'Custody Inventory',
        description: 'جميع العهد وحالاتها',
        category: 'CUSTODY',
        accessLevel: 'ADMIN',
        icon: Inventory,
        apiEndpoint: '/reports/custody/inventory',
        exportFormats: ['pdf', 'excel'],
        color: '#00bcd4',
    },

    // ===== EXECUTIVE REPORTS (1) - Backend has this =====
    {
        id: 'executive-dashboard',
        name: 'لوحة التحكم التنفيذية',
        nameEn: 'Executive Dashboard',
        description: 'ملخص شامل للمدير العام',
        category: 'EXECUTIVE',
        accessLevel: 'ADMIN',
        icon: Dashboard,
        apiEndpoint: '/reports/executive/dashboard',
        exportFormats: ['pdf'],
        color: '#607d8b',
    },
];

// ===================== HELPER FUNCTIONS =====================

export const getReportsByCategory = (category: ReportCategory): ReportDefinition[] => {
    return REPORTS.filter(r => r.category === category);
};

export const getReportsByAccessLevel = (level: AccessLevel, userRole: string): ReportDefinition[] => {
    if (userRole === 'ADMIN' || userRole === 'HR' || userRole === 'FINANCE') {
        return REPORTS;
    }
    if (userRole === 'MANAGER') {
        return REPORTS.filter(r => r.accessLevel === 'ALL' || r.accessLevel === 'MANAGER');
    }
    return REPORTS.filter(r => r.accessLevel === 'ALL');
};

export const getReportById = (id: string): ReportDefinition | undefined => {
    return REPORTS.find(r => r.id === id);
};

export const searchReports = (query: string): ReportDefinition[] => {
    const loweredQuery = query.toLowerCase();
    return REPORTS.filter(r =>
        r.name.includes(query) ||
        r.nameEn.toLowerCase().includes(loweredQuery) ||
        r.description.includes(query)
    );
};

// Total count: 22 reports with actual backend APIs
