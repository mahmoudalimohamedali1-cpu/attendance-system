export interface OnboardingChecklist {
    userId: string;
    userName: string;
    startDate: Date;
    progress: number;
    items: ChecklistItem[];
    buddy?: {
        name: string;
        email: string;
    };
    department: string;
}
export interface ChecklistItem {
    id: string;
    title: string;
    titleAr: string;
    description: string;
    category: 'hr' | 'it' | 'team' | 'training' | 'compliance';
    dueDay: number;
    completed: boolean;
    completedAt?: Date;
    link?: string;
}
export interface SystemTourStep {
    id: number;
    title: string;
    titleAr: string;
    description: string;
    action: string;
    completed: boolean;
}
export declare class OnboardingService {
    private readonly logger;
    private checklists;
    private readonly checklistTemplate;
    private readonly tourSteps;
    startOnboarding(userId: string, userName: string, department: string): OnboardingChecklist;
    getChecklist(userId: string): OnboardingChecklist | null;
    completeItem(userId: string, itemId: string): {
        success: boolean;
        message: string;
    };
    getNextItems(userId: string): ChecklistItem[];
    getSystemTour(userId: string): SystemTourStep[];
    formatChecklist(userId: string): string;
    private getProgressBar;
    formatSystemTour(): string;
    assignBuddy(userId: string, buddyName: string, buddyEmail: string): {
        success: boolean;
        message: string;
    };
}
