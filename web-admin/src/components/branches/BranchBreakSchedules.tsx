import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    IconButton,
    Chip,
    CircularProgress,
    Alert,
    Switch,
    FormControlLabel,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    MenuItem,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TableContainer,
} from '@mui/material';
import {
    Add,
    Edit,
    Delete,
    Coffee,
    RestaurantMenu,
    AccessTime,
    Refresh,
} from '@mui/icons-material';
import { api } from '@/services/api.service';

interface BreakSchedule {
    id: string;
    branchId: string;
    name: string;
    nameEn?: string;
    type: 'PRAYER' | 'LUNCH' | 'PERSONAL' | 'REST' | 'OTHER';
    startTime: string;
    endTime: string;
    durationMinutes: number;
    isPaid: boolean;
    isActive: boolean;
    createdAt: string;
}

interface BranchBreakSchedulesProps {
    branchId: string;
    branchName: string;
}

const BREAK_TYPES = [
    { value: 'PRAYER', label: 'صلاة', icon: '🕌' },
    { value: 'LUNCH', label: 'غداء', icon: '🍽️' },
    { value: 'PERSONAL', label: 'شخصية', icon: '👤' },
    { value: 'REST', label: 'راحة', icon: '☕' },
    { value: 'OTHER', label: 'أخرى', icon: '⏰' },
];

