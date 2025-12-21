import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const enterprisePermissions = [
    // === الرواتب ===
    { code: 'PAYROLL_VIEW', name: 'عرض الرواتب', nameEn: 'View Payroll', category: 'الرواتب' },
    { code: 'PAYROLL_CREATE', name: 'إنشاء مسير رواتب', nameEn: 'Create Payroll', category: 'الرواتب' },
    { code: 'PAYROLL_CALCULATE', name: 'حساب الرواتب', nameEn: 'Calculate Payroll', category: 'الرواتب' },
    { code: 'PAYROLL_APPROVE_HR', name: 'اعتماد الرواتب - HR', nameEn: 'Approve Payroll - HR', category: 'الرواتب' },
    { code: 'PAYROLL_APPROVE_FINANCE', name: 'اعتماد الرواتب - المالية', nameEn: 'Approve Payroll - Finance', category: 'الرواتب' },
    { code: 'PAYROLL_LOCK', name: 'قفل مسير الرواتب', nameEn: 'Lock Payroll', category: 'الرواتب' },
    { code: 'PAYROLL_PAY', name: 'صرف الرواتب', nameEn: 'Pay Payroll', category: 'الرواتب' },
    { code: 'PAYROLL_EXPORT', name: 'تصدير الرواتب', nameEn: 'Export Payroll', category: 'الرواتب' },
    { code: 'PAYROLL_WPS_EXPORT', name: 'تصدير WPS', nameEn: 'Export WPS', category: 'الرواتب' },

    // === مكونات الراتب ===
    { code: 'SALARY_COMPONENT_VIEW', name: 'عرض مكونات الراتب', nameEn: 'View Salary Components', category: 'مكونات الراتب' },
    { code: 'SALARY_COMPONENT_CREATE', name: 'إنشاء مكون راتب', nameEn: 'Create Salary Component', category: 'مكونات الراتب' },
    { code: 'SALARY_COMPONENT_EDIT', name: 'تعديل مكون راتب', nameEn: 'Edit Salary Component', category: 'مكونات الراتب' },
    { code: 'SALARY_COMPONENT_DELETE', name: 'حذف مكون راتب', nameEn: 'Delete Salary Component', category: 'مكونات الراتب' },

    // === هياكل الرواتب ===
    { code: 'SALARY_STRUCTURE_VIEW', name: 'عرض هياكل الرواتب', nameEn: 'View Salary Structures', category: 'هياكل الرواتب' },
    { code: 'SALARY_STRUCTURE_CREATE', name: 'إنشاء هيكل راتب', nameEn: 'Create Salary Structure', category: 'هياكل الرواتب' },
    { code: 'SALARY_STRUCTURE_EDIT', name: 'تعديل هيكل راتب', nameEn: 'Edit Salary Structure', category: 'هياكل الرواتب' },
    { code: 'SALARY_STRUCTURE_DELETE', name: 'حذف هيكل راتب', nameEn: 'Delete Salary Structure', category: 'هياكل الرواتب' },
    { code: 'SALARY_ASSIGNMENT_MANAGE', name: 'إدارة تعيينات الرواتب', nameEn: 'Manage Salary Assignments', category: 'هياكل الرواتب' },

    // === التأمينات (GOSI) ===
    { code: 'GOSI_VIEW', name: 'عرض إعدادات التأمينات', nameEn: 'View GOSI Settings', category: 'التأمينات الاجتماعية' },
    { code: 'GOSI_MANAGE', name: 'إدارة التأمينات', nameEn: 'Manage GOSI', category: 'التأمينات الاجتماعية' },
    { code: 'GOSI_REPORT', name: 'تقرير التأمينات', nameEn: 'GOSI Report', category: 'التأمينات الاجتماعية' },

    // === الحسابات البنكية ===
    { code: 'BANK_ACCOUNT_VIEW', name: 'عرض الحسابات البنكية', nameEn: 'View Bank Accounts', category: 'الحسابات البنكية' },
    { code: 'BANK_ACCOUNT_CREATE', name: 'إضافة حساب بنكي', nameEn: 'Create Bank Account', category: 'الحسابات البنكية' },
    { code: 'BANK_ACCOUNT_VERIFY', name: 'التحقق من الحساب البنكي', nameEn: 'Verify Bank Account', category: 'الحسابات البنكية' },
    { code: 'BANK_ACCOUNT_DELETE', name: 'حذف حساب بنكي', nameEn: 'Delete Bank Account', category: 'الحسابات البنكية' },

    // === العقود ===
    { code: 'CONTRACT_VIEW', name: 'عرض العقود', nameEn: 'View Contracts', category: 'العقود' },
    { code: 'CONTRACT_CREATE', name: 'إنشاء عقد', nameEn: 'Create Contract', category: 'العقود' },
    { code: 'CONTRACT_EDIT', name: 'تعديل عقد', nameEn: 'Edit Contract', category: 'العقود' },
    { code: 'CONTRACT_TERMINATE', name: 'إنهاء عقد', nameEn: 'Terminate Contract', category: 'العقود' },
    { code: 'CONTRACT_RENEW', name: 'تجديد عقد', nameEn: 'Renew Contract', category: 'العقود' },

    // === السلف ===
    { code: 'ADVANCE_VIEW', name: 'عرض السلف', nameEn: 'View Advances', category: 'السلف' },
    { code: 'ADVANCE_REQUEST', name: 'طلب سلفة', nameEn: 'Request Advance', category: 'السلف' },
    { code: 'ADVANCE_APPROVE_MANAGER', name: 'اعتماد السلف - المدير', nameEn: 'Approve Advance - Manager', category: 'السلف' },
    { code: 'ADVANCE_APPROVE_HR', name: 'اعتماد السلف - HR', nameEn: 'Approve Advance - HR', category: 'السلف' },
    { code: 'ADVANCE_APPROVE_FINANCE', name: 'اعتماد السلف - المالية', nameEn: 'Approve Advance - Finance', category: 'السلف' },

    // === الفروقات ===
    { code: 'RETRO_PAY_VIEW', name: 'عرض الفروقات', nameEn: 'View Retro Pay', category: 'الفروقات' },
    { code: 'RETRO_PAY_CREATE', name: 'إنشاء فارق', nameEn: 'Create Retro Pay', category: 'الفروقات' },
    { code: 'RETRO_PAY_APPROVE', name: 'اعتماد الفروقات', nameEn: 'Approve Retro Pay', category: 'الفروقات' },

    // === التقارير ===
    { code: 'REPORT_PAYROLL', name: 'تقرير الرواتب', nameEn: 'Payroll Report', category: 'التقارير' },
    { code: 'REPORT_ATTENDANCE', name: 'تقرير الحضور', nameEn: 'Attendance Report', category: 'التقارير' },
    { code: 'REPORT_LEAVES', name: 'تقرير الإجازات', nameEn: 'Leaves Report', category: 'التقارير' },
    { code: 'REPORT_FINANCIAL', name: 'التقارير المالية', nameEn: 'Financial Reports', category: 'التقارير' },
    { code: 'REPORT_EXPORT_EXCEL', name: 'تصدير Excel', nameEn: 'Export Excel', category: 'التقارير' },
    { code: 'REPORT_EXPORT_PDF', name: 'تصدير PDF', nameEn: 'Export PDF', category: 'التقارير' },

    // === الإعدادات ===
    { code: 'SETTINGS_VIEW', name: 'عرض الإعدادات', nameEn: 'View Settings', category: 'الإعدادات' },
    { code: 'SETTINGS_MANAGE', name: 'إدارة الإعدادات', nameEn: 'Manage Settings', category: 'الإعدادات' },
    { code: 'COMPANY_SETTINGS', name: 'إعدادات الشركة', nameEn: 'Company Settings', category: 'الإعدادات' },
    { code: 'POLICY_MANAGE', name: 'إدارة السياسات', nameEn: 'Manage Policies', category: 'الإعدادات' },

    // === الدرجات الوظيفية ===
    { code: 'JOB_TITLE_VIEW', name: 'عرض الدرجات الوظيفية', nameEn: 'View Job Titles', category: 'الدرجات الوظيفية' },
    { code: 'JOB_TITLE_MANAGE', name: 'إدارة الدرجات الوظيفية', nameEn: 'Manage Job Titles', category: 'الدرجات الوظيفية' },

    // === مسؤول النظام ===
    { code: 'ADMIN_FULL_ACCESS', name: 'صلاحيات كاملة', nameEn: 'Full Access', category: 'مسؤول النظام' },
    { code: 'ADMIN_USER_MANAGE', name: 'إدارة المستخدمين', nameEn: 'Manage Users', category: 'مسؤول النظام' },
    { code: 'ADMIN_PERMISSION_MANAGE', name: 'إدارة الصلاحيات', nameEn: 'Manage Permissions', category: 'مسؤول النظام' },
    { code: 'ADMIN_AUDIT_LOG', name: 'سجل التدقيق', nameEn: 'Audit Log', category: 'مسؤول النظام' },
];

async function seedPermissions() {
    console.log('🔐 Seeding enterprise permissions...');

    let created = 0;
    let updated = 0;

    for (const perm of enterprisePermissions) {
        const result = await prisma.permission.upsert({
            where: { code: perm.code },
            update: {
                name: perm.name,
                nameEn: perm.nameEn,
                category: perm.category,
            },
            create: {
                code: perm.code,
                name: perm.name,
                nameEn: perm.nameEn,
                category: perm.category,
                isActive: true,
            },
        });

        if (result.createdAt.getTime() === result.updatedAt.getTime()) {
            created++;
        } else {
            updated++;
        }
    }

    console.log(`✅ Permissions seeded: ${created} created, ${updated} updated`);
    console.log(`📊 Total: ${enterprisePermissions.length} permissions`);
}

seedPermissions()
    .then(() => prisma.$disconnect())
    .catch((e) => {
        console.error('Error seeding permissions:', e);
        prisma.$disconnect();
        process.exit(1);
    });
