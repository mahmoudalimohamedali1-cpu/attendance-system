import { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Paper,
    Typography,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    MenuItem,
    Alert,
    CircularProgress,
    LinearProgress,
    Card,
    CardContent,
    Grid,
    Chip,
    Tabs,
    Tab,
    IconButton,
    Drawer,
    List,
    ListItem,
    ListItemText,
    Divider,
    Tooltip,
} from '@mui/material';
import {
    Add as AddIcon,
    AccountBalance as AccountBalanceIcon,
    Payment as PaymentIcon,
    History as HistoryIcon,
    Pause as PauseIcon,
    PlayArrow as PlayArrowIcon,
    Delete as DeleteIcon,
    Close as CloseIcon,
} from '@mui/icons-material';
import employeeDebtService, { EmployeeDebt, DebtLedgerEntry, CreateDebtDto, ManualPaymentDto } from '@/services/employee-debt.service';

const STATUS_CONFIG: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'default' | 'info' }> = {
    ACTIVE: { label: 'نشط', color: 'success' },
    PAID: { label: 'مسدد', color: 'info' },
    SUSPENDED: { label: 'معلق', color: 'warning' },
    WRITTEN_OFF: { label: 'شطب', color: 'error' },
};

const TYPE_LABELS: Record<string, string> = {
    SALARY_ADVANCE: 'سلفة راتب',
    LOAN: 'قرض',
    PENALTY: 'جزاء',
    OTHER: 'أخرى',
};

const LEDGER_TYPE_LABELS: Record<string, string> = {
    INITIAL: 'رصيد ابتدائي',
    DEDUCTION: 'خصم من الراتب',
    PAYMENT: 'دفعة نقدية',
    ADJUSTMENT: 'تسوية',
    WRITE_OFF: 'شطب',
};

