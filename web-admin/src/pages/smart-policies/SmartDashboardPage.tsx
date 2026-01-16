import { useState, useEffect } from 'react';
import {
    Box,
    Container,
    Typography,
    Grid,
    Paper,
    Card,
    CardContent,
    Chip,
    IconButton,
    LinearProgress,
    Skeleton,
    Tooltip,
    Button,
    Divider,
    Avatar,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    Badge,
    Alert,
} from '@mui/material';
import {
    TrendingUp as TrendingUpIcon,
    TrendingDown as TrendingDownIcon,
    TrendingFlat as TrendingFlatIcon,
    Policy as PolicyIcon,
    People as PeopleIcon,
    AttachMoney as MoneyIcon,
    CheckCircle as SuccessIcon,
    Error as ErrorIcon,
    Warning as WarningIcon,
    Refresh as RefreshIcon,
    Timeline as TimelineIcon,
    Assessment as ChartIcon,
    Notifications as NotificationIcon,
    Speed as SpeedIcon,
    AutoAwesome as AIIcon,
} from '@mui/icons-material';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    Legend,
} from 'recharts';
import { smartPoliciesService } from '../../services/smart-policies.service';

// ============== Types ==============

interface DashboardStats {
    totalPolicies: number;
    activePolicies: number;
    pendingApproval: number;
    executionsToday: number;
    executionsThisMonth: number;
    totalImpact: {
        additions: number;
        deductions: number;
        net: number;
    };
    affectedEmployees: number;
    successRate: number;
}

interface KPI {
    id: string;
    name: string;
    value: number;
    unit: string;
    target?: number;
    change: number;
    trend: 'UP' | 'DOWN' | 'STABLE';
    status: 'GOOD' | 'WARNING' | 'CRITICAL';
}

interface ActivityItem {
    id: string;
    type: string;
    title: string;
    description: string;
    userName: string;
    timestamp: Date;
}

interface DashboardAlert {
    id: string;
    type: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';
    title: string;
    message: string;
}

// ============== Component ==============

