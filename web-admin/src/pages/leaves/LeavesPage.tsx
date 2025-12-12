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
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Visibility,
  HourglassEmpty,
  ThumbUp,
  ThumbDown,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { api } from '@/services/api.service';

interface LeaveRequest {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
  approvedBy: string | null;
  approvalNote: string | null;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    jobTitle: string;
  };
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

  const statusFilter = tabValue === 0 ? 'PENDING' : tabValue === 1 ? 'APPROVED' : 'REJECTED';

  const { data, isLoading, error } = useQuery<LeavesResponse>({
    queryKey: ['leaves', page, rowsPerPage, statusFilter],
    queryFn: () =>
      api.get(`/leaves/admin/all?page=${page + 1}&limit=${rowsPerPage}&status=${statusFilter}`),
  });

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
      case 'APPROVED': return 'موافق عليها';
      case 'REJECTED': return 'مرفوضة';
      case 'CANCELLED': return 'ملغاة';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'warning';
      case 'APPROVED': return 'success';
      case 'REJECTED': return 'error';
      case 'CANCELLED': return 'default';
      default: return 'default';
    }
  };

  const leaves = data?.data || [];
  const total = data?.pagination?.total || 0;

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
          <Tabs value={tabValue} onChange={(_, v) => { setTabValue(v); setPage(0); }}>
            <Tab
              icon={<HourglassEmpty />}
              iconPosition="start"
              label="قيد المراجعة"
            />
            <Tab
              icon={<CheckCircle />}
              iconPosition="start"
              label="موافق عليها"
            />
            <Tab
              icon={<Cancel />}
              iconPosition="start"
              label="مرفوضة"
            />
          </Tabs>
        </Box>

        <CardContent>
          {isLoading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error">فشل تحميل البيانات</Alert>
          ) : (
            <>
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
                      <TableCell>تاريخ الطلب</TableCell>
                      <TableCell align="center">الإجراءات</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {leaves.map((leave) => (
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
                          <Chip
                            label={getTypeLabel(leave.type)}
                            size="small"
                            variant="outlined"
                          />
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
                            sx={{
                              maxWidth: 200,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {leave.reason}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={getStatusLabel(leave.status)}
                            color={getStatusColor(leave.status) as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {format(new Date(leave.createdAt), 'dd/MM/yyyy', { locale: ar })}
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="عرض التفاصيل">
                            <IconButton size="small" onClick={() => handleOpenDialog(leave)}>
                              <Visibility />
                            </IconButton>
                          </Tooltip>
                          {leave.status === 'PENDING' && (
                            <>
                              <Tooltip title="موافقة">
                                <IconButton
                                  size="small"
                                  color="success"
                                  onClick={() => approveMutation.mutate({ id: leave.id, notes: '' })}
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
                        </TableCell>
                      </TableRow>
                    ))}
                    {leaves.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} align="center">
                          <Typography color="text.secondary" py={4}>
                            لا توجد طلبات إجازات
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

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
            </>
          )}
        </CardContent>
      </Card>

      {/* Leave Details Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>تفاصيل طلب الإجازة</DialogTitle>
        <DialogContent>
          {selectedLeave && (
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.main' }}>
                      {selectedLeave.user.firstName?.[0]}
                    </Avatar>
                    <Box>
                      <Typography variant="h6">
                        {selectedLeave.user.firstName} {selectedLeave.user.lastName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {selectedLeave.user.jobTitle}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">نوع الإجازة</Typography>
                  <Typography>{getTypeLabel(selectedLeave.type)}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">الحالة</Typography>
                  <Box>
                    <Chip
                      label={getStatusLabel(selectedLeave.status)}
                      color={getStatusColor(selectedLeave.status) as any}
                      size="small"
                    />
                  </Box>
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

                {selectedLeave.status === 'PENDING' && (
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
          {selectedLeave?.status === 'PENDING' && (
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
    </Box>
  );
};
