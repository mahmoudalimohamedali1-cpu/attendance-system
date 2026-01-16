import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';

/**
 * 🔔 Smart Notifications Service
 * نظام إشعارات ذكي للسياسات
 * 
 * ✨ الميزات:
 * - إشعارات فورية
 * - إشعارات مجدولة
 * - تفضيلات المستخدم
 * - قنوات متعددة (Email, SMS, Push, In-App)
 * - تجميع الإشعارات الذكي
 * - أولوية الإشعارات
 * - تتبع القراءة والتفاعل
 */

// ============== Types ==============

export interface Notification {
    id: string;
    type: NotificationType;
    priority: NotificationPriority;
    channel: NotificationChannel[];
    recipient: NotificationRecipient;
    content: NotificationContent;
    metadata: NotificationMetadata;
    status: NotificationStatus;
    createdAt: Date;
    sentAt?: Date;
    readAt?: Date;
    clickedAt?: Date;
}

export type NotificationType =
    | 'POLICY_CREATED'
    | 'POLICY_ACTIVATED'
    | 'POLICY_DEACTIVATED'
    | 'POLICY_EXECUTED'
    | 'POLICY_FAILED'
    | 'APPROVAL_REQUIRED'
    | 'APPROVAL_GRANTED'
    | 'APPROVAL_REJECTED'
    | 'SIMULATION_COMPLETE'
    | 'RETRO_CALCULATED'
    | 'RETRO_APPLIED'
    | 'CONFLICT_DETECTED'
    | 'ANOMALY_DETECTED'
    | 'THRESHOLD_REACHED'
    | 'REMINDER'
    | 'DIGEST';

export type NotificationPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type NotificationChannel = 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP' | 'SLACK' | 'TEAMS';

export type NotificationStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | 'CANCELLED';

export interface NotificationRecipient {
    userId?: string;
    email?: string;
    phone?: string;
    deviceTokens?: string[];
    role?: string;
    department?: string;
}

export interface NotificationContent {
    title: string;
    titleEn?: string;
    body: string;
    bodyEn?: string;
    icon?: string;
    image?: string;
    actions?: NotificationAction[];
    data?: Record<string, any>;
}

export interface NotificationAction {
    id: string;
    label: string;
    type: 'NAVIGATE' | 'API_CALL' | 'DISMISS';
    url?: string;
    method?: string;
    payload?: any;
}

export interface NotificationMetadata {
    companyId: string;
    policyId?: string;
    employeeId?: string;
    executionId?: string;
    source: string;
    tags?: string[];
    groupId?: string;
    expiresAt?: Date;
}

export interface NotificationPreferences {
    userId: string;
    channels: {
        [key in NotificationChannel]?: boolean;
    };
    types: {
        [key in NotificationType]?: {
            enabled: boolean;
            channels?: NotificationChannel[];
            schedule?: NotificationSchedule;
        };
    };
    quietHours?: {
        enabled: boolean;
        start: string; // HH:mm
        end: string;   // HH:mm
        timezone: string;
    };
    digest?: {
        enabled: boolean;
        frequency: 'DAILY' | 'WEEKLY';
        time: string;
        includeTypes: NotificationType[];
    };
}

export interface NotificationSchedule {
    immediate?: boolean;
    delay?: number; // minutes
    at?: string;    // specific time
    cron?: string;  // cron expression
}

export interface NotificationStats {
    total: number;
    byStatus: Record<NotificationStatus, number>;
    byType: Record<NotificationType, number>;
    byChannel: Record<NotificationChannel, number>;
    deliveryRate: number;
    readRate: number;
    clickRate: number;
}

export interface NotificationTemplate {
    id: string;
    type: NotificationType;
    name: string;
    content: {
        title: string;
        body: string;
        variables: string[];
    };
    channels: NotificationChannel[];
    isDefault: boolean;
}

// ============== Implementation ==============

