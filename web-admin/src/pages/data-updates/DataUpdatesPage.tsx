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
} from '@mui/material';
import {
  Visibility as ViewIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Smartphone as DeviceIcon,
  Face as FaceIcon,
  Sync as SyncIcon,
  PhoneAndroid as PhoneChangeIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
// import { Helmet } from 'react-helmet-async';
import { api } from '@/services/api.service';

interface DataUpdateRequest {
  id: string;
  userId: string;
  requestType: 'FACE_UPDATE' | 'DEVICE_UPDATE' | 'BOTH' | 'DEVICE_CHANGE';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  reason: string | null;
  newFaceEmbedding: string | null;
  newFaceImage: string | null;
  faceImageQuality: number | null;
  newDeviceId: string | null;
  newDeviceName: string | null;
  newDeviceModel: string | null;
  newDeviceBrand: string | null;
  newDevicePlatform: string | null;
  newDeviceOsVersion: string | null;
  oldDeviceId: string | null;
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
}

const DataUpdatesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [tabValue, setTabValue] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedRequest, setSelectedRequest] = useState<DataUpdateRequest | null>(null);
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  const [openRejectDialog, setOpenRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvalNote, setApprovalNote] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // Fetch pending requests count for badge
  const { data: pendingData } = useQuery<DataUpdateRequest[]>({
    queryKey: ['data-updates-pending'],
    queryFn: () => api.get('/data-update/admin/pending'),
  });

  // Fetch all requests based on tab
  const statusMap = ['PENDING', 'APPROVED', 'REJECTED'];
  const { data: requestsData, isLoading, refetch } = useQuery<{ data: DataUpdateRequest[]; pagination: { total: number; page: number; limit: number } }>({
    queryKey: ['data-updates', statusMap[tabValue], page, rowsPerPage],
    queryFn: () => api.get(`/data-update/admin/all?status=${statusMap[tabValue]}&page=${page + 1}&limit=${rowsPerPage}`),
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: (requestId: string) =>
      api.patch(`/data-update/admin/${requestId}/approve`, { note: approvalNote }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-updates'] });
      queryClient.invalidateQueries({ queryKey: ['data-updates-pending'] });
      setSnackbar({ open: true, message: 'تمت الموافقة على الطلب بنجاح', severity: 'success' });
      handleCloseDialogs();
    },
    onError: () => {
      setSnackbar({ open: true, message: 'فشل في الموافقة على الطلب', severity: 'error' });
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: (requestId: string) =>
      api.patch(`/data-update/admin/${requestId}/reject`, { reason: rejectionReason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-updates'] });
      queryClient.invalidateQueries({ queryKey: ['data-updates-pending'] });
      setSnackbar({ open: true, message: 'تم رفض الطلب', severity: 'success' });
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

  const handleViewDetails = (request: DataUpdateRequest) => {
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

  const getRequestTypeInfo = (type: string) => {
    switch (type) {
      case 'FACE_UPDATE':
        return { label: 'تحديث الوجه', icon: <FaceIcon />, color: 'secondary' as const };
      case 'DEVICE_UPDATE':
        return { label: 'تحديث الجهاز', icon: <DeviceIcon />, color: 'info' as const };
      case 'BOTH':
        return { label: 'تحديث الوجه والجهاز', icon: <SyncIcon />, color: 'primary' as const };
      case 'DEVICE_CHANGE':
        return { label: 'تغيير الموبايل', icon: <PhoneChangeIcon />, color: 'warning' as const };
      default:
        return { label: type, icon: <SyncIcon />, color: 'default' as const };
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

  const pendingCount = pendingData?.length || 0;

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            طلبات تحديث البيانات
          </Typography>
          <Typography variant="body2" color="text.secondary">
            إدارة طلبات تحديث بيانات الوجه والأجهزة للموظفين
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
                {requestsData?.pagination?.total || 0}
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
                {tabValue === 0 ? pendingCount : requestsData?.data?.length || 0}
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
                <TableCell>نوع التحديث</TableCell>
                <TableCell>السبب</TableCell>
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
                requestsData?.data?.map((request: DataUpdateRequest) => {
                  const typeInfo = getRequestTypeInfo(request.requestType);
                  return (
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
                              {request.user?.employeeCode} • {request.user?.branch?.name}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={typeInfo.icon}
                          label={typeInfo.label}
                          color={typeInfo.color}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ maxWidth: 200 }} noWrap>
                          {request.reason || '-'}
                        </Typography>
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
                  );
                })
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
            {selectedRequest && getRequestTypeInfo(selectedRequest.requestType).icon}
            تفاصيل طلب التحديث
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
                          {selectedRequest.user?.email} • {selectedRequest.user?.employeeCode}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {selectedRequest.user?.branch?.name} - {selectedRequest.user?.department?.name}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Request Info */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      نوع الطلب
                    </Typography>
                    <Chip
                      icon={getRequestTypeInfo(selectedRequest.requestType).icon}
                      label={getRequestTypeInfo(selectedRequest.requestType).label}
                      color={getRequestTypeInfo(selectedRequest.requestType).color}
                    />
                    <Typography variant="body2" sx={{ mt: 2 }}>
                      <strong>السبب:</strong> {selectedRequest.reason || 'لم يحدد'}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      <strong>تاريخ الطلب:</strong>{' '}
                      {format(new Date(selectedRequest.createdAt), 'dd MMMM yyyy - HH:mm', { locale: ar })}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Status */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      الحالة
                    </Typography>
                    {getStatusChip(selectedRequest.status)}
                    {selectedRequest.reviewedAt && (
                      <Typography variant="body2" sx={{ mt: 2 }}>
                        <strong>تاريخ المراجعة:</strong>{' '}
                        {format(new Date(selectedRequest.reviewedAt), 'dd MMMM yyyy - HH:mm', { locale: ar })}
                      </Typography>
                    )}
                    {selectedRequest.rejectionReason && (
                      <Alert severity="error" sx={{ mt: 2 }}>
                        <strong>سبب الرفض:</strong> {selectedRequest.rejectionReason}
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* New Device Info */}
              {(selectedRequest.requestType === 'DEVICE_UPDATE' ||
                selectedRequest.requestType === 'DEVICE_CHANGE' ||
                selectedRequest.requestType === 'BOTH') && (
                <Grid item xs={12}>
                  <Card variant="outlined" sx={{ bgcolor: 'info.light' }}>
                    <CardContent>
                      <Typography variant="subtitle2" color="info.dark" gutterBottom>
                        <DeviceIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                        بيانات الجهاز الجديد
                      </Typography>
                      <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={6} md={3}>
                          <Typography variant="caption" color="text.secondary">اسم الجهاز</Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {selectedRequest.newDeviceName || '-'}
                          </Typography>
                        </Grid>
                        <Grid item xs={6} md={3}>
                          <Typography variant="caption" color="text.secondary">الموديل</Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {selectedRequest.newDeviceModel || '-'}
                          </Typography>
                        </Grid>
                        <Grid item xs={6} md={3}>
                          <Typography variant="caption" color="text.secondary">العلامة التجارية</Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {selectedRequest.newDeviceBrand || '-'}
                          </Typography>
                        </Grid>
                        <Grid item xs={6} md={3}>
                          <Typography variant="caption" color="text.secondary">نظام التشغيل</Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {selectedRequest.newDeviceOsVersion || '-'}
                          </Typography>
                        </Grid>
                      </Grid>
                      {selectedRequest.oldDeviceId && (
                        <Alert severity="warning" sx={{ mt: 2 }}>
                          <strong>الجهاز القديم:</strong> {selectedRequest.oldDeviceId}
                          <br />
                          سيتم تعطيل الجهاز القديم عند الموافقة
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              )}

              {/* Face Info */}
              {(selectedRequest.requestType === 'FACE_UPDATE' ||
                selectedRequest.requestType === 'BOTH') && (
                <Grid item xs={12}>
                  <Card variant="outlined" sx={{ bgcolor: 'secondary.light' }}>
                    <CardContent>
                      <Typography variant="subtitle2" color="secondary.dark" gutterBottom>
                        <FaceIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                        بيانات الوجه الجديدة
                      </Typography>
                      {selectedRequest.newFaceImage ? (
                        <Box sx={{ mt: 2, textAlign: 'center' }}>
                          <img
                            src={selectedRequest.newFaceImage}
                            alt="صورة الوجه الجديدة"
                            style={{
                              maxWidth: 200,
                              maxHeight: 200,
                              borderRadius: 8,
                              border: '2px solid #9c27b0',
                            }}
                          />
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            جودة الصورة: {selectedRequest.faceImageQuality 
                              ? `${(selectedRequest.faceImageQuality * 100).toFixed(0)}%` 
                              : 'غير محدد'}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          تم إرسال بيانات الوجه (Face Embedding) بدون صورة
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              )}

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
                    placeholder="أضف ملاحظة للموظف..."
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
        <DialogTitle>رفض طلب التحديث</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            سيتم إشعار الموظف بسبب الرفض
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

export default DataUpdatesPage;

