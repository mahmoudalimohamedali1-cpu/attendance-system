import { AiManagerService } from './ai-manager.service';
export declare class AiManagerController {
    private readonly managerService;
    constructor(managerService: AiManagerService);
    getTeamHealth(req: any): Promise<{
        success: boolean;
        data: import("./ai-manager.service").TeamHealthScore;
    }>;
    getWorkloadDistribution(req: any): Promise<{
        success: boolean;
        data: import("./ai-manager.service").WorkloadDistribution;
    }>;
    getBurnoutRisks(req: any): Promise<{
        success: boolean;
        count: number;
        data: import("./ai-manager.service").BurnoutRisk[];
    }>;
    getManagerInsights(req: any): Promise<{
        success: boolean;
        insights: string;
    }>;
}
