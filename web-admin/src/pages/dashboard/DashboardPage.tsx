import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  LinearProgress,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
} from '@mui/material';
import {
  People,
  AccessTime,
  Warning,
  CheckCircle,
  Schedule,
  PersonOff,
  HomeWork,
} from '@mui/icons-material';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { api } from '@/services/api.service';

interface DashboardStats {
  employees: { total: number; active: number };
  today: {
    present: number;
    late: number;
    earlyLeave: number;
    absent: number;
    workFromHome: number;
  };
  pendingLeaves: number;
}

export const DashboardPage = () => {
  const { data: stats, isLoading, error } = useQuery<DashboardStats>({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/reports/dashboard'),
    refetchInterval: 60000,
  });

  const { data: recentAttendance } = useQuery<{ data: Array<{ id: string; user: { firstName: string; lastName: string }; checkInTime: string | null; checkOutTime: string | null; status: string }> }>({
    queryKey: ['recent-attendance'],
    queryFn: () => api.get('/attendance/admin/all?limit=5'),
  });

  const { data: weeklyStatsData } = useQuery<{ data: Array<{ date: string; present: number; late: number; absent: number }> }>({
    queryKey: ['weekly-stats'],
    queryFn: () => api.get('/reports/weekly-summary'),
  });

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        فشل تحميل البيانات. تأكد من أن الخادم يعمل.
      </Alert>
    );
  }

  const dashboardStats = stats || {
    employees: { total: 0, active: 0 },
    today: { present: 0, late: 0, earlyLeave: 0, absent: 0, workFromHome: 0 },
    pendingLeaves: 0,
  };

  const pieData = [
    { name: 'حاضر', value: dashboardStats.today.present, color: '#4caf50' },
    { name: 'متأخر', value: dashboardStats.today.late, color: '#ff9800' },
    { name: 'غائب', value: dashboardStats.today.absent, color: '#f44336' },
    { name: 'من المنزل', value: dashboardStats.today.workFromHome, color: '#9c27b0' },
  ].filter(item => item.value > 0);

  // استخدام البيانات الأسبوعية الفعلية أو الافتراضية
  const weeklyData = weeklyStatsData?.data?.map(item => ({
    day: new Date(item.date).toLocaleDateString('ar-EG', { weekday: 'long' }),
    present: item.present || 0,
    late: item.late || 0,
    absent: item.absent || 0,
  })) || [
    { day: 'السبت', present: 0, late: 0, absent: 0 },
    { day: 'الأحد', present: 0, late: 0, absent: 0 },
    { day: 'الإثنين', present: 0, late: 0, absent: 0 },
    { day: 'الثلاثاء', present: 0, late: 0, absent: 0 },
    { day: 'الأربعاء', present: 0, late: 0, absent: 0 },
    { day: 'الخميس', present: 0, late: 0, absent: 0 },
  ];

  const statCards = [
    {
      title: 'إجمالي الموظفين',
      value: dashboardStats.employees.total,
      subtitle: `${dashboardStats.employees.active} نشط`,
      icon: <People />,
      color: '#1a237e',
      bgColor: '#e8eaf6',
    },
    {
      title: 'الحضور اليوم',
      value: dashboardStats.today.present,
      subtitle: 'موظف حاضر',
      icon: <CheckCircle />,
      color: '#2e7d32',
      bgColor: '#e8f5e9',
    },
    {
      title: 'المتأخرين',
      value: dashboardStats.today.late,
      subtitle: 'موظف متأخر',
      icon: <Schedule />,
      color: '#ed6c02',
      bgColor: '#fff3e0',
    },
    {
      title: 'الغياب',
      value: dashboardStats.today.absent,
      subtitle: 'موظف غائب',
      icon: <PersonOff />,
      color: '#d32f2f',
      bgColor: '#ffebee',
    },
    {
      title: 'عمل من المنزل',
      value: dashboardStats.today.workFromHome,
      subtitle: 'موظف',
      icon: <HomeWork />,
      color: '#7b1fa2',
      bgColor: '#f3e5f5',
    },
    {
      title: 'طلبات معلقة',
      value: dashboardStats.pendingLeaves,
      subtitle: 'إجازة قيد المراجعة',
      icon: <Warning />,
      color: '#0288d1',
      bgColor: '#e1f5fe',
    },
  ];

  const attendanceRate = dashboardStats.employees.total > 0
    ? Math.round((dashboardStats.today.present / dashboardStats.employees.total) * 100)
    : 0;

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        لوحة التحكم
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        مرحباً بك! هذه نظرة عامة على النظام اليوم
      </Typography>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statCards.map((card, index) => (
          <Grid item xs={12} sm={6} md={4} lg={2} key={index}>
            <Card sx={{ height: '100%', position: 'relative', overflow: 'visible' }}>
              <CardContent>
                <Box
                  sx={{
                    position: 'absolute',
                    top: -20,
                    right: 16,
                    width: 56,
                    height: 56,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: card.color,
                    color: 'white',
                    boxShadow: 3,
                  }}
                >
                  {card.icon}
                </Box>
                <Box sx={{ pt: 4 }}>
                  <Typography variant="h3" fontWeight="bold" color={card.color}>
                    {card.value}
                  </Typography>
                  <Typography variant="subtitle2" fontWeight="bold" sx={{ mt: 1 }}>
                    {card.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {card.subtitle}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* Attendance Rate */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                نسبة الحضور اليوم
              </Typography>
              <Box sx={{ position: 'relative', display: 'inline-flex', width: '100%', justifyContent: 'center', py: 2 }}>
                <CircularProgress
                  variant="determinate"
                  value={attendanceRate}
                  size={160}
                  thickness={8}
                  sx={{ color: attendanceRate >= 80 ? 'success.main' : attendanceRate >= 60 ? 'warning.main' : 'error.main' }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    top: 0,
                    left: 0,
                    bottom: 0,
                    right: 0,
                  }}
                >
                  <Typography variant="h3" fontWeight="bold">
                    {attendanceRate}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    من الموظفين
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">الحضور</Typography>
                  <Typography variant="body2" color="success.main">{dashboardStats.today.present}</Typography>
                </Box>
                <LinearProgress variant="determinate" value={attendanceRate} color="success" sx={{ mb: 2, height: 8, borderRadius: 4 }} />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">الغياب</Typography>
                  <Typography variant="body2" color="error.main">{dashboardStats.today.absent}</Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={dashboardStats.employees.total > 0 ? (dashboardStats.today.absent / dashboardStats.employees.total) * 100 : 0}
                  color="error"
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Pie Chart */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                توزيع الحضور
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, flexWrap: 'wrap' }}>
                {pieData.map((item, index) => (
                  <Chip
                    key={index}
                    label={item.name}
                    size="small"
                    sx={{ bgcolor: item.color, color: 'white' }}
                  />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                آخر النشاطات
              </Typography>
              <List sx={{ py: 0 }}>
                {recentAttendance?.data?.slice(0, 4).map((record, i) => (
                  <ListItem key={record.id || i} sx={{ px: 0 }}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: record.checkOutTime ? 'info.light' : 'success.light' }}>
                        <AccessTime />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={`${record.user?.firstName || 'موظف'} ${record.user?.lastName || ''}`}
                      secondary={
                        record.checkOutTime
                          ? `تسجيل انصراف - ${new Date(record.checkOutTime).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`
                          : record.checkInTime
                          ? `تسجيل حضور - ${new Date(record.checkInTime).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`
                          : 'لم يسجل بعد'
                      }
                    />
                  </ListItem>
                )) || (
                  <ListItem sx={{ px: 0 }}>
                    <ListItemText
                      primary="لا توجد نشاطات حديثة"
                      secondary="سيتم عرض النشاطات هنا"
                    />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Weekly Chart */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                إحصائيات الأسبوع
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="present" name="حاضر" fill="#4caf50" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="late" name="متأخر" fill="#ff9800" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="absent" name="غائب" fill="#f44336" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