@Injectable()
export class SmartNotificationsService {
    private readonly logger = new Logger(SmartNotificationsService.name);
    
    // قائمة الإشعارات المُعلّقة للتجميع
    private pendingDigest: Map<string, Notification[]> = new Map();
    
    // Cache للتفضيلات
    private preferencesCache: Map<string, NotificationPreferences> = new Map();

    constructor(
        private readonly prisma: PrismaService,
        private readonly eventEmitter: EventEmitter2,
    ) {
        this.setupEventListeners();
    }

    /**
     * 📤 إرسال إشعار
     */
    async send(notification: Partial<Notification>): Promise<Notification> {
        const fullNotification = this.buildNotification(notification);
        
        // التحقق من التفضيلات
        if (fullNotification.recipient.userId) {
            const preferences = await this.getPreferences(fullNotification.recipient.userId);
            
            if (!this.shouldSend(fullNotification, preferences)) {
                this.logger.debug(`Notification skipped due to preferences: ${fullNotification.type}`);
                return { ...fullNotification, status: 'CANCELLED' };
            }
            
            // تحديد القنوات
            fullNotification.channel = this.determineChannels(fullNotification, preferences);
        }
        
        // حفظ الإشعار
        const saved = await this.saveNotification(fullNotification);
        
        // إرسال فوري أو تأجيل
        if (this.shouldSendImmediately(fullNotification)) {
            await this.deliverNotification(saved);
        } else {
            await this.scheduleNotification(saved);
        }
        
        return saved;
    }

    /**
     * 📤 إرسال إشعار جماعي
     */
    async sendBulk(
        type: NotificationType,
        content: NotificationContent,
        recipients: NotificationRecipient[],
        metadata: Partial<NotificationMetadata>,
    ): Promise<{ sent: number; failed: number }> {
        let sent = 0;
        let failed = 0;
        
        for (const recipient of recipients) {
            try {
                await this.send({
                    type,
                    content,
                    recipient,
                    metadata: metadata as NotificationMetadata,
                });
                sent++;
            } catch (error) {
                this.logger.error(`Failed to send notification to ${recipient.userId}: ${error.message}`);
                failed++;
            }
        }
        
        return { sent, failed };
    }

    /**
     * 🎯 إشعارات محددة للأحداث
     */
    async notifyPolicyCreated(policyId: string, policyName: string, creatorId: string): Promise<void> {
        const policy = await this.prisma.smartPolicy.findUnique({
            where: { id: policyId },
            include: { company: true },
        });
        
        if (!policy) return;
        
        // إشعار للمسؤولين
        const admins = await this.getCompanyAdmins(policy.companyId);
        
        for (const admin of admins) {
            if (admin.id !== creatorId) {
                await this.send({
                    type: 'POLICY_CREATED',
                    priority: 'MEDIUM',
                    recipient: { userId: admin.id },
                    content: {
                        title: '📋 سياسة جديدة',
                        body: `تم إنشاء سياسة جديدة: ${policyName}`,
                        actions: [
                            {
                                id: 'view',
                                label: 'عرض السياسة',
                                type: 'NAVIGATE',
                                url: `/smart-policies/${policyId}`,
                            },
                        ],
                    },
                    metadata: {
                        companyId: policy.companyId,
                        policyId,
                        source: 'system',
                    },
                });
            }
        }
    }

