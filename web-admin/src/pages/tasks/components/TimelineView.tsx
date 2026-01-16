import React, { useMemo, useState } from 'react';
import {
    Box,
    Paper,
    Typography,
    Tooltip,
    Avatar,
    Chip,
    Stack,
    FormControl,
    Select,
    MenuItem,
    InputLabel,
    useTheme,
    alpha,
    Skeleton,
    IconButton,
} from '@mui/material';
import {
    ChevronLeft as PrevIcon,
    ChevronRight as NextIcon,
    Today as TodayIcon,
    Timeline as TimelineIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { tasksApi, TaskCategory } from '@/services/tasks.service';

interface TimelineTask {
    id: string;
    name: string;
    start: string | null;
    end: string | null;
    progress: number;
    status: string;
    priority: string;
    assignee?: {
        id: string;
        firstName: string;
        lastName: string;
        avatar?: string;
    };
    category?: TaskCategory;
    dependencies: string[];
}

type GroupBy = 'none' | 'status' | 'priority' | 'category' | 'assignee';

interface TimelineViewProps {
    categoryId?: string;
    onTaskClick?: (taskId: string) => void;
}

const PRIORITY_COLORS: Record<string, string> = {
    URGENT: '#DC2626',
    HIGH: '#F59E0B',
    MEDIUM: '#3B82F6',
    LOW: '#6B7280',
};

const STATUS_COLORS: Record<string, string> = {
    BACKLOG: '#6B7280',
    TODO: '#3B82F6',
    IN_PROGRESS: '#F59E0B',
    PENDING_REVIEW: '#EC4899',
    IN_REVIEW: '#8B5CF6',
    APPROVED: '#059669',
    REJECTED: '#DC2626',
    BLOCKED: '#EF4444',
    COMPLETED: '#10B981',
    CANCELLED: '#9CA3AF',
};

const STATUS_LABELS: Record<string, string> = {
    BACKLOG: 'قائمة الانتظار',
    TODO: 'للعمل',
    IN_PROGRESS: 'جاري العمل',
    PENDING_REVIEW: 'في انتظار المراجعة',
    IN_REVIEW: 'قيد المراجعة',
    APPROVED: 'معتمد',
    REJECTED: 'مرفوض',
    BLOCKED: 'محظور',
    COMPLETED: 'مكتمل',
    CANCELLED: 'ملغي',
};

const PRIORITY_LABELS: Record<string, string> = {
    URGENT: 'عاجل 🔥',
    HIGH: 'عالي ⚡',
    MEDIUM: 'متوسط 📌',
    LOW: 'منخفض 💤',
};

export const TimelineView: React.FC<TimelineViewProps> = ({ categoryId, onTaskClick }) => {
    const theme = useTheme();
    const [groupBy, setGroupBy] = useState<GroupBy>('status');
    const [startDate, setStartDate] = useState<Date>(() => {
        const today = new Date();
        today.setDate(today.getDate() - 14);
        return today;
    });

    // Fetch data
    const { data: tasks, isLoading, error } = useQuery({
        queryKey: ['ganttData', categoryId],
        queryFn: async () => {
            const response = await tasksApi.getGanttData(categoryId);
            return response.data as TimelineTask[];
        },
    });

    // Days to show
    const daysToShow = 60;
    const columnWidth = 24;

    // Generate days
    const days = useMemo(() => {
        const result: { date: Date; label: string; isToday: boolean; isWeekend: boolean; isFirstOfMonth: boolean }[] = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 0; i < daysToShow; i++) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + i);
            result.push({
                date,
                label: date.getDate().toString(),
                isToday: date.toDateString() === today.toDateString(),
                isWeekend: date.getDay() === 5 || date.getDay() === 6,
                isFirstOfMonth: date.getDate() === 1,
            });
        }
        return result;
    }, [startDate]);

    // Month headers
    const monthHeaders = useMemo(() => {
        const months: { label: string; span: number; startIndex: number }[] = [];
        let currentMonth = '';
        let currentSpan = 0;
        let currentStart = 0;

        days.forEach((day, index) => {
            const monthLabel = day.date.toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' });
            if (monthLabel !== currentMonth) {
                if (currentMonth) {
                    months.push({ label: currentMonth, span: currentSpan, startIndex: currentStart });
                }
                currentMonth = monthLabel;
                currentSpan = 1;
                currentStart = index;
            } else {
                currentSpan++;
            }
        });
        if (currentMonth) {
            months.push({ label: currentMonth, span: currentSpan, startIndex: currentStart });
        }
        return months;
    }, [days]);

    // Group tasks
    const groupedTasks = useMemo(() => {
        if (!tasks) return {};

        if (groupBy === 'none') {
            return { 'جميع المهام': tasks };
        }

        const groups: Record<string, TimelineTask[]> = {};

        tasks.forEach((task) => {
            let key = '';
            if (groupBy === 'status') {
                key = STATUS_LABELS[task.status] || task.status;
            } else if (groupBy === 'priority') {
                key = PRIORITY_LABELS[task.priority] || task.priority;
            } else if (groupBy === 'category') {
                key = task.category?.name || 'بدون فئة';
            } else if (groupBy === 'assignee') {
                key = task.assignee
                    ? `${task.assignee.firstName} ${task.assignee.lastName}`
                    : 'غير معين';
            }

            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(task);
        });

        return groups;
    }, [tasks, groupBy]);

    // Calculate bar position
    const getBarPosition = (task: TimelineTask) => {
        if (!task.start && !task.end) return null;

        const taskStart = new Date(task.start || task.end!);
        const taskEnd = new Date(task.end || task.start!);
        taskStart.setHours(0, 0, 0, 0);
        taskEnd.setHours(0, 0, 0, 0);

        const timelineStart = new Date(startDate);
        timelineStart.setHours(0, 0, 0, 0);

        const startOffset = Math.floor((taskStart.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24));
        const duration = Math.max(1, Math.ceil((taskEnd.getTime() - taskStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);

        if (startOffset + duration < 0 || startOffset > daysToShow) {
            return null;
        }

        return {
            left: Math.max(0, startOffset) * columnWidth,
            width: Math.min(duration, daysToShow - startOffset) * columnWidth,
        };
    };

    // Navigation
    const navigate = (direction: 'prev' | 'next' | 'today') => {
        if (direction === 'today') {
            const today = new Date();
            today.setDate(today.getDate() - 14);
            setStartDate(today);
        } else {
            const days = direction === 'next' ? 14 : -14;
            setStartDate((prev) => {
                const newDate = new Date(prev);
                newDate.setDate(newDate.getDate() + days);
                return newDate;
            });
        }
    };

    if (isLoading) {
        return (
            <Paper sx={{ p: 3, borderRadius: 3 }}>
                <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
            </Paper>
        );
    }

    if (error) {
        return (
            <Paper sx={{ p: 3, borderRadius: 3, textAlign: 'center' }}>
                <Typography color="error">حدث خطأ في تحميل البيانات</Typography>
            </Paper>
        );
    }

    return (
        <Paper
            elevation={0}
            sx={{
                borderRadius: 3,
                overflow: 'hidden',
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            }}
        >
            {/* Toolbar */}
            <Box
                sx={{
                    p: 2,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    background: `linear-gradient(135deg, ${alpha(theme.palette.secondary.main, 0.05)} 0%, transparent 100%)`,
                }}
            >
                <Stack direction="row" spacing={2} alignItems="center">
                    <TimelineIcon color="secondary" />
                    <Typography variant="h6" fontWeight={700} color="secondary.main">
                        الجدول الزمني
                    </Typography>
                    <Chip
                        label={`${tasks?.length || 0} مهمة`}
                        size="small"
                        sx={{ bgcolor: alpha(theme.palette.secondary.main, 0.1), fontWeight: 600 }}
                    />
                </Stack>

                <Stack direction="row" spacing={2} alignItems="center">
                    {/* Group By */}
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                        <InputLabel>تجميع حسب</InputLabel>
                        <Select
                            value={groupBy}
                            label="تجميع حسب"
                            onChange={(e) => setGroupBy(e.target.value as GroupBy)}
                        >
                            <MenuItem value="none">بدون تجميع</MenuItem>
                            <MenuItem value="status">الحالة</MenuItem>
                            <MenuItem value="priority">الأولوية</MenuItem>
                            <MenuItem value="category">الفئة</MenuItem>
                            <MenuItem value="assignee">المسؤول</MenuItem>
                        </Select>
                    </FormControl>

                    {/* Navigation */}
                    <IconButton onClick={() => navigate('prev')} size="small">
                        <NextIcon />
                    </IconButton>
                    <IconButton onClick={() => navigate('today')} size="small">
                        <TodayIcon />
                    </IconButton>
                    <IconButton onClick={() => navigate('next')} size="small">
                        <PrevIcon />
                    </IconButton>
                </Stack>
            </Box>

            {/* Timeline Content */}
            <Box sx={{ overflowX: 'auto' }}>
                {/* Month Headers */}
                <Box sx={{ display: 'flex', borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                    <Box sx={{ width: 200, flexShrink: 0, bgcolor: alpha(theme.palette.background.default, 0.5) }} />
                    {monthHeaders.map((month, index) => (
                        <Box
                            key={index}
                            sx={{
                                width: month.span * columnWidth,
                                flexShrink: 0,
                                textAlign: 'center',
                                py: 1,
                                bgcolor: alpha(theme.palette.primary.main, 0.05),
                                borderLeft: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                            }}
                        >
                            <Typography variant="caption" fontWeight={700} color="primary.main">
                                {month.label}
                            </Typography>
                        </Box>
                    ))}
                </Box>

                {/* Day Headers */}
                <Box sx={{ display: 'flex', borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                    <Box sx={{ width: 200, flexShrink: 0, bgcolor: alpha(theme.palette.background.default, 0.5) }} />
                    {days.map((day, index) => (
                        <Box
                            key={index}
                            sx={{
                                width: columnWidth,
                                flexShrink: 0,
                                textAlign: 'center',
                                py: 0.5,
                                bgcolor: day.isToday
                                    ? alpha(theme.palette.error.main, 0.15)
                                    : day.isWeekend
                                        ? alpha(theme.palette.action.hover, 0.5)
                                        : 'transparent',
                                borderLeft: day.isFirstOfMonth
                                    ? `2px solid ${theme.palette.divider}`
                                    : `1px solid ${alpha(theme.palette.divider, 0.05)}`,
                            }}
                        >
                            <Typography
                                variant="caption"
                                fontWeight={day.isToday ? 700 : 400}
                                color={day.isToday ? 'error.main' : 'text.secondary'}
                                fontSize="0.65rem"
                            >
                                {day.label}
                            </Typography>
                        </Box>
                    ))}
                </Box>

                {/* Groups and Tasks */}
                <Box sx={{ maxHeight: 500, overflowY: 'auto' }}>
                    {Object.entries(groupedTasks).map(([groupName, groupTasks]) => (
                        <Box key={groupName}>
                            {/* Group Header */}
                            {groupBy !== 'none' && (
                                <Box
                                    sx={{
                                        display: 'flex',
                                        bgcolor: alpha(theme.palette.primary.main, 0.03),
                                        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                    }}
                                >
                                    <Box
                                        sx={{
                                            width: 200,
                                            flexShrink: 0,
                                            p: 1,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1,
                                        }}
                                    >
                                        <Typography variant="subtitle2" fontWeight={700}>
                                            {groupName}
                                        </Typography>
                                        <Chip
                                            label={groupTasks.length}
                                            size="small"
                                            sx={{ height: 20, fontSize: '0.65rem' }}
                                        />
                                    </Box>
                                    <Box sx={{ flex: 1 }} />
                                </Box>
                            )}

                            {/* Tasks */}
                            {groupTasks.map((task) => {
                                const barPos = getBarPosition(task);
                                const color = PRIORITY_COLORS[task.priority] || '#6B7280';

                                return (
                                    <Box
                                        key={task.id}
                                        sx={{
                                            display: 'flex',
                                            height: 36,
                                            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.05)}`,
                                            '&:hover': {
                                                bgcolor: alpha(theme.palette.primary.main, 0.02),
                                            },
                                        }}
                                    >
                                        {/* Task Name */}
                                        <Box
                                            onClick={() => onTaskClick?.(task.id)}
                                            sx={{
                                                width: 200,
                                                flexShrink: 0,
                                                px: 1,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1,
                                                cursor: 'pointer',
                                            }}
                                        >
                                            {task.assignee && (
                                                <Avatar
                                                    src={task.assignee.avatar}
                                                    sx={{ width: 20, height: 20, fontSize: '0.6rem' }}
                                                >
                                                    {task.assignee.firstName?.[0]}
                                                </Avatar>
                                            )}
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                {task.name}
                                            </Typography>
                                        </Box>

                                        {/* Bar Container */}
                                        <Box sx={{ flex: 1, position: 'relative', display: 'flex' }}>
                                            {/* Grid */}
                                            {days.map((day, index) => (
                                                <Box
                                                    key={index}
                                                    sx={{
                                                        width: columnWidth,
                                                        flexShrink: 0,
                                                        bgcolor: day.isToday
                                                            ? alpha(theme.palette.error.main, 0.1)
                                                            : day.isWeekend
                                                                ? alpha(theme.palette.action.hover, 0.3)
                                                                : 'transparent',
                                                        borderLeft: `1px solid ${alpha(theme.palette.divider, 0.03)}`,
                                                    }}
                                                />
                                            ))}

                                            {/* Task Bar */}
                                            {barPos && (
                                                <Tooltip title={`${task.name} (${task.progress}%)`}>
                                                    <Box
                                                        onClick={() => onTaskClick?.(task.id)}
                                                        sx={{
                                                            position: 'absolute',
                                                            top: 6,
                                                            left: barPos.left,
                                                            width: barPos.width,
                                                            height: 24,
                                                            bgcolor: alpha(color, 0.2),
                                                            borderRadius: 2,
                                                            border: `1px solid ${color}`,
                                                            cursor: 'pointer',
                                                            overflow: 'hidden',
                                                            '&:hover': {
                                                                boxShadow: `0 2px 8px ${alpha(color, 0.3)}`,
                                                            },
                                                        }}
                                                    >
                                                        {/* Progress */}
                                                        <Box
                                                            sx={{
                                                                position: 'absolute',
                                                                top: 0,
                                                                left: 0,
                                                                height: '100%',
                                                                width: `${task.progress}%`,
                                                                bgcolor: alpha(color, 0.5),
                                                            }}
                                                        />
                                                    </Box>
                                                </Tooltip>
                                            )}
                                        </Box>
                                    </Box>
                                );
                            })}
                        </Box>
                    ))}
                </Box>
            </Box>
        </Paper>
    );
};

export default TimelineView;
