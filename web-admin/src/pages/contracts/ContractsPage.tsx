import { useState, useEffect } from 'react';
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
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    MenuItem,
    Chip,
    Alert,
    CircularProgress,
    Tooltip,
    Grid,
    Card,
    CardContent,
    Tabs,
    Tab,
    Divider,
    FormControl,
    InputLabel,
    Select,
    InputAdornment,
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Description as ContractIcon,
    Cancel as TerminateIcon,
    Refresh as RenewIcon,
    Warning as ExpiringIcon,
    Send as SendIcon,
    CheckCircle as SignIcon,
    CloudUpload as QiwaIcon,
    Sync as SyncIcon,
} from '@mui/icons-material';
import { api } from '@/services/api.service';
import {
    Contract,
    ContractType,
    QiwaAuthStatus,
    ContractStats,
    contractTypeLabels,
    contractStatusLabels,
    contractStatusColors,
    qiwaStatusLabels,
    qiwaStatusColors,
    contractsService,
} from '@/services/contracts.service';

interface User {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
}

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;
    return (
        <div role="tabpanel" hidden={value !== index} {...other}>
            {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
        </div>
    );
}

export default function ContractsPage() {
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [expiringContracts, setExpiringContracts] = useState<Contract[]>([]);
    const [pendingEmployer, setPendingEmployer] = useState<Contract[]>([]);
    const [stats, setStats] = useState<ContractStats | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [tabValue, setTabValue] = useState(0);
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [qiwaFilter, setQiwaFilter] = useState<string>('');

    // Dialog states
    const [dialogOpen, setDialogOpen] = useState(false);
    const [terminateDialogOpen, setTerminateDialogOpen] = useState(false);
    const [renewDialogOpen, setRenewDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [qiwaDialogOpen, setQiwaDialogOpen] = useState(false);
    const [selectedContract, setSelectedContract] = useState<Contract | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        userId: '',
        type: 'PERMANENT' as ContractType,
        startDate: '',
        endDate: '',
        probationEndDate: '',
        salaryCycle: 'MONTHLY',
        basicSalary: '',
        housingAllowance: '',
        transportAllowance: '',
        otherAllowances: '',
        contractJobTitle: '',
        workLocation: '',
        workingHoursPerWeek: '48',
        annualLeaveDays: '21',
        noticePeriodDays: '30',
        notes: '',
    });

    const [terminationReason, setTerminationReason] = useState('');
    const [renewEndDate, setRenewEndDate] = useState('');
    const [renewSalary, setRenewSalary] = useState('');
    const [qiwaData, setQiwaData] = useState({
        qiwaContractId: '',
        qiwaStatus: 'AUTHENTICATED' as QiwaAuthStatus,
    });

    useEffect(() => {
        fetchData();
    }, [statusFilter, qiwaFilter]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [contractsRes, expiringRes, pendingRes, statsRes, usersRes] = await Promise.all([
                contractsService.getAll({ status: statusFilter || undefined, qiwaStatus: qiwaFilter || undefined }),
                contractsService.getExpiring(30),
                contractsService.getPendingForEmployer(),
                contractsService.getStats(),
                api.get('/users'),
            ]);
            setContracts(contractsRes);
            setExpiringContracts(expiringRes);
            setPendingEmployer(pendingRes);
            setStats(statsRes);
            setUsers((usersRes as any).data || usersRes as User[]);
            setError(null);
        } catch (err: any) {
            setError(err.response?.data?.message || 'حدث خطأ');
        } finally {
            setLoading(false);
        }
    };

    // Dialog handlers
    const handleOpenDialog = (contract?: Contract) => {
        if (contract) {
            setSelectedContract(contract);
            setFormData({
                userId: contract.userId,
                type: contract.type,
                startDate: contract.startDate?.slice(0, 10) || '',
                endDate: contract.endDate?.slice(0, 10) || '',
                probationEndDate: contract.probationEndDate?.slice(0, 10) || '',
                salaryCycle: contract.salaryCycle || 'MONTHLY',
                basicSalary: contract.basicSalary?.toString() || '',
                housingAllowance: contract.housingAllowance?.toString() || '',
                transportAllowance: contract.transportAllowance?.toString() || '',
                otherAllowances: contract.otherAllowances?.toString() || '',
                contractJobTitle: contract.contractJobTitle || '',
                workLocation: contract.workLocation || '',
                workingHoursPerWeek: contract.workingHoursPerWeek?.toString() || '48',
                annualLeaveDays: contract.annualLeaveDays?.toString() || '21',
                noticePeriodDays: contract.noticePeriodDays?.toString() || '30',
                notes: contract.notes || '',
            });
        } else {
            setSelectedContract(null);
            setFormData({
                userId: '',
                type: 'PERMANENT',
                startDate: new Date().toISOString().slice(0, 10),
                endDate: '',
                probationEndDate: '',
                salaryCycle: 'MONTHLY',
                basicSalary: '',
                housingAllowance: '',
                transportAllowance: '',
                otherAllowances: '',
                contractJobTitle: '',
                workLocation: '',
                workingHoursPerWeek: '48',
                annualLeaveDays: '21',
                noticePeriodDays: '30',
                notes: '',
            });
        }
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setSelectedContract(null);
    };

    const handleSubmit = async () => {
        try {
            const data = {
                ...formData,
                basicSalary: formData.basicSalary ? parseFloat(formData.basicSalary) : undefined,
                housingAllowance: formData.housingAllowance ? parseFloat(formData.housingAllowance) : undefined,
                transportAllowance: formData.transportAllowance ? parseFloat(formData.transportAllowance) : undefined,
                otherAllowances: formData.otherAllowances ? parseFloat(formData.otherAllowances) : undefined,
                workingHoursPerWeek: formData.workingHoursPerWeek ? parseInt(formData.workingHoursPerWeek) : undefined,
                annualLeaveDays: formData.annualLeaveDays ? parseInt(formData.annualLeaveDays) : undefined,
                noticePeriodDays: formData.noticePeriodDays ? parseInt(formData.noticePeriodDays) : undefined,
            };
            if (selectedContract) {
                await contractsService.update(selectedContract.id, data);
                setSuccess('تم تحديث العقد بنجاح');
            } else {
                await contractsService.create(data);
                setSuccess('تم إنشاء العقد بنجاح');
            }
            handleCloseDialog();
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.message || 'حدث خطأ');
        }
    };

    // Send to employee
    const handleSendToEmployee = async (contract: Contract) => {
        try {
            await contractsService.sendToEmployee(contract.id);
            setSuccess('تم إرسال العقد للموظف للتوقيع');
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.message || 'حدث خطأ');
        }
    };

    // Employer sign
    const handleEmployerSign = async (contract: Contract) => {
        try {
            await contractsService.employerSign(contract.id);
            setSuccess('تم توقيع العقد بنجاح');
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.message || 'حدث خطأ');
        }
    };

    // Qiwa status
    const handleOpenQiwa = (contract: Contract) => {
        setSelectedContract(contract);
        setQiwaData({
            qiwaContractId: contract.qiwaContractId || '',
            qiwaStatus: contract.qiwaStatus || 'NOT_SUBMITTED',
        });
        setQiwaDialogOpen(true);
    };

    const handleQiwaUpdate = async () => {
        if (!selectedContract) return;
        try {
            await contractsService.updateQiwaStatus(selectedContract.id, qiwaData);
            setSuccess('تم تحديث حالة قوى');
            setQiwaDialogOpen(false);
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.message || 'حدث خطأ');
        }
    };

    // Register to QIWA
    const handleRegisterToQiwa = async (contract: Contract) => {
        try {
            await contractsService.registerToQiwa(contract.id);
            setSuccess('تم تسجيل العقد في منصة قوى بنجاح');
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.message || 'حدث خطأ');
        }
    };

    // Sync QIWA status
    const handleSyncQiwaStatus = async (contract: Contract) => {
        try {
            await contractsService.syncQiwaStatus(contract.id);
            setSuccess('تم مزامنة حالة العقد من منصة قوى');
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.message || 'حدث خطأ');
        }
    };

    // Terminate
    const handleOpenTerminate = (contract: Contract) => {
        setSelectedContract(contract);
        setTerminationReason('');
        setTerminateDialogOpen(true);
    };

    const handleTerminate = async () => {
        if (!selectedContract) return;
        try {
            await contractsService.terminate(selectedContract.id, { terminationReason });
            setSuccess('تم إنهاء العقد');
            setTerminateDialogOpen(false);
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.message || 'حدث خطأ');
        }
    };

    // Renew
    const handleOpenRenew = (contract: Contract) => {
        setSelectedContract(contract);
        setRenewEndDate('');
        setRenewSalary(contract.basicSalary?.toString() || '');
        setRenewDialogOpen(true);
    };

    const handleRenew = async () => {
        if (!selectedContract) return;
        try {
            await contractsService.renew(selectedContract.id, {
                newEndDate: renewEndDate,
                newBasicSalary: renewSalary ? parseFloat(renewSalary) : undefined,
            });
            setSuccess('تم تجديد العقد');
            setRenewDialogOpen(false);
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.message || 'حدث خطأ');
        }
    };

    // Delete
    const handleOpenDelete = (contract: Contract) => {
        setSelectedContract(contract);
        setDeleteDialogOpen(true);
    };

    const handleDelete = async () => {
        if (!selectedContract) return;
        try {
            await contractsService.delete(selectedContract.id);
            setSuccess('تم حذف العقد');
            setDeleteDialogOpen(false);
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.message || 'حدث خطأ');
        }
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('ar-SA');
    };

    const formatMoney = (amount?: number) => {
        if (!amount) return '-';
        return amount.toLocaleString('ar-SA') + ' ر.س';
    };

    if (loading && !contracts.length) {
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
                    <ContractIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    إدارة العقود - متوافق مع قوى
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog()}
                >
                    عقد جديد
                </Button>
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

            {/* Stats Cards */}
            {stats && (
                <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={6} sm={4} md={2}>
                        <Card sx={{ bgcolor: 'success.light', color: 'success.contrastText' }}>
                            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                                <Typography variant="h4" fontWeight="bold">{stats.byStatus.active}</Typography>
                                <Typography variant="body2">عقود نشطة</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={6} sm={4} md={2}>
                        <Card sx={{ bgcolor: 'warning.light', color: 'warning.contrastText' }}>
                            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                                <Typography variant="h4" fontWeight="bold">{stats.expiringSoon}</Typography>
                                <Typography variant="body2">تنتهي قريباً</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={6} sm={4} md={2}>
                        <Card sx={{ bgcolor: 'info.light', color: 'info.contrastText' }}>
                            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                                <Typography variant="h4" fontWeight="bold">
                                    {stats.byStatus.pendingEmployee + stats.byStatus.pendingEmployer}
                                </Typography>
                                <Typography variant="body2">بانتظار التوقيع</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={6} sm={4} md={2}>
                        <Card sx={{ bgcolor: 'grey.300' }}>
                            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                                <Typography variant="h4" fontWeight="bold">{stats.byStatus.draft}</Typography>
                                <Typography variant="body2">مسودات</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={6} sm={4} md={2}>
                        <Card sx={{ bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                                <Typography variant="h4" fontWeight="bold">{stats.byQiwaStatus.authenticated}</Typography>
                                <Typography variant="body2">موثق في قوى</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={6} sm={4} md={2}>
                        <Card sx={{ bgcolor: 'error.light', color: 'error.contrastText' }}>
                            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                                <Typography variant="h4" fontWeight="bold">{stats.byQiwaStatus.notSubmitted}</Typography>
                                <Typography variant="body2">غير موثق</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            )}

            {/* Alerts */}
            {expiringContracts.length > 0 && (
                <Alert severity="warning" icon={<ExpiringIcon />} sx={{ mb: 2 }}>
                    يوجد {expiringContracts.length} عقد ينتهي خلال 30 يوم
                </Alert>
            )}
            {pendingEmployer.length > 0 && (
                <Alert severity="info" icon={<SignIcon />} sx={{ mb: 2 }}>
                    يوجد {pendingEmployer.length} عقد بانتظار توقيعك
                </Alert>
            )}

            {/* Tabs */}
            <Paper sx={{ mb: 2 }}>
                <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
                    <Tab label="كل العقود" icon={<ContractIcon />} iconPosition="start" />
                    <Tab label="بانتظار التوقيع" icon={<SignIcon />} iconPosition="start" />
                    <Tab label="تنتهي قريباً" icon={<ExpiringIcon />} iconPosition="start" />
                </Tabs>
            </Paper>

            {/* Filters */}
            <Box display="flex" gap={2} mb={2}>
                <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>حالة العقد</InputLabel>
                    <Select
                        value={statusFilter}
                        label="حالة العقد"
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <MenuItem value="">الكل</MenuItem>
                        {Object.entries(contractStatusLabels).map(([value, label]) => (
                            <MenuItem key={value} value={value}>{label}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>حالة قوى</InputLabel>
                    <Select
                        value={qiwaFilter}
                        label="حالة قوى"
                        onChange={(e) => setQiwaFilter(e.target.value)}
                    >
                        <MenuItem value="">الكل</MenuItem>
                        {Object.entries(qiwaStatusLabels).map(([value, label]) => (
                            <MenuItem key={value} value={value}>{label}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Box>

            {/* Tab Panels */}
            <TabPanel value={tabValue} index={0}>
                <ContractsTable
                    contracts={contracts}
                    formatDate={formatDate}
                    formatMoney={formatMoney}
                    onEdit={handleOpenDialog}
                    onSendToEmployee={handleSendToEmployee}
                    onEmployerSign={handleEmployerSign}
                    onQiwa={handleOpenQiwa}
                    onRegisterToQiwa={handleRegisterToQiwa}
                    onSyncQiwaStatus={handleSyncQiwaStatus}
                    onRenew={handleOpenRenew}
                    onTerminate={handleOpenTerminate}
                    onDelete={handleOpenDelete}
                />
            </TabPanel>
            <TabPanel value={tabValue} index={1}>
                <ContractsTable
                    contracts={pendingEmployer}
                    formatDate={formatDate}
                    formatMoney={formatMoney}
                    onEdit={handleOpenDialog}
                    onSendToEmployee={handleSendToEmployee}
                    onEmployerSign={handleEmployerSign}
                    onQiwa={handleOpenQiwa}
                    onRegisterToQiwa={handleRegisterToQiwa}
                    onSyncQiwaStatus={handleSyncQiwaStatus}
                    onRenew={handleOpenRenew}
                    onTerminate={handleOpenTerminate}
                    onDelete={handleOpenDelete}
                />
            </TabPanel>
            <TabPanel value={tabValue} index={2}>
                <ContractsTable
                    contracts={expiringContracts}
                    formatDate={formatDate}
                    formatMoney={formatMoney}
                    onEdit={handleOpenDialog}
                    onSendToEmployee={handleSendToEmployee}
                    onEmployerSign={handleEmployerSign}
                    onQiwa={handleOpenQiwa}
                    onRegisterToQiwa={handleRegisterToQiwa}
                    onSyncQiwaStatus={handleSyncQiwaStatus}
                    onRenew={handleOpenRenew}
                    onTerminate={handleOpenTerminate}
                    onDelete={handleOpenDelete}
                />
            </TabPanel>

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
                <DialogTitle>
                    {selectedContract ? 'تعديل العقد' : 'إنشاء عقد جديد'}
                </DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        {/* Basic Info */}
                        <Grid item xs={12}>
                            <Typography variant="subtitle2" color="primary" gutterBottom>
                                البيانات الأساسية
                            </Typography>
                            <Divider sx={{ mb: 2 }} />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                select
                                fullWidth
                                label="الموظف"
                                value={formData.userId}
                                onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                                disabled={!!selectedContract}
                            >
                                {users.map((user) => (
                                    <MenuItem key={user.id} value={user.id}>
                                        {user.firstName} {user.lastName} ({user.employeeCode})
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                select
                                fullWidth
                                label="نوع العقد"
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value as ContractType })}
                            >
                                {Object.entries(contractTypeLabels).map(([value, label]) => (
                                    <MenuItem key={value} value={value}>{label}</MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                fullWidth
                                label="تاريخ البداية"
                                type="date"
                                value={formData.startDate}
                                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                fullWidth
                                label="تاريخ النهاية"
                                type="date"
                                value={formData.endDate}
                                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                fullWidth
                                label="نهاية فترة التجربة"
                                type="date"
                                value={formData.probationEndDate}
                                onChange={(e) => setFormData({ ...formData, probationEndDate: e.target.value })}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>

                        {/* Salary Info */}
                        <Grid item xs={12}>
                            <Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 2 }}>
                                بيانات الراتب - مطلوبة لقوى
                            </Typography>
                            <Divider sx={{ mb: 2 }} />
                        </Grid>
                        <Grid item xs={12} sm={3}>
                            <TextField
                                fullWidth
                                label="الراتب الأساسي"
                                type="number"
                                value={formData.basicSalary}
                                onChange={(e) => setFormData({ ...formData, basicSalary: e.target.value })}
                                InputProps={{ endAdornment: <InputAdornment position="end">ر.س</InputAdornment> }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={3}>
                            <TextField
                                fullWidth
                                label="بدل السكن"
                                type="number"
                                value={formData.housingAllowance}
                                onChange={(e) => setFormData({ ...formData, housingAllowance: e.target.value })}
                                InputProps={{ endAdornment: <InputAdornment position="end">ر.س</InputAdornment> }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={3}>
                            <TextField
                                fullWidth
                                label="بدل المواصلات"
                                type="number"
                                value={formData.transportAllowance}
                                onChange={(e) => setFormData({ ...formData, transportAllowance: e.target.value })}
                                InputProps={{ endAdornment: <InputAdornment position="end">ر.س</InputAdornment> }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={3}>
                            <TextField
                                fullWidth
                                label="بدلات أخرى"
                                type="number"
                                value={formData.otherAllowances}
                                onChange={(e) => setFormData({ ...formData, otherAllowances: e.target.value })}
                                InputProps={{ endAdornment: <InputAdornment position="end">ر.س</InputAdornment> }}
                            />
                        </Grid>

                        {/* Work Info */}
                        <Grid item xs={12}>
                            <Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 2 }}>
                                بيانات العمل
                            </Typography>
                            <Divider sx={{ mb: 2 }} />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="المسمى الوظيفي في العقد"
                                value={formData.contractJobTitle}
                                onChange={(e) => setFormData({ ...formData, contractJobTitle: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="مقر العمل"
                                value={formData.workLocation}
                                onChange={(e) => setFormData({ ...formData, workLocation: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                fullWidth
                                label="ساعات العمل الأسبوعية"
                                type="number"
                                value={formData.workingHoursPerWeek}
                                onChange={(e) => setFormData({ ...formData, workingHoursPerWeek: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                fullWidth
                                label="أيام الإجازة السنوية"
                                type="number"
                                value={formData.annualLeaveDays}
                                onChange={(e) => setFormData({ ...formData, annualLeaveDays: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                fullWidth
                                label="فترة الإشعار (أيام)"
                                type="number"
                                value={formData.noticePeriodDays}
                                onChange={(e) => setFormData({ ...formData, noticePeriodDays: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="ملاحظات داخلية"
                                multiline
                                rows={2}
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>إلغاء</Button>
                    <Button variant="contained" onClick={handleSubmit}>
                        {selectedContract ? 'تحديث' : 'إنشاء'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Qiwa Status Dialog */}
            <Dialog open={qiwaDialogOpen} onClose={() => setQiwaDialogOpen(false)}>
                <DialogTitle>
                    <QiwaIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    تحديث حالة قوى
                </DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="رقم العقد في قوى"
                                value={qiwaData.qiwaContractId}
                                onChange={(e) => setQiwaData({ ...qiwaData, qiwaContractId: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                select
                                fullWidth
                                label="حالة التوثيق"
                                value={qiwaData.qiwaStatus}
                                onChange={(e) => setQiwaData({ ...qiwaData, qiwaStatus: e.target.value as QiwaAuthStatus })}
                            >
                                {Object.entries(qiwaStatusLabels).map(([value, label]) => (
                                    <MenuItem key={value} value={value}>{label}</MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setQiwaDialogOpen(false)}>إلغاء</Button>
                    <Button variant="contained" onClick={handleQiwaUpdate}>حفظ</Button>
                </DialogActions>
            </Dialog>

            {/* Terminate Dialog */}
            <Dialog open={terminateDialogOpen} onClose={() => setTerminateDialogOpen(false)}>
                <DialogTitle>إنهاء العقد</DialogTitle>
                <DialogContent>
                    <Typography sx={{ mb: 2 }}>
                        هل أنت متأكد من إنهاء عقد الموظف{' '}
                        <strong>
                            {selectedContract?.user?.firstName} {selectedContract?.user?.lastName}
                        </strong>
                        ؟
                    </Typography>
                    <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label="سبب الإنهاء"
                        value={terminationReason}
                        onChange={(e) => setTerminationReason(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setTerminateDialogOpen(false)}>إلغاء</Button>
                    <Button
                        variant="contained"
                        color="warning"
                        onClick={handleTerminate}
                        disabled={!terminationReason}
                    >
                        إنهاء العقد
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Renew Dialog */}
            <Dialog open={renewDialogOpen} onClose={() => setRenewDialogOpen(false)}>
                <DialogTitle>تجديد العقد</DialogTitle>
                <DialogContent>
                    <Typography sx={{ mb: 2 }}>
                        تجديد عقد الموظف{' '}
                        <strong>
                            {selectedContract?.user?.firstName} {selectedContract?.user?.lastName}
                        </strong>
                    </Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                type="date"
                                label="تاريخ انتهاء العقد الجديد"
                                value={renewEndDate}
                                onChange={(e) => setRenewEndDate(e.target.value)}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                type="number"
                                label="الراتب الأساسي الجديد (اختياري)"
                                value={renewSalary}
                                onChange={(e) => setRenewSalary(e.target.value)}
                                InputProps={{ endAdornment: <InputAdornment position="end">ر.س</InputAdornment> }}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRenewDialogOpen(false)}>إلغاء</Button>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleRenew}
                        disabled={!renewEndDate}
                    >
                        تجديد
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle>حذف العقد</DialogTitle>
                <DialogContent>
                    <Typography>
                        هل أنت متأكد من حذف العقد رقم{' '}
                        <strong>{selectedContract?.contractNumber}</strong>؟
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        ملاحظة: يمكن حذف العقود المسودة فقط
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>إلغاء</Button>
                    <Button variant="contained" color="error" onClick={handleDelete}>
                        حذف
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

// Contracts Table Component
function ContractsTable({
    contracts,
    formatDate,
    formatMoney,
    onEdit,
    onSendToEmployee,
    onEmployerSign,
    onQiwa,
    onRegisterToQiwa,
    onSyncQiwaStatus,
    onRenew,
    onTerminate,
    onDelete,
}: {
    contracts: Contract[];
    formatDate: (d?: string) => string;
    formatMoney: (n?: number) => string;
    onEdit: (c: Contract) => void;
    onSendToEmployee: (c: Contract) => void;
    onEmployerSign: (c: Contract) => void;
    onQiwa: (c: Contract) => void;
    onRegisterToQiwa: (c: Contract) => void;
    onSyncQiwaStatus: (c: Contract) => void;
    onRenew: (c: Contract) => void;
    onTerminate: (c: Contract) => void;
    onDelete: (c: Contract) => void;
}) {
    return (
        <TableContainer component={Paper}>
            <Table size="small">
                <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.100' }}>
                        <TableCell>الموظف</TableCell>
                        <TableCell>رقم العقد</TableCell>
                        <TableCell>النوع</TableCell>
                        <TableCell>الحالة</TableCell>
                        <TableCell>قوى</TableCell>
                        <TableCell>الراتب</TableCell>
                        <TableCell>تاريخ البداية</TableCell>
                        <TableCell>تاريخ النهاية</TableCell>
                        <TableCell align="center">الإجراءات</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {contracts.map((contract) => (
                        <TableRow key={contract.id} hover>
                            <TableCell>
                                {contract.user
                                    ? `${contract.user.firstName} ${contract.user.lastName}`
                                    : '-'}
                                <br />
                                <Typography variant="caption" color="text.secondary">
                                    {contract.user?.employeeCode}
                                </Typography>
                            </TableCell>
                            <TableCell>{contract.contractNumber || '-'}</TableCell>
                            <TableCell>
                                <Chip
                                    label={contractTypeLabels[contract.type]}
                                    size="small"
                                    variant="outlined"
                                />
                            </TableCell>
                            <TableCell>
                                <Chip
                                    label={contractStatusLabels[contract.status]}
                                    size="small"
                                    color={contractStatusColors[contract.status]}
                                />
                            </TableCell>
                            <TableCell>
                                <Chip
                                    label={qiwaStatusLabels[contract.qiwaStatus || 'NOT_SUBMITTED']}
                                    size="small"
                                    color={qiwaStatusColors[contract.qiwaStatus || 'NOT_SUBMITTED']}
                                    variant="outlined"
                                />
                            </TableCell>
                            <TableCell>{formatMoney(contract.totalSalary || contract.basicSalary)}</TableCell>
                            <TableCell>{formatDate(contract.startDate)}</TableCell>
                            <TableCell>{formatDate(contract.endDate)}</TableCell>
                            <TableCell align="center">
                                <Tooltip title="تعديل">
                                    <IconButton size="small" onClick={() => onEdit(contract)}>
                                        <EditIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                                {contract.status === 'DRAFT' && (
                                    <Tooltip title="إرسال للموظف للتوقيع">
                                        <IconButton size="small" color="primary" onClick={() => onSendToEmployee(contract)}>
                                            <SendIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                )}
                                {contract.status === 'PENDING_EMPLOYER' && (
                                    <Tooltip title="توقيع صاحب العمل">
                                        <IconButton size="small" color="success" onClick={() => onEmployerSign(contract)}>
                                            <SignIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                )}
                                {contract.status === 'ACTIVE' && (
                                    <>
                                        {/* Register to QIWA for NOT_SUBMITTED contracts */}
                                        {(!contract.qiwaStatus || contract.qiwaStatus === 'NOT_SUBMITTED') && (
                                            <Tooltip title="تسجيل في منصة قوى">
                                                <IconButton size="small" color="primary" onClick={() => onRegisterToQiwa(contract)}>
                                                    <QiwaIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                        {/* Sync QIWA status for registered contracts */}
                                        {(contract.qiwaStatus === 'PENDING' || contract.qiwaStatus === 'AUTHENTICATED' || contract.qiwaStatus === 'REJECTED' || contract.qiwaStatus === 'EXPIRED') && (
                                            <Tooltip title="مزامنة حالة قوى">
                                                <IconButton size="small" color="info" onClick={() => onSyncQiwaStatus(contract)}>
                                                    <SyncIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                        {/* Manual QIWA update dialog */}
                                        <Tooltip title="تحديث حالة قوى يدوياً">
                                            <IconButton size="small" color="info" onClick={() => onQiwa(contract)}>
                                                <QiwaIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="تجديد">
                                            <IconButton size="small" color="primary" onClick={() => onRenew(contract)}>
                                                <RenewIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="إنهاء">
                                            <IconButton size="small" color="warning" onClick={() => onTerminate(contract)}>
                                                <TerminateIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </>
                                )}
                                {contract.status === 'DRAFT' && (
                                    <Tooltip title="حذف">
                                        <IconButton size="small" color="error" onClick={() => onDelete(contract)}>
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                    {contracts.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={9} align="center">
                                لا توجد عقود
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </TableContainer>
    );
}
