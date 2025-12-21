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
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Alert,
    CircularProgress,
    Chip,
    Card,
    CardContent,
    Grid,
    IconButton,
    Tooltip,
    Tab,
    Tabs,
} from '@mui/material';
import {
    Check as ApproveIcon,
    Block as BlockIcon,
    Delete as DeleteIcon,
    Smartphone as DeviceIcon,
    Star as MainIcon,
} from '@mui/icons-material';
import { devicesService, Device, deviceStatusLabels, deviceStatusColors } from '@/services/devices.service';

export default function DevicesPage() {
    const [devices, setDevices] = useState<Device[]>([]);
    const [pendingDevices, setPendingDevices] = useState<Device[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [tab, setTab] = useState(0);

    // Dialog states
    const [blockDialogOpen, setBlockDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
    const [blockReason, setBlockReason] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [allRes, pendingRes] = await Promise.all([
                devicesService.getAll(),
                devicesService.getPending(),
            ]);
            setDevices(allRes);
            setPendingDevices(pendingRes);
            setError(null);
        } catch (err: any) {
            setError(err.response?.data?.message || 'حدث خطأ');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (deviceId: string) => {
        try {
            await devicesService.approve(deviceId);
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.message || 'حدث خطأ');
        }
    };

    const handleOpenBlock = (device: Device) => {
        setSelectedDevice(device);
        setBlockReason('');
        setBlockDialogOpen(true);
    };

    const handleBlock = async () => {
        if (!selectedDevice) return;
        try {
            await devicesService.block(selectedDevice.id, blockReason);
            setBlockDialogOpen(false);
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.message || 'حدث خطأ');
        }
    };

    const handleOpenDelete = (device: Device) => {
        setSelectedDevice(device);
        setDeleteDialogOpen(true);
    };

    const handleDelete = async () => {
        if (!selectedDevice) return;
        try {
            await devicesService.delete(selectedDevice.id);
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

    const displayedDevices = tab === 0 ? devices : pendingDevices;

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
                    <DeviceIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    إدارة الأجهزة
                </Typography>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {/* Stats Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} sm={3}>
                    <Card>
                        <CardContent>
                            <Typography color="text.secondary" variant="caption">إجمالي الأجهزة</Typography>
                            <Typography variant="h4">{devices.length}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                    <Card sx={{ bgcolor: 'warning.light' }}>
                        <CardContent>
                            <Typography color="text.secondary" variant="caption">في الانتظار</Typography>
                            <Typography variant="h4">{pendingDevices.length}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                    <Card sx={{ bgcolor: 'success.light' }}>
                        <CardContent>
                            <Typography color="text.secondary" variant="caption">معتمد</Typography>
                            <Typography variant="h4">{devices.filter(d => d.status === 'APPROVED').length}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                    <Card sx={{ bgcolor: 'error.light' }}>
                        <CardContent>
                            <Typography color="text.secondary" variant="caption">محظور</Typography>
                            <Typography variant="h4">{devices.filter(d => d.status === 'BLOCKED').length}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Tabs */}
            <Paper sx={{ mb: 2 }}>
                <Tabs value={tab} onChange={(_, v) => setTab(v)}>
                    <Tab label={`كل الأجهزة (${devices.length})`} />
                    <Tab label={`في الانتظار (${pendingDevices.length})`} />
                </Tabs>
            </Paper>

            {/* Devices Table */}
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow sx={{ bgcolor: 'grey.100' }}>
                            <TableCell>الموظف</TableCell>
                            <TableCell>اسم الجهاز</TableCell>
                            <TableCell>الموديل</TableCell>
                            <TableCell>الحالة</TableCell>
                            <TableCell>آخر استخدام</TableCell>
                            <TableCell>تاريخ التسجيل</TableCell>
                            <TableCell align="center">الإجراءات</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {displayedDevices.map((device) => (
                            <TableRow key={device.id} hover>
                                <TableCell>
                                    {device.user
                                        ? `${device.user.firstName} ${device.user.lastName}`
                                        : '-'}
                                    <br />
                                    <Typography variant="caption" color="text.secondary">
                                        {device.user?.employeeCode}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    {device.deviceName}
                                    {device.isMain && (
                                        <Tooltip title="الجهاز الرئيسي">
                                            <MainIcon color="warning" fontSize="small" sx={{ ml: 1 }} />
                                        </Tooltip>
                                    )}
                                </TableCell>
                                <TableCell>{device.deviceModel || '-'}</TableCell>
                                <TableCell>
                                    <Chip
                                        label={deviceStatusLabels[device.status]}
                                        color={deviceStatusColors[device.status]}
                                        size="small"
                                    />
                                </TableCell>
                                <TableCell>{formatDate(device.lastUsed)}</TableCell>
                                <TableCell>{formatDate(device.registeredAt)}</TableCell>
                                <TableCell align="center">
                                    {device.status === 'PENDING' && (
                                        <Tooltip title="اعتماد">
                                            <IconButton
                                                size="small"
                                                color="success"
                                                onClick={() => handleApprove(device.id)}
                                            >
                                                <ApproveIcon />
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                    {device.status !== 'BLOCKED' && (
                                        <Tooltip title="حظر">
                                            <IconButton
                                                size="small"
                                                color="warning"
                                                onClick={() => handleOpenBlock(device)}
                                            >
                                                <BlockIcon />
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                    <Tooltip title="حذف">
                                        <IconButton
                                            size="small"
                                            color="error"
                                            onClick={() => handleOpenDelete(device)}
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    </Tooltip>
                                </TableCell>
                            </TableRow>
                        ))}
                        {displayedDevices.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} align="center">
                                    لا توجد أجهزة
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Block Dialog */}
            <Dialog open={blockDialogOpen} onClose={() => setBlockDialogOpen(false)}>
                <DialogTitle>حظر الجهاز</DialogTitle>
                <DialogContent>
                    <Typography sx={{ mb: 2 }}>
                        هل أنت متأكد من حظر جهاز <strong>{selectedDevice?.deviceName}</strong>؟
                    </Typography>
                    <TextField
                        fullWidth
                        multiline
                        rows={2}
                        label="سبب الحظر (اختياري)"
                        value={blockReason}
                        onChange={(e) => setBlockReason(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setBlockDialogOpen(false)}>إلغاء</Button>
                    <Button variant="contained" color="warning" onClick={handleBlock}>
                        حظر
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle>حذف الجهاز</DialogTitle>
                <DialogContent>
                    <Typography>
                        هل أنت متأكد من حذف جهاز <strong>{selectedDevice?.deviceName}</strong>؟
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
