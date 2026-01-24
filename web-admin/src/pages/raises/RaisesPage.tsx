import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    TextField,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    Chip,
    Avatar,
    CircularProgress,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Grid,
    IconButton,
    Tooltip,
    Tabs,
    Tab,
    Divider,
    Paper,
    Snackbar,
    Badge,
} from '@mui/material';
import {
    CheckCircle,
    Cancel,
    Visibility,
    HourglassEmpty,
    ThumbUp,
    ThumbDown,
    AttachFile,
    Download,
    PictureAsPdf,
    Image as ImageIcon,
    Business,
    MonetizationOn,
    CalendarMonth,
    Schedule,
    Inbox,
    SupervisorAccount,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { api } from '@/services/api.service';

interface Attachment {
    filename: string;
    originalName: string;
    path?: string;
    url: string;
    mimetype?: string;
    mimeType?: string;
    size?: number;
}

interface RaiseRequest {
    id: string;
    type: string;
    amount: number;
    effectiveMonth: string;
    notes: string | null;
    status: string;
    currentStep?: string;
    createdAt: string;
    attachments?: Attachment[];
    user: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        employeeCode?: string;
        department?: { name: string };
        branch?: { name: string };
        salary?: number;
        hireDate?: string;
    };
    managerApprover?: {
        firstName: string;
        lastName: string;
    };
    hrApprover?: {
        firstName: string;
        lastName: string;
    };
    managerNotes?: string;
    hrDecisionNotes?: string;
}

const RAISE_TYPES: Record<string, string> = {
    SALARY_INCREASE: 'زيادة راتب',
    ANNUAL_LEAVE_BONUS: 'بدل إجازة سنوية',
    BUSINESS_TRIP: 'رحلة عمل',
    BONUS: 'مكافأة',
    ALLOWANCE: 'بدل',
    OTHER: 'أخرى',
};

const getStatusColor = (status: string): 'default' | 'warning' | 'success' | 'error' | 'info' | 'primary' => {
    switch (status) {
        case 'PENDING': return 'warning';
        case 'MGR_APPROVED': return 'info';
        case 'APPROVED': return 'success';
        case 'REJECTED':
        case 'MGR_REJECTED': return 'error';
        case 'DELAYED': return 'primary';
        case 'CANCELLED': return 'default';
        default: return 'default';
    }
};

const getStatusLabel = (status: string): string => {
    switch (status) {
        case 'PENDING': return 'قيد المراجعة';
        case 'MGR_APPROVED': return 'موافقة المدير';
        case 'APPROVED': return 'موافق عليه';
        case 'REJECTED': return 'مرفوض';
        case 'MGR_REJECTED': return 'رفض المدير';
        case 'DELAYED': return 'مؤجل';
        case 'CANCELLED': return 'ملغي';
        default: return status;
    }
};

