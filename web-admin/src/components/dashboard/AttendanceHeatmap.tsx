import React, { useMemo } from 'react';
import { Box, Typography, Tooltip, Paper } from '@mui/material';
import {
    BarChart,
    CheckCircle,
    Cancel,
    Schedule,
    BeachAccess,
    Celebration
} from '@mui/icons-material';
import { GlassCard } from '@/components/premium';

interface AttendanceDay {
    date: string;
    status: 'present' | 'absent' | 'late' | 'leave' | 'weekend' | 'holiday' | 'empty';
    lateMinutes?: number;
}

interface AttendanceHeatmapProps {
    data: AttendanceDay[];
    year?: number;
    month?: number;
    showLegend?: boolean;
}

const statusConfig = {
    present: { color: '#22c55e', label: 'حاضر', icon: <CheckCircle /> },
    absent: { color: '#ef4444', label: 'غائب', icon: <Cancel /> },
    late: { color: '#f59e0b', label: 'متأخر', icon: <Schedule /> },
    leave: { color: '#8b5cf6', label: 'إجازة', icon: <BeachAccess /> },
    weekend: { color: '#e2e8f0', label: 'عطلة', icon: null },
    holiday: { color: '#06b6d4', label: 'عطلة رسمية', icon: <Celebration /> },
    empty: { color: 'transparent', label: '', icon: null },
};

const weekDays = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

/**
 * Premium Attendance Heatmap Widget
 * GitHub-style calendar visualization for attendance
 */
export const AttendanceHeatmap: React.FC<AttendanceHeatmapProps> = ({
    data,
    year = new Date().getFullYear(),
    month,
    showLegend = true,
}) => {
    // Create a map for quick lookup
    const dataMap = useMemo(() => {
        const map = new Map<string, AttendanceDay>();
        data.forEach((day) => map.set(day.date, day));
        return map;
    }, [data]);

    // Generate weeks data for the current month or year
    const weeksData = useMemo(() => {
        const weeks: (AttendanceDay | null)[][] = [];

        if (month !== undefined) {
            // Single month view
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            const startWeekDay = firstDay.getDay();

            let currentWeek: (AttendanceDay | null)[] = new Array(startWeekDay).fill(null);

            for (let day = 1; day <= lastDay.getDate(); day++) {
                const date = new Date(year, month, day);
                const dateStr = date.toISOString().split('T')[0];
                const dayOfWeek = date.getDay();

                const dayData = dataMap.get(dateStr) || {
                    date: dateStr,
                    status: dayOfWeek === 5 || dayOfWeek === 6 ? 'weekend' : 'empty' as const,
                };

                currentWeek.push(dayData);

                if (dayOfWeek === 6 || day === lastDay.getDate()) {
                    weeks.push(currentWeek);
                    currentWeek = [];
                }
            }
        } else {
            // Full year view - simplified
            for (let m = 0; m < 12; m++) {
                const lastDay = new Date(year, m + 1, 0).getDate();
                for (let d = 1; d <= lastDay; d += 7) {
                    const week: (AttendanceDay | null)[] = [];
                    for (let w = 0; w < 7 && d + w <= lastDay; w++) {
                        const date = new Date(year, m, d + w);
                        const dateStr = date.toISOString().split('T')[0];
                        week.push(dataMap.get(dateStr) || { date: dateStr, status: 'empty' });
                    }
                    weeks.push(week);
                }
            }
        }

        return weeks;
    }, [year, month, dataMap]);

    return (
        <GlassCard sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                <BarChart /> سجل الحضور
                {month !== undefined && (
                    <Typography component="span" color="text.secondary" fontWeight="normal">
                        - {months[month]} {year}
                    </Typography>
                )}
            </Typography>

            {/* Week days header */}
            <Box sx={{ display: 'flex', gap: 0.5, mb: 1, pr: 5 }}>
                {weekDays.map((day, i) => (
                    <Box
                        key={i}
                        sx={{
                            flex: 1,
                            textAlign: 'center',
                            fontSize: '0.7rem',
                            color: 'text.secondary',
                            fontWeight: 500,
                        }}
                    >
                        {day.charAt(0)}
                    </Box>
                ))}
            </Box>

            {/* Calendar grid */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {weeksData.slice(0, 5).map((week, weekIdx) => (
                    <Box key={weekIdx} sx={{ display: 'flex', gap: 0.5 }}>
                        {/* Week number */}
                        <Box sx={{ width: 40, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 1 }}>
                            <Typography variant="caption" color="text.secondary" fontSize={10}>
                                ع{weekIdx + 1}
                            </Typography>
                        </Box>

                        {/* Days */}
                        {week.map((day, dayIdx) => (
                            <Tooltip
                                key={dayIdx}
                                title={day ? `${new Date(day.date).getDate()} - ${statusConfig[day.status].label}` : ''}
                                arrow
                                placement="top"
                            >
                                <Box
                                    sx={{
                                        flex: 1,
                                        aspectRatio: '1',
                                        maxWidth: 28,
                                        maxHeight: 28,
                                        borderRadius: 1,
                                        bgcolor: day ? statusConfig[day.status].color : 'transparent',
                                        cursor: day?.status !== 'empty' ? 'pointer' : 'default',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.6rem',
                                        transition: 'all 0.2s ease',
                                        border: day?.status === 'empty' ? '1px dashed #e2e8f0' : 'none',
                                        '&:hover': day && day.status !== 'empty' ? {
                                            transform: 'scale(1.2)',
                                            boxShadow: `0 4px 12px ${statusConfig[day.status].color}40`,
                                            zIndex: 10,
                                        } : {},
                                    }}
                                >
                                    {day && day.status !== 'weekend' && day.status !== 'empty' && (
                                        <Typography sx={{ fontSize: '0.65rem', color: 'white', fontWeight: 'bold' }}>
                                            {new Date(day.date).getDate()}
                                        </Typography>
                                    )}
                                </Box>
                            </Tooltip>
                        ))}
                    </Box>
                ))}
            </Box>

            {/* Legend */}
            {showLegend && (
                <Box sx={{ display: 'flex', gap: 2, mt: 3, flexWrap: 'wrap', justifyContent: 'center' }}>
                    {Object.entries(statusConfig)
                        .filter(([key]) => key !== 'empty')
                        .map(([key, config]) => (
                            <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Box
                                    sx={{
                                        width: 12,
                                        height: 12,
                                        borderRadius: 0.5,
                                        bgcolor: config.color,
                                    }}
                                />
                                <Typography variant="caption" color="text.secondary">
                                    {config.label}
                                </Typography>
                            </Box>
                        ))}
                </Box>
            )}
        </GlassCard>
    );
};

export default AttendanceHeatmap;
