import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Paper,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    IconButton,
    Chip,
    CircularProgress,
    Button,
    Divider,
} from '@mui/material';
import {
    Notifications as NotificationsIcon,
    CheckCircle,
    Delete,
    MarkEmailRead,
} from '@mui/icons-material';
import { api } from '@/services/api.service';

interface Notification {
    id: string;
    type: string;
    title: string;
    body: string;
    isRead: boolean;
    createdAt: string;
    data?: Record<string, unknown>;
}

export const NotificationsPage: React.FC = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);
    const navigate = useNavigate();

    useEffect(() => {
        loadNotifications();
    }, []);

    const loadNotifications = async () => {
        setLoading(true);
        try {
            const response = await api.get('/notifications') as { data: Notification[]; unreadCount: number };
            setNotifications(response.data || []);
            setUnreadCount(response.unreadCount || 0);
        } catch (error) {
            console.error('Error loading notifications:', error);
        }
        setLoading(false);
    };

    const handleNotificationClick = async (notification: Notification) => {
        // علّم كمقروء
        if (!notification.isRead) {
            await markAsRead(notification.id);
        }

        // توجيه للصفحة المناسبة بناءً على النوع أو data.type
        const notificationType = (notification.data?.type as string) || notification.type;

        if (notificationType) {
            const typeStr = notificationType.toLowerCase();
            if (typeStr.includes('leave') || typeStr === 'leaves') {
                navigate('/leaves');
            } else if (typeStr.includes('letter') || typeStr === 'letters') {
                navigate('/letters');
            } else if (typeStr.includes('raise') || typeStr === 'raises') {
                navigate('/raises');
            } else if (
                typeStr.includes('attendance') ||
                typeStr.includes('check_in') ||
                typeStr.includes('check_out') ||
                typeStr.includes('late') ||
                typeStr === 'late_check_in' ||
                typeStr === 'early_check_out'
            ) {
                navigate('/attendance');
            } else if (typeStr.includes('data_update')) {
                navigate('/data-updates');
            } else if (typeStr.includes('disc') || typeStr.includes('disciplinary')) {
                const caseId = (notification.data?.entityId as string) || (notification.data?.caseId as string);
                if (caseId) {
                    navigate(`/disciplinary/cases/${caseId}`);
                } else {
                    navigate('/disciplinary');
                }
            }
        }
    };

    const markAsRead = async (id: string) => {
        try {
            await api.patch(`/notifications/${id}/read`);
            setNotifications(notifications.map(n =>
                n.id === id ? { ...n, isRead: true } : n
            ));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await api.patch('/notifications/read-all');
            setNotifications(notifications.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    const deleteNotification = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation(); // منع انتقال الحدث للـ ListItem
        try {
            await api.delete(`/notifications/${id}`);
            const deleted = notifications.find(n => n.id === id);
            setNotifications(notifications.filter(n => n.id !== id));
            if (deleted && !deleted.isRead) {
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch (error) {
            console.error('Error deleting notification:', error);
        }
    };

    const handleMarkAsReadClick = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        markAsRead(id);
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return new Intl.DateTimeFormat('ar-SA', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4">
                    الإشعارات
                    {unreadCount > 0 && (
                        <Chip
                            label={`${unreadCount} غير مقروء`}
                            color="error"
                            size="small"
                            sx={{ mr: 2 }}
                        />
                    )}
                </Typography>
                {unreadCount > 0 && (
                    <Button
                        variant="outlined"
                        startIcon={<MarkEmailRead />}
                        onClick={markAllAsRead}
                    >
                        تعليم الكل كمقروء
                    </Button>
                )}
            </Box>

            <Paper>
                {notifications.length === 0 ? (
                    <Box p={4} textAlign="center">
                        <NotificationsIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                        <Typography color="text.secondary">
                            لا توجد إشعارات
                        </Typography>
                    </Box>
                ) : (
                    <List>
                        {notifications.map((notification, index) => (
                            <React.Fragment key={notification.id}>
                                <ListItem
                                    sx={{
                                        bgcolor: notification.isRead ? 'transparent' : 'action.hover',
                                        cursor: 'pointer',
                                        '&:hover': { bgcolor: 'action.selected' },
                                    }}
                                    onClick={() => handleNotificationClick(notification)}
                                    secondaryAction={
                                        <Box>
                                            {!notification.isRead && (
                                                <IconButton
                                                    size="small"
                                                    onClick={(e) => handleMarkAsReadClick(notification.id, e)}
                                                    title="تعليم كمقروء"
                                                >
                                                    <CheckCircle fontSize="small" />
                                                </IconButton>
                                            )}
                                            <IconButton
                                                size="small"
                                                onClick={(e) => deleteNotification(notification.id, e)}
                                                title="حذف"
                                            >
                                                <Delete fontSize="small" />
                                            </IconButton>
                                        </Box>
                                    }
                                >
                                    <ListItemIcon>
                                        <NotificationsIcon
                                            color={notification.isRead ? 'disabled' : 'primary'}
                                        />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={
                                            <Typography fontWeight={notification.isRead ? 'normal' : 'bold'}>
                                                {notification.title}
                                            </Typography>
                                        }
                                        secondary={
                                            <>
                                                <Typography variant="body2" component="span">
                                                    {notification.body}
                                                </Typography>
                                                <Typography
                                                    variant="caption"
                                                    display="block"
                                                    color="text.secondary"
                                                    sx={{ mt: 0.5 }}
                                                >
                                                    {formatDate(notification.createdAt)}
                                                </Typography>
                                            </>
                                        }
                                    />
                                </ListItem>
                                {index < notifications.length - 1 && <Divider />}
                            </React.Fragment>
                        ))}
                    </List>
                )}
            </Paper>
        </Box>
    );
};

export default NotificationsPage;

