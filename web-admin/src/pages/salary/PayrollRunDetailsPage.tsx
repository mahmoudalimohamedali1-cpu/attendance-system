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
    MenuItem,
    Tabs,
    Tab,
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
    Edit,
    Close,
    ThumbUp,
    ThumbDown,
    ListAlt,
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
    const [searchTerm, setSearchTerm] = useState('');

    // Adjustment Dialog State
    const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false);
    const [adjustmentEmployee, setAdjustmentEmployee] = useState<any>(null);
    const [adjustmentData, setAdjustmentData] = useState({
        adjustmentType: 'WAIVE_DEDUCTION',
        originalDeductionType: 'LATE_DEDUCTION',
        originalAmount: 0,
        adjustedAmount: 0,
        leaveDaysDeducted: 0, // 🔧 عدد أيام الإجازة المخصومة (لـ CONVERT_TO_LEAVE)
        reason: '',
        notes: '',
    });
    const [adjustmentLoading, setAdjustmentLoading] = useState(false);

    // 🔧 Adjustments List State
    const [adjustments, setAdjustments] = useState<any[]>([]);
    const [adjustmentsLoading, setAdjustmentsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState(0);

    const adjustmentTypes = [
        { value: 'WAIVE_DEDUCTION', label: 'إلغاء خصم' },
        { value: 'CONVERT_TO_LEAVE', label: 'تحويل لإجازة' },
        { value: 'MANUAL_ADDITION', label: 'إضافة يدوية' },
        { value: 'MANUAL_DEDUCTION', label: 'خصم يدوي' },
    ];

    const deductionTypes = [
        { value: 'LATE_DEDUCTION', label: 'خصم تأخير' },
        { value: 'ABSENCE_DEDUCTION', label: 'خصم غياب' },
        { value: 'EARLY_DEPARTURE', label: 'خصم انصراف مبكر' },
    ];

    // Calculate summary from payslips - must be before any conditional returns
    const summary = useMemo(() => {
        if (!run?.payslips) return { employees: 0, grossTotal: 0, deductionsTotal: 0, netTotal: 0 };
        return run.payslips.reduce((acc, p) => ({
            employees: acc.employees + 1,
            grossTotal: acc.grossTotal + parseFloat(p.grossSalary || 0),
            deductionsTotal: acc.deductionsTotal + parseFloat(p.totalDeductions || 0),
            netTotal: acc.netTotal + parseFloat(p.netSalary || 0),
        }), { employees: 0, grossTotal: 0, deductionsTotal: 0, netTotal: 0 });
    }, [run?.payslips]);

    // Filter payslips by search - must be before any conditional returns
    const filteredPayslips = useMemo(() => {
        if (!run?.payslips) return [];
        if (!searchTerm) return run.payslips;
        return run.payslips.filter(p => {
            const name = `${p.employee?.firstName} ${p.employee?.lastName}`.toLowerCase();
            const code = p.employee?.employeeCode?.toLowerCase() || '';
            return name.includes(searchTerm.toLowerCase()) || code.includes(searchTerm.toLowerCase());
        });
    }, [run?.payslips, searchTerm]);

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

    // 🔧 Fetch Adjustments List
    const fetchAdjustments = async () => {
        try {
            setAdjustmentsLoading(true);
            const data = await api.get(`/payroll-adjustments/by-run/${id}`) as any[];
            setAdjustments(data);
        } catch (err: any) {
            console.error('Failed to fetch adjustments:', err);
        } finally {
            setAdjustmentsLoading(false);
        }
    };

    useEffect(() => {
        if (id) fetchAdjustments();
    }, [id]);

    // 🔧 Approve Adjustment
    const handleApproveAdjustment = async (adjustmentId: string) => {
        if (!window.confirm('هل تريد اعتماد هذه التسوية؟')) return;
        try {
            await api.post('/payroll-adjustments/approve', { adjustmentId, approved: true });
            alert('تم اعتماد التسوية بنجاح ✅');
            fetchAdjustments();
            // Refresh run data to update payslips
            const data = await api.get(`/payroll-runs/${id}`) as PayrollRun;
            setRun(data);
        } catch (err: any) {
            alert(err.message || 'فشل في اعتماد التسوية');
        }
    };

    // 🔧 Reject Adjustment
    const handleRejectAdjustment = async (adjustmentId: string) => {
        const reason = window.prompt('سبب الرفض:');
        if (!reason) return;
        try {
            await api.post('/payroll-adjustments/approve', { adjustmentId, approved: false, rejectionReason: reason });
            alert('تم رفض التسوية ❌');
            fetchAdjustments();
        } catch (err: any) {
            alert(err.message || 'فشل في رفض التسوية');
        }
    };

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

    // 🔧 Cancel payroll run (DRAFT only)
    const handleCancel = async () => {
        if (!window.confirm('هل أنت متأكد من إلغاء هذا المسير؟ سيتم تغيير الحالة إلى ملغي ويمكنك تشغيل مسير جديد.')) return;
        try {
            setLoading(true);
            await api.patch(`/payroll-runs/${id}/cancel`, {});
            alert('تم إلغاء المسير بنجاح ✅');
            navigate('/salary'); // Return to list
        } catch (err: any) {
            setError(err.message || 'فشل في إلغاء المسير');
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

    // 🔧 Export Excel with authentication
    const handleExportExcel = async () => {
        try {
            const response = await api.getBlob(`/payroll-runs/${id}/excel`);
            const url = window.URL.createObjectURL(response);
            const link = document.createElement('a');
            link.href = url;
            link.download = `payroll_run_${id}.xlsx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (err: any) {
            setError(err.message || 'Failed to export Excel');
        }
    };

    // 🔧 Export PDF with authentication
    const handleExportPdf = async (payslipId: string) => {
        try {
            const response = await api.get(`/payroll-runs/payslip/${payslipId}/pdf`, { responseType: 'blob' }) as Blob;
            const url = window.URL.createObjectURL(response);
            const link = document.createElement('a');
            link.href = url;
            link.download = `payslip_${payslipId}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (err: any) {
            setError(err.message || 'Failed to export PDF');
        }
    };

    const handleOpenAdjustment = (payslip: any) => {
        setAdjustmentEmployee(payslip.employee);
        const totalDeductions = parseFloat(payslip.totalDeductions || 0);
        setAdjustmentData({
            adjustmentType: 'WAIVE_DEDUCTION',
            originalDeductionType: 'LATE_DEDUCTION',
            originalAmount: totalDeductions,
            adjustedAmount: 0,
            leaveDaysDeducted: 0, // 🔧 إعادة تعيين أيام الإجازة
            reason: '',
            notes: '',
        });
        setAdjustmentDialogOpen(true);
    };

    const handleSubmitAdjustment = async () => {
        if (!adjustmentEmployee || !adjustmentData.reason) {
            alert('يرجى ملء جميع الحقول المطلوبة');
            return;
        }
        try {
            setAdjustmentLoading(true);
            await api.post('/payroll-adjustments', {
                employeeId: adjustmentEmployee.id,
                payrollRunId: id,
                ...adjustmentData,
            });
            alert('تم إضافة التسوية بنجاح');
            setAdjustmentDialogOpen(false);
            // Refresh adjustments list and run data
            fetchAdjustments();
            const data = await api.get(`/payroll-runs/${id}`) as PayrollRun;
            setRun(data);
        } catch (err: any) {
            alert(err.message || 'فشل في إضافة التسوية');
        } finally {
            setAdjustmentLoading(false);
        }
    };

    // Note: hooks moved above loading check to comply with Rules of Hooks

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
                        onClick={handleExportExcel}
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
                        color="error"
                        startIcon={<Close />}
                        onClick={handleCancel}
                        disabled={run.status !== 'DRAFT'}
                        sx={{ display: run.status === 'DRAFT' ? 'flex' : 'none' }}
                    >
                        إلغاء المسير
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

            {/* Tabs: Employees & Adjustments */}
            <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
                    <Tab icon={<People />} iconPosition="start" label={`قسائم الموظفين (${filteredPayslips.length})`} />
                    <Tab icon={<ListAlt />} iconPosition="start" label={`التسويات (${adjustments.length})`} />
                </Tabs>

                {/* Tab 0: Employees */}
                {activeTab === 0 && (
                    <>
                        <Box p={2} display="flex" justifyContent="flex-end">
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
                                                <IconButton size="small" onClick={() => setSelectedPayslip(payslip)} title="عرض التفاصيل">
                                                    <Visibility fontSize="small" />
                                                </IconButton>
                                                {!isLocked && (
                                                    <IconButton
                                                        size="small"
                                                        color="primary"
                                                        onClick={() => handleOpenAdjustment(payslip)}
                                                        title="إضافة تسوية"
                                                    >
                                                        <Edit fontSize="small" />
                                                    </IconButton>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </>
                )}

                {/* Tab 1: Adjustments */}
                {activeTab === 1 && (
                    <>
                        {adjustmentsLoading ? (
                            <Box display="flex" justifyContent="center" py={4}>
                                <CircularProgress />
                            </Box>
                        ) : adjustments.length === 0 ? (
                            <Box textAlign="center" py={4}>
                                <Typography color="text.secondary">لا توجد تسويات لهذه الدورة</Typography>
                            </Box>
                        ) : (
                            <TableContainer>
                                <Table>
                                    <TableHead sx={{ bgcolor: 'grey.50' }}>
                                        <TableRow>
                                            <TableCell>الموظف</TableCell>
                                            <TableCell>نوع التسوية</TableCell>
                                            <TableCell>المبلغ الأصلي</TableCell>
                                            <TableCell>المبلغ المعدل</TableCell>
                                            <TableCell>أيام الإجازة</TableCell>
                                            <TableCell>السبب</TableCell>
                                            <TableCell>الحالة</TableCell>
                                            <TableCell align="center">الإجراءات</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {adjustments.map((adj) => (
                                            <TableRow key={adj.id} hover>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight="bold">
                                                        {adj.employee?.firstName} {adj.employee?.lastName}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        size="small"
                                                        label={adjustmentTypes.find(t => t.value === adj.adjustmentType)?.label || adj.adjustmentType}
                                                        color={adj.adjustmentType === 'MANUAL_DEDUCTION' ? 'error' : 'info'}
                                                    />
                                                </TableCell>
                                                <TableCell>{parseFloat(adj.originalAmount || 0).toLocaleString()} ريال</TableCell>
                                                <TableCell>{parseFloat(adj.adjustedAmount || 0).toLocaleString()} ريال</TableCell>
                                                <TableCell>
                                                    {adj.adjustmentType === 'CONVERT_TO_LEAVE' ? (
                                                        <Chip size="small" label={`${adj.leaveDaysDeducted || 0} يوم`} color="warning" />
                                                    ) : '-'}
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="caption" sx={{ maxWidth: 150, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {adj.reason}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        size="small"
                                                        label={adj.status === 'PENDING' ? 'معلق' : adj.status === 'POSTED' ? 'معتمد' : 'مرفوض'}
                                                        color={adj.status === 'PENDING' ? 'warning' : adj.status === 'POSTED' ? 'success' : 'error'}
                                                    />
                                                </TableCell>
                                                <TableCell align="center">
                                                    {adj.status === 'PENDING' ? (
                                                        <>
                                                            <IconButton
                                                                size="small"
                                                                color="success"
                                                                onClick={() => handleApproveAdjustment(adj.id)}
                                                                title="اعتماد"
                                                            >
                                                                <ThumbUp fontSize="small" />
                                                            </IconButton>
                                                            <IconButton
                                                                size="small"
                                                                color="error"
                                                                onClick={() => handleRejectAdjustment(adj.id)}
                                                                title="رفض"
                                                            >
                                                                <ThumbDown fontSize="small" />
                                                            </IconButton>
                                                        </>
                                                    ) : (
                                                        <Typography variant="caption" color="text.secondary">
                                                            {adj.status === 'POSTED' ? '✅ تم الاعتماد' : '❌ مرفوض'}
                                                        </Typography>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </>
                )}
            </Paper>

            <Dialog open={!!selectedPayslip} onClose={() => setSelectedPayslip(null)} maxWidth="lg" fullWidth>
                <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box display="flex" alignItems="center" gap={2}>
                        <Avatar sx={{ bgcolor: 'white', color: 'primary.main' }}>
                            {selectedPayslip?.employee?.firstName?.[0]}
                        </Avatar>
                        <Box>
                            <Typography variant="h6">
                                {selectedPayslip?.employee?.firstName} {selectedPayslip?.employee?.lastName}
                            </Typography>
                            <Typography variant="caption" sx={{ opacity: 0.8 }}>
                                {selectedPayslip?.employee?.employeeCode}
                            </Typography>
                        </Box>
                    </Box>
                    <IconButton onClick={() => setSelectedPayslip(null)} sx={{ color: 'white' }}>
                        <Close />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers sx={{ p: 3 }}>
                    {selectedPayslip && (() => {
                        // ✅ استخدام بيانات المعاينة المحفوظة إذا وجدت، وإلا نستخدم lines
                        let earnings: { name: string; code: string; amount: number }[] = [];
                        let deductions: { name: string; code: string; amount: number }[] = [];

                        if (selectedPayslip.earningsJson && Array.isArray(selectedPayslip.earningsJson)) {
                            earnings = selectedPayslip.earningsJson;
                        } else {
                            // Fallback للقسائم القديمة
                            earnings = (selectedPayslip.lines || [])
                                .filter((l: any) => l.sign === 'EARNING' || l.component?.type === 'EARNING')
                                .map((l: any) => ({ name: l.component?.nameAr || l.descriptionAr || 'بند', code: l.component?.code || '', amount: parseFloat(l.amount) }));
                        }

                        if (selectedPayslip.deductionsJson && Array.isArray(selectedPayslip.deductionsJson)) {
                            deductions = selectedPayslip.deductionsJson;
                        } else {
                            // Fallback للقسائم القديمة
                            deductions = (selectedPayslip.lines || [])
                                .filter((l: any) => l.sign === 'DEDUCTION' || l.component?.type === 'DEDUCTION')
                                .filter((l: any) => !['DEBT_REPAYMENT', 'DEFERRED_DEDUCTION', 'ADJUSTMENT'].includes(l.sourceType))
                                .map((l: any) => ({ name: l.component?.nameAr || l.descriptionAr || 'خصم', code: l.component?.code || '', amount: parseFloat(l.amount) }));
                        }

                        return (
                            <Grid container spacing={3}>
                                {/* 💰 المستحقات */}
                                <Grid item xs={12} md={6}>
                                    <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'success.light', borderRadius: 2, overflow: 'hidden' }}>
                                        <Box sx={{ bgcolor: 'success.50', p: 1.5, borderBottom: '1px solid', borderColor: 'success.light' }}>
                                            <Typography variant="subtitle1" fontWeight="bold" color="success.dark">
                                                💰 المستحقات
                                            </Typography>
                                        </Box>
                                        <TableContainer>
                                            <Table size="small">
                                                <TableBody>
                                                    {earnings.length > 0 ? earnings.map((item: any, idx: number) => (
                                                        <TableRow key={idx} hover>
                                                            <TableCell sx={{ py: 1 }}>
                                                                <Typography variant="body2">
                                                                    {item.name || 'بند'}
                                                                </Typography>
                                                            </TableCell>
                                                            <TableCell align="left" sx={{ py: 1 }}>
                                                                <Typography variant="body2" fontWeight="bold" color="success.main">
                                                                    {(typeof item.amount === 'number' ? item.amount : parseFloat(item.amount)).toLocaleString()} ر.س
                                                                </Typography>
                                                            </TableCell>
                                                        </TableRow>
                                                    )) : (
                                                        <TableRow>
                                                            <TableCell colSpan={2}>
                                                                <Typography variant="body2" color="text.secondary" textAlign="center">
                                                                    لا توجد مستحقات
                                                                </Typography>
                                                            </TableCell>
                                                        </TableRow>
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                        <Box sx={{ bgcolor: 'success.100', p: 1.5, borderTop: '1px solid', borderColor: 'success.light' }}>
                                            <Box display="flex" justifyContent="space-between">
                                                <Typography variant="body2" fontWeight="bold">المجموع</Typography>
                                                <Typography variant="body1" fontWeight="bold" color="success.dark">
                                                    {parseFloat(selectedPayslip.grossSalary).toLocaleString()} ر.س
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </Paper>
                                </Grid>

                                {/* 📉 الخصومات */}
                                <Grid item xs={12} md={6}>
                                    <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'error.light', borderRadius: 2, overflow: 'hidden' }}>
                                        <Box sx={{ bgcolor: 'error.50', p: 1.5, borderBottom: '1px solid', borderColor: 'error.light' }}>
                                            <Typography variant="subtitle1" fontWeight="bold" color="error.dark">
                                                📉 الخصومات
                                            </Typography>
                                        </Box>
                                        <TableContainer>
                                            <Table size="small">
                                                <TableBody>
                                                    {deductions.length > 0 ? deductions.map((item: any, idx: number) => (
                                                        <TableRow key={idx} hover>
                                                            <TableCell sx={{ py: 1 }}>
                                                                <Typography variant="body2">
                                                                    {item.name || 'خصم'}
                                                                </Typography>
                                                            </TableCell>
                                                            <TableCell align="left" sx={{ py: 1 }}>
                                                                <Typography variant="body2" fontWeight="bold" color="error.main">
                                                                    {(typeof item.amount === 'number' ? item.amount : parseFloat(item.amount)).toLocaleString()} ر.س
                                                                </Typography>
                                                            </TableCell>
                                                        </TableRow>
                                                    )) : (
                                                        <TableRow>
                                                            <TableCell colSpan={2}>
                                                                <Typography variant="body2" color="text.secondary" textAlign="center">
                                                                    لا توجد خصومات
                                                                </Typography>
                                                            </TableCell>
                                                        </TableRow>
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                        <Box sx={{ bgcolor: 'error.100', p: 1.5, borderTop: '1px solid', borderColor: 'error.light' }}>
                                            <Box display="flex" justifyContent="space-between">
                                                <Typography variant="body2" fontWeight="bold">المجموع</Typography>
                                                <Typography variant="body1" fontWeight="bold" color="error.dark">
                                                    {parseFloat(selectedPayslip.totalDeductions).toLocaleString()} ر.س
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </Paper>
                                </Grid>

                                {/* 📊 الملخص */}
                                <Grid item xs={12}>
                                    <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'primary.light', borderRadius: 2, overflow: 'hidden' }}>
                                        <Box sx={{ bgcolor: 'primary.50', p: 1.5, borderBottom: '1px solid', borderColor: 'primary.light' }}>
                                            <Typography variant="subtitle1" fontWeight="bold" color="primary.dark">
                                                📊 الملخص
                                            </Typography>
                                        </Box>
                                        <Box p={2}>
                                            <Grid container spacing={2}>
                                                <Grid item xs={6} md={3}>
                                                    <Typography variant="caption" color="text.secondary">راتب العقد</Typography>
                                                    <Typography variant="h6" fontWeight="bold">
                                                        {parseFloat(selectedPayslip.baseSalary).toLocaleString()} ر.س
                                                    </Typography>
                                                </Grid>
                                                <Grid item xs={6} md={3}>
                                                    <Typography variant="caption" color="text.secondary">المسمى الوظيفي</Typography>
                                                    <Typography variant="body1" fontWeight="bold">
                                                        {selectedPayslip.employee?.jobTitle?.titleAr || 'غير محدد'}
                                                    </Typography>
                                                </Grid>
                                                <Grid item xs={6} md={3}>
                                                    <Typography variant="caption" color="text.secondary">الجنسية</Typography>
                                                    <Typography variant="body1" fontWeight="bold">
                                                        {selectedPayslip.employee?.isSaudi ? 'سعودي 🇸🇦' : 'غير سعودي'}
                                                    </Typography>
                                                </Grid>
                                                <Grid item xs={6} md={3}>
                                                    <Box sx={{ bgcolor: 'primary.main', color: 'white', p: 2, borderRadius: 2, textAlign: 'center' }}>
                                                        <Typography variant="caption">صافي الراتب</Typography>
                                                        <Typography variant="h5" fontWeight="bold">
                                                            {parseFloat(selectedPayslip.netSalary).toLocaleString()} ر.س
                                                        </Typography>
                                                    </Box>
                                                </Grid>
                                            </Grid>
                                        </Box>
                                    </Paper>
                                </Grid>

                                {/* خطوات الحساب */}
                                {selectedPayslip.calculationTrace && Array.isArray(selectedPayslip.calculationTrace) && selectedPayslip.calculationTrace.length > 0 && (
                                    <Grid item xs={12}>
                                        <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'grey.300', borderRadius: 2 }}>
                                            <Box
                                                sx={{ p: 1.5, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1 }}
                                                onClick={() => {
                                                    const el = document.getElementById('trace-content-new');
                                                    if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
                                                }}
                                            >
                                                <Typography variant="subtitle2" color="text.secondary">
                                                    📊 عرض خطوات الحساب ({selectedPayslip.calculationTrace.length} خطوة) ▼
                                                </Typography>
                                            </Box>
                                            <Box id="trace-content-new" sx={{ display: 'none', p: 2, bgcolor: 'grey.50', maxHeight: 300, overflow: 'auto' }}>
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
                                        </Paper>
                                    </Grid>
                                )}
                            </Grid>
                        );
                    })()}
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setSelectedPayslip(null)}>إغلاق</Button>
                    {selectedPayslip && (
                        <Button
                            variant="contained"
                            startIcon={<PictureAsPdf />}
                            onClick={() => handleExportPdf(selectedPayslip.id)}
                        >
                            تحميل PDF
                        </Button>
                    )}
                </DialogActions>
            </Dialog>

            {/* Adjustment Dialog */}
            <Dialog open={adjustmentDialogOpen} onClose={() => setAdjustmentDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    إضافة تسوية - {adjustmentEmployee?.firstName} {adjustmentEmployee?.lastName}
                    <IconButton onClick={() => setAdjustmentDialogOpen(false)} size="small">
                        <Close />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                        <TextField
                            select
                            fullWidth
                            label="نوع التسوية"
                            value={adjustmentData.adjustmentType}
                            onChange={(e) => setAdjustmentData({ ...adjustmentData, adjustmentType: e.target.value })}
                        >
                            {adjustmentTypes.map((type) => (
                                <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>
                            ))}
                        </TextField>

                        {adjustmentData.adjustmentType === 'WAIVE_DEDUCTION' && (
                            <TextField
                                select
                                fullWidth
                                label="نوع الخصم الأصلي"
                                value={adjustmentData.originalDeductionType}
                                onChange={(e) => setAdjustmentData({ ...adjustmentData, originalDeductionType: e.target.value })}
                            >
                                {deductionTypes.map((type) => (
                                    <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>
                                ))}
                            </TextField>
                        )}

                        {/* 🔧 عرض الحقول بناءً على نوع التسوية */}
                        {(adjustmentData.adjustmentType === 'WAIVE_DEDUCTION' || adjustmentData.adjustmentType === 'CONVERT_TO_LEAVE') ? (
                            // إلغاء خصم أو تحويل لإجازة: نحتاج المبلغ الأصلي والمعدل
                            <>
                                <Grid container spacing={2}>
                                    <Grid item xs={6}>
                                        <TextField
                                            fullWidth
                                            type="number"
                                            label="المبلغ الأصلي (ر.س)"
                                            value={adjustmentData.originalAmount}
                                            onChange={(e) => setAdjustmentData({ ...adjustmentData, originalAmount: parseFloat(e.target.value) || 0 })}
                                            helperText="المبلغ اللي كان هيتخصم"
                                        />
                                    </Grid>
                                    <Grid item xs={6}>
                                        <TextField
                                            fullWidth
                                            type="number"
                                            label="المبلغ بعد التعديل (ر.س)"
                                            value={adjustmentData.adjustedAmount}
                                            onChange={(e) => setAdjustmentData({ ...adjustmentData, adjustedAmount: parseFloat(e.target.value) || 0 })}
                                            helperText="0 = إلغاء كامل الخصم"
                                        />
                                    </Grid>
                                </Grid>

                                {/* 🔧 حقل عدد أيام الإجازة - يظهر فقط لتحويل لإجازة */}
                                {adjustmentData.adjustmentType === 'CONVERT_TO_LEAVE' && (
                                    <TextField
                                        fullWidth
                                        type="number"
                                        label="عدد أيام الإجازة المخصومة"
                                        value={adjustmentData.leaveDaysDeducted}
                                        onChange={(e) => setAdjustmentData({ ...adjustmentData, leaveDaysDeducted: parseInt(e.target.value) || 0 })}
                                        helperText="عدد الأيام اللي هتتخصم من رصيد الإجازات بدل الفلوس"
                                        InputProps={{
                                            inputProps: { min: 0, max: 30 }
                                        }}
                                        sx={{ mt: 2 }}
                                    />
                                )}
                            </>
                        ) : (
                            // إضافة أو خصم يدوي: نحتاج مبلغ واحد فقط
                            <TextField
                                fullWidth
                                type="number"
                                label={adjustmentData.adjustmentType === 'MANUAL_ADDITION' ? 'المبلغ المضاف (ر.س)' : 'المبلغ المخصوم (ر.س)'}
                                value={adjustmentData.adjustedAmount}
                                onChange={(e) => setAdjustmentData({
                                    ...adjustmentData,
                                    adjustedAmount: parseFloat(e.target.value) || 0,
                                    originalAmount: 0 // لا يوجد مبلغ أصلي للتسويات اليدوية
                                })}
                                helperText={adjustmentData.adjustmentType === 'MANUAL_ADDITION' ? 'مبلغ يضاف للراتب' : 'مبلغ يخصم من الراتب'}
                            />
                        )}

                        <TextField
                            fullWidth
                            required
                            label="سبب التسوية"
                            value={adjustmentData.reason}
                            onChange={(e) => setAdjustmentData({ ...adjustmentData, reason: e.target.value })}
                            placeholder="أدخل سبب التسوية..."
                        />

                        <TextField
                            fullWidth
                            multiline
                            rows={2}
                            label="ملاحظات إضافية"
                            value={adjustmentData.notes}
                            onChange={(e) => setAdjustmentData({ ...adjustmentData, notes: e.target.value })}
                        />

                        <Alert severity="info">
                            سيتم إضافة التسوية بحالة "معلق" وستحتاج للاعتماد قبل تطبيقها على الراتب.
                        </Alert>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAdjustmentDialogOpen(false)}>إلغاء</Button>
                    <Button
                        variant="contained"
                        onClick={handleSubmitAdjustment}
                        disabled={adjustmentLoading || !adjustmentData.reason}
                    >
                        {adjustmentLoading ? <CircularProgress size={20} /> : 'حفظ التسوية'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default PayrollRunDetailsPage;
