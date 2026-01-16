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
    TextField,
    MenuItem,
    Alert,
    CircularProgress,
    Card,
    CardContent,
    Grid,
    Chip,
    IconButton,
    Drawer,
    Divider,
    Tooltip,
} from '@mui/material';
import {
    History as HistoryIcon,
    Search as SearchIcon,
    Visibility as VisibilityIcon,
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Close as CloseIcon,
    Description as DescriptionIcon,
} from '@mui/icons-material';
import custodyAuditService, { AuditLog } from '@/services/custody-audit.service';

const ENTITY_OPTIONS = [
    { value: '', label: 'جميع الكيانات' },
    { value: 'CustodyCategory', label: 'الفئات' },
    { value: 'CustodyItem', label: 'العهد' },
    { value: 'CustodyAssignment', label: 'التسليمات' },
    { value: 'CustodyReturn', label: 'المرتجعات' },
    { value: 'CustodyTransfer', label: 'التحويلات' },
    { value: 'CustodyMaintenance', label: 'الصيانة' },
];

const ACTION_CONFIG: Record<string, { label: string; color: 'success' | 'info' | 'error' }> = {
    CREATE: { label: 'إنشاء', color: 'success' },
    UPDATE: { label: 'تعديل', color: 'info' },
    DELETE: { label: 'حذف', color: 'error' },
};

const ENTITY_LABELS: Record<string, string> = {
    CustodyCategory: 'فئة العهد',
    CustodyItem: 'عهدة',
    CustodyAssignment: 'تسليم عهدة',
    CustodyReturn: 'إرجاع عهدة',
    CustodyTransfer: 'تحويل عهدة',
    CustodyMaintenance: 'صيانة عهدة',
};

