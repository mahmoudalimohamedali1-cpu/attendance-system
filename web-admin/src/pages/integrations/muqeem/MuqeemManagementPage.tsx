import React, { useState, useEffect } from 'react';
import {
    Box, Card, CardContent, Typography, Button, TextField, Grid, Alert,
    CircularProgress, Chip, IconButton, Divider, Tab, Tabs, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Paper, Dialog, DialogTitle,
    DialogContent, DialogActions, Tooltip, Stack, MenuItem, Select, FormControl, InputLabel,
    FormControlLabel, Checkbox, AlertTitle, Badge,
} from '@mui/material';
import {
    Refresh, Settings, CreditCard, FlightTakeoff, FlightLand,
    Badge as BadgeIcon, Print, History, CheckCircle, Warning, Error,
    Add, Cancel, Update, SwapHoriz, Description, Sync, AccessTime,
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

// ============== Transaction Type Labels ==============
const TRANSACTION_LABELS: Record<MuqeemTransactionType, { ar: string; icon: React.ReactNode; color: 'primary' | 'success' | 'warning' | 'error' | 'info' }> = {
    [MuqeemTransactionType.IQAMA_ISSUE]: { ar: 'إصدار إقامة', icon: <Add />, color: 'success' },
    [MuqeemTransactionType.IQAMA_RENEW]: { ar: 'تجديد إقامة', icon: <Refresh />, color: 'primary' },
    [MuqeemTransactionType.IQAMA_TRANSFER]: { ar: 'نقل كفالة', icon: <SwapHoriz />, color: 'info' },
    [MuqeemTransactionType.VISA_EXIT_REENTRY_ISSUE]: { ar: 'إصدار خروج وعودة', icon: <FlightTakeoff />, color: 'info' },
    [MuqeemTransactionType.VISA_EXIT_REENTRY_CANCEL]: { ar: 'إلغاء خروج وعودة', icon: <Cancel />, color: 'warning' },
    [MuqeemTransactionType.VISA_EXIT_REENTRY_EXTEND]: { ar: 'تمديد خروج وعودة', icon: <AccessTime />, color: 'info' },
    [MuqeemTransactionType.VISA_EXIT_REENTRY_REPRINT]: { ar: 'إعادة طباعة خروج وعودة', icon: <Print />, color: 'primary' },
    [MuqeemTransactionType.VISA_FINAL_EXIT_ISSUE]: { ar: 'إصدار خروج نهائي', icon: <FlightLand />, color: 'error' },
    [MuqeemTransactionType.VISA_FINAL_EXIT_CANCEL]: { ar: 'إلغاء خروج نهائي', icon: <Cancel />, color: 'warning' },
    [MuqeemTransactionType.PASSPORT_EXTEND]: { ar: 'تمديد الجواز', icon: <Update />, color: 'info' },
    [MuqeemTransactionType.PASSPORT_RENEW]: { ar: 'تحديث بيانات الجواز', icon: <Sync />, color: 'primary' },
};

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
    const [actionPayload, setActionPayload] = useState<any>({
        years: 1,
        duration: 30,
        visaType: 'SINGLE',
        confirmFinalExit: false,
    });
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
            setTransactions(txData.items || []);
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
        setCurrentTransactionId(null);
        setRobotStatus({ status: 'IDLE', message: '' });
        setOtpValue('');
        // Default values based on type
        switch (type) {
            case MuqeemTransactionType.IQAMA_RENEW:
            case MuqeemTransactionType.IQAMA_ISSUE:
                setActionPayload({ years: 1 });
                break;
            case MuqeemTransactionType.VISA_EXIT_REENTRY_ISSUE:
                setActionPayload({ duration: 30, visaType: 'SINGLE' });
                break;
            case MuqeemTransactionType.VISA_EXIT_REENTRY_EXTEND:
                setActionPayload({ extensionDays: 30 });
                break;
            case MuqeemTransactionType.VISA_FINAL_EXIT_ISSUE:
                setActionPayload({ confirmFinalExit: false });
                break;
            default:
                setActionPayload({});
        }
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
                        setExecuting(false);
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

        // Validation for final exit
        if (currentActionType === MuqeemTransactionType.VISA_FINAL_EXIT_ISSUE && !actionPayload.confirmFinalExit) {
            alert('يجب تأكيد موافقتك على إصدار تأشيرة خروج نهائي');
            return;
        }

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
                setExecuting(false);
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

    // Calculate stats
    const expiringSoon = employees.filter(e => {
        if (!e.iqamaExpiryDate) return false;
        const daysLeft = dayjs(e.iqamaExpiryDate).diff(dayjs(), 'day');
        return daysLeft > 0 && daysLeft <= 30;
    }).length;

    const expired = employees.filter(e => {
        if (!e.iqamaExpiryDate) return false;
        return dayjs(e.iqamaExpiryDate).isBefore(dayjs());
    }).length;

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
                        🇸🇦 إدارة منصة مقيم
                    </Typography>
                    <Typography color="text.secondary" mt={0.5}>
                        خدمات الجوازات والإقامة الإلكترونية - المملكة العربية السعودية
                    </Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                    <Button variant="outlined" startIcon={<Refresh />} onClick={loadData}>تحديث</Button>
                    <Button variant="outlined" startIcon={<Settings />} href="/settings/muqeem">إعدادات الربط</Button>
                </Stack>
            </Box>

            {showConfigAlert && (
                <Alert severity="warning" sx={{ mb: 3 }} action={
                    <Button color="inherit" size="small" href="/settings/muqeem">تعديل الإعدادات</Button>
                }>
                    <AlertTitle>منصة مقيم غير مفعلة</AlertTitle>
                    يرجى إدخال بيانات الوصول لتفعيل العمليات الإلكترونية.
                </Alert>
            )}

            {/* Stats Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <Typography variant="h3" color="primary">{employees.length}</Typography>
                            <Typography color="text.secondary">إجمالي المقيمين</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ borderLeft: '4px solid #f44336' }}>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <Typography variant="h3" color="error">{expired}</Typography>
                            <Typography color="text.secondary">إقامات منتهية</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ borderLeft: '4px solid #ff9800' }}>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <Typography variant="h3" color="warning.main">{expiringSoon}</Typography>
                            <Typography color="text.secondary">تنتهي خلال 30 يوم</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ borderLeft: '4px solid #4caf50' }}>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <Typography variant="h3" color="success.main">{transactions.filter(t => t.status === 'COMPLETED').length}</Typography>
                            <Typography color="text.secondary">عمليات ناجحة</Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Tabs */}
            <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
                <Tab icon={<Badge badgeContent={expired + expiringSoon} color="error"><CreditCard /></Badge>} iconPosition="start" label="إدارة الإقامات" />
                <Tab icon={<FlightTakeoff />} iconPosition="start" label="التأشيرات والسفر" />
                <Tab icon={<Description />} iconPosition="start" label="الجوازات" />
                <Tab icon={<History />} iconPosition="start" label="سجل العمليات" />
            </Tabs>

            {/* Tab 0: Iqama Management */}
            {activeTab === 0 && (
                <Card>
                    <CardContent>
                        <Typography variant="h6" mb={2} display="flex" alignItems="center" gap={1}>
                            <CreditCard /> إدارة الإقامات (Iqama)
                        </Typography>
                        <TableContainer component={Paper} variant="outlined">
                            <Table>
                                <TableHead sx={{ bgcolor: 'grey.50' }}>
                                    <TableRow>
                                        <TableCell>الموظف</TableCell>
                                        <TableCell>رقم الإقامة</TableCell>
                                        <TableCell>تاريخ الانتهاء</TableCell>
                                        <TableCell>الأيام المتبقية</TableCell>
                                        <TableCell>الحالة</TableCell>
                                        <TableCell align="center">الإجراءات</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {employees.map((emp) => {
                                        const expiryDate = emp.iqamaExpiryDate ? dayjs(emp.iqamaExpiryDate) : null;
                                        const daysLeft = expiryDate ? expiryDate.diff(dayjs(), 'day') : null;
                                        const isExpired = daysLeft !== null && daysLeft < 0;
                                        const isExpiringSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 30;

                                        return (
                                            <TableRow key={emp.id} sx={{ bgcolor: isExpired ? 'error.50' : isExpiringSoon ? 'warning.50' : 'inherit' }}>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight="medium">{emp.firstName} {emp.lastName}</Typography>
                                                    <Typography variant="caption" color="text.secondary">{emp.employeeCode} - {emp.jobTitle}</Typography>
                                                </TableCell>
                                                <TableCell sx={{ fontFamily: 'monospace' }}>{emp.nationalId}</TableCell>
                                                <TableCell>{expiryDate ? expiryDate.format('YYYY/MM/DD') : '-'}</TableCell>
                                                <TableCell>
                                                    {daysLeft !== null ? (
                                                        <Typography fontWeight="bold" color={isExpired ? 'error' : isExpiringSoon ? 'warning.main' : 'success.main'}>
                                                            {isExpired ? `منتهية منذ ${Math.abs(daysLeft)} يوم` : `${daysLeft} يوم`}
                                                        </Typography>
                                                    ) : '-'}
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        icon={isExpired ? <Error /> : isExpiringSoon ? <Warning /> : <CheckCircle />}
                                                        label={isExpired ? 'منتهية' : isExpiringSoon ? 'تنتهي قريباً' : 'سارية'}
                                                        color={isExpired ? 'error' : isExpiringSoon ? 'warning' : 'success'}
                                                        size="small"
                                                    />
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Stack direction="row" spacing={1} justifyContent="center">
                                                        <Tooltip title="تجديد الإقامة">
                                                            <Button size="small" variant="contained" startIcon={<Refresh />} onClick={() => handleOpenAction(emp, MuqeemTransactionType.IQAMA_RENEW)}>
                                                                تجديد
                                                            </Button>
                                                        </Tooltip>
                                                        <Tooltip title="نقل كفالة">
                                                            <Button size="small" variant="outlined" startIcon={<SwapHoriz />} onClick={() => handleOpenAction(emp, MuqeemTransactionType.IQAMA_TRANSFER)}>
                                                                نقل
                                                            </Button>
                                                        </Tooltip>
                                                    </Stack>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                    {employees.length === 0 && (
                                        <TableRow><TableCell colSpan={6} align="center">لا يوجد موظفين غير سعوديين</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </CardContent>
                </Card>
            )}

            {/* Tab 1: Visas & Travel */}
            {activeTab === 1 && (
                <Card>
                    <CardContent>
                        <Typography variant="h6" mb={2} display="flex" alignItems="center" gap={1}>
                            <FlightTakeoff /> إدارة التأشيرات والسفر
                        </Typography>
                        <TableContainer component={Paper} variant="outlined">
                            <Table>
                                <TableHead sx={{ bgcolor: 'grey.50' }}>
                                    <TableRow>
                                        <TableCell>الموظف</TableCell>
                                        <TableCell>رقم الإقامة</TableCell>
                                        <TableCell>الجنسية</TableCell>
                                        <TableCell align="center">تأشيرة خروج وعودة</TableCell>
                                        <TableCell align="center">تأشيرة خروج نهائي</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {employees.map((emp) => (
                                        <TableRow key={emp.id}>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight="medium">{emp.firstName} {emp.lastName}</Typography>
                                                <Typography variant="caption" color="text.secondary">{emp.employeeCode}</Typography>
                                            </TableCell>
                                            <TableCell sx={{ fontFamily: 'monospace' }}>{emp.nationalId}</TableCell>
                                            <TableCell>{emp.nationality || 'غير محدد'}</TableCell>
                                            <TableCell align="center">
                                                <Stack direction="row" spacing={1} justifyContent="center">
                                                    <Tooltip title="إصدار تأشيرة خروج وعودة">
                                                        <Button size="small" variant="contained" color="info" startIcon={<FlightTakeoff />} onClick={() => handleOpenAction(emp, MuqeemTransactionType.VISA_EXIT_REENTRY_ISSUE)}>
                                                            إصدار
                                                        </Button>
                                                    </Tooltip>
                                                    <Tooltip title="تمديد">
                                                        <Button size="small" variant="outlined" color="info" startIcon={<AccessTime />} onClick={() => handleOpenAction(emp, MuqeemTransactionType.VISA_EXIT_REENTRY_EXTEND)}>
                                                            تمديد
                                                        </Button>
                                                    </Tooltip>
                                                    <Tooltip title="إلغاء">
                                                        <Button size="small" variant="outlined" color="warning" startIcon={<Cancel />} onClick={() => handleOpenAction(emp, MuqeemTransactionType.VISA_EXIT_REENTRY_CANCEL)}>
                                                            إلغاء
                                                        </Button>
                                                    </Tooltip>
                                                </Stack>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Stack direction="row" spacing={1} justifyContent="center">
                                                    <Tooltip title="إصدار خروج نهائي - تحذير: لا يمكن التراجع">
                                                        <Button size="small" variant="outlined" color="error" startIcon={<FlightLand />} onClick={() => handleOpenAction(emp, MuqeemTransactionType.VISA_FINAL_EXIT_ISSUE)}>
                                                            خروج نهائي
                                                        </Button>
                                                    </Tooltip>
                                                    <Tooltip title="إلغاء خروج نهائي">
                                                        <Button size="small" variant="text" color="warning" onClick={() => handleOpenAction(emp, MuqeemTransactionType.VISA_FINAL_EXIT_CANCEL)}>
                                                            إلغاء
                                                        </Button>
                                                    </Tooltip>
                                                </Stack>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </CardContent>
                </Card>
            )}

            {/* Tab 2: Passports */}
            {activeTab === 2 && (
                <Card>
                    <CardContent>
                        <Typography variant="h6" mb={2} display="flex" alignItems="center" gap={1}>
                            <Description /> إدارة الجوازات
                        </Typography>
                        <TableContainer component={Paper} variant="outlined">
                            <Table>
                                <TableHead sx={{ bgcolor: 'grey.50' }}>
                                    <TableRow>
                                        <TableCell>الموظف</TableCell>
                                        <TableCell>رقم الجواز</TableCell>
                                        <TableCell>انتهاء الجواز</TableCell>
                                        <TableCell>الحالة</TableCell>
                                        <TableCell align="center">الإجراءات</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {employees.map((emp) => {
                                        const passportExpiry = emp.passportExpiryDate ? dayjs(emp.passportExpiryDate) : null;
                                        const daysLeft = passportExpiry ? passportExpiry.diff(dayjs(), 'day') : null;
                                        const isExpired = daysLeft !== null && daysLeft < 0;
                                        const isExpiringSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 90;

                                        return (
                                            <TableRow key={emp.id}>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight="medium">{emp.firstName} {emp.lastName}</Typography>
                                                    <Typography variant="caption" color="text.secondary">{emp.employeeCode}</Typography>
                                                </TableCell>
                                                <TableCell sx={{ fontFamily: 'monospace' }}>{emp.passportNumber || '-'}</TableCell>
                                                <TableCell>{passportExpiry ? passportExpiry.format('YYYY/MM/DD') : '-'}</TableCell>
                                                <TableCell>
                                                    {daysLeft !== null ? (
                                                        <Chip
                                                            label={isExpired ? 'منتهي' : isExpiringSoon ? 'ينتهي قريباً' : 'ساري'}
                                                            color={isExpired ? 'error' : isExpiringSoon ? 'warning' : 'success'}
                                                            size="small"
                                                        />
                                                    ) : '-'}
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Stack direction="row" spacing={1} justifyContent="center">
                                                        <Tooltip title="تحديث بيانات الجواز">
                                                            <Button size="small" variant="contained" startIcon={<Sync />} onClick={() => handleOpenAction(emp, MuqeemTransactionType.PASSPORT_RENEW)}>
                                                                تحديث البيانات
                                                            </Button>
                                                        </Tooltip>
                                                        <Tooltip title="تمديد صلاحية الجواز">
                                                            <Button size="small" variant="outlined" startIcon={<AccessTime />} onClick={() => handleOpenAction(emp, MuqeemTransactionType.PASSPORT_EXTEND)}>
                                                                تمديد
                                                            </Button>
                                                        </Tooltip>
                                                    </Stack>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </CardContent>
                </Card>
            )}

            {/* Tab 3: Transaction History */}
            {activeTab === 3 && (
                <Card>
                    <CardContent>
                        <Typography variant="h6" mb={2} display="flex" alignItems="center" gap={1}>
                            <History /> سجل جميع العمليات
                        </Typography>
                        <TableContainer component={Paper} variant="outlined">
                            <Table size="small">
                                <TableHead sx={{ bgcolor: 'grey.50' }}>
                                    <TableRow>
                                        <TableCell>التاريخ</TableCell>
                                        <TableCell>الموظف</TableCell>
                                        <TableCell>نوع العملية</TableCell>
                                        <TableCell>الحالة</TableCell>
                                        <TableCell>الرقم المرجعي</TableCell>
                                        <TableCell>ملاحظات</TableCell>
                                        <TableCell align="center">طباعة</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {transactions.map((tx) => {
                                        const label = TRANSACTION_LABELS[tx.type as MuqeemTransactionType];
                                        return (
                                            <TableRow key={tx.id}>
                                                <TableCell>{dayjs(tx.createdAt).format('YYYY/MM/DD HH:mm')}</TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight="medium">{tx.user?.firstName} {tx.user?.lastName}</Typography>
                                                    <Typography variant="caption" color="text.secondary">{tx.user?.employeeCode}</Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        icon={label?.icon as React.ReactElement}
                                                        label={label?.ar || tx.type}
                                                        color={label?.color || 'default'}
                                                        size="small"
                                                        variant="outlined"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={tx.status === 'COMPLETED' ? 'مكتملة' : tx.status === 'FAILED' ? 'فشلت' : tx.status === 'PROCESSING' ? 'جاري التنفيذ' : tx.status}
                                                        size="small"
                                                        color={tx.status === 'COMPLETED' ? 'success' : tx.status === 'FAILED' ? 'error' : 'warning'}
                                                    />
                                                </TableCell>
                                                <TableCell sx={{ fontFamily: 'monospace' }}>{tx.externalRef || '-'}</TableCell>
                                                <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {tx.errorMessage || '-'}
                                                </TableCell>
                                                <TableCell align="center">
                                                    {tx.fileUrl && (
                                                        <IconButton size="small" component="a" href={tx.fileUrl} target="_blank" color="primary">
                                                            <Print fontSize="small" />
                                                        </IconButton>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                    {transactions.length === 0 && (
                                        <TableRow><TableCell colSpan={7} align="center">لا توجد عمليات سابقة</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </CardContent>
                </Card>
            )}

            {/* Action Dialog */}
            <Dialog open={actionDialogOpen} onClose={() => !executing && setActionDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>
                    <Box display="flex" alignItems="center" gap={1}>
                        {currentActionType && TRANSACTION_LABELS[currentActionType]?.icon}
                        {currentActionType && TRANSACTION_LABELS[currentActionType]?.ar} - {selectedEmployee?.firstName} {selectedEmployee?.lastName}
                    </Box>
                </DialogTitle>
                <DialogContent dividers>
                    <Box py={2}>
                        {/* Employee Info */}
                        <Box mb={3} p={2} bgcolor="grey.50" borderRadius={1}>
                            <Grid container spacing={1}>
                                <Grid item xs={6}><Typography variant="caption" color="text.secondary">رقم الإقامة:</Typography></Grid>
                                <Grid item xs={6}><Typography variant="body2" fontWeight="bold">{selectedEmployee?.nationalId}</Typography></Grid>
                                <Grid item xs={6}><Typography variant="caption" color="text.secondary">المسمى الوظيفي:</Typography></Grid>
                                <Grid item xs={6}><Typography variant="body2">{selectedEmployee?.jobTitle}</Typography></Grid>
                            </Grid>
                        </Box>

                        {/* Dynamic Form based on action type */}
                        {(currentActionType === MuqeemTransactionType.IQAMA_RENEW || currentActionType === MuqeemTransactionType.IQAMA_ISSUE) && (
                            <FormControl fullWidth sx={{ mb: 2 }}>
                                <InputLabel>مدة التجديد</InputLabel>
                                <Select
                                    value={actionPayload.years}
                                    onChange={(e) => setActionPayload({ ...actionPayload, years: e.target.value })}
                                    label="مدة التجديد"
                                >
                                    <MenuItem value={1}>سنة واحدة</MenuItem>
                                    <MenuItem value={2}>سنتين</MenuItem>
                                    <MenuItem value={3}>3 سنوات</MenuItem>
                                    <MenuItem value={4}>4 سنوات</MenuItem>
                                    <MenuItem value={5}>5 سنوات</MenuItem>
                                </Select>
                            </FormControl>
                        )}

                        {currentActionType === MuqeemTransactionType.VISA_EXIT_REENTRY_ISSUE && (
                            <>
                                <FormControl fullWidth sx={{ mb: 2 }}>
                                    <InputLabel>نوع التأشيرة</InputLabel>
                                    <Select
                                        value={actionPayload.visaType}
                                        onChange={(e) => setActionPayload({ ...actionPayload, visaType: e.target.value })}
                                        label="نوع التأشيرة"
                                    >
                                        <MenuItem value="SINGLE">مفردة (خروج وعودة واحدة)</MenuItem>
                                        <MenuItem value="MULTIPLE">متعددة (خروج وعودة متعددة)</MenuItem>
                                    </Select>
                                </FormControl>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="مدة التأشيرة (بالأيام)"
                                    value={actionPayload.duration}
                                    onChange={(e) => setActionPayload({ ...actionPayload, duration: parseInt(e.target.value) })}
                                    inputProps={{ min: 1, max: 180 }}
                                    helperText="الحد الأقصى 180 يوم"
                                />
                            </>
                        )}

                        {currentActionType === MuqeemTransactionType.VISA_EXIT_REENTRY_EXTEND && (
                            <TextField
                                fullWidth
                                type="number"
                                label="مدة التمديد (بالأيام)"
                                value={actionPayload.extensionDays}
                                onChange={(e) => setActionPayload({ ...actionPayload, extensionDays: parseInt(e.target.value) })}
                                inputProps={{ min: 1, max: 90 }}
                            />
                        )}

                        {currentActionType === MuqeemTransactionType.VISA_FINAL_EXIT_ISSUE && (
                            <Alert severity="error" sx={{ mb: 2 }}>
                                <AlertTitle>⚠️ تحذير مهم</AlertTitle>
                                إصدار تأشيرة خروج نهائي سيؤدي إلى:
                                <ul style={{ margin: '8px 0', paddingRight: '20px' }}>
                                    <li>إنهاء إقامة الموظف في المملكة</li>
                                    <li>إلغاء جميع التأشيرات الأخرى</li>
                                    <li>عدم إمكانية العودة إلا بتأشيرة جديدة</li>
                                </ul>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={actionPayload.confirmFinalExit}
                                            onChange={(e) => setActionPayload({ ...actionPayload, confirmFinalExit: e.target.checked })}
                                        />
                                    }
                                    label="أؤكد موافقتي على إصدار تأشيرة خروج نهائي"
                                />
                            </Alert>
                        )}

                        {currentActionType === MuqeemTransactionType.IQAMA_TRANSFER && (
                            <Alert severity="info">
                                سيتم نقل كفالة الموظف. يرجى التأكد من استكمال جميع الإجراءات اللازمة في وزارة العمل.
                            </Alert>
                        )}

                        {(currentActionType === MuqeemTransactionType.PASSPORT_RENEW || currentActionType === MuqeemTransactionType.PASSPORT_EXTEND) && (
                            <Alert severity="info">
                                سيتم {currentActionType === MuqeemTransactionType.PASSPORT_RENEW ? 'تحديث بيانات الجواز' : 'تمديد صلاحية الجواز'} في النظام.
                            </Alert>
                        )}

                        {/* Robot Status & OTP Section */}
                        {currentTransactionId && (
                            <Box mt={3} p={2} border={2} borderColor="primary.main" borderRadius={2} bgcolor="primary.50">
                                <Box display="flex" alignItems="center" gap={1} mb={1}>
                                    <CircularProgress size={20} thickness={5} />
                                    <Typography fontWeight="bold">حالة الروبوت:</Typography>
                                    <Chip label={robotStatus.status} size="small" color="primary" />
                                </Box>
                                <Typography color="primary.dark">{robotStatus.message}</Typography>

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
                    <Button onClick={() => setActionDialogOpen(false)} disabled={executing || pollingActive}>إلغاء</Button>
                    <Button
                        variant="contained"
                        onClick={handleExecute}
                        disabled={executing || pollingActive || (currentActionType === MuqeemTransactionType.VISA_FINAL_EXIT_ISSUE && !actionPayload.confirmFinalExit)}
                        startIcon={executing || pollingActive ? <CircularProgress size={20} /> : <CheckCircle />}
                    >
                        {pollingActive ? 'جاري التنفيذ...' : 'تنفيذ العملية'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default MuqeemManagementPage;
