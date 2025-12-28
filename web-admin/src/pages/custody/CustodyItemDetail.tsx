import { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Grid, Chip, Divider, Button, CircularProgress,
    Alert, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Breadcrumbs, Link, Card, CardContent, IconButton, Tooltip
} from '@mui/material';
import {
    ArrowBack, Edit, QrCode2, History, Build, Person,
    CalendarMonth, LocalOffer, Business, Info
} from '@mui/icons-material';
import { useNavigate, useParams, Link as RouterLink } from 'react-router-dom';
import custodyService, { CustodyItem } from '../../services/custody.service';

const statusColors: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
    AVAILABLE: 'success',
    ASSIGNED: 'info',
    IN_MAINTENANCE: 'warning',
    LOST: 'error',
    DAMAGED: 'error',
    DISPOSED: 'default',
};

const statusLabels: Record<string, string> = {
    AVAILABLE: 'متاحة',
    ASSIGNED: 'مسلمة',
    IN_MAINTENANCE: 'صيانة',
    LOST: 'مفقودة',
    DAMAGED: 'تالفة',
    DISPOSED: 'مستبعدة',
};

const conditionLabels: Record<string, string> = {
    NEW: 'جديدة', EXCELLENT: 'ممتازة', GOOD: 'جيدة', FAIR: 'مقبولة', POOR: 'سيئة',
};

