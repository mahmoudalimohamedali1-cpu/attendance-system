import { Injectable, Logger } from '@nestjs/common';

/**
 * ⚖️ Compliance Assistant Service
 * Implements ideas #40-45: Labor law & compliance
 * 
 * Features:
 * - Saudi labor law Q&A
 * - GOSI calculations
 * - End of service calculator
 * - Policy compliance checker
 */

export interface LaborLawArticle {
    id: string;
    articleNumber: string;
    title: string;
    titleAr: string;
    content: string;
    contentAr: string;
    category: 'working_hours' | 'leave' | 'termination' | 'wages' | 'safety' | 'contracts';
    categoryAr: string;
}

export interface GOSICalculation {
    basicSalary: number;
    housingAllowance: number;
    totalInsurable: number;
    employeeShare: number; // 9.75%
    employerShare: number; // 11.75%
    totalContribution: number;
}

export interface EndOfServiceCalculation {
    yearsOfService: number;
    lastSalary: number;
    terminationType: 'resignation' | 'termination' | 'retirement' | 'contract_end';
    entitlement: number;
    breakdown: { period: string; amount: number }[];
}

export interface ComplianceCheck {
    area: string;
    areaAr: string;
    status: 'compliant' | 'warning' | 'violation';
    details: string;
    recommendation?: string;
}

@Injectable()
export class ComplianceAssistantService {
    private readonly logger = new Logger(ComplianceAssistantService.name);

    // Labor law articles database
    private readonly laborLawArticles: LaborLawArticle[] = [
        { id: '1', articleNumber: '98', title: 'Working Hours', titleAr: 'ساعات العمل', content: 'Maximum 8 hours per day or 48 hours per week', contentAr: 'الحد الأقصى 8 ساعات يومياً أو 48 ساعة أسبوعياً', category: 'working_hours', categoryAr: 'ساعات العمل' },
        { id: '2', articleNumber: '99', title: 'Ramadan Hours', titleAr: 'ساعات رمضان', content: 'Maximum 6 hours per day or 36 hours per week during Ramadan for Muslims', contentAr: 'الحد الأقصى 6 ساعات يومياً أو 36 ساعة أسبوعياً للمسلمين في رمضان', category: 'working_hours', categoryAr: 'ساعات العمل' },
        { id: '3', articleNumber: '109', title: 'Annual Leave', titleAr: 'الإجازة السنوية', content: '21 days for less than 5 years, 30 days for 5+ years', contentAr: '21 يوم لأقل من 5 سنوات، 30 يوم لـ 5 سنوات فأكثر', category: 'leave', categoryAr: 'الإجازات' },
        { id: '4', articleNumber: '113', title: 'Sick Leave', titleAr: 'الإجازة المرضية', content: '30 days full pay, 60 days 75%, 30 days unpaid', contentAr: '30 يوم براتب كامل، 60 يوم بـ 75%، 30 يوم بدون راتب', category: 'leave', categoryAr: 'الإجازات' },
        { id: '5', articleNumber: '84', title: 'End of Service', titleAr: 'مكافأة نهاية الخدمة', content: 'Half month for first 5 years, full month after', contentAr: 'نصف شهر لأول 5 سنوات، شهر كامل بعدها', category: 'termination', categoryAr: 'إنهاء الخدمة' },
        { id: '6', articleNumber: '74', title: 'Contract Termination', titleAr: 'إنهاء العقد', content: 'Notice period and valid reasons required', contentAr: 'يتطلب فترة إشعار وأسباب معتبرة', category: 'termination', categoryAr: 'إنهاء الخدمة' },
        { id: '7', articleNumber: '90', title: 'Minimum Wage', titleAr: 'الحد الأدنى للأجور', content: 'Minimum 4000 SAR for Saudis in Nitaqat', contentAr: 'الحد الأدنى 4000 ريال للسعوديين في نطاقات', category: 'wages', categoryAr: 'الأجور' },
        { id: '8', articleNumber: '122', title: 'Maternity Leave', titleAr: 'إجازة الأمومة', content: '10 weeks with full pay', contentAr: '10 أسابيع براتب كامل', category: 'leave', categoryAr: 'الإجازات' },
    ];

