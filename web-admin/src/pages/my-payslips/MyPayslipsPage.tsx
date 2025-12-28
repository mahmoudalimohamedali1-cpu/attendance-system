/**
 * My Payslips Page - Employee Self-Service
 * صفحة كشوفات راتبي
 */
import { useEffect, useState } from 'react';
import {
    Box,
    Typography,
    Paper,
    Card,
    CardContent,
    Grid,
    Divider,
    Chip,
    IconButton,
    Collapse,
    Skeleton,
    Alert,
    Stack,
} from '@mui/material';
import {
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
    Download as DownloadIcon,
    Receipt as ReceiptIcon,
    TrendingUp as TrendingUpIcon,
    TrendingDown as TrendingDownIcon,
    AccountBalance as AccountBalanceIcon,
} from '@mui/icons-material';
import { myPayslipsService, MyPayslipItem } from '../../services/my-payslips.service';

const monthNames = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('ar-SA', {
        style: 'currency',
        currency: 'SAR',
        minimumFractionDigits: 2,
    }).format(amount);
}

interface PayslipCardProps {
    payslip: MyPayslipItem;
}

function PayslipCard({ payslip }: PayslipCardProps) {
    const [expanded, setExpanded] = useState(false);

    const handleDownloadPdf = () => {
        const url = myPayslipsService.getPayslipPdfUrl(payslip.id);
        window.open(url, '_blank');
    };

    return (
        <Card
            sx={{
                mb: 2,
                borderRadius: 3,
                background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.9) 100%)',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                border: '1px solid rgba(255,255,255,0.6)',
                transition: 'all 0.3s ease',
                '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                },
            }}
        >
            <CardContent>
                {/* Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box
                            sx={{
                                width: 50,
                                height: 50,
                                borderRadius: 2,
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <ReceiptIcon sx={{ color: 'white', fontSize: 28 }} />
                        </Box>
                        <Box>
                            <Typography variant="h6" fontWeight={600}>
                                {monthNames[payslip.month - 1]} {payslip.year}
                            </Typography>
                            <Chip
                                label={payslip.status === 'PAID' ? 'مدفوع' : 'معتمد'}
                                size="small"
                                color={payslip.status === 'PAID' ? 'success' : 'info'}
                                sx={{ mt: 0.5 }}
                            />
                        </Box>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <IconButton onClick={handleDownloadPdf} color="primary" title="تحميل PDF">
                            <DownloadIcon />
                        </IconButton>
                        <IconButton onClick={() => setExpanded(!expanded)}>
                            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        </IconButton>
                    </Box>
                </Box>

                {/* Summary Row */}
                <Grid container spacing={2} sx={{ mb: 1 }}>
                    <Grid item xs={6} sm={3}>
                        <Box sx={{ textAlign: 'center', p: 1.5, borderRadius: 2, bgcolor: 'rgba(16, 185, 129, 0.1)' }}>
                            <Typography variant="caption" color="text.secondary">إجمالي الراتب</Typography>
                            <Typography variant="h6" fontWeight={600} color="success.main">
                                {formatCurrency(payslip.grossSalary)}
                            </Typography>
                        </Box>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <Box sx={{ textAlign: 'center', p: 1.5, borderRadius: 2, bgcolor: 'rgba(239, 68, 68, 0.1)' }}>
                            <Typography variant="caption" color="text.secondary">الخصومات</Typography>
                            <Typography variant="h6" fontWeight={600} color="error.main">
                                {formatCurrency(payslip.totalDeductions)}
                            </Typography>
                        </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Box sx={{
                            textAlign: 'center',
                            p: 1.5,
                            borderRadius: 2,
                            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(99, 102, 241, 0.15) 100%)',
                        }}>
                            <Typography variant="caption" color="text.secondary">صافي الراتب</Typography>
                            <Typography variant="h5" fontWeight={700} color="primary.main">
                                {formatCurrency(payslip.netSalary)}
                            </Typography>
                        </Box>
                    </Grid>
                </Grid>

                {/* Expanded Details */}
                <Collapse in={expanded}>
                    <Divider sx={{ my: 2 }} />
                    <Grid container spacing={3}>
                        {/* Earnings */}
                        <Grid item xs={12} md={6}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                                <TrendingUpIcon color="success" />
                                <Typography variant="subtitle1" fontWeight={600} color="success.main">
                                    الاستحقاقات
                                </Typography>
                            </Box>
                            <Stack spacing={1}>
                                {payslip.earnings.map((item, idx) => (
                                    <Box
                                        key={idx}
                                        sx={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            p: 1,
                                            borderRadius: 1,
                                            bgcolor: 'rgba(16, 185, 129, 0.05)',
                                        }}
                                    >
                                        <Typography variant="body2">{item.name}</Typography>
                                        <Typography variant="body2" fontWeight={500}>
                                            {formatCurrency(item.amount)}
                                        </Typography>
                                    </Box>
                                ))}
                            </Stack>
                        </Grid>

                        {/* Deductions */}
                        <Grid item xs={12} md={6}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                                <TrendingDownIcon color="error" />
                                <Typography variant="subtitle1" fontWeight={600} color="error.main">
                                    الخصومات
                                </Typography>
                            </Box>
                            <Stack spacing={1}>
                                {payslip.deductions.length > 0 ? payslip.deductions.map((item, idx) => (
                                    <Box
                                        key={idx}
                                        sx={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            p: 1,
                                            borderRadius: 1,
                                            bgcolor: 'rgba(239, 68, 68, 0.05)',
                                        }}
                                    >
                                        <Typography variant="body2">{item.name}</Typography>
                                        <Typography variant="body2" fontWeight={500}>
                                            {formatCurrency(item.amount)}
                                        </Typography>
                                    </Box>
                                )) : (
                                    <Typography variant="body2" color="text.secondary">
                                        لا توجد خصومات
                                    </Typography>
                                )}
                            </Stack>
                        </Grid>
                    </Grid>
                </Collapse>
            </CardContent>
        </Card>
    );
}

