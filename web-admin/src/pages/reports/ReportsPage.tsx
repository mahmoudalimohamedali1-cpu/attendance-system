import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Avatar,
  Tab,
  Tabs,
} from '@mui/material';
import {
  PictureAsPdf,
  TableChart,
  Person,
  AccessTime,
  Warning,
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { api } from '@/services/api.service';
import { API_CONFIG } from '@/config/api';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/ar';

interface AttendanceRecord {
  id: string;
  userId: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: string;
  lateMinutes: number;
  workingMinutes: number;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
    jobTitle: string;
    department?: { name: string };
    branch?: { name: string };
  };
}

interface AttendanceReportResponse {
  data: AttendanceRecord[];
  stats: {
    totalDays: number;
    presentDays: number;
    lateDays: number;
    absentDays: number;
    onLeaveDays: number;
    totalWorkingMinutes: number;
    totalLateMinutes: number;
  };
}

export const ReportsPage = () => {
  const [tabValue, setTabValue] = useState(0);
  const [startDate, setStartDate] = useState<Dayjs | null>(() => {
    return dayjs().startOf('month');
  });
  const [endDate, setEndDate] = useState<Dayjs | null>(() => {
    return dayjs();
  });

  const startDateStr = startDate?.format('YYYY-MM-DD') || '';
  const endDateStr = endDate?.format('YYYY-MM-DD') || '';

  const { data: reportData, isLoading, error } = useQuery<AttendanceReportResponse>({
    queryKey: ['attendance-report', startDateStr, endDateStr],
    queryFn: () => api.get(`/reports/attendance?startDate=${startDateStr}&endDate=${endDateStr}`),
    enabled: !!startDateStr && !!endDateStr,
  });

  const handleExportExcel = async () => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/reports/export/excel/attendance?startDate=${startDateStr}&endDate=${endDateStr}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance-report-${startDateStr}-${endDateStr}.xlsx`;
      a.click();
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const handleExportPdf = async () => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/reports/export/pdf/attendance?startDate=${startDateStr}&endDate=${endDateStr}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance-report-${startDateStr}-${endDateStr}.pdf`;
      a.click();
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        فشل تحميل البيانات
      </Alert>
    );
  }

  const attendances = reportData?.data || [];
  const stats = reportData?.stats || {
    totalDays: 0,
    presentDays: 0,
    lateDays: 0,
    absentDays: 0,
    onLeaveDays: 0,
    totalWorkingMinutes: 0,
    totalLateMinutes: 0,
  };

  // Group by employee for pie chart
  const employeeStats: Record<string, { name: string; present: number; late: number; absent: number }> = {};
  attendances.forEach((att) => {
    const empId = att.userId;
    const empName = att.user ? `${att.user.firstName} ${att.user.lastName}` : 'غير معروف';
    if (!employeeStats[empId]) {
      employeeStats[empId] = { name: empName, present: 0, late: 0, absent: 0 };
    }
    if (att.status === 'PRESENT' || att.checkInTime) employeeStats[empId].present++;
    if (att.status === 'LATE') employeeStats[empId].late++;
    if (att.status === 'ABSENT') employeeStats[empId].absent++;
  });

  const pieData = [
    { name: 'حاضر', value: stats.presentDays, color: '#4caf50' },
    { name: 'متأخر', value: stats.lateDays, color: '#ff9800' },
    { name: 'غائب', value: stats.absentDays, color: '#f44336' },
    { name: 'إجازة', value: stats.onLeaveDays, color: '#2196f3' },
  ].filter(item => item.value > 0);

  // Group by date for bar chart
  const dateStats: Record<string, { date: string; present: number; late: number; absent: number }> = {};
  attendances.forEach((att) => {
    const dateStr = att.date.split('T')[0];
    if (!dateStats[dateStr]) {
      dateStats[dateStr] = { date: dateStr, present: 0, late: 0, absent: 0 };
    }
    if (att.status === 'PRESENT' || att.checkInTime) dateStats[dateStr].present++;
    if (att.status === 'LATE') dateStats[dateStr].late++;
    if (att.status === 'ABSENT') dateStats[dateStr].absent++;
  });
  const barChartData = Object.values(dateStats).sort((a, b) => a.date.localeCompare(b.date)).slice(-7);

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PRESENT': return 'حاضر';
      case 'LATE': return 'متأخر';
      case 'ABSENT': return 'غائب';
      case 'ON_LEAVE': return 'إجازة';
      case 'EARLY_LEAVE': return 'خروج مبكر';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PRESENT': return 'success';
      case 'LATE': return 'warning';
      case 'ABSENT': return 'error';
      case 'ON_LEAVE': return 'info';
      case 'EARLY_LEAVE': return 'secondary';
      default: return 'default';
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            التقارير والإحصائيات
          </Typography>
          <Typography variant="body2" color="text.secondary">
            تقارير الحضور حسب صلاحياتك ({attendances.length} سجل)
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<TableChart />} onClick={handleExportExcel}>
            تصدير Excel
          </Button>
          <Button variant="contained" startIcon={<PictureAsPdf />} onClick={handleExportPdf}>
            تصدير PDF
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ar">
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <DatePicker
                  label="من تاريخ"
                  value={startDate}
                  onChange={(newValue: any) => setStartDate(newValue)}
                  slotProps={{
                    textField: { fullWidth: true },
                    actionBar: { actions: ['clear', 'today'] }
                  }}
                  format="YYYY-MM-DD"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <DatePicker
                  label="إلى تاريخ"
                  value={endDate}
                  onChange={(newValue: any) => setEndDate(newValue)}
                  slotProps={{
                    textField: { fullWidth: true },
                    actionBar: { actions: ['clear', 'today'] }
                  }}
                  format="YYYY-MM-DD"
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="text.secondary">
                  يتم عرض التقارير حسب صلاحياتك
                </Typography>
              </Grid>
            </Grid>
          </LocalizationProvider>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <Card sx={{ bgcolor: 'success.light' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <Person sx={{ color: 'success.main' }} />
                <Box>
                  <Typography variant="h4" fontWeight="bold" color="success.main">{stats.presentDays}</Typography>
                  <Typography variant="body2">أيام الحضور</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card sx={{ bgcolor: 'warning.light' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <AccessTime sx={{ color: 'warning.main' }} />
                <Box>
                  <Typography variant="h4" fontWeight="bold" color="warning.main">{stats.lateDays}</Typography>
                  <Typography variant="body2">أيام التأخر</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card sx={{ bgcolor: 'error.light' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <Warning sx={{ color: 'error.main' }} />
                <Box>
                  <Typography variant="h4" fontWeight="bold" color="error.main">{stats.absentDays}</Typography>
                  <Typography variant="body2">أيام الغياب</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card sx={{ bgcolor: 'info.light' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <AccessTime sx={{ color: 'info.main' }} />
                <Box>
                  <Typography variant="h4" fontWeight="bold" color="info.main">{Math.round(stats.totalWorkingMinutes / 60)}</Typography>
                  <Typography variant="body2">ساعات العمل</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab label="نظرة عامة" />
          <Tab label="تفاصيل الحضور" />
        </Tabs>
      </Box>

      {tabValue === 0 && (
        <Grid container spacing={3}>
          {/* Bar Chart */}
          <Grid item xs={12} lg={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  إحصائيات الحضور (آخر 7 أيام)
                </Typography>
                {barChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={barChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tickFormatter={(d) => format(new Date(d), 'dd/MM', { locale: ar })} />
                      <YAxis />
                      <Tooltip labelFormatter={(d) => format(new Date(d), 'EEEE dd/MM', { locale: ar })} />
                      <Legend />
                      <Bar dataKey="present" name="حاضر" fill="#4caf50" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="late" name="متأخر" fill="#ff9800" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="absent" name="غائب" fill="#f44336" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Box display="flex" justifyContent="center" alignItems="center" height={350}>
                    <Typography color="text.secondary">لا توجد بيانات للعرض</Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Pie Chart */}
          <Grid item xs={12} lg={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  توزيع الحضور
                </Typography>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <Box display="flex" justifyContent="center" alignItems="center" height={300}>
                    <Typography color="text.secondary">لا توجد بيانات</Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tabValue === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              تفاصيل سجلات الحضور
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>الموظف</TableCell>
                    <TableCell>التاريخ</TableCell>
                    <TableCell>وقت الحضور</TableCell>
                    <TableCell>وقت الانصراف</TableCell>
                    <TableCell>الحالة</TableCell>
                    <TableCell>التأخير</TableCell>
                    <TableCell>ساعات العمل</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {attendances.slice(0, 50).map((att) => (
                    <TableRow key={att.id} hover>
                      <TableCell>
                        {att.user ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                              {att.user.firstName?.[0]}
                            </Avatar>
                            <Box>
                              <Typography fontWeight="bold" variant="body2">
                                {att.user.firstName} {att.user.lastName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {att.user.jobTitle}
                              </Typography>
                            </Box>
                          </Box>
                        ) : 'غير معروف'}
                      </TableCell>
                      <TableCell>{format(new Date(att.date), 'dd/MM/yyyy', { locale: ar })}</TableCell>
                      <TableCell>
                        {att.checkInTime ? format(new Date(att.checkInTime), 'HH:mm') : '-'}
                      </TableCell>
                      <TableCell>
                        {att.checkOutTime ? format(new Date(att.checkOutTime), 'HH:mm') : '-'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusLabel(att.status)}
                          color={getStatusColor(att.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {att.lateMinutes > 0 ? `${att.lateMinutes} دقيقة` : '-'}
                      </TableCell>
                      <TableCell>
                        {att.workingMinutes > 0 ? `${Math.round(att.workingMinutes / 60 * 10) / 10} ساعة` : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {attendances.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Typography color="text.secondary" py={4}>
                          لا توجد سجلات حضور في هذه الفترة
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            {attendances.length > 50 && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
                يتم عرض أول 50 سجل فقط. استخدم التصدير لرؤية جميع السجلات.
              </Typography>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
};
