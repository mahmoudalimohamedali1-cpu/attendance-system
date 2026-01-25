import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Box, Card, Typography, Grid, TextField, Button,
    CircularProgress, Chip, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, IconButton,
    Dialog, DialogTitle, DialogContent, DialogActions, Autocomplete,
    FormControl, FormLabel, RadioGroup, FormControlLabel, Radio,
    Divider, Alert, Collapse,
} from '@mui/material';
import { Add, Check, Close, AccountBalance, MoreTime, Delete } from '@mui/icons-material';
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
    paymentMonth?: number;
    paymentYear?: number;
    createdAt: string;
}

interface Installment {
    month: number;
    year: number;
    amount: number;
}

const statusLabels: Record<string, { label: string; color: any }> = {
    PENDING: { label: 'في الانتظار', color: 'warning' },
    APPROVED: { label: 'معتمد', color: 'info' },
    PAID: { label: 'مدفوع', color: 'success' },
    CANCELLED: { label: 'ملغي', color: 'error' },
};

const monthNames = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

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
        paymentMonth: new Date().getMonth() + 1,
        paymentYear: new Date().getFullYear(),
        distributionMode: 'SINGLE' as 'SINGLE' | 'EQUAL_SPLIT' | 'CUSTOM_AMOUNTS',
        installmentCount: 3,
    });
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [customInstallments, setCustomInstallments] = useState<Installment[]>([]);

    // حساب الإجمالي
    const difference = formData.newAmount - formData.oldAmount;
    const calculateMonths = () => {
        if (!formData.effectiveFrom || !formData.effectiveTo) return 1;
        const from = new Date(formData.effectiveFrom);
        const to = new Date(formData.effectiveTo);
        const yearDiff = to.getFullYear() - from.getFullYear();
        const monthDiff = to.getMonth() - from.getMonth();
        return yearDiff * 12 + monthDiff + 1;
    };
    const monthsCount = calculateMonths();
    const totalAmount = difference * monthsCount;

    // تحديث الأقساط عند تغيير البيانات
    useEffect(() => {
        if (formData.distributionMode === 'EQUAL_SPLIT') {
            const count = formData.installmentCount;
            const amountPerInstallment = Math.floor((totalAmount * 100) / count) / 100;
            const remainder = Math.round((totalAmount - (amountPerInstallment * count)) * 100) / 100;

            const newInstallments: Installment[] = [];
            let month = formData.paymentMonth;
            let year = formData.paymentYear;

            for (let i = 0; i < count; i++) {
                newInstallments.push({
                    month,
                    year,
                    amount: i === 0 ? amountPerInstallment + remainder : amountPerInstallment,
                });
                month++;
                if (month > 12) {
                    month = 1;
                    year++;
                }
            }
            setCustomInstallments(newInstallments);
        } else if (formData.distributionMode === 'CUSTOM_AMOUNTS' && customInstallments.length === 0) {
            // إنشاء قسطين افتراضيين
            setCustomInstallments([
                { month: formData.paymentMonth, year: formData.paymentYear, amount: totalAmount / 2 },
                { month: formData.paymentMonth + 1 > 12 ? 1 : formData.paymentMonth + 1, year: formData.paymentMonth + 1 > 12 ? formData.paymentYear + 1 : formData.paymentYear, amount: totalAmount / 2 },
            ]);
        }
    }, [formData.distributionMode, formData.installmentCount, totalAmount, formData.paymentMonth, formData.paymentYear]);

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
        mutationFn: (data: any) => api.post('/retro-pay', {
            ...data,
            employeeId: selectedUser?.id,
            installments: data.distributionMode === 'CUSTOM_AMOUNTS' ? customInstallments : undefined,
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['retro-pays'] });
            setDialogOpen(false);
            resetForm();
        },
    });

    const resetForm = () => {
        setFormData({
            employeeId: '', reason: '', effectiveFrom: '', effectiveTo: '',
            oldAmount: 0, newAmount: 0, notes: '',
            paymentMonth: new Date().getMonth() + 1, paymentYear: new Date().getFullYear(),
            distributionMode: 'SINGLE', installmentCount: 3,
        });
        setSelectedUser(null);
        setCustomInstallments([]);
    };

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

    const addCustomInstallment = () => {
        const lastInst = customInstallments[customInstallments.length - 1];
        let nextMonth = lastInst ? lastInst.month + 1 : formData.paymentMonth;
        let nextYear = lastInst ? lastInst.year : formData.paymentYear;
        if (nextMonth > 12) { nextMonth = 1; nextYear++; }
        setCustomInstallments([...customInstallments, { month: nextMonth, year: nextYear, amount: 0 }]);
    };

    const removeCustomInstallment = (index: number) => {
        setCustomInstallments(customInstallments.filter((_, i) => i !== index));
    };

    const updateCustomInstallment = (index: number, field: keyof Installment, value: number) => {
        const updated = [...customInstallments];
        updated[index] = { ...updated[index], [field]: value };
        setCustomInstallments(updated);
    };

    const installmentsTotal = customInstallments.reduce((sum, inst) => sum + inst.amount, 0);
    const amountMismatch = Math.abs(installmentsTotal - totalAmount) > 0.01;

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
                                <TableCell>شهر الصرف</TableCell>
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
                                        {rp.paymentMonth && rp.paymentYear
                                            ? `${monthNames[rp.paymentMonth - 1]} ${rp.paymentYear}`
                                            : '-'}
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

            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>إضافة فرق راتب</DialogTitle>
                <DialogContent dividers>
                    <Grid container spacing={2} sx={{ mt: 0 }}>
                        {/* بيانات الموظف والفرق */}
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
                                fullWidth type="date" label="من تاريخ"
                                value={formData.effectiveFrom}
                                onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })}
                                InputLabelProps={{ shrink: true }} required
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                fullWidth type="date" label="إلى تاريخ"
                                value={formData.effectiveTo}
                                onChange={(e) => setFormData({ ...formData, effectiveTo: e.target.value })}
                                InputLabelProps={{ shrink: true }} required
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                fullWidth type="number" label="المبلغ القديم"
                                value={formData.oldAmount}
                                onChange={(e) => setFormData({ ...formData, oldAmount: parseFloat(e.target.value) || 0 })}
                                required
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                fullWidth type="number" label="المبلغ الجديد"
                                value={formData.newAmount}
                                onChange={(e) => setFormData({ ...formData, newAmount: parseFloat(e.target.value) || 0 })}
                                required
                            />
                        </Grid>

                        {/* ملخص الحساب */}
                        {totalAmount !== 0 && (
                            <Grid item xs={12}>
                                <Alert severity="info" sx={{ mt: 1 }}>
                                    <strong>الفرق الشهري:</strong> {formatCurrency(difference)} × <strong>{monthsCount} شهر</strong> = <strong>{formatCurrency(totalAmount)}</strong>
                                </Alert>
                            </Grid>
                        )}

                        <Grid item xs={12}><Divider sx={{ my: 1 }} /></Grid>

                        {/* 🆕 طريقة التوزيع */}
                        <Grid item xs={12}>
                            <FormControl component="fieldset">
                                <FormLabel component="legend" sx={{ fontWeight: 'bold', mb: 1 }}>📅 طريقة الصرف</FormLabel>
                                <RadioGroup
                                    row
                                    value={formData.distributionMode}
                                    onChange={(e) => setFormData({ ...formData, distributionMode: e.target.value as any })}
                                >
                                    <FormControlLabel value="SINGLE" control={<Radio />} label="دفعة واحدة" />
                                    <FormControlLabel value="EQUAL_SPLIT" control={<Radio />} label="توزيع بالتساوي" />
                                    <FormControlLabel value="CUSTOM_AMOUNTS" control={<Radio />} label="مبالغ مخصصة" />
                                </RadioGroup>
                            </FormControl>
                        </Grid>

                        {/* شهر الصرف للدفعة الواحدة */}
                        <Collapse in={formData.distributionMode === 'SINGLE'} sx={{ width: '100%' }}>
                            <Grid container spacing={2} sx={{ pl: 2, pr: 2, pt: 1 }}>
                                <Grid item xs={6}>
                                    <TextField
                                        fullWidth select label="شهر الصرف"
                                        value={formData.paymentMonth}
                                        onChange={(e) => setFormData({ ...formData, paymentMonth: parseInt(e.target.value) })}
                                        SelectProps={{ native: true }}
                                    >
                                        {monthNames.map((name, i) => <option key={i} value={i + 1}>{name}</option>)}
                                    </TextField>
                                </Grid>
                                <Grid item xs={6}>
                                    <TextField
                                        fullWidth type="number" label="السنة"
                                        value={formData.paymentYear}
                                        onChange={(e) => setFormData({ ...formData, paymentYear: parseInt(e.target.value) })}
                                    />
                                </Grid>
                            </Grid>
                        </Collapse>

                        {/* التوزيع بالتساوي */}
                        <Collapse in={formData.distributionMode === 'EQUAL_SPLIT'} sx={{ width: '100%' }}>
                            <Grid container spacing={2} sx={{ pl: 2, pr: 2, pt: 1 }}>
                                <Grid item xs={4}>
                                    <TextField
                                        fullWidth type="number" label="عدد الأقساط"
                                        value={formData.installmentCount}
                                        onChange={(e) => setFormData({ ...formData, installmentCount: Math.max(2, parseInt(e.target.value) || 2) })}
                                        inputProps={{ min: 2, max: 24 }}
                                    />
                                </Grid>
                                <Grid item xs={4}>
                                    <TextField
                                        fullWidth select label="بداية من شهر"
                                        value={formData.paymentMonth}
                                        onChange={(e) => setFormData({ ...formData, paymentMonth: parseInt(e.target.value) })}
                                        SelectProps={{ native: true }}
                                    >
                                        {monthNames.map((name, i) => <option key={i} value={i + 1}>{name}</option>)}
                                    </TextField>
                                </Grid>
                                <Grid item xs={4}>
                                    <TextField
                                        fullWidth type="number" label="السنة"
                                        value={formData.paymentYear}
                                        onChange={(e) => setFormData({ ...formData, paymentYear: parseInt(e.target.value) })}
                                    />
                                </Grid>
                                {customInstallments.length > 0 && (
                                    <Grid item xs={12}>
                                        <Alert severity="success">
                                            <strong>معاينة الأقساط:</strong><br />
                                            {customInstallments.map((inst, i) => (
                                                <span key={i}>{monthNames[inst.month - 1]} {inst.year}: {formatCurrency(inst.amount)}{i < customInstallments.length - 1 ? ' | ' : ''}</span>
                                            ))}
                                        </Alert>
                                    </Grid>
                                )}
                            </Grid>
                        </Collapse>

                        {/* المبالغ المخصصة */}
                        <Collapse in={formData.distributionMode === 'CUSTOM_AMOUNTS'} sx={{ width: '100%' }}>
                            <Box sx={{ pl: 2, pr: 2, pt: 1 }}>
                                <Typography variant="subtitle2" sx={{ mb: 1 }}>حدد الأقساط يدوياً:</Typography>
                                {customInstallments.map((inst, index) => (
                                    <Grid container spacing={1} key={index} sx={{ mb: 1 }}>
                                        <Grid item xs={4}>
                                            <TextField
                                                fullWidth select size="small" label="الشهر"
                                                value={inst.month}
                                                onChange={(e) => updateCustomInstallment(index, 'month', parseInt(e.target.value))}
                                                SelectProps={{ native: true }}
                                            >
                                                {monthNames.map((name, i) => <option key={i} value={i + 1}>{name}</option>)}
                                            </TextField>
                                        </Grid>
                                        <Grid item xs={3}>
                                            <TextField
                                                fullWidth type="number" size="small" label="السنة"
                                                value={inst.year}
                                                onChange={(e) => updateCustomInstallment(index, 'year', parseInt(e.target.value))}
                                            />
                                        </Grid>
                                        <Grid item xs={4}>
                                            <TextField
                                                fullWidth type="number" size="small" label="المبلغ"
                                                value={inst.amount}
                                                onChange={(e) => updateCustomInstallment(index, 'amount', parseFloat(e.target.value) || 0)}
                                            />
                                        </Grid>
                                        <Grid item xs={1}>
                                            <IconButton color="error" onClick={() => removeCustomInstallment(index)} disabled={customInstallments.length <= 2}>
                                                <Delete />
                                            </IconButton>
                                        </Grid>
                                    </Grid>
                                ))}
                                <Button size="small" onClick={addCustomInstallment} sx={{ mt: 1 }}>+ إضافة قسط</Button>

                                {amountMismatch && (
                                    <Alert severity="error" sx={{ mt: 1 }}>
                                        مجموع الأقساط ({formatCurrency(installmentsTotal)}) لا يساوي المبلغ الإجمالي ({formatCurrency(totalAmount)})
                                    </Alert>
                                )}
                            </Box>
                        </Collapse>

                        <Grid item xs={12}>
                            <TextField
                                fullWidth label="ملاحظات"
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                multiline rows={2}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => { setDialogOpen(false); resetForm(); }}>إلغاء</Button>
                    <Button
                        variant="contained"
                        onClick={() => createMutation.mutate(formData)}
                        disabled={
                            !selectedUser || !formData.reason || createMutation.isPending ||
                            (formData.distributionMode === 'CUSTOM_AMOUNTS' && amountMismatch)
                        }
                    >
                        حفظ
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default RetroPayPage;
