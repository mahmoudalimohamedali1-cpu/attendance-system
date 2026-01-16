import React, { useState, useMemo, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    Button,
    Chip,
    Avatar,
    LinearProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Grid,
    Card,
    CardContent,
    Tabs,
    Tab,
    Tooltip,
    Stack,
    Skeleton,
    InputAdornment,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TableSortLabel,
    Autocomplete,
    useTheme,
    alpha,
} from '@mui/material';
import {
    Add as AddIcon,
    ViewKanban as KanbanIcon,
    ViewList as ListIcon,
    CalendarMonth as CalendarIcon,
    FilterList as FilterIcon,
    AccessTime as TimeIcon,
    Comment as CommentIcon,
    Flag as FlagIcon,
    CheckCircle as CheckIcon,
    FolderOpen as FolderIcon,
    Search as SearchIcon,
    Clear as ClearIcon,
    AttachFile as AttachIcon,
    Link as LinkIcon,
    ChevronLeft as PrevIcon,
    ChevronRight as NextIcon,
    FileDownload as FileDownloadIcon,
    BarChart as GanttIcon,
    Timeline as TimelineIcon,
} from '@mui/icons-material';
import { useKanbanBoard, useTaskStats, useCreateTask, useReorderTask, useTaskCategories, useTasks } from './hooks/useTasks';
import { Task, TaskCategory, enterpriseTasksApi, Sprint, TeamWorkload, tasksApi } from '@/services/tasks.service';
import { TaskDetailsDialog } from './components/TaskDetailsDialog';
import { GanttChart } from './components/GanttChart';
import { TimelineView } from './components/TimelineView';
import { SmartPriorityView, WorkloadAnalysisView, BurndownChartView, VelocityChartView, AiEstimationDialog } from './components/AdvancedTaskComponents';
import { RecurringTasksView, AutomationsManager, ReportsGenerator, TaskTimerWidget } from './components/Batch2TaskComponents';
import { AdvancedPlanningDashboard } from './components/AdvancedPlanningComponents';
import { TeamCollaborationDashboard } from './components/TeamCollaborationComponents';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api.service';
import {
    Speed as SpeedIcon,
    Groups as TeamIcon,
    Analytics as AnalyticsIcon,
    Timer as TimerIcon,
    PlayArrow as PlayIcon,
    Stop as StopIcon,
    TrendingUp as TrendingUpIcon,
    Psychology as AiIcon,
    Bolt as BoltIcon,
    Star as StarIcon,
    Repeat as RepeatIcon,
    Warning as WarningIcon,
    Route as RouteIcon,
} from '@mui/icons-material';

// Premium color palette
const STATUS_CONFIG = {
    BACKLOG: { label: 'قائمة الانتظار', color: '#6B7280', bgColor: 'rgba(107, 114, 128, 0.1)' },
    TODO: { label: 'للعمل', color: '#3B82F6', bgColor: 'rgba(59, 130, 246, 0.1)' },
    IN_PROGRESS: { label: 'جاري العمل', color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.1)' },
    PENDING_REVIEW: { label: 'في انتظار المراجعة', color: '#EC4899', bgColor: 'rgba(236, 72, 153, 0.1)' },
    IN_REVIEW: { label: 'قيد المراجعة', color: '#8B5CF6', bgColor: 'rgba(139, 92, 246, 0.1)' },
    APPROVED: { label: 'معتمد', color: '#059669', bgColor: 'rgba(5, 150, 105, 0.1)' },
    REJECTED: { label: 'مرفوض', color: '#DC2626', bgColor: 'rgba(220, 38, 38, 0.1)' },
    BLOCKED: { label: 'محظور', color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.1)' },
    COMPLETED: { label: 'مكتمل', color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.1)' },
    CANCELLED: { label: 'ملغي', color: '#9CA3AF', bgColor: 'rgba(156, 163, 175, 0.1)' },
};

const PRIORITY_CONFIG = {
    URGENT: { label: 'عاجل', color: '#DC2626', icon: '🔥' },
    HIGH: { label: 'عالي', color: '#F59E0B', icon: '⚡' },
    MEDIUM: { label: 'متوسط', color: '#3B82F6', icon: '📌' },
    LOW: { label: 'منخفض', color: '#6B7280', icon: '💤' },
};

