/**
 * Performance Reviews & Goals Service
 */
import { api } from './api.service';

// Types
export interface ReviewCycle {
    id: string;
    name: string;
    nameEn?: string;
    type: 'ANNUAL' | 'SEMI_ANNUAL' | 'QUARTERLY' | 'PROJECT_BASED';
    status: 'DRAFT' | 'PLANNING' | 'ACTIVE' | 'CALIBRATION' | 'COMPLETED' | 'CANCELLED';
    periodStart: string;
    periodEnd: string;
    selfReviewStart?: string;
    selfReviewEnd?: string;
    managerReviewStart?: string;
    managerReviewEnd?: string;
    feedbackStart?: string;
    feedbackEnd?: string;
    calibrationStart?: string;
    calibrationEnd?: string;
    includeSelfReview: boolean;
    include360Feedback: boolean;
    includeGoalRating: boolean;
    includeCompetencyRating: boolean;
    goalWeight: number;
    competencyWeight: number;
    valueWeight: number;
    _count?: { reviews: number };
    createdAt: string;
}

export interface PerformanceReview {
    id: string;
    cycleId: string;
    employeeId: string;
    managerId: string;
    status: string;
    selfRating?: number;
    selfComments?: string;
    managerRating?: number;
    managerComments?: string;
    finalRating?: number;
    performanceScore?: number;
    potentialScore?: number;
    nineBoxPosition?: string;
    cycle?: ReviewCycle;
}

export interface Goal {
    id: string;
    title: string;
    titleEn?: string;
    description?: string;
    type: 'INDIVIDUAL' | 'TEAM' | 'DEPARTMENT' | 'COMPANY';
    status: string;
    progress: number;
    targetValue?: number;
    currentValue?: number;
    startDate?: string;
    dueDate?: string;
    weight: number;
    ownerId: string;
    keyResults?: KeyResult[];
}

export interface KeyResult {
    id: string;
    goalId: string;
    title: string;
    targetValue: number;
    currentValue: number;
    progress: number;
    unit: string;
}

export interface Recognition {
    id: string;
    giverId: string;
    receiverId: string;
    type: 'KUDOS' | 'BADGE' | 'AWARD' | 'BONUS';
    message: string;
    pointsAwarded: number;
    coreValueId?: string;
    createdAt: string;
    giver?: { firstName: string; lastName: string; avatar?: string };
    receiver?: { firstName: string; lastName: string; avatar?: string };
    coreValue?: { name: string; color: string; icon: string };
    reactions?: Array<{ emoji: string; userId: string }>;
}

export interface CoreValue {
    id: string;
    name: string;
    nameEn?: string;
    description?: string;
    icon?: string;
    color?: string;
    isActive: boolean;
}

// Performance Reviews API
export const performanceService = {
    // Review Cycles
    async getCycles() {
        return api.get<ReviewCycle[]>('/performance-reviews/cycles');
    },

    async getCycleById(id: string) {
        return api.get<ReviewCycle>(`/performance-reviews/cycles/${id}`);
    },

    async createCycle(data: Partial<ReviewCycle>) {
        return api.post<ReviewCycle>('/performance-reviews/cycles', data);
    },

    async updateCycle(id: string, data: Partial<ReviewCycle>) {
        return api.put<ReviewCycle>(`/performance-reviews/cycles/${id}`, data);
    },

    async startCycle(id: string) {
        return api.post<ReviewCycle>(`/performance-reviews/cycles/${id}/start`);
    },

    async deleteCycle(id: string) {
        return api.delete(`/performance-reviews/cycles/${id}`);
    },

    // Reviews
    async getReviews(cycleId?: string) {
        const params = cycleId ? `?cycleId=${cycleId}` : '';
        return api.get<PerformanceReview[]>(`/performance-reviews/reviews${params}`);
    },

    async getMyReview(cycleId: string) {
        return api.get<PerformanceReview>(`/performance-reviews/my-review/${cycleId}`);
    },

    async submitSelfReview(reviewId: string, data: { selfRating: number; selfComments?: string; selfAchievements?: string; selfChallenges?: string }) {
        return api.post<PerformanceReview>(`/performance-reviews/reviews/${reviewId}/self-review`, data);
    },

    async submitManagerReview(reviewId: string, data: { managerRating: number; managerComments?: string; managerStrengths?: string; managerImprovements?: string }) {
        return api.post<PerformanceReview>(`/performance-reviews/reviews/${reviewId}/manager-review`, data);
    },

    async calibrateReview(reviewId: string, data: { finalRating: number; performanceScore: number; potentialScore: number; calibrationNotes?: string }) {
        return api.post<PerformanceReview>(`/performance-reviews/reviews/${reviewId}/calibrate`, data);
    },

    // 9-Box Grid
    async getNineBoxGrid(cycleId: string) {
        return api.get<{ grid: Record<string, string[]>; distribution: Array<{ position: string; count: number; percentage: string }> }>(`/performance-reviews/cycles/${cycleId}/nine-box-grid`);
    },

    // Analytics
    async getCycleAnalytics(cycleId: string) {
        return api.get<{ stats: Record<string, number>; completionRate: string; avgRating: string | null }>(`/performance-reviews/cycles/${cycleId}/analytics`);
    },

    // AI Goal Assistant
    async generateGoal(prompt: string, context?: string) {
        return api.post<{ goal: { title: string; description: string; metrics: string[] } }>('/performance-reviews/ai/generate-goal', { prompt, context });
    },

    async generateOKR(objective: string, context?: string) {
        return api.post<{ objective: string; keyResults: Array<{ title: string; target: string; unit: string }> }>('/performance-reviews/ai/generate-okr', { objective, context });
    },
};

