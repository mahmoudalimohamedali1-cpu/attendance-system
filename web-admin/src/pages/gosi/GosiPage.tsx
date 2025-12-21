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
    Alert,
    CircularProgress,
    Chip,
    Card,
    CardContent,
    Grid,
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Shield as GosiIcon,
    CheckCircle as ActiveIcon,
} from '@mui/icons-material';
import { gosiService, GosiConfig, CreateGosiConfigDto } from '@/services/gosi.service';

export default function GosiPage() {
    const [configs, setConfigs] = useState<GosiConfig[]>([]);
    const [activeConfig, setActiveConfig] = useState<GosiConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Dialog states
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedConfig, setSelectedConfig] = useState<GosiConfig | null>(null);

    // Form state
    const [formData, setFormData] = useState<CreateGosiConfigDto>({
        employeePercentage: 9.75,
        employerPercentage: 11.75,
        maxSalary: 45000,
        effectiveFrom: new Date().toISOString().slice(0, 10),
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [configsRes, activeRes] = await Promise.all([
                gosiService.getAll(),
                gosiService.getActiveConfig(),
            ]);
            setConfigs(configsRes);
            setActiveConfig(activeRes);
            setError(null);
        } catch (err: any) {
            setError(err.response?.data?.message || 'حدث خطأ');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (config?: GosiConfig) => {
        if (config) {
            setSelectedConfig(config);
            setFormData({
                employeePercentage: config.employeePercentage,
                employerPercentage: config.employerPercentage,
                maxSalary: config.maxSalary,
                effectiveFrom: config.effectiveFrom?.slice(0, 10) || '',
            });
        } else {
            setSelectedConfig(null);
            setFormData({
                employeePercentage: 9.75,
                employerPercentage: 11.75,
                maxSalary: 45000,
                effectiveFrom: new Date().toISOString().slice(0, 10),
            });
        }
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setSelectedConfig(null);
    };

    const handleSubmit = async () => {
        try {
            if (selectedConfig) {
                await gosiService.update(selectedConfig.id, formData);
            } else {
                await gosiService.create(formData);
            }
            handleCloseDialog();
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.message || 'حدث خطأ');
        }
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('ar-SA');
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('ar-SA', {
            style: 'currency',
            currency: 'SAR',
        }).format(amount);
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
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h5" fontWeight="bold">
                    <GosiIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    التأمينات الاجتماعية (GOSI)
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog()}
                >
                    إعداد جديد
                </Button>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {/* Active Config Card */}
            {activeConfig && (
                <Card sx={{ mb: 3, bgcolor: 'success.light', color: 'white' }}>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            <ActiveIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                            الإعداد المفعّل حالياً
                        </Typography>
                        <Grid container spacing={3}>
                            <Grid item xs={12} sm={6} md={3}>
                                <Typography variant="body2">نسبة الموظف</Typography>
                                <Typography variant="h5">{activeConfig.employeePercentage}%</Typography>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <Typography variant="body2">نسبة صاحب العمل</Typography>
                                <Typography variant="h5">{activeConfig.employerPercentage}%</Typography>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <Typography variant="body2">الحد الأقصى للراتب</Typography>
                                <Typography variant="h5">{formatCurrency(activeConfig.maxSalary)}</Typography>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <Typography variant="body2">ساري من</Typography>
                                <Typography variant="h5">{formatDate(activeConfig.effectiveFrom)}</Typography>
                            </Grid>
                        </Grid>
                    </CardContent>
                </Card>
            )}

            {!activeConfig && (
                <Alert severity="warning" sx={{ mb: 3 }}>
                    لا يوجد إعداد مفعّل! يرجى إضافة إعداد جديد.
                </Alert>
            )}

            {/* History Table */}
            <Paper>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ bgcolor: 'grey.100' }}>
                                <TableCell>نسبة الموظف</TableCell>
                                <TableCell>نسبة صاحب العمل</TableCell>
                                <TableCell>الحد الأقصى</TableCell>
                                <TableCell>ساري من</TableCell>
                                <TableCell align="center">الحالة</TableCell>
                                <TableCell align="center">الإجراءات</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {configs.map((config) => (
                                <TableRow key={config.id} hover>
                                    <TableCell>{config.employeePercentage}%</TableCell>
                                    <TableCell>{config.employerPercentage}%</TableCell>
                                    <TableCell>{formatCurrency(config.maxSalary)}</TableCell>
                                    <TableCell>{formatDate(config.effectiveFrom)}</TableCell>
                                    <TableCell align="center">
                                        {config.isActive ? (
                                            <Chip label="مفعّل" color="success" size="small" icon={<ActiveIcon />} />
                                        ) : (
                                            <Chip label="غير مفعّل" variant="outlined" size="small" />
                                        )}
                                    </TableCell>
                                    <TableCell align="center">
                                        <Button
                                            size="small"
                                            startIcon={<EditIcon />}
                                            onClick={() => handleOpenDialog(config)}
                                        >
                                            تعديل
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {configs.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} align="center">
                                        لا توجد إعدادات
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* Add/Edit Dialog */}
            <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {selectedConfig ? 'تعديل إعداد التأمينات' : 'إنشاء إعداد تأمينات جديد'}
                </DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                type="number"
                                label="نسبة الموظف %"
                                value={formData.employeePercentage}
                                onChange={(e) =>
                                    setFormData({ ...formData, employeePercentage: parseFloat(e.target.value) })
                                }
                                inputProps={{ step: 0.25, min: 0, max: 100 }}
                                helperText="النسبة المقتطعة من راتب الموظف"
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                type="number"
                                label="نسبة صاحب العمل %"
                                value={formData.employerPercentage}
                                onChange={(e) =>
                                    setFormData({ ...formData, employerPercentage: parseFloat(e.target.value) })
                                }
                                inputProps={{ step: 0.25, min: 0, max: 100 }}
                                helperText="النسبة التي يدفعها صاحب العمل"
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                type="number"
                                label="الحد الأقصى للراتب (ريال)"
                                value={formData.maxSalary}
                                onChange={(e) =>
                                    setFormData({ ...formData, maxSalary: parseFloat(e.target.value) })
                                }
                                helperText="أقصى راتب يُحسب عليه التأمينات"
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                type="date"
                                label="تاريخ البداية"
                                value={formData.effectiveFrom}
                                onChange={(e) =>
                                    setFormData({ ...formData, effectiveFrom: e.target.value })
                                }
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>إلغاء</Button>
                    <Button variant="contained" onClick={handleSubmit}>
                        {selectedConfig ? 'تحديث' : 'إنشاء'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
