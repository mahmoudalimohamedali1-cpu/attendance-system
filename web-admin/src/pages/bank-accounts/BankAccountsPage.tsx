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
} from '@mui/material';
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    AccountBalance as BankIcon,
    Star as PrimaryIcon,
    StarBorder as NotPrimaryIcon,
    CheckCircle as VerifiedIcon,
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

interface User {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
}

export default function BankAccountsPage() {
    const [accounts, setAccounts] = useState<BankAccount[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Dialog states
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);

    // Form state
    const [formData, setFormData] = useState<CreateBankAccountDto>({
        userId: '',
        bankName: '',
        bankCode: '',
        iban: '',
        accountHolderName: '',
        isPrimary: true,
    });
    const [ibanError, setIbanError] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [accountsRes, usersRes] = await Promise.all([
                bankAccountsService.getAll(),
                api.get('/users'),
            ]);
            setAccounts(accountsRes);
            setUsers((usersRes as any).data || usersRes as User[]);
            setError(null);
        } catch (err: any) {
            setError(err.response?.data?.message || 'حدث خطأ');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = () => {
        setFormData({
            userId: '',
            bankName: '',
            bankCode: '',
            iban: '',
            accountHolderName: '',
            isPrimary: true,
        });
        setIbanError(null);
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
    };

    const handleIbanChange = (iban: string) => {
        setFormData({ ...formData, iban });
        const validation = validateSaudiIBAN(iban);
        if (!validation.valid) {
            setIbanError(validation.message);
        } else {
            setIbanError(null);
            const bankCode = extractBankCode(iban);
            const bank = saudiBanks.find(b => b.code === bankCode);
            if (bank) {
                setFormData({
                    ...formData,
                    iban,
                    bankCode,
                    bankName: bank.name,
                });
            }
        }
    };

    const handleSubmit = async () => {
        if (ibanError) return;
        try {
            await bankAccountsService.create(formData);
            handleCloseDialog();
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.message || 'حدث خطأ');
        }
    };

    const handleSetPrimary = async (id: string) => {
        try {
            await bankAccountsService.setPrimary(id);
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.message || 'حدث خطأ');
        }
    };

    const handleOpenDelete = (account: BankAccount) => {
        setSelectedAccount(account);
        setDeleteDialogOpen(true);
    };

    const handleDelete = async () => {
        if (!selectedAccount) return;
        try {
            await bankAccountsService.delete(selectedAccount.id);
            setDeleteDialogOpen(false);
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.message || 'حدث خطأ');
        }
    };

    // Get employees without bank accounts
    const employeesWithoutBank = users.filter(
        user => !accounts.some(acc => acc.userId === user.id)
    );

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
                    الحسابات البنكية
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleOpenDialog}
                >
                    إضافة حساب
                </Button>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {/* Missing Bank Alert */}
            {employeesWithoutBank.length > 0 && (
                <Alert severity="warning" sx={{ mb: 3 }}>
                    يوجد {employeesWithoutBank.length} موظف بدون حساب بنكي
                </Alert>
            )}

            {/* Accounts Table */}
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow sx={{ bgcolor: 'grey.100' }}>
                            <TableCell>الموظف</TableCell>
                            <TableCell>البنك</TableCell>
                            <TableCell>IBAN</TableCell>
                            <TableCell>اسم صاحب الحساب</TableCell>
                            <TableCell align="center">رئيسي</TableCell>
                            <TableCell align="center">تم التحقق</TableCell>
                            <TableCell align="center">الإجراءات</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {accounts.map((account) => (
                            <TableRow key={account.id} hover>
                                <TableCell>
                                    {account.user
                                        ? `${account.user.firstName} ${account.user.lastName}`
                                        : '-'}
                                    <br />
                                    <Typography variant="caption" color="text.secondary">
                                        {account.user?.employeeCode}
                                    </Typography>
                                </TableCell>
                                <TableCell>{account.bankName}</TableCell>
                                <TableCell>
                                    <Typography fontFamily="monospace" fontSize={12}>
                                        {account.iban}
                                    </Typography>
                                </TableCell>
                                <TableCell>{account.accountHolderName || '-'}</TableCell>
                                <TableCell align="center">
                                    <Tooltip title={account.isPrimary ? 'حساب رئيسي' : 'تعيين كحساب رئيسي'}>
                                        <IconButton
                                            size="small"
                                            color={account.isPrimary ? 'warning' : 'default'}
                                            onClick={() => !account.isPrimary && handleSetPrimary(account.id)}
                                        >
                                            {account.isPrimary ? <PrimaryIcon /> : <NotPrimaryIcon />}
                                        </IconButton>
                                    </Tooltip>
                                </TableCell>
                                <TableCell align="center">
                                    {account.isVerified ? (
                                        <Chip
                                            icon={<VerifiedIcon />}
                                            label="تم التحقق"
                                            size="small"
                                            color="success"
                                        />
                                    ) : (
                                        <Chip label="غير متحقق" size="small" variant="outlined" />
                                    )}
                                </TableCell>
                                <TableCell align="center">
                                    <Tooltip title="حذف">
                                        <IconButton
                                            size="small"
                                            color="error"
                                            onClick={() => handleOpenDelete(account)}
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    </Tooltip>
                                </TableCell>
                            </TableRow>
                        ))}
                        {accounts.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} align="center">
                                    لا توجد حسابات بنكية مسجلة
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Add Dialog */}
            <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>إضافة حساب بنكي جديد</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12}>
                            <TextField
                                select
                                fullWidth
                                label="الموظف"
                                value={formData.userId}
                                onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
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
                                value={formData.iban}
                                onChange={(e) => handleIbanChange(e.target.value.toUpperCase())}
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
                                value={formData.bankName}
                                onChange={(e) => {
                                    const bank = saudiBanks.find(b => b.name === e.target.value);
                                    setFormData({
                                        ...formData,
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
                                value={formData.accountHolderName}
                                onChange={(e) =>
                                    setFormData({ ...formData, accountHolderName: e.target.value })
                                }
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>إلغاء</Button>
                    <Button
                        variant="contained"
                        onClick={handleSubmit}
                        disabled={!formData.userId || !formData.iban || !!ibanError}
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
                        هل أنت متأكد من حذف الحساب البنكي
                        <br />
                        <strong>{selectedAccount?.iban}</strong>
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
