import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    TextField,
    Button,
    MenuItem,
    Alert,
    CircularProgress,
    Divider,
    Table,
    TableBody,
    TableCell,
    TableRow,
    Chip,
    Autocomplete,
    InputAdornment,
    Tooltip,
    IconButton,
} from '@mui/material';
import { Calculate, WorkOff, MonetizationOn, Receipt, Edit, Check, Close } from '@mui/icons-material';
import { api } from '@/services/api.service';

interface User {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    hireDate?: string;
}

interface EosBreakdown {
    employeeId: string;
    employeeName: string;
    hireDate: string;
    lastWorkingDay: string;
    yearsOfService: number;
    monthsOfService: number;
    daysOfService: number;
    totalDaysOfService: number;
    baseSalary: number;
    reason: string;
    eosForFirst5Years: number;
    eosForRemaining: number;
    totalEos: number;
    eosAdjustmentFactor: number;
    adjustedEos: number;
    remainingLeaveDays: number;
    remainingLeaveDaysOverridden: boolean;
    leavePayout: number;
    outstandingLoans: number;
    netSettlement: number;
}

const reasonLabels: Record<string, string> = {
    RESIGNATION: 'استقالة',
    TERMINATION: 'إنهاء خدمات',
    END_OF_CONTRACT: 'انتهاء العقد',
    RETIREMENT: 'تقاعد',
    DEATH: 'وفاة',
};

