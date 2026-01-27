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
    CardActionArea,
    Alert,
    CircularProgress,
    Chip,
    Grid,
    Tab,
    Tabs,
    LinearProgress,
    Tooltip,
    IconButton,
    Fade,
    Zoom,
} from '@mui/material';
import {
    Warning as WarningIcon,
    Error as ErrorIcon,
    CheckCircle as CheckIcon,
    Refresh as RefreshIcon,
    AccountBalance as BankIcon,
    Description as ContractIcon,
    Badge as IdentityIcon,
    AttachMoney as SalaryIcon,
    Shield as GosiIcon,
    BarChart as NitaqatIcon,
    Info as InfoIcon,
    OpenInNew as OpenIcon,
    Download as DownloadIcon,
    TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import {
    exceptionsService,
    ExceptionsSummary,
    QuickStats,
    ExceptionCategory,
    exceptionTypeLabels,
    categoryLabels,
    categoryColors,
    severityColors,
    severityLabels,
} from '@/services/exceptions.service';

// Category Icons Map
const categoryIconsMap: Record<ExceptionCategory, React.ReactNode> = {
    WPS: <BankIcon />,
    CONTRACT: <ContractIcon />,
    IDENTITY: <IdentityIcon />,
    SALARY: <SalaryIcon />,
    GOSI: <GosiIcon />,
    NITAQAT: <NitaqatIcon />,
};

export default function ExceptionsCenterPage() {
    const [stats, setStats] = useState<QuickStats | null>(null);
    const [summary, setSummary] = useState<ExceptionsSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [validating, setValidating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<ExceptionCategory | 'ALL'>('ALL');
    const [activeTab, setActiveTab] = useState(0);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            setLoading(true);
            const statsResult = await exceptionsService.getQuickStats();
            setStats(statsResult);
        } catch (err: any) {
            setError(err.response?.data?.message || 'حدث خطأ في تحميل الإحصائيات');
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

            // Update quick stats from validation
            if (result) {
                setStats({
                    missingBank: result.byType.find(t => t.type === 'MISSING_BANK')?.count || 0,
                    missingSalary: result.byType.find(t => t.type === 'MISSING_SALARY')?.count || 0,
                    missingContract: result.byType.find(t => t.type === 'MISSING_CONTRACT')?.count || 0,
                    missingNationalId: result.byType.find(t => t.type === 'MISSING_NATIONAL_ID')?.count || 0,
                    expiringContracts: result.byType.find(t => t.type === 'EXPIRING_CONTRACT_30')?.count || 0,
                    expiringIqama: result.byType.find(t => t.type === 'EXPIRING_IQAMA_30')?.count || 0,
                    totalErrors: result.errorCount,
                    totalWarnings: result.warningCount,
                    complianceRate: result.complianceRate,
                });
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'حدث خطأ في الفحص');
        } finally {
            setValidating(false);
        }
    };

    const getFilteredExceptions = () => {
        if (!summary) return [];
        if (selectedCategory === 'ALL') return summary.exceptions;
        return summary.exceptions.filter(e => e.category === selectedCategory);
    };

    const getComplianceColor = (rate: number) => {
        if (rate >= 90) return 'success';
        if (rate >= 70) return 'warning';
        return 'error';
    };

    // =====================================================
    // Category Card Component
    // =====================================================
    const CategoryCard = ({
        category,
        stats: catStats,
        onClick,
        selected,
    }: {
        category: ExceptionCategory;
        stats: { errorCount: number; warningCount: number; infoCount: number; total: number } | undefined;
        onClick: () => void;
        selected: boolean;
    }) => {
        const errors = catStats?.errorCount || 0;
        const warnings = catStats?.warningCount || 0;
        const total = catStats?.total || 0;

        return (
            <Zoom in style={{ transitionDelay: '100ms' }}>
                <Card
                    sx={{
                        height: '100%',
                        border: selected ? `2px solid ${categoryColors[category]}` : '1px solid #e0e0e0',
                        boxShadow: selected ? 4 : 1,
                        transition: 'all 0.3s ease',
                        '&:hover': {
                            boxShadow: 4,
                            transform: 'translateY(-4px)',
                        },
                    }}
                >
                    <CardActionArea onClick={onClick} sx={{ height: '100%' }}>
                        <CardContent>
                            <Box display="flex" alignItems="center" gap={1} mb={1}>
                                <Box
                                    sx={{
                                        bgcolor: `${categoryColors[category]}15`,
                                        color: categoryColors[category],
                                        borderRadius: 2,
                                        p: 1,
                                        display: 'flex',
                                    }}
                                >
                                    {categoryIconsMap[category]}
                                </Box>
                                <Typography variant="subtitle2" fontWeight="bold">
                                    {categoryLabels[category]}
                                </Typography>
                            </Box>

                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Box display="flex" gap={0.5}>
                                    {errors > 0 && (
                                        <Chip
                                            size="small"
                                            label={errors}
                                            color="error"
                                            sx={{ fontSize: 11, height: 20 }}
                                        />
                                    )}
                                    {warnings > 0 && (
                                        <Chip
                                            size="small"
                                            label={warnings}
                                            color="warning"
                                            sx={{ fontSize: 11, height: 20 }}
                                        />
                                    )}
                                    {total === 0 && (
                                        <Chip
                                            size="small"
                                            label="✓"
                                            color="success"
                                            sx={{ fontSize: 11, height: 20 }}
                                        />
                                    )}
                                </Box>
                                <Typography variant="h5" fontWeight="bold" color={total > 0 ? 'error.main' : 'success.main'}>
                                    {total}
                                </Typography>
                            </Box>
                        </CardContent>
                    </CardActionArea>
                </Card>
            </Zoom>
        );
    };

    // =====================================================
    // Loading State
    // =====================================================
    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
                <CircularProgress size={60} />
            </Box>
        );
    }

    // =====================================================
    // Main Render
    // =====================================================
    return (
        <Box p={3}>
            {/* Header with Compliance Score */}
            <Paper
                sx={{
                    p: 3,
                    mb: 3,
                    background: 'linear-gradient(135deg, #1a237e 0%, #0d47a1 100%)',
                    color: 'white',
                    borderRadius: 3,
                }}
            >
                <Grid container spacing={3} alignItems="center">
                    <Grid item xs={12} md={8}>
                        <Typography variant="h4" fontWeight="bold" gutterBottom>
                            🛡️ مركز الامتثال - قانون العمل السعودي
                        </Typography>
                        <Typography variant="body1" sx={{ opacity: 0.9 }}>
                            فحص شامل لجميع الموظفين حسب متطلبات: WPS، العقود، الهوية، الراتب، GOSI، نطاقات
                        </Typography>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Box display="flex" alignItems="center" justifyContent="flex-end" gap={2}>
                            {stats && (
                                <Box textAlign="center">
                                    <Typography variant="h2" fontWeight="bold">
                                        {stats.complianceRate}%
                                    </Typography>
                                    <Typography variant="caption">نسبة الامتثال</Typography>
                                    <LinearProgress
                                        variant="determinate"
                                        value={stats.complianceRate}
                                        color={getComplianceColor(stats.complianceRate)}
                                        sx={{ height: 8, borderRadius: 4, mt: 1, bgcolor: 'rgba(255,255,255,0.3)' }}
                                    />
                                </Box>
                            )}
                            <Button
                                variant="contained"
                                size="large"
                                startIcon={validating ? <CircularProgress size={20} color="inherit" /> : <RefreshIcon />}
                                onClick={handleValidateAll}
                                disabled={validating}
                                sx={{
                                    bgcolor: 'white',
                                    color: 'primary.main',
                                    '&:hover': { bgcolor: 'grey.100' },
                                }}
                            >
                                {validating ? 'جاري الفحص...' : 'فحص شامل'}
                            </Button>
                        </Box>
                    </Grid>
                </Grid>
            </Paper>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {/* Quick Stats Cards */}
            {stats && (
                <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={6} sm={4} md={2}>
                        <Card sx={{ bgcolor: stats.totalErrors > 0 ? 'error.50' : 'success.50' }}>
                            <CardContent sx={{ textAlign: 'center', py: 2 }}>
                                <ErrorIcon color={stats.totalErrors > 0 ? 'error' : 'success'} sx={{ fontSize: 28 }} />
                                <Typography variant="h4" fontWeight="bold">
                                    {stats.totalErrors}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    أخطاء
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={6} sm={4} md={2}>
                        <Card sx={{ bgcolor: stats.totalWarnings > 0 ? 'warning.50' : 'success.50' }}>
                            <CardContent sx={{ textAlign: 'center', py: 2 }}>
                                <WarningIcon color={stats.totalWarnings > 0 ? 'warning' : 'success'} sx={{ fontSize: 28 }} />
                                <Typography variant="h4" fontWeight="bold">
                                    {stats.totalWarnings}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    تحذيرات
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={6} sm={4} md={2}>
                        <Card>
                            <CardContent sx={{ textAlign: 'center', py: 2 }}>
                                <BankIcon color="primary" sx={{ fontSize: 28 }} />
                                <Typography variant="h4" fontWeight="bold">
                                    {stats.missingBank}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    بدون بنك
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={6} sm={4} md={2}>
                        <Card>
                            <CardContent sx={{ textAlign: 'center', py: 2 }}>
                                <ContractIcon color="secondary" sx={{ fontSize: 28 }} />
                                <Typography variant="h4" fontWeight="bold">
                                    {stats.missingContract}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    بدون عقد
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={6} sm={4} md={2}>
                        <Card>
                            <CardContent sx={{ textAlign: 'center', py: 2 }}>
                                <IdentityIcon color="warning" sx={{ fontSize: 28 }} />
                                <Typography variant="h4" fontWeight="bold">
                                    {stats.missingNationalId}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    بدون هوية
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={6} sm={4} md={2}>
                        <Card>
                            <CardContent sx={{ textAlign: 'center', py: 2 }}>
                                <SalaryIcon color="success" sx={{ fontSize: 28 }} />
                                <Typography variant="h4" fontWeight="bold">
                                    {stats.missingSalary}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    بدون راتب
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            )}

            {/* No Issues Message */}
            {stats && stats.totalErrors === 0 && stats.totalWarnings === 0 && (
                <Fade in>
                    <Alert
                        severity="success"
                        icon={<CheckIcon fontSize="large" />}
                        sx={{ mb: 3, fontSize: 16 }}
                    >
                        🎉 ممتاز! جميع الموظفين متوافقين مع متطلبات قانون العمل السعودي.
                    </Alert>
                </Fade>
            )}

            {/* Validation Results */}
            {summary && (
                <Paper sx={{ p: 3, borderRadius: 3 }}>
                    {/* Category Filter Cards */}
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                        📋 نتائج الفحص حسب الفئة
                    </Typography>

                    <Grid container spacing={2} sx={{ mb: 3 }}>
                        {/* All Categories Card */}
                        <Grid item xs={6} sm={4} md={2}>
                            <Card
                                sx={{
                                    border: selectedCategory === 'ALL' ? '2px solid #1976d2' : '1px solid #e0e0e0',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s',
                                    '&:hover': { boxShadow: 3 },
                                }}
                                onClick={() => setSelectedCategory('ALL')}
                            >
                                <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
                                    <Typography variant="subtitle2">الكل</Typography>
                                    <Typography variant="h5" fontWeight="bold" color="primary">
                                        {summary.exceptions.length}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Category Cards */}
                        {summary.byCategory.map((cat) => (
                            <Grid item xs={6} sm={4} md={2} key={cat.category}>
                                <CategoryCard
                                    category={cat.category}
                                    stats={cat}
                                    onClick={() => setSelectedCategory(cat.category)}
                                    selected={selectedCategory === cat.category}
                                />
                            </Grid>
                        ))}
                    </Grid>

                    {/* Exceptions Table */}
                    {getFilteredExceptions().length === 0 ? (
                        <Alert severity="success" icon={<CheckIcon />}>
                            {selectedCategory === 'ALL'
                                ? 'جميع الموظفين متوافقون! لا توجد مشاكل.'
                                : `لا توجد مشاكل في فئة "${categoryLabels[selectedCategory as ExceptionCategory]}"`}
                        </Alert>
                    ) : (
                        <TableContainer sx={{ maxHeight: 500 }}>
                            <Table size="small" stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>الموظف</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>الفئة</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>النوع</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>الخطورة</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>الرسالة</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }} align="center">إجراء</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {getFilteredExceptions().map((exc, idx) => (
                                        <TableRow
                                            key={`${exc.employeeId}-${exc.type}-${idx}`}
                                            hover
                                            sx={{
                                                bgcolor: exc.severity === 'ERROR' ? 'error.50' : undefined,
                                            }}
                                        >
                                            <TableCell>
                                                <Typography fontWeight="bold" fontSize={13}>
                                                    {exc.employeeName}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {exc.employeeCode}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    size="small"
                                                    label={categoryLabels[exc.category]}
                                                    sx={{
                                                        bgcolor: `${categoryColors[exc.category]}20`,
                                                        color: categoryColors[exc.category],
                                                        fontWeight: 'bold',
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Typography fontSize={12}>
                                                    {exceptionTypeLabels[exc.type] || exc.type}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    size="small"
                                                    label={severityLabels[exc.severity]}
                                                    color={severityColors[exc.severity]}
                                                    icon={
                                                        exc.severity === 'ERROR' ? <ErrorIcon /> :
                                                            exc.severity === 'WARNING' ? <WarningIcon /> :
                                                                <InfoIcon />
                                                    }
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Typography fontSize={12}>{exc.message}</Typography>
                                            </TableCell>
                                            <TableCell align="center">
                                                {exc.actionUrl && (
                                                    <Tooltip title="فتح صفحة الإصلاح">
                                                        <IconButton
                                                            size="small"
                                                            color="primary"
                                                            href={exc.actionUrl}
                                                            target="_blank"
                                                        >
                                                            <OpenIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}

                    {/* Summary Footer */}
                    <Box display="flex" justifyContent="space-between" alignItems="center" mt={2} pt={2} borderTop="1px solid #e0e0e0">
                        <Box display="flex" gap={2}>
                            <Chip label={`${summary.totalEmployees} موظف`} variant="outlined" />
                            <Chip label={`${summary.employeesWithIssues} موظف بمشاكل`} color="error" variant="outlined" />
                            <Chip label={`${summary.complianceRate}% امتثال`} color="success" />
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                            آخر فحص: {new Date(summary.lastChecked).toLocaleString('ar-SA')}
                        </Typography>
                    </Box>
                </Paper>
            )}
        </Box>
    );
}
