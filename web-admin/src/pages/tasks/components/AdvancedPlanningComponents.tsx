import React, { useState } from 'react';
import {
    Box, Paper, Typography, Grid, Card, CardContent, Chip, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, LinearProgress, Button, Dialog, DialogTitle,
    DialogContent, DialogActions, TextField, FormControl, InputLabel, Select, MenuItem,
    Alert, Stack, Tooltip, IconButton, Skeleton, useTheme, alpha, Divider,
} from '@mui/material';
import {
    Timeline as TimelineIcon, Warning as WarningIcon, Route as RouteIcon,
    Psychology as PsychologyIcon, Refresh as RefreshIcon, FilterList as FilterIcon,
    PlayArrow as PlayIcon, Speed as SpeedIcon, Event as EventIcon,
    TrendingUp, Category as CategoryIcon, Map as MapIcon,
} from '@mui/icons-material';
import { useQuery, useMutation } from '@tanstack/react-query';
import { enterpriseTasksApi } from '@/services/tasks.service';

// ============ 1. Timeline View Component ============
export const TimelineViewAdvanced: React.FC = () => {
    const theme = useTheme();
    const [groupBy, setGroupBy] = useState<'assignee' | 'category' | 'priority' | 'status'>('assignee');
    const [zoom, setZoom] = useState<'day' | 'week' | 'month'>('week');

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['timeline', groupBy, zoom],
        queryFn: () => enterpriseTasksApi.getTimelineView({ groupBy, zoom }),
    });

    if (isLoading) return <Skeleton variant="rounded" height={400} />;

    const timeline = data as any;
    if (!timeline?.groups) return <Alert severity="info">لا توجد بيانات</Alert>;

    return (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <TimelineIcon sx={{ fontSize: 32, color: theme.palette.primary.main }} />
                    <Box>
                        <Typography variant="h6" fontWeight={700}>الجدول الزمني</Typography>
                        <Typography variant="body2" color="text.secondary">
                            {timeline.summary.totalTasks} مهمة • {timeline.summary.completedTasks} مكتملة • {timeline.summary.overdueTasks} متأخرة
                        </Typography>
                    </Box>
                </Box>
                <Stack direction="row" spacing={1}>
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel>تجميع حسب</InputLabel>
                        <Select value={groupBy} onChange={(e) => setGroupBy(e.target.value as any)} label="تجميع حسب">
                            <MenuItem value="assignee">المسؤول</MenuItem>
                            <MenuItem value="category">التصنيف</MenuItem>
                            <MenuItem value="priority">الأولوية</MenuItem>
                            <MenuItem value="status">الحالة</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 100 }}>
                        <InputLabel>تكبير</InputLabel>
                        <Select value={zoom} onChange={(e) => setZoom(e.target.value as any)} label="تكبير">
                            <MenuItem value="day">يوم</MenuItem>
                            <MenuItem value="week">أسبوع</MenuItem>
                            <MenuItem value="month">شهر</MenuItem>
                        </Select>
                    </FormControl>
                    <IconButton onClick={() => refetch()}><RefreshIcon /></IconButton>
                </Stack>
            </Box>

            {timeline.groups.map((group) => (
                <Box key={group.name} sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="subtitle1" fontWeight={600}>{group.name}</Typography>
                        <Chip label={group.taskCount} size="small" color="primary" />
                    </Box>
                    <Grid container spacing={1}>
                        {group.tasks.map((task: any) => (
                            <Grid item xs={12} sm={6} md={4} lg={3} key={task.id}>
                                <Card sx={{ bgcolor: alpha(task.color || '#3b82f6', 0.1), border: `1px solid ${alpha(task.color || '#3b82f6', 0.3)}` }}>
                                    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                        <Typography variant="body2" fontWeight={600} noWrap>{task.title}</Typography>
                                        <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
                                            <Chip label={task.status} size="small" sx={{ fontSize: '0.65rem' }} />
                                            <Chip label={`${task.progress}%`} size="small" sx={{ fontSize: '0.65rem' }} />
                                        </Stack>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </Box>
            ))}
        </Paper>
    );
};

// ============ 2. Buffer Time Component ============
export const BufferTimeView: React.FC = () => {
    const theme = useTheme();
    const { data, isLoading, refetch } = useQuery({
        queryKey: ['buffer-time'],
        queryFn: () => enterpriseTasksApi.getBufferTime(),
    });

    if (isLoading) return <Skeleton variant="rounded" height={400} />;

    const bufferData = data as any;
    if (!bufferData?.tasks) return <Alert severity="info">لا توجد مهام لتحليلها</Alert>;

    const riskColors = { HIGH: '#ef4444', MEDIUM: '#f59e0b', LOW: '#10b981' };
    const riskLabels = { HIGH: 'عالي', MEDIUM: 'متوسط', LOW: 'منخفض' };

    return (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <SpeedIcon sx={{ fontSize: 32, color: theme.palette.warning.main }} />
                    <Box>
                        <Typography variant="h6" fontWeight={700}>وقت الاحتياط</Typography>
                        <Typography variant="body2" color="text.secondary">
                            تحليل المخاطر والتوصيات
                        </Typography>
                    </Box>
                </Box>
                <IconButton onClick={() => refetch()}><RefreshIcon /></IconButton>
            </Box>

            {/* Summary Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                {['highRisk', 'mediumRisk', 'lowRisk'].map((key) => {
                    const colors = { highRisk: '#ef4444', mediumRisk: '#f59e0b', lowRisk: '#10b981' };
                    const labels = { highRisk: 'خطر عالي', mediumRisk: 'خطر متوسط', lowRisk: 'خطر منخفض' };
                    return (
                        <Grid item xs={4} key={key}>
                            <Card sx={{ bgcolor: alpha(colors[key as keyof typeof colors], 0.1), border: `1px solid ${alpha(colors[key as keyof typeof colors], 0.3)}` }}>
                                <CardContent sx={{ textAlign: 'center', p: 2 }}>
                                    <Typography variant="h3" fontWeight={800} color={colors[key as keyof typeof colors]}>
                                        {bufferData.summary?.[key] || 0}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">{labels[key as keyof typeof labels]}</Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    );
                })}
            </Grid>

            {/* Tasks Table */}
            <TableContainer>
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                            <TableCell>المهمة</TableCell>
                            <TableCell align="center">الوقت المقدر</TableCell>
                            <TableCell align="center">الاحتياط المقترح</TableCell>
                            <TableCell align="center">أيام للموعد</TableCell>
                            <TableCell align="center">المخاطر</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {bufferData.tasks?.slice(0, 10).map((task: any) => (
                            <TableRow key={task.taskId} hover>
                                <TableCell><Typography variant="body2" fontWeight={500}>{task.title}</Typography></TableCell>
                                <TableCell align="center">{task.estimatedHours} ساعة</TableCell>
                                <TableCell align="center">
                                    <Chip label={`${task.recommendedBufferDays} يوم`} size="small" sx={{ bgcolor: alpha('#3b82f6', 0.1) }} />
                                </TableCell>
                                <TableCell align="center">
                                    {task.daysUntilDeadline !== null ? (
                                        <Chip label={task.daysUntilDeadline >= 0 ? `${task.daysUntilDeadline} يوم` : 'متأخر'}
                                            size="small" color={task.daysUntilDeadline < 0 ? 'error' : 'default'} />
                                    ) : '-'}
                                </TableCell>
                                <TableCell align="center">
                                    <Chip label={riskLabels[task.riskLevel as keyof typeof riskLabels]} size="small"
                                        sx={{
                                            bgcolor: alpha(riskColors[task.riskLevel as keyof typeof riskColors], 0.15),
                                            color: riskColors[task.riskLevel as keyof typeof riskColors], fontWeight: 600
                                        }} />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    );
};

// ============ 3. Critical Path Component ============
export const CriticalPathView: React.FC = () => {
    const theme = useTheme();
    const { data, isLoading, refetch } = useQuery({
        queryKey: ['critical-path'],
        queryFn: () => enterpriseTasksApi.getCriticalPath(),
    });

    if (isLoading) return <Skeleton variant="rounded" height={400} />;

    const cpData = data as any;
    if (!cpData?.criticalPath) return <Alert severity="info">لا توجد بيانات</Alert>;

    return (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <RouteIcon sx={{ fontSize: 32, color: '#ef4444' }} />
                    <Box>
                        <Typography variant="h6" fontWeight={700}>المسار الحرج (CPM)</Typography>
                        <Typography variant="body2" color="text.secondary">
                            مدة المشروع: {cpData.projectDuration} يوم • {cpData.criticalPath.count} مهمة حرجة
                        </Typography>
                    </Box>
                </Box>
                <IconButton onClick={() => refetch()}><RefreshIcon /></IconButton>
            </Box>

            {/* Recommendations */}
            {cpData.recommendations.length > 0 && (
                <Box sx={{ mb: 3 }}>
                    {cpData.recommendations.map((rec, i) => (
                        <Alert key={i} severity="warning" sx={{ mb: 1 }}>{rec}</Alert>
                    ))}
                </Box>
            )}

            {/* Critical Path Tasks */}
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2, color: '#ef4444' }}>
                🔴 المهام الحرجة ({cpData.criticalPath.count})
            </Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
                {cpData.criticalPath.tasks.map((task, index) => (
                    <Grid item xs={12} sm={6} md={4} key={task.id}>
                        <Card sx={{ border: `2px solid #ef4444`, bgcolor: alpha('#ef4444', 0.05) }}>
                            <CardContent sx={{ p: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                    <Typography variant="body2" fontWeight={600}>{task.title}</Typography>
                                    <Chip label={`#${index + 1}`} size="small" color="error" />
                                </Box>
                                <Divider sx={{ my: 1 }} />
                                <Stack direction="row" spacing={1} flexWrap="wrap" gap={0.5}>
                                    <Chip label={`${task.duration} يوم`} size="small" variant="outlined" />
                                    <Chip label={`بداية: ${task.earlyStart}`} size="small" variant="outlined" />
                                    <Chip label={`نهاية: ${task.earlyFinish}`} size="small" variant="outlined" />
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Non-Critical Tasks */}
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2, color: '#10b981' }}>
                ✅ المهام ذات المرونة ({cpData.nonCriticalTasks.count})
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                متوسط المرونة: {cpData.nonCriticalTasks.averageSlack} يوم
            </Typography>
            <Grid container spacing={1}>
                {cpData.nonCriticalTasks.tasks.slice(0, 6).map((task: any) => (
                    <Grid item xs={12} sm={6} md={4} key={task.id}>
                        <Card sx={{ bgcolor: alpha('#10b981', 0.05), border: `1px solid ${alpha('#10b981', 0.3)}` }}>
                            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                <Typography variant="body2" fontWeight={500}>{task.title}</Typography>
                                <Chip label={`مرونة: ${task.slack} يوم`} size="small" sx={{ mt: 0.5, bgcolor: alpha('#10b981', 0.2) }} />
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Paper>
    );
};

// ============ 4. What-If Scenarios Component ============
export const WhatIfScenariosView: React.FC = () => {
    const theme = useTheme();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [scenarioType, setScenarioType] = useState<'delay_task' | 'add_resource' | 'change_priority' | 'remove_dependency' | 'extend_deadline'>('delay_task');
    const [taskId, setTaskId] = useState('');
    const [params, setParams] = useState<any>({});
    const [result, setResult] = useState<any>(null);

    const mutation = useMutation({
        mutationFn: enterpriseTasksApi.runWhatIfScenario,
        onSuccess: (data) => {
            setResult(data);
            setDialogOpen(false);
        },
    });

    const scenarioConfigs = {
        delay_task: { label: 'تأخير مهمة', icon: '⏱️', paramField: 'delayDays', paramLabel: 'أيام التأخير' },
        add_resource: { label: 'إضافة موارد', icon: '👥', paramField: 'resourceMultiplier', paramLabel: 'مضاعف الموارد' },
        change_priority: { label: 'تغيير الأولوية', icon: '📌', paramField: 'newPriority', paramLabel: 'الأولوية الجديدة' },
        remove_dependency: { label: 'إزالة تبعية', icon: '🔗', paramField: 'dependencyToRemove', paramLabel: 'معرف التبعية' },
        extend_deadline: { label: 'تمديد الموعد', icon: '📅', paramField: 'newDeadline', paramLabel: 'الموعد الجديد' },
    };

    const runScenario = () => {
        mutation.mutate({
            type: scenarioType,
            taskId: taskId || undefined,
            parameters: params,
        });
    };

    return (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <PsychologyIcon sx={{ fontSize: 32, color: theme.palette.secondary.main }} />
                    <Box>
                        <Typography variant="h6" fontWeight={700}>سيناريوهات ماذا لو</Typography>
                        <Typography variant="body2" color="text.secondary">محاكاة التغييرات قبل تطبيقها</Typography>
                    </Box>
                </Box>
                <Button variant="contained" startIcon={<PlayIcon />} onClick={() => setDialogOpen(true)}>
                    سيناريو جديد
                </Button>
            </Box>

            {/* Scenario Types */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                {Object.entries(scenarioConfigs).map(([key, config]) => (
                    <Grid item xs={6} sm={4} md={2.4} key={key}>
                        <Card
                            sx={{
                                cursor: 'pointer', textAlign: 'center', p: 2,
                                border: scenarioType === key ? `2px solid ${theme.palette.primary.main}` : '1px solid transparent',
                                '&:hover': { borderColor: theme.palette.primary.light },
                            }}
                            onClick={() => { setScenarioType(key as any); setDialogOpen(true); }}
                        >
                            <Typography variant="h4">{config.icon}</Typography>
                            <Typography variant="body2" fontWeight={500} sx={{ mt: 1 }}>{config.label}</Typography>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Result Display */}
            {result && (
                <Card sx={{ bgcolor: alpha(theme.palette.info.main, 0.05), border: `1px solid ${theme.palette.info.main}` }}>
                    <CardContent>
                        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                            نتيجة السيناريو: {scenarioConfigs[result.scenario as keyof typeof scenarioConfigs]?.label}
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={6}>
                                <Typography variant="body2" color="text.secondary">مدة المشروع الحالية</Typography>
                                <Typography variant="h5" fontWeight={700}>{result.currentState?.projectDuration || 0} يوم</Typography>
                            </Grid>
                            <Grid item xs={6}>
                                <Typography variant="body2" color="text.secondary">عدد المهام الحرجة</Typography>
                                <Typography variant="h5" fontWeight={700}>{result.currentState?.criticalPathLength || 0}</Typography>
                            </Grid>
                        </Grid>
                        {result.simulatedImpact && (
                            <Box sx={{ mt: 2 }}>
                                <Alert severity={result.simulatedImpact.riskLevel === 'HIGH' ? 'error' : result.simulatedImpact.riskLevel === 'MEDIUM' ? 'warning' : 'success'}>
                                    {result.simulatedImpact.recommendation || JSON.stringify(result.simulatedImpact)}
                                </Alert>
                            </Box>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Dialog */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {scenarioConfigs[scenarioType].icon} {scenarioConfigs[scenarioType].label}
                </DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField
                            label="معرف المهمة (اختياري)"
                            value={taskId}
                            onChange={(e) => setTaskId(e.target.value)}
                            fullWidth
                            size="small"
                        />
                        {scenarioType === 'change_priority' ? (
                            <FormControl fullWidth size="small">
                                <InputLabel>{scenarioConfigs[scenarioType].paramLabel}</InputLabel>
                                <Select
                                    value={params.newPriority || ''}
                                    onChange={(e) => setParams({ ...params, newPriority: e.target.value })}
                                    label={scenarioConfigs[scenarioType].paramLabel}
                                >
                                    <MenuItem value="URGENT">عاجل</MenuItem>
                                    <MenuItem value="HIGH">عالي</MenuItem>
                                    <MenuItem value="MEDIUM">متوسط</MenuItem>
                                    <MenuItem value="LOW">منخفض</MenuItem>
                                </Select>
                            </FormControl>
                        ) : scenarioType === 'extend_deadline' ? (
                            <TextField
                                label={scenarioConfigs[scenarioType].paramLabel}
                                type="date"
                                value={params.newDeadline || ''}
                                onChange={(e) => setParams({ ...params, newDeadline: e.target.value })}
                                fullWidth
                                size="small"
                                InputLabelProps={{ shrink: true }}
                            />
                        ) : (
                            <TextField
                                label={scenarioConfigs[scenarioType].paramLabel}
                                type="number"
                                value={params[scenarioConfigs[scenarioType].paramField] || ''}
                                onChange={(e) => setParams({ ...params, [scenarioConfigs[scenarioType].paramField]: parseFloat(e.target.value) })}
                                fullWidth
                                size="small"
                            />
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
                    <Button variant="contained" onClick={runScenario} disabled={mutation.isPending}>
                        {mutation.isPending ? 'جاري...' : 'تشغيل السيناريو'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
};

// ============ Combined View Component ============
export const AdvancedPlanningDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState(0);
    const tabs = [
        { icon: <TimelineIcon />, label: 'الجدول الزمني' },
        { icon: <SpeedIcon />, label: 'وقت الاحتياط' },
        { icon: <RouteIcon />, label: 'المسار الحرج' },
        { icon: <PsychologyIcon />, label: 'ماذا لو' },
        { icon: <WarningIcon />, label: 'SLA' },
        { icon: <TrendingUp />, label: 'التصعيد' },
        { icon: <CategoryIcon />, label: 'الإصدارات' },
        { icon: <MapIcon />, label: 'خريطة الطريق' },
    ];

    return (
        <Box>
            <Stack direction="row" spacing={1} sx={{ mb: 3, flexWrap: 'wrap', gap: 1 }}>
                {tabs.map((tab, index) => (
                    <Button
                        key={index}
                        variant={activeTab === index ? 'contained' : 'outlined'}
                        startIcon={tab.icon}
                        onClick={() => setActiveTab(index)}
                        sx={{ borderRadius: 2 }}
                        size="small"
                    >
                        {tab.label}
                    </Button>
                ))}
            </Stack>

            {activeTab === 0 && <TimelineViewAdvanced />}
            {activeTab === 1 && <BufferTimeView />}
            {activeTab === 2 && <CriticalPathView />}
            {activeTab === 3 && <WhatIfScenariosView />}
            {activeTab === 4 && <SLATrackingView />}
            {activeTab === 5 && <EscalationRulesView />}
            {activeTab === 6 && <ReleasePlanningView />}
            {activeTab === 7 && <RoadmapView />}
        </Box>
    );
};

// ============ 5. SLA Tracking View ============
export const SLATrackingView: React.FC = () => {
    const theme = useTheme();
    const { data, isLoading, refetch } = useQuery({
        queryKey: ['sla-violations'],
        queryFn: () => enterpriseTasksApi.checkSLAViolations(),
    });

    if (isLoading) return <Skeleton variant="rounded" height={400} />;
    const sla = data as any;

    return (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <WarningIcon sx={{ fontSize: 32, color: theme.palette.warning.main }} />
                    <Box>
                        <Typography variant="h6" fontWeight={700}>تتبع SLA</Typography>
                        <Typography variant="body2" color="text.secondary">
                            {sla?.totalActiveTasks || 0} مهمة نشطة • {sla?.violations?.count || 0} مخالفة • {sla?.warnings?.count || 0} تحذير
                        </Typography>
                    </Box>
                </Box>
                <IconButton onClick={() => refetch()}><RefreshIcon /></IconButton>
            </Box>
            <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                    <Card sx={{ bgcolor: alpha(theme.palette.error.main, 0.1) }}>
                        <CardContent>
                            <Typography variant="subtitle1" fontWeight={600} color="error.main">🚨 المخالفات ({sla?.violations?.count || 0})</Typography>
                            {sla?.violations?.items?.length > 0 ? sla.violations.items.slice(0, 3).map((v: any, i: number) => (
                                <Box key={i} sx={{ p: 1, bgcolor: 'background.paper', borderRadius: 1, mt: 1 }}>
                                    <Typography variant="body2" fontWeight={600}>{v.taskTitle}</Typography>
                                    <Typography variant="caption" color="text.secondary">{v.breachHours}h متأخر</Typography>
                                </Box>
                            )) : <Typography color="text.secondary" sx={{ mt: 1 }}>لا توجد مخالفات ✅</Typography>}
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Card sx={{ bgcolor: alpha(theme.palette.warning.main, 0.1) }}>
                        <CardContent>
                            <Typography variant="subtitle1" fontWeight={600} color="warning.main">⚠️ التحذيرات ({sla?.warnings?.count || 0})</Typography>
                            {sla?.warnings?.items?.length > 0 ? sla.warnings.items.slice(0, 3).map((w: any, i: number) => (
                                <Box key={i} sx={{ p: 1, bgcolor: 'background.paper', borderRadius: 1, mt: 1 }}>
                                    <Typography variant="body2" fontWeight={600}>{w.taskTitle}</Typography>
                                    <Typography variant="caption" color="text.secondary">{w.remainingHours}h متبقي</Typography>
                                </Box>
                            )) : <Typography color="text.secondary" sx={{ mt: 1 }}>لا توجد تحذيرات ✅</Typography>}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Paper>
    );
};

// ============ 6. Escalation Rules View ============
export const EscalationRulesView: React.FC = () => {
    const theme = useTheme();
    const { data: rules, isLoading, refetch } = useQuery({
        queryKey: ['escalation-rules'],
        queryFn: () => enterpriseTasksApi.getEscalationRules(),
    });
    const runCheck = useMutation({ mutationFn: () => enterpriseTasksApi.runEscalationCheck(), onSuccess: () => refetch() });

    if (isLoading) return <Skeleton variant="rounded" height={400} />;
    const rulesList = rules as any[] || [];
    const actionLabels: Record<string, string> = { 'NOTIFY_MANAGER': 'إشعار المدير', 'REASSIGN_TO_MANAGER': 'إسناد للمدير', 'NOTIFY_TEAM_LEAD': 'إشعار قائد الفريق', 'INCREASE_PRIORITY': 'رفع الأولوية' };

    return (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <TrendingUp sx={{ fontSize: 32, color: theme.palette.info.main }} />
                    <Typography variant="h6" fontWeight={700}>قواعد التصعيد ({rulesList.length})</Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                    <Button variant="outlined" startIcon={<PlayIcon />} onClick={() => runCheck.mutate()} disabled={runCheck.isPending}>
                        {runCheck.isPending ? 'جاري...' : 'فحص الآن'}
                    </Button>
                    <IconButton onClick={() => refetch()}><RefreshIcon /></IconButton>
                </Stack>
            </Box>
            <TableContainer><Table size="small">
                <TableHead><TableRow><TableCell>القاعدة</TableCell><TableCell>المشغّل</TableCell><TableCell>الإجراء</TableCell></TableRow></TableHead>
                <TableBody>
                    {rulesList.map((rule: any) => (
                        <TableRow key={rule.id}>
                            <TableCell><Typography variant="body2" fontWeight={600}>{rule.name}</Typography></TableCell>
                            <TableCell><Chip label={rule.trigger} size="small" /></TableCell>
                            <TableCell><Chip label={actionLabels[rule.action] || rule.action} size="small" color="primary" /></TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table></TableContainer>
        </Paper>
    );
};

// ============ 7. Release Planning View ============
export const ReleasePlanningView: React.FC = () => {
    const theme = useTheme();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [newRelease, setNewRelease] = useState({ name: '', description: '', startDate: '', endDate: '' });
    const { data: releases, isLoading, refetch } = useQuery({ queryKey: ['releases'], queryFn: () => enterpriseTasksApi.getReleases() });
    const createMutation = useMutation({ mutationFn: () => enterpriseTasksApi.createRelease(newRelease), onSuccess: () => { setDialogOpen(false); refetch(); } });

    if (isLoading) return <Skeleton variant="rounded" height={400} />;
    const releasesList = releases as any[] || [];

    return (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <CategoryIcon sx={{ fontSize: 32, color: theme.palette.success.main }} />
                    <Typography variant="h6" fontWeight={700}>تخطيط الإصدارات ({releasesList.length})</Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                    <Button variant="contained" onClick={() => setDialogOpen(true)}>+ إصدار جديد</Button>
                    <IconButton onClick={() => refetch()}><RefreshIcon /></IconButton>
                </Stack>
            </Box>
            <Grid container spacing={2}>
                {releasesList.map((r: any) => (
                    <Grid item xs={12} md={6} lg={4} key={r.id}>
                        <Card>
                            <CardContent>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                    <Typography variant="subtitle1" fontWeight={700}>{r.name}</Typography>
                                    <Chip label={r.status === 'ACTIVE' ? 'نشط' : r.status === 'COMPLETED' ? 'مكتمل' : 'مخطط'} size="small" color={r.status === 'ACTIVE' ? 'success' : 'default'} />
                                </Box>
                                <LinearProgress variant="determinate" value={r.progress?.taskCompletion || 0} sx={{ height: 6, borderRadius: 3, mb: 1 }} />
                                <Typography variant="caption">{r.progress?.taskCompletion || 0}% • {r.progress?.totalTasks || 0} مهمة</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>إصدار جديد</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField label="الاسم" value={newRelease.name} onChange={(e) => setNewRelease({ ...newRelease, name: e.target.value })} fullWidth />
                        <TextField label="الوصف" value={newRelease.description} onChange={(e) => setNewRelease({ ...newRelease, description: e.target.value })} fullWidth multiline rows={2} />
                        <TextField label="تاريخ البدء" type="date" value={newRelease.startDate} onChange={(e) => setNewRelease({ ...newRelease, startDate: e.target.value })} fullWidth InputLabelProps={{ shrink: true }} />
                        <TextField label="تاريخ الانتهاء" type="date" value={newRelease.endDate} onChange={(e) => setNewRelease({ ...newRelease, endDate: e.target.value })} fullWidth InputLabelProps={{ shrink: true }} />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
                    <Button variant="contained" onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !newRelease.name}>{createMutation.isPending ? 'جاري...' : 'إنشاء'}</Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
};

// ============ 8. Roadmap View ============
export const RoadmapView: React.FC = () => {
    const theme = useTheme();
    const [groupBy, setGroupBy] = useState<'quarter' | 'month'>('quarter');
    const { data, isLoading, refetch } = useQuery({ queryKey: ['roadmap', groupBy], queryFn: () => enterpriseTasksApi.getRoadmap({ groupBy }) });

    if (isLoading) return <Skeleton variant="rounded" height={400} />;
    const roadmap = data as any;

    return (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <MapIcon sx={{ fontSize: 32, color: theme.palette.primary.main }} />
                    <Box>
                        <Typography variant="h6" fontWeight={700}>خريطة الطريق</Typography>
                        <Typography variant="body2" color="text.secondary">{roadmap?.summary?.totalReleases || 0} إصدار • {roadmap?.summary?.totalMilestones || 0} معلم</Typography>
                    </Box>
                </Box>
                <Stack direction="row" spacing={1}>
                    <FormControl size="small" sx={{ minWidth: 100 }}>
                        <InputLabel>تجميع</InputLabel>
                        <Select value={groupBy} onChange={(e) => setGroupBy(e.target.value as any)} label="تجميع">
                            <MenuItem value="quarter">ربع سنوي</MenuItem>
                            <MenuItem value="month">شهري</MenuItem>
                        </Select>
                    </FormControl>
                    <IconButton onClick={() => refetch()}><RefreshIcon /></IconButton>
                </Stack>
            </Box>
            <Grid container spacing={2} sx={{ mb: 2 }}>
                {[
                    { label: 'مكتمل', value: roadmap?.summary?.completedReleases || 0, color: 'success' },
                    { label: 'نشط', value: roadmap?.summary?.activeReleases || 0, color: 'info' },
                    { label: 'مخطط', value: roadmap?.summary?.plannedReleases || 0, color: 'warning' },
                    { label: 'معالم', value: roadmap?.summary?.totalMilestones || 0, color: 'primary' },
                ].map((stat, i) => (
                    <Grid item xs={6} md={3} key={i}>
                        <Card sx={{ textAlign: 'center', bgcolor: alpha(theme.palette[stat.color as any].main, 0.1) }}>
                            <CardContent sx={{ py: 2 }}>
                                <Typography variant="h4" fontWeight={700} color={`${stat.color}.main`}>{stat.value}</Typography>
                                <Typography variant="caption">{stat.label}</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
            {roadmap?.data && Object.keys(roadmap.data).length > 0 ? (
                <Stack spacing={2}>
                    {Object.entries(roadmap.data).map(([period, items]: [string, any]) => (
                        <Card key={period}>
                            <CardContent>
                                <Typography variant="subtitle1" fontWeight={700} color="primary.main" gutterBottom>📅 {period}</Typography>
                                <Divider sx={{ my: 1 }} />
                                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                    {items.releases?.map((r: any, i: number) => <Chip key={i} label={r.name} color="primary" variant="outlined" />)}
                                    {items.milestones?.map((m: any, i: number) => <Chip key={i} icon={<EventIcon />} label={m.title} color="secondary" />)}
                                </Stack>
                            </CardContent>
                        </Card>
                    ))}
                </Stack>
            ) : <Alert severity="info">لا توجد إصدارات أو معالم</Alert>}
        </Paper>
    );
};
