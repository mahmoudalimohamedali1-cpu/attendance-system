/**
 * صفحة عقودي - للموظف
 * يستطيع الموظف من هنا:
 * - عرض عقوده
 * - توقيع العقد الجديد
 * - رفض العقد مع ذكر السبب
 */
import { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    Button,
    Card,
    CardContent,
    CardActions,
    Alert,
    CircularProgress,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Grid,
    Divider,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
} from '@mui/material';
import {
    Description as ContractIcon,
    CheckCircle as SignIcon,
    Cancel as RejectIcon,
    Warning as PendingIcon,
    CalendarToday as DateIcon,
    AttachMoney as SalaryIcon,
    Work as JobIcon,
    AccessTime as HoursIcon,
    BeachAccess as LeaveIcon,
} from '@mui/icons-material';
import { contractsService, Contract, contractTypeLabels, contractStatusLabels } from '@/services/contracts.service';

export default function MyContractsPage() {
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [pendingContracts, setPendingContracts] = useState<Contract[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [signing, setSigning] = useState(false);

    // Reject dialog
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
    const [rejectReason, setRejectReason] = useState('');

    // View contract dialog
    const [viewDialogOpen, setViewDialogOpen] = useState(false);
    const [viewContract, setViewContract] = useState<Contract | null>(null);

    useEffect(() => {
        fetchContracts();
    }, []);

    const fetchContracts = async () => {
        setLoading(true);
        try {
            // جلب كل العقود الخاصة بي
            const allContracts = await contractsService.getAll();

            // فلترة العقود بانتظار توقيعي
            const pending = allContracts.filter(c => c.status === 'PENDING_EMPLOYEE');

            setContracts(allContracts);
            setPendingContracts(pending);
            setError(null);
        } catch (err: any) {
            setError(err.response?.data?.message || 'حدث خطأ في تحميل العقود');
        } finally {
            setLoading(false);
        }
    };

    const handleSign = async (contract: Contract) => {
        setSigning(true);
        try {
            await contractsService.employeeSign(contract.id);
            setSuccess('تم توقيع العقد بنجاح! ✅');
            fetchContracts();
        } catch (err: any) {
            setError(err.response?.data?.message || 'حدث خطأ في التوقيع');
        } finally {
            setSigning(false);
        }
    };

    const handleOpenReject = (contract: Contract) => {
        setSelectedContract(contract);
        setRejectReason('');
        setRejectDialogOpen(true);
    };

    const handleReject = async () => {
        if (!selectedContract || !rejectReason.trim()) return;

        setSigning(true);
        try {
            await contractsService.rejectContract(selectedContract.id, rejectReason);
            setSuccess('تم رفض العقد وإرساله للمراجعة');
            setRejectDialogOpen(false);
            fetchContracts();
        } catch (err: any) {
            setError(err.response?.data?.message || 'حدث خطأ في الرفض');
        } finally {
            setSigning(false);
        }
    };

    const handleViewContract = (contract: Contract) => {
        setViewContract(contract);
        setViewDialogOpen(true);
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('ar-SA');
    };

    const formatMoney = (amount?: number) => {
        if (!amount) return '-';
        return amount.toLocaleString('ar-SA') + ' ر.س';
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box p={3}>
            {/* Header */}
            <Box display="flex" alignItems="center" mb={3}>
                <ContractIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
                <Box>
                    <Typography variant="h5" fontWeight="bold">
                        عقودي
                    </Typography>
                    <Typography color="text.secondary">
                        عرض وإدارة عقود العمل الخاصة بك
                    </Typography>
                </Box>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}
            {success && (
                <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
                    {success}
                </Alert>
            )}

            {/* عقود تحتاج توقيعي */}
            {pendingContracts.length > 0 && (
                <Alert
                    severity="warning"
                    icon={<PendingIcon />}
                    sx={{ mb: 3 }}
                >
                    <Typography fontWeight="bold">
                        لديك {pendingContracts.length} عقد بانتظار توقيعك
                    </Typography>
                </Alert>
            )}

            {/* Pending Contracts */}
            {pendingContracts.length > 0 && (
                <Box mb={4}>
                    <Typography variant="h6" fontWeight="bold" mb={2} color="warning.main">
                        🔔 عقود تحتاج توقيعك
                    </Typography>
                    <Grid container spacing={2}>
                        {pendingContracts.map((contract) => (
                            <Grid item xs={12} md={6} key={contract.id}>
                                <Card sx={{ border: '2px solid', borderColor: 'warning.main' }}>
                                    <CardContent>
                                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                            <Typography variant="h6" fontWeight="bold">
                                                {contractTypeLabels[contract.type]}
                                            </Typography>
                                            <Chip
                                                label="بانتظار توقيعك"
                                                color="warning"
                                                icon={<PendingIcon />}
                                            />
                                        </Box>

                                        <List dense>
                                            <ListItem>
                                                <ListItemIcon><DateIcon /></ListItemIcon>
                                                <ListItemText
                                                    primary="تاريخ البداية"
                                                    secondary={formatDate(contract.startDate)}
                                                />
                                            </ListItem>
                                            <ListItem>
                                                <ListItemIcon><SalaryIcon /></ListItemIcon>
                                                <ListItemText
                                                    primary="إجمالي الراتب"
                                                    secondary={formatMoney(contract.totalSalary)}
                                                />
                                            </ListItem>
                                            <ListItem>
                                                <ListItemIcon><JobIcon /></ListItemIcon>
                                                <ListItemText
                                                    primary="المسمى الوظيفي"
                                                    secondary={contract.contractJobTitle || '-'}
                                                />
                                            </ListItem>
                                        </List>
                                    </CardContent>
                                    <Divider />
                                    <CardActions sx={{ justifyContent: 'space-between', p: 2 }}>
                                        <Button
                                            variant="outlined"
                                            onClick={() => handleViewContract(contract)}
                                        >
                                            عرض التفاصيل
                                        </Button>
                                        <Box display="flex" gap={1}>
                                            <Button
                                                variant="outlined"
                                                color="error"
                                                startIcon={<RejectIcon />}
                                                onClick={() => handleOpenReject(contract)}
                                                disabled={signing}
                                            >
                                                رفض
                                            </Button>
                                            <Button
                                                variant="contained"
                                                color="success"
                                                startIcon={signing ? <CircularProgress size={20} /> : <SignIcon />}
                                                onClick={() => handleSign(contract)}
                                                disabled={signing}
                                            >
                                                توقيع
                                            </Button>
                                        </Box>
                                    </CardActions>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </Box>
            )}

            {/* All Contracts */}
            <Typography variant="h6" fontWeight="bold" mb={2}>
                📄 جميع عقودي
            </Typography>

            {contracts.length === 0 ? (
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <ContractIcon sx={{ fontSize: 60, color: 'grey.400', mb: 2 }} />
                    <Typography color="text.secondary">
                        لا توجد عقود حالياً
                    </Typography>
                </Paper>
            ) : (
                <Grid container spacing={2}>
                    {contracts.map((contract) => (
                        <Grid item xs={12} md={6} lg={4} key={contract.id}>
                            <Card>
                                <CardContent>
                                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                        <Typography variant="subtitle1" fontWeight="bold">
                                            {contractTypeLabels[contract.type]}
                                        </Typography>
                                        <Chip
                                            label={contractStatusLabels[contract.status]}
                                            color={contract.status === 'ACTIVE' ? 'success' : 'default'}
                                            size="small"
                                        />
                                    </Box>

                                    <Typography variant="body2" color="text.secondary">
                                        من {formatDate(contract.startDate)}
                                        {contract.endDate && ` إلى ${formatDate(contract.endDate)}`}
                                    </Typography>

                                    <Typography variant="body2" mt={1}>
                                        الراتب: {formatMoney(contract.totalSalary)}
                                    </Typography>
                                </CardContent>
                                <CardActions>
                                    <Button
                                        size="small"
                                        onClick={() => handleViewContract(contract)}
                                    >
                                        عرض التفاصيل
                                    </Button>
                                </CardActions>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}

            {/* View Contract Dialog */}
            <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    <ContractIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    تفاصيل العقد
                </DialogTitle>
                <DialogContent dividers>
                    {viewContract && (
                        <Grid container spacing={2}>
                            <Grid item xs={12}>
                                <Typography variant="subtitle2" color="primary">نوع العقد</Typography>
                                <Typography>{contractTypeLabels[viewContract.type]}</Typography>
                            </Grid>
                            <Grid item xs={6}>
                                <Typography variant="subtitle2" color="primary">تاريخ البداية</Typography>
                                <Typography>{formatDate(viewContract.startDate)}</Typography>
                            </Grid>
                            <Grid item xs={6}>
                                <Typography variant="subtitle2" color="primary">تاريخ النهاية</Typography>
                                <Typography>{formatDate(viewContract.endDate) || 'غير محدد'}</Typography>
                            </Grid>
                            <Grid item xs={12}><Divider /></Grid>
                            <Grid item xs={6}>
                                <Typography variant="subtitle2" color="primary">الراتب الأساسي</Typography>
                                <Typography>{formatMoney(viewContract.basicSalary)}</Typography>
                            </Grid>
                            <Grid item xs={6}>
                                <Typography variant="subtitle2" color="primary">بدل السكن</Typography>
                                <Typography>{formatMoney(viewContract.housingAllowance)}</Typography>
                            </Grid>
                            <Grid item xs={6}>
                                <Typography variant="subtitle2" color="primary">بدل المواصلات</Typography>
                                <Typography>{formatMoney(viewContract.transportAllowance)}</Typography>
                            </Grid>
                            <Grid item xs={6}>
                                <Typography variant="subtitle2" color="primary" fontWeight="bold">إجمالي الراتب</Typography>
                                <Typography fontWeight="bold" color="success.main">
                                    {formatMoney(viewContract.totalSalary)}
                                </Typography>
                            </Grid>
                            <Grid item xs={12}><Divider /></Grid>
                            <Grid item xs={6}>
                                <Typography variant="subtitle2" color="primary">المسمى الوظيفي</Typography>
                                <Typography>{viewContract.contractJobTitle || '-'}</Typography>
                            </Grid>
                            <Grid item xs={6}>
                                <Typography variant="subtitle2" color="primary">مقر العمل</Typography>
                                <Typography>{viewContract.workLocation || '-'}</Typography>
                            </Grid>
                            <Grid item xs={6}>
                                <Typography variant="subtitle2" color="primary">ساعات العمل الأسبوعية</Typography>
                                <Typography>{viewContract.workingHoursPerWeek || 48} ساعة</Typography>
                            </Grid>
                            <Grid item xs={6}>
                                <Typography variant="subtitle2" color="primary">أيام الإجازة السنوية</Typography>
                                <Typography>{viewContract.annualLeaveDays || 21} يوم</Typography>
                            </Grid>
                        </Grid>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setViewDialogOpen(false)}>إغلاق</Button>
                    {viewContract?.status === 'PENDING_EMPLOYEE' && (
                        <>
                            <Button
                                color="error"
                                onClick={() => {
                                    setViewDialogOpen(false);
                                    handleOpenReject(viewContract);
                                }}
                            >
                                رفض
                            </Button>
                            <Button
                                variant="contained"
                                color="success"
                                onClick={() => {
                                    setViewDialogOpen(false);
                                    handleSign(viewContract);
                                }}
                            >
                                توقيع العقد
                            </Button>
                        </>
                    )}
                </DialogActions>
            </Dialog>

            {/* Reject Dialog */}
            <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)}>
                <DialogTitle color="error.main">
                    <RejectIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    رفض العقد
                </DialogTitle>
                <DialogContent>
                    <Typography sx={{ mb: 2 }}>
                        يرجى ذكر سبب رفض العقد. سيتم إرسال العقد للمراجعة.
                    </Typography>
                    <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label="سبب الرفض"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="مثال: الراتب المذكور غير صحيح..."
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRejectDialogOpen(false)}>إلغاء</Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleReject}
                        disabled={!rejectReason.trim() || signing}
                    >
                        {signing ? <CircularProgress size={20} /> : 'تأكيد الرفض'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
