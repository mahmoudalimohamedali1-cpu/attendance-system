export interface Feedback {
    id: string;
    userId?: string;
    type: 'suggestion' | 'complaint' | 'recognition' | 'innovation' | 'question';
    typeAr: string;
    content: string;
    category: 'workplace' | 'management' | 'process' | 'benefits' | 'other';
    anonymous: boolean;
    status: 'new' | 'reviewed' | 'implemented' | 'closed';
    createdAt: Date;
    response?: string;
    respondedAt?: Date;
    votes?: number;
}
export interface Recognition {
    id: string;
    fromUserId: string;
    fromUserName: string;
    toUserId: string;
    toUserName: string;
    message: string;
    category: 'teamwork' | 'innovation' | 'customer' | 'leadership' | 'above_beyond';
    categoryAr: string;
    createdAt: Date;
    likes: number;
}
export interface InnovationIdea {
    id: string;
    userId: string;
    userName: string;
    title: string;
    description: string;
    impact: 'low' | 'medium' | 'high';
    effort: 'low' | 'medium' | 'high';
    status: 'new' | 'under_review' | 'approved' | 'in_progress' | 'implemented' | 'rejected';
    votes: number;
    points: number;
    createdAt: Date;
}
export declare class FeedbackService {
    private readonly logger;
    private feedbacks;
    private recognitions;
    private ideas;
    private readonly typeNames;
    private readonly recognitionCategories;
    submitFeedback(content: string, type: Feedback['type'], category: Feedback['category'], userId?: string, anonymous?: boolean): {
        success: boolean;
        feedback?: Feedback;
        message: string;
    };
    sendRecognition(fromUserId: string, fromUserName: string, toUserId: string, toUserName: string, message: string, category: Recognition['category']): {
        success: boolean;
        recognition?: Recognition;
        message: string;
    };
    submitIdea(userId: string, userName: string, title: string, description: string, impact: InnovationIdea['impact'], effort: InnovationIdea['effort']): {
        success: boolean;
        idea?: InnovationIdea;
        message: string;
    };
    private getImpactAr;
    private getEffortAr;
    voteForIdea(ideaId: string): {
        success: boolean;
        message: string;
    };
    getWallOfFame(limit?: number): Recognition[];
    formatWallOfFame(): string;
    getTopIdeas(limit?: number): InnovationIdea[];
    formatTopIdeas(): string;
    getUserStats(userId: string): {
        suggestions: number;
        recognitionsSent: number;
        recognitionsReceived: number;
        ideas: number;
    };
}
