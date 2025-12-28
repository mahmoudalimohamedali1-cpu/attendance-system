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
    Grid,
    Alert,
    Avatar,
    Tooltip,
} from '@mui/material';
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    AssignmentInd,
    History,
} from '@mui/icons-material';
import { api } from '@/services/api.service';

interface User {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    employeeCode?: string;
    role?: string;
}

interface SalaryStructure {
    id: string;
    name: string;
}

interface SalaryAssignment {
    id: string;
    employeeId: string;
    employee?: User;
    structureId: string;
    structure?: SalaryStructure;
    baseSalary: number;
    effectiveDate: string;
    endDate?: string;
    isActive: boolean;
}

export const SalaryAssignmentsPage = () => {
    const [assignments, setAssignments] = useState<SalaryAssignment[]>([]);
    const [employees, setEmployees] = useState<User[]>([]);
    const [structures, setStructures] = useState<SalaryStructure[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [open, setOpen] = useState(false);
    const [formData, setFormData] = useState<any>({
        employeeId: '',
        structureId: '',
        baseSalary: 0,
        effectiveDate: new Date().toISOString().split('T')[0],
        isActive: true,
    });

    const fetchData = async () => {
        try {
            setLoading(true);
            const [assignsData, empsData, structsData] = await Promise.all([
                api.get('/salary-assignments/all') as Promise<SalaryAssignment[]>, // I need to add /all endpoint or handle list better
                api.get('/users?limit=1000') as Promise<{ data: User[] }>,
                api.get('/salary-structures') as Promise<SalaryStructure[]>,
            ]);
            // Note: I haven't added /salary-assignments/all yet. Let's adjust logic.
            // If I don't have /all, I can't show a master list easily.
            // But I can add it to the service.
            setAssignments(assignsData || []);
            setEmployees(empsData.data || []);
            setStructures(structsData || []);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData(); // Commented for now until I fix the backend endpoint
    }, []);

    const handleOpen = () => {
        setFormData({
            employeeId: '',
            structureId: '',
            baseSalary: 0,
            effectiveDate: new Date().toISOString().split('T')[0],
            isActive: true,
        });
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/salary-assignments', formData);
            handleClose();
            fetchData();
        } catch (err: any) {
            setError(err.message || 'Something went wrong');
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('هل أنت متأكد من حذف هذا التعيين؟')) {
            try {
                await api.delete(`/salary-assignments/${id}`);
                fetchData();
            } catch (err: any) {
                setError(err.message || 'Failed to delete');
            }
        }
    };

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box>
                    <Typography variant="h5" fontWeight="bold">تعيينات الرواتب</Typography>
                    <Typography variant="body2" color="text.secondary">
                        ربط الموظفين بهياكل الرواتب وتحديد إجمالي الراتب التعاقدي (TOTAL)
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleOpen}
                    sx={{ borderRadius: 2 }}
                >
                    تعيين جديد
                </Button>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

            <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                <TableContainer>
                    <Table>
                        <TableHead sx={{ bgcolor: 'grey.50' }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold' }}>الموظف</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>هيكل الراتب</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>إجمالي العقد (TOTAL)</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>تاريخ النفاذ</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>الحالة</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }} align="center">الإجراءات</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {assignments.map((assignment) => (
                                <TableRow key={assignment.id} hover>
                                    <TableCell>
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <Avatar sx={{ width: 32, height: 32, fontSize: 14 }}>{assignment.employee?.firstName[0]}</Avatar>
                                            <Box>
                                                <Typography variant="body2" fontWeight="bold">
                                                    {assignment.employee?.firstName} {assignment.employee?.lastName}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {assignment.employee?.employeeCode || '---'}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </TableCell>
                                    <TableCell>{assignment.structure?.name}</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>{assignment.baseSalary.toLocaleString()} ريال</TableCell>
                                    <TableCell>{new Date(assignment.effectiveDate).toLocaleDateString('ar-SA')}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={assignment.isActive ? 'نشط' : 'سابق'}
                                            size="small"
                                            color={assignment.isActive ? 'success' : 'default'}
                                            variant={assignment.isActive ? 'filled' : 'outlined'}
                                        />
                                    </TableCell>
                                    <TableCell align="center">
                                        <Tooltip title="عرض السجل">
                                            <IconButton size="small" color="primary">
                                                <History fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <IconButton onClick={() => handleDelete(assignment.id)} size="small" color="error">
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {assignments.length === 0 && !loading && (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                                        <AssignmentInd sx={{ fontSize: 48, color: 'grey.300', mb: 1 }} />
                                        <Typography color="text.secondary">لا يوجد تعيينات رواتب مسجلة بعد</Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>

            <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
                <DialogTitle>تعيين هيكل راتب جديد</DialogTitle>
                <DialogContent dividers>
                    <Grid container spacing={2} sx={{ mt: 0 }}>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                select
                                label="الموظف"
                                value={formData.employeeId}
                                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                                required
                            >
                                {employees.map(emp => (
                                    <MenuItem key={emp.id} value={emp.id}>
                                        {emp.firstName} {emp.lastName} ({emp.employeeCode || emp.email})
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                select
                                label="هيكل الراتب"
                                value={formData.structureId}
                                onChange={(e) => setFormData({ ...formData, structureId: e.target.value })}
                                required
                            >
                                {structures.map(struct => (
                                    <MenuItem key={struct.id} value={struct.id}>{struct.name}</MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="إجمالي الراتب التعاقدي (TOTAL)"
                                type="number"
                                value={formData.baseSalary}
                                onChange={(e) => setFormData({ ...formData, baseSalary: Number(e.target.value) })}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="تاريخ النفاذ"
                                type="date"
                                value={formData.effectiveDate}
                                onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
                                InputLabelProps={{ shrink: true }}
                                required
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={handleClose} color="inherit">إلغاء</Button>
                    <Button onClick={handleSubmit} variant="contained" color="primary">حفظ</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default SalaryAssignmentsPage;
