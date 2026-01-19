import React, { useMemo } from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { VideoCall, LocationOn, AccessTime, CalendarMonth } from '@mui/icons-material';
import { GlassCard } from '@/components/premium';

interface CalendarEvent {
    id: string;
    title: string;
    startAt: Date;
    endAt: Date;
    type: 'meeting' | 'interview' | 'payroll' | 'holiday' | 'deadline' | 'announcement' | 'other';
    location?: string;
    meetingLink?: string;
    isAllDay?: boolean;
}

interface CalendarWidgetProps {
    events: CalendarEvent[];
    title?: string;
    onEventClick?: (event: CalendarEvent) => void;
    onViewAll?: () => void;
}

const eventTypeConfig = {
    meeting: {
        gradient: ['#3b82f6', '#2563eb'],
        bgColor: '#dbeafe',
        textColor: '#1e40af',
        label: 'اجتماع',
        emoji: '📅',
    },
    interview: {
        gradient: ['#8b5cf6', '#7c3aed'],
        bgColor: '#ede9fe',
        textColor: '#5b21b6',
        label: 'مقابلة',
        emoji: '👤',
    },
    payroll: {
        gradient: ['#22c55e', '#16a34a'],
        bgColor: '#dcfce7',
        textColor: '#166534',
        label: 'رواتب',
        emoji: '💰',
    },
    holiday: {
        gradient: ['#f59e0b', '#d97706'],
        bgColor: '#fef3c7',
        textColor: '#92400e',
        label: 'إجازة',
        emoji: '🎉',
    },
    deadline: {
        gradient: ['#ef4444', '#dc2626'],
        bgColor: '#fee2e2',
        textColor: '#991b1b',
        label: 'موعد نهائي',
        emoji: '⏰',
    },
    announcement: {
        gradient: ['#06b6d4', '#0891b2'],
        bgColor: '#cffafe',
        textColor: '#155e75',
        label: 'إعلان',
        emoji: '📢',
    },
    other: {
        gradient: ['#64748b', '#475569'],
        bgColor: '#f1f5f9',
        textColor: '#334155',
        label: 'أخرى',
        emoji: '📌',
    },
};

const arabicDays = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
const arabicMonths = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

/**
 * Get week days starting from the given date
 */
const getWeekDays = (startDate: Date): Date[] => {
    const days: Date[] = [];
    const start = new Date(startDate);

    // Get start of week (Sunday)
    const dayOfWeek = start.getDay();
    start.setDate(start.getDate() - dayOfWeek);

    for (let i = 0; i < 14; i++) { // Two weeks
        const day = new Date(start);
        day.setDate(start.getDate() + i);
        days.push(day);
    }
    return days;
};

/**
 * Check if two dates are the same day
 */
const isSameDay = (date1: Date, date2: Date): boolean => {
    return (
        date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate()
    );
};

/**
 * Format time in Arabic
 */
const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('ar-SA', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
};

/**
 * Premium Calendar Widget
 * Shows upcoming events this week and next
 */