// Goals API
export const goalsService = {
    async getAll(filters?: { ownerId?: string; type?: string; status?: string }) {
        const params = new URLSearchParams();
        if (filters?.ownerId) params.append('ownerId', filters.ownerId);
        if (filters?.type) params.append('type', filters.type);
        if (filters?.status) params.append('status', filters.status);
        const query = params.toString() ? `?${params}` : '';
        return api.get<Goal[]>(`/goals${query}`);
    },

    async getMyGoals() {
        return api.get<Goal[]>('/goals/my');
    },

    async getTeamGoals() {
        return api.get<Goal[]>('/goals/team');
    },

    async getCompanyGoals() {
        return api.get<Goal[]>('/goals/company');
    },

    async getById(id: string) {
        return api.get<Goal>(`/goals/${id}`);
    },

    async create(data: Partial<Goal>) {
        return api.post<Goal>('/goals', data);
    },

    async update(id: string, data: Partial<Goal>) {
        return api.put<Goal>(`/goals/${id}`, data);
    },

    async delete(id: string) {
        return api.delete(`/goals/${id}`);
    },

    async submitForApproval(id: string) {
        return api.post<Goal>(`/goals/${id}/submit`);
    },

    async approve(id: string) {
        return api.post<Goal>(`/goals/${id}/approve`);
    },

    async reject(id: string, reason: string) {
        return api.post<Goal>(`/goals/${id}/reject`, { reason });
    },

    async checkIn(id: string, data: { newValue: number; statusUpdate?: string; blockers?: string; nextSteps?: string }) {
        return api.post(`/goals/${id}/check-in`, data);
    },

    async addKeyResult(goalId: string, data: { title: string; targetValue: number; unit?: string }) {
        return api.post<KeyResult>(`/goals/${goalId}/key-results`, data);
    },

    // Data Sources (Smart Goals @ Mentions)
    async getDataSources() {
        return api.get<{ key: string; label: string; labelEn: string; icon: string; metrics: string[] }[]>('/goals/data-sources/available');
    },

    async syncGoal(id: string) {
        return api.post<Goal>(`/goals/${id}/sync`);
    },

    async syncAllGoals() {
        return api.post<{ syncedCount: number; totalGoals: number }>('/goals/sync-all');
    },
};

// Recognition API
export const recognitionService = {
    // Core Values
    async getCoreValues() {
        return api.get<CoreValue[]>('/recognition/core-values');
    },

    async createCoreValue(data: Partial<CoreValue>) {
        return api.post<CoreValue>('/recognition/core-values', data);
    },

    async updateCoreValue(id: string, data: Partial<CoreValue>) {
        return api.put<CoreValue>(`/recognition/core-values/${id}`, data);
    },

    async deleteCoreValue(id: string) {
        return api.delete(`/recognition/core-values/${id}`);
    },

    // Recognition
    async giveRecognition(data: { receiverId: string; message: string; coreValueId?: string; pointsAwarded?: number }) {
        return api.post<Recognition>('/recognition', data);
    },

    async getWall(page = 1, limit = 20) {
        return api.get<{ data: Recognition[]; pagination: { page: number; total: number; totalPages: number } }>(`/recognition/wall?page=${page}&limit=${limit}`);
    },

    async getMyRecognitions() {
        return api.get<{ given: Recognition[]; received: Recognition[]; stats: { totalGiven: number; totalReceived: number; totalPointsReceived: number } }>('/recognition/my');
    },

    async addReaction(recognitionId: string, emoji: string) {
        return api.post(`/recognition/${recognitionId}/react`, { emoji });
    },

    async getLeaderboard(period: 'week' | 'month' | 'year' = 'month') {
        return api.get<Array<{ userId: string; points: number }>>(`/recognition/leaderboard?period=${period}`);
    },

    async getStats() {
        return api.get<{ total: number; thisMonth: number; lastMonth: number; growthRate: string }>('/recognition/stats');
    },

    async getTopCoreValues() {
        return api.get<Array<CoreValue & { recognitionCount: number }>>('/recognition/top-values');
    },
};
