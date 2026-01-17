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
} from '@mui/material';
import {
    TrendingUp,
    People,
    Warning,
    CalendarMonth,
    Analytics,
    Schedule,
    BusinessCenter,
    Refresh,
    Assessment,
} from '@mui/icons-material';
import { getForecast, ForecastRequestDto } from '@/api/workforce-planning';

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

export default function WorkforcePlanningDashboard() {
    const navigate = useNavigate();
    const [refreshKey, setRefreshKey] = useState(0);

    // Get date range for default forecast (next 30 days)
    const getDefaultDateRange = () => {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 30);

        return {
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
        };
    };

    // Fetch forecast data
    const { data: forecast, isLoading, error } = useQuery({
        queryKey: ['workforce-forecast', refreshKey],
        queryFn: async () => {
            const dateRange = getDefaultDateRange();
            const params: ForecastRequestDto = {
                startDate: dateRange.startDate,
                endDate: dateRange.endDate,
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
                <Typography variant="h4" gutterBottom>
                    التخطيط الاستراتيجي للقوى العاملة
                </Typography>
                <LinearProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Box>
                <Typography variant="h4" gutterBottom>
                    التخطيط الاستراتيجي للقوى العاملة
                </Typography>
                <Alert severity="error" sx={{ mt: 2 }}>
                    حدث خطأ أثناء تحميل البيانات. يرجى المحاولة مرة أخرى.
                </Alert>
            </Box>
        );
    }

    // Calculate summary metrics
    const totalGaps = forecast?.coverageGaps?.length || 0;
    const criticalGaps = forecast?.coverageGaps?.filter((gap) => gap.severity === 'HIGH' || gap.severity === 'CRITICAL').length || 0;
    const totalPredictions = forecast?.predictions?.length || 0;
    const avgConfidence = forecast?.predictions?.length
        ? Math.round(forecast.predictions.reduce((sum, p) => sum + p.confidence, 0) / forecast.predictions.length)
        : 0;

    return (
        <Box>
            {/* Page Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box>
                    <Typography variant="h4" gutterBottom>
                        التخطيط الاستراتيجي للقوى العاملة
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        تحليل شامل للتنبؤات والتخطيط المستقبلي باستخدام الذكاء الاصطناعي
                    </Typography>
                </Box>
                <Button
                    variant="outlined"
                    startIcon={<Refresh />}
                    onClick={handleRefresh}
                >
                    تحديث
                </Button>
            </Box>

            {/* Metrics Overview */}
            <Grid container spacing={3} mb={3}>
                <Grid item xs={12} sm={6} md={3}>
                    <MetricCard
                        title="إجمالي التنبؤات"
                        value={totalPredictions}
                        subtitle={`للأيام الـ ${totalPredictions} القادمة`}
                        icon={<Analytics />}
                        color="primary"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <MetricCard
                        title="فجوات التغطية"
                        value={totalGaps}
                        subtitle={`${criticalGaps} فجوة حرجة`}
                        icon={<Warning />}
                        color={criticalGaps > 0 ? 'error' : 'success'}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <MetricCard
                        title="متوسط الثقة"
                        value={`${avgConfidence}%`}
                        subtitle="دقة التنبؤات"
                        icon={<TrendingUp />}
                        color="info"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <MetricCard
                        title="الوفورات المحتملة"
                        value={forecast?.costOptimization?.savings
                            ? `${forecast.costOptimization.savings.toLocaleString()} ر.س`
                            : '0 ر.س'}
                        subtitle={forecast?.costOptimization?.savingsPercentage
                            ? `${forecast.costOptimization.savingsPercentage.toFixed(1)}% توفير`
                            : 'لا توجد بيانات'}
                        icon={<BusinessCenter />}
                        color="success"
                    />
                </Grid>
            </Grid>

            {/* Quick Actions */}
            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                    الإجراءات السريعة
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={3}>
                        <Button
                            fullWidth
                            variant="outlined"
                            startIcon={<TrendingUp />}
                            onClick={() => navigate('/workforce-planning/forecast')}
                        >
                            التنبؤ بالاحتياجات
                        </Button>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Button
                            fullWidth
                            variant="outlined"
                            startIcon={<Schedule />}
                            onClick={() => navigate('/workforce-planning/optimize')}
                        >
                            تحسين الجداول
                        </Button>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Button
                            fullWidth
                            variant="outlined"
                            startIcon={<CalendarMonth />}
                            onClick={() => navigate('/workforce-planning/coverage')}
                        >
                            تحليل التغطية
                        </Button>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Button
                            fullWidth
                            variant="outlined"
                            startIcon={<People />}
                            onClick={() => navigate('/workforce-planning/scenarios')}
                        >
                            محاكاة السيناريوهات
                        </Button>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Button
                            fullWidth
                            variant="outlined"
                            startIcon={<Assessment />}
                            onClick={() => navigate('/workforce-planning/business-metrics')}
                        >
                            مؤشرات الأعمال
                        </Button>
                    </Grid>
                </Grid>
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

            {/* Coverage Gaps Summary */}
            {forecast?.coverageGaps && forecast.coverageGaps.length > 0 && (
                <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        ملخص فجوات التغطية
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Box display="flex" flexDirection="column" gap={2}>
                        {forecast.coverageGaps.slice(0, 5).map((gap, index) => (
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
                                        {gap.department}
                                    </Typography>
                                    <Chip
                                        label={gap.severity === 'HIGH' || gap.severity === 'CRITICAL' ? 'حرج' : 'متوسط'}
                                        color={gap.severity === 'HIGH' || gap.severity === 'CRITICAL' ? 'error' : 'warning'}
                                        size="small"
                                    />
                                </Box>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    الفترة: {new Date(gap.startDate).toLocaleDateString('ar-SA')} - {new Date(gap.endDate).toLocaleDateString('ar-SA')}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    النقص: {gap.gapSize} موظف
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                </Paper>
            )}
        </Box>
    );
}
