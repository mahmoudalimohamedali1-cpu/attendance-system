import React, { useState } from 'react';
import {
    Box,
    Typography,
    Avatar,
    Chip,
    Drawer,
    IconButton,
    Button,
    ButtonGroup,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    Divider,
    CircularProgress,
    Skeleton,
    Tooltip,
    useTheme,
    alpha,
    Badge,
} from '@mui/material';
import {
    Close,
    CalendarMonth,
    AccessTime,
    LocationOn,
    VideoCall,
    Person,
    Check,
    HelpOutline,
    Close as CloseIcon,
    OpenInNew,
    Share,
    Edit,
    Delete,
    ContentCopy,
    Groups,
    EventAvailable,
    EventBusy,
    Schedule,
    Cancel,
} from '@mui/icons-material';
import { GlassCard } from '@/components/premium';
import type {
    CalendarEvent,
    EventAttendee,
    RSVPStatus,
    EventType,
    EventStatus,
} from '@/services/calendar-events.service';

// ==================== Props Interface ====================

interface EventDetailDrawerProps {
    /** Whether the drawer is open */
    open: boolean;
    /** Callback when drawer should close */
    onClose: () => void;
    /** The event to display */
    event: CalendarEvent | null;
    /** Attendees list */
    attendees?: EventAttendee[];
    /** Whether attendees are loading */
    isLoadingAttendees?: boolean;
    /** Current user ID */
    currentUserId?: string;
    /** Callback when user RSVPs */
    onRSVP?: (eventId: string, status: RSVPStatus) => void;
    /** Whether RSVP is in progress */
    isRSVPLoading?: boolean;
    /** Callback when event is edited (for admins/creators) */
    onEdit?: (eventId: string) => void;
    /** Callback when event is deleted (for admins/creators) */
    onDelete?: (eventId: string) => void;
    /** Callback when event is cancelled (for admins/creators) */
    onCancel?: (eventId: string) => void;
    /** Whether the user can edit this event */
    canEdit?: boolean;
}

// ==================== Event Type Configuration ====================

const eventTypeConfig: Record<EventType, {
    gradient: [string, string];
    bgColor: string;
    textColor: string;
    label: string;
    emoji: string;
}> = {
    MEETING: {
        gradient: ['#3b82f6', '#2563eb'],
        bgColor: '#dbeafe',
        textColor: '#1e40af',
        label: 'اجتماع',
        emoji: '📅',
    },
    INTERVIEW: {
        gradient: ['#8b5cf6', '#7c3aed'],
        bgColor: '#ede9fe',
        textColor: '#5b21b6',
        label: 'مقابلة',
        emoji: '👤',
    },
    PAYROLL: {
        gradient: ['#22c55e', '#16a34a'],
        bgColor: '#dcfce7',
        textColor: '#166534',
        label: 'رواتب',
        emoji: '💰',
    },
    HOLIDAY: {
        gradient: ['#f59e0b', '#d97706'],
        bgColor: '#fef3c7',
        textColor: '#92400e',
        label: 'إجازة',
        emoji: '🎉',
    },
    DEADLINE: {
        gradient: ['#ef4444', '#dc2626'],
        bgColor: '#fee2e2',
        textColor: '#991b1b',
        label: 'موعد نهائي',
        emoji: '⏰',
    },
    ANNOUNCEMENT: {
        gradient: ['#06b6d4', '#0891b2'],
        bgColor: '#cffafe',
        textColor: '#155e75',
        label: 'إعلان',
        emoji: '📢',
    },
    OTHER: {
        gradient: ['#64748b', '#475569'],
        bgColor: '#f1f5f9',
        textColor: '#334155',
        label: 'أخرى',
        emoji: '📌',
    },
};

// ==================== RSVP Status Configuration ====================

const rsvpStatusConfig: Record<RSVPStatus, {
    label: string;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
}> = {
    INVITED: {
        label: 'مدعو',
        icon: <Schedule fontSize="small" />,
        color: '#64748b',
        bgColor: '#f1f5f9',
    },
    GOING: {
        label: 'سأحضر',
        icon: <Check fontSize="small" />,
        color: '#16a34a',
        bgColor: '#dcfce7',
    },
    MAYBE: {
        label: 'ربما',
        icon: <HelpOutline fontSize="small" />,
        color: '#d97706',
        bgColor: '#fef3c7',
    },
    DECLINED: {
        label: 'لن أحضر',
        icon: <CloseIcon fontSize="small" />,
        color: '#dc2626',
        bgColor: '#fee2e2',
    },
};

