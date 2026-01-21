/**
 * Batch 2: Advanced Task Management Components
 * 
 * Components:
 * 1. RecurringTasksView - Manage recurring/scheduled tasks
 * 2. BulkActionsToolbar - Bulk operations on multiple tasks
 * 3. TaskCommentsSection - Comments with reactions
 * 4. ActivityTimelineView - Activity feed timeline
 * 5. TaskTimerWidget - Start/stop timer
 * 6. AutomationsManager - Task automation rules
 * 7. ReportsGenerator - Generate and export reports
 */

import React, { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    Button,
    Chip,
    Avatar,
    Card,
    CardContent,
    Grid,
    Stack,
    Skeleton,
    IconButton,
    Tooltip,
    TextField,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Switch,
    FormControlLabel,
    Checkbox,
    LinearProgress,
    Divider,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    ListItemSecondaryAction,
    Menu,
    alpha,
    useTheme,
} from '@mui/material';
import {
    Repeat as RepeatIcon,
    PlayArrow as PlayIcon,
    Stop as StopIcon,
    Timer as TimerIcon,
    Comment as CommentIcon,
    Send as SendIcon,
    AutoFixHigh as AutomationIcon,
    Assessment as ReportIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    ContentCopy as CloneIcon,
    SelectAll as SelectAllIcon,
    Deselect as DeselectIcon,
    CheckCircle as CheckIcon,
    Cancel as CancelIcon,
    Schedule as ScheduleIcon,
    EmojiEmotions as EmojiIcon,
    Reply as ReplyIcon,
    History as HistoryIcon,
    Download as DownloadIcon,
    Add as AddIcon,
    MoreVert as MoreIcon,
    Bolt as BoltIcon,
    TrendingUp as TrendingIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi, Task } from '@/services/tasks.service';

