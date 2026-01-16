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
var PolicyTemplatesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyTemplatesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const library_1 = require("@prisma/client/runtime/library");
let PolicyTemplatesService = PolicyTemplatesService_1 = class PolicyTemplatesService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(PolicyTemplatesService_1.name);
    }
    async getTemplates(filters) {
        const where = {
            isPublic: filters?.isPublic ?? true,
        };
        if (filters?.category) {
            where.category = filters.category;
        }
        if (filters?.search) {
            where.OR = [
                { name: { contains: filters.search, mode: 'insensitive' } },
                { nameEn: { contains: filters.search, mode: 'insensitive' } },
                { originalText: { contains: filters.search, mode: 'insensitive' } },
            ];
        }
        const templates = await this.prisma.smartPolicyTemplate.findMany({
            where,
            orderBy: [
                { usageCount: 'desc' },
                { rating: 'desc' },
            ],
        });
        this.logger.log(`[TEMPLATES] Found ${templates.length} templates`);
        return templates;
    }
    async getTemplate(templateId) {
        const template = await this.prisma.smartPolicyTemplate.findUnique({
            where: { id: templateId },
        });
        if (!template) {
            throw new common_1.NotFoundException('Template not found');
        }
        return template;
    }
    async useTemplate(templateId, companyId, userId) {
        const template = await this.getTemplate(templateId);
        const policy = await this.prisma.smartPolicy.create({
            data: {
                companyId,
                originalText: template.originalText,
                parsedRule: template.parsedRule || {},
                isActive: false,
                status: 'DRAFT',
                createdById: userId,
                triggerEvent: 'PAYROLL',
            },
        });
        await this.prisma.smartPolicyTemplate.update({
            where: { id: templateId },
            data: {
                usageCount: { increment: 1 },
            },
        });
        this.logger.log(`[TEMPLATES] Template ${templateId} used to create policy ${policy.id}`);
        return {
            policyId: policy.id,
            message: `تم إنشاء سياسة جديدة من القالب "${template.name}"`,
        };
    }
    async rateTemplate(templateId, rating) {
        if (rating < 1 || rating > 5) {
            throw new Error('Rating must be between 1 and 5');
        }
        const template = await this.getTemplate(templateId);
        const currentRating = template.rating ? Number(template.rating) : 0;
        const newRatingCount = template.ratingCount + 1;
        const newRating = ((currentRating * template.ratingCount) + rating) / newRatingCount;
        await this.prisma.smartPolicyTemplate.update({
            where: { id: templateId },
            data: {
                rating: new library_1.Decimal(Math.round(newRating * 10) / 10),
                ratingCount: newRatingCount,
            },
        });
        this.logger.log(`[TEMPLATES] Template ${templateId} rated ${rating}/5`);
        return { rating: newRating, ratingCount: newRatingCount };
    }
    async getCategories() {
        const templates = await this.prisma.smartPolicyTemplate.groupBy({
            by: ['category'],
            where: { isPublic: true },
            _count: { id: true },
        });
        const categoryLabels = {
            SAUDI_LABOR_LAW: 'نظام العمل السعودي',
            STARTUP: 'الشركات الناشئة',
            ENTERPRISE: 'الشركات الكبيرة',
            CUSTOM: 'مخصص',
            ATTENDANCE: 'حضور وانصراف',
            LEAVE: 'إجازات',
            PERFORMANCE: 'أداء',
            BONUS: 'مكافآت',
            PENALTY: 'جزاءات',
        };
        return templates.map((t) => ({
            category: t.category,
            labelAr: categoryLabels[t.category] || t.category,
            count: t._count.id,
        }));
    }
    async seedTemplates() {
        const existingCount = await this.prisma.smartPolicyTemplate.count();
        if (existingCount > 0) {
            this.logger.log('[TEMPLATES] Templates already seeded');
            return { seeded: false, count: existingCount };
        }
        const templates = [
            {
                name: 'خصم التأخير المتدرج',
                nameEn: 'Tiered Late Deduction',
                description: 'خصم متدرج حسب عدد مرات التأخير - أول تأخير تنبيه ثم خصم تصاعدي',
                category: 'ATTENDANCE',
                originalText: 'أول تأخير = تنبيه، ثاني تأخير = 25 ريال، ثالث تأخير = 50 ريال، رابع فأكثر = 100 ريال',
                parsedRule: {
                    type: 'TIERED',
                    trigger: 'LATE',
                    tiers: [
                        { count: 1, action: 'WARNING' },
                        { count: 2, action: 'DEDUCT', value: 25 },
                        { count: 3, action: 'DEDUCT', value: 50 },
                        { count: 4, action: 'DEDUCT', value: 100 },
                    ],
                },
                legalCompliance: { compliant: true },
                laborLawArticles: ['95'],
                isPublic: true,
                isSystemTemplate: true,
            },
            {
                name: 'مكافأة الحضور الكامل',
                nameEn: 'Perfect Attendance Bonus',
                description: 'مكافأة للموظفين بحضور كامل بدون تأخير طوال الشهر',
                category: 'BONUS',
                originalText: 'الموظف الذي يحضر كل أيام الشهر بدون تأخير يحصل على 500 ريال',
                parsedRule: {
                    type: 'BONUS',
                    trigger: 'PAYROLL',
                    conditions: [{ field: 'attendancePercentage', operator: '=', value: 100 }],
                    action: 'ADD',
                    value: 500,
                },
                legalCompliance: { compliant: true },
                laborLawArticles: [],
                isPublic: true,
                isSystemTemplate: true,
            },
            {
                name: 'خصم الغياب بدون عذر',
                nameEn: 'Unexcused Absence Deduction',
                description: 'خصم يوم ونصف عن كل يوم غياب بدون عذر مقبول',
                category: 'PENALTY',
                originalText: 'كل يوم غياب بدون عذر = خصم يوم ونصف من الراتب',
                parsedRule: {
                    type: 'DEDUCTION',
                    trigger: 'PAYROLL',
                    conditions: [{ field: 'unexcusedAbsenceDays', operator: '>', value: 0 }],
                    action: 'DEDUCT',
                    formula: 'unexcusedAbsenceDays * dailySalary * 1.5',
                },
                legalCompliance: { compliant: true, notes: 'متوافق مع المادة 80' },
                laborLawArticles: ['80'],
                isPublic: true,
                isSystemTemplate: true,
            },
            {
                name: 'مكافأة الأداء المتميز',
                nameEn: 'Performance Excellence Bonus',
                description: 'مكافأة للموظفين الحاصلين على تقييم أداء عالي',
                category: 'PERFORMANCE',
                originalText: 'الموظف الذي يحصل على تقييم أداء 4 أو أعلى من 5 يحصل على 1000 ريال',
                parsedRule: {
                    type: 'BONUS',
                    trigger: 'PAYROLL',
                    conditions: [{ field: 'performanceRating', operator: '>=', value: 4 }],
                    action: 'ADD',
                    value: 1000,
                },
                legalCompliance: { compliant: true },
                laborLawArticles: [],
                isPublic: true,
                isSystemTemplate: true,
            },
            {
                name: 'بدل رمضان',
                nameEn: 'Ramadan Allowance',
                description: 'بدل خاص يصرف لجميع الموظفين خلال شهر رمضان',
                category: 'BONUS',
                originalText: 'يصرف 1000 ريال لكل موظف في شهر رمضان',
                parsedRule: {
                    type: 'ALLOWANCE',
                    trigger: 'PAYROLL',
                    conditions: [{ field: 'isRamadan', operator: '=', value: true }],
                    action: 'ADD',
                    value: 1000,
                },
                legalCompliance: { compliant: true },
                laborLawArticles: [],
                isPublic: true,
                isSystemTemplate: true,
            },
            {
                name: 'مكافأة العمل الإضافي',
                nameEn: 'Overtime Premium',
                description: 'أجر إضافي بنسبة 150% لساعات العمل الإضافية',
                category: 'BONUS',
                originalText: 'كل ساعة عمل إضافية = 150% من أجر الساعة العادية',
                parsedRule: {
                    type: 'OVERTIME',
                    trigger: 'PAYROLL',
                    conditions: [{ field: 'overtimeHours', operator: '>', value: 0 }],
                    action: 'ADD',
                    formula: 'overtimeHours * hourlyRate * 1.5',
                },
                legalCompliance: { compliant: true, notes: 'متوافق مع المادة 107' },
                laborLawArticles: ['107'],
                isPublic: true,
                isSystemTemplate: true,
            },
            {
                name: 'خصم الإجازات المرضية المتكررة',
                nameEn: 'Sick Leave Pattern Deduction',
                description: 'خصم للإجازات المرضية المتكررة بدون تقرير طبي',
                category: 'LEAVE',
                originalText: 'أكثر من 3 إجازات مرضية في الشهر بدون تقرير طبي = خصم 200 ريال',
                parsedRule: {
                    type: 'DEDUCTION',
                    trigger: 'PAYROLL',
                    conditions: [{ field: 'undocumentedSickDays', operator: '>', value: 3 }],
                    action: 'DEDUCT',
                    value: 200,
                },
                legalCompliance: { compliant: true, notes: 'يتطلب تقرير طبي للإجازة المرضية' },
                laborLawArticles: ['117'],
                isPublic: true,
                isSystemTemplate: true,
            },
            {
                name: 'حماية الموظف الجديد',
                nameEn: 'New Employee Protection',
                description: 'إعفاء الموظفين الجدد من الخصومات في أول 3 تأخيرات',
                category: 'ATTENDANCE',
                originalText: 'الموظف الجديد (أقل من 3 شهور) لا يخصم منه في أول 3 تأخيرات',
                parsedRule: {
                    type: 'EXCEPTION',
                    trigger: 'PAYROLL',
                    conditions: [
                        { field: 'tenureMonths', operator: '<', value: 3 },
                        { field: 'lateDays', operator: '<=', value: 3 },
                    ],
                    action: 'SKIP',
                },
                legalCompliance: { compliant: true },
                laborLawArticles: [],
                isPublic: true,
                isSystemTemplate: true,
            },
        ];
        await this.prisma.smartPolicyTemplate.createMany({
            data: templates,
        });
        this.logger.log(`[TEMPLATES] Seeded ${templates.length} templates`);
        return { seeded: true, count: templates.length };
    }
};
exports.PolicyTemplatesService = PolicyTemplatesService;
exports.PolicyTemplatesService = PolicyTemplatesService = PolicyTemplatesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PolicyTemplatesService);
//# sourceMappingURL=policy-templates.service.js.map