// ==================== Event Status Configuration ====================

const eventStatusConfig: Record<EventStatus, {
    label: string;
    color: string;
    bgColor: string;
}> = {
    SCHEDULED: {
        label: 'مجدول',
        color: '#3b82f6',
        bgColor: '#dbeafe',
    },
    CANCELLED: {
        label: 'ملغي',
        color: '#dc2626',
        bgColor: '#fee2e2',
    },
    DONE: {
        label: 'منتهي',
        color: '#16a34a',
        bgColor: '#dcfce7',
    },
};

// ==================== Helper Functions ====================

/**
 * Get initials from name
 */
const getInitials = (firstName: string, lastName: string): string => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
};

/**
 * Format date and time in Arabic
 */
const formatDateTime = (dateString: string, isAllDay?: boolean): string => {
    const date = new Date(dateString);
    const dateStr = date.toLocaleDateString('ar-SA', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    if (isAllDay) {
        return dateStr;
    }

    const timeStr = date.toLocaleTimeString('ar-SA', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });

    return `${dateStr} • ${timeStr}`;
};

/**
 * Format time range
 */
const formatTimeRange = (startAt: string, endAt: string, isAllDay?: boolean): string => {
    if (isAllDay) {
        return 'طوال اليوم';
    }

    const start = new Date(startAt);
    const end = new Date(endAt);

    const startTime = start.toLocaleTimeString('ar-SA', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });

    const endTime = end.toLocaleTimeString('ar-SA', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });

    return `${startTime} - ${endTime}`;
};

/**
 * Check if event is in the past
 */
const isEventPast = (endAt: string): boolean => {
    return new Date(endAt) < new Date();
};

/**
 * Check if event is today
 */
const isEventToday = (startAt: string): boolean => {
    const eventDate = new Date(startAt);
    const today = new Date();
    return (
        eventDate.getFullYear() === today.getFullYear() &&
        eventDate.getMonth() === today.getMonth() &&
        eventDate.getDate() === today.getDate()
    );
};

// ==================== Component ====================

/**
 * EventDetailDrawer Component
 *
 * Shows full event details including:
 * - Event title, type, and status
 * - Date/time and duration
 * - Location and meeting link
 * - Description
 * - Attendees list with RSVP status
 * - RSVP buttons for current user
 * - Edit/Delete/Cancel actions for creators
 */
