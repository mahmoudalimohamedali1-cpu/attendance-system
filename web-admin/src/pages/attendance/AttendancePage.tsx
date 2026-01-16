import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
} from '@mui/material';
import {
  Search,
  FileDownload,
  CalendarMonth,
  AccessTime,
  Login,
  Logout,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { api } from '@/services/api.service';

interface Attendance {
  id: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: string;
  lateMinutes: number;
  workingMinutes: number;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    jobTitle: string;
  };
  branch: {
    name: string;
  };
}

interface AttendanceResponse {
  data: Attendance[];
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
}

export const AttendancePage = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState(''); // Empty = all dates
  const [statusFilter, setStatusFilter] = useState('all');

  const { data, isLoading, error } = useQuery<AttendanceResponse>({
    queryKey: ['attendance', page, rowsPerPage, search, dateFilter, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page + 1),
        limit: String(rowsPerPage),
        search: search,
      });
      if (dateFilter) params.append('date', dateFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      return api.get(`/attendance/admin/all?${params.toString()}`);
    },
  });

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PRESENT': return 'حاضر';
      case 'LATE': return 'متأخر';
      case 'EARLY_LEAVE': return 'انصراف مبكر';
      case 'LATE_AND_EARLY': return 'متأخر + مبكر';
      case 'ABSENT': return 'غائب';
      case 'ON_LEAVE': return 'إجازة';
      case 'WORK_FROM_HOME': return 'عمل من المنزل';
      case 'HOLIDAY': return '🎉 عطلة رسمية'; // NEW: Working on holiday
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
      case 'HOLIDAY': return 'warning'; // Gold/yellow for holiday
      default: return 'default';
    }
  };

  // Issue #62: Handle null, empty string, and invalid dates
  const formatTime = (time: string | null) => {
    if (!time || time === '') return '-';
    try {
      const date = new Date(time);
      if (isNaN(date.getTime())) return '-'; // Invalid date
      return format(date, 'hh:mm a', { locale: ar });
    } catch {
      return '-';
    }
  };

  const formatMinutes = (minutes: number) => {
    if (!minutes) return '-';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours} س ${mins} د` : `${mins} د`;
  };

  const attendance = data?.data || [];
  const total = data?.pagination?.total || 0;

  const todayStats = {
    present: attendance.filter(a => a.status === 'PRESENT').length,
    late: attendance.filter(a => a.status === 'LATE').length,
    absent: attendance.filter(a => a.status === 'ABSENT').length,
  };

  // Issue #57: Export attendance data to CSV
  const exportToCSV = () => {
    if (!attendance.length) return;

    const headers = ['الموظف', 'التاريخ', 'الحضور', 'الانصراف', 'الحالة', 'التأخير (دقيقة)', 'ساعات العمل'];
    const rows = attendance.map(a => [
      `${a.user?.firstName || ''} ${a.user?.lastName || ''}`,
      a.date ? format(new Date(a.date), 'yyyy-MM-dd') : '',
      a.checkInTime ? format(new Date(a.checkInTime), 'HH:mm') : '',
      a.checkOutTime ? format(new Date(a.checkOutTime), 'HH:mm') : '',
      getStatusLabel(a.status),
      a.lateMinutes || 0,
      Math.round((a.workingMinutes || 0) / 60 * 10) / 10,
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

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            الحضور والانصراف
          </Typography>
          <Typography variant="body2" color="text.secondary">
            متابعة حضور وانصراف الموظفين
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<FileDownload />}>
          تصدير التقرير
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: 'success.light', color: 'success.contrastText' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'success.main' }}>
                <Login />
              </Avatar>
              <Box>
                <Typography variant="h4" fontWeight="bold">{todayStats.present}</Typography>
                <Typography variant="body2">حاضرين اليوم</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: 'warning.light', color: 'warning.contrastText' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'warning.main' }}>
                <AccessTime />
              </Avatar>
              <Box>
                <Typography variant="h4" fontWeight="bold">{todayStats.late}</Typography>
                <Typography variant="body2">متأخرين</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
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
              sx={{ width: 250 }}
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
              sx={{ width: 200 }}
            />
            <TextField
              select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              sx={{ width: 180 }}
            >
              <MenuItem value="all">جميع الحالات</MenuItem>
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
              sx={{ height: 40 }}
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
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>الموظف</TableCell>
                      <TableCell>التاريخ</TableCell>
                      <TableCell>وقت الحضور</TableCell>
                      <TableCell>وقت الانصراف</TableCell>
                      <TableCell>ساعات العمل</TableCell>
                      <TableCell>التأخير</TableCell>
                      <TableCell>الحالة</TableCell>
                      <TableCell>الفرع</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {attendance.map((record) => (
                      <TableRow key={record.id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar sx={{ bgcolor: 'primary.main' }}>
                              {record.user.firstName?.[0]}
                            </Avatar>
                            <Box>
                              <Typography fontWeight="bold">
                                {record.user.firstName} {record.user.lastName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {record.user.jobTitle}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          {format(new Date(record.date), 'dd/MM/yyyy', { locale: ar })}
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={<Login />}
                            label={formatTime(record.checkInTime)}
                            size="small"
                            color={record.checkInTime ? 'success' : 'default'}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={<Logout />}
                            label={formatTime(record.checkOutTime)}
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
                          <Chip
                            label={getStatusLabel(record.status)}
                            color={getStatusColor(record.status) as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{record.branch?.name || '-'}</TableCell>
                      </TableRow>
                    ))}
                    {attendance.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} align="center">
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
    </Box>
  );
};
