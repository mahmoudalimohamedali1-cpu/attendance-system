/**
 * Unified Performance Dashboard Component
 * Displays integrated Goals (70%) + KPIs (30%) performance scoring
 */

import React, { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    Grid,
    Card,
    CardContent,
    Chip,
    LinearProgress,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    CircularProgress,
    Alert,
    Button,
    Divider,
    Avatar,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
} from '@mui/material';
import {
    EmojiEvents as TrophyIcon,
    TrendingUp as TrendingUpIcon,
    TrendingDown as TrendingDownIcon,
    Sync as SyncIcon,
    Assessment as AssessmentIcon,
    People as PeopleIcon,
    Star as StarIcon,
    Warning as WarningIcon,
} from '@mui/icons-material';
import { api } from '../../../services/api.service';

interface UnifiedScoreResult {
    employeeId: string;
    cycleId: string;
    goalsScore: number;
    goalsWeight: number;
    goalsContribution: number;
    kpiScore: number;
    kpiWeight: number;
    kpiContribution: number;
    unifiedScore: number;
    ratingBand: string;
    calculatedAt: string;
}

interface UnifiedSummary extends UnifiedScoreResult {
    employee: {
        id: string;
        firstName: string;
        lastName: string;
        employeeCode: string;
        department?: string;
    };
    goalsDetails: {
        totalGoals: number;
        completedGoals: number;
        inProgressGoals: number;
        averageProgress: number;
        keyResults: number;
    };
    kpiDetails: {
        totalAssignments: number;
        averageScore: number;
        exceeding: number;
        meeting: number;
        belowTarget: number;
    };
}

interface DashboardData {
    cycle: {
        id: string;
        name: string;
        totalEmployees: number;
    };
    statistics: {
        averageScore: number;
        scoredEmployees: number;
        goalsWeight: number;
        kpiWeight: number;
    };
    departmentRankings: {
        department: string;
        averageScore: number;
        employeeCount: number;
        topPerformer: { id: string; name: string; score: number };
    }[];
    topPerformers: UnifiedSummary[];
    underperformers: UnifiedSummary[];
}

interface Props {
    companyId: string;
    cycleId: string;
}

const getRatingColor = (score: number): string => {
    if (score >= 90) return '#4caf50';
    if (score >= 80) return '#8bc34a';
    if (score >= 70) return '#ffeb3b';
    if (score >= 60) return '#ff9800';
    return '#f44336';
};

const getRatingLabel = (score: number): string => {
    if (score >= 90) return 'ممتاز';
    if (score >= 80) return 'جيد جداً';
    if (score >= 70) return 'جيد';
    if (score >= 60) return 'مقبول';
    return 'يحتاج تحسين';
};

