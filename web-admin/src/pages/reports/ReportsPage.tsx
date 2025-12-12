import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  TextField,
  MenuItem,
  CircularProgress,
  Tab,
  Tabs,
} from '@mui/material';
import {
  PictureAsPdf,
  TableChart,
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
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { api } from '@/services/api.service';

const COLORS = ['#4caf50', '#ff9800', '#f44336', '#2196f3', '#9c27b0'];

export const ReportsPage = () => {
  const [tabValue, setTabValue] = useState(0);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const { isLoading } = useQuery({
    queryKey: ['reports-dashboard'],
    queryFn: () => api.get('/reports/dashboard'),
  });

  const monthlyData = [
    { name: 'يناير', attendance: 95, late: 5, absent: 2 },
    { name: 'فبراير', attendance: 92, late: 8, absent: 3 },
    { name: 'مارس', attendance: 94, late: 6, absent: 2 },
    { name: 'أبريل', attendance: 91, late: 9, absent: 4 },
    { name: 'مايو', attendance: 93, late: 7, absent: 3 },
    { name: 'يونيو', attendance: 96, late: 4, absent: 1 },
  ];

  const departmentData = [
    { name: 'تقنية المعلومات', value: 45 },
    { name: 'الموارد البشرية', value: 25 },
    { name: 'المالية', value: 15 },
    { name: 'التسويق', value: 10 },
    { name: 'أخرى', value: 5 },
  ];

  const weeklyTrend = [
    { day: 'السبت', present: 48, target: 50 },
    { day: 'الأحد', present: 49, target: 50 },
    { day: 'الإثنين', present: 47, target: 50 },
    { day: 'الثلاثاء', present: 46, target: 50 },
    { day: 'الأربعاء', present: 45, target: 50 },
    { day: 'الخميس', present: 42, target: 50 },
  ];

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            التقارير والإحصائيات
          </Typography>
          <Typography variant="body2" color="text.secondary">
            تقارير شاملة عن الحضور والانصراف
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<TableChart />}>
            تصدير Excel
          </Button>
          <Button variant="contained" startIcon={<PictureAsPdf />}>
            تصدير PDF
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                select
                label="الشهر"
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <MenuItem key={i + 1} value={i + 1}>
                    {new Date(2000, i).toLocaleDateString('ar', { month: 'long' })}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                select
                label="السنة"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              >
                {[2023, 2024, 2025].map((y) => (
                  <MenuItem key={y} value={y}>{y}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField fullWidth select label="الفرع" defaultValue="all">
                <MenuItem value="all">جميع الفروع</MenuItem>
                <MenuItem value="main">الفرع الرئيسي</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={3}>
              <Button variant="contained" fullWidth sx={{ height: 56 }}>
                عرض التقرير
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab label="نظرة عامة" />
          <Tab label="تقرير شهري" />
          <Tab label="تقرير الأقسام" />
          <Tab label="تقرير الموظفين" />
        </Tabs>
      </Box>

      {/* Charts */}
      <Grid container spacing={3}>
        {/* Monthly Attendance Chart */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                إحصائيات الحضور الشهرية
              </Typography>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="attendance" name="نسبة الحضور %" fill="#4caf50" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="late" name="التأخير %" fill="#ff9800" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="absent" name="الغياب %" fill="#f44336" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Department Distribution */}
        <Grid item xs={12} lg={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                توزيع الموظفين حسب القسم
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={departmentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {departmentData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Weekly Trend */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                اتجاه الحضور الأسبوعي
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={weeklyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="present"
                    name="الحضور الفعلي"
                    stroke="#4caf50"
                    strokeWidth={3}
                    dot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="target"
                    name="المستهدف"
                    stroke="#2196f3"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Summary Cards */}
        <Grid item xs={12} md={3}>
          <Card sx={{ bgcolor: 'success.light', color: 'white' }}>
            <CardContent>
              <Typography variant="h3" fontWeight="bold">94%</Typography>
              <Typography>متوسط الحضور</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ bgcolor: 'warning.light', color: 'white' }}>
            <CardContent>
              <Typography variant="h3" fontWeight="bold">6%</Typography>
              <Typography>نسبة التأخير</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ bgcolor: 'info.light', color: 'white' }}>
            <CardContent>
              <Typography variant="h3" fontWeight="bold">180</Typography>
              <Typography>ساعات العمل الإضافي</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ bgcolor: 'primary.light', color: 'white' }}>
            <CardContent>
              <Typography variant="h3" fontWeight="bold">25</Typography>
              <Typography>طلبات الإجازة</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
