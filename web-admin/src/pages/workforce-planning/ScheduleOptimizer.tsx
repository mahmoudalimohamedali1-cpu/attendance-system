import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
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
    TextField,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Collapse,
    IconButton,
} from '@mui/material';
import {
    ArrowBack,
    Schedule,
    TrendingUp,
    People,
    Timer,
    AttachMoney,
    CheckCircle,
    ExpandMore,
    ExpandLess,
    Lightbulb,
} from '@mui/icons-material';
import {
    optimizeSchedule,
    OptimizeScheduleRequestDto,
    OptimizeScheduleResponseDto,
    ScheduleConstraints,
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

export default function ScheduleOptimizer() {
    const navigate = useNavigate();
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Form state
    const [startDate, setStartDate] = useState(() => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => {
        const future = new Date();
        future.setDate(future.getDate() + 14);
        return future.toISOString().split('T')[0];
    });
    const [branchId, setBranchId] = useState('');
    const [departmentId, setDepartmentId] = useState('');

    // Constraints state
    const [minStaff, setMinStaff] = useState('');
    const [maxStaff, setMaxStaff] = useState('');
    const [maxWeeklyHours, setMaxWeeklyHours] = useState('48');
    const [minRestHours, setMinRestHours] = useState('8');

    // Results state
    const [optimizationResult, setOptimizationResult] = useState<OptimizeScheduleResponseDto | null>(null);

    // Mutation for optimization
    const mutation = useMutation({
        mutationFn: async (params: OptimizeScheduleRequestDto) => {
            return optimizeSchedule(params);
        },
        onSuccess: (data) => {
            setOptimizationResult(data);
        },
    });

    const handleOptimize = () => {
        const constraints: ScheduleConstraints = {};

        if (minStaff) constraints.minStaff = parseInt(minStaff);
        if (maxStaff) constraints.maxStaff = parseInt(maxStaff);
        if (maxWeeklyHours) constraints.maxWeeklyHours = parseInt(maxWeeklyHours);
        if (minRestHours) constraints.minRestHours = parseInt(minRestHours);

        const params: OptimizeScheduleRequestDto = {
            startDate,
            endDate,
            ...(branchId && { branchId }),
            ...(departmentId && { departmentId }),
            ...(Object.keys(constraints).length > 0 && { constraints }),
        };

        mutation.mutate(params);
    };

    const handleReset = () => {
        const today = new Date();
        const future = new Date();
        future.setDate(future.getDate() + 14);

        setStartDate(today.toISOString().split('T')[0]);
        setEndDate(future.toISOString().split('T')[0]);
        setBranchId('');
        setDepartmentId('');
        setMinStaff('');
        setMaxStaff('');
        setMaxWeeklyHours('48');
        setMinRestHours('8');
        setOptimizationResult(null);
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
                            تحسين الجداول الزمنية
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            تحسين جداول الموظفين باستخدام الذكاء الاصطناعي لتحقيق أفضل تغطية وتقليل التكاليف
                        </Typography>
                    </Box>
                </Box>
            </Box>

            {/* Optimization Form */}
            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                    معلومات التحسين
                </Typography>
                <Divider sx={{ mb: 3 }} />

                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="تاريخ البداية"
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="تاريخ النهاية"
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="معرف الفرع (اختياري)"
                            value={branchId}
                            onChange={(e) => setBranchId(e.target.value)}
                            placeholder="اتركه فارغاً لجميع الفروع"
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="معرف القسم (اختياري)"
                            value={departmentId}
                            onChange={(e) => setDepartmentId(e.target.value)}
                            placeholder="اتركه فارغاً لجميع الأقسام"
                        />
                    </Grid>
                </Grid>

                {/* Advanced Constraints */}
                <Box mt={3}>
                    <Button
                        startIcon={showAdvanced ? <ExpandLess /> : <ExpandMore />}
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        variant="outlined"
                        fullWidth
                    >
                        القيود المتقدمة
                    </Button>
                    <Collapse in={showAdvanced}>
                        <Grid container spacing={3} mt={1}>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    label="الحد الأدنى للموظفين"
                                    type="number"
                                    value={minStaff}
                                    onChange={(e) => setMinStaff(e.target.value)}
                                    placeholder="الحد الأدنى للموظفين في الوردية"
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    label="الحد الأقصى للموظفين"
                                    type="number"
                                    value={maxStaff}
                                    onChange={(e) => setMaxStaff(e.target.value)}
                                    placeholder="الحد الأقصى للموظفين في الوردية"
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    label="الحد الأقصى لساعات العمل الأسبوعية"
                                    type="number"
                                    value={maxWeeklyHours}
                                    onChange={(e) => setMaxWeeklyHours(e.target.value)}
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    label="الحد الأدنى لساعات الراحة"
                                    type="number"
                                    value={minRestHours}
                                    onChange={(e) => setMinRestHours(e.target.value)}
                                />
                            </Grid>
                        </Grid>
                    </Collapse>
                </Box>

                {/* Action Buttons */}
                <Box mt={3} display="flex" gap={2}>
                    <Button
                        variant="contained"
                        startIcon={<Schedule />}
                        onClick={handleOptimize}
                        disabled={mutation.isPending || !startDate || !endDate}
                        fullWidth
                    >
                        {mutation.isPending ? 'جاري التحسين...' : 'تحسين الجدول'}
                    </Button>
                    <Button
                        variant="outlined"
                        onClick={handleReset}
                        disabled={mutation.isPending}
                    >
                        إعادة تعيين
                    </Button>
                </Box>

                {/* Loading State */}
                {mutation.isPending && (
                    <Box mt={2}>
                        <LinearProgress />
                        <Typography variant="body2" color="text.secondary" textAlign="center" mt={1}>
                            جاري تحسين الجداول باستخدام الذكاء الاصطناعي...
                        </Typography>
                    </Box>
                )}

                {/* Error State */}
                {mutation.isError && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                        حدث خطأ أثناء تحسين الجدول. يرجى المحاولة مرة أخرى.
                    </Alert>
                )}
            </Paper>

            {/* Optimization Results */}
            {optimizationResult && (
                <>
                    {/* Success Message */}
                    <Alert severity="success" sx={{ mb: 3 }} icon={<CheckCircle />}>
                        تم تحسين الجدول بنجاح! إليك النتائج المحسنة.
                    </Alert>

                    {/* Results Metrics */}
                    <Grid container spacing={3} mb={3}>
                        <Grid item xs={12} sm={6} md={3}>
                            <MetricCard
                                title="إجمالي الورديات"
                                value={optimizationResult.result.totalShifts}
                                subtitle="ورديات محسنة"
                                icon={<Schedule />}
                                color="primary"
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <MetricCard
                                title="إجمالي الساعات"
                                value={optimizationResult.result.totalHours}
                                subtitle="ساعات عمل"
                                icon={<Timer />}
                                color="info"
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <MetricCard
                                title="التكلفة المتوقعة"
                                value={`${optimizationResult.result.estimatedCost.toLocaleString()} ر.س`}
                                subtitle="التكلفة الإجمالية"
                                icon={<AttachMoney />}
                                color="warning"
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <MetricCard
                                title="نسبة التغطية"
                                value={`${optimizationResult.result.coverageRate}%`}
                                subtitle={`درجة التحسين: ${optimizationResult.result.optimizationScore}%`}
                                icon={<TrendingUp />}
                                color="success"
                            />
                        </Grid>
                    </Grid>

                    {/* AI Recommendations */}
                    {optimizationResult.recommendations && optimizationResult.recommendations.length > 0 && (
                        <Paper sx={{ p: 3, mb: 3 }}>
                            <Typography variant="h6" gutterBottom>
                                توصيات الذكاء الاصطناعي
                            </Typography>
                            <Divider sx={{ mb: 2 }} />
                            <Box display="flex" flexDirection="column" gap={1}>
                                {optimizationResult.recommendations.map((recommendation, index) => (
                                    <Alert key={index} severity="info" icon={<Lightbulb />}>
                                        {recommendation}
                                    </Alert>
                                ))}
                            </Box>
                        </Paper>
                    )}

                    {/* Shifts Table */}
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            الورديات المحسنة
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            إجمالي {optimizationResult.shifts.length} ورديات من {optimizationResult.startDate} إلى {optimizationResult.endDate}
                        </Typography>
                        <Divider sx={{ mb: 2 }} />

                        <TableContainer sx={{ maxHeight: 600 }}>
                            <Table stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        <TableCell><strong>التاريخ</strong></TableCell>
                                        <TableCell><strong>اسم الموظف</strong></TableCell>
                                        <TableCell><strong>وقت البداية</strong></TableCell>
                                        <TableCell><strong>وقت النهاية</strong></TableCell>
                                        <TableCell><strong>الساعات</strong></TableCell>
                                        <TableCell><strong>القسم</strong></TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {optimizationResult.shifts.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} align="center">
                                                <Typography variant="body2" color="text.secondary">
                                                    لا توجد ورديات لعرضها
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        optimizationResult.shifts.map((shift, index) => (
                                            <TableRow key={index} hover>
                                                <TableCell>
                                                    {new Date(shift.date).toLocaleDateString('ar-SA', {
                                                        weekday: 'short',
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric'
                                                    })}
                                                </TableCell>
                                                <TableCell>
                                                    <Box display="flex" alignItems="center" gap={1}>
                                                        <People fontSize="small" />
                                                        {shift.employeeName}
                                                    </Box>
                                                </TableCell>
                                                <TableCell>{shift.startTime}</TableCell>
                                                <TableCell>{shift.endTime}</TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={`${shift.hours} ساعة`}
                                                        size="small"
                                                        color={shift.hours > 8 ? 'warning' : 'default'}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    {shift.department || '-'}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </>
            )}
        </Box>
    );
}
