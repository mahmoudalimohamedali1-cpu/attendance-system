import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationsService } from './notifications.service';
import { PermissionsService } from '../permissions/permissions.service';
export declare class SmartNotificationService {
    private prisma;
    private notificationsService;
    private permissionsService;
    private readonly logger;
    private readonly REMINDER_DAYS;
    private readonly DAILY_SUMMARY_ENABLED;
    constructor(prisma: PrismaService, notificationsService: NotificationsService, permissionsService: PermissionsService);
    sendDailyReminders(): Promise<void>;
    checkOverdueRequests(): Promise<void>;
    private sendPendingRequestReminders;
    private sendOverdueReminders;
    private getApprovers;
    private getPendingCountForApprover;
    private getOverdueRequests;
    private getApproverForRequest;
    private getRequestTypeLabel;
    private getDaysOverdue;
    triggerReminderManually(): Promise<{
        message: string;
    }>;
}
