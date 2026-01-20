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
  LinearProgress,
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
  CalendarMonth,
  EventAvailable,
  EventBusy,
  Schedule,
  Inbox,
  SupervisorAccount,
  AccessTime,
  AccountBalanceWallet,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { api } from '@/services/api.service';
import { API_CONFIG } from '@/config/api';
import { LeaveBalanceDashboard } from '@/components/leaves/LeaveBalanceDashboard';

interface Attachment {
  filename: string;
  originalName: string;
  path?: string;
  url: string;
  mimetype?: string;
  mimeType?: string;
  size?: number;
}

interface LeaveRequest {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
  currentStep?: string;
  approvedBy: string | null;
  approvalNote: string | null;
  createdAt: string;
  attachments?: Attachment[];
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    jobTitle: string;
    employeeCode?: string;
    department?: { name: string };
    branch?: { name: string };
  };
  managerApprover?: {
    firstName: string;
    lastName: string;
  };
}

interface EmployeeContext {
  hireDate: string | null;
  annualLeaveDays: number;
  usedLeaveDays: number;
  remainingLeaveDays: number;
  branch: { id: string; name: string } | null;
  department: { id: string; name: string } | null;
}

interface LeaveSummary {
  totalRequests: number;
  approvedDays: number;
  pendingDays: number;
  rejectedRequests: number;
}

interface YearLeaveRequest {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  requestedDays: number;
  approvedDays: number | null;
  status: string;
  createdAt: string;
}

interface LeaveWithContext extends LeaveRequest {
  employeeContext: EmployeeContext;
  currentYearLeaveRequests: YearLeaveRequest[];
  leaveSummary: LeaveSummary;
}

interface LeavesResponse {
  data: LeaveRequest[];
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
}

