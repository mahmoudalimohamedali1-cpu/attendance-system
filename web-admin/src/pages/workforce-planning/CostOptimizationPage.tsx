import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Tooltip,
    CircularProgress,
} from '@mui/material';
import {
    ArrowBack,
    Refresh,
    Analytics,
    TrendingDown,
    Savings,
    Lightbulb,
    CheckCircle,
    Cancel,
    Schedule,
    PlayArrow,
    Warning,
    AutoAwesome,
    ThumbUp,
    ThumbDown,
    Info,
    AttachMoney,
} from '@mui/icons-material';
import {
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';
import {
    getCostOptimizations,
    getCostOptimizationSummary,
    generateCostOptimizations,
    updateCostOptimizationStatus,
    CostOptimizationRecommendationDto,
    CostOptimizationSummaryDto,
    OptimizationType,
    OptimizationStatus,
    GenerateCostOptimizationDto,
    UpdateOptimizationStatusDto,
} from '@/api/workforce-planning';

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

const OPTIMIZATION_TYPE_LABELS: Record<OptimizationType, string> = {
    [OptimizationType.SCHEDULE_ADJUSTMENT]: 'تعديل الجداول',
    [OptimizationType.HEADCOUNT_CHANGE]: 'تغيير عدد الموظفين',
    [OptimizationType.SHIFT_RESTRUCTURE]: 'إعادة هيكلة الورديات',
    [OptimizationType.OVERTIME_REDUCTION]: 'تقليل العمل الإضافي',
    [OptimizationType.COST_SAVING]: 'توفير التكاليف',
};

const OPTIMIZATION_STATUS_LABELS: Record<OptimizationStatus, string> = {
    [OptimizationStatus.PENDING]: 'قيد الانتظار',
    [OptimizationStatus.REVIEWED]: 'تمت المراجعة',
    [OptimizationStatus.APPROVED]: 'تمت الموافقة',
    [OptimizationStatus.IMPLEMENTED]: 'تم التنفيذ',
    [OptimizationStatus.REJECTED]: 'مرفوض',
};

const OPTIMIZATION_STATUS_COLORS: Record<OptimizationStatus, 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'> = {
    [OptimizationStatus.PENDING]: 'warning',
    [OptimizationStatus.REVIEWED]: 'info',
    [OptimizationStatus.APPROVED]: 'primary',
    [OptimizationStatus.IMPLEMENTED]: 'success',
    [OptimizationStatus.REJECTED]: 'error',
};

const PIE_COLORS = ['#1976d2', '#4caf50', '#ff9800', '#f44336', '#9c27b0'];

