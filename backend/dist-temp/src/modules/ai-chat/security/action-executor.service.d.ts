import { PrismaService } from '../../../common/prisma/prisma.service';
interface ActionResult {
    success: boolean;
    message: string;
    action: string;
    details?: any;
}
interface ActionContext {
    userId: string;
    companyId: string;
    userRole: string;
    userName: string;
}
export declare class ActionExecutorService {
    private readonly prisma;
    private readonly logger;
    private readonly roleHierarchy;
    constructor(prisma: PrismaService);
    private hasPermission;
    approveLeaveRequest(requestId: string, context: ActionContext): Promise<ActionResult>;
    rejectLeaveRequest(requestId: string, reason: string, context: ActionContext): Promise<ActionResult>;
    approveAdvanceRequest(requestId: string, context: ActionContext): Promise<ActionResult>;
    clockIn(context: ActionContext): Promise<ActionResult>;
    clockOut(context: ActionContext): Promise<ActionResult>;
    submitLeaveRequest(leaveTypeName: string, days: number, context: ActionContext): Promise<ActionResult>;
    findPendingLeaveByName(employeeName: string, companyId: string): Promise<{
        id: string;
        employee: string;
    } | null>;
    findPendingAdvanceByName(employeeName: string, companyId: string): Promise<{
        id: string;
        employee: string;
        amount: number;
    } | null>;
    getPendingForApproval(companyId: string): Promise<string>;
    private logAction;
    approveAllPendingLeaves(context: ActionContext): Promise<ActionResult>;
}
export {};
