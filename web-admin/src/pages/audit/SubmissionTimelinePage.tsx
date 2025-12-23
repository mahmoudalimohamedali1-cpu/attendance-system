import React, { useState, useEffect } from 'react';
import {
    Box, Card, Typography, Grid, Button, MenuItem,
    CircularProgress, Chip, FormControl, InputLabel, Select,
    Alert, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
} from '@mui/material';
import { History, CheckCircle, Error as ErrorIcon, Pending, Refresh } from '@mui/icons-material';
import { auditService, StatusLog } from '@/services/audit.service';

// Status colors and labels
const statusConfig: Record<string, { color: 'success' | 'error' | 'info' | 'warning' | 'default'; label: string }> = {
    ACCEPTED: { color: 'success', label: 'مقبول' },
    REJECTED: { color: 'error', label: 'مرفوض' },
    SUBMITTED: { color: 'info', label: 'مُقدم' },
    PREPARED: { color: 'warning', label: 'جاهز' },
    PENDING: { color: 'default', label: 'قيد الانتظار' },
    RESUBMIT_REQUIRED: { color: 'error', label: 'يتطلب إعادة التقديم' },
    PROCESSED: { color: 'success', label: 'تمت المعالجة' },
    FAILED: { color: 'error', label: 'فشل' },
};

// Entity type labels
const entityLabels: Record<string, string> = {
    MUDAD: 'مُدد',
    WPS: 'WPS',
    QIWA: 'قوى',
};

const SubmissionTimelinePage = () => {
    const [logs, setLogs] = useState<StatusLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState({
        entityType: '',
        status: '',
    });

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await auditService.getLogsByPeriod();
            setLogs(Array.isArray(data) ? data : []);
        } catch (err: any) {
            console.error('Failed to fetch audit logs:', err);
            setError(err?.response?.data?.message || err?.message || 'حدث خطأ في تحميل السجلات');
            setLogs([]);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredLogs = logs.filter(log => {
        if (filter.entityType && log.entityType !== filter.entityType) return false;
        if (filter.status && log.toStatus !== filter.status) return false;
        return true;
    });

    const formatDate = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('ar-SA') + ' ' + date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
        } catch {
            return dateStr;
        }
    };

    return (
        <Box p={3}>
            {/* Header */}
            <Box mb={4} display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                    <Typography variant="h4" fontWeight="bold" gutterBottom color="primary">
                        سجل التغييرات والتدقيق
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        متابعة حركة الملفات، تغييرات الحالة، وتدقيق العمليات الحكومية
                    </Typography>
                </Box>
                <Button
                    variant="outlined"
                    startIcon={<Refresh />}
                    onClick={fetchLogs}
                    disabled={isLoading}
                >
                    تحديث السجل
                </Button>
            </Box>

            {/* Error Alert */}
            {error && (
                <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {/* Filters */}
            <Card sx={{ p: 3, mb: 4, borderRadius: 2 }}>
                <Grid container spacing={3} alignItems="center">
                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                            <InputLabel>نوع النظام</InputLabel>
                            <Select
                                value={filter.entityType}
                                label="نوع النظام"
                                onChange={(e) => setFilter({ ...filter, entityType: e.target.value })}
                            >
                                <MenuItem value="">الكل</MenuItem>
                                <MenuItem value="MUDAD">مُدد (Mudad)</MenuItem>
                                <MenuItem value="WPS">WPS (الرواتب)</MenuItem>
                                <MenuItem value="QIWA">قوى (Qiwa)</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                            <InputLabel>الحالة النهائية</InputLabel>
                            <Select
                                value={filter.status}
                                label="الحالة النهائية"
                                onChange={(e) => setFilter({ ...filter, status: e.target.value })}
                            >
                                <MenuItem value="">الكل</MenuItem>
                                <MenuItem value="ACCEPTED">مقبول</MenuItem>
                                <MenuItem value="REJECTED">مرفوض</MenuItem>
                                <MenuItem value="RESUBMIT_REQUIRED">مطلوب إعادة التقديم</MenuItem>
                                <MenuItem value="PROCESSED">تمت المعالجة</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                </Grid>
            </Card>

            {/* Content */}
            {isLoading ? (
                <Box display="flex" justifyContent="center" py={10}>
                    <CircularProgress size={60} />
                </Box>
            ) : filteredLogs.length > 0 ? (
                <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ bgcolor: 'primary.main' }}>
                                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>التاريخ</TableCell>
                                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>النظام</TableCell>
                                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>من الحالة</TableCell>
                                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>إلى الحالة</TableCell>
                                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>السبب</TableCell>
                                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>بواسطة</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredLogs.map((log, index) => (
                                <TableRow key={log.id || index} hover>
                                    <TableCell>
                                        <Typography variant="body2">
                                            {formatDate(log.createdAt)}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={entityLabels[log.entityType] || log.entityType}
                                            size="small"
                                            color="primary"
                                            variant="outlined"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={statusConfig[log.fromStatus]?.label || log.fromStatus || '-'}
                                            size="small"
                                            variant="outlined"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={statusConfig[log.toStatus]?.label || log.toStatus}
                                            size="small"
                                            color={statusConfig[log.toStatus]?.color || 'default'}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" color="text.secondary">
                                            {log.reason || '-'}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">
                                            {log.changedByName || '-'}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            ) : (
                <Card sx={{ p: 5, textAlign: 'center', borderRadius: 4 }}>
                    <History sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">
                        لا توجد سجلات مطابقة للبحث
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        سيتم عرض السجلات هنا عند إرسال ملفات WPS أو Mudad أو Qiwa
                    </Typography>
                </Card>
            )}
        </Box>
    );
};

export default SubmissionTimelinePage;
