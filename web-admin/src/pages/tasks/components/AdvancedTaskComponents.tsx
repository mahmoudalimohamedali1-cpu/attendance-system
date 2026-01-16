/**
 * Batch 1: Advanced Task Management Components
 * Smart Priority, Workload Analysis, Burndown, Velocity, AI Estimation
 */
import React, { useState } from 'react';
import {
    Box,
    Paper,
    Typography,
    Card,
    CardContent,
    Grid,
    Avatar,
    Chip,
    LinearProgress,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Stack,
    Skeleton,
    Tooltip,
    IconButton,
    useTheme,
    alpha,
    CircularProgress,
} from '@mui/material';
import {
    TrendingUp as TrendingUpIcon,
    TrendingDown as TrendingDownIcon,
    Speed as SpeedIcon,
    Psychology as AiIcon,
    AutoAwesome as AutoIcon,
    Timeline as TimelineIcon,
    Groups as TeamIcon,
    Flag as FlagIcon,
    Warning as WarningIcon,
    CheckCircle as CheckIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { enterpriseTasksApi, Task } from '@/services/tasks.service';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Legend,
    Area,
    AreaChart,
    ComposedChart,
} from 'recharts';

// ============ Smart Priority View ============
export const SmartPriorityView: React.FC = () => {
    const theme = useTheme();
    const { data, isLoading } = useQuery({
        queryKey: ['smart-priority'],
        queryFn: () => enterpriseTasksApi.getSmartPriority(),
    });

    if (isLoading) {
        return (
            <Grid container spacing={2}>
                {[1, 2, 3].map((i) => (
                    <Grid item xs={12} md={4} key={i}>
                        <Skeleton variant="rounded" height={120} />
                    </Grid>
                ))}
            </Grid>
        );
    }

    const result = data?.data || data;
    const tasks = result?.tasks || [];
    const summary = result?.summary || { total: 0, urgent: 0, high: 0, normal: 0 };

    return (
        <Box>
            {/* Summary Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} md={3}>
                    <Card sx={{
                        background: `linear-gradient(135deg, ${alpha('#F59E0B', 0.1)} 0%, ${alpha('#F59E0B', 0.05)} 100%)`,
                        border: `1px solid ${alpha('#F59E0B', 0.2)}`,
                    }}>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <Typography variant="h3" fontWeight={800} color="#F59E0B">{summary.urgent}</Typography>
                            <Typography variant="caption" color="text.secondary">🔥 عاجل جداً</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} md={3}>
                    <Card sx={{
                        background: `linear-gradient(135deg, ${alpha('#EF4444', 0.1)} 0%, ${alpha('#EF4444', 0.05)} 100%)`,
                        border: `1px solid ${alpha('#EF4444', 0.2)}`,
                    }}>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <Typography variant="h3" fontWeight={800} color="#EF4444">{summary.high}</Typography>
                            <Typography variant="caption" color="text.secondary">⚡ أولوية عالية</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} md={3}>
                    <Card sx={{
                        background: `linear-gradient(135deg, ${alpha('#3B82F6', 0.1)} 0%, ${alpha('#3B82F6', 0.05)} 100%)`,
                        border: `1px solid ${alpha('#3B82F6', 0.2)}`,
                    }}>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <Typography variant="h3" fontWeight={800} color="#3B82F6">{summary.normal}</Typography>
                            <Typography variant="caption" color="text.secondary">📌 عادي</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} md={3}>
                    <Card sx={{
                        background: `linear-gradient(135deg, ${alpha('#10B981', 0.1)} 0%, ${alpha('#10B981', 0.05)} 100%)`,
                        border: `1px solid ${alpha('#10B981', 0.2)}`,
                    }}>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <Typography variant="h3" fontWeight={800} color="#10B981">{summary.total}</Typography>
                            <Typography variant="caption" color="text.secondary">📋 الإجمالي</Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Priority List */}
            <Paper sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                    🧠 الأولوية الذكية
                </Typography>
                {tasks.slice(0, 10).map((task: Task & { smartScore: number }, index: number) => (
                    <Box
                        key={task.id}
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            p: 2,
                            mb: 1,
                            borderRadius: 2,
                            bgcolor: alpha(
                                task.smartScore >= 70 ? '#F59E0B' :
                                    task.smartScore >= 50 ? '#EF4444' : '#3B82F6',
                                0.05
                            ),
                            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Typography variant="h6" fontWeight={800} color="text.secondary">
                                #{index + 1}
                            </Typography>
                            <Box>
                                <Typography variant="subtitle2" fontWeight={600}>
                                    {task.title}
                                </Typography>
                                <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                                    {task.dueDate && (
                                        <Chip size="small" label={new Date(task.dueDate).toLocaleDateString('ar-SA')} sx={{ fontSize: '0.65rem' }} />
                                    )}
                                    {task.assignee && (
                                        <Chip
                                            size="small"
                                            avatar={<Avatar sx={{ width: 16, height: 16 }}>{task.assignee.firstName?.[0]}</Avatar>}
                                            label={`${task.assignee.firstName} ${task.assignee.lastName}`}
                                            sx={{ fontSize: '0.65rem' }}
                                        />
                                    )}
                                </Stack>
                            </Box>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box sx={{ textAlign: 'center' }}>
                                <Typography variant="h5" fontWeight={800} color={
                                    task.smartScore >= 70 ? '#F59E0B' :
                                        task.smartScore >= 50 ? '#EF4444' : '#3B82F6'
                                }>
                                    {task.smartScore}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">نقاط</Typography>
                            </Box>
                        </Box>
                    </Box>
                ))}
            </Paper>
        </Box>
    );
};

