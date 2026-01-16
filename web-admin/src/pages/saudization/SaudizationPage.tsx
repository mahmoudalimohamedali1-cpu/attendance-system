import { useState, useEffect } from 'react';
import {
    Box,
    Container,
    Typography,
    Card,
    CardContent,
    Grid,
    LinearProgress,
    Chip,
    Alert,
    AlertTitle,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Button,
    Divider,
    CircularProgress,
    Tooltip,
} from '@mui/material';
import {
    CheckCircle as CheckIcon,
    Warning as WarningIcon,
    Error as ErrorIcon,
    TrendingUp as TrendingUpIcon,
    TrendingDown as TrendingDownIcon,
    People as PeopleIcon,
    Flag as FlagIcon,
    Lightbulb as LightbulbIcon,
    Notifications as NotificationsIcon,
    Timeline as TimelineIcon,
    Refresh as RefreshIcon,
} from '@mui/icons-material';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from 'recharts';
import { api } from '../../services/api.service';

// ============== Types ==============

interface SaudizationStats {
    totalEmployees: number;
    saudiEmployees: number;
    nonSaudiEmployees: number;
    saudizationRate: number;
    nitaqatBand: string;
    nitaqatColor: string;
    targetRate: number;
    gapToTarget: number;
    departmentStats: DepartmentStats[];
}

interface DepartmentStats {
    departmentId: string;
    departmentName: string;
    totalEmployees: number;
    saudiEmployees: number;
    nonSaudiEmployees: number;
    saudizationRate: number;
}

interface TrendData {
    month: string;
    totalEmployees: number;
    saudiEmployees: number;
    saudizationRate: number;
}

interface NitaqatAlert {
    id: string;
    type: 'CRITICAL' | 'WARNING' | 'INFO';
    titleAr: string;
    messageAr: string;
    actionRequired: boolean;
}

interface Recommendation {
    id: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    category: string;
    titleAr: string;
    descriptionAr: string;
    impact: string;
    timeframe: string;
}

// ============== Color Constants ==============

const NITAQAT_COLORS: Record<string, string> = {
    PLATINUM: '#E5E4E2',
    GREEN: '#4CAF50',
    YELLOW: '#FFC107',
    RED: '#F44336',
};

const PRIORITY_COLORS: Record<string, 'error' | 'warning' | 'info'> = {
    HIGH: 'error',
    MEDIUM: 'warning',
    LOW: 'info',
};

// ============== Main Component ==============

