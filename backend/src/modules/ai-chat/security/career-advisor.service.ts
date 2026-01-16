import { Injectable, Logger } from '@nestjs/common';

/**
 * 🎯 Career Advisor Service
 * Implements ideas #13-14: Career path navigator & Skill gap analyzer
 * 
 * Features:
 * - Career path visualization
 * - Promotion requirements
 * - Succession planning
 * - Salary progression
 */

export interface CareerPath {
    currentRole: string;
    currentRoleAr: string;
    currentLevel: number;
    nextRoles: CareerOption[];
    lateralMoves: CareerOption[];
    timeInRole: number; // months
}

export interface CareerOption {
    title: string;
    titleAr: string;
    level: number;
    requirements: string[];
    skills: string[];
    avgTimeToReach: number; // months
    salaryIncrease: number; // percentage
    available: boolean;
}

export interface PromotionReadiness {
    employeeId: string;
    employeeName: string;
    currentRole: string;
    targetRole: string;
    readinessScore: number;
    gaps: { skill: string; current: number; required: number }[];
    recommendations: string[];
    estimatedTime: number; // months
}

export interface SalaryProgression {
    currentSalary: number;
    marketAverage: number;
    percentile: number;
    projections: { year: number; estimated: number }[];
}

@Injectable()
export class CareerAdvisorService {
    private readonly logger = new Logger(CareerAdvisorService.name);

    // Career ladder definitions
    private readonly careerLadder: Record<string, { titleAr: string; level: number; nextRoles: string[]; lateral: string[] }> = {
        'junior_engineer': { titleAr: 'مهندس مبتدئ', level: 1, nextRoles: ['engineer'], lateral: ['junior_analyst'] },
        'engineer': { titleAr: 'مهندس', level: 2, nextRoles: ['senior_engineer'], lateral: ['analyst', 'consultant'] },
        'senior_engineer': { titleAr: 'مهندس أول', level: 3, nextRoles: ['lead_engineer', 'architect'], lateral: ['senior_analyst', 'project_manager'] },
        'lead_engineer': { titleAr: 'قائد فريق تقني', level: 4, nextRoles: ['engineering_manager', 'principal_engineer'], lateral: ['product_manager'] },
        'engineering_manager': { titleAr: 'مدير هندسة', level: 5, nextRoles: ['director'], lateral: ['senior_product_manager'] },

        'junior_analyst': { titleAr: 'محلل مبتدئ', level: 1, nextRoles: ['analyst'], lateral: ['junior_engineer'] },
        'analyst': { titleAr: 'محلل', level: 2, nextRoles: ['senior_analyst'], lateral: ['engineer'] },
        'senior_analyst': { titleAr: 'محلل أول', level: 3, nextRoles: ['lead_analyst', 'data_scientist'], lateral: ['senior_engineer'] },

        'coordinator': { titleAr: 'منسق', level: 1, nextRoles: ['specialist'], lateral: [] },
        'specialist': { titleAr: 'أخصائي', level: 2, nextRoles: ['senior_specialist'], lateral: [] },
        'senior_specialist': { titleAr: 'أخصائي أول', level: 3, nextRoles: ['supervisor'], lateral: [] },
        'supervisor': { titleAr: 'مشرف', level: 4, nextRoles: ['manager'], lateral: [] },
        'manager': { titleAr: 'مدير', level: 5, nextRoles: ['senior_manager', 'director'], lateral: [] },
        'senior_manager': { titleAr: 'مدير أول', level: 6, nextRoles: ['director'], lateral: [] },
        'director': { titleAr: 'مدير عام', level: 7, nextRoles: ['vp'], lateral: [] },
    };

    // Role requirements
    private readonly roleRequirements: Record<string, { skills: string[]; experience: number; education?: string }> = {
        'engineer': { skills: ['programming', 'problem_solving'], experience: 12 },
        'senior_engineer': { skills: ['programming', 'system_design', 'mentoring'], experience: 36 },
        'lead_engineer': { skills: ['leadership', 'architecture', 'communication'], experience: 60 },
        'manager': { skills: ['leadership', 'planning', 'communication', 'budgeting'], experience: 48 },
        'senior_manager': { skills: ['strategy', 'leadership', 'stakeholder_management'], experience: 72 },
    };

    /**
     * 🎯 Get career path for role
     */
    getCareerPath(currentRole: string, timeInRole: number = 0): CareerPath {
        const role = this.careerLadder[currentRole] || { titleAr: currentRole, level: 1, nextRoles: [], lateral: [] };

        const nextRoles: CareerOption[] = role.nextRoles.map(nextRole => {
            const next = this.careerLadder[nextRole];
            const reqs = this.roleRequirements[nextRole] || { skills: [], experience: 24 };
            return {
                title: nextRole,
                titleAr: next?.titleAr || nextRole,
                level: next?.level || role.level + 1,
                requirements: reqs.skills.map(s => this.getSkillAr(s)),
                skills: reqs.skills,
                avgTimeToReach: reqs.experience - timeInRole,
                salaryIncrease: (next?.level || role.level + 1) > role.level ? 15 + (next?.level || 1) * 5 : 0,
                available: true,
            };
        });

        const lateralMoves: CareerOption[] = role.lateral.map(lateralRole => {
            const lateral = this.careerLadder[lateralRole];
            return {
                title: lateralRole,
                titleAr: lateral?.titleAr || lateralRole,
                level: lateral?.level || role.level,
                requirements: [],
                skills: [],
                avgTimeToReach: 6,
                salaryIncrease: 0,
                available: true,
            };
        });

        return {
            currentRole,
            currentRoleAr: role.titleAr,
            currentLevel: role.level,
            nextRoles,
            lateralMoves,
            timeInRole,
        };
    }

