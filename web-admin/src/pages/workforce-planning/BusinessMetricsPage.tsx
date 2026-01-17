import { useState, useRef } from 'react';
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
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Tabs,
    Tab,
} from '@mui/material';
import {
    ArrowBack,
    Add,
    TrendingUp,
    TrendingDown,
    Refresh,
    Visibility,
    Delete,
    Edit,
    Upload,
    Analytics,
    ShowChart,
    Assessment,
    MonetizationOn,
    Inventory,
    ShoppingCart,
    DirectionsCar,
    Work,
    Category,
} from '@mui/icons-material';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';
import {
    getBusinessMetrics,
    createBusinessMetric,
    bulkCreateBusinessMetrics,
    updateBusinessMetric,
    deleteBusinessMetric,
    getBusinessMetricsSummary,
    getBusinessMetricsTrends,
    analyzeBusinessMetrics,
    MetricType,
    CreateBusinessMetricDto,
    UpdateBusinessMetricDto,
    BusinessMetricResponseDto,
    MetricsSummaryDto,
    MetricsTrendDto,
    BusinessMetricsAnalysisDto,
    WorkforceCorrelation,
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

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;
    return (
        <div role="tabpanel" hidden={value !== index} {...other}>
            {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
        </div>
    );
}

export default function BusinessMetricsPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const [tabValue, setTabValue] = useState(0);
    const [openDialog, setOpenDialog] = useState(false);
    const [editingMetric, setEditingMetric] = useState<BusinessMetricResponseDto | null>(null);
    const [viewAnalysisDialog, setViewAnalysisDialog] = useState(false);
    const [filterType, setFilterType] = useState<MetricType | ''>('');
    const [trendType, setTrendType] = useState<MetricType>(MetricType.SALES);

    // Date range for analysis
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const [startDate, setStartDate] = useState(thirtyDaysAgo.toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);

    // Form state
    const [formData, setFormData] = useState<CreateBusinessMetricDto>({
        metricType: MetricType.SALES,
        metricName: '',
        date: today.toISOString().split('T')[0],
        value: 0,
        source: '',
    });

    // Fetch metrics
    const { data: metrics, isLoading, error } = useQuery({
        queryKey: ['business-metrics', refreshKey, filterType],
        queryFn: () => getBusinessMetrics(filterType ? { metricType: filterType } : undefined),
    });

    // Fetch summary
    const { data: summary } = useQuery({
        queryKey: ['business-metrics-summary', startDate, endDate],
        queryFn: () => getBusinessMetricsSummary({ startDate, endDate }),
    });

    // Fetch trends
    const { data: trends } = useQuery({
        queryKey: ['business-metrics-trends', trendType, startDate, endDate],
        queryFn: () => getBusinessMetricsTrends({ metricType: trendType, startDate, endDate }),
    });

    // Fetch analysis
    const { data: analysis, isLoading: isAnalyzing, refetch: refetchAnalysis } = useQuery({
        queryKey: ['business-metrics-analysis', startDate, endDate],
        queryFn: () => analyzeBusinessMetrics({ startDate, endDate }),
        enabled: false,
    });

    // Create mutation
    const createMutation = useMutation({
        mutationFn: createBusinessMetric,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['business-metrics'] });
            setOpenDialog(false);
            resetForm();
            setRefreshKey((prev) => prev + 1);
        },
    });

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: ({ id, dto }: { id: string; dto: UpdateBusinessMetricDto }) =>
            updateBusinessMetric(id, dto),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['business-metrics'] });
            setOpenDialog(false);
            setEditingMetric(null);
            resetForm();
            setRefreshKey((prev) => prev + 1);
        },
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: deleteBusinessMetric,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['business-metrics'] });
            setRefreshKey((prev) => prev + 1);
        },
    });

    // Bulk create mutation
    const bulkCreateMutation = useMutation({
        mutationFn: bulkCreateBusinessMetrics,
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ['business-metrics'] });
            setRefreshKey((prev) => prev + 1);
            alert(`تم استيراد ${result.created} سجل بنجاح. ${result.failed > 0 ? `فشل ${result.failed} سجل.` : ''}`);
        },
    });

    const resetForm = () => {
        setFormData({
            metricType: MetricType.SALES,
            metricName: '',
            date: today.toISOString().split('T')[0],
            value: 0,
            source: '',
        });
    };

    const handleRefresh = () => {
        setRefreshKey((prev) => prev + 1);
    };

    const handleOpenEdit = (metric: BusinessMetricResponseDto) => {
        setEditingMetric(metric);
        setFormData({
            metricType: metric.metricType,
            metricName: metric.metricName,
            date: new Date(metric.date).toISOString().split('T')[0],
            value: metric.value,
            source: metric.source || '',
        });
        setOpenDialog(true);
    };

    const handleSubmit = () => {
        if (editingMetric) {
            updateMutation.mutate({
                id: editingMetric.id,
                dto: {
                    value: formData.value,
                    source: formData.source || undefined,
                },
            });
        } else {
            createMutation.mutate(formData);
        }
    };

    const handleDelete = (id: string) => {
        if (confirm('هل أنت متأكد من حذف هذا المقياس؟')) {
            deleteMutation.mutate(id);
        }
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setEditingMetric(null);
        resetForm();
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result as string;
                const lines = text.split('\n').filter(line => line.trim());
                const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

                const metricsToCreate: CreateBusinessMetricDto[] = [];
                for (let i = 1; i < lines.length; i++) {
                    const values = lines[i].split(',').map(v => v.trim());
                    if (values.length >= 4) {
                        const metricTypeIndex = headers.indexOf('type') !== -1 ? headers.indexOf('type') : headers.indexOf('metrictype');
                        const nameIndex = headers.indexOf('name') !== -1 ? headers.indexOf('name') : headers.indexOf('metricname');
                        const dateIndex = headers.indexOf('date');
                        const valueIndex = headers.indexOf('value');

                        if (metricTypeIndex !== -1 && nameIndex !== -1 && dateIndex !== -1 && valueIndex !== -1) {
                            const typeValue = values[metricTypeIndex].toUpperCase();
                            if (Object.values(MetricType).includes(typeValue as MetricType)) {
                                metricsToCreate.push({
                                    metricType: typeValue as MetricType,
                                    metricName: values[nameIndex],
                                    date: values[dateIndex],
                                    value: parseFloat(values[valueIndex]) || 0,
                                });
                            }
                        }
                    }
                }

                if (metricsToCreate.length > 0) {
                    bulkCreateMutation.mutate({ metrics: metricsToCreate });
                } else {
                    alert('لم يتم العثور على بيانات صالحة في الملف. تأكد من أن الملف يحتوي على الأعمدة: type, name, date, value');
                }
            } catch (err) {
                alert('خطأ في قراءة الملف. تأكد من أن الملف بتنسيق CSV صحيح.');
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    };

    const handleRunAnalysis = () => {
        refetchAnalysis();
        setViewAnalysisDialog(true);
    };

    const getMetricTypeLabel = (type: MetricType): string => {
        const labels = {
            [MetricType.SALES]: 'المبيعات',
            [MetricType.PRODUCTION]: 'الإنتاج',
            [MetricType.ORDERS]: 'الطلبات',
            [MetricType.TRAFFIC]: 'الحركة',
            [MetricType.WORKLOAD]: 'عبء العمل',
            [MetricType.CUSTOM]: 'مخصص',
        };
        return labels[type] || type;
    };

    const getMetricTypeIcon = (type: MetricType) => {
        const icons = {
            [MetricType.SALES]: <MonetizationOn />,
            [MetricType.PRODUCTION]: <Inventory />,
            [MetricType.ORDERS]: <ShoppingCart />,
            [MetricType.TRAFFIC]: <DirectionsCar />,
            [MetricType.WORKLOAD]: <Work />,
            [MetricType.CUSTOM]: <Category />,
        };
        return icons[type] || <Category />;
    };

    const getMetricTypeColor = (type: MetricType): 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' => {
        const colors = {
            [MetricType.SALES]: 'success',
            [MetricType.PRODUCTION]: 'primary',
            [MetricType.ORDERS]: 'info',
            [MetricType.TRAFFIC]: 'warning',
            [MetricType.WORKLOAD]: 'secondary',
            [MetricType.CUSTOM]: 'primary',
        };
        return colors[type] as any || 'primary';
    };

    const getImpactColor = (impact: string): 'success' | 'warning' | 'error' => {
        const colors = {
            LOW: 'success',
            MEDIUM: 'warning',
            HIGH: 'error',
        };
        return colors[impact as keyof typeof colors] || 'warning';
    };

    const getImpactLabel = (impact: string): string => {
        const labels = {
            LOW: 'منخفض',
            MEDIUM: 'متوسط',
            HIGH: 'مرتفع',
        };
        return labels[impact as keyof typeof labels] || impact;
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
                        مقاييس الأعمال
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
                        مقاييس الأعمال
                    </Typography>
                </Box>
                <Alert severity="error" sx={{ mt: 2 }}>
                    حدث خطأ أثناء تحميل البيانات. يرجى المحاولة مرة أخرى.
                </Alert>
            </Box>
        );
    }

    const metricsList = metrics || [];
    const totalMetrics = metricsList.length;
    const salesMetrics = metricsList.filter(m => m.metricType === MetricType.SALES);
    const productionMetrics = metricsList.filter(m => m.metricType === MetricType.PRODUCTION);

    // Calculate summary totals
    const totalSalesValue = salesMetrics.reduce((sum, m) => sum + m.value, 0);
    const avgProductionValue = productionMetrics.length > 0
        ? productionMetrics.reduce((sum, m) => sum + m.value, 0) / productionMetrics.length
        : 0;

    // Prepare trends chart data
    const trendsChartData = (trends || []).map((t: MetricsTrendDto) => ({
        date: new Date(t.date).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' }),
        value: t.value,
        change: t.changePercentage,
    }));

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
                            مقاييس الأعمال
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            إدارة وتحليل مقاييس المبيعات والإنتاج وربطها بالقوى العاملة
                        </Typography>
                    </Box>
                </Box>
                <Box display="flex" gap={2}>
                    <Button
                        variant="outlined"
                        startIcon={<Refresh />}
                        onClick={handleRefresh}
                    >
                        تحديث
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<Upload />}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        استيراد CSV
                    </Button>
                    <input
                        type="file"
                        accept=".csv"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        onChange={handleFileUpload}
                    />
                    <Button
                        variant="outlined"
                        startIcon={<Analytics />}
                        onClick={handleRunAnalysis}
                        disabled={isAnalyzing}
                    >
                        {isAnalyzing ? 'جاري التحليل...' : 'تحليل AI'}
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={() => setOpenDialog(true)}
                    >
                        إضافة مقياس
                    </Button>
                </Box>
            </Box>

            {/* Key Metrics */}
            <Grid container spacing={3} mb={3}>
                <Grid item xs={12} sm={6} md={3}>
                    <MetricCard
                        title="إجمالي المقاييس"
                        value={totalMetrics}
                        subtitle="مقاييس مسجلة"
                        icon={<Assessment />}
                        color="primary"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <MetricCard
                        title="إجمالي المبيعات"
                        value={totalSalesValue.toLocaleString()}
                        subtitle={`${salesMetrics.length} سجلات`}
                        icon={<MonetizationOn />}
                        color="success"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <MetricCard
                        title="متوسط الإنتاج"
                        value={avgProductionValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        subtitle={`${productionMetrics.length} سجلات`}
                        icon={<Inventory />}
                        color="info"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <MetricCard
                        title="أنواع المقاييس"
                        value={new Set(metricsList.map(m => m.metricType)).size}
                        subtitle="أنواع مختلفة"
                        icon={<ShowChart />}
                        color="warning"
                    />
                </Grid>
            </Grid>

            {/* Tabs */}
            <Paper sx={{ mb: 3 }}>
                <Tabs
                    value={tabValue}
                    onChange={(_, newValue) => setTabValue(newValue)}
                    sx={{ borderBottom: 1, borderColor: 'divider' }}
                >
                    <Tab label="قائمة المقاييس" />
                    <Tab label="اتجاهات المقاييس" />
                    <Tab label="ملخص الفترة" />
                </Tabs>

                {/* Metrics List Tab */}
                <TabPanel value={tabValue} index={0}>
                    <Box sx={{ p: 3 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                            <Typography variant="h6">المقاييس المسجلة</Typography>
                            <TextField
                                select
                                size="small"
                                label="تصفية حسب النوع"
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value as MetricType | '')}
                                sx={{ minWidth: 200 }}
                            >
                                <MenuItem value="">جميع الأنواع</MenuItem>
                                <MenuItem value={MetricType.SALES}>المبيعات</MenuItem>
                                <MenuItem value={MetricType.PRODUCTION}>الإنتاج</MenuItem>
                                <MenuItem value={MetricType.ORDERS}>الطلبات</MenuItem>
                                <MenuItem value={MetricType.TRAFFIC}>الحركة</MenuItem>
                                <MenuItem value={MetricType.WORKLOAD}>عبء العمل</MenuItem>
                                <MenuItem value={MetricType.CUSTOM}>مخصص</MenuItem>
                            </TextField>
                        </Box>
                        <Divider sx={{ mb: 2 }} />
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>النوع</TableCell>
                                        <TableCell>الاسم</TableCell>
                                        <TableCell>التاريخ</TableCell>
                                        <TableCell>القيمة</TableCell>
                                        <TableCell>المصدر</TableCell>
                                        <TableCell>الإجراءات</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {metricsList.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} align="center">
                                                <Box py={4}>
                                                    <Assessment sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                                                    <Typography variant="h6" color="text.secondary" gutterBottom>
                                                        لا توجد مقاييس مسجلة
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary" mb={2}>
                                                        ابدأ بإضافة مقاييس الأعمال لتحليل الارتباط مع القوى العاملة
                                                    </Typography>
                                                    <Button
                                                        variant="contained"
                                                        startIcon={<Add />}
                                                        onClick={() => setOpenDialog(true)}
                                                    >
                                                        إضافة مقياس
                                                    </Button>
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        metricsList.slice(0, 20).map((metric) => (
                                            <TableRow key={metric.id} hover>
                                                <TableCell>
                                                    <Chip
                                                        icon={getMetricTypeIcon(metric.metricType)}
                                                        label={getMetricTypeLabel(metric.metricType)}
                                                        size="small"
                                                        color={getMetricTypeColor(metric.metricType)}
                                                        variant="outlined"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="subtitle2" fontWeight="bold">
                                                        {metric.metricName}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    {new Date(metric.date).toLocaleDateString('ar-SA')}
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight="bold">
                                                        {metric.value.toLocaleString()}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {metric.source || '-'}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleOpenEdit(metric)}
                                                        color="primary"
                                                    >
                                                        <Edit />
                                                    </IconButton>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleDelete(metric.id)}
                                                        color="error"
                                                    >
                                                        <Delete />
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        {metricsList.length > 20 && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2, textAlign: 'center' }}>
                                عرض 20 من {metricsList.length} سجل
                            </Typography>
                        )}
                    </Box>
                </TabPanel>

                {/* Trends Tab */}
                <TabPanel value={tabValue} index={1}>
                    <Box sx={{ p: 3 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                            <Typography variant="h6">اتجاهات المقاييس</Typography>
                            <Box display="flex" gap={2}>
                                <TextField
                                    select
                                    size="small"
                                    label="نوع المقياس"
                                    value={trendType}
                                    onChange={(e) => setTrendType(e.target.value as MetricType)}
                                    sx={{ minWidth: 150 }}
                                >
                                    <MenuItem value={MetricType.SALES}>المبيعات</MenuItem>
                                    <MenuItem value={MetricType.PRODUCTION}>الإنتاج</MenuItem>
                                    <MenuItem value={MetricType.ORDERS}>الطلبات</MenuItem>
                                    <MenuItem value={MetricType.TRAFFIC}>الحركة</MenuItem>
                                    <MenuItem value={MetricType.WORKLOAD}>عبء العمل</MenuItem>
                                </TextField>
                                <TextField
                                    size="small"
                                    type="date"
                                    label="من"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    InputLabelProps={{ shrink: true }}
                                />
                                <TextField
                                    size="small"
                                    type="date"
                                    label="إلى"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Box>
                        </Box>
                        <Divider sx={{ mb: 3 }} />
                        {trendsChartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={400}>
                                <LineChart data={trendsChartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" style={{ fontSize: '12px' }} />
                                    <YAxis />
                                    <RechartsTooltip
                                        contentStyle={{
                                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                            border: '1px solid #ccc',
                                            borderRadius: '4px',
                                            padding: '10px'
                                        }}
                                        formatter={(value: number, name: string) => [
                                            value.toLocaleString(),
                                            name === 'value' ? 'القيمة' : 'التغيير %'
                                        ]}
                                    />
                                    <Legend />
                                    <Line
                                        type="monotone"
                                        dataKey="value"
                                        name="القيمة"
                                        stroke="#1976d2"
                                        strokeWidth={2}
                                        dot={{ fill: '#1976d2' }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <Box textAlign="center" py={6}>
                                <ShowChart sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                                <Typography variant="h6" color="text.secondary">
                                    لا توجد بيانات اتجاهات للفترة المحددة
                                </Typography>
                            </Box>
                        )}
                    </Box>
                </TabPanel>

                {/* Summary Tab */}
                <TabPanel value={tabValue} index={2}>
                    <Box sx={{ p: 3 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                            <Typography variant="h6">ملخص المقاييس</Typography>
                            <Box display="flex" gap={2}>
                                <TextField
                                    size="small"
                                    type="date"
                                    label="من"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    InputLabelProps={{ shrink: true }}
                                />
                                <TextField
                                    size="small"
                                    type="date"
                                    label="إلى"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Box>
                        </Box>
                        <Divider sx={{ mb: 3 }} />
                        {summary && summary.length > 0 ? (
                            <Grid container spacing={3}>
                                {summary.map((s: MetricsSummaryDto) => (
                                    <Grid item xs={12} md={6} lg={4} key={s.metricType}>
                                        <Card>
                                            <CardContent>
                                                <Box display="flex" alignItems="center" gap={1} mb={2}>
                                                    {getMetricTypeIcon(s.metricType)}
                                                    <Typography variant="h6">
                                                        {getMetricTypeLabel(s.metricType)}
                                                    </Typography>
                                                </Box>
                                                <Divider sx={{ mb: 2 }} />
                                                <Grid container spacing={1}>
                                                    <Grid item xs={6}>
                                                        <Typography variant="caption" color="text.secondary">الإجمالي</Typography>
                                                        <Typography variant="body1" fontWeight="bold">
                                                            {s.total.toLocaleString()}
                                                        </Typography>
                                                    </Grid>
                                                    <Grid item xs={6}>
                                                        <Typography variant="caption" color="text.secondary">المتوسط</Typography>
                                                        <Typography variant="body1" fontWeight="bold">
                                                            {s.average.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                        </Typography>
                                                    </Grid>
                                                    <Grid item xs={6}>
                                                        <Typography variant="caption" color="text.secondary">الحد الأدنى</Typography>
                                                        <Typography variant="body1">{s.min.toLocaleString()}</Typography>
                                                    </Grid>
                                                    <Grid item xs={6}>
                                                        <Typography variant="caption" color="text.secondary">الحد الأقصى</Typography>
                                                        <Typography variant="body1">{s.max.toLocaleString()}</Typography>
                                                    </Grid>
                                                    <Grid item xs={12}>
                                                        <Typography variant="caption" color="text.secondary">عدد السجلات</Typography>
                                                        <Typography variant="body1">{s.count}</Typography>
                                                    </Grid>
                                                </Grid>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>
                        ) : (
                            <Box textAlign="center" py={6}>
                                <Assessment sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                                <Typography variant="h6" color="text.secondary">
                                    لا توجد بيانات ملخص للفترة المحددة
                                </Typography>
                            </Box>
                        )}
                    </Box>
                </TabPanel>
            </Paper>

            {/* Create/Edit Dialog */}
            <Dialog
                open={openDialog}
                onClose={handleCloseDialog}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    <Box display="flex" alignItems="center" gap={1}>
                        {editingMetric ? <Edit /> : <Add />}
                        <Typography variant="h6">
                            {editingMetric ? 'تعديل المقياس' : 'إضافة مقياس جديد'}
                        </Typography>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12}>
                            <TextField
                                select
                                fullWidth
                                label="نوع المقياس"
                                value={formData.metricType}
                                onChange={(e) => setFormData({ ...formData, metricType: e.target.value as MetricType })}
                                required
                                disabled={!!editingMetric}
                            >
                                <MenuItem value={MetricType.SALES}>المبيعات</MenuItem>
                                <MenuItem value={MetricType.PRODUCTION}>الإنتاج</MenuItem>
                                <MenuItem value={MetricType.ORDERS}>الطلبات</MenuItem>
                                <MenuItem value={MetricType.TRAFFIC}>الحركة</MenuItem>
                                <MenuItem value={MetricType.WORKLOAD}>عبء العمل</MenuItem>
                                <MenuItem value={MetricType.CUSTOM}>مخصص</MenuItem>
                            </TextField>
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="اسم المقياس"
                                value={formData.metricName}
                                onChange={(e) => setFormData({ ...formData, metricName: e.target.value })}
                                required
                                disabled={!!editingMetric}
                                placeholder="مثال: مبيعات الفرع الرئيسي"
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="التاريخ"
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                InputLabelProps={{ shrink: true }}
                                required
                                disabled={!!editingMetric}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                type="number"
                                label="القيمة"
                                value={formData.value}
                                onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                                required
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="المصدر (اختياري)"
                                value={formData.source}
                                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                                placeholder="مثال: نظام نقاط البيع، ERP"
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>
                        إلغاء
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleSubmit}
                        disabled={
                            !formData.metricName ||
                            !formData.date ||
                            createMutation.isPending ||
                            updateMutation.isPending
                        }
                    >
                        {createMutation.isPending || updateMutation.isPending
                            ? 'جاري الحفظ...'
                            : editingMetric ? 'تحديث' : 'إضافة'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* AI Analysis Dialog */}
            <Dialog
                open={viewAnalysisDialog}
                onClose={() => setViewAnalysisDialog(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    <Box display="flex" alignItems="center" gap={1}>
                        <Analytics />
                        <Typography variant="h6">تحليل الذكاء الاصطناعي</Typography>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    {isAnalyzing ? (
                        <Box textAlign="center" py={4}>
                            <LinearProgress sx={{ mb: 2 }} />
                            <Typography>جاري تحليل البيانات...</Typography>
                        </Box>
                    ) : analysis ? (
                        <Box>
                            {/* Summary */}
                            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>ملخص التحليل</Typography>
                            <Grid container spacing={2} sx={{ mb: 3 }}>
                                {analysis.summaries?.map((s: MetricsSummaryDto) => (
                                    <Grid item xs={6} md={3} key={s.metricType}>
                                        <Card variant="outlined">
                                            <CardContent sx={{ py: 1.5 }}>
                                                <Typography variant="caption" color="text.secondary">
                                                    {getMetricTypeLabel(s.metricType)}
                                                </Typography>
                                                <Typography variant="h6">{s.total.toLocaleString()}</Typography>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>

                            {/* Insights */}
                            {analysis.insights && analysis.insights.length > 0 && (
                                <>
                                    <Typography variant="h6" gutterBottom>رؤى التحليل</Typography>
                                    <Box sx={{ mb: 3 }}>
                                        {analysis.insights.map((insight: string, index: number) => (
                                            <Alert key={index} severity="info" sx={{ mb: 1 }}>
                                                {insight}
                                            </Alert>
                                        ))}
                                    </Box>
                                </>
                            )}

                            {/* Workforce Correlation */}
                            {analysis.workforceCorrelation && analysis.workforceCorrelation.length > 0 && (
                                <>
                                    <Typography variant="h6" gutterBottom>ارتباط القوى العاملة</Typography>
                                    <TableContainer component={Paper} variant="outlined">
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>المقياس</TableCell>
                                                    <TableCell>الارتباط</TableCell>
                                                    <TableCell>التأثير</TableCell>
                                                    <TableCell>التوصية</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {analysis.workforceCorrelation.map((corr: WorkforceCorrelation, index: number) => (
                                                    <TableRow key={index}>
                                                        <TableCell>{corr.metric}</TableCell>
                                                        <TableCell>
                                                            <Box display="flex" alignItems="center" gap={1}>
                                                                {corr.correlation > 0 ? (
                                                                    <TrendingUp color="success" fontSize="small" />
                                                                ) : (
                                                                    <TrendingDown color="error" fontSize="small" />
                                                                )}
                                                                {(corr.correlation * 100).toFixed(1)}%
                                                            </Box>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Chip
                                                                label={getImpactLabel(corr.impact)}
                                                                size="small"
                                                                color={getImpactColor(corr.impact)}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography variant="caption">{corr.recommendation}</Typography>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </>
                            )}
                        </Box>
                    ) : (
                        <Box textAlign="center" py={4}>
                            <Analytics sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                            <Typography color="text.secondary">
                                لا تتوفر بيانات تحليل حالياً
                            </Typography>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setViewAnalysisDialog(false)}>
                        إغلاق
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
