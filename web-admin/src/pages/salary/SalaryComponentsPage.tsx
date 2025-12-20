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
    MenuItem,
    Chip,
    FormControlLabel,
    Switch,
    Grid,
    Alert,
    CircularProgress,
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    MonetizationOn,
} from '@mui/icons-material';
import { api } from '@/services/api.service';

interface SalaryComponent {
    id: string;
    code: string;
    nameAr: string;
    nameEn?: string;
    type: 'EARNING' | 'DEDUCTION';
    nature: 'FIXED' | 'VARIABLE' | 'FORMULA';
    description?: string;
    gosiEligible: boolean;
    otEligible: boolean;
    formula?: string;
}

export const SalaryComponentsPage = () => {
    const [components, setComponents] = useState<SalaryComponent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [open, setOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<SalaryComponent>>({
        type: 'EARNING',
        nature: 'FIXED',
        gosiEligible: false,
        otEligible: false,
    });

    const fetchComponents = async () => {
        try {
            setLoading(true);
            const data = await api.get('/salary-components') as SalaryComponent[];
            setComponents(data);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch components');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchComponents();
    }, []);

    const handleOpen = (component?: SalaryComponent) => {
        if (component) {
            setEditingId(component.id);
            setFormData(component);
        } else {
            setEditingId(null);
            setFormData({
                type: 'EARNING',
                nature: 'FIXED',
                gosiEligible: false,
                otEligible: false,
            });
        }
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        setEditingId(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                await api.patch(`/salary-components/${editingId}`, formData);
            } else {
                await api.post('/salary-components', formData);
            }
            handleClose();
            fetchComponents();
        } catch (err: any) {
            setError(err.message || 'Something went wrong');
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('هل أنت متأكد من حذف هذا المكون؟')) {
            try {
                await api.delete(`/salary-components/${id}`);
                fetchComponents();
            } catch (err: any) {
                setError(err.message || 'Failed to delete');
            }
        }
    };

    if (loading && components.length === 0) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box>
                    <Typography variant="h5" fontWeight="bold">مكونات الراتب</Typography>
                    <Typography variant="body2" color="text.secondary">
                        إدارة البدلات والاستقطاعات والمكونات الأساسية للراتب
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpen()}
                    sx={{ borderRadius: 2 }}
                >
                    مكون جديد
                </Button>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

            <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                <TableContainer>
                    <Table>
                        <TableHead sx={{ bgcolor: 'grey.50' }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold' }}>الكود</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>الاسم (عربي)</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>النوع</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>الطبيعة</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>التأمينات</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>الإضافي</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }} align="center">الإجراءات</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {components.map((comp) => (
                                <TableRow key={comp.id} hover>
                                    <TableCell><Chip label={comp.code} size="small" variant="outlined" /></TableCell>
                                    <TableCell>{comp.nameAr}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={comp.type === 'EARNING' ? 'استحقاق' : 'استقطاع'}
                                            color={comp.type === 'EARNING' ? 'success' : 'error'}
                                            size="small"
                                            variant="outlined"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        {comp.nature === 'FIXED' ? 'ثابت' : comp.nature === 'VARIABLE' ? 'متغير' : 'معادلة'}
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={comp.gosiEligible ? 'نعم' : 'لا'}
                                            size="small"
                                            color={comp.gosiEligible ? 'primary' : 'default'}
                                            variant={comp.gosiEligible ? 'filled' : 'outlined'}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={comp.otEligible ? 'نعم' : 'لا'}
                                            size="small"
                                            color={comp.otEligible ? 'primary' : 'default'}
                                            variant={comp.otEligible ? 'filled' : 'outlined'}
                                        />
                                    </TableCell>
                                    <TableCell align="center">
                                        <IconButton onClick={() => handleOpen(comp)} size="small" color="primary">
                                            <EditIcon fontSize="small" />
                                        </IconButton>
                                        <IconButton onClick={() => handleDelete(comp.id)} size="small" color="error">
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {components.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                                        <MonetizationOn sx={{ fontSize: 48, color: 'grey.300', mb: 1 }} />
                                        <Typography color="text.secondary">لا يوجد مكونات راتب مسجلة بعد</Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>

            <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
                <DialogTitle>{editingId ? 'تعديل مكون' : 'إنشاء مكون جديد'}</DialogTitle>
                <DialogContent dividers>
                    <Grid container spacing={2} sx={{ mt: 0 }}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="كود المكون (مثال: BASIC)"
                                value={formData.code || ''}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="الاسم بالعربية"
                                value={formData.nameAr || ''}
                                onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                select
                                label="النوع"
                                value={formData.type || 'EARNING'}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                            >
                                <MenuItem value="EARNING">استحقاق (بدل/أساسي)</MenuItem>
                                <MenuItem value="DEDUCTION">استقطاع</MenuItem>
                            </TextField>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                select
                                label="طبيعة المكون"
                                value={formData.nature || 'FIXED'}
                                onChange={(e) => setFormData({ ...formData, nature: e.target.value as any })}
                            >
                                <MenuItem value="FIXED">مبلغ ثابت</MenuItem>
                                <MenuItem value="VARIABLE">مبلغ متغير كل شهر</MenuItem>
                                <MenuItem value="FORMULA">محسوب بمعادلة</MenuItem>
                            </TextField>
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="الوصف"
                                multiline
                                rows={2}
                                value={formData.description || ''}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </Grid>
                        {formData.nature === 'FORMULA' && (
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="المعادلة"
                                    placeholder="مثال: BASIC * 0.25"
                                    value={formData.formula || ''}
                                    onChange={(e) => setFormData({ ...formData, formula: e.target.value })}
                                />
                            </Grid>
                        )}
                        <Grid item xs={12} sm={6}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={formData.gosiEligible || false}
                                        onChange={(e) => setFormData({ ...formData, gosiEligible: e.target.checked })}
                                    />
                                }
                                label="خاضع للتأمينات (GOSI)"
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={formData.otEligible || false}
                                        onChange={(e) => setFormData({ ...formData, otEligible: e.target.checked })}
                                    />
                                }
                                label="خاضع للعمل الإضافي (OT)"
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={handleClose} color="inherit">إلغاء</Button>
                    <Button onClick={handleSubmit} variant="contained" color="primary">
                        {editingId ? 'تحديث' : 'حفظ'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};
