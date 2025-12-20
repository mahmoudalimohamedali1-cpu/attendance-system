import { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Button,
    Card,
    CardContent,
    Grid,
    TextField,
    MenuItem,
    Alert,
    CircularProgress,
    Paper,
    Divider,
} from '@mui/material';
import { PlayCircleFilled, ArrowBack } from '@mui/icons-material';
import { api } from '@/services/api.service';
import { useNavigate, useSearchParams } from 'react-router-dom';

export const PayrollRunNewPage = () => {
    const [searchParams] = useSearchParams();
    const periodId = searchParams.get('periodId') || '';
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [branches, setBranches] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        periodId: periodId,
        branchId: '',
    });

    useEffect(() => {
        const fetchBranches = async () => {
            try {
                const data = await api.get('/branches') as any[];
                setBranches(data || []);
            } catch (err) {
                console.error(err);
            }
        };
        fetchBranches();
    }, []);

    const handleRun = async () => {
        if (!formData.periodId) return;
        try {
            setLoading(true);
            const result = await api.post('/payroll-runs', formData) as any;
            navigate(`/salary/runs/${result.id}`);
        } catch (err: any) {
            setError(err.message || 'Error occurred while running payroll');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box>
            <Button
                startIcon={<ArrowBack />}
                onClick={() => navigate('/salary')}
                sx={{ mb: 2 }}
            >
                العودة للرواتب
            </Button>

            <Typography variant="h5" fontWeight="bold" gutterBottom>تشغيل مسير الرواتب</Typography>

            <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                    <Card sx={{ p: 1, borderRadius: 3 }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>إعدادات التشغيل</Typography>
                            <Box component="form" sx={{ mt: 2 }}>
                                <TextField
                                    fullWidth
                                    select
                                    label="الفترة المختارة"
                                    value={formData.periodId}
                                    disabled
                                    sx={{ mb: 3 }}
                                >
                                    <MenuItem value={periodId}>الفترة الحالية</MenuItem>
                                </TextField>

                                <TextField
                                    fullWidth
                                    select
                                    label="فلترة حسب الفرع (اختياري)"
                                    value={formData.branchId}
                                    onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                                    sx={{ mb: 3 }}
                                >
                                    <MenuItem value="">الكل</MenuItem>
                                    {branches.map(b => (
                                        <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
                                    ))}
                                </TextField>

                                <Alert severity="info" sx={{ mb: 3 }}>
                                    سيتم احتساب الرواتب لجميع الموظفين النشطين في الفلاتر المختارة بناءً على "هياكل الرواتب" المعينة لهم.
                                </Alert>

                                <Button
                                    fullWidth
                                    variant="contained"
                                    size="large"
                                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <PlayCircleFilled />}
                                    onClick={handleRun}
                                    disabled={loading}
                                    sx={{ height: 50, borderRadius: 2 }}
                                >
                                    {loading ? 'جاري الاحتساب...' : 'بدء الاحتساب الآن'}
                                </Button>
                                {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 4, bgcolor: 'primary.main', color: 'white', borderRadius: 3 }}>
                        <Typography variant="h6" gutterBottom>ماذا يحدث عند التشغيل؟</Typography>
                        <Divider sx={{ bgcolor: 'rgba(255,255,255,0.2)', mb: 2 }} />
                        <Box component="ul" sx={{ pl: 2 }}>
                            <li><Typography variant="body2" sx={{ mb: 1 }}>مراجعة جميع الموظفين النشطين.</Typography></li>
                            <li><Typography variant="body2" sx={{ mb: 1 }}>جلب هيكل الراتب والراتب الأساسي لكل موظف.</Typography></li>
                            <li><Typography variant="body2" sx={{ mb: 1 }}>حساب البدلات والاستقطاعات حسب القواعد المعرفة.</Typography></li>
                            <li><Typography variant="body2" sx={{ mb: 1 }}>إنشاء "مسودة" قسيمة راتب (Payslip) لكل موظف للمراجعة.</Typography></li>
                            <li><Typography variant="body2" sx={{ mb: 1 }}>لن يتم اعتماد المبالغ أو ترحيلها حتى توافق عليها لاحقاً.</Typography></li>
                        </Box>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default PayrollRunNewPage;
