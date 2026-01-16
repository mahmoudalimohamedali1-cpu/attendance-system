import { PrismaService } from '../../common/prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { AiAgentToolsService } from './ai-agent-tools.service';
export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}
export declare class AiChatService {
    private readonly prisma;
    private readonly aiService;
    private readonly agentTools;
    private readonly logger;
    private conversationHistory;
    constructor(prisma: PrismaService, aiService: AiService, agentTools: AiAgentToolsService);
    chat(userId: string, message: string): Promise<{
        response: string;
        suggestions?: string[];
    }>;
    private parseArabicNumber;
    private extractEmployeeAndValue;
    private extractEmployeeAndText;
    private extractEmployeeAndNumber;
    private detectAndExecuteAction;
    private parseUpdateCommand;
    private extractNameFromMessage;
    private parseAddEmployeeCommand;
    private parseTaskCommand;
    private findEmployeeByName;
    private getEmployeeFullData;
    private analyzeEmployeeTurnover;
    private updateEmployeeField;
    private addLeaveDays;
    private getLeaveBalance;
    private getTodayAttendance;
    private getSalaryInfo;
    private getTeamStatus;
    private getLateEmployees;
    private translateStatus;
    private getUserContext;
    private buildPrompt;
    private extractSuggestions;
    clearHistory(userId: string): void;
    getHistory(userId: string): ChatMessage[];
}
