import { PrismaService } from '../../common/prisma/prisma.service';
export declare class RecurringTasksScheduler {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    processRecurringTasks(): Promise<void>;
    private shouldCreateNewTask;
    private createRecurringTaskInstance;
    private calculateNextDueDate;
    triggerManually(): Promise<void>;
}
