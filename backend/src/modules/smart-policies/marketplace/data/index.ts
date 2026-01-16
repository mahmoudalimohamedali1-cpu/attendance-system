/**
 * 📦 Policy Marketplace Data Index
 * فهرس جميع بيانات السياسات الجاهزة
 * 
 * 🎯 أكثر من 150 سياسة جاهزة ومختبرة
 */

// ==========================================
// 📥 استيراد جميع السياسات
// ==========================================

// سياسات اللوجستيات والنقل
export * from './logistics-policies.data';
import { LOGISTICS_POLICIES } from './logistics-policies.data';

// سياسات الحضور والانصراف
export * from './attendance-policies.data';
import { ATTENDANCE_POLICIES } from './attendance-policies.data';

// سياسات نظام العمل السعودي
export * from './saudi-labor-policies.data';
import { SAUDI_LABOR_POLICIES } from './saudi-labor-policies.data';

// سياسات الرواتب والمستحقات
export * from './payroll-policies.data';
import { PAYROLL_POLICIES } from './payroll-policies.data';

// سياسات الإجازات
export * from './leaves-policies.data';
import { LEAVES_POLICIES } from './leaves-policies.data';

// سياسات العهد
export * from './custody-policies.data';
import { CUSTODY_POLICIES } from './custody-policies.data';

// سياسات السلف والقروض
export * from './advances-policies.data';
import { ADVANCES_POLICIES } from './advances-policies.data';

// سياسات الأداء والتقييم
export * from './performance-policies.data';
import { PERFORMANCE_POLICIES } from './performance-policies.data';

// سياسات التأديب
export * from './disciplinary-policies.data';
import { DISCIPLINARY_POLICIES } from './disciplinary-policies.data';

// سياسات المهام والعقود والعلاوات
export * from './tasks-contracts-raises-policies.data';
import { TASKS_POLICIES, CONTRACTS_POLICIES, RAISES_POLICIES } from './tasks-contracts-raises-policies.data';

import { PolicyTemplate, PolicyCategory } from '../policy-generator.service';

// ==========================================
// 📊 جميع السياسات مجمعة
// ==========================================

export const ALL_POLICIES: PolicyTemplate[] = [
    ...LOGISTICS_POLICIES,
    ...ATTENDANCE_POLICIES,
    ...SAUDI_LABOR_POLICIES,
    ...PAYROLL_POLICIES,
    ...LEAVES_POLICIES,
    ...CUSTODY_POLICIES,
    ...ADVANCES_POLICIES,
    ...PERFORMANCE_POLICIES,
    ...DISCIPLINARY_POLICIES,
    ...TASKS_POLICIES,
    ...CONTRACTS_POLICIES,
    ...RAISES_POLICIES,
];

// ==========================================
// 📈 الإحصائيات الشاملة
// ==========================================

export const POLICY_STATS = {
    total: ALL_POLICIES.length,
    
    // حسب الملف/المصدر
    bySource: {
        logistics: LOGISTICS_POLICIES.length,
        attendance: ATTENDANCE_POLICIES.length,
        saudiLabor: SAUDI_LABOR_POLICIES.length,
        payroll: PAYROLL_POLICIES.length,
        leaves: LEAVES_POLICIES.length,
        custody: CUSTODY_POLICIES.length,
        advances: ADVANCES_POLICIES.length,
        performance: PERFORMANCE_POLICIES.length,
        disciplinary: DISCIPLINARY_POLICIES.length,
        tasks: TASKS_POLICIES.length,
        contracts: CONTRACTS_POLICIES.length,
        raises: RAISES_POLICIES.length,
    },
    
    // حسب الفئة
    byCategory: {} as Record<PolicyCategory, number>,
    
    // حسب الصعوبة
    byDifficulty: {
        SIMPLE: ALL_POLICIES.filter(p => p.difficulty === 'SIMPLE').length,
        MEDIUM: ALL_POLICIES.filter(p => p.difficulty === 'MEDIUM').length,
        COMPLEX: ALL_POLICIES.filter(p => p.difficulty === 'COMPLEX').length,
    },
    
    // متوسطات
    avgRating: Math.round((ALL_POLICIES.reduce((sum, p) => sum + p.rating, 0) / ALL_POLICIES.length) * 10) / 10,
    avgPopularity: Math.round(ALL_POLICIES.reduce((sum, p) => sum + p.popularity, 0) / ALL_POLICIES.length),
    
    // عدد الاختبارات
    totalTestCases: ALL_POLICIES.reduce((sum, p) => sum + p.testCases.length, 0),
};

