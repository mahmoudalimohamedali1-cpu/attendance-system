import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
    IconButton,
    Badge,
    Menu,
    Typography,
    Box,
    Divider,
    Button,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    CircularProgress,
} from '@mui/material';
import {
    Notifications as NotificationsIcon,
    Gavel,
    Email,
    CheckCircle,
    DoneAll,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { notificationsService, Notification } from '@/services/notifications.service';

// Notification type icons mapping
const TYPE_ICONS: Record<string, React.ReactNode> = {
    DISC_CASE_SUBMITTED: <Gavel color="warning" />,
    DISC_HR_REJECTED: <Gavel color="error" />,
    DISC_INFORMAL_SENT: <Email color="info" />,
    DISC_EMP_REJECTED_INFORMAL: <Gavel color="error" />,
    DISC_HEARING_SCHEDULED: <Gavel color="primary" />,
    DISC_DECISION_ISSUED: <Gavel color="error" />,
    DISC_EMP_OBJECTED: <Gavel color="warning" />,
    DISC_FINALIZED: <CheckCircle color="success" />,
};

export const NotificationsBell = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);

    // Fetch unread count (poll every 30 seconds)
    const { data: countData } = useQuery({
        queryKey: ['notifications-unread-count'],
        queryFn: notificationsService.getUnreadCount,
        refetchInterval: 30000,
    });

    // Fetch notifications when dropdown opens
    const { data: notificationsData, isLoading } = useQuery({
        queryKey: ['notifications-list'],
        queryFn: () => notificationsService.getNotifications({ limit: 10 }),
        enabled: open,
    });

    // Mark as read mutation
    const markAsReadMutation = useMutation({
        mutationFn: notificationsService.markAsRead,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
            queryClient.invalidateQueries({ queryKey: ['notifications-list'] });
        },
    });

    // Mark all as read mutation
    const markAllAsReadMutation = useMutation({
        mutationFn: notificationsService.markAllAsRead,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
            queryClient.invalidateQueries({ queryKey: ['notifications-list'] });
        },
    });

    const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleNotificationClick = (notification: Notification) => {
        if (!notification.isRead) {
            markAsReadMutation.mutate(notification.id);
        }
        if (notification.entityType === 'DISCIPLINARY_CASE' && notification.entityId) {
            navigate(`/disciplinary/cases/${notification.entityId}`);
        }
        handleClose();
    };

    const unreadCount = countData?.count || 0;
    const notifications = notificationsData?.items || [];

    return (
        <>
            <IconButton color="inherit" onClick={handleOpen} sx={{ ml: 1 }}>
                <Badge badgeContent={unreadCount} color="error" max={99}>
                    <NotificationsIcon color="action" />
                </Badge>
            </IconButton>

            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                PaperProps={{ sx: { width: 360, maxHeight: 480 } }}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
                <Box sx={{ px: 2, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="subtitle1" fontWeight="bold">الإشعارات</Typography>
                    {unreadCount > 0 && (
                        <Button
                            size="small"
                            startIcon={<DoneAll />}
                            onClick={() => markAllAsReadMutation.mutate()}
                            disabled={markAllAsReadMutation.isPending}
                        >
                            قراءة الكل
                        </Button>
                    )}
                </Box>

                <Divider />

                {isLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress size={24} />
                    </Box>
                ) : notifications.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                        <Typography color="text.secondary">لا توجد إشعارات</Typography>
                    </Box>
                ) : (
                    <List sx={{ p: 0 }}>
                        {notifications.map((notification: Notification) => (
                            <ListItem
                                key={notification.id}
                                onClick={() => handleNotificationClick(notification)}
                                sx={{
                                    cursor: 'pointer',
                                    bgcolor: notification.isRead ? 'transparent' : 'action.hover',
                                    '&:hover': { bgcolor: 'action.selected' },
                                }}
                            >
                                <ListItemIcon>
                                    {TYPE_ICONS[notification.type] || <Email />}
                                </ListItemIcon>
                                <ListItemText
                                    primary={notification.title}
                                    secondary={
                                        <>
                                            <Typography
                                                component="span"
                                                variant="body2"
                                                color="text.secondary"
                                                sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                            >
                                                {notification.body}
                                            </Typography>
                                            <Typography component="span" variant="caption" color="text.disabled">
                                                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: ar })}
                                            </Typography>
                                        </>
                                    }
                                />
                            </ListItem>
                        ))}
                    </List>
                )}

                <Divider />
                <Box sx={{ p: 1 }}>
                    <Button fullWidth size="small" onClick={() => { navigate('/notifications'); handleClose(); }}>
                        عرض كل الإشعارات
                    </Button>
                </Box>
            </Menu>
        </>
    );
};