// Task Card Component
const TaskCard: React.FC<{ task: Task; onDragStart: (e: React.DragEvent, task: Task) => void; onClick: (task: Task) => void }> = ({
    task,
    onDragStart,
    onClick,
}) => {
    const theme = useTheme();
    const priorityConfig = PRIORITY_CONFIG[task.priority];
    const completedItems = task.checklists?.flatMap(c => c.items).filter(i => i.isCompleted).length || 0;
    const totalItems = task.checklists?.flatMap(c => c.items).length || 0;
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED';
    const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    return (
        <Paper
            draggable
            onDragStart={(e) => onDragStart(e, task)}
            onClick={() => onClick(task)}
            elevation={0}
            sx={{
                p: 2,
                mb: 1.5,
                borderRadius: 3,
                cursor: 'pointer',
                border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
                background: `linear-gradient(165deg, ${alpha('#ffffff', 0.98)} 0%, ${alpha('#f1f5f9', 0.95)} 100%)`,
                backdropFilter: 'blur(12px)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 5,
                    background: `linear-gradient(180deg, ${priorityConfig.color} 0%, ${alpha(priorityConfig.color, 0.6)} 100%)`,
                    borderRadius: '12px 0 0 12px',
                },
                '&::after': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '100%',
                    background: `linear-gradient(135deg, ${alpha(priorityConfig.color, 0.03)} 0%, transparent 50%)`,
                    pointerEvents: 'none',
                },
                '&:hover': {
                    transform: 'translateY(-4px) scale(1.01)',
                    boxShadow: `0 16px 40px ${alpha(priorityConfig.color, 0.2)}, 0 4px 12px ${alpha('#000', 0.08)}`,
                    borderColor: alpha(priorityConfig.color, 0.3),
                },
                '&:active': { cursor: 'grabbing', transform: 'scale(0.98)' },
            }}
        >
            {/* Header: Priority & Category */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, pl: 1 }}>
                <Chip
                    size="small"
                    label={`${priorityConfig.icon} ${priorityConfig.label}`}
                    sx={{
                        bgcolor: alpha(priorityConfig.color, 0.12),
                        color: priorityConfig.color,
                        fontWeight: 700,
                        fontSize: '0.7rem',
                        borderRadius: 2,
                        border: `1px solid ${alpha(priorityConfig.color, 0.2)}`,
                    }}
                />
                <Stack direction="row" spacing={0.5} alignItems="center">
                    {task.category && (
                        <Chip
                            size="small"
                            label={task.category.name}
                            sx={{
                                bgcolor: alpha(task.category.color, 0.12),
                                color: task.category.color,
                                fontSize: '0.65rem',
                                borderRadius: 2,
                            }}
                        />
                    )}
                    {(task._count?.attachments ?? 0) > 0 && (
                        <Tooltip title="المرفقات">
                            <Chip
                                icon={<AttachIcon sx={{ fontSize: 12 }} />}
                                size="small"
                                label={task._count?.attachments}
                                sx={{ height: 20, fontSize: '0.65rem', borderRadius: 2 }}
                            />
                        </Tooltip>
                    )}
                </Stack>
            </Box>

            {/* Tags */}
            {task.tags && task.tags.length > 0 && (
                <Stack direction="row" spacing={0.5} sx={{ mb: 1, pl: 1, flexWrap: 'wrap', gap: 0.5 }}>
                    {task.tags.slice(0, 3).map((tag) => (
                        <Chip
                            key={tag}
                            label={tag}
                            size="small"
                            sx={{ height: 18, fontSize: '0.6rem', bgcolor: alpha('#6B7280', 0.1), borderRadius: 1 }}
                        />
                    ))}
                    {task.tags.length > 3 && (
                        <Chip label={`+${task.tags.length - 3}`} size="small" sx={{ height: 18, fontSize: '0.6rem', borderRadius: 1 }} />
                    )}
                </Stack>
            )}

            {/* Title */}
            <Typography
                variant="subtitle2"
                sx={{
                    fontWeight: 700,
                    mb: 0.5,
                    pl: 1,
                    color: theme.palette.text.primary,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    lineHeight: 1.4,
                }}
            >
                {task.title}
            </Typography>

            {/* Description Preview */}
            {task.description && (
                <Typography
                    variant="caption"
                    sx={{
                        display: 'block',
                        mb: 1.5,
                        pl: 1,
                        color: 'text.secondary',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '100%',
                    }}
                >
                    {task.description.slice(0, 60)}{task.description.length > 60 ? '...' : ''}
                </Typography>
            )}

            {/* Progress Bar (if checklist exists) */}
            {totalItems > 0 && (
                <Box sx={{ mb: 1.5, pl: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                            {completedItems} / {totalItems} مكتمل
                        </Typography>
                        <Typography variant="caption" fontWeight={700} color={task.progress === 100 ? 'success.main' : 'text.secondary'}>
                            {task.progress}%
                        </Typography>
                    </Box>
                    <LinearProgress
                        variant="determinate"
                        value={task.progress}
                        color={task.progress === 100 ? 'success' : 'primary'}
                        sx={{
                            height: 6,
                            borderRadius: 3,
                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                            '& .MuiLinearProgress-bar': {
                                borderRadius: 3,
                            },
                        }}
                    />
                </Box>
            )}

            {/* Footer: Due Date, Assignee, Comments */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pl: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                    {task.dueDate && (
                        <Tooltip title="تاريخ الاستحقاق">
                            <Chip
                                icon={<TimeIcon sx={{ fontSize: 14 }} />}
                                size="small"
                                label={new Date(task.dueDate).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' })}
                                sx={{
                                    height: 22,
                                    fontSize: '0.65rem',
                                    bgcolor: isOverdue ? alpha('#EF4444', 0.15) : alpha('#6B7280', 0.1),
                                    color: isOverdue ? '#EF4444' : '#6B7280',
                                    fontWeight: isOverdue ? 700 : 500,
                                }}
                            />
                        </Tooltip>
                    )}
                    {(task._count?.comments ?? 0) > 0 && (
                        <Tooltip title="التعليقات">
                            <Stack direction="row" spacing={0.3} alignItems="center">
                                <CommentIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                                <Typography variant="caption" color="text.secondary">
                                    {task._count?.comments}
                                </Typography>
                            </Stack>
                        </Tooltip>
                    )}
                </Stack>

                {task.assignee && (
                    <Tooltip title={`${task.assignee.firstName} ${task.assignee.lastName}`}>
                        <Avatar
                            src={task.assignee.avatar}
                            sx={{
                                width: 30,
                                height: 30,
                                border: `2px solid ${theme.palette.background.paper}`,
                                boxShadow: `0 2px 8px ${alpha('#000', 0.15)}`,
                                fontSize: '0.75rem',
                            }}
                        >
                            {task.assignee.firstName?.[0]}
                        </Avatar>
                    </Tooltip>
                )}
            </Box>
        </Paper>
    );
};

// Kanban Column Component
const KanbanColumn: React.FC<{
    status: keyof typeof STATUS_CONFIG;
    tasks: Task[];
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent, status: string) => void;
    onDragStart: (e: React.DragEvent, task: Task) => void;
    onTaskClick: (task: Task) => void;
    onQuickAdd: (status: string) => void;
}> = ({ status, tasks, onDragOver, onDrop, onDragStart, onTaskClick, onQuickAdd }) => {
    const config = STATUS_CONFIG[status];
    const theme = useTheme();

    return (
        <Box
            onDragOver={onDragOver}
            onDrop={(e) => onDrop(e, status)}
            sx={{
                minWidth: 300,
                maxWidth: 320,
                flex: '0 0 auto',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
            }}
        >
            {/* Column Header */}
            <Box
                sx={{
                    p: 2,
                    mb: 1,
                    borderRadius: 2,
                    background: `linear-gradient(135deg, ${alpha(config.color, 0.15)} 0%, ${alpha(config.color, 0.05)} 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    border: `1px solid ${alpha(config.color, 0.2)}`,
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box
                        sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            bgcolor: config.color,
                            boxShadow: `0 0 8px ${alpha(config.color, 0.5)}`,
                        }}
                    />
                    <Typography variant="subtitle1" fontWeight={700} color={config.color}>
                        {config.label}
                    </Typography>
                </Box>
                <Stack direction="row" spacing={0.5} alignItems="center">
                    <Chip
                        label={tasks.length}
                        size="small"
                        sx={{
                            bgcolor: alpha(config.color, 0.2),
                            color: config.color,
                            fontWeight: 700,
                            minWidth: 28,
                        }}
                    />
                    <Tooltip title="إضافة مهمة سريعة">
                        <IconButton size="small" onClick={() => onQuickAdd(status)} sx={{ color: config.color }}>
                            <AddIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Stack>
            </Box>

            {/* Tasks Container */}
            <Box
                sx={{
                    flex: 1,
                    overflowY: 'auto',
                    p: 1,
                    borderRadius: 2,
                    bgcolor: alpha(config.color, 0.02),
                    minHeight: 200,
                    '&::-webkit-scrollbar': { width: 6 },
                    '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
                    '&::-webkit-scrollbar-thumb': { bgcolor: alpha(config.color, 0.2), borderRadius: 3 },
                }}
            >
                {tasks.map((task) => (
                    <TaskCard key={task.id} task={task} onDragStart={onDragStart} onClick={onTaskClick} />
                ))}
                {tasks.length === 0 && (
                    <Box
                        sx={{
                            p: 3,
                            textAlign: 'center',
                            color: 'text.secondary',
                            border: `2px dashed ${alpha(config.color, 0.2)}`,
                            borderRadius: 2,
                        }}
                    >
                        <FolderIcon sx={{ fontSize: 32, opacity: 0.3, mb: 1 }} />
                        <Typography variant="body2">لا توجد مهام</Typography>
                    </Box>
                )}
            </Box>
        </Box>
    );
};

// Stats Card Component
const StatsCard: React.FC<{ title: string; value: number; color: string; icon: React.ReactNode; trend?: number }> = ({
    title, value, color, icon, trend
}) => {
    const theme = useTheme();
    return (
        <Card
            sx={{
                background: `linear-gradient(145deg, ${alpha(color, 0.08)} 0%, ${alpha(color, 0.02)} 100%)`,
                border: `1px solid ${alpha(color, 0.15)}`,
                borderRadius: 3,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden',
                '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: `0 12px 28px ${alpha(color, 0.2)}`,
                    borderColor: alpha(color, 0.3),
                },
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: -50,
                    right: -50,
                    width: 100,
                    height: 100,
                    borderRadius: '50%',
                    background: alpha(color, 0.08),
                },
            }}
        >
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ letterSpacing: 0.5 }}>
                            {title}
                        </Typography>
                        <Typography variant="h3" fontWeight={800} sx={{ color, mt: 0.5 }}>
                            {value}
                        </Typography>
                    </Box>
                    <Box
                        sx={{
                            width: 52,
                            height: 52,
                            borderRadius: 3,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: alpha(color, 0.12),
                            color: color,
                            transition: 'all 0.3s ease',
                            '&:hover': { transform: 'rotate(15deg) scale(1.1)' },
                        }}
                    >
                        {icon}
                    </Box>
                </Box>
            </CardContent>
        </Card>
    );
};

// List View Component
const ListView: React.FC<{ tasks: Task[]; onTaskClick: (task: Task) => void }> = ({ tasks, onTaskClick }) => {
    const theme = useTheme();
    const [orderBy, setOrderBy] = useState<'title' | 'status' | 'priority' | 'dueDate'>('dueDate');
    const [order, setOrder] = useState<'asc' | 'desc'>('asc');

    const sortedTasks = useMemo(() => {
        return [...tasks].sort((a, b) => {
            let comparison = 0;
            if (orderBy === 'title') {
                comparison = a.title.localeCompare(b.title, 'ar');
            } else if (orderBy === 'status') {
                comparison = a.status.localeCompare(b.status);
            } else if (orderBy === 'priority') {
                const priorityOrder = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
                comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
            } else if (orderBy === 'dueDate') {
                comparison = (new Date(a.dueDate || 0).getTime()) - (new Date(b.dueDate || 0).getTime());
            }
            return order === 'asc' ? comparison : -comparison;
        });
    }, [tasks, orderBy, order]);

    const handleSort = (property: typeof orderBy) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };

    return (
        <TableContainer component={Paper} sx={{ borderRadius: 2, border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
            <Table>
                <TableHead>
                    <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.03) }}>
                        <TableCell>
                            <TableSortLabel active={orderBy === 'title'} direction={orderBy === 'title' ? order : 'asc'} onClick={() => handleSort('title')}>
                                العنوان
                            </TableSortLabel>
                        </TableCell>
                        <TableCell>
                            <TableSortLabel active={orderBy === 'status'} direction={orderBy === 'status' ? order : 'asc'} onClick={() => handleSort('status')}>
                                الحالة
                            </TableSortLabel>
                        </TableCell>
                        <TableCell>
                            <TableSortLabel active={orderBy === 'priority'} direction={orderBy === 'priority' ? order : 'asc'} onClick={() => handleSort('priority')}>
                                الأولوية
                            </TableSortLabel>
                        </TableCell>
                        <TableCell>المسؤول</TableCell>
                        <TableCell>
                            <TableSortLabel active={orderBy === 'dueDate'} direction={orderBy === 'dueDate' ? order : 'asc'} onClick={() => handleSort('dueDate')}>
                                تاريخ الاستحقاق
                            </TableSortLabel>
                        </TableCell>
                        <TableCell>التقدم</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {sortedTasks.map((task) => {
                        const statusConfig = STATUS_CONFIG[task.status];
                        const priorityConfig = PRIORITY_CONFIG[task.priority];
                        const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED';

                        return (
                            <TableRow
                                key={task.id}
                                hover
                                onClick={() => onTaskClick(task)}
                                sx={{ cursor: 'pointer', '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.03) } }}
                            >
                                <TableCell>
                                    <Typography variant="subtitle2" fontWeight={600}>{task.title}</Typography>
                                    {task.category && (
                                        <Chip size="small" label={task.category.name} sx={{ mt: 0.5, height: 20, fontSize: '0.65rem', bgcolor: alpha(task.category.color, 0.1), color: task.category.color }} />
                                    )}
                                </TableCell>
                                <TableCell>
                                    <Chip size="small" label={statusConfig.label} sx={{ bgcolor: alpha(statusConfig.color, 0.15), color: statusConfig.color, fontWeight: 600 }} />
                                </TableCell>
                                <TableCell>
                                    <Chip size="small" label={`${priorityConfig.icon} ${priorityConfig.label}`} sx={{ bgcolor: alpha(priorityConfig.color, 0.12), color: priorityConfig.color, fontWeight: 600 }} />
                                </TableCell>
                                <TableCell>
                                    {task.assignee ? (
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <Avatar sx={{ width: 28, height: 28, fontSize: '0.75rem' }}>{task.assignee.firstName?.[0]}</Avatar>
                                            <Typography variant="body2">{task.assignee.firstName} {task.assignee.lastName}</Typography>
                                        </Stack>
                                    ) : (
                                        <Typography variant="body2" color="text.secondary">غير معين</Typography>
                                    )}
                                </TableCell>
                                <TableCell>
                                    {task.dueDate ? (
                                        <Chip
                                            size="small"
                                            label={new Date(task.dueDate).toLocaleDateString('ar-SA')}
                                            sx={{ bgcolor: isOverdue ? alpha('#EF4444', 0.15) : alpha('#6B7280', 0.1), color: isOverdue ? '#EF4444' : 'text.secondary', fontWeight: isOverdue ? 700 : 400 }}
                                        />
                                    ) : '-'}
                                </TableCell>
                                <TableCell sx={{ minWidth: 120 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <LinearProgress variant="determinate" value={task.progress} sx={{ flex: 1, height: 6, borderRadius: 3 }} color={task.progress === 100 ? 'success' : 'primary'} />
                                        <Typography variant="caption" fontWeight={600}>{task.progress}%</Typography>
                                    </Box>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

// Sprint Card Component
const SprintCard: React.FC<{
    sprint: Sprint;
    onStart: () => void;
    onComplete: () => void;
    onClick: () => void;
}> = ({ sprint, onStart, onComplete, onClick }) => {
    const theme = useTheme();
    const statusColors = {
        PLANNING: { color: '#6B7280', label: 'التخطيط' },
        ACTIVE: { color: '#F59E0B', label: 'نشط' },
        COMPLETED: { color: '#10B981', label: 'مكتمل' },
    };
    const config = statusColors[sprint.status];

    return (
        <Card
            onClick={onClick}
            sx={{
                cursor: 'pointer',
                border: `1px solid ${alpha(config.color, 0.3)}`,
                borderRadius: 3,
                transition: 'all 0.3s ease',
                '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: `0 12px 28px ${alpha(config.color, 0.2)}`,
                },
            }}
        >
            <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box>
                        <Typography variant="h6" fontWeight={700}>{sprint.name}</Typography>
                        {sprint.goal && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                {sprint.goal}
                            </Typography>
                        )}
                    </Box>
                    <Chip
                        label={config.label}
                        size="small"
                        sx={{ bgcolor: alpha(config.color, 0.15), color: config.color, fontWeight: 600 }}
                    />
                </Box>

                <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                    {sprint.startDate && (
                        <Typography variant="caption" color="text.secondary">
                            البداية: {new Date(sprint.startDate).toLocaleDateString('ar-SA')}
                        </Typography>
                    )}
                    {sprint.endDate && (
                        <Typography variant="caption" color="text.secondary">
                            النهاية: {new Date(sprint.endDate).toLocaleDateString('ar-SA')}
                        </Typography>
                    )}
                </Stack>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Stack direction="row" spacing={1}>
                        <Chip
                            icon={<FlagIcon sx={{ fontSize: 14 }} />}
                            label={`${sprint._count?.tasks || 0} مهمة`}
                            size="small"
                            sx={{ bgcolor: alpha('#3B82F6', 0.1), color: '#3B82F6' }}
                        />
                        {sprint.velocity && (
                            <Chip
                                icon={<SpeedIcon sx={{ fontSize: 14 }} />}
                                label={`السرعة: ${sprint.velocity}`}
                                size="small"
                                sx={{ bgcolor: alpha('#8B5CF6', 0.1), color: '#8B5CF6' }}
                            />
                        )}
                    </Stack>

                    {sprint.status === 'PLANNING' && (
                        <Button
                            size="small"
                            variant="contained"
                            color="warning"
                            startIcon={<PlayIcon />}
                            onClick={(e) => { e.stopPropagation(); onStart(); }}
                        >
                            بدء السبرنت
                        </Button>
                    )}
                    {sprint.status === 'ACTIVE' && (
                        <Button
                            size="small"
                            variant="contained"
                            color="success"
                            startIcon={<CheckIcon />}
                            onClick={(e) => { e.stopPropagation(); onComplete(); }}
                        >
                            إنهاء السبرنت
                        </Button>
                    )}
                </Box>
            </CardContent>
        </Card>
    );
};

// Sprints View Component
const SprintsView: React.FC = () => {
    const theme = useTheme();
    const queryClient = useQueryClient();
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [newSprint, setNewSprint] = useState({ name: '', goal: '', startDate: '', endDate: '' });

    const { data: sprints, isLoading } = useQuery({
        queryKey: ['sprints'],
        queryFn: () => enterpriseTasksApi.getSprints(),
    });

    const { data: velocity } = useQuery({
        queryKey: ['velocity'],
        queryFn: () => enterpriseTasksApi.getVelocity(),
    });

    const createSprint = useMutation({
        mutationFn: (data: typeof newSprint) => enterpriseTasksApi.createSprint(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sprints'] });
            setCreateDialogOpen(false);
            setNewSprint({ name: '', goal: '', startDate: '', endDate: '' });
        },
    });

    const startSprint = useMutation({
        mutationFn: (id: string) => enterpriseTasksApi.startSprint(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sprints'] }),
    });

    const completeSprint = useMutation({
        mutationFn: (id: string) => enterpriseTasksApi.completeSprint(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sprints'] }),
    });

    if (isLoading) {
        return (
            <Grid container spacing={2}>
                {[1, 2, 3].map((i) => (
                    <Grid item xs={12} md={4} key={i}>
                        <Skeleton variant="rounded" height={200} />
                    </Grid>
                ))}
            </Grid>
        );
    }

    const sprintsList = sprints?.data || sprints || [];

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h5" fontWeight={700}>إدارة السبرنت</Typography>
                    <Typography variant="body2" color="text.secondary">
                        تتبع التقدم وإدارة دورات العمل
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setCreateDialogOpen(true)}
                >
                    سبرنت جديد
                </Button>
            </Box>

            {/* Velocity Stats */}
            {velocity && (
                <Paper sx={{ p: 2, mb: 3, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                    <Stack direction="row" spacing={4} alignItems="center">
                        <Box>
                            <Typography variant="caption" color="text.secondary">متوسط السرعة</Typography>
                            <Typography variant="h4" fontWeight={800} color="primary.main">
                                {(velocity as any)?.averageVelocity || 0}
                            </Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary">آخر سبرنت</Typography>
                            <Typography variant="h4" fontWeight={800} color="success.main">
                                {(velocity as any)?.lastSprintVelocity || 0}
                            </Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary">نقاط القصة المكتملة</Typography>
                            <Typography variant="h4" fontWeight={800} color="info.main">
                                {(velocity as any)?.totalCompleted || 0}
                            </Typography>
                        </Box>
                    </Stack>
                </Paper>
            )}

            {/* Sprints Grid */}
            <Grid container spacing={2}>
                {sprintsList.map((sprint: Sprint) => (
                    <Grid item xs={12} md={4} key={sprint.id}>
                        <SprintCard
                            sprint={sprint}
                            onStart={() => startSprint.mutate(sprint.id)}
                            onComplete={() => completeSprint.mutate(sprint.id)}
                            onClick={() => { }}
                        />
                    </Grid>
                ))}
                {sprintsList.length === 0 && (
                    <Grid item xs={12}>
                        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
                            <SpeedIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                            <Typography variant="h6" color="text.secondary">لا توجد سبرنتات</Typography>
                            <Typography variant="body2" color="text.disabled" sx={{ mb: 2 }}>
                                ابدأ بإنشاء سبرنت جديد لتتبع تقدم فريقك
                            </Typography>
                            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateDialogOpen(true)}>
                                إنشاء سبرنت
                            </Button>
                        </Paper>
                    </Grid>
                )}
            </Grid>

            {/* Create Sprint Dialog */}
            <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle fontWeight={700}>إنشاء سبرنت جديد</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField
                            fullWidth
                            label="اسم السبرنت"
                            value={newSprint.name}
                            onChange={(e) => setNewSprint({ ...newSprint, name: e.target.value })}
                            required
                        />
                        <TextField
                            fullWidth
                            label="الهدف"
                            multiline
                            rows={2}
                            value={newSprint.goal}
                            onChange={(e) => setNewSprint({ ...newSprint, goal: e.target.value })}
                        />
                        <Stack direction="row" spacing={2}>
                            <TextField
                                fullWidth
                                type="date"
                                label="تاريخ البداية"
                                InputLabelProps={{ shrink: true }}
                                value={newSprint.startDate}
                                onChange={(e) => setNewSprint({ ...newSprint, startDate: e.target.value })}
                            />
                            <TextField
                                fullWidth
                                type="date"
                                label="تاريخ النهاية"
                                InputLabelProps={{ shrink: true }}
                                value={newSprint.endDate}
                                onChange={(e) => setNewSprint({ ...newSprint, endDate: e.target.value })}
                            />
                        </Stack>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setCreateDialogOpen(false)}>إلغاء</Button>
                    <Button
                        variant="contained"
                        onClick={() => createSprint.mutate(newSprint)}
                        disabled={!newSprint.name.trim() || createSprint.isPending}
                    >
                        إنشاء
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

// Team Workload View Component (Updated to use Batch 1 API)
const TeamWorkloadView: React.FC = () => {
    const theme = useTheme();

    const { data: workload, isLoading } = useQuery({
        queryKey: ['workload-analysis'],
        queryFn: () => enterpriseTasksApi.getWorkloadAnalysis(),
    });

    if (isLoading) {
        return (
            <Grid container spacing={2}>
                {[1, 2, 3, 4].map((i) => (
                    <Grid item xs={12} md={6} lg={3} key={i}>
                        <Skeleton variant="rounded" height={180} />
                    </Grid>
                ))}
            </Grid>
        );
    }

    const result = workload?.data || workload;
    const employees = result?.employees || [];
    const summary = result?.summary || {};

    const loadColors: Record<string, string> = {
        OVERLOADED: '#EF4444',
        HIGH: '#F97316',
        NORMAL: '#10B981',
        LOW: '#6B7280',
    };

    const getLoadLabel = (level: string) => {
        const labels: Record<string, string> = {
            OVERLOADED: 'عبء زائد',
            HIGH: 'عالي',
            NORMAL: 'متوازن',
            LOW: 'منخفض',
        };
        return labels[level] || level;
    };

    return (
        <Box>
            <Box sx={{ mb: 3 }}>
                <Typography variant="h5" fontWeight={700}>عبء العمل للفريق</Typography>
                <Typography variant="body2" color="text.secondary">
                    مراقبة توزيع المهام وأعباء العمل للموظفين
                </Typography>
            </Box>

            {/* Summary Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} md={3}>
                    <Card sx={{ bgcolor: alpha('#3B82F6', 0.08), borderRadius: 3 }}>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <TeamIcon sx={{ fontSize: 32, color: '#3B82F6' }} />
                            <Typography variant="h4" fontWeight={800} color="#3B82F6">{summary.totalEmployees || 0}</Typography>
                            <Typography variant="caption">إجمالي الموظفين</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} md={3}>
                    <Card sx={{ bgcolor: alpha('#EF4444', 0.08), borderRadius: 3 }}>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <WarningIcon sx={{ fontSize: 32, color: '#EF4444' }} />
                            <Typography variant="h4" fontWeight={800} color="#EF4444">{summary.overloaded || 0}</Typography>
                            <Typography variant="caption">عبء زائد</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} md={3}>
                    <Card sx={{ bgcolor: alpha('#10B981', 0.08), borderRadius: 3 }}>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <CheckIcon sx={{ fontSize: 32, color: '#10B981' }} />
                            <Typography variant="h4" fontWeight={800} color="#10B981">{summary.balanced || 0}</Typography>
                            <Typography variant="caption">متوازن</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} md={3}>
                    <Card sx={{ bgcolor: alpha('#8B5CF6', 0.08), borderRadius: 3 }}>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <SpeedIcon sx={{ fontSize: 32, color: '#8B5CF6' }} />
                            <Typography variant="h4" fontWeight={800} color="#8B5CF6">{summary.averageLoad?.toFixed(1) || 0}</Typography>
                            <Typography variant="caption">متوسط المهام</Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Employee Cards */}
            <Grid container spacing={2}>
                {employees.map((member: any) => (
                    <Grid item xs={12} md={6} lg={3} key={member.employee?.id}>
                        <Card sx={{
                            borderRadius: 3,
                            border: `1px solid ${alpha(loadColors[member.loadLevel] || '#6B7280', 0.3)}`,
                            transition: 'all 0.3s ease',
                            '&:hover': {
                                transform: 'translateY(-4px)',
                                boxShadow: `0 12px 28px ${alpha(loadColors[member.loadLevel] || '#6B7280', 0.2)}`,
                            },
                        }}>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                    <Avatar
                                        src={member.employee?.avatar}
                                        sx={{ width: 48, height: 48, bgcolor: loadColors[member.loadLevel] || '#6B7280' }}
                                    >
                                        {member.employee?.name?.[0]}
                                    </Avatar>
                                    <Box>
                                        <Typography variant="subtitle1" fontWeight={700}>
                                            {member.employee?.name}
                                        </Typography>
                                        <Chip
                                            size="small"
                                            label={getLoadLabel(member.loadLevel)}
                                            sx={{
                                                bgcolor: alpha(loadColors[member.loadLevel] || '#6B7280', 0.15),
                                                color: loadColors[member.loadLevel] || '#6B7280',
                                                fontWeight: 600,
                                            }}
                                        />
                                    </Box>
                                </Box>

                                <Grid container spacing={1}>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="text.secondary">المهام</Typography>
                                        <Typography variant="h6" fontWeight={700}>{member.taskCount || 0}</Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="text.secondary">النقاط</Typography>
                                        <Typography variant="h6" fontWeight={700}>{member.totalPoints || 0}</Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="text.secondary">متأخرة</Typography>
                                        <Typography variant="h6" fontWeight={700} color="error.main">
                                            {member.overdueTasks || 0}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="text.secondary">عاجلة</Typography>
                                        <Typography variant="h6" fontWeight={700} color="warning.main">
                                            {member.urgentTasks || 0}
                                        </Typography>
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
                {employees.length === 0 && (
                    <Grid item xs={12}>
                        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
                            <TeamIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                            <Typography variant="h6" color="text.secondary">لا توجد بيانات عبء العمل</Typography>
                            <Typography variant="body2" color="text.disabled">
                                سيتم عرض البيانات عند وجود مهام مسندة للموظفين
                            </Typography>
                        </Paper>
                    </Grid>
                )}
            </Grid>
        </Box>
    );
};

// Analytics View Component
const AnalyticsView: React.FC = () => {
    const theme = useTheme();

    const { data: metrics } = useQuery({
        queryKey: ['task-metrics'],
        queryFn: () => tasksApi.getProductivityMetrics(),
    });

    const { data: teamPerf } = useQuery({
        queryKey: ['team-performance'],
        queryFn: () => tasksApi.getTeamPerformance(),
    });

    const { data: trends } = useQuery({
        queryKey: ['task-trends'],
        queryFn: () => tasksApi.getTaskTrends(30),
    });

    const metricsData = metrics?.data || metrics || {};
    const teamData = (teamPerf?.data || teamPerf || []) as any[];
    const trendsData = trends?.data || trends || {};

    return (
        <Box>
            <Box sx={{ mb: 3 }}>
                <Typography variant="h5" fontWeight={700}>تحليلات المهام</Typography>
                <Typography variant="body2" color="text.secondary">
                    إحصائيات وتحليلات متقدمة لأداء المهام
                </Typography>
            </Box>

            {/* Key Metrics */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} md={3}>
                    <Card sx={{ bgcolor: alpha('#3B82F6', 0.08), borderRadius: 3 }}>
                        <CardContent>
                            <Typography variant="caption" color="text.secondary">معدل الإنجاز</Typography>
                            <Typography variant="h3" fontWeight={800} color="#3B82F6">
                                {(metricsData as any)?.completionRate || 0}%
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} md={3}>
                    <Card sx={{ bgcolor: alpha('#10B981', 0.08), borderRadius: 3 }}>
                        <CardContent>
                            <Typography variant="caption" color="text.secondary">متوسط وقت الإنجاز</Typography>
                            <Typography variant="h3" fontWeight={800} color="#10B981">
                                {(metricsData as any)?.avgCompletionTime || 0}
                                <Typography component="span" variant="body2" color="text.secondary"> يوم</Typography>
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} md={3}>
                    <Card sx={{ bgcolor: alpha('#F59E0B', 0.08), borderRadius: 3 }}>
                        <CardContent>
                            <Typography variant="caption" color="text.secondary">المهام المكتملة هذا الشهر</Typography>
                            <Typography variant="h3" fontWeight={800} color="#F59E0B">
                                {(metricsData as any)?.completedThisMonth || 0}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} md={3}>
                    <Card sx={{ bgcolor: alpha('#EF4444', 0.08), borderRadius: 3 }}>
                        <CardContent>
                            <Typography variant="caption" color="text.secondary">معدل التأخير</Typography>
                            <Typography variant="h3" fontWeight={800} color="#EF4444">
                                {(metricsData as any)?.overdueRate || 0}%
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Team Performance Table */}
            <Paper sx={{ p: 2, borderRadius: 3, mb: 3 }}>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>أداء الفريق</Typography>
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>الموظف</TableCell>
                                <TableCell align="center">المهام المكتملة</TableCell>
                                <TableCell align="center">معدل الإنجاز</TableCell>
                                <TableCell align="center">متوسط الوقت</TableCell>
                                <TableCell align="center">نقاط القصة</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {teamData.slice(0, 10).map((member: any) => (
                                <TableRow key={member.userId}>
                                    <TableCell>
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <Avatar sx={{ width: 28, height: 28 }}>{member.user?.firstName?.[0]}</Avatar>
                                            <Typography variant="body2">
                                                {member.user?.firstName} {member.user?.lastName}
                                            </Typography>
                                        </Stack>
                                    </TableCell>
                                    <TableCell align="center">
                                        <Chip size="small" label={member.completedTasks || 0} color="success" />
                                    </TableCell>
                                    <TableCell align="center">{member.completionRate || 0}%</TableCell>
                                    <TableCell align="center">{member.avgTime || 0} يوم</TableCell>
                                    <TableCell align="center">{member.storyPoints || 0}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* Trends */}
            <Paper sx={{ p: 2, borderRadius: 3 }}>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>الاتجاهات (آخر 30 يوم)</Typography>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                        <Box sx={{ textAlign: 'center', p: 2 }}>
                            <TrendingUpIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                            <Typography variant="h4" fontWeight={700} color="success.main">
                                {(trendsData as any)?.tasksCreated || 0}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">مهام جديدة</Typography>
                        </Box>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Box sx={{ textAlign: 'center', p: 2 }}>
                            <CheckIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                            <Typography variant="h4" fontWeight={700} color="primary.main">
                                {(trendsData as any)?.tasksCompleted || 0}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">مهام مكتملة</Typography>
                        </Box>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Box sx={{ textAlign: 'center', p: 2 }}>
                            <TimeIcon sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                            <Typography variant="h4" fontWeight={700} color="warning.main">
                                {(trendsData as any)?.avgDaysToComplete || 0}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">متوسط أيام الإنجاز</Typography>
                        </Box>
                    </Grid>
                </Grid>
            </Paper>
        </Box>
    );
};

// Active Timer Widget
const ActiveTimerWidget: React.FC = () => {
    const theme = useTheme();
    const queryClient = useQueryClient();
    const [elapsed, setElapsed] = useState(0);

    const { data: activeTimers } = useQuery({
        queryKey: ['active-timers'],
        queryFn: () => enterpriseTasksApi.getActiveTimers(),
        refetchInterval: 30000,
    });

    const stopTimer = useMutation({
        mutationFn: ({ timeLogId, description }: { timeLogId: string; description?: string }) =>
            enterpriseTasksApi.stopTimer(timeLogId, description),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['active-timers'] }),
    });

    const timers = (activeTimers?.data || activeTimers || []) as any[];

    useEffect(() => {
        if (timers.length > 0) {
            const interval = setInterval(() => {
                setElapsed((prev) => prev + 1);
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [timers.length]);

    if (timers.length === 0) return null;

    const formatTime = (seconds: number) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <Paper
            sx={{
                position: 'fixed',
                bottom: 24,
                left: 24,
                p: 2,
                borderRadius: 3,
                bgcolor: alpha(theme.palette.error.main, 0.95),
                color: 'white',
                zIndex: 1000,
                minWidth: 280,
                boxShadow: `0 8px 32px ${alpha(theme.palette.error.main, 0.4)}`,
            }}
        >
            {timers.map((timer: any) => {
                const startTime = new Date(timer.startTime).getTime();
                const currentElapsed = Math.floor((Date.now() - startTime) / 1000);

                return (
                    <Box key={timer.id}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                            <TimerIcon sx={{ animation: 'pulse 1s infinite' }} />
                            <Typography variant="subtitle2" fontWeight={600}>
                                مؤقت نشط
                            </Typography>
                        </Stack>
                        <Typography variant="caption" sx={{ opacity: 0.9, display: 'block', mb: 1 }}>
                            {timer.task?.title}
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="h4" fontWeight={800} sx={{ fontFamily: 'monospace' }}>
                                {formatTime(currentElapsed)}
                            </Typography>
                            <IconButton
                                size="small"
                                onClick={() => stopTimer.mutate({ timeLogId: timer.id })}
                                sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                            >
                                <StopIcon />
                            </IconButton>
                        </Box>
                    </Box>
                );
            })}
        </Paper>
    );
};

// Safe Sprints View with Error Handling
const SprintsViewSafe: React.FC = () => {
    const theme = useTheme();
    const queryClient = useQueryClient();
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [newSprint, setNewSprint] = useState({ name: '', goal: '', startDate: '', endDate: '' });

    const { data: sprints, isLoading, error } = useQuery({
        queryKey: ['sprints'],
        queryFn: async () => {
            try {
                const res = await enterpriseTasksApi.getSprints();
                return res?.data || res || [];
            } catch {
                return [];
            }
        },
    });

    const createSprint = useMutation({
        mutationFn: (data: typeof newSprint) => enterpriseTasksApi.createSprint(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sprints'] });
            setCreateDialogOpen(false);
            setNewSprint({ name: '', goal: '', startDate: '', endDate: '' });
        },
    });

    const startSprint = useMutation({
        mutationFn: (id: string) => enterpriseTasksApi.startSprint(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sprints'] }),
    });

    const completeSprint = useMutation({
        mutationFn: (id: string) => enterpriseTasksApi.completeSprint(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sprints'] }),
    });

    if (isLoading) {
        return (
            <Box>
                <Skeleton variant="text" width={200} height={40} sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                    {[1, 2, 3].map((i) => (
                        <Grid item xs={12} md={4} key={i}>
                            <Skeleton variant="rounded" height={180} />
                        </Grid>
                    ))}
                </Grid>
            </Box>
        );
    }

    const sprintsList = Array.isArray(sprints) ? sprints : [];

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h5" fontWeight={700}>إدارة السبرنت</Typography>
                    <Typography variant="body2" color="text.secondary">
                        تتبع التقدم وإدارة دورات العمل
                    </Typography>
                </Box>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateDialogOpen(true)}>
                    سبرنت جديد
                </Button>
            </Box>

            <Grid container spacing={2}>
                {sprintsList.map((sprint: any) => (
                    <Grid item xs={12} md={4} key={sprint.id}>
                        <Card sx={{
                            borderRadius: 3,
                            border: `1px solid ${alpha(sprint.status === 'ACTIVE' ? '#F59E0B' : sprint.status === 'COMPLETED' ? '#10B981' : '#6B7280', 0.3)}`,
                            transition: 'all 0.3s ease',
                            '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 },
                        }}>
                            <CardContent>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                    <Typography variant="h6" fontWeight={700}>{sprint.name}</Typography>
                                    <Chip
                                        size="small"
                                        label={
                                            sprint.status === 'ACTIVE' ? 'نشط' :
                                                sprint.status === 'COMPLETED' ? 'مكتمل' :
                                                    sprint.status === 'CANCELLED' ? 'ملغي' : 'التخطيط'
                                        }
                                        sx={{
                                            bgcolor: alpha(
                                                sprint.status === 'ACTIVE' ? '#F59E0B' :
                                                    sprint.status === 'COMPLETED' ? '#10B981' :
                                                        sprint.status === 'CANCELLED' ? '#EF4444' : '#6B7280',
                                                0.15
                                            ),
                                            color: sprint.status === 'ACTIVE' ? '#F59E0B' :
                                                sprint.status === 'COMPLETED' ? '#10B981' :
                                                    sprint.status === 'CANCELLED' ? '#EF4444' : '#6B7280',
                                        }}
                                    />
                                </Box>
                                {sprint.goal && <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{sprint.goal}</Typography>}

                                {/* Progress bar */}
                                {sprint.stats && (
                                    <Box sx={{ mb: 2 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                            <Typography variant="caption" color="text.secondary">
                                                التقدم
                                            </Typography>
                                            <Typography variant="caption" fontWeight={600}>
                                                {sprint.stats.progressPercent}%
                                            </Typography>
                                        </Box>
                                        <LinearProgress
                                            variant="determinate"
                                            value={sprint.stats.progressPercent}
                                            sx={{
                                                height: 8,
                                                borderRadius: 4,
                                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                                                '& .MuiLinearProgress-bar': {
                                                    borderRadius: 4,
                                                    bgcolor: sprint.status === 'ACTIVE' ? '#F59E0B' : sprint.status === 'COMPLETED' ? '#10B981' : theme.palette.primary.main,
                                                },
                                            }}
                                        />
                                    </Box>
                                )}

                                <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
                                    <Chip size="small" icon={<FlagIcon sx={{ fontSize: 14 }} />} label={`${sprint.stats?.totalTasks || sprint._count?.tasks || 0} مهمة`} />
                                    {sprint.stats?.totalPoints > 0 && (
                                        <Chip size="small" label={`${sprint.stats.completedPoints}/${sprint.stats.totalPoints} نقطة`} />
                                    )}
                                    {sprint.velocity && (
                                        <Chip size="small" color="info" label={`السرعة: ${sprint.velocity}`} />
                                    )}
                                </Stack>
                                {sprint.status === 'PLANNING' && (
                                    <Button size="small" variant="contained" color="warning" fullWidth onClick={() => startSprint.mutate(sprint.id)}>
                                        بدء السبرنت
                                    </Button>
                                )}
                                {sprint.status === 'ACTIVE' && (
                                    <Button size="small" variant="contained" color="success" fullWidth onClick={() => completeSprint.mutate(sprint.id)}>
                                        إنهاء السبرنت
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
                {sprintsList.length === 0 && (
                    <Grid item xs={12}>
                        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
                            <SpeedIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                            <Typography variant="h6" color="text.secondary">لا توجد سبرنتات</Typography>
                            <Button variant="contained" startIcon={<AddIcon />} sx={{ mt: 2 }} onClick={() => setCreateDialogOpen(true)}>
                                إنشاء سبرنت
                            </Button>
                        </Paper>
                    </Grid>
                )}
            </Grid>

            <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle fontWeight={700}>إنشاء سبرنت جديد</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField fullWidth label="اسم السبرنت" value={newSprint.name} onChange={(e) => setNewSprint({ ...newSprint, name: e.target.value })} />
                        <TextField fullWidth label="الهدف" multiline rows={2} value={newSprint.goal} onChange={(e) => setNewSprint({ ...newSprint, goal: e.target.value })} />
                        <Stack direction="row" spacing={2}>
                            <TextField fullWidth type="date" label="تاريخ البداية" InputLabelProps={{ shrink: true }} value={newSprint.startDate} onChange={(e) => setNewSprint({ ...newSprint, startDate: e.target.value })} />
                            <TextField fullWidth type="date" label="تاريخ النهاية" InputLabelProps={{ shrink: true }} value={newSprint.endDate} onChange={(e) => setNewSprint({ ...newSprint, endDate: e.target.value })} />
                        </Stack>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setCreateDialogOpen(false)}>إلغاء</Button>
                    <Button variant="contained" onClick={() => createSprint.mutate(newSprint)} disabled={!newSprint.name.trim()}>إنشاء</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

// Safe Team Workload View with Error Handling (Updated to use Batch 1 API)
const TeamWorkloadViewSafe: React.FC = () => {
    const theme = useTheme();

    const { data: workload, isLoading } = useQuery({
        queryKey: ['workload-analysis'],
        queryFn: async () => {
            try {
                const res = await enterpriseTasksApi.getWorkloadAnalysis();
                return res?.data || res || { employees: [], summary: {} };
            } catch {
                return { employees: [], summary: {} };
            }
        },
    });

    if (isLoading) {
        return (
            <Box>
                <Skeleton variant="text" width={200} height={40} sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                    {[1, 2, 3, 4].map((i) => (
                        <Grid item xs={12} md={6} lg={3} key={i}>
                            <Skeleton variant="rounded" height={180} />
                        </Grid>
                    ))}
                </Grid>
            </Box>
        );
    }

    const employees = workload?.employees || [];
    const summary = workload?.summary || {};

    const loadColors: Record<string, string> = {
        OVERLOADED: '#EF4444',
        HIGH: '#F97316',
        NORMAL: '#10B981',
        LOW: '#6B7280',
    };

    const getLoadLabel = (level: string) => {
        const labels: Record<string, string> = {
            OVERLOADED: 'عبء زائد',
            HIGH: 'عالي',
            NORMAL: 'متوازن',
            LOW: 'منخفض',
        };
        return labels[level] || level;
    };

    return (
        <Box>
            <Box sx={{ mb: 3 }}>
                <Typography variant="h5" fontWeight={700}>عبء العمل للفريق</Typography>
                <Typography variant="body2" color="text.secondary">مراقبة توزيع المهام وأعباء العمل للموظفين</Typography>
            </Box>

            {/* Summary Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} md={3}>
                    <Card sx={{ bgcolor: alpha('#3B82F6', 0.08), borderRadius: 3 }}>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <TeamIcon sx={{ fontSize: 32, color: '#3B82F6' }} />
                            <Typography variant="h4" fontWeight={800} color="#3B82F6">{summary.totalEmployees || 0}</Typography>
                            <Typography variant="caption">إجمالي الموظفين</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} md={3}>
                    <Card sx={{ bgcolor: alpha('#EF4444', 0.08), borderRadius: 3 }}>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <WarningIcon sx={{ fontSize: 32, color: '#EF4444' }} />
                            <Typography variant="h4" fontWeight={800} color="#EF4444">{summary.overloaded || 0}</Typography>
                            <Typography variant="caption">عبء زائد</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} md={3}>
                    <Card sx={{ bgcolor: alpha('#10B981', 0.08), borderRadius: 3 }}>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <CheckIcon sx={{ fontSize: 32, color: '#10B981' }} />
                            <Typography variant="h4" fontWeight={800} color="#10B981">{summary.balanced || 0}</Typography>
                            <Typography variant="caption">متوازن</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} md={3}>
                    <Card sx={{ bgcolor: alpha('#8B5CF6', 0.08), borderRadius: 3 }}>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <SpeedIcon sx={{ fontSize: 32, color: '#8B5CF6' }} />
                            <Typography variant="h4" fontWeight={800} color="#8B5CF6">{summary.averageLoad?.toFixed(1) || 0}</Typography>
                            <Typography variant="caption">متوسط المهام</Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Employee Cards */}
            <Grid container spacing={2}>
                {employees.map((member: any) => (
                    <Grid item xs={12} md={6} lg={3} key={member.employee?.id}>
                        <Card sx={{
                            borderRadius: 3,
                            border: `1px solid ${alpha(loadColors[member.loadLevel] || '#6B7280', 0.3)}`,
                            transition: 'all 0.3s ease',
                            '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 },
                        }}>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                    <Avatar sx={{ width: 48, height: 48, bgcolor: loadColors[member.loadLevel] || '#6B7280' }}>
                                        {member.employee?.name?.[0] || '?'}
                                    </Avatar>
                                    <Box>
                                        <Typography variant="subtitle1" fontWeight={700}>
                                            {member.employee?.name || 'غير معروف'}
                                        </Typography>
                                        <Chip
                                            size="small"
                                            label={getLoadLabel(member.loadLevel)}
                                            sx={{ bgcolor: alpha(loadColors[member.loadLevel] || '#6B7280', 0.15), color: loadColors[member.loadLevel] || '#6B7280' }}
                                        />
                                    </Box>
                                </Box>
                                <Grid container spacing={1}>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="text.secondary">المهام</Typography>
                                        <Typography variant="h6" fontWeight={700}>{member.taskCount || 0}</Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="text.secondary">النقاط</Typography>
                                        <Typography variant="h6" fontWeight={700}>{member.totalPoints || 0}</Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="text.secondary">متأخرة</Typography>
                                        <Typography variant="h6" fontWeight={700} color="error.main">{member.overdueTasks || 0}</Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="text.secondary">عاجلة</Typography>
                                        <Typography variant="h6" fontWeight={700} color="warning.main">{member.urgentTasks || 0}</Typography>
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
                {employees.length === 0 && (
                    <Grid item xs={12}>
                        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
                            <TeamIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                            <Typography variant="h6" color="text.secondary">لا توجد بيانات عبء العمل</Typography>
                            <Typography variant="body2" color="text.disabled">سيتم عرض البيانات عند وجود مهام مسندة للموظفين</Typography>
                        </Paper>
                    </Grid>
                )}
            </Grid>
        </Box>
    );
};

// Safe Analytics View with Error Handling
const AnalyticsViewSafe: React.FC = () => {
    const theme = useTheme();

    const { data: metrics, isLoading: loadingMetrics } = useQuery({
        queryKey: ['task-metrics'],
        queryFn: async () => {
            try {
                const res = await tasksApi.getProductivityMetrics();
                return res?.data || res || {};
            } catch {
                return {};
            }
        },
    });

    const { data: teamPerf, isLoading: loadingTeam } = useQuery({
        queryKey: ['team-performance'],
        queryFn: async () => {
            try {
                const res = await tasksApi.getTeamPerformance();
                return res?.data || res || [];
            } catch {
                return [];
            }
        },
    });

    if (loadingMetrics || loadingTeam) {
        return (
            <Box>
                <Skeleton variant="text" width={200} height={40} sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                    {[1, 2, 3, 4].map((i) => (
                        <Grid item xs={6} md={3} key={i}>
                            <Skeleton variant="rounded" height={120} />
                        </Grid>
                    ))}
                </Grid>
            </Box>
        );
    }

    const metricsData = metrics || {};
    const teamData = Array.isArray(teamPerf) ? teamPerf : [];

    return (
        <Box>
            <Box sx={{ mb: 3 }}>
                <Typography variant="h5" fontWeight={700}>تحليلات المهام</Typography>
                <Typography variant="body2" color="text.secondary">إحصائيات وتحليلات متقدمة لأداء المهام</Typography>
            </Box>

            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} md={3}>
                    <Card sx={{ bgcolor: alpha('#3B82F6', 0.08), borderRadius: 3 }}>
                        <CardContent>
                            <Typography variant="caption" color="text.secondary">معدل الإنجاز</Typography>
                            <Typography variant="h3" fontWeight={800} color="#3B82F6">
                                {(metricsData as any)?.completionRate || 0}%
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} md={3}>
                    <Card sx={{ bgcolor: alpha('#10B981', 0.08), borderRadius: 3 }}>
                        <CardContent>
                            <Typography variant="caption" color="text.secondary">متوسط وقت الإنجاز</Typography>
                            <Typography variant="h3" fontWeight={800} color="#10B981">
                                {(metricsData as any)?.avgCompletionTime || 0}
                                <Typography component="span" variant="body2" color="text.secondary"> يوم</Typography>
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} md={3}>
                    <Card sx={{ bgcolor: alpha('#F59E0B', 0.08), borderRadius: 3 }}>
                        <CardContent>
                            <Typography variant="caption" color="text.secondary">المكتملة هذا الشهر</Typography>
                            <Typography variant="h3" fontWeight={800} color="#F59E0B">
                                {(metricsData as any)?.completedThisMonth || 0}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} md={3}>
                    <Card sx={{ bgcolor: alpha('#EF4444', 0.08), borderRadius: 3 }}>
                        <CardContent>
                            <Typography variant="caption" color="text.secondary">معدل التأخير</Typography>
                            <Typography variant="h3" fontWeight={800} color="#EF4444">
                                {(metricsData as any)?.overdueRate || 0}%
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            <Paper sx={{ p: 2, borderRadius: 3 }}>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>أداء الفريق</Typography>
                {teamData.length > 0 ? (
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>الموظف</TableCell>
                                    <TableCell align="center">المهام المكتملة</TableCell>
                                    <TableCell align="center">معدل الإنجاز</TableCell>
                                    <TableCell align="center">متوسط الوقت</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {teamData.slice(0, 10).map((member: any, index: number) => (
                                    <TableRow key={member.userId || index}>
                                        <TableCell>
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <Avatar sx={{ width: 28, height: 28 }}>{member.user?.firstName?.[0] || '?'}</Avatar>
                                                <Typography variant="body2">{member.user?.firstName || 'غير معروف'} {member.user?.lastName || ''}</Typography>
                                            </Stack>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Chip size="small" label={member.completedTasks || 0} color="success" />
                                        </TableCell>
                                        <TableCell align="center">{member.completionRate || 0}%</TableCell>
                                        <TableCell align="center">{member.avgTime || 0} يوم</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                ) : (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                        <AnalyticsIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                        <Typography color="text.secondary">لا توجد بيانات أداء متاحة</Typography>
                    </Box>
                )}
            </Paper>
        </Box>
    );
};

// Calendar View Component
const CalendarView: React.FC<{ tasks: Task[]; onTaskClick: (task: Task) => void }> = ({ tasks, onTaskClick }) => {
    const theme = useTheme();
    const [currentDate, setCurrentDate] = useState(new Date());

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const dayNames = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

    const getTasksForDate = (day: number) => {
        const date = new Date(year, month, day);
        return tasks.filter(t => {
            if (!t.dueDate) return false;
            const taskDate = new Date(t.dueDate);
            return taskDate.getDate() === day && taskDate.getMonth() === month && taskDate.getFullYear() === year;
        });
    };

    const days: (number | null)[] = [];
    for (let i = 0; i < startDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);

    return (
        <Paper sx={{
            p: 3,
            borderRadius: 3,
            border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
            background: `linear-gradient(180deg, ${alpha('#ffffff', 0.98)} 0%, ${alpha('#f8fafc', 0.95)} 100%)`,
        }}>
            {/* Calendar Header */}
            <Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 3,
                p: 2,
                borderRadius: 2,
                background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
            }}>
                <IconButton
                    onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
                    sx={{
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2), transform: 'scale(1.1)' },
                        transition: 'all 0.2s ease',
                    }}
                >
                    <NextIcon />
                </IconButton>
                <Typography variant="h5" fontWeight={800} color="primary.main">
                    {monthNames[month]} {year}
                </Typography>
                <IconButton
                    onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
                    sx={{
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2), transform: 'scale(1.1)' },
                        transition: 'all 0.2s ease',
                    }}
                >
                    <PrevIcon />
                </IconButton>
            </Box>

            {/* Day Headers */}
            <Grid container spacing={0.5} sx={{ mb: 1.5 }}>
                {dayNames.map((day) => (
                    <Grid item xs key={day} sx={{ textAlign: 'center' }}>
                        <Typography
                            variant="caption"
                            fontWeight={700}
                            color="text.secondary"
                            sx={{
                                display: 'inline-block',
                                p: 0.5,
                                borderRadius: 1,
                                bgcolor: alpha(theme.palette.divider, 0.05),
                            }}
                        >
                            {day}
                        </Typography>
                    </Grid>
                ))}
            </Grid>

            {/* Calendar Days */}
            <Grid container spacing={0.5}>
                {days.map((day, index) => {
                    const dayTasks = day ? getTasksForDate(day) : [];
                    const isToday = day && new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;
                    const hasOverdue = dayTasks.some(t => new Date(t.dueDate!) < new Date() && t.status !== 'COMPLETED');

                    return (
                        <Grid item xs key={index}>
                            <Box
                                sx={{
                                    minHeight: 90,
                                    p: 1,
                                    borderRadius: 2,
                                    bgcolor: day
                                        ? (isToday ? alpha(theme.palette.primary.main, 0.12) : alpha(theme.palette.background.default, 0.5))
                                        : 'transparent',
                                    border: day
                                        ? `1px solid ${isToday ? theme.palette.primary.main : alpha(theme.palette.divider, 0.08)}`
                                        : 'none',
                                    transition: 'all 0.2s ease',
                                    '&:hover': day ? {
                                        bgcolor: alpha(theme.palette.primary.main, 0.08),
                                        boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.15)}`,
                                        transform: 'scale(1.02)',
                                    } : {},
                                }}
                            >
                                {day && (
                                    <>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Typography
                                                variant="body2"
                                                fontWeight={isToday ? 800 : 600}
                                                sx={{
                                                    color: isToday ? 'white' : 'text.primary',
                                                    width: 28,
                                                    height: 28,
                                                    borderRadius: '50%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    bgcolor: isToday ? 'primary.main' : 'transparent',
                                                }}
                                            >
                                                {day}
                                            </Typography>
                                            {dayTasks.length > 0 && (
                                                <Chip
                                                    size="small"
                                                    label={dayTasks.length}
                                                    sx={{
                                                        height: 18,
                                                        minWidth: 18,
                                                        fontSize: '0.65rem',
                                                        bgcolor: hasOverdue ? alpha('#EF4444', 0.15) : alpha(theme.palette.primary.main, 0.12),
                                                        color: hasOverdue ? '#EF4444' : theme.palette.primary.main,
                                                        fontWeight: 700,
                                                    }}
                                                />
                                            )}
                                        </Box>
                                        <Stack spacing={0.5} sx={{ mt: 0.75 }}>
                                            {dayTasks.slice(0, 2).map((task) => (
                                                <Box
                                                    key={task.id}
                                                    onClick={(e) => { e.stopPropagation(); onTaskClick(task); }}
                                                    sx={{
                                                        p: 0.5,
                                                        borderRadius: 1,
                                                        bgcolor: alpha(PRIORITY_CONFIG[task.priority].color, 0.12),
                                                        borderLeft: `3px solid ${PRIORITY_CONFIG[task.priority].color}`,
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s ease',
                                                        '&:hover': {
                                                            bgcolor: alpha(PRIORITY_CONFIG[task.priority].color, 0.2),
                                                            transform: 'translateX(-2px)',
                                                        },
                                                    }}
                                                >
                                                    <Typography
                                                        variant="caption"
                                                        sx={{
                                                            fontSize: '0.65rem',
                                                            fontWeight: 600,
                                                            color: PRIORITY_CONFIG[task.priority].color,
                                                            display: 'block',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap',
                                                        }}
                                                    >
                                                        {task.title}
                                                    </Typography>
                                                </Box>
                                            ))}
                                            {dayTasks.length > 2 && (
                                                <Typography variant="caption" color="primary.main" sx={{ textAlign: 'center', fontWeight: 600 }}>
                                                    +{dayTasks.length - 2} أخرى
                                                </Typography>
                                            )}
                                        </Stack>
                                    </>
                                )}
                            </Box>
                        </Grid>
                    );
                })}
            </Grid>
        </Paper>
    );
};

