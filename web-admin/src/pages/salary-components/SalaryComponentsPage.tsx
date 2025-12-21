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
    FormControl,
    InputLabel,
    Select,
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Category as ComponentIcon,
    TrendingUp as EarningIcon,
    TrendingDown as DeductionIcon,
} from '@mui/icons-material';
import {
    salaryComponentsService,
    SalaryComponent,
    CreateSalaryComponentDto,
    ComponentType,
    ComponentNature,
    componentTypeLabels,
    componentNatureLabels,
} from '@/services/salary-components.service';

export default function SalaryComponentsPage() {
    const [components, setComponents] = useState<SalaryComponent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedComponent, setSelectedComponent] = useState<SalaryComponent | null>(null);

    const initialFormData: CreateSalaryComponentDto = {
        code: '',
        nameAr: '',
        nameEn: '',
        type: 'EARNING',
        nature: 'FIXED',
        description: '',
        gosiEligible: true,
        otEligible: false,
        formula: '',
    };

    const [formData, setFormData] = useState<CreateSalaryComponentDto>(initialFormData);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

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
            setError(err.response?.data?.message || 'حدث خطأ في جلب البيانات');
        } finally {
            setLoading(false);
        }
    };

    const validateForm = (): boolean => {
        const errors: Record<string, string> = {};

        if (!formData.code?.trim()) {
            errors.code = 'كود المكون مطلوب';
        } else if (!/^[A-Z_0-9]+$/.test(formData.code)) {
            errors.code = 'الكود يجب أن يكون بالإنجليزية كبير فقط (مثال: BASIC_SALARY)';
        }

        if (!formData.nameAr?.trim()) {
            errors.nameAr = 'الاسم بالعربي مطلوب';
        }

        if (formData.nature === 'FORMULA' && !formData.formula?.trim()) {
            errors.formula = 'المعادلة مطلوبة عند اختيار نوع "معادلة"';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleOpenDialog = (comp?: SalaryComponent) => {
        setFormErrors({});
        if (comp) {
            setSelectedComponent(comp);
            setFormData({
                code: comp.code,
                nameAr: comp.nameAr,
                nameEn: comp.nameEn || '',
                type: comp.type,
                nature: comp.nature,
                description: comp.description || '',
                gosiEligible: comp.gosiEligible,
                otEligible: comp.otEligible,
                formula: comp.formula || '',
            });
        } else {
            setSelectedComponent(null);
            setFormData(initialFormData);
        }
        setDialogOpen(true);
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        try {
            if (selectedComponent) {
                await salaryComponentsService.update(selectedComponent.id, formData);
                setSuccessMsg('تم تحديث المكون بنجاح');
            } else {
                await salaryComponentsService.create(formData);
                setSuccessMsg('تم إنشاء المكون بنجاح');
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
            setSelectedComponent(null);
            setSuccessMsg('تم حذف المكون بنجاح');
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.message || 'حدث خطأ في الحذف');
        }
    };

    const openDeleteDialog = (comp: SalaryComponent) => {
        setSelectedComponent(comp);
        setDeleteDialogOpen(true);
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

    const ComponentTable = ({ items, title, icon: Icon, bgColor }: {
        items: SalaryComponent[];
        title: string;
        icon: typeof EarningIcon;
        bgColor: string;
    }) => (
        <Paper sx={{ p: 2, bgcolor: bgColor }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Icon /> {title} ({items.length})
            </Typography>
            <TableContainer>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>الكود</TableCell>
                            <TableCell>الاسم</TableCell>
                            <TableCell>الطبيعة</TableCell>
                            <TableCell>GOSI</TableCell>
                            <TableCell>OT</TableCell>
                            <TableCell align="center">إجراءات</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {items.map((c) => (
                            <TableRow key={c.id} hover>
                                <TableCell><code>{c.code}</code></TableCell>
                                <TableCell>{c.nameAr}</TableCell>
                                <TableCell>
                                    <Chip
                                        label={componentNatureLabels[c.nature]}
                                        size="small"
                                        color={c.nature === 'FORMULA' ? 'secondary' : 'default'}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        label={c.gosiEligible ? 'نعم' : 'لا'}
                                        size="small"
                                        color={c.gosiEligible ? 'success' : 'default'}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        label={c.otEligible ? 'نعم' : 'لا'}
                                        size="small"
                                        color={c.otEligible ? 'info' : 'default'}
                                    />
                                </TableCell>
                                <TableCell align="center">
                                    <IconButton size="small" onClick={() => handleOpenDialog(c)} title="تعديل">
                                        <EditIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton size="small" color="error" onClick={() => openDeleteDialog(c)} title="حذف">
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                        {items.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                                    <Typography color="text.secondary">لا يوجد مكونات</Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    );

    return (
        <Box p={3}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h5" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ComponentIcon /> مكونات الراتب
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

            {successMsg && (
                <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMsg(null)}>
                    {successMsg}
                </Alert>
            )}

            <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                    <ComponentTable
                        items={earnings}
                        title="البدلات والاستحقاقات"
                        icon={EarningIcon}
                        bgColor="success.50"
                    />
                </Grid>
                <Grid item xs={12} md={6}>
                    <ComponentTable
                        items={deductions}
                        title="الخصومات والاستقطاعات"
                        icon={DeductionIcon}
                        bgColor="error.50"
                    />
                </Grid>
            </Grid>

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {selectedComponent ? 'تعديل مكون الراتب' : 'إنشاء مكون راتب جديد'}
                </DialogTitle>
                <DialogContent dividers>
                    <Grid container spacing={2} sx={{ mt: 0 }}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="كود المكون"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                error={!!formErrors.code}
                                helperText={formErrors.code || 'مثال: HOUSING_ALLOWANCE'}
                                placeholder="BASIC_SALARY"
                                disabled={!!selectedComponent} // لا يمكن تغيير الكود بعد الإنشاء
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="الاسم بالعربي"
                                value={formData.nameAr}
                                onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                                error={!!formErrors.nameAr}
                                helperText={formErrors.nameAr}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="الاسم بالإنجليزي (اختياري)"
                                value={formData.nameEn}
                                onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth>
                                <InputLabel>النوع</InputLabel>
                                <Select
                                    value={formData.type}
                                    label="النوع"
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value as ComponentType })}
                                >
                                    <MenuItem value="EARNING">{componentTypeLabels.EARNING}</MenuItem>
                                    <MenuItem value="DEDUCTION">{componentTypeLabels.DEDUCTION}</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth>
                                <InputLabel>طبيعة المكون</InputLabel>
                                <Select
                                    value={formData.nature}
                                    label="طبيعة المكون"
                                    onChange={(e) => setFormData({ ...formData, nature: e.target.value as ComponentNature })}
                                >
                                    <MenuItem value="FIXED">{componentNatureLabels.FIXED} - مبلغ ثابت</MenuItem>
                                    <MenuItem value="VARIABLE">{componentNatureLabels.VARIABLE} - يتغير شهرياً</MenuItem>
                                    <MenuItem value="FORMULA">{componentNatureLabels.FORMULA} - يُحسب بمعادلة</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>

                        {/* Dynamic Formula Field */}
                        {formData.nature === 'FORMULA' && (
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="المعادلة"
                                    value={formData.formula}
                                    onChange={(e) => setFormData({ ...formData, formula: e.target.value })}
                                    error={!!formErrors.formula}
                                    helperText={formErrors.formula || 'مثال: BASIC * 0.25'}
                                    placeholder="BASIC * 0.1"
                                />
                            </Grid>
                        )}

                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="الوصف (اختياري)"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                multiline
                                rows={2}
                            />
                        </Grid>

                        <Grid item xs={6}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={formData.gosiEligible}
                                        onChange={(e) => setFormData({ ...formData, gosiEligible: e.target.checked })}
                                    />
                                }
                                label="يُحسب عليه GOSI"
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={formData.otEligible}
                                        onChange={(e) => setFormData({ ...formData, otEligible: e.target.checked })}
                                    />
                                }
                                label="يدخل في حساب OT"
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
                    <Button variant="contained" onClick={handleSubmit}>
                        {selectedComponent ? 'تحديث' : 'إنشاء'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle>تأكيد الحذف</DialogTitle>
                <DialogContent>
                    <Typography>
                        هل أنت متأكد من حذف مكون <strong>{selectedComponent?.nameAr}</strong>؟
                    </Typography>
                    <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                        تحذير: لا يمكن التراجع عن هذا الإجراء
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>إلغاء</Button>
                    <Button variant="contained" color="error" onClick={handleDelete}>
                        حذف
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
