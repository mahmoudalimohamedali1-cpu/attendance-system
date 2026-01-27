import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Grid,
    Card,
    CardContent,
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
    Tooltip,
    Alert,
} from '@mui/material';
import {
    CloudUpload,
    CheckCircle,
    Error as ErrorIcon,
    Schedule,
    Visibility,
    Refresh,
    CloudDownload,
    Lock,
    ArrowForward,
    Send as SendIcon,
    Done as DoneIcon,
} from '@mui/icons-material';
import { api, API_URL } from '@/services/api.service';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface WpsSubmission {
    id: string;
    payrollRunId: string;
    filename: string;
    fileFormat: string;
    totalAmount: string | number;
    employeeCount: number;
    status: 'GENERATED' | 'DOWNLOADED' | 'SUBMITTED' | 'PROCESSING' | 'PROCESSED' | 'FAILED';
    bankName?: string;
    bankRef?: string;
    fileHashSha256?: string;
    generatedAt?: string;
    downloadedAt?: string;
    submittedAt?: string;
    processedAt?: string;
    notes?: string;
    createdAt: string;
    payrollRun?: {
        period?: {
            month: number;
            year: number;
        };
    };
}

const getStatusColor = (status: string) => {
    switch (status) {
        case 'PROCESSED': return 'success';
        case 'SUBMITTED': return 'info';
        case 'PROCESSING': return 'warning';
        case 'DOWNLOADED': return 'primary';
        case 'GENERATED': return 'default';
        case 'FAILED': return 'error';
        default: return 'default';
    }
};

const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
        'GENERATED': 'تم التوليد',
        'DOWNLOADED': 'تم التحميل',
        'SUBMITTED': 'تم الإرسال للبنك',
        'PROCESSING': 'قيد المعالجة',
        'PROCESSED': 'تمت المعالجة',
        'FAILED': 'فشل',
    };
    return labels[status] || status;
};

const getStatusIcon = (status: string) => {
    switch (status) {
        case 'PROCESSED': return <CheckCircle />;
        case 'SUBMITTED': return <SendIcon />;
        case 'PROCESSING': return <Schedule />;
        case 'DOWNLOADED': return <CloudDownload />;
        case 'GENERATED': return <DoneIcon />;
        case 'FAILED': return <ErrorIcon />;
        default: return <Schedule />;
    }
};

const getMonthName = (month: number) => {
    const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    return months[month - 1] || '';
};

const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat('ar-SA', {
        style: 'currency',
        currency: 'SAR',
    }).format(Number(amount));
};

