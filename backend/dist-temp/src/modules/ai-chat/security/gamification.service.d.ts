export interface Quest {
    id: string;
    title: string;
    titleAr: string;
    description: string;
    type: 'daily' | 'weekly' | 'monthly' | 'special';
    target: number;
    progress: number;
    reward: number;
    expiresAt: Date;
    completed: boolean;
}
export interface TriviaQuestion {
    id: string;
    question: string;
    options: string[];
    correctIndex: number;
    category: 'company' | 'hr' | 'safety' | 'general';
    points: number;
}
export interface RewardItem {
    id: string;
    name: string;
    nameAr: string;
    description: string;
    cost: number;
    category: 'voucher' | 'experience' | 'merchandise' | 'time_off';
    available: boolean;
    icon: string;
}
export interface LuckyDraw {
    id: string;
    name: string;
    prize: string;
    prizeAr: string;
    entryCost: number;
    drawDate: Date;
    participants: number;
}
export interface Leaderboard {
    period: 'daily' | 'weekly' | 'monthly' | 'alltime';
    entries: LeaderboardEntry[];
}
export interface LeaderboardEntry {
    rank: number;
    userId: string;
    userName: string;
    points: number;
    badges: number;
    streak: number;
}
export declare class GamificationService {
    private readonly logger;
    private readonly questTemplates;
    private readonly triviaQuestions;
    private readonly rewardItems;
    private readonly luckyDraws;
    getActiveQuests(): Quest[];
    private getQuestExpiry;
    getTriviaQuestion(): TriviaQuestion;
    checkTriviaAnswer(questionId: string, answerIndex: number): {
        correct: boolean;
        points: number;
        message: string;
    };
    getRewardStore(): RewardItem[];
    redeemReward(itemId: string, userPoints: number): {
        success: boolean;
        message: string;
        remainingPoints?: number;
    };
    getLuckyDraws(): LuckyDraw[];
    enterLuckyDraw(drawId: string, userPoints: number): {
        success: boolean;
        message: string;
    };
    formatQuests(quests: Quest[]): string;
    private getProgressBar;
    formatRewardStore(): string;
    private getNextFriday;
    private getEndOfMonth;
}
