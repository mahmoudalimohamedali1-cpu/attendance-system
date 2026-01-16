import { useState, useEffect } from 'react';
import {
    Box,
    Container,
    Typography,
    Tabs,
    Tab,
    Card,
    CardContent,
    Button,
    TextField,
    Grid,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    Chip,
    Alert,
    Snackbar,
    Rating,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
} from '@mui/material';
import {
    Add as AddIcon,
    LocalShipping as TripIcon,
    DeliveryDining as DeliveryIcon,
    Inventory as InventoryIcon,
    Refresh as RefreshIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    CheckCircle as SuccessIcon,
    Cancel as FailedIcon,
} from '@mui/icons-material';
import { api } from '../../services/api.service';

// ============== Types ==============

interface Trip {
    id: string;
    driverId: string;
    driverName?: string;
    tripDate: string;
    scheduledStart: string;
    actualStart?: string;
    distanceKm: number;
    delayMinutes: number;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
}

interface Delivery {
    id: string;
    driverId: string;
    driverName?: string;
    deliveryDate: string;
    minutesEarly: number;
    minutesLate: number;
    customerRating?: number;
    status: 'PENDING' | 'DELIVERED' | 'FAILED' | 'RETURNED';
}

interface InventoryCount {
    id: string;
    conductedBy: string;
    employeeName?: string;
    countDate: string;
    expectedItems: number;
    actualItems: number;
    accuracyRate: number;
    damageValue: number;
}

// ============== Tab Panel ==============

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;
    return (
        <div role="tabpanel" hidden={value !== index} {...other}>
            {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
        </div>
    );
}

// ============== Main Component ==============

