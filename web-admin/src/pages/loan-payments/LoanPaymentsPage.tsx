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
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    MenuItem,
    Alert,
    CircularProgress,
    LinearProgress,
    Card,
    CardContent,
    Grid,
} from '@mui/material';
import {
    Add as AddIcon,
    Payment as PaymentIcon,
    Person as PersonIcon,
} from '@mui/icons-material';
import { loanPaymentsService, ActiveLoan, CreateLoanPaymentDto } from '@/services/loan-payments.service';

export default function LoanPaymentsPage() {
    const [loans, setLoans] = useState<ActiveLoan[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [formData, setFormData] = useState<CreateLoanPaymentDto>({
        advanceId: '',
        amount: 0,
        paymentDate: new Date().toISOString().slice(0, 10),
        note: '',
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await loanPaymentsService.getActiveLoans();
            setLoans(data);
            setError(null);
        } catch (err: any) {
            setError(err.response?.data?.message || 'حدث خطأ');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (loan?: ActiveLoan) => {
        setFormData({
            advanceId: loan?.id || '',
            amount: 0,
            paymentDate: new Date().toISOString().slice(0, 10),
            note: '',
        });
        setDialogOpen(true);
    };

    const handleSubmit = async () => {
        try {
            await loanPaymentsService.create(formData);
            setDialogOpen(false);
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.message || 'حدث خطأ');
        }
    };

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(amount);

    const totalLoans = loans.reduce((sum, l) => sum + l.amount, 0);
    const totalPaid = loans.reduce((sum, l) => sum + l.totalPaid, 0);
    const totalRemaining = loans.reduce((sum, l) => sum + l.remaining, 0);

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" p={4}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box p={3}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h5" fontWeight="bold">
                    <PaymentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    أقساط السلف
                </Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
                    تسجيل دفعة
                </Button>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {/* Stats */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={4}>
                    <Card>
                        <CardContent>
                            <Typography color="text.secondary" variant="caption">إجمالي السلف</Typography>
                            <Typography variant="h5">{formatCurrency(totalLoans)}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                    <Card sx={{ bgcolor: 'success.light' }}>
                        <CardContent>
                            <Typography color="text.secondary" variant="caption">المسدد</Typography>
                            <Typography variant="h5">{formatCurrency(totalPaid)}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                    <Card sx={{ bgcolor: 'warning.light' }}>
                        <CardContent>
                            <Typography color="text.secondary" variant="caption">المتبقي</Typography>
                            <Typography variant="h5">{formatCurrency(totalRemaining)}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Loans Table */}
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow sx={{ bgcolor: 'grey.100' }}>
                            <TableCell>الموظف</TableCell>
                            <TableCell>مبلغ السلفة</TableCell>
                            <TableCell>المسدد</TableCell>
                            <TableCell>المتبقي</TableCell>
                            <TableCell>نسبة السداد</TableCell>
                            <TableCell align="center">الإجراءات</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loans.map((loan) => {
                            const progress = (loan.totalPaid / loan.amount) * 100;
                            return (
                                <TableRow key={loan.id} hover>
                                    <TableCell>
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <PersonIcon color="action" />
                                            {loan.user.firstName} {loan.user.lastName}
                                        </Box>
                                        <Typography variant="caption" color="text.secondary">
                                            {loan.user.employeeCode}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>{formatCurrency(loan.amount)}</TableCell>
                                    <TableCell sx={{ color: 'success.main' }}>{formatCurrency(loan.totalPaid)}</TableCell>
                                    <TableCell sx={{ color: 'warning.main' }}>{formatCurrency(loan.remaining)}</TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <LinearProgress
                                                variant="determinate"
                                                value={progress}
                                                sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                                                color={progress >= 100 ? 'success' : 'primary'}
                                            />
                                            <Typography variant="body2">{progress.toFixed(0)}%</Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell align="center">
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            onClick={() => handleOpenDialog(loan)}
                                            disabled={loan.remaining <= 0}
                                        >
                                            سداد
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {loans.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} align="center">
                                    لا توجد سلف نشطة
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Payment Dialog */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>تسجيل دفعة سداد</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12}>
                            <TextField
                                select
                                fullWidth
                                label="السلفة"
                                value={formData.advanceId}
                                onChange={(e) => setFormData({ ...formData, advanceId: e.target.value })}
                            >
                                {loans.filter(l => l.remaining > 0).map((loan) => (
                                    <MenuItem key={loan.id} value={loan.id}>
                                        {loan.user.firstName} {loan.user.lastName} - متبقي: {formatCurrency(loan.remaining)}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                type="number"
                                label="المبلغ (ريال)"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                type="date"
                                label="تاريخ الدفعة"
                                value={formData.paymentDate}
                                onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="ملاحظات"
                                value={formData.note}
                                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
                    <Button
                        variant="contained"
                        onClick={handleSubmit}
                        disabled={!formData.advanceId || formData.amount <= 0}
                    >
                        تسجيل
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
