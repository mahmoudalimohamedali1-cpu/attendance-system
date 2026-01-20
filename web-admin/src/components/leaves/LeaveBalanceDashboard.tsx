import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    LinearProgress,
    Chip,
    CircularProgress,
    Alert,
    Tooltip,
    Paper,
    Divider,
    IconButton,
    Collapse,
} from '@mui/material';
import {
    BeachAccess,
    LocalHospital,
    Warning,
    MoneyOff,
    ChildCare,
    Face,
    Favorite,
    SentimentVeryDissatisfied,
    Business,
    Event,
    ExpandMore,
    ExpandLess,
    TrendingDown,
    CalendarMonth,
    Info,
} from '@mui/icons-material';
import { api } from '@/services/api.service';

interface LeaveBalance {
    id: string;
    code: string;
    nameAr: string;
    nameEn?: string;
    category: string;
    isPaid: boolean;
    color: string;
    icon: string;
    entitled: number;
    carriedForward: number;
    totalAvailable: number;
    used: number;
    pending: number;
    remaining: number;
    usagePercentage: number;
    isLowBalance: boolean;
    allowNegativeBalance: boolean;
    maxCarryForward?: number;
    maxBalanceCap?: number;
}

interface LeaveBalancesResponse {
    year: number;
    employee: {
        id: string;
        name: string;
        hireDate: string | null;
    };
    balances: LeaveBalance[];
    totals: {
        totalEntitled: number;
        totalUsed: number;
        totalPending: number;
        totalRemaining: number;
    };
    lastUpdated: string;
}

// Icon mapping
const getIcon = (category: string) => {
    const icons: Record<string, React.ReactNode> = {
        ANNUAL: <BeachAccess />,
        SICK: <LocalHospital />,
        EMERGENCY: <Warning />,
        UNPAID: <MoneyOff />,
        MATERNITY: <ChildCare />,
        PATERNITY: <Face />,
        MARRIAGE: <Favorite />,
        DEATH: <SentimentVeryDissatisfied />,
        OFFICIAL: <Business />,
    };
    return icons[category] || <Event />;
};

// Progress bar color based on remaining percentage
const getProgressColor = (remaining: number, total: number): 'success' | 'warning' | 'error' => {
    if (total === 0) return 'success';
    const percentage = (remaining / total) * 100;
    if (percentage > 50) return 'success';
    if (percentage > 20) return 'warning';
    return 'error';
};

