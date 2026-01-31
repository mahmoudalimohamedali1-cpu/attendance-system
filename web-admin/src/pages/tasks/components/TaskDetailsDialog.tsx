import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    Box,
    Tabs,
    Tab,
    Typography,
    TextField,
    Button,
    Chip,
    Avatar,
    IconButton,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    Checkbox,
    LinearProgress,
    Divider,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Stack,
    Paper,
    CircularProgress,
    Autocomplete,
    Tooltip,
    Badge,
    useTheme,
    alpha,
} from '@mui/material';
import {
    Close as CloseIcon,
    Edit as EditIcon,
    Save as SaveIcon,
    Add as AddIcon,
    Delete as DeleteIcon,
    CheckCircle as CheckIcon,
    AccessTime as TimeIcon,
    Comment as CommentIcon,
    AttachFile as AttachIcon,
    Link as LinkIcon,
    Flag as FlagIcon,
    Send as SendIcon,
    PlayArrow as PlayIcon,
    Stop as StopIcon,
    Person as PersonIcon,
    Label as LabelIcon,
    CloudUpload as UploadIcon,
    Download as DownloadIcon,
    Image as ImageIcon,
    InsertDriveFile as FileIcon,
    ThumbUp as ThumbUpIcon,
    CheckCircleOutline as ApproveIcon,
    Cancel as RejectIcon,
    VerifiedUser as EvidenceIcon,
    Reply as ReplyIcon,
} from '@mui/icons-material';
import { Task, TaskCategory, TaskChecklist, TaskComment, UserBrief } from '@/services/tasks.service';
import { usersService, User } from '@/services/users.service';
import {
    useTask,
    useUpdateTask,
    useAddChecklist,
    useAddChecklistItem,
    useToggleChecklistItem,
    useDeleteChecklistItem,
    useAddComment,
    useDeleteComment,
    useAddTimeLog,
    useAddDependency,
    useRemoveDependency,
    useTaskCategories,
    useTasks,
    useUploadAttachment,
    useDeleteAttachment,
} from '../hooks/useTasks';

// Tab Panel Component
interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
    <Box hidden={value !== index} sx={{ height: '100%', overflow: 'auto' }}>
        {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </Box>
);

// Status Configuration
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    BACKLOG: { label: 'قائمة الانتظار', color: '#6B7280' },
    TODO: { label: 'للعمل', color: '#3B82F6' },
    IN_PROGRESS: { label: 'جاري العمل', color: '#F59E0B' },
    PENDING_REVIEW: { label: 'في انتظار المراجعة', color: '#EC4899' },
    IN_REVIEW: { label: 'قيد المراجعة', color: '#8B5CF6' },
    APPROVED: { label: 'معتمد', color: '#059669' },
    REJECTED: { label: 'مرفوض', color: '#DC2626' },
    BLOCKED: { label: 'محظور', color: '#EF4444' },
    COMPLETED: { label: 'مكتمل', color: '#10B981' },
    CANCELLED: { label: 'ملغي', color: '#9CA3AF' },
    DELETED: { label: 'محذوف', color: '#6B7280' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
    URGENT: { label: 'عاجل', color: '#DC2626', icon: '🔥' },
    HIGH: { label: 'عالي', color: '#F59E0B', icon: '⚡' },
    MEDIUM: { label: 'متوسط', color: '#3B82F6', icon: '📌' },
    LOW: { label: 'منخفض', color: '#6B7280', icon: '💤' },
};

// Default Tags
const DEFAULT_TAGS = [
    { name: 'Bug', color: '#EF4444' },
    { name: 'Feature', color: '#10B981' },
    { name: 'Enhancement', color: '#3B82F6' },
    { name: 'Documentation', color: '#8B5CF6' },
    { name: 'عاجل', color: '#DC2626' },
    { name: 'متابعة', color: '#F59E0B' },
];

interface TaskDetailsDialogProps {
    taskId: string | null;
    open: boolean;
    onClose: () => void;
}

