import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Box, Card, Typography, Grid, TextField, Button, MenuItem,
    CircularProgress, Chip, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, TablePagination, FormControl, InputLabel, Select,
} from '@mui/material';
import { History } from '@mui/icons-material';
import { api } from '@/services/api.service';

interface AuditLog {
    id: string;
    userId: string;
    user?: {
        firstName: string;
        lastName: string;
        email: string;
    };
    action: string;
    entity: string;
    entityId?: string;
    description?: string;
    ipAddress?: string;
    createdAt: string;
}

const actionLabels: Record<string, { label: string; color: any }> = {
    CREATE: { label: 'إنشاء', color: 'success' },
    UPDATE: { label: 'تعديل', color: 'warning' },
    DELETE: { label: 'حذف', color: 'error' },
    LOGIN: { label: 'دخول', color: 'info' },
    LOGOUT: { label: 'خروج', color: 'default' },
    EXPORT: { label: 'تصدير', color: 'primary' },
    SETTINGS_CHANGE: { label: 'إعدادات', color: 'secondary' },
};

const entityLabels: Record<string, string> = {
    // Main entities matching AuditService usage
    User: 'الموظف',
    PAYROLL: 'الرواتب',
    Payslip: 'قسيمة الراتب',
    PayrollRun: 'دورة الرواتب',
    BANK_ACCOUNT: 'الحساب البنكي',
    Leave: 'الإجازة',
    Attendance: 'الحضور',
    AUTH: 'المصادقة',
    Permission: 'الصلاحيات',
    Policy: 'السياسات',
    Settings: 'الإعدادات',
    WPS: 'نظام حماية الأجور',
    MUDAD: 'مُدد',
    GOSI: 'التأمينات',
    QIWA: 'قوى',
    Contract: 'العقود',
    SalaryAssignment: 'تعيين الراتب',
    RaiseRequest: 'طلب زيادة',
    AdvanceRequest: 'طلب سلفة',
};

export const AuditLogsPage = () => {
    const [page, setPage] = useState(0);
    const [limit, setLimit] = useState(25);
    const [filters, setFilters] = useState({
        entity: '',
        action: '',
        startDate: '',
        endDate: '',
    });

    const queryString = new URLSearchParams({
        page: String(page + 1),
        limit: String(limit),
        ...(filters.entity && { entity: filters.entity }),
        ...(filters.action && { action: filters.action }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
    }).toString();

    const { data, isLoading } = useQuery({
        queryKey: ['audit-logs', page, limit, filters],
        queryFn: () => api.get(`/audit/logs?${queryString}`) as Promise<{
            data: AuditLog[];
            pagination: { page: number; limit: number; total: number; totalPages: number };
        }>,
    });

    const handleFilterChange = (key: string, value: string) => {
        setFilters({ ...filters, [key]: value });
        setPage(0);
    };

    if (isLoading) return <CircularProgress />;

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box>
                    <Typography variant="h4" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <History color="primary" /> سجلات التدقيق
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        جميع العمليات الحساسة مسجلة ولا يمكن حذفها أو تعديلها
                    </Typography>
                </Box>
            </Box>

            {/* Filters */}
            <Card sx={{ p: 2, mb: 3 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={3}>
                        <FormControl fullWidth size="small">
                            <InputLabel>الكيان</InputLabel>
                            <Select
                                value={filters.entity}
                                label="الكيان"
                                onChange={(e) => handleFilterChange('entity', e.target.value)}
                            >
                                <MenuItem value="">الكل</MenuItem>
                                {Object.entries(entityLabels).map(([k, v]) => (
                                    <MenuItem key={k} value={k}>{v}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={3}>
                        <FormControl fullWidth size="small">
                            <InputLabel>الإجراء</InputLabel>
                            <Select
                                value={filters.action}
                                label="الإجراء"
                                onChange={(e) => handleFilterChange('action', e.target.value)}
                            >
                                <MenuItem value="">الكل</MenuItem>
                                {Object.entries(actionLabels).map(([k, v]) => (
                                    <MenuItem key={k} value={k}>{v.label}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={2}>
                        <TextField
                            fullWidth size="small" type="date" label="من تاريخ"
                            InputLabelProps={{ shrink: true }}
                            value={filters.startDate}
                            onChange={(e) => handleFilterChange('startDate', e.target.value)}
                        />
                    </Grid>
                    <Grid item xs={12} sm={2}>
                        <TextField
                            fullWidth size="small" type="date" label="إلى تاريخ"
                            InputLabelProps={{ shrink: true }}
                            value={filters.endDate}
                            onChange={(e) => handleFilterChange('endDate', e.target.value)}
                        />
                    </Grid>
                    <Grid item xs={12} sm={2}>
                        <Button
                            variant="outlined"
                            onClick={() => setFilters({ entity: '', action: '', startDate: '', endDate: '' })}
                            fullWidth
                        >
                            مسح الفلاتر
                        </Button>
                    </Grid>
                </Grid>
            </Card>

            {/* Results */}
            <Card>
                <TableContainer>
                    <Table>
                        <TableHead sx={{ bgcolor: 'grey.50' }}>
                            <TableRow>
                                <TableCell>التاريخ والوقت</TableCell>
                                <TableCell>المستخدم</TableCell>
                                <TableCell>الإجراء</TableCell>
                                <TableCell>الكيان</TableCell>
                                <TableCell>الوصف</TableCell>
                                <TableCell>IP</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {data?.data.map((log) => (
                                <TableRow key={log.id} hover>
                                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                        {new Date(log.createdAt).toLocaleString('ar-SA')}
                                    </TableCell>
                                    <TableCell>
                                        {log.user ? `${log.user.firstName} ${log.user.lastName}` : 'غير معروف'}
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={actionLabels[log.action]?.label || log.action}
                                            color={actionLabels[log.action]?.color || 'default'}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        {entityLabels[log.entity] || log.entity}
                                        {log.entityId && <Typography variant="caption" display="block" color="text.secondary">#{log.entityId.slice(0, 8)}</Typography>}
                                    </TableCell>
                                    <TableCell>{log.description || '-'}</TableCell>
                                    <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{log.ipAddress || '-'}</TableCell>
                                </TableRow>
                            ))}
                            {(!data?.data || data.data.length === 0) && (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                                        <Typography color="text.secondary">لا توجد سجلات</Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination
                    component="div"
                    count={data?.pagination?.total || 0}
                    page={page}
                    onPageChange={(_, p) => setPage(p)}
                    rowsPerPage={limit}
                    onRowsPerPageChange={(e) => { setLimit(parseInt(e.target.value)); setPage(0); }}
                    labelRowsPerPage="عدد الصفوف:"
                    labelDisplayedRows={({ from, to, count }) => `${from}-${to} من ${count}`}
                />
            </Card>
        </Box>
    );
};

export default AuditLogsPage;
