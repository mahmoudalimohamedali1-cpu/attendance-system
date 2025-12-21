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
    Delete as DeleteIcon,
    Assignment as AssignIcon,
} from '@mui/icons-material';
import { api } from '@/services/api.service';
import { salaryAssignmentsService, SalaryAssignment, CreateSalaryAssignmentDto } from '@/services/salary-assignments.service';
import { salaryStructuresService, SalaryStructure } from '@/services/salary-structures.service';

interface User {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
}

export default function SalaryAssignmentsPage() {
    const [assignments, setAssignments] = useState<SalaryAssignment[]>([]);
    const [structures, setStructures] = useState<SalaryStructure[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedAssignment, setSelectedAssignment] = useState<SalaryAssignment | null>(null);

    const [formData, setFormData] = useState<CreateSalaryAssignmentDto>({
        userId: '',
        salaryStructureId: '',
        effectiveFrom: new Date().toISOString().slice(0, 10),
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [assignmentsRes, structuresRes, usersRes] = await Promise.all([
                salaryAssignmentsService.getAll(),
                salaryStructuresService.getAll(),
                api.get('/users'),
            ]);
            setAssignments(assignmentsRes);
            setStructures(structuresRes);
            setUsers((usersRes as any).data || usersRes as User[]);
            setError(null);
        } catch (err: any) {
            setError(err.response?.data?.message || 'حدث خطأ');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = () => {
        setFormData({
            userId: '',
            salaryStructureId: '',
            effectiveFrom: new Date().toISOString().slice(0, 10),
        });
        setDialogOpen(true);
    };

    const handleSubmit = async () => {
        try {
            await salaryAssignmentsService.create(formData);
            setDialogOpen(false);
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.message || 'حدث خطأ');
        }
    };

    const handleOpenDelete = (assignment: SalaryAssignment) => {
        setSelectedAssignment(assignment);
        setDeleteDialogOpen(true);
    };

    const handleDelete = async () => {
        if (!selectedAssignment) return;
        try {
            await salaryAssignmentsService.delete(selectedAssignment.id);
            setDeleteDialogOpen(false);
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.message || 'حدث خطأ');
        }
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('ar-SA');
    };

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(amount);

    // Find users without active assignment
    const usersWithoutAssignment = users.filter(
        u => !assignments.some(a => a.userId === u.id && a.isActive)
    );

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
                    <AssignIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    تخصيص الرواتب
                </Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenDialog}>
                    تخصيص جديد
                </Button>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {usersWithoutAssignment.length > 0 && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                    يوجد {usersWithoutAssignment.length} موظف بدون هيكل راتب مخصص
                </Alert>
            )}

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow sx={{ bgcolor: 'grey.100' }}>
                            <TableCell>الموظف</TableCell>
                            <TableCell>هيكل الراتب</TableCell>
                            <TableCell>الراتب الأساسي</TableCell>
                            <TableCell>ساري من</TableCell>
                            <TableCell align="center">الحالة</TableCell>
                            <TableCell align="center">الإجراءات</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {assignments.map((a) => (
                            <TableRow key={a.id} hover>
                                <TableCell>
                                    {a.user ? `${a.user.firstName} ${a.user.lastName}` : '-'}
                                    <br />
                                    <Typography variant="caption" color="text.secondary">
                                        {a.user?.employeeCode}
                                    </Typography>
                                </TableCell>
                                <TableCell>{a.salaryStructure?.name || '-'}</TableCell>
                                <TableCell>{a.salaryStructure ? formatCurrency(a.salaryStructure.baseSalary) : '-'}</TableCell>
                                <TableCell>{formatDate(a.effectiveFrom)}</TableCell>
                                <TableCell align="center">
                                    <Chip
                                        label={a.isActive ? 'نشط' : 'منتهي'}
                                        color={a.isActive ? 'success' : 'default'}
                                        size="small"
                                    />
                                </TableCell>
                                <TableCell align="center">
                                    <Tooltip title="حذف">
                                        <IconButton size="small" color="error" onClick={() => handleOpenDelete(a)}>
                                            <DeleteIcon />
                                        </IconButton>
                                    </Tooltip>
                                </TableCell>
                            </TableRow>
                        ))}
                        {assignments.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} align="center">
                                    لا توجد تخصيصات
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Dialog */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>تخصيص هيكل راتب لموظف</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12}>
                            <TextField
                                select
                                fullWidth
                                label="الموظف"
                                value={formData.userId}
                                onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                            >
                                {users.map((u) => (
                                    <MenuItem key={u.id} value={u.id}>
                                        {u.firstName} {u.lastName} ({u.employeeCode})
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                select
                                fullWidth
                                label="هيكل الراتب"
                                value={formData.salaryStructureId}
                                onChange={(e) => setFormData({ ...formData, salaryStructureId: e.target.value })}
                            >
                                {structures.map((s) => (
                                    <MenuItem key={s.id} value={s.id}>
                                        {s.name} - {formatCurrency(s.baseSalary)}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                type="date"
                                label="ساري من"
                                value={formData.effectiveFrom}
                                onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
                    <Button
                        variant="contained"
                        onClick={handleSubmit}
                        disabled={!formData.userId || !formData.salaryStructureId}
                    >
                        تخصيص
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle>حذف التخصيص</DialogTitle>
                <DialogContent>
                    <Typography>هل أنت متأكد من حذف هذا التخصيص؟</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>إلغاء</Button>
                    <Button variant="contained" color="error" onClick={handleDelete}>حذف</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