export const TaskDetailsDialog: React.FC<TaskDetailsDialogProps> = ({ taskId, open, onClose }) => {
    const theme = useTheme();
    const [tabValue, setTabValue] = useState(0);
    const [isEditing, setIsEditing] = useState(false);
    const [editedTask, setEditedTask] = useState<Partial<Task>>({});

    // Form states
    const [newChecklistTitle, setNewChecklistTitle] = useState('');
    const [newItemContent, setNewItemContent] = useState<Record<string, string>>({});
    const [newComment, setNewComment] = useState('');
    const [newTimeLog, setNewTimeLog] = useState({ duration: '', description: '' });
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [timerSeconds, setTimerSeconds] = useState(0);
    const [employees, setEmployees] = useState<User[]>([]);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);

    // Hooks
    const { data: task, isLoading, refetch } = useTask(taskId || '');
    const { data: categories } = useTaskCategories();
    const { data: allTasks } = useTasks();
    const updateTask = useUpdateTask();
    const addChecklist = useAddChecklist();
    const addChecklistItem = useAddChecklistItem();
    const toggleChecklistItem = useToggleChecklistItem();
    const deleteChecklistItem = useDeleteChecklistItem();
    const addComment = useAddComment();
    const deleteComment = useDeleteComment();
    const addTimeLog = useAddTimeLog();
    const addDependency = useAddDependency();
    const removeDependency = useRemoveDependency();
    const uploadAttachment = useUploadAttachment();
    const deleteAttachment = useDeleteAttachment();

    // File input ref
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Load employees
    useEffect(() => {
        usersService.getEmployees().then(setEmployees).catch(console.error);
    }, []);

    // Timer effect
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isTimerRunning) {
            interval = setInterval(() => setTimerSeconds(s => s + 1), 1000);
        }
        return () => clearInterval(interval);
    }, [isTimerRunning]);

    // Initialize tags from task
    useEffect(() => {
        if (task?.tags) {
            setSelectedTags(task.tags);
        }
    }, [task?.tags]);

    const formatTime = (seconds: number) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleSave = () => {
        if (taskId && Object.keys(editedTask).length > 0) {
            const dataToSave = { ...editedTask, tags: selectedTags };
            updateTask.mutate({ id: taskId, data: dataToSave }, {
                onSuccess: () => {
                    setIsEditing(false);
                    setEditedTask({});
                    refetch();
                },
            });
        }
    };

    const handleAddChecklist = () => {
        if (taskId && newChecklistTitle.trim()) {
            addChecklist.mutate({ taskId, title: newChecklistTitle }, {
                onSuccess: () => { setNewChecklistTitle(''); refetch(); },
            });
        }
    };

    const handleAddChecklistItem = (checklistId: string) => {
        const content = newItemContent[checklistId];
        if (content?.trim()) {
            addChecklistItem.mutate({ checklistId, content }, {
                onSuccess: () => { setNewItemContent({ ...newItemContent, [checklistId]: '' }); refetch(); },
            });
        }
    };

    const handleToggleItem = (itemId: string, isCompleted: boolean) => {
        toggleChecklistItem.mutate({ itemId, isCompleted: !isCompleted }, { onSuccess: refetch });
    };

    const handleAddComment = () => {
        if (taskId && newComment.trim()) {
            // Extract @mentions
            const mentions = newComment.match(/@(\w+)/g)?.map(m => m.slice(1)) || [];
            addComment.mutate({ taskId, content: newComment, mentions }, {
                onSuccess: () => { setNewComment(''); refetch(); },
            });
        }
    };

    const handleStartTimer = () => {
        setIsTimerRunning(true);
        setTimerSeconds(0);
    };

    const handleStopTimer = () => {
        setIsTimerRunning(false);
        if (taskId && timerSeconds > 0) {
            addTimeLog.mutate({
                taskId,
                data: {
                    startTime: new Date(Date.now() - timerSeconds * 1000).toISOString(),
                    duration: Math.ceil(timerSeconds / 60),
                    description: 'تسجيل تلقائي',
                },
            }, { onSuccess: () => { setTimerSeconds(0); refetch(); } });
        }
    };

    const handleAddTimeLog = () => {
        if (taskId && newTimeLog.duration) {
            addTimeLog.mutate({
                taskId,
                data: {
                    startTime: new Date().toISOString(),
                    duration: parseInt(newTimeLog.duration) || 0,
                    description: newTimeLog.description,
                },
            }, { onSuccess: () => { setNewTimeLog({ duration: '', description: '' }); refetch(); } });
        }
    };

    // File upload handler
    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && taskId) {
            uploadAttachment.mutate({ taskId, file }, {
                onSuccess: () => {
                    refetch();
                    if (fileInputRef.current) fileInputRef.current.value = '';
                },
            });
        }
    };

    const handleDeleteAttachment = (attachmentId: string) => {
        if (confirm('هل أنت متأكد من حذف هذا المرفق؟')) {
            deleteAttachment.mutate(attachmentId, { onSuccess: refetch });
        }
    };
    if (!open) return null;

    const completedItems = task?.checklists?.flatMap(c => c.items).filter(i => i.isCompleted).length || 0;
    const totalItems = task?.checklists?.flatMap(c => c.items).length || 0;
    const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
    const totalTimeLogged = ((task as any)?.timeLogs?.reduce((acc: number, log: any) => acc + (log.duration || 0), 0) || 0);

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="lg"
            fullWidth
            PaperProps={{
                sx: {
                    height: '85vh',
                    background: `linear-gradient(180deg, ${alpha(theme.palette.background.paper, 0.98)} 0%, ${theme.palette.background.paper} 100%)`,
                }
            }}
        >
            {/* Header */}
            <DialogTitle sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                pb: 1,
                borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                    {isLoading ? (
                        <CircularProgress size={24} />
                    ) : (
                        <>
                            <Chip
                                size="small"
                                label={STATUS_CONFIG[task?.status || 'TODO']?.label}
                                sx={{
                                    bgcolor: alpha(STATUS_CONFIG[task?.status || 'TODO']?.color || '#000', 0.15),
                                    color: STATUS_CONFIG[task?.status || 'TODO']?.color,
                                    fontWeight: 700,
                                    fontSize: '0.75rem',
                                }}
                            />
                            <Chip
                                size="small"
                                label={`${PRIORITY_CONFIG[task?.priority || 'MEDIUM']?.icon} ${PRIORITY_CONFIG[task?.priority || 'MEDIUM']?.label}`}
                                sx={{
                                    bgcolor: alpha(PRIORITY_CONFIG[task?.priority || 'MEDIUM']?.color || '#000', 0.15),
                                    color: PRIORITY_CONFIG[task?.priority || 'MEDIUM']?.color,
                                    fontWeight: 600,
                                    fontSize: '0.75rem',
                                }}
                            />
                            <Typography variant="h6" fontWeight={700} sx={{ flex: 1 }}>
                                {task?.title || 'تفاصيل المهمة'}
                            </Typography>
                        </>
                    )}
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    {!isEditing ? (
                        <Tooltip title="تعديل">
                            <IconButton onClick={() => { setIsEditing(true); setEditedTask(task || {}); setSelectedTags(task?.tags || []); }}>
                                <EditIcon />
                            </IconButton>
                        </Tooltip>
                    ) : (
                        <Tooltip title="حفظ">
                            <IconButton onClick={handleSave} color="primary" disabled={updateTask.isPending}>
                                <SaveIcon />
                            </IconButton>
                        </Tooltip>
                    )}
                    <IconButton onClick={onClose}>
                        <CloseIcon />
                    </IconButton>
                </Box>
            </DialogTitle>

            {/* Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
                <Tabs
                    value={tabValue}
                    onChange={(_, v) => setTabValue(v)}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{
                        '& .MuiTab-root': {
                            minHeight: 48,
                            textTransform: 'none',
                            fontWeight: 600,
                            fontSize: '0.875rem',
                        },
                    }}
                >
                    <Tab icon={<FlagIcon />} iconPosition="start" label="نظرة عامة" />
                    <Tab
                        icon={<Badge badgeContent={totalItems} color="primary"><CheckIcon /></Badge>}
                        iconPosition="start"
                        label="المهام الفرعية"
                    />
                    <Tab
                        icon={<Badge badgeContent={task?._count?.comments || 0} color="primary"><CommentIcon /></Badge>}
                        iconPosition="start"
                        label="التعليقات"
                    />
                    <Tab
                        icon={<Badge badgeContent={totalTimeLogged} color="primary"><TimeIcon /></Badge>}
                        iconPosition="start"
                        label="الوقت"
                    />
                    <Tab
                        icon={<Badge badgeContent={task?._count?.attachments || 0} color="primary"><AttachIcon /></Badge>}
                        iconPosition="start"
                        label="المرفقات"
                    />
                    <Tab icon={<EvidenceIcon />} iconPosition="start" label="الإثباتات" />
                    <Tab icon={<LinkIcon />} iconPosition="start" label="الاعتمادات" />
                </Tabs>
            </Box>

            <DialogContent sx={{ p: 0, height: 'calc(100% - 120px)', overflow: 'hidden' }}>
                {/* Global Hidden File Input - accessible from all tabs */}
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                />

                {isLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <>
                        {/* ========== OVERVIEW TAB ========== */}
                        <TabPanel value={tabValue} index={0}>
                            <Stack spacing={3}>
                                {/* Title */}
                                <Box>
                                    <Typography variant="subtitle2" color="text.secondary" gutterBottom fontWeight={600}>
                                        العنوان
                                    </Typography>
                                    {isEditing ? (
                                        <TextField
                                            fullWidth
                                            value={editedTask.title || ''}
                                            onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
                                            variant="outlined"
                                            size="small"
                                        />
                                    ) : (
                                        <Typography variant="h6" fontWeight={600}>{task?.title}</Typography>
                                    )}
                                </Box>

                                {/* Description */}
                                <Box>
                                    <Typography variant="subtitle2" color="text.secondary" gutterBottom fontWeight={600}>
                                        الوصف
                                    </Typography>
                                    {isEditing ? (
                                        <TextField
                                            fullWidth
                                            multiline
                                            rows={3}
                                            value={editedTask.description || ''}
                                            onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
                                            variant="outlined"
                                            size="small"
                                        />
                                    ) : (
                                        <Typography color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                                            {task?.description || 'لا يوجد وصف'}
                                        </Typography>
                                    )}
                                </Box>

                                <Divider />

                                {/* Status & Priority Row */}
                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                    <FormControl fullWidth size="small">
                                        <InputLabel>الحالة</InputLabel>
                                        <Select
                                            value={isEditing ? (editedTask.status || task?.status) : task?.status}
                                            label="الحالة"
                                            disabled={!isEditing}
                                            onChange={(e) => setEditedTask({ ...editedTask, status: e.target.value as any })}
                                        >
                                            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                                                <MenuItem key={key} value={key}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: config.color }} />
                                                        {config.label}
                                                    </Box>
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>

                                    <FormControl fullWidth size="small">
                                        <InputLabel>الأولوية</InputLabel>
                                        <Select
                                            value={isEditing ? (editedTask.priority || task?.priority) : task?.priority}
                                            label="الأولوية"
                                            disabled={!isEditing}
                                            onChange={(e) => setEditedTask({ ...editedTask, priority: e.target.value as any })}
                                        >
                                            {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                                                <MenuItem key={key} value={key}>
                                                    {config.icon} {config.label}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Stack>

                                {/* Assignee */}
                                <Box>
                                    <Typography variant="subtitle2" color="text.secondary" gutterBottom fontWeight={600}>
                                        <PersonIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                                        المسؤول
                                    </Typography>
                                    {isEditing ? (
                                        <Autocomplete
                                            options={employees}
                                            getOptionLabel={(option) => `${option.firstName} ${option.lastName}`}
                                            value={employees.find(e => e.id === (editedTask.assigneeId || task?.assigneeId)) || null}
                                            onChange={(_, newValue) => setEditedTask({ ...editedTask, assigneeId: newValue?.id })}
                                            renderInput={(params) => <TextField {...params} size="small" placeholder="اختر المسؤول" />}
                                            renderOption={(props, option) => (
                                                <li {...props}>
                                                    <Avatar sx={{ width: 28, height: 28, mr: 1, fontSize: '0.75rem' }}>
                                                        {option.firstName?.[0]}
                                                    </Avatar>
                                                    {option.firstName} {option.lastName}
                                                </li>
                                            )}
                                        />
                                    ) : task?.assignee ? (
                                        <Chip
                                            avatar={<Avatar sx={{ width: 24, height: 24 }}>{task.assignee.firstName?.[0]}</Avatar>}
                                            label={`${task.assignee.firstName} ${task.assignee.lastName}`}
                                            variant="outlined"
                                        />
                                    ) : (
                                        <Typography color="text.secondary" variant="body2">غير معين</Typography>
                                    )}
                                </Box>

                                {/* Dates */}
                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                    <TextField
                                        fullWidth
                                        type="date"
                                        label="تاريخ البداية"
                                        InputLabelProps={{ shrink: true }}
                                        size="small"
                                        value={isEditing ? (editedTask.startDate?.split('T')[0] || '') : (task?.startDate?.split('T')[0] || '')}
                                        disabled={!isEditing}
                                        onChange={(e) => setEditedTask({ ...editedTask, startDate: e.target.value })}
                                    />
                                    <TextField
                                        fullWidth
                                        type="date"
                                        label="تاريخ الاستحقاق"
                                        InputLabelProps={{ shrink: true }}
                                        size="small"
                                        value={isEditing ? (editedTask.dueDate?.split('T')[0] || '') : (task?.dueDate?.split('T')[0] || '')}
                                        disabled={!isEditing}
                                        onChange={(e) => setEditedTask({ ...editedTask, dueDate: e.target.value })}
                                    />
                                </Stack>

                                {/* Category */}
                                <FormControl fullWidth size="small">
                                    <InputLabel>الفئة</InputLabel>
                                    <Select
                                        value={isEditing ? (editedTask.categoryId || task?.categoryId || '') : (task?.categoryId || '')}
                                        label="الفئة"
                                        disabled={!isEditing}
                                        onChange={(e) => setEditedTask({ ...editedTask, categoryId: e.target.value })}
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

                                {/* Recurrence Type */}
                                <FormControl fullWidth size="small">
                                    <InputLabel>🔄 التكرار</InputLabel>
                                    <Select
                                        value={isEditing ? (editedTask.recurrenceType || task?.recurrenceType || '') : (task?.recurrenceType || '')}
                                        label="🔄 التكرار"
                                        disabled={!isEditing}
                                        onChange={(e) => setEditedTask({ ...editedTask, recurrenceType: e.target.value || null })}
                                    >
                                        <MenuItem value="">بدون تكرار</MenuItem>
                                        <MenuItem value="DAILY">يومياً</MenuItem>
                                        <MenuItem value="WEEKLY">أسبوعياً</MenuItem>
                                        <MenuItem value="BIWEEKLY">كل أسبوعين</MenuItem>
                                        <MenuItem value="MONTHLY">شهرياً</MenuItem>
                                        <MenuItem value="QUARTERLY">ربع سنوي</MenuItem>
                                        <MenuItem value="YEARLY">سنوياً</MenuItem>
                                    </Select>
                                </FormControl>

                                {/* Tags */}
                                <Box>
                                    <Typography variant="subtitle2" color="text.secondary" gutterBottom fontWeight={600}>
                                        <LabelIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                                        التصنيفات
                                    </Typography>
                                    {isEditing ? (
                                        <Autocomplete
                                            multiple
                                            freeSolo
                                            options={DEFAULT_TAGS.map(t => t.name)}
                                            value={selectedTags}
                                            onChange={(_, newValue) => setSelectedTags(newValue)}
                                            renderInput={(params) => <TextField {...params} size="small" placeholder="أضف تصنيف" />}
                                            renderTags={(value, getTagProps) =>
                                                value.map((option, index) => {
                                                    const tagConfig = DEFAULT_TAGS.find(t => t.name === option);
                                                    return (
                                                        <Chip
                                                            {...getTagProps({ index })}
                                                            key={option}
                                                            label={option}
                                                            size="small"
                                                            sx={{
                                                                bgcolor: alpha(tagConfig?.color || '#6B7280', 0.15),
                                                                color: tagConfig?.color || '#6B7280',
                                                            }}
                                                        />
                                                    );
                                                })
                                            }
                                        />
                                    ) : (
                                        <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
                                            {task?.tags?.map((tag) => {
                                                const tagConfig = DEFAULT_TAGS.find(t => t.name === tag);
                                                return (
                                                    <Chip
                                                        key={tag}
                                                        label={tag}
                                                        size="small"
                                                        sx={{
                                                            bgcolor: alpha(tagConfig?.color || '#6B7280', 0.15),
                                                            color: tagConfig?.color || '#6B7280',
                                                        }}
                                                    />
                                                );
                                            }) || <Typography variant="body2" color="text.secondary">لا توجد تصنيفات</Typography>}
                                        </Stack>
                                    )}
                                </Box>

                                {/* Progress */}
                                {totalItems > 0 && (
                                    <Box>
                                        <Typography variant="subtitle2" color="text.secondary" gutterBottom fontWeight={600}>
                                            التقدم
                                        </Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <LinearProgress
                                                variant="determinate"
                                                value={progress}
                                                sx={{
                                                    flex: 1,
                                                    height: 10,
                                                    borderRadius: 5,
                                                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                                                    '& .MuiLinearProgress-bar': {
                                                        borderRadius: 5,
                                                        background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                                                    },
                                                }}
                                            />
                                            <Typography variant="body2" fontWeight={700} color="primary">
                                                {progress}%
                                            </Typography>
                                        </Box>
                                    </Box>
                                )}

                                {/* Workflow Actions - Phase 4 */}
                                {task?.status === 'IN_REVIEW' && (
                                    <Paper sx={{
                                        p: 2,
                                        mt: 2,
                                        background: `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.1)} 0%, ${alpha(theme.palette.warning.main, 0.05)} 100%)`,
                                        border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}`,
                                    }}>
                                        <Typography variant="subtitle2" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            ⚡ إجراءات المراجعة
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                            هذه المهمة في انتظار المراجعة والاعتماد
                                        </Typography>
                                        <Stack direction="row" spacing={2}>
                                            <Button
                                                variant="contained"
                                                color="success"
                                                startIcon={<ApproveIcon />}
                                                onClick={() => {
                                                    if (confirm('هل تريد اعتماد هذه المهمة؟')) {
                                                        updateTask.mutate({ id: task.id, data: { status: 'COMPLETED' } }, { onSuccess: refetch });
                                                    }
                                                }}
                                                sx={{ flex: 1 }}
                                            >
                                                اعتماد ✅
                                            </Button>
                                            <Button
                                                variant="outlined"
                                                color="error"
                                                startIcon={<RejectIcon />}
                                                onClick={() => {
                                                    const reason = prompt('أدخل سبب الرفض:');
                                                    if (reason) {
                                                        updateTask.mutate({ id: task.id, data: { status: 'IN_PROGRESS' } }, { onSuccess: refetch });
                                                    }
                                                }}
                                                sx={{ flex: 1 }}
                                            >
                                                رفض ❌
                                            </Button>
                                        </Stack>
                                    </Paper>
                                )}
                            </Stack>
                        </TabPanel>

                        {/* ========== CHECKLISTS TAB ========== */}
                        <TabPanel value={tabValue} index={1}>
                            <Stack spacing={2}>
                                {/* Add new checklist */}
                                <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.primary.main, 0.03), border: `1px dashed ${alpha(theme.palette.primary.main, 0.2)}` }}>
                                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                                        إضافة قائمة جديدة
                                    </Typography>
                                    <Stack direction="row" spacing={1}>
                                        <TextField
                                            fullWidth
                                            size="small"
                                            placeholder="عنوان القائمة..."
                                            value={newChecklistTitle}
                                            onChange={(e) => setNewChecklistTitle(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && handleAddChecklist()}
                                        />
                                        <Button
                                            variant="contained"
                                            onClick={handleAddChecklist}
                                            disabled={!newChecklistTitle.trim() || addChecklist.isPending}
                                            sx={{ minWidth: 100 }}
                                        >
                                            إضافة
                                        </Button>
                                    </Stack>
                                </Paper>

                                {/* Checklists */}
                                {task?.checklists?.map((checklist: TaskChecklist) => {
                                    const checklistCompleted = checklist.items.filter(i => i.isCompleted).length;
                                    const checklistTotal = checklist.items.length;
                                    const checklistProgress = checklistTotal > 0 ? Math.round((checklistCompleted / checklistTotal) * 100) : 0;

                                    return (
                                        <Paper key={checklist.id} sx={{ p: 2, border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                                <Typography variant="subtitle1" fontWeight={700}>
                                                    {checklist.title}
                                                </Typography>
                                                <Chip
                                                    size="small"
                                                    label={`${checklistCompleted}/${checklistTotal}`}
                                                    color={checklistProgress === 100 ? 'success' : 'default'}
                                                />
                                            </Box>
                                            <LinearProgress
                                                variant="determinate"
                                                value={checklistProgress}
                                                sx={{ mb: 2, height: 6, borderRadius: 3 }}
                                                color={checklistProgress === 100 ? 'success' : 'primary'}
                                            />
                                            <List dense disablePadding>
                                                {checklist.items.map((item) => (
                                                    <ListItem
                                                        key={item.id}
                                                        sx={{
                                                            px: 0,
                                                            py: 0.5,
                                                            borderRadius: 1,
                                                            '&:hover': { bgcolor: alpha(theme.palette.action.hover, 0.5) },
                                                            '&:hover .delete-btn': { opacity: 1 },
                                                        }}
                                                    >
                                                        <Checkbox
                                                            checked={item.isCompleted}
                                                            onChange={() => handleToggleItem(item.id, item.isCompleted)}
                                                            size="small"
                                                            color="success"
                                                        />
                                                        <ListItemText
                                                            primary={item.content}
                                                            sx={{
                                                                textDecoration: item.isCompleted ? 'line-through' : 'none',
                                                                color: item.isCompleted ? 'text.disabled' : 'text.primary',
                                                            }}
                                                        />
                                                        <ListItemSecondaryAction>
                                                            <Tooltip title="حذف">
                                                                <IconButton
                                                                    size="small"
                                                                    className="delete-btn"
                                                                    onClick={() => {
                                                                        if (confirm('حذف هذا العنصر؟')) {
                                                                            deleteChecklistItem.mutate(item.id, { onSuccess: refetch });
                                                                        }
                                                                    }}
                                                                    sx={{ opacity: 0, transition: 'opacity 0.2s' }}
                                                                >
                                                                    <DeleteIcon fontSize="small" color="error" />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </ListItemSecondaryAction>
                                                    </ListItem>
                                                ))}
                                            </List>
                                            {/* Add new item */}
                                            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                                                <TextField
                                                    fullWidth
                                                    size="small"
                                                    placeholder="أضف عنصر جديد..."
                                                    value={newItemContent[checklist.id] || ''}
                                                    onChange={(e) => setNewItemContent({ ...newItemContent, [checklist.id]: e.target.value })}
                                                    onKeyPress={(e) => e.key === 'Enter' && handleAddChecklistItem(checklist.id)}
                                                />
                                                <IconButton
                                                    color="primary"
                                                    onClick={() => handleAddChecklistItem(checklist.id)}
                                                    disabled={!newItemContent[checklist.id]?.trim()}
                                                    size="small"
                                                >
                                                    <AddIcon />
                                                </IconButton>
                                            </Stack>
                                        </Paper>
                                    );
                                })}

                                {(!task?.checklists || task.checklists.length === 0) && (
                                    <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                                        <CheckIcon sx={{ fontSize: 48, opacity: 0.3, mb: 1 }} />
                                        <Typography>لا توجد قوائم مهام. أضف قائمة جديدة للبدء.</Typography>
                                    </Box>
                                )}
                            </Stack>
                        </TabPanel>

                        {/* ========== COMMENTS TAB ========== */}
                        <TabPanel value={tabValue} index={2}>
                            <Stack spacing={2}>
                                {/* Add comment */}
                                <Paper sx={{ p: 2, border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                                    <TextField
                                        fullWidth
                                        multiline
                                        rows={3}
                                        placeholder="أضف تعليقاً... استخدم @ للإشارة إلى شخص"
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        variant="outlined"
                                        size="small"
                                    />
                                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                                        <Button
                                            variant="contained"
                                            endIcon={<SendIcon />}
                                            onClick={handleAddComment}
                                            disabled={!newComment.trim() || addComment.isPending}
                                        >
                                            إرسال
                                        </Button>
                                    </Box>
                                </Paper>

                                {/* Comments list */}
                                {(task as any)?.comments?.map((comment: TaskComment) => (
                                    <Paper key={comment.id} sx={{ p: 2, border: `1px solid ${alpha(theme.palette.divider, 0.05)}` }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <Box sx={{ display: 'flex', gap: 1.5 }}>
                                                <Avatar sx={{ width: 36, height: 36, bgcolor: theme.palette.primary.main }}>
                                                    {comment.author?.firstName?.[0]}
                                                </Avatar>
                                                <Box>
                                                    <Typography variant="subtitle2" fontWeight={600}>
                                                        {comment.author?.firstName} {comment.author?.lastName}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {new Date(comment.createdAt).toLocaleString('ar-SA')}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                            <Tooltip title="حذف">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => deleteComment.mutate(comment.id, { onSuccess: refetch })}
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                        <Typography sx={{ mt: 1.5, whiteSpace: 'pre-wrap', pl: 6 }}>
                                            {comment.content}
                                        </Typography>
                                        {/* Reactions - Phase 7 */}
                                        <Box sx={{ display: 'flex', gap: 0.5, mt: 1, pl: 6 }}>
                                            {['👍', '❤️', '😊', '🎉'].map((emoji) => (
                                                <Chip
                                                    key={emoji}
                                                    label={emoji}
                                                    size="small"
                                                    variant="outlined"
                                                    onClick={() => {
                                                        // TODO: Call addReaction API
                                                        console.log('Add reaction', emoji, comment.id);
                                                    }}
                                                    sx={{
                                                        cursor: 'pointer',
                                                        '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.1) },
                                                    }}
                                                />
                                            ))}
                                            <Chip
                                                icon={<ReplyIcon sx={{ fontSize: 14 }} />}
                                                label="رد"
                                                size="small"
                                                variant="outlined"
                                                onClick={() => {
                                                    setNewComment(`@${comment.author?.firstName || ''} `);
                                                }}
                                                sx={{
                                                    cursor: 'pointer',
                                                    '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.1) },
                                                }}
                                            />
                                        </Box>
                                    </Paper>
                                ))}

                                {(!(task as any)?.comments || (task as any).comments.length === 0) && (
                                    <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                                        <CommentIcon sx={{ fontSize: 48, opacity: 0.3, mb: 1 }} />
                                        <Typography>لا توجد تعليقات بعد. كن أول من يعلق!</Typography>
                                    </Box>
                                )}
                            </Stack>
                        </TabPanel>

                        {/* ========== TIME TRACKING TAB ========== */}
                        <TabPanel value={tabValue} index={3}>
                            <Stack spacing={2}>
                                {/* Live Timer */}
                                <Paper sx={{
                                    p: 3,
                                    textAlign: 'center',
                                    background: isTimerRunning
                                        ? `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.1)} 0%, ${alpha(theme.palette.success.main, 0.05)} 100%)`
                                        : `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
                                    border: `1px solid ${alpha(isTimerRunning ? theme.palette.success.main : theme.palette.primary.main, 0.2)}`,
                                }}>
                                    <Typography variant="h2" fontWeight={700} sx={{ fontFamily: 'monospace', color: isTimerRunning ? 'success.main' : 'text.primary' }}>
                                        {formatTime(timerSeconds)}
                                    </Typography>
                                    <Box sx={{ mt: 2 }}>
                                        {!isTimerRunning ? (
                                            <Button
                                                variant="contained"
                                                color="success"
                                                startIcon={<PlayIcon />}
                                                onClick={handleStartTimer}
                                                size="large"
                                            >
                                                بدء المؤقت
                                            </Button>
                                        ) : (
                                            <Button
                                                variant="contained"
                                                color="error"
                                                startIcon={<StopIcon />}
                                                onClick={handleStopTimer}
                                                size="large"
                                            >
                                                إيقاف وحفظ
                                            </Button>
                                        )}
                                    </Box>
                                </Paper>

                                {/* Manual time entry */}
                                <Paper sx={{ p: 2, border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                                        تسجيل وقت يدوي
                                    </Typography>
                                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                        <TextField
                                            size="small"
                                            type="number"
                                            label="المدة (دقائق)"
                                            value={newTimeLog.duration}
                                            onChange={(e) => setNewTimeLog({ ...newTimeLog, duration: e.target.value })}
                                            sx={{ width: { xs: '100%', sm: 150 } }}
                                        />
                                        <TextField
                                            size="small"
                                            fullWidth
                                            label="الوصف"
                                            value={newTimeLog.description}
                                            onChange={(e) => setNewTimeLog({ ...newTimeLog, description: e.target.value })}
                                        />
                                        <Button
                                            variant="outlined"
                                            onClick={handleAddTimeLog}
                                            disabled={!newTimeLog.duration || addTimeLog.isPending}
                                            sx={{ minWidth: 100 }}
                                        >
                                            إضافة
                                        </Button>
                                    </Stack>
                                </Paper>

                                {/* Time logs summary */}
                                <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.info.main, 0.05), border: `1px solid ${alpha(theme.palette.info.main, 0.2)}` }}>
                                    <Typography variant="subtitle2" color="info.main" fontWeight={600}>
                                        إجمالي الوقت المسجل: {totalTimeLogged} دقيقة ({Math.floor(totalTimeLogged / 60)} ساعة و {totalTimeLogged % 60} دقيقة)
                                    </Typography>
                                </Paper>

                                {/* Time logs list */}
                                {(task as any)?.timeLogs?.map((log: any) => (
                                    <Paper key={log.id} sx={{ p: 2, border: `1px solid ${alpha(theme.palette.divider, 0.05)}` }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                <Avatar sx={{ width: 32, height: 32, bgcolor: theme.palette.primary.main }}>
                                                    <TimeIcon fontSize="small" />
                                                </Avatar>
                                                <Box>
                                                    <Typography variant="subtitle2" fontWeight={600}>
                                                        {log.duration} دقيقة
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {log.description || 'بدون وصف'}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                            <Typography variant="caption" color="text.secondary">
                                                {new Date(log.startTime).toLocaleString('ar-SA')}
                                            </Typography>
                                        </Box>
                                    </Paper>
                                ))}

                                {(!(task as any)?.timeLogs || (task as any).timeLogs.length === 0) && (
                                    <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                                        <TimeIcon sx={{ fontSize: 48, opacity: 0.3, mb: 1 }} />
                                        <Typography>لم يتم تسجيل أي وقت بعد.</Typography>
                                    </Box>
                                )}
                            </Stack>
                        </TabPanel>

                        {/* ========== ATTACHMENTS TAB ========== */}
                        <TabPanel value={tabValue} index={4}>
                            <Stack spacing={2}>

                                {/* Upload area */}
                                <Paper
                                    onClick={() => fileInputRef.current?.click()}
                                    sx={{
                                        p: 4,
                                        textAlign: 'center',
                                        border: `2px dashed ${alpha(theme.palette.primary.main, 0.3)}`,
                                        bgcolor: alpha(theme.palette.primary.main, 0.02),
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        '&:hover': {
                                            borderColor: theme.palette.primary.main,
                                            bgcolor: alpha(theme.palette.primary.main, 0.05),
                                        },
                                    }}
                                >
                                    {uploadAttachment.isPending ? (
                                        <CircularProgress size={48} />
                                    ) : (
                                        <>
                                            <UploadIcon sx={{ fontSize: 48, color: 'primary.main', opacity: 0.5, mb: 1 }} />
                                            <Typography variant="subtitle1" fontWeight={600}>
                                                اسحب الملفات هنا أو انقر للرفع
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                PNG, JPG, PDF, DOC, Excel حتى 10MB
                                            </Typography>
                                        </>
                                    )}
                                </Paper>

                                {/* Attachments list */}
                                {(task as any)?.attachments?.map((attachment: any) => (
                                    <Paper key={attachment.id} sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
                                            {attachment.mimeType?.startsWith('image') ? <ImageIcon color="primary" /> : <FileIcon color="primary" />}
                                        </Avatar>
                                        <Box sx={{ flex: 1 }}>
                                            <Typography variant="subtitle2" fontWeight={600}>{attachment.fileName}</Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {(attachment.fileSize / 1024).toFixed(1)} KB • {new Date(attachment.createdAt).toLocaleDateString('ar-SA')}
                                                {attachment.uploadedBy && ` • ${attachment.uploadedBy.firstName} ${attachment.uploadedBy.lastName}`}
                                            </Typography>
                                        </Box>
                                        <Tooltip title="تحميل">
                                            <IconButton
                                                color="primary"
                                                component="a"
                                                href={attachment.storagePath}
                                                target="_blank"
                                                download
                                            >
                                                <DownloadIcon />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="حذف">
                                            <IconButton
                                                color="error"
                                                onClick={() => handleDeleteAttachment(attachment.id)}
                                                disabled={deleteAttachment.isPending}
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        </Tooltip>
                                    </Paper>
                                ))}

                                {(!(task as any)?.attachments || (task as any).attachments.length === 0) && (
                                    <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                                        <AttachIcon sx={{ fontSize: 48, opacity: 0.3, mb: 1 }} />
                                        <Typography>لا توجد مرفقات. ارفع ملفاً للبدء.</Typography>
                                    </Box>
                                )}
                            </Stack>
                        </TabPanel>

                        {/* ========== EVIDENCE TAB - Phase 5 ========== */}
                        <TabPanel value={tabValue} index={5}>
                            <Stack spacing={2}>
                                <Paper sx={{
                                    p: 3,
                                    textAlign: 'center',
                                    background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.1)} 0%, ${alpha(theme.palette.success.main, 0.05)} 100%)`,
                                    border: `2px dashed ${alpha(theme.palette.success.main, 0.3)}`,
                                }}>
                                    <EvidenceIcon sx={{ fontSize: 48, color: 'success.main', opacity: 0.5, mb: 1 }} />
                                    <Typography variant="h6" fontWeight={700} gutterBottom>
                                        إثبات إنجاز المهمة
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                        أرفق صور أو ملفات كدليل على إتمام المهمة
                                    </Typography>
                                    <Button
                                        variant="contained"
                                        color="success"
                                        startIcon={<UploadIcon />}
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        رفع إثبات
                                    </Button>
                                </Paper>

                                {/* GPS Location */}
                                <Paper sx={{ p: 2, border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                                        📍 الموقع الجغرافي
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        يمكنك إرفاق موقعك الحالي كإثبات على تواجدك في موقع العمل
                                    </Typography>
                                    <Button
                                        variant="outlined"
                                        sx={{ mt: 1 }}
                                        onClick={() => {
                                            if (navigator.geolocation) {
                                                navigator.geolocation.getCurrentPosition(
                                                    (pos) => alert(`الموقع: ${pos.coords.latitude}, ${pos.coords.longitude}`),
                                                    () => alert('لم يتم السماح بالوصول للموقع')
                                                );
                                            }
                                        }}
                                    >
                                        إرفاق موقعي الحالي
                                    </Button>
                                </Paper>

                                {/* Evidence list placeholder */}
                                <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                                    <EvidenceIcon sx={{ fontSize: 48, opacity: 0.3, mb: 1 }} />
                                    <Typography>لم يتم رفع أي إثباتات بعد</Typography>
                                </Box>
                            </Stack>
                        </TabPanel>

                        {/* ========== DEPENDENCIES TAB ========== */}
                        <TabPanel value={tabValue} index={6}>
                            <Stack spacing={2}>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                    ربط هذه المهمة بمهام أخرى
                                </Typography>

                                {/* Add dependency */}
                                <Paper sx={{ p: 2, border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                                        إضافة اعتماد
                                    </Typography>
                                    <Autocomplete
                                        options={(allTasks?.data || []).filter((t: Task) => t.id !== taskId)}
                                        getOptionLabel={(option: Task) => option.title}
                                        onChange={(_, newValue) => {
                                            if (newValue && taskId) {
                                                addDependency.mutate({ blockedTaskId: taskId, blockingTaskId: newValue.id }, { onSuccess: refetch });
                                            }
                                        }}
                                        renderInput={(params) => <TextField {...params} size="small" placeholder="ابحث عن مهمة..." />}
                                        renderOption={(props, option: Task) => (
                                            <li {...props}>
                                                <Chip
                                                    size="small"
                                                    label={STATUS_CONFIG[option.status]?.label}
                                                    sx={{ mr: 1, bgcolor: alpha(STATUS_CONFIG[option.status]?.color || '#000', 0.1) }}
                                                />
                                                {option.title}
                                            </li>
                                        )}
                                    />
                                </Paper>

                                {/* Blocking tasks */}
                                <Box>
                                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                                        🚫 محظورة بسبب (يجب إكمالها أولاً)
                                    </Typography>
                                    {(task as any)?.blockedBy?.length > 0 ? (
                                        (task as any).blockedBy.map((dep: any) => (
                                            <Paper key={dep.id} sx={{ p: 2, mb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <LinkIcon color="warning" />
                                                    <Typography>{dep.blockingTask?.title}</Typography>
                                                    <Chip
                                                        size="small"
                                                        label={STATUS_CONFIG[dep.blockingTask?.status]?.label}
                                                        sx={{ bgcolor: alpha(STATUS_CONFIG[dep.blockingTask?.status]?.color || '#000', 0.1) }}
                                                    />
                                                </Box>
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={() => taskId && removeDependency.mutate({ blockedTaskId: taskId, blockingTaskId: dep.blockingTask.id }, { onSuccess: refetch })}
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Paper>
                                        ))
                                    ) : (
                                        <Typography color="text.secondary" variant="body2">لا توجد مهام حاظرة</Typography>
                                    )}
                                </Box>

                                {/* Blocked tasks */}
                                <Box>
                                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                                        ⏳ تحظر المهام التالية
                                    </Typography>
                                    {(task as any)?.blocking?.length > 0 ? (
                                        (task as any).blocking.map((dep: any) => (
                                            <Paper key={dep.id} sx={{ p: 2, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <LinkIcon color="info" />
                                                <Typography>{dep.blockedTask?.title}</Typography>
                                                <Chip
                                                    size="small"
                                                    label={STATUS_CONFIG[dep.blockedTask?.status]?.label}
                                                    sx={{ bgcolor: alpha(STATUS_CONFIG[dep.blockedTask?.status]?.color || '#000', 0.1) }}
                                                />
                                            </Paper>
                                        ))
                                    ) : (
                                        <Typography color="text.secondary" variant="body2">لا تحظر أي مهام</Typography>
                                    )}
                                </Box>
                            </Stack>
                        </TabPanel>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default TaskDetailsDialog;
