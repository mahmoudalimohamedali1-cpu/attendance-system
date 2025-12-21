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
    Grid,
    Switch,
    FormControlLabel,
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Category as ComponentIcon,
    TrendingUp as EarningIcon,
    TrendingDown as DeductionIcon,
} from '@mui/icons-material';
import { salaryComponentsService, SalaryComponent, CreateSalaryComponentDto } from '@/services/salary-components.service';

export default function SalaryComponentsPage() {
    const [components, setComponents] = useState<SalaryComponent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedComponent, setSelectedComponent] = useState<SalaryComponent | null>(null);

    const [formData, setFormData] = useState<CreateSalaryComponentDto>({
        name: '',
        nameEn: '',
        type: 'EARNING',
        isFixed: true,
        defaultValue: 0,
        isPercentage: false,
        isTaxable: false,
        isGosiApplicable: true,
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await salaryComponentsService.getAll();
            setComponents(data);
            setError(null);
        } catch (err: any) {
            setError(err.response?.data?.message || 'حدث خطأ');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (comp?: SalaryComponent) => {
        if (comp) {
            setSelectedComponent(comp);
            setFormData({
                name: comp.name,
                nameEn: comp.nameEn || '',
                type: comp.type,
                isFixed: comp.isFixed,
                defaultValue: comp.defaultValue || 0,
                isPercentage: comp.isPercentage,
                isTaxable: comp.isTaxable,
                isGosiApplicable: comp.isGosiApplicable,
            });
        } else {
            setSelectedComponent(null);
            setFormData({
                name: '',
                nameEn: '',
                type: 'EARNING',
                isFixed: true,
                defaultValue: 0,
                isPercentage: false,
                isTaxable: false,
                isGosiApplicable: true,
            });
        }
        setDialogOpen(true);
    };

    const handleSubmit = async () => {
        try {
            if (selectedComponent) {
                await salaryComponentsService.update(selectedComponent.id, formData);
            } else {
                await salaryComponentsService.create(formData);
            }
            setDialogOpen(false);
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.message || 'حدث خطأ');
        }
    };

    const handleDelete = async () => {
        if (!selectedComponent) return;
        try {
            await salaryComponentsService.delete(selectedComponent.id);
            setDeleteDialogOpen(false);
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.message || 'حدث خطأ');
        }
    };

    const earnings = components.filter(c => c.type === 'EARNING');
    const deductions = components.filter(c => c.type === 'DEDUCTION');

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
                    <ComponentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    مكونات الراتب
                </Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
                    مكون جديد
                </Button>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            <Grid container spacing={3}>
                {/* Earnings */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2, bgcolor: 'success.light' }}>
                        <Typography variant="h6" gutterBottom>
                            <EarningIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                            البدلات ({earnings.length})
                        </Typography>
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>الاسم</TableCell>
                                        <TableCell>القيمة</TableCell>
                                        <TableCell>GOSI</TableCell>
                                        <TableCell></TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {earnings.map((c) => (
                                        <TableRow key={c.id}>
                                            <TableCell>{c.name}</TableCell>
                                            <TableCell>
                                                {c.defaultValue}{c.isPercentage ? '%' : ' ر.س'}
                                            </TableCell>
                                            <TableCell>
                                                <Chip label={c.isGosiApplicable ? 'نعم' : 'لا'} size="small" />
                                            </TableCell>
                                            <TableCell>
                                                <IconButton size="small" onClick={() => handleOpenDialog(c)}>
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </Grid>

                {/* Deductions */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2, bgcolor: 'error.light' }}>
                        <Typography variant="h6" gutterBottom>
                            <DeductionIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                            الخصومات ({deductions.length})
                        </Typography>
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>الاسم</TableCell>
                                        <TableCell>القيمة</TableCell>
                                        <TableCell>GOSI</TableCell>
                                        <TableCell></TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {deductions.map((c) => (
                                        <TableRow key={c.id}>
                                            <TableCell>{c.name}</TableCell>
                                            <TableCell>
                                                {c.defaultValue}{c.isPercentage ? '%' : ' ر.س'}
                                            </TableCell>
                                            <TableCell>
                                                <Chip label={c.isGosiApplicable ? 'نعم' : 'لا'} size="small" />
                                            </TableCell>
                                            <TableCell>
                                                <IconButton size="small" onClick={() => handleOpenDialog(c)}>
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </Grid>
            </Grid>

            {/* Dialog */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{selectedComponent ? 'تعديل المكون' : 'مكون راتب جديد'}</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="الاسم بالعربي"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="الاسم بالإنجليزي"
                                value={formData.nameEn}
                                onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                select
                                fullWidth
                                label="النوع"
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value as 'EARNING' | 'DEDUCTION' })}
                            >
                                <MenuItem value="EARNING">بدل (إضافة)</MenuItem>
                                <MenuItem value="DEDUCTION">خصم</MenuItem>
                            </TextField>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                type="number"
                                label="القيمة الافتراضية"
                                value={formData.defaultValue}
                                onChange={(e) => setFormData({ ...formData, defaultValue: parseFloat(e.target.value) })}
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={formData.isPercentage}
                                        onChange={(e) => setFormData({ ...formData, isPercentage: e.target.checked })}
                                    />
                                }
                                label="نسبة مئوية"
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={formData.isGosiApplicable}
                                        onChange={(e) => setFormData({ ...formData, isGosiApplicable: e.target.checked })}
                                    />
                                }
                                label="يُحسب عليه GOSI"
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
                    <Button variant="contained" onClick={handleSubmit} disabled={!formData.name}>
                        {selectedComponent ? 'تحديث' : 'إنشاء'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle>حذف المكون</DialogTitle>
                <DialogContent>
                    <Typography>هل أنت متأكد من حذف مكون <strong>{selectedComponent?.name}</strong>؟</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>إلغاء</Button>
                    <Button variant="contained" color="error" onClick={handleDelete}>حذف</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
