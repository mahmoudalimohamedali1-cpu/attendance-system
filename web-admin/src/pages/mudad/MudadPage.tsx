import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Box,
    Grid,
    Typography,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    LinearProgress,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Alert,
    Drawer,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Stepper,
    Step,
    StepLabel,
    Tooltip,
    InputAdornment,
    Collapse,
    Divider,
} from '@mui/material';
import {
    CloudUpload,
    CheckCircle,
    Error as ErrorIcon,
    Schedule,
    Refresh,
    History,
    AttachFile,
    Close,
    Check,
    ContentCopy,
    Warning,
    Search,
    Add,
    ArrowForward,
    TableChart,
    Info,
    ExpandMore,
    ExpandLess,
    BugReport,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api.service';
import { API_CONFIG } from '@/config/api';
import { format } from 'date-fns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/ar';
import { wpsExportService, MudadValidationResult } from '@/services/wps.service';

// PayrollRun type for selection
interface PayrollRun {
    id: string;
    status: string;
    period?: {
        month: number;
        year: number;
    };
    _count?: {
        payslips: number;
    };
}

// Types
interface MudadSubmission {
    id: string;
    payrollRunId?: string;
    month: number;
    year: number;
    status: 'PENDING' | 'PREPARED' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED' | 'RESUBMIT_REQUIRED';
    fileUrl?: string;
    fileHashSha256?: string;
    generatorVersion?: string;
    note?: string;
    createdAt: string;
    updatedAt: string;
}

interface MudadStats {
    total: number;
    pending: number;
    prepared: number;
    submitted: number;
    accepted: number;
    rejected: number;
    resubmitRequired: number;
}

interface AuditLog {
    id: string;
    action: string;
    entity: string;
    entityId: string;
    oldValue?: any;
    newValue?: any;
    userId: string;
    userName?: string;
    createdAt: string;
    meta?: any;
}

// Status helpers
const statusSteps = ['PENDING', 'PREPARED', 'SUBMITTED', 'ACCEPTED'];

const getStatusStep = (status: string) => {
    const index = statusSteps.indexOf(status);
    if (status === 'REJECTED' || status === 'RESUBMIT_REQUIRED') return 2;
    return index >= 0 ? index : 0;
};

const getStatusColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    const colors: Record<string, any> = {
        'PENDING': 'warning',
        'PREPARED': 'info',
        'SUBMITTED': 'primary',
        'ACCEPTED': 'success',
        'REJECTED': 'error',
        'RESUBMIT_REQUIRED': 'error',
    };
    return colors[status] || 'default';
};

const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
        'PENDING': 'قيد الانتظار',
        'PREPARED': 'تم التجهيز',
        'SUBMITTED': 'تم الإرسال',
        'ACCEPTED': 'مقبول',
        'REJECTED': 'مرفوض',
        'RESUBMIT_REQUIRED': 'يتطلب إعادة إرسال',
    };
    return labels[status] || status;
};

const getMonthName = (month: number) => {
    const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    return months[month - 1] || '';
};

// Allowed transitions
const allowedTransitions: Record<string, string[]> = {
    'PENDING': ['PREPARED'],
    'PREPARED': ['SUBMITTED'],
    'SUBMITTED': ['ACCEPTED', 'REJECTED'],
    'REJECTED': ['PREPARED', 'RESUBMIT_REQUIRED'],
    'RESUBMIT_REQUIRED': ['PREPARED'],
    'ACCEPTED': [],
};

