import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Card,
  CardContent,
  Avatar,
  Alert,
  Snackbar,
  Tabs,
  Tab,
  Badge,
  Tooltip,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  Visibility as ViewIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Home as AddressIcon,
  ArrowForward as ArrowIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { api } from '@/services/api.service';

interface ProfileUpdateRequest {
  id: string;
  userId: string;
  fieldName: string;
  currentValue: string | null;
  requestedValue: string;
  reason: string | null;
  reasonAr: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  rejectionReason: string | null;
  createdAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    employeeCode: string;
    branch?: { name: string };
    department?: { name: string };
  };
  reviewer?: {
    firstName: string;
    lastName: string;
  };
}

const FIELD_LABELS: Record<string, string> = {
  phone: 'رقم الهاتف',
  email: 'البريد الإلكتروني',
  address: 'العنوان',
  addressAr: 'العنوان (عربي)',
  city: 'المدينة',
  state: 'المنطقة',
  postalCode: 'الرمز البريدي',
  country: 'الدولة',
  emergencyContact: 'جهة اتصال الطوارئ',
  emergencyPhone: 'هاتف الطوارئ',
  bankName: 'اسم البنك',
  bankAccountNumber: 'رقم الحساب البنكي',
  iban: 'رقم IBAN',
};

const getFieldLabel = (fieldName: string) => {
  return FIELD_LABELS[fieldName] || fieldName;
};

const getFieldIcon = (fieldName: string) => {
  if (fieldName.toLowerCase().includes('phone') || fieldName.toLowerCase().includes('emergency')) {
    return <PhoneIcon />;
  }
  if (fieldName.toLowerCase().includes('email')) {
    return <EmailIcon />;
  }
  if (fieldName.toLowerCase().includes('address') || fieldName.toLowerCase().includes('city')) {
    return <AddressIcon />;
  }
  return <EditIcon />;
};

const ProfileUpdateRequestsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [tabValue, setTabValue] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedRequest, setSelectedRequest] = useState<ProfileUpdateRequest | null>(null);
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  const [openRejectDialog, setOpenRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvalNote, setApprovalNote] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // Fetch pending requests
  const { data: pendingData } = useQuery<{ data: ProfileUpdateRequest[]; pagination: { total: number } }>({
    queryKey: ['profile-update-requests-pending'],
    queryFn: () => api.get('/employee-profile/update-requests/pending?limit=100'),
  });

  // Fetch all requests based on tab
  const statusMap = ['PENDING', 'APPROVED', 'REJECTED'];
  const { data: requestsData, isLoading, refetch } = useQuery<{ data: ProfileUpdateRequest[]; pagination: { total: number } }>({
    queryKey: ['profile-update-requests', statusMap[tabValue], page, rowsPerPage],
    queryFn: () => api.get(`/employee-profile/update-requests/pending?status=${statusMap[tabValue]}&page=${page + 1}&limit=${rowsPerPage}`),
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: (requestId: string) =>
      api.patch(`/employee-profile/update-requests/${requestId}/review`, {
        status: 'APPROVED',
        reviewNote: approvalNote || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile-update-requests'] });
      queryClient.invalidateQueries({ queryKey: ['profile-update-requests-pending'] });
      setSnackbar({ open: true, message: 'تمت الموافقة على طلب التحديث بنجاح', severity: 'success' });
      handleCloseDialogs();
    },
    onError: () => {
      setSnackbar({ open: true, message: 'فشل في الموافقة على الطلب', severity: 'error' });
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: (requestId: string) =>
      api.patch(`/employee-profile/update-requests/${requestId}/review`, {
        status: 'REJECTED',
        rejectionReason: rejectionReason,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile-update-requests'] });
      queryClient.invalidateQueries({ queryKey: ['profile-update-requests-pending'] });
      setSnackbar({ open: true, message: 'تم رفض طلب التحديث', severity: 'success' });
      handleCloseDialogs();
    },
    onError: () => {
      setSnackbar({ open: true, message: 'فشل في رفض الطلب', severity: 'error' });
    },
  });

  const handleCloseDialogs = () => {
    setOpenDetailsDialog(false);
    setOpenRejectDialog(false);
    setSelectedRequest(null);
    setRejectionReason('');
    setApprovalNote('');
  };

  const handleViewDetails = (request: ProfileUpdateRequest) => {
    setSelectedRequest(request);
    setOpenDetailsDialog(true);
  };

  const handleApprove = () => {
    if (selectedRequest) {
      approveMutation.mutate(selectedRequest.id);
    }
  };

  const handleOpenReject = () => {
    setOpenDetailsDialog(false);
    setOpenRejectDialog(true);
  };

  const handleReject = () => {
    if (selectedRequest && rejectionReason.trim()) {
      rejectMutation.mutate(selectedRequest.id);
    }
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Chip label="في الانتظار" color="warning" size="small" />;
      case 'APPROVED':
        return <Chip label="تمت الموافقة" color="success" size="small" />;
      case 'REJECTED':
        return <Chip label="مرفوض" color="error" size="small" />;
      case 'CANCELLED':
        return <Chip label="ملغي" color="default" size="small" />;
      default:
        return <Chip label={status} size="small" />;
    }
  };

  const pendingCount = pendingData?.data?.filter(r => r.status === 'PENDING').length || 0;

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            طلبات تحديث بيانات الموظفين
          </Typography>
          <Typography variant="body2" color="text.secondary">
            مراجعة والموافقة على طلبات تعديل البيانات الشخصية للموظفين
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => refetch()}
        >
          تحديث
        </Button>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: 'warning.light' }}>
            <CardContent>
              <Typography variant="h3" fontWeight="bold" color="warning.dark">
                {pendingCount}
              </Typography>
              <Typography variant="body2" color="warning.dark">
                طلبات في الانتظار
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: 'success.light' }}>
            <CardContent>
              <Typography variant="h3" fontWeight="bold" color="success.dark">
                {pendingData?.pagination?.total || 0}
              </Typography>
              <Typography variant="body2" color="success.dark">
                إجمالي الطلبات
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: 'info.light' }}>
            <CardContent>
              <Typography variant="h3" fontWeight="bold" color="info.dark">
                {requestsData?.data?.length || 0}
              </Typography>
              <Typography variant="body2" color="info.dark">
                الطلبات المعروضة
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => {
            setTabValue(newValue);
            setPage(0);
          }}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab
            label={
              <Badge badgeContent={pendingCount} color="warning">
                <Box sx={{ px: 1 }}>في الانتظار</Box>
              </Badge>
            }
          />
          <Tab label="تمت الموافقة" />
          <Tab label="مرفوضة" />
        </Tabs>
      </Paper>

      {/* Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>الموظف</TableCell>
                <TableCell>الحقل المطلوب تحديثه</TableCell>
                <TableCell>التغيير</TableCell>
                <TableCell>تاريخ الطلب</TableCell>
                <TableCell>الحالة</TableCell>
                <TableCell align="center">الإجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : requestsData?.data?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                    <Typography color="text.secondary">لا توجد طلبات</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                requestsData?.data?.map((request: ProfileUpdateRequest) => (
                  <TableRow key={request.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          {request.user?.firstName?.[0] || '?'}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {request.user?.firstName} {request.user?.lastName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {request.user?.employeeCode} {request.user?.branch?.name && `• ${request.user.branch.name}`}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={getFieldIcon(request.fieldName)}
                        label={getFieldLabel(request.fieldName)}
                        color="primary"
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, maxWidth: 250 }}>
                        <Typography variant="body2" noWrap sx={{ color: 'text.secondary', textDecoration: 'line-through' }}>
                          {request.currentValue || 'غير محدد'}
                        </Typography>
                        <ArrowIcon fontSize="small" color="action" />
                        <Typography variant="body2" noWrap fontWeight="bold" color="primary">
                          {request.requestedValue}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {format(new Date(request.createdAt), 'dd MMM yyyy - HH:mm', { locale: ar })}
                    </TableCell>
                    <TableCell>{getStatusChip(request.status)}</TableCell>
                    <TableCell align="center">
                      <Tooltip title="عرض التفاصيل">
                        <IconButton
                          color="primary"
                          onClick={() => handleViewDetails(request)}
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      {request.status === 'PENDING' && (
                        <>
                          <Tooltip title="موافقة">
                            <IconButton
                              color="success"
                              onClick={() => {
                                setSelectedRequest(request);
                                setOpenDetailsDialog(true);
                              }}
                            >
                              <ApproveIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="رفض">
                            <IconButton
                              color="error"
                              onClick={() => {
                                setSelectedRequest(request);
                                setOpenRejectDialog(true);
                              }}
                            >
                              <RejectIcon />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={requestsData?.pagination?.total || 0}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          labelRowsPerPage="صفوف لكل صفحة:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} من ${count}`}
        />
      </Paper>

      {/* Details Dialog */}
      <Dialog
        open={openDetailsDialog}
        onClose={handleCloseDialogs}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonIcon />
            تفاصيل طلب تحديث البيانات
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedRequest && (
            <Grid container spacing={3}>
              {/* Employee Info */}
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      بيانات الموظف
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.main' }}>
                        {selectedRequest.user?.firstName?.[0]}
                      </Avatar>
                      <Box>
                        <Typography variant="h6">
                          {selectedRequest.user?.firstName} {selectedRequest.user?.lastName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {selectedRequest.user?.email} {selectedRequest.user?.employeeCode && `• ${selectedRequest.user.employeeCode}`}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {selectedRequest.user?.branch?.name} {selectedRequest.user?.department?.name && `- ${selectedRequest.user.department.name}`}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Request Details */}
              <Grid item xs={12}>
                <Card variant="outlined" sx={{ bgcolor: 'primary.light' }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="primary.dark" gutterBottom>
                      تفاصيل التحديث المطلوب
                    </Typography>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                      <Grid item xs={12}>
                        <Chip
                          icon={getFieldIcon(selectedRequest.fieldName)}
                          label={getFieldLabel(selectedRequest.fieldName)}
                          color="primary"
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="caption" color="text.secondary">القيمة الحالية</Typography>
                        <Typography variant="body1" sx={{ textDecoration: 'line-through', color: 'text.secondary' }}>
                          {selectedRequest.currentValue || 'غير محدد'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="caption" color="text.secondary">القيمة المطلوبة</Typography>
                        <Typography variant="body1" fontWeight="bold" color="primary.dark">
                          {selectedRequest.requestedValue}
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              {/* Reason */}
              {(selectedRequest.reason || selectedRequest.reasonAr) && (
                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        سبب التحديث
                      </Typography>
                      <Typography variant="body1">
                        {selectedRequest.reasonAr || selectedRequest.reason}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              )}

              {/* Status Info */}
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      معلومات الحالة
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      {getStatusChip(selectedRequest.status)}
                      <Typography variant="body2">
                        تاريخ الطلب: {format(new Date(selectedRequest.createdAt), 'dd MMMM yyyy - HH:mm', { locale: ar })}
                      </Typography>
                    </Box>
                    {selectedRequest.reviewedAt && (
                      <>
                        <Divider sx={{ my: 1 }} />
                        <Typography variant="body2">
                          تاريخ المراجعة: {format(new Date(selectedRequest.reviewedAt), 'dd MMMM yyyy - HH:mm', { locale: ar })}
                        </Typography>
                        {selectedRequest.reviewer && (
                          <Typography variant="body2">
                            بواسطة: {selectedRequest.reviewer.firstName} {selectedRequest.reviewer.lastName}
                          </Typography>
                        )}
                      </>
                    )}
                    {selectedRequest.rejectionReason && (
                      <Alert severity="error" sx={{ mt: 2 }}>
                        <strong>سبب الرفض:</strong> {selectedRequest.rejectionReason}
                      </Alert>
                    )}
                    {selectedRequest.reviewNote && selectedRequest.status === 'APPROVED' && (
                      <Alert severity="success" sx={{ mt: 2 }}>
                        <strong>ملاحظة المراجعة:</strong> {selectedRequest.reviewNote}
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* Approval Note (for pending) */}
              {selectedRequest.status === 'PENDING' && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="ملاحظة الموافقة (اختياري)"
                    multiline
                    rows={2}
                    value={approvalNote}
                    onChange={(e) => setApprovalNote(e.target.value)}
                    placeholder="أضف ملاحظة للموظف عند الموافقة..."
                  />
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialogs}>إغلاق</Button>
          {selectedRequest?.status === 'PENDING' && (
            <>
              <Button
                color="error"
                variant="outlined"
                startIcon={<RejectIcon />}
                onClick={handleOpenReject}
              >
                رفض
              </Button>
              <Button
                color="success"
                variant="contained"
                startIcon={<ApproveIcon />}
                onClick={handleApprove}
                disabled={approveMutation.isPending}
              >
                {approveMutation.isPending ? 'جاري الموافقة...' : 'موافقة'}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={openRejectDialog} onClose={handleCloseDialogs} maxWidth="sm" fullWidth>
        <DialogTitle>رفض طلب تحديث البيانات</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            سيتم إشعار الموظف بسبب رفض طلب التحديث
          </Alert>
          <TextField
            fullWidth
            label="سبب الرفض"
            multiline
            rows={3}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="أدخل سبب رفض الطلب..."
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialogs}>إلغاء</Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleReject}
            disabled={!rejectionReason.trim() || rejectMutation.isPending}
          >
            {rejectMutation.isPending ? 'جاري الرفض...' : 'تأكيد الرفض'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ProfileUpdateRequestsPage;
