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
    MenuItem,
    Tabs,
    Tab,
    Divider,
} from '@mui/material';
import {
    Add as AddIcon,
    PlayArrow,
    Visibility,
    EventNote,
    Lock,
    LockOpen,
    Receipt,
} from '@mui/icons-material';
import { api } from '@/services/api.service';
import { useNavigate } from 'react-router-dom';

interface PayrollPeriod {
    id: string;
    month: number;
    year: number;
    startDate: string;
    endDate: string;
    frequency: 'WEEKLY' | 'BI_WEEKLY' | 'MONTHLY' | 'OTHER';
    status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'PAID' | 'CANCELLED';
    _count?: { payslips: number };
}

interface PayrollRun {
    id: string;
    runDate: string;
    status: string;
    lockedAt: string | null;
    isAdjustment: boolean;
    period: { month: number; year: number };
    _count?: { payslips: number };
}

export const PayrollPeriodsPage = () => {
    const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
    const [runs, setRuns] = useState<PayrollRun[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [open, setOpen] = useState(false);
    const [activeTab, setActiveTab] = useState(0);
    const [formData, setFormData] = useState({
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        startDate: '',
        endDate: '',
        frequency: 'MONTHLY',
    });
    const navigate = useNavigate();

    const fetchPeriods = async () => {
        try {
            setLoading(true);
            const [periodsData, runsData] = await Promise.all([
                api.get('/payroll-periods') as Promise<PayrollPeriod[]>,
                api.get('/payroll-runs') as Promise<PayrollRun[]>,
            ]);
            setPeriods(periodsData);
            setRuns(runsData);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch data');
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
            frequency: 'MONTHLY',
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

    const getFrequencyLabel = (freq: string) => {
        switch (freq) {
            case 'WEEKLY': return 'أسبوعي';
            case 'BI_WEEKLY': return 'كل أسبوعين';
            case 'MONTHLY': return 'شهري';
            default: return freq;
        }
    };

    const getRunStatusLabel = (status: string) => {
        switch (status) {
            case 'DRAFT': return 'مسودة';
            case 'CALCULATED': return 'تم الحساب';
            case 'APPROVED': return 'معتمد';
            case 'LOCKED': return 'مقفل 🔒';
            case 'PAID': return 'تم الصرف ✅';
            default: return status;
        }
    };

    const getRunStatusColor = (status: string) => {
        switch (status) {
            case 'DRAFT': return 'default';
            case 'CALCULATED': return 'info';
            case 'APPROVED': return 'success';
            case 'LOCKED': return 'success';
            case 'PAID': return 'success';
            default: return 'default';
        }
    };

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box>
                    <Typography variant="h5" fontWeight="bold">فترات ومسيرات الرواتب</Typography>
                    <Typography variant="body2" color="text.secondary">
                        فتح وإدارة فترات شهرية ومسيرات لاحتساب وصرف الرواتب
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

            {/* Tabs for Periods vs Runs */}
            <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2 }}>
                <Tab icon={<EventNote />} iconPosition="start" label="فترات الرواتب" />
                <Tab icon={<Receipt />} iconPosition="start" label={`المسيرات (${runs.length})`} />
            </Tabs>

            {activeTab === 0 && (

                <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                    <TableContainer>
                        <Table>
                            <TableHead sx={{ bgcolor: 'grey.50' }}>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 'bold' }}>الفترة</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>التكرار</TableCell>
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
                                        <TableCell>
                                            <Typography variant="body2">{getFrequencyLabel(period.frequency)}</Typography>
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
                                                onClick={() => navigate(`/salary/wizard?periodId=${period.id}`)}
                                                disabled={period.status === 'PAID'}
                                            >
                                                تشغيل
                                            </Button>
                                            <IconButton
                                                onClick={() => navigate(`/payslips?periodId=${period.id}`)}
                                                size="small"
                                                title="عرض القسائم"
                                            >
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
            )}

            {/* Payroll Runs Tab */}
            {activeTab === 1 && (
                <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                    <TableContainer>
                        <Table>
                            <TableHead sx={{ bgcolor: 'grey.50' }}>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 'bold' }}>الفترة</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>تاريخ التشغيل</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>النوع</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>عدد القسائم</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>الحالة</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }} align="center">الإجراءات</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {runs.map((run) => (
                                    <TableRow key={run.id} hover>
                                        <TableCell>
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <Receipt color="primary" sx={{ fontSize: 20 }} />
                                                <Typography fontWeight="bold">
                                                    {run.period?.month} / {run.period?.year}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            {new Date(run.runDate).toLocaleDateString('ar-SA')}
                                        </TableCell>
                                        <TableCell>
                                            {run.isAdjustment ? (
                                                <Chip label="تعديل" size="small" color="secondary" />
                                            ) : (
                                                <Chip label="أساسي" size="small" variant="outlined" />
                                            )}
                                        </TableCell>
                                        <TableCell>{run._count?.payslips || 0}</TableCell>
                                        <TableCell>
                                            <Chip
                                                icon={run.lockedAt ? <Lock /> : <LockOpen />}
                                                label={getRunStatusLabel(run.status)}
                                                size="small"
                                                color={getRunStatusColor(run.status) as any}
                                            />
                                        </TableCell>
                                        <TableCell align="center">
                                            <Button
                                                size="small"
                                                variant="contained"
                                                startIcon={<Visibility />}
                                                onClick={() => navigate(`/salary/runs/${run.id}`)}
                                            >
                                                تفاصيل
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {runs.length === 0 && !loading && (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                                            <Receipt sx={{ fontSize: 48, color: 'grey.300', mb: 1 }} />
                                            <Typography color="text.secondary">لا يوجد مسيرات رواتب بعد</Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                اذهب للفترات واضغط "تشغيل" لإنشاء مسير جديد
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Card>
            )}

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
                                select
                                label="تكرار دورة الرواتب"
                                value={formData.frequency}
                                onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                            >
                                <MenuItem value="WEEKLY">أسبوعي (Weekly)</MenuItem>
                                <MenuItem value="BI_WEEKLY">كل أسبوعين (Bi-weekly)</MenuItem>
                                <MenuItem value="MONTHLY">شهري (Monthly)</MenuItem>
                            </TextField>
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
