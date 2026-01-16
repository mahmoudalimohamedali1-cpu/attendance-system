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
} from '@mui/material';
import {
    ArrowBack,
    Add,
    Science,
    TrendingUp,
    TrendingDown,
    MonetizationOn,
    People,
    Refresh,
    Visibility,
    Delete,
} from '@mui/icons-material';
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    Legend,
    ResponsiveContainer,
    Cell,
} from 'recharts';
import {
    getScenarios,
    createScenario,
    CreateScenarioRequestDto,
    ScenarioResponseDto,
    ScenarioType,
    ScenarioStatus,
    ScenarioParameters,
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

export default function ScenarioModeling() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [refreshKey, setRefreshKey] = useState(0);
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedScenario, setSelectedScenario] = useState<ScenarioResponseDto | null>(null);
    const [viewDetailDialog, setViewDetailDialog] = useState(false);

    // Form state
    const [formData, setFormData] = useState<CreateScenarioRequestDto>({
        name: '',
        description: '',
        type: ScenarioType.HIRE,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        parameters: {
            employeeCount: 0,
            averageSalary: 0,
            changePercentage: 0,
        },
    });

    // Fetch scenarios
    const { data: scenarios, isLoading, error } = useQuery({
        queryKey: ['workforce-scenarios', refreshKey],
        queryFn: getScenarios,
    });

    // Create scenario mutation
    const createMutation = useMutation({
        mutationFn: createScenario,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workforce-scenarios'] });
            setOpenDialog(false);
            resetForm();
            setRefreshKey((prev) => prev + 1);
        },
    });

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            type: ScenarioType.HIRE,
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            parameters: {
                employeeCount: 0,
                averageSalary: 0,
                changePercentage: 0,
            },
        });
    };

    const handleRefresh = () => {
        setRefreshKey((prev) => prev + 1);
    };

    const handleCreateScenario = () => {
        createMutation.mutate(formData);
    };

    const handleViewDetails = (scenario: ScenarioResponseDto) => {
        setSelectedScenario(scenario);
        setViewDetailDialog(true);
    };

    const getScenarioTypeLabel = (type: ScenarioType): string => {
        const labels = {
            [ScenarioType.HIRE]: 'توظيف موظفين',
            [ScenarioType.TERMINATE]: 'إنهاء خدمات',
            [ScenarioType.SCHEDULE_CHANGE]: 'تغيير الجداول',
            [ScenarioType.COST_REDUCTION]: 'تقليل التكاليف',
            [ScenarioType.EXPANSION]: 'التوسع',
        };
        return labels[type] || type;
    };

    const getStatusLabel = (status: ScenarioStatus): string => {
        const labels = {
            [ScenarioStatus.DRAFT]: 'مسودة',
            [ScenarioStatus.ANALYZING]: 'جاري التحليل',
            [ScenarioStatus.COMPLETED]: 'مكتمل',
            [ScenarioStatus.IMPLEMENTED]: 'تم التطبيق',
            [ScenarioStatus.REJECTED]: 'مرفوض',
        };
        return labels[status] || status;
    };

    const getStatusColor = (status: ScenarioStatus): 'default' | 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning' => {
        const colors = {
            [ScenarioStatus.DRAFT]: 'default',
            [ScenarioStatus.ANALYZING]: 'info',
            [ScenarioStatus.COMPLETED]: 'success',
            [ScenarioStatus.IMPLEMENTED]: 'primary',
            [ScenarioStatus.REJECTED]: 'error',
        };
        return colors[status] as any || 'default';
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
                        محاكاة السيناريوهات
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
                        محاكاة السيناريوهات
                    </Typography>
                </Box>
                <Alert severity="error" sx={{ mt: 2 }}>
                    حدث خطأ أثناء تحميل السيناريوهات. يرجى المحاولة مرة أخرى.
                </Alert>
            </Box>
        );
    }

    const scenariosList = scenarios || [];
    const totalScenarios = scenariosList.length;
    const completedScenarios = scenariosList.filter(s => s.status === ScenarioStatus.COMPLETED).length;
    const implementedScenarios = scenariosList.filter(s => s.status === ScenarioStatus.IMPLEMENTED).length;

    // Calculate total potential savings
    const totalSavings = scenariosList
        .filter(s => s.impact && s.impact.costDifference < 0)
        .reduce((sum, s) => sum + Math.abs(s.impact.costDifference), 0);

    // Prepare chart data
    const chartData = scenariosList.slice(0, 5).map(scenario => ({
        name: scenario.name.substring(0, 20),
        baseline: scenario.impact?.baselineCost || 0,
        projected: scenario.impact?.projectedCost || 0,
        savings: Math.abs(scenario.impact?.costDifference || 0),
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
                            محاكاة السيناريوهات
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            إنشاء وتحليل سيناريوهات ماذا-لو لاتخاذ قرارات استراتيجية
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
                        variant="contained"
                        startIcon={<Add />}
                        onClick={() => setOpenDialog(true)}
                    >
                        إنشاء سيناريو جديد
                    </Button>
                </Box>
            </Box>

            {/* Key Metrics */}
            <Grid container spacing={3} mb={3}>
                <Grid item xs={12} sm={6} md={3}>
                    <MetricCard
                        title="إجمالي السيناريوهات"
                        value={totalScenarios}
                        subtitle="سيناريوهات محفوظة"
                        icon={<Science />}
                        color="primary"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <MetricCard
                        title="سيناريوهات مكتملة"
                        value={completedScenarios}
                        subtitle={`${implementedScenarios} تم تطبيقها`}
                        icon={<TrendingUp />}
                        color="success"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <MetricCard
                        title="الوفورات المحتملة"
                        value={totalSavings.toLocaleString()}
                        subtitle="ريال سعودي"
                        icon={<MonetizationOn />}
                        color="info"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <MetricCard
                        title="سيناريوهات نشطة"
                        value={scenariosList.filter(s =>
                            s.status === ScenarioStatus.ANALYZING ||
                            s.status === ScenarioStatus.COMPLETED
                        ).length}
                        subtitle="جاري التحليل أو مكتملة"
                        icon={<People />}
                        color="warning"
                    />
                </Grid>
            </Grid>

            {/* Cost Impact Chart */}
            {chartData.length > 0 && (
                <Paper sx={{ p: 3, mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        التأثير على التكاليف - أحدث السيناريوهات
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        مقارنة بين التكاليف الحالية والمتوقعة للسيناريوهات المختلفة
                    </Typography>
                    <Divider sx={{ mb: 3 }} />
                    <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey="name"
                                style={{ fontSize: '12px' }}
                            />
                            <YAxis
                                label={{ value: 'التكلفة (ر.س)', angle: -90, position: 'insideLeft' }}
                            />
                            <RechartsTooltip
                                contentStyle={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                    border: '1px solid #ccc',
                                    borderRadius: '4px',
                                    padding: '10px'
                                }}
                                formatter={(value: number) => `${value.toLocaleString()} ر.س`}
                            />
                            <Legend />
                            <Bar
                                dataKey="baseline"
                                name="التكلفة الحالية"
                                fill="#1976d2"
                                radius={[4, 4, 0, 0]}
                            />
                            <Bar
                                dataKey="projected"
                                name="التكلفة المتوقعة"
                                fill="#4caf50"
                                radius={[4, 4, 0, 0]}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </Paper>
            )}

            {/* Scenarios Table */}
            <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                    السيناريوهات المحفوظة
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>اسم السيناريو</TableCell>
                                <TableCell>النوع</TableCell>
                                <TableCell>الحالة</TableCell>
                                <TableCell>الفترة</TableCell>
                                <TableCell>التكلفة الحالية</TableCell>
                                <TableCell>التكلفة المتوقعة</TableCell>
                                <TableCell>الفرق</TableCell>
                                <TableCell>الإجراءات</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {scenariosList.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} align="center">
                                        <Box py={4}>
                                            <Science sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                                            <Typography variant="h6" color="text.secondary" gutterBottom>
                                                لا توجد سيناريوهات محفوظة
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary" mb={2}>
                                                ابدأ بإنشاء سيناريو جديد لتحليل التأثير المحتمل
                                            </Typography>
                                            <Button
                                                variant="contained"
                                                startIcon={<Add />}
                                                onClick={() => setOpenDialog(true)}
                                            >
                                                إنشاء سيناريو جديد
                                            </Button>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                scenariosList.map((scenario) => {
                                    const costDiff = scenario.impact?.costDifference || 0;
                                    const isSavings = costDiff < 0;

                                    return (
                                        <TableRow key={scenario.id} hover>
                                            <TableCell>
                                                <Typography variant="subtitle2" fontWeight="bold">
                                                    {scenario.name}
                                                </Typography>
                                                {scenario.description && (
                                                    <Typography variant="caption" color="text.secondary">
                                                        {scenario.description}
                                                    </Typography>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={getScenarioTypeLabel(scenario.type)}
                                                    size="small"
                                                    variant="outlined"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={getStatusLabel(scenario.status)}
                                                    size="small"
                                                    color={getStatusColor(scenario.status)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="caption" display="block">
                                                    {new Date(scenario.startDate).toLocaleDateString('ar-SA')}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    إلى {new Date(scenario.endDate).toLocaleDateString('ar-SA')}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                {scenario.impact?.baselineCost?.toLocaleString() || 0} ر.س
                                            </TableCell>
                                            <TableCell>
                                                {scenario.impact?.projectedCost?.toLocaleString() || 0} ر.س
                                            </TableCell>
                                            <TableCell>
                                                <Box display="flex" alignItems="center" gap={1}>
                                                    {isSavings ? (
                                                        <TrendingDown sx={{ color: 'success.main', fontSize: 20 }} />
                                                    ) : (
                                                        <TrendingUp sx={{ color: 'error.main', fontSize: 20 }} />
                                                    )}
                                                    <Typography
                                                        variant="body2"
                                                        fontWeight="bold"
                                                        color={isSavings ? 'success.main' : 'error.main'}
                                                    >
                                                        {isSavings ? '-' : '+'}{Math.abs(costDiff).toLocaleString()} ر.س
                                                    </Typography>
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleViewDetails(scenario)}
                                                    color="primary"
                                                >
                                                    <Visibility />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* Create Scenario Dialog */}
            <Dialog
                open={openDialog}
                onClose={() => setOpenDialog(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    <Box display="flex" alignItems="center" gap={1}>
                        <Science />
                        <Typography variant="h6">إنشاء سيناريو جديد</Typography>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="اسم السيناريو"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="الوصف (اختياري)"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                multiline
                                rows={2}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                select
                                fullWidth
                                label="نوع السيناريو"
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value as ScenarioType })}
                                required
                            >
                                <MenuItem value={ScenarioType.HIRE}>توظيف موظفين جدد</MenuItem>
                                <MenuItem value={ScenarioType.TERMINATE}>إنهاء خدمات موظفين</MenuItem>
                                <MenuItem value={ScenarioType.SCHEDULE_CHANGE}>تغيير جداول العمل</MenuItem>
                                <MenuItem value={ScenarioType.COST_REDUCTION}>تقليل التكاليف</MenuItem>
                                <MenuItem value={ScenarioType.EXPANSION}>خطة توسع</MenuItem>
                            </TextField>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                type="number"
                                label="عدد الموظفين"
                                value={formData.parameters.employeeCount}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    parameters: { ...formData.parameters, employeeCount: Number(e.target.value) }
                                })}
                                inputProps={{ min: 0 }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="من تاريخ"
                                type="date"
                                value={formData.startDate}
                                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                InputLabelProps={{ shrink: true }}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="إلى تاريخ"
                                type="date"
                                value={formData.endDate}
                                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                InputLabelProps={{ shrink: true }}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                type="number"
                                label="متوسط الراتب (ر.س)"
                                value={formData.parameters.averageSalary}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    parameters: { ...formData.parameters, averageSalary: Number(e.target.value) }
                                })}
                                inputProps={{ min: 0 }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                type="number"
                                label="نسبة التغيير (%)"
                                value={formData.parameters.changePercentage}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    parameters: { ...formData.parameters, changePercentage: Number(e.target.value) }
                                })}
                                inputProps={{ min: -100, max: 100 }}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDialog(false)}>
                        إلغاء
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleCreateScenario}
                        disabled={!formData.name || !formData.startDate || !formData.endDate || createMutation.isPending}
                    >
                        {createMutation.isPending ? 'جاري الإنشاء...' : 'إنشاء وتحليل'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* View Details Dialog */}
            <Dialog
                open={viewDetailDialog}
                onClose={() => setViewDetailDialog(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    <Typography variant="h6">{selectedScenario?.name}</Typography>
                </DialogTitle>
                <DialogContent>
                    {selectedScenario && (
                        <Box>
                            <Grid container spacing={2} sx={{ mb: 3 }}>
                                <Grid item xs={12}>
                                    <Typography variant="body2" color="text.secondary">
                                        {selectedScenario.description || 'لا يوجد وصف'}
                                    </Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="caption" color="text.secondary">النوع:</Typography>
                                    <Typography variant="body1">{getScenarioTypeLabel(selectedScenario.type)}</Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="caption" color="text.secondary">الحالة:</Typography>
                                    <Box mt={0.5}>
                                        <Chip
                                            label={getStatusLabel(selectedScenario.status)}
                                            color={getStatusColor(selectedScenario.status)}
                                            size="small"
                                        />
                                    </Box>
                                </Grid>
                            </Grid>

                            <Divider sx={{ my: 2 }} />

                            <Typography variant="h6" gutterBottom>تحليل التأثير</Typography>
                            <Grid container spacing={2} sx={{ mb: 3 }}>
                                <Grid item xs={6}>
                                    <Card>
                                        <CardContent>
                                            <Typography variant="caption" color="text.secondary">التكلفة الحالية</Typography>
                                            <Typography variant="h5" fontWeight="bold">
                                                {selectedScenario.impact?.baselineCost?.toLocaleString() || 0} ر.س
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={6}>
                                    <Card>
                                        <CardContent>
                                            <Typography variant="caption" color="text.secondary">التكلفة المتوقعة</Typography>
                                            <Typography variant="h5" fontWeight="bold">
                                                {selectedScenario.impact?.projectedCost?.toLocaleString() || 0} ر.س
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={6}>
                                    <Card>
                                        <CardContent>
                                            <Typography variant="caption" color="text.secondary">التغيير في التكلفة</Typography>
                                            <Typography
                                                variant="h5"
                                                fontWeight="bold"
                                                color={
                                                    (selectedScenario.impact?.costDifference || 0) < 0
                                                        ? 'success.main'
                                                        : 'error.main'
                                                }
                                            >
                                                {(selectedScenario.impact?.costDifference || 0) < 0 ? '-' : '+'}
                                                {Math.abs(selectedScenario.impact?.costDifference || 0).toLocaleString()} ر.س
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                ({selectedScenario.impact?.costChangePercentage?.toFixed(1) || 0}%)
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={6}>
                                    <Card>
                                        <CardContent>
                                            <Typography variant="caption" color="text.secondary">التغيير في التغطية</Typography>
                                            <Typography variant="h5" fontWeight="bold">
                                                {selectedScenario.impact?.coverageChange > 0 ? '+' : ''}
                                                {selectedScenario.impact?.coverageChange?.toFixed(1) || 0}%
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            </Grid>

                            {selectedScenario.impact?.aiInsights && (
                                <>
                                    <Divider sx={{ my: 2 }} />
                                    <Typography variant="h6" gutterBottom>رؤى الذكاء الاصطناعي</Typography>
                                    <Alert severity="info" sx={{ mb: 2 }}>
                                        {selectedScenario.impact.aiInsights}
                                    </Alert>
                                </>
                            )}

                            {selectedScenario.impact?.benefits && selectedScenario.impact.benefits.length > 0 && (
                                <>
                                    <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>الفوائد:</Typography>
                                    <Box component="ul" sx={{ pl: 2 }}>
                                        {selectedScenario.impact.benefits.map((benefit, index) => (
                                            <Typography component="li" key={index} variant="body2" sx={{ mb: 1 }}>
                                                {benefit}
                                            </Typography>
                                        ))}
                                    </Box>
                                </>
                            )}

                            {selectedScenario.impact?.risks && selectedScenario.impact.risks.length > 0 && (
                                <>
                                    <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>المخاطر:</Typography>
                                    <Box component="ul" sx={{ pl: 2 }}>
                                        {selectedScenario.impact.risks.map((risk, index) => (
                                            <Typography component="li" key={index} variant="body2" sx={{ mb: 1 }} color="error">
                                                {risk}
                                            </Typography>
                                        ))}
                                    </Box>
                                </>
                            )}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setViewDetailDialog(false)}>
                        إغلاق
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