export const LeaveBalanceDashboard = () => {
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const { data, isLoading, error, refetch } = useQuery<LeaveBalancesResponse>({
        queryKey: ['my-leave-balances'],
        queryFn: () => api.get('/leaves/my/balances'),
    });

    if (isLoading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" py={4}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Alert severity="error" sx={{ mb: 2 }}>
                فشل في تحميل أرصدة الإجازات
            </Alert>
        );
    }

    if (!data) return null;

    const toggleExpand = (id: string) => {
        setExpandedId(expandedId === id ? null : id);
    };

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h5" fontWeight="bold">
                        أرصدة الإجازات
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        السنة: {data.year}
                    </Typography>
                </Box>
                <Chip
                    icon={<CalendarMonth />}
                    label={`آخر تحديث: ${new Date(data.lastUpdated).toLocaleDateString('ar-SA')}`}
                    variant="outlined"
                    size="small"
                />
            </Box>

            {/* Summary Cards */}
            <Grid container spacing={2} sx={{ mb: 4 }}>
                <Grid item xs={6} md={3}>
                    <Paper
                        sx={{
                            p: 2,
                            textAlign: 'center',
                            bgcolor: 'primary.50',
                            borderRadius: 2,
                        }}
                    >
                        <Typography variant="h4" color="primary.main" fontWeight="bold">
                            {data.totals.totalEntitled}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            إجمالي الاستحقاق
                        </Typography>
                    </Paper>
                </Grid>
                <Grid item xs={6} md={3}>
                    <Paper
                        sx={{
                            p: 2,
                            textAlign: 'center',
                            bgcolor: 'success.50',
                            borderRadius: 2,
                        }}
                    >
                        <Typography variant="h4" color="success.main" fontWeight="bold">
                            {data.totals.totalRemaining}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            المتبقي
                        </Typography>
                    </Paper>
                </Grid>
                <Grid item xs={6} md={3}>
                    <Paper
                        sx={{
                            p: 2,
                            textAlign: 'center',
                            bgcolor: 'warning.50',
                            borderRadius: 2,
                        }}
                    >
                        <Typography variant="h4" color="warning.main" fontWeight="bold">
                            {data.totals.totalUsed}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            المستخدم
                        </Typography>
                    </Paper>
                </Grid>
                <Grid item xs={6} md={3}>
                    <Paper
                        sx={{
                            p: 2,
                            textAlign: 'center',
                            bgcolor: 'info.50',
                            borderRadius: 2,
                        }}
                    >
                        <Typography variant="h4" color="info.main" fontWeight="bold">
                            {data.totals.totalPending}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            في الانتظار
                        </Typography>
                    </Paper>
                </Grid>
            </Grid>

            {/* Balance Cards */}
            <Grid container spacing={2}>
                {data.balances.map((balance) => (
                    <Grid item xs={12} md={6} lg={4} key={balance.id}>
                        <Card
                            sx={{
                                height: '100%',
                                borderLeft: 4,
                                borderColor: balance.color,
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    boxShadow: 4,
                                    transform: 'translateY(-2px)',
                                },
                            }}
                        >
                            <CardContent>
                                {/* Header */}
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                        <Box
                                            sx={{
                                                p: 1,
                                                borderRadius: 2,
                                                bgcolor: `${balance.color}20`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: balance.color,
                                            }}
                                        >
                                            {getIcon(balance.category)}
                                        </Box>
                                        <Box>
                                            <Typography variant="subtitle1" fontWeight="bold">
                                                {balance.nameAr}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {balance.isPaid ? 'مدفوعة' : 'غير مدفوعة'}
                                            </Typography>
                                        </Box>
                                    </Box>

                                    {balance.isLowBalance && (
                                        <Tooltip title="رصيد منخفض">
                                            <TrendingDown color="error" fontSize="small" />
                                        </Tooltip>
                                    )}
                                </Box>

                                {/* Balance Display */}
                                <Box sx={{ textAlign: 'center', my: 2 }}>
                                    <Typography
                                        variant="h3"
                                        fontWeight="bold"
                                        color={balance.remaining <= 0 ? 'error.main' : 'text.primary'}
                                    >
                                        {balance.remaining}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        يوم متبقي من {balance.totalAvailable}
                                    </Typography>
                                </Box>

                                {/* Progress Bar */}
                                <Box sx={{ mb: 2 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                        <Typography variant="caption" color="text.secondary">
                                            نسبة الاستخدام
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {balance.usagePercentage}%
                                        </Typography>
                                    </Box>
                                    <LinearProgress
                                        variant="determinate"
                                        value={balance.usagePercentage}
                                        color={getProgressColor(balance.remaining, balance.totalAvailable)}
                                        sx={{ height: 8, borderRadius: 4 }}
                                    />
                                </Box>

                                {/* Quick Stats */}
                                <Box sx={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
                                    <Box>
                                        <Typography variant="body2" fontWeight="bold" color="success.main">
                                            {balance.used}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            مستخدم
                                        </Typography>
                                    </Box>
                                    <Divider orientation="vertical" flexItem />
                                    <Box>
                                        <Typography variant="body2" fontWeight="bold" color="warning.main">
                                            {balance.pending}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            معلق
                                        </Typography>
                                    </Box>
                                    <Divider orientation="vertical" flexItem />
                                    <Box>
                                        <Typography variant="body2" fontWeight="bold" color="info.main">
                                            {balance.carriedForward}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            مرحّل
                                        </Typography>
                                    </Box>
                                </Box>

                                {/* Expand Button */}
                                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                                    <IconButton
                                        size="small"
                                        onClick={() => toggleExpand(balance.id)}
                                        sx={{
                                            bgcolor: 'action.hover',
                                            '&:hover': { bgcolor: 'action.selected' },
                                        }}
                                    >
                                        {expandedId === balance.id ? <ExpandLess /> : <ExpandMore />}
                                    </IconButton>
                                </Box>

                                {/* Expanded Details */}
                                <Collapse in={expandedId === balance.id}>
                                    <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                                        <Grid container spacing={1}>
                                            <Grid item xs={6}>
                                                <Typography variant="caption" color="text.secondary">
                                                    الاستحقاق السنوي
                                                </Typography>
                                                <Typography variant="body2" fontWeight="bold">
                                                    {balance.entitled} يوم
                                                </Typography>
                                            </Grid>
                                            {balance.maxCarryForward && (
                                                <Grid item xs={6}>
                                                    <Typography variant="caption" color="text.secondary">
                                                        الحد الأقصى للترحيل
                                                    </Typography>
                                                    <Typography variant="body2" fontWeight="bold">
                                                        {balance.maxCarryForward} يوم
                                                    </Typography>
                                                </Grid>
                                            )}
                                            {balance.maxBalanceCap && (
                                                <Grid item xs={6}>
                                                    <Typography variant="caption" color="text.secondary">
                                                        الحد الأقصى للرصيد
                                                    </Typography>
                                                    <Typography variant="body2" fontWeight="bold">
                                                        {balance.maxBalanceCap} يوم
                                                    </Typography>
                                                </Grid>
                                            )}
                                            <Grid item xs={6}>
                                                <Typography variant="caption" color="text.secondary">
                                                    السماح بالسالب
                                                </Typography>
                                                <Typography variant="body2" fontWeight="bold">
                                                    {balance.allowNegativeBalance ? 'نعم' : 'لا'}
                                                </Typography>
                                            </Grid>
                                        </Grid>
                                    </Box>
                                </Collapse>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Empty State */}
            {data.balances.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Info sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                    <Typography color="text.secondary">
                        لا توجد أنواع إجازات مُعدّة
                    </Typography>
                </Box>
            )}
        </Box>
    );
};

export default LeaveBalanceDashboard;
