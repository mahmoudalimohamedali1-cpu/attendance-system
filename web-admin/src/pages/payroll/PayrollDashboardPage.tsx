import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Card,
    CardContent,
    Grid,
    Typography,
    Chip,
    Alert,
    AlertTitle,
    CircularProgress,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Paper,
    Divider,
    IconButton,
    Tooltip,
    Button,
} from '@mui/material';
import {
    People as PeopleIcon,
    AttachMoney as MoneyIcon,
    AccountBalance as BankIcon,
    Lock as LockIcon,
    LockOpen as UnlockIcon,
    Warning as WarningIcon,
    CheckCircle as CheckIcon,
    Error as ErrorIcon,
    TrendingUp as TrendIcon,
    Refresh as RefreshIcon,
    Add as AddIcon,
    OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import { useDashboard, useDashboardTrends } from '../../hooks/useDashboard';
import { useAuthStore } from '../../store/auth.store';

// Auto-refresh interval (60 seconds)
const AUTO_REFRESH_INTERVAL = 60000;

// Summary Card Component
interface SummaryCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
    subtitle?: string;
    onClick?: () => void;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, icon, color, subtitle, onClick }) => (
    <Card
        sx={{
            height: '100%',
            borderTop: `4px solid ${color}`,
            cursor: onClick ? 'pointer' : 'default',
            transition: 'transform 0.2s, box-shadow 0.2s',
            '&:hover': onClick ? { transform: 'translateY(-2px)', boxShadow: 4 } : {},
        }}
        onClick={onClick}
    >
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
                </Box>
                <Box sx={{
                    backgroundColor: `${color}20`,
                    borderRadius: 2,
                    p: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    {React.cloneElement(icon as React.ReactElement, { sx: { color, fontSize: 32 } })}
                </Box>
            </Box>
            {onClick && (
                <Box display="flex" justifyContent="flex-end" mt={1}>
                    <OpenInNewIcon fontSize="small" color="action" />
                </Box>
            )}
        </CardContent>
    </Card>
);

// Health Status Badge
const HealthBadge: React.FC<{ label: string; status: string | boolean }> = ({ label, status }) => {
    const getColor = (): 'success' | 'warning' | 'error' => {
        if (status === 'COMPLETE' || status === 'OK' || status === true) return 'success';
        if (status === 'PENDING' || status === 'PARTIAL') return 'warning';
        return 'error';
    };

    const getIcon = () => {
        if (status === 'COMPLETE' || status === 'OK' || status === true) return <CheckIcon fontSize="small" />;
        if (status === 'PENDING' || status === 'PARTIAL') return <WarningIcon fontSize="small" />;
        return <ErrorIcon fontSize="small" />;
    };

    return (
        <Chip
            icon={getIcon()}
            label={`${label}: ${typeof status === 'boolean' ? (status ? 'نعم' : 'لا') : status}`}
            color={getColor()}
            variant="outlined"
            sx={{ m: 0.5 }}
        />
    );
};

// Clickable Exception Alert with Deep Link
interface ClickableExceptionAlertProps {
    title: string;
    count: number;
    severity: 'error' | 'warning' | 'info';
    onClick?: () => void;
}

const ClickableExceptionAlert: React.FC<ClickableExceptionAlertProps> = ({ title, count, severity, onClick }) => {
    if (count === 0) return null;
    return (
        <Alert
            severity={severity}
            sx={{
                mb: 1,
                cursor: onClick ? 'pointer' : 'default',
                '&:hover': onClick ? { backgroundColor: severity === 'error' ? '#ffebee' : severity === 'warning' ? '#fff8e1' : '#e3f2fd' } : {},
            }}
            onClick={onClick}
            action={onClick && <OpenInNewIcon fontSize="small" />}
        >
            <AlertTitle>{title}</AlertTitle>
            {count} موظف
        </Alert>
    );
};

// Main Payroll Dashboard Page
export const PayrollDashboardPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    const [year, setYear] = useState(currentYear);
    const [month, setMonth] = useState(currentMonth);

    // Auto-refresh: enabled when payroll is not locked
    const { data, isLoading, refetch, isFetching } = useDashboard({ year, month });
    const { data: trends } = useDashboardTrends(6);

    // Auto-refresh effect
    React.useEffect(() => {
        const health = data?.health;
        // Only auto-refresh if payroll is not locked
        if (health && !health.payrollLocked) {
            const interval = setInterval(() => {
                refetch();
            }, AUTO_REFRESH_INTERVAL);
            return () => clearInterval(interval);
        }
    }, [data?.health?.payrollLocked, refetch]);

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

    // Permission-aware visibility
    const userRole = user?.role || 'EMPLOYEE';
    const canSeeFinancials = ['ADMIN', 'FINANCE'].includes(userRole);
    const canSeeExceptions = ['ADMIN', 'HR'].includes(userRole);
    const canSeeLock = ['ADMIN'].includes(userRole);

    if (isLoading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress size={60} />
            </Box>
        );
    }

    const summary = data?.summary || {};
    const health = data?.health || {};
    const exceptions = data?.exceptions || {};

    // Empty State: No payroll run for this period
    const isEmpty = summary.headcount === 0 && !health.payrollCalculated;

    if (isEmpty) {
        return (
            <Box p={3}>
                {/* Header */}
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                    <Typography variant="h4" fontWeight="bold">
                        لوحة تحكم الرواتب
                    </Typography>
                    <Box display="flex" gap={2} alignItems="center">
                        <FormControl size="small" sx={{ minWidth: 100 }}>
                            <InputLabel>الشهر</InputLabel>
                            <Select value={month} label="الشهر" onChange={(e) => setMonth(e.target.value as number)}>
                                {months.map(m => (
                                    <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ minWidth: 80 }}>
                            <InputLabel>السنة</InputLabel>
                            <Select value={year} label="السنة" onChange={(e) => setYear(e.target.value as number)}>
                                {[2024, 2025, 2026].map(y => (
                                    <MenuItem key={y} value={y}>{y}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>
                </Box>

                {/* Empty State */}
                <Paper sx={{ p: 6, textAlign: 'center' }}>
                    <Typography variant="h5" color="text.secondary" gutterBottom>
                        لا يوجد مسيرة رواتب لهذا الشهر
                    </Typography>
                    <Typography variant="body1" color="text.secondary" mb={3}>
                        {year}-{String(month).padStart(2, '0')}
                    </Typography>
                    {canSeeLock && (
                        <Button
                            variant="contained"
                            size="large"
                            startIcon={<AddIcon />}
                            onClick={() => navigate('/salary/runs/new')}
                        >
                            إنشاء مسيرة رواتب جديدة
                        </Button>
                    )}
                </Paper>
            </Box>
        );
    }

    return (
        <Box p={3}>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box display="flex" alignItems="center" gap={2}>
                    <Typography variant="h4" fontWeight="bold">
                        لوحة تحكم الرواتب
                    </Typography>
                    {isFetching && <CircularProgress size={20} />}
                    {!health.payrollLocked && (
                        <Chip label="تحديث تلقائي كل دقيقة" size="small" color="info" variant="outlined" />
                    )}
                </Box>
                <Box display="flex" gap={2} alignItems="center">
                    <FormControl size="small" sx={{ minWidth: 100 }}>
                        <InputLabel>الشهر</InputLabel>
                        <Select value={month} label="الشهر" onChange={(e) => setMonth(e.target.value as number)}>
                            {months.map(m => (
                                <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 80 }}>
                        <InputLabel>السنة</InputLabel>
                        <Select value={year} label="السنة" onChange={(e) => setYear(e.target.value as number)}>
                            {[2024, 2025, 2026].map(y => (
                                <MenuItem key={y} value={y}>{y}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <Tooltip title="تحديث">
                        <IconButton onClick={() => refetch()} color="primary" disabled={isFetching}>
                            <RefreshIcon />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>

            {/* Summary Cards */}
            <Grid container spacing={3} mb={3}>
                <Grid item xs={12} sm={6} md={3}>
                    <SummaryCard
                        title="عدد الموظفين"
                        value={summary.headcount || 0}
                        icon={<PeopleIcon />}
                        color="#1976d2"
                        onClick={() => navigate('/users')}
                    />
                </Grid>
                {canSeeFinancials && (
                    <>
                        <Grid item xs={12} sm={6} md={3}>
                            <SummaryCard
                                title="إجمالي الرواتب"
                                value={`${(summary.grossTotal || 0).toLocaleString()} ر.س`}
                                icon={<MoneyIcon />}
                                color="#2e7d32"
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <SummaryCard
                                title="التأمينات (GOSI)"
                                value={`${(summary.gosiTotal || 0).toLocaleString()} ر.س`}
                                icon={<BankIcon />}
                                color="#ed6c02"
                                onClick={() => navigate('/salary')}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <SummaryCard
                                title="صافي الرواتب"
                                value={`${(summary.netTotal || 0).toLocaleString()} ر.س`}
                                icon={summary.isLocked ? <LockIcon /> : <UnlockIcon />}
                                color={summary.isLocked ? '#d32f2f' : '#9c27b0'}
                                subtitle={summary.isLocked ? 'مقفل' : 'غير مقفل'}
                                onClick={() => navigate('/wps-export')}
                            />
                        </Grid>
                    </>
                )}
            </Grid>

            <Grid container spacing={3}>
                {/* Health Status */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="h6" gutterBottom>
                            حالة النظام
                        </Typography>
                        <Divider sx={{ mb: 2 }} />
                        <Box display="flex" flexWrap="wrap">
                            {canSeeExceptions && health.attendance && <HealthBadge label="الحضور" status={health.attendance} />}
                            {canSeeExceptions && health.leaves && <HealthBadge label="الإجازات" status={health.leaves} />}
                            {canSeeExceptions && health.advances && <HealthBadge label="السلف" status={health.advances} />}
                            {health.policies && <HealthBadge label="السياسات" status={health.policies} />}
                            {canSeeFinancials && health.gosiConfig && <HealthBadge label="GOSI" status={health.gosiConfig} />}
                            {health.payrollCalculated !== undefined && (
                                <HealthBadge label="محسوب" status={health.payrollCalculated} />
                            )}
                            {canSeeLock && health.payrollLocked !== undefined && (
                                <HealthBadge label="مقفل" status={health.payrollLocked} />
                            )}
                        </Box>

                        {/* Can we lock? */}
                        <Box mt={2}>
                            {health.payrollCalculated && !health.payrollLocked ? (
                                <Alert severity="success">
                                    <AlertTitle>جاهز للإقفال</AlertTitle>
                                    يمكنك إقفال مسيرة الرواتب لهذا الشهر
                                </Alert>
                            ) : !health.payrollCalculated ? (
                                <Alert severity="warning">
                                    <AlertTitle>غير جاهز</AlertTitle>
                                    يجب حساب الرواتب أولاً
                                </Alert>
                            ) : (
                                <Alert severity="info">
                                    <AlertTitle>مقفل</AlertTitle>
                                    تم إقفال مسيرة الرواتب لهذا الشهر
                                </Alert>
                            )}
                        </Box>
                    </Paper>
                </Grid>

                {/* Exceptions - Only visible to HR/Admin */}
                {canSeeExceptions && (
                    <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 2 }}>
                            <Typography variant="h6" gutterBottom>
                                التنبيهات والاستثناءات
                            </Typography>
                            <Divider sx={{ mb: 2 }} />

                            {Object.values(exceptions).every(v => v === 0) ? (
                                <Alert severity="success">
                                    <AlertTitle>ممتاز!</AlertTitle>
                                    لا توجد استثناءات لهذا الشهر
                                </Alert>
                            ) : (
                                <>
                                    <ClickableExceptionAlert
                                        title="موظفون متأخرون"
                                        count={exceptions.lateEmployees || 0}
                                        severity="warning"
                                        onClick={() => navigate('/attendance?filter=late')}
                                    />
                                    <ClickableExceptionAlert
                                        title="انصراف مبكر"
                                        count={exceptions.earlyDepartureCases || 0}
                                        severity="warning"
                                        onClick={() => navigate('/attendance?filter=early')}
                                    />
                                    <ClickableExceptionAlert
                                        title="غياب بدون إجازة"
                                        count={exceptions.absentWithoutLeave || 0}
                                        severity="error"
                                        onClick={() => navigate('/attendance?filter=absent')}
                                    />
                                    <ClickableExceptionAlert
                                        title="قسائم معدّلة"
                                        count={exceptions.adjustedPayslips || 0}
                                        severity="info"
                                        onClick={() => navigate('/salary')}
                                    />
                                </>
                            )}
                        </Paper>
                    </Grid>
                )}

                {/* Trends */}
                {canSeeFinancials && (
                    <Grid item xs={12}>
                        <Paper sx={{ p: 2 }}>
                            <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
                                <TrendIcon /> اتجاهات الرواتب (آخر 6 أشهر)
                            </Typography>
                            <Divider sx={{ mb: 2 }} />

                            {trends?.periods && trends.periods.length > 0 ? (
                                <Grid container spacing={2}>
                                    {trends.periods.map((period, idx) => (
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
                            ) : (
                                <Typography color="text.secondary" textAlign="center">
                                    لا توجد بيانات سابقة
                                </Typography>
                            )}
                        </Paper>
                    </Grid>
                )}
            </Grid>
        </Box>
    );
};

export default PayrollDashboardPage;
