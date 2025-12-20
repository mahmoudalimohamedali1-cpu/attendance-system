import { useState } from 'react';
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
} from '@mui/material';
import { Calculate, WorkOff, MonetizationOn, Receipt } from '@mui/icons-material';
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
    totalDaysOfService: number;
    baseSalary: number;
    reason: string;
    eosForFirst5Years: number;
    eosForRemaining: number;
    totalEos: number;
    eosAdjustmentFactor: number;
    adjustedEos: number;
    remainingLeaveDays: number;
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
            return api.post(`/eos/calculate/${selectedUser.id}`, { reason, lastWorkingDay }) as Promise<EosBreakdown>;
        },
        onSuccess: (data) => setResult(data),
        onError: (err: any) => alert(err.response?.data?.message || 'حدث خطأ'),
    });

    const formatCurrency = (n: number) => n.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ريال';

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
                                                <TableCell><strong>{result.yearsOfService} سنة و {result.monthsOfService} شهر</strong></TableCell>
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
                                                <TableCell>+ تعويض الإجازات ({result.remainingLeaveDays} يوم)</TableCell>
                                                <TableCell>{formatCurrency(result.leavePayout)}</TableCell>
                                            </TableRow>
                                            <TableRow sx={{ bgcolor: 'error.light' }}>
                                                <TableCell>- سلف مستحقة</TableCell>
                                                <TableCell>{formatCurrency(result.outstandingLoans)}</TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>

                                    <Divider sx={{ my: 2 }} />
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'primary.main', color: 'white', p: 2, borderRadius: 2 }}>
                                        <Typography variant="h6">صافي التسوية النهائية</Typography>
                                        <Typography variant="h4" fontWeight="bold">{formatCurrency(result.netSettlement)}</Typography>
                                    </Box>
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