// حساب الإحصائيات حسب الفئة
const categories: PolicyCategory[] = ['ATTENDANCE', 'PAYROLL', 'INCENTIVES', 'DEDUCTIONS', 'LEAVES', 'OVERTIME', 'ALLOWANCES', 'PERFORMANCE', 'COMPLIANCE', 'LOGISTICS', 'SAFETY'];
categories.forEach(cat => {
    POLICY_STATS.byCategory[cat] = ALL_POLICIES.filter(p => p.category === cat).length;
});

// ==========================================
// 🔍 دوال البحث والفلترة المتقدمة
// ==========================================

/**
 * البحث الشامل في السياسات
 */
export function searchPolicies(query: string): PolicyTemplate[] {
    const lowerQuery = query.toLowerCase();
    return ALL_POLICIES.filter(p =>
        p.nameAr.toLowerCase().includes(lowerQuery) ||
        p.nameEn.toLowerCase().includes(lowerQuery) ||
        p.descriptionAr.toLowerCase().includes(lowerQuery) ||
        p.descriptionEn?.toLowerCase().includes(lowerQuery) ||
        p.tags.some(t => t.toLowerCase().includes(lowerQuery)) ||
        p.id.toLowerCase().includes(lowerQuery)
    );
}

/**
 * فلترة حسب الفئة
 */
export function filterByCategory(category: PolicyCategory): PolicyTemplate[] {
    return ALL_POLICIES.filter(p => p.category === category);
}

/**
 * فلترة حسب الصناعة
 */
export function filterByIndustry(industry: string): PolicyTemplate[] {
    return ALL_POLICIES.filter(p => 
        p.industry?.includes(industry) || p.industry?.includes('ALL')
    );
}

/**
 * فلترة حسب مادة نظام العمل
 */
export function filterByLaborArticle(article: string): PolicyTemplate[] {
    return ALL_POLICIES.filter(p => p.laborLawArticle === article);
}

/**
 * فلترة حسب التصنيف الفرعي
 */
export function filterBySubcategory(subcategory: string): PolicyTemplate[] {
    return ALL_POLICIES.filter(p => p.subcategory === subcategory);
}

/**
 * الأكثر شعبية
 */
export function getTopPolicies(limit: number = 20): PolicyTemplate[] {
    return [...ALL_POLICIES]
        .sort((a, b) => b.popularity - a.popularity)
        .slice(0, limit);
}

/**
 * الأعلى تقييماً
 */
export function getTopRatedPolicies(limit: number = 20): PolicyTemplate[] {
    return [...ALL_POLICIES]
        .sort((a, b) => b.rating - a.rating)
        .slice(0, limit);
}

/**
 * السياسات حسب الصعوبة
 */
export function filterByDifficulty(difficulty: 'SIMPLE' | 'MEDIUM' | 'COMPLEX'): PolicyTemplate[] {
    return ALL_POLICIES.filter(p => p.difficulty === difficulty);
}

/**
 * السياسات حسب Tags
 */
export function filterByTags(tags: string[]): PolicyTemplate[] {
    return ALL_POLICIES.filter(p =>
        tags.some(tag => p.tags.map(t => t.toLowerCase()).includes(tag.toLowerCase()))
    );
}

/**
 * البحث المتقدم
 */
export function advancedSearch(filters: {
    query?: string;
    category?: PolicyCategory;
    industry?: string;
    difficulty?: 'SIMPLE' | 'MEDIUM' | 'COMPLEX';
    minRating?: number;
    laborArticle?: string;
    tags?: string[];
}): PolicyTemplate[] {
    let results = ALL_POLICIES;
    
    if (filters.query) {
        results = searchPolicies(filters.query);
    }
    if (filters.category) {
        results = results.filter(p => p.category === filters.category);
    }
    if (filters.industry) {
        results = results.filter(p => p.industry?.includes(filters.industry!) || p.industry?.includes('ALL'));
    }
    if (filters.difficulty) {
        results = results.filter(p => p.difficulty === filters.difficulty);
    }
    if (filters.minRating) {
        results = results.filter(p => p.rating >= filters.minRating!);
    }
    if (filters.laborArticle) {
        results = results.filter(p => p.laborLawArticle === filters.laborArticle);
    }
    if (filters.tags?.length) {
        results = results.filter(p => filters.tags!.some(tag => p.tags.includes(tag)));
    }
    
    return results;
}

// ==========================================
// 📦 التصنيفات المتاحة
// ==========================================

