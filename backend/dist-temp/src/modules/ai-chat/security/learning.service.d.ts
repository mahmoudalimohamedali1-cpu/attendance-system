export interface Course {
    id: string;
    title: string;
    titleAr: string;
    category: 'technical' | 'soft_skills' | 'leadership' | 'compliance' | 'language';
    categoryAr: string;
    duration: number;
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
export declare class LearningService {
    private readonly logger;
    private readonly courses;
    private readonly learningPaths;
    private userProgress;
    getRecommendations(role: string, skills?: string[]): Course[];
    getLearningPaths(targetRole?: string): LearningPath[];
    enrollInCourse(userId: string, courseId: string): {
        success: boolean;
        message: string;
    };
    private getLevelAr;
    getUserProgress(userId: string): LearningProgress[];
    formatRecommendations(courses: Course[]): string;
    formatProgress(userId: string): string;
    private getProgressBar;
    analyzeSkillGaps(currentSkills: {
        skill: string;
        level: number;
    }[], targetRole: string): SkillGap[];
    formatSkillGaps(gaps: SkillGap[]): string;
}
