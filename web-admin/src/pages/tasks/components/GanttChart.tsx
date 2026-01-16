import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    Tooltip,
    Avatar,
    Chip,
    IconButton,
    Stack,
    ButtonGroup,
    Button,
    useTheme,
    alpha,
    Skeleton,
    FormControl,
    Select,
    MenuItem,
    InputLabel,
    Slider,
    Divider,
} from '@mui/material';
import {
    ChevronLeft as PrevIcon,
    ChevronRight as NextIcon,
    ZoomIn as ZoomInIcon,
    ZoomOut as ZoomOutIcon,
    Today as TodayIcon,
    ViewWeek as WeekIcon,
    CalendarMonth as MonthIcon,
    ViewDay as DayIcon,
    Link as LinkIcon,
    Flag as MilestoneIcon,
    AccessTime as TimeIcon,
    Person as PersonIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { tasksApi, TaskCategory } from '@/services/tasks.service';

// Interfaces
interface GanttTask {
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
    type: 'task' | 'milestone';
}

type ViewMode = 'day' | 'week' | 'month';

interface GanttChartProps {
    categoryId?: string;
    onTaskClick?: (taskId: string) => void;
}

// Configuration
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

const VIEW_CONFIG = {
    day: { columnWidth: 40, format: 'dd', headerFormat: 'EEEE d MMMM' },
    week: { columnWidth: 100, format: 'dd MMM', headerFormat: 'MMMM yyyy' },
    month: { columnWidth: 80, format: 'MMM', headerFormat: 'yyyy' },
};

// Helpers
const formatDate = (date: Date, locale = 'ar-SA'): string => {
    return date.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
};

const getDaysBetween = (start: Date, end: Date): number => {
    const diffTime = end.getTime() - start.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const addDays = (date: Date, days: number): Date => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};

// Calculate days remaining or overdue
const getDaysRemaining = (endDate: string | null): { days: number; isOverdue: boolean } | null => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const diff = getDaysBetween(today, end);
    return { days: Math.abs(diff), isOverdue: diff < 0 };
};

// Calculate task duration in days
const getTaskDuration = (start: string | null, end: string | null): number | null => {
    if (!start || !end) return null;
    return getDaysBetween(new Date(start), new Date(end));
};

// Status translations
const STATUS_LABELS: Record<string, string> = {
    BACKLOG: 'قائمة الانتظار',
    TODO: 'للتنفيذ',
    IN_PROGRESS: 'قيد التنفيذ',
    PENDING_REVIEW: 'بانتظار المراجعة',
    IN_REVIEW: 'قيد المراجعة',
    APPROVED: 'معتمد',
    REJECTED: 'مرفوض',
    BLOCKED: 'محظور',
    COMPLETED: 'مكتمل',
    CANCELLED: 'ملغي',
};

