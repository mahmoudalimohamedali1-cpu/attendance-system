import React from 'react';
import { Box, Typography, Avatar, Chip } from '@mui/material';
import { Cake, Celebration, WorkHistory } from '@mui/icons-material';
import { GlassCard } from '@/components/premium';

interface UpcomingEvent {
    id: string;
    type: 'birthday' | 'anniversary' | 'milestone';
    employeeName: string;
    avatar?: string;
    date: Date;
    details?: string;
}

interface UpcomingEventsProps {
    events: UpcomingEvent[];
    title?: string;
    maxVisible?: number;
}

const eventConfig = {
    birthday: {
        icon: <Cake sx={{ fontSize: 20 }} />,
        label: 'عيد ميلاد',
        gradient: ['#f472b6', '#ec4899'],
        emoji: '🎂',
    },
    anniversary: {
        icon: <Celebration sx={{ fontSize: 20 }} />,
        label: 'ذكرى التعيين',
        gradient: ['#a855f7', '#6366f1'],
        emoji: '🎉',
    },
    milestone: {
        icon: <WorkHistory sx={{ fontSize: 20 }} />,
        label: 'إنجاز',
        gradient: ['#06b6d4', '#0891b2'],
        emoji: '🏆',
    },
};

const formatDate = (date: Date) => {
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'اليوم';
    if (diffDays === 1) return 'غداً';
    if (diffDays <= 7) return `بعد ${diffDays} أيام`;

    return date.toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' });
};

const getInitials = (name: string) => {
    return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
};

/**
 * Premium Upcoming Events Widget
 * Shows birthdays, anniversaries, and milestones
 */
export const UpcomingEvents: React.FC<UpcomingEventsProps> = ({
    events,
    title = '📅 الأحداث القادمة',
    maxVisible = 5,
}) => {
    const sortedEvents = [...events].sort((a, b) => a.date.getTime() - b.date.getTime());

    return (
        <GlassCard sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 3 }}>
                {title}
            </Typography>

            {events.length === 0 ? (
                <Box
                    sx={{
                        py: 4,
                        textAlign: 'center',
                        color: 'text.secondary',
                    }}
                >
                    <Typography variant="body2">لا توجد أحداث قادمة</Typography>
                </Box>
            ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {sortedEvents.slice(0, maxVisible).map((event, index) => {
                        const config = eventConfig[event.type];
                        const isToday = formatDate(event.date) === 'اليوم';

                        return (
                            <Box
                                key={event.id}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 2,
                                    p: 2,
                                    borderRadius: 2,
                                    background: isToday
                                        ? `linear-gradient(135deg, ${config.gradient[0]}15, ${config.gradient[1]}15)`
                                        : 'rgba(255, 255, 255, 0.5)',
                                    border: isToday ? `1px solid ${config.gradient[0]}30` : 'none',
                                    transition: 'all 0.3s ease',
                                    cursor: 'pointer',
                                    animation: `slideIn 0.3s ease ${index * 0.1}s both`,
                                    '@keyframes slideIn': {
                                        from: { opacity: 0, transform: 'translateX(20px)' },
                                        to: { opacity: 1, transform: 'translateX(0)' },
                                    },
                                    '&:hover': {
                                        transform: 'translateX(-8px)',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                    },
                                }}
                            >
                                {/* Avatar with event icon overlay */}
                                <Box sx={{ position: 'relative' }}>
                                    <Avatar
                                        src={event.avatar}
                                        sx={{
                                            width: 48,
                                            height: 48,
                                            background: `linear-gradient(135deg, ${config.gradient[0]}, ${config.gradient[1]})`,
                                            fontSize: '1rem',
                                            fontWeight: 600,
                                        }}
                                    >
                                        {getInitials(event.employeeName)}
                                    </Avatar>
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            bottom: -4,
                                            right: -4,
                                            width: 24,
                                            height: 24,
                                            borderRadius: '50%',
                                            bgcolor: 'white',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                            fontSize: '0.9rem',
                                        }}
                                    >
                                        {config.emoji}
                                    </Box>
                                </Box>

                                {/* Event details */}
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography variant="body2" fontWeight={600} noWrap>
                                        {event.employeeName}
                                    </Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                        <Chip
                                            size="small"
                                            label={config.label}
                                            sx={{
                                                height: 20,
                                                fontSize: '0.65rem',
                                                fontWeight: 600,
                                                background: `linear-gradient(135deg, ${config.gradient[0]}, ${config.gradient[1]})`,
                                                color: 'white',
                                            }}
                                        />
                                        {event.details && (
                                            <Typography variant="caption" color="text.secondary">
                                                {event.details}
                                            </Typography>
                                        )}
                                    </Box>
                                </Box>

                                {/* Date */}
                                <Box
                                    sx={{
                                        textAlign: 'center',
                                        px: 2,
                                        py: 1,
                                        borderRadius: 2,
                                        bgcolor: isToday ? config.gradient[0] : 'rgba(0,0,0,0.05)',
                                        color: isToday ? 'white' : 'text.secondary',
                                    }}
                                >
                                    <Typography variant="caption" fontWeight={600}>
                                        {formatDate(event.date)}
                                    </Typography>
                                </Box>
                            </Box>
                        );
                    })}
                </Box>
            )}

            {events.length > maxVisible && (
                <Box
                    sx={{
                        mt: 2,
                        pt: 2,
                        borderTop: '1px solid rgba(0,0,0,0.05)',
                        textAlign: 'center',
                    }}
                >
                    <Typography
                        variant="caption"
                        sx={{
                            color: '#667eea',
                            cursor: 'pointer',
                            fontWeight: 600,
                            '&:hover': { textDecoration: 'underline' },
                        }}
                    >
                        عرض الكل ({events.length})
                    </Typography>
                </Box>
            )}
        </GlassCard>
    );
};

export default UpcomingEvents;
