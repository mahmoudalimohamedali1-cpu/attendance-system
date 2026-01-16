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
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tabs,
    Tab,
} from '@mui/material';
import {
    ArrowBack,
    Refresh,
    Warning,
    CheckCircle,
    Error,
    Groups,
    Schedule,
    TrendingDown,
    Lightbulb,
    BusinessCenter,
} from '@mui/icons-material';
import {
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
    getCoverageGaps,
    CoverageAnalysisRequestDto,
    CoverageAnalysisType,
    GapSeverity,
    DepartmentCoverage,
    ShiftCoverage,
    CoverageGapDetail,
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

const getSeverityColor = (severity: GapSeverity): 'success' | 'warning' | 'error' | 'info' => {
    switch (severity) {
        case GapSeverity.CRITICAL:
            return 'error';
        case GapSeverity.HIGH:
            return 'error';
        case GapSeverity.MEDIUM:
            return 'warning';
        case GapSeverity.LOW:
            return 'success';
        default:
            return 'info';
    }
};

const getSeverityLabel = (severity: GapSeverity): string => {
    switch (severity) {
        case GapSeverity.CRITICAL:
            return 'حرج';
        case GapSeverity.HIGH:
            return 'عالي';
        case GapSeverity.MEDIUM:
            return 'متوسط';
        case GapSeverity.LOW:
            return 'منخفض';
        default:
            return 'غير محدد';
    }
};

const getCoverageColor = (percentage: number): string => {
    if (percentage >= 90) return '#4caf50';
    if (percentage >= 70) return '#ff9800';
    if (percentage >= 50) return '#f44336';
    return '#d32f2f';
};

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

const TabPanel = ({ children, value, index }: TabPanelProps) => (
    <div role="tabpanel" hidden={value !== index}>
        {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
);

export default function CoverageAnalysisPage() {
    const navigate = useNavigate();
    const [refreshKey, setRefreshKey] = useState(0);
    const [selectedDate, setSelectedDate] = useState(() => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    });
    const [analysisType, setAnalysisType] = useState<CoverageAnalysisType>(CoverageAnalysisType.DAILY);
    const [tabValue, setTabValue] = useState(0);

    const { data: coverage, isLoading, error } = useQuery({
        queryKey: ['coverage-analysis', selectedDate, analysisType, refreshKey],
        queryFn: async () => {
            const params: CoverageAnalysisRequestDto = {
                date: selectedDate,
                analysisType: analysisType,
            };
            return getCoverageGaps(params);
        },
    });

    const handleRefresh = () => {
        setRefreshKey((prev) => prev + 1);
    };

    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
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
                        تحليل التغطية
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
                        تحليل التغطية
                    </Typography>
                </Box>
                <Alert severity="error" sx={{ mt: 2 }}>
                    حدث خطأ أثناء تحميل بيانات التغطية. يرجى المحاولة مرة أخرى.
                </Alert>
            </Box>
        );
    }

    // Prepare chart data for departments
    const departmentChartData = coverage?.departmentCoverage?.map((dept: DepartmentCoverage) => ({
        name: dept.departmentName,
        required: dept.requiredStaff,
        available: dept.availableStaff,
        present: dept.presentStaff,
        coverage: dept.coveragePercentage,
        gap: dept.gap,
    })) || [];

    // Prepare chart data for shifts
    const shiftChartData = coverage?.shiftCoverage?.map((shift: ShiftCoverage) => ({
        name: shift.shiftName,
        required: shift.requiredStaff,
        scheduled: shift.scheduledStaff,
        coverage: shift.coveragePercentage,
        gap: shift.gap,
    })) || [];

    // Calculate summary metrics
    const totalDepartments = coverage?.departmentCoverage?.length || 0;
    const criticalGapsCount = coverage?.criticalGaps?.length || 0;
    const overallCoverage = coverage?.overallCoveragePercentage || 0;
    const totalGaps = coverage?.totalGaps || 0;

    const getStatusIcon = () => {
        if (overallCoverage >= 90) return <CheckCircle />;
        if (overallCoverage >= 70) return <Warning />;
        return <Error />;
    };

    const getStatusColor = (): 'success' | 'warning' | 'error' => {
        if (overallCoverage >= 90) return 'success';
        if (overallCoverage >= 70) return 'warning';
        return 'error';
    };

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
                            تحليل التغطية
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            تحليل تغطية الأقسام والورديات وعرض تنبيهات الفجوات
                        </Typography>
                    </Box>
                </Box>
                <Box display="flex" gap={2} alignItems="center">
                    <TextField
                        type="date"
                        size="small"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        label="التاريخ"
                        InputLabelProps={{ shrink: true }}
                        sx={{ minWidth: 150 }}
                    />
                    <TextField
                        select
                        size="small"
                        value={analysisType}
                        onChange={(e) => setAnalysisType(e.target.value as CoverageAnalysisType)}
                        label="نوع التحليل"
                        sx={{ minWidth: 150 }}
                    >
                        <MenuItem value={CoverageAnalysisType.DAILY}>يومي</MenuItem>
                        <MenuItem value={CoverageAnalysisType.WEEKLY}>أسبوعي</MenuItem>
                        <MenuItem value={CoverageAnalysisType.MONTHLY}>شهري</MenuItem>
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

            {/* Overall Status Alert */}
            {coverage?.overallStatus && (
                <Alert
                    severity={getStatusColor()}
                    icon={getStatusIcon()}
                    sx={{ mb: 3 }}
                >
                    <Typography variant="body1" fontWeight="bold">
                        حالة التغطية العامة: {coverage.overallStatus}
                    </Typography>
                </Alert>
            )}

            {/* Key Metrics */}
            <Grid container spacing={3} mb={3}>
                <Grid item xs={12} sm={6} md={3}>
                    <MetricCard
                        title="نسبة التغطية الكلية"
                        value={`${overallCoverage}%`}
                        subtitle="معدل التغطية العام"
                        icon={getStatusIcon()}
                        color={getStatusColor()}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <MetricCard
                        title="إجمالي الفجوات"
                        value={totalGaps}
                        subtitle="فجوات في التغطية"
                        icon={<TrendingDown />}
                        color={totalGaps > 0 ? 'warning' : 'success'}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <MetricCard
                        title="الفجوات الحرجة"
                        value={criticalGapsCount}
                        subtitle="تحتاج إجراء فوري"
                        icon={<Warning />}
                        color={criticalGapsCount > 0 ? 'error' : 'success'}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <MetricCard
                        title="الأقسام"
                        value={totalDepartments}
                        subtitle="قسم تحت المراقبة"
                        icon={<BusinessCenter />}
                        color="primary"
                    />
                </Grid>
            </Grid>

            {/* Tabs for Department and Shift Views */}
            <Paper sx={{ mb: 3 }}>
                <Tabs
                    value={tabValue}
                    onChange={handleTabChange}
                    sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
                >
                    <Tab icon={<Groups />} label="تغطية الأقسام" />
                    <Tab icon={<Schedule />} label="تغطية الورديات" />
                </Tabs>

                {/* Department Coverage Tab */}
                <TabPanel value={tabValue} index={0}>
                    <Box sx={{ p: 3, pt: 0 }}>
                        <Typography variant="h6" gutterBottom>
                            تغطية الأقسام
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            مقارنة الموظفين المطلوبين والمتوفرين لكل قسم
                        </Typography>
                        <Divider sx={{ mb: 3 }} />

                        {departmentChartData.length > 0 ? (
                            <>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={departmentChartData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis
                                            dataKey="name"
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
                                        <Bar
                                            dataKey="required"
                                            name="المطلوب"
                                            fill="#1976d2"
                                            radius={[4, 4, 0, 0]}
                                        />
                                        <Bar
                                            dataKey="present"
                                            name="الحاضر"
                                            fill="#4caf50"
                                            radius={[4, 4, 0, 0]}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>

                                <TableContainer sx={{ mt: 3 }}>
                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell><strong>القسم</strong></TableCell>
                                                <TableCell align="center"><strong>المطلوب</strong></TableCell>
                                                <TableCell align="center"><strong>المتوفر</strong></TableCell>
                                                <TableCell align="center"><strong>الحاضر</strong></TableCell>
                                                <TableCell align="center"><strong>في إجازة</strong></TableCell>
                                                <TableCell align="center"><strong>الفجوة</strong></TableCell>
                                                <TableCell align="center"><strong>نسبة التغطية</strong></TableCell>
                                                <TableCell align="center"><strong>الحالة</strong></TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {coverage?.departmentCoverage?.map((dept: DepartmentCoverage, index: number) => (
                                                <TableRow key={index} hover>
                                                    <TableCell>
                                                        <Box display="flex" alignItems="center" gap={1}>
                                                            <BusinessCenter fontSize="small" color="primary" />
                                                            {dept.departmentName}
                                                        </Box>
                                                    </TableCell>
                                                    <TableCell align="center">{dept.requiredStaff}</TableCell>
                                                    <TableCell align="center">{dept.availableStaff}</TableCell>
                                                    <TableCell align="center">{dept.presentStaff}</TableCell>
                                                    <TableCell align="center">{dept.onLeave}</TableCell>
                                                    <TableCell align="center">
                                                        <Chip
                                                            label={dept.gap > 0 ? `-${dept.gap}` : `+${Math.abs(dept.gap)}`}
                                                            size="small"
                                                            color={dept.gap > 0 ? 'error' : 'success'}
                                                        />
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Box
                                                            sx={{
                                                                width: '100%',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 1,
                                                            }}
                                                        >
                                                            <Box sx={{ width: '100%', mr: 1 }}>
                                                                <LinearProgress
                                                                    variant="determinate"
                                                                    value={Math.min(dept.coveragePercentage, 100)}
                                                                    sx={{
                                                                        height: 8,
                                                                        borderRadius: 4,
                                                                        bgcolor: 'grey.200',
                                                                        '& .MuiLinearProgress-bar': {
                                                                            bgcolor: getCoverageColor(dept.coveragePercentage),
                                                                        },
                                                                    }}
                                                                />
                                                            </Box>
                                                            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 40 }}>
                                                                {dept.coveragePercentage}%
                                                            </Typography>
                                                        </Box>
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Chip
                                                            label={getSeverityLabel(dept.severity)}
                                                            size="small"
                                                            color={getSeverityColor(dept.severity)}
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {(!coverage?.departmentCoverage || coverage.departmentCoverage.length === 0) && (
                                                <TableRow>
                                                    <TableCell colSpan={8} align="center">
                                                        <Typography variant="body2" color="text.secondary">
                                                            لا توجد بيانات أقسام لعرضها
                                                        </Typography>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </>
                        ) : (
                            <Alert severity="info">
                                لا توجد بيانات تغطية الأقسام للتاريخ المحدد.
                            </Alert>
                        )}
                    </Box>
                </TabPanel>

                {/* Shift Coverage Tab */}
                <TabPanel value={tabValue} index={1}>
                    <Box sx={{ p: 3, pt: 0 }}>
                        <Typography variant="h6" gutterBottom>
                            تغطية الورديات
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            تحليل التغطية حسب الورديات اليومية
                        </Typography>
                        <Divider sx={{ mb: 3 }} />

                        {shiftChartData.length > 0 ? (
                            <>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={shiftChartData} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis type="number" />
                                        <YAxis
                                            dataKey="name"
                                            type="category"
                                            width={100}
                                            style={{ fontSize: '12px' }}
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
                                        <Bar
                                            dataKey="required"
                                            name="المطلوب"
                                            fill="#1976d2"
                                            radius={[0, 4, 4, 0]}
                                        />
                                        <Bar
                                            dataKey="scheduled"
                                            name="المجدول"
                                            fill="#9c27b0"
                                            radius={[0, 4, 4, 0]}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>

                                <TableContainer sx={{ mt: 3 }}>
                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell><strong>الوردية</strong></TableCell>
                                                <TableCell align="center"><strong>وقت البداية</strong></TableCell>
                                                <TableCell align="center"><strong>وقت النهاية</strong></TableCell>
                                                <TableCell align="center"><strong>المطلوب</strong></TableCell>
                                                <TableCell align="center"><strong>المجدول</strong></TableCell>
                                                <TableCell align="center"><strong>الفجوة</strong></TableCell>
                                                <TableCell align="center"><strong>نسبة التغطية</strong></TableCell>
                                                <TableCell align="center"><strong>الحالة</strong></TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {coverage?.shiftCoverage?.map((shift: ShiftCoverage, index: number) => (
                                                <TableRow key={index} hover>
                                                    <TableCell>
                                                        <Box display="flex" alignItems="center" gap={1}>
                                                            <Schedule fontSize="small" color="primary" />
                                                            {shift.shiftName}
                                                        </Box>
                                                    </TableCell>
                                                    <TableCell align="center">{shift.startTime}</TableCell>
                                                    <TableCell align="center">{shift.endTime}</TableCell>
                                                    <TableCell align="center">{shift.requiredStaff}</TableCell>
                                                    <TableCell align="center">{shift.scheduledStaff}</TableCell>
                                                    <TableCell align="center">
                                                        <Chip
                                                            label={shift.gap > 0 ? `-${shift.gap}` : `+${Math.abs(shift.gap)}`}
                                                            size="small"
                                                            color={shift.gap > 0 ? 'error' : 'success'}
                                                        />
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Box
                                                            sx={{
                                                                width: '100%',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 1,
                                                            }}
                                                        >
                                                            <Box sx={{ width: '100%', mr: 1 }}>
                                                                <LinearProgress
                                                                    variant="determinate"
                                                                    value={Math.min(shift.coveragePercentage, 100)}
                                                                    sx={{
                                                                        height: 8,
                                                                        borderRadius: 4,
                                                                        bgcolor: 'grey.200',
                                                                        '& .MuiLinearProgress-bar': {
                                                                            bgcolor: getCoverageColor(shift.coveragePercentage),
                                                                        },
                                                                    }}
                                                                />
                                                            </Box>
                                                            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 40 }}>
                                                                {shift.coveragePercentage}%
                                                            </Typography>
                                                        </Box>
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Chip
                                                            label={getSeverityLabel(shift.severity)}
                                                            size="small"
                                                            color={getSeverityColor(shift.severity)}
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {(!coverage?.shiftCoverage || coverage.shiftCoverage.length === 0) && (
                                                <TableRow>
                                                    <TableCell colSpan={8} align="center">
                                                        <Typography variant="body2" color="text.secondary">
                                                            لا توجد بيانات ورديات لعرضها
                                                        </Typography>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </>
                        ) : (
                            <Alert severity="info">
                                لا توجد بيانات تغطية الورديات للتاريخ المحدد.
                            </Alert>
                        )}
                    </Box>
                </TabPanel>
            </Paper>

            {/* Critical Gaps Alerts */}
            {coverage?.criticalGaps && coverage.criticalGaps.length > 0 && (
                <Paper sx={{ p: 3, mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        تنبيهات الفجوات الحرجة
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        فجوات تحتاج إلى اهتمام فوري
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Box display="flex" flexDirection="column" gap={2}>
                        {coverage.criticalGaps.map((gap: CoverageGapDetail, index: number) => (
                            <Alert
                                key={index}
                                severity={getSeverityColor(gap.severity)}
                                icon={<Warning />}
                                sx={{
                                    '& .MuiAlert-message': {
                                        width: '100%',
                                    },
                                }}
                            >
                                <Box>
                                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                        <Typography variant="subtitle1" fontWeight="bold">
                                            {gap.department}
                                        </Typography>
                                        <Chip
                                            label={getSeverityLabel(gap.severity)}
                                            size="small"
                                            color={getSeverityColor(gap.severity)}
                                        />
                                    </Box>
                                    <Typography variant="body2" gutterBottom>
                                        <strong>السبب:</strong> {gap.reason}
                                    </Typography>
                                    <Typography variant="body2" gutterBottom>
                                        <strong>الأثر:</strong> {gap.impact}
                                    </Typography>
                                    <Typography variant="body2" gutterBottom>
                                        <strong>حجم الفجوة:</strong> {gap.gapSize} موظف
                                    </Typography>
                                    {gap.recommendations && gap.recommendations.length > 0 && (
                                        <Box mt={1}>
                                            <Typography variant="body2" fontWeight="bold">
                                                التوصيات:
                                            </Typography>
                                            <ul style={{ margin: '4px 0', paddingRight: '20px' }}>
                                                {gap.recommendations.map((rec, recIndex) => (
                                                    <li key={recIndex}>
                                                        <Typography variant="body2">{rec}</Typography>
                                                    </li>
                                                ))}
                                            </ul>
                                        </Box>
                                    )}
                                </Box>
                            </Alert>
                        ))}
                    </Box>
                </Paper>
            )}

            {/* AI Recommendations */}
            {coverage?.recommendations && coverage.recommendations.length > 0 && (
                <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        توصيات النظام
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        توصيات لتحسين التغطية وتقليل الفجوات
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Box display="flex" flexDirection="column" gap={1}>
                        {coverage.recommendations.map((recommendation, index) => (
                            <Alert key={index} severity="info" icon={<Lightbulb />}>
                                {recommendation}
                            </Alert>
                        ))}
                    </Box>
                </Paper>
            )}
        </Box>
    );
}
