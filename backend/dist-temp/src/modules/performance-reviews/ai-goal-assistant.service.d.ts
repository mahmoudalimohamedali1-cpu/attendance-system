export declare class AiGoalAssistantService {
    private readonly logger;
    private readonly anthropic;
    constructor();
    generateGoal(prompt: string, context?: string): Promise<{
        title: string;
        titleEn?: string;
        description: string;
        targetValue?: number;
        unit?: string;
        suggestions: string[];
    }>;
    generateOKR(objective: string, context?: string): Promise<{
        objective: {
            title: string;
            description: string;
        };
        keyResults: Array<{
            title: string;
            targetValue: number;
            unit: string;
        }>;
    }>;
    summarizeFeedback(feedbackComments: string[]): Promise<{
        summary: string;
        strengths: string[];
        improvements: string[];
        themes: string[];
    }>;
}
