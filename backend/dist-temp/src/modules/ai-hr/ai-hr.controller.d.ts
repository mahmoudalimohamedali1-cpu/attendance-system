import { AiHrService } from './ai-hr.service';
export declare class AiHrController {
    private readonly hrService;
    constructor(hrService: AiHrService);
    generateLetter(body: {
        userId: string;
        letterType: 'experience' | 'salary' | 'employment' | 'recommendation';
        customDetails?: string;
    }): Promise<{
        success: boolean;
        letter: string;
    }>;
    explainPolicy(req: any, body: {
        question: string;
    }): Promise<{
        success: boolean;
        explanation: string;
    }>;
    checkGosiCompliance(req: any): Promise<{
        success: boolean;
        data: {
            compliant: boolean;
            issues: string[];
            recommendations: string[];
            checkDate: Date;
        };
    }>;
    analyzeHiringNeeds(req: any): Promise<{
        success: boolean;
        data: {
            currentHeadcount: number;
            departmentBreakdown: {
                department: string;
                count: number;
            }[];
            recommendations: string[];
        };
    }>;
}
