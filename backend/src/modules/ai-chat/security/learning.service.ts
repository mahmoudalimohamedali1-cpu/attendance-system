import { Injectable, Logger } from '@nestjs/common';

/**
 * 📚 Learning & Development Service
 * Implements ideas #14-15: Learning recommendations
 * 
 * Features:
 * - Skill-based course recommendations
 * - Learning path generator
 * - Progress tracking
 * - Certificate management
 */

export interface Course {
    id: string;
    title: string;
    titleAr: string;
    category: 'technical' | 'soft_skills' | 'leadership' | 'compliance' | 'language';
    categoryAr: string;
    duration: number; // minutes
    level: 'beginner' | 'intermediate' | 'advanced';
    provider: string;
    rating: number;
    enrollments: number;
    skills: string[];
}

export interface LearningPath {
    id: string;
    name: string;
    nameAr: string;
    description: string;
    courses: Course[];
    totalDuration: number;
    targetRole: string;
}

export interface LearningProgress {
    courseId: string;
    courseName: string;
    progress: number;
    startedAt: Date;
    lastAccessedAt: Date;
    completedAt?: Date;
    certificate?: string;
}

export interface SkillGap {
    skill: string;
    skillAr: string;
    currentLevel: number;
    requiredLevel: number;
    gap: number;
    recommendedCourses: Course[];
}

@Injectable()
export class LearningService {
    private readonly logger = new Logger(LearningService.name);

    // Sample courses database
    private readonly courses: Course[] = [
        { id: '1', title: 'Excel Advanced', titleAr: 'إكسل متقدم', category: 'technical', categoryAr: 'تقني', duration: 120, level: 'intermediate', provider: 'LinkedIn Learning', rating: 4.8, enrollments: 1200, skills: ['excel', 'data_analysis'] },
        { id: '2', title: 'Effective Communication', titleAr: 'التواصل الفعال', category: 'soft_skills', categoryAr: 'مهارات شخصية', duration: 90, level: 'beginner', provider: 'Coursera', rating: 4.6, enrollments: 3500, skills: ['communication', 'presentation'] },
        { id: '3', title: 'Leadership Fundamentals', titleAr: 'أساسيات القيادة', category: 'leadership', categoryAr: 'قيادة', duration: 180, level: 'intermediate', provider: 'Udemy', rating: 4.7, enrollments: 2100, skills: ['leadership', 'team_management'] },
        { id: '4', title: 'Project Management', titleAr: 'إدارة المشاريع', category: 'technical', categoryAr: 'تقني', duration: 240, level: 'intermediate', provider: 'PMI', rating: 4.9, enrollments: 1800, skills: ['project_management', 'planning'] },
        { id: '5', title: 'Data Analysis with Python', titleAr: 'تحليل البيانات بالبايثون', category: 'technical', categoryAr: 'تقني', duration: 300, level: 'advanced', provider: 'DataCamp', rating: 4.7, enrollments: 900, skills: ['python', 'data_analysis'] },
        { id: '6', title: 'Business English', titleAr: 'الإنجليزية للأعمال', category: 'language', categoryAr: 'لغات', duration: 200, level: 'intermediate', provider: 'British Council', rating: 4.5, enrollments: 2800, skills: ['english', 'business_writing'] },
        { id: '7', title: 'Time Management', titleAr: 'إدارة الوقت', category: 'soft_skills', categoryAr: 'مهارات شخصية', duration: 60, level: 'beginner', provider: 'Skillshare', rating: 4.4, enrollments: 4200, skills: ['time_management', 'productivity'] },
        { id: '8', title: 'Cybersecurity Basics', titleAr: 'أساسيات الأمن السيبراني', category: 'compliance', categoryAr: 'امتثال', duration: 90, level: 'beginner', provider: 'Internal', rating: 4.8, enrollments: 5000, skills: ['security', 'compliance'] },
    ];

    // Learning paths
    private readonly learningPaths: LearningPath[] = [
        {
            id: '1',
            name: 'New Manager Track',
            nameAr: 'مسار المدير الجديد',
            description: 'للموظفين المرقين حديثاً لمناصب إدارية',
            courses: [this.courses[2], this.courses[1], this.courses[6]],
            totalDuration: 330,
            targetRole: 'manager',
        },
        {
            id: '2',
            name: 'Data Analyst Track',
            nameAr: 'مسار محلل البيانات',
            description: 'لمن يريد التخصص في تحليل البيانات',
            courses: [this.courses[0], this.courses[4], this.courses[3]],
            totalDuration: 660,
            targetRole: 'analyst',
        },
    ];

    // User progress (in-memory)
    private userProgress: Map<string, LearningProgress[]> = new Map();

    /**
     * 🎯 Get personalized recommendations
     */
    getRecommendations(role: string, skills: string[] = []): Course[] {
        // Filter by role and skills
        let recommended = this.courses;

        // Prioritize courses that fill skill gaps
        if (skills.length > 0) {
            recommended = recommended.filter(course =>
                course.skills.some(skill => !skills.includes(skill))
            );
        }

        // Sort by rating and enrollments
        return recommended
            .sort((a, b) => (b.rating * b.enrollments) - (a.rating * a.enrollments))
            .slice(0, 5);
    }

