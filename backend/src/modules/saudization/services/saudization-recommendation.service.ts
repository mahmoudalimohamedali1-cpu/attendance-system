import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { NitaqatCalculatorService, NitaqatColor } from './nitaqat-calculator.service';

export interface SaudizationRecommendation {
    id: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    category: 'HIRING' | 'TRAINING' | 'RETENTION' | 'COMPLIANCE';
    titleAr: string;
    titleEn: string;
    descriptionAr: string;
    descriptionEn: string;
    impact: string;
    timeframe: string;
}

@Injectable()
export class SaudizationRecommendationService {
    private readonly logger = new Logger(SaudizationRecommendationService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly nitaqatCalculator: NitaqatCalculatorService,
    ) { }

    /**
     * Get AI-powered recommendations for improving saudization
     */
    async getRecommendations(companyId: string): Promise<SaudizationRecommendation[]> {
        const recommendations: SaudizationRecommendation[] = [];

        try {
            // Get current statistics
            const employees = await this.prisma.user.findMany({
                where: {
                    companyId,
                    status: 'ACTIVE',
                    role: 'EMPLOYEE',
                },
                select: {
                    id: true,
                    isSaudi: true,
                    departmentId: true,
                    hireDate: true,
                },
            });

            const totalEmployees = employees.length;
            const saudiEmployees = employees.filter(e => e.isSaudi).length;

            const nitaqatResult = await this.nitaqatCalculator.calculateNitaqatBand(
                companyId,
                totalEmployees,
                saudiEmployees,
            );

            // Generate recommendations based on current status
            if (nitaqatResult.color === NitaqatColor.RED) {
                recommendations.push({
                    id: 'urgent-hiring',
                    priority: 'HIGH',
                    category: 'HIRING',
                    titleAr: 'توظيف عاجل للسعوديين',
                    titleEn: 'Urgent Saudi Hiring',
                    descriptionAr: `يجب توظيف ${nitaqatResult.gapToTarget > 0 ? Math.ceil(nitaqatResult.gapToTarget * totalEmployees / 100) : 1} موظف سعودي على الأقل للخروج من النطاق الأحمر`,
                    descriptionEn: `Need to hire at least ${nitaqatResult.gapToTarget > 0 ? Math.ceil(nitaqatResult.gapToTarget * totalEmployees / 100) : 1} Saudi employees to exit the red band`,
                    impact: 'تجنب العقوبات والقيود على استقدام العمالة',
                    timeframe: 'فوري - خلال 30 يوم',
                });

                recommendations.push({
                    id: 'compliance-review',
                    priority: 'HIGH',
                    category: 'COMPLIANCE',
                    titleAr: 'مراجعة الامتثال',
                    titleEn: 'Compliance Review',
                    descriptionAr: 'مراجعة شاملة لوضع السعودة وإعداد خطة تصحيحية',
                    descriptionEn: 'Comprehensive review of saudization status and prepare corrective plan',
                    impact: 'تجنب الغرامات والعقوبات',
                    timeframe: 'خلال أسبوع',
                });
            }

            if (nitaqatResult.color === NitaqatColor.YELLOW) {
                recommendations.push({
                    id: 'proactive-hiring',
                    priority: 'MEDIUM',
                    category: 'HIRING',
                    titleAr: 'خطة توظيف استباقية',
                    titleEn: 'Proactive Hiring Plan',
                    descriptionAr: 'إعداد خطة لتوظيف المزيد من السعوديين للوصول للنطاق الأخضر',
                    descriptionEn: 'Prepare a plan to hire more Saudis to reach the green band',
                    impact: 'الوصول للنطاق الأخضر والحصول على مزايا إضافية',
                    timeframe: 'خلال 3 أشهر',
                });
            }

            if (nitaqatResult.color === NitaqatColor.GREEN || nitaqatResult.color === NitaqatColor.PLATINUM) {
                recommendations.push({
                    id: 'retention-program',
                    priority: 'MEDIUM',
                    category: 'RETENTION',
                    titleAr: 'برنامج الاحتفاظ بالكوادر السعودية',
                    titleEn: 'Saudi Talent Retention Program',
                    descriptionAr: 'تطوير برامج للحفاظ على الموظفين السعوديين وتقليل معدل الاستقالات',
                    descriptionEn: 'Develop programs to retain Saudi employees and reduce turnover',
                    impact: 'الحفاظ على مستوى السعودة الحالي',
                    timeframe: 'مستمر',
                });
            }

            // Training recommendations
            recommendations.push({
                id: 'training-development',
                priority: 'LOW',
                category: 'TRAINING',
                titleAr: 'برامج تأهيل وتدريب',
                titleEn: 'Training & Development Programs',
                descriptionAr: 'إنشاء برامج تدريبية للكوادر السعودية لتأهيلهم للمناصب القيادية',
                descriptionEn: 'Create training programs for Saudi talent to prepare them for leadership roles',
                impact: 'تطوير الكفاءات السعودية وتحسين الإنتاجية',
                timeframe: 'خلال 6 أشهر',
            });

            // Check for departments with low saudization
            const departments = await this.prisma.department.findMany({
                where: { companyId },
                select: { id: true, name: true },
            });

            for (const dept of departments) {
                const deptEmployees = employees.filter(e => e.departmentId === dept.id);
                const deptTotal = deptEmployees.length;
                const deptSaudis = deptEmployees.filter(e => e.isSaudi).length;
                const deptRate = deptTotal > 0 ? (deptSaudis / deptTotal) * 100 : 0;

                if (deptTotal >= 5 && deptRate < 10) {
                    recommendations.push({
                        id: `dept-${dept.id}-saudization`,
                        priority: 'MEDIUM',
                        category: 'HIRING',
                        titleAr: `تحسين السعودة في ${dept.name}`,
                        titleEn: `Improve Saudization in ${dept.name}`,
                        descriptionAr: `نسبة السعودة في ${dept.name} منخفضة (${Math.round(deptRate)}%)، يُنصح بتوظيف سعوديين`,
                        descriptionEn: `Saudization rate in ${dept.name} is low (${Math.round(deptRate)}%), recommend hiring Saudis`,
                        impact: 'توزيع أفضل للسعودة على الإدارات',
                        timeframe: 'خلال 3 أشهر',
                    });
                }
            }

            return recommendations;
        } catch (error) {
            this.logger.error(`Error generating recommendations: ${error.message}`);
            return [];
        }
    }
}