export const UnifiedPerformanceDashboard: React.FC<Props> = ({ companyId, cycleId }) => {
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await api.get(`/unified-performance/dashboard/${companyId}/${cycleId}`);
            setDashboardData(response.data);
        } catch (err: any) {
            setError(err.response?.data?.message || 'فشل في تحميل بيانات الأداء الموحد');
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async () => {
        try {
            setSyncing(true);
            await api.post(`/unified-performance/sync/${cycleId}`);
            await fetchDashboardData();
        } catch (err: any) {
            setError('فشل في مزامنة النتائج');
        } finally {
            setSyncing(false);
        }
    };

    useEffect(() => {
        if (companyId && cycleId) {
            fetchDashboardData();
        }
    }, [companyId, cycleId]);

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Alert severity="error" sx={{ mb: 2 }}>
                {error}
            </Alert>
        );
    }

    if (!dashboardData) {
        return (
            <Alert severity="info">
                لا توجد بيانات متاحة
            </Alert>
        );
    }

    const { cycle, statistics, departmentRankings, topPerformers, underperformers } = dashboardData;

    return (
        <Box>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h5" fontWeight="bold">
                    📊 لوحة الأداء الموحد
                </Typography>
                <Button
                    variant="outlined"
                    startIcon={syncing ? <CircularProgress size={20} /> : <SyncIcon />}
                    onClick={handleSync}
                    disabled={syncing}
                >
                    {syncing ? 'جاري المزامنة...' : 'مزامنة النتائج'}
                </Button>
            </Box>

            {/* Statistics Cards */}
            <Grid container spacing={3} mb={3}>
                <Grid item xs={12} md={3}>
                    <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                        <CardContent>
                            <Box display="flex" alignItems="center" gap={1} mb={1}>
                                <AssessmentIcon />
                                <Typography variant="subtitle2">متوسط الأداء</Typography>
                            </Box>
                            <Typography variant="h3" fontWeight="bold">
                                {statistics.averageScore.toFixed(1)}%
                            </Typography>
                            <Chip
                                label={getRatingLabel(statistics.averageScore)}
                                size="small"
                                sx={{ mt: 1, bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                            />
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" gap={1} mb={1}>
                                <PeopleIcon color="primary" />
                                <Typography variant="subtitle2" color="text.secondary">الموظفين المُقيّمين</Typography>
                            </Box>
                            <Typography variant="h3" fontWeight="bold" color="primary">
                                {statistics.scoredEmployees}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                من إجمالي {cycle.totalEmployees}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={3}>
                    <Card sx={{ bgcolor: '#e8f5e9' }}>
                        <CardContent>
                            <Box display="flex" alignItems="center" gap={1} mb={1}>
                                <TrendingUpIcon sx={{ color: '#4caf50' }} />
                                <Typography variant="subtitle2">وزن الأهداف</Typography>
                            </Box>
                            <Typography variant="h3" fontWeight="bold" color="#4caf50">
                                {statistics.goalsWeight}%
                            </Typography>
                            <LinearProgress
                                variant="determinate"
                                value={statistics.goalsWeight}
                                sx={{ mt: 1, bgcolor: '#c8e6c9', '& .MuiLinearProgress-bar': { bgcolor: '#4caf50' } }}
                            />
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={3}>
                    <Card sx={{ bgcolor: '#e3f2fd' }}>
                        <CardContent>
                            <Box display="flex" alignItems="center" gap={1} mb={1}>
                                <AssessmentIcon sx={{ color: '#2196f3' }} />
                                <Typography variant="subtitle2">وزن KPI</Typography>
                            </Box>
                            <Typography variant="h3" fontWeight="bold" color="#2196f3">
                                {statistics.kpiWeight}%
                            </Typography>
                            <LinearProgress
                                variant="determinate"
                                value={statistics.kpiWeight}
                                sx={{ mt: 1, bgcolor: '#bbdefb', '& .MuiLinearProgress-bar': { bgcolor: '#2196f3' } }}
                            />
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Main Content */}
            <Grid container spacing={3}>
                {/* Department Rankings */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="h6" fontWeight="bold" mb={2}>
                            🏆 ترتيب الأقسام
                        </Typography>
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>#</TableCell>
                                        <TableCell>القسم</TableCell>
                                        <TableCell align="center">المتوسط</TableCell>
                                        <TableCell align="center">الموظفين</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {departmentRankings.slice(0, 5).map((dept, index) => (
                                        <TableRow key={dept.department}>
                                            <TableCell>
                                                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                                            </TableCell>
                                            <TableCell>{dept.department}</TableCell>
                                            <TableCell align="center">
                                                <Chip
                                                    label={`${dept.averageScore.toFixed(1)}%`}
                                                    size="small"
                                                    sx={{ bgcolor: getRatingColor(dept.averageScore), color: 'white' }}
                                                />
                                            </TableCell>
                                            <TableCell align="center">{dept.employeeCount}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </Grid>

                {/* Top Performers */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="h6" fontWeight="bold" mb={2}>
                            ⭐ أفضل الموظفين أداءً
                        </Typography>
                        <List dense>
                            {topPerformers.slice(0, 5).map((performer, index) => (
                                <ListItem key={performer.employeeId} divider>
                                    <ListItemAvatar>
                                        <Avatar sx={{ bgcolor: getRatingColor(performer.unifiedScore) }}>
                                            {index === 0 ? <TrophyIcon /> : index + 1}
                                        </Avatar>
                                    </ListItemAvatar>
                                    <ListItemText
                                        primary={`${performer.employee.firstName} ${performer.employee.lastName}`}
                                        secondary={performer.employee.department || 'بدون قسم'}
                                    />
                                    <Box textAlign="right">
                                        <Typography variant="h6" fontWeight="bold" color={getRatingColor(performer.unifiedScore)}>
                                            {performer.unifiedScore.toFixed(1)}%
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {performer.ratingBand}
                                        </Typography>
                                    </Box>
                                </ListItem>
                            ))}
                        </List>
                    </Paper>
                </Grid>

                {/* Underperformers - Needs Attention */}
                {underperformers.length > 0 && (
                    <Grid item xs={12}>
                        <Paper sx={{ p: 2, bgcolor: '#fff3e0' }}>
                            <Box display="flex" alignItems="center" gap={1} mb={2}>
                                <WarningIcon color="warning" />
                                <Typography variant="h6" fontWeight="bold">
                                    يحتاجون للمتابعة (أقل من 60%)
                                </Typography>
                            </Box>
                            <Grid container spacing={2}>
                                {underperformers.slice(0, 4).map((performer) => (
                                    <Grid item xs={12} sm={6} md={3} key={performer.employeeId}>
                                        <Card variant="outlined">
                                            <CardContent>
                                                <Typography variant="subtitle1" fontWeight="bold">
                                                    {performer.employee.firstName} {performer.employee.lastName}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary" display="block">
                                                    {performer.employee.department || 'بدون قسم'}
                                                </Typography>
                                                <Divider sx={{ my: 1 }} />
                                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                                    <Box>
                                                        <Typography variant="caption" color="text.secondary">الأهداف</Typography>
                                                        <Typography variant="body2">{performer.goalsScore.toFixed(0)}%</Typography>
                                                    </Box>
                                                    <Box>
                                                        <Typography variant="caption" color="text.secondary">KPI</Typography>
                                                        <Typography variant="body2">{performer.kpiScore.toFixed(0)}%</Typography>
                                                    </Box>
                                                    <Box>
                                                        <Typography variant="caption" color="text.secondary">الإجمالي</Typography>
                                                        <Typography variant="body2" color="error" fontWeight="bold">
                                                            {performer.unifiedScore.toFixed(0)}%
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>
                        </Paper>
                    </Grid>
                )}
            </Grid>
        </Box>
    );
};

export default UnifiedPerformanceDashboard;
