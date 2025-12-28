import { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, TablePagination, Button, IconButton, Chip, TextField,
    MenuItem, Dialog, DialogTitle, DialogContent, DialogActions,
    CircularProgress, Alert, Tooltip, Grid, FormControl, InputLabel, Select
} from '@mui/material';
import {
    Add, Edit, Delete, Visibility, QrCode2, Refresh, Build, FilterList
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import custodyService, { CustodyItem, CustodyCategory } from '../../services/custody.service';

const statusColors: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
    AVAILABLE: 'success',
    ASSIGNED: 'info',
    IN_MAINTENANCE: 'warning',
    LOST: 'error',
    DAMAGED: 'error',
    DISPOSED: 'default',
    RESERVED: 'info',
};

const statusLabels: Record<string, string> = {
    AVAILABLE: 'متاحة',
    ASSIGNED: 'مسلمة',
    IN_MAINTENANCE: 'صيانة',
    LOST: 'مفقودة',
    DAMAGED: 'تالفة',
    DISPOSED: 'مستبعدة',
    RESERVED: 'محجوزة',
};

const conditionLabels: Record<string, string> = {
    NEW: 'جديدة',
    EXCELLENT: 'ممتازة',
    GOOD: 'جيدة',
    FAIR: 'مقبولة',
    POOR: 'سيئة',
};