export default function EmployeeDebtPage() {
    const [debts, setDebts] = useState<EmployeeDebt[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState(0);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [total, setTotal] = useState(0);

    // Summary stats
    const [stats, setStats] = useState({
        totalOriginal: 0,
        totalRemaining: 0,
        activeCount: 0,
        paidCount: 0,
    });

    // Dialogs
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
    const [ledgerDrawerOpen, setLedgerDrawerOpen] = useState(false);
    const [selectedDebt, setSelectedDebt] = useState<EmployeeDebt | null>(null);
    const [ledgerEntries, setLedgerEntries] = useState<DebtLedgerEntry[]>([]);

    // Form data
    const [createForm, setCreateForm] = useState<CreateDebtDto>({
        employeeId: '',
        type: 'SALARY_ADVANCE',
        description: '',
        originalAmount: 0,
        monthlyDeduction: 0,
        startDate: new Date().toISOString().slice(0, 10),
        notes: '',
    });

    const [paymentForm, setPaymentForm] = useState<ManualPaymentDto>({
        amount: 0,
        paymentMethod: 'CASH',
        reference: '',
        notes: '',
    });

    const statusFilters = ['', 'ACTIVE', 'PAID', 'SUSPENDED', 'WRITTEN_OFF'];
    const tabLabels = ['الكل', 'نشط', 'مسدد', 'معلق', 'مشطوب'];

    const fetchDebts = useCallback(async () => {
        setLoading(true);
        try {
            const statusFilter = statusFilters[activeTab] || undefined;
            const response = await employeeDebtService.getDebts({
                status: statusFilter,
                page: page + 1,
                limit: rowsPerPage,
            });
            setDebts(response.data || response || []);
            setTotal(response.total || 0);

            // Calculate stats from all debts
            const allDebts = response.data || response || [];
            setStats({
                totalOriginal: allDebts.reduce((sum: number, d: EmployeeDebt) => sum + Number(d.originalAmount), 0),
                totalRemaining: allDebts.reduce((sum: number, d: EmployeeDebt) => sum + Number(d.remainingAmount), 0),
                activeCount: allDebts.filter((d: EmployeeDebt) => d.status === 'ACTIVE').length,
                paidCount: allDebts.filter((d: EmployeeDebt) => d.status === 'PAID').length,
            });

            setError(null);
        } catch (err: any) {
            setError(err.response?.data?.message || 'حدث خطأ في تحميل البيانات');
        } finally {
            setLoading(false);
        }
    }, [activeTab, page, rowsPerPage]);

    useEffect(() => {
        fetchDebts();
    }, [fetchDebts]);

    const handleCreateDebt = async () => {
        try {
            await employeeDebtService.createDebt(createForm);
            setCreateDialogOpen(false);
            setSuccess('تم إنشاء الدين بنجاح');
            fetchDebts();
            setCreateForm({
                employeeId: '',
                type: 'SALARY_ADVANCE',
                description: '',
                originalAmount: 0,
                monthlyDeduction: 0,
                startDate: new Date().toISOString().slice(0, 10),
                notes: '',
            });
        } catch (err: any) {
            setError(err.response?.data?.message || 'حدث خطأ');
        }
    };

    const handlePayment = async () => {
        if (!selectedDebt) return;
        try {
            await employeeDebtService.recordManualPayment(selectedDebt.id, paymentForm);
            setPaymentDialogOpen(false);
            setSuccess('تم تسجيل الدفعة بنجاح');
            fetchDebts();
            setPaymentForm({
                amount: 0,
                paymentMethod: 'CASH',
                reference: '',
                notes: '',
            });
        } catch (err: any) {
            setError(err.response?.data?.message || 'حدث خطأ');
        }
    };

    const handleSuspend = async (debt: EmployeeDebt) => {
        try {
            await employeeDebtService.suspendDebt(debt.id, 'تعليق مؤقت');
            setSuccess('تم تعليق الدين');
            fetchDebts();
        } catch (err: any) {
            setError(err.response?.data?.message || 'حدث خطأ');
        }
    };

    const handleResume = async (debt: EmployeeDebt) => {
        try {
            await employeeDebtService.resumeDebt(debt.id);
            setSuccess('تم استئناف الدين');
            fetchDebts();
        } catch (err: any) {
            setError(err.response?.data?.message || 'حدث خطأ');
        }
    };

    const handleWriteOff = async (debt: EmployeeDebt) => {
        try {
            await employeeDebtService.writeOffDebt(debt.id, { reason: 'شطب إداري' });
            setSuccess('تم شطب الدين');
            fetchDebts();
        } catch (err: any) {
            setError(err.response?.data?.message || 'حدث خطأ');
        }
    };

    const handleViewLedger = async (debt: EmployeeDebt) => {
        setSelectedDebt(debt);
        try {
            const entries = await employeeDebtService.getLedgerEntries(debt.id);
            setLedgerEntries(entries);
            setLedgerDrawerOpen(true);
        } catch (err: any) {
            setError(err.response?.data?.message || 'حدث خطأ في تحميل السجل');
        }
    };

    const openPaymentDialog = (debt: EmployeeDebt) => {
        setSelectedDebt(debt);
        setPaymentDialogOpen(true);
    };

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(amount);

    if (loading && debts.length === 0) {
        return (
            <Box display="flex" justifyContent="center" p={4}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box p={3}>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h5" fontWeight="bold">
                    <AccountBalanceIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    إدارة ديون الموظفين
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setCreateDialogOpen(true)}
                >
                    إنشاء دين جديد
                </Button>
            </Box>

            {/* Alerts */}
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

            {/* Stats Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={3}>
                    <Card>
                        <CardContent>
                            <Typography color="text.secondary" variant="caption">إجمالي الديون</Typography>
                            <Typography variant="h5">{formatCurrency(stats.totalOriginal)}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={3}>
                    <Card sx={{ bgcolor: 'warning.light' }}>
                        <CardContent>
                            <Typography color="text.secondary" variant="caption">المتبقي</Typography>
                            <Typography variant="h5">{formatCurrency(stats.totalRemaining)}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={3}>
                    <Card sx={{ bgcolor: 'success.light' }}>
                        <CardContent>
                            <Typography color="text.secondary" variant="caption">ديون نشطة</Typography>
                            <Typography variant="h5">{stats.activeCount}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={3}>
                    <Card sx={{ bgcolor: 'info.light' }}>
                        <CardContent>
                            <Typography color="text.secondary" variant="caption">ديون مسددة</Typography>
                            <Typography variant="h5">{stats.paidCount}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Tabs */}
            <Paper sx={{ mb: 2 }}>
                <Tabs value={activeTab} onChange={(_, v) => { setActiveTab(v); setPage(0); }}>
                    {tabLabels.map((label, idx) => (
                        <Tab key={idx} label={label} />
                    ))}
                </Tabs>
            </Paper>

            {/* Table */}
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow sx={{ bgcolor: 'grey.100' }}>
                            <TableCell>الموظف</TableCell>
                            <TableCell>النوع</TableCell>
                            <TableCell>الوصف</TableCell>
                            <TableCell>المبلغ الأصلي</TableCell>
                            <TableCell>المتبقي</TableCell>
                            <TableCell>نسبة السداد</TableCell>
                            <TableCell>الحالة</TableCell>
                            <TableCell align="center">الإجراءات</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {debts.map((debt) => {
                            const progress = ((Number(debt.originalAmount) - Number(debt.remainingAmount)) / Number(debt.originalAmount)) * 100;
                            return (
                                <TableRow key={debt.id} hover>
                                    <TableCell>
                                        {debt.employee ? (
                                            <>
                                                <Typography variant="body2">
                                                    {debt.employee.firstName} {debt.employee.lastName}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {debt.employee.employeeCode}
                                                </Typography>
                                            </>
                                        ) : '-'}
                                    </TableCell>
                                    <TableCell>
                                        <Chip label={TYPE_LABELS[debt.type]} size="small" />
                                    </TableCell>
                                    <TableCell>{debt.description}</TableCell>
                                    <TableCell>{formatCurrency(Number(debt.originalAmount))}</TableCell>
                                    <TableCell sx={{ color: 'warning.main', fontWeight: 'bold' }}>
                                        {formatCurrency(Number(debt.remainingAmount))}
                                    </TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <LinearProgress
                                                variant="determinate"
                                                value={isNaN(progress) ? 0 : progress}
                                                sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                                                color={progress >= 100 ? 'success' : 'primary'}
                                            />
                                            <Typography variant="body2">{isNaN(progress) ? 0 : progress.toFixed(0)}%</Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={STATUS_CONFIG[debt.status]?.label || debt.status}
                                            color={STATUS_CONFIG[debt.status]?.color || 'default'}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell align="center">
                                        <Tooltip title="سجل الحركات">
                                            <IconButton size="small" onClick={() => handleViewLedger(debt)}>
                                                <HistoryIcon />
                                            </IconButton>
                                        </Tooltip>
                                        {debt.status === 'ACTIVE' && (
                                            <>
                                                <Tooltip title="تسجيل دفعة">
                                                    <IconButton
                                                        size="small"
                                                        color="primary"
                                                        onClick={() => openPaymentDialog(debt)}
                                                    >
                                                        <PaymentIcon />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="تعليق">
                                                    <IconButton
                                                        size="small"
                                                        color="warning"
                                                        onClick={() => handleSuspend(debt)}
                                                    >
                                                        <PauseIcon />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="شطب">
                                                    <IconButton
                                                        size="small"
                                                        color="error"
                                                        onClick={() => handleWriteOff(debt)}
                                                    >
                                                        <DeleteIcon />
                                                    </IconButton>
                                                </Tooltip>
                                            </>
                                        )}
                                        {debt.status === 'SUSPENDED' && (
                                            <Tooltip title="استئناف">
                                                <IconButton
                                                    size="small"
                                                    color="success"
                                                    onClick={() => handleResume(debt)}
                                                >
                                                    <PlayArrowIcon />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {debts.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={8} align="center">
                                    لا توجد بيانات
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
                <TablePagination
                    component="div"
                    count={total}
                    page={page}
                    onPageChange={(_, p) => setPage(p)}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={(e) => {
                        setRowsPerPage(parseInt(e.target.value, 10));
                        setPage(0);
                    }}
                    labelRowsPerPage="صفوف لكل صفحة:"
                    labelDisplayedRows={({ from, to, count }) => `${from}-${to} من ${count}`}
                />
            </TableContainer>

            {/* Create Debt Dialog */}
            <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>إنشاء دين جديد</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="معرف الموظف"
                                value={createForm.employeeId}
                                onChange={(e) => setCreateForm({ ...createForm, employeeId: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                select
                                fullWidth
                                label="نوع الدين"
                                value={createForm.type}
                                onChange={(e) => setCreateForm({ ...createForm, type: e.target.value as any })}
                            >
                                {Object.entries(TYPE_LABELS).map(([value, label]) => (
                                    <MenuItem key={value} value={value}>{label}</MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                type="date"
                                label="تاريخ البدء"
                                value={createForm.startDate}
                                onChange={(e) => setCreateForm({ ...createForm, startDate: e.target.value })}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="الوصف"
                                value={createForm.description}
                                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                type="number"
                                label="المبلغ الأصلي (ريال)"
                                value={createForm.originalAmount}
                                onChange={(e) => setCreateForm({ ...createForm, originalAmount: parseFloat(e.target.value) })}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                type="number"
                                label="الاستقطاع الشهري (ريال)"
                                value={createForm.monthlyDeduction}
                                onChange={(e) => setCreateForm({ ...createForm, monthlyDeduction: parseFloat(e.target.value) })}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                multiline
                                rows={2}
                                label="ملاحظات"
                                value={createForm.notes || ''}
                                onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCreateDialogOpen(false)}>إلغاء</Button>
                    <Button
                        variant="contained"
                        onClick={handleCreateDebt}
                        disabled={!createForm.employeeId || createForm.originalAmount <= 0}
                    >
                        إنشاء
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Payment Dialog */}
            <Dialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>تسجيل دفعة</DialogTitle>
                <DialogContent>
                    {selectedDebt && (
                        <Alert severity="info" sx={{ mb: 2 }}>
                            المتبقي: {formatCurrency(Number(selectedDebt.remainingAmount))}
                        </Alert>
                    )}
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                type="number"
                                label="المبلغ (ريال)"
                                value={paymentForm.amount}
                                onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) })}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                select
                                fullWidth
                                label="طريقة الدفع"
                                value={paymentForm.paymentMethod}
                                onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value as any })}
                            >
                                <MenuItem value="CASH">نقدي</MenuItem>
                                <MenuItem value="BANK_TRANSFER">تحويل بنكي</MenuItem>
                                <MenuItem value="CHEQUE">شيك</MenuItem>
                            </TextField>
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="رقم المرجع"
                                value={paymentForm.reference || ''}
                                onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                multiline
                                rows={2}
                                label="ملاحظات"
                                value={paymentForm.notes || ''}
                                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPaymentDialogOpen(false)}>إلغاء</Button>
                    <Button
                        variant="contained"
                        onClick={handlePayment}
                        disabled={paymentForm.amount <= 0}
                    >
                        تسجيل الدفعة
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Ledger Drawer */}
            <Drawer
                anchor="left"
                open={ledgerDrawerOpen}
                onClose={() => setLedgerDrawerOpen(false)}
            >
                <Box sx={{ width: 400, p: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h6">سجل الحركات</Typography>
                        <IconButton onClick={() => setLedgerDrawerOpen(false)}>
                            <CloseIcon />
                        </IconButton>
                    </Box>
                    {selectedDebt && (
                        <Alert severity="info" sx={{ mb: 2 }}>
                            {selectedDebt.description} - المتبقي: {formatCurrency(Number(selectedDebt.remainingAmount))}
                        </Alert>
                    )}
                    <List>
                        {ledgerEntries.map((entry, idx) => (
                            <Box key={entry.id}>
                                <ListItem>
                                    <ListItemText
                                        primary={
                                            <Box display="flex" justifyContent="space-between">
                                                <Chip
                                                    label={LEDGER_TYPE_LABELS[entry.type] || entry.type}
                                                    size="small"
                                                    color={entry.type === 'INITIAL' ? 'default' : Number(entry.amount) > 0 ? 'error' : 'success'}
                                                />
                                                <Typography
                                                    variant="body2"
                                                    color={Number(entry.amount) > 0 ? 'error.main' : 'success.main'}
                                                    fontWeight="bold"
                                                >
                                                    {Number(entry.amount) > 0 ? '+' : ''}{formatCurrency(Number(entry.amount))}
                                                </Typography>
                                            </Box>
                                        }
                                        secondary={
                                            <>
                                                <Typography variant="caption" display="block">
                                                    الرصيد بعد: {formatCurrency(Number(entry.balanceAfter))}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {new Date(entry.createdAt).toLocaleString('ar-SA')}
                                                </Typography>
                                                {entry.description && (
                                                    <Typography variant="caption" display="block">
                                                        {entry.description}
                                                    </Typography>
                                                )}
                                            </>
                                        }
                                    />
                                </ListItem>
                                {idx < ledgerEntries.length - 1 && <Divider />}
                            </Box>
                        ))}
                        {ledgerEntries.length === 0 && (
                            <ListItem>
                                <ListItemText primary="لا توجد حركات" />
                            </ListItem>
                        )}
                    </List>
                </Box>
            </Drawer>
        </Box>
    );
}