export const AVAILABLE_CATEGORIES = [
    { id: 'LOGISTICS' as PolicyCategory, nameAr: 'اللوجستيات والنقل', nameEn: 'Logistics & Transportation', icon: '🚛' },
    { id: 'ATTENDANCE' as PolicyCategory, nameAr: 'الحضور والانصراف', nameEn: 'Attendance', icon: '⏰' },
    { id: 'PAYROLL' as PolicyCategory, nameAr: 'الرواتب', nameEn: 'Payroll', icon: '💰' },
    { id: 'LEAVES' as PolicyCategory, nameAr: 'الإجازات', nameEn: 'Leaves', icon: '🏖️' },
    { id: 'ALLOWANCES' as PolicyCategory, nameAr: 'البدلات', nameEn: 'Allowances', icon: '💵' },
    { id: 'DEDUCTIONS' as PolicyCategory, nameAr: 'الخصومات', nameEn: 'Deductions', icon: '➖' },
    { id: 'INCENTIVES' as PolicyCategory, nameAr: 'الحوافز والمكافآت', nameEn: 'Incentives & Bonuses', icon: '🎁' },
    { id: 'OVERTIME' as PolicyCategory, nameAr: 'العمل الإضافي', nameEn: 'Overtime', icon: '⏱️' },
    { id: 'PERFORMANCE' as PolicyCategory, nameAr: 'الأداء', nameEn: 'Performance', icon: '📈' },
    { id: 'COMPLIANCE' as PolicyCategory, nameAr: 'الامتثال', nameEn: 'Compliance', icon: '✅' },
    { id: 'SAFETY' as PolicyCategory, nameAr: 'السلامة', nameEn: 'Safety', icon: '🛡️' },
];

export const AVAILABLE_INDUSTRIES = [
    { id: 'ALL', nameAr: 'جميع الصناعات', nameEn: 'All Industries', icon: '🏢' },
    { id: 'LOGISTICS', nameAr: 'اللوجستيات', nameEn: 'Logistics', icon: '🚛' },
    { id: 'DELIVERY', nameAr: 'التوصيل', nameEn: 'Delivery', icon: '📦' },
    { id: 'TRANSPORTATION', nameAr: 'النقل', nameEn: 'Transportation', icon: '🚚' },
    { id: 'WAREHOUSE', nameAr: 'المستودعات', nameEn: 'Warehouse', icon: '🏭' },
    { id: 'RETAIL', nameAr: 'التجزئة', nameEn: 'Retail', icon: '🛒' },
    { id: 'ECOMMERCE', nameAr: 'التجارة الإلكترونية', nameEn: 'E-Commerce', icon: '🛍️' },
    { id: 'FREIGHT', nameAr: 'الشحن', nameEn: 'Freight', icon: '📤' },
    { id: 'SALES', nameAr: 'المبيعات', nameEn: 'Sales', icon: '💼' },
];

export const SAUDI_LABOR_ARTICLES = [
    { article: '66', nameAr: 'الجزاءات التأديبية', nameEn: 'Disciplinary Actions' },
    { article: '80', nameAr: 'إنهاء العقد', nameEn: 'Contract Termination' },
    { article: '84', nameAr: 'مكافأة نهاية الخدمة', nameEn: 'End of Service' },
    { article: '98', nameAr: 'ساعات العمل', nameEn: 'Working Hours' },
    { article: '99', nameAr: 'ساعات رمضان', nameEn: 'Ramadan Hours' },
    { article: '107', nameAr: 'العمل الإضافي', nameEn: 'Overtime' },
    { article: '109', nameAr: 'الإجازة السنوية', nameEn: 'Annual Leave' },
    { article: '111', nameAr: 'بدل الإجازة', nameEn: 'Leave Cash Out' },
    { article: '112', nameAr: 'إجازة الحج', nameEn: 'Hajj Leave' },
    { article: '113', nameAr: 'إجازة الزواج والوفاة', nameEn: 'Marriage & Bereavement' },
    { article: '117', nameAr: 'الإجازة المرضية', nameEn: 'Sick Leave' },
    { article: '137', nameAr: 'إصابات العمل', nameEn: 'Work Injuries' },
    { article: '151', nameAr: 'إجازة الوضع', nameEn: 'Maternity Leave' },
];

// ==========================================
// 📊 طباعة الإحصائيات
// ==========================================

console.log('═══════════════════════════════════════════════════════════');
console.log('📦 Smart Policy Marketplace - Statistics');
console.log('═══════════════════════════════════════════════════════════');
console.log(`📊 إجمالي السياسات: ${POLICY_STATS.total}`);
console.log('───────────────────────────────────────────────────────────');
console.log('📁 حسب الملف:');
Object.entries(POLICY_STATS.bySource).forEach(([key, value]) => {
    console.log(`   • ${key}: ${value} سياسة`);
});
console.log('───────────────────────────────────────────────────────────');
console.log(`⭐ متوسط التقييم: ${POLICY_STATS.avgRating}/5`);
console.log(`📈 متوسط الشعبية: ${POLICY_STATS.avgPopularity}%`);
console.log(`🧪 إجمالي الاختبارات: ${POLICY_STATS.totalTestCases}`);
console.log('═══════════════════════════════════════════════════════════');
