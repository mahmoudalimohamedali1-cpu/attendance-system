import { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Button,
    Card,
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
} from '@mui/material';
import { ArrowBack, Visibility, CheckCircle, Download, PictureAsPdf, Email } from '@mui/icons-material';
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

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box>
                    <Button startIcon={<ArrowBack />} onClick={() => navigate('/salary')}>العودة</Button>
                    <Typography variant="h5" fontWeight="bold">
                        مسودة مسير رواتب - {run.period.month} / {run.period.year}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        تم التشغيل بتاريخ {new Date(run.runDate).toLocaleString('ar-SA')}
                    </Typography>
                </Box>
                <Box display="flex" gap={2}>
                    <Button
                        variant="outlined"
                        startIcon={<Download />}
                        href={`${API_URL}/payroll-runs/${id}/excel`}
                        target="_blank"
                    >
                        تصدير المسير (Excel)
                    </Button>
                    <Button
                        variant="outlined"
                        color="secondary"
                        startIcon={<Email />}
                        onClick={handleSendEmails}
                    >
                        إرسال القسائم بالبريد
                    </Button>
                    <Button
                        variant="contained"
                        color="success"
                        startIcon={<CheckCircle />}
                        onClick={handleApprove}
                        disabled={run.status !== 'DRAFT'}
                    >
                        {run.status === 'DRAFT' ? 'اعتماد جميع الرواتب' : 'معتمد'}
                    </Button>
                </Box>
            </Box>

            <Card sx={{ borderRadius: 3 }}>
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
                            {run.payslips.map((payslip) => (
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
            </Card>

            <Dialog open={!!selectedPayslip} onClose={() => setSelectedPayslip(null)} maxWidth="sm" fullWidth>
                <DialogTitle>تفاصيل قسيمة الراتب</DialogTitle>
                <DialogContent dividers>
                    {selectedPayslip && (
                        <Box>
                            <Box display="flex" justifyContent="space-between" mb={2}>
                                <Typography fontWeight="bold">الموظف:</Typography>
                                <Typography>{selectedPayslip.employee.firstName} {selectedPayslip.employee.lastName}</Typography>
                            </Box>
                            <Box display="flex" justifyContent="space-between" mb={2}>
                                <Typography fontWeight="bold">الراتب الأساسي:</Typography>
                                <Typography>{parseFloat(selectedPayslip.baseSalary).toLocaleString()} ريال</Typography>
                            </Box>
                            <Divider sx={{ my: 2 }} />
                            <Typography variant="subtitle2" color="primary" gutterBottom>مكونات الراتب التفصيلية:</Typography>
                            {selectedPayslip.lines.map((line: any) => (
                                <Box key={line.id} display="flex" justifyContent="space-between" mb={1} sx={{ opacity: 0.9 }}>
                                    <Typography variant="body2">{line.component.nameAr}</Typography>
                                    <Typography variant="body2" color={line.component.type === 'EARNING' ? 'success.main' : 'error.main'}>
                                        {line.component.type === 'EARNING' ? '+' : '-'} {parseFloat(line.amount).toLocaleString()} ريال
                                    </Typography>
                                </Box>
                            ))}
                            <Divider sx={{ my: 2 }} />
                            <Box display="flex" justifyContent="space-between" sx={{ bgcolor: 'grey.100', p: 1, borderRadius: 1 }}>
                                <Typography fontWeight="bold">صافي الراتب:</Typography>
                                <Typography fontWeight="bold" color="primary">{parseFloat(selectedPayslip.netSalary).toLocaleString()} ريال</Typography>
                            </Box>
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