// ============ 1. RECURRING TASKS VIEW ============
export const RecurringTasksView: React.FC = () => {
    const theme = useTheme();
    const queryClient = useQueryClient();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [newTask, setNewTask] = useState({
        title: '',
        description: '',
        recurrenceType: 'DAILY',
        priority: 'MEDIUM',
    });

    const { data: recurringTasks, isLoading } = useQuery({
        queryKey: ['recurring-tasks'],
        queryFn: async () => {
            const res = await tasksApi.getRecurringTasks();
            return res?.data || res || { tasks: [], total: 0 };
        },
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => tasksApi.createRecurringTask(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['recurring-tasks'] });
            setDialogOpen(false);
            setNewTask({ title: '', description: '', recurrenceType: 'DAILY', priority: 'MEDIUM' });
        },
    });

    const recurrenceLabels: Record<string, string> = {
        DAILY: 'يومي',
        WEEKLY: 'أسبوعي',
        MONTHLY: 'شهري',
        QUARTERLY: 'ربع سنوي',
        YEARLY: 'سنوي',
    };

    const recurrenceColors: Record<string, string> = {
        DAILY: '#10B981',
        WEEKLY: '#3B82F6',
        MONTHLY: '#8B5CF6',
        QUARTERLY: '#F59E0B',
        YEARLY: '#EF4444',
    };

    if (isLoading) {
        return (
            <Grid container spacing={2}>
                {[1, 2, 3].map((i) => (
                    <Grid item xs={12} md={4} key={i}>
                        <Skeleton variant="rounded" height={150} />
                    </Grid>
                ))}
            </Grid>
        );
    }

    const tasks = recurringTasks?.tasks || [];

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h5" fontWeight={700}>المهام المتكررة</Typography>
                    <Typography variant="body2" color="text.secondary">إدارة المهام التي تتكرر بشكل دوري</Typography>
                </Box>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
                    مهمة متكررة جديدة
                </Button>
            </Box>

            <Grid container spacing={2}>
                {tasks.map((task: Task) => (
                    <Grid item xs={12} md={4} key={task.id}>
                        <Card sx={{ borderRadius: 3, border: `1px solid ${alpha(recurrenceColors[task.recurrenceType || 'DAILY'], 0.3)}` }}>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                    <RepeatIcon sx={{ color: recurrenceColors[task.recurrenceType || 'DAILY'] }} />
                                    <Chip
                                        size="small"
                                        label={recurrenceLabels[task.recurrenceType || 'DAILY']}
                                        sx={{ bgcolor: alpha(recurrenceColors[task.recurrenceType || 'DAILY'], 0.15) }}
                                    />
                                </Box>
                                <Typography variant="subtitle1" fontWeight={700} gutterBottom>{task.title}</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                    {task.description || 'بدون وصف'}
                                </Typography>
                                <Stack direction="row" spacing={1}>
                                    <IconButton size="small"><EditIcon fontSize="small" /></IconButton>
                                    <IconButton size="small" color="error"><DeleteIcon fontSize="small" /></IconButton>
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
                {tasks.length === 0 && (
                    <Grid item xs={12}>
                        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
                            <RepeatIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                            <Typography variant="h6" color="text.secondary">لا توجد مهام متكررة</Typography>
                        </Paper>
                    </Grid>
                )}
            </Grid>

            {/* Create Dialog */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>إنشاء مهمة متكررة</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField
                            fullWidth
                            label="العنوان"
                            value={newTask.title}
                            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                        />
                        <TextField
                            fullWidth
                            multiline
                            rows={3}
                            label="الوصف"
                            value={newTask.description}
                            onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                        />
                        <FormControl fullWidth>
                            <InputLabel>نمط التكرار</InputLabel>
                            <Select
                                value={newTask.recurrenceType}
                                label="نمط التكرار"
                                onChange={(e) => setNewTask({ ...newTask, recurrenceType: e.target.value })}
                            >
                                {Object.entries(recurrenceLabels).map(([key, label]) => (
                                    <MenuItem key={key} value={key}>{label}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
                    <Button
                        variant="contained"
                        onClick={() => createMutation.mutate(newTask)}
                        disabled={!newTask.title || createMutation.isPending}
                    >
                        إنشاء
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

// ============ 2. BULK ACTIONS TOOLBAR ============
interface BulkActionsToolbarProps {
    selectedIds: string[];
    onClearSelection: () => void;
    onSelectAll: () => void;
    allSelected: boolean;
}

export const BulkActionsToolbar: React.FC<BulkActionsToolbarProps> = ({
    selectedIds,
    onClearSelection,
    onSelectAll,
    allSelected,
}) => {
    const theme = useTheme();
    const queryClient = useQueryClient();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [bulkAction, setBulkAction] = useState<string | null>(null);
    const [updates, setUpdates] = useState<{ status?: string; priority?: string; assigneeId?: string }>({});

    const bulkUpdateMutation = useMutation({
        mutationFn: () => tasksApi.bulkUpdateTasks(selectedIds, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            queryClient.invalidateQueries({ queryKey: ['kanban'] });
            setDialogOpen(false);
            onClearSelection();
        },
    });

    const bulkDeleteMutation = useMutation({
        mutationFn: () => tasksApi.bulkDeleteTasks(selectedIds),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            queryClient.invalidateQueries({ queryKey: ['kanban'] });
            onClearSelection();
        },
    });

    if (selectedIds.length === 0) return null;

    return (
        <Paper
            sx={{
                p: 2,
                mb: 2,
                borderRadius: 3,
                bgcolor: alpha(theme.palette.primary.main, 0.08),
                border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Chip
                    label={`${selectedIds.length} محدد`}
                    color="primary"
                    sx={{ fontWeight: 700 }}
                />
                <IconButton onClick={allSelected ? onClearSelection : onSelectAll}>
                    {allSelected ? <DeselectIcon /> : <SelectAllIcon />}
                </IconButton>
            </Box>
            <Stack direction="row" spacing={1}>
                <Button
                    size="small"
                    startIcon={<CheckIcon />}
                    onClick={() => {
                        setUpdates({ status: 'COMPLETED' });
                        setBulkAction('complete');
                        bulkUpdateMutation.mutate();
                    }}
                    disabled={bulkUpdateMutation.isPending}
                >
                    إكمال الكل
                </Button>
                <Button
                    size="small"
                    startIcon={<EditIcon />}
                    onClick={() => {
                        setBulkAction('update');
                        setDialogOpen(true);
                    }}
                >
                    تعديل
                </Button>
                <Button
                    size="small"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => bulkDeleteMutation.mutate()}
                    disabled={bulkDeleteMutation.isPending}
                >
                    حذف
                </Button>
                <Button size="small" onClick={onClearSelection}>
                    إلغاء
                </Button>
            </Stack>

            {/* Bulk Update Dialog */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>تعديل جماعي</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <FormControl fullWidth>
                            <InputLabel>الحالة</InputLabel>
                            <Select
                                value={updates.status || ''}
                                label="الحالة"
                                onChange={(e) => setUpdates({ ...updates, status: e.target.value })}
                            >
                                <MenuItem value="TODO">للعمل</MenuItem>
                                <MenuItem value="IN_PROGRESS">جاري العمل</MenuItem>
                                <MenuItem value="COMPLETED">مكتمل</MenuItem>
                            </Select>
                        </FormControl>
                        <FormControl fullWidth>
                            <InputLabel>الأولوية</InputLabel>
                            <Select
                                value={updates.priority || ''}
                                label="الأولوية"
                                onChange={(e) => setUpdates({ ...updates, priority: e.target.value })}
                            >
                                <MenuItem value="LOW">منخفضة</MenuItem>
                                <MenuItem value="MEDIUM">عادية</MenuItem>
                                <MenuItem value="HIGH">عالية</MenuItem>
                                <MenuItem value="URGENT">عاجلة</MenuItem>
                            </Select>
                        </FormControl>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
                    <Button
                        variant="contained"
                        onClick={() => bulkUpdateMutation.mutate()}
                        disabled={bulkUpdateMutation.isPending}
                    >
                        تطبيق
                    </Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
};

// ============ 3. TASK COMMENTS SECTION ============
interface TaskCommentsSectionProps {
    taskId: string;
}

export const TaskCommentsSection: React.FC<TaskCommentsSectionProps> = ({ taskId }) => {
    const theme = useTheme();
    const queryClient = useQueryClient();
    const [newComment, setNewComment] = useState('');

    const { data: comments, isLoading } = useQuery({
        queryKey: ['task-comments', taskId],
        queryFn: async () => {
            const res = await tasksApi.getComments(taskId);
            return res?.data || res || [];
        },
    });

    const addCommentMutation = useMutation({
        mutationFn: (content: string) => tasksApi.addComment(taskId, content),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['task-comments', taskId] });
            setNewComment('');
        },
    });

    const addReactionMutation = useMutation({
        mutationFn: ({ commentId, emoji }: { commentId: string; emoji: string }) =>
            tasksApi.addReaction(commentId, emoji),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['task-comments', taskId] });
        },
    });

    const emojis = ['👍', '❤️', '😄', '🎉', '🤔', '👀'];

    return (
        <Box>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                <CommentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                التعليقات
            </Typography>

            {/* Add Comment */}
            <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
                <TextField
                    fullWidth
                    multiline
                    rows={2}
                    placeholder="أضف تعليقاً..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    sx={{ mb: 1 }}
                />
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                        variant="contained"
                        size="small"
                        endIcon={<SendIcon />}
                        onClick={() => addCommentMutation.mutate(newComment)}
                        disabled={!newComment.trim() || addCommentMutation.isPending}
                    >
                        إرسال
                    </Button>
                </Box>
            </Paper>

            {/* Comments List */}
            {isLoading ? (
                <Stack spacing={2}>
                    {[1, 2].map((i) => <Skeleton key={i} variant="rounded" height={80} />)}
                </Stack>
            ) : (
                <List>
                    {(Array.isArray(comments) ? comments : []).map((comment: any) => (
                        <ListItem
                            key={comment.id}
                            alignItems="flex-start"
                            sx={{ bgcolor: alpha(theme.palette.background.default, 0.5), borderRadius: 2, mb: 1 }}
                        >
                            <ListItemAvatar>
                                <Avatar>{comment.author?.firstName?.[0] || '?'}</Avatar>
                            </ListItemAvatar>
                            <ListItemText
                                primary={
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Typography fontWeight={600}>
                                            {comment.author?.firstName} {comment.author?.lastName}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {new Date(comment.createdAt).toLocaleDateString('ar-SA')}
                                        </Typography>
                                    </Box>
                                }
                                secondary={
                                    <>
                                        <Typography component="span" variant="body2" color="text.primary">
                                            {comment.content}
                                        </Typography>
                                        <Stack direction="row" spacing={0.5} sx={{ mt: 1 }}>
                                            {emojis.map((emoji) => (
                                                <IconButton
                                                    key={emoji}
                                                    size="small"
                                                    onClick={() => addReactionMutation.mutate({ commentId: comment.id, emoji })}
                                                >
                                                    {emoji}
                                                </IconButton>
                                            ))}
                                        </Stack>
                                    </>
                                }
                            />
                        </ListItem>
                    ))}
                    {(!comments || comments.length === 0) && (
                        <Paper sx={{ p: 3, textAlign: 'center' }}>
                            <Typography color="text.secondary">لا توجد تعليقات بعد</Typography>
                        </Paper>
                    )}
                </List>
            )}
        </Box>
    );
};

// ============ 4. ACTIVITY TIMELINE VIEW ============
interface ActivityTimelineViewProps {
    taskId: string;
}

export const ActivityTimelineView: React.FC<ActivityTimelineViewProps> = ({ taskId }) => {
    const theme = useTheme();

    const { data: activities, isLoading } = useQuery({
        queryKey: ['task-activity', taskId],
        queryFn: async () => {
            const res = await tasksApi.getActivityFeed(taskId, 20);
            return res?.data || res || [];
        },
    });

    const actionLabels: Record<string, string> = {
        CREATED: 'أنشأ المهمة',
        UPDATED: 'حدّث المهمة',
        STATUS_CHANGED: 'غيّر الحالة',
        ASSIGNED: 'أسند المهمة',
        COMMENT_ADDED: 'أضاف تعليق',
        ATTACHMENT_ADDED: 'أضاف مرفق',
    };

    const actionColors: Record<string, string> = {
        CREATED: '#10B981',
        UPDATED: '#3B82F6',
        STATUS_CHANGED: '#8B5CF6',
        ASSIGNED: '#F59E0B',
        COMMENT_ADDED: '#EC4899',
        ATTACHMENT_ADDED: '#6366F1',
    };

    if (isLoading) {
        return <Skeleton variant="rounded" height={200} />;
    }

    return (
        <Box>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                <HistoryIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                سجل النشاط
            </Typography>
            <List>
                {(Array.isArray(activities) ? activities : []).map((activity: any) => (
                    <ListItem key={activity.id} sx={{ pl: 0 }}>
                        <ListItemAvatar>
                            <Avatar sx={{ bgcolor: alpha(actionColors[activity.action] || '#6B7280', 0.15), color: actionColors[activity.action] || '#6B7280' }}>
                                {activity.actor?.firstName?.[0] || '?'}
                            </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                            primary={
                                <Typography variant="body2">
                                    <strong>{activity.actor?.firstName} {activity.actor?.lastName}</strong>
                                    {' '}{actionLabels[activity.action] || activity.action}
                                </Typography>
                            }
                            secondary={new Date(activity.createdAt).toLocaleString('ar-SA')}
                        />
                    </ListItem>
                ))}
                {(!activities || activities.length === 0) && (
                    <Paper sx={{ p: 3, textAlign: 'center' }}>
                        <Typography color="text.secondary">لا يوجد نشاط بعد</Typography>
                    </Paper>
                )}
            </List>
        </Box>
    );
};

// ============ 5. TASK TIMER WIDGET ============
export const TaskTimerWidget: React.FC = () => {
    const theme = useTheme();
    const queryClient = useQueryClient();
    const [elapsed, setElapsed] = useState(0);

    const { data: activeTimer, isLoading } = useQuery({
        queryKey: ['active-timer'],
        queryFn: async () => {
            const res = await tasksApi.getActiveTimer();
            return res?.data || res || null;
        },
        refetchInterval: 60000,
    });

    const stopMutation = useMutation({
        mutationFn: (id: string) => tasksApi.stopTimer(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['active-timer'] });
            setElapsed(0);
        },
    });

    useEffect(() => {
        if (activeTimer?.startTime) {
            const start = new Date(activeTimer.startTime).getTime();
            const interval = setInterval(() => {
                setElapsed(Math.floor((Date.now() - start) / 1000));
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [activeTimer]);

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    if (isLoading) return <Skeleton variant="rounded" width={150} height={40} />;

    if (!activeTimer) {
        return (
            <Chip
                icon={<TimerIcon />}
                label="لا يوجد مؤقت نشط"
                variant="outlined"
            />
        );
    }

    return (
        <Chip
            icon={<TimerIcon />}
            label={formatTime(elapsed)}
            color="primary"
            onDelete={() => stopMutation.mutate(activeTimer.id)}
            deleteIcon={<StopIcon />}
            sx={{ fontFamily: 'monospace', fontWeight: 700 }}
        />
    );
};

// ============ 6. AUTOMATIONS MANAGER ============
export const AutomationsManager: React.FC = () => {
    const theme = useTheme();
    const queryClient = useQueryClient();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [newAutomation, setNewAutomation] = useState({
        name: '',
        description: '',
        trigger: 'STATUS_CHANGED',
        action: 'SEND_NOTIFICATION',
    });

    const { data: automations, isLoading } = useQuery({
        queryKey: ['automations'],
        queryFn: async () => {
            const res = await tasksApi.getAutomations();
            return res?.data || res || [];
        },
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => tasksApi.createAutomation(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['automations'] });
            setDialogOpen(false);
        },
    });

    const toggleMutation = useMutation({
        mutationFn: (id: string) => tasksApi.toggleAutomation(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['automations'] });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => tasksApi.deleteAutomation(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['automations'] });
        },
    });

    const triggerLabels: Record<string, string> = {
        STATUS_CHANGED: 'عند تغيير الحالة',
        TASK_CREATED: 'عند إنشاء مهمة',
        DUE_DATE_REACHED: 'عند وصول تاريخ الاستحقاق',
        TASK_ASSIGNED: 'عند إسناد المهمة',
    };

    const actionLabels: Record<string, string> = {
        SEND_NOTIFICATION: 'إرسال إشعار',
        ASSIGN_TO_USER: 'إسناد لمستخدم',
        CHANGE_STATUS: 'تغيير الحالة',
        ADD_TAG: 'إضافة وسم',
    };

    if (isLoading) {
        return (
            <Grid container spacing={2}>
                {[1, 2, 3].map((i) => <Grid item xs={12} md={4} key={i}><Skeleton variant="rounded" height={150} /></Grid>)}
            </Grid>
        );
    }

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h5" fontWeight={700}>الأتمتة</Typography>
                    <Typography variant="body2" color="text.secondary">قواعد أتمتة المهام</Typography>
                </Box>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
                    قاعدة جديدة
                </Button>
            </Box>

            <Grid container spacing={2}>
                {(Array.isArray(automations) ? automations : []).map((automation: any) => (
                    <Grid item xs={12} md={4} key={automation.id}>
                        <Card sx={{ borderRadius: 3, border: automation.isActive ? `1px solid ${theme.palette.success.main}` : undefined }}>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <BoltIcon sx={{ color: automation.isActive ? theme.palette.success.main : 'text.disabled' }} />
                                        <Typography fontWeight={700}>{automation.name}</Typography>
                                    </Box>
                                    <Switch
                                        checked={automation.isActive}
                                        onChange={() => toggleMutation.mutate(automation.id)}
                                        size="small"
                                    />
                                </Box>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                    {triggerLabels[automation.trigger] || automation.trigger}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                    → {actionLabels[automation.action] || automation.action}
                                </Typography>
                                <IconButton size="small" color="error" onClick={() => deleteMutation.mutate(automation.id)}>
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
                {(!automations || automations.length === 0) && (
                    <Grid item xs={12}>
                        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
                            <AutomationIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                            <Typography variant="h6" color="text.secondary">لا توجد قواعد أتمتة</Typography>
                        </Paper>
                    </Grid>
                )}
            </Grid>

            {/* Create Dialog */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>إنشاء قاعدة أتمتة</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField
                            fullWidth
                            label="اسم القاعدة"
                            value={newAutomation.name}
                            onChange={(e) => setNewAutomation({ ...newAutomation, name: e.target.value })}
                        />
                        <TextField
                            fullWidth
                            multiline
                            rows={2}
                            label="الوصف"
                            value={newAutomation.description}
                            onChange={(e) => setNewAutomation({ ...newAutomation, description: e.target.value })}
                        />
                        <FormControl fullWidth>
                            <InputLabel>المشغل (Trigger)</InputLabel>
                            <Select
                                value={newAutomation.trigger}
                                label="المشغل (Trigger)"
                                onChange={(e) => setNewAutomation({ ...newAutomation, trigger: e.target.value })}
                            >
                                {Object.entries(triggerLabels).map(([key, label]) => (
                                    <MenuItem key={key} value={key}>{label}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl fullWidth>
                            <InputLabel>الإجراء (Action)</InputLabel>
                            <Select
                                value={newAutomation.action}
                                label="الإجراء (Action)"
                                onChange={(e) => setNewAutomation({ ...newAutomation, action: e.target.value })}
                            >
                                {Object.entries(actionLabels).map(([key, label]) => (
                                    <MenuItem key={key} value={key}>{label}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
                    <Button
                        variant="contained"
                        onClick={() => createMutation.mutate(newAutomation)}
                        disabled={!newAutomation.name || createMutation.isPending}
                    >
                        إنشاء
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

// ============ 7. REPORTS GENERATOR ============
export const ReportsGenerator: React.FC = () => {
    const theme = useTheme();
    const [reportConfig, setReportConfig] = useState({
        startDate: '',
        endDate: '',
        includeMetrics: true,
        includeTeam: true,
        includeTime: true,
        includeTrends: true,
    });
    const [report, setReport] = useState<any>(null);

    const generateMutation = useMutation({
        mutationFn: () => tasksApi.generateReport(reportConfig),
        onSuccess: (res: any) => {
            setReport(res?.data || res);
        },
    });

    return (
        <Box>
            <Box sx={{ mb: 3 }}>
                <Typography variant="h5" fontWeight={700}>التقارير</Typography>
                <Typography variant="body2" color="text.secondary">إنشاء تقارير تحليلية للمهام</Typography>
            </Box>

            <Grid container spacing={3}>
                {/* Config */}
                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 3, borderRadius: 3 }}>
                        <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>إعدادات التقرير</Typography>
                        <Stack spacing={2}>
                            <TextField
                                fullWidth
                                type="date"
                                label="من تاريخ"
                                InputLabelProps={{ shrink: true }}
                                value={reportConfig.startDate}
                                onChange={(e) => setReportConfig({ ...reportConfig, startDate: e.target.value })}
                            />
                            <TextField
                                fullWidth
                                type="date"
                                label="إلى تاريخ"
                                InputLabelProps={{ shrink: true }}
                                value={reportConfig.endDate}
                                onChange={(e) => setReportConfig({ ...reportConfig, endDate: e.target.value })}
                            />
                            <FormControlLabel
                                control={<Checkbox checked={reportConfig.includeMetrics} onChange={(e) => setReportConfig({ ...reportConfig, includeMetrics: e.target.checked })} />}
                                label="تضمين المقاييس"
                            />
                            <FormControlLabel
                                control={<Checkbox checked={reportConfig.includeTeam} onChange={(e) => setReportConfig({ ...reportConfig, includeTeam: e.target.checked })} />}
                                label="تضمين أداء الفريق"
                            />
                            <FormControlLabel
                                control={<Checkbox checked={reportConfig.includeTime} onChange={(e) => setReportConfig({ ...reportConfig, includeTime: e.target.checked })} />}
                                label="تضمين تحليل الوقت"
                            />
                            <FormControlLabel
                                control={<Checkbox checked={reportConfig.includeTrends} onChange={(e) => setReportConfig({ ...reportConfig, includeTrends: e.target.checked })} />}
                                label="تضمين التوجهات"
                            />
                            <Button
                                variant="contained"
                                fullWidth
                                startIcon={<ReportIcon />}
                                onClick={() => generateMutation.mutate()}
                                disabled={generateMutation.isPending}
                            >
                                {generateMutation.isPending ? 'جاري الإنشاء...' : 'إنشاء التقرير'}
                            </Button>
                        </Stack>
                    </Paper>
                </Grid>

                {/* Report Display */}
                <Grid item xs={12} md={8}>
                    {report ? (
                        <Paper sx={{ p: 3, borderRadius: 3 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                                <Typography variant="h6" fontWeight={600}>نتائج التقرير</Typography>
                                <Chip label={`تم الإنشاء: ${new Date(report.generatedAt).toLocaleString('ar-SA')}`} size="small" />
                            </Box>
                            {report.summary && (
                                <Grid container spacing={2} sx={{ mb: 3 }}>
                                    <Grid item xs={6} md={3}>
                                        <Card sx={{ bgcolor: alpha('#3B82F6', 0.08), borderRadius: 2 }}>
                                            <CardContent sx={{ textAlign: 'center' }}>
                                                <Typography variant="h4" fontWeight={800} color="#3B82F6">{report.summary.total || 0}</Typography>
                                                <Typography variant="caption">إجمالي المهام</Typography>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                    <Grid item xs={6} md={3}>
                                        <Card sx={{ bgcolor: alpha('#10B981', 0.08), borderRadius: 2 }}>
                                            <CardContent sx={{ textAlign: 'center' }}>
                                                <Typography variant="h4" fontWeight={800} color="#10B981">{report.summary.completed || 0}</Typography>
                                                <Typography variant="caption">مكتملة</Typography>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                    <Grid item xs={6} md={3}>
                                        <Card sx={{ bgcolor: alpha('#F59E0B', 0.08), borderRadius: 2 }}>
                                            <CardContent sx={{ textAlign: 'center' }}>
                                                <Typography variant="h4" fontWeight={800} color="#F59E0B">{report.summary.inProgress || 0}</Typography>
                                                <Typography variant="caption">قيد التنفيذ</Typography>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                    <Grid item xs={6} md={3}>
                                        <Card sx={{ bgcolor: alpha('#EF4444', 0.08), borderRadius: 2 }}>
                                            <CardContent sx={{ textAlign: 'center' }}>
                                                <Typography variant="h4" fontWeight={800} color="#EF4444">{report.summary.overdue || 0}</Typography>
                                                <Typography variant="caption">متأخرة</Typography>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                </Grid>
                            )}
                            <Button startIcon={<DownloadIcon />} variant="outlined">
                                تصدير PDF
                            </Button>
                        </Paper>
                    ) : (
                        <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3 }}>
                            <ReportIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                            <Typography variant="h6" color="text.secondary">اختر الإعدادات وانقر "إنشاء التقرير"</Typography>
                        </Paper>
                    )}
                </Grid>
            </Grid>
        </Box>
    );
};
