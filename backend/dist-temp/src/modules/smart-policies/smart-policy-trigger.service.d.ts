import { PrismaService } from "../../common/prisma/prisma.service";
import { SmartPolicyTrigger } from "@prisma/client";
export interface TriggerContext {
    employeeId: string;
    employeeName: string;
    companyId: string;
    event: SmartPolicyTrigger;
    subEvent?: string;
    eventData?: any;
}
export declare class SmartPolicyTriggerService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    triggerEvent(context: TriggerContext): Promise<void>;
    private evaluateAndExecute;
    private evaluateConditions;
    private parseTargetDate;
}
