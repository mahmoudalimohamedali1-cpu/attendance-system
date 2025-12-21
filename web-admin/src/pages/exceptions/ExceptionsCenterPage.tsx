import { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Card,
    CardContent,
    Alert,
    CircularProgress,
    Chip,
    Grid,
    Tab,
    Tabs,
} from '@mui/material';
import {
    Warning as WarningIcon,
    Error as ErrorIcon,
    CheckCircle as CheckIcon,
    Refresh as RefreshIcon,
    AccountBalance as BankIcon,
    AttachMoney as SalaryIcon,
    Description as ContractIcon,
    People as PeopleIcon,
} from '@mui/icons-material';
import {
    exceptionsService,
    ExceptionsSummary,
    QuickStats,
    exceptionTypeLabels,
    severityColors,
} from '@/services/exceptions.service';

export default function ExceptionsCenterPage() {
    const [stats, setStats] = useState<QuickStats | null>(null);
    const [summary, setSummary] = useState<ExceptionsSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [validating, setValidating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState(0);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const statsResult = await exceptionsService.getQuickStats();
            setStats(statsResult);
        } catch (err: any) {
            setError(err.response?.data?.message || 'حدث خطأ');
        } finally {
            setLoading(false);
        }
    };

    const handleValidateAll = async () => {
        setValidating(true);
        setError(null);
        try {
            const result = await exceptionsService.validateEmployees();
            setSummary(result);
        } catch (err: any) {
            setError(err.response?.data?.message || 'حدث خطأ في الفحص');
        } finally {
            setValidating(false);
        }
    };

    const getExceptionsByType = (type: string) => {
        if (!summary) return [];
        return summary.exceptions.filter(e => e.type === type);
    };

    const StatCard = ({ title, value, icon, color }: { title: string; value: number; icon: React.ReactNode; color: string }) => (
        <Card sx={{ height: '100%' }}>
            <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                        <Typography color="text.secondary" variant="caption">
                            {title}
                        </Typography>
                        <Typography variant="h4" fontWeight="bold" color={color}>
                            {value}
                        </Typography>
                    </Box>
                    <Box sx={{ color, opacity: 0.7 }}>
                        {icon}
                    </Box>
                </Box>
            </CardContent>
        </Card>
    );

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" p={4}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box p={3}>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h5" fontWeight="bold">
                    <WarningIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'warning.main' }} />
                    مركز الاستثناءات
                </Typography>
                <Button
                    variant="contained"
                    startIcon={validating ? <CircularProgress size={20} color="inherit" /> : <RefreshIcon />}
                    onClick={handleValidateAll}
                    disabled={validating}
                >
                    {validating ? 'جاري الفحص...' : 'فحص شامل'}
                </Button>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {/* Quick Stats */}
            {stats && (
                <Grid container spacing={3} sx={{ mb: 3 }}>
                    <Grid item xs={12} sm={6} md={3}>
                        <StatCard
                            title="بدون حساب بنكي"
                            value={stats.missingBank}
                            icon={<BankIcon sx={{ fontSize: 40 }} />}
                            color={stats.missingBank > 0 ? 'error.main' : 'success.main'}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <StatCard
                            title="بدون هيكل راتب"
                            value={stats.missingSalary}
                            icon={<SalaryIcon sx={{ fontSize: 40 }} />}
                            color={stats.missingSalary > 0 ? 'error.main' : 'success.main'}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <StatCard
                            title="عقود تنتهي قريباً"
                            value={stats.expiringContracts}
                            icon={<ContractIcon sx={{ fontSize: 40 }} />}
                            color={stats.expiringContracts > 0 ? 'warning.main' : 'success.main'}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <StatCard
                            title="إجمالي المشاكل"
                            value={stats.totalIssues}
                            icon={<PeopleIcon sx={{ fontSize: 40 }} />}
                            color={stats.totalIssues > 0 ? 'error.main' : 'success.main'}
                        />
                    </Grid>
                </Grid>
            )}

            {/* No Issues */}
            {stats && stats.totalIssues === 0 && (
                <Alert severity="success" icon={<CheckIcon />} sx={{ mb: 3 }}>
                    لا توجد مشاكل! جميع الموظفين جاهزين للرواتب.
                </Alert>
            )}

            {/* Validation Results */}
            {summary && (
                <Paper sx={{ p: 3 }}>
                    {/* Summary Header */}
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h6">
                            نتائج الفحص الشامل
                        </Typography>
                        <Box display="flex" gap={1}>
                            <Chip
                                label={`${summary.totalEmployees} موظف`}
                                size="small"
                                variant="outlined"
                            />
                            <Chip
                                label={`${summary.errorCount} خطأ`}
                                size="small"
                                color="error"
                                icon={<ErrorIcon />}
                            />
                            <Chip
                                label={`${summary.warningCount} تحذير`}
                                size="small"
                                color="warning"
                                icon={<WarningIcon />}
                            />
                        </Box>
                    </Box>

                    {summary.exceptions.length === 0 ? (
                        <Alert severity="success" icon={<CheckIcon />}>
                            جميع الموظفين جاهزين! لا توجد مشاكل.
                        </Alert>
                    ) : (
                        <>
                            {/* Tabs by Type */}
                            <Tabs
                                value={activeTab}
                                onChange={(_, v) => setActiveTab(v)}
                                sx={{ mb: 2 }}
                            >
                                <Tab label={`الكل (${summary.exceptions.length})`} />
                                {summary.byType.map((t) => (
                                    <Tab
                                        key={t.type}
                                        label={`${exceptionTypeLabels[t.type as keyof typeof exceptionTypeLabels] || t.type} (${t.count})`}
                                    />
                                ))}
                            </Tabs>

                            {/* Exceptions Table */}
                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>الموظف</TableCell>
                                            <TableCell>الكود</TableCell>
                                            <TableCell>النوع</TableCell>
                                            <TableCell>الخطورة</TableCell>
                                            <TableCell>الرسالة</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {(activeTab === 0
                                            ? summary.exceptions
                                            : getExceptionsByType(summary.byType[activeTab - 1]?.type)
                                        ).map((exc, _idx) => (
                                            <TableRow key={`${exc.employeeId}-${exc.type}-${_idx}`}>
                                                <TableCell>{exc.employeeName}</TableCell>
                                                <TableCell>{exc.employeeCode}</TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={exceptionTypeLabels[exc.type] || exc.type}
                                                        size="small"
                                                        variant="outlined"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={exc.severity === 'ERROR' ? 'خطأ' : 'تحذير'}
                                                        size="small"
                                                        color={severityColors[exc.severity]}
                                                        icon={exc.severity === 'ERROR' ? <ErrorIcon /> : <WarningIcon />}
                                                    />
                                                </TableCell>
                                                <TableCell>{exc.message}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </>
                    )}
                </Paper>
            )}
        </Box>
    );
}
