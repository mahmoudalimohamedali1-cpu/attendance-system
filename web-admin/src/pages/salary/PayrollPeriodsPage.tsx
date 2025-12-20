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
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Chip,
    Grid,
    Alert,
} from '@mui/material';
import {
    Add as AddIcon,
    PlayArrow,
    Visibility,
    EventNote,
} from '@mui/icons-material';
import { api } from '@/services/api.service';
import { useNavigate } from 'react-router-dom';

interface PayrollPeriod {
    id: string;
    month: number;
    year: number;
    startDate: string;
    endDate: string;
    status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'PAID' | 'CANCELLED';
    _count?: { payslips: number };
}

export const PayrollPeriodsPage = () => {
    const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [open, setOpen] = useState(false);
    const [formData, setFormData] = useState({
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        startDate: '',
        endDate: '',
    });
    const navigate = useNavigate();

    const fetchPeriods = async () => {
        try {
            setLoading(true);
            const data = await api.get('/payroll-periods') as PayrollPeriod[];
            setPeriods(data);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch periods');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPeriods();
    }, []);

    const handleOpen = () => {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

        setFormData({
            month: now.getMonth() + 1,
            year: now.getFullYear(),
            startDate: firstDay,
            endDate: lastDay,
        });
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/payroll-periods', formData);
            handleClose();
            fetchPeriods();
        } catch (err: any) {
            setError(err.message || 'Something went wrong');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'DRAFT': return 'default';
            case 'PENDING': return 'warning';
            case 'APPROVED': return 'info';
            case 'PAID': return 'success';
            case 'CANCELLED': return 'error';
            default: return 'default';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'DRAFT': return 'مسودة';
            case 'PENDING': return 'قيد المراجعة';
            case 'APPROVED': return 'معتمد';
            case 'PAID': return 'تم الصرف';
            case 'CANCELLED': return 'ملغى';
            default: return status;
        }
    };

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box>
                    <Typography variant="h5" fontWeight="bold">فترات مسيرات الرواتب</Typography>
                    <Typography variant="body2" color="text.secondary">
                        فتح وإدارة فترات شهرية لاحتساب وصرف الرواتب
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleOpen}
                    sx={{ borderRadius: 2 }}
                >
                    فتح فترة جديدة
                </Button>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

            <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                <TableContainer>
                    <Table>
                        <TableHead sx={{ bgcolor: 'grey.50' }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold' }}>الفترة</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>من تاريخ</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>إلى تاريخ</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>عدد المسودات</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>الحالة</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }} align="center">الإجراءات</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {periods.map((period) => (
                                <TableRow key={period.id} hover>
                                    <TableCell>
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <EventNote color="primary" sx={{ fontSize: 20 }} />
                                            <Typography fontWeight="bold">{period.month} / {period.year}</Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell>{new Date(period.startDate).toLocaleDateString('ar-SA')}</TableCell>
                                    <TableCell>{new Date(period.endDate).toLocaleDateString('ar-SA')}</TableCell>
                                    <TableCell>{period._count?.payslips || 0}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={getStatusLabel(period.status)}
                                            size="small"
                                            color={getStatusColor(period.status) as any}
                                        />
                                    </TableCell>
                                    <TableCell align="center">
                                        <Button
                                            size="small"
                                            startIcon={<PlayArrow />}
                                            onClick={() => navigate(`/salary/runs/new?periodId=${period.id}`)}
                                            disabled={period.status === 'PAID'}
                                        >
                                            تشغيل
                                        </Button>
                                        <IconButton onClick={() => navigate(`/salary/periods/${period.id}`)} size="small">
                                            <Visibility fontSize="small" />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {periods.length === 0 && !loading && (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                                        <EventNote sx={{ fontSize: 48, color: 'grey.300', mb: 1 }} />
                                        <Typography color="text.secondary">لا يوجد فترات رواتب مفتوحة بعد</Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>

            <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
                <DialogTitle>فتح فترة رواتب جديدة</DialogTitle>
                <DialogContent dividers>
                    <Grid container spacing={2} sx={{ mt: 0 }}>
                        <Grid item xs={6}>
                            <TextField
                                fullWidth
                                label="الشهر"
                                type="number"
                                value={formData.month}
                                onChange={(e) => setFormData({ ...formData, month: Number(e.target.value) })}
                                InputProps={{ inputProps: { min: 1, max: 12 } }}
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                fullWidth
                                label="السنة"
                                type="number"
                                value={formData.year}
                                onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="تاريخ البداية"
                                type="date"
                                value={formData.startDate}
                                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="تاريخ النهاية"
                                type="date"
                                value={formData.endDate}
                                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={handleClose} color="inherit">إلغاء</Button>
                    <Button onClick={handleSubmit} variant="contained" color="primary">إنشاء</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default PayrollPeriodsPage;
