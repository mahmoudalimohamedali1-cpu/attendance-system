/**
 * TrackingReportsPanel - لوحة تقارير التتبع المضمنة
 * يتم تضمينها كتاب داخل صفحة التتبع
 */

import { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Paper,
    Typography,
    Grid,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    CircularProgress,
    Alert,
    Chip,
    Card,
    CardContent,
    IconButton,
    Tooltip,
    MenuItem,
    Select,
    FormControl,
    InputLabel,
    Button,
} from '@mui/material';
import {
    Refresh as RefreshIcon,
    Download as DownloadIcon,
    TrendingUp as TrendingUpIcon,
    Person as PersonIcon,
    AccessTime as TimeIcon,
    ExitToApp as ExitIcon,
} from '@mui/icons-material';
import { api } from '@/services/api.service';

// ==================== Interfaces ====================

interface ExitSummary {
    totalExits: number;
    totalDuration: number;
    averageDuration: number;
    employeesWithExits: number;
    topExitEmployees: {
        userId: string;
        userName: string;
        exitCount: number;
        totalDuration: number;
    }[];
}

interface DailyReport {
    date: string;
    exitCount: number;
    totalDuration: number;
    uniqueEmployees: number;
}

interface EmployeeStats {
    userId: string;
    employeeName: string;
    employeeCode: string;
    departmentName?: string;
    exitCount: number;
    totalDuration: number;
}

// ==================== Helper Functions ====================

const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes} دقيقة`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours} ساعة${mins > 0 ? ` و ${mins} دقيقة` : ''}`;
};

const getDateRange = (period: string): { start: Date; end: Date } => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    switch (period) {
        case 'today':
            break;
        case 'week':
            start.setDate(start.getDate() - 7);
            break;
        case 'month':
            start.setMonth(start.getMonth() - 1);
            break;
        case 'quarter':
            start.setMonth(start.getMonth() - 3);
            break;
        default:
            start.setDate(start.getDate() - 7);
    }

    return { start, end };
};

// ==================== Main Component ====================