    // FAQ database
    private readonly faqPatterns: { pattern: RegExp; articleId: string }[] = [
        { pattern: /ساعات العمل|كم ساعة|working hours/i, articleId: '1' },
        { pattern: /رمضان|ramadan/i, articleId: '2' },
        { pattern: /إجازة سنوية|annual leave|كم يوم إجازة/i, articleId: '3' },
        { pattern: /مرضية|sick leave|إجازة مرض/i, articleId: '4' },
        { pattern: /نهاية الخدمة|end of service|مكافأة/i, articleId: '5' },
        { pattern: /إنهاء العقد|فصل|termination/i, articleId: '6' },
        { pattern: /الحد الأدنى|minimum wage|أقل راتب/i, articleId: '7' },
        { pattern: /أمومة|maternity|وضع/i, articleId: '8' },
    ];

    /**
     * ❓ Answer labor law question
     */
    answerQuestion(question: string): { found: boolean; article?: LaborLawArticle; message: string } {
        for (const { pattern, articleId } of this.faqPatterns) {
            if (pattern.test(question)) {
                const article = this.laborLawArticles.find(a => a.id === articleId);
                if (article) {
                    return {
                        found: true,
                        article,
                        message: this.formatArticle(article),
                    };
                }
            }
        }

        return {
            found: false,
            message: '❓ لم أجد إجابة محددة. جرب:\n• ساعات العمل\n• الإجازة السنوية\n• مكافأة نهاية الخدمة\n• إجازة الأمومة',
        };
    }

    private formatArticle(article: LaborLawArticle): string {
        return `⚖️ **${article.titleAr}** (المادة ${article.articleNumber})\n\n${article.contentAr}\n\n📁 ${article.categoryAr}`;
    }

    /**
     * 💰 Calculate GOSI contributions
     */
    calculateGOSI(basicSalary: number, housingAllowance: number = 0): GOSICalculation {
        const totalInsurable = Math.min(45000, basicSalary + housingAllowance);
        const employeeShare = totalInsurable * 0.0975; // 9.75%
        const employerShare = totalInsurable * 0.1175; // 11.75%

        return {
            basicSalary,
            housingAllowance,
            totalInsurable,
            employeeShare: Math.round(employeeShare * 100) / 100,
            employerShare: Math.round(employerShare * 100) / 100,
            totalContribution: Math.round((employeeShare + employerShare) * 100) / 100,
        };
    }

    /**
     * 🧮 Calculate end of service
     */
    calculateEndOfService(
        yearsOfService: number,
        lastSalary: number,
        terminationType: EndOfServiceCalculation['terminationType']
    ): EndOfServiceCalculation {
        const breakdown: { period: string; amount: number }[] = [];
        let entitlement = 0;

        // First 5 years: half month per year
        const firstFiveYears = Math.min(5, yearsOfService);
        if (firstFiveYears > 0) {
            const amount = (lastSalary / 2) * firstFiveYears;
            breakdown.push({ period: `أول ${firstFiveYears} سنوات (نصف شهر/سنة)`, amount });
            entitlement += amount;
        }

        // After 5 years: full month per year
        const remainingYears = Math.max(0, yearsOfService - 5);
        if (remainingYears > 0) {
            const amount = lastSalary * remainingYears;
            breakdown.push({ period: `${remainingYears} سنوات إضافية (شهر/سنة)`, amount });
            entitlement += amount;
        }

        // Apply resignation reduction if applicable
        if (terminationType === 'resignation') {
            if (yearsOfService < 2) {
                entitlement = 0;
                breakdown.push({ period: 'استقالة أقل من سنتين', amount: 0 });
            } else if (yearsOfService < 5) {
                entitlement = entitlement / 3;
                breakdown.push({ period: 'استقالة (ثلث المكافأة)', amount: -entitlement * 2 });
            } else if (yearsOfService < 10) {
                entitlement = entitlement * (2 / 3);
                breakdown.push({ period: 'استقالة (ثلثي المكافأة)', amount: -entitlement / 2 });
            }
        }

        return {
            yearsOfService,
            lastSalary,
            terminationType,
            entitlement: Math.round(entitlement),
            breakdown,
        };
    }