    /**
     * 📚 Get learning paths
     */
    getLearningPaths(targetRole?: string): LearningPath[] {
        if (targetRole) {
            return this.learningPaths.filter(path => path.targetRole === targetRole);
        }
        return this.learningPaths;
    }

    /**
     * ✅ Enroll in course
     */
    enrollInCourse(userId: string, courseId: string): { success: boolean; message: string } {
        const course = this.courses.find(c => c.id === courseId);
        if (!course) {
            return { success: false, message: '❌ الدورة غير موجودة' };
        }

        const progress: LearningProgress = {
            courseId,
            courseName: course.titleAr,
            progress: 0,
            startedAt: new Date(),
            lastAccessedAt: new Date(),
        };

        const userProgressList = this.userProgress.get(userId) || [];
        userProgressList.push(progress);
        this.userProgress.set(userId, userProgressList);

        return {
            success: true,
            message: `✅ تم التسجيل في "${course.titleAr}"!\n\n⏱️ المدة: ${course.duration} دقيقة\n📊 المستوى: ${this.getLevelAr(course.level)}\n\nابدأ التعلم الآن! 🚀`,
        };
    }

    private getLevelAr(level: Course['level']): string {
        return { beginner: 'مبتدئ', intermediate: 'متوسط', advanced: 'متقدم' }[level];
    }

    /**
     * 📊 Get user's learning progress
     */
    getUserProgress(userId: string): LearningProgress[] {
        return this.userProgress.get(userId) || [];
    }

    /**
     * 📋 Format recommendations as message
     */
    formatRecommendations(courses: Course[]): string {
        let message = '📚 **دورات موصى بها لك:**\n\n';

        for (const course of courses) {
            message += `⭐ **${course.titleAr}**\n`;
            message += `   📁 ${course.categoryAr} | ⏱️ ${course.duration} دقيقة | 📊 ${course.rating}/5\n`;
            message += `   🏫 ${course.provider}\n\n`;
        }

        message += '💡 قل "سجلني في [اسم الدورة]" للتسجيل';
        return message;
    }

    /**
     * 📊 Format progress as message
     */
    formatProgress(userId: string): string {
        const progress = this.getUserProgress(userId);

        if (progress.length === 0) {
            return '📚 لم تسجل في أي دورة بعد.\n\nقل "دورات" لعرض الدورات المتاحة';
        }

        let message = '📊 **تقدمك في التعلم:**\n\n';

        for (const p of progress) {
            const progressBar = this.getProgressBar(p.progress);
            const status = p.completedAt ? '✅' : '📖';
            message += `${status} **${p.courseName}**\n`;
            message += `   ${progressBar} ${p.progress}%\n\n`;
        }

        return message;
    }

    private getProgressBar(percent: number): string {
        const filled = Math.floor(percent / 10);
        const empty = 10 - filled;
        return '▓'.repeat(filled) + '░'.repeat(empty);
    }

    /**
     * 🎯 Analyze skill gaps
     */
    analyzeSkillGaps(currentSkills: { skill: string; level: number }[], targetRole: string): SkillGap[] {
        // Sample required skills for roles
        const roleSkills: Record<string, { skill: string; skillAr: string; required: number }[]> = {
            manager: [
                { skill: 'leadership', skillAr: 'القيادة', required: 80 },
                { skill: 'communication', skillAr: 'التواصل', required: 85 },
                { skill: 'time_management', skillAr: 'إدارة الوقت', required: 75 },
            ],
            analyst: [
                { skill: 'excel', skillAr: 'إكسل', required: 90 },
                { skill: 'data_analysis', skillAr: 'تحليل البيانات', required: 85 },
                { skill: 'python', skillAr: 'بايثون', required: 70 },
            ],
        };

        const required = roleSkills[targetRole] || roleSkills.manager;
        const gaps: SkillGap[] = [];

        for (const req of required) {
            const current = currentSkills.find(s => s.skill === req.skill)?.level || 0;
            if (current < req.required) {
                const gap = req.required - current;
                const recommendedCourses = this.courses.filter(c =>
                    c.skills.includes(req.skill)
                ).slice(0, 2);

                gaps.push({
                    skill: req.skill,
                    skillAr: req.skillAr,
                    currentLevel: current,
                    requiredLevel: req.required,
                    gap,
                    recommendedCourses,
                });
            }
        }

        return gaps.sort((a, b) => b.gap - a.gap);
    }

    /**
     * 📊 Format skill gaps as message
     */
    formatSkillGaps(gaps: SkillGap[]): string {
        if (gaps.length === 0) {
            return '🌟 ممتاز! لديك كل المهارات المطلوبة!';
        }

        let message = '📊 **تحليل الفجوات في المهارات:**\n\n';

        for (const gap of gaps) {
            message += `⚠️ **${gap.skillAr}**\n`;
            message += `   الحالي: ${gap.currentLevel}% | المطلوب: ${gap.requiredLevel}%\n`;
            message += `   الفجوة: ${gap.gap}%\n`;
            if (gap.recommendedCourses.length > 0) {
                message += `   📚 موصى به: ${gap.recommendedCourses.map(c => c.titleAr).join(', ')}\n`;
            }
            message += '\n';
        }

        return message;
    }
}