export const TrackingReportsPanel = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [period, setPeriod] = useState('week');
    const [refreshing, setRefreshing] = useState(false);

    // Data states
    const [summary, setSummary] = useState<ExitSummary | null>(null);
    const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);
    const [employeeStats, setEmployeeStats] = useState<EmployeeStats[]>([]);

    const fetchData = useCallback(async () => {
        try {
            setError(null);
            setRefreshing(true);

            const { start, end } = getDateRange(period);
            const params = `startDate=${start.toISOString()}&endDate=${end.toISOString()}`;

            const [summaryRes, dailyRes, employeesRes] = await Promise.all([
                api.get<ExitSummary>(`/location-tracking/reports/summary?${params}`),
                api.get<DailyReport[]>(`/location-tracking/reports/daily?${params}`),
                api.get<EmployeeStats[]>(`/location-tracking/reports/employees?${params}`),
            ]);

            setSummary(summaryRes);
            setDailyReports(dailyRes);
            setEmployeeStats(employeesRes);
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'حدث خطأ في تحميل البيانات');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [period]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const exportToCSV = () => {
        if (!employeeStats.length) return;

        const headers = ['الاسم', 'الرمز', 'القسم', 'عدد الخروج', 'إجمالي المدة (دقيقة)'];
        const rows = employeeStats.map(e => [
            e.employeeName,
            e.employeeCode,
            e.departmentName || '-',
            e.exitCount.toString(),
            e.totalDuration.toString(),
        ]);

        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `تقرير_الخروج_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box>
            {/* Controls */}
            <Box display="flex" justifyContent="flex-end" gap={2} mb={3} flexWrap="wrap">
                <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>الفترة</InputLabel>
                    <Select
                        value={period}
                        label="الفترة"
                        onChange={(e) => setPeriod(e.target.value)}
                    >
                        <MenuItem value="today">اليوم</MenuItem>
                        <MenuItem value="week">آخر أسبوع</MenuItem>
                        <MenuItem value="month">آخر شهر</MenuItem>
                        <MenuItem value="quarter">آخر 3 أشهر</MenuItem>
                    </Select>
                </FormControl>

                <Tooltip title="تحديث">
                    <IconButton onClick={fetchData} disabled={refreshing}>
                        {refreshing ? <CircularProgress size={24} /> : <RefreshIcon />}
                    </IconButton>
                </Tooltip>

                <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    onClick={exportToCSV}
                    disabled={!employeeStats.length}
                    size="small"
                >
                    تصدير CSV
                </Button>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {/* Summary Cards */}
            {summary && (
                <Grid container spacing={2} mb={3}>
                    <Grid item xs={6} sm={3}>
                        <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                            <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                                <Box display="flex" alignItems="center" gap={1}>
                                    <ExitIcon sx={{ fontSize: 28 }} />
                                    <Box>
                                        <Typography variant="h5" fontWeight="bold">
                                            {summary.totalExits}
                                        </Typography>
                                        <Typography variant="caption">إجمالي الخروج</Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={6} sm={3}>
                        <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
                            <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                                <Box display="flex" alignItems="center" gap={1}>
                                    <TimeIcon sx={{ fontSize: 28 }} />
                                    <Box>
                                        <Typography variant="h5" fontWeight="bold">
                                            {formatDuration(summary.totalDuration)}
                                        </Typography>
                                        <Typography variant="caption">إجمالي المدة</Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={6} sm={3}>
                        <Card sx={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
                            <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                                <Box display="flex" alignItems="center" gap={1}>
                                    <TrendingUpIcon sx={{ fontSize: 28 }} />
                                    <Box>
                                        <Typography variant="h5" fontWeight="bold">
                                            {summary.averageDuration} دقيقة
                                        </Typography>
                                        <Typography variant="caption">متوسط المدة</Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={6} sm={3}>
                        <Card sx={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', color: 'white' }}>
                            <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                                <Box display="flex" alignItems="center" gap={1}>
                                    <PersonIcon sx={{ fontSize: 28 }} />
                                    <Box>
                                        <Typography variant="h5" fontWeight="bold">
                                            {summary.employeesWithExits}
                                        </Typography>
                                        <Typography variant="caption">موظفين خرجوا</Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            )}

            <Grid container spacing={2}>
                {/* Top Employees */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2, height: '100%' }}>
                        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                            🏆 أكثر الموظفين خروجاً
                        </Typography>

                        {summary?.topExitEmployees && summary.topExitEmployees.length > 0 ? (
                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>#</TableCell>
                                            <TableCell>الموظف</TableCell>
                                            <TableCell align="center">عدد الخروج</TableCell>
                                            <TableCell align="center">المدة</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {summary.topExitEmployees.slice(0, 5).map((emp, i) => (
                                            <TableRow key={emp.userId}>
                                                <TableCell>
                                                    <Chip
                                                        label={i + 1}
                                                        size="small"
                                                        color={i === 0 ? 'error' : i === 1 ? 'warning' : 'default'}
                                                    />
                                                </TableCell>
                                                <TableCell>{emp.userName}</TableCell>
                                                <TableCell align="center">
                                                    <Chip label={emp.exitCount} color="error" size="small" />
                                                </TableCell>
                                                <TableCell align="center">
                                                    {formatDuration(emp.totalDuration)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        ) : (
                            <Typography color="text.secondary" textAlign="center" py={3}>
                                لا توجد بيانات خروج
                            </Typography>
                        )}
                    </Paper>
                </Grid>

                {/* Daily Report */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2, height: '100%' }}>
                        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                            📅 التقرير اليومي
                        </Typography>

                        {dailyReports.length > 0 ? (
                            <TableContainer sx={{ maxHeight: 250 }}>
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>التاريخ</TableCell>
                                            <TableCell align="center">الخروج</TableCell>
                                            <TableCell align="center">الموظفين</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {dailyReports.slice(0, 7).map((day) => (
                                            <TableRow key={day.date}>
                                                <TableCell>
                                                    {new Date(day.date).toLocaleDateString('ar-EG', {
                                                        weekday: 'short',
                                                        day: 'numeric',
                                                    })}
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Chip
                                                        label={day.exitCount}
                                                        size="small"
                                                        color={day.exitCount > 5 ? 'error' : 'default'}
                                                    />
                                                </TableCell>
                                                <TableCell align="center">{day.uniqueEmployees}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        ) : (
                            <Typography color="text.secondary" textAlign="center" py={3}>
                                لا توجد بيانات يومية
                            </Typography>
                        )}
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default TrackingReportsPanel;