    private getSkillAr(skill: string): string {
        const map: Record<string, string> = {
            programming: 'البرمجة',
            problem_solving: 'حل المشكلات',
            system_design: 'تصميم الأنظمة',
            mentoring: 'التوجيه',
            leadership: 'القيادة',
            architecture: 'الهندسة المعمارية',
            communication: 'التواصل',
            planning: 'التخطيط',
            budgeting: 'الميزانية',
            strategy: 'الاستراتيجية',
            stakeholder_management: 'إدارة أصحاب المصلحة',
        };
        return map[skill] || skill;
    }

    /**
     * 📊 Assess promotion readiness
     */
    assessPromotionReadiness(
        employeeId: string,
        employeeName: string,
        currentRole: string,
        targetRole: string,
        currentSkills: { skill: string; level: number }[]
    ): PromotionReadiness {
        const reqs = this.roleRequirements[targetRole] || { skills: [], experience: 24 };
        const gaps: PromotionReadiness['gaps'] = [];
        let totalScore = 0;
        const recommendations: string[] = [];

        for (const reqSkill of reqs.skills) {
            const currentSkill = currentSkills.find(s => s.skill === reqSkill);
            const current = currentSkill?.level || 0;
            const required = 70; // Minimum 70% proficiency required

            if (current < required) {
                gaps.push({ skill: this.getSkillAr(reqSkill), current, required });
                recommendations.push(`تطوير مهارة ${this.getSkillAr(reqSkill)}`);
            }

            totalScore += Math.min(100, (current / required) * 100);
        }

        const readinessScore = reqs.skills.length > 0
            ? Math.round(totalScore / reqs.skills.length)
            : 50;

        const estimatedTime = Math.max(0, Math.ceil((100 - readinessScore) / 10) * 3);

        return {
            employeeId,
            employeeName,
            currentRole,
            targetRole,
            readinessScore,
            gaps,
            recommendations,
            estimatedTime,
        };
    }

    /**
     * 💰 Calculate salary progression
     */
    calculateSalaryProgression(currentSalary: number, currentLevel: number): SalaryProgression {
        // Market benchmarks (simplified)
        const marketLevels: Record<number, number> = {
            1: 8000,
            2: 12000,
            3: 18000,
            4: 25000,
            5: 35000,
            6: 50000,
            7: 70000,
        };

        const marketAverage = marketLevels[currentLevel] || 15000;
        const percentile = Math.min(100, Math.round((currentSalary / marketAverage) * 50));

        // Project 5 years with 5% annual increase + promotions
        const projections: { year: number; estimated: number }[] = [];
        let projectedSalary = currentSalary;
        for (let year = 1; year <= 5; year++) {
            projectedSalary *= 1.05; // 5% annual increase
            if (year === 2 || year === 4) {
                projectedSalary *= 1.15; // Promotion bump
            }
            projections.push({ year, estimated: Math.round(projectedSalary) });
        }

        return {
            currentSalary,
            marketAverage,
            percentile,
            projections,
        };
    }

    /**
     * 📊 Format career path as message
     */
    formatCareerPath(path: CareerPath): string {
        let message = `🎯 **مسارك الوظيفي**\n\n`;
        message += `📍 الحالي: **${path.currentRoleAr}** (المستوى ${path.currentLevel})\n`;
        message += `⏱️ في المنصب: ${path.timeInRole} شهر\n\n`;

        if (path.nextRoles.length > 0) {
            message += `⬆️ **الترقيات المتاحة:**\n`;
            for (const role of path.nextRoles) {
                message += `\n🎯 **${role.titleAr}** (المستوى ${role.level})\n`;
                message += `   📈 زيادة الراتب: ~${role.salaryIncrease}%\n`;
                message += `   ⏱️ الوقت المتوقع: ${role.avgTimeToReach} شهر\n`;
                if (role.requirements.length > 0) {
                    message += `   📋 المتطلبات: ${role.requirements.join(', ')}\n`;
                }
            }
        }

        if (path.lateralMoves.length > 0) {
            message += `\n↔️ **انتقالات جانبية:**\n`;
            for (const role of path.lateralMoves) {
                message += `• ${role.titleAr}\n`;
            }
        }

        return message;
    }

    /**
     * 📊 Format readiness assessment
     */
    formatReadinessAssessment(readiness: PromotionReadiness): string {
        const readinessEmoji = readiness.readinessScore >= 80 ? '🟢' : readiness.readinessScore >= 50 ? '🟡' : '🔴';

        let message = `${readinessEmoji} **تقييم الجاهزية للترقية**\n\n`;
        message += `📍 من: ${readiness.currentRole}\n`;
        message += `🎯 إلى: ${readiness.targetRole}\n\n`;
        message += `📊 الجاهزية: **${readiness.readinessScore}%**\n`;
        message += `⏱️ الوقت المتوقع: ${readiness.estimatedTime} شهر\n\n`;

        if (readiness.gaps.length > 0) {
            message += `⚠️ **الفجوات:**\n`;
            for (const gap of readiness.gaps) {
                message += `• ${gap.skill}: ${gap.current}% (مطلوب ${gap.required}%)\n`;
            }
        }

        if (readiness.recommendations.length > 0) {
            message += `\n💡 **التوصيات:**\n`;
            for (const rec of readiness.recommendations) {
                message += `• ${rec}\n`;
            }
        }

        return message;
    }
}