export default function CustodyItemsList() {
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [items, setItems] = useState<CustodyItem[]>([]);
    const [categories, setCategories] = useState<CustodyCategory[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(20);

    // Filters
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');

    // QR Dialog
    const [qrDialog, setQrDialog] = useState<{ open: boolean; item: CustodyItem | null }>({ open: false, item: null });

    // Check for success message from navigation state
    useEffect(() => {
        if (location.state?.successMessage) {
            setSuccessMessage(location.state.successMessage);
            // Clear the state to prevent showing message on refresh
            window.history.replaceState({}, document.title);
            // Auto-hide after 5 seconds
            setTimeout(() => setSuccessMessage(null), 5000);
        }
    }, [location.state]);

    const fetchItems = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await custodyService.getItems({
                page: page + 1,
                limit: rowsPerPage,
                search: search || undefined,
                status: statusFilter || undefined,
                categoryId: categoryFilter || undefined,
            });
            setItems(data.items);
            setTotal(data.total);
        } catch (err: any) {
            setError(err.response?.data?.message || 'فشل في تحميل البيانات');
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const data = await custodyService.getCategories();
            setCategories(data);
        } catch (err) {
            console.error('Failed to fetch categories:', err);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    useEffect(() => {
        fetchItems();
    }, [page, rowsPerPage, search, statusFilter, categoryFilter]);

    const handleDelete = async (id: string) => {
        if (!window.confirm('هل أنت متأكد من حذف هذه العهدة؟')) return;
        try {
            await custodyService.deleteItem(id);
            fetchItems();
        } catch (err: any) {
            alert(err.response?.data?.message || 'فشل في الحذف');
        }
    };

    return (
        <Box p={3}>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h5" fontWeight="bold">📋 قائمة العهد</Typography>
                <Box>
                    <Tooltip title="تحديث">
                        <IconButton onClick={fetchItems}><Refresh /></IconButton>
                    </Tooltip>
                    <Button variant="contained" startIcon={<Add />} onClick={() => navigate('/custody/items/new')}>
                        إضافة عهدة
                    </Button>
                </Box>
            </Box>

            {/* Filters */}
            <Paper sx={{ p: 2, mb: 2 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={4}>
                        <TextField
                            fullWidth
                            size="small"
                            label="بحث"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="اسم، كود، رقم تسلسلي..."
                        />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <FormControl fullWidth size="small">
                            <InputLabel>الحالة</InputLabel>
                            <Select value={statusFilter} label="الحالة" onChange={(e) => setStatusFilter(e.target.value)}>
                                <MenuItem value="">الكل</MenuItem>
                                {Object.entries(statusLabels).map(([key, label]) => (
                                    <MenuItem key={key} value={key}>{label}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <FormControl fullWidth size="small">
                            <InputLabel>الفئة</InputLabel>
                            <Select value={categoryFilter} label="الفئة" onChange={(e) => setCategoryFilter(e.target.value)}>
                                <MenuItem value="">الكل</MenuItem>
                                {categories.map((cat) => (
                                    <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={2}>
                        <Button
                            fullWidth
                            variant="outlined"
                            startIcon={<FilterList />}
                            onClick={() => { setSearch(''); setStatusFilter(''); setCategoryFilter(''); }}
                        >
                            مسح
                        </Button>
                    </Grid>
                </Grid>
            </Paper>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {successMessage && (
                <Alert 
                    severity="success" 
                    sx={{ mb: 2 }} 
                    onClose={() => setSuccessMessage(null)}
                >
                    {successMessage}
                </Alert>
            )}

            {/* Table */}
            <Paper>
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: 'grey.100' }}>
                                <TableCell>الكود</TableCell>
                                <TableCell>الاسم</TableCell>
                                <TableCell>الفئة</TableCell>
                                <TableCell>الحالة</TableCell>
                                <TableCell>الحالة الفنية</TableCell>
                                <TableCell>الفرع</TableCell>
                                <TableCell align="center">إجراءات</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                                        <CircularProgress size={30} />
                                    </TableCell>
                                </TableRow>
                            ) : items.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                                        لا توجد عهد
                                    </TableCell>
                                </TableRow>
                            ) : (
                                items.map((item) => (
                                    <TableRow key={item.id} hover>
                                        <TableCell>{item.code}</TableCell>
                                        <TableCell>
                                            <Box>
                                                <Typography variant="body2" fontWeight="bold">{item.name}</Typography>
                                                {item.serialNumber && (
                                                    <Typography variant="caption" color="text.secondary">
                                                        S/N: {item.serialNumber}
                                                    </Typography>
                                                )}
                                            </Box>
                                        </TableCell>
                                        <TableCell>{item.category?.name || '-'}</TableCell>
                                        <TableCell>
                                            <Chip
                                                size="small"
                                                label={statusLabels[item.status] || item.status}
                                                color={statusColors[item.status] || 'default'}
                                            />
                                        </TableCell>
                                        <TableCell>{conditionLabels[item.condition] || item.condition}</TableCell>
                                        <TableCell>{item.branch?.name || '-'}</TableCell>
                                        <TableCell align="center">
                                            <Tooltip title="عرض"><IconButton size="small" onClick={() => navigate(`/custody/items/${item.id}`)}><Visibility /></IconButton></Tooltip>
                                            <Tooltip title="تعديل"><IconButton size="small" onClick={() => navigate(`/custody/items/${item.id}/edit`)}><Edit /></IconButton></Tooltip>
                                            {item.qrCode && (
                                                <Tooltip title="QR Code"><IconButton size="small" onClick={() => setQrDialog({ open: true, item })}><QrCode2 /></IconButton></Tooltip>
                                            )}
                                            {item.status === 'AVAILABLE' && (
                                                <Tooltip title="صيانة"><IconButton size="small" color="warning" onClick={() => navigate(`/custody/maintenance/new?itemId=${item.id}`)}><Build /></IconButton></Tooltip>
                                            )}
                                            <Tooltip title="حذف"><IconButton size="small" color="error" onClick={() => handleDelete(item.id)}><Delete /></IconButton></Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination
                    component="div"
                    count={total}
                    page={page}
                    onPageChange={(_, newPage) => setPage(newPage)}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                    labelRowsPerPage="عدد الصفوف:"
                    labelDisplayedRows={({ from, to, count }) => `${from}-${to} من ${count}`}
                />
            </Paper>

            {/* QR Dialog */}
            <Dialog open={qrDialog.open} onClose={() => setQrDialog({ open: false, item: null })}>
                <DialogTitle>QR Code - {qrDialog.item?.name}</DialogTitle>
                <DialogContent sx={{ textAlign: 'center', py: 3 }}>
                    {qrDialog.item?.qrCode && (
                        <img src={qrDialog.item.qrCode} alt="QR Code" style={{ maxWidth: 250 }} />
                    )}
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                        كود العهدة: {qrDialog.item?.code}
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setQrDialog({ open: false, item: null })}>إغلاق</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