// ============ Workload Analysis View ============
export const WorkloadAnalysisView: React.FC = () => {
    const theme = useTheme();
    const { data, isLoading } = useQuery({
        queryKey: ['workload-analysis'],
        queryFn: () => enterpriseTasksApi.getWorkloadAnalysis(),
    });

    if (isLoading) {
        return (
            <Grid container spacing={2}>
                {[1, 2, 3, 4].map((i) => (
                    <Grid item xs={12} md={3} key={i}>
                        <Skeleton variant="rounded" height={150} />
                    </Grid>
                ))}
            </Grid>
        );
    }

    const result = data?.data || data;
    const employees = result?.employees || [];
    const summary = result?.summary || {};

    const loadColors = {
        OVERLOADED: '#EF4444',
        HIGH: '#F59E0B',
        NORMAL: '#10B981',
        LOW: '#6B7280',
    };

    return (
        <Box>
            {/* Summary */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} md={3}>
                    <Card sx={{ background: `linear-gradient(135deg, ${alpha('#3B82F6', 0.1)} 0%, ${alpha('#3B82F6', 0.05)} 100%)` }}>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <TeamIcon sx={{ fontSize: 32, color: '#3B82F6' }} />
                            <Typography variant="h4" fontWeight={800} color="#3B82F6">{summary.totalEmployees}</Typography>
                            <Typography variant="caption">إجمالي الموظفين</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} md={3}>
                    <Card sx={{ background: `linear-gradient(135deg, ${alpha('#EF4444', 0.1)} 0%, ${alpha('#EF4444', 0.05)} 100%)` }}>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <WarningIcon sx={{ fontSize: 32, color: '#EF4444' }} />
                            <Typography variant="h4" fontWeight={800} color="#EF4444">{summary.overloaded}</Typography>
                            <Typography variant="caption">عبء زائد</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} md={3}>
                    <Card sx={{ background: `linear-gradient(135deg, ${alpha('#10B981', 0.1)} 0%, ${alpha('#10B981', 0.05)} 100%)` }}>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <CheckIcon sx={{ fontSize: 32, color: '#10B981' }} />
                            <Typography variant="h4" fontWeight={800} color="#10B981">{summary.balanced}</Typography>
                            <Typography variant="caption">متوازن</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} md={3}>
                    <Card sx={{ background: `linear-gradient(135deg, ${alpha('#8B5CF6', 0.1)} 0%, ${alpha('#8B5CF6', 0.05)} 100%)` }}>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <SpeedIcon sx={{ fontSize: 32, color: '#8B5CF6' }} />
                            <Typography variant="h4" fontWeight={800} color="#8B5CF6">{summary.averageLoad?.toFixed(1)}</Typography>
                            <Typography variant="caption">متوسط المهام</Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Employee Cards */}
            <Grid container spacing={2}>
                {employees.map((emp: any) => (
                    <Grid item xs={12} md={4} lg={3} key={emp.employee.id}>
                        <Card sx={{
                            border: `2px solid ${alpha(loadColors[emp.loadLevel as keyof typeof loadColors], 0.3)}`,
                            borderRadius: 3,
                        }}>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                    <Avatar sx={{ bgcolor: loadColors[emp.loadLevel as keyof typeof loadColors] }}>
                                        {emp.employee.name?.[0]}
                                    </Avatar>
                                    <Box>
                                        <Typography variant="subtitle2" fontWeight={700}>{emp.employee.name}</Typography>
                                        <Chip
                                            size="small"
                                            label={emp.loadLevel === 'OVERLOADED' ? 'عبء زائد' :
                                                emp.loadLevel === 'HIGH' ? 'عالي' :
                                                    emp.loadLevel === 'NORMAL' ? 'متوازن' : 'منخفض'}
                                            sx={{
                                                bgcolor: alpha(loadColors[emp.loadLevel as keyof typeof loadColors], 0.15),
                                                color: loadColors[emp.loadLevel as keyof typeof loadColors],
                                            }}
                                        />
                                    </Box>
                                </Box>
                                <Grid container spacing={1}>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="text.secondary">المهام</Typography>
                                        <Typography variant="h6" fontWeight={700}>{emp.taskCount}</Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="text.secondary">النقاط</Typography>
                                        <Typography variant="h6" fontWeight={700}>{emp.totalPoints}</Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="text.secondary">متأخرة</Typography>
                                        <Typography variant="h6" fontWeight={700} color="#EF4444">{emp.overdueTasks}</Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="text.secondary">عاجلة</Typography>
                                        <Typography variant="h6" fontWeight={700} color="#F59E0B">{emp.urgentTasks}</Typography>
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
};

// ============ Burndown Chart Component ============
export const BurndownChartView: React.FC<{ sprintId?: string }> = ({ sprintId }) => {
    const theme = useTheme();
    const { data, isLoading } = useQuery({
        queryKey: ['burndown-v2', sprintId],
        queryFn: () => enterpriseTasksApi.getBurndownV2(sprintId),
    });

    if (isLoading) return <Skeleton variant="rounded" height={300} />;

    const result = data?.data || data;
    const chartData = result?.data || [];
    const summary = result?.summary || {};

    return (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" fontWeight={700}>📉 مخطط الإنجاز (Burndown)</Typography>
                <Stack direction="row" spacing={2}>
                    <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h5" fontWeight={800} color="primary">{summary.totalPoints}</Typography>
                        <Typography variant="caption">الإجمالي</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h5" fontWeight={800} color="success.main">{summary.completedPoints}</Typography>
                        <Typography variant="caption">مكتمل</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h5" fontWeight={800} color="warning.main">{summary.remainingPoints}</Typography>
                        <Typography variant="caption">متبقي</Typography>
                    </Box>
                </Stack>
            </Box>
            <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.2)} />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <RechartsTooltip />
                    <Legend />
                    <Area type="monotone" dataKey="remaining" name="المتبقي" fill={alpha('#3B82F6', 0.2)} stroke="#3B82F6" />
                    <Line type="monotone" dataKey="ideal" name="المثالي" stroke="#10B981" strokeDasharray="5 5" />
                    <Line type="monotone" dataKey="completed" name="المكتمل" stroke="#8B5CF6" />
                </ComposedChart>
            </ResponsiveContainer>
        </Paper>
    );
};

