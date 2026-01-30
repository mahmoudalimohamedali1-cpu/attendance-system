import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  InputAdornment,
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
  Grid,
  MenuItem,
  Button,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Divider,
} from '@mui/material';
import {
  Search,
  FileDownload,
  CalendarMonth,
  AccessTime,
  Login,
  Logout,
  Edit as EditIcon,
  TimerOff as OvertimeIcon,
  MoneyOff as DeductionIcon,
  Business as BranchIcon,
  Save as SaveIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { api } from '@/services/api.service';
import { formatTimeWithTimezone, formatDisplayDateWithTimezone, dayjs } from '@/utils/date.utils';

interface Attendance {
  id: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: string;
  lateMinutes: number;
  earlyDepartureMinutes?: number;
  overtimeMinutes?: number;
  workingMinutes: number;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    jobTitle: string;
    baseSalary?: number;
  };
  branch: {
    id: string;
    name: string;
    timezone: string;
  };
}

interface Branch {
  id: string;
  name: string;
}

interface AttendanceResponse {
  data: Attendance[];
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
}

interface PayrollSettings {
  gracePeriodMinutes: number;
  dailyWorkingHours: number;
  enableAttendancePenalty: boolean;
  overtimeMultiplier: number;
}

export const AttendancePage = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');

  // Edit Dialog State
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Attendance | null>(null);
  const [editCheckIn, setEditCheckIn] = useState('');
  const [editCheckOut, setEditCheckOut] = useState('');
  const [editReason, setEditReason] = useState('');

  // Snackbar State
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  // Fetch Branches
  const { data: branchesData } = useQuery<Branch[]>({
    queryKey: ['branches'],
    queryFn: () => api.get('/branches'),
  });

  // Fetch Payroll Settings
  const { data: payrollSettings } = useQuery<PayrollSettings>({
    queryKey: ['payroll-settings'],
    queryFn: async () => {
      try {
        return await api.get('/company-config/payroll-settings');
      } catch {
        // Return defaults if settings not found
        return {
          gracePeriodMinutes: 15,
          dailyWorkingHours: 8,
          enableAttendancePenalty: true,
          overtimeMultiplier: 1.5,
        };
      }
    },
  });

  // Fetch Attendance Data
  const { data, isLoading, error, refetch } = useQuery<AttendanceResponse>({
    queryKey: ['attendance', page, rowsPerPage, search, dateFilter, statusFilter, branchFilter],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page + 1),
        limit: String(rowsPerPage),
        search: search,
      });
      if (dateFilter) params.append('date', dateFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (branchFilter !== 'all') params.append('branchId', branchFilter);
      return api.get(`/attendance/admin/all?${params.toString()}`);
    },
  });

  // Update Attendance Mutation
  const updateAttendanceMutation = useMutation({
    mutationFn: async (data: { id: string; checkInTime?: string; checkOutTime?: string; reason: string }) => {
      return api.patch(`/attendance/${data.id}`, {
        checkInTime: data.checkInTime,
        checkOutTime: data.checkOutTime,
        correctionReason: data.reason,
      });
    },
    onSuccess: () => {
      setSnackbar({ open: true, message: 'تم تحديث سجل الحضور بنجاح', severity: 'success' });
      setEditDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
    onError: (error: any) => {
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'حدث خطأ في تحديث السجل',
        severity: 'error'
      });
    },
  });

  const branches = branchesData || [];

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PRESENT': return 'حاضر';
      case 'LATE': return 'متأخر';
      case 'EARLY_LEAVE': return 'انصراف مبكر';
      case 'LATE_AND_EARLY': return 'متأخر + مبكر';
      case 'ABSENT': return 'غائب';
      case 'ON_LEAVE': return 'إجازة';
      case 'WORK_FROM_HOME': return 'عمل من المنزل';
      case 'HOLIDAY': return '🎉 عطلة رسمية';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PRESENT': return 'success';
      case 'LATE': return 'warning';
      case 'EARLY_LEAVE': return 'info';
      case 'LATE_AND_EARLY': return 'error';
      case 'ABSENT': return 'error';
      case 'ON_LEAVE': return 'secondary';
      case 'WORK_FROM_HOME': return 'primary';
      case 'HOLIDAY': return 'warning';
      default: return 'default';
    }
  };

  const formatTime = (time: string | null, timezone?: string) => {
    return formatTimeWithTimezone(time, timezone);
  };

  const formatMinutes = (minutes: number) => {
    if (!minutes) return '-';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours} س ${mins} د` : `${mins} د`;
  };

  // Calculate expected deduction based on late minutes
  const calculateExpectedDeduction = (record: Attendance) => {
    if (!payrollSettings?.enableAttendancePenalty) return 0;

    const gracePeriod = payrollSettings?.gracePeriodMinutes || 15;
    const effectiveLateMinutes = Math.max(0, (record.lateMinutes || 0) - gracePeriod);

    if (effectiveLateMinutes <= 0) return 0;

    // Estimate hourly rate (basic salary / 30 days / 8 hours)
    const baseSalary = record.user?.baseSalary || 5000; // Default if not available
    const dailyHours = payrollSettings?.dailyWorkingHours || 8;
    const hourlyRate = baseSalary / 30 / dailyHours;

    return Math.round((effectiveLateMinutes / 60) * hourlyRate);
  };

  // Calculate overtime pay
  const calculateOvertimePay = (record: Attendance) => {
    const overtimeMinutes = record.overtimeMinutes || 0;
    if (overtimeMinutes <= 0) return 0;

    const baseSalary = record.user?.baseSalary || 5000;
    const dailyHours = payrollSettings?.dailyWorkingHours || 8;
    const hourlyRate = baseSalary / 30 / dailyHours;
    const multiplier = payrollSettings?.overtimeMultiplier || 1.5;

    return Math.round((overtimeMinutes / 60) * hourlyRate * multiplier);
  };

  const attendance = data?.data || [];
  const total = data?.pagination?.total || 0;

  // Enhanced Stats
  const todayStats = {
    present: attendance.filter(a => a.status === 'PRESENT').length,
    late: attendance.filter(a => a.status === 'LATE' || a.status === 'LATE_AND_EARLY').length,
    absent: attendance.filter(a => a.status === 'ABSENT').length,
    totalLateMinutes: attendance.reduce((sum, a) => sum + (a.lateMinutes || 0), 0),
    totalOvertimeMinutes: attendance.reduce((sum, a) => sum + (a.overtimeMinutes || 0), 0),
  };

  const exportToCSV = () => {
    if (!attendance.length) return;

    const headers = ['الموظف', 'التاريخ', 'الحضور', 'الانصراف', 'الحالة', 'التأخير (دقيقة)', 'الوقت الإضافي', 'ساعات العمل', 'الخصم المتوقع', 'الفرع'];
    const rows = attendance.map(a => [
      `${a.user?.firstName || ''} ${a.user?.lastName || ''}`,
      a.date ? format(new Date(a.date), 'yyyy-MM-dd') : '',
      a.checkInTime ? format(new Date(a.checkInTime), 'HH:mm') : '',
      a.checkOutTime ? format(new Date(a.checkOutTime), 'HH:mm') : '',
      getStatusLabel(a.status),
      a.lateMinutes || 0,
      a.overtimeMinutes || 0,
      Math.round((a.workingMinutes || 0) / 60 * 10) / 10,
      calculateExpectedDeduction(a),
      a.branch?.name || '',
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance_${dateFilter || 'all'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleOpenEdit = (record: Attendance) => {
    setEditingRecord(record);
    // Use branch timezone to display correct local time (same as shown in table)
    const tz = record.branch?.timezone || 'Asia/Riyadh';
    const checkInFormatted = record.checkInTime ? formatTimeWithTimezone(record.checkInTime, tz) : '';
    const checkOutFormatted = record.checkOutTime ? formatTimeWithTimezone(record.checkOutTime, tz) : '';

    // Debug logging
    console.log('🔧 Edit Dialog Debug:', {
      branchTimezone: record.branch?.timezone,
      usedTimezone: tz,
      rawCheckIn: record.checkInTime,
      formattedCheckIn: checkInFormatted,
      rawCheckOut: record.checkOutTime,
      formattedCheckOut: checkOutFormatted,
    });

    setEditCheckIn(checkInFormatted);
    setEditCheckOut(checkOutFormatted);
    setEditReason('');
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingRecord || !editReason.trim()) {
      setSnackbar({ open: true, message: 'يرجى إدخال سبب التعديل', severity: 'error' });
      return;
    }

    const dateStr = editingRecord.date.split('T')[0];
    const tz = editingRecord.branch?.timezone || 'Asia/Riyadh';

    // Convert local time (in branch timezone) to ISO string for backend
    // The backend will parse these as dates
    let checkInISO: string | undefined;
    let checkOutISO: string | undefined;

    if (editCheckIn) {
      // Parse the local time string and convert to UTC
      const localDateTime = dayjs.tz(`${dateStr} ${editCheckIn}`, tz);
      checkInISO = localDateTime.toISOString();
    }
    if (editCheckOut) {
      const localDateTime = dayjs.tz(`${dateStr} ${editCheckOut}`, tz);
      checkOutISO = localDateTime.toISOString();
    }

    updateAttendanceMutation.mutate({
      id: editingRecord.id,
      checkInTime: checkInISO,
      checkOutTime: checkOutISO,
      reason: editReason,
    });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            الحضور والانصراف
          </Typography>
          <Typography variant="body2" color="text.secondary">
            متابعة حضور وانصراف الموظفين مع الخصومات والوقت الإضافي
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Tooltip title="إعدادات الرواتب">
            <IconButton onClick={() => window.open('/payroll-settings', '_blank')}>
              <SettingsIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="تحديث">
            <IconButton onClick={() => refetch()}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button variant="contained" startIcon={<FileDownload />} onClick={exportToCSV}>
            تصدير التقرير
          </Button>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={3}>
          <Card sx={{ bgcolor: 'success.light', color: 'success.contrastText' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'success.main' }}>
                <Login />
              </Avatar>
              <Box>
                <Typography variant="h4" fontWeight="bold">{todayStats.present}</Typography>
                <Typography variant="body2">حاضرين</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card sx={{ bgcolor: 'warning.light', color: 'warning.contrastText' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'warning.main' }}>
                <AccessTime />
              </Avatar>
              <Box>
                <Typography variant="h4" fontWeight="bold">{todayStats.late}</Typography>
                <Typography variant="body2">متأخرين ({formatMinutes(todayStats.totalLateMinutes)})</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card sx={{ bgcolor: 'error.light', color: 'error.contrastText' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'error.main' }}>
                <Logout />
              </Avatar>
              <Box>
                <Typography variant="h4" fontWeight="bold">{todayStats.absent}</Typography>
                <Typography variant="body2">غائبين</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card sx={{ bgcolor: 'info.light', color: 'info.contrastText' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'info.main' }}>
                <OvertimeIcon />
              </Avatar>
              <Box>
                <Typography variant="h4" fontWeight="bold">{formatMinutes(todayStats.totalOvertimeMinutes)}</Typography>
                <Typography variant="body2">وقت إضافي</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          {/* Filters */}
          <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField
              placeholder="بحث عن موظف..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
              sx={{ width: 220 }}
            />
            <TextField
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <CalendarMonth />
                  </InputAdornment>
                ),
              }}
              sx={{ width: 180 }}
            />
            <TextField
              select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              sx={{ width: 160 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <BranchIcon />
                  </InputAdornment>
                ),
              }}
            >
              <MenuItem value="all">كل الفروع</MenuItem>
              {branches.map(branch => (
                <MenuItem key={branch.id} value={branch.id}>{branch.name}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              sx={{ width: 160 }}
            >
              <MenuItem value="all">كل الحالات</MenuItem>
              <MenuItem value="PRESENT">حاضر</MenuItem>
              <MenuItem value="LATE">متأخر</MenuItem>
              <MenuItem value="EARLY_LEAVE">انصراف مبكر</MenuItem>
              <MenuItem value="LATE_AND_EARLY">متأخر + مبكر</MenuItem>
              <MenuItem value="ABSENT">غائب</MenuItem>
              <MenuItem value="ON_LEAVE">إجازة</MenuItem>
              <MenuItem value="WORK_FROM_HOME">عمل من المنزل</MenuItem>
              <MenuItem value="HOLIDAY">🎉 عطلة رسمية</MenuItem>
            </TextField>
            <Button
              variant="outlined"
              startIcon={<FileDownload />}
              onClick={exportToCSV}
              disabled={!attendance.length}
            >
              تصدير CSV
            </Button>
          </Box>

          {isLoading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error">فشل تحميل البيانات</Alert>
          ) : (
            <>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>الموظف</TableCell>
                      <TableCell>التاريخ</TableCell>
                      <TableCell>الحضور</TableCell>
                      <TableCell>الانصراف</TableCell>
                      <TableCell>ساعات العمل</TableCell>
                      <TableCell>التأخير</TableCell>
                      <TableCell sx={{ color: 'info.main' }}>
                        <Tooltip title="الوقت الإضافي"><OvertimeIcon sx={{ fontSize: 18, mr: 0.5 }} /></Tooltip>
                        إضافي
                      </TableCell>
                      <TableCell sx={{ color: 'error.main' }}>
                        <Tooltip title="الخصم المتوقع"><DeductionIcon sx={{ fontSize: 18, mr: 0.5 }} /></Tooltip>
                        الخصم
                      </TableCell>
                      <TableCell>الحالة</TableCell>
                      <TableCell>الفرع</TableCell>
                      <TableCell align="center">إجراءات</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {attendance.map((record) => {
                      const expectedDeduction = calculateExpectedDeduction(record);
                      const overtimePay = calculateOvertimePay(record);

                      return (
                        <TableRow key={record.id} hover>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32, fontSize: 14 }}>
                                {record.user.firstName?.[0]}
                              </Avatar>
                              <Box>
                                <Typography variant="body2" fontWeight="bold">
                                  {record.user.firstName} {record.user.lastName}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {record.user.jobTitle}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {formatDisplayDateWithTimezone(record.date, record.branch?.timezone)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              icon={<Login />}
                              label={formatTime(record.checkInTime, record.branch?.timezone)}
                              size="small"
                              color={record.checkInTime ? 'success' : 'default'}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              icon={<Logout />}
                              label={formatTime(record.checkOutTime, record.branch?.timezone)}
                              size="small"
                              color={record.checkOutTime ? 'info' : 'default'}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>{formatMinutes(record.workingMinutes)}</TableCell>
                          <TableCell>
                            {record.lateMinutes > 0 ? (
                              <Chip
                                label={formatMinutes(record.lateMinutes)}
                                size="small"
                                color="warning"
                              />
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell>
                            {(record.overtimeMinutes || 0) > 0 ? (
                              <Tooltip title={`≈ ${overtimePay} ر.س`}>
                                <Chip
                                  label={formatMinutes(record.overtimeMinutes || 0)}
                                  size="small"
                                  color="info"
                                />
                              </Tooltip>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell>
                            {expectedDeduction > 0 ? (
                              <Chip
                                label={`${expectedDeduction} ر.س`}
                                size="small"
                                color="error"
                                variant="outlined"
                              />
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={getStatusLabel(record.status)}
                              color={getStatusColor(record.status) as any}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{record.branch?.name || '-'}</Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Tooltip title="تعديل الحضور">
                              <IconButton
                                size="small"
                                onClick={() => handleOpenEdit(record)}
                                color="primary"
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {attendance.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={11} align="center">
                          <Typography color="text.secondary" py={4}>
                            لا توجد بيانات
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

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <EditIcon color="primary" />
          تعديل سجل الحضور
        </DialogTitle>
        <DialogContent dividers>
          {editingRecord && (
            <Box>
              <Box display="flex" alignItems="center" gap={2} mb={3}>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  {editingRecord.user.firstName?.[0]}
                </Avatar>
                <Box>
                  <Typography fontWeight="bold">
                    {editingRecord.user.firstName} {editingRecord.user.lastName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {formatDisplayDateWithTimezone(editingRecord.date, editingRecord.branch?.timezone)}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="وقت الحضور"
                    type="time"
                    value={editCheckIn}
                    onChange={(e) => setEditCheckIn(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="وقت الانصراف"
                    type="time"
                    value={editCheckOut}
                    onChange={(e) => setEditCheckOut(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="سبب التعديل *"
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    multiline
                    rows={2}
                    placeholder="يجب إدخال سبب التعديل..."
                    required
                  />
                </Grid>
              </Grid>

              <Alert severity="info" sx={{ mt: 2 }}>
                سيتم تسجيل هذا التعديل في سجل المراجعة (Audit Log)
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleSaveEdit}
            disabled={updateAttendanceMutation.isPending || !editReason.trim()}
            startIcon={updateAttendanceMutation.isPending ? <CircularProgress size={20} /> : <SaveIcon />}
          >
            {updateAttendanceMutation.isPending ? 'جاري الحفظ...' : 'حفظ التعديلات'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};
