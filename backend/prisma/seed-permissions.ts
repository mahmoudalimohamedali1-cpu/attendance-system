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

    // === مُدد (Mudad) ===
    { code: 'MUDAD_VIEW', name: 'عرض تقديمات مُدد', nameEn: 'View Mudad Submissions', category: 'مُدد' },
    { code: 'MUDAD_PREPARE', name: 'تحضير ملف مُدد', nameEn: 'Prepare Mudad File', category: 'مُدد' },
    { code: 'MUDAD_SUBMIT', name: 'رفع ملف مُدد', nameEn: 'Submit to Mudad', category: 'مُدد' },
    { code: 'MUDAD_ACCEPT', name: 'قبول/رفض مُدد', nameEn: 'Accept/Reject Mudad', category: 'مُدد' },

    // === WPS (حماية الأجور) ===
    { code: 'WPS_VIEW', name: 'عرض ملفات WPS', nameEn: 'View WPS Files', category: 'حماية الأجور' },
    { code: 'WPS_GENERATE', name: 'توليد ملف WPS', nameEn: 'Generate WPS File', category: 'حماية الأجور' },
    { code: 'WPS_SUBMIT', name: 'رفع WPS للبنك', nameEn: 'Submit WPS to Bank', category: 'حماية الأجور' },
    { code: 'WPS_APPROVE', name: 'تأكيد معالجة WPS', nameEn: 'Approve WPS Processing', category: 'حماية الأجور' },

    // === قوى (Qiwa) ===
    { code: 'QIWA_EXPORT', name: 'تصدير بيانات قوى', nameEn: 'Export Qiwa Data', category: 'قوى' },

    // === التدقيق ===
    { code: 'AUDIT_VIEW', name: 'عرض سجل التدقيق', nameEn: 'View Audit Log', category: 'التدقيق' },
    { code: 'AUDIT_EXPORT', name: 'تصدير سجل التدقيق', nameEn: 'Export Audit Log', category: 'التدقيق' },

    // === العهد (Custody) ===
    { code: 'CUSTODY_VIEW', name: 'عرض العهد', nameEn: 'View Custody', category: 'العهد' },
    { code: 'CUSTODY_VIEW_SELF', name: 'عرض عهدتي', nameEn: 'View My Custody', category: 'العهد' },
    { code: 'CUSTODY_MANAGE_CATEGORIES', name: 'إدارة فئات العهد', nameEn: 'Manage Custody Categories', category: 'العهد' },
    { code: 'CUSTODY_MANAGE_ITEMS', name: 'إدارة العهد', nameEn: 'Manage Custody Items', category: 'العهد' },
    { code: 'CUSTODY_DELETE', name: 'حذف العهد', nameEn: 'Delete Custody', category: 'العهد' },
    { code: 'CUSTODY_ASSIGN', name: 'تسليم عهدة', nameEn: 'Assign Custody', category: 'العهد' },
    { code: 'CUSTODY_RETURN_REQUEST', name: 'طلب إرجاع عهدة', nameEn: 'Request Custody Return', category: 'العهد' },
    { code: 'CUSTODY_RETURN_REVIEW', name: 'مراجعة طلبات الإرجاع', nameEn: 'Review Custody Returns', category: 'العهد' },
    { code: 'CUSTODY_TRANSFER_REQUEST', name: 'طلب تحويل عهدة', nameEn: 'Request Custody Transfer', category: 'العهد' },
    { code: 'CUSTODY_TRANSFER_APPROVE', name: 'موافقة تحويل عهدة', nameEn: 'Approve Custody Transfer', category: 'العهد' },
    { code: 'CUSTODY_MAINTENANCE', name: 'إدارة صيانة العهد', nameEn: 'Manage Custody Maintenance', category: 'العهد' },
    { code: 'CUSTODY_REPORTS', name: 'تقارير العهد', nameEn: 'Custody Reports', category: 'العهد' },
    { code: 'CUSTODY_DASHBOARD', name: 'لوحة تحكم العهد', nameEn: 'Custody Dashboard', category: 'العهد' },

    // === الجزاءات والتحقيقات ===
    { code: 'DISC_MANAGER_CREATE', name: 'إنشاء تحقيق', nameEn: 'Create Investigation', category: 'الجزاءات' },
    { code: 'DISC_HR_REVIEW', name: 'مراجعة التحقيق - HR', nameEn: 'Review Investigation - HR', category: 'الجزاءات' },
    { code: 'DISC_HR_DECISION', name: 'إصدار قرار - HR', nameEn: 'Issue Decision - HR', category: 'الجزاءات' },
    { code: 'DISC_HR_FINALIZE', name: 'اعتماد نهائي', nameEn: 'Finalize Decision', category: 'الجزاءات' },
    { code: 'DISC_EMPLOYEE_RESPONSE', name: 'رد على التحقيق', nameEn: 'Respond to Investigation', category: 'الجزاءات' },
    { code: 'DISC_VIEW_ALL', name: 'عرض كل التحقيقات', nameEn: 'View All Investigations', category: 'الجزاءات' },
    { code: 'DISC_VIEW_SELF', name: 'عرض تحقيقاتي', nameEn: 'View My Investigations', category: 'الجزاءات' },

    // === التواصل الاجتماعي (Social Feed) ===
    { code: 'SOCIAL_FEED_VIEW', name: 'عرض المنشورات', nameEn: 'View Posts', category: 'التواصل الاجتماعي' },
    { code: 'SOCIAL_FEED_POST', name: 'إنشاء منشور', nameEn: 'Create Post', category: 'التواصل الاجتماعي' },
    { code: 'SOCIAL_FEED_ANNOUNCEMENT', name: 'إنشاء إعلان رسمي', nameEn: 'Create Announcement', category: 'التواصل الاجتماعي' },
    { code: 'SOCIAL_FEED_PIN', name: 'تثبيت المنشورات', nameEn: 'Pin Posts', category: 'التواصل الاجتماعي' },
    { code: 'SOCIAL_FEED_DELETE_ANY', name: 'حذف أي منشور', nameEn: 'Delete Any Post', category: 'التواصل الاجتماعي' },
    { code: 'SOCIAL_FEED_MODERATE', name: 'إدارة التعليقات', nameEn: 'Moderate Comments', category: 'التواصل الاجتماعي' },
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
