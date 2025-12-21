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
    Edit as EditIcon,
    Delete as DeleteIcon,
    Description as ContractIcon,
    Cancel as TerminateIcon,
    Refresh as RenewIcon,
    Warning as ExpiringIcon,
} from '@mui/icons-material';
import { api } from '@/services/api.service';
import {
    Contract,
    ContractType,
    contractTypeLabels,
    contractStatusLabels,
    contractStatusColors,
} from '@/services/contracts.service';

interface User {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
}

export default function ContractsPage() {
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [expiringContracts, setExpiringContracts] = useState<Contract[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Dialog states
    const [dialogOpen, setDialogOpen] = useState(false);
    const [terminateDialogOpen, setTerminateDialogOpen] = useState(false);
    const [renewDialogOpen, setRenewDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedContract, setSelectedContract] = useState<Contract | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        userId: '',
        type: 'PERMANENT' as ContractType,
        startDate: '',
        endDate: '',
        probationEndDate: '',
        salaryCycle: 'MONTHLY',
    });

    const [terminationReason, setTerminationReason] = useState('');
    const [renewEndDate, setRenewEndDate] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [contractsRes, expiringRes, usersRes] = await Promise.all([
                api.get('/contracts'),
                api.get('/contracts/expiring'),
                api.get('/users'),
            ]);
            setContracts((contractsRes as any).data || contractsRes as Contract[]);
            setExpiringContracts((expiringRes as any).data || expiringRes as Contract[]);
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
            if (selectedContract) {
                await api.patch(`/contracts/${selectedContract.id}`, formData);
            } else {
                await api.post('/contracts', formData);
            }
            handleCloseDialog();
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
            await api.post(`/contracts/${selectedContract.id}/terminate`, {
                terminationReason,
            });
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
        setRenewDialogOpen(true);
    };

    const handleRenew = async () => {
        if (!selectedContract) return;
        try {
            await api.post(`/contracts/${selectedContract.id}/renew`, {
                newEndDate: renewEndDate,
            });
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
            await api.delete(`/contracts/${selectedContract.id}`);
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
                    <ContractIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    إدارة العقود
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

            {/* Expiring Contracts Alert */}
            {expiringContracts.length > 0 && (
                <Alert severity="warning" icon={<ExpiringIcon />} sx={{ mb: 2 }}>
                    يوجد {expiringContracts.length} عقد ينتهي خلال 30 يوم
                </Alert>
            )}

            {/* Contracts Table */}
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow sx={{ bgcolor: 'grey.100' }}>
                            <TableCell>الموظف</TableCell>
                            <TableCell>رقم العقد</TableCell>
                            <TableCell>النوع</TableCell>
                            <TableCell>الحالة</TableCell>
                            <TableCell>تاريخ البداية</TableCell>
                            <TableCell>تاريخ النهاية</TableCell>
                            <TableCell>التجديدات</TableCell>
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
                                <TableCell>{formatDate(contract.startDate)}</TableCell>
                                <TableCell>{formatDate(contract.endDate)}</TableCell>
                                <TableCell>{contract.renewalCount}</TableCell>
                                <TableCell align="center">
                                    <Tooltip title="تعديل">
                                        <IconButton
                                            size="small"
                                            onClick={() => handleOpenDialog(contract)}
                                        >
                                            <EditIcon />
                                        </IconButton>
                                    </Tooltip>
                                    {contract.status === 'ACTIVE' && (
                                        <>
                                            <Tooltip title="تجديد">
                                                <IconButton
                                                    size="small"
                                                    color="primary"
                                                    onClick={() => handleOpenRenew(contract)}
                                                >
                                                    <RenewIcon />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="إنهاء">
                                                <IconButton
                                                    size="small"
                                                    color="warning"
                                                    onClick={() => handleOpenTerminate(contract)}
                                                >
                                                    <TerminateIcon />
                                                </IconButton>
                                            </Tooltip>
                                        </>
                                    )}
                                    <Tooltip title="حذف">
                                        <IconButton
                                            size="small"
                                            color="error"
                                            onClick={() => handleOpenDelete(contract)}
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    </Tooltip>
                                </TableCell>
                            </TableRow>
                        ))}
                        {contracts.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={8} align="center">
                                    لا توجد عقود
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {selectedContract ? 'تعديل العقد' : 'إنشاء عقد جديد'}
                </DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12}>
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
                                onChange={(e) =>
                                    setFormData({ ...formData, type: e.target.value as ContractType })
                                }
                            >
                                {Object.entries(contractTypeLabels).map(([value, label]) => (
                                    <MenuItem key={value} value={value}>
                                        {label}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                select
                                fullWidth
                                label="دورة الراتب"
                                value={formData.salaryCycle}
                                onChange={(e) =>
                                    setFormData({ ...formData, salaryCycle: e.target.value })
                                }
                            >
                                <MenuItem value="MONTHLY">شهري</MenuItem>
                                <MenuItem value="WEEKLY">أسبوعي</MenuItem>
                                <MenuItem value="DAILY">يومي</MenuItem>
                            </TextField>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="تاريخ البداية"
                                type="date"
                                value={formData.startDate}
                                onChange={(e) =>
                                    setFormData({ ...formData, startDate: e.target.value })
                                }
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="تاريخ النهاية"
                                type="date"
                                value={formData.endDate}
                                onChange={(e) =>
                                    setFormData({ ...formData, endDate: e.target.value })
                                }
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="تاريخ انتهاء فترة التجربة"
                                type="date"
                                value={formData.probationEndDate}
                                onChange={(e) =>
                                    setFormData({ ...formData, probationEndDate: e.target.value })
                                }
                                InputLabelProps={{ shrink: true }}
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
                    <TextField
                        fullWidth
                        type="date"
                        label="تاريخ انتهاء العقد الجديد"
                        value={renewEndDate}
                        onChange={(e) => setRenewEndDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                    />
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
