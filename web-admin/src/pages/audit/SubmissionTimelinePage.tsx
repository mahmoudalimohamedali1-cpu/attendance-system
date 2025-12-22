import React, { useState, useEffect } from 'react';
import {
    Box, Card, Typography, Grid, TextField, Button, MenuItem,
    CircularProgress, Chip, FormControl, InputLabel, Select,
    Divider,
} from '@mui/material';
import {
    Timeline,
    TimelineItem,
    TimelineSeparator,
    TimelineConnector,
    TimelineContent,
    TimelineDot,
    TimelineOppositeContent
} from '@mui/lab';
import { History, Search, ArrowForward, CheckCircle, Error, Pending, Refresh } from '@mui/icons-material';
import { auditService, StatusLog } from '@/services/audit.service';

// Status colors
const statusColors: Record<string, any> = {
    ACCEPTED: 'success',
    REJECTED: 'error',
    SUBMITTED: 'info',
    PREPARED: 'warning',
    PENDING: 'grey',
    RESUBMIT_REQUIRED: 'error',
    PROCESSED: 'success',
    FAILED: 'error',
};

// Status icons
const statusIcons: Record<string, React.ReactNode> = {
    ACCEPTED: <CheckCircle fontSize="small" />,
    REJECTED: <Error fontSize="small" />,
    PROCESSED: <CheckCircle fontSize="small" />,
    FAILED: <Error fontSize="small" />,
    PENDING: <Pending fontSize="small" />,
    RESUBMIT_REQUIRED: <Refresh fontSize="small" />,
};

// Entity type labels
const entityLabels: Record<string, string> = {
    MUDAD: 'مُدد',
    WPS: 'WPS',
    QIWA: 'قوى',
};

// Reason labels
const reasonLabels: Record<string, string> = {
    FILE_HASH_CHANGED: 'تغيير في محتوى الملف',
    DENIED_AFTER_ACCEPT: 'محاولة تعديل مرفوضة بعد القبل',
    FIRST_FILE_ATTACHED: 'إرفاق الملف الأول',
    FILE_REATTACHED_AFTER_RESUBMIT: 'إعادة إرفاق بعد طلب إعادة التقديم',
    MANUAL_OVERRIDE: 'تعديل يدوي',
};