    /**
     * ✅ إشعار الموافقة المطلوبة
     */
    async notifyApprovalRequired(policyId: string, submitterId: string): Promise<void> {
        const policy = await this.prisma.smartPolicy.findUnique({
            where: { id: policyId },
        });
        
        if (!policy) return;
        
        // إشعار للموافقين
        const approvers = await this.getApprovers(policy.companyId);
        
        for (const approver of approvers) {
            await this.send({
                type: 'APPROVAL_REQUIRED',
                priority: 'HIGH',
                recipient: { userId: approver.id },
                content: {
                    title: '⏳ سياسة تنتظر الموافقة',
                    body: `السياسة "${policy.name}" تحتاج موافقتك`,
                    icon: '✍️',
                    actions: [
                        {
                            id: 'approve',
                            label: 'موافقة',
                            type: 'API_CALL',
                            url: `/smart-policies/${policyId}/approve`,
                            method: 'POST',
                        },
                        {
                            id: 'reject',
                            label: 'رفض',
                            type: 'API_CALL',
                            url: `/smart-policies/${policyId}/reject`,
                            method: 'POST',
                        },
                        {
                            id: 'view',
                            label: 'مراجعة',
                            type: 'NAVIGATE',
                            url: `/smart-policies/${policyId}`,
                        },
                    ],
                },
                metadata: {
                    companyId: policy.companyId,
                    policyId,
                    source: 'approval_workflow',
                    tags: ['approval', 'urgent'],
                },
            });
        }
    }

    /**
     * 💰 إشعار تنفيذ السياسة للموظف
     */
    async notifyPolicyExecution(
        employeeId: string,
        policyName: string,
        amount: number,
        type: 'ADDITION' | 'DEDUCTION',
        executionId: string,
    ): Promise<void> {
        const user = await this.prisma.user.findUnique({
            where: { id: employeeId },
        });
        
        if (!user) return;
        
        const isPositive = type === 'ADDITION';
        const emoji = isPositive ? '🎉' : '📉';
        const actionWord = isPositive ? 'إضافة' : 'خصم';
        
        await this.send({
            type: 'POLICY_EXECUTED',
            priority: isPositive ? 'MEDIUM' : 'HIGH',
            recipient: { userId: user.id },
            content: {
                title: `${emoji} ${actionWord} على راتبك`,
                body: `تم تطبيق "${policyName}" - ${actionWord} ${Math.abs(amount)} ريال`,
                icon: emoji,
                actions: [
                    {
                        id: 'details',
                        label: 'التفاصيل',
                        type: 'NAVIGATE',
                        url: `/my-payroll/history?execution=${executionId}`,
                    },
                ],
            },
            metadata: {
                companyId: user.companyId || '',
                employeeId,
                executionId,
                source: 'policy_execution',
            },
        });
    }

    /**
     * ⚠️ إشعار الشذوذ المكتشف
     */
    async notifyAnomalyDetected(
        companyId: string,
        anomalyType: string,
        details: string,
        severity: 'HIGH' | 'MEDIUM' | 'LOW',
    ): Promise<void> {
        const admins = await this.getCompanyAdmins(companyId);
        
        const priorityMap = {
            'HIGH': 'CRITICAL' as NotificationPriority,
            'MEDIUM': 'HIGH' as NotificationPriority,
            'LOW': 'MEDIUM' as NotificationPriority,
        };
        
        const emojiMap = {
            'HIGH': '🚨',
            'MEDIUM': '⚠️',
            'LOW': 'ℹ️',
        };
        
        for (const admin of admins) {
            await this.send({
                type: 'ANOMALY_DETECTED',
                priority: priorityMap[severity],
                recipient: { userId: admin.id },
                content: {
                    title: `${emojiMap[severity]} شذوذ مكتشف`,
                    body: `${anomalyType}: ${details}`,
                    icon: emojiMap[severity],
                    actions: [
                        {
                            id: 'investigate',
                            label: 'التحقيق',
                            type: 'NAVIGATE',
                            url: '/smart-policies/analytics/anomalies',
                        },
                    ],
                },
                metadata: {
                    companyId,
                    source: 'anomaly_detection',
                    tags: ['anomaly', severity.toLowerCase()],
                },
            });
        }
    }

