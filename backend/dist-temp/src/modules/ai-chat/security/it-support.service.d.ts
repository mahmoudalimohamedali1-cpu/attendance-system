export interface ITTicket {
    id: string;
    userId: string;
    userName: string;
    category: 'hardware' | 'software' | 'network' | 'access' | 'email' | 'other';
    categoryAr: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    createdAt: Date;
    resolvedAt?: Date;
    solution?: string;
}
export interface SelfServiceSolution {
    issue: string;
    issueAr: string;
    steps: string[];
    videoUrl?: string;
}
export declare class ITSupportService {
    private readonly logger;
    private tickets;
    private readonly issuePatterns;
    private readonly categoryNames;
    private readonly selfServiceSolutions;
    createTicket(userId: string, userName: string, message: string): {
        success: boolean;
        ticket?: ITTicket;
        message: string;
        selfService?: SelfServiceSolution;
    };
    private categorizeIssue;
    private findSelfServiceSolution;
    private getPriorityAr;
    getUserTickets(userId: string): ITTicket[];
    formatTickets(userId: string): string;
    resolveTicket(ticketId: string, solution: string): {
        success: boolean;
        message: string;
    };
}