export const EventDetailDrawer: React.FC<EventDetailDrawerProps> = ({
    open,
    onClose,
    event,
    attendees = [],
    isLoadingAttendees = false,
    currentUserId,
    onRSVP,
    isRSVPLoading = false,
    onEdit,
    onDelete,
    onCancel,
    canEdit = false,
}) => {
    const theme = useTheme();
    const [copySuccess, setCopySuccess] = useState(false);

    if (!event) {
        return (
            <Drawer
                anchor="left"
                open={open}
                onClose={onClose}
                PaperProps={{
                    sx: {
                        width: { xs: '100%', sm: 450, md: 500 },
                        p: 3,
                        bgcolor: alpha(theme.palette.background.default, 0.98),
                    },
                }}
            >
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 3 }} />
                    <Skeleton variant="text" width="60%" />
                    <Skeleton variant="text" width="80%" />
                </Box>
            </Drawer>
        );
    }

    const config = eventTypeConfig[event.eventType] || eventTypeConfig.OTHER;
    const statusConfig = eventStatusConfig[event.status];
    const isPast = isEventPast(event.endAt);
    const isToday = isEventToday(event.startAt);
    const userRsvpStatus = event.userRsvpStatus;

    // Find current user in attendees
    const currentUserAttendee = attendees.find(a => a.userId === currentUserId);
    const currentRsvpStatus = currentUserAttendee?.rsvpStatus || userRsvpStatus;

    // RSVP stats
    const rsvpStats = event.rsvpStats || {
        going: attendees.filter(a => a.rsvpStatus === 'GOING').length,
        maybe: attendees.filter(a => a.rsvpStatus === 'MAYBE').length,
        declined: attendees.filter(a => a.rsvpStatus === 'DECLINED').length,
        invited: attendees.filter(a => a.rsvpStatus === 'INVITED').length,
        total: attendees.length,
    };

    /**
     * Handle RSVP button click
     */
    const handleRSVP = (status: RSVPStatus) => {
        if (onRSVP && event.id) {
            onRSVP(event.id, status);
        }
    };

    /**
     * Handle copy meeting link
     */
    const handleCopyLink = () => {
        if (event.meetingLink) {
            navigator.clipboard.writeText(event.meetingLink);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        }
    };

    /**
     * Handle share event
     */
    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: event.title,
                text: event.description || '',
                url: window.location.href,
            });
        }
    };

    return (
        <Drawer
            anchor="left"
            open={open}
            onClose={onClose}
            PaperProps={{
                sx: {
                    width: { xs: '100%', sm: 450, md: 500 },
                    bgcolor: alpha(theme.palette.background.default, 0.98),
                    p: 0,
                },
            }}
        >
            {/* Header with gradient */}
            <Box
                sx={{
                    background: `linear-gradient(135deg, ${config.gradient[0]}, ${config.gradient[1]})`,
                    color: 'white',
                    p: 3,
                    pb: 6,
                    position: 'relative',
                }}
            >
                {/* Close button */}
                <IconButton
                    onClick={onClose}
                    sx={{
                        position: 'absolute',
                        top: 16,
                        right: 16,
                        color: 'white',
                        bgcolor: 'rgba(255,255,255,0.2)',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                    }}
                >
                    <Close />
                </IconButton>

                {/* Event type and status badges */}
                <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                    <Chip
                        label={config.label}
                        icon={<Box sx={{ fontSize: '1rem' }}>{config.emoji}</Box>}
                        size="small"
                        sx={{
                            bgcolor: 'rgba(255,255,255,0.25)',
                            color: 'white',
                            fontWeight: 600,
                            '& .MuiChip-icon': { color: 'white' },
                        }}
                    />
                    {event.status !== 'SCHEDULED' && (
                        <Chip
                            label={statusConfig.label}
                            size="small"
                            sx={{
                                bgcolor: event.status === 'CANCELLED' ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.25)',
                                color: 'white',
                                fontWeight: 600,
                            }}
                        />
                    )}
                    {isToday && event.status === 'SCHEDULED' && (
                        <Chip
                            label="اليوم"
                            size="small"
                            sx={{
                                bgcolor: 'rgba(255,255,255,0.25)',
                                color: 'white',
                                fontWeight: 600,
                            }}
                        />
                    )}
                    {isPast && event.status === 'SCHEDULED' && (
                        <Chip
                            label="انتهى"
                            size="small"
                            sx={{
                                bgcolor: 'rgba(0,0,0,0.2)',
                                color: 'white',
                                fontWeight: 600,
                            }}
                        />
                    )}
                </Box>

                {/* Event title */}
                <Typography variant="h5" fontWeight={700} sx={{ mb: 1, lineHeight: 1.3 }}>
                    {event.title}
                </Typography>
                {event.titleEn && event.titleEn !== event.title && (
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        {event.titleEn}
                    </Typography>
                )}
            </Box>

            {/* Content */}
            <Box sx={{ p: 3, mt: -4 }}>
                <GlassCard sx={{ p: 2.5, mb: 3 }}>
                    {/* Date & Time */}
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
                        <Box
                            sx={{
                                width: 40,
                                height: 40,
                                borderRadius: 2,
                                bgcolor: config.bgColor,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <CalendarMonth sx={{ color: config.textColor }} />
                        </Box>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="caption" color="text.secondary" fontWeight={500}>
                                التاريخ والوقت
                            </Typography>
                            <Typography variant="body2" fontWeight={600}>
                                {formatDateTime(event.startAt, event.isAllDay)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {formatTimeRange(event.startAt, event.endAt, event.isAllDay)}
                            </Typography>
                        </Box>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    {/* Location */}
                    {event.location && (
                        <>
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
                                <Box
                                    sx={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: 2,
                                        bgcolor: config.bgColor,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <LocationOn sx={{ color: config.textColor }} />
                                </Box>
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="caption" color="text.secondary" fontWeight={500}>
                                        المكان
                                    </Typography>
                                    <Typography variant="body2" fontWeight={600}>
                                        {event.location}
                                    </Typography>
                                </Box>
                            </Box>
                            <Divider sx={{ my: 2 }} />
                        </>
                    )}

                    {/* Meeting Link */}
                    {event.meetingLink && (
                        <>
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                                <Box
                                    sx={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: 2,
                                        bgcolor: config.bgColor,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <VideoCall sx={{ color: config.textColor }} />
                                </Box>
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="caption" color="text.secondary" fontWeight={500}>
                                        رابط الاجتماع
                                    </Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                        <Button
                                            variant="contained"
                                            size="small"
                                            startIcon={<OpenInNew />}
                                            href={event.meetingLink}
                                            target="_blank"
                                            sx={{
                                                background: `linear-gradient(135deg, ${config.gradient[0]}, ${config.gradient[1]})`,
                                                textTransform: 'none',
                                                fontWeight: 600,
                                            }}
                                        >
                                            انضم للاجتماع
                                        </Button>
                                        <Tooltip title={copySuccess ? 'تم النسخ!' : 'نسخ الرابط'}>
                                            <IconButton size="small" onClick={handleCopyLink}>
                                                <ContentCopy fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                </Box>
                            </Box>
                        </>
                    )}
                </GlassCard>

                {/* Description */}
                {event.description && (
                    <GlassCard sx={{ p: 2.5, mb: 3 }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={500} sx={{ mb: 1, display: 'block' }}>
                            الوصف
                        </Typography>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                            {event.description}
                        </Typography>
                        {event.descriptionEn && event.descriptionEn !== event.description && (
                            <Typography
                                variant="body2"
                                sx={{
                                    mt: 2,
                                    pt: 2,
                                    borderTop: '1px dashed',
                                    borderColor: 'divider',
                                    whiteSpace: 'pre-wrap',
                                    lineHeight: 1.7,
                                    direction: 'ltr',
                                    textAlign: 'left',
                                }}
                            >
                                {event.descriptionEn}
                            </Typography>
                        )}
                    </GlassCard>
                )}

                {/* Organizer */}
                {event.creator && (
                    <GlassCard sx={{ p: 2.5, mb: 3 }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={500} sx={{ mb: 1.5, display: 'block' }}>
                            المنظم
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar
                                src={event.creator.avatar || undefined}
                                sx={{
                                    width: 44,
                                    height: 44,
                                    background: `linear-gradient(135deg, ${config.gradient[0]}, ${config.gradient[1]})`,
                                    fontWeight: 600,
                                }}
                            >
                                {getInitials(event.creator.firstName, event.creator.lastName)}
                            </Avatar>
                            <Box>
                                <Typography variant="body2" fontWeight={600}>
                                    {event.creator.firstName} {event.creator.lastName}
                                </Typography>
                                {event.creator.jobTitle && (
                                    <Typography variant="caption" color="text.secondary">
                                        {event.creator.jobTitle}
                                    </Typography>
                                )}
                            </Box>
                        </Box>
                    </GlassCard>
                )}

                {/* RSVP Section */}
                {event.status === 'SCHEDULED' && !isPast && (
                    <GlassCard sx={{ p: 2.5, mb: 3 }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={500} sx={{ mb: 2, display: 'block' }}>
                            هل ستحضر؟
                        </Typography>

                        {/* Current RSVP Status */}
                        {currentRsvpStatus && (
                            <Box sx={{ mb: 2 }}>
                                <Chip
                                    icon={rsvpStatusConfig[currentRsvpStatus].icon as React.ReactElement}
                                    label={`حالتك: ${rsvpStatusConfig[currentRsvpStatus].label}`}
                                    sx={{
                                        bgcolor: rsvpStatusConfig[currentRsvpStatus].bgColor,
                                        color: rsvpStatusConfig[currentRsvpStatus].color,
                                        fontWeight: 600,
                                        '& .MuiChip-icon': { color: rsvpStatusConfig[currentRsvpStatus].color },
                                    }}
                                />
                            </Box>
                        )}

                        {/* RSVP Buttons */}
                        <ButtonGroup fullWidth disabled={isRSVPLoading}>
                            <Button
                                variant={currentRsvpStatus === 'GOING' ? 'contained' : 'outlined'}
                                startIcon={isRSVPLoading ? <CircularProgress size={16} /> : <Check />}
                                onClick={() => handleRSVP('GOING')}
                                sx={{
                                    flex: 1,
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    ...(currentRsvpStatus === 'GOING' && {
                                        bgcolor: '#16a34a',
                                        '&:hover': { bgcolor: '#15803d' },
                                    }),
                                }}
                            >
                                سأحضر
                            </Button>
                            <Button
                                variant={currentRsvpStatus === 'MAYBE' ? 'contained' : 'outlined'}
                                startIcon={<HelpOutline />}
                                onClick={() => handleRSVP('MAYBE')}
                                sx={{
                                    flex: 1,
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    ...(currentRsvpStatus === 'MAYBE' && {
                                        bgcolor: '#d97706',
                                        '&:hover': { bgcolor: '#b45309' },
                                    }),
                                }}
                            >
                                ربما
                            </Button>
                            <Button
                                variant={currentRsvpStatus === 'DECLINED' ? 'contained' : 'outlined'}
                                startIcon={<CloseIcon />}
                                onClick={() => handleRSVP('DECLINED')}
                                sx={{
                                    flex: 1,
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    ...(currentRsvpStatus === 'DECLINED' && {
                                        bgcolor: '#dc2626',
                                        '&:hover': { bgcolor: '#b91c1c' },
                                    }),
                                }}
                            >
                                لن أحضر
                            </Button>
                        </ButtonGroup>
                    </GlassCard>
                )}

                {/* Attendees Section */}
                <GlassCard sx={{ p: 2.5, mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Groups sx={{ color: 'text.secondary', fontSize: 20 }} />
                            <Typography variant="caption" color="text.secondary" fontWeight={500}>
                                المدعوون ({rsvpStats.total || attendees.length || event._count?.attendees || 0})
                            </Typography>
                        </Box>

                        {/* RSVP Stats */}
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Tooltip title="سيحضرون">
                                <Chip
                                    size="small"
                                    icon={<EventAvailable sx={{ fontSize: '14px !important' }} />}
                                    label={rsvpStats.going}
                                    sx={{
                                        height: 24,
                                        bgcolor: '#dcfce7',
                                        color: '#16a34a',
                                        fontSize: '0.7rem',
                                        fontWeight: 600,
                                        '& .MuiChip-icon': { color: '#16a34a' },
                                    }}
                                />
                            </Tooltip>
                            <Tooltip title="ربما">
                                <Chip
                                    size="small"
                                    icon={<HelpOutline sx={{ fontSize: '14px !important' }} />}
                                    label={rsvpStats.maybe}
                                    sx={{
                                        height: 24,
                                        bgcolor: '#fef3c7',
                                        color: '#d97706',
                                        fontSize: '0.7rem',
                                        fontWeight: 600,
                                        '& .MuiChip-icon': { color: '#d97706' },
                                    }}
                                />
                            </Tooltip>
                            <Tooltip title="لن يحضروا">
                                <Chip
                                    size="small"
                                    icon={<EventBusy sx={{ fontSize: '14px !important' }} />}
                                    label={rsvpStats.declined}
                                    sx={{
                                        height: 24,
                                        bgcolor: '#fee2e2',
                                        color: '#dc2626',
                                        fontSize: '0.7rem',
                                        fontWeight: 600,
                                        '& .MuiChip-icon': { color: '#dc2626' },
                                    }}
                                />
                            </Tooltip>
                        </Box>
                    </Box>

                    {/* Attendees List */}
                    {isLoadingAttendees ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {[1, 2, 3].map((i) => (
                                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1 }}>
                                    <Skeleton variant="circular" width={36} height={36} />
                                    <Box sx={{ flex: 1 }}>
                                        <Skeleton variant="text" width="60%" />
                                        <Skeleton variant="text" width="40%" />
                                    </Box>
                                </Box>
                            ))}
                        </Box>
                    ) : attendees.length > 0 ? (
                        <List sx={{ p: 0 }}>
                            {attendees.map((attendee, index) => {
                                const rsvpConfig = rsvpStatusConfig[attendee.rsvpStatus];
                                const isCurrentUser = attendee.userId === currentUserId;

                                return (
                                    <ListItem
                                        key={attendee.id}
                                        sx={{
                                            px: 1,
                                            py: 1,
                                            borderRadius: 2,
                                            mb: 0.5,
                                            bgcolor: isCurrentUser ? alpha(config.gradient[0], 0.1) : 'transparent',
                                            animation: `fadeIn 0.3s ease ${index * 0.05}s both`,
                                            '@keyframes fadeIn': {
                                                from: { opacity: 0, transform: 'translateX(10px)' },
                                                to: { opacity: 1, transform: 'translateX(0)' },
                                            },
                                        }}
                                    >
                                        <ListItemAvatar>
                                            <Badge
                                                overlap="circular"
                                                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                                badgeContent={
                                                    <Box
                                                        sx={{
                                                            width: 16,
                                                            height: 16,
                                                            borderRadius: '50%',
                                                            bgcolor: rsvpConfig.bgColor,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            border: '2px solid white',
                                                            '& svg': { fontSize: 10, color: rsvpConfig.color },
                                                        }}
                                                    >
                                                        {rsvpConfig.icon}
                                                    </Box>
                                                }
                                            >
                                                <Avatar
                                                    src={attendee.user.avatar || undefined}
                                                    sx={{
                                                        width: 36,
                                                        height: 36,
                                                        fontSize: '0.85rem',
                                                        fontWeight: 600,
                                                        background: `linear-gradient(135deg, ${config.gradient[0]}, ${config.gradient[1]})`,
                                                    }}
                                                >
                                                    {getInitials(attendee.user.firstName, attendee.user.lastName)}
                                                </Avatar>
                                            </Badge>
                                        </ListItemAvatar>
                                        <ListItemText
                                            primary={
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Typography variant="body2" fontWeight={600}>
                                                        {attendee.user.firstName} {attendee.user.lastName}
                                                    </Typography>
                                                    {isCurrentUser && (
                                                        <Chip
                                                            label="أنت"
                                                            size="small"
                                                            sx={{
                                                                height: 18,
                                                                fontSize: '0.6rem',
                                                                fontWeight: 600,
                                                                bgcolor: config.bgColor,
                                                                color: config.textColor,
                                                            }}
                                                        />
                                                    )}
                                                </Box>
                                            }
                                            secondary={
                                                <Typography variant="caption" color="text.secondary">
                                                    {attendee.user.jobTitle || attendee.user.department?.name || ''}
                                                </Typography>
                                            }
                                        />
                                        <Chip
                                            size="small"
                                            label={rsvpConfig.label}
                                            sx={{
                                                height: 22,
                                                fontSize: '0.65rem',
                                                fontWeight: 600,
                                                bgcolor: rsvpConfig.bgColor,
                                                color: rsvpConfig.color,
                                            }}
                                        />
                                    </ListItem>
                                );
                            })}
                        </List>
                    ) : (
                        <Box sx={{ py: 3, textAlign: 'center', color: 'text.secondary' }}>
                            <Person sx={{ fontSize: 40, opacity: 0.3, mb: 1 }} />
                            <Typography variant="body2">لا يوجد مدعوون بعد</Typography>
                        </Box>
                    )}
                </GlassCard>

                {/* Action Buttons for Creators/Admins */}
                {canEdit && (
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {onEdit && (
                            <Button
                                variant="outlined"
                                startIcon={<Edit />}
                                onClick={() => onEdit(event.id)}
                                sx={{ flex: 1, textTransform: 'none' }}
                            >
                                تعديل
                            </Button>
                        )}
                        {onCancel && event.status === 'SCHEDULED' && (
                            <Button
                                variant="outlined"
                                color="warning"
                                startIcon={<Cancel />}
                                onClick={() => onCancel(event.id)}
                                sx={{ flex: 1, textTransform: 'none' }}
                            >
                                إلغاء
                            </Button>
                        )}
                        {onDelete && (
                            <Button
                                variant="outlined"
                                color="error"
                                startIcon={<Delete />}
                                onClick={() => onDelete(event.id)}
                                sx={{ flex: 1, textTransform: 'none' }}
                            >
                                حذف
                            </Button>
                        )}
                    </Box>
                )}

                {/* Share Button */}
                <Box sx={{ mt: 2 }}>
                    <Button
                        fullWidth
                        variant="text"
                        startIcon={<Share />}
                        onClick={handleShare}
                        sx={{ textTransform: 'none', color: 'text.secondary' }}
                    >
                        مشاركة الحدث
                    </Button>
                </Box>
            </Box>
        </Drawer>
    );
};

export default EventDetailDrawer;
