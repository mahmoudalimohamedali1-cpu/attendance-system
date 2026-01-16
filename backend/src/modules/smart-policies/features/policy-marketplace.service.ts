import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

/**
 * 🛒 Policy Marketplace Service
 * سوق السياسات - اكتشف وشارك أفضل السياسات
 * 
 * ✨ الميزات:
 * - مكتبة قوالب جاهزة
 * - مشاركة السياسات
 * - تقييمات ومراجعات
 * - فئات وتصنيفات
 * - البحث والاكتشاف
 * - التخصيص والاستيراد
 * - المجتمع والنقاشات
 */

// ============== Types ==============

export interface MarketplacePolicy {
    id: string;
    name: string;
    nameEn?: string;
    description: string;
    descriptionEn?: string;
    category: PolicyCategory;
    subcategory?: string;
    tags: string[];
    industry?: string[];
    companySize?: CompanySize[];
    country?: string[];

    // المحتوى
    template: PolicyTemplate;
    variables: TemplateVariable[];

    // الإحصائيات
    stats: PolicyStats;

    // المراجعات
    reviews: PolicyReview[];
    avgRating: number;

    // المالك
    author: PolicyAuthor;
    isOfficial: boolean;
    isVerified: boolean;

    // التسعير
    pricing: PolicyPricing;

    // التاريخ
    createdAt: Date;
    updatedAt: Date;
    publishedAt: Date;
    version: string;
}

export type PolicyCategory =
    | 'ATTENDANCE'
    | 'PERFORMANCE'
    | 'COMPENSATION'
    | 'BENEFITS'
    | 'LEAVE'
    | 'DISCIPLINARY'
    | 'RECOGNITION'
    | 'COMPLIANCE'
    | 'WELLNESS'
    | 'TRAINING'
    | 'OTHER';

export type CompanySize = 'STARTUP' | 'SMALL' | 'MEDIUM' | 'LARGE' | 'ENTERPRISE';

export interface PolicyTemplate {
    trigger: {
        event: string;
        subEvent?: string;
        timing?: string;
    };
    conditions: TemplateCondition[];
    actions: TemplateAction[];
    scope: TemplateScope;
}

export interface TemplateCondition {
    id: string;
    field: string;
    operator: string;
    value: string | number | boolean;
    isVariable: boolean;
    variableName?: string;
}

export interface TemplateAction {
    id: string;
    type: string;
    valueType: string;
    value: string | number;
    isVariable: boolean;
    variableName?: string;
}

export interface TemplateScope {
    type: string;
    isVariable: boolean;
    variableName?: string;
}

export interface TemplateVariable {
    name: string;
    label: string;
    labelEn?: string;
    type: 'TEXT' | 'NUMBER' | 'SELECT' | 'MULTI_SELECT' | 'BOOLEAN';
    defaultValue: any;
    options?: { value: any; label: string }[];
    required: boolean;
    description?: string;
    validation?: {
        min?: number;
        max?: number;
        pattern?: string;
    };
}

export interface PolicyStats {
    downloads: number;
    installs: number;
    activeUsage: number;
    views: number;
    favorites: number;
    shares: number;
    forks: number;
}

export interface PolicyReview {
    id: string;
    userId: string;
    userName: string;
    companyName?: string;
    rating: number;
    title: string;
    content: string;
    pros?: string[];
    cons?: string[];
    isVerifiedPurchase: boolean;
    helpfulCount: number;
    createdAt: Date;
    reply?: {
        content: string;
        createdAt: Date;
    };
}

export interface PolicyAuthor {
    id: string;
    name: string;
    type: 'OFFICIAL' | 'COMPANY' | 'CONSULTANT' | 'COMMUNITY';
    avatar?: string;
    bio?: string;
    website?: string;
    policiesCount: number;
    totalDownloads: number;
    avgRating: number;
    isVerified: boolean;
}

export interface PolicyPricing {
    type: 'FREE' | 'PREMIUM' | 'SUBSCRIPTION';
    price?: number;
    currency?: string;
    billingCycle?: 'MONTHLY' | 'YEARLY' | 'ONE_TIME';
    features?: string[];
    trialDays?: number;
}

