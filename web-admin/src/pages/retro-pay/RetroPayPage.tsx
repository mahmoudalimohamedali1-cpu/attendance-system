import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Box, Card, Typography, Grid, TextField, Button,
    CircularProgress, Chip, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, IconButton,
    Dialog, DialogTitle, DialogContent, DialogActions, Autocomplete,
} from '@mui/material';
import { Add, Check, Close, AccountBalance, MoreTime } from '@mui/icons-material';
import { api } from '@/services/api.service';

interface User {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
}

interface RetroPay {
    id: string;
    employeeId: string;
    employee: User;
    reason: string;
    effectiveFrom: string;
    effectiveTo: string;
    oldAmount: number;
    newAmount: number;
    difference: number;
    monthsCount: number;
    totalAmount: number;
    status: string;
    notes?: string;
    createdAt: string;
}

const statusLabels: Record<string, { label: string; color: any }> = {
    PENDING: { label: 'في الانتظار', color: 'warning' },
    APPROVED: { label: 'معتمد', color: 'info' },
    PAID: { label: 'مدفوع', color: 'success' },
    CANCELLED: { label: 'ملغي', color: 'error' },
};

export const RetroPayPage = () => {
    const queryClient = useQueryClient();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [formData, setFormData] = useState({
        employeeId: '',
        reason: '',
        effectiveFrom: '',
        effectiveTo: '',
        oldAmount: 0,
        newAmount: 0,
        notes: '',
    });
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    const { data: retroPays = [], isLoading } = useQuery<RetroPay[]>({
        queryKey: ['retro-pays'],
        queryFn: () => api.get('/retro-pay') as Promise<RetroPay[]>,
    });

    const { data: users = [] } = useQuery<User[]>({
        queryKey: ['users-simple'],
        queryFn: async () => {
            const res = await api.get('/users?limit=500') as { data: User[] };
            return res.data;
        },
    });

    const createMutation = useMutation({
        mutationFn: (data: typeof formData) => api.post('/retro-pay', { ...data, employeeId: selectedUser?.id }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['retro-pays'] });
            setDialogOpen(false);
            setFormData({ employeeId: '', reason: '', effectiveFrom: '', effectiveTo: '', oldAmount: 0, newAmount: 0, notes: '' });
            setSelectedUser(null);
        },
    });

    const approveMutation = useMutation({
        mutationFn: (id: string) => api.patch(`/retro-pay/${id}/approve`, {}),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['retro-pays'] }),
    });

    const payMutation = useMutation({
        mutationFn: (id: string) => api.patch(`/retro-pay/${id}/pay`, {}),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['retro-pays'] }),
    });

    const cancelMutation = useMutation({
        mutationFn: (id: string) => api.patch(`/retro-pay/${id}/cancel`, {}),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['retro-pays'] }),
    });

    const formatCurrency = (n: number) => `${n.toLocaleString('ar-SA')} ريال`;

    if (isLoading) return <CircularProgress />;

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box>
                    <Typography variant="h4" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <MoreTime color="primary" /> الفروقات (Retro Pay)
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        إدارة فروقات الرواتب للموظفين
                    </Typography>
                </Box>
                <Button variant="contained" startIcon={<Add />} onClick={() => setDialogOpen(true)}>
                    إضافة فرق جديد
                </Button>
            </Box>

            <Card>
                <TableContainer>
                    <Table>
                        <TableHead sx={{ bgcolor: 'grey.50' }}>
                            <TableRow>
                                <TableCell>الموظف</TableCell>
                                <TableCell>السبب</TableCell>
                                <TableCell>الفترة</TableCell>
                                <TableCell>الفرق الشهري</TableCell>
                                <TableCell>عدد الشهور</TableCell>
                                <TableCell>الإجمالي</TableCell>
                                <TableCell>الحالة</TableCell>
                                <TableCell align="center">الإجراءات</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {retroPays.map((rp) => (
                                <TableRow key={rp.id} hover>
                                    <TableCell>{rp.employee.firstName} {rp.employee.lastName}</TableCell>
                                    <TableCell>{rp.reason}</TableCell>
                                    <TableCell>
                                        {new Date(rp.effectiveFrom).toLocaleDateString('ar-SA')} - {new Date(rp.effectiveTo).toLocaleDateString('ar-SA')}
                                    </TableCell>
                                    <TableCell sx={{ color: rp.difference > 0 ? 'success.main' : 'error.main' }}>
                                        {formatCurrency(rp.difference)}
                                    </TableCell>
                                    <TableCell>{rp.monthsCount} شهر</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>{formatCurrency(rp.totalAmount)}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={statusLabels[rp.status]?.label || rp.status}
                                            color={statusLabels[rp.status]?.color || 'default'}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell align="center">
                                        {rp.status === 'PENDING' && (
                                            <>
                                                <IconButton color="success" onClick={() => approveMutation.mutate(rp.id)} title="اعتماد">
                                                    <Check />
                                                </IconButton>
                                                <IconButton color="error" onClick={() => cancelMutation.mutate(rp.id)} title="إلغاء">
                                                    <Close />
                                                </IconButton>
                                            </>
                                        )}
                                        {rp.status === 'APPROVED' && (
                                            <IconButton color="primary" onClick={() => payMutation.mutate(rp.id)} title="تسجيل الصرف">
                                                <AccountBalance />
                                            </IconButton>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {retroPays.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                                        <Typography color="text.secondary">لا يوجد فروقات مسجلة</Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>

            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>إضافة فرق راتب</DialogTitle>
                <DialogContent dividers>
                    <Grid container spacing={2} sx={{ mt: 0 }}>
                        <Grid item xs={12}>
                            <Autocomplete
                                options={users}
                                getOptionLabel={(u) => `${u.firstName} ${u.lastName}`}
                                value={selectedUser}
                                onChange={(_, v) => setSelectedUser(v)}
                                renderInput={(params) => <TextField {...params} label="اختر الموظف" required />}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="سبب الفرق"
                                value={formData.reason}
                                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                placeholder="مثال: زيادة راتب، تصحيح خطأ حسابي"
                                required
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                fullWidth
                                type="date"
                                label="من تاريخ"
                                value={formData.effectiveFrom}
                                onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })}
                                InputLabelProps={{ shrink: true }}
                                required
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                fullWidth
                                type="date"
                                label="إلى تاريخ"
                                value={formData.effectiveTo}
                                onChange={(e) => setFormData({ ...formData, effectiveTo: e.target.value })}
                                InputLabelProps={{ shrink: true }}
                                required
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                fullWidth
                                type="number"
                                label="المبلغ القديم"
                                value={formData.oldAmount}
                                onChange={(e) => setFormData({ ...formData, oldAmount: parseFloat(e.target.value) })}
                                required
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                fullWidth
                                type="number"
                                label="المبلغ الجديد"
                                value={formData.newAmount}
                                onChange={(e) => setFormData({ ...formData, newAmount: parseFloat(e.target.value) })}
                                required
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="ملاحظات"
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                multiline
                                rows={2}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
                    <Button
                        variant="contained"
                        onClick={() => createMutation.mutate(formData)}
                        disabled={!selectedUser || !formData.reason || createMutation.isPending}
                    >
                        حفظ
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default RetroPayPage;
