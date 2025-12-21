import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Box, Card, Typography, Grid, TextField, Button, MenuItem,
    CircularProgress, Chip, FormControl, InputLabel, Select,
    Stack, Divider,
} from '@mui/material';
import { History, Search, ArrowForward } from '@mui/icons-material';
import { auditService, StatusLog } from '@/services/audit.service';

// Status colors
const statusColors: Record<string, 'success' | 'error' | 'warning' | 'info' | 'primary'> = {
    PENDING: 'warning',
    PREPARED: 'info',
    SUBMITTED: 'primary',
    ACCEPTED: 'success',
    REJECTED: 'error',
    RESUBMITTED: 'info',
    RESUBMIT_REQUIRED: 'error',
    GENERATED: 'info',
    DOWNLOADED: 'primary',
    PROCESSING: 'warning',
    PROCESSED: 'success',
    FAILED: 'error',
};

// Entity type labels
const entityLabels: Record<string, string> = {
    MUDAD: 'مُدد',
    WPS: 'WPS',
    QIWA: 'قوى',
};

// Reason codes in Arabic
const reasonLabels: Record<string, string> = {
    FILE_HASH_CHANGED: 'تغيّر ملف الهاش',
    MANUAL_ACCEPT: 'قبول يدوي',
    BANK_PROCESSED: 'تمت المعالجة بالبنك',
    RESUBMIT_REQUESTED: 'طُلب إعادة الرفع',
};