export default function MudadPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [selectedSubmission, setSelectedSubmission] = useState<MudadSubmission | null>(null);
    const [statusDialogOpen, setStatusDialogOpen] = useState(false);
    const [attachDialogOpen, setAttachDialogOpen] = useState(false);
    const [logsDrawerOpen, setLogsDrawerOpen] = useState(false);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [validationDialogOpen, setValidationDialogOpen] = useState(false);
    const [selectedRunId, setSelectedRunId] = useState('');
    const [newStatus, setNewStatus] = useState('');
    const [reason, setReason] = useState('');
    const [fileUrl, setFileUrl] = useState('');
    const [fileHash, setFileHash] = useState('');
    const [yearFilter, setYearFilter] = useState(new Date().getFullYear());
    const [statusFilter, setStatusFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedRow, setExpandedRow] = useState<string | null>(null);
    const [startDate, setStartDate] = useState<Dayjs | null>(() => {
        return dayjs().startOf('month');
    });
    const [endDate, setEndDate] = useState<Dayjs | null>(() => {
        return dayjs();
    });

    // Fetch submissions
    const { data: submissions, isLoading } = useQuery<MudadSubmission[]>({
        queryKey: ['mudad', yearFilter, statusFilter],
        queryFn: async () => {
            let url = `/mudad?year=${yearFilter}`;
            if (statusFilter) url += `&status=${statusFilter}`;
            const response = await api.get(url);
            return (response as any)?.data || response || [];
        },
    });

    // Fetch stats
    const { data: stats } = useQuery<MudadStats>({
        queryKey: ['mudad-stats', yearFilter],
        queryFn: async () => {
            const response = await api.get(`/mudad/stats?year=${yearFilter}`);
            return response as MudadStats;
        },
    });

    // Fetch logs for selected submission
    const { data: logs } = useQuery<AuditLog[]>({
        queryKey: ['mudad-logs', selectedSubmission?.id],
        queryFn: async () => {
            if (!selectedSubmission) return [];
            const response = await api.get(`/audit/logs?entity=Mudad&entityId=${selectedSubmission.id}`);
            return (response as any)?.data || response || [];
        },
        enabled: !!selectedSubmission && logsDrawerOpen,
    });

    // Fetch payroll runs for create dialog (get approved/locked runs)
    const { data: payrollRuns } = useQuery<PayrollRun[]>({
        queryKey: ['payroll-runs-for-mudad'],
        queryFn: async () => {
            const response = await api.get('/payroll-runs');
            const runs = (response as any)?.data || response || [];
            // Filter to approved/locked runs only
            return runs.filter((r: PayrollRun) =>
                ['HR_APPROVED', 'FINANCE_APPROVED', 'LOCKED', 'PAID'].includes(r.status)
            );
        },
    });

    // Fetch validation results for selected submission
    const { data: validationResults, isLoading: validationLoading } = useQuery<MudadValidationResult>({
        queryKey: ['mudad-validation', selectedSubmission?.payrollRunId],
        queryFn: async () => {
            if (!selectedSubmission?.payrollRunId) throw new Error('No payroll run ID');
            return wpsExportService.validateForMudad(selectedSubmission.payrollRunId);
        },
        enabled: !!selectedSubmission?.payrollRunId && validationDialogOpen,
    });

    // Create submission mutation
    const createMutation = useMutation({
        mutationFn: async (data: { payrollRunId: string }) => {
            return api.post('/mudad', data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['mudad'] });
            queryClient.invalidateQueries({ queryKey: ['mudad-stats'] });
            setCreateDialogOpen(false);
            setSelectedRunId('');
        },
    });

    // Update status mutation
    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status, note }: { id: string; status: string; note?: string }) => {
            return api.put(`/mudad/${id}/status`, { status, note });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['mudad'] });
            queryClient.invalidateQueries({ queryKey: ['mudad-stats'] });
            setStatusDialogOpen(false);
            setNewStatus('');
            setReason('');
        },
    });

    // Accept/Reject mutations
    const acceptMutation = useMutation({
        mutationFn: async (id: string) => api.put(`/mudad/${id}/accept`, {}),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['mudad'] });
            queryClient.invalidateQueries({ queryKey: ['mudad-stats'] });
        },
    });

    const rejectMutation = useMutation({
        mutationFn: async ({ id, note }: { id: string; note: string }) => api.put(`/mudad/${id}/reject`, { note }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['mudad'] });
            queryClient.invalidateQueries({ queryKey: ['mudad-stats'] });
        },
    });

    // Attach WPS file mutation
    const attachWpsMutation = useMutation({
        mutationFn: async ({ id, fileUrl, fileHashSha256 }: { id: string; fileUrl: string; fileHashSha256?: string }) => {
            return api.put(`/mudad/${id}/attach-wps`, { fileUrl, fileHashSha256 });
        },
        onSuccess: (data: any) => {
            queryClient.invalidateQueries({ queryKey: ['mudad'] });
            setAttachDialogOpen(false);
            setFileUrl('');
            setFileHash('');
            // Check if status changed to RESUBMIT_REQUIRED
            if (data?.status === 'RESUBMIT_REQUIRED') {
                alert('تحذير: تم اكتشاف تغيير في ملف WPS. يتطلب إعادة إرسال.');
            }
        },
    });

    const handleOpenStatusDialog = (submission: MudadSubmission) => {
        setSelectedSubmission(submission);
        setStatusDialogOpen(true);
    };

    const handleOpenAttachDialog = (submission: MudadSubmission) => {
        setSelectedSubmission(submission);
        setAttachDialogOpen(true);
    };

    const handleOpenLogs = (submission: MudadSubmission) => {
        setSelectedSubmission(submission);
        setLogsDrawerOpen(true);
    };

    const handleCopyHash = (hash: string) => {
        navigator.clipboard.writeText(hash);
    };

    const handleOpenValidation = (submission: MudadSubmission) => {
        setSelectedSubmission(submission);
        setValidationDialogOpen(true);
    };

    const handleToggleRow = (submissionId: string) => {
        setExpandedRow(expandedRow === submissionId ? null : submissionId);
    };

    const getSeverityColor = (severity: 'ERROR' | 'WARNING' | 'INFO'): 'error' | 'warning' | 'info' => {
        return severity.toLowerCase() as 'error' | 'warning' | 'info';
    };

    const getSeverityIcon = (severity: 'ERROR' | 'WARNING' | 'INFO') => {
        switch (severity) {
            case 'ERROR': return <ErrorIcon fontSize="small" />;
            case 'WARNING': return <Warning fontSize="small" />;
            case 'INFO': return <Info fontSize="small" />;
            default: return <Info fontSize="small" />;
        }
    };

    const handleExportExcel = async () => {
        try {
            const startDateStr = startDate?.format('YYYY-MM-DD') || '';
            const endDateStr = endDate?.format('YYYY-MM-DD') || '';
            const response = await fetch(`${API_CONFIG.BASE_URL}/mudad/export/excel?startDate=${startDateStr}&endDate=${endDateStr}&status=${statusFilter}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
            });
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `mudad-report-${startDateStr}-${endDateStr}.xlsx`;
            a.click();
        } catch (err) {
            // Export failed
        }
    };

    const filteredSubmissions = submissions?.filter(s => {
        if (!searchQuery) return true;
        return s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.payrollRunId?.toLowerCase().includes(searchQuery.toLowerCase());
    });

    return (
        <Box>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                <Box>
                    <Typography variant="h4" fontWeight="bold" gutterBottom>
                        مُدد - منصة الأجور
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        إدارة تقديمات بيانات الموظفين لوزارة الموارد البشرية
                    </Typography>
                </Box>
                <Box display="flex" gap={2}>
                    <Button
                        variant="outlined"
                        startIcon={<TableChart />}
                        onClick={handleExportExcel}
                    >
                        تصدير Excel
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<Refresh />}
                        onClick={() => queryClient.invalidateQueries({ queryKey: ['mudad'] })}
                    >
                        تحديث
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={() => setCreateDialogOpen(true)}
                    >
                        إنشاء تقديم جديد
                    </Button>
                </Box>
            </Box>

            {isLoading && <LinearProgress sx={{ mb: 3 }} />}

            {/* Stats Cards */}
            {stats && (
                <Grid container spacing={2} sx={{ mb: 4 }}>
                    <Grid item xs={6} sm={4} md={2}>
                        <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
                            <Typography variant="h4" fontWeight="bold">{stats.total}</Typography>
                            <Typography variant="body2" color="text.secondary">الإجمالي</Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={6} sm={4} md={2}>
                        <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2, bgcolor: 'warning.50' }}>
                            <Typography variant="h4" fontWeight="bold" color="warning.main">{stats.pending}</Typography>
                            <Typography variant="body2" color="text.secondary">قيد الانتظار</Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={6} sm={4} md={2}>
                        <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2, bgcolor: 'info.50' }}>
                            <Typography variant="h4" fontWeight="bold" color="info.main">{stats.submitted}</Typography>
                            <Typography variant="body2" color="text.secondary">تم الإرسال</Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={6} sm={4} md={2}>
                        <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2, bgcolor: 'success.50' }}>
                            <Typography variant="h4" fontWeight="bold" color="success.main">{stats.accepted}</Typography>
                            <Typography variant="body2" color="text.secondary">مقبول</Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={6} sm={4} md={2}>
                        <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2, bgcolor: 'error.50' }}>
                            <Typography variant="h4" fontWeight="bold" color="error.main">{stats.rejected}</Typography>
                            <Typography variant="body2" color="text.secondary">مرفوض</Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={6} sm={4} md={2}>
                        <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2, bgcolor: 'error.100' }}>
                            <Typography variant="h4" fontWeight="bold" color="error.dark">{stats.resubmitRequired || 0}</Typography>
                            <Typography variant="body2" color="text.secondary">إعادة إرسال</Typography>
                        </Paper>
                    </Grid>
                </Grid>
            )}

            {/* Filters */}
            <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
                <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ar">
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={6} md={3}>
                            <DatePicker
                                label="من تاريخ"
                                value={startDate}
                                onChange={(newValue) => setStartDate(newValue)}
                                slotProps={{ textField: { size: 'small', fullWidth: true } }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <DatePicker
                                label="إلى تاريخ"
                                value={endDate}
                                onChange={(newValue) => setEndDate(newValue)}
                                slotProps={{ textField: { size: 'small', fullWidth: true } }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={4} md={2}>
                            <FormControl fullWidth size="small">
                                <InputLabel>السنة</InputLabel>
                                <Select value={yearFilter} onChange={(e) => setYearFilter(e.target.value as number)} label="السنة">
                                    {[2024, 2025, 2026].map(y => (
                                        <MenuItem key={y} value={y}>{y}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={4} md={2}>
                            <FormControl fullWidth size="small">
                                <InputLabel>الحالة</InputLabel>
                                <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} label="الحالة">
                                    <MenuItem value="">الكل</MenuItem>
                                    <MenuItem value="PENDING">قيد الانتظار</MenuItem>
                                    <MenuItem value="PREPARED">تم التجهيز</MenuItem>
                                    <MenuItem value="SUBMITTED">تم الإرسال</MenuItem>
                                    <MenuItem value="ACCEPTED">مقبول</MenuItem>
                                    <MenuItem value="REJECTED">مرفوض</MenuItem>
                                    <MenuItem value="RESUBMIT_REQUIRED">إعادة إرسال</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={4} md={2}>
                            <TextField
                                fullWidth
                                size="small"
                                placeholder="بحث بالمعرف..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                InputProps={{
                                    startAdornment: <InputAdornment position="start"><Search /></InputAdornment>
                                }}
                            />
                        </Grid>
                    </Grid>
                </LocalizationProvider>
            </Paper>

            {/* Table */}
            <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
                <Table>
                    <TableHead sx={{ bgcolor: 'grey.100' }}>
                        <TableRow>
                            <TableCell>الفترة</TableCell>
                            <TableCell>الحالة</TableCell>
                            <TableCell>File Hash</TableCell>
                            <TableCell>آخر تحديث</TableCell>
                            <TableCell align="center">الإجراءات</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredSubmissions?.map((submission) => (
                            <TableRow
                                key={submission.id}
                                hover
                                sx={{
                                    bgcolor: submission.status === 'RESUBMIT_REQUIRED' ? 'error.50' : undefined,
                                }}
                            >
                                <TableCell>
                                    <Typography fontWeight="bold">
                                        {getMonthName(submission.month)} {submission.year}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        label={getStatusLabel(submission.status)}
                                        color={getStatusColor(submission.status)}
                                        size="small"
                                        icon={
                                            submission.status === 'ACCEPTED' ? <CheckCircle /> :
                                                submission.status === 'REJECTED' || submission.status === 'RESUBMIT_REQUIRED' ? <ErrorIcon /> :
                                                    submission.status === 'SUBMITTED' ? <CloudUpload /> :
                                                        <Schedule />
                                        }
                                    />
                                    {submission.status === 'RESUBMIT_REQUIRED' && (
                                        <Tooltip title="ملف WPS تغير منذ الإرسال الأخير">
                                            <Warning color="error" sx={{ ml: 1, verticalAlign: 'middle' }} />
                                        </Tooltip>
                                    )}
                                </TableCell>
                                <TableCell>
                                    {submission.fileHashSha256 ? (
                                        <Tooltip title={submission.fileHashSha256}>
                                            <Chip
                                                label={submission.fileHashSha256.substring(0, 12) + '...'}
                                                size="small"
                                                variant="outlined"
                                                onClick={() => handleCopyHash(submission.fileHashSha256!)}
                                                icon={<ContentCopy fontSize="small" />}
                                            />
                                        </Tooltip>
                                    ) : (
                                        <Typography color="text.disabled">لا يوجد</Typography>
                                    )}
                                </TableCell>
                                <TableCell>
                                    {format(new Date(submission.updatedAt), 'dd/MM/yyyy HH:mm')}
                                </TableCell>
                                <TableCell align="center">
                                    {submission.payrollRunId && (
                                        <Tooltip title="عرض التحذيرات والأخطاء">
                                            <IconButton size="small" color="warning" onClick={() => handleOpenValidation(submission)}>
                                                <BugReport />
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                    <Tooltip title="إرفاق WPS">
                                        <IconButton size="small" color="primary" onClick={() => handleOpenAttachDialog(submission)}>
                                            <AttachFile />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="تحديث الحالة">
                                        <IconButton size="small" color="secondary" onClick={() => handleOpenStatusDialog(submission)}>
                                            <CloudUpload />
                                        </IconButton>
                                    </Tooltip>
                                    {submission.status === 'SUBMITTED' && (
                                        <>
                                            <Tooltip title="قبول">
                                                <IconButton size="small" color="success" onClick={() => acceptMutation.mutate(submission.id)}>
                                                    <Check />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="رفض">
                                                <IconButton size="small" color="error" onClick={() => {
                                                    const note = prompt('سبب الرفض:');
                                                    if (note) rejectMutation.mutate({ id: submission.id, note });
                                                }}>
                                                    <Close />
                                                </IconButton>
                                            </Tooltip>
                                        </>
                                    )}
                                    <Tooltip title="سجل النشاط">
                                        <IconButton size="small" onClick={() => handleOpenLogs(submission)}>
                                            <History />
                                        </IconButton>
                                    </Tooltip>
                                </TableCell>
                            </TableRow>
                        ))}
                        {filteredSubmissions?.length === 0 && !isLoading && (
                            <TableRow>
                                <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                                    <CloudUpload sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
                                    <Typography variant="h6" color="text.secondary" gutterBottom>
                                        لا توجد تقديمات لهذه الفترة
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 400, mx: 'auto' }}>
                                        ابدأ بإنشاء دورة رواتب وتصدير WPS أولاً، ثم أنشئ تقديم مُدد لربطه بالملف.
                                    </Typography>
                                    <Box display="flex" gap={2} justifyContent="center">
                                        <Button
                                            variant="outlined"
                                            endIcon={<ArrowForward />}
                                            onClick={() => navigate('/payroll-dashboard')}
                                        >
                                            لوحة الرواتب
                                        </Button>
                                        <Button
                                            variant="outlined"
                                            endIcon={<ArrowForward />}
                                            onClick={() => navigate('/wps-tracking')}
                                        >
                                            متابعة WPS
                                        </Button>
                                        <Button
                                            variant="contained"
                                            startIcon={<Add />}
                                            onClick={() => setCreateDialogOpen(true)}
                                        >
                                            إنشاء تقديم
                                        </Button>
                                    </Box>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Update Status Dialog */}
            <Dialog open={statusDialogOpen} onClose={() => setStatusDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>تحديث حالة التقديم</DialogTitle>
                <DialogContent>
                    {selectedSubmission && (
                        <Box>
                            {/* Stepper */}
                            <Stepper activeStep={getStatusStep(selectedSubmission.status)} alternativeLabel sx={{ my: 3 }}>
                                <Step><StepLabel>قيد الانتظار</StepLabel></Step>
                                <Step><StepLabel>تم التجهيز</StepLabel></Step>
                                <Step><StepLabel>تم الإرسال</StepLabel></Step>
                                <Step>
                                    <StepLabel error={selectedSubmission.status === 'REJECTED' || selectedSubmission.status === 'RESUBMIT_REQUIRED'}>
                                        {selectedSubmission.status === 'REJECTED' ? 'مرفوض' :
                                            selectedSubmission.status === 'RESUBMIT_REQUIRED' ? 'إعادة إرسال' : 'مقبول'}
                                    </StepLabel>
                                </Step>
                            </Stepper>

                            <FormControl fullWidth sx={{ mt: 2 }}>
                                <InputLabel>الحالة الجديدة</InputLabel>
                                <Select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} label="الحالة الجديدة">
                                    {allowedTransitions[selectedSubmission.status]?.map(status => (
                                        <MenuItem key={status} value={status}>{getStatusLabel(status)}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <TextField
                                fullWidth
                                multiline
                                rows={3}
                                label="ملاحظات"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                sx={{ mt: 2 }}
                            />
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setStatusDialogOpen(false)}>إلغاء</Button>
                    <Button
                        variant="contained"
                        disabled={!newStatus || updateStatusMutation.isPending}
                        onClick={() => {
                            if (selectedSubmission && newStatus) {
                                updateStatusMutation.mutate({
                                    id: selectedSubmission.id,
                                    status: newStatus,
                                    note: reason,
                                });
                            }
                        }}
                    >
                        تحديث
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Attach WPS Dialog */}
            <Dialog open={attachDialogOpen} onClose={() => setAttachDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>إرفاق ملف WPS</DialogTitle>
                <DialogContent>
                    <Alert severity="info" sx={{ mb: 2 }}>
                        أدخل رابط ملف WPS الذي تم تصديره من صفحة تصدير WPS
                    </Alert>
                    <TextField
                        fullWidth
                        label="رابط الملف"
                        value={fileUrl}
                        onChange={(e) => setFileUrl(e.target.value)}
                        placeholder="https://..."
                        sx={{ mb: 2 }}
                    />
                    <TextField
                        fullWidth
                        label="SHA-256 Hash (اختياري)"
                        value={fileHash}
                        onChange={(e) => setFileHash(e.target.value)}
                        placeholder="لو متوفر من التصدير"
                        helperText="إذا تغير الـ Hash عن الإرسال السابق، سيتم طلب إعادة الإرسال"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAttachDialogOpen(false)}>إلغاء</Button>
                    <Button
                        variant="contained"
                        disabled={!fileUrl || attachWpsMutation.isPending}
                        onClick={() => {
                            if (selectedSubmission && fileUrl) {
                                attachWpsMutation.mutate({
                                    id: selectedSubmission.id,
                                    fileUrl,
                                    fileHashSha256: fileHash || undefined,
                                });
                            }
                        }}
                    >
                        إرفاق
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Create Submission Dialog */}
            <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    <Box display="flex" alignItems="center" gap={1}>
                        <Add color="primary" />
                        إنشاء تقديم مُدد جديد
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Alert severity="info" sx={{ mb: 3 }}>
                        اختر دورة الرواتب المغلقة (LOCKED) لإنشاء تقديم مُدد مرتبط بها.
                        <br />
                        تأكد من تصدير ملف WPS قبل البدء.
                    </Alert>
                    <FormControl fullWidth>
                        <InputLabel>دورة الرواتب</InputLabel>
                        <Select
                            value={selectedRunId}
                            onChange={(e) => setSelectedRunId(e.target.value)}
                            label="دورة الرواتب"
                        >
                            {payrollRuns?.length === 0 && (
                                <MenuItem disabled>لا توجد دورات رواتب معتمدة</MenuItem>
                            )}
                            {payrollRuns?.map((run) => (
                                <MenuItem key={run.id} value={run.id}>
                                    {run.period ?
                                        `${getMonthName(run.period.month)} ${run.period.year}` :
                                        'فترة غير محددة'
                                    }
                                    {' - '}
                                    {run.status === 'LOCKED' ? '🔒 مغلقة' :
                                        run.status === 'PAID' ? '✅ مدفوعة' :
                                            run.status === 'FINANCE_APPROVED' ? '✅ معتمدة' : run.status}
                                    {run._count?.payslips ? ` (👥 ${run._count.payslips})` : ''}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    {!payrollRuns?.length && (
                        <Alert severity="warning" sx={{ mt: 2 }}>
                            لا توجد دورات رواتب مغلقة. يجب إنشاء دورة رواتب وإغلاقها أولاً.
                            <Button
                                size="small"
                                sx={{ mt: 1 }}
                                onClick={() => { setCreateDialogOpen(false); navigate('/payroll-dashboard'); }}
                            >
                                الذهاب للوحة الرواتب
                            </Button>
                        </Alert>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCreateDialogOpen(false)}>إلغاء</Button>
                    <Button
                        variant="contained"
                        disabled={!selectedRunId || createMutation.isPending}
                        onClick={() => {
                            if (selectedRunId) {
                                createMutation.mutate({
                                    payrollRunId: selectedRunId,
                                });
                            }
                        }}
                    >
                        {createMutation.isPending ? 'جارٍ الإنشاء...' : 'إنشاء التقديم'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Logs Drawer */}
            <Drawer
                anchor="right"
                open={logsDrawerOpen}
                onClose={() => setLogsDrawerOpen(false)}
                PaperProps={{ sx: { width: 400 } }}
            >
                <Box p={3}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h6" fontWeight="bold">سجل النشاط</Typography>
                        <IconButton onClick={() => setLogsDrawerOpen(false)}><Close /></IconButton>
                    </Box>

                    {selectedSubmission && (
                        <Alert severity="info" sx={{ mb: 2 }}>
                            {getMonthName(selectedSubmission.month)} {selectedSubmission.year}
                        </Alert>
                    )}

                    <List>
                        {logs?.map((log) => (
                            <ListItem key={log.id} divider sx={{ flexDirection: 'column', alignItems: 'stretch' }}>
                                <Box display="flex" alignItems="center" gap={1}>
                                    <ListItemIcon sx={{ minWidth: 32 }}>
                                        <CheckCircle color="primary" fontSize="small" />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={log.action}
                                        secondary={format(new Date(log.createdAt), 'dd/MM/yyyy HH:mm')}
                                    />
                                </Box>
                                {log.meta && (
                                    <Box sx={{ ml: 4, mt: 1, p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
                                        <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                                            {JSON.stringify(log.meta, null, 2)}
                                        </Typography>
                                    </Box>
                                )}
                            </ListItem>
                        ))}
                        {(!logs || logs.length === 0) && (
                            <ListItem>
                                <ListItemText primary="لا توجد سجلات" />
                            </ListItem>
                        )}
                    </List>
                </Box>
            </Drawer>

            {/* Validation Warnings Dialog */}
            <Dialog
                open={validationDialogOpen}
                onClose={() => setValidationDialogOpen(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                        <Box display="flex" alignItems="center" gap={1}>
                            <BugReport color="warning" />
                            تحذيرات وأخطاء التحقق من صحة البيانات
                        </Box>
                        <IconButton onClick={() => setValidationDialogOpen(false)}>
                            <Close />
                        </IconButton>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    {selectedSubmission && (
                        <Alert severity="info" sx={{ mb: 3 }}>
                            الفترة: {getMonthName(selectedSubmission.month)} {selectedSubmission.year}
                        </Alert>
                    )}

                    {validationLoading && (
                        <Box display="flex" justifyContent="center" py={4}>
                            <CircularProgress />
                        </Box>
                    )}

                    {!validationLoading && validationResults && (
                        <Box>
                            {/* Summary */}
                            <Grid container spacing={2} mb={3}>
                                <Grid item xs={6} sm={3}>
                                    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'error.50' }}>
                                        <Typography variant="h4" fontWeight="bold" color="error.main">
                                            {validationResults.summary.errors}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">أخطاء</Typography>
                                    </Paper>
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.50' }}>
                                        <Typography variant="h4" fontWeight="bold" color="warning.main">
                                            {validationResults.summary.warnings}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">تحذيرات</Typography>
                                    </Paper>
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'info.50' }}>
                                        <Typography variant="h4" fontWeight="bold" color="info.main">
                                            {validationResults.summary.info}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">معلومات</Typography>
                                    </Paper>
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: validationResults.readyForSubmission ? 'success.50' : 'grey.100' }}>
                                        <Typography variant="h4" fontWeight="bold" color={validationResults.readyForSubmission ? 'success.main' : 'text.secondary'}>
                                            {validationResults.readyForSubmission ? <CheckCircle /> : <ErrorIcon />}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {validationResults.readyForSubmission ? 'جاهز للتقديم' : 'غير جاهز'}
                                        </Typography>
                                    </Paper>
                                </Grid>
                            </Grid>

                            {/* Status Alert */}
                            {!validationResults.readyForSubmission && validationResults.summary.errors > 0 && (
                                <Alert severity="error" sx={{ mb: 2 }}>
                                    يحتوي ملف WPS على أخطاء يجب إصلاحها قبل التقديم لمُدد
                                </Alert>
                            )}
                            {validationResults.readyForSubmission && validationResults.summary.warnings > 0 && (
                                <Alert severity="warning" sx={{ mb: 2 }}>
                                    يمكن التقديم ولكن يُنصح بمراجعة التحذيرات
                                </Alert>
                            )}
                            {validationResults.readyForSubmission && validationResults.summary.warnings === 0 && (
                                <Alert severity="success" sx={{ mb: 2 }}>
                                    البيانات جاهزة للتقديم لنظام مُدد - لا توجد أخطاء
                                </Alert>
                            )}

                            {/* Issues List */}
                            {validationResults.issues.length > 0 ? (
                                <Box>
                                    <Typography variant="subtitle1" fontWeight="bold" mb={2}>
                                        قائمة المشاكل ({validationResults.issues.length})
                                    </Typography>
                                    <List>
                                        {validationResults.issues.map((issue, index) => (
                                            <ListItem
                                                key={index}
                                                sx={{
                                                    flexDirection: 'column',
                                                    alignItems: 'stretch',
                                                    mb: 1,
                                                    bgcolor: 'grey.50',
                                                    borderRadius: 1,
                                                    border: 1,
                                                    borderColor: `${getSeverityColor(issue.severity)}.200`,
                                                }}
                                            >
                                                <Box display="flex" alignItems="flex-start" gap={1}>
                                                    <Box sx={{ color: `${getSeverityColor(issue.severity)}.main`, mt: 0.5 }}>
                                                        {getSeverityIcon(issue.severity)}
                                                    </Box>
                                                    <Box flex={1}>
                                                        <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                                                            <Chip
                                                                label={issue.severity}
                                                                size="small"
                                                                color={getSeverityColor(issue.severity)}
                                                            />
                                                            <Typography variant="caption" color="text.secondary">
                                                                {issue.code}
                                                            </Typography>
                                                        </Box>
                                                        <Typography variant="body2" fontWeight="bold" mb={0.5}>
                                                            {issue.messageAr}
                                                        </Typography>
                                                        {issue.employeeCode && (
                                                            <Typography variant="caption" color="text.secondary">
                                                                الموظف: {issue.employeeName || issue.employeeCode}
                                                            </Typography>
                                                        )}
                                                        {issue.field && (
                                                            <Typography variant="caption" color="text.secondary" display="block">
                                                                الحقل: {issue.field}
                                                            </Typography>
                                                        )}
                                                        {(issue.expected || issue.actual) && (
                                                            <Box mt={1}>
                                                                {issue.expected && (
                                                                    <Typography variant="caption" display="block">
                                                                        المتوقع: {issue.expected}
                                                                    </Typography>
                                                                )}
                                                                {issue.actual && (
                                                                    <Typography variant="caption" display="block">
                                                                        الفعلي: {issue.actual}
                                                                    </Typography>
                                                                )}
                                                            </Box>
                                                        )}
                                                        {issue.suggestion && (
                                                            <Alert severity="info" sx={{ mt: 1, py: 0.5 }}>
                                                                <Typography variant="caption">
                                                                    <strong>الحل المقترح:</strong> {issue.suggestion}
                                                                </Typography>
                                                            </Alert>
                                                        )}
                                                    </Box>
                                                </Box>
                                            </ListItem>
                                        ))}
                                    </List>
                                </Box>
                            ) : (
                                <Alert severity="success">
                                    لا توجد مشاكل - البيانات صحيحة ومطابقة لمتطلبات نظام مُدد
                                </Alert>
                            )}
                        </Box>
                    )}

                    {!validationLoading && !validationResults && !selectedSubmission?.payrollRunId && (
                        <Alert severity="warning">
                            لا يوجد ملف WPS مرتبط بهذا التقديم. يرجى إرفاق ملف WPS أولاً.
                        </Alert>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setValidationDialogOpen(false)}>إغلاق</Button>
                    {validationResults?.readyForSubmission && (
                        <Button
                            variant="contained"
                            color="success"
                            startIcon={<CheckCircle />}
                            onClick={() => {
                                setValidationDialogOpen(false);
                            }}
                        >
                            جاهز للتقديم
                        </Button>
                    )}
                </DialogActions>
            </Dialog>
        </Box>
    );
}
