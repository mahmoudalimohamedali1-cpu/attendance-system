import { Box, Typography, Tooltip } from '@mui/material';
import { useMemo } from 'react';

interface AttendanceDay {
    date: string;
    status: 'PRESENT' | 'ABSENT' | 'LATE' | 'LEAVE' | 'WEEKEND' | 'HOLIDAY' | 'NO_DATA';
}

interface AttendanceHeatmapProps {
    data: AttendanceDay[];
    startDate?: Date;
    endDate?: Date;
}

const statusColors: Record<AttendanceDay['status'], string> = {
    PRESENT: '#4CAF50',
    ABSENT: '#F44336',
    LATE: '#FF9800',
    LEAVE: '#9C27B0',
    WEEKEND: '#E0E0E0',
    HOLIDAY: '#2196F3',
    NO_DATA: '#F5F5F5',
};

const statusLabels: Record<AttendanceDay['status'], string> = {
    PRESENT: 'حاضر',
    ABSENT: 'غائب',
    LATE: 'متأخر',
    LEAVE: 'إجازة',
    WEEKEND: 'عطلة أسبوعية',
    HOLIDAY: 'عطلة رسمية',
    NO_DATA: 'لا توجد بيانات',
};

const weekDays = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

export const AttendanceHeatmap = ({ data, startDate, endDate }: AttendanceHeatmapProps) => {
    // Generate weeks grid
    const weeksData = useMemo(() => {
        const end = endDate || new Date();
        const start = startDate || new Date(end.getFullYear(), end.getMonth() - 2, 1);

        const dataMap = new Map(data.map(d => [d.date, d.status]));
        const weeks: (AttendanceDay | null)[][] = [];
        let currentWeek: (AttendanceDay | null)[] = [];

        // Pad the first week
        const firstDayOfWeek = start.getDay();
        for (let i = 0; i < firstDayOfWeek; i++) {
            currentWeek.push(null);
        }

        const current = new Date(start);
        while (current <= end) {
            const dateStr = current.toISOString().split('T')[0];
            const dayOfWeek = current.getDay();

            const status = dataMap.get(dateStr) ||
                (dayOfWeek === 5 || dayOfWeek === 6 ? 'WEEKEND' : 'NO_DATA');

            currentWeek.push({
                date: dateStr,
                status: status as AttendanceDay['status'],
            });

            if (dayOfWeek === 6) {
                weeks.push(currentWeek);
                currentWeek = [];
            }

            current.setDate(current.getDate() + 1);
        }

        // Push remaining days
        if (currentWeek.length > 0) {
            while (currentWeek.length < 7) {
                currentWeek.push(null);
            }
            weeks.push(currentWeek);
        }

        return weeks;
    }, [data, startDate, endDate]);

    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                سجل الحضور
            </Typography>

            {/* Week day labels */}
            <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
                <Box sx={{ width: 40 }} /> {/* Spacer for month labels */}
                {weekDays.map((day, i) => (
                    <Box
                        key={i}
                        sx={{
                            width: 16,
                            height: 16,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Typography variant="caption" color="text.secondary" fontSize={8}>
                            {day.charAt(0)}
                        </Typography>
                    </Box>
                ))}
            </Box>

            {/* Heatmap grid */}
            <Box sx={{ display: 'flex', gap: 0.5 }}>
                {weeksData.map((week, weekIdx) => (
                    <Box key={weekIdx} sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        {week.map((day, dayIdx) => (
                            <Tooltip
                                key={dayIdx}
                                title={day ? `${day.date}: ${statusLabels[day.status]}` : ''}
                                arrow
                                placement="top"
                            >
                                <Box
                                    sx={{
                                        width: 16,
                                        height: 16,
                                        borderRadius: 0.5,
                                        bgcolor: day ? statusColors[day.status] : 'transparent',
                                        cursor: day ? 'pointer' : 'default',
                                        transition: 'transform 0.2s',
                                        '&:hover': day ? {
                                            transform: 'scale(1.2)',
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                                        } : {},
                                    }}
                                />
                            </Tooltip>
                        ))}
                    </Box>
                ))}
            </Box>

            {/* Legend */}
            <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
                {(['PRESENT', 'LATE', 'ABSENT', 'LEAVE'] as const).map((status) => (
                    <Box key={status} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box
                            sx={{
                                width: 12,
                                height: 12,
                                borderRadius: 0.5,
                                bgcolor: statusColors[status],
                            }}
                        />
                        <Typography variant="caption" color="text.secondary">
                            {statusLabels[status]}
                        </Typography>
                    </Box>
                ))}
            </Box>
        </Box>
    );
};

export default AttendanceHeatmap;
