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
var AiHrService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiHrService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const ai_service_1 = require("../ai/ai.service");
let AiHrService = AiHrService_1 = class AiHrService {
    constructor(prisma, aiService) {
        this.prisma = prisma;
        this.aiService = aiService;
        this.logger = new common_1.Logger(AiHrService_1.name);
    }
    async generateSmartLetter(userId, letterType, customDetails) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                firstName: true,
                lastName: true,
                nationalId: true,
                jobTitle: true,
                department: true,
                salary: true,
                hireDate: true,
            },
        });
        if (!user)
            return '❌ لم يتم العثور على الموظف';
        const letterTypes = {
            experience: 'شهادة خبرة',
            salary: 'تعريف بالراتب',
            employment: 'خطاب تعريف',
            recommendation: 'خطاب توصية',
        };
        const yearsOfService = user.hireDate
            ? Math.floor((Date.now() - new Date(user.hireDate).getTime()) / (1000 * 60 * 60 * 24 * 365))
            : 0;
        const prompt = `أنت متخصص في كتابة الخطابات الرسمية للموارد البشرية. اكتب ${letterTypes[letterType]} للموظف التالي:

📋 بيانات الموظف:
- الاسم: ${user.firstName} ${user.lastName}
- المسمى الوظيفي: ${user.jobTitle || 'غير محدد'}
- القسم: ${user.department || 'غير محدد'}
- تاريخ التعيين: ${user.hireDate?.toLocaleDateString('ar-SA') || 'غير محدد'}
- سنوات الخدمة: ${yearsOfService}
- الراتب: ${user.salary ? `${Number(user.salary).toLocaleString('ar-SA')} ريال` : 'غير محدد'}
${customDetails ? `\n📌 ملاحظات إضافية: ${customDetails}` : ''}

اكتب الخطاب بشكل رسمي ومهني بالعربية مع التاريخ الهجري والميلادي:`;
        try {
            return await this.aiService.generateContent(prompt);
        }
        catch (error) {
            this.logger.error(`Letter generation error: ${error.message}`);
            return '❌ حدث خطأ في توليد الخطاب';
        }
    }
    async explainPolicy(policyQuestion, userRole) {
        const prompt = `أنت خبير في سياسات الموارد البشرية في السعودية. 
        
سؤال الموظف: "${policyQuestion}"
دور السائل: ${userRole === 'ADMIN' ? 'مدير' : userRole === 'HR' ? 'موارد بشرية' : 'موظف'}

أجب بشكل مختصر وواضح بالعربية، مع الإشارة للأنظمة ذات الصلة (نظام العمل السعودي، التأمينات، إلخ) إذا كان مناسباً:`;
        try {
            return await this.aiService.generateContent(prompt);
        }
        catch (error) {
            this.logger.error(`Policy explanation error: ${error.message}`);
            return '❌ حدث خطأ في شرح السياسة';
        }
    }
    async checkGosiCompliance(companyId) {
        const employees = await this.prisma.user.findMany({
            where: { companyId, status: 'ACTIVE' },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                nationalId: true,
                salary: true,
                hireDate: true,
            },
        });
        const issues = [];
        const recommendations = [];
        for (const emp of employees) {
            if (!emp.nationalId) {
                issues.push(`⚠️ ${emp.firstName} ${emp.lastName}: رقم الهوية مفقود`);
            }
            const salary = Number(emp.salary) || 0;
            if (salary > 0 && salary < 4000) {
                issues.push(`⚠️ ${emp.firstName} ${emp.lastName}: الراتب أقل من الحد الأدنى`);
            }
            if (!emp.hireDate) {
                recommendations.push(`📋 ${emp.firstName} ${emp.lastName}: إضافة تاريخ التعيين`);
            }
        }
        if (employees.length > 0 && issues.length === 0) {
            recommendations.push('✅ جميع البيانات الأساسية مكتملة');
        }
        return {
            compliant: issues.length === 0,
            issues: issues.length > 0 ? issues.slice(0, 10) : ['✅ لا توجد مشاكل'],
            recommendations: recommendations.slice(0, 5),
            checkDate: new Date(),
        };
    }
    async analyzeHiringNeeds(companyId) {
        const employees = await this.prisma.user.findMany({
            where: { companyId, status: 'ACTIVE', role: 'EMPLOYEE' },
            select: { department: true },
        });
        const deptCounts = {};
        for (const emp of employees) {
            const dept = String(emp.department || 'غير محدد');
            deptCounts[dept] = (deptCounts[dept] || 0) + 1;
        }
        const departmentBreakdown = Object.entries(deptCounts)
            .map(([department, count]) => ({ department, count }))
            .sort((a, b) => b.count - a.count);
        const recommendations = [];
        if (employees.length < 10) {
            recommendations.push('📈 فريق صغير - قد تحتاج توظيف إضافي');
        }
        const unassigned = deptCounts['غير محدد'] || 0;
        if (unassigned > 0) {
            recommendations.push(`📋 ${unassigned} موظف بدون قسم محدد`);
        }
        return {
            currentHeadcount: employees.length,
            departmentBreakdown,
            recommendations: recommendations.length > 0 ? recommendations : ['✅ الهيكل التنظيمي جيد'],
        };
    }
};
exports.AiHrService = AiHrService;
exports.AiHrService = AiHrService = AiHrService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        ai_service_1.AiService])
], AiHrService);
//# sourceMappingURL=ai-hr.service.js.map