function LoadingSkeleton() {
    return (
        <Stack spacing={2}>
            {[1, 2, 3].map(i => (
                <Card key={i} sx={{ borderRadius: 3 }}>
                    <CardContent>
                        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                            <Skeleton variant="rounded" width={50} height={50} />
                            <Box sx={{ flex: 1 }}>
                                <Skeleton width="40%" height={28} />
                                <Skeleton width="20%" height={24} />
                            </Box>
                        </Box>
                        <Grid container spacing={2}>
                            <Grid item xs={4}><Skeleton height={60} sx={{ borderRadius: 2 }} /></Grid>
                            <Grid item xs={4}><Skeleton height={60} sx={{ borderRadius: 2 }} /></Grid>
                            <Grid item xs={4}><Skeleton height={60} sx={{ borderRadius: 2 }} /></Grid>
                        </Grid>
                    </CardContent>
                </Card>
            ))}
        </Stack>
    );
}

export default function MyPayslipsPage() {
    const [payslips, setPayslips] = useState<MyPayslipItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadPayslips();
    }, []);

    const loadPayslips = async () => {
        try {
            setLoading(true);
            const data = await myPayslipsService.getMyPayslips();
            // Ensure data is always an array
            setPayslips(Array.isArray(data) ? data : []);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'حدث خطأ في تحميل كشوفات الراتب');
        } finally {
            setLoading(false);
        }
    };

    // Calculate totals for summary (ensure payslips is array before reduce)
    const payslipsArray = Array.isArray(payslips) ? payslips : [];
    const totalNet = payslipsArray.reduce((sum, p) => sum + (p.netSalary || 0), 0);
    const latestPayslip = payslipsArray[0];

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" fontWeight={700} gutterBottom>
                    كشوفات راتبي
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    عرض تفاصيل كشوفات الراتب الشهرية
                </Typography>
            </Box>

            {/* Summary Card */}
            {latestPayslip && !loading && (
                <Paper
                    sx={{
                        p: 3,
                        mb: 4,
                        borderRadius: 3,
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                    }}
                >
                    <Grid container spacing={3} alignItems="center">
                        <Grid item xs={12} md={6}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <AccountBalanceIcon sx={{ fontSize: 48, opacity: 0.9 }} />
                                <Box>
                                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                        آخر راتب ({monthNames[latestPayslip.month - 1]} {latestPayslip.year})
                                    </Typography>
                                    <Typography variant="h3" fontWeight={700}>
                                        {formatCurrency(latestPayslip.netSalary)}
                                    </Typography>
                                </Box>
                            </Box>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Box sx={{ textAlign: { xs: 'left', md: 'right' } }}>
                                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                    إجمالي السنة ({payslips.length} شهر)
                                </Typography>
                                <Typography variant="h5" fontWeight={600}>
                                    {formatCurrency(totalNet)}
                                </Typography>
                            </Box>
                        </Grid>
                    </Grid>
                </Paper>
            )}

            {/* Error */}
            {error && (
                <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                    {error}
                </Alert>
            )}

            {/* Loading */}
            {loading && <LoadingSkeleton />}

            {/* Payslips List */}
            {!loading && payslipsArray.length === 0 && !error && (
                <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
                    <ReceiptIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">
                        لا توجد كشوفات راتب حالياً
                    </Typography>
                    <Typography variant="body2" color="text.disabled">
                        ستظهر كشوفات الراتب هنا بعد اعتمادها من قسم الموارد البشرية
                    </Typography>
                </Paper>
            )}

            {!loading && payslipsArray.map(payslip => (
                <PayslipCard key={payslip.id} payslip={payslip} />
            ))}
        </Box>
    );
}