export default function RaisesPage() {
    const queryClient = useQueryClient();
    const [tabValue, setTabValue] = useState(0);
    const [page, setPage] = useState(0);
    const [rowsPerPage] = useState(10);
    const [selectedRequest, setSelectedRequest] = useState<RaiseRequest | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [decisionNotes, setDecisionNotes] = useState('');
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

    // Tab mapping: 0=Manager Inbox, 1=HR Inbox, 2=PENDING, 3=MGR_APPROVED, 4=APPROVED, 5=REJECTED
    const isManagerInbox = tabValue === 0;
    const isHRInbox = tabValue === 1;
    const statusFilter = tabValue === 2 ? 'PENDING' : tabValue === 3 ? 'MGR_APPROVED' : tabValue === 4 ? 'APPROVED' : 'REJECTED';

    // Manager Inbox Query
    const { data: managerInbox, isLoading: managerLoading } = useQuery<RaiseRequest[]>({
        queryKey: ['raises-manager-inbox'],
        queryFn: () => api.get('/raises/inbox/manager'),
        enabled: isManagerInbox,
    });

    // HR Inbox Query
    const { data: hrInbox, isLoading: hrLoading } = useQuery<RaiseRequest[]>({
        queryKey: ['raises-hr-inbox'],
        queryFn: () => api.get('/raises/inbox/hr'),
        enabled: isHRInbox,
    });

    // All Requests Query
    const { data: allRequests, isLoading: allLoading } = useQuery<RaiseRequest[]>({
        queryKey: ['raises', statusFilter],
        queryFn: () => api.get(`/raises?status=${statusFilter}`),
        enabled: !isManagerInbox && !isHRInbox,
    });

    // Manager Decision Mutation
    const managerDecisionMutation = useMutation({
        mutationFn: ({ id, decision, notes }: { id: string; decision: 'APPROVED' | 'REJECTED' | 'DELAYED'; notes?: string }) =>
            api.post(`/raises/${id}/manager-decision`, { decision, notes }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['raises'] });
            queryClient.invalidateQueries({ queryKey: ['raises-manager-inbox'] });
            setSnackbar({ open: true, message: 'تم حفظ القرار بنجاح', severity: 'success' });
            setDialogOpen(false);
            setDecisionNotes('');
        },
        onError: () => {
            setSnackbar({ open: true, message: 'حدث خطأ أثناء حفظ القرار', severity: 'error' });
        },
    });

    // HR Decision Mutation
    const hrDecisionMutation = useMutation({
        mutationFn: ({ id, decision, notes }: { id: string; decision: 'APPROVED' | 'REJECTED' | 'DELAYED'; notes?: string }) =>
            api.post(`/raises/${id}/hr-decision`, { decision, notes }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['raises'] });
            queryClient.invalidateQueries({ queryKey: ['raises-hr-inbox'] });
            setSnackbar({ open: true, message: 'تم حفظ القرار بنجاح', severity: 'success' });
            setDialogOpen(false);
            setDecisionNotes('');
        },
        onError: () => {
            setSnackbar({ open: true, message: 'حدث خطأ أثناء حفظ القرار', severity: 'error' });
        },
    });

    const requests = isManagerInbox ? managerInbox : isHRInbox ? hrInbox : allRequests;
    const isLoading = isManagerInbox ? managerLoading : isHRInbox ? hrLoading : allLoading;

    const handleOpenDialog = (request: RaiseRequest) => {
        setSelectedRequest(request);
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setSelectedRequest(null);
        setDecisionNotes('');
    };

    const handleManagerDecision = (decision: 'APPROVED' | 'REJECTED' | 'DELAYED') => {
        if (selectedRequest) {
            managerDecisionMutation.mutate({ id: selectedRequest.id, decision, notes: decisionNotes });
        }
    };

    const handleHRDecision = (decision: 'APPROVED' | 'REJECTED' | 'DELAYED') => {
        if (selectedRequest) {
            hrDecisionMutation.mutate({ id: selectedRequest.id, decision, notes: decisionNotes });
        }
    };

    const renderAttachments = (attachments?: Attachment[]) => {
        if (!attachments || attachments.length === 0) return null;

        return (
            <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                    المرفقات ({attachments.length})
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {attachments.map((att, index) => {
                        const mime = att.mimetype || att.mimeType || '';
                        const isImage = mime.startsWith('image/');
                        const isPdf = mime === 'application/pdf';

                        return (
                            <Chip
                                key={index}
                                icon={isPdf ? <PictureAsPdf /> : isImage ? <ImageIcon /> : <AttachFile />}
                                label={att.originalName || att.filename}
                                variant="outlined"
                                onClick={() => {
                                    const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace('/api/v1', '') || '';
                                    const fileUrl = att.url || att.path || '';
                                    // Handle full URLs, /uploads paths, and bare filenames
                                    const finalUrl = fileUrl.startsWith('http')
                                        ? fileUrl
                                        : fileUrl.startsWith('/uploads')
                                            ? `${baseUrl}${fileUrl}`
                                            : `${baseUrl}/uploads/raises/${fileUrl}`;
                                    window.open(finalUrl, '_blank');
                                }}
                                deleteIcon={<Download />}
                                onDelete={() => {
                                    const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace('/api/v1', '') || '';
                                    const fileUrl = att.url || att.path || '';
                                    const finalUrl = fileUrl.startsWith('http')
                                        ? fileUrl
                                        : fileUrl.startsWith('/uploads')
                                            ? `${baseUrl}${fileUrl}`
                                            : `${baseUrl}/uploads/raises/${fileUrl}`;
                                    const link = document.createElement('a');
                                    link.href = finalUrl;
                                    link.download = att.originalName || att.filename;
                                    link.click();
                                }}
                            />
                        );
                    })}
                </Box>
            </Box>
        );
    };

    return (
        <Box>
            <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <MonetizationOn color="primary" />
                طلبات الزيادة
            </Typography>

            <Card sx={{ mb: 3 }}>
                <Tabs
                    value={tabValue}
                    onChange={(_, newValue) => { setTabValue(newValue); setPage(0); }}
                    variant="scrollable"
                    scrollButtons="auto"
                >
                    <Tab
                        icon={
                            <Badge badgeContent={managerInbox?.length || 0} color="warning">
                                <Inbox />
                            </Badge>
                        }
                        label="صندوق المدير"
                    />
                    <Tab
                        icon={
                            <Badge badgeContent={hrInbox?.length || 0} color="info">
                                <SupervisorAccount />
                            </Badge>
                        }
                        label="صندوق HR"
                    />
                    <Tab icon={<HourglassEmpty />} label="قيد المراجعة" />
                    <Tab icon={<Schedule />} label="انتظار HR" />
                    <Tab icon={<CheckCircle />} label="موافق عليها" />
                    <Tab icon={<Cancel />} label="مرفوضة" />
                </Tabs>
            </Card>

            <Card>
                <CardContent>
                    {isLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                            <CircularProgress />
                        </Box>
                    ) : !requests || requests.length === 0 ? (
                        <Alert severity="info">لا توجد طلبات</Alert>
                    ) : (
                        <>
                            <TableContainer>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>الموظف</TableCell>
                                            <TableCell>نوع الطلب</TableCell>
                                            <TableCell>المبلغ</TableCell>
                                            <TableCell>الشهر</TableCell>
                                            <TableCell>الحالة</TableCell>
                                            <TableCell>تاريخ الطلب</TableCell>
                                            <TableCell>الإجراءات</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {requests.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((request) => (
                                            <TableRow key={request.id}>
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                                                            {request.user.firstName?.[0]}
                                                        </Avatar>
                                                        <Box>
                                                            <Typography variant="body2" fontWeight="bold">
                                                                {request.user.firstName} {request.user.lastName}
                                                            </Typography>
                                                            <Typography variant="caption" color="text.secondary">
                                                                {request.user.employeeCode}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        size="small"
                                                        label={RAISE_TYPES[request.type] || request.type}
                                                        color="primary"
                                                        variant="outlined"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Typography fontWeight="bold" color="success.main">
                                                        {Number(request.amount).toLocaleString()} ر.س
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    {format(new Date(request.effectiveMonth), 'MMMM yyyy', { locale: ar })}
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        size="small"
                                                        label={getStatusLabel(request.status)}
                                                        color={getStatusColor(request.status)}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    {format(new Date(request.createdAt), 'dd/MM/yyyy', { locale: ar })}
                                                </TableCell>
                                                <TableCell>
                                                    <Tooltip title="عرض التفاصيل">
                                                        <IconButton
                                                            size="small"
                                                            color="primary"
                                                            onClick={() => handleOpenDialog(request)}
                                                        >
                                                            <Visibility />
                                                        </IconButton>
                                                    </Tooltip>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                            <TablePagination
                                component="div"
                                count={requests.length}
                                page={page}
                                onPageChange={(_, newPage) => setPage(newPage)}
                                rowsPerPage={rowsPerPage}
                                rowsPerPageOptions={[10]}
                                labelRowsPerPage="عدد الصفوف:"
                            />
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Request Details Dialog */}
            <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
                {selectedRequest && (
                    <>
                        <DialogTitle>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="h6">تفاصيل طلب الزيادة</Typography>
                                <Chip
                                    label={getStatusLabel(selectedRequest.status)}
                                    color={getStatusColor(selectedRequest.status)}
                                />
                            </Box>
                        </DialogTitle>
                        <DialogContent dividers>
                            <Grid container spacing={3}>
                                {/* Employee Info */}
                                <Grid item xs={12}>
                                    <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                                        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                                            معلومات الموظف
                                        </Typography>
                                        <Grid container spacing={2}>
                                            <Grid item xs={6} md={3}>
                                                <Typography variant="caption" color="text.secondary">الاسم</Typography>
                                                <Typography>{selectedRequest.user.firstName} {selectedRequest.user.lastName}</Typography>
                                            </Grid>
                                            <Grid item xs={6} md={3}>
                                                <Typography variant="caption" color="text.secondary">الرقم الوظيفي</Typography>
                                                <Typography>{selectedRequest.user.employeeCode || '-'}</Typography>
                                            </Grid>
                                            <Grid item xs={6} md={3}>
                                                <Typography variant="caption" color="text.secondary">القسم</Typography>
                                                <Typography>{selectedRequest.user.department?.name || '-'}</Typography>
                                            </Grid>
                                            <Grid item xs={6} md={3}>
                                                <Typography variant="caption" color="text.secondary">الفرع</Typography>
                                                <Typography>{selectedRequest.user.branch?.name || '-'}</Typography>
                                            </Grid>
                                            <Grid item xs={6} md={3}>
                                                <Typography variant="caption" color="text.secondary">الراتب الحالي</Typography>
                                                <Typography fontWeight="bold">
                                                    {selectedRequest.user.salary ? `${Number(selectedRequest.user.salary).toLocaleString()} ر.س` : '-'}
                                                </Typography>
                                            </Grid>
                                            <Grid item xs={6} md={3}>
                                                <Typography variant="caption" color="text.secondary">تاريخ التعيين</Typography>
                                                <Typography>
                                                    {selectedRequest.user.hireDate
                                                        ? format(new Date(selectedRequest.user.hireDate), 'dd/MM/yyyy')
                                                        : '-'}
                                                </Typography>
                                            </Grid>
                                        </Grid>
                                    </Paper>
                                </Grid>

                                {/* Request Details */}
                                <Grid item xs={12} md={6}>
                                    <Paper sx={{ p: 2 }}>
                                        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                                            تفاصيل الطلب
                                        </Typography>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <MonetizationOn color="action" fontSize="small" />
                                                <Typography variant="body2" color="text.secondary">نوع الطلب:</Typography>
                                                <Chip size="small" label={RAISE_TYPES[selectedRequest.type] || selectedRequest.type} />
                                            </Box>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Business color="action" fontSize="small" />
                                                <Typography variant="body2" color="text.secondary">المبلغ المطلوب:</Typography>
                                                <Typography fontWeight="bold" color="success.main">
                                                    {Number(selectedRequest.amount).toLocaleString()} ر.س
                                                </Typography>
                                            </Box>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <CalendarMonth color="action" fontSize="small" />
                                                <Typography variant="body2" color="text.secondary">الشهر:</Typography>
                                                <Typography>{format(new Date(selectedRequest.effectiveMonth), 'MMMM yyyy', { locale: ar })}</Typography>
                                            </Box>
                                        </Box>
                                    </Paper>
                                </Grid>

                                {/* Notes */}
                                <Grid item xs={12} md={6}>
                                    <Paper sx={{ p: 2, height: '100%' }}>
                                        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                                            الملاحظات
                                        </Typography>
                                        <Typography color="text.secondary">
                                            {selectedRequest.notes || 'لا توجد ملاحظات'}
                                        </Typography>
                                    </Paper>
                                </Grid>

                                {/* Attachments */}
                                {selectedRequest.attachments && selectedRequest.attachments.length > 0 && (
                                    <Grid item xs={12}>
                                        <Paper sx={{ p: 2 }}>
                                            {renderAttachments(selectedRequest.attachments)}
                                        </Paper>
                                    </Grid>
                                )}

                                {/* Decision Notes for Manager/HR */}
                                {(isManagerInbox || isHRInbox) && (
                                    <Grid item xs={12}>
                                        <Divider sx={{ my: 2 }} />
                                        <TextField
                                            fullWidth
                                            label="ملاحظات على القرار"
                                            multiline
                                            rows={2}
                                            value={decisionNotes}
                                            onChange={(e) => setDecisionNotes(e.target.value)}
                                        />
                                    </Grid>
                                )}
                            </Grid>
                        </DialogContent>
                        <DialogActions>
                            {isManagerInbox && (
                                <>
                                    <Button
                                        variant="contained"
                                        color="success"
                                        startIcon={<ThumbUp />}
                                        onClick={() => handleManagerDecision('APPROVED')}
                                        disabled={managerDecisionMutation.isPending}
                                    >
                                        موافقة
                                    </Button>
                                    <Button
                                        variant="contained"
                                        color="error"
                                        startIcon={<ThumbDown />}
                                        onClick={() => handleManagerDecision('REJECTED')}
                                        disabled={managerDecisionMutation.isPending}
                                    >
                                        رفض
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        color="warning"
                                        startIcon={<HourglassEmpty />}
                                        onClick={() => handleManagerDecision('DELAYED')}
                                        disabled={managerDecisionMutation.isPending}
                                    >
                                        تأجيل
                                    </Button>
                                </>
                            )}
                            {isHRInbox && (
                                <>
                                    <Button
                                        variant="contained"
                                        color="success"
                                        startIcon={<ThumbUp />}
                                        onClick={() => handleHRDecision('APPROVED')}
                                        disabled={hrDecisionMutation.isPending}
                                    >
                                        موافقة نهائية
                                    </Button>
                                    <Button
                                        variant="contained"
                                        color="error"
                                        startIcon={<ThumbDown />}
                                        onClick={() => handleHRDecision('REJECTED')}
                                        disabled={hrDecisionMutation.isPending}
                                    >
                                        رفض
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        color="warning"
                                        startIcon={<HourglassEmpty />}
                                        onClick={() => handleHRDecision('DELAYED')}
                                        disabled={hrDecisionMutation.isPending}
                                    >
                                        تأجيل
                                    </Button>
                                </>
                            )}
                            <Button onClick={handleCloseDialog}>إغلاق</Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>

            {/* Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                message={snackbar.message}
            />
        </Box>
    );
}
