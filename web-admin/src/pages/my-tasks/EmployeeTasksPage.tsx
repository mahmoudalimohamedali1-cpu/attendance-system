import React, { useState, useEffect } from 'react';
import {
    Box,
    Container,
    Typography,
    Card,
    CardContent,
    Chip,
    Stack,
    Avatar,
    LinearProgress,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Tabs,
    Tab,
    Paper,
    CircularProgress,
    Divider,
    alpha,
    useTheme,
} from '@mui/material';
import {
    Assignment as TaskIcon,
    CheckCircle as CompletedIcon,
    Schedule as PendingIcon,
    PlayArrow as InProgressIcon,
    CalendarToday as CalendarIcon,
    Comment as CommentIcon,
    Send as SendIcon,
    Close as CloseIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api.service';

// Status configuration
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    BACKLOG: { label: 'قائمة الانتظار', color: '#6B7280', icon: <PendingIcon /> },
    TODO: { label: 'للعمل', color: '#3B82F6', icon: <PendingIcon /> },
    IN_PROGRESS: { label: 'جاري العمل', color: '#F59E0B', icon: <InProgressIcon /> },
    IN_REVIEW: { label: 'قيد المراجعة', color: '#8B5CF6', icon: <PendingIcon /> },
    BLOCKED: { label: 'محظور', color: '#EF4444', icon: <PendingIcon /> },
    COMPLETED: { label: 'مكتمل', color: '#10B981', icon: <CompletedIcon /> },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
    URGENT: { label: 'عاجل', color: '#DC2626', icon: '🔥' },
    HIGH: { label: 'عالي', color: '#F59E0B', icon: '⚡' },
    MEDIUM: { label: 'متوسط', color: '#3B82F6', icon: '📌' },
    LOW: { label: 'منخفض', color: '#6B7280', icon: '💤' },
};

interface Task {
    id: string;
    title: string;
    description?: string;
    status: string;
    priority: string;
    dueDate?: string;
    progress: number;
    createdAt: string;
    assignee?: { id: string; firstName: string; lastName: string };
    createdBy?: { id: string; firstName: string; lastName: string };
    category?: { id: string; name: string; color: string };
}