// ============ Velocity Chart Component ============
export const VelocityChartView: React.FC = () => {
    const theme = useTheme();
    const { data, isLoading } = useQuery({
        queryKey: ['velocity-v2'],
        queryFn: () => enterpriseTasksApi.getVelocityV2(8),
    });

    if (isLoading) return <Skeleton variant="rounded" height={300} />;

    const result = data?.data || data;
    const chartData = result?.data || [];
    const summary = result?.summary || {};

    return (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" fontWeight={700}>🚀 سرعة الفريق (Velocity)</Typography>
                <Stack direction="row" spacing={2} alignItems="center">
                    {summary.trend === 'UP' ? (
                        <Chip icon={<TrendingUpIcon />} label="تصاعدي" color="success" />
                    ) : (
                        <Chip icon={<TrendingDownIcon />} label="تنازلي" color="warning" />
                    )}
                    <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h5" fontWeight={800} color="primary">{summary.averageVelocity}</Typography>
                        <Typography variant="caption">المتوسط</Typography>
                    </Box>
                </Stack>
            </Box>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.2)} />
                    <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <RechartsTooltip />
                    <Legend />
                    <Bar dataKey="points" name="النقاط" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="completed" name="المهام" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </Paper>
    );
};

// ============ AI Estimation Dialog ============
export const AiEstimationDialog: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const estimateMutation = useMutation({
        mutationFn: (params: { title: string; description?: string }) =>
            enterpriseTasksApi.estimateTaskDuration(params.title, params.description),
        onSuccess: (response) => {
            // Extract data from axios response
            const data = response?.data || response;
            setResult(data);
            setError(null);
        },
        onError: (err: any) => {
            setError(err?.response?.data?.message || err?.message || 'حدث خطأ في التقدير');
            setResult(null);
        },
    });

    const handleEstimate = () => {
        if (title.trim()) {
            setError(null);
            setResult(null);
            estimateMutation.mutate({ title: title.trim(), description: description.trim() || undefined });
        }
    };

    // Reset state when dialog opens
    React.useEffect(() => {
        if (open) {
            setTitle('');
            setDescription('');
            setResult(null);
            setError(null);
        }
    }, [open]);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AiIcon color="primary" />
                تقدير وقت المهمة بالذكاء الاصطناعي
            </DialogTitle>
            <DialogContent>
                <TextField
                    fullWidth
                    label="عنوان المهمة"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    sx={{ mt: 2, mb: 2 }}
                />
                <TextField
                    fullWidth
                    label="الوصف (اختياري)"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    multiline
                    rows={3}
                />

                {estimateMutation.isPending && (
                    <Box sx={{ textAlign: 'center', mt: 3 }}>
                        <CircularProgress />
                        <Typography variant="body2" sx={{ mt: 1 }}>جاري التقدير...</Typography>
                    </Box>
                )}

                {error && (
                    <Paper sx={{ p: 2, mt: 3, bgcolor: alpha('#EF4444', 0.05), border: '1px solid', borderColor: alpha('#EF4444', 0.2) }}>
                        <Typography variant="body2" color="error" fontWeight={600}>
                            ❌ {error}
                        </Typography>
                    </Paper>
                )}

                {result && (
                    <Paper sx={{ p: 2, mt: 3, bgcolor: alpha('#10B981', 0.05), border: '1px solid', borderColor: alpha('#10B981', 0.2) }}>
                        <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>📊 نتيجة التقدير</Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={6}>
                                <Typography variant="caption" color="text.secondary">الوقت المتوقع</Typography>
                                <Typography variant="h4" fontWeight={800} color="primary">{result.estimatedHours} ساعة</Typography>
                            </Grid>
                            <Grid item xs={6}>
                                <Typography variant="caption" color="text.secondary">النقاط المتوقعة</Typography>
                                <Typography variant="h4" fontWeight={800} color="secondary">{result.estimatedPoints}</Typography>
                            </Grid>
                            <Grid item xs={12}>
                                <Chip
                                    label={`ثقة: ${result.confidence === 'HIGH' ? 'عالية' : result.confidence === 'MEDIUM' ? 'متوسطة' : 'منخفضة'}`}
                                    color={result.confidence === 'HIGH' ? 'success' : result.confidence === 'MEDIUM' ? 'warning' : 'default'}
                                    sx={{ mr: 1 }}
                                />
                                <Typography variant="caption" color="text.secondary">{result.basedOn}</Typography>
                            </Grid>
                        </Grid>
                    </Paper>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>إغلاق</Button>
                <Button
                    variant="contained"
                    onClick={handleEstimate}
                    disabled={!title || estimateMutation.isPending}
                    startIcon={<AiIcon />}
                >
                    تقدير
                </Button>
            </DialogActions>
        </Dialog>
    );
};

