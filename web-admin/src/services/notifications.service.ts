import { api } from './api.service';

export interface Notification {
    id: string;
    type: string;
    title: string;
    body: string;
    entityType?: string;
    entityId?: string;
    data?: Record<string, unknown>;
    isRead: boolean;
    readAt?: string;
    createdAt: string;
}

export interface NotificationsResponse {
    items: Notification[];
    total: number;
}

export const notificationsService = {
    getNotifications: (options?: { unreadOnly?: boolean; limit?: number; offset?: number }): Promise<NotificationsResponse> =>
        api.get<NotificationsResponse>('/notifications', { params: options }),

    getUnreadCount: (): Promise<{ count: number }> =>
        api.get<{ count: number }>('/notifications/unread-count'),

    markAsRead: (id: string): Promise<{ success: boolean }> =>
        api.post<{ success: boolean }>(`/notifications/${id}/read`),

    markAllAsRead: (): Promise<{ success: boolean }> =>
        api.post<{ success: boolean }>('/notifications/read-all'),
};