export interface MarketplaceFilters {
    search?: string;
    category?: PolicyCategory[];
    industry?: string[];
    companySize?: CompanySize[];
    country?: string[];
    rating?: number;
    pricing?: ('FREE' | 'PREMIUM')[];
    tags?: string[];
    sortBy?: 'POPULAR' | 'NEWEST' | 'TOP_RATED' | 'MOST_DOWNLOADED';
    page?: number;
    limit?: number;
}

export interface MarketplaceSearchResult {
    policies: MarketplacePolicy[];
    total: number;
    page: number;
    totalPages: number;
    filters: {
        categories: { name: string; count: number }[];
        industries: { name: string; count: number }[];
        tags: { name: string; count: number }[];
    };
}

export interface PolicyInstallation {
    id: string;
    policyId: string;
    companyId: string;
    installedBy: string;
    installedAt: Date;
    customizations: Record<string, any>;
    status: 'INSTALLED' | 'CUSTOMIZING' | 'ACTIVE' | 'PAUSED' | 'UNINSTALLED';
    createdPolicyId?: string;
}

export interface FeaturedCollection {
    id: string;
    name: string;
    nameEn?: string;
    description: string;
    image?: string;
    policies: string[];
    displayOrder: number;
}

// ============== Implementation ==============

@Injectable()
export class PolicyMarketplaceService {
    private readonly logger = new Logger(PolicyMarketplaceService.name);

    // Cache للسياسات
    private policiesCache: Map<string, MarketplacePolicy> = new Map();

    // المجموعات المميزة
    private featuredCollections: FeaturedCollection[] = [];

    constructor(private readonly prisma: PrismaService) {
        this.initializeMarketplace();
    }

    // ============== Browse & Search ==============

    /**
     * 🔍 البحث في السوق
     */
    async search(filters: MarketplaceFilters): Promise<MarketplaceSearchResult> {
        let policies = Array.from(this.policiesCache.values());

        // تطبيق الفلاتر
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            policies = policies.filter(
                (p) =>
                    p.name.toLowerCase().includes(searchLower) ||
                    p.description.toLowerCase().includes(searchLower) ||
                    p.tags.some((t) => t.toLowerCase().includes(searchLower)),
            );
        }

        if (filters.category?.length) {
            policies = policies.filter((p) => filters.category!.includes(p.category));
        }

        if (filters.industry?.length) {
            policies = policies.filter(
                (p) => p.industry?.some((i) => filters.industry!.includes(i)),
            );
        }

        if (filters.companySize?.length) {
            policies = policies.filter(
                (p) => p.companySize?.some((s) => filters.companySize!.includes(s)),
            );
        }

        if (filters.rating) {
            policies = policies.filter((p) => p.avgRating >= filters.rating!);
        }

        if (filters.pricing?.length) {
            policies = policies.filter((p) => filters.pricing!.includes(p.pricing.type as any));
        }

        if (filters.tags?.length) {
            policies = policies.filter(
                (p) => filters.tags!.some((t) => p.tags.includes(t)),
            );
        }

        // الترتيب
        switch (filters.sortBy) {
            case 'NEWEST':
                policies.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
                break;
            case 'TOP_RATED':
                policies.sort((a, b) => b.avgRating - a.avgRating);
                break;
            case 'MOST_DOWNLOADED':
                policies.sort((a, b) => b.stats.downloads - a.stats.downloads);
                break;
            case 'POPULAR':
            default:
                policies.sort(
                    (a, b) =>
                        b.stats.downloads + b.stats.favorites * 2 + b.avgRating * 100 -
                        (a.stats.downloads + a.stats.favorites * 2 + a.avgRating * 100),
                );
        }

        // Pagination
        const page = filters.page || 1;
        const limit = filters.limit || 20;
        const start = (page - 1) * limit;
        const paginatedPolicies = policies.slice(start, start + limit);

        // إحصائيات الفلاتر
        const allPolicies = Array.from(this.policiesCache.values());
        const filterStats = {
            categories: this.countByField(allPolicies, 'category'),
            industries: this.countByArrayField(allPolicies, 'industry'),
            tags: this.countByArrayField(allPolicies, 'tags'),
        };

