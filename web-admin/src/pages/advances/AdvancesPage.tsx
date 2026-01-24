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
    Visibility,
    ThumbUp,
    ThumbDown,
    AttachFile,
    Download,
    PictureAsPdf,
    Image as ImageIcon,
    MonetizationOn,
    CalendarMonth,
    Inbox,
    SupervisorAccount,
    AccountBalanceWallet,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { api } from '@/services/api.service';
import { API_CONFIG } from '@/config/api';

interface Attachment {
    filename: string;
    originalName: string;
    path?: string;
    url: string;
    mimetype?: string;
    mimeType?: string;
    size?: number;
}

interface AdvanceRequest {
    id: string;
    type: string;
    amount: number;
    startDate: string;
    endDate: string;
    periodMonths: number;
    monthlyDeduction: number;
    notes: string | null;
    status: string;
    currentStep?: string;
    createdAt: string;
    attachments?: Attachment[];
    approvedAmount?: number;
    approvedMonthlyDeduction?: number;
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

const ADVANCE_TYPES: Record<string, string> = {
    BANK_TRANSFER: 'سلفة تحويل بنكي',
    CASH: 'سلفه نقداً',
};

const getStatusColor = (status: string): 'default' | 'warning' | 'success' | 'error' | 'info' | 'primary' => {
    switch (status) {
        case 'PENDING': return 'warning';
        case 'MGR_APPROVED': return 'info';
        case 'APPROVED': return 'success';
        case 'REJECTED':
        case 'MGR_REJECTED': return 'error';
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
        default: return status;
    }
};

export default function AdvancesPage() {
    const queryClient = useQueryClient();
    const [tabValue, setTabValue] = useState(0);
    const [page, setPage] = useState(0);
    const [rowsPerPage] = useState(10);
    const [selectedRequest, setSelectedRequest] = useState<AdvanceRequest | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [decisionNotes, setDecisionNotes] = useState('');
    const [approvedAmount, setApprovedAmount] = useState<number | ''>('');
    const [approvedDeduction, setApprovedDeduction] = useState<number | ''>('');
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

    const isManagerInbox = tabValue === 0;
    const isHRInbox = tabValue === 1;

    // Manager Inbox Query
    const { data: managerInbox = [], isLoading: loadingManager } = useQuery({
        queryKey: ['advances', 'manager-inbox'],
        queryFn: () => api.get('/advances/inbox/manager') as Promise<AdvanceRequest[]>,
        enabled: isManagerInbox,
    });

    // HR Inbox Query
    const { data: hrInbox = [], isLoading: loadingHR } = useQuery({
        queryKey: ['advances', 'hr-inbox'],
        queryFn: () => api.get('/advances/inbox/hr') as Promise<AdvanceRequest[]>,
        enabled: isHRInbox,
    });

    // Manager Decision Mutation
    const managerDecision = useMutation({
        mutationFn: async ({ id, decision, notes }: { id: string; decision: 'APPROVED' | 'REJECTED'; notes: string }) => {
            return api.post(`/advances/${id}/manager-decision`, { decision, notes });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['advances'] });
            setDialogOpen(false);
            setDecisionNotes('');
            setSnackbar({ open: true, message: 'تم تسجيل القرار بنجاح', severity: 'success' });
        },
        onError: () => {
            setSnackbar({ open: true, message: 'حدث خطأ', severity: 'error' });
        },
    });

    // HR Decision Mutation
    const hrDecision = useMutation({
        mutationFn: async ({ id, decision, notes, approvedAmount, approvedMonthlyDeduction }: {
            id: string;
            decision: 'APPROVED' | 'REJECTED';
            notes: string;
            approvedAmount?: number;
            approvedMonthlyDeduction?: number;
        }) => {
            return api.post(`/advances/${id}/hr-decision`, {
                decision,
                notes,
                approvedAmount,
                approvedMonthlyDeduction,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['advances'] });
            setDialogOpen(false);
            setDecisionNotes('');
            setApprovedAmount('');
            setApprovedDeduction('');
            setSnackbar({ open: true, message: 'تم تسجيل القرار بنجاح', severity: 'success' });
        },
        onError: () => {
            setSnackbar({ open: true, message: 'حدث خطأ', severity: 'error' });
        },
    });

    const handleViewDetails = (request: AdvanceRequest) => {
        setSelectedRequest(request);
        setApprovedAmount(request.amount);
        setApprovedDeduction(request.monthlyDeduction);
        setDialogOpen(true);
    };

    const handleDecision = (decision: 'APPROVED' | 'REJECTED') => {
        if (!selectedRequest) return;

        if (isManagerInbox) {
            managerDecision.mutate({
                id: selectedRequest.id,
                decision,
                notes: decisionNotes,
            });
        } else if (isHRInbox) {
            hrDecision.mutate({
                id: selectedRequest.id,
                decision,
                notes: decisionNotes,
                approvedAmount: approvedAmount !== '' ? approvedAmount : undefined,
                approvedMonthlyDeduction: approvedDeduction !== '' ? approvedDeduction : undefined,
            });
        }
    };

    const currentData = isManagerInbox ? managerInbox : hrInbox;
    const isLoading = isManagerInbox ? loadingManager : loadingHR;

    const renderAttachment = (att: Attachment) => {
        const mimeType = att.mimetype || att.mimeType || '';
        const isPdf = mimeType.includes('pdf');
        const isImage = mimeType.includes('image');
        const relativeUrl = att.url || att.path || '';
        const fileUrl = relativeUrl.startsWith('http') ? relativeUrl : `${API_CONFIG.FILE_BASE_URL}${relativeUrl}`;

        return (
            <Tooltip title={`تحميل: ${att.originalName || att.filename}`} key={att.filename}>
                <IconButton
                    size="small"
                    href={fileUrl}
                    target="_blank"
                    sx={{ mr: 1 }}
                >
                    {isPdf ? <PictureAsPdf color="error" /> : isImage ? <ImageIcon color="primary" /> : <Download />}
                </IconButton>
            </Tooltip>
        );
    };

    return (
        <Box>
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Box display="flex" alignItems="center" gap={2} mb={2}>
                        <AccountBalanceWallet color="primary" sx={{ fontSize: 40 }} />
                        <Box>
                            <Typography variant="h5" fontWeight="bold">طلبات السلف</Typography>
                            <Typography variant="body2" color="text.secondary">
                                إدارة ومراجعة طلبات السلف
                            </Typography>
                        </Box>
                    </Box>

                    <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
                        <Tab
                            icon={<Badge badgeContent={managerInbox.length || 0} color="error"><Inbox /></Badge>}
                            iconPosition="start"
                            label="صندوق المدير"
                        />
                        <Tab
                            icon={<Badge badgeContent={hrInbox.length || 0} color="error"><SupervisorAccount /></Badge>}
                            iconPosition="start"
                            label="صندوق HR"
                        />
                    </Tabs>
                </CardContent>
            </Card>

            <Card>
                <CardContent>
                    {isLoading ? (
                        <Box display="flex" justifyContent="center" p={4}>
                            <CircularProgress />
                        </Box>
                    ) : currentData.length === 0 ? (
                        <Alert severity="info">لا توجد طلبات</Alert>
                    ) : (
                        <>
                            <TableContainer>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>الموظف</TableCell>
                                            <TableCell>النوع</TableCell>
                                            <TableCell>المبلغ</TableCell>
                                            <TableCell>الفترة</TableCell>
                                            <TableCell>الاستقطاع الشهري</TableCell>
                                            <TableCell>الحالة</TableCell>
                                            <TableCell>التاريخ</TableCell>
                                            <TableCell>الإجراءات</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {currentData.slice(page * rowsPerPage, (page + 1) * rowsPerPage).map((request) => (
                                            <TableRow key={request.id} hover>
                                                <TableCell>
                                                    <Box display="flex" alignItems="center" gap={1}>
                                                        <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                                                            {request.user.firstName?.[0]}
                                                        </Avatar>
                                                        <Box>
                                                            <Typography variant="body2" fontWeight="medium">
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
                                                        label={ADVANCE_TYPES[request.type] || request.type}
                                                        color={request.type === 'BANK_TRANSFER' ? 'primary' : 'secondary'}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Typography fontWeight="bold" color="primary.main">
                                                        {Number(request.amount).toLocaleString()} ريال
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>{request.periodMonths} شهر</TableCell>
                                                <TableCell>
                                                    <Typography color="text.secondary">
                                                        {Number(request.monthlyDeduction).toLocaleString()} ريال/شهر
                                                    </Typography>
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
                                                        <IconButton size="small" onClick={() => handleViewDetails(request)}>
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
                                count={currentData.length}
                                page={page}
                                onPageChange={(_, p) => setPage(p)}
                                rowsPerPage={rowsPerPage}
                                rowsPerPageOptions={[10]}
                                labelRowsPerPage="صفوف في الصفحة"
                                labelDisplayedRows={({ from, to, count }) => `${from}-${to} من ${count}`}
                            />
                        </>
                    )}
                </CardContent>
            </Card>

            {/* تفاصيل الطلب */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>
                    <Box display="flex" alignItems="center" gap={2}>
                        <AccountBalanceWallet color="primary" />
                        <Typography variant="h6">تفاصيل طلب السلفة</Typography>
                    </Box>
                </DialogTitle>
                <DialogContent dividers>
                    {selectedRequest && (
                        <Grid container spacing={3}>
                            {/* بيانات الموظف */}
                            <Grid item xs={12}>
                                <Paper variant="outlined" sx={{ p: 2 }}>
                                    <Typography variant="subtitle2" color="primary" gutterBottom>
                                        بيانات الموظف
                                    </Typography>
                                    <Grid container spacing={2}>
                                        <Grid item xs={6} md={3}>
                                            <Typography variant="caption" color="text.secondary">الاسم</Typography>
                                            <Typography>{selectedRequest.user.firstName} {selectedRequest.user.lastName}</Typography>
                                        </Grid>
                                        <Grid item xs={6} md={3}>
                                            <Typography variant="caption" color="text.secondary">الرقم الوظيفي</Typography>
                                            <Typography>{selectedRequest.user.employeeCode}</Typography>
                                        </Grid>
                                        <Grid item xs={6} md={3}>
                                            <Typography variant="caption" color="text.secondary">القسم</Typography>
                                            <Typography>{selectedRequest.user.department?.name || '-'}</Typography>
                                        </Grid>
                                        <Grid item xs={6} md={3}>
                                            <Typography variant="caption" color="text.secondary">الراتب</Typography>
                                            <Typography>{selectedRequest.user.salary?.toLocaleString() || '-'} ريال</Typography>
                                        </Grid>
                                    </Grid>
                                </Paper>
                            </Grid>

                            {/* تفاصيل السلفة */}
                            <Grid item xs={12}>
                                <Paper variant="outlined" sx={{ p: 2 }}>
                                    <Typography variant="subtitle2" color="primary" gutterBottom>
                                        تفاصيل السلفة
                                    </Typography>
                                    <Grid container spacing={2}>
                                        <Grid item xs={6} md={3}>
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <MonetizationOn fontSize="small" color="action" />
                                                <Box>
                                                    <Typography variant="caption" color="text.secondary">النوع</Typography>
                                                    <Typography>{ADVANCE_TYPES[selectedRequest.type]}</Typography>
                                                </Box>
                                            </Box>
                                        </Grid>
                                        <Grid item xs={6} md={3}>
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <MonetizationOn fontSize="small" color="action" />
                                                <Box>
                                                    <Typography variant="caption" color="text.secondary">المبلغ المطلوب</Typography>
                                                    <Typography fontWeight="bold" color="primary.main">
                                                        {Number(selectedRequest.amount).toLocaleString()} ريال
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </Grid>
                                        <Grid item xs={6} md={3}>
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <CalendarMonth fontSize="small" color="action" />
                                                <Box>
                                                    <Typography variant="caption" color="text.secondary">الفترة</Typography>
                                                    <Typography>{selectedRequest.periodMonths} شهر</Typography>
                                                </Box>
                                            </Box>
                                        </Grid>
                                        <Grid item xs={6} md={3}>
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <MonetizationOn fontSize="small" color="action" />
                                                <Box>
                                                    <Typography variant="caption" color="text.secondary">الاستقطاع الشهري</Typography>
                                                    <Typography>{Number(selectedRequest.monthlyDeduction).toLocaleString()} ريال</Typography>
                                                </Box>
                                            </Box>
                                        </Grid>
                                        <Grid item xs={6} md={3}>
                                            <Typography variant="caption" color="text.secondary">من تاريخ</Typography>
                                            <Typography>{format(new Date(selectedRequest.startDate), 'dd/MM/yyyy')}</Typography>
                                        </Grid>
                                        <Grid item xs={6} md={3}>
                                            <Typography variant="caption" color="text.secondary">إلى تاريخ</Typography>
                                            <Typography>{format(new Date(selectedRequest.endDate), 'dd/MM/yyyy')}</Typography>
                                        </Grid>
                                    </Grid>
                                </Paper>
                            </Grid>

                            {/* ملاحظات */}
                            {selectedRequest.notes && (
                                <Grid item xs={12}>
                                    <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                                        <Typography variant="subtitle2" gutterBottom>ملاحظات الموظف</Typography>
                                        <Typography>{selectedRequest.notes}</Typography>
                                    </Paper>
                                </Grid>
                            )}

                            {/* المرفقات */}
                            {selectedRequest.attachments && selectedRequest.attachments.length > 0 && (
                                <Grid item xs={12}>
                                    <Paper variant="outlined" sx={{ p: 2 }}>
                                        <Typography variant="subtitle2" gutterBottom>
                                            <AttachFile sx={{ verticalAlign: 'middle', mr: 1 }} />
                                            المرفقات ({selectedRequest.attachments.length})
                                        </Typography>
                                        <Box display="flex" flexWrap="wrap">
                                            {selectedRequest.attachments.map(renderAttachment)}
                                        </Box>
                                    </Paper>
                                </Grid>
                            )}

                            <Divider sx={{ my: 2, width: '100%' }} />

                            {/* حقول HR للتعديل */}
                            {isHRInbox && (
                                <Grid item xs={12}>
                                    <Paper variant="outlined" sx={{ p: 2, bgcolor: 'info.lighter' }}>
                                        <Typography variant="subtitle2" color="info.main" gutterBottom>
                                            تعديل المبلغ والاستقطاع (اختياري)
                                        </Typography>
                                        <Grid container spacing={2} alignItems="center">
                                            <Grid item xs={4}>
                                                <TextField
                                                    label="المبلغ المعتمد"
                                                    type="number"
                                                    fullWidth
                                                    size="small"
                                                    value={approvedAmount}
                                                    onChange={(e) => setApprovedAmount(Number(e.target.value))}
                                                    InputProps={{ endAdornment: 'ريال' }}
                                                />
                                            </Grid>
                                            <Grid item xs={4}>
                                                <TextField
                                                    label="الاستقطاع الشهري المعتمد"
                                                    type="number"
                                                    fullWidth
                                                    size="small"
                                                    value={approvedDeduction}
                                                    onChange={(e) => setApprovedDeduction(Number(e.target.value))}
                                                    InputProps={{ endAdornment: 'ريال' }}
                                                />
                                            </Grid>
                                            <Grid item xs={4}>
                                                <Paper
                                                    elevation={0}
                                                    sx={{
                                                        p: 1.5,
                                                        bgcolor: 'success.light',
                                                        borderRadius: 2,
                                                        textAlign: 'center'
                                                    }}
                                                >
                                                    <Typography variant="caption" color="success.dark">
                                                        عدد الأشهر المحسوب
                                                    </Typography>
                                                    <Typography variant="h5" fontWeight="bold" color="success.dark">
                                                        {approvedAmount && approvedDeduction && Number(approvedDeduction) > 0
                                                            ? Math.ceil(Number(approvedAmount) / Number(approvedDeduction))
                                                            : '-'} شهر
                                                    </Typography>
                                                </Paper>
                                            </Grid>
                                        </Grid>
                                    </Paper>
                                </Grid>
                            )}

                            {/* ملاحظات القرار */}
                            <Grid item xs={12}>
                                <TextField
                                    label="ملاحظات القرار"
                                    multiline
                                    rows={2}
                                    fullWidth
                                    value={decisionNotes}
                                    onChange={(e) => setDecisionNotes(e.target.value)}
                                    placeholder="أضف ملاحظاتك هنا..."
                                />
                            </Grid>
                        </Grid>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setDialogOpen(false)}>إغلاق</Button>
                    <Button
                        variant="contained"
                        color="error"
                        startIcon={<ThumbDown />}
                        onClick={() => handleDecision('REJECTED')}
                        disabled={managerDecision.isPending || hrDecision.isPending}
                    >
                        رفض
                    </Button>
                    <Button
                        variant="contained"
                        color="success"
                        startIcon={<ThumbUp />}
                        onClick={() => handleDecision('APPROVED')}
                        disabled={managerDecision.isPending || hrDecision.isPending}
                    >
                        موافقة
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}