const EmployeeTasksPage: React.FC = () => {
    const theme = useTheme();
    const queryClient = useQueryClient();
    const [tabValue, setTabValue] = useState(0);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [comment, setComment] = useState('');
    const [newStatus, setNewStatus] = useState('');

    // Fetch my tasks
    const { data: tasks = [], isLoading, error } = useQuery({
        queryKey: ['my-tasks'],
        queryFn: async () => {
            const response = await api.get('/tasks/my-tasks');
            return response;
        },
    });

    // Update task status
    const updateTaskMutation = useMutation({
        mutationFn: async ({ taskId, status }: { taskId: string; status: string }) => {
            const response = await api.patch(`/tasks/${taskId}`, { status });
            return response;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
        },
    });

    // Add comment
    const addCommentMutation = useMutation({
        mutationFn: async ({ taskId, content }: { taskId: string; content: string }) => {
            const response = await api.post(`/tasks/${taskId}/comments`, { content });
            return response;
        },
        onSuccess: () => {
            setComment('');
            queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
        },
    });

    const handleOpenTask = (task: Task) => {
        setSelectedTask(task);
        setNewStatus(task.status);
        setDialogOpen(true);
    };

    const handleUpdateStatus = () => {
        if (selectedTask && newStatus !== selectedTask.status) {
            updateTaskMutation.mutate({ taskId: selectedTask.id, status: newStatus });
        }
    };

    const handleAddComment = () => {
        if (selectedTask && comment.trim()) {
            addCommentMutation.mutate({ taskId: selectedTask.id, content: comment });
        }
    };

    const filterTasks = (status?: string) => {
        if (!status) return tasks;
        return tasks.filter((t: Task) => t.status === status);
    };

    const getTabTasks = () => {
        switch (tabValue) {
            case 0: return tasks;
            case 1: return filterTasks('TODO');
            case 2: return filterTasks('IN_PROGRESS');
            case 3: return filterTasks('COMPLETED');
            default: return tasks;
        }
    };

    const stats = {
        total: tasks.length,
        todo: tasks.filter((t: Task) => t.status === 'TODO' || t.status === 'BACKLOG').length,
        inProgress: tasks.filter((t: Task) => t.status === 'IN_PROGRESS').length,
        completed: tasks.filter((t: Task) => t.status === 'COMPLETED').length,
    };

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ textAlign: 'center', py: 8 }}>
                <Typography color="error">حدث خطأ في تحميل المهام</Typography>
                <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['my-tasks'] })} sx={{ mt: 2 }}>
                    إعادة المحاولة
                </Button>
            </Box>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            {/* Header */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" fontWeight={700} gutterBottom>
                    📋 مهامي
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    عرض وإدارة المهام المسندة إليك
                </Typography>
            </Box>

            {/* Stats Cards */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 4 }}>
                <Paper sx={{ p: 2, flex: 1, bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
                    <Typography variant="h4" fontWeight={700} color="primary">{stats.total}</Typography>
                    <Typography variant="body2" color="text.secondary">إجمالي المهام</Typography>
                </Paper>
                <Paper sx={{ p: 2, flex: 1, bgcolor: alpha('#3B82F6', 0.1) }}>
                    <Typography variant="h4" fontWeight={700} sx={{ color: '#3B82F6' }}>{stats.todo}</Typography>
                    <Typography variant="body2" color="text.secondary">قيد الانتظار</Typography>
                </Paper>
                <Paper sx={{ p: 2, flex: 1, bgcolor: alpha('#F59E0B', 0.1) }}>
                    <Typography variant="h4" fontWeight={700} sx={{ color: '#F59E0B' }}>{stats.inProgress}</Typography>
                    <Typography variant="body2" color="text.secondary">جاري العمل</Typography>
                </Paper>
                <Paper sx={{ p: 2, flex: 1, bgcolor: alpha('#10B981', 0.1) }}>
                    <Typography variant="h4" fontWeight={700} sx={{ color: '#10B981' }}>{stats.completed}</Typography>
                    <Typography variant="body2" color="text.secondary">مكتملة</Typography>
                </Paper>
            </Stack>

            {/* Tabs */}
            <Paper sx={{ mb: 3 }}>
                <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} variant="fullWidth">
                    <Tab label={`الكل (${stats.total})`} />
                    <Tab label={`للعمل (${stats.todo})`} />
                    <Tab label={`جاري (${stats.inProgress})`} />
                    <Tab label={`مكتمل (${stats.completed})`} />
                </Tabs>
            </Paper>

            {/* Tasks List */}
            <Stack spacing={2}>
                {getTabTasks().length === 0 ? (
                    <Paper sx={{ p: 4, textAlign: 'center' }}>
                        <TaskIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                        <Typography color="text.secondary">لا توجد مهام</Typography>
                    </Paper>
                ) : (
                    getTabTasks().map((task: Task) => (
                        <Card
                            key={task.id}
                            sx={{
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                '&:hover': {
                                    transform: 'translateY(-2px)',
                                    boxShadow: 4,
                                },
                            }}
                            onClick={() => handleOpenTask(task)}
                        >
                            <CardContent>
                                <Stack direction="row" alignItems="flex-start" spacing={2}>
                                    <Avatar
                                        sx={{
                                            bgcolor: alpha(STATUS_CONFIG[task.status]?.color || '#6B7280', 0.2),
                                            color: STATUS_CONFIG[task.status]?.color,
                                        }}
                                    >
                                        {STATUS_CONFIG[task.status]?.icon}
                                    </Avatar>
                                    <Box sx={{ flex: 1 }}>
                                        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                                            <Typography variant="body2">
                                                {PRIORITY_CONFIG[task.priority]?.icon}
                                            </Typography>
                                            <Typography variant="h6" fontWeight={600}>
                                                {task.title}
                                            </Typography>
                                        </Stack>
                                        {task.description && (
                                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                                {task.description.substring(0, 100)}...
                                            </Typography>
                                        )}
                                        <Stack direction="row" spacing={1} flexWrap="wrap">
                                            <Chip
                                                label={STATUS_CONFIG[task.status]?.label}
                                                size="small"
                                                sx={{
                                                    bgcolor: alpha(STATUS_CONFIG[task.status]?.color || '#6B7280', 0.15),
                                                    color: STATUS_CONFIG[task.status]?.color,
                                                }}
                                            />
                                            <Chip
                                                label={PRIORITY_CONFIG[task.priority]?.label}
                                                size="small"
                                                sx={{
                                                    bgcolor: alpha(PRIORITY_CONFIG[task.priority]?.color || '#6B7280', 0.15),
                                                    color: PRIORITY_CONFIG[task.priority]?.color,
                                                }}
                                            />
                                            {task.dueDate && (
                                                <Chip
                                                    icon={<CalendarIcon sx={{ fontSize: 14 }} />}
                                                    label={new Date(task.dueDate).toLocaleDateString('ar-SA')}
                                                    size="small"
                                                    variant="outlined"
                                                />
                                            )}
                                        </Stack>
                                        {task.progress > 0 && (
                                            <Box sx={{ mt: 2 }}>
                                                <LinearProgress
                                                    variant="determinate"
                                                    value={task.progress}
                                                    sx={{ height: 6, borderRadius: 3 }}
                                                />
                                                <Typography variant="caption" color="text.secondary">
                                                    {task.progress}% مكتمل
                                                </Typography>
                                            </Box>
                                        )}
                                    </Box>
                                </Stack>
                            </CardContent>
                        </Card>
                    ))
                )}
            </Stack>

            {/* Task Details Dialog */}
            <Dialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                {selectedTask && (
                    <>
                        <DialogTitle>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Typography variant="h6" fontWeight={700}>
                                    {PRIORITY_CONFIG[selectedTask.priority]?.icon} {selectedTask.title}
                                </Typography>
                                <IconButton onClick={() => setDialogOpen(false)}>
                                    <CloseIcon />
                                </IconButton>
                            </Stack>
                        </DialogTitle>
                        <DialogContent dividers>
                            {selectedTask.description && (
                                <Typography variant="body1" sx={{ mb: 3 }}>
                                    {selectedTask.description}
                                </Typography>
                            )}

                            <Divider sx={{ my: 2 }} />

                            {/* Status Update */}
                            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                                تحديث الحالة
                            </Typography>
                            <FormControl fullWidth size="small" sx={{ mb: 3 }}>
                                <InputLabel>الحالة</InputLabel>
                                <Select
                                    value={newStatus}
                                    label="الحالة"
                                    onChange={(e) => setNewStatus(e.target.value)}
                                >
                                    <MenuItem value="TODO">للعمل</MenuItem>
                                    <MenuItem value="IN_PROGRESS">جاري العمل</MenuItem>
                                    <MenuItem value="IN_REVIEW">قيد المراجعة</MenuItem>
                                    <MenuItem value="COMPLETED">مكتمل</MenuItem>
                                </Select>
                            </FormControl>

                            <Divider sx={{ my: 2 }} />

                            {/* Add Comment */}
                            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                                إضافة تعليق
                            </Typography>
                            <Stack direction="row" spacing={1}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    placeholder="اكتب تعليقك..."
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                />
                                <IconButton
                                    color="primary"
                                    onClick={handleAddComment}
                                    disabled={!comment.trim() || addCommentMutation.isPending}
                                >
                                    <SendIcon />
                                </IconButton>
                            </Stack>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setDialogOpen(false)}>إغلاق</Button>
                            <Button
                                variant="contained"
                                onClick={handleUpdateStatus}
                                disabled={newStatus === selectedTask.status || updateTaskMutation.isPending}
                            >
                                {updateTaskMutation.isPending ? <CircularProgress size={20} /> : 'حفظ التغييرات'}
                            </Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>
        </Container>
    );
};

export default EmployeeTasksPage;
