export interface Anniversary {
    userId: string;
    userName: string;
    type: 'work' | 'birthday';
    date: Date;
    years?: number;
    department: string;
}
export interface SocialPost {
    id: string;
    authorId: string;
    authorName: string;
    authorAvatar?: string;
    type: 'update' | 'achievement' | 'milestone' | 'announcement' | 'poll';
    typeAr: string;
    content: string;
    media?: string[];
    likes: number;
    comments: number;
    createdAt: Date;
    pinned: boolean;
}
export interface EmployeeSpotlight {
    userId: string;
    userName: string;
    department: string;
    role: string;
    achievements: string[];
    funFacts: string[];
    quote: string;
    startDate: Date;
    spotlightDate: Date;
}
export interface Poll {
    id: string;
    question: string;
    questionAr: string;
    options: {
        id: string;
        text: string;
        votes: number;
    }[];
    createdBy: string;
    expiresAt: Date;
    totalVotes: number;
    anonymous: boolean;
}
export declare class SocialEngagementService {
    private readonly logger;
    private posts;
    private polls;
    private readonly anniversaries;
    getTodayCelebrations(): {
        birthdays: Anniversary[];
        workAnniversaries: Anniversary[];
    };
    getUpcomingCelebrations(days?: number): Anniversary[];
    createPost(authorId: string, authorName: string, content: string, type?: SocialPost['type']): SocialPost;
    likePost(postId: string): {
        success: boolean;
        likes: number;
    };
    createPoll(createdBy: string, question: string, questionAr: string, options: string[], daysToExpire?: number): Poll;
    votePoll(pollId: string, optionId: string): {
        success: boolean;
        message: string;
    };
    getSpotlight(): EmployeeSpotlight;
    getFeed(limit?: number): SocialPost[];
    formatCelebrations(): string;
    formatSpotlight(): string;
    formatPoll(poll: Poll): string;
}
