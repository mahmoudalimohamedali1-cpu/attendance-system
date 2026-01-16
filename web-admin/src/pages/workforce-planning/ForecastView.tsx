import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Grid,
    Card,
    CardContent,
    Typography,
    Button,
    Alert,
    LinearProgress,
    Paper,
    Divider,
    Chip,
    TextField,
    MenuItem,
} from '@mui/material';
import {
    TrendingUp,
    ArrowBack,
    Refresh,
    Analytics,
    CalendarMonth,
    Warning,
} from '@mui/icons-material';
import {
    LineChart,
    Line,
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    Legend,
    ResponsiveContainer,
    Cell,
} from 'recharts';
import { getForecast, ForecastRequestDto, ForecastType } from '@/api/workforce-planning';

interface MetricCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ReactNode;
    color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
}

const MetricCard = ({ title, value, subtitle, icon, color = 'primary' }: MetricCardProps) => (
    <Card sx={{ height: '100%' }}>
        <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        {title}
                    </Typography>
                    <Typography variant="h4" component="div" fontWeight="bold">
                        {value}
                    </Typography>
                    {subtitle && (
                        <Typography variant="caption" color="text.secondary">
                            {subtitle}
                        </Typography>
                    )}
                </Box>
                <Box
                    sx={{
                        bgcolor: `${color}.main`,
                        color: `${color}.contrastText`,
                        borderRadius: 2,
                        p: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    {icon}
                </Box>
            </Box>
        </CardContent>
    </Card>
);

export default function ForecastView() {
    const navigate = useNavigate();
    const [refreshKey, setRefreshKey] = useState(0);
    const [forecastDays, setForecastDays] = useState(30);

    const getDateRange = () => {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + forecastDays);

        return {
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
        };
    };

    const { data: forecast, isLoading, error } = useQuery({
        queryKey: ['workforce-forecast-view', forecastDays, refreshKey],
        queryFn: async () => {
            const dateRange = getDateRange();
            const params: ForecastRequestDto = {
                startDate: dateRange.startDate,
                endDate: dateRange.endDate,
                type: ForecastType.STAFFING_NEEDS,
            };
            return getForecast(params);
        },
    });

    const handleRefresh = () => {
        setRefreshKey((prev) => prev + 1);
    };

    if (isLoading) {
        return (
            <Box>
                <Box display="flex" alignItems="center" gap={2} mb={3}>
                    <Button
                        startIcon={<ArrowBack />}
                        onClick={() => navigate('/workforce-planning')}
                    >
                        رجوع
                    </Button>
                    <Typography variant="h4">
                        التنبؤ بالاحتياجات
                    </Typography>
                </Box>
                <LinearProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Box>
                <Box display="flex" alignItems="center" gap={2} mb={3}>
                    <Button
                        startIcon={<ArrowBack />}
                        onClick={() => navigate('/workforce-planning')}
                    >
                        رجوع
                    </Button>
                    <Typography variant="h4">
                        التنبؤ بالاحتياجات
                    </Typography>
                </Box>
                <Alert severity="error" sx={{ mt: 2 }}>
                    حدث خطأ أثناء تحميل بيانات التنبؤ. يرجى المحاولة مرة أخرى.
                </Alert>
            </Box>
        );
    }

    // Prepare chart data from predictions
    const chartData = forecast?.predictions?.map((pred) => ({
        date: new Date(pred.date).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' }),
        required: pred.requiredStaff,
        available: pred.availableStaff,
        gap: pred.gap,
        confidence: pred.confidence,
    })) || [];

    // Calculate summary metrics
    const totalPredictions = forecast?.predictions?.length || 0;
    const avgGap = forecast?.predictions?.length
        ? Math.round(forecast.predictions.reduce((sum, p) => Math.abs(p.gap), 0) / forecast.predictions.length)
        : 0;
    const maxGap = forecast?.predictions?.length
        ? Math.max(...forecast.predictions.map(p => Math.abs(p.gap)))
        : 0;
    const avgConfidence = forecast?.predictions?.length
        ? Math.round(forecast.predictions.reduce((sum, p) => sum + p.confidence, 0) / forecast.predictions.length)
        : 0;
    const criticalDays = forecast?.predictions?.filter(p => Math.abs(p.gap) > 5).length || 0;

    return (
        <Box>
            {/* Page Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box display="flex" alignItems="center" gap={2}>
                    <Button
                        startIcon={<ArrowBack />}
                        onClick={() => navigate('/workforce-planning')}
                    >
                        رجوع
                    </Button>
                    <Box>
                        <Typography variant="h4" gutterBottom>
                            التنبؤ بالاحتياجات
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            تحليل الاحتياجات المستقبلية للقوى العاملة باستخدام الذكاء الاصطناعي
                        </Typography>
                    </Box>
                </Box>
                <Box display="flex" gap={2} alignItems="center">
                    <TextField
                        select
                        size="small"
                        value={forecastDays}
                        onChange={(e) => setForecastDays(Number(e.target.value))}
                        label="فترة التنبؤ"
                        sx={{ minWidth: 150 }}
                    >
                        <MenuItem value={7}>7 أيام</MenuItem>
                        <MenuItem value={14}>14 يوم</MenuItem>
                        <MenuItem value={30}>30 يوم</MenuItem>
                        <MenuItem value={60}>60 يوم</MenuItem>
                        <MenuItem value={90}>90 يوم</MenuItem>
                    </TextField>
                    <Button
                        variant="outlined"
                        startIcon={<Refresh />}
                        onClick={handleRefresh}
                    >
                        تحديث
                    </Button>
                </Box>
            </Box>

            {/* Key Metrics */}
            <Grid container spacing={3} mb={3}>
                <Grid item xs={12} sm={6} md={3}>
                    <MetricCard
                        title="عدد الأيام المتوقعة"
                        value={totalPredictions}
                        subtitle={`${forecastDays} يوم قادم`}
                        icon={<CalendarMonth />}
                        color="primary"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <MetricCard
                        title="متوسط الفجوة"
                        value={avgGap}
                        subtitle="موظف يوميًا"
                        icon={<Warning />}
                        color={avgGap > 3 ? 'error' : 'warning'}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <MetricCard
                        title="أيام حرجة"
                        value={criticalDays}
                        subtitle={`من ${totalPredictions} يوم`}
                        icon={<Analytics />}
                        color={criticalDays > 5 ? 'error' : 'info'}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <MetricCard
                        title="دقة التنبؤ"
                        value={`${avgConfidence}%`}
                        subtitle="متوسط الثقة"
                        icon={<TrendingUp />}
                        color={avgConfidence > 75 ? 'success' : 'warning'}
                    />
                </Grid>
            </Grid>

            {/* Main Forecast Chart - Staffing Trends */}
            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                    التنبؤ بالاحتياجات - المطلوب مقابل المتوفر
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                    توقعات احتياجات الموظفين مقارنة بالموظفين المتوفرين للأيام القادمة
                </Typography>
                <Divider sx={{ mb: 3 }} />
                <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                            dataKey="date"
                            style={{ fontSize: '12px' }}
                        />
                        <YAxis
                            label={{ value: 'عدد الموظفين', angle: -90, position: 'insideLeft' }}
                        />
                        <RechartsTooltip
                            contentStyle={{
                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                                padding: '10px'
                            }}
                        />
                        <Legend />
                        <Area
                            type="monotone"
                            dataKey="required"
                            name="الموظفون المطلوبون"
                            stroke="#1976d2"
                            fill="#1976d2"
                            fillOpacity={0.3}
                            strokeWidth={2}
                        />
                        <Area
                            type="monotone"
                            dataKey="available"
                            name="الموظفون المتوفرون"
                            stroke="#4caf50"
                            fill="#4caf50"
                            fillOpacity={0.3}
                            strokeWidth={2}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </Paper>

            {/* Gap Analysis Chart */}
            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                    تحليل الفجوات
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                    الفرق بين الموظفين المطلوبين والمتوفرين (القيم الموجبة = نقص، القيم السالبة = فائض)
                </Typography>
                <Divider sx={{ mb: 3 }} />
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                            dataKey="date"
                            style={{ fontSize: '12px' }}
                        />
                        <YAxis
                            label={{ value: 'الفجوة', angle: -90, position: 'insideLeft' }}
                        />
                        <RechartsTooltip
                            contentStyle={{
                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                                padding: '10px'
                            }}
                        />
                        <Bar
                            dataKey="gap"
                            name="الفجوة"
                            radius={[4, 4, 0, 0]}
                        >
                            {chartData.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry.gap > 0 ? '#f44336' : '#4caf50'}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </Paper>

            {/* Confidence Levels Chart */}
            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                    مستوى ثقة التنبؤات
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                    مستوى دقة توقعات الذكاء الاصطناعي لكل يوم
                </Typography>
                <Divider sx={{ mb: 3 }} />
                <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                            dataKey="date"
                            style={{ fontSize: '12px' }}
                        />
                        <YAxis
                            domain={[0, 100]}
                            label={{ value: 'نسبة الثقة (%)', angle: -90, position: 'insideLeft' }}
                        />
                        <RechartsTooltip
                            contentStyle={{
                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                                padding: '10px'
                            }}
                        />
                        <Line
                            type="monotone"
                            dataKey="confidence"
                            name="مستوى الثقة"
                            stroke="#9c27b0"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </Paper>

            {/* AI Insights */}
            {forecast?.insights && forecast.insights.length > 0 && (
                <Paper sx={{ p: 3, mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        رؤى الذكاء الاصطناعي
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Box display="flex" flexDirection="column" gap={1}>
                        {forecast.insights.map((insight, index) => (
                            <Alert key={index} severity="info" icon={<Analytics />}>
                                {insight}
                            </Alert>
                        ))}
                    </Box>
                </Paper>
            )}

            {/* Critical Days Summary */}
            {criticalDays > 0 && (
                <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        الأيام الحرجة
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        الأيام التي تحتاج إلى انتباه خاص (فجوة أكبر من 5 موظفين)
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Box display="flex" flexDirection="column" gap={2}>
                        {forecast?.predictions
                            ?.filter(p => Math.abs(p.gap) > 5)
                            .slice(0, 10)
                            .map((pred, index) => (
                                <Box
                                    key={index}
                                    sx={{
                                        p: 2,
                                        bgcolor: 'background.default',
                                        borderRadius: 1,
                                        border: 1,
                                        borderColor: 'divider',
                                    }}
                                >
                                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                        <Typography variant="subtitle1" fontWeight="bold">
                                            {new Date(pred.date).toLocaleDateString('ar-SA', {
                                                weekday: 'long',
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </Typography>
                                        <Chip
                                            label={pred.gap > 0 ? `نقص ${Math.abs(pred.gap)} موظف` : `فائض ${Math.abs(pred.gap)} موظف`}
                                            color={pred.gap > 0 ? 'error' : 'success'}
                                            size="small"
                                        />
                                    </Box>
                                    <Grid container spacing={2}>
                                        <Grid item xs={4}>
                                            <Typography variant="caption" color="text.secondary">
                                                المطلوب
                                            </Typography>
                                            <Typography variant="body1" fontWeight="bold">
                                                {pred.requiredStaff}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={4}>
                                            <Typography variant="caption" color="text.secondary">
                                                المتوفر
                                            </Typography>
                                            <Typography variant="body1" fontWeight="bold">
                                                {pred.availableStaff}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={4}>
                                            <Typography variant="caption" color="text.secondary">
                                                الثقة
                                            </Typography>
                                            <Typography variant="body1" fontWeight="bold">
                                                {pred.confidence}%
                                            </Typography>
                                        </Grid>
                                    </Grid>
                                </Box>
                            ))}
                    </Box>
                </Paper>
            )}
        </Box>
    );
}