export default function SmartDashboardPage() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [kpis, setKpis] = useState<KPI[]>([]);
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [alerts, setAlerts] = useState<DashboardAlert[]>([]);
    const [executionsByDay, setExecutionsByDay] = useState<any[]>([]);
    const [executionsByType, setExecutionsByType] = useState<any[]>([]);
    const [impactByDepartment, setImpactByDepartment] = useState<any[]>([]);

    // ألوان الرسوم البيانية
    const COLORS = ['#22c55e', '#eab308', '#ef4444', '#3b82f6', '#8b5cf6'];

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            // في الإنتاج، استدعِ API الفعلي
            // const response = await smartPoliciesService.getDashboard();

            // بيانات تجريبية
            setStats({
                totalPolicies: 25,
                activePolicies: 18,
                pendingApproval: 3,
                executionsToday: 156,
                executionsThisMonth: 4250,
                totalImpact: {
                    additions: 125000,
                    deductions: 35000,
                    net: 90000,
                },
                affectedEmployees: 320,
                successRate: 94,
            });

            setKpis([
                {
                    id: '1',
                    name: 'نسبة التفعيل',
                    value: 72,
                    unit: '%',
                    target: 80,
                    change: 5,
                    trend: 'UP',
                    status: 'WARNING',
                },
                {
                    id: '2',
                    name: 'معدل النجاح',
                    value: 94,
                    unit: '%',
                    target: 95,
                    change: 2,
                    trend: 'UP',
                    status: 'GOOD',
                },
                {
                    id: '3',
                    name: 'متوسط التأثير',
                    value: 285,
                    unit: 'ريال',
                    change: -10,
                    trend: 'DOWN',
                    status: 'GOOD',
                },
                {
                    id: '4',
                    name: 'وقت الموافقة',
                    value: 18,
                    unit: 'ساعة',
                    target: 24,
                    change: -3,
                    trend: 'UP',
                    status: 'GOOD',
                },
            ]);

            setActivities([
                {
                    id: '1',
                    type: 'POLICY_CREATED',
                    title: 'سياسة جديدة',
                    description: 'مكافأة الحضور الكامل',
                    userName: 'أحمد محمد',
                    timestamp: new Date(),
                },
                {
                    id: '2',
                    type: 'POLICY_EXECUTED',
                    title: 'تنفيذ سياسة',
                    description: 'خصم التأخير - 15 موظف',
                    userName: 'النظام',
                    timestamp: new Date(Date.now() - 3600000),
                },
                {
                    id: '3',
                    type: 'POLICY_APPROVED',
                    title: 'موافقة',
                    description: 'عمولة المبيعات',
                    userName: 'سارة أحمد',
                    timestamp: new Date(Date.now() - 7200000),
                },
            ]);

            setAlerts([
                {
                    id: '1',
                    type: 'WARNING',
                    title: 'سياسات تنتظر الموافقة',
                    message: 'يوجد 3 سياسات تنتظر الموافقة',
                },
                {
                    id: '2',
                    type: 'INFO',
                    title: 'تحديث جديد',
                    message: 'تم إضافة ميزة المحاكاة المتقدمة',
                },
            ]);

            // بيانات الرسوم البيانية
            const last30Days = [];
            for (let i = 29; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                last30Days.push({
                    date: date.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' }),
                    executions: Math.floor(Math.random() * 200) + 100,
                    successful: Math.floor(Math.random() * 180) + 90,
                });
            }
            setExecutionsByDay(last30Days);

            setExecutionsByType([
                { name: 'مُطبق', value: 850, color: '#22c55e' },
                { name: 'متخطى', value: 120, color: '#eab308' },
                { name: 'خطأ', value: 30, color: '#ef4444' },
            ]);

            setImpactByDepartment([
                { department: 'المبيعات', additions: 45000, deductions: 8000 },
                { department: 'التقنية', additions: 35000, deductions: 5000 },
                { department: 'الموارد البشرية', additions: 20000, deductions: 3000 },
                { department: 'المالية', additions: 15000, deductions: 4000 },
                { department: 'التسويق', additions: 10000, deductions: 2000 },
            ]);

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getTrendIcon = (trend: string) => {
        switch (trend) {
            case 'UP':
                return <TrendingUpIcon sx={{ color: 'success.main' }} />;
            case 'DOWN':
                return <TrendingDownIcon sx={{ color: 'error.main' }} />;
            default:
                return <TrendingFlatIcon sx={{ color: 'grey.500' }} />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'GOOD':
                return 'success';
            case 'WARNING':
                return 'warning';
            case 'CRITICAL':
                return 'error';
            default:
                return 'default';
        }
    };

    const getAlertIcon = (type: string) => {
        switch (type) {
            case 'SUCCESS':
                return <SuccessIcon color="success" />;
            case 'WARNING':
                return <WarningIcon color="warning" />;
            case 'ERROR':
                return <ErrorIcon color="error" />;
            default:
                return <NotificationIcon color="info" />;
        }
    };

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('ar-SA').format(num);
    };

    const formatCurrency = (num: number) => {
        return `${formatNumber(num)} ريال`;
    };

    if (loading) {
        return (
            <Container maxWidth="xl" sx={{ py: 3 }}>
                <Grid container spacing={3}>
                    {[1, 2, 3, 4].map((i) => (
                        <Grid item xs={12} sm={6} md={3} key={i}>
                            <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2 }} />
                        </Grid>
                    ))}
                    <Grid item xs={12} md={8}>
                        <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
                    </Grid>
                </Grid>
            </Container>
        );
    }

    return (
        <Container maxWidth="xl" sx={{ py: 3 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Box>
                    <Typography variant="h4" fontWeight="bold" gutterBottom>
                        📊 لوحة تحكم السياسات الذكية
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        نظرة شاملة على أداء وتأثير السياسات الذكية
                    </Typography>
                </Box>
                <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={fetchDashboardData}
                >
                    تحديث
                </Button>
            </Box>

            {/* Alerts */}
            {alerts.length > 0 && (
                <Box sx={{ mb: 3 }}>
                    {alerts.map((alert) => (
                        <Alert
                            key={alert.id}
                            severity={alert.type.toLowerCase() as any}
                            sx={{ mb: 1 }}
                            onClose={() => setAlerts(alerts.filter(a => a.id !== alert.id))}
                        >
                            <strong>{alert.title}</strong> - {alert.message}
                        </Alert>
                    ))}
                </Box>
            )}

            {/* Stats Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                {/* إجمالي السياسات */}
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ 
                        height: '100%',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                    }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Box>
                                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                                        إجمالي السياسات
                                    </Typography>
                                    <Typography variant="h3" fontWeight="bold">
                                        {stats?.totalPolicies}
                                    </Typography>
                                    <Chip 
                                        label={`${stats?.activePolicies} نشطة`}
                                        size="small"
                                        sx={{ mt: 1, bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                                    />
                                </Box>
                                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
                                    <PolicyIcon />
                                </Avatar>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* التنفيذات اليوم */}
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ 
                        height: '100%',
                        background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
                        color: 'white',
                    }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Box>
                                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                                        التنفيذات اليوم
                                    </Typography>
                                    <Typography variant="h3" fontWeight="bold">
                                        {formatNumber(stats?.executionsToday || 0)}
                                    </Typography>
                                    <Chip 
                                        label={`${stats?.successRate}% نجاح`}
                                        size="small"
                                        sx={{ mt: 1, bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                                    />
                                </Box>
                                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
                                    <SpeedIcon />
                                </Avatar>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* الموظفين المتأثرين */}
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ 
                        height: '100%',
                        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                        color: 'white',
                    }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Box>
                                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                                        الموظفين المتأثرين
                                    </Typography>
                                    <Typography variant="h3" fontWeight="bold">
                                        {formatNumber(stats?.affectedEmployees || 0)}
                                    </Typography>
                                    <Chip 
                                        label="هذا الشهر"
                                        size="small"
                                        sx={{ mt: 1, bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                                    />
                                </Box>
                                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
                                    <PeopleIcon />
                                </Avatar>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* صافي التأثير */}
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ 
                        height: '100%',
                        background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                        color: 'white',
                    }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Box>
                                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                                        صافي التأثير
                                    </Typography>
                                    <Typography variant="h4" fontWeight="bold">
                                        {formatCurrency(stats?.totalImpact.net || 0)}
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                                        <Chip 
                                            label={`+${formatNumber(stats?.totalImpact.additions || 0)}`}
                                            size="small"
                                            sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                                        />
                                        <Chip 
                                            label={`-${formatNumber(stats?.totalImpact.deductions || 0)}`}
                                            size="small"
                                            sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                                        />
                                    </Box>
                                </Box>
                                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
                                    <MoneyIcon />
                                </Avatar>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* KPIs */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                {kpis.map((kpi) => (
                    <Grid item xs={12} sm={6} md={3} key={kpi.id}>
                        <Paper sx={{ p: 3, borderRadius: 3 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="body2" color="text.secondary">
                                    {kpi.name}
                                </Typography>
                                <Chip
                                    label={kpi.status === 'GOOD' ? 'جيد' : kpi.status === 'WARNING' ? 'تحذير' : 'حرج'}
                                    size="small"
                                    color={getStatusColor(kpi.status) as any}
                                />
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                                <Typography variant="h4" fontWeight="bold">
                                    {kpi.value}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {kpi.unit}
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                                {getTrendIcon(kpi.trend)}
                                <Typography
                                    variant="body2"
                                    color={kpi.change > 0 ? 'success.main' : kpi.change < 0 ? 'error.main' : 'text.secondary'}
                                >
                                    {kpi.change > 0 ? '+' : ''}{kpi.change}%
                                </Typography>
                                {kpi.target && (
                                    <Typography variant="body2" color="text.secondary">
                                        | الهدف: {kpi.target}{kpi.unit}
                                    </Typography>
                                )}
                            </Box>
                            {kpi.target && (
                                <LinearProgress
                                    variant="determinate"
                                    value={Math.min(100, (kpi.value / kpi.target) * 100)}
                                    color={getStatusColor(kpi.status) as any}
                                    sx={{ mt: 2, height: 6, borderRadius: 3 }}
                                />
                            )}
                        </Paper>
                    </Grid>
                ))}
            </Grid>

            {/* Charts Row */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                {/* Executions Chart */}
                <Grid item xs={12} md={8}>
                    <Paper sx={{ p: 3, borderRadius: 3 }}>
                        <Typography variant="h6" fontWeight="bold" gutterBottom>
                            📈 التنفيذات (آخر 30 يوم)
                        </Typography>
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={executionsByDay}>
                                <defs>
                                    <linearGradient id="colorExecutions" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorSuccessful" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#82ca9d" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" fontSize={12} />
                                <YAxis fontSize={12} />
                                <RechartsTooltip />
                                <Legend />
                                <Area
                                    type="monotone"
                                    dataKey="executions"
                                    name="التنفيذات"
                                    stroke="#8884d8"
                                    fillOpacity={1}
                                    fill="url(#colorExecutions)"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="successful"
                                    name="الناجحة"
                                    stroke="#82ca9d"
                                    fillOpacity={1}
                                    fill="url(#colorSuccessful)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>

                {/* Pie Chart */}
                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
                        <Typography variant="h6" fontWeight="bold" gutterBottom>
                            🥧 حالة التنفيذات
                        </Typography>
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie
                                    data={executionsByType}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                >
                                    {executionsByType.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <RechartsTooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>
            </Grid>

            {/* Bottom Row */}
            <Grid container spacing={3}>
                {/* Impact by Department */}
                <Grid item xs={12} md={8}>
                    <Paper sx={{ p: 3, borderRadius: 3 }}>
                        <Typography variant="h6" fontWeight="bold" gutterBottom>
                            🏢 التأثير حسب القسم
                        </Typography>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={impactByDepartment}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="department" fontSize={12} />
                                <YAxis fontSize={12} />
                                <RechartsTooltip />
                                <Legend />
                                <Bar dataKey="additions" name="إضافات" fill="#22c55e" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="deductions" name="خصومات" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>

                {/* Recent Activity */}
                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
                        <Typography variant="h6" fontWeight="bold" gutterBottom>
                            📋 النشاط الأخير
                        </Typography>
                        <List>
                            {activities.map((activity, index) => (
                                <Box key={activity.id}>
                                    <ListItem alignItems="flex-start" sx={{ px: 0 }}>
                                        <ListItemAvatar>
                                            <Avatar sx={{ bgcolor: 'primary.light' }}>
                                                <AIIcon fontSize="small" />
                                            </Avatar>
                                        </ListItemAvatar>
                                        <ListItemText
                                            primary={activity.title}
                                            secondary={
                                                <>
                                                    <Typography
                                                        component="span"
                                                        variant="body2"
                                                        color="text.primary"
                                                    >
                                                        {activity.description}
                                                    </Typography>
                                                    <br />
                                                    <Typography
                                                        component="span"
                                                        variant="caption"
                                                        color="text.secondary"
                                                    >
                                                        {activity.userName} • {activity.timestamp.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                                                    </Typography>
                                                </>
                                            }
                                        />
                                    </ListItem>
                                    {index < activities.length - 1 && <Divider variant="inset" component="li" />}
                                </Box>
                            ))}
                        </List>
                        <Button fullWidth variant="text" sx={{ mt: 2 }}>
                            عرض المزيد
                        </Button>
                    </Paper>
                </Grid>
            </Grid>
        </Container>
    );
}
