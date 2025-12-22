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
    Stepper,
    Step,
    StepLabel,
    Alert,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
} from '@mui/material';
import {
    CloudUpload,
    CheckCircle,
    Error as ErrorIcon,
    Schedule,
    Visibility,
    Refresh,
    History,
    Description,
    Lock,
    ArrowForward,
} from '@mui/icons-material';
import { api } from '@/services/api.service';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface WpsSubmission {
    id: string;
    payrollRunId: string;
    month: number;
    year: number;
    status: 'PENDING' | 'EXPORTED' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED';
    fileHash?: string;
    fileName?: string;
    submittedAt?: string;
    acceptedAt?: string;
    rejectedAt?: string;
    rejectionReason?: string;
    createdAt: string;
    logs: WpsLog[];
}

interface WpsLog {
    id: string;
    action: string;
    status: string;
    meta?: any;
    createdAt: string;
    createdBy?: string;
}

const statusSteps = ['PENDING', 'EXPORTED', 'SUBMITTED', 'ACCEPTED'];

const getStatusStep = (status: string) => {
    const index = statusSteps.indexOf(status);
    return index >= 0 ? index : (status === 'REJECTED' ? 2 : 0);
};

const getStatusColor = (status: string) => {
    switch (status) {
        case 'ACCEPTED': return 'success';
        case 'SUBMITTED': return 'info';
        case 'EXPORTED': return 'primary';
        case 'PENDING': return 'warning';
        case 'REJECTED': return 'error';
        default: return 'default';
    }
};

const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
        'PENDING': 'قيد الانتظار',
        'EXPORTED': 'تم التصدير',
        'SUBMITTED': 'تم الإرسال',
        'ACCEPTED': 'مقبول',
        'REJECTED': 'مرفوض',
    };
    return labels[status] || status;
};

const getMonthName = (month: number) => {
    const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    return months[month - 1] || '';
};