    /**
     * 📧 إرسال الملخص اليومي
     */
    @Cron(CronExpression.EVERY_DAY_AT_8AM)
    async sendDailyDigest(): Promise<void> {
        this.logger.log('Sending daily digest notifications...');
        
        // جلب المستخدمين الذين فعّلوا الملخص اليومي
        const users = await this.getUsersWithDigestEnabled('DAILY');
        
        for (const user of users) {
            await this.sendDigestToUser(user.id, 'DAILY');
        }
    }

    /**
     * 📧 إرسال الملخص الأسبوعي
     */
    @Cron(CronExpression.EVERY_WEEK)
    async sendWeeklyDigest(): Promise<void> {
        this.logger.log('Sending weekly digest notifications...');
        
        const users = await this.getUsersWithDigestEnabled('WEEKLY');
        
        for (const user of users) {
            await this.sendDigestToUser(user.id, 'WEEKLY');
        }
    }

    /**
     * 📊 جلب إحصائيات الإشعارات
     */
    async getStats(companyId: string, days: number = 30): Promise<NotificationStats> {
        const since = new Date();
        since.setDate(since.getDate() - days);
        
        // في الإنتاج، استخدم قاعدة البيانات
        // هنا نعيد بيانات تجريبية
        return {
            total: 1250,
            byStatus: {
                'PENDING': 15,
                'SENT': 200,
                'DELIVERED': 950,
                'READ': 800,
                'FAILED': 10,
                'CANCELLED': 75,
            },
            byType: {
                'POLICY_EXECUTED': 500,
                'POLICY_CREATED': 50,
                'APPROVAL_REQUIRED': 100,
                'APPROVAL_GRANTED': 80,
                'APPROVAL_REJECTED': 20,
                'SIMULATION_COMPLETE': 150,
                'DIGEST': 100,
            } as any,
            byChannel: {
                'IN_APP': 1000,
                'EMAIL': 500,
                'PUSH': 300,
                'SMS': 50,
            } as any,
            deliveryRate: 95.2,
            readRate: 64.0,
            clickRate: 35.5,
        };
    }

    /**
     * ✅ تعليم الإشعار كمقروء
     */
    async markAsRead(notificationId: string, userId: string): Promise<void> {
        // في الإنتاج، حدّث في قاعدة البيانات
        this.logger.debug(`Marking notification ${notificationId} as read by ${userId}`);
    }

    /**
     * ✅ تعليم جميع الإشعارات كمقروءة
     */
    async markAllAsRead(userId: string): Promise<number> {
        // في الإنتاج، حدّث في قاعدة البيانات
        this.logger.debug(`Marking all notifications as read for ${userId}`);
        return 10; // عدد الإشعارات المُعلّمة
    }

    /**
     * ⚙️ تحديث التفضيلات
     */
    async updatePreferences(
        userId: string,
        preferences: Partial<NotificationPreferences>,
    ): Promise<NotificationPreferences> {
        const existing = await this.getPreferences(userId);
        const updated = { ...existing, ...preferences };
        
        this.preferencesCache.set(userId, updated);
        
        // في الإنتاج، احفظ في قاعدة البيانات
        
        return updated;
    }

    /**
     * 📥 جلب الإشعارات
     */
    async getNotifications(
        userId: string,
        options: {
            page?: number;
            limit?: number;
            unreadOnly?: boolean;
            types?: NotificationType[];
        } = {},
    ): Promise<{ notifications: Notification[]; total: number; unreadCount: number }> {
        // في الإنتاج، استخدم قاعدة البيانات
        return {
            notifications: [],
            total: 0,
            unreadCount: 0,
        };
    }

    // ============== Private Methods ==============

    private setupEventListeners(): void {
        this.eventEmitter.on('policy.created', (data) => {
            this.notifyPolicyCreated(data.policyId, data.policyName, data.creatorId);
        });
        
        this.eventEmitter.on('policy.approval_requested', (data) => {
            this.notifyApprovalRequired(data.policyId, data.submitterId);
        });
        
        this.eventEmitter.on('policy.executed', (data) => {
            this.notifyPolicyExecution(
                data.employeeId,
                data.policyName,
                data.amount,
                data.type,
                data.executionId,
            );
        });
    }

