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
    Tabs,
    Tab,
    Card,
    CardContent,
    Switch,
    FormControlLabel,
    Divider,
    InputAdornment,
} from '@mui/material';
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    AccountBalance as BankIcon,
    Star as PrimaryIcon,
    StarBorder as NotPrimaryIcon,
    CheckCircle as VerifiedIcon,
    Business as CompanyIcon,
    Person as PersonIcon,
    Edit as EditIcon,
    ContentCopy as CopyIcon,
    Search as SearchIcon,
    Warning as WarningIcon,
} from '@mui/icons-material';
import { api } from '@/services/api.service';
import {
    BankAccount,
    CreateBankAccountDto,
    saudiBanks,
    validateSaudiIBAN,
    extractBankCode,
    bankAccountsService,
} from '@/services/bank-accounts.service';
import {
    CompanyBankAccount,
    CreateCompanyBankAccountDto,
    SAUDI_BANKS,
    companyBankAccountsService,
    formatIBAN,
    validateSaudiIBAN as validateCompanyIBAN,
} from '@/services/company-bank-accounts.service';

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
        <div hidden={value !== index} {...other}>
            {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
        </div>
    );
}

export default function BankAccountsPage() {
    const [tabValue, setTabValue] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Company bank accounts
    const [companyAccounts, setCompanyAccounts] = useState<CompanyBankAccount[]>([]);
    const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
    const [editingCompanyAccount, setEditingCompanyAccount] = useState<CompanyBankAccount | null>(null);
    const [companyFormData, setCompanyFormData] = useState<CreateCompanyBankAccountDto>({
        bankName: '',
        bankCode: '',
        iban: '',
        accountName: '',
        isPrimary: false,
    });

    // Employee bank accounts
    const [employeeAccounts, setEmployeeAccounts] = useState<BankAccount[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [employeeDialogOpen, setEmployeeDialogOpen] = useState(false);
    const [employeeFormData, setEmployeeFormData] = useState<CreateBankAccountDto>({
        userId: '',
        bankName: '',
        bankCode: '',
        iban: '',
        accountHolderName: '',
        isPrimary: true,
    });

    // Common
    const [ibanError, setIbanError] = useState<string | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<{ type: 'company' | 'employee'; item: any } | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [companyRes, employeeRes, usersRes] = await Promise.all([
                companyBankAccountsService.getAll(),
                bankAccountsService.getAll(),
                api.get('/users'),
            ]);
            setCompanyAccounts(companyRes);
            setEmployeeAccounts(employeeRes);
            setUsers((usersRes as any).data || usersRes as User[]);
            setError(null);
        } catch (err: any) {
            setError(err.response?.data?.message || 'حدث خطأ في تحميل البيانات');
        } finally {
            setLoading(false);
        }
    };

    // ==================== Company Accounts ====================

    const handleOpenCompanyDialog = (account?: CompanyBankAccount) => {
        if (account) {
            setEditingCompanyAccount(account);
            setCompanyFormData({
                bankName: account.bankName,
                bankCode: account.bankCode,
                iban: account.iban,
                accountName: account.accountName,
                swiftCode: account.swiftCode,
                isPrimary: account.isPrimary,
                molId: account.molId,
                wpsParticipant: account.wpsParticipant,
                notes: account.notes,
            });
        } else {
            setEditingCompanyAccount(null);
            setCompanyFormData({
                bankName: '',
                bankCode: '',
                iban: '',
                accountName: '',
                isPrimary: companyAccounts.length === 0,
            });
        }
        setIbanError(null);
        setCompanyDialogOpen(true);
    };

    const handleCompanyIbanChange = (iban: string) => {
        const clean = iban.replace(/\s/g, '').toUpperCase();
        setCompanyFormData({ ...companyFormData, iban: clean });

        if (clean.length > 0) {
            const validation = validateCompanyIBAN(clean);
            if (!validation.isValid) {
                setIbanError(validation.error || 'IBAN غير صحيح');
            } else {
                setIbanError(null);
                // Auto-detect bank from IBAN
                const bankCode = clean.substring(4, 6);
                const bank = SAUDI_BANKS.find(b => b.code.substring(0, 2) === bankCode);
                if (bank) {
                    setCompanyFormData(prev => ({
                        ...prev,
                        iban: clean,
                        bankCode: bank.code,
                        bankName: bank.name,
                        swiftCode: bank.swift,
                    }));
                }
            }
        } else {
            setIbanError(null);
        }
    };

    const handleCompanySubmit = async () => {
        if (ibanError) return;
        try {
            if (editingCompanyAccount) {
                await companyBankAccountsService.update(editingCompanyAccount.id, companyFormData);
                setSuccess('تم تحديث الحساب البنكي بنجاح');
            } else {
                await companyBankAccountsService.create(companyFormData);
                setSuccess('تم إضافة الحساب البنكي بنجاح');
            }
            setCompanyDialogOpen(false);
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.message || 'حدث خطأ');
        }
    };

    const handleSetCompanyPrimary = async (id: string) => {
        try {
            await companyBankAccountsService.setPrimary(id);
            setSuccess('تم تعيين الحساب كحساب رئيسي');
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.message || 'حدث خطأ');
        }
    };

    const handleToggleCompanyActive = async (id: string) => {
        try {
            await companyBankAccountsService.toggleActive(id);
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.message || 'حدث خطأ');
        }
    };

    // ==================== Employee Accounts ====================

    const handleOpenEmployeeDialog = () => {
        setEmployeeFormData({
            userId: '',
            bankName: '',
            bankCode: '',
            iban: '',
            accountHolderName: '',
            isPrimary: true,
        });
        setIbanError(null);
        setEmployeeDialogOpen(true);
    };

    const handleEmployeeIbanChange = (iban: string) => {
        const clean = iban.replace(/\s/g, '').toUpperCase();
        setEmployeeFormData({ ...employeeFormData, iban: clean });
        const validation = validateSaudiIBAN(clean);
        if (!validation.valid) {
            setIbanError(validation.message);
        } else {
            setIbanError(null);
            const bankCode = extractBankCode(clean);
            const bank = saudiBanks.find(b => b.code === bankCode);
            if (bank) {
                setEmployeeFormData(prev => ({
                    ...prev,
                    iban: clean,
                    bankCode,
                    bankName: bank.name,
                }));
            }
        }
    };

    const handleEmployeeSubmit = async () => {
        if (ibanError) return;
        try {
            await bankAccountsService.create(employeeFormData);
            setSuccess('تم إضافة الحساب البنكي للموظف بنجاح');
            setEmployeeDialogOpen(false);
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.message || 'حدث خطأ');
        }
    };

    const handleSetEmployeePrimary = async (id: string) => {
        try {
            await bankAccountsService.setPrimary(id);
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.message || 'حدث خطأ');
        }
    };

    const handleVerifyEmployee = async (id: string, isVerified: boolean) => {
        try {
            if (isVerified) {
                await bankAccountsService.unverify(id);
                setSuccess('تم إلغاء التحقق من الحساب');
            } else {
                await bankAccountsService.verify(id);
                setSuccess('تم التحقق من الحساب البنكي بنجاح ✓');
            }
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.message || 'حدث خطأ');
        }
    };

    // ==================== Delete ====================

    const handleOpenDelete = (type: 'company' | 'employee', item: any) => {
        setDeleteTarget({ type, item });
        setDeleteDialogOpen(true);
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            if (deleteTarget.type === 'company') {
                await companyBankAccountsService.delete(deleteTarget.item.id);
            } else {
                await bankAccountsService.delete(deleteTarget.item.id);
            }
            setSuccess('تم حذف الحساب البنكي بنجاح');
            setDeleteDialogOpen(false);
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.message || 'حدث خطأ');
        }
    };

    // ==================== Helpers ====================

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setSuccess('تم نسخ IBAN');
        setTimeout(() => setSuccess(null), 2000);
    };

    const employeesWithoutBank = users.filter(
        user => !employeeAccounts.some(acc => acc.userId === user.id)
    );

    const filteredEmployeeAccounts = employeeAccounts.filter(acc => {
        if (!searchTerm) return true;
        const name = `${acc.user?.firstName} ${acc.user?.lastName}`.toLowerCase();
        return name.includes(searchTerm.toLowerCase()) ||
            acc.iban.includes(searchTerm.toUpperCase()) ||
            acc.user?.employeeCode?.includes(searchTerm);
    });

    if (loading) {
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
                    <BankIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    إدارة الحسابات البنكية
                </Typography>
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

            {/* Summary Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={4}>
                    <Card sx={{ bgcolor: 'primary.50' }}>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <CompanyIcon color="primary" sx={{ fontSize: 40 }} />
                            <Typography variant="h4" fontWeight="bold">{companyAccounts.length}</Typography>
                            <Typography color="text.secondary">حسابات الشركة</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                    <Card sx={{ bgcolor: 'success.50' }}>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <PersonIcon color="success" sx={{ fontSize: 40 }} />
                            <Typography variant="h4" fontWeight="bold">{employeeAccounts.length}</Typography>
                            <Typography color="text.secondary">حسابات الموظفين</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                    <Card sx={{ bgcolor: employeesWithoutBank.length > 0 ? 'warning.50' : 'grey.100' }}>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <WarningIcon color={employeesWithoutBank.length > 0 ? 'warning' : 'disabled'} sx={{ fontSize: 40 }} />
                            <Typography variant="h4" fontWeight="bold">{employeesWithoutBank.length}</Typography>
                            <Typography color="text.secondary">موظف بدون حساب</Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Tabs */}
            <Paper sx={{ mb: 3 }}>
                <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
                    <Tab icon={<CompanyIcon />} label="حسابات الشركة" iconPosition="start" />
                    <Tab icon={<PersonIcon />} label="حسابات الموظفين" iconPosition="start" />
                </Tabs>

                {/* Company Accounts Tab */}
                <TabPanel value={tabValue} index={0}>
                    <Box sx={{ p: 2 }}>
                        <Box display="flex" justifyContent="flex-end" mb={2}>
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={() => handleOpenCompanyDialog()}
                            >
                                إضافة حساب للشركة
                            </Button>
                        </Box>

                        {companyAccounts.length === 0 ? (
                            <Alert severity="info">
                                لم يتم إضافة أي حساب بنكي للشركة. قم بإضافة حساب بنكي لتتمكن من إصدار ملفات WPS.
                            </Alert>
                        ) : (
                            <TableContainer>
                                <Table>
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: 'grey.100' }}>
                                            <TableCell>البنك</TableCell>
                                            <TableCell>IBAN</TableCell>
                                            <TableCell>اسم الحساب</TableCell>
                                            <TableCell>رقم المنشأة MOL</TableCell>
                                            <TableCell align="center">رئيسي</TableCell>
                                            <TableCell align="center">الحالة</TableCell>
                                            <TableCell align="center">الإجراءات</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {companyAccounts.map((account) => (
                                            <TableRow key={account.id} hover>
                                                <TableCell>
                                                    <Typography fontWeight="bold">{account.bankName}</Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {account.bankCode} | {account.swiftCode}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Box display="flex" alignItems="center" gap={1}>
                                                        <Typography fontFamily="monospace" fontSize={13}>
                                                            {formatIBAN(account.iban)}
                                                        </Typography>
                                                        <Tooltip title="نسخ">
                                                            <IconButton size="small" onClick={() => copyToClipboard(account.iban)}>
                                                                <CopyIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </Box>
                                                </TableCell>
                                                <TableCell>{account.accountName}</TableCell>
                                                <TableCell>{account.molId || '-'}</TableCell>
                                                <TableCell align="center">
                                                    <Tooltip title={account.isPrimary ? 'حساب رئيسي' : 'تعيين كرئيسي'}>
                                                        <IconButton
                                                            size="small"
                                                            color={account.isPrimary ? 'warning' : 'default'}
                                                            onClick={() => !account.isPrimary && handleSetCompanyPrimary(account.id)}
                                                        >
                                                            {account.isPrimary ? <PrimaryIcon /> : <NotPrimaryIcon />}
                                                        </IconButton>
                                                    </Tooltip>
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Switch
                                                        checked={account.isActive}
                                                        onChange={() => handleToggleCompanyActive(account.id)}
                                                        color="success"
                                                    />
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Tooltip title="تعديل">
                                                        <IconButton size="small" onClick={() => handleOpenCompanyDialog(account)}>
                                                            <EditIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="حذف">
                                                        <IconButton
                                                            size="small"
                                                            color="error"
                                                            onClick={() => handleOpenDelete('company', account)}
                                                        >
                                                            <DeleteIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </Box>
                </TabPanel>

                {/* Employee Accounts Tab */}
                <TabPanel value={tabValue} index={1}>
                    <Box sx={{ p: 2 }}>
                        <Box display="flex" justifyContent="space-between" mb={2}>
                            <TextField
                                size="small"
                                placeholder="بحث بالاسم أو IBAN أو الرقم الوظيفي..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon />
                                        </InputAdornment>
                                    ),
                                }}
                                sx={{ width: 300 }}
                            />
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={handleOpenEmployeeDialog}
                            >
                                إضافة حساب لموظف
                            </Button>
                        </Box>

                        {employeesWithoutBank.length > 0 && (
                            <Alert severity="warning" sx={{ mb: 2 }}>
                                يوجد {employeesWithoutBank.length} موظف بدون حساب بنكي مسجل
                            </Alert>
                        )}

                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow sx={{ bgcolor: 'grey.100' }}>
                                        <TableCell>الموظف</TableCell>
                                        <TableCell>البنك</TableCell>
                                        <TableCell>IBAN</TableCell>
                                        <TableCell>اسم صاحب الحساب</TableCell>
                                        <TableCell align="center">رئيسي</TableCell>
                                        <TableCell align="center">متحقق</TableCell>
                                        <TableCell align="center">الإجراءات</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filteredEmployeeAccounts.map((account) => (
                                        <TableRow key={account.id} hover>
                                            <TableCell>
                                                <Typography fontWeight="bold">
                                                    {account.user ? `${account.user.firstName} ${account.user.lastName}` : '-'}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {account.user?.employeeCode}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>{account.bankName}</TableCell>
                                            <TableCell>
                                                <Box display="flex" alignItems="center" gap={1}>
                                                    <Typography fontFamily="monospace" fontSize={12}>
                                                        {formatIBAN(account.iban)}
                                                    </Typography>
                                                    <Tooltip title="نسخ">
                                                        <IconButton size="small" onClick={() => copyToClipboard(account.iban)}>
                                                            <CopyIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Box>
                                            </TableCell>
                                            <TableCell>{account.accountHolderName || '-'}</TableCell>
                                            <TableCell align="center">
                                                <Tooltip title={account.isPrimary ? 'حساب رئيسي' : 'تعيين كرئيسي'}>
                                                    <IconButton
                                                        size="small"
                                                        color={account.isPrimary ? 'warning' : 'default'}
                                                        onClick={() => !account.isPrimary && handleSetEmployeePrimary(account.id)}
                                                    >
                                                        {account.isPrimary ? <PrimaryIcon /> : <NotPrimaryIcon />}
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Tooltip title={account.isVerified ? 'اضغط لإلغاء التحقق' : 'اضغط للتحقق من الحساب'}>
                                                    <Chip
                                                        icon={account.isVerified ? <VerifiedIcon /> : undefined}
                                                        label={account.isVerified ? 'متحقق ✓' : 'تحقق'}
                                                        size="small"
                                                        color={account.isVerified ? 'success' : 'default'}
                                                        variant={account.isVerified ? 'filled' : 'outlined'}
                                                        onClick={() => handleVerifyEmployee(account.id, account.isVerified)}
                                                        sx={{ cursor: 'pointer' }}
                                                    />
                                                </Tooltip>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Tooltip title="حذف">
                                                    <IconButton
                                                        size="small"
                                                        color="error"
                                                        onClick={() => handleOpenDelete('employee', account)}
                                                    >
                                                        <DeleteIcon />
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {filteredEmployeeAccounts.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={7} align="center">
                                                {searchTerm ? 'لا توجد نتائج مطابقة' : 'لا توجد حسابات بنكية مسجلة'}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                </TabPanel>
            </Paper>

            {/* Company Account Dialog */}
            <Dialog open={companyDialogOpen} onClose={() => setCompanyDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>
                    {editingCompanyAccount ? 'تعديل حساب بنكي' : 'إضافة حساب بنكي للشركة'}
                </DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="رقم IBAN"
                                placeholder="SA0000000000000000000000"
                                value={companyFormData.iban}
                                onChange={(e) => handleCompanyIbanChange(e.target.value)}
                                error={!!ibanError}
                                helperText={ibanError || 'أدخل IBAN السعودي (24 حرف)'}
                                inputProps={{ style: { fontFamily: 'monospace', letterSpacing: 2 } }}
                                disabled={!!editingCompanyAccount}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                select
                                fullWidth
                                label="البنك"
                                value={companyFormData.bankCode}
                                onChange={(e) => {
                                    const bank = SAUDI_BANKS.find(b => b.code === e.target.value);
                                    if (bank) {
                                        setCompanyFormData({
                                            ...companyFormData,
                                            bankCode: bank.code,
                                            bankName: bank.name,
                                            swiftCode: bank.swift,
                                        });
                                    }
                                }}
                            >
                                {SAUDI_BANKS.map((bank) => (
                                    <MenuItem key={bank.code} value={bank.code}>
                                        {bank.name} ({bank.code})
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="رمز السويفت"
                                value={companyFormData.swiftCode || ''}
                                onChange={(e) => setCompanyFormData({ ...companyFormData, swiftCode: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="اسم صاحب الحساب"
                                value={companyFormData.accountName}
                                onChange={(e) => setCompanyFormData({ ...companyFormData, accountName: e.target.value })}
                                required
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <Divider sx={{ my: 1 }}>بيانات WPS</Divider>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="رقم المنشأة في وزارة العمل (MOL ID)"
                                value={companyFormData.molId || ''}
                                onChange={(e) => setCompanyFormData({ ...companyFormData, molId: e.target.value })}
                                helperText="مطلوب لإصدار ملفات WPS"
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="رقم المشارك في WPS"
                                value={companyFormData.wpsParticipant || ''}
                                onChange={(e) => setCompanyFormData({ ...companyFormData, wpsParticipant: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                multiline
                                rows={2}
                                label="ملاحظات"
                                value={companyFormData.notes || ''}
                                onChange={(e) => setCompanyFormData({ ...companyFormData, notes: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={companyFormData.isPrimary || false}
                                        onChange={(e) => setCompanyFormData({ ...companyFormData, isPrimary: e.target.checked })}
                                    />
                                }
                                label="حساب رئيسي (يستخدم افتراضياً في WPS)"
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCompanyDialogOpen(false)}>إلغاء</Button>
                    <Button
                        variant="contained"
                        onClick={handleCompanySubmit}
                        disabled={!companyFormData.iban || !companyFormData.accountName || !!ibanError}
                    >
                        {editingCompanyAccount ? 'حفظ التغييرات' : 'إضافة'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Employee Account Dialog */}
            <Dialog open={employeeDialogOpen} onClose={() => setEmployeeDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>إضافة حساب بنكي للموظف</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12}>
                            <TextField
                                select
                                fullWidth
                                label="الموظف"
                                value={employeeFormData.userId}
                                onChange={(e) => setEmployeeFormData({ ...employeeFormData, userId: e.target.value })}
                            >
                                {users.map((user) => (
                                    <MenuItem key={user.id} value={user.id}>
                                        {user.firstName} {user.lastName} ({user.employeeCode})
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="IBAN"
                                placeholder="SA0000000000000000000000"
                                value={employeeFormData.iban}
                                onChange={(e) => handleEmployeeIbanChange(e.target.value)}
                                error={!!ibanError}
                                helperText={ibanError || 'أدخل IBAN السعودي (24 حرف)'}
                                inputProps={{ style: { fontFamily: 'monospace' } }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                select
                                fullWidth
                                label="البنك"
                                value={employeeFormData.bankName}
                                onChange={(e) => {
                                    const bank = saudiBanks.find(b => b.name === e.target.value);
                                    setEmployeeFormData({
                                        ...employeeFormData,
                                        bankName: e.target.value,
                                        bankCode: bank?.code || '',
                                    });
                                }}
                            >
                                {saudiBanks.map((bank) => (
                                    <MenuItem key={bank.code} value={bank.name}>
                                        {bank.name}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="اسم صاحب الحساب"
                                value={employeeFormData.accountHolderName}
                                onChange={(e) => setEmployeeFormData({ ...employeeFormData, accountHolderName: e.target.value })}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEmployeeDialogOpen(false)}>إلغاء</Button>
                    <Button
                        variant="contained"
                        onClick={handleEmployeeSubmit}
                        disabled={!employeeFormData.userId || !employeeFormData.iban || !!ibanError}
                    >
                        إضافة
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle>حذف الحساب البنكي</DialogTitle>
                <DialogContent>
                    <Typography>
                        هل أنت متأكد من حذف الحساب البنكي؟
                        <br />
                        <strong style={{ fontFamily: 'monospace' }}>
                            {deleteTarget?.item?.iban}
                        </strong>
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