const SubmissionTimelinePage = () => {
    const [filters, setFilters] = useState({
        entityType: 'MUDAD' as 'MUDAD' | 'WPS' | 'QIWA',
        entityId: '',
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
    });

    const [searchEntityId, setSearchEntityId] = useState('');

    // Query for logs by period
    const { data: logs = [], isLoading, refetch } = useQuery({
        queryKey: ['submission-logs', filters.startDate, filters.endDate],
        queryFn: () => auditService.getLogsByPeriod(filters.startDate, filters.endDate),
    });

    // Filter logs by entity type
    const filteredLogs = logs.filter((log: StatusLog) => {
        if (filters.entityType && log.entityType !== filters.entityType) return false;
        if (searchEntityId && !log.entityId.includes(searchEntityId)) return false;
        return true;
    });

    const handleFilterChange = (key: string, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    // Parse meta JSON safely
    const parseMeta = (meta?: string) => {
        if (!meta) return null;
        try {
            return JSON.parse(meta);
        } catch {
            return null;
        }
    };

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <History sx={{ fontSize: 32, color: 'primary.main' }} />
                <Box>
                    <Typography variant="h5" fontWeight="bold">
                        سجل تغييرات الحالة
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        تتبع تغييرات الحالة لتقديمات Mudad / WPS / Qiwa
                    </Typography>
                </Box>
            </Box>

            {/* Filters */}
            <Card sx={{ p: 2, mb: 3 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={2}>
                        <FormControl fullWidth size="small">
                            <InputLabel>نوع الكيان</InputLabel>
                            <Select
                                value={filters.entityType}
                                label="نوع الكيان"
                                onChange={(e) => handleFilterChange('entityType', e.target.value)}
                            >
                                <MenuItem value="MUDAD">مُدد</MenuItem>
                                <MenuItem value="WPS">WPS</MenuItem>
                                <MenuItem value="QIWA">قوى</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <TextField
                            fullWidth
                            size="small"
                            label="بحث بـ Entity ID"
                            placeholder="UUID..."
                            value={searchEntityId}
                            onChange={(e) => setSearchEntityId(e.target.value)}
                            InputProps={{
                                endAdornment: <Search color="action" />
                            }}
                        />
                    </Grid>
                    <Grid item xs={12} md={2}>
                        <TextField
                            fullWidth
                            size="small"
                            type="date"
                            label="من تاريخ"
                            value={filters.startDate}
                            onChange={(e) => handleFilterChange('startDate', e.target.value)}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>
                    <Grid item xs={12} md={2}>
                        <TextField
                            fullWidth
                            size="small"
                            type="date"
                            label="إلى تاريخ"
                            value={filters.endDate}
                            onChange={(e) => handleFilterChange('endDate', e.target.value)}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <Button
                            variant="contained"
                            onClick={() => refetch()}
                            startIcon={<Search />}
                            fullWidth
                        >
                            بحث
                        </Button>
                    </Grid>
                </Grid>
            </Card>

            {/* Stats */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} md={3}>
                    <Card sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h4" color="primary">{filteredLogs.length}</Typography>
                        <Typography variant="body2" color="text.secondary">إجمالي التغييرات</Typography>
                    </Card>
                </Grid>
                <Grid item xs={6} md={3}>
                    <Card sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h4" color="success.main">
                            {filteredLogs.filter((l: StatusLog) => ['ACCEPTED', 'PROCESSED'].includes(l.toStatus)).length}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">مقبول / معالج</Typography>
                    </Card>
                </Grid>
                <Grid item xs={6} md={3}>
                    <Card sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h4" color="error.main">
                            {filteredLogs.filter((l: StatusLog) => ['REJECTED', 'FAILED', 'RESUBMIT_REQUIRED'].includes(l.toStatus)).length}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">مرفوض / فاشل</Typography>
                    </Card>
                </Grid>
                <Grid item xs={6} md={3}>
                    <Card sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h4" color="warning.main">
                            {filteredLogs.filter((l: StatusLog) => l.reason === 'FILE_HASH_CHANGED').length}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">تغيير هاش</Typography>
                    </Card>
                </Grid>
            </Grid>

            {/* Loading */}
            {isLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                </Box>
            )}

            {/* Status Change List */}
            {!isLoading && filteredLogs.length > 0 && (
                <Stack spacing={2}>
                    {filteredLogs.map((log: StatusLog, index: number) => {
                        const meta = parseMeta(log.meta);
                        return (
                            <Card key={log.id || index} variant="outlined" sx={{ p: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Chip
                                            label={entityLabels[log.entityType] || log.entityType}
                                            size="small"
                                            color="primary"
                                            variant="outlined"
                                        />
                                        <Typography variant="caption" color="text.secondary">
                                            {log.entityId.substring(0, 8)}...
                                        </Typography>
                                    </Box>
                                    <Typography variant="caption" color="text.secondary">
                                        {new Date(log.createdAt).toLocaleDateString('ar-SA')} {new Date(log.createdAt).toLocaleTimeString('ar-SA')}
                                    </Typography>
                                </Box>

                                <Divider sx={{ my: 1 }} />

                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Chip
                                        label={log.fromStatus}
                                        size="small"
                                        color={statusColors[log.fromStatus] || 'default'}
                                        variant="outlined"
                                    />
                                    <ArrowForward fontSize="small" color="action" />
                                    <Chip
                                        label={log.toStatus}
                                        size="small"
                                        color={statusColors[log.toStatus] || 'default'}
                                    />
                                </Box>

                                {log.reason && (
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                        السبب: {reasonLabels[log.reason] || log.reason}
                                    </Typography>
                                )}

                                {meta && meta.oldHash && (
                                    <Box sx={{ mt: 1, p: 1, bgcolor: 'error.light', borderRadius: 1 }}>
                                        <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                                            Old: {meta.oldHash.substring(0, 16)}...
                                        </Typography>
                                        <br />
                                        <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                                            New: {meta.newHash.substring(0, 16)}...
                                        </Typography>
                                    </Box>
                                )}

                                {log.changedByName && (
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                                        بواسطة: {log.changedByName}
                                    </Typography>
                                )}
                            </Card>
                        );
                    })}
                </Stack>
            )}

            {/* Empty State */}
            {!isLoading && filteredLogs.length === 0 && (
                <Card sx={{ p: 4, textAlign: 'center' }}>
                    <History sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">
                        لا توجد سجلات
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        حاول تغيير الفلاتر أو التاريخ
                    </Typography>
                </Card>
            )}
        </Box>
    );
};

export default SubmissionTimelinePage;