// ============ Auto-Assign Button ============
export const AutoAssignButton: React.FC<{ taskId: string; onSuccess?: () => void }> = ({ taskId, onSuccess }) => {
    const queryClient = useQueryClient();
    const [result, setResult] = useState<any>(null);

    const mutation = useMutation({
        mutationFn: () => enterpriseTasksApi.autoAssignTask(taskId),
        onSuccess: (data) => {
            setResult(data?.data || data);
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            queryClient.invalidateQueries({ queryKey: ['kanban'] });
            onSuccess?.();
        },
    });

    return (
        <Box>
            <Button
                variant="outlined"
                startIcon={mutation.isPending ? <CircularProgress size={16} /> : <AutoIcon />}
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending}
                sx={{ mb: result ? 1 : 0 }}
            >
                تعيين تلقائي
            </Button>
            {result && result.success && (
                <Paper sx={{ p: 1.5, bgcolor: alpha('#10B981', 0.05), border: '1px solid', borderColor: alpha('#10B981', 0.2) }}>
                    <Typography variant="body2" color="success.main" fontWeight={600}>
                        ✅ تم تعيين {result.assignedTo?.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">{result.reason}</Typography>
                </Paper>
            )}
        </Box>
    );
};

export default {
    SmartPriorityView,
    WorkloadAnalysisView,
    BurndownChartView,
    VelocityChartView,
    AiEstimationDialog,
    AutoAssignButton,
};