        return {
            policies: paginatedPolicies,
            total: policies.length,
            page,
            totalPages: Math.ceil(policies.length / limit),
            filters: filterStats,
        };
    }

    /**
     * 📋 جلب سياسة
     */
    async getPolicy(policyId: string): Promise<MarketplacePolicy | undefined> {
        const policy = this.policiesCache.get(policyId);

        if (policy) {
            // زيادة عدد المشاهدات
            policy.stats.views++;
        }

        return policy;
    }

    /**
     * ⭐ المجموعات المميزة
     */
    async getFeaturedCollections(): Promise<FeaturedCollection[]> {
        return this.featuredCollections;
    }

    /**
     * 🔥 الأكثر شعبية
     */
    async getPopular(limit: number = 10): Promise<MarketplacePolicy[]> {
        return Array.from(this.policiesCache.values())
            .sort(
                (a, b) =>
                    b.stats.downloads + b.stats.favorites * 2 -
                    (a.stats.downloads + a.stats.favorites * 2),
            )
            .slice(0, limit);
    }

    /**
     * 🆕 الأحدث
     */
    async getNewest(limit: number = 10): Promise<MarketplacePolicy[]> {
        return Array.from(this.policiesCache.values())
            .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
            .slice(0, limit);
    }

    /**
     * 🏆 الأعلى تقييماً
     */
    async getTopRated(limit: number = 10): Promise<MarketplacePolicy[]> {
        return Array.from(this.policiesCache.values())
            .filter((p) => p.reviews.length >= 5)
            .sort((a, b) => b.avgRating - a.avgRating)
            .slice(0, limit);
    }

    /**
     * 💡 اقتراحات
     */
    async getRecommendations(
        companyId: string,
        limit: number = 10,
    ): Promise<MarketplacePolicy[]> {
        // Return popular policies as recommendations
        return this.getPopular(limit);
    }

    // ============== Installation ==============

    /**
     * 📥 تثبيت سياسة
     */
    async installPolicy(
        policyId: string,
        companyId: string,
        userId: string,
        customizations?: Record<string, any>,
    ): Promise<PolicyInstallation> {
        const marketplacePolicy = this.policiesCache.get(policyId);

        if (!marketplacePolicy) {
            throw new Error('السياسة غير موجودة');
        }

        // تطبيق التخصيصات على القالب
        const processedTemplate = this.applyCustomizations(
            marketplacePolicy.template,
            marketplacePolicy.variables,
            customizations || {},
        );

        // إنشاء السياسة في الشركة
        const createdPolicy = await this.prisma.smartPolicy.create({
            data: {
                companyId,
                name: marketplacePolicy.name,
                originalText: `مستوردة من السوق: ${marketplacePolicy.name}`,
                parsedRule: processedTemplate as any,
                triggerEvent: processedTemplate.trigger.event as any,
                scopeType: processedTemplate.scope.type,
                status: 'DRAFT',
                isActive: false,
                createdById: userId,
            },
        });

        // تحديث الإحصائيات
        marketplacePolicy.stats.installs++;
        marketplacePolicy.stats.downloads++;

        const installation: PolicyInstallation = {
            id: this.generateId(),
            policyId,
            companyId,
            installedBy: userId,
            installedAt: new Date(),
            customizations: customizations || {},
            status: 'INSTALLED',
            createdPolicyId: createdPolicy.id,
        };

        this.logger.log(`Policy installed: ${policyId} to company ${companyId}`);

        return installation;
    }

    /**
     * 🔧 معاينة مع التخصيصات
     */
    async previewWithCustomizations(
        policyId: string,
        customizations: Record<string, any>,
    ): Promise<PolicyTemplate> {
        const policy = this.policiesCache.get(policyId);

        if (!policy) {
            throw new Error('السياسة غير موجودة');
        }

        return this.applyCustomizations(policy.template, policy.variables, customizations);
    }

    // ============== Reviews ==============

    /**
     * ⭐ إضافة تقييم
     */
    async addReview(
        policyId: string,
        userId: string,
        review: Omit<PolicyReview, 'id' | 'userId' | 'createdAt' | 'helpfulCount'>,
    ): Promise<PolicyReview> {
        const policy = this.policiesCache.get(policyId);

        if (!policy) {
            throw new Error('السياسة غير موجودة');
        }

        const newReview: PolicyReview = {
            id: this.generateId(),
            userId,
            ...review,
            helpfulCount: 0,
            createdAt: new Date(),
        };

        policy.reviews.push(newReview);
        this.updateAvgRating(policy);

        return newReview;
    }

    /**
     * 👍 تقييم مراجعة كمفيدة
     */
    async markReviewHelpful(policyId: string, reviewId: string): Promise<void> {
        const policy = this.policiesCache.get(policyId);
        const review = policy?.reviews.find((r) => r.id === reviewId);

        if (review) {
            review.helpfulCount++;
        }
    }

    // ============== Favorites ==============

    /**
     * ❤️ إضافة للمفضلة
     */
    async addToFavorites(policyId: string, userId: string): Promise<void> {
        const policy = this.policiesCache.get(policyId);

        if (policy) {
            policy.stats.favorites++;
        }
    }

    /**
     * 💔 إزالة من المفضلة
     */
    async removeFromFavorites(policyId: string, userId: string): Promise<void> {
        const policy = this.policiesCache.get(policyId);

        if (policy && policy.stats.favorites > 0) {
            policy.stats.favorites--;
        }
    }

    // ============== Publishing ==============

    /**
     * 📤 نشر سياسة للسوق
     */
    async publishPolicy(
        companyPolicyId: string,
        companyId: string,
        publishData: {
            name: string;
            description: string;
            category: PolicyCategory;
            tags: string[];
            variables: TemplateVariable[];
            pricing: PolicyPricing;
        },
    ): Promise<MarketplacePolicy> {
        // جلب السياسة من الشركة
        const companyPolicy = await this.prisma.smartPolicy.findUnique({
            where: { id: companyPolicyId },
        });

        if (!companyPolicy || companyPolicy.companyId !== companyId) {
            throw new Error('السياسة غير موجودة أو لا تملك صلاحية نشرها');
        }

        const marketplacePolicy: MarketplacePolicy = {
            id: this.generateId(),
            name: publishData.name,
            description: publishData.description,
            category: publishData.category,
            tags: publishData.tags,
            template: companyPolicy.parsedRule as any,
            variables: publishData.variables,
            stats: {
                downloads: 0,
                installs: 0,
                activeUsage: 0,
                views: 0,
                favorites: 0,
                shares: 0,
                forks: 0,
            },
            reviews: [],
            avgRating: 0,
            author: {
                id: companyId,
                name: 'شركة',
                type: 'COMPANY',
                policiesCount: 1,
                totalDownloads: 0,
                avgRating: 0,
                isVerified: false,
            },
            isOfficial: false,
            isVerified: false,
            pricing: publishData.pricing,
            createdAt: new Date(),
            updatedAt: new Date(),
            publishedAt: new Date(),
            version: '1.0.0',
        };

        this.policiesCache.set(marketplacePolicy.id, marketplacePolicy);

        this.logger.log(`Policy published to marketplace: ${marketplacePolicy.id}`);

        return marketplacePolicy;
    }

    // ============== Categories ==============

    /**
     * 📂 جلب الفئات
     */
    getCategories(): { id: PolicyCategory; name: string; nameEn: string; icon: string; count: number }[] {
        const allPolicies = Array.from(this.policiesCache.values());

        return [
            { id: 'ATTENDANCE', name: 'الحضور والانصراف', nameEn: 'Attendance', icon: '⏰', count: allPolicies.filter(p => p.category === 'ATTENDANCE').length },
            { id: 'PERFORMANCE', name: 'الأداء', nameEn: 'Performance', icon: '📈', count: allPolicies.filter(p => p.category === 'PERFORMANCE').length },
            { id: 'COMPENSATION', name: 'التعويضات', nameEn: 'Compensation', icon: '💰', count: allPolicies.filter(p => p.category === 'COMPENSATION').length },
            { id: 'BENEFITS', name: 'المزايا', nameEn: 'Benefits', icon: '🎁', count: allPolicies.filter(p => p.category === 'BENEFITS').length },
            { id: 'LEAVE', name: 'الإجازات', nameEn: 'Leave', icon: '🏖️', count: allPolicies.filter(p => p.category === 'LEAVE').length },
            { id: 'DISCIPLINARY', name: 'التأديب', nameEn: 'Disciplinary', icon: '⚖️', count: allPolicies.filter(p => p.category === 'DISCIPLINARY').length },
            { id: 'RECOGNITION', name: 'التقدير', nameEn: 'Recognition', icon: '🏆', count: allPolicies.filter(p => p.category === 'RECOGNITION').length },
            { id: 'COMPLIANCE', name: 'الامتثال', nameEn: 'Compliance', icon: '📋', count: allPolicies.filter(p => p.category === 'COMPLIANCE').length },
            { id: 'WELLNESS', name: 'الصحة والعافية', nameEn: 'Wellness', icon: '💪', count: allPolicies.filter(p => p.category === 'WELLNESS').length },
            { id: 'TRAINING', name: 'التدريب', nameEn: 'Training', icon: '📚', count: allPolicies.filter(p => p.category === 'TRAINING').length },
            { id: 'OTHER', name: 'أخرى', nameEn: 'Other', icon: '📌', count: allPolicies.filter(p => p.category === 'OTHER').length },
        ];
    }

    // ============== Initialization ==============

    private initializeMarketplace(): void {
        // إضافة سياسات نموذجية
        this.addSamplePolicies();

        // إضافة المجموعات المميزة
        this.featuredCollections = [
            {
                id: 'essential',
                name: 'السياسات الأساسية',
                nameEn: 'Essential Policies',
                description: 'السياسات الأساسية لكل شركة',
                policies: ['attendance_bonus', 'late_deduction'],
                displayOrder: 1,
            },
            {
                id: 'performance',
                name: 'تعزيز الأداء',
                nameEn: 'Performance Boost',
                description: 'سياسات لتحفيز وتحسين الأداء',
                policies: ['sales_commission', 'target_bonus'],
                displayOrder: 2,
            },
        ];
    }

    private addSamplePolicies(): void {
        const samplePolicies: MarketplacePolicy[] = [
            {
                id: 'attendance_bonus',
                name: 'مكافأة الحضور الكامل',
                nameEn: 'Full Attendance Bonus',
                description: 'مكافأة شهرية للموظفين الذين يحققون حضور كامل بدون تأخير أو غياب',
                category: 'ATTENDANCE',
                tags: ['حضور', 'مكافأة', 'شهري'],
                industry: ['ALL'],
                companySize: ['SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE'],
                country: ['SA', 'AE', 'EG'],
                template: {
                    trigger: { event: 'PAYROLL', timing: 'AFTER' },
                    conditions: [
                        { id: 'c1', field: 'attendance.lateDays', operator: 'EQUALS', value: 0, isVariable: false },
                        { id: 'c2', field: 'attendance.absentDays', operator: 'EQUALS', value: 0, isVariable: false },
                    ],
                    actions: [
                        { id: 'a1', type: 'BONUS', valueType: 'FIXED', value: 500, isVariable: true, variableName: 'bonusAmount' },
                    ],
                    scope: { type: 'ALL', isVariable: false },
                },
                variables: [
                    {
                        name: 'bonusAmount',
                        label: 'قيمة المكافأة',
                        labelEn: 'Bonus Amount',
                        type: 'NUMBER',
                        defaultValue: 500,
                        required: true,
                        validation: { min: 100, max: 5000 },
                    },
                ],
                stats: { downloads: 1250, installs: 890, activeUsage: 650, views: 5000, favorites: 320, shares: 150, forks: 45 },
                reviews: [
                    {
                        id: 'r1',
                        userId: 'u1',
                        userName: 'أحمد محمد',
                        companyName: 'شركة التقنية',
                        rating: 5,
                        title: 'سياسة ممتازة',
                        content: 'ساعدت في تحسين الحضور بشكل ملحوظ',
                        pros: ['سهلة التطبيق', 'نتائج سريعة'],
                        cons: [],
                        isVerifiedPurchase: true,
                        helpfulCount: 25,
                        createdAt: new Date('2024-01-15'),
                    },
                ],
                avgRating: 4.8,
                author: {
                    id: 'official',
                    name: 'فريق السياسات الذكية',
                    type: 'OFFICIAL',
                    policiesCount: 50,
                    totalDownloads: 50000,
                    avgRating: 4.7,
                    isVerified: true,
                },
                isOfficial: true,
                isVerified: true,
                pricing: { type: 'FREE' },
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date('2024-06-01'),
                publishedAt: new Date('2024-01-01'),
                version: '2.1.0',
            },
            {
                id: 'late_deduction',
                name: 'خصم التأخير المتكرر',
                nameEn: 'Repeated Lateness Deduction',
                description: 'خصم تصاعدي للتأخير المتكرر - يزداد مع زيادة مرات التأخير',
                category: 'DISCIPLINARY',
                tags: ['تأخير', 'خصم', 'تصاعدي'],
                industry: ['ALL'],
                companySize: ['SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE'],
                country: ['SA', 'AE'],
                template: {
                    trigger: { event: 'PAYROLL', timing: 'BEFORE' },
                    conditions: [
                        { id: 'c1', field: 'attendance.lateDays', operator: 'GREATER_THAN', value: 3, isVariable: true, variableName: 'threshold' },
                    ],
                    actions: [
                        { id: 'a1', type: 'DEDUCTION', valueType: 'FORMULA', value: '(lateDays - threshold) * deductionPerDay', isVariable: true, variableName: 'deductionPerDay' },
                    ],
                    scope: { type: 'ALL', isVariable: false },
                },
                variables: [
                    {
                        name: 'threshold',
                        label: 'الحد المسموح للتأخير',
                        type: 'NUMBER',
                        defaultValue: 3,
                        required: true,
                        validation: { min: 0, max: 10 },
                    },
                    {
                        name: 'deductionPerDay',
                        label: 'قيمة الخصم لكل يوم',
                        type: 'NUMBER',
                        defaultValue: 50,
                        required: true,
                        validation: { min: 10, max: 500 },
                    },
                ],
                stats: { downloads: 980, installs: 720, activeUsage: 540, views: 3500, favorites: 180, shares: 95, forks: 30 },
                reviews: [],
                avgRating: 4.5,
                author: {
                    id: 'official',
                    name: 'فريق السياسات الذكية',
                    type: 'OFFICIAL',
                    policiesCount: 50,
                    totalDownloads: 50000,
                    avgRating: 4.7,
                    isVerified: true,
                },
                isOfficial: true,
                isVerified: true,
                pricing: { type: 'FREE' },
                createdAt: new Date('2024-01-05'),
                updatedAt: new Date('2024-05-15'),
                publishedAt: new Date('2024-01-05'),
                version: '1.5.0',
            },
            {
                id: 'sales_commission',
                name: 'عمولة المبيعات',
                nameEn: 'Sales Commission',
                description: 'عمولة تلقائية بناءً على تحقيق أهداف المبيعات',
                category: 'COMPENSATION',
                tags: ['مبيعات', 'عمولة', 'أهداف'],
                industry: ['RETAIL', 'SERVICES'],
                companySize: ['SMALL', 'MEDIUM', 'LARGE'],
                country: ['SA', 'AE', 'EG', 'KW'],
                template: {
                    trigger: { event: 'PAYROLL', timing: 'AFTER' },
                    conditions: [
                        { id: 'c1', field: 'performance.targetAchievement', operator: 'GREATER_THAN_OR_EQUAL', value: 100, isVariable: true, variableName: 'targetThreshold' },
                    ],
                    actions: [
                        { id: 'a1', type: 'COMMISSION', valueType: 'PERCENTAGE', value: 5, isVariable: true, variableName: 'commissionRate' },
                    ],
                    scope: { type: 'JOB_TITLE', isVariable: true, variableName: 'applicableRoles' },
                },
                variables: [
                    {
                        name: 'targetThreshold',
                        label: 'نسبة تحقيق الهدف المطلوبة',
                        type: 'NUMBER',
                        defaultValue: 100,
                        required: true,
                        validation: { min: 50, max: 200 },
                    },
                    {
                        name: 'commissionRate',
                        label: 'نسبة العمولة',
                        type: 'NUMBER',
                        defaultValue: 5,
                        required: true,
                        validation: { min: 1, max: 30 },
                    },
                    {
                        name: 'applicableRoles',
                        label: 'الوظائف المشمولة',
                        type: 'MULTI_SELECT',
                        defaultValue: [],
                        required: true,
                        options: [
                            { value: 'sales_rep', label: 'مندوب مبيعات' },
                            { value: 'sales_manager', label: 'مدير مبيعات' },
                            { value: 'account_manager', label: 'مدير حسابات' },
                        ],
                    },
                ],
                stats: { downloads: 750, installs: 520, activeUsage: 380, views: 2800, favorites: 210, shares: 85, forks: 25 },
                reviews: [],
                avgRating: 4.6,
                author: {
                    id: 'official',
                    name: 'فريق السياسات الذكية',
                    type: 'OFFICIAL',
                    policiesCount: 50,
                    totalDownloads: 50000,
                    avgRating: 4.7,
                    isVerified: true,
                },
                isOfficial: true,
                isVerified: true,
                pricing: { type: 'FREE' },
                createdAt: new Date('2024-02-01'),
                updatedAt: new Date('2024-06-01'),
                publishedAt: new Date('2024-02-01'),
                version: '1.2.0',
            },
        ];

        for (const policy of samplePolicies) {
            this.policiesCache.set(policy.id, policy);
        }
    }

    // ============== Helper Methods ==============

    private applyCustomizations(
        template: PolicyTemplate,
        variables: TemplateVariable[],
        customizations: Record<string, any>,
    ): PolicyTemplate {
        const processed = JSON.parse(JSON.stringify(template));

        // تطبيق القيم المخصصة على الشروط
        for (const condition of processed.conditions) {
            if (condition.isVariable && condition.variableName) {
                const customValue = customizations[condition.variableName];
                if (customValue !== undefined) {
                    condition.value = customValue;
                } else {
                    const variable = variables.find((v) => v.name === condition.variableName);
                    condition.value = variable?.defaultValue;
                }
            }
        }

        // تطبيق القيم المخصصة على الإجراءات
        for (const action of processed.actions) {
            if (action.isVariable && action.variableName) {
                const customValue = customizations[action.variableName];
                if (customValue !== undefined) {
                    action.value = customValue;
                } else {
                    const variable = variables.find((v) => v.name === action.variableName);
                    action.value = variable?.defaultValue;
                }
            }
        }

        return processed;
    }

    private updateAvgRating(policy: MarketplacePolicy): void {
        if (policy.reviews.length === 0) {
            policy.avgRating = 0;
            return;
        }

        const sum = policy.reviews.reduce((acc, r) => acc + r.rating, 0);
        policy.avgRating = Math.round((sum / policy.reviews.length) * 10) / 10;
    }

    private countByField(policies: MarketplacePolicy[], field: keyof MarketplacePolicy): { name: string; count: number }[] {
        const counts: Record<string, number> = {};

        for (const policy of policies) {
            const value = String(policy[field]);
            counts[value] = (counts[value] || 0) + 1;
        }

        return Object.entries(counts).map(([name, count]) => ({ name, count }));
    }

    private countByArrayField(policies: MarketplacePolicy[], field: 'industry' | 'tags'): { name: string; count: number }[] {
        const counts: Record<string, number> = {};

        for (const policy of policies) {
            const values = policy[field] || [];
            for (const value of values) {
                counts[value] = (counts[value] || 0) + 1;
            }
        }

        return Object.entries(counts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
    }

    private getCompanySize(employeeCount: number): CompanySize {
        if (employeeCount <= 10) return 'STARTUP';
        if (employeeCount <= 50) return 'SMALL';
        if (employeeCount <= 250) return 'MEDIUM';
        if (employeeCount <= 1000) return 'LARGE';
        return 'ENTERPRISE';
    }

    private generateId(): string {
        return `mp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