export default function SaudizationPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [stats, setStats] = useState<SaudizationStats | null>(null);
    const [trend, setTrend] = useState<TrendData[]>([]);
    const [alerts, setAlerts] = useState<NitaqatAlert[]>([]);
    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

    // ============== Fetch Data ==============

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [statsRes, trendRes, alertsRes, recsRes] = await Promise.all([
                api.get('/saudization/statistics'),
                api.get('/saudization/trend'),
                api.get('/saudization/alerts'),
                api.get('/saudization/recommendations'),
            ]);
            setStats(statsRes.data);
            setTrend(Array.isArray(trendRes.data) ? trendRes.data : []);
            setAlerts(Array.isArray(alertsRes.data) ? alertsRes.data : []);
            setRecommendations(Array.isArray(recsRes.data) ? recsRes.data : []);
        } catch (err: any) {
            console.error('Error fetching saudization data:', err);
            setError(err?.response?.data?.message || 'فشل في تحميل البيانات');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // ============== Helper Functions ==============

    const getNitaqatIcon = (color: string) => {
        switch (color) {
            case 'RED': return <ErrorIcon sx={{ color: NITAQAT_COLORS.RED }} />;
            case 'YELLOW': return <WarningIcon sx={{ color: NITAQAT_COLORS.YELLOW }} />;
            case 'GREEN': return <CheckIcon sx={{ color: NITAQAT_COLORS.GREEN }} />;
            case 'PLATINUM': return <CheckIcon sx={{ color: NITAQAT_COLORS.PLATINUM }} />;
            default: return null;
        }
    };

    const getNitaqatLabel = (band: string) => {
        const labels: Record<string, string> = {
            PLATINUM: 'البلاتيني',
            GREEN_HIGH: 'الأخضر المرتفع',
            GREEN_MID: 'الأخضر المتوسط',
            GREEN_LOW: 'الأخضر المنخفض',
            YELLOW: 'الأصفر',
            RED: 'الأحمر',
        };
        return labels[band] || band;
    };

    const getAlertIcon = (type: string) => {
        switch (type) {
            case 'CRITICAL': return <ErrorIcon color="error" />;
            case 'WARNING': return <WarningIcon color="warning" />;
            case 'INFO': return <CheckIcon color="info" />;
            default: return null;
        }
    };

    // ============== Render ==============

    if (loading) {
        return (
            <Container maxWidth="xl" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
                <CircularProgress size={60} />
            </Container>
        );
    }

    if (error) {
        return (
            <Container maxWidth="xl" sx={{ mt: 4 }}>
                <Alert severity="error" action={
                    <Button color="inherit" size="small" onClick={fetchData}>
                        إعادة المحاولة
                    </Button>
                }>
                    <AlertTitle>خطأ</AlertTitle>
                    {error}
                </Alert>
            </Container>
        );
    }

    const pieData = stats ? [
        { name: 'سعوديين', value: stats.saudiEmployees, color: '#4CAF50' },
        { name: 'غير سعوديين', value: stats.nonSaudiEmployees, color: '#FF9800' },
    ] : [];

    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    🇸🇦 السعودة ونطاقات
                </Typography>
                <Button startIcon={<RefreshIcon />} onClick={fetchData} variant="outlined">
                    تحديث البيانات
                </Button>
            </Box>

            {/* Critical Alerts */}
            {(alerts || []).filter(a => a.type === 'CRITICAL').map(alert => (
                <Alert key={alert.id} severity="error" sx={{ mb: 2 }} icon={<ErrorIcon />}>
                    <AlertTitle>{alert.titleAr}</AlertTitle>
                    {alert.messageAr}
                </Alert>
            ))}

            {/* Stats Cards */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                {/* Nitaqat Status Card */}
                <Grid item xs={12} md={4}>
                    <Card sx={{
                        height: '100%',
                        borderLeft: `4px solid ${NITAQAT_COLORS[stats?.nitaqatColor || 'GREEN']}`,
                    }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography color="textSecondary" gutterBottom>
                                    نطاق نطاقات الحالي
                                </Typography>
                                {getNitaqatIcon(stats?.nitaqatColor || 'GREEN')}
                            </Box>
                            <Typography variant="h4" component="div" sx={{ mb: 1 }}>
                                {getNitaqatLabel(stats?.nitaqatBand || '')}
                            </Typography>
                            <Chip
                                label={`${stats?.saudizationRate?.toFixed(1)}% سعودة`}
                                color={stats?.nitaqatColor === 'RED' ? 'error' : stats?.nitaqatColor === 'YELLOW' ? 'warning' : 'success'}
                            />
                        </CardContent>
                    </Card>
                </Grid>

                {/* Employee Distribution Card */}
                <Grid item xs={12} md={4}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>
                                توزيع الموظفين
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <ResponsiveContainer width={120} height={120}>
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={35}
                                            outerRadius={50}
                                            dataKey="value"
                                        >
                                            {pieData.map((entry, index) => (
                                                <Cell key={index} fill={entry.color} />
                                            ))}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                                <Box>
                                    <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Box sx={{ width: 12, height: 12, bgcolor: '#4CAF50', borderRadius: '50%' }} />
                                        سعوديين: {stats?.saudiEmployees}
                                    </Typography>
                                    <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Box sx={{ width: 12, height: 12, bgcolor: '#FF9800', borderRadius: '50%' }} />
                                        غير سعوديين: {stats?.nonSaudiEmployees}
                                    </Typography>
                                    <Divider sx={{ my: 1 }} />
                                    <Typography variant="body2" fontWeight="bold">
                                        الإجمالي: {stats?.totalEmployees}
                                    </Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Target Progress Card */}
                <Grid item xs={12} md={4}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>
                                التقدم نحو الهدف
                            </Typography>
                            <Box sx={{ mb: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                    <Typography variant="body2">
                                        الحالي: {stats?.saudizationRate?.toFixed(1)}%
                                    </Typography>
                                    <Typography variant="body2">
                                        الهدف: {stats?.targetRate}%
                                    </Typography>
                                </Box>
                                <LinearProgress
                                    variant="determinate"
                                    value={Math.min((stats?.saudizationRate || 0) / (stats?.targetRate || 1) * 100, 100)}
                                    color={stats?.gapToTarget && stats.gapToTarget > 0 ? 'warning' : 'success'}
                                    sx={{ height: 10, borderRadius: 5 }}
                                />
                            </Box>
                            {stats?.gapToTarget && stats.gapToTarget > 0 ? (
                                <Alert severity="warning" icon={<TrendingUpIcon />}>
                                    تحتاج لزيادة {stats.gapToTarget.toFixed(1)}% للوصول للهدف
                                </Alert>
                            ) : (
                                <Alert severity="success" icon={<CheckIcon />}>
                                    أنت تحقق الهدف المطلوب
                                </Alert>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Trend Chart & Alerts Row */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                {/* Trend Chart */}
                <Grid item xs={12} md={8}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <TimelineIcon /> تطور نسبة السعودة
                            </Typography>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={trend}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="month" />
                                    <YAxis domain={[0, 100]} />
                                    <RechartsTooltip />
                                    <Line
                                        type="monotone"
                                        dataKey="saudizationRate"
                                        stroke="#4CAF50"
                                        strokeWidth={2}
                                        name="نسبة السعودة %"
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Alerts Panel */}
                <Grid item xs={12} md={4}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <NotificationsIcon /> التنبيهات
                            </Typography>
                            <List dense>
                                {alerts.length === 0 ? (
                                    <ListItem>
                                        <ListItemText primary="لا توجد تنبيهات" />
                                    </ListItem>
                                ) : (
                                    alerts.map(alert => (
                                        <ListItem key={alert.id}>
                                            <ListItemIcon>
                                                {getAlertIcon(alert.type)}
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={alert.titleAr}
                                                secondary={alert.messageAr}
                                            />
                                        </ListItem>
                                    ))
                                )}
                            </List>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Department Statistics & Recommendations Row */}
            <Grid container spacing={3}>
                {/* Department Stats */}
                <Grid item xs={12} md={7}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <PeopleIcon /> السعودة حسب الإدارة
                            </Typography>
                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>الإدارة</TableCell>
                                            <TableCell align="center">الإجمالي</TableCell>
                                            <TableCell align="center">سعوديين</TableCell>
                                            <TableCell align="center">غير سعوديين</TableCell>
                                            <TableCell align="center">النسبة</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {stats?.departmentStats?.map(dept => (
                                            <TableRow key={dept.departmentId}>
                                                <TableCell>{dept.departmentName}</TableCell>
                                                <TableCell align="center">{dept.totalEmployees}</TableCell>
                                                <TableCell align="center">{dept.saudiEmployees}</TableCell>
                                                <TableCell align="center">{dept.nonSaudiEmployees}</TableCell>
                                                <TableCell align="center">
                                                    <Chip
                                                        label={`${dept.saudizationRate}%`}
                                                        size="small"
                                                        color={dept.saudizationRate >= 20 ? 'success' : dept.saudizationRate >= 10 ? 'warning' : 'error'}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {(!stats?.departmentStats || stats.departmentStats.length === 0) && (
                                            <TableRow>
                                                <TableCell colSpan={5} align="center">
                                                    <Typography color="textSecondary">لا توجد بيانات</Typography>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Recommendations */}
                <Grid item xs={12} md={5}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <LightbulbIcon /> التوصيات
                            </Typography>
                            <List>
                                {recommendations.length === 0 ? (
                                    <ListItem>
                                        <ListItemText primary="لا توجد توصيات حالياً" />
                                    </ListItem>
                                ) : (
                                    recommendations.slice(0, 5).map(rec => (
                                        <ListItem key={rec.id} sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                                                <Chip
                                                    label={rec.priority === 'HIGH' ? 'عاجل' : rec.priority === 'MEDIUM' ? 'متوسط' : 'منخفض'}
                                                    color={PRIORITY_COLORS[rec.priority]}
                                                    size="small"
                                                />
                                                <Typography variant="subtitle2" fontWeight="bold">
                                                    {rec.titleAr}
                                                </Typography>
                                            </Box>
                                            <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
                                                {rec.descriptionAr}
                                            </Typography>
                                            <Typography variant="caption" color="primary">
                                                {rec.timeframe}
                                            </Typography>
                                            <Divider sx={{ width: '100%', mt: 1 }} />
                                        </ListItem>
                                    ))
                                )}
                            </List>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Container>
    );
}
