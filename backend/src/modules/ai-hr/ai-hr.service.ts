import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AiService } from '../ai/ai.service';

@Injectable()
export class AiHrService {
    private readonly logger = new Logger(AiHrService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly aiService: AiService,
    ) { }

    /**
     * 📝 توليد خطاب ذكي
     */
    async generateSmartLetter(
        userId: string,
        letterType: 'experience' | 'salary' | 'employment' | 'recommendation',
        customDetails?: string
    ): Promise<string> {
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

        if (!user) return '❌ لم يتم العثور على الموظف';

        const letterTypes: Record<string, string> = {
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
        } catch (error) {
            this.logger.error(`Letter generation error: ${error.message}`);
            return '❌ حدث خطأ في توليد الخطاب';
        }
    }

    /**
     * 📖 شرح السياسات
     */
    async explainPolicy(policyQuestion: string, userRole: string): Promise<string> {
        const prompt = `أنت خبير في سياسات الموارد البشرية في السعودية. 
        
سؤال الموظف: "${policyQuestion}"
دور السائل: ${userRole === 'ADMIN' ? 'مدير' : userRole === 'HR' ? 'موارد بشرية' : 'موظف'}

أجب بشكل مختصر وواضح بالعربية، مع الإشارة للأنظمة ذات الصلة (نظام العمل السعودي، التأمينات، إلخ) إذا كان مناسباً:`;

        try {
            return await this.aiService.generateContent(prompt);
        } catch (error) {
            this.logger.error(`Policy explanation error: ${error.message}`);
            return '❌ حدث خطأ في شرح السياسة';
        }
    }

    /**
     * 🏛️ فحص امتثال التأمينات الاجتماعية (GOSI)
     */
    async checkGosiCompliance(companyId: string): Promise<{
        compliant: boolean;
        issues: string[];
        recommendations: string[];
        checkDate: Date;
    }> {
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

        const issues: string[] = [];
        const recommendations: string[] = [];

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

    /**
     * 📊 تحليل احتياجات التوظيف
     */
    async analyzeHiringNeeds(companyId: string): Promise<{
        currentHeadcount: number;
        departmentBreakdown: { department: string; count: number }[];
        recommendations: string[];
    }> {
        const employees = await this.prisma.user.findMany({
            where: { companyId, status: 'ACTIVE', role: 'EMPLOYEE' },
            select: { department: true },
        });

        // تجميع حسب الأقسام
        const deptCounts: Record<string, number> = {};
        for (const emp of employees) {
            const dept = String(emp.department || 'غير محدد');
            deptCounts[dept] = (deptCounts[dept] || 0) + 1;
        }

        const departmentBreakdown = Object.entries(deptCounts)
            .map(([department, count]) => ({ department, count }))
            .sort((a, b) => b.count - a.count);

        const recommendations: string[] = [];
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
}
