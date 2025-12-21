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
    IconButton,
    Tooltip,
    Grid,
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    AccountTree as StructureIcon,
} from '@mui/icons-material';
import { salaryStructuresService, SalaryStructure, CreateSalaryStructureDto } from '@/services/salary-structures.service';

export default function SalaryStructuresPage() {
    const [structures, setStructures] = useState<SalaryStructure[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedStructure, setSelectedStructure] = useState<SalaryStructure | null>(null);

    const [formData, setFormData] = useState<CreateSalaryStructureDto>({
        name: '',
        description: '',
        baseSalary: 0,
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await salaryStructuresService.getAll();
            setStructures(data);
            setError(null);
        } catch (err: any) {
            setError(err.response?.data?.message || 'حدث خطأ');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (structure?: SalaryStructure) => {
        if (structure) {
            setSelectedStructure(structure);
            setFormData({
                name: structure.name,
                description: structure.description || '',
                baseSalary: structure.baseSalary,
            });
        } else {
            setSelectedStructure(null);
            setFormData({ name: '', description: '', baseSalary: 0 });
        }
        setDialogOpen(true);
    };

    const handleSubmit = async () => {
        try {
            if (selectedStructure) {
                await salaryStructuresService.update(selectedStructure.id, formData);
            } else {
                await salaryStructuresService.create(formData);
            }
            setDialogOpen(false);
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.message || 'حدث خطأ');
        }
    };

    const handleOpenDelete = (structure: SalaryStructure) => {
        setSelectedStructure(structure);
        setDeleteDialogOpen(true);
    };

    const handleDelete = async () => {
        if (!selectedStructure) return;
        try {
            await salaryStructuresService.delete(selectedStructure.id);
            setDeleteDialogOpen(false);
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.message || 'حدث خطأ');
        }
    };

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(amount);

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
                    <StructureIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    هياكل الرواتب
                </Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
                    هيكل جديد
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
                            <TableCell>الوصف</TableCell>
                            <TableCell>الراتب الأساسي</TableCell>
                            <TableCell align="center">الحالة</TableCell>
                            <TableCell align="center">الإجراءات</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {structures.map((s) => (
                            <TableRow key={s.id} hover>
                                <TableCell>{s.name}</TableCell>
                                <TableCell>{s.description || '-'}</TableCell>
                                <TableCell>{formatCurrency(s.baseSalary)}</TableCell>
                                <TableCell align="center">
                                    <Chip
                                        label={s.isActive ? 'نشط' : 'غير نشط'}
                                        color={s.isActive ? 'success' : 'default'}
                                        size="small"
                                    />
                                </TableCell>
                                <TableCell align="center">
                                    <Tooltip title="تعديل">
                                        <IconButton size="small" onClick={() => handleOpenDialog(s)}>
                                            <EditIcon />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="حذف">
                                        <IconButton size="small" color="error" onClick={() => handleOpenDelete(s)}>
                                            <DeleteIcon />
                                        </IconButton>
                                    </Tooltip>
                                </TableCell>
                            </TableRow>
                        ))}
                        {structures.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} align="center">
                                    لا توجد هياكل رواتب
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Dialog */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{selectedStructure ? 'تعديل الهيكل' : 'هيكل راتب جديد'}</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="اسم الهيكل"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="الوصف"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                type="number"
                                label="الراتب الأساسي (ريال)"
                                value={formData.baseSalary}
                                onChange={(e) => setFormData({ ...formData, baseSalary: parseFloat(e.target.value) })}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
                    <Button variant="contained" onClick={handleSubmit} disabled={!formData.name}>
                        {selectedStructure ? 'تحديث' : 'إنشاء'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle>حذف الهيكل</DialogTitle>
                <DialogContent>
                    <Typography>هل أنت متأكد من حذف هيكل <strong>{selectedStructure?.name}</strong>؟</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>إلغاء</Button>
                    <Button variant="contained" color="error" onClick={handleDelete}>حذف</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