export default function CustodyAuditPage() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(20);
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);

    // Filters
    const [entity, setEntity] = useState<string>('');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [searchText, setSearchText] = useState('');

    // Stats
    const [stats, setStats] = useState({
        totalLogs: 0,
        creates: 0,
        updates: 0,
        deletes: 0,
    });

    const fetchAuditLogs = useCallback(async () => {
        setLoading(true);
        try {
            const params: any = {
                page: page + 1,
                limit: rowsPerPage,
            };

            if (entity) params.entity = entity;
            if (startDate) params.startDate = startDate;
            if (endDate) params.endDate = endDate;

            const response = await custodyAuditService.getAuditHistory(params);
            setAuditLogs(response.data || []);
            setTotal(response.total || 0);

            // Calculate stats
            const logs = response.data || [];
            setStats({
                totalLogs: response.total || 0,
                creates: logs.filter((l: AuditLog) => l.action === 'CREATE').length,
                updates: logs.filter((l: AuditLog) => l.action === 'UPDATE').length,
                deletes: logs.filter((l: AuditLog) => l.action === 'DELETE').length,
            });
            setError(null);
        } catch (err: any) {
            setError(err.response?.data?.message || 'فشل في تحميل سجل المراجعة');
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage, entity, startDate, endDate]);

    useEffect(() => {
        fetchAuditLogs();
    }, [fetchAuditLogs]);

    const handleViewDetails = (record: AuditLog) => {
        setSelectedLog(record);
        setDrawerOpen(true);
    };

    const filteredLogs = auditLogs.filter(log => {
        if (!searchText) return true;
        const searchLower = searchText.toLowerCase();
        return (
            log.description?.toLowerCase().includes(searchLower) ||
            log.entityId?.toLowerCase().includes(searchLower) ||
            log.user?.firstName?.toLowerCase().includes(searchLower) ||
            log.user?.lastName?.toLowerCase().includes(searchLower)
        );
    });

    const renderJsonDiff = (oldValue: any, newValue: any) => {
        if (!oldValue && !newValue) {
            return <Typography color="text.secondary">لا توجد بيانات</Typography>;
        }

        return (
            <Box sx={{ direction: 'ltr', textAlign: 'left' }}>
                {oldValue && (
                    <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" color="error.main" gutterBottom>
                            القيمة القديمة:
                        </Typography>
                        <Paper
                            sx={{
                                p: 1.5,
                                bgcolor: 'error.light',
                                overflow: 'auto',
                                maxHeight: 200,
                            }}
                        >
                            <pre style={{ margin: 0, fontSize: 12 }}>
                                {JSON.stringify(oldValue, null, 2)}
                            </pre>
                        </Paper>
                    </Box>
                )}
                {newValue && (
                    <Box>
                        <Typography variant="subtitle2" color="success.main" gutterBottom>
                            القيمة الجديدة:
                        </Typography>
                        <Paper
                            sx={{
                                p: 1.5,
                                bgcolor: 'success.light',
                                overflow: 'auto',
                                maxHeight: 200,
                            }}
                        >
                            <pre style={{ margin: 0, fontSize: 12 }}>
                                {JSON.stringify(newValue, null, 2)}
                            </pre>
                        </Paper>
                    </Box>
                )}
            </Box>
        );
    };

    if (loading && auditLogs.length === 0) {
        return (
            <Box display="flex" justifyContent="center" p={4}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box p={3}>
            {/* Header */}
            <Typography variant="h5" fontWeight="bold" mb={3}>
                <HistoryIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                سجل مراجعة العهد
            </Typography>

            {/* Alerts */}
            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {/* Stats Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" gap={1}>
                                <DescriptionIcon color="action" />
                                <Typography color="text.secondary" variant="caption">
                                    إجمالي السجلات
                                </Typography>
                            </Box>
                            <Typography variant="h5">{stats.totalLogs}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={3}>
                    <Card sx={{ bgcolor: 'success.light' }}>
                        <CardContent>
                            <Box display="flex" alignItems="center" gap={1}>
                                <AddIcon color="success" />
                                <Typography color="text.secondary" variant="caption">
                                    عمليات الإنشاء
                                </Typography>
                            </Box>
                            <Typography variant="h5" color="success.main">
                                {stats.creates}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={3}>
                    <Card sx={{ bgcolor: 'info.light' }}>
                        <CardContent>
                            <Box display="flex" alignItems="center" gap={1}>
                                <EditIcon color="info" />
                                <Typography color="text.secondary" variant="caption">
                                    عمليات التعديل
                                </Typography>
                            </Box>
                            <Typography variant="h5" color="info.main">
                                {stats.updates}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={3}>
                    <Card sx={{ bgcolor: 'error.light' }}>
                        <CardContent>
                            <Box display="flex" alignItems="center" gap={1}>
                                <DeleteIcon color="error" />
                                <Typography color="text.secondary" variant="caption">
                                    عمليات الحذف
                                </Typography>
                            </Box>
                            <Typography variant="h5" color="error.main">
                                {stats.deletes}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Filters */}
            <Paper sx={{ p: 2, mb: 3 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={3}>
                        <TextField
                            select
                            fullWidth
                            size="small"
                            label="نوع الكيان"
                            value={entity}
                            onChange={(e) => setEntity(e.target.value)}
                        >
                            {ENTITY_OPTIONS.map((opt) => (
                                <MenuItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                    <Grid item xs={12} sm={2}>
                        <TextField
                            fullWidth
                            size="small"
                            type="date"
                            label="من تاريخ"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={2}>
                        <TextField
                            fullWidth
                            size="small"
                            type="date"
                            label="إلى تاريخ"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="بحث في السجلات..."
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            InputProps={{
                                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                            }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={2}>
                        <Button
                            fullWidth
                            variant="contained"
                            onClick={fetchAuditLogs}
                            startIcon={<SearchIcon />}
                        >
                            بحث
                        </Button>
                    </Grid>
                </Grid>
            </Paper>

            {/* Table */}
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow sx={{ bgcolor: 'grey.100' }}>
                            <TableCell>التاريخ والوقت</TableCell>
                            <TableCell>الإجراء</TableCell>
                            <TableCell>الكيان</TableCell>
                            <TableCell>الوصف</TableCell>
                            <TableCell>المستخدم</TableCell>
                            <TableCell align="center">تفاصيل</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredLogs.map((log) => (
                            <TableRow key={log.id} hover>
                                <TableCell>
                                    <Typography variant="body2" sx={{ direction: 'ltr', display: 'inline-block' }}>
                                        {new Date(log.createdAt).toLocaleString('ar-SA')}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        label={ACTION_CONFIG[log.action]?.label || log.action}
                                        color={ACTION_CONFIG[log.action]?.color || 'default'}
                                        size="small"
                                        icon={
                                            log.action === 'CREATE' ? <AddIcon /> :
                                            log.action === 'UPDATE' ? <EditIcon /> :
                                            log.action === 'DELETE' ? <DeleteIcon /> : undefined
                                        }
                                    />
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        label={ENTITY_LABELS[log.entity] || log.entity}
                                        size="small"
                                        variant="outlined"
                                    />
                                </TableCell>
                                <TableCell>
                                    <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                                        {log.description || '-'}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    {log.user ? `${log.user.firstName} ${log.user.lastName}` : '-'}
                                </TableCell>
                                <TableCell align="center">
                                    <Tooltip title="عرض التفاصيل">
                                        <IconButton
                                            size="small"
                                            color="primary"
                                            onClick={() => handleViewDetails(log)}
                                        >
                                            <VisibilityIcon />
                                        </IconButton>
                                    </Tooltip>
                                </TableCell>
                            </TableRow>
                        ))}
                        {filteredLogs.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} align="center">
                                    لا توجد سجلات
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

            {/* Details Drawer */}
            <Drawer anchor="left" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
                <Box sx={{ width: 500, p: 3 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h6">تفاصيل سجل المراجعة</Typography>
                        <IconButton onClick={() => setDrawerOpen(false)}>
                            <CloseIcon />
                        </IconButton>
                    </Box>

                    {selectedLog && (
                        <>
                            <Paper sx={{ p: 2, mb: 3 }}>
                                <Grid container spacing={2}>
                                    <Grid item xs={12}>
                                        <Typography variant="caption" color="text.secondary">
                                            رقم السجل
                                        </Typography>
                                        <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                                            {selectedLog.id}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="text.secondary">
                                            التاريخ والوقت
                                        </Typography>
                                        <Typography variant="body2">
                                            {new Date(selectedLog.createdAt).toLocaleString('ar-SA')}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="text.secondary">
                                            الإجراء
                                        </Typography>
                                        <Box>
                                            <Chip
                                                label={ACTION_CONFIG[selectedLog.action]?.label}
                                                color={ACTION_CONFIG[selectedLog.action]?.color}
                                                size="small"
                                            />
                                        </Box>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="text.secondary">
                                            الكيان
                                        </Typography>
                                        <Box>
                                            <Chip
                                                label={ENTITY_LABELS[selectedLog.entity] || selectedLog.entity}
                                                size="small"
                                                variant="outlined"
                                            />
                                        </Box>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="text.secondary">
                                            رقم الكيان
                                        </Typography>
                                        <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                                            {selectedLog.entityId}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Typography variant="caption" color="text.secondary">
                                            المستخدم
                                        </Typography>
                                        <Typography variant="body2">
                                            {selectedLog.user
                                                ? `${selectedLog.user.firstName} ${selectedLog.user.lastName}`
                                                : '-'}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Typography variant="caption" color="text.secondary">
                                            الوصف
                                        </Typography>
                                        <Typography variant="body2">
                                            {selectedLog.description || '-'}
                                        </Typography>
                                    </Grid>
                                    {selectedLog.ipAddress && (
                                        <Grid item xs={12}>
                                            <Typography variant="caption" color="text.secondary">
                                                عنوان IP
                                            </Typography>
                                            <Typography variant="body2" fontFamily="monospace">
                                                {selectedLog.ipAddress}
                                            </Typography>
                                        </Grid>
                                    )}
                                </Grid>
                            </Paper>

                            <Divider sx={{ my: 2 }} />

                            <Typography variant="h6" gutterBottom>
                                التغييرات
                            </Typography>
                            {renderJsonDiff(selectedLog.oldValue, selectedLog.newValue)}
                        </>
                    )}
                </Box>
            </Drawer>
        </Box>
    );
}