export const LeavesPage = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [tabValue, setTabValue] = useState(0);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [approvalNote, setApprovalNote] = useState('');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  // Tab mapping: 0=Balance Dashboard, 1=Manager Inbox, 2=HR Inbox, 3=PENDING, 4=MGR_APPROVED, 5=APPROVED, 6=REJECTED
  const isBalanceDashboard = tabValue === 0;
  const isManagerInbox = tabValue === 1;
  const isHRInbox = tabValue === 2;
  const statusFilter = tabValue === 3 ? 'PENDING' : tabValue === 4 ? 'MGR_APPROVED' : tabValue === 5 ? 'APPROVED' : 'REJECTED';

  // Manager Inbox Query
  const { data: managerInbox, isLoading: managerLoading } = useQuery<LeaveRequest[]>({
    queryKey: ['leaves-manager-inbox'],
    queryFn: () => api.get('/leaves/inbox/manager'),
    enabled: isManagerInbox,
  });

  // HR Inbox Query
  const { data: hrInbox, isLoading: hrLoading } = useQuery<LeaveRequest[]>({
    queryKey: ['leaves-hr-inbox'],
    queryFn: () => api.get('/leaves/inbox/hr'),
    enabled: isHRInbox,
  });

  // Regular leaves query
  const { data, isLoading: regularLoading, error } = useQuery<LeavesResponse>({
    queryKey: ['leaves', page, rowsPerPage, statusFilter],
    queryFn: () =>
      api.get(`/leaves/pending/all?page=${page + 1}&limit=${rowsPerPage}&status=${statusFilter}`),
    enabled: !isManagerInbox && !isHRInbox,
  });

  // Fetch leave context when dialog opens
  const { data: leaveContext, isLoading: contextLoading } = useQuery<LeaveWithContext>({
    queryKey: ['leaveContext', selectedLeave?.id],
    queryFn: () => api.get(`/leaves/${selectedLeave?.id}/context`),
    enabled: !!selectedLeave?.id && openDialog,
  });

  // Manager Decision Mutation
  const managerDecisionMutation = useMutation({
    mutationFn: ({ id, decision, notes }: { id: string; decision: 'APPROVED' | 'REJECTED'; notes?: string }) =>
      api.post(`/leaves/${id}/manager-decision`, { decision, notes }),
    onSuccess: (_, { decision }) => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      queryClient.invalidateQueries({ queryKey: ['leaves-manager-inbox'] });
      queryClient.invalidateQueries({ queryKey: ['leaves-hr-inbox'] });
      handleCloseDialog();
      setSnackbar({
        open: true,
        message: decision === 'APPROVED' ? 'تم إرسال الطلب لـ HR للموافقة النهائية' : 'تم رفض الطلب',
        severity: 'success'
      });
    },
    onError: () => {
      setSnackbar({ open: true, message: 'فشل تنفيذ العملية', severity: 'error' });
    },
  });

  // HR Decision Mutation
  const hrDecisionMutation = useMutation({
    mutationFn: ({ id, decision, notes }: { id: string; decision: 'APPROVED' | 'REJECTED' | 'DELAYED'; notes?: string }) =>
      api.post(`/leaves/${id}/hr-decision`, { decision, notes }),
    onSuccess: (_, { decision }) => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      queryClient.invalidateQueries({ queryKey: ['leaves-hr-inbox'] });
      handleCloseDialog();
      const messages = {
        'APPROVED': 'تمت الموافقة على الطلب',
        'REJECTED': 'تم رفض الطلب',
        'DELAYED': 'تم تأجيل الطلب',
      };
      setSnackbar({ open: true, message: messages[decision], severity: 'success' });
    },
    onError: () => {
      setSnackbar({ open: true, message: 'فشل تنفيذ العملية', severity: 'error' });
    },
  });

  // Legacy approve/reject mutations (for general view)
  const approveMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      api.patch(`/leaves/${id}/approve`, { notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      handleCloseDialog();
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      api.patch(`/leaves/${id}/reject`, { notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      handleCloseDialog();
    },
  });

  const handleOpenDialog = (leave: LeaveRequest) => {
    setSelectedLeave(leave);
    setApprovalNote('');
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedLeave(null);
    setApprovalNote('');
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'ANNUAL': return 'سنوية';
      case 'SICK': return 'مرضية';
      case 'EMERGENCY': return 'طارئة';
      case 'UNPAID': return 'بدون راتب';
      case 'PERMISSION': return 'إذن';
      default: return type;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING': return 'قيد المراجعة';
      case 'MGR_APPROVED': return 'موافقة المدير';
      case 'MGR_REJECTED': return 'رفض المدير';
      case 'APPROVED': return 'موافق عليها';
      case 'REJECTED': return 'مرفوضة';
      case 'DELAYED': return 'مؤجل';
      case 'CANCELLED': return 'ملغاة';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'warning';
      case 'MGR_APPROVED': return 'info';
      case 'MGR_REJECTED': return 'error';
      case 'APPROVED': return 'success';
      case 'REJECTED': return 'error';
      case 'DELAYED': return 'secondary';
      case 'CANCELLED': return 'default';
      default: return 'default';
    }
  };

  // Get current data based on active tab
  const isLoading = isManagerInbox ? managerLoading : isHRInbox ? hrLoading : regularLoading;
  const leaves = isManagerInbox ? (managerInbox || []) : isHRInbox ? (hrInbox || []) : (data?.data || []);
  const total = isManagerInbox || isHRInbox ? leaves.length : (data?.pagination?.total || 0);

  // Calculate leave balance percentage
  const getLeaveBalancePercentage = () => {
    if (!leaveContext?.employeeContext) return 0;
    const { annualLeaveDays, remainingLeaveDays } = leaveContext.employeeContext;
    return annualLeaveDays > 0 ? (remainingLeaveDays / annualLeaveDays) * 100 : 0;
  };

  // Render leave table
  const renderLeaveTable = (leavesList: LeaveRequest[], showManagerInfo = false) => (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>الموظف</TableCell>
            <TableCell>نوع الإجازة</TableCell>
            <TableCell>من</TableCell>
            <TableCell>إلى</TableCell>
            <TableCell>السبب</TableCell>
            <TableCell>الحالة</TableCell>
            {showManagerInfo && <TableCell>موافقة المدير</TableCell>}
            <TableCell>تاريخ الطلب</TableCell>
            <TableCell>مرفقات</TableCell>
            <TableCell align="center">الإجراءات</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {leavesList.map((leave) => (
            <TableRow key={leave.id} hover>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    {leave.user.firstName?.[0]}
                  </Avatar>
                  <Box>
                    <Typography fontWeight="bold">
                      {leave.user.firstName} {leave.user.lastName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {leave.user.jobTitle}
                    </Typography>
                  </Box>
                </Box>
              </TableCell>
              <TableCell>
                <Chip label={getTypeLabel(leave.type)} size="small" variant="outlined" />
              </TableCell>
              <TableCell>
                {format(new Date(leave.startDate), 'dd/MM/yyyy', { locale: ar })}
              </TableCell>
              <TableCell>
                {format(new Date(leave.endDate), 'dd/MM/yyyy', { locale: ar })}
              </TableCell>
              <TableCell>
                <Typography
                  variant="body2"
                  sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                >
                  {leave.reason}
                </Typography>
              </TableCell>
              <TableCell>
                <Chip label={getStatusLabel(leave.status)} color={getStatusColor(leave.status) as any} size="small" />
              </TableCell>
              {showManagerInfo && (
                <TableCell>
                  {leave.managerApprover ? (
                    <Typography variant="body2">
                      {leave.managerApprover.firstName} {leave.managerApprover.lastName}
                    </Typography>
                  ) : '-'}
                </TableCell>
              )}
              <TableCell>
                {format(new Date(leave.createdAt), 'dd/MM/yyyy', { locale: ar })}
              </TableCell>
              <TableCell>
                {leave.attachments && leave.attachments.length > 0 ? (
                  <Chip icon={<AttachFile />} label={leave.attachments.length} size="small" color="info" variant="outlined" />
                ) : (
                  <Typography variant="body2" color="text.secondary">-</Typography>
                )}
              </TableCell>
              <TableCell align="center">
                <Tooltip title="عرض التفاصيل">
                  <IconButton size="small" onClick={() => handleOpenDialog(leave)}>
                    <Visibility />
                  </IconButton>
                </Tooltip>
                {/* Quick actions for inbox views */}
                {isManagerInbox && (
                  <>
                    <Tooltip title="موافقة">
                      <IconButton
                        size="small"
                        color="success"
                        onClick={() => managerDecisionMutation.mutate({ id: leave.id, decision: 'APPROVED' })}
                      >
                        <ThumbUp />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="رفض">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleOpenDialog(leave)}
                      >
                        <ThumbDown />
                      </IconButton>
                    </Tooltip>
                  </>
                )}
                {isHRInbox && (
                  <>
                    <Tooltip title="موافقة نهائية">
                      <IconButton
                        size="small"
                        color="success"
                        onClick={() => hrDecisionMutation.mutate({ id: leave.id, decision: 'APPROVED' })}
                      >
                        <ThumbUp />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="رفض">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleOpenDialog(leave)}
                      >
                        <ThumbDown />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="تأجيل">
                      <IconButton
                        size="small"
                        color="warning"
                        onClick={() => hrDecisionMutation.mutate({ id: leave.id, decision: 'DELAYED' })}
                      >
                        <AccessTime />
                      </IconButton>
                    </Tooltip>
                  </>
                )}
              </TableCell>
            </TableRow>
          ))}
          {leavesList.length === 0 && (
            <TableRow>
              <TableCell colSpan={showManagerInfo ? 11 : 10} align="center">
                <Typography color="text.secondary" py={4}>
                  لا توجد طلبات إجازات
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            إدارة الإجازات
          </Typography>
          <Typography variant="body2" color="text.secondary">
            مراجعة والموافقة على طلبات الإجازات
          </Typography>
        </Box>
      </Box>

      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={tabValue}
            onChange={(_, v) => { setTabValue(v); setPage(0); }}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab
              icon={<AccountBalanceWallet />}
              iconPosition="start"
              label="أرصدتي"
            />
            <Tab
              icon={<Badge badgeContent={managerInbox?.length || 0} color="warning"><Inbox /></Badge>}
              iconPosition="start"
              label="صندوق المدير"
            />
            <Tab
              icon={<Badge badgeContent={hrInbox?.length || 0} color="info"><SupervisorAccount /></Badge>}
              iconPosition="start"
              label="صندوق HR"
            />
            <Tab icon={<HourglassEmpty />} iconPosition="start" label="قيد المراجعة" />
            <Tab icon={<HourglassEmpty color="info" />} iconPosition="start" label="انتظار HR" />
            <Tab icon={<CheckCircle />} iconPosition="start" label="موافق عليها" />
            <Tab icon={<Cancel />} iconPosition="start" label="مرفوضة" />
          </Tabs>
        </Box>

        <CardContent>
          {isBalanceDashboard ? (
            <LeaveBalanceDashboard />
          ) : isLoading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error">فشل تحميل البيانات</Alert>
          ) : (
            <>
              {/* Info banner for inbox tabs */}
              {isManagerInbox && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  هذه الطلبات تنتظر موافقتك كمدير. بعد الموافقة ستنتقل لـ HR للموافقة النهائية.
                </Alert>
              )}
              {isHRInbox && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  هذه الطلبات وافق عليها المدير وتنتظر موافقتك النهائية كـ HR.
                </Alert>
              )}

              {renderLeaveTable(leaves, isHRInbox)}

              {!isManagerInbox && !isHRInbox && (
                <TablePagination
                  component="div"
                  count={total}
                  page={page}
                  onPageChange={(_, newPage) => setPage(newPage)}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={(e) => {
                    setRowsPerPage(parseInt(e.target.value, 10));
                    setPage(0);
                  }}
                  labelRowsPerPage="عدد الصفوف:"
                  labelDisplayedRows={({ from, to, count }) => `${from}-${to} من ${count}`}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Leave Details Dialog with Employee Context */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">تفاصيل طلب الإجازة</Typography>
            {selectedLeave && (
              <Chip
                label={getStatusLabel(selectedLeave.status)}
                color={getStatusColor(selectedLeave.status) as any}
                size="small"
              />
            )}
          </Box>
        </DialogTitle>
        <DialogContent>
          {contextLoading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : selectedLeave && (
            <Box sx={{ pt: 2 }}>
              {/* Employee Info Header */}
              <Paper elevation={0} sx={{ p: 2, mb: 3, bgcolor: 'primary.50', borderRadius: 2 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={4}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ width: 64, height: 64, bgcolor: 'primary.main', fontSize: 24 }}>
                        {selectedLeave.user.firstName?.[0]}
                      </Avatar>
                      <Box>
                        <Typography variant="h6">
                          {selectedLeave.user.firstName} {selectedLeave.user.lastName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {selectedLeave.user.jobTitle}
                        </Typography>
                        {leaveContext?.employeeContext?.department && (
                          <Chip
                            icon={<Business sx={{ fontSize: 16 }} />}
                            label={leaveContext.employeeContext.department.name}
                            size="small"
                            variant="outlined"
                            sx={{ mt: 0.5 }}
                          />
                        )}
                      </Box>
                    </Box>
                  </Grid>

                  {/* Employee Context Cards */}
                  {leaveContext?.employeeContext && (
                    <>
                      <Grid item xs={6} md={2}>
                        <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: 'white' }}>
                          <CalendarMonth color="primary" />
                          <Typography variant="caption" display="block" color="text.secondary">
                            تاريخ التوظيف
                          </Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {leaveContext.employeeContext.hireDate
                              ? format(new Date(leaveContext.employeeContext.hireDate), 'dd/MM/yyyy')
                              : '-'}
                          </Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={6} md={2}>
                        <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: 'success.50' }}>
                          <EventAvailable color="success" />
                          <Typography variant="caption" display="block" color="text.secondary">
                            الرصيد المتبقي
                          </Typography>
                          <Typography variant="h6" fontWeight="bold" color="success.main">
                            {leaveContext.employeeContext.remainingLeaveDays} يوم
                          </Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={6} md={2}>
                        <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: 'warning.50' }}>
                          <EventBusy color="warning" />
                          <Typography variant="caption" display="block" color="text.secondary">
                            المستخدم
                          </Typography>
                          <Typography variant="body2" fontWeight="bold" color="warning.main">
                            {leaveContext.employeeContext.usedLeaveDays} / {leaveContext.employeeContext.annualLeaveDays}
                          </Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={6} md={2}>
                        <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: 'info.50' }}>
                          <Business color="info" />
                          <Typography variant="caption" display="block" color="text.secondary">
                            الفرع
                          </Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {leaveContext.employeeContext.branch?.name || '-'}
                          </Typography>
                        </Paper>
                      </Grid>
                    </>
                  )}
                </Grid>

                {/* Leave Balance Progress Bar */}
                {leaveContext?.employeeContext && (
                  <Box sx={{ mt: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        رصيد الإجازات
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {leaveContext.employeeContext.remainingLeaveDays} من {leaveContext.employeeContext.annualLeaveDays} يوم متبقي
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={getLeaveBalancePercentage()}
                      color={getLeaveBalancePercentage() > 50 ? 'success' : getLeaveBalancePercentage() > 20 ? 'warning' : 'error'}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                )}
              </Paper>

              {/* Leave Summary for Current Year */}
              {leaveContext?.leaveSummary && (
                <Paper elevation={0} sx={{ p: 2, mb: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
                  <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2 }}>
                    ملخص إجازات {new Date().getFullYear()}
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={3}>
                      <Box textAlign="center">
                        <Typography variant="h5" color="primary.main" fontWeight="bold">
                          {leaveContext.leaveSummary.totalRequests}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          إجمالي الطلبات
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={3}>
                      <Box textAlign="center">
                        <Typography variant="h5" color="success.main" fontWeight="bold">
                          {leaveContext.leaveSummary.approvedDays}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          أيام موافق عليها
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={3}>
                      <Box textAlign="center">
                        <Typography variant="h5" color="warning.main" fontWeight="bold">
                          {leaveContext.leaveSummary.pendingDays}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          أيام معلقة
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={3}>
                      <Box textAlign="center">
                        <Typography variant="h5" color="error.main" fontWeight="bold">
                          {leaveContext.leaveSummary.rejectedRequests}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          طلبات مرفوضة
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>
              )}

              {/* Current Year Leave History */}
              {leaveContext?.currentYearLeaveRequests && leaveContext.currentYearLeaveRequests.length > 0 && (
                <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2 }}>
                    <Schedule sx={{ fontSize: 18, mr: 1, verticalAlign: 'middle' }} />
                    طلبات الإجازات خلال السنة الحالية
                  </Typography>
                  <TableContainer sx={{ maxHeight: 200 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell>النوع</TableCell>
                          <TableCell>من</TableCell>
                          <TableCell>إلى</TableCell>
                          <TableCell>الأيام</TableCell>
                          <TableCell>الحالة</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {leaveContext.currentYearLeaveRequests.slice(0, 5).map((req) => (
                          <TableRow
                            key={req.id}
                            sx={{
                              bgcolor: req.id === selectedLeave.id ? 'primary.50' : 'transparent',
                              '&:hover': { bgcolor: 'action.hover' }
                            }}
                          >
                            <TableCell>
                              <Chip label={getTypeLabel(req.type)} size="small" variant="outlined" />
                            </TableCell>
                            <TableCell>{format(new Date(req.startDate), 'dd/MM')}</TableCell>
                            <TableCell>{format(new Date(req.endDate), 'dd/MM')}</TableCell>
                            <TableCell>{req.approvedDays || req.requestedDays}</TableCell>
                            <TableCell>
                              <Chip
                                label={getStatusLabel(req.status)}
                                color={getStatusColor(req.status) as any}
                                size="small"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              )}

              <Divider sx={{ my: 2 }} />

              {/* Current Request Details */}
              <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2 }}>
                تفاصيل الطلب الحالي
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">نوع الإجازة</Typography>
                  <Typography>{getTypeLabel(selectedLeave.type)}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">تاريخ الطلب</Typography>
                  <Typography>
                    {format(new Date(selectedLeave.createdAt), 'dd/MM/yyyy', { locale: ar })}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">من تاريخ</Typography>
                  <Typography>
                    {format(new Date(selectedLeave.startDate), 'dd/MM/yyyy', { locale: ar })}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">إلى تاريخ</Typography>
                  <Typography>
                    {format(new Date(selectedLeave.endDate), 'dd/MM/yyyy', { locale: ar })}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">السبب</Typography>
                  <Typography>{selectedLeave.reason}</Typography>
                </Grid>

                {/* المرفقات */}
                {selectedLeave.attachments && selectedLeave.attachments.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <AttachFile fontSize="small" />
                      المرفقات ({selectedLeave.attachments.length})
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                      {selectedLeave.attachments.map((attachment, index) => (
                        <Chip
                          key={index}
                          icon={(attachment.mimetype || attachment.mimeType || '').includes('pdf') ? <PictureAsPdf /> : <ImageIcon />}
                          label={attachment.originalName}
                          variant="outlined"
                          clickable
                          onClick={() => {
                            const relativeUrl = attachment.url || attachment.path || '';
                            const fileUrl = relativeUrl.startsWith('http') ? relativeUrl : `${API_CONFIG.FILE_BASE_URL}${relativeUrl}`;
                            window.open(fileUrl, '_blank');
                          }}
                          onDelete={() => {
                            const relativeUrl = attachment.url || attachment.path || '';
                            const fileUrl = relativeUrl.startsWith('http') ? relativeUrl : `${API_CONFIG.FILE_BASE_URL}${relativeUrl}`;
                            window.open(fileUrl, '_blank');
                          }}
                          deleteIcon={<Download />}
                          sx={{ maxWidth: 200 }}
                        />
                      ))}
                    </Box>
                  </Grid>
                )}

                {/* Approval Notes Input */}
                {(isManagerInbox || isHRInbox || selectedLeave.status === 'PENDING') && (
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="ملاحظات (اختياري)"
                      value={approvalNote}
                      onChange={(e) => setApprovalNote(e.target.value)}
                      multiline
                      rows={2}
                    />
                  </Grid>
                )}

                {selectedLeave.approvalNote && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">ملاحظات المراجعة</Typography>
                    <Typography>{selectedLeave.approvalNote}</Typography>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>إغلاق</Button>

          {/* Manager Decision Buttons */}
          {isManagerInbox && selectedLeave && (
            <>
              <Button
                color="error"
                onClick={() => managerDecisionMutation.mutate({
                  id: selectedLeave.id,
                  decision: 'REJECTED',
                  notes: approvalNote
                })}
                disabled={managerDecisionMutation.isPending}
              >
                رفض
              </Button>
              <Button
                variant="contained"
                color="success"
                onClick={() => managerDecisionMutation.mutate({
                  id: selectedLeave.id,
                  decision: 'APPROVED',
                  notes: approvalNote
                })}
                disabled={managerDecisionMutation.isPending}
              >
                موافقة وإرسال لـ HR
              </Button>
            </>
          )}

          {/* HR Decision Buttons */}
          {isHRInbox && selectedLeave && (
            <>
              <Button
                color="error"
                onClick={() => hrDecisionMutation.mutate({
                  id: selectedLeave.id,
                  decision: 'REJECTED',
                  notes: approvalNote
                })}
                disabled={hrDecisionMutation.isPending}
              >
                رفض
              </Button>
              <Button
                color="warning"
                onClick={() => hrDecisionMutation.mutate({
                  id: selectedLeave.id,
                  decision: 'DELAYED',
                  notes: approvalNote
                })}
                disabled={hrDecisionMutation.isPending}
              >
                تأجيل
              </Button>
              <Button
                variant="contained"
                color="success"
                onClick={() => hrDecisionMutation.mutate({
                  id: selectedLeave.id,
                  decision: 'APPROVED',
                  notes: approvalNote
                })}
                disabled={hrDecisionMutation.isPending}
              >
                موافقة نهائية
              </Button>
            </>
          )}

          {/* Legacy buttons for general view */}
          {!isManagerInbox && !isHRInbox && selectedLeave?.status === 'PENDING' && (
            <>
              <Button
                color="error"
                onClick={() => rejectMutation.mutate({ id: selectedLeave.id, notes: approvalNote })}
                disabled={rejectMutation.isPending}
              >
                رفض
              </Button>
              <Button
                variant="contained"
                color="success"
                onClick={() => approveMutation.mutate({ id: selectedLeave.id, notes: approvalNote })}
                disabled={approveMutation.isPending}
              >
                موافقة
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
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
};