// GanttChart Component
export const GanttChart: React.FC<GanttChartProps> = ({ categoryId, onTaskClick }) => {
    const theme = useTheme();
    const containerRef = useRef<HTMLDivElement>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('week');
    const [zoomLevel, setZoomLevel] = useState<number>(100); // 50-200%
    const [showDependencies, setShowDependencies] = useState<boolean>(true);
    const [startDate, setStartDate] = useState<Date>(() => {
        const today = new Date();
        today.setDate(today.getDate() - 7);
        return today;
    });

    // Calculate actual column width based on zoom
    const getZoomedWidth = (baseWidth: number) => Math.round(baseWidth * (zoomLevel / 100));

    // Fetch Gantt data
    const { data: ganttData, isLoading, error } = useQuery({
        queryKey: ['ganttData', categoryId],
        queryFn: async () => {
            const response = await tasksApi.getGanttData(categoryId);
            // Handle both raw array and { data: [...] } response formats
            const data = Array.isArray(response) ? response : (response.data || response);
            return data as GanttTask[];
        },
    });

    // Calculate date range
    const dateRange = useMemo(() => {
        const days = viewMode === 'day' ? 14 : viewMode === 'week' ? 8 : 6;
        const end = addDays(startDate, viewMode === 'day' ? days : viewMode === 'week' ? days * 7 : days * 30);
        return { start: startDate, end, days };
    }, [startDate, viewMode]);

    // Generate columns
    const columns = useMemo(() => {
        const cols: { date: Date; label: string; isToday: boolean; isWeekend: boolean }[] = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (viewMode === 'day') {
            for (let i = 0; i < dateRange.days; i++) {
                const date = addDays(startDate, i);
                cols.push({
                    date,
                    label: date.toLocaleDateString('ar-SA', { weekday: 'short', day: 'numeric' }),
                    isToday: date.toDateString() === today.toDateString(),
                    isWeekend: date.getDay() === 5 || date.getDay() === 6, // Friday & Saturday
                });
            }
        } else if (viewMode === 'week') {
            for (let i = 0; i < dateRange.days; i++) {
                const date = addDays(startDate, i * 7);
                cols.push({
                    date,
                    label: `${formatDate(date)} - ${formatDate(addDays(date, 6))}`,
                    isToday: today >= date && today < addDays(date, 7),
                    isWeekend: false,
                });
            }
        } else {
            for (let i = 0; i < dateRange.days; i++) {
                const date = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
                cols.push({
                    date,
                    label: date.toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' }),
                    isToday: today.getMonth() === date.getMonth() && today.getFullYear() === date.getFullYear(),
                    isWeekend: false,
                });
            }
        }
        return cols;
    }, [startDate, viewMode, dateRange.days]);

    // Calculate task bar position
    const getTaskBarStyle = (task: GanttTask) => {
        if (!task.start && !task.end) return null;

        const taskStart = new Date(task.start || task.end!);
        const taskEnd = new Date(task.end || task.start!);
        taskStart.setHours(0, 0, 0, 0);
        taskEnd.setHours(0, 0, 0, 0);

        const timelineStart = new Date(startDate);
        timelineStart.setHours(0, 0, 0, 0);

        const columnWidth = VIEW_CONFIG[viewMode].columnWidth;
        const daysPerColumn = viewMode === 'day' ? 1 : viewMode === 'week' ? 7 : 30;

        const startOffset = getDaysBetween(timelineStart, taskStart) / daysPerColumn;
        const duration = Math.max(1, getDaysBetween(taskStart, taskEnd) / daysPerColumn);

        const left = startOffset * columnWidth;
        const width = duration * columnWidth;

        // Check if task is visible
        if (left + width < 0 || left > columns.length * columnWidth) {
            return null;
        }

        return {
            left: Math.max(0, left),
            width: Math.min(width, columns.length * columnWidth - left),
            isPartialStart: left < 0,
            isPartialEnd: left + width > columns.length * columnWidth,
        };
    };

    // Navigation
    const navigate = (direction: 'prev' | 'next' | 'today') => {
        if (direction === 'today') {
            const today = new Date();
            today.setDate(today.getDate() - 7);
            setStartDate(today);
        } else {
            const days = viewMode === 'day' ? 7 : viewMode === 'week' ? 4 * 7 : 3 * 30;
            setStartDate(addDays(startDate, direction === 'next' ? days : -days));
        }
    };

    // Today line position
    const todayPosition = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const columnWidth = VIEW_CONFIG[viewMode].columnWidth;
        const daysPerColumn = viewMode === 'day' ? 1 : viewMode === 'week' ? 7 : 30;
        const offset = getDaysBetween(startDate, today) / daysPerColumn;
        return offset * columnWidth;
    }, [startDate, viewMode]);

    const columnWidth = VIEW_CONFIG[viewMode].columnWidth;
    const rowHeight = 48;
    const headerHeight = 50;

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

    const tasks = ganttData || [];

    return (
        <Paper
            elevation={0}
            sx={{
                borderRadius: 3,
                overflow: 'hidden',
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                background: `linear-gradient(180deg, ${alpha('#ffffff', 0.98)} 0%, ${alpha('#f8fafc', 0.95)} 100%)`,
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
                    background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, transparent 100%)`,
                }}
            >
                <Stack direction="row" spacing={2} alignItems="center">
                    <Typography variant="h6" fontWeight={700} color="primary.main">
                        📊 مخطط جانت
                    </Typography>
                    <Chip
                        label={`${tasks.length} مهمة`}
                        size="small"
                        sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), fontWeight: 600 }}
                    />
                </Stack>

                <Stack direction="row" spacing={1} alignItems="center">
                    {/* View Mode */}
                    <ButtonGroup size="small" variant="outlined">
                        <Button
                            onClick={() => setViewMode('day')}
                            variant={viewMode === 'day' ? 'contained' : 'outlined'}
                            startIcon={<DayIcon />}
                        >
                            يوم
                        </Button>
                        <Button
                            onClick={() => setViewMode('week')}
                            variant={viewMode === 'week' ? 'contained' : 'outlined'}
                            startIcon={<WeekIcon />}
                        >
                            أسبوع
                        </Button>
                        <Button
                            onClick={() => setViewMode('month')}
                            variant={viewMode === 'month' ? 'contained' : 'outlined'}
                            startIcon={<MonthIcon />}
                        >
                            شهر
                        </Button>
                    </ButtonGroup>

                    {/* Navigation */}
                    <IconButton onClick={() => navigate('prev')} size="small">
                        <NextIcon />
                    </IconButton>
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<TodayIcon />}
                        onClick={() => navigate('today')}
                    >
                        اليوم
                    </Button>
                    <IconButton onClick={() => navigate('next')} size="small">
                        <PrevIcon />
                    </IconButton>

                    <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

                    {/* Zoom Controls */}
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 150 }}>
                        <IconButton
                            size="small"
                            onClick={() => setZoomLevel(Math.max(50, zoomLevel - 25))}
                            disabled={zoomLevel <= 50}
                        >
                            <ZoomOutIcon fontSize="small" />
                        </IconButton>
                        <Slider
                            value={zoomLevel}
                            onChange={(_, value) => setZoomLevel(value as number)}
                            min={50}
                            max={200}
                            step={25}
                            size="small"
                            sx={{ width: 80 }}
                        />
                        <IconButton
                            size="small"
                            onClick={() => setZoomLevel(Math.min(200, zoomLevel + 25))}
                            disabled={zoomLevel >= 200}
                        >
                            <ZoomInIcon fontSize="small" />
                        </IconButton>
                        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 40 }}>
                            {zoomLevel}%
                        </Typography>
                    </Stack>

                    <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

                    {/* Dependencies Toggle */}
                    <Tooltip title={showDependencies ? 'إخفاء التبعيات' : 'إظهار التبعيات'}>
                        <IconButton
                            size="small"
                            onClick={() => setShowDependencies(!showDependencies)}
                            color={showDependencies ? 'primary' : 'default'}
                        >
                            <LinkIcon />
                        </IconButton>
                    </Tooltip>
                </Stack>
            </Box>

            {/* Main Content */}
            <Box sx={{ display: 'flex', overflow: 'hidden' }}>
                {/* Task List (Left Panel) */}
                <Box
                    sx={{
                        width: 280,
                        flexShrink: 0,
                        borderLeft: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                        bgcolor: alpha(theme.palette.background.default, 0.5),
                    }}
                >
                    {/* Header */}
                    <Box
                        sx={{
                            height: headerHeight,
                            display: 'flex',
                            alignItems: 'center',
                            px: 2,
                            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                            bgcolor: alpha(theme.palette.primary.main, 0.03),
                        }}
                    >
                        <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
                            المهمة
                        </Typography>
                    </Box>

                    {/* Task Names */}
                    <Box sx={{ maxHeight: 500, overflowY: 'auto' }}>
                        {tasks.map((task) => (
                            <Box
                                key={task.id}
                                onClick={() => onTaskClick?.(task.id)}
                                sx={{
                                    height: rowHeight,
                                    display: 'flex',
                                    alignItems: 'center',
                                    px: 2,
                                    gap: 1.5,
                                    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.05)}`,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    '&:hover': {
                                        bgcolor: alpha(theme.palette.primary.main, 0.05),
                                    },
                                }}
                            >
                                {task.assignee && (
                                    <Tooltip title={`${task.assignee.firstName} ${task.assignee.lastName}`}>
                                        <Avatar
                                            src={task.assignee.avatar}
                                            sx={{
                                                width: 28,
                                                height: 28,
                                                fontSize: '0.75rem',
                                                bgcolor: alpha(PRIORITY_COLORS[task.priority], 0.2),
                                                color: PRIORITY_COLORS[task.priority],
                                            }}
                                        >
                                            {task.assignee.firstName?.[0]}
                                        </Avatar>
                                    </Tooltip>
                                )}
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography
                                        variant="body2"
                                        fontWeight={600}
                                        sx={{
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {task.name}
                                    </Typography>
                                    {task.category && (
                                        <Typography variant="caption" color="text.secondary">
                                            {task.category.name}
                                        </Typography>
                                    )}
                                </Box>
                            </Box>
                        ))}
                    </Box>
                </Box>

                {/* Timeline (Right Panel) */}
                <Box
                    ref={containerRef}
                    sx={{
                        flex: 1,
                        overflowX: 'auto',
                        overflowY: 'hidden',
                        position: 'relative',
                    }}
                >
                    {/* Column Headers */}
                    <Box
                        sx={{
                            display: 'flex',
                            height: headerHeight,
                            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                            position: 'sticky',
                            top: 0,
                            zIndex: 2,
                            bgcolor: 'background.paper',
                        }}
                    >
                        {columns.map((col, index) => (
                            <Box
                                key={index}
                                sx={{
                                    width: columnWidth,
                                    flexShrink: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderLeft: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
                                    bgcolor: col.isToday
                                        ? alpha(theme.palette.primary.main, 0.1)
                                        : col.isWeekend
                                            ? alpha(theme.palette.action.hover, 0.5)
                                            : 'transparent',
                                }}
                            >
                                <Typography
                                    variant="caption"
                                    fontWeight={col.isToday ? 700 : 500}
                                    color={col.isToday ? 'primary.main' : 'text.secondary'}
                                    sx={{ textAlign: 'center', fontSize: '0.7rem' }}
                                >
                                    {col.label}
                                </Typography>
                            </Box>
                        ))}
                    </Box>

                    {/* Rows with Task Bars */}
                    <Box sx={{ position: 'relative', maxHeight: 500, overflowY: 'auto' }}>
                        {/* Grid Lines */}
                        <Box
                            sx={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                display: 'flex',
                                pointerEvents: 'none',
                            }}
                        >
                            {columns.map((col, index) => (
                                <Box
                                    key={index}
                                    sx={{
                                        width: columnWidth,
                                        flexShrink: 0,
                                        borderLeft: `1px solid ${alpha(theme.palette.divider, 0.05)}`,
                                        bgcolor: col.isWeekend ? alpha(theme.palette.action.hover, 0.3) : 'transparent',
                                        height: tasks.length * rowHeight,
                                    }}
                                />
                            ))}
                        </Box>

                        {/* Today Marker */}
                        {todayPosition > 0 && todayPosition < columns.length * columnWidth && (
                            <Box
                                sx={{
                                    position: 'absolute',
                                    top: 0,
                                    left: todayPosition,
                                    width: 2,
                                    height: tasks.length * rowHeight,
                                    bgcolor: theme.palette.error.main,
                                    zIndex: 3,
                                    '&::before': {
                                        content: '"اليوم"',
                                        position: 'absolute',
                                        top: -24,
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        fontSize: '0.65rem',
                                        fontWeight: 700,
                                        color: theme.palette.error.main,
                                        whiteSpace: 'nowrap',
                                    },
                                }}
                            />
                        )}

                        {/* Task Bars */}
                        {tasks.map((task, index) => {
                            const barStyle = getTaskBarStyle(task);
                            if (!barStyle) {
                                return (
                                    <Box
                                        key={task.id}
                                        sx={{
                                            height: rowHeight,
                                            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.05)}`,
                                        }}
                                    />
                                );
                            }

                            const priorityColor = PRIORITY_COLORS[task.priority] || '#6B7280';
                            const statusColor = STATUS_COLORS[task.status] || '#6B7280';

                            return (
                                <Box
                                    key={task.id}
                                    sx={{
                                        height: rowHeight,
                                        position: 'relative',
                                        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.05)}`,
                                    }}
                                >
                                    <Tooltip
                                        title={
                                            <Box sx={{ minWidth: 220 }}>
                                                {/* Task Name */}
                                                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                                                    {task.name}
                                                </Typography>

                                                {/* Status */}
                                                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                                                    <Box sx={{
                                                        width: 8,
                                                        height: 8,
                                                        borderRadius: '50%',
                                                        bgcolor: statusColor
                                                    }} />
                                                    <Typography variant="caption">
                                                        {STATUS_LABELS[task.status] || task.status}
                                                    </Typography>
                                                </Stack>

                                                {/* Progress */}
                                                <Box sx={{ mb: 1 }}>
                                                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.25 }}>
                                                        <Typography variant="caption">التقدم</Typography>
                                                        <Typography variant="caption" fontWeight={600}>{task.progress}%</Typography>
                                                    </Stack>
                                                    <Box sx={{
                                                        width: '100%',
                                                        height: 4,
                                                        bgcolor: alpha('#000', 0.1),
                                                        borderRadius: 2
                                                    }}>
                                                        <Box sx={{
                                                            width: `${task.progress}%`,
                                                            height: '100%',
                                                            bgcolor: task.progress >= 100 ? '#10B981' : priorityColor,
                                                            borderRadius: 2
                                                        }} />
                                                    </Box>
                                                </Box>

                                                {/* Duration & Dates */}
                                                {task.start && task.end && (
                                                    <Typography variant="caption" display="block" sx={{ mb: 0.5 }}>
                                                        <TimeIcon sx={{ fontSize: 12, mr: 0.5, verticalAlign: 'middle' }} />
                                                        المدة: {getTaskDuration(task.start, task.end)} يوم
                                                    </Typography>
                                                )}

                                                {task.start && (
                                                    <Typography variant="caption" display="block" color="text.secondary">
                                                        البداية: {new Date(task.start).toLocaleDateString('ar-SA')}
                                                    </Typography>
                                                )}
                                                {task.end && (
                                                    <Typography variant="caption" display="block" color="text.secondary">
                                                        النهاية: {new Date(task.end).toLocaleDateString('ar-SA')}
                                                    </Typography>
                                                )}

                                                {/* Days Remaining */}
                                                {(() => {
                                                    const remaining = getDaysRemaining(task.end);
                                                    if (!remaining || task.status === 'COMPLETED') return null;
                                                    return (
                                                        <Typography
                                                            variant="caption"
                                                            display="block"
                                                            sx={{
                                                                mt: 0.5,
                                                                color: remaining.isOverdue ? '#DC2626' : '#059669',
                                                                fontWeight: 600
                                                            }}
                                                        >
                                                            {remaining.isOverdue
                                                                ? `⚠️ متأخر بـ ${remaining.days} يوم`
                                                                : `✓ متبقي ${remaining.days} يوم`}
                                                        </Typography>
                                                    );
                                                })()}

                                                {/* Dependencies */}
                                                {task.dependencies && task.dependencies.length > 0 && (
                                                    <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                                                        <LinkIcon sx={{ fontSize: 12, mr: 0.5, verticalAlign: 'middle' }} />
                                                        تبعيات: {task.dependencies.length}
                                                    </Typography>
                                                )}

                                                {/* Assignee */}
                                                {task.assignee && (
                                                    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 1 }}>
                                                        <PersonIcon sx={{ fontSize: 12 }} />
                                                        <Typography variant="caption">
                                                            {task.assignee.firstName} {task.assignee.lastName}
                                                        </Typography>
                                                    </Stack>
                                                )}
                                            </Box>
                                        }
                                        arrow
                                        placement="top"
                                    >
                                        <Box
                                            onClick={() => onTaskClick?.(task.id)}
                                            sx={{
                                                position: 'absolute',
                                                top: 8,
                                                left: barStyle.left,
                                                width: barStyle.width,
                                                height: 32,
                                                borderRadius: 2,
                                                bgcolor: alpha(priorityColor, 0.15),
                                                border: `2px solid ${priorityColor}`,
                                                overflow: 'hidden',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease',
                                                '&:hover': {
                                                    transform: 'scale(1.02)',
                                                    boxShadow: `0 4px 12px ${alpha(priorityColor, 0.3)}`,
                                                },
                                            }}
                                        >
                                            {/* Progress Fill */}
                                            <Box
                                                sx={{
                                                    position: 'absolute',
                                                    top: 0,
                                                    left: 0,
                                                    height: '100%',
                                                    width: `${task.progress}%`,
                                                    bgcolor: alpha(priorityColor, 0.4),
                                                    borderRadius: 1,
                                                }}
                                            />
                                            {/* Task Name */}
                                            <Box
                                                sx={{
                                                    position: 'relative',
                                                    zIndex: 1,
                                                    height: '100%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    px: 1,
                                                }}
                                            >
                                                <Typography
                                                    variant="caption"
                                                    fontWeight={600}
                                                    sx={{
                                                        color: priorityColor,
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                        fontSize: '0.7rem',
                                                    }}
                                                >
                                                    {barStyle.width > 60 ? task.name : ''}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </Tooltip>
                                </Box>
                            );
                        })}
                    </Box>
                </Box>
            </Box>

            {/* Legend */}
            <Box
                sx={{
                    p: 2,
                    borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    display: 'flex',
                    justifyContent: 'center',
                    gap: 3,
                    flexWrap: 'wrap',
                }}
            >
                {Object.entries(PRIORITY_COLORS).map(([priority, color]) => (
                    <Stack key={priority} direction="row" spacing={0.5} alignItems="center">
                        <Box
                            sx={{
                                width: 12,
                                height: 12,
                                borderRadius: 1,
                                bgcolor: color,
                            }}
                        />
                        <Typography variant="caption" color="text.secondary">
                            {priority === 'URGENT' ? 'عاجل' :
                                priority === 'HIGH' ? 'عالي' :
                                    priority === 'MEDIUM' ? 'متوسط' : 'منخفض'}
                        </Typography>
                    </Stack>
                ))}
            </Box>
        </Paper>
    );
};

export default GanttChart;