    /**
     * ✅ Check policy compliance
     */
    checkCompliance(data: {
        weeklyHours: number;
        overtimeHours: number;
        annualLeaveDays: number;
        yearsOfService: number;
    }): ComplianceCheck[] {
        const checks: ComplianceCheck[] = [];

        // Working hours check
        if (data.weeklyHours > 48) {
            checks.push({
                area: 'working_hours',
                areaAr: 'ساعات العمل',
                status: 'violation',
                details: `${data.weeklyHours} ساعة أسبوعياً (الحد 48)`,
                recommendation: 'تقليل ساعات العمل فوراً',
            });
        } else if (data.weeklyHours > 45) {
            checks.push({
                area: 'working_hours',
                areaAr: 'ساعات العمل',
                status: 'warning',
                details: `${data.weeklyHours} ساعة أسبوعياً`,
                recommendation: 'مراجعة جدول العمل',
            });
        } else {
            checks.push({
                area: 'working_hours',
                areaAr: 'ساعات العمل',
                status: 'compliant',
                details: `${data.weeklyHours} ساعة أسبوعياً ✓`,
            });
        }

        // Annual leave check
        const requiredLeave = data.yearsOfService >= 5 ? 30 : 21;
        if (data.annualLeaveDays < requiredLeave) {
            checks.push({
                area: 'annual_leave',
                areaAr: 'الإجازة السنوية',
                status: 'violation',
                details: `${data.annualLeaveDays} يوم (المطلوب ${requiredLeave})`,
                recommendation: 'تصحيح رصيد الإجازات',
            });
        } else {
            checks.push({
                area: 'annual_leave',
                areaAr: 'الإجازة السنوية',
                status: 'compliant',
                details: `${data.annualLeaveDays} يوم ✓`,
            });
        }

        return checks;
    }

    /**
     * 📊 Format GOSI calculation
     */
    formatGOSICalculation(calc: GOSICalculation): string {
        let message = `💰 **حساب التأمينات الاجتماعية (GOSI)**\n\n`;
        message += `📊 الراتب الأساسي: ${calc.basicSalary.toLocaleString()} ر.س\n`;
        if (calc.housingAllowance > 0) {
            message += `🏠 بدل السكن: ${calc.housingAllowance.toLocaleString()} ر.س\n`;
        }
        message += `💼 الأجر الخاضع: ${calc.totalInsurable.toLocaleString()} ر.س\n\n`;
        message += `👤 حصة الموظف (9.75%): ${calc.employeeShare.toLocaleString()} ر.س\n`;
        message += `🏢 حصة صاحب العمل (11.75%): ${calc.employerShare.toLocaleString()} ر.س\n`;
        message += `📊 **الإجمالي:** ${calc.totalContribution.toLocaleString()} ر.س`;

        return message;
    }

    /**
     * 📊 Format end of service calculation
     */
    formatEndOfService(calc: EndOfServiceCalculation): string {
        const typeNames: Record<string, string> = {
            resignation: 'استقالة',
            termination: 'إنهاء خدمة',
            retirement: 'تقاعد',
            contract_end: 'انتهاء عقد',
        };

        let message = `🧮 **مكافأة نهاية الخدمة**\n\n`;
        message += `📅 سنوات الخدمة: ${calc.yearsOfService} سنة\n`;
        message += `💰 آخر راتب: ${calc.lastSalary.toLocaleString()} ر.س\n`;
        message += `📋 نوع الإنهاء: ${typeNames[calc.terminationType]}\n\n`;

        message += `**التفاصيل:**\n`;
        for (const item of calc.breakdown) {
            message += `• ${item.period}: ${item.amount.toLocaleString()} ر.س\n`;
        }

        message += `\n💵 **الإجمالي:** ${calc.entitlement.toLocaleString()} ر.س`;

        return message;
    }

    /**
     * 📊 Format compliance check
     */
    formatComplianceCheck(checks: ComplianceCheck[]): string {
        let message = `⚖️ **فحص الامتثال:**\n\n`;

        for (const check of checks) {
            const statusEmoji = { compliant: '✅', warning: '⚠️', violation: '❌' }[check.status];
            message += `${statusEmoji} **${check.areaAr}**\n`;
            message += `   ${check.details}\n`;
            if (check.recommendation) {
                message += `   💡 ${check.recommendation}\n`;
            }
            message += '\n';
        }

        return message;
    }
}