export default function WpsTrackingPage() {
    const navigate = useNavigate();
    const [selectedSubmission, setSelectedSubmission] = useState<WpsSubmission | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);

    // Fetch WPS submissions
    const { data: submissions, isLoading, refetch } = useQuery<WpsSubmission[]>({
        queryKey: ['wps-submissions'],
        queryFn: async () => {
            const response = await api.get('/wps-tracking');
            return (response as any)?.data || response || [];
        },
    });

    // Summary stats
    const stats = {
        total: submissions?.length || 0,
        pending: submissions?.filter(s => s.status === 'PENDING').length || 0,
        exported: submissions?.filter(s => s.status === 'EXPORTED').length || 0,
        submitted: submissions?.filter(s => s.status === 'SUBMITTED').length || 0,
        accepted: submissions?.filter(s => s.status === 'ACCEPTED').length || 0,
        rejected: submissions?.filter(s => s.status === 'REJECTED').length || 0,
    };

    const handleViewDetails = (submission: WpsSubmission) => {
        setSelectedSubmission(submission);
        setDialogOpen(true);
    };

    return (
        <Box>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                <Box>
                    <Typography variant="h4" fontWeight="bold" gutterBottom>
                        متابعة WPS
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        تتبع حالة إرسالات نظام حماية الأجور
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

            {/* Stats Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={6} sm={4} md={2}>
                    <Card sx={{ textAlign: 'center', borderRadius: 2 }}>
                        <CardContent>
                            <Typography variant="h4" fontWeight="bold" color="text.primary">{stats.total}</Typography>
                            <Typography variant="body2" color="text.secondary">الإجمالي</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} sm={4} md={2}>
                    <Card sx={{ textAlign: 'center', borderRadius: 2, bgcolor: 'warning.50' }}>
                        <CardContent>
                            <Typography variant="h4" fontWeight="bold" color="warning.main">{stats.pending}</Typography>
                            <Typography variant="body2" color="text.secondary">قيد الانتظار</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} sm={4} md={2}>
                    <Card sx={{ textAlign: 'center', borderRadius: 2, bgcolor: 'primary.50' }}>
                        <CardContent>
                            <Typography variant="h4" fontWeight="bold" color="primary.main">{stats.exported}</Typography>
                            <Typography variant="body2" color="text.secondary">تم التصدير</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} sm={4} md={2}>
                    <Card sx={{ textAlign: 'center', borderRadius: 2, bgcolor: 'info.50' }}>
                        <CardContent>
                            <Typography variant="h4" fontWeight="bold" color="info.main">{stats.submitted}</Typography>
                            <Typography variant="body2" color="text.secondary">تم الإرسال</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} sm={4} md={2}>
                    <Card sx={{ textAlign: 'center', borderRadius: 2, bgcolor: 'success.50' }}>
                        <CardContent>
                            <Typography variant="h4" fontWeight="bold" color="success.main">{stats.accepted}</Typography>
                            <Typography variant="body2" color="text.secondary">مقبول</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} sm={4} md={2}>
                    <Card sx={{ textAlign: 'center', borderRadius: 2, bgcolor: 'error.50' }}>
                        <CardContent>
                            <Typography variant="h4" fontWeight="bold" color="error.main">{stats.rejected}</Typography>
                            <Typography variant="body2" color="text.secondary">مرفوض</Typography>
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
                                <TableCell>الحالة</TableCell>
                                <TableCell>تاريخ التصدير</TableCell>
                                <TableCell>تاريخ الإرسال</TableCell>
                                <TableCell>ملف Hash</TableCell>
                                <TableCell align="center">الإجراءات</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {submissions.map((submission) => (
                                <TableRow key={submission.id} hover>
                                    <TableCell>
                                        <Typography fontWeight="bold">
                                            {getMonthName(submission.month)} {submission.year}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={getStatusLabel(submission.status)}
                                            color={getStatusColor(submission.status) as any}
                                            size="small"
                                            icon={
                                                submission.status === 'ACCEPTED' ? <CheckCircle /> :
                                                    submission.status === 'REJECTED' ? <ErrorIcon /> :
                                                        submission.status === 'SUBMITTED' ? <CloudUpload /> :
                                                            <Schedule />
                                            }
                                        />
                                    </TableCell>
                                    <TableCell>
                                        {submission.createdAt ?
                                            format(new Date(submission.createdAt), 'dd/MM/yyyy HH:mm', { locale: ar }) :
                                            '-'
                                        }
                                    </TableCell>
                                    <TableCell>
                                        {submission.submittedAt ?
                                            format(new Date(submission.submittedAt), 'dd/MM/yyyy HH:mm', { locale: ar }) :
                                            '-'
                                        }
                                    </TableCell>
                                    <TableCell>
                                        {submission.fileHash ? (
                                            <Chip
                                                label={submission.fileHash.substring(0, 12) + '...'}
                                                size="small"
                                                variant="outlined"
                                                icon={<Lock fontSize="small" />}
                                            />
                                        ) : '-'}
                                    </TableCell>
                                    <TableCell align="center">
                                        <IconButton
                                            size="small"
                                            color="primary"
                                            onClick={() => handleViewDetails(submission)}
                                        >
                                            <Visibility />
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            color="secondary"
                                            onClick={() => navigate('/audit/submissions')}
                                        >
                                            <History />
                                        </IconButton>
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
                        لا توجد إرسالات WPS
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
                maxWidth="md"
                fullWidth
            >
                {selectedSubmission && (
                    <>
                        <DialogTitle>
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Typography variant="h6">
                                    تفاصيل إرسال WPS - {getMonthName(selectedSubmission.month)} {selectedSubmission.year}
                                </Typography>
                                <Chip
                                    label={getStatusLabel(selectedSubmission.status)}
                                    color={getStatusColor(selectedSubmission.status) as any}
                                />
                            </Box>
                        </DialogTitle>
                        <DialogContent dividers>
                            {/* Status Stepper */}
                            <Stepper
                                activeStep={getStatusStep(selectedSubmission.status)}
                                alternativeLabel
                                sx={{ mb: 4 }}
                            >
                                <Step>
                                    <StepLabel>قيد الانتظار</StepLabel>
                                </Step>
                                <Step>
                                    <StepLabel>تم التصدير</StepLabel>
                                </Step>
                                <Step>
                                    <StepLabel>تم الإرسال</StepLabel>
                                </Step>
                                <Step>
                                    <StepLabel
                                        error={selectedSubmission.status === 'REJECTED'}
                                    >
                                        {selectedSubmission.status === 'REJECTED' ? 'مرفوض' : 'مقبول'}
                                    </StepLabel>
                                </Step>
                            </Stepper>

                            {/* Rejection Alert */}
                            {selectedSubmission.status === 'REJECTED' && selectedSubmission.rejectionReason && (
                                <Alert severity="error" sx={{ mb: 3 }}>
                                    <Typography fontWeight="bold">سبب الرفض:</Typography>
                                    {selectedSubmission.rejectionReason}
                                </Alert>
                            )}

                            {/* Details */}
                            <Grid container spacing={3}>
                                <Grid item xs={12} md={6}>
                                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                            معلومات الملف
                                        </Typography>
                                        <List disablePadding dense>
                                            <ListItem>
                                                <ListItemIcon><Description /></ListItemIcon>
                                                <ListItemText
                                                    primary="اسم الملف"
                                                    secondary={selectedSubmission.fileName || 'غير محدد'}
                                                />
                                            </ListItem>
                                            <ListItem>
                                                <ListItemIcon><Lock /></ListItemIcon>
                                                <ListItemText
                                                    primary="File Hash"
                                                    secondary={selectedSubmission.fileHash || 'غير محدد'}
                                                />
                                            </ListItem>
                                        </List>
                                    </Paper>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                            التواريخ
                                        </Typography>
                                        <List disablePadding dense>
                                            <ListItem>
                                                <ListItemText
                                                    primary="تاريخ الإنشاء"
                                                    secondary={format(new Date(selectedSubmission.createdAt), 'dd/MM/yyyy HH:mm')}
                                                />
                                            </ListItem>
                                            {selectedSubmission.submittedAt && (
                                                <ListItem>
                                                    <ListItemText
                                                        primary="تاريخ الإرسال"
                                                        secondary={format(new Date(selectedSubmission.submittedAt), 'dd/MM/yyyy HH:mm')}
                                                    />
                                                </ListItem>
                                            )}
                                            {selectedSubmission.acceptedAt && (
                                                <ListItem>
                                                    <ListItemText
                                                        primary="تاريخ القبول"
                                                        secondary={format(new Date(selectedSubmission.acceptedAt), 'dd/MM/yyyy HH:mm')}
                                                    />
                                                </ListItem>
                                            )}
                                        </List>
                                    </Paper>
                                </Grid>
                            </Grid>

                            {/* Activity Log */}
                            {selectedSubmission.logs && selectedSubmission.logs.length > 0 && (
                                <Box mt={3}>
                                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                                        سجل النشاط
                                    </Typography>
                                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                                        <List disablePadding>
                                            {selectedSubmission.logs.map((log, index) => (
                                                <ListItem key={log.id || index} divider={index < selectedSubmission.logs.length - 1}>
                                                    <ListItemIcon>
                                                        <CheckCircle color="primary" fontSize="small" />
                                                    </ListItemIcon>
                                                    <ListItemText
                                                        primary={log.action}
                                                        secondary={format(new Date(log.createdAt), 'dd/MM/yyyy HH:mm')}
                                                    />
                                                </ListItem>
                                            ))}
                                        </List>
                                    </Paper>
                                </Box>
                            )}
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setDialogOpen(false)}>إغلاق</Button>
                            <Button
                                variant="contained"
                                startIcon={<History />}
                                onClick={() => {
                                    setDialogOpen(false);
                                    navigate('/audit/submissions');
                                }}
                            >
                                سجل التدقيق الكامل
                            </Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>
        </Box>
    );
}
