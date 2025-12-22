import { useState, useEffect, useMemo } from 'react';
import {
    Box,
    Typography,
    Button,
    Card,
    CardContent,
    Grid,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Avatar,
    IconButton,
    Alert,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    Divider,
    DialogActions,
    Chip,
    TextField,
    InputAdornment,
    Paper,
} from '@mui/material';
import {
    ArrowBack,
    Visibility,
    CheckCircle,
    Download,
    PictureAsPdf,
    Email,
    Lock,
    CloudUpload,
    Warning,
    People,
    TrendingUp,
    TrendingDown,
    AttachMoney,
    Search,
    Receipt,
} from '@mui/icons-material';
import { api, API_URL } from '@/services/api.service';
import { useNavigate, useParams } from 'react-router-dom';

interface PayrollRun {
    id: string;
    runDate: string;
    status: string;
    period: { month: number, year: number };
    payslips: any[];
}

export const PayrollRunDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [run, setRun] = useState<PayrollRun | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedPayslip, setSelectedPayslip] = useState<any | null>(null);

    useEffect(() => {
        const fetchRun = async () => {
            try {
                setLoading(true);
                const data = await api.get(`/payroll-runs/${id}`) as PayrollRun;
                setRun(data);
            } catch (err: any) {
                setError(err.message || 'Failed to fetch run details');
            } finally {
                setLoading(false);
            }
        };
        fetchRun();
    }, [id]);

    const handleApprove = async () => {
        if (!window.confirm('هل أنت متأكد من اعتماد هذا المسير؟ لن تتمكن من حذفه بعد الاعتماد.')) return;
        try {
            setLoading(true);
            await api.patch(`/payroll-runs/${id}/approve`, {});
            navigate('/salary'); // Return to list
        } catch (err: any) {
            setError(err.message || 'Failed to approve');
            setLoading(false);
        }
    };

    if (loading) return <Box display="flex" justifyContent="center" py={10}><CircularProgress /></Box>;
    if (error) return <Alert severity="error">{error}</Alert>;
    if (!run) return <Alert severity="warning">Run not found</Alert>;

    const handleSendEmails = async () => {
        if (!window.confirm('هل تريد إرسال قسائم الرواتب لجميع الموظفين عبر البريد الإلكتروني؟')) return;
        try {
            setLoading(true);
            const result = await api.post(`/payroll-runs/${id}/send-emails`) as { message: string };
            alert(result.message);
        } catch (err: any) {
            setError(err.message || 'Failed to send emails');
        } finally {
            setLoading(false);
        }
    };

    // Calculate summary from payslips
    const summary = useMemo(() => {
        if (!run?.payslips) return { employees: 0, grossTotal: 0, deductionsTotal: 0, netTotal: 0 };
        return run.payslips.reduce((acc, p) => ({
            employees: acc.employees + 1,
            grossTotal: acc.grossTotal + parseFloat(p.grossSalary || 0),
            deductionsTotal: acc.deductionsTotal + parseFloat(p.totalDeductions || 0),
            netTotal: acc.netTotal + parseFloat(p.netSalary || 0),
        }), { employees: 0, grossTotal: 0, deductionsTotal: 0, netTotal: 0 });
    }, [run?.payslips]);

    // Filter payslips by search
    const [searchTerm, setSearchTerm] = useState('');
    const filteredPayslips = run?.payslips?.filter(p => {
        if (!searchTerm) return true;
        const name = `${p.employee?.firstName} ${p.employee?.lastName}`.toLowerCase();
        const code = p.employee?.employeeCode?.toLowerCase() || '';
        return name.includes(searchTerm.toLowerCase()) || code.includes(searchTerm.toLowerCase());
    }) || [];

    const isLocked = run.status === 'LOCKED' || run.status === 'PAID' || run.status === 'APPROVED';

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'DRAFT': return 'مسودة';
            case 'CALCULATED': return 'تم الحساب';
            case 'APPROVED': return 'معتمد';
            case 'LOCKED': return 'مقفل 🔒';
            case 'PAID': return 'تم الصرف ✅';
            default: return status;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'DRAFT': return 'default';
            case 'CALCULATED': return 'info';
            case 'APPROVED': return 'success';
            case 'LOCKED': return 'success';
            case 'PAID': return 'success';
            default: return 'default';
        }
    };

    const getMonthName = (month: number) => {
        const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
            'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
        return months[month - 1] || '';
    };

    return (
        <Box>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
                <Box>
                    <Button startIcon={<ArrowBack />} onClick={() => navigate('/salary/periods')}>العودة</Button>
                    <Box display="flex" alignItems="center" gap={2} mt={1}>
                        <Typography variant="h5" fontWeight="bold">
                            دورة الرواتب - {getMonthName(run.period?.month)} {run.period?.year}
                        </Typography>
                        <Chip
                            label={getStatusLabel(run.status)}
                            color={getStatusColor(run.status) as any}
                            size="small"
                        />
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                        تم التشغيل بتاريخ {new Date(run.runDate).toLocaleString('ar-SA')}
                    </Typography>
                </Box>
                <Box display="flex" gap={1} flexWrap="wrap">
                    <Button
                        variant="outlined"
                        startIcon={<Download />}
                        href={`${API_URL}/payroll-runs/${id}/excel`}
                        target="_blank"
                    >
                        Excel
                    </Button>
                    <Button
                        variant="outlined"
                        color="secondary"
                        startIcon={<Email />}
                        onClick={handleSendEmails}
                    >
                        إرسال بالبريد
                    </Button>
                    <Button
                        variant="outlined"
                        color="info"
                        startIcon={<CloudUpload />}
                        href={`${API_URL}/wps-export/${id}/csv`}
                        target="_blank"
                        disabled={!isLocked}
                    >
                        تصدير WPS CSV
                    </Button>
                    <Button
                        variant="outlined"
                        color="warning"
                        startIcon={<CloudUpload />}
                        href={`${API_URL}/wps-export/${id}/sarie`}
                        target="_blank"
                        disabled={!isLocked}
                    >
                        تصدير SARIE
                    </Button>
                    <Button
                        variant="contained"
                        color="success"
                        startIcon={isLocked ? <Lock /> : <CheckCircle />}
                        onClick={handleApprove}
                        disabled={isLocked}
                    >
                        {isLocked ? 'مقفل' : 'قفل واعتماد الدورة'}
                    </Button>
                </Box>
            </Box>

            {/* Health Gate Cards */}
            <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckCircle color="success" /> بوابات الجاهزية
            </Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
                {[
                    { label: 'الحضور', ready: true, detail: `${summary.employees} موظف`, path: '/attendance' },
                    { label: 'الإجازات', ready: true, detail: 'لا يوجد معلق', path: '/leaves' },
                    { label: 'السلف', ready: true, detail: 'جاهز', path: '/advances' },
                    { label: 'الحسابات البنكية', ready: true, detail: 'جاهز', path: '/bank-accounts' },
                    { label: 'إعداد GOSI', ready: true, detail: 'مفعّل', path: '/gosi' },
                ].map((item, index) => (
                    <Grid item xs={6} sm={4} md={2.4} key={index}>
                        <Card
                            sx={{
                                borderRadius: 2,
                                border: '2px solid',
                                borderColor: item.ready ? 'success.light' : 'warning.light',
                                cursor: !item.ready ? 'pointer' : 'default',
                            }}
                            onClick={() => !item.ready && navigate(item.path)}
                        >
                            <CardContent sx={{ py: 2, textAlign: 'center' }}>
                                {item.ready ? (
                                    <CheckCircle color="success" sx={{ fontSize: 28 }} />
                                ) : (
                                    <Warning color="warning" sx={{ fontSize: 28 }} />
                                )}
                                <Typography variant="body2" fontWeight="bold" sx={{ mt: 1 }}>
                                    {item.label}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {item.detail}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Summary Cards */}
            <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Receipt color="primary" /> ملخص الرواتب
            </Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
                {[
                    { label: 'عدد الموظفين', value: summary.employees, icon: <People />, color: '#1a237e' },
                    { label: 'إجمالي المستحقات', value: summary.grossTotal.toLocaleString() + ' ر.س', icon: <TrendingUp />, color: '#2e7d32' },
                    { label: 'إجمالي الخصومات', value: summary.deductionsTotal.toLocaleString() + ' ر.س', icon: <TrendingDown />, color: '#d32f2f' },
                    { label: 'صافي الرواتب', value: summary.netTotal.toLocaleString() + ' ر.س', icon: <AttachMoney />, color: '#0288d1' },
                ].map((item, index) => (
                    <Grid item xs={6} md={3} key={index}>
                        <Card sx={{ borderRadius: 3 }}>
                            <CardContent>
                                <Box display="flex" alignItems="center" gap={2}>
                                    <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: `${item.color}15`, color: item.color }}>
                                        {item.icon}
                                    </Box>
                                    <Box>
                                        <Typography variant="h6" fontWeight="bold" color={item.color}>
                                            {item.value}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {item.label}
                                        </Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Employees Table */}
            <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <Box p={2} display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6" fontWeight="bold">
                        قسائم الموظفين ({filteredPayslips.length})
                    </Typography>
                    <TextField
                        size="small"
                        placeholder="بحث بالاسم أو الكود..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Search />
                                </InputAdornment>
                            ),
                        }}
                        sx={{ width: 280 }}
                    />
                </Box>
                <Divider />
                <TableContainer>
                    <Table>
                        <TableHead sx={{ bgcolor: 'grey.50' }}>
                            <TableRow>
                                <TableCell>الموظف</TableCell>
                                <TableCell>الراتب الأساسي</TableCell>
                                <TableCell>إجمالي الاستحقاقات</TableCell>
                                <TableCell>إجمالي الاستقطاعات</TableCell>
                                <TableCell>صافي الراتب</TableCell>
                                <TableCell align="center">الإجراءات</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredPayslips.map((payslip) => (
                                <TableRow key={payslip.id} hover>
                                    <TableCell>
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <Avatar sx={{ width: 32, height: 32 }}>{payslip.employee?.firstName[0]}</Avatar>
                                            <Box>
                                                <Typography variant="body2" fontWeight="bold">
                                                    {payslip.employee?.firstName} {payslip.employee?.lastName}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">{payslip.employee?.employeeCode}</Typography>
                                            </Box>
                                        </Box>
                                    </TableCell>
                                    <TableCell>{parseFloat(payslip.baseSalary).toLocaleString()} ريال</TableCell>
                                    <TableCell sx={{ color: 'success.main', fontWeight: 'bold' }}>
                                        {parseFloat(payslip.grossSalary).toLocaleString()} ريال
                                    </TableCell>
                                    <TableCell sx={{ color: 'error.main' }}>
                                        {parseFloat(payslip.totalDeductions).toLocaleString()} ريال
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.50' }}>
                                        {parseFloat(payslip.netSalary).toLocaleString()} ريال
                                    </TableCell>
                                    <TableCell align="center">
                                        <IconButton size="small" onClick={() => setSelectedPayslip(payslip)}>
                                            <Visibility fontSize="small" />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            <Dialog open={!!selectedPayslip} onClose={() => setSelectedPayslip(null)} maxWidth="md" fullWidth>
                <DialogTitle>تفاصيل قسيمة الراتب</DialogTitle>
                <DialogContent dividers>
                    {selectedPayslip && (
                        <Box>
                            {/* Employee Info */}
                            <Box display="flex" justifyContent="space-between" mb={2}>
                                <Typography fontWeight="bold">الموظف:</Typography>
                                <Typography>{selectedPayslip.employee.firstName} {selectedPayslip.employee.lastName}</Typography>
                            </Box>
                            <Box display="flex" justifyContent="space-between" mb={2}>
                                <Typography fontWeight="bold">الراتب الأساسي:</Typography>
                                <Typography>{parseFloat(selectedPayslip.baseSalary).toLocaleString()} ريال</Typography>
                            </Box>

                            <Divider sx={{ my: 2 }} />

                            {/* Enhanced Payslip Lines */}
                            <Typography variant="subtitle2" color="primary" gutterBottom>مكونات الراتب التفصيلية:</Typography>

                            <TableContainer sx={{ mb: 2 }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: 'grey.50' }}>
                                            <TableCell>المكوّن</TableCell>
                                            <TableCell>المصدر</TableCell>
                                            <TableCell>الوصف</TableCell>
                                            <TableCell align="center">الوحدات</TableCell>
                                            <TableCell align="center">المعدل</TableCell>
                                            <TableCell align="left">القيمة</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {selectedPayslip.lines.map((line: any) => {
                                            const getSourceBadge = (sourceType: string) => {
                                                const badges: Record<string, { label: string; color: 'default' | 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning' }> = {
                                                    'STRUCTURE': { label: 'هيكل', color: 'default' },
                                                    'POLICY': { label: 'سياسات', color: 'primary' },
                                                    'STATUTORY': { label: 'تأمينات', color: 'info' },
                                                    'MANUAL': { label: 'يدوي', color: 'warning' },
                                                    'ADJUSTMENT': { label: 'تعديل', color: 'secondary' },
                                                };
                                                return badges[sourceType] || { label: sourceType, color: 'default' };
                                            };

                                            const badge = getSourceBadge(line.sourceType || 'STRUCTURE');
                                            const isDeduction = line.sign === 'DEDUCTION' || line.component?.type === 'DEDUCTION';

                                            return (
                                                <TableRow key={line.id} hover>
                                                    <TableCell>
                                                        <Typography variant="body2" fontWeight="medium">
                                                            {line.component?.nameAr || '-'}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Box
                                                            component="span"
                                                            sx={{
                                                                px: 1,
                                                                py: 0.5,
                                                                borderRadius: 1,
                                                                fontSize: '0.7rem',
                                                                bgcolor: badge.color === 'default' ? 'grey.200' :
                                                                    badge.color === 'primary' ? 'primary.100' :
                                                                        badge.color === 'info' ? 'info.100' :
                                                                            badge.color === 'warning' ? 'warning.100' :
                                                                                badge.color === 'secondary' ? 'secondary.100' : 'grey.200',
                                                                color: badge.color === 'default' ? 'grey.700' :
                                                                    badge.color === 'primary' ? 'primary.main' :
                                                                        badge.color === 'info' ? 'info.main' :
                                                                            badge.color === 'warning' ? 'warning.main' :
                                                                                badge.color === 'secondary' ? 'secondary.main' : 'grey.700',
                                                            }}
                                                        >
                                                            {badge.label}
                                                        </Box>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {line.descriptionAr || '-'}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        {line.units ? `${parseFloat(line.units).toFixed(2)}` : '-'}
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        {line.rate ? `x${parseFloat(line.rate).toFixed(2)}` : '-'}
                                                    </TableCell>
                                                    <TableCell align="left">
                                                        <Typography
                                                            variant="body2"
                                                            fontWeight="bold"
                                                            color={isDeduction ? 'error.main' : 'success.main'}
                                                        >
                                                            {isDeduction ? '-' : '+'} {parseFloat(line.amount).toLocaleString()} ريال
                                                        </Typography>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </TableContainer>

                            {/* Summary */}
                            <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, mb: 2 }}>
                                <Box display="flex" justifyContent="space-between" mb={1}>
                                    <Typography>إجمالي الاستحقاقات:</Typography>
                                    <Typography color="success.main" fontWeight="bold">
                                        {parseFloat(selectedPayslip.grossSalary).toLocaleString()} ريال
                                    </Typography>
                                </Box>
                                <Box display="flex" justifyContent="space-between" mb={1}>
                                    <Typography>إجمالي الاستقطاعات:</Typography>
                                    <Typography color="error.main" fontWeight="bold">
                                        {parseFloat(selectedPayslip.totalDeductions).toLocaleString()} ريال
                                    </Typography>
                                </Box>
                                <Divider sx={{ my: 1 }} />
                                <Box display="flex" justifyContent="space-between">
                                    <Typography fontWeight="bold">صافي الراتب:</Typography>
                                    <Typography fontWeight="bold" color="primary" fontSize="1.1rem">
                                        {parseFloat(selectedPayslip.netSalary).toLocaleString()} ريال
                                    </Typography>
                                </Box>
                            </Box>

                            {/* Calculation Trace Accordion */}
                            {selectedPayslip.calculationTrace && Array.isArray(selectedPayslip.calculationTrace) && selectedPayslip.calculationTrace.length > 0 && (
                                <Box sx={{ mt: 2 }}>
                                    <Typography
                                        variant="subtitle2"
                                        color="text.secondary"
                                        gutterBottom
                                        sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1 }}
                                        onClick={() => {
                                            const el = document.getElementById('trace-content');
                                            if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
                                        }}
                                    >
                                        📊 عرض خطوات الحساب ({selectedPayslip.calculationTrace.length} خطوة)
                                    </Typography>
                                    <Box id="trace-content" sx={{ display: 'none', bgcolor: 'grey.50', p: 2, borderRadius: 1, maxHeight: 300, overflow: 'auto' }}>
                                        {selectedPayslip.calculationTrace.map((step: any, idx: number) => (
                                            <Box key={idx} sx={{ mb: 2, pb: 1, borderBottom: '1px dashed #ddd' }}>
                                                <Typography variant="body2" fontWeight="bold" color="primary">
                                                    {idx + 1}. {step.step || step.description || 'خطوة'}
                                                </Typography>
                                                {step.description && (
                                                    <Typography variant="caption" color="text.secondary">
                                                        {step.description}
                                                    </Typography>
                                                )}
                                                {step.formula && (
                                                    <Typography variant="caption" display="block" sx={{ fontFamily: 'monospace', bgcolor: 'grey.200', p: 0.5, borderRadius: 0.5, mt: 0.5 }}>
                                                        {step.formula}
                                                    </Typography>
                                                )}
                                                {step.result !== undefined && (
                                                    <Typography variant="body2" fontWeight="bold" color="success.main">
                                                        = {typeof step.result === 'number' ? step.result.toLocaleString() : step.result}
                                                    </Typography>
                                                )}
                                            </Box>
                                        ))}
                                    </Box>
                                </Box>
                            )}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSelectedPayslip(null)}>إغلاق</Button>
                    {selectedPayslip && (
                        <Button
                            variant="contained"
                            startIcon={<PictureAsPdf />}
                            href={`${API_URL}/payroll-runs/payslip/${selectedPayslip.id}/pdf`}
                            target="_blank"
                        >
                            تحميل PDF
                        </Button>
                    )}
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default PayrollRunDetailsPage;