export const EosCalculatorPage = () => {
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [reason, setReason] = useState('TERMINATION');
    const [lastWorkingDay, setLastWorkingDay] = useState(new Date().toISOString().split('T')[0]);
    const [result, setResult] = useState<EosBreakdown | null>(null);

    // Vacation days override
    const [overrideRemainingLeaveDays, setOverrideRemainingLeaveDays] = useState<number | null>(null);
    const [isEditingLeave, setIsEditingLeave] = useState(false);
    const [tempLeaveDays, setTempLeaveDays] = useState<string>('');

    const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
        queryKey: ['users-simple'],
        queryFn: async () => {
            const res = await api.get('/users?limit=500') as { data: User[] };
            return res.data;
        },
    });

    const calculateMutation = useMutation({
        mutationFn: async () => {
            if (!selectedUser) throw new Error('اختر موظف');
            const payload: any = { reason, lastWorkingDay };
            if (overrideRemainingLeaveDays !== null) {
                payload.overrideRemainingLeaveDays = overrideRemainingLeaveDays;
            }
            return api.post(`/eos/calculate/${selectedUser.id}`, payload) as Promise<EosBreakdown>;
        },
        onSuccess: (data) => setResult(data),
        onError: (err: any) => alert(err.response?.data?.message || 'حدث خطأ'),
    });

    // 🔴 تأكيد إنهاء الخدمات
    const terminateMutation = useMutation({
        mutationFn: async () => {
            if (!selectedUser) throw new Error('اختر موظف');
            const payload: any = { reason, lastWorkingDay };
            if (overrideRemainingLeaveDays !== null) {
                payload.overrideRemainingLeaveDays = overrideRemainingLeaveDays;
            }
            return api.post(`/eos/terminate/${selectedUser.id}`, payload);
        },
        onSuccess: () => {
            alert('✅ تم إنشاء طلب إنهاء الخدمات بنجاح! يجب الموافقة عليه من مدير HR.');
            setResult(null);
            setSelectedUser(null);
        },
        onError: (err: any) => alert(err.response?.data?.message || 'حدث خطأ'),
    });

    // Reset override when employee changes
    useEffect(() => {
        setOverrideRemainingLeaveDays(null);
        setResult(null);
    }, [selectedUser]);

    const formatCurrency = (n: number) => n.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ريال';

    const formatServiceDuration = (years: number, months: number, days: number) => {
        const parts = [];
        if (years > 0) parts.push(`${years} سنة`);
        if (months > 0) parts.push(`${months} شهر`);
        if (days > 0) parts.push(`${days} يوم`);
        return parts.join(' و ') || '0 يوم';
    };

    const handleEditLeave = () => {
        setTempLeaveDays(result?.remainingLeaveDays?.toString() || '0');
        setIsEditingLeave(true);
    };

    const handleConfirmLeave = () => {
        const days = parseInt(tempLeaveDays) || 0;
        setOverrideRemainingLeaveDays(days);
        setIsEditingLeave(false);
        // Recalculate with new leave days
        setTimeout(() => calculateMutation.mutate(), 100);
    };

    const handleCancelLeave = () => {
        setIsEditingLeave(false);
        setTempLeaveDays('');
    };

    return (
        <Box>
            <Typography variant="h4" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <WorkOff color="primary" /> حاسبة مكافأة نهاية الخدمة
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                احسب مكافأة نهاية الخدمة وفق نظام العمل السعودي (المادة 84-85)
            </Typography>

            <Grid container spacing={3}>
                {/* Form Card */}
                <Grid item xs={12} md={5}>
                    <Card>
                        <CardContent>
                            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>بيانات الحساب</Typography>
                            <Divider sx={{ mb: 2 }} />

                            <Autocomplete
                                options={users}
                                getOptionLabel={(u) => `${u.firstName} ${u.lastName} (${u.email})`}
                                value={selectedUser}
                                onChange={(_, v) => { setSelectedUser(v); setResult(null); }}
                                loading={usersLoading}
                                renderInput={(params) => (
                                    <TextField {...params} label="اختر الموظف" fullWidth sx={{ mb: 2 }} />
                                )}
                            />

                            <TextField
                                select
                                fullWidth
                                label="سبب إنهاء الخدمة"
                                value={reason}
                                onChange={(e) => { setReason(e.target.value); setResult(null); }}
                                sx={{ mb: 2 }}
                            >
                                <MenuItem value="RESIGNATION">استقالة</MenuItem>
                                <MenuItem value="TERMINATION">إنهاء خدمات (من الشركة)</MenuItem>
                                <MenuItem value="END_OF_CONTRACT">انتهاء العقد</MenuItem>
                                <MenuItem value="RETIREMENT">تقاعد</MenuItem>
                            </TextField>

                            <TextField
                                fullWidth
                                type="date"
                                label="تاريخ آخر يوم عمل"
                                value={lastWorkingDay}
                                onChange={(e) => { setLastWorkingDay(e.target.value); setResult(null); }}
                                InputLabelProps={{ shrink: true }}
                                sx={{ mb: 3 }}
                            />

                            <Button
                                variant="contained"
                                fullWidth
                                size="large"
                                startIcon={<Calculate />}
                                onClick={() => calculateMutation.mutate()}
                                disabled={!selectedUser || calculateMutation.isPending}
                            >
                                {calculateMutation.isPending ? <CircularProgress size={24} /> : 'حساب المكافأة'}
                            </Button>
                        </CardContent>
                    </Card>

                    <Alert severity="info" sx={{ mt: 2 }}>
                        <strong>قاعدة الحساب:</strong><br />
                        • أول 5 سنوات: نصف شهر عن كل سنة<br />
                        • ما بعدها: شهر كامل عن كل سنة<br />
                        • الاستقالة قبل سنتين: لا مكافأة<br />
                        • الاستقالة 2-5 سنوات: ثلث المكافأة<br />
                        • الاستقالة 5-10 سنوات: ثلثي المكافأة
                    </Alert>
                </Grid>

                {/* Result Card */}
                <Grid item xs={12} md={7}>
                    {result ? (
                        <Card sx={{ bgcolor: 'success.light', color: 'success.contrastText' }}>
                            <CardContent>
                                <Typography variant="h5" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Receipt /> تفاصيل التسوية النهائية
                                </Typography>
                                <Chip label={reasonLabels[result.reason] || result.reason} sx={{ mt: 1, bgcolor: 'white' }} />

                                <Box sx={{ bgcolor: 'white', borderRadius: 2, p: 2, mt: 2, color: 'text.primary' }}>
                                    <Table size="small">
                                        <TableBody>
                                            <TableRow>
                                                <TableCell>الموظف</TableCell>
                                                <TableCell align="left"><strong>{result.employeeName}</strong></TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell>تاريخ التعيين</TableCell>
                                                <TableCell>{new Date(result.hireDate).toLocaleDateString('ar-SA')}</TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell>آخر يوم عمل</TableCell>
                                                <TableCell>{new Date(result.lastWorkingDay).toLocaleDateString('ar-SA')}</TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell>مدة الخدمة</TableCell>
                                                <TableCell>
                                                    <strong>
                                                        {formatServiceDuration(
                                                            result.yearsOfService,
                                                            result.monthsOfService,
                                                            result.daysOfService
                                                        )}
                                                    </strong>
                                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                                        ({result.totalDaysOfService} يوم إجمالاً)
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell>الراتب الأساسي</TableCell>
                                                <TableCell>{formatCurrency(result.baseSalary)}</TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>

                                    <Divider sx={{ my: 2 }} />
                                    <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>تفاصيل المكافأة</Typography>
                                    <Table size="small">
                                        <TableBody>
                                            <TableRow>
                                                <TableCell>مكافأة أول 5 سنوات</TableCell>
                                                <TableCell align="left">{formatCurrency(result.eosForFirst5Years)}</TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell>مكافأة ما بعد 5 سنوات</TableCell>
                                                <TableCell>{formatCurrency(result.eosForRemaining)}</TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell>إجمالي المكافأة</TableCell>
                                                <TableCell><strong>{formatCurrency(result.totalEos)}</strong></TableCell>
                                            </TableRow>
                                            {result.eosAdjustmentFactor < 1 && (
                                                <TableRow sx={{ bgcolor: 'warning.light' }}>
                                                    <TableCell>تعديل الاستقالة ({Math.round(result.eosAdjustmentFactor * 100)}%)</TableCell>
                                                    <TableCell><strong>{formatCurrency(result.adjustedEos)}</strong></TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>

                                    <Divider sx={{ my: 2 }} />
                                    <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>الإضافات والخصومات</Typography>
                                    <Table size="small">
                                        <TableBody>
                                            <TableRow sx={{ bgcolor: 'success.light' }}>
                                                <TableCell>
                                                    + تعويض الإجازات
                                                    {isEditingLeave ? (
                                                        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, ml: 1 }}>
                                                            <TextField
                                                                size="small"
                                                                type="number"
                                                                value={tempLeaveDays}
                                                                onChange={(e) => setTempLeaveDays(e.target.value)}
                                                                sx={{ width: 80 }}
                                                                InputProps={{
                                                                    endAdornment: <InputAdornment position="end">يوم</InputAdornment>,
                                                                }}
                                                            />
                                                            <IconButton size="small" color="primary" onClick={handleConfirmLeave}>
                                                                <Check fontSize="small" />
                                                            </IconButton>
                                                            <IconButton size="small" color="error" onClick={handleCancelLeave}>
                                                                <Close fontSize="small" />
                                                            </IconButton>
                                                        </Box>
                                                    ) : (
                                                        <>
                                                            ({result.remainingLeaveDays} يوم)
                                                            {result.remainingLeaveDaysOverridden && (
                                                                <Chip label="معدّل" size="small" color="warning" sx={{ mx: 1 }} />
                                                            )}
                                                            <Tooltip title="تعديل عدد أيام الإجازة">
                                                                <IconButton size="small" onClick={handleEditLeave}>
                                                                    <Edit fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </>
                                                    )}
                                                </TableCell>
                                                <TableCell>{formatCurrency(result.leavePayout)}</TableCell>
                                            </TableRow>
                                            {/* الخصومات */}
                                            {result.outstandingLoans > 0 && (
                                                <TableRow sx={{ bgcolor: 'error.light' }}>
                                                    <TableCell>- سلف مستحقة</TableCell>
                                                    <TableCell>{formatCurrency(result.outstandingLoans)}</TableCell>
                                                </TableRow>
                                            )}
                                            {(result as any).unreturnedCustodyValue > 0 && (
                                                <TableRow sx={{ bgcolor: 'error.light' }}>
                                                    <TableCell>- عهد غير مرجعة</TableCell>
                                                    <TableCell>{formatCurrency((result as any).unreturnedCustodyValue)}</TableCell>
                                                </TableRow>
                                            )}
                                            {(result as any).outstandingDebts > 0 && (
                                                <TableRow sx={{ bgcolor: 'error.light' }}>
                                                    <TableCell>- ديون أخرى</TableCell>
                                                    <TableCell>{formatCurrency((result as any).outstandingDebts)}</TableCell>
                                                </TableRow>
                                            )}
                                            {(result as any).unpaidPenalties > 0 && (
                                                <TableRow sx={{ bgcolor: 'error.light' }}>
                                                    <TableCell>- جزاءات غير مسددة</TableCell>
                                                    <TableCell>{formatCurrency((result as any).unpaidPenalties)}</TableCell>
                                                </TableRow>
                                            )}
                                            {/* إجمالي الخصومات */}
                                            {(result as any).totalDeductions > 0 && (
                                                <TableRow sx={{ bgcolor: 'error.main', color: 'white' }}>
                                                    <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>إجمالي الخصومات</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>{formatCurrency((result as any).totalDeductions)}</TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>

                                    <Divider sx={{ my: 2 }} />
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'primary.main', color: 'white', p: 2, borderRadius: 2 }}>
                                        <Typography variant="h6">صافي التسوية النهائية</Typography>
                                        <Typography variant="h4" fontWeight="bold">{formatCurrency(result.netSettlement)}</Typography>
                                    </Box>

                                    {/* 🔴 زر تأكيد إنهاء الخدمات */}
                                    <Button
                                        variant="contained"
                                        color="error"
                                        fullWidth
                                        size="large"
                                        sx={{ mt: 3 }}
                                        startIcon={<WorkOff />}
                                        onClick={() => {
                                            if (window.confirm(`هل أنت متأكد من إنهاء خدمات الموظف "${result.employeeName}"؟\n\nصافي التسوية: ${formatCurrency(result.netSettlement)}`)) {
                                                terminateMutation.mutate();
                                            }
                                        }}
                                        disabled={terminateMutation.isPending}
                                    >
                                        {terminateMutation.isPending ? <CircularProgress size={24} color="inherit" /> : '🔴 تأكيد إنهاء الخدمات'}
                                    </Button>
                                </Box>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'grey.100' }}>
                            <CardContent sx={{ textAlign: 'center' }}>
                                <MonetizationOn sx={{ fontSize: 80, color: 'grey.400' }} />
                                <Typography color="text.secondary" sx={{ mt: 2 }}>اختر موظف وأدخل البيانات لحساب المكافأة</Typography>
                            </CardContent>
                        </Card>
                    )}
                </Grid>
            </Grid>
        </Box>
    );
};

export default EosCalculatorPage;