const SubmissionTimelinePage = () => {
    const [logs, setLogs] = useState<StatusLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState({
        entityType: '',
        status: '',
    });

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        setIsLoading(true);
        try {
            const data = await auditService.getLogsByPeriod();
            setLogs(data);
        } catch (error) {
            console.error('Failed to fetch audit logs:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredLogs = logs.filter(log => {
        if (filter.entityType && log.entityType !== filter.entityType) return false;
        if (filter.status && log.toStatus !== filter.status) return false;
        return true;
    });

    const parseMeta = (metaStr?: string) => {
        if (!metaStr) return null;
        try {
            return JSON.parse(metaStr);
        } catch {
            return null;
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
                        متابعة حركة الملفات، تغييرات الحالة، وتدقيق العمليات الحكومية (Compliance Audit)
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

            {/* Filters */}
            <Card sx={{ p: 3, mb: 4, borderRadius: 2 }}>
                <Grid container spacing={3} alignItems="center">
                    <Grid item xs={12} md={4}>
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
                    <Grid item xs={12} md={4}>
                        <FormControl fullWidth>
                            <InputLabel>الحالة النهائية</InputLabel>
                            <Select
                                value={filter.status}
                                label="الحالة النهائية"
                                onChange={(e) => setFilter({ ...filter, status: e.target.value })}
                            >
                                <MenuItem value="">الكل</MenuItem>
                                <MenuItem value="ACCEPTED">مقبول (Accepted)</MenuItem>
                                <MenuItem value="REJECTED">مرفوض (Rejected)</MenuItem>
                                <MenuItem value="RESUBMIT_REQUIRED">مطلوب إعادة التقديم</MenuItem>
                                <MenuItem value="PROCESSED">تمت المعالجة</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <TextField
                            fullWidth
                            label="بحث سريع"
                            InputProps={{
                                startAdornment: <Search sx={{ color: 'text.secondary', mr: 1 }} />,
                            }}
                            placeholder="رقم العملية، اسم المستخدم..."
                        />
                    </Grid>
                </Grid>
            </Card>

            {isLoading ? (
                <Box display="flex" justifyContent="center" py={10}>
                    <CircularProgress size={60} />
                </Box>
            ) : filteredLogs.length > 0 ? (
                <Box sx={{ position: 'relative' }}>
                    <Timeline position="alternate" sx={{ p: 0 }}>
                        {filteredLogs.map((log: StatusLog, index: number) => {
                            const meta = parseMeta(log.meta);
                            const isOdd = index % 2 !== 0;

                            return (
                                <TimelineItem key={log.id || index}>
                                    <TimelineOppositeContent sx={{ m: 'auto 0' }}>
                                        <Typography variant="body2" color="text.secondary" fontWeight="bold">
                                            {new Date(log.createdAt).toLocaleDateString('ar-SA')}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {new Date(log.createdAt).toLocaleTimeString('ar-SA')}
                                        </Typography>
                                    </TimelineOppositeContent>

                                    <TimelineSeparator>
                                        <TimelineConnector sx={{ bgcolor: 'primary.light', height: 40 }} />
                                        <TimelineDot
                                            color={statusColors[log.toStatus] || 'grey'}
                                            variant="outlined"
                                            sx={{ p: 1, border: '2px solid' }}
                                        >
                                            {statusIcons[log.toStatus] || <History />}
                                        </TimelineDot>
                                        <TimelineConnector sx={{ bgcolor: 'primary.light' }} />
                                    </TimelineSeparator>

                                    <TimelineContent sx={{ py: '12px', px: 2 }}>
                                        <Card
                                            variant="outlined"
                                            sx={{
                                                p: 2,
                                                borderRadius: 3,
                                                background: 'linear-gradient(to bottom right, #ffffff, #f8f9fa)',
                                                borderLeft: isOdd ? 'none' : `5px solid #1976d2`,
                                                borderRight: isOdd ? `5px solid #1976d2` : 'none',
                                                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                                                textAlign: isOdd ? 'left' : 'right'
                                            }}
                                        >
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, flexDirection: isOdd ? 'row-reverse' : 'row' }}>
                                                <Chip
                                                    label={entityLabels[log.entityType] || log.entityType}
                                                    size="small"
                                                    color="primary"
                                                    variant="outlined"
                                                />
                                                <Typography variant="caption" sx={{ fontFamily: 'monospace', bgcolor: 'grey.100', px: 1, borderRadius: 1 }}>
                                                    ID: {log.entityId.substring(0, 8)}
                                                </Typography>
                                            </Box>

                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: isOdd ? 'flex-end' : 'flex-start', my: 1.5 }}>
                                                <Chip
                                                    label={log.fromStatus}
                                                    size="small"
                                                    variant="outlined"
                                                    sx={{ borderRadius: 1 }}
                                                />
                                                <ArrowForward fontSize="small" color="disabled" sx={{ transform: isOdd ? 'rotate(180deg)' : 'none' }} />
                                                <Chip
                                                    label={log.toStatus}
                                                    size="small"
                                                    color={statusColors[log.toStatus] || 'default'}
                                                    sx={{ fontWeight: 'bold', borderRadius: 1 }}
                                                />
                                            </Box>

                                            {log.reason && (
                                                <Typography variant="body2" sx={{ my: 1, fontWeight: 500 }}>
                                                    🎯 السبب: {reasonLabels[log.reason] || log.reason}
                                                </Typography>
                                            )}

                                            {meta && meta.oldHash && (
                                                <Box sx={{ mt: 2, p: 1.5, bgcolor: '#fff5f5', border: '1px dashed #feb2b2', borderRadius: 2 }}>
                                                    <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                                                        <Error color="error" fontSize="small" />
                                                        <Typography variant="caption" color="error.dark" fontWeight="bold">رصد تغيير في بصمة الملف (Security Alert)</Typography>
                                                    </Box>
                                                    <Typography variant="caption" sx={{ fontFamily: 'monospace', display: 'block', opacity: 0.7 }}>
                                                        السابق: {meta.oldHash.substring(0, 16)}...
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ fontFamily: 'monospace', display: 'block', color: 'error.main' }}>
                                                        الحالي: {meta.newHash.substring(0, 16)}...
                                                    </Typography>
                                                </Box>
                                            )}

                                            <Divider sx={{ my: 1.5, opacity: 0.5 }} />

                                            {log.changedByName && (
                                                <Box display="flex" alignItems="center" gap={1} justifyContent={isOdd ? 'flex-end' : 'flex-start'}>
                                                    <Typography variant="caption" color="text.secondary">
                                                        بواسطة: <strong>{log.changedByName}</strong>
                                                    </Typography>
                                                </Box>
                                            )}
                                        </Card>
                                    </TimelineContent>
                                </TimelineItem>
                            );
                        })}
                    </Timeline>
                </Box>
            ) : (
                <Card sx={{ p: 5, textAlign: 'center', borderRadius: 4 }}>
                    <History sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">لا توجد سجلات مطابقة للبحث</Typography>
                </Card>
            )}
        </Box>
    );
};

export default SubmissionTimelinePage;