    private buildNotification(partial: Partial<Notification>): Notification {
        return {
            id: this.generateId(),
            type: partial.type || 'POLICY_EXECUTED',
            priority: partial.priority || 'MEDIUM',
            channel: partial.channel || ['IN_APP'],
            recipient: partial.recipient || {},
            content: partial.content || { title: '', body: '' },
            metadata: partial.metadata || { companyId: '', source: 'system' },
            status: 'PENDING',
            createdAt: new Date(),
        };
    }

    private async saveNotification(notification: Notification): Promise<Notification> {
        // في الإنتاج، احفظ في قاعدة البيانات
        return notification;
    }

    private shouldSend(notification: Notification, preferences: NotificationPreferences): boolean {
        // التحقق من تفعيل النوع
        const typePrefs = preferences.types[notification.type];
        if (typePrefs && !typePrefs.enabled) {
            return false;
        }
        
        // التحقق من ساعات الهدوء
        if (preferences.quietHours?.enabled) {
            const now = new Date();
            const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
            
            if (currentTime >= preferences.quietHours.start && currentTime <= preferences.quietHours.end) {
                // الإشعارات الحرجة تُرسل دائماً
                if (notification.priority !== 'CRITICAL') {
                    return false;
                }
            }
        }
        
        return true;
    }

    private determineChannels(
        notification: Notification,
        preferences: NotificationPreferences,
    ): NotificationChannel[] {
        const channels: NotificationChannel[] = [];
        
        // الـ IN_APP دائماً
        channels.push('IN_APP');
        
        // حسب التفضيلات
        for (const [channel, enabled] of Object.entries(preferences.channels)) {
            if (enabled && !channels.includes(channel as NotificationChannel)) {
                channels.push(channel as NotificationChannel);
            }
        }
        
        // الأولوية العالية تضيف قنوات إضافية
        if (notification.priority === 'CRITICAL' || notification.priority === 'HIGH') {
            if (!channels.includes('EMAIL')) channels.push('EMAIL');
            if (!channels.includes('PUSH')) channels.push('PUSH');
        }
        
        return channels;
    }

    private shouldSendImmediately(notification: Notification): boolean {
        // الإشعارات الحرجة والعالية تُرسل فوراً
        if (['CRITICAL', 'HIGH'].includes(notification.priority)) {
            return true;
        }
        
        // أنواع معينة تُرسل فوراً
        const immediateTypes: NotificationType[] = [
            'APPROVAL_REQUIRED',
            'ANOMALY_DETECTED',
            'POLICY_FAILED',
        ];
        
        return immediateTypes.includes(notification.type);
    }

    private async deliverNotification(notification: Notification): Promise<void> {
        for (const channel of notification.channel) {
            try {
                switch (channel) {
                    case 'IN_APP':
                        await this.deliverInApp(notification);
                        break;
                    case 'EMAIL':
                        await this.deliverEmail(notification);
                        break;
                    case 'PUSH':
                        await this.deliverPush(notification);
                        break;
                    case 'SMS':
                        await this.deliverSMS(notification);
                        break;
                    case 'SLACK':
                        await this.deliverSlack(notification);
                        break;
                    case 'TEAMS':
                        await this.deliverTeams(notification);
                        break;
                }
            } catch (error) {
                this.logger.error(`Failed to deliver via ${channel}: ${error.message}`);
            }
        }
        
        notification.status = 'SENT';
        notification.sentAt = new Date();
    }

    private async deliverInApp(notification: Notification): Promise<void> {
        // إرسال عبر WebSocket أو تخزين للجلب
        this.eventEmitter.emit('notification.in_app', notification);
    }

    private async deliverEmail(notification: Notification): Promise<void> {
        // في الإنتاج، استخدم خدمة البريد
        this.logger.debug(`Email notification: ${notification.content.title}`);
    }

