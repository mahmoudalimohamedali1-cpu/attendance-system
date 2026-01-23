import React, { useState, useEffect } from 'react';
import {
    Box, Card, CardContent, Typography, Button, TextField, Grid, Alert,
    CircularProgress, Chip, IconButton, Divider, Tab, Tabs, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Paper, Dialog, DialogTitle,
    DialogContent, DialogActions, Tooltip, Stack,
} from '@mui/material';
import {
    Refresh, Settings, Info, CreditCard, FlightTakeoff, FlightLand,
    Badge, Assignment, Print, History, Add, CheckCircle, Warning, Error
} from '@mui/icons-material';
import { muqeemApi, MuqeemTransactionType, MuqeemTransaction } from '../../../services/muqeem.service';
import dayjs from 'dayjs';

interface MuqeemConfig {
    username: string;
    isActive: boolean;
    iqamaExpiryDays: number;
    passportExpiryDays: number;
    enableNotifications: boolean;
}

const MuqeemManagementPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState(0);
    const [loading, setLoading] = useState(true);
    const [executing, setExecuting] = useState(false);
    const [transactions, setTransactions] = useState<MuqeemTransaction[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [config, setConfig] = useState<MuqeemConfig | null>(null);
    const [showConfigAlert, setShowConfigAlert] = useState(false);

    // Action Dialog State
    const [actionDialogOpen, setActionDialogOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
    const [currentActionType, setCurrentActionType] = useState<MuqeemTransactionType | null>(null);
    const [actionPayload, setActionPayload] = useState<any>({ years: 1, duration: 30 });
    const [robotStatus, setRobotStatus] = useState<{ status: string; message: string }>({ status: 'IDLE', message: '' });
    const [otpValue, setOtpValue] = useState('');
    const [currentTransactionId, setCurrentTransactionId] = useState<string | null>(null);
    const [pollingActive, setPollingActive] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [txData, configData, empData] = await Promise.all([
                muqeemApi.getTransactions(),
                muqeemApi.getConfig().catch(() => null),
                muqeemApi.getEligibleEmployees().catch(() => []),
            ]);
            setTransactions(txData.items);
            setEmployees(empData || []);
            const data = configData as MuqeemConfig;
            setConfig(data);
            if (!data || !data.isActive) {
                setShowConfigAlert(true);
            }
        } catch (error) {
            console.error('Failed to load Muqeem data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenAction = (employee: any, type: MuqeemTransactionType) => {
        setSelectedEmployee(employee);
        setCurrentActionType(type);
        // Default values
        if (type === MuqeemTransactionType.IQAMA_RENEW) setActionPayload({ years: 1 });
        if (type === MuqeemTransactionType.VISA_EXIT_REENTRY_ISSUE) setActionPayload({ duration: 30 });
        setActionDialogOpen(true);
    };

    // Polling effect for robot status
    useEffect(() => {
        let interval: any;
        if (currentTransactionId && pollingActive) {
            interval = setInterval(async () => {
                try {
                    const res = await muqeemApi.getTransactionStatus(currentTransactionId);
                    setRobotStatus(res);

                    if (res.status === 'COMPLETED' || res.status === 'FAILED') {
                        setPollingActive(false);
                        if (res.status === 'COMPLETED') {
                            alert(res.message);
                            setActionDialogOpen(false);
                            loadData();
                        } else {
                            alert(`فشلت العملية: ${res.message}`);
                        }
                    }
                } catch (error) {
                    console.error('Status polling failed:', error);
                }
            }, 2000);
        }
        return () => clearInterval(interval);
    }, [currentTransactionId, pollingActive]);

    const handleExecute = async () => {
        if (!selectedEmployee || !currentActionType) return;

        try {
            setExecuting(true);
            const res = await muqeemApi.executeTransaction({
                userId: selectedEmployee.id,
                type: currentActionType,
                payload: actionPayload
            }) as any;

            if (res.success) {
                setCurrentTransactionId(res.transactionId);
                setRobotStatus({ status: 'NAVIGATING', message: res.message });
                setPollingActive(true);
            } else {
                alert(`خطأ: ${res.message}`);
            }
        } catch (error: any) {
            alert(error.response?.data?.message || 'فشلت العملية');
            setExecuting(false);
        }
    };

    const handleResolveOtp = async () => {
        if (!currentTransactionId || !otpValue) return;
        try {
            setExecuting(true);
            await muqeemApi.resolveOtp(currentTransactionId, otpValue);
            setOtpValue('');
        } catch (error: any) {
            alert('فشل إرسال الرمز');
        } finally {
            setExecuting(false);
        }
    };

    if (loading) return <Box p={3}><CircularProgress /></Box>;

    return (
        <Box p={3}>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box>
                    <Typography variant="h4" fontWeight="bold" display="flex" alignItems="center" gap={1}>
                        <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: '#1a4f8a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Typography color="white" fontWeight="bold">M</Typography>
                        </Box>
                        إدارة منصة مقيم
                    </Typography>
                    <Typography color="text.secondary" mt={0.5}>
                        تكامل الخدمات الإلكترونية للجوازات والإقامة (المملكة العربية السعودية)
                    </Typography>
                </Box>
                <Box>
                    <Button variant="outlined" startIcon={<Settings />} href="/settings/muqeem">
                        إعدادات الربط
                    </Button>
                </Box>
            </Box>

            {showConfigAlert && (
                <Alert severity="warning" sx={{ mb: 3 }} action={
                    <Button color="inherit" size="small" href="/settings/muqeem">تعديل الإعدادات</Button>
                }>
                    منصة مقيم غير مفعلة حالياً. يرجى إدخال بيانات الوصول لتفعيل العمليات.
                </Alert>
            )}

            {/* Tabs */}
            <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
                <Tab icon={<CreditCard />} iconPosition="start" label="الإقامات" />
                <Tab icon={<FlightTakeoff />} iconPosition="start" label="الجوازات والتأشيرات" />
                <Tab icon={<History />} iconPosition="start" label="سجل العمليات" />
            </Tabs>

            {/* Content based on Active Tab */}
            <Card>
                <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h6">
                            {activeTab === 0 && 'إدارة الإقامات (Iqama)'}
                            {activeTab === 1 && 'إدارة التأشيرات والجوازات'}
                            {activeTab === 2 && 'جميع الحركات السابقة'}
                        </Typography>
                        <Button startIcon={<Refresh />} onClick={loadData}>تحديث العرض</Button>
                    </Box>

                    {activeTab === 0 && (
                        <TableContainer component={Paper} variant="outlined">
                            <Table>
                                <TableHead sx={{ bgcolor: 'grey.50' }}>
                                    <TableRow>
                                        <TableCell>الموظف</TableCell>
                                        <TableCell>رقم الإقامة</TableCell>
                                        <TableCell>تاريخ الانتهاء</TableCell>
                                        <TableCell>الحالة</TableCell>
                                        <TableCell align="center">الإجراءات</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {employees.map((emp) => {
                                        const isExpired = emp.iqamaExpiryDate && new Date(emp.iqamaExpiryDate) < new Date();
                                        return (
                                            <TableRow key={emp.id}>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight="medium">{emp.firstName} {emp.lastName}</Typography>
                                                    <Typography variant="caption" color="text.secondary">{emp.employeeCode} - {emp.jobTitle}</Typography>
                                                </TableCell>
                                                <TableCell>{emp.nationalId}</TableCell>
                                                <TableCell>{emp.iqamaExpiryDate ? dayjs(emp.iqamaExpiryDate).format('YYYY/MM/DD') : '-'}</TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={isExpired ? 'منتهية' : 'سارية'}
                                                        color={isExpired ? 'error' : 'success'}
                                                        size="small"
                                                    />
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Stack direction="row" spacing={1} justifyContent="center">
                                                        <Button size="small" variant="contained" onClick={() => handleOpenAction(emp, MuqeemTransactionType.IQAMA_RENEW)}>تجديد</Button>
                                                        <Button size="small" variant="outlined">تحديث بيانات</Button>
                                                    </Stack>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                    {employees.length === 0 && (
                                        <TableRow><TableCell colSpan={5} align="center">لا يوجد موظفين غير سعوديين</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}

                    {activeTab === 1 && (
                        <TableContainer component={Paper} variant="outlined">
                            <Table>
                                <TableHead sx={{ bgcolor: 'grey.50' }}>
                                    <TableRow>
                                        <TableCell>الموظف</TableCell>
                                        <TableCell>جواز السفر</TableCell>
                                        <TableCell>انتهاء الجواز</TableCell>
                                        <TableCell align="center">تأشيرات</TableCell>
                                        <TableCell align="center">إجراءات أخرى</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {employees.map((emp) => (
                                        <TableRow key={emp.id}>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight="medium">{emp.firstName} {emp.lastName}</Typography>
                                                <Typography variant="caption" color="text.secondary">{emp.employeeCode}</Typography>
                                            </TableCell>
                                            <TableCell>{emp.passportNumber || '-'}</TableCell>
                                            <TableCell>{emp.passportExpiryDate ? dayjs(emp.passportExpiryDate).format('YYYY/MM/DD') : '-'}</TableCell>
                                            <TableCell align="center">
                                                <Stack direction="row" spacing={1} justifyContent="center">
                                                    <Button size="small" variant="outlined" color="info" onClick={() => handleOpenAction(emp, MuqeemTransactionType.VISA_EXIT_REENTRY_ISSUE)}>خروج وعودة</Button>
                                                    <Button size="small" variant="outlined" color="error" onClick={() => handleOpenAction(emp, MuqeemTransactionType.VISA_FINAL_EXIT_ISSUE)}>خروج نهائي</Button>
                                                </Stack>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Button size="small" startIcon={<Refresh />} onClick={() => handleOpenAction(emp, MuqeemTransactionType.PASSPORT_RENEW)}>تحديث الجواز</Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}

                    {activeTab === 2 && (
                        <TableContainer component={Paper} variant="outlined">
                            <Table size="small">
                                <TableHead sx={{ bgcolor: 'grey.50' }}>
                                    <TableRow>
                                        <TableCell>الموظف</TableCell>
                                        <TableCell>نوع العملية</TableCell>
                                        <TableCell>الحالة</TableCell>
                                        <TableCell>المرجع</TableCell>
                                        <TableCell>التاريخ</TableCell>
                                        <TableCell>الإجراء</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {transactions.map((tx) => (
                                        <TableRow key={tx.id}>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight="medium">{tx.user?.firstName} {tx.user?.lastName}</Typography>
                                                <Typography variant="caption" color="text.secondary">{tx.user?.employeeCode}</Typography>
                                            </TableCell>
                                            <TableCell>{tx.type}</TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={tx.status}
                                                    size="small"
                                                    color={tx.status === 'COMPLETED' ? 'success' : tx.status === 'FAILED' ? 'error' : 'warning'}
                                                />
                                            </TableCell>
                                            <TableCell>{tx.externalRef || '-'}</TableCell>
                                            <TableCell>{new Date(tx.createdAt).toLocaleString('ar-SA')}</TableCell>
                                            <TableCell>
                                                {tx.fileUrl && (
                                                    <IconButton size="small" component="a" href={tx.fileUrl} target="_blank">
                                                        <Print fontSize="small" />
                                                    </IconButton>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </CardContent>
            </Card>

            {/* Muqeem Action Dialog */}
            <Dialog open={actionDialogOpen} onClose={() => setActionDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    <Box display="flex" alignItems="center" gap={1}>
                        <CheckCircle color="primary" />
                        تأكيد العملية - {selectedEmployee?.firstName} {selectedEmployee?.lastName}
                    </Box>
                </DialogTitle>
                <DialogContent dividers>
                    <Box py={2}>
                        <Typography variant="subtitle1" mb={2} fontWeight="bold">
                            {currentActionType === MuqeemTransactionType.IQAMA_RENEW && 'تجديد الإقامة'}
                            {currentActionType === MuqeemTransactionType.VISA_EXIT_REENTRY_ISSUE && 'إصدار تأشيرة خروج وعودة'}
                            {currentActionType === MuqeemTransactionType.VISA_FINAL_EXIT_ISSUE && 'إصدار تأشيرة خروج نهائي'}
                            {currentActionType === MuqeemTransactionType.PASSPORT_RENEW && 'تحديث بيانات جواز السفر'}
                        </Typography>

                        {currentActionType === MuqeemTransactionType.IQAMA_RENEW && (
                            <TextField
                                fullWidth
                                type="number"
                                label="مدة التجديد (بالسنوات)"
                                value={actionPayload.years}
                                onChange={(e) => setActionPayload({ ...actionPayload, years: parseInt(e.target.value) })}
                                inputProps={{ min: 1, max: 5 }}
                            />
                        )}

                        {currentActionType === MuqeemTransactionType.VISA_EXIT_REENTRY_ISSUE && (
                            <TextField
                                fullWidth
                                type="number"
                                label="مدة التأشيرة (بالأيام)"
                                value={actionPayload.duration}
                                onChange={(e) => setActionPayload({ ...actionPayload, duration: parseInt(e.target.value) })}
                                inputProps={{ min: 1 }}
                                helperText="سيتم إصدار تأشيرة خروج وعودة للمدة المحددة"
                            />
                        )}

                        {currentActionType === MuqeemTransactionType.VISA_FINAL_EXIT_ISSUE && (
                            <Alert severity="warning">
                                تحذير: هذا الإجراء سيصدر تأشيرة خروج نهائي للموظف. هل أنت متأكد؟
                            </Alert>
                        )}

                        {currentActionType === MuqeemTransactionType.PASSPORT_RENEW && (
                            <Typography variant="body2" color="text.secondary">
                                سيتم تحديث بيانات جواز السفر من قاعدة بيانات وزارة الداخلية.
                            </Typography>
                        )}

                        <Box mt={3} p={2} bgcolor="grey.50" borderRadius={1} border={1} borderColor="divider">
                            <Grid container spacing={1}>
                                <Grid item xs={6}><Typography variant="caption" color="text.secondary">رقم الإقامة:</Typography></Grid>
                                <Grid item xs={6}><Typography variant="body2">{selectedEmployee?.nationalId}</Typography></Grid>
                                <Grid item xs={6}><Typography variant="caption" color="text.secondary">نوع الخدمة:</Typography></Grid>
                                <Grid item xs={6}><Typography variant="body2" fontWeight="bold">{currentActionType}</Typography></Grid>
                            </Grid>
                        </Box>

                        {/* Robot Status & OTP Section */}
                        {currentTransactionId && (
                            <Box mt={3} p={2} border={1} borderColor="primary.main" borderRadius={1} bgcolor="primary.50">
                                <Box display="flex" alignItems="center" gap={1} mb={1}>
                                    <CircularProgress size={16} thickness={5} />
                                    <Typography variant="body2" fontWeight="bold">حالة الروبوت:</Typography>
                                    <Chip label={robotStatus.status} size="small" color="primary" />
                                </Box>
                                <Typography variant="body2" color="primary.main">{robotStatus.message}</Typography>

                                {robotStatus.status === 'WAITING_FOR_OTP' && (
                                    <Box mt={2}>
                                        <TextField
                                            fullWidth
                                            size="small"
                                            label="رمز التحقق (OTP)"
                                            value={otpValue}
                                            onChange={(e) => setOtpValue(e.target.value)}
                                            placeholder="أدخل الرمز المكون من 6 أرقام"
                                            sx={{ mb: 1, bgcolor: 'white' }}
                                        />
                                        <Button
                                            fullWidth
                                            variant="contained"
                                            onClick={handleResolveOtp}
                                            disabled={!otpValue || executing}
                                        >
                                            إرسال الرمز وإكمال العملية
                                        </Button>
                                    </Box>
                                )}
                            </Box>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setActionDialogOpen(false)}>إلغاء</Button>
                    <Button
                        variant="contained"
                        onClick={handleExecute}
                        disabled={executing || pollingActive}
                        startIcon={executing || pollingActive ? <CircularProgress size={20} /> : <CheckCircle />}
                    >
                        {pollingActive ? 'جاري التنفيذ...' : 'تنفيذ الآن'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default MuqeemManagementPage;