export const BranchBreakSchedules = ({ branchId, branchName }: BranchBreakSchedulesProps) => {
    const queryClient = useQueryClient();
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedBreak, setSelectedBreak] = useState<BreakSchedule | null>(null);
    const [form, setForm] = useState({
        name: '',
        nameEn: '',
        type: 'LUNCH' as BreakSchedule['type'],
        startTime: '12:00',
        endTime: '13:00',
        isPaid: true,
        isActive: true,
    });

    // Fetch break schedules for this branch
    const { data: breakSchedules, isLoading, error } = useQuery<BreakSchedule[]>({
        queryKey: ['branch-break-schedules', branchId],
        queryFn: () => api.get(`/branches/${branchId}/break-schedules`),
        enabled: !!branchId,
    });

    // Create break schedule mutation
    const createMutation = useMutation({
        mutationFn: (data: typeof form) => api.post(`/branches/${branchId}/break-schedules`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['branch-break-schedules', branchId] });
            handleCloseDialog();
        },
    });

    // Update break schedule mutation
    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: typeof form }) =>
            api.patch(`/branches/${branchId}/break-schedules/${id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['branch-break-schedules', branchId] });
            handleCloseDialog();
        },
    });

    // Delete break schedule mutation
    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/branches/${branchId}/break-schedules/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['branch-break-schedules', branchId] });
        },
    });

    // Create default breaks mutation
    const createDefaultsMutation = useMutation({
        mutationFn: () => api.post(`/branches/${branchId}/break-schedules/create-defaults`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['branch-break-schedules', branchId] });
        },
    });

    const handleOpenDialog = (breakSchedule?: BreakSchedule) => {
        if (breakSchedule) {
            setSelectedBreak(breakSchedule);
            setForm({
                name: breakSchedule.name,
                nameEn: breakSchedule.nameEn || '',
                type: breakSchedule.type,
                startTime: breakSchedule.startTime,
                endTime: breakSchedule.endTime,
                isPaid: breakSchedule.isPaid,
                isActive: breakSchedule.isActive,
            });
        } else {
            setSelectedBreak(null);
            setForm({
                name: '',
                nameEn: '',
                type: 'LUNCH',
                startTime: '12:00',
                endTime: '13:00',
                isPaid: true,
                isActive: true,
            });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setSelectedBreak(null);
    };

    const handleSubmit = () => {
        if (selectedBreak) {
            updateMutation.mutate({ id: selectedBreak.id, data: form });
        } else {
            createMutation.mutate(form);
        }
    };

    const getTypeInfo = (type: string) => {
        return BREAK_TYPES.find(t => t.value === type) || BREAK_TYPES[4];
    };

    const calculateTotalBreakTime = () => {
        if (!breakSchedules) return { paid: 0, unpaid: 0 };
        return breakSchedules
            .filter(b => b.isActive)
            .reduce((acc, b) => {
                if (b.isPaid) {
                    acc.paid += b.durationMinutes;
                } else {
                    acc.unpaid += b.durationMinutes;
                }
                return acc;
            }, { paid: 0, unpaid: 0 });
    };

    const totalBreakTime = calculateTotalBreakTime();

    if (isLoading) {
        return (
            <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return <Alert severity="error">حدث خطأ في تحميل جداول الاستراحات</Alert>;
    }

    return (
        <Card>
            <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box>
                        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Coffee color="primary" />
                            جداول الاستراحات - {branchName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            إدارة أوقات الاستراحات الثابتة لهذا الفرع
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        {(!breakSchedules || breakSchedules.length === 0) && (
                            <Button
                                variant="outlined"
                                startIcon={<Refresh />}
                                onClick={() => createDefaultsMutation.mutate()}
                                disabled={createDefaultsMutation.isPending}
                            >
                                إنشاء الافتراضية
                            </Button>
                        )}
                        <Button
                            variant="contained"
                            startIcon={<Add />}
                            onClick={() => handleOpenDialog()}
                        >
                            إضافة استراحة
                        </Button>
                    </Box>
                </Box>

                {/* Summary */}
                <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                    <Chip
                        icon={<AccessTime />}
                        label={`وقت مدفوع: ${totalBreakTime.paid} دقيقة`}
                        color="success"
                        variant="outlined"
                    />
                    <Chip
                        icon={<AccessTime />}
                        label={`وقت غير مدفوع: ${totalBreakTime.unpaid} دقيقة`}
                        color="warning"
                        variant="outlined"
                    />
                </Box>

                {/* Table */}
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>الاستراحة</TableCell>
                                <TableCell>النوع</TableCell>
                                <TableCell>من</TableCell>
                                <TableCell>إلى</TableCell>
                                <TableCell>المدة</TableCell>
                                <TableCell>حالة الدفع</TableCell>
                                <TableCell>الحالة</TableCell>
                                <TableCell align="center">الإجراءات</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {breakSchedules?.map((breakS) => {
                                const typeInfo = getTypeInfo(breakS.type);
                                return (
                                    <TableRow key={breakS.id} hover>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <span>{typeInfo.icon}</span>
                                                <Typography fontWeight="bold">{breakS.name}</Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Chip label={typeInfo.label} size="small" variant="outlined" />
                                        </TableCell>
                                        <TableCell>{breakS.startTime}</TableCell>
                                        <TableCell>{breakS.endTime}</TableCell>
                                        <TableCell>
                                            <Chip
                                                label={`${breakS.durationMinutes} دقيقة`}
                                                size="small"
                                                color="primary"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={breakS.isPaid ? 'مدفوعة' : 'غير مدفوعة'}
                                                size="small"
                                                color={breakS.isPaid ? 'success' : 'default'}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={breakS.isActive ? 'مفعّلة' : 'معطّلة'}
                                                size="small"
                                                color={breakS.isActive ? 'success' : 'default'}
                                                variant={breakS.isActive ? 'filled' : 'outlined'}
                                            />
                                        </TableCell>
                                        <TableCell align="center">
                                            <IconButton size="small" onClick={() => handleOpenDialog(breakS)}>
                                                <Edit fontSize="small" />
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                color="error"
                                                onClick={() => {
                                                    if (confirm('هل أنت متأكد من حذف هذه الاستراحة؟')) {
                                                        deleteMutation.mutate(breakS.id);
                                                    }
                                                }}
                                            >
                                                <Delete fontSize="small" />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            {(!breakSchedules || breakSchedules.length === 0) && (
                                <TableRow>
                                    <TableCell colSpan={8} align="center">
                                        <Typography color="text.secondary" py={2}>
                                            لا توجد استراحات محددة. اضغط "إنشاء الافتراضية" لإضافة استراحات نموذجية.
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </CardContent>

            {/* Add/Edit Dialog */}
            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>
                    {selectedBreak ? 'تعديل الاستراحة' : 'إضافة استراحة جديدة'}
                </DialogTitle>
                <DialogContent sx={{ mt: 2 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <TextField
                            fullWidth
                            label="اسم الاستراحة (عربي) *"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            required
                            placeholder="مثال: استراحة الغداء"
                        />
                        <TextField
                            fullWidth
                            label="اسم الاستراحة (إنجليزي)"
                            value={form.nameEn}
                            onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
                            placeholder="Example: Lunch Break"
                        />
                        <TextField
                            select
                            fullWidth
                            label="نوع الاستراحة"
                            value={form.type}
                            onChange={(e) => setForm({ ...form, type: e.target.value as BreakSchedule['type'] })}
                        >
                            {BREAK_TYPES.map((type) => (
                                <MenuItem key={type.value} value={type.value}>
                                    {type.icon} {type.label}
                                </MenuItem>
                            ))}
                        </TextField>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField
                                fullWidth
                                label="وقت البداية"
                                type="time"
                                value={form.startTime}
                                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                                InputLabelProps={{ shrink: true }}
                            />
                            <TextField
                                fullWidth
                                label="وقت النهاية"
                                type="time"
                                value={form.endTime}
                                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Box>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={form.isPaid}
                                    onChange={(e) => setForm({ ...form, isPaid: e.target.checked })}
                                    color="success"
                                />
                            }
                            label="استراحة مدفوعة (لا تُخصم من ساعات العمل)"
                        />
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={form.isActive}
                                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                                />
                            }
                            label="مفعّلة"
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={handleCloseDialog}>إلغاء</Button>
                    <Button
                        variant="contained"
                        onClick={handleSubmit}
                        disabled={!form.name || createMutation.isPending || updateMutation.isPending}
                    >
                        {selectedBreak ? 'حفظ التعديلات' : 'إضافة'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Card>
    );
};

export default BranchBreakSchedules;