const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('ar-SA', {
        style: 'currency',
        currency: 'SAR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
};

export default function CostOptimizationPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [refreshKey, setRefreshKey] = useState(0);
    const [statusFilter, setStatusFilter] = useState<OptimizationStatus | ''>('');
    const [typeFilter, setTypeFilter] = useState<OptimizationType | ''>('');
    const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
    const [detailDialogOpen, setDetailDialogOpen] = useState(false);
    const [selectedRecommendation, setSelectedRecommendation] = useState<CostOptimizationRecommendationDto | null>(null);
    const [dateRange, setDateRange] = useState({
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });

    // Query for recommendations
    const { data: recommendations, isLoading: loadingRecommendations } = useQuery({
        queryKey: ['cost-optimizations', statusFilter, typeFilter, refreshKey],
        queryFn: async () => {
            const params: { status?: OptimizationStatus; optimizationType?: OptimizationType } = {};
            if (statusFilter) params.status = statusFilter;
            if (typeFilter) params.optimizationType = typeFilter;
            return getCostOptimizations(params);
        },
    });

    // Query for summary
    const { data: summary, isLoading: loadingSummary } = useQuery({
        queryKey: ['cost-optimization-summary', refreshKey],
        queryFn: () => getCostOptimizationSummary(),
    });

    // Generate mutation
    const generateMutation = useMutation({
        mutationFn: (dto: GenerateCostOptimizationDto) => generateCostOptimizations(dto),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cost-optimizations'] });
            queryClient.invalidateQueries({ queryKey: ['cost-optimization-summary'] });
            setGenerateDialogOpen(false);
        },
    });

    // Update status mutation
    const updateStatusMutation = useMutation({
        mutationFn: ({ id, dto }: { id: string; dto: UpdateOptimizationStatusDto }) =>
            updateCostOptimizationStatus(id, dto),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cost-optimizations'] });
            queryClient.invalidateQueries({ queryKey: ['cost-optimization-summary'] });
        },
    });

    const handleRefresh = () => {
        setRefreshKey((prev) => prev + 1);
    };

    const handleGenerate = () => {
        generateMutation.mutate({
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
        });
    };

    const handleStatusUpdate = (id: string, status: OptimizationStatus) => {
        updateStatusMutation.mutate({ id, dto: { status } });
    };

    const handleViewDetails = (recommendation: CostOptimizationRecommendationDto) => {
        setSelectedRecommendation(recommendation);
        setDetailDialogOpen(true);
    };

    const isLoading = loadingRecommendations || loadingSummary;

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
                        تحسين التكاليف
                    </Typography>
                </Box>
                <LinearProgress />
            </Box>
        );
    }

    // Prepare chart data
    const savingsByTypeData = summary?.byType
        ? Object.entries(summary.byType).map(([type, data]) => ({
            name: OPTIMIZATION_TYPE_LABELS[type as OptimizationType],
            savings: data.potentialSavings,
            count: data.count,
        }))
        : [];

    const statusDistributionData = summary?.byStatus
        ? Object.entries(summary.byStatus).map(([status, count]) => ({
            name: OPTIMIZATION_STATUS_LABELS[status as OptimizationStatus],
            value: count,
        }))
        : [];

    const totalSavings = summary?.totalPotentialSavings || 0;
    const totalRecommendations = summary?.totalRecommendations || 0;
    const pendingCount = summary?.byStatus?.[OptimizationStatus.PENDING] || 0;
    const implementedCount = summary?.byStatus?.[OptimizationStatus.IMPLEMENTED] || 0;

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
                            تحسين التكاليف
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            توصيات الذكاء الاصطناعي لتحسين التكاليف وزيادة الكفاءة التشغيلية
                        </Typography>
                    </Box>
                </Box>
                <Box display="flex" gap={2} alignItems="center">
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<AutoAwesome />}
                        onClick={() => setGenerateDialogOpen(true)}
                    >
                        توليد توصيات جديدة
                    </Button>
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
                        title="إجمالي التوفير المتوقع"
                        value={formatCurrency(totalSavings)}
                        subtitle="ريال سعودي"
                        icon={<Savings />}
                        color="success"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <MetricCard
                        title="إجمالي التوصيات"
                        value={totalRecommendations}
                        subtitle="توصية"
                        icon={<Lightbulb />}
                        color="primary"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <MetricCard
                        title="قيد الانتظار"
                        value={pendingCount}
                        subtitle="توصية"
                        icon={<Schedule />}
                        color="warning"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <MetricCard
                        title="تم التنفيذ"
                        value={implementedCount}
                        subtitle="توصية"
                        icon={<CheckCircle />}
                        color="success"
                    />
                </Grid>
            </Grid>

            {/* Charts Row */}
            <Grid container spacing={3} mb={3}>
                {/* Savings by Type */}
                <Grid item xs={12} md={8}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            التوفير المتوقع حسب النوع
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            توزيع فرص التوفير على أنواع التحسين المختلفة
                        </Typography>
                        <Divider sx={{ mb: 3 }} />
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={savingsByTypeData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="name"
                                    style={{ fontSize: '12px' }}
                                    angle={-45}
                                    textAnchor="end"
                                    height={80}
                                />
                                <YAxis
                                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                                />
                                <RechartsTooltip
                                    formatter={(value: number) => [formatCurrency(value), 'التوفير']}
                                    contentStyle={{
                                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                        border: '1px solid #ccc',
                                        borderRadius: '4px',
                                        padding: '10px'
                                    }}
                                />
                                <Bar
                                    dataKey="savings"
                                    name="التوفير"
                                    fill="#4caf50"
                                    radius={[4, 4, 0, 0]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>

                {/* Status Distribution */}
                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 3, height: '100%' }}>
                        <Typography variant="h6" gutterBottom>
                            توزيع الحالات
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            حالة التوصيات الحالية
                        </Typography>
                        <Divider sx={{ mb: 3 }} />
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie
                                    data={statusDistributionData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    labelLine={false}
                                >
                                    {statusDistributionData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                    ))}
                                </Pie>
                                <RechartsTooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>
            </Grid>

            {/* Recommendations Table */}
            <Paper sx={{ p: 3 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6">
                        التوصيات
                    </Typography>
                    <Box display="flex" gap={2}>
                        <TextField
                            select
                            size="small"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as OptimizationStatus | '')}
                            label="الحالة"
                            sx={{ minWidth: 150 }}
                        >
                            <MenuItem value="">الكل</MenuItem>
                            {Object.entries(OPTIMIZATION_STATUS_LABELS).map(([key, label]) => (
                                <MenuItem key={key} value={key}>{label}</MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            select
                            size="small"
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value as OptimizationType | '')}
                            label="النوع"
                            sx={{ minWidth: 150 }}
                        >
                            <MenuItem value="">الكل</MenuItem>
                            {Object.entries(OPTIMIZATION_TYPE_LABELS).map(([key, label]) => (
                                <MenuItem key={key} value={key}>{label}</MenuItem>
                            ))}
                        </TextField>
                    </Box>
                </Box>
                <Divider sx={{ mb: 2 }} />
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>العنوان</TableCell>
                                <TableCell>النوع</TableCell>
                                <TableCell>التوفير المتوقع</TableCell>
                                <TableCell>نسبة التوفير</TableCell>
                                <TableCell>الأولوية</TableCell>
                                <TableCell>الحالة</TableCell>
                                <TableCell>الإجراءات</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {recommendations && recommendations.length > 0 ? (
                                recommendations.map((rec) => (
                                    <TableRow key={rec.id} hover>
                                        <TableCell>
                                            <Box>
                                                <Typography variant="body2" fontWeight="medium">
                                                    {rec.title}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {rec.description.substring(0, 60)}...
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={OPTIMIZATION_TYPE_LABELS[rec.optimizationType]}
                                                size="small"
                                                variant="outlined"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" color="success.main" fontWeight="bold">
                                                {formatCurrency(rec.potentialSavings)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <TrendingDown color="success" fontSize="small" />
                                                <Typography variant="body2">
                                                    {rec.savingsPercentage.toFixed(1)}%
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={`P${rec.priority}`}
                                                size="small"
                                                color={rec.priority <= 2 ? 'error' : rec.priority <= 4 ? 'warning' : 'default'}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={OPTIMIZATION_STATUS_LABELS[rec.status]}
                                                size="small"
                                                color={OPTIMIZATION_STATUS_COLORS[rec.status]}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Box display="flex" gap={0.5}>
                                                <Tooltip title="عرض التفاصيل">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleViewDetails(rec)}
                                                    >
                                                        <Info fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                {rec.status === OptimizationStatus.PENDING && (
                                                    <>
                                                        <Tooltip title="موافقة">
                                                            <IconButton
                                                                size="small"
                                                                color="success"
                                                                onClick={() => handleStatusUpdate(rec.id, OptimizationStatus.APPROVED)}
                                                                disabled={updateStatusMutation.isPending}
                                                            >
                                                                <ThumbUp fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="رفض">
                                                            <IconButton
                                                                size="small"
                                                                color="error"
                                                                onClick={() => handleStatusUpdate(rec.id, OptimizationStatus.REJECTED)}
                                                                disabled={updateStatusMutation.isPending}
                                                            >
                                                                <ThumbDown fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </>
                                                )}
                                                {rec.status === OptimizationStatus.APPROVED && (
                                                    <Tooltip title="تم التنفيذ">
                                                        <IconButton
                                                            size="small"
                                                            color="primary"
                                                            onClick={() => handleStatusUpdate(rec.id, OptimizationStatus.IMPLEMENTED)}
                                                            disabled={updateStatusMutation.isPending}
                                                        >
                                                            <PlayArrow fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={7} align="center">
                                        <Box py={4}>
                                            <Analytics sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                                            <Typography variant="body1" color="text.secondary">
                                                لا توجد توصيات حاليًا
                                            </Typography>
                                            <Button
                                                variant="contained"
                                                startIcon={<AutoAwesome />}
                                                onClick={() => setGenerateDialogOpen(true)}
                                                sx={{ mt: 2 }}
                                            >
                                                توليد توصيات جديدة
                                            </Button>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* Top Priority Recommendations */}
            {summary?.topPriorityRecommendations && summary.topPriorityRecommendations.length > 0 && (
                <Paper sx={{ p: 3, mt: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        أهم التوصيات
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        التوصيات ذات الأولوية القصوى والتأثير الأكبر
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Grid container spacing={2}>
                        {summary.topPriorityRecommendations.slice(0, 3).map((rec) => (
                            <Grid item xs={12} md={4} key={rec.id}>
                                <Card variant="outlined" sx={{ height: '100%' }}>
                                    <CardContent>
                                        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                                            <Chip
                                                label={OPTIMIZATION_TYPE_LABELS[rec.optimizationType]}
                                                size="small"
                                                color="primary"
                                            />
                                            <Chip
                                                label={`P${rec.priority}`}
                                                size="small"
                                                color={rec.priority <= 2 ? 'error' : 'warning'}
                                            />
                                        </Box>
                                        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                                            {rec.title}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" mb={2}>
                                            {rec.description.substring(0, 100)}...
                                        </Typography>
                                        <Box display="flex" justifyContent="space-between" alignItems="center">
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">
                                                    التوفير المتوقع
                                                </Typography>
                                                <Typography variant="h6" color="success.main" fontWeight="bold">
                                                    {formatCurrency(rec.potentialSavings)}
                                                </Typography>
                                            </Box>
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                onClick={() => handleViewDetails(rec)}
                                            >
                                                التفاصيل
                                            </Button>
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </Paper>
            )}

            {/* Generate Dialog */}
            <Dialog
                open={generateDialogOpen}
                onClose={() => setGenerateDialogOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    <Box display="flex" alignItems="center" gap={1}>
                        <AutoAwesome color="primary" />
                        توليد توصيات جديدة
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" mb={3}>
                        سيقوم الذكاء الاصطناعي بتحليل بيانات القوى العاملة وتقديم توصيات لتحسين التكاليف
                    </Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={6}>
                            <TextField
                                fullWidth
                                type="date"
                                label="تاريخ البداية"
                                value={dateRange.startDate}
                                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                fullWidth
                                type="date"
                                label="تاريخ النهاية"
                                value={dateRange.endDate}
                                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                    </Grid>
                    {generateMutation.error && (
                        <Alert severity="error" sx={{ mt: 2 }}>
                            حدث خطأ أثناء توليد التوصيات. يرجى المحاولة مرة أخرى.
                        </Alert>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setGenerateDialogOpen(false)}>
                        إلغاء
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleGenerate}
                        disabled={generateMutation.isPending}
                        startIcon={generateMutation.isPending ? <CircularProgress size={20} /> : <AutoAwesome />}
                    >
                        {generateMutation.isPending ? 'جاري التحليل...' : 'توليد'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Detail Dialog */}
            <Dialog
                open={detailDialogOpen}
                onClose={() => setDetailDialogOpen(false)}
                maxWidth="md"
                fullWidth
            >
                {selectedRecommendation && (
                    <>
                        <DialogTitle>
                            <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                                <Box>
                                    <Typography variant="h6">
                                        {selectedRecommendation.title}
                                    </Typography>
                                    <Box display="flex" gap={1} mt={1}>
                                        <Chip
                                            label={OPTIMIZATION_TYPE_LABELS[selectedRecommendation.optimizationType]}
                                            size="small"
                                            color="primary"
                                        />
                                        <Chip
                                            label={OPTIMIZATION_STATUS_LABELS[selectedRecommendation.status]}
                                            size="small"
                                            color={OPTIMIZATION_STATUS_COLORS[selectedRecommendation.status]}
                                        />
                                    </Box>
                                </Box>
                                <Box textAlign="right">
                                    <Typography variant="caption" color="text.secondary">
                                        التوفير المتوقع
                                    </Typography>
                                    <Typography variant="h5" color="success.main" fontWeight="bold">
                                        {formatCurrency(selectedRecommendation.potentialSavings)}
                                    </Typography>
                                </Box>
                            </Box>
                        </DialogTitle>
                        <DialogContent dividers>
                            <Grid container spacing={3}>
                                {/* Description */}
                                <Grid item xs={12}>
                                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                        الوصف
                                    </Typography>
                                    <Typography variant="body1">
                                        {selectedRecommendation.description}
                                    </Typography>
                                </Grid>

                                {/* Cost Analysis */}
                                <Grid item xs={12} md={6}>
                                    <Paper variant="outlined" sx={{ p: 2 }}>
                                        <Typography variant="subtitle2" gutterBottom>
                                            تحليل التكاليف
                                        </Typography>
                                        <List dense>
                                            <ListItem>
                                                <ListItemIcon>
                                                    <AttachMoney color="error" />
                                                </ListItemIcon>
                                                <ListItemText
                                                    primary="التكلفة الحالية"
                                                    secondary={formatCurrency(selectedRecommendation.currentCost)}
                                                />
                                            </ListItem>
                                            <ListItem>
                                                <ListItemIcon>
                                                    <AttachMoney color="success" />
                                                </ListItemIcon>
                                                <ListItemText
                                                    primary="التكلفة بعد التحسين"
                                                    secondary={formatCurrency(selectedRecommendation.optimizedCost)}
                                                />
                                            </ListItem>
                                            <ListItem>
                                                <ListItemIcon>
                                                    <TrendingDown color="success" />
                                                </ListItemIcon>
                                                <ListItemText
                                                    primary="نسبة التوفير"
                                                    secondary={`${selectedRecommendation.savingsPercentage.toFixed(1)}%`}
                                                />
                                            </ListItem>
                                        </List>
                                    </Paper>
                                </Grid>

                                {/* Recommendations */}
                                <Grid item xs={12} md={6}>
                                    <Paper variant="outlined" sx={{ p: 2 }}>
                                        <Typography variant="subtitle2" gutterBottom>
                                            التوصيات
                                        </Typography>
                                        <Typography variant="body2">
                                            {selectedRecommendation.recommendations}
                                        </Typography>
                                    </Paper>
                                </Grid>

                                {/* Requirements */}
                                {selectedRecommendation.requirements && (
                                    <Grid item xs={12} md={6}>
                                        <Paper variant="outlined" sx={{ p: 2 }}>
                                            <Typography variant="subtitle2" gutterBottom>
                                                <Info fontSize="small" sx={{ verticalAlign: 'middle', mr: 1 }} />
                                                المتطلبات
                                            </Typography>
                                            <Typography variant="body2">
                                                {selectedRecommendation.requirements}
                                            </Typography>
                                        </Paper>
                                    </Grid>
                                )}

                                {/* Risks */}
                                {selectedRecommendation.risks && (
                                    <Grid item xs={12} md={6}>
                                        <Paper variant="outlined" sx={{ p: 2, borderColor: 'warning.main' }}>
                                            <Typography variant="subtitle2" gutterBottom>
                                                <Warning fontSize="small" color="warning" sx={{ verticalAlign: 'middle', mr: 1 }} />
                                                المخاطر المحتملة
                                            </Typography>
                                            <Typography variant="body2">
                                                {selectedRecommendation.risks}
                                            </Typography>
                                        </Paper>
                                    </Grid>
                                )}
                            </Grid>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setDetailDialogOpen(false)}>
                                إغلاق
                            </Button>
                            {selectedRecommendation.status === OptimizationStatus.PENDING && (
                                <>
                                    <Button
                                        color="error"
                                        startIcon={<Cancel />}
                                        onClick={() => {
                                            handleStatusUpdate(selectedRecommendation.id, OptimizationStatus.REJECTED);
                                            setDetailDialogOpen(false);
                                        }}
                                    >
                                        رفض
                                    </Button>
                                    <Button
                                        variant="contained"
                                        color="success"
                                        startIcon={<CheckCircle />}
                                        onClick={() => {
                                            handleStatusUpdate(selectedRecommendation.id, OptimizationStatus.APPROVED);
                                            setDetailDialogOpen(false);
                                        }}
                                    >
                                        موافقة
                                    </Button>
                                </>
                            )}
                            {selectedRecommendation.status === OptimizationStatus.APPROVED && (
                                <Button
                                    variant="contained"
                                    color="primary"
                                    startIcon={<PlayArrow />}
                                    onClick={() => {
                                        handleStatusUpdate(selectedRecommendation.id, OptimizationStatus.IMPLEMENTED);
                                        setDetailDialogOpen(false);
                                    }}
                                >
                                    تنفيذ
                                </Button>
                            )}
                        </DialogActions>
                    </>
                )}
            </Dialog>
        </Box>
    );
}