export default function WpsTrackingPage() {
    const navigate = useNavigate();
    const [selectedSubmission, setSelectedSubmission] = useState<WpsSubmission | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);

    // Fetch WPS submissions
    const { data: submissions, isLoading, refetch, error } = useQuery<WpsSubmission[]>({
        queryKey: ['wps-tracking'],
        queryFn: async () => {
            const response = await api.get('/wps-tracking');
            return (response as any)?.data || response || [];
        },
    });

    // Summary stats
    const stats = {
        total: submissions?.length || 0,
        generated: submissions?.filter(s => s.status === 'GENERATED').length || 0,
        downloaded: submissions?.filter(s => s.status === 'DOWNLOADED').length || 0,
        submitted: submissions?.filter(s => s.status === 'SUBMITTED').length || 0,
        processing: submissions?.filter(s => s.status === 'PROCESSING').length || 0,
        processed: submissions?.filter(s => s.status === 'PROCESSED').length || 0,
        failed: submissions?.filter(s => s.status === 'FAILED').length || 0,
    };

    const handleViewDetails = (submission: WpsSubmission) => {
        setSelectedSubmission(submission);
        setDialogOpen(true);
    };

    const handleDownload = async (submission: WpsSubmission) => {
        const token = localStorage.getItem('access_token');
        const endpoint = submission.fileFormat === 'SARIE' ? 'sarie' : 'csv';
        const url = `${API_URL}/wps-export/${submission.payrollRunId}/${endpoint}`;

        try {
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (!response.ok) throw new Error('Download failed');
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = submission.filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(downloadUrl);
            document.body.removeChild(a);
        } catch (err) {
            console.error('Download error:', err);
        }
    };

    const handleCopyHash = (hash: string) => {
        navigator.clipboard.writeText(hash);
    };

    return (
        <Box p={3}>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                <Box>
                    <Typography variant="h4" fontWeight="bold" gutterBottom>
                        متابعة ملفات WPS
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        تتبع حالة ملفات نظام حماية الأجور والتحويلات البنكية
                    </Typography>
                </Box>
                <Box display="flex" gap={2}>
                    <Button
                        variant="outlined"
                        startIcon={<Refresh />}
                        onClick={() => refetch()}
                    >
                        تحديث
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<CloudUpload />}
                        onClick={() => navigate('/wps-export')}
                    >
                        تصدير جديد
                    </Button>
                </Box>
            </Box>

            {isLoading && <LinearProgress sx={{ mb: 3 }} />}

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    حدث خطأ في جلب البيانات. تأكد من الصلاحيات.
                </Alert>
            )}

            {/* Stats Cards */}
            <Grid container spacing={2} sx={{ mb: 4 }}>
                <Grid item xs={6} sm={4} md={2}>
                    <Card sx={{ textAlign: 'center', borderRadius: 2 }}>
                        <CardContent sx={{ py: 2 }}>
                            <Typography variant="h4" fontWeight="bold">{stats.total}</Typography>
                            <Typography variant="body2" color="text.secondary">الإجمالي</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} sm={4} md={2}>
                    <Card sx={{ textAlign: 'center', borderRadius: 2, bgcolor: 'grey.50' }}>
                        <CardContent sx={{ py: 2 }}>
                            <Typography variant="h4" fontWeight="bold" color="text.secondary">{stats.generated}</Typography>
                            <Typography variant="body2" color="text.secondary">تم التوليد</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} sm={4} md={2}>
                    <Card sx={{ textAlign: 'center', borderRadius: 2, bgcolor: 'primary.50' }}>
                        <CardContent sx={{ py: 2 }}>
                            <Typography variant="h4" fontWeight="bold" color="primary.main">{stats.downloaded}</Typography>
                            <Typography variant="body2" color="text.secondary">تم التحميل</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} sm={4} md={2}>
                    <Card sx={{ textAlign: 'center', borderRadius: 2, bgcolor: 'info.50' }}>
                        <CardContent sx={{ py: 2 }}>
                            <Typography variant="h4" fontWeight="bold" color="info.main">{stats.submitted}</Typography>
                            <Typography variant="body2" color="text.secondary">تم الإرسال</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} sm={4} md={2}>
                    <Card sx={{ textAlign: 'center', borderRadius: 2, bgcolor: 'success.50' }}>
                        <CardContent sx={{ py: 2 }}>
                            <Typography variant="h4" fontWeight="bold" color="success.main">{stats.processed}</Typography>
                            <Typography variant="body2" color="text.secondary">تمت المعالجة</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} sm={4} md={2}>
                    <Card sx={{ textAlign: 'center', borderRadius: 2, bgcolor: 'error.50' }}>
                        <CardContent sx={{ py: 2 }}>
                            <Typography variant="h4" fontWeight="bold" color="error.main">{stats.failed}</Typography>
                            <Typography variant="body2" color="text.secondary">فشل</Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Submissions Table */}
            {submissions && submissions.length > 0 ? (
                <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
                    <Table>
                        <TableHead sx={{ bgcolor: 'grey.100' }}>
                            <TableRow>
                                <TableCell>الفترة</TableCell>
                                <TableCell>الملف</TableCell>
                                <TableCell>الصيغة</TableCell>
                                <TableCell>الحالة</TableCell>
                                <TableCell>تاريخ التوليد</TableCell>
                                <TableCell>Hash</TableCell>
                                <TableCell align="center">الإجراءات</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {submissions.map((submission) => (
                                <TableRow key={submission.id} hover>
                                    <TableCell>
                                        <Typography fontWeight="bold">
                                            {submission.payrollRun?.period ?
                                                `${getMonthName(submission.payrollRun.period.month)} ${submission.payrollRun.period.year}` :
                                                '-'
                                            }
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Tooltip title={submission.filename}>
                                            <Typography noWrap sx={{ maxWidth: 200 }}>
                                                {submission.filename}
                                            </Typography>
                                        </Tooltip>
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={submission.fileFormat}
                                            size="small"
                                            variant="outlined"
                                            color={submission.fileFormat === 'SARIE' ? 'secondary' : 'primary'}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={getStatusLabel(submission.status)}
                                            color={getStatusColor(submission.status) as any}
                                            size="small"
                                            icon={getStatusIcon(submission.status)}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        {submission.createdAt ?
                                            format(new Date(submission.createdAt), 'dd/MM/yyyy HH:mm', { locale: ar }) :
                                            '-'
                                        }
                                    </TableCell>
                                    <TableCell>
                                        {submission.fileHashSha256 ? (
                                            <Tooltip title="اضغط لنسخ التوقيع الرقمي">
                                                <Chip
                                                    label={submission.fileHashSha256.substring(0, 10) + '...'}
                                                    size="small"
                                                    variant="outlined"
                                                    icon={<Lock fontSize="small" />}
                                                    onClick={() => handleCopyHash(submission.fileHashSha256!)}
                                                    sx={{ cursor: 'pointer' }}
                                                />
                                            </Tooltip>
                                        ) : '-'}
                                    </TableCell>
                                    <TableCell align="center">
                                        <Box display="flex" gap={0.5} justifyContent="center">
                                            <Tooltip title="تنزيل الملف">
                                                <IconButton
                                                    size="small"
                                                    color="success"
                                                    onClick={() => handleDownload(submission)}
                                                >
                                                    <CloudDownload />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="عرض التفاصيل">
                                                <IconButton
                                                    size="small"
                                                    color="primary"
                                                    onClick={() => handleViewDetails(submission)}
                                                >
                                                    <Visibility />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                        {submission.employeeCount === 0 && (
                                            <Typography variant="caption" color="error" display="block">
                                                ملف فارغ!
                                            </Typography>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            ) : !isLoading ? (
                <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3 }}>
                    <CloudUpload sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                        لا توجد ملفات WPS حتى الآن
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mb={3}>
                        قم بتصدير ملف WPS من صفحة التصدير لبدء التتبع
                    </Typography>
                    <Button
                        variant="contained"
                        startIcon={<ArrowForward />}
                        onClick={() => navigate('/wps-export')}
                    >
                        تصدير WPS الآن
                    </Button>
                </Paper>
            ) : null}

            {/* Detail Dialog */}
            <Dialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                {selectedSubmission && (
                    <>
                        <DialogTitle>
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Typography variant="h6">
                                    تفاصيل ملف WPS
                                </Typography>
                                <Chip
                                    label={getStatusLabel(selectedSubmission.status)}
                                    color={getStatusColor(selectedSubmission.status) as any}
                                />
                            </Box>
                        </DialogTitle>
                        <DialogContent dividers>
                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    <Typography variant="caption" color="text.secondary">الفترة</Typography>
                                    <Typography fontWeight="bold">
                                        {selectedSubmission.payrollRun?.period ?
                                            `${getMonthName(selectedSubmission.payrollRun.period.month)} ${selectedSubmission.payrollRun.period.year}` :
                                            '-'
                                        }
                                    </Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="caption" color="text.secondary">الصيغة</Typography>
                                    <Typography fontWeight="bold">{selectedSubmission.fileFormat}</Typography>
                                </Grid>
                                <Grid item xs={12}>
                                    <Typography variant="caption" color="text.secondary">اسم الملف</Typography>
                                    <Typography fontWeight="bold" sx={{ wordBreak: 'break-all' }}>
                                        {selectedSubmission.filename}
                                    </Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="caption" color="text.secondary">عدد الموظفين</Typography>
                                    <Typography fontWeight="bold">{selectedSubmission.employeeCount}</Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="caption" color="text.secondary">المبلغ الإجمالي</Typography>
                                    <Typography fontWeight="bold" color="success.main">
                                        {formatCurrency(selectedSubmission.totalAmount)}
                                    </Typography>
                                </Grid>
                                <Grid item xs={12}>
                                    <Typography variant="caption" color="text.secondary">تاريخ التوليد</Typography>
                                    <Typography>
                                        {selectedSubmission.createdAt ?
                                            format(new Date(selectedSubmission.createdAt), 'dd MMMM yyyy - HH:mm', { locale: ar }) :
                                            '-'
                                        }
                                    </Typography>
                                </Grid>
                                {selectedSubmission.fileHashSha256 && (
                                    <Grid item xs={12}>
                                        <Typography variant="caption" color="text.secondary">SHA-256 Hash</Typography>
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                fontFamily: 'monospace',
                                                bgcolor: 'grey.100',
                                                p: 1,
                                                borderRadius: 1,
                                                wordBreak: 'break-all',
                                                fontSize: '0.75rem'
                                            }}
                                        >
                                            {selectedSubmission.fileHashSha256}
                                        </Typography>
                                    </Grid>
                                )}
                                {selectedSubmission.bankName && (
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="text.secondary">اسم البنك</Typography>
                                        <Typography>{selectedSubmission.bankName}</Typography>
                                    </Grid>
                                )}
                                {selectedSubmission.bankRef && (
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="text.secondary">مرجع البنك</Typography>
                                        <Typography>{selectedSubmission.bankRef}</Typography>
                                    </Grid>
                                )}
                                {selectedSubmission.notes && (
                                    <Grid item xs={12}>
                                        <Typography variant="caption" color="text.secondary">ملاحظات</Typography>
                                        <Typography>{selectedSubmission.notes}</Typography>
                                    </Grid>
                                )}
                            </Grid>
                        </DialogContent>
                        <DialogActions>
                            <Button
                                variant="contained"
                                color="success"
                                startIcon={<CloudDownload />}
                                onClick={() => {
                                    handleDownload(selectedSubmission);
                                    setDialogOpen(false);
                                }}
                            >
                                تنزيل الملف
                            </Button>
                            <Button onClick={() => setDialogOpen(false)}>إغلاق</Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>
        </Box>
    );
}
