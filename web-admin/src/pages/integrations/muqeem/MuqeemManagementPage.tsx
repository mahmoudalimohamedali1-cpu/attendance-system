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
    const [config, setConfig] = useState<MuqeemConfig | null>(null);
    const [showConfigAlert, setShowConfigAlert] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [txData, configData] = await Promise.all([
                muqeemApi.getTransactions(),
                muqeemApi.getConfig().catch(() => null),
            ]);
            setTransactions(txData.items);
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

    const handleExecute = async (userId: string, type: MuqeemTransactionType, payload: any = {}) => {
        try {
            setExecuting(true);
            const res = await muqeemApi.executeTransaction({ userId, type, payload });
            if (res.success) {
                alert(res.message);
                loadData();
            } else {
                alert(`خطأ: ${res.message}`);
            }
        } catch (error: any) {
            alert(error.response?.data?.message || 'فشلت العملية');
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
                <Tab icon={<FlightTakeoff />} iconPosition="start" label="تأشيرات الخروج والعودة" />
                <Tab icon={<FlightLand />} iconPosition="start" label="الخروج النهائي" />
                <Tab icon={<Badge />} iconPosition="start" label="جوازات السفر" />
                <Tab icon={<History />} iconPosition="start" label="سجل العمليات" />
            </Tabs>

            {/* Content based on Active Tab */}
            <Card>
                <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h6">
                            {activeTab === 0 && 'إدارة الإقامات (Iqama)'}
                            {activeTab === 1 && 'تأشيرات الخروج والعودة'}
                            {activeTab === 2 && 'تأشيرة الخروج النهائي'}
                            {activeTab === 3 && 'بيانات جوازات السفر'}
                            {activeTab === 4 && 'جميع الحركات السابقة'}
                        </Typography>
                        <Button startIcon={<Refresh />} onClick={loadData}>تحديث</Button>
                    </Box>

                    {activeTab === 4 ? (
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
                    ) : (
                        <Box py={5} textAlign="center">
                            <Info fontSize="large" color="disabled" />
                            <Typography color="text.secondary" mt={2}>
                                هذا القسم يعرض قوائم الموظفين المستحقين لهذه الخدمة.
                                <br />
                                يتم جلب البيانات من ملفات الموظفين (رقم الإقامة، تاريخ الانتهاء).
                            </Typography>
                            <Button color="primary" sx={{ mt: 2 }} onClick={() => setActiveTab(4)}>عرض جميع السجلات</Button>
                        </Box>
                    )}
                </CardContent>
            </Card>
        </Box>
    );
};

export default MuqeemManagementPage;