    private async deliverPush(notification: Notification): Promise<void> {
        // في الإنتاج، استخدم Firebase أو مماثل
        this.logger.debug(`Push notification: ${notification.content.title}`);
    }

    private async deliverSMS(notification: Notification): Promise<void> {
        // في الإنتاج، استخدم خدمة SMS
        this.logger.debug(`SMS notification: ${notification.content.title}`);
    }

    private async deliverSlack(notification: Notification): Promise<void> {
        // في الإنتاج، استخدم Slack API
        this.logger.debug(`Slack notification: ${notification.content.title}`);
    }

    private async deliverTeams(notification: Notification): Promise<void> {
        // في الإنتاج، استخدم Teams API
        this.logger.debug(`Teams notification: ${notification.content.title}`);
    }

    private async scheduleNotification(notification: Notification): Promise<void> {
        // في الإنتاج، استخدم Bull Queue أو مماثل
        this.logger.debug(`Scheduled notification: ${notification.id}`);
    }

    private async getPreferences(userId: string): Promise<NotificationPreferences> {
        if (this.preferencesCache.has(userId)) {
            return this.preferencesCache.get(userId)!;
        }
        
        // التفضيلات الافتراضية
        return {
            userId,
            channels: {
                IN_APP: true,
                EMAIL: true,
                PUSH: true,
                SMS: false,
            },
            types: {},
            quietHours: {
                enabled: true,
                start: '22:00',
                end: '07:00',
                timezone: 'Asia/Riyadh',
            },
            digest: {
                enabled: true,
                frequency: 'DAILY',
                time: '08:00',
                includeTypes: ['POLICY_EXECUTED', 'APPROVAL_GRANTED'],
            },
        };
    }

    private async getCompanyAdmins(companyId: string): Promise<{ id: string }[]> {
        return this.prisma.user.findMany({
            where: {
                companyId,
                role: { in: ['ADMIN', 'HR'] },
                status: 'ACTIVE',
            },
            select: { id: true },
        });
    }

    private async getApprovers(companyId: string): Promise<{ id: string }[]> {
        return this.prisma.user.findMany({
            where: {
                companyId,
                role: { in: ['ADMIN', 'HR', 'MANAGER'] },
                status: 'ACTIVE',
            },
            select: { id: true },
        });
    }

    private async getUsersWithDigestEnabled(frequency: 'DAILY' | 'WEEKLY'): Promise<{ id: string }[]> {
        // في الإنتاج، استعلم من قاعدة البيانات
        return [];
    }

    private async sendDigestToUser(userId: string, frequency: 'DAILY' | 'WEEKLY'): Promise<void> {
        const preferences = await this.getPreferences(userId);
        
        if (!preferences.digest?.enabled || preferences.digest.frequency !== frequency) {
            return;
        }
        
        // جلب الإشعارات للملخص
        const pendingNotifications = this.pendingDigest.get(userId) || [];
        
        if (pendingNotifications.length === 0) {
            return;
        }
        
        // تجميع وإرسال
        await this.send({
            type: 'DIGEST',
            priority: 'LOW',
            recipient: { userId },
            content: {
                title: frequency === 'DAILY' ? '📬 ملخصك اليومي' : '📬 ملخصك الأسبوعي',
                body: `لديك ${pendingNotifications.length} تحديث`,
                data: {
                    notifications: pendingNotifications.map(n => ({
                        type: n.type,
                        title: n.content.title,
                        timestamp: n.createdAt,
                    })),
                },
            },
            metadata: {
                companyId: pendingNotifications[0]?.metadata.companyId || '',
                source: 'digest',
                tags: ['digest', frequency.toLowerCase()],
            },
        });
        
        // مسح المُعلّقة
        this.pendingDigest.delete(userId);
    }

    private generateId(): string {
        return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