export default function CustodyItemDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [item, setItem] = useState<CustodyItem | null>(null);

    const fetchItem = async () => {
        try {
            setLoading(true);
            if (!id) return;
            const data = await custodyService.getItemById(id);
            setItem(data);
        } catch (err: any) {
            setError(err.response?.data?.message || 'فشل في تحميل بيانات العهدة');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchItem();
    }, [id]);

    if (loading) return (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress />
        </Box>
    );

    if (error || !item) return (
        <Box p={3}>
            <Alert severity="error">{error || 'العهدة غير موجودة'}</Alert>
            <Button startIcon={<ArrowBack />} onClick={() => navigate('/custody/items')} sx={{ mt: 2 }}>
                رجوع لقائمة العهد
            </Button>
        </Box>
    );

    return (
        <Box p={3}>
            <Breadcrumbs sx={{ mb: 2 }}>
                <Link component={RouterLink} to="/custody" color="inherit">العهد</Link>
                <Link component={RouterLink} to="/custody/items" color="inherit">الأصول</Link>
                <Typography color="text.primary">تفاصيل {item.name}</Typography>
            </Breadcrumbs>

            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box display="flex" alignItems="center" gap={2}>
                    <Button startIcon={<ArrowBack />} onClick={() => navigate(-1)}>رجوع</Button>
                    <Typography variant="h5" fontWeight="bold">🔍 تفاصيل العهدة</Typography>
                </Box>
                <Box display="flex" gap={1}>
                    <Button
                        variant="outlined"
                        startIcon={<Edit />}
                        onClick={() => navigate(`/custody/items/${item.id}/edit`)}
                    >
                        تعديل
                    </Button>
                    {item.status === 'AVAILABLE' && (
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={() => navigate(`/custody/assign?itemId=${item.id}`)}
                        >
                            تسليم العهدة
                        </Button>
                    )}
                </Box>
            </Box>

            <Grid container spacing={3}>
                {/* Main Info Card */}
                <Grid item xs={12} md={8}>
                    <Paper sx={{ p: 3, mb: 3 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
                            <Box>
                                <Typography variant="h4" fontWeight="bold" gutterBottom>{item.name}</Typography>
                                <Box display="flex" gap={1} flexWrap="wrap">
                                    <Chip
                                        label={statusLabels[item.status] || item.status}
                                        color={statusColors[item.status] || 'default'}
                                    />
                                    <Chip
                                        label={conditionLabels[item.condition] || item.condition}
                                        variant="outlined"
                                    />
                                    <Chip
                                        label={item.category?.name || 'بدون فئة'}
                                        icon={<Info fontSize="small" />}
                                        variant="outlined"
                                    />
                                </Box>
                            </Box>
                            {item.qrCode && (
                                <Box textAlign="center">
                                    <img src={item.qrCode} alt="QR Code" style={{ width: 100, height: 100 }} />
                                    <Typography variant="caption" display="block">كود: {item.code}</Typography>
                                </Box>
                            )}
                        </Box>

                        <Divider sx={{ my: 2 }} />

                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <Box display="flex" alignItems="center" gap={1} mb={2}>
                                    <LocalOffer color="action" />
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">الكود والرقم التسلسلي</Typography>
                                        <Typography variant="body1">{item.code} {item.serialNumber ? `/ ${item.serialNumber}` : ''}</Typography>
                                    </Box>
                                </Box>
                                <Box display="flex" alignItems="center" gap={1} mb={2}>
                                    <Business color="action" />
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">المورد والموديل</Typography>
                                        <Typography variant="body1">{item.brand || '-'} {item.model || ''}</Typography>
                                    </Box>
                                </Box>
                                <Box display="flex" alignItems="center" gap={1}>
                                    <CalendarMonth color="action" />
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">تاريخ الشراء والضمان</Typography>
                                        <Typography variant="body1">
                                            {item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString('ar-SA') : '-'}
                                            {item.warrantyExpiry ? ` (ينتهي: ${new Date(item.warrantyExpiry).toLocaleDateString('ar-SA')})` : ''}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                {item.currentAssignee && (
                                    <Box display="flex" alignItems="center" gap={1} mb={2}>
                                        <Person color="primary" />
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">المستلم الحالي</Typography>
                                            <Typography variant="body1" fontWeight="bold">
                                                {item.currentAssignee.firstName} {item.currentAssignee.lastName}
                                            </Typography>
                                        </Box>
                                    </Box>
                                )}
                                <Box display="flex" alignItems="center" gap={1} mb={2}>
                                    <Info color="action" />
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">الموقع والفرع</Typography>
                                        <Typography variant="body1">{item.branch?.name || '-'} {item.currentLocation ? `(${item.currentLocation})` : ''}</Typography>
                                    </Box>
                                </Box>
                                <Box display="flex" alignItems="center" gap={1}>
                                    <Tooltip title="سعر الشراء">
                                        <Typography variant="h6" color="success.main" fontWeight="bold">
                                            {item.purchasePrice ? `${Number(item.purchasePrice).toLocaleString()} ر.س` : '-'}
                                        </Typography>
                                    </Tooltip>
                                </Box>
                            </Grid>
                        </Grid>
                    </Paper>

                    {/* History Tabs/Table */}
                    <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ mt: 4, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <History /> سجل التسليم والعهد
                    </Typography>
                    <TableContainer component={Paper}>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: 'grey.100' }}>
                                    <TableCell>الموظف</TableCell>
                                    <TableCell>تاريخ التسليم</TableCell>
                                    <TableCell>تاريخ الإرجاع</TableCell>
                                    <TableCell>الحالة</TableCell>
                                    <TableCell>ملاحظات</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {item.assignments?.map((a: any) => (
                                    <TableRow key={a.id}>
                                        <TableCell>{a.employee?.firstName} {a.employee?.lastName}</TableCell>
                                        <TableCell>{new Date(a.assignedAt).toLocaleDateString('ar-SA')}</TableCell>
                                        <TableCell>{a.actualReturn ? new Date(a.actualReturn).toLocaleDateString('ar-SA') : 'لازال بعهدته'}</TableCell>
                                        <TableCell>
                                            <Chip size="small" label={a.status} variant="outlined" />
                                        </TableCell>
                                        <TableCell>{a.notes || '-'}</TableCell>
                                    </TableRow>
                                ))}
                                {(!item.assignments || item.assignments.length === 0) && (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center" sx={{ py: 3 }}>لا يوجد سجل تسليم لهذه العهدة</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Grid>

                {/* Sidebar Info */}
                <Grid item xs={12} md={4}>
                    <Card sx={{ mb: 3 }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
                                <Build fontSize="small" /> الصيانة والملاحظات
                            </Typography>
                            <Box display="flex" flexDirection="column" gap={2}>
                                {item.maintenances?.length === 0 ? (
                                    <Typography variant="body2" color="text.secondary">لا توجد عمليات صيانة سابقة</Typography>
                                ) : (
                                    item.maintenances?.map((m: any) => (
                                        <Box key={m.id} p={1} sx={{ borderLeft: '3px solid', borderColor: 'warning.main', bgcolor: 'grey.50' }}>
                                            <Typography variant="subtitle2">{m.type}</Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {new Date(m.createdAt).toLocaleDateString('ar-SA')} - {m.status}
                                            </Typography>
                                            <Typography variant="body2" sx={{ mt: 0.5 }}>{m.description}</Typography>
                                        </Box>
                                    ))
                                )}
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    color="warning"
                                    startIcon={<Build />}
                                    onClick={() => navigate(`/custody/maintenance/new?itemId=${item.id}`)}
                                >
                                    طلب صيانة
                                </Button>
                            </Box>
                        </CardContent>
                    </Card>

                    <Paper sx={{ p: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>ملاحظات إضافية</Typography>
                        <Typography variant="body2" color="text.secondary">
                            {item.notes || 'لا توجد ملاحظات إضافية مسجلة لهذه العهدة.'}
                        </Typography>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
}
