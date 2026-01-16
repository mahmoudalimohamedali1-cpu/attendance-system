import React, { useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    Grid,
    Typography,
    CircularProgress,
    Alert,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Paper,
    Divider,
    Chip,
    LinearProgress,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
} from '@mui/material';
import {
    TrendingUp as TrendingUpIcon,
    TrendingDown as TrendingDownIcon,
    Assessment as AssessmentIcon,
    People as PeopleIcon,
    AttachMoney as MoneyIcon,
    AccountBalance as BankIcon,
    Speed as SpeedIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { enterprisePayrollService } from '../../services/enterprise-payroll.service';

// KPI Card Component
interface KPICardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ReactNode;
    color: string;
    trend?: number;
}

const KPICard: React.FC<KPICardProps> = ({ title, value, subtitle, icon, color, trend }) => (
    <Card sx={{ height: '100%', borderTop: `4px solid ${color}` }}>
        <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        {title}
                    </Typography>
                    <Typography variant="h4" fontWeight="bold">
                        {typeof value === 'number' ? value.toLocaleString() : value}
                    </Typography>
                    {subtitle && (
                        <Typography variant="caption" color="text.secondary">
                            {subtitle}
                        </Typography>
                    )}
                    {trend !== undefined && (
                        <Box display="flex" alignItems="center" mt={1}>
                            {trend >= 0 ? (
                                <TrendingUpIcon fontSize="small" sx={{ color: 'success.main' }} />
                            ) : (
                                <TrendingDownIcon fontSize="small" sx={{ color: 'error.main' }} />
                            )}
                            <Typography
                                variant="caption"
                                sx={{ color: trend >= 0 ? 'success.main' : 'error.main', ml: 0.5 }}
                            >
                                {Math.abs(trend).toFixed(1)}% من الشهر السابق
                            </Typography>
                        </Box>
                    )}
                </Box>
                <Box
                    sx={{
                        backgroundColor: `${color}20`,
                        borderRadius: 2,
                        p: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    {React.cloneElement(icon as React.ReactElement, { sx: { color, fontSize: 32 } })}
                </Box>
            </Box>
        </CardContent>
    </Card>
);

// Department Row Component
interface DepartmentRowProps {
    department: {
        departmentName: string;
        totalGross: number;
        totalNet: number;
        employeeCount: number;
    };
    maxGross: number;
}

const DepartmentRow: React.FC<DepartmentRowProps> = ({ department, maxGross }) => {
    const percentage = (department.totalGross / maxGross) * 100;
    return (
        <TableRow>
            <TableCell>{department.departmentName}</TableCell>
            <TableCell align="center">{department.employeeCount}</TableCell>
            <TableCell align="right">{department.totalGross.toLocaleString()} ر.س</TableCell>
            <TableCell align="right">{department.totalNet.toLocaleString()} ر.س</TableCell>
            <TableCell sx={{ width: '30%' }}>
                <Box display="flex" alignItems="center" gap={1}>
                    <LinearProgress
                        variant="determinate"
                        value={percentage}
                        sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                    />
                    <Typography variant="caption">{percentage.toFixed(0)}%</Typography>
                </Box>
            </TableCell>
        </TableRow>
    );
};

// Main Page Component
export const PayrollAnalyticsPage: React.FC = () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    const [year, setYear] = useState(currentYear);
    const [month, setMonth] = useState(currentMonth);

    const { data: analytics, isLoading: loadingAnalytics } = useQuery({
        queryKey: ['payroll-analytics', year, month],
        queryFn: () => enterprisePayrollService.getAnalyticsDashboard(year, month),
    });

    const { data: kpis, isLoading: loadingKPIs } = useQuery({
        queryKey: ['payroll-kpis', year, month],
        queryFn: () => enterprisePayrollService.getPayrollKPIs(year, month),
    });

    const { data: trends } = useQuery({
        queryKey: ['payroll-trends'],
        queryFn: () => enterprisePayrollService.getTrendAnalysis(12),
    });

    const months = [
        { value: 1, label: 'يناير' },
        { value: 2, label: 'فبراير' },
        { value: 3, label: 'مارس' },
        { value: 4, label: 'أبريل' },
        { value: 5, label: 'مايو' },
        { value: 6, label: 'يونيو' },
        { value: 7, label: 'يوليو' },
        { value: 8, label: 'أغسطس' },
        { value: 9, label: 'سبتمبر' },
        { value: 10, label: 'أكتوبر' },
        { value: 11, label: 'نوفمبر' },
        { value: 12, label: 'ديسمبر' },
    ];

    if (loadingAnalytics || loadingKPIs) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress size={60} />
            </Box>
        );
    }

    const summary = analytics?.summary || {};
    const byDepartment = analytics?.byDepartment || [];
    const maxGross = Math.max(...byDepartment.map((d: any) => d.totalGross), 1);

    return (
        <Box p={3}>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box display="flex" alignItems="center" gap={2}>
                    <AssessmentIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                    <Box>
                        <Typography variant="h4" fontWeight="bold">
                            تحليلات الرواتب المتقدمة
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Enterprise Payroll Analytics Dashboard
                        </Typography>
                    </Box>
                </Box>
                <Box display="flex" gap={2}>
                    <FormControl size="small" sx={{ minWidth: 100 }}>
                        <InputLabel>الشهر</InputLabel>
                        <Select
                            value={month}
                            label="الشهر"
                            onChange={(e) => setMonth(e.target.value as number)}
                        >
                            {months.map((m) => (
                                <MenuItem key={m.value} value={m.value}>
                                    {m.label}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 80 }}>
                        <InputLabel>السنة</InputLabel>
                        <Select
                            value={year}
                            label="السنة"
                            onChange={(e) => setYear(e.target.value as number)}
                        >
                            {[2024, 2025, 2026].map((y) => (
                                <MenuItem key={y} value={y}>
                                    {y}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>
            </Box>

            {/* Summary KPIs */}
            <Grid container spacing={3} mb={3}>
                <Grid item xs={12} sm={6} md={3}>
                    <KPICard
                        title="إجمالي الاستحقاقات"
                        value={`${(summary.totalGross || 0).toLocaleString()} ر.س`}
                        icon={<MoneyIcon />}
                        color="#2e7d32"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <KPICard
                        title="صافي الرواتب"
                        value={`${(summary.totalNet || 0).toLocaleString()} ر.س`}
                        icon={<BankIcon />}
                        color="#1976d2"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <KPICard
                        title="عدد الموظفين"
                        value={summary.employeeCount || 0}
                        icon={<PeopleIcon />}
                        color="#9c27b0"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <KPICard
                        title="متوسط الراتب"
                        value={`${(summary.avgSalary || 0).toLocaleString()} ر.س`}
                        icon={<SpeedIcon />}
                        color="#ed6c02"
                    />
                </Grid>
            </Grid>

            {/* KPIs Section */}
            {kpis && (
                <Paper sx={{ p: 3, mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        مؤشرات الأداء الرئيسية (KPIs)
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6} md={4}>
                            <Box>
                                <Typography variant="body2" color="text.secondary">
                                    تكلفة الموظف الواحد
                                </Typography>
                                <Typography variant="h5" fontWeight="bold">
                                    {(kpis.costPerEmployee || 0).toLocaleString()} ر.س
                                </Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={12} sm={6} md={4}>
                            <Box>
                                <Typography variant="body2" color="text.secondary">
                                    نسبة الوقت الإضافي
                                </Typography>
                                <Typography variant="h5" fontWeight="bold">
                                    {((kpis.overtimeRatio || 0) * 100).toFixed(1)}%
                                </Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={12} sm={6} md={4}>
                            <Box>
                                <Typography variant="body2" color="text.secondary">
                                    درجة الامتثال
                                </Typography>
                                <Box display="flex" alignItems="center" gap={1}>
                                    <Typography variant="h5" fontWeight="bold">
                                        {kpis.complianceScore || 0}%
                                    </Typography>
                                    <Chip
                                        size="small"
                                        label={kpis.complianceScore >= 90 ? 'ممتاز' : kpis.complianceScore >= 70 ? 'جيد' : 'يحتاج تحسين'}
                                        color={kpis.complianceScore >= 90 ? 'success' : kpis.complianceScore >= 70 ? 'warning' : 'error'}
                                    />
                                </Box>
                            </Box>
                        </Grid>
                    </Grid>
                </Paper>
            )}

            {/* Department Analysis */}
            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                    تحليل حسب القسم
                </Typography>
                <Divider sx={{ mb: 2 }} />
                {byDepartment.length > 0 ? (
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>القسم</TableCell>
                                    <TableCell align="center">عدد الموظفين</TableCell>
                                    <TableCell align="right">إجمالي الاستحقاقات</TableCell>
                                    <TableCell align="right">صافي الرواتب</TableCell>
                                    <TableCell>النسبة من الإجمالي</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {byDepartment.map((dept: any) => (
                                    <DepartmentRow
                                        key={dept.departmentId}
                                        department={dept}
                                        maxGross={maxGross}
                                    />
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                ) : (
                    <Alert severity="info">لا توجد بيانات للأقسام</Alert>
                )}
            </Paper>

            {/* Trends */}
            {trends && trends.periods && (
                <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        اتجاهات الرواتب (آخر 12 شهر)
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Grid container spacing={2}>
                        {trends.periods.slice(-6).map((period: string, idx: number) => (
                            <Grid item xs={6} sm={4} md={2} key={period}>
                                <Card variant="outlined">
                                    <CardContent sx={{ textAlign: 'center', py: 1 }}>
                                        <Typography variant="caption" color="text.secondary">
                                            {period}
                                        </Typography>
                                        <Typography variant="body1" fontWeight="bold">
                                            {((trends.net?.[idx] || 0) / 1000).toFixed(0)}K
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            صافي
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </Paper>
            )}
        </Box>
    );
};

export default PayrollAnalyticsPage;