export const CalendarWidget: React.FC<CalendarWidgetProps> = ({
    events,
    title = '📆 التقويم',
    onEventClick,
    onViewAll,
}) => {
    const today = useMemo(() => new Date(), []);
    const weekDays = useMemo(() => getWeekDays(today), [today]);

    // Get events grouped by day
    const eventsByDay = useMemo(() => {
        const grouped = new Map<string, CalendarEvent[]>();

        weekDays.forEach(day => {
            const dayKey = day.toDateString();
            const dayEvents = events.filter(event => {
                const eventDate = new Date(event.startAt);
                return isSameDay(eventDate, day);
            });
            if (dayEvents.length > 0) {
                grouped.set(dayKey, dayEvents);
            }
        });

        return grouped;
    }, [events, weekDays]);

    // Get upcoming events for the list view (next 5)
    const upcomingEvents = useMemo(() => {
        return events
            .filter(event => new Date(event.startAt) >= today)
            .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
            .slice(0, 5);
    }, [events, today]);

    // Current week label
    const weekLabel = useMemo(() => {
        const startOfWeek = weekDays[0];
        const endOfWeek = weekDays[13];
        return `${startOfWeek.getDate()} ${arabicMonths[startOfWeek.getMonth()]} - ${endOfWeek.getDate()} ${arabicMonths[endOfWeek.getMonth()]}`;
    }, [weekDays]);

    return (
        <GlassCard sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" fontWeight="bold">
                    {title}
                </Typography>
                <Typography variant="caption" color="text.secondary" fontWeight={500}>
                    {weekLabel}
                </Typography>
            </Box>

            {/* Mini Calendar Grid - This Week */}
            <Box sx={{ mb: 3 }}>
                <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                    هذا الأسبوع
                </Typography>
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(7, 1fr)',
                        gap: 0.5,
                    }}
                >
                    {/* Day headers */}
                    {arabicDays.map((day, index) => (
                        <Box
                            key={`header-${index}`}
                            sx={{
                                textAlign: 'center',
                                py: 0.5,
                                fontSize: '0.65rem',
                                fontWeight: 600,
                                color: 'text.secondary',
                            }}
                        >
                            {day}
                        </Box>
                    ))}

                    {/* First week days */}
                    {weekDays.slice(0, 7).map((day, index) => {
                        const isToday = isSameDay(day, today);
                        const hasEvents = eventsByDay.has(day.toDateString());
                        const dayEvents = eventsByDay.get(day.toDateString()) || [];

                        return (
                            <Box
                                key={`day-1-${index}`}
                                sx={{
                                    position: 'relative',
                                    textAlign: 'center',
                                    py: 1,
                                    borderRadius: 1.5,
                                    cursor: hasEvents ? 'pointer' : 'default',
                                    bgcolor: isToday
                                        ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                        : hasEvents
                                            ? 'rgba(102, 126, 234, 0.1)'
                                            : 'transparent',
                                    background: isToday
                                        ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                        : undefined,
                                    color: isToday ? 'white' : 'text.primary',
                                    transition: 'all 0.2s ease',
                                    '&:hover': hasEvents ? {
                                        transform: 'scale(1.1)',
                                        boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
                                    } : {},
                                }}
                                onClick={() => {
                                    if (dayEvents.length > 0 && onEventClick) {
                                        onEventClick(dayEvents[0]);
                                    }
                                }}
                            >
                                <Typography
                                    variant="body2"
                                    fontWeight={isToday ? 700 : 500}
                                    sx={{ fontSize: '0.85rem' }}
                                >
                                    {day.getDate()}
                                </Typography>
                                {/* Event indicator dots */}
                                {hasEvents && (
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            bottom: 2,
                                            left: '50%',
                                            transform: 'translateX(-50%)',
                                            display: 'flex',
                                            gap: 0.3,
                                        }}
                                    >
                                        {dayEvents.slice(0, 3).map((event, i) => (
                                            <Box
                                                key={i}
                                                sx={{
                                                    width: 4,
                                                    height: 4,
                                                    borderRadius: '50%',
                                                    bgcolor: isToday
                                                        ? 'white'
                                                        : eventTypeConfig[event.type]?.gradient[0] || '#667eea',
                                                }}
                                            />
                                        ))}
                                    </Box>
                                )}
                            </Box>
                        );
                    })}
                </Box>
            </Box>

            {/* Mini Calendar Grid - Next Week */}
            <Box sx={{ mb: 3 }}>
                <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                    الأسبوع القادم
                </Typography>
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(7, 1fr)',
                        gap: 0.5,
                    }}
                >
                    {/* Next week days */}
                    {weekDays.slice(7, 14).map((day, index) => {
                        const isToday = isSameDay(day, today);
                        const hasEvents = eventsByDay.has(day.toDateString());
                        const dayEvents = eventsByDay.get(day.toDateString()) || [];

                        return (
                            <Box
                                key={`day-2-${index}`}
                                sx={{
                                    position: 'relative',
                                    textAlign: 'center',
                                    py: 1,
                                    borderRadius: 1.5,
                                    cursor: hasEvents ? 'pointer' : 'default',
                                    bgcolor: hasEvents
                                        ? 'rgba(102, 126, 234, 0.1)'
                                        : 'transparent',
                                    color: 'text.primary',
                                    opacity: 0.8,
                                    transition: 'all 0.2s ease',
                                    '&:hover': hasEvents ? {
                                        transform: 'scale(1.1)',
                                        boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
                                    } : {},
                                }}
                                onClick={() => {
                                    if (dayEvents.length > 0 && onEventClick) {
                                        onEventClick(dayEvents[0]);
                                    }
                                }}
                            >
                                <Typography
                                    variant="body2"
                                    fontWeight={500}
                                    sx={{ fontSize: '0.85rem' }}
                                >
                                    {day.getDate()}
                                </Typography>
                                {/* Event indicator dots */}
                                {hasEvents && (
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            bottom: 2,
                                            left: '50%',
                                            transform: 'translateX(-50%)',
                                            display: 'flex',
                                            gap: 0.3,
                                        }}
                                    >
                                        {dayEvents.slice(0, 3).map((event, i) => (
                                            <Box
                                                key={i}
                                                sx={{
                                                    width: 4,
                                                    height: 4,
                                                    borderRadius: '50%',
                                                    bgcolor: eventTypeConfig[event.type]?.gradient[0] || '#667eea',
                                                }}
                                            />
                                        ))}
                                    </Box>
                                )}
                            </Box>
                        );
                    })}
                </Box>
            </Box>

            {/* Upcoming Events List */}
            {upcomingEvents.length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Typography variant="caption" fontWeight={600} color="text.secondary">
                        الأحداث القادمة
                    </Typography>

                    {upcomingEvents.map((event, index) => {
                        const config = eventTypeConfig[event.type];
                        const eventDate = new Date(event.startAt);
                        const isEventToday = isSameDay(eventDate, today);

                        return (
                            <Box
                                key={event.id}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: 1.5,
                                    p: 1.5,
                                    borderRadius: 2,
                                    bgcolor: config.bgColor,
                                    border: isEventToday ? `1px solid ${config.gradient[0]}40` : 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    animation: `slideUp 0.3s ease ${index * 0.1}s both`,
                                    '@keyframes slideUp': {
                                        from: { opacity: 0, transform: 'translateY(10px)' },
                                        to: { opacity: 1, transform: 'translateY(0)' },
                                    },
                                    '&:hover': {
                                        transform: 'translateX(-4px)',
                                        boxShadow: `0 4px 12px ${config.gradient[0]}20`,
                                    },
                                }}
                                onClick={() => onEventClick?.(event)}
                            >
                                {/* Event Icon */}
                                <Box
                                    sx={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 2,
                                        background: `linear-gradient(135deg, ${config.gradient[0]}, ${config.gradient[1]})`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                        fontSize: '1rem',
                                    }}
                                >
                                    {config.emoji}
                                </Box>

                                {/* Event Details */}
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography
                                        variant="body2"
                                        fontWeight={600}
                                        sx={{ color: config.textColor }}
                                        noWrap
                                    >
                                        {event.title}
                                    </Typography>

                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                                        {/* Date/Time */}
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                                            <AccessTime sx={{ fontSize: 12, color: config.textColor, opacity: 0.7 }} />
                                            <Typography variant="caption" sx={{ color: config.textColor, opacity: 0.8 }}>
                                                {isEventToday ? 'اليوم' : eventDate.toLocaleDateString('ar-SA', { weekday: 'short', day: 'numeric' })}
                                                {!event.isAllDay && ` • ${formatTime(eventDate)}`}
                                            </Typography>
                                        </Box>

                                        {/* Location */}
                                        {event.location && (
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                                                <LocationOn sx={{ fontSize: 12, color: config.textColor, opacity: 0.7 }} />
                                                <Typography variant="caption" sx={{ color: config.textColor, opacity: 0.8 }} noWrap>
                                                    {event.location}
                                                </Typography>
                                            </Box>
                                        )}

                                        {/* Meeting Link indicator */}
                                        {event.meetingLink && (
                                            <VideoCall sx={{ fontSize: 14, color: config.gradient[0] }} />
                                        )}
                                    </Box>
                                </Box>

                                {/* Type Chip */}
                                <Chip
                                    size="small"
                                    label={config.label}
                                    sx={{
                                        height: 20,
                                        fontSize: '0.6rem',
                                        fontWeight: 600,
                                        background: `linear-gradient(135deg, ${config.gradient[0]}, ${config.gradient[1]})`,
                                        color: 'white',
                                        flexShrink: 0,
                                    }}
                                />
                            </Box>
                        );
                    })}
                </Box>
            ) : (
                <Box
                    sx={{
                        py: 3,
                        textAlign: 'center',
                        color: 'text.secondary',
                    }}
                >
                    <CalendarMonth sx={{ fontSize: 40, opacity: 0.3, mb: 1 }} />
                    <Typography variant="body2">لا توجد أحداث قادمة</Typography>
                </Box>
            )}

            {/* View All Link */}
            {events.length > 5 && onViewAll && (
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
                        onClick={onViewAll}
                    >
                        عرض كل الأحداث ({events.length})
                    </Typography>
                </Box>
            )}
        </GlassCard>
    );
};

export default CalendarWidget;