// Main TasksPage Component
const TasksPage: React.FC = () => {
    const theme = useTheme();
    const queryClient = useQueryClient();
    const [viewMode, setViewMode] = useState<'kanban' | 'list' | 'calendar' | 'gantt' | 'timeline' | 'sprints' | 'workload' | 'analytics' | 'smart' | 'advanced'>('kanban');
    const [aiEstimateOpen, setAiEstimateOpen] = useState(false);
    const [advancedTab, setAdvancedTab] = useState<number>(0);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [draggedTask, setDraggedTask] = useState<Task | null>(null);

    // Filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('');
    const [filterPriority, setFilterPriority] = useState<string>('');
    const [filterCategory, setFilterCategory] = useState<string>('');

    // Bulk selection states
    const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
    const [bulkActionAnchor, setBulkActionAnchor] = useState<null | HTMLElement>(null);

    // Hooks
    const { data: kanbanData, isLoading: isLoadingKanban } = useKanbanBoard();
    const { data: tasksData } = useTasks();
    const { data: stats } = useTaskStats();
    const { data: categories } = useTaskCategories();
    const createTask = useCreateTask();
    const reorderTask = useReorderTask();

    // Form state
    const [newTask, setNewTask] = useState({
        title: '',
        description: '',
        priority: 'MEDIUM',
        categoryId: '',
        status: 'TODO',
        assigneeId: '',
    });

    // Fetch employees for assignee dropdown
    const { data: usersData } = useQuery({
        queryKey: ['users-for-tasks'],
        queryFn: async () => {
            const response = await api.get('/users');
            return response.data;
        },
    });

    // Filter tasks
    const filteredTasks = useMemo(() => {
        let allTasks = tasksData?.data || [];

        if (searchQuery) {
            allTasks = allTasks.filter(t =>
                t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.description?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }
        if (filterStatus) {
            allTasks = allTasks.filter(t => t.status === filterStatus);
        }
        if (filterPriority) {
            allTasks = allTasks.filter(t => t.priority === filterPriority);
        }
        if (filterCategory) {
            allTasks = allTasks.filter(t => t.categoryId === filterCategory);
        }

        return allTasks;
    }, [tasksData, searchQuery, filterStatus, filterPriority, filterCategory]);

    const handleDragStart = (_e: React.DragEvent, task: Task) => {
        setDraggedTask(task);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent, newStatus: string) => {
        e.preventDefault();
        if (draggedTask && draggedTask.status !== newStatus) {
            reorderTask.mutate({ id: draggedTask.id, status: newStatus, order: 0 });
        }
        setDraggedTask(null);
    };

    const handleTaskClick = (task: Task) => {
        setSelectedTaskId(task.id);
        setDetailsDialogOpen(true);
    };

    const handleQuickAdd = (status: string) => {
        setNewTask({ ...newTask, status });
        setCreateDialogOpen(true);
    };

    const handleCreateTask = () => {
        if (!newTask.title.trim()) return;

        const cleanData: Record<string, any> = {
            title: newTask.title.trim(),
            priority: newTask.priority,
            status: newTask.status,
        };

        if (newTask.description?.trim()) {
            cleanData.description = newTask.description.trim();
        }
        if (newTask.categoryId) {
            cleanData.categoryId = newTask.categoryId;
        }
        if (newTask.assigneeId) {
            cleanData.assigneeId = newTask.assigneeId;
        }

        createTask.mutate(cleanData as any, {
            onSuccess: () => {
                setCreateDialogOpen(false);
                setNewTask({ title: '', description: '', priority: 'MEDIUM', categoryId: '', status: 'TODO', assigneeId: '' });
            },
        });
    };

    const clearFilters = () => {
        setSearchQuery('');
        setFilterStatus('');
        setFilterPriority('');
        setFilterCategory('');
    };

    const hasActiveFilters = searchQuery || filterStatus || filterPriority || filterCategory;

    // Bulk selection handlers
    const toggleTaskSelection = (taskId: string) => {
        setSelectedTaskIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(taskId)) {
                newSet.delete(taskId);
            } else {
                newSet.add(taskId);
            }
            return newSet;
        });
    };

    const selectAllTasks = () => {
        const allTaskIds = filteredTasks.map(t => t.id);
        setSelectedTaskIds(new Set(allTaskIds));
    };

    const clearSelection = () => {
        setSelectedTaskIds(new Set());
    };

    const isTaskSelected = (taskId: string) => selectedTaskIds.has(taskId);
    const selectedCount = selectedTaskIds.size;


    return (
        <Box sx={{ p: 3, height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <Box
                sx={{
                    mb: 3,
                    p: 3,
                    borderRadius: 3,
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                    color: '#fff',
                }}
            >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                        <Typography variant="h4" fontWeight={700}>
                            إدارة المهام
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
                            نظام متكامل لتتبع وإدارة جميع المهام والمشاريع
                        </Typography>
                    </Box>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setCreateDialogOpen(true)}
                        sx={{
                            bgcolor: 'rgba(255,255,255,0.2)',
                            backdropFilter: 'blur(10px)',
                            '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                        }}
                    >
                        مهمة جديدة
                    </Button>
                </Box>
            </Box>

            {/* Stats Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} md={3}>
                    <StatsCard title="إجمالي المهام" value={stats?.total || 0} color={theme.palette.primary.main} icon={<FlagIcon />} />
                </Grid>
                <Grid item xs={6} md={3}>
                    <StatsCard title="جاري العمل" value={stats?.byStatus?.IN_PROGRESS || 0} color="#F59E0B" icon={<TimeIcon />} />
                </Grid>
                <Grid item xs={6} md={3}>
                    <StatsCard title="مكتملة" value={stats?.byStatus?.COMPLETED || 0} color="#10B981" icon={<CheckIcon />} />
                </Grid>
                <Grid item xs={6} md={3}>
                    <StatsCard title="متأخرة" value={stats?.overdue || 0} color="#EF4444" icon={<FlagIcon />} />
                </Grid>
            </Grid>

            {/* Bulk Action Toolbar - shows when tasks are selected */}
            {selectedCount > 0 && (
                <Paper
                    sx={{
                        p: 1.5,
                        mb: 2,
                        borderRadius: 3,
                        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.12)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
                        border: `2px solid ${theme.palette.primary.main}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        animation: 'slideDown 0.3s ease',
                        '@keyframes slideDown': {
                            from: { opacity: 0, transform: 'translateY(-10px)' },
                            to: { opacity: 1, transform: 'translateY(0)' },
                        },
                    }}
                >
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Chip
                            label={`${selectedCount} مهمة محددة`}
                            color="primary"
                            sx={{ fontWeight: 700, fontSize: '0.85rem' }}
                        />
                        <Button
                            size="small"
                            variant="outlined"
                            onClick={selectAllTasks}
                            sx={{ borderRadius: 2 }}
                        >
                            تحديد الكل ({filteredTasks.length})
                        </Button>
                    </Stack>
                    <Stack direction="row" spacing={1}>
                        <Tooltip title="تغيير الحالة">
                            <Button
                                size="small"
                                variant="contained"
                                color="info"
                                sx={{ borderRadius: 2, minWidth: 'auto', px: 2 }}
                            >
                                تغيير الحالة
                            </Button>
                        </Tooltip>
                        <Tooltip title="حذف المحددات">
                            <Button
                                size="small"
                                variant="contained"
                                color="error"
                                sx={{ borderRadius: 2, minWidth: 'auto', px: 2 }}
                            >
                                حذف
                            </Button>
                        </Tooltip>
                        <Tooltip title="إلغاء التحديد">
                            <IconButton size="small" onClick={clearSelection} color="primary">
                                <ClearIcon />
                            </IconButton>
                        </Tooltip>
                    </Stack>
                </Paper>
            )}

            {/* Filters & View Toggle */}
            <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
                    {/* Search */}
                    <TextField
                        size="small"
                        placeholder="بحث في المهام..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        sx={{ minWidth: 250 }}
                        InputProps={{
                            startAdornment: <InputAdornment position="start"><SearchIcon color="action" /></InputAdornment>,
                            endAdornment: searchQuery && (
                                <InputAdornment position="end">
                                    <IconButton size="small" onClick={() => setSearchQuery('')}><ClearIcon fontSize="small" /></IconButton>
                                </InputAdornment>
                            ),
                        }}
                    />

                    {/* Status Filter */}
                    <FormControl size="small" sx={{ minWidth: 140 }}>
                        <InputLabel>الحالة</InputLabel>
                        <Select value={filterStatus} label="الحالة" onChange={(e) => setFilterStatus(e.target.value)}>
                            <MenuItem value="">الكل</MenuItem>
                            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                                <MenuItem key={key} value={key}>{config.label}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {/* Priority Filter */}
                    <FormControl size="small" sx={{ minWidth: 140 }}>
                        <InputLabel>الأولوية</InputLabel>
                        <Select value={filterPriority} label="الأولوية" onChange={(e) => setFilterPriority(e.target.value)}>
                            <MenuItem value="">الكل</MenuItem>
                            {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                                <MenuItem key={key} value={key}>{config.icon} {config.label}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {/* Category Filter */}
                    <FormControl size="small" sx={{ minWidth: 140 }}>
                        <InputLabel>الفئة</InputLabel>
                        <Select value={filterCategory} label="الفئة" onChange={(e) => setFilterCategory(e.target.value)}>
                            <MenuItem value="">الكل</MenuItem>
                            {categories?.map((cat: TaskCategory) => (
                                <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {hasActiveFilters && (
                        <Button size="small" startIcon={<ClearIcon />} onClick={clearFilters}>
                            مسح الفلاتر
                        </Button>
                    )}

                    <Box sx={{ flex: 1 }} />

                    {/* Export Button */}
                    <Button
                        size="small"
                        variant="outlined"
                        startIcon={<FileDownloadIcon />}
                        onClick={() => {
                            // Export to CSV
                            const csvContent = [
                                ['العنوان', 'الحالة', 'الأولوية', 'تاريخ الاستحقاق', 'التقدم'],
                                ...filteredTasks.map(t => [
                                    t.title,
                                    STATUS_CONFIG[t.status]?.label || t.status,
                                    PRIORITY_CONFIG[t.priority]?.label || t.priority,
                                    t.dueDate ? new Date(t.dueDate).toLocaleDateString('ar-SA') : '-',
                                    `${t.progress}%`
                                ])
                            ].map(row => row.join(',')).join('\n');
                            const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
                            const link = document.createElement('a');
                            link.href = URL.createObjectURL(blob);
                            link.download = `tasks_export_${new Date().toISOString().split('T')[0]}.csv`;
                            link.click();
                        }}
                        sx={{ borderRadius: 2 }}
                    >
                        تصدير
                    </Button>

                    {/* View Toggle */}
                    <Tabs value={viewMode} onChange={(_, v) => setViewMode(v)} sx={{ minHeight: 36 }} variant="scrollable" scrollButtons="auto">
                        <Tab value="kanban" icon={<KanbanIcon />} sx={{ minWidth: 50, minHeight: 36 }} title="كانبان" />
                        <Tab value="list" icon={<ListIcon />} sx={{ minWidth: 50, minHeight: 36 }} title="قائمة" />
                        <Tab value="calendar" icon={<CalendarIcon />} sx={{ minWidth: 50, minHeight: 36 }} title="تقويم" />
                        <Tab value="gantt" icon={<GanttIcon />} sx={{ minWidth: 50, minHeight: 36 }} title="جانت" />
                        <Tab value="timeline" icon={<TimelineIcon />} sx={{ minWidth: 50, minHeight: 36 }} title="زمني" />
                        <Tab value="sprints" icon={<SpeedIcon />} sx={{ minWidth: 50, minHeight: 36 }} title="سبرنت" />
                        <Tab value="workload" icon={<TeamIcon />} sx={{ minWidth: 50, minHeight: 36 }} title="عبء العمل" />
                        <Tab value="analytics" icon={<AnalyticsIcon />} sx={{ minWidth: 50, minHeight: 36 }} title="التحليلات" />
                        <Tab value="smart" icon={<AiIcon />} sx={{ minWidth: 50, minHeight: 36 }} title="🧠 ذكي" />
                        <Tab value="advanced" icon={<BoltIcon />} sx={{ minWidth: 50, minHeight: 36 }} title="⚡ متقدم" />
                        <Tab value="planning" icon={<RouteIcon />} sx={{ minWidth: 50, minHeight: 36 }} title="📊 التخطيط" />
                    </Tabs>
                </Stack>
            </Paper>

            {/* Main Content */}
            <Box sx={{ flex: 1, overflow: 'hidden' }}>
                {/* Kanban View */}
                {viewMode === 'kanban' && (
                    <Box
                        sx={{
                            display: 'flex',
                            gap: 2,
                            overflowX: 'auto',
                            pb: 2,
                            height: '100%',
                            '&::-webkit-scrollbar': { height: 8 },
                            '&::-webkit-scrollbar-track': { bgcolor: alpha(theme.palette.divider, 0.1), borderRadius: 4 },
                            '&::-webkit-scrollbar-thumb': { bgcolor: alpha(theme.palette.primary.main, 0.3), borderRadius: 4 },
                        }}
                    >
                        {isLoadingKanban ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <Box key={i} sx={{ minWidth: 300, flex: '0 0 auto' }}>
                                    <Skeleton variant="rounded" height={60} sx={{ mb: 2 }} />
                                    <Skeleton variant="rounded" height={120} sx={{ mb: 1 }} />
                                    <Skeleton variant="rounded" height={120} sx={{ mb: 1 }} />
                                </Box>
                            ))
                        ) : (
                            (Object.keys(STATUS_CONFIG) as Array<keyof typeof STATUS_CONFIG>).map((status) => (
                                <KanbanColumn
                                    key={status}
                                    status={status}
                                    tasks={kanbanData?.[status] || []}
                                    onDragOver={handleDragOver}
                                    onDrop={handleDrop}
                                    onDragStart={handleDragStart}
                                    onTaskClick={handleTaskClick}
                                    onQuickAdd={handleQuickAdd}
                                />
                            ))
                        )}
                    </Box>
                )}

                {/* List View */}
                {viewMode === 'list' && (
                    <Box sx={{ height: '100%', overflow: 'auto' }}>
                        <ListView tasks={filteredTasks} onTaskClick={handleTaskClick} />
                    </Box>
                )}

                {/* Calendar View */}
                {viewMode === 'calendar' && (
                    <Box sx={{ height: '100%', overflow: 'auto' }}>
                        <CalendarView tasks={filteredTasks} onTaskClick={handleTaskClick} />
                    </Box>
                )}

                {/* Gantt Chart View */}
                {viewMode === 'gantt' && (
                    <Box sx={{ height: '100%', overflow: 'auto' }}>
                        <GanttChart
                            categoryId={filterCategory || undefined}
                            onTaskClick={(taskId) => {
                                setSelectedTaskId(taskId);
                                setDetailsDialogOpen(true);
                            }}
                        />
                    </Box>
                )}

                {/* Timeline View */}
                {viewMode === 'timeline' && (
                    <Box sx={{ height: '100%', overflow: 'auto' }}>
                        <TimelineView
                            categoryId={filterCategory || undefined}
                            onTaskClick={(taskId) => {
                                setSelectedTaskId(taskId);
                                setDetailsDialogOpen(true);
                            }}
                        />
                    </Box>
                )}

                {/* Sprints View */}
                {viewMode === 'sprints' && (
                    <Box sx={{ height: '100%', overflow: 'auto', p: 3 }}>
                        <SprintsViewSafe />
                    </Box>
                )}

                {/* Team Workload View */}
                {viewMode === 'workload' && (
                    <Box sx={{ height: '100%', overflow: 'auto', p: 3 }}>
                        <TeamWorkloadViewSafe />
                    </Box>
                )}

                {/* Analytics View */}
                {viewMode === 'analytics' && (
                    <Box sx={{ height: '100%', overflow: 'auto', p: 3 }}>
                        <AnalyticsViewSafe />
                    </Box>
                )}

                {/* Smart AI View - Batch 1 */}
                {viewMode === 'smart' && (
                    <Box sx={{ height: '100%', overflow: 'auto', p: 3 }}>
                        <Box sx={{ mb: 4 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="h5" fontWeight={700}>🧠 الإدارة الذكية للمهام</Typography>
                                <Button variant="contained" startIcon={<AiIcon />} onClick={() => setAiEstimateOpen(true)}>
                                    تقدير AI
                                </Button>
                            </Box>
                            <SmartPriorityView />
                        </Box>
                        <Grid container spacing={3} sx={{ mb: 3 }}>
                            <Grid item xs={12} lg={6}>
                                <BurndownChartView />
                            </Grid>
                            <Grid item xs={12} lg={6}>
                                <VelocityChartView />
                            </Grid>
                        </Grid>
                        <WorkloadAnalysisView />
                    </Box>
                )}

                {/* Advanced View - Batch 2 Features */}
                {viewMode === 'advanced' && (
                    <Box sx={{ height: '100%', overflow: 'auto', p: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                            <Typography variant="h5" fontWeight={700}>⚡ الميزات المتقدمة</Typography>
                            <TaskTimerWidget />
                        </Box>

                        {/* Tabs for Advanced Features */}
                        <Tabs
                            value={advancedTab}
                            onChange={(_, newValue) => setAdvancedTab(newValue)}
                            sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}
                        >
                            <Tab label="المهام المتكررة" icon={<RepeatIcon />} iconPosition="start" />
                            <Tab label="الأتمتة" icon={<BoltIcon />} iconPosition="start" />
                            <Tab label="التقارير" icon={<AnalyticsIcon />} iconPosition="start" />
                        </Tabs>

                        {/* Recurring Tasks */}
                        {advancedTab === 0 && (
                            <Box>
                                <RecurringTasksView />
                            </Box>
                        )}

                        {/* Automations */}
                        {advancedTab === 1 && (
                            <Box>
                                <AutomationsManager />
                            </Box>
                        )}

                        {/* Reports */}
                        {advancedTab === 2 && (
                            <Box>
                                <ReportsGenerator />
                            </Box>
                        )}
                    </Box>
                )}

                {/* Planning View - Batch 4 Features (Timeline, Buffer, Critical Path, What-If) */}
                {viewMode === 'planning' && (
                    <Box sx={{ height: '100%', overflow: 'auto', p: 3 }}>
                        <Box sx={{ mb: 3 }}>
                            <Typography variant="h5" fontWeight={700}>📊 التخطيط والتحليل</Typography>
                            <Typography variant="body2" color="text.secondary">
                                الجدول الزمني • وقت الاحتياط • المسار الحرج • سيناريوهات ماذا لو
                            </Typography>
                        </Box>
                        <AdvancedPlanningDashboard />
                    </Box>
                )}
            </Box>

            {/* AI Estimation Dialog */}
            <AiEstimationDialog open={aiEstimateOpen} onClose={() => setAiEstimateOpen(false)} />

            {/* Task Details Dialog */}
            <TaskDetailsDialog
                taskId={selectedTaskId}
                open={detailsDialogOpen}
                onClose={() => {
                    setDetailsDialogOpen(false);
                    setSelectedTaskId(null);
                }}
            />

            {/* Create Task Dialog */}
            <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 700 }}>إنشاء مهمة جديدة</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField
                            fullWidth
                            label="عنوان المهمة"
                            value={newTask.title}
                            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                            required
                        />
                        <TextField
                            fullWidth
                            label="الوصف"
                            multiline
                            rows={3}
                            value={newTask.description}
                            onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                        />
                        <Stack direction="row" spacing={2}>
                            <FormControl fullWidth>
                                <InputLabel>الأولوية</InputLabel>
                                <Select
                                    value={newTask.priority}
                                    label="الأولوية"
                                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                                >
                                    {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                                        <MenuItem key={key} value={key}>
                                            {config.icon} {config.label}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <FormControl fullWidth>
                                <InputLabel>الحالة</InputLabel>
                                <Select
                                    value={newTask.status}
                                    label="الحالة"
                                    onChange={(e) => setNewTask({ ...newTask, status: e.target.value })}
                                >
                                    {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                                        <MenuItem key={key} value={key}>{config.label}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Stack>
                        <FormControl fullWidth>
                            <InputLabel>الفئة</InputLabel>
                            <Select
                                value={newTask.categoryId}
                                label="الفئة"
                                onChange={(e) => setNewTask({ ...newTask, categoryId: e.target.value })}
                            >
                                <MenuItem value="">بدون فئة</MenuItem>
                                {categories?.map((cat: TaskCategory) => (
                                    <MenuItem key={cat.id} value={cat.id}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: cat.color }} />
                                            {cat.name}
                                        </Box>
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl fullWidth>
                            <InputLabel>المسؤول (المكلف)</InputLabel>
                            <Select
                                value={newTask.assigneeId}
                                label="المسؤول (المكلف)"
                                onChange={(e) => setNewTask({ ...newTask, assigneeId: e.target.value })}
                            >
                                <MenuItem value="">بدون تعيين</MenuItem>
                                {(usersData?.data || usersData || []).map((user: any) => (
                                    <MenuItem key={user.id} value={user.id}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>{user.firstName?.[0]}</Avatar>
                                            {user.firstName} {user.lastName}
                                        </Box>
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setCreateDialogOpen(false)}>إلغاء</Button>
                    <Button variant="contained" onClick={handleCreateTask} disabled={!newTask.title.trim() || createTask.isPending}>
                        إنشاء المهمة
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default TasksPage;
