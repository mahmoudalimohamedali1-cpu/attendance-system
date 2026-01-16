import React, { useState } from 'react';
import {
    Box, Paper, Typography, Grid, Card, CardContent, Chip, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, LinearProgress, Button, Dialog, DialogTitle,
    DialogContent, DialogActions, TextField, FormControl, InputLabel, Select, MenuItem,
    Alert, Stack, Tooltip, IconButton, Skeleton, useTheme, alpha, Divider, Avatar, Badge,
} from '@mui/material';
import {
    People as PeopleIcon, Assessment as AssessmentIcon, Speed as SpeedIcon,
    Refresh as RefreshIcon, Handshake as HandshakeIcon, AlternateEmail as MentionIcon,
    Videocam as VideoIcon, ScreenShare as ScreenIcon, Chat as ChatIcon,
    Psychology as SkillsIcon, TrendingUp, OpenInNew as OpenIcon,
} from '@mui/icons-material';
import { useQuery, useMutation } from '@tanstack/react-query';
import { enterpriseTasksApi } from '@/services/tasks.service';

// ============ 1. Team Workload Dashboard ============
export const TeamWorkloadView: React.FC = () => {
    const theme = useTheme();
    const { data, isLoading, refetch } = useQuery({ queryKey: ['team-workload'], queryFn: () => enterpriseTasksApi.getTeamWorkload() });

    if (isLoading) return <Skeleton variant="rounded" height={400} />;
    const workload = data as any;

    const loadColors: Record<string, string> = {
        OVERLOADED: theme.palette.error.main,
        HIGH: theme.palette.warning.main,
        NORMAL: theme.palette.success.main,
        LOW: theme.palette.info.main,
    };
    const loadLabels: Record<string, string> = { OVERLOADED: 'محمّل زيادة', HIGH: 'عالي', NORMAL: 'طبيعي', LOW: 'منخفض' };

    return (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <PeopleIcon sx={{ fontSize: 32, color: theme.palette.primary.main }} />
                    <Box>
                        <Typography variant="h6" fontWeight={700}>لوحة أحمال الفريق</Typography>
                        <Typography variant="body2" color="text.secondary">{workload?.teamSize || 0} موظف • {workload?.totalActiveTasks || 0} مهمة نشطة</Typography>
                    </Box>
                </Box>
                <IconButton onClick={() => refetch()}><RefreshIcon /></IconButton>
            </Box>
            <Grid container spacing={2} sx={{ mb: 3 }}>
                {['overloaded', 'high', 'normal', 'low'].map((level) => (
                    <Grid item xs={3} key={level}>
                        <Card sx={{ textAlign: 'center', bgcolor: alpha(loadColors[level.toUpperCase()], 0.1) }}>
                            <CardContent sx={{ py: 2 }}>
                                <Typography variant="h4" fontWeight={700} color={loadColors[level.toUpperCase()]}>{workload?.summary?.[level] || 0}</Typography>
                                <Typography variant="caption">{loadLabels[level.toUpperCase()]}</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
            <TableContainer><Table size="small">
                <TableHead><TableRow>
                    <TableCell>الموظف</TableCell><TableCell>المهام</TableCell><TableCell>متأخرة</TableCell><TableCell>الحمل</TableCell>
                </TableRow></TableHead>
                <TableBody>
                    {workload?.members?.slice(0, 10).map((m: any) => (
                        <TableRow key={m.employee.id}>
                            <TableCell>
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <Avatar src={m.employee.avatar} sx={{ width: 28, height: 28 }}>{m.employee.name[0]}</Avatar>
                                    <Box><Typography variant="body2" fontWeight={600}>{m.employee.name}</Typography><Typography variant="caption" color="text.secondary">{m.employee.department}</Typography></Box>
                                </Stack>
                            </TableCell>
                            <TableCell><Badge badgeContent={m.taskCount} color="primary"><Box sx={{ width: 20 }} /></Badge></TableCell>
                            <TableCell><Chip label={m.overdueTasks} size="small" color={m.overdueTasks > 0 ? 'error' : 'default'} /></TableCell>
                            <TableCell><Chip label={loadLabels[m.loadLevel]} size="small" sx={{ bgcolor: alpha(loadColors[m.loadLevel], 0.2), color: loadColors[m.loadLevel] }} /></TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table></TableContainer>
        </Paper>
    );
};

// ============ 2. Skills Matrix ============
export const SkillsMatrixView: React.FC = () => {
    const theme = useTheme();
    const { data, isLoading, refetch } = useQuery({ queryKey: ['skills-matrix'], queryFn: () => enterpriseTasksApi.getSkillsMatrix() });

    if (isLoading) return <Skeleton variant="rounded" height={400} />;
    const skills = data as any;

    return (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <SkillsIcon sx={{ fontSize: 32, color: theme.palette.secondary.main }} />
                    <Box>
                        <Typography variant="h6" fontWeight={700}>مصفوفة المهارات</Typography>
                        <Typography variant="body2" color="text.secondary">{skills?.totalEmployees || 0} موظف • {skills?.totalSkills || 0} مهارة</Typography>
                    </Box>
                </Box>
                <IconButton onClick={() => refetch()}><RefreshIcon /></IconButton>
            </Box>
            <Typography variant="subtitle2" gutterBottom>تغطية المهارات</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 3 }}>
                {skills?.skillCoverage?.slice(0, 15).map((s: any) => (
                    <Chip key={s.skill} label={`${s.skill} (${s.percentage}%)`} size="small" color={s.percentage >= 50 ? 'success' : s.percentage >= 20 ? 'warning' : 'error'} variant="outlined" />
                ))}
            </Stack>
            {skills?.gaps?.length > 0 && (
                <Alert severity="warning" sx={{ mb: 2 }}>فجوات في المهارات: {skills.gaps.map((g: any) => g.skill).join(', ')}</Alert>
            )}
        </Paper>
    );
};

// ============ 3. Resource Utilization ============
export const ResourceUtilizationView: React.FC = () => {
    const theme = useTheme();
    const { data, isLoading, refetch } = useQuery({ queryKey: ['resource-utilization'], queryFn: () => enterpriseTasksApi.getResourceUtilization() });

    if (isLoading) return <Skeleton variant="rounded" height={400} />;
    const util = data as any;

    return (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <SpeedIcon sx={{ fontSize: 32, color: theme.palette.info.main }} />
                    <Box>
                        <Typography variant="h6" fontWeight={700}>استخدام الموارد</Typography>
                        <Typography variant="body2" color="text.secondary">متوسط {util?.avgUtilization || 0}% • {util?.period?.workDays || 0} يوم عمل</Typography>
                    </Box>
                </Box>
                <IconButton onClick={() => refetch()}><RefreshIcon /></IconButton>
            </Box>
            <Grid container spacing={2} sx={{ mb: 3 }}>
                {[
                    { label: 'فوق الطاقة', value: util?.summary?.overUtilized || 0, color: 'error' },
                    { label: 'أمثل', value: util?.summary?.optimal || 0, color: 'success' },
                    { label: 'أقل من الطاقة', value: util?.summary?.underUtilized || 0, color: 'info' },
                ].map((s) => (
                    <Grid item xs={4} key={s.label}>
                        <Card sx={{ textAlign: 'center', bgcolor: alpha(theme.palette[s.color as any].main, 0.1) }}>
                            <CardContent sx={{ py: 1 }}>
                                <Typography variant="h5" fontWeight={700} color={`${s.color}.main`}>{s.value}</Typography>
                                <Typography variant="caption">{s.label}</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
            {util?.members?.slice(0, 5).map((m: any) => (
                <Box key={m.employee.id} sx={{ mb: 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2">{m.employee.name}</Typography>
                        <Typography variant="caption">{m.utilizationPercent}%</Typography>
                    </Stack>
                    <LinearProgress variant="determinate" value={Math.min(m.utilizationPercent, 100)} color={m.utilizationPercent > 100 ? 'error' : m.utilizationPercent >= 70 ? 'success' : 'info'} sx={{ height: 6, borderRadius: 3 }} />
                </Box>
            ))}
        </Paper>
    );
};

// ============ 4. Team Performance Metrics ============
export const TeamPerformanceView: React.FC = () => {
    const theme = useTheme();
    const { data, isLoading, refetch } = useQuery({ queryKey: ['team-performance'], queryFn: () => enterpriseTasksApi.getTeamPerformance(30) });

    if (isLoading) return <Skeleton variant="rounded" height={400} />;
    const perf = data as any;

    return (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <TrendingUp sx={{ fontSize: 32, color: theme.palette.success.main }} />
                    <Box>
                        <Typography variant="h6" fontWeight={700}>مؤشرات أداء الفريق</Typography>
                        <Typography variant="body2" color="text.secondary">آخر {perf?.period?.days || 30} يوم</Typography>
                    </Box>
                </Box>
                <IconButton onClick={() => refetch()}><RefreshIcon /></IconButton>
            </Box>
            <Grid container spacing={2}>
                {[
                    { label: 'مهام مكتملة', value: perf?.metrics?.tasksCompleted || 0, icon: '✅' },
                    { label: 'نسبة الإنجاز', value: `${perf?.metrics?.completionRate || 0}%`, icon: '📊' },
                    { label: 'في الوقت', value: `${perf?.metrics?.onTimeRate || 0}%`, icon: '⏰' },
                    { label: 'متوسط الدورة', value: `${perf?.metrics?.avgCycleTimeDays || 0}d`, icon: '🔄' },
                    { label: 'السرعة/أسبوع', value: perf?.metrics?.velocityPerWeek || 0, icon: '🚀' },
                    { label: 'التعليقات', value: perf?.metrics?.commentsCount || 0, icon: '💬' },
                ].map((m) => (
                    <Grid item xs={6} md={4} key={m.label}>
                        <Card sx={{ textAlign: 'center' }}>
                            <CardContent sx={{ py: 2 }}>
                                <Typography variant="h5">{m.icon}</Typography>
                                <Typography variant="h6" fontWeight={700}>{m.value}</Typography>
                                <Typography variant="caption" color="text.secondary">{m.label}</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Paper>
    );
};

// ============ 5. Collaboration Score ============
export const CollaborationScoreView: React.FC = () => {
    const theme = useTheme();
    const { data, isLoading, refetch } = useQuery({ queryKey: ['collaboration-score'], queryFn: () => enterpriseTasksApi.getCollaborationScore(30) });

    if (isLoading) return <Skeleton variant="rounded" height={300} />;
    const collab = data as any;

    const gradeColors: Record<string, string> = { A: 'success', B: 'info', C: 'warning', D: 'error' };

    return (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <HandshakeIcon sx={{ fontSize: 32, color: theme.palette.primary.main }} />
                    <Typography variant="h6" fontWeight={700}>درجة التعاون</Typography>
                </Box>
                <IconButton onClick={() => refetch()}><RefreshIcon /></IconButton>
            </Box>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Typography variant="h1" fontWeight={700} color={`${gradeColors[collab?.grade || 'D']}.main`}>{collab?.grade || 'D'}</Typography>
                <Typography variant="h4">{collab?.totalScore || 0}/100</Typography>
            </Box>
            <Grid container spacing={1}>
                {['comments', 'mentions', 'watchers', 'sharedTasks'].map((key) => (
                    <Grid item xs={6} key={key}>
                        <Card variant="outlined"><CardContent sx={{ py: 1 }}>
                            <Typography variant="caption">{key === 'comments' ? 'التعليقات' : key === 'mentions' ? 'الإشارات' : key === 'watchers' ? 'المتابعون' : 'مهام مشتركة'}</Typography>
                            <Typography variant="body2" fontWeight={700}>{collab?.breakdown?.[key]?.count || 0}</Typography>
                        </CardContent></Card>
                    </Grid>
                ))}
            </Grid>
        </Paper>
    );
};

// Helper function to generate unique Jitsi room URL
const generateJitsiRoomUrl = (prefix: string = 'TeamMeeting') => {
    const roomId = `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    return `https://meet.jit.si/${roomId}`;
};

// ============ 6-10. Quick Actions Panel ============
export const TeamActionsPanel: React.FC = () => {
    const theme = useTheme();
    const screenShare = useMutation({ mutationFn: () => enterpriseTasksApi.createScreenShare() });
    const { data: chat } = useQuery({ queryKey: ['team-chat'], queryFn: () => enterpriseTasksApi.getTeamChat() });

    const handleOpenJitsi = (url: string) => window.open(url, '_blank');

    return (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>🚀 أدوات التعاون السريعة</Typography>
            <Grid container spacing={2}>
                <Grid item xs={6} md={3}>
                    <Button fullWidth variant="outlined" startIcon={<ScreenIcon />} onClick={() => screenShare.mutate()} disabled={screenShare.isPending}>
                        {screenShare.isPending ? 'جاري...' : 'مشاركة الشاشة'}
                    </Button>
                    {screenShare.data && (
                        <Button size="small" endIcon={<OpenIcon />} onClick={() => handleOpenJitsi((screenShare.data as any).jitsiUrl)}>فتح الجلسة</Button>
                    )}
                </Grid>
                <Grid item xs={6} md={3}>
                    <Button fullWidth variant="outlined" startIcon={<VideoIcon />} onClick={() => handleOpenJitsi((chat as any)?.jitsiUrl || generateJitsiRoomUrl('VideoCall'))}>
                        مكالمة فيديو
                    </Button>
                </Grid>
                <Grid item xs={6} md={3}>
                    <Button fullWidth variant="outlined" startIcon={<ChatIcon />} onClick={() => handleOpenJitsi((chat as any)?.jitsiUrl || generateJitsiRoomUrl('TeamChat'))}>
                        دردشة الفريق
                    </Button>
                </Grid>
                <Grid item xs={6} md={3}>
                    <Button fullWidth variant="outlined" startIcon={<MentionIcon />} href="#mentions">الإشارات</Button>
                </Grid>
            </Grid>
        </Paper>
    );
};

// ============ Combined Dashboard ============
export const TeamCollaborationDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState(0);
    const tabs = [
        { icon: <PeopleIcon />, label: 'أحمال الفريق' },
        { icon: <SkillsIcon />, label: 'المهارات' },
        { icon: <SpeedIcon />, label: 'الموارد' },
        { icon: <TrendingUp />, label: 'الأداء' },
        { icon: <HandshakeIcon />, label: 'التعاون' },
    ];

    return (
        <Box>
            <TeamActionsPanel />
            <Stack direction="row" spacing={1} sx={{ my: 3, flexWrap: 'wrap', gap: 1 }}>
                {tabs.map((tab, i) => (
                    <Button key={i} variant={activeTab === i ? 'contained' : 'outlined'} startIcon={tab.icon} onClick={() => setActiveTab(i)} size="small" sx={{ borderRadius: 2 }}>{tab.label}</Button>
                ))}
            </Stack>
            {activeTab === 0 && <TeamWorkloadView />}
            {activeTab === 1 && <SkillsMatrixView />}
            {activeTab === 2 && <ResourceUtilizationView />}
            {activeTab === 3 && <TeamPerformanceView />}
            {activeTab === 4 && <CollaborationScoreView />}
        </Box>
    );
};
