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
    Chip,
    IconButton,
    Tooltip,
    Grid,
} from '@mui/material';
import {
    Add as AddIcon,
    Lock as LockIcon,
    LockOpen as OpenIcon,
    CalendarMonth as PeriodIcon,
} from '@mui/icons-material';
import { payrollPeriodsService, PayrollPeriod, CreatePayrollPeriodDto, periodStatusLabels, periodStatusColors } from '@/services/payroll-periods.service';

export default function PayrollPeriodsPage() {
    const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [statusDialogOpen, setStatusDialogOpen] = useState(false);
    const [selectedPeriod, setSelectedPeriod] = useState<PayrollPeriod | null>(null);
    const [newStatus, setNewStatus] = useState('');

    const [formData, setFormData] = useState<CreatePayrollPeriodDto>({
        name: '',
        startDate: '',
        endDate: '',
        paymentDate: '',
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await payrollPeriodsService.getAll();
            setPeriods(data);
            setError(null);
        } catch (err: any) {
            setError(err.response?.data?.message || 'حدث خطأ');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = () => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        setFormData({
            name: `رواتب ${now.toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' })}`,
            startDate: startOfMonth.toISOString().slice(0, 10),
            endDate: endOfMonth.toISOString().slice(0, 10),
            paymentDate: '',
        });
        setDialogOpen(true);
    };

    const handleSubmit = async () => {
        try {
            await payrollPeriodsService.create(formData);
            setDialogOpen(false);
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.message || 'حدث خطأ');
        }
    };

    const handleOpenStatusDialog = (period: PayrollPeriod) => {
        setSelectedPeriod(period);
        setNewStatus(period.status);
        setStatusDialogOpen(true);
    };

    const handleUpdateStatus = async () => {
        if (!selectedPeriod) return;
        try {
            await payrollPeriodsService.updateStatus(selectedPeriod.id, newStatus);
            setStatusDialogOpen(false);
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.message || 'حدث خطأ');
        }
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('ar-SA');
    };

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
                    <PeriodIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    فترات الرواتب
                </Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenDialog}>
                    فترة جديدة
                </Button>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow sx={{ bgcolor: 'grey.100' }}>
                            <TableCell>الاسم</TableCell>
                            <TableCell>من</TableCell>
                            <TableCell>إلى</TableCell>
                            <TableCell>تاريخ الصرف</TableCell>
                            <TableCell align="center">الحالة</TableCell>
                            <TableCell align="center">الإجراءات</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {periods.map((p) => (
                            <TableRow key={p.id} hover>
                                <TableCell>{p.name}</TableCell>
                                <TableCell>{formatDate(p.startDate)}</TableCell>
                                <TableCell>{formatDate(p.endDate)}</TableCell>
                                <TableCell>{formatDate(p.paymentDate)}</TableCell>
                                <TableCell align="center">
                                    <Chip
                                        label={periodStatusLabels[p.status]}
                                        color={periodStatusColors[p.status]}
                                        size="small"
                                    />
                                </TableCell>
                                <TableCell align="center">
                                    <Tooltip title="تغيير الحالة">
                                        <IconButton size="small" onClick={() => handleOpenStatusDialog(p)}>
                                            {p.status === 'LOCKED' ? <LockIcon /> : <OpenIcon />}
                                        </IconButton>
                                    </Tooltip>
                                </TableCell>
                            </TableRow>
                        ))}
                        {periods.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} align="center">
                                    لا توجد فترات رواتب
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Create Dialog */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>فترة رواتب جديدة</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="اسم الفترة"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                type="date"
                                label="من تاريخ"
                                value={formData.startDate}
                                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                type="date"
                                label="إلى تاريخ"
                                value={formData.endDate}
                                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                type="date"
                                label="تاريخ الصرف (اختياري)"
                                value={formData.paymentDate}
                                onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
                    <Button variant="contained" onClick={handleSubmit} disabled={!formData.name}>
                        إنشاء
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Status Dialog */}
            <Dialog open={statusDialogOpen} onClose={() => setStatusDialogOpen(false)}>
                <DialogTitle>تغيير حالة الفترة</DialogTitle>
                <DialogContent>
                    <TextField
                        select
                        fullWidth
                        label="الحالة"
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                        sx={{ mt: 2 }}
                    >
                        <MenuItem value="DRAFT">مسودة</MenuItem>
                        <MenuItem value="OPEN">مفتوحة</MenuItem>
                        <MenuItem value="CLOSED">مغلقة</MenuItem>
                        <MenuItem value="LOCKED">مقفلة</MenuItem>
                    </TextField>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setStatusDialogOpen(false)}>إلغاء</Button>
                    <Button variant="contained" onClick={handleUpdateStatus}>تحديث</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