export default function LogisticsPage() {
    const [tabValue, setTabValue] = useState(0);
    const [loading, setLoading] = useState(false);

    // Data
    const [trips, setTrips] = useState<Trip[]>([]);
    const [deliveries, setDeliveries] = useState<Delivery[]>([]);
    const [inventoryCounts, setInventoryCounts] = useState<InventoryCount[]>([]);

    // Dialogs
    const [tripDialog, setTripDialog] = useState(false);
    const [deliveryDialog, setDeliveryDialog] = useState(false);
    const [inventoryDialog, setInventoryDialog] = useState(false);

    // Snackbar
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

    // Forms
    const [tripForm, setTripForm] = useState({
        driverId: '',
        tripDate: new Date().toISOString().split('T')[0],
        scheduledStart: '',
        distanceKm: 0,
        delayMinutes: 0,
    });

    const [deliveryForm, setDeliveryForm] = useState({
        driverId: '',
        deliveryDate: new Date().toISOString().split('T')[0],
        minutesEarly: 0,
        minutesLate: 0,
        customerRating: 5,
        status: 'DELIVERED' as 'DELIVERED' | 'FAILED',
    });

    const [inventoryForm, setInventoryForm] = useState({
        conductedBy: '',
        countDate: new Date().toISOString().split('T')[0],
        expectedItems: 0,
        actualItems: 0,
        damageValue: 0,
    });

    // ============== Fetch Data ==============

    const fetchTrips = async () => {
        try {
            const response = await api.get('/logistics/trips');
            setTrips(response.data || []);
        } catch (error) {
            console.error('Error fetching trips:', error);
        }
    };

    const fetchDeliveries = async () => {
        try {
            const response = await api.get('/logistics/deliveries');
            setDeliveries(response.data || []);
        } catch (error) {
            console.error('Error fetching deliveries:', error);
        }
    };

    const fetchInventory = async () => {
        try {
            const response = await api.get('/logistics/inventory');
            setInventoryCounts(response.data || []);
        } catch (error) {
            console.error('Error fetching inventory:', error);
        }
    };

    useEffect(() => {
        fetchTrips();
        fetchDeliveries();
        fetchInventory();
    }, []);

    // ============== Save Handlers ==============

    const handleSaveTrip = async () => {
        try {
            setLoading(true);
            await api.post('/logistics/trips', tripForm);
            setSnackbar({ open: true, message: 'تم حفظ الرحلة بنجاح', severity: 'success' });
            setTripDialog(false);
            fetchTrips();
            setTripForm({
                driverId: '',
                tripDate: new Date().toISOString().split('T')[0],
                scheduledStart: '',
                distanceKm: 0,
                delayMinutes: 0,
            });
        } catch (error) {
            setSnackbar({ open: true, message: 'حدث خطأ أثناء الحفظ', severity: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleSaveDelivery = async () => {
        try {
            setLoading(true);
            await api.post('/logistics/deliveries', deliveryForm);
            setSnackbar({ open: true, message: 'تم حفظ التوصيل بنجاح', severity: 'success' });
            setDeliveryDialog(false);
            fetchDeliveries();
        } catch (error) {
            setSnackbar({ open: true, message: 'حدث خطأ أثناء الحفظ', severity: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleSaveInventory = async () => {
        try {
            setLoading(true);
            const accuracyRate = inventoryForm.expectedItems > 0
                ? (inventoryForm.actualItems / inventoryForm.expectedItems) * 100
                : 100;
            await api.post('/logistics/inventory', { ...inventoryForm, accuracyRate });
            setSnackbar({ open: true, message: 'تم حفظ الجرد بنجاح', severity: 'success' });
            setInventoryDialog(false);
            fetchInventory();
        } catch (error) {
            setSnackbar({ open: true, message: 'حدث خطأ أثناء الحفظ', severity: 'error' });
        } finally {
            setLoading(false);
        }
    };

    // ============== Status Chip ==============

    const getStatusChip = (status: string) => {
        const statusMap: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'default' }> = {
            COMPLETED: { label: 'مكتملة', color: 'success' },
            DELIVERED: { label: 'تم التسليم', color: 'success' },
            IN_PROGRESS: { label: 'جارية', color: 'warning' },
            PENDING: { label: 'في الانتظار', color: 'default' },
            FAILED: { label: 'فشل', color: 'error' },
            CANCELLED: { label: 'ملغاة', color: 'error' },
            RETURNED: { label: 'مرتجع', color: 'error' },
        };
        const config = statusMap[status] || { label: status, color: 'default' };
        return <Chip label={config.label} color={config.color} size="small" />;
    };

    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    🚛 إدارة اللوجستيات
                </Typography>
            </Box>

            {/* Tabs */}
            <Card>
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} variant="fullWidth">
                        <Tab icon={<TripIcon />} label="الرحلات" iconPosition="start" />
                        <Tab icon={<DeliveryIcon />} label="التوصيلات" iconPosition="start" />
                        <Tab icon={<InventoryIcon />} label="الجرد" iconPosition="start" />
                    </Tabs>
                </Box>

                {/* Tab: الرحلات */}
                <TabPanel value={tabValue} index={0}>
                    <Box sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                            <Typography variant="h6">رحلات السائقين</Typography>
                            <Box>
                                <Button startIcon={<RefreshIcon />} onClick={fetchTrips} sx={{ mr: 1 }}>
                                    تحديث
                                </Button>
                                <Button variant="contained" startIcon={<AddIcon />} onClick={() => setTripDialog(true)}>
                                    إضافة رحلة
                                </Button>
                            </Box>
                        </Box>

                        <TableContainer component={Paper}>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>التاريخ</TableCell>
                                        <TableCell>السائق</TableCell>
                                        <TableCell>المسافة (كم)</TableCell>
                                        <TableCell>التأخير (دقيقة)</TableCell>
                                        <TableCell>الحالة</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {trips.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} align="center">
                                                <Alert severity="info">لا توجد رحلات مسجلة</Alert>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        trips.map((trip) => (
                                            <TableRow key={trip.id}>
                                                <TableCell>{new Date(trip.tripDate).toLocaleDateString('ar-SA')}</TableCell>
                                                <TableCell>{trip.driverName || trip.driverId}</TableCell>
                                                <TableCell>{trip.distanceKm}</TableCell>
                                                <TableCell>{trip.delayMinutes}</TableCell>
                                                <TableCell>{getStatusChip(trip.status)}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                </TabPanel>

                {/* Tab: التوصيلات */}
                <TabPanel value={tabValue} index={1}>
                    <Box sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                            <Typography variant="h6">التوصيلات</Typography>
                            <Box>
                                <Button startIcon={<RefreshIcon />} onClick={fetchDeliveries} sx={{ mr: 1 }}>
                                    تحديث
                                </Button>
                                <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDeliveryDialog(true)}>
                                    إضافة توصيل
                                </Button>
                            </Box>
                        </Box>

                        <TableContainer component={Paper}>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>التاريخ</TableCell>
                                        <TableCell>المندوب</TableCell>
                                        <TableCell>مبكر/متأخر</TableCell>
                                        <TableCell>التقييم</TableCell>
                                        <TableCell>الحالة</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {deliveries.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} align="center">
                                                <Alert severity="info">لا توجد توصيلات مسجلة</Alert>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        deliveries.map((delivery) => (
                                            <TableRow key={delivery.id}>
                                                <TableCell>{new Date(delivery.deliveryDate).toLocaleDateString('ar-SA')}</TableCell>
                                                <TableCell>{delivery.driverName || delivery.driverId}</TableCell>
                                                <TableCell>
                                                    {delivery.minutesEarly > 0 && <Chip label={`مبكر ${delivery.minutesEarly} د`} color="success" size="small" />}
                                                    {delivery.minutesLate > 0 && <Chip label={`متأخر ${delivery.minutesLate} د`} color="error" size="small" />}
                                                </TableCell>
                                                <TableCell>
                                                    <Rating value={delivery.customerRating || 0} readOnly size="small" />
                                                </TableCell>
                                                <TableCell>{getStatusChip(delivery.status)}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                </TabPanel>

                {/* Tab: الجرد */}
                <TabPanel value={tabValue} index={2}>
                    <Box sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                            <Typography variant="h6">عمليات الجرد</Typography>
                            <Box>
                                <Button startIcon={<RefreshIcon />} onClick={fetchInventory} sx={{ mr: 1 }}>
                                    تحديث
                                </Button>
                                <Button variant="contained" startIcon={<AddIcon />} onClick={() => setInventoryDialog(true)}>
                                    إضافة جرد
                                </Button>
                            </Box>
                        </Box>

                        <TableContainer component={Paper}>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>التاريخ</TableCell>
                                        <TableCell>المسؤول</TableCell>
                                        <TableCell>المتوقع</TableCell>
                                        <TableCell>الفعلي</TableCell>
                                        <TableCell>نسبة الدقة</TableCell>
                                        <TableCell>قيمة التلف</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {inventoryCounts.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} align="center">
                                                <Alert severity="info">لا توجد عمليات جرد مسجلة</Alert>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        inventoryCounts.map((inv) => (
                                            <TableRow key={inv.id}>
                                                <TableCell>{new Date(inv.countDate).toLocaleDateString('ar-SA')}</TableCell>
                                                <TableCell>{inv.employeeName || inv.conductedBy}</TableCell>
                                                <TableCell>{inv.expectedItems}</TableCell>
                                                <TableCell>{inv.actualItems}</TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={`${inv.accuracyRate.toFixed(1)}%`}
                                                        color={inv.accuracyRate >= 99 ? 'success' : inv.accuracyRate >= 95 ? 'warning' : 'error'}
                                                        size="small"
                                                    />
                                                </TableCell>
                                                <TableCell>{inv.damageValue} ريال</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                </TabPanel>
            </Card>

            {/* Dialog: إضافة رحلة */}
            <Dialog open={tripDialog} onClose={() => setTripDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>إضافة رحلة جديدة</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="معرف السائق"
                                value={tripForm.driverId}
                                onChange={(e) => setTripForm({ ...tripForm, driverId: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                fullWidth
                                type="date"
                                label="تاريخ الرحلة"
                                value={tripForm.tripDate}
                                onChange={(e) => setTripForm({ ...tripForm, tripDate: e.target.value })}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                fullWidth
                                type="time"
                                label="وقت الانطلاق"
                                value={tripForm.scheduledStart}
                                onChange={(e) => setTripForm({ ...tripForm, scheduledStart: e.target.value })}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                fullWidth
                                type="number"
                                label="المسافة (كم)"
                                value={tripForm.distanceKm}
                                onChange={(e) => setTripForm({ ...tripForm, distanceKm: Number(e.target.value) })}
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                fullWidth
                                type="number"
                                label="التأخير (دقيقة)"
                                value={tripForm.delayMinutes}
                                onChange={(e) => setTripForm({ ...tripForm, delayMinutes: Number(e.target.value) })}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setTripDialog(false)}>إلغاء</Button>
                    <Button variant="contained" onClick={handleSaveTrip} disabled={loading}>
                        حفظ
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Dialog: إضافة توصيل */}
            <Dialog open={deliveryDialog} onClose={() => setDeliveryDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>إضافة توصيل جديد</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="معرف المندوب"
                                value={deliveryForm.driverId}
                                onChange={(e) => setDeliveryForm({ ...deliveryForm, driverId: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                fullWidth
                                type="date"
                                label="تاريخ التوصيل"
                                value={deliveryForm.deliveryDate}
                                onChange={(e) => setDeliveryForm({ ...deliveryForm, deliveryDate: e.target.value })}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <FormControl fullWidth>
                                <InputLabel>الحالة</InputLabel>
                                <Select
                                    value={deliveryForm.status}
                                    label="الحالة"
                                    onChange={(e) => setDeliveryForm({ ...deliveryForm, status: e.target.value as any })}
                                >
                                    <MenuItem value="DELIVERED">تم التسليم</MenuItem>
                                    <MenuItem value="FAILED">فشل</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                fullWidth
                                type="number"
                                label="دقائق مبكراً"
                                value={deliveryForm.minutesEarly}
                                onChange={(e) => setDeliveryForm({ ...deliveryForm, minutesEarly: Number(e.target.value) })}
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                fullWidth
                                type="number"
                                label="دقائق متأخراً"
                                value={deliveryForm.minutesLate}
                                onChange={(e) => setDeliveryForm({ ...deliveryForm, minutesLate: Number(e.target.value) })}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <Typography gutterBottom>تقييم العميل</Typography>
                            <Rating
                                value={deliveryForm.customerRating}
                                onChange={(_, value) => setDeliveryForm({ ...deliveryForm, customerRating: value || 5 })}
                                size="large"
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeliveryDialog(false)}>إلغاء</Button>
                    <Button variant="contained" onClick={handleSaveDelivery} disabled={loading}>
                        حفظ
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Dialog: إضافة جرد */}
            <Dialog open={inventoryDialog} onClose={() => setInventoryDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>تسجيل عملية جرد</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="معرف الموظف المسؤول"
                                value={inventoryForm.conductedBy}
                                onChange={(e) => setInventoryForm({ ...inventoryForm, conductedBy: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                type="date"
                                label="تاريخ الجرد"
                                value={inventoryForm.countDate}
                                onChange={(e) => setInventoryForm({ ...inventoryForm, countDate: e.target.value })}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                fullWidth
                                type="number"
                                label="العدد المتوقع"
                                value={inventoryForm.expectedItems}
                                onChange={(e) => setInventoryForm({ ...inventoryForm, expectedItems: Number(e.target.value) })}
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                fullWidth
                                type="number"
                                label="العدد الفعلي"
                                value={inventoryForm.actualItems}
                                onChange={(e) => setInventoryForm({ ...inventoryForm, actualItems: Number(e.target.value) })}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                type="number"
                                label="قيمة التلف (ريال)"
                                value={inventoryForm.damageValue}
                                onChange={(e) => setInventoryForm({ ...inventoryForm, damageValue: Number(e.target.value) })}
                            />
                        </Grid>
                        {inventoryForm.expectedItems > 0 && (
                            <Grid item xs={12}>
                                <Alert severity="info">
                                    نسبة الدقة المحسوبة: {((inventoryForm.actualItems / inventoryForm.expectedItems) * 100).toFixed(1)}%
                                </Alert>
                            </Grid>
                        )}
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setInventoryDialog(false)}>إلغاء</Button>
                    <Button variant="contained" onClick={handleSaveInventory} disabled={loading}>
                        حفظ
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
            >
                <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Container>
    );
}
