/**
 * صفحة تقارير الرواتب المتقدمة
 * Advanced Payroll Reports Page
 */

import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Divider,
  IconButton,
  Tooltip,
  LinearProgress,
} from '@mui/material';
import {
  Assessment as ReportIcon,
  Download as DownloadIcon,
  TrendingUp as TrendIcon,
  AccountBalance as BankIcon,
  Business as DepartmentIcon,
  People as PeopleIcon,
  Security as GosiIcon,
  Refresh as RefreshIcon,
  PictureAsPdf as PdfIcon,
  TableChart as ExcelIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api.service';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
} from 'recharts';

// أنواع التقارير
const REPORT_TYPES = [
  {
    id: 'summary',
    title: 'تقرير ملخص الرواتب',
    description: 'ملخص شامل لجميع الرواتب والخصومات والبدلات',
    icon: <ReportIcon fontSize="large" />,
    color: '#4CAF50',
  },
  {
    id: 'detailed',
    title: 'التقرير التفصيلي',
    description: 'تفاصيل رواتب جميع الموظفين مع التفصيل الكامل',
    icon: <PeopleIcon fontSize="large" />,
    color: '#2196F3',
  },
  {
    id: 'departments',
    title: 'تحليل الأقسام',
    description: 'تحليل تكاليف الرواتب حسب الأقسام',
    icon: <DepartmentIcon fontSize="large" />,
    color: '#9C27B0',
  },
  {
    id: 'gosi',
    title: 'تقرير التأمينات',
    description: 'تقرير التأمينات الاجتماعية (GOSI) التفصيلي',
    icon: <GosiIcon fontSize="large" />,
    color: '#FF5722',
  },
  {
    id: 'bank-transfers',
    title: 'التحويلات البنكية',
    description: 'ملف التحويلات البنكية لجميع الموظفين',
    icon: <BankIcon fontSize="large" />,
    color: '#607D8B',
  },
  {
    id: 'trends',
    title: 'تحليل الاتجاهات',
    description: 'تحليل اتجاهات الرواتب عبر الفترات',
    icon: <TrendIcon fontSize="large" />,
    color: '#00BCD4',
  },
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function PayrollReportsPage() {
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  // جلب بيانات التقرير
  const { data: reportData, isLoading, refetch } = useQuery({
    queryKey: ['payroll-report', selectedReport, selectedYear, selectedMonth],
    queryFn: () => {
      if (!selectedReport) return null;
      return api.get(`/payroll-calculation/reports/${selectedReport}?year=${selectedYear}&month=${selectedMonth}`);
    },
    enabled: !!selectedReport,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const months = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];

  const renderReportContent = () => {
    if (!selectedReport || !reportData) return null;

    const data = reportData as any;

    switch (selectedReport) {
      case 'summary':
        return (
          <Box>
            {/* بطاقات الملخص */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} md={3}>
                <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
                  <CardContent>
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>إجمالي الرواتب</Typography>
                    <Typography variant="h5" fontWeight="bold">
                      {formatCurrency(data.totalGrossSalary || 0)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={3}>
                <Card sx={{ bgcolor: 'success.main', color: 'white' }}>
                  <CardContent>
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>صافي الرواتب</Typography>
                    <Typography variant="h5" fontWeight="bold">
                      {formatCurrency(data.totalNetSalary || 0)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={3}>
                <Card sx={{ bgcolor: 'warning.main', color: 'white' }}>
                  <CardContent>
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>إجمالي الخصومات</Typography>
                    <Typography variant="h5" fontWeight="bold">
                      {formatCurrency(data.totalDeductions || 0)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={3}>
                <Card sx={{ bgcolor: 'info.main', color: 'white' }}>
                  <CardContent>
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>عدد الموظفين</Typography>
                    <Typography variant="h5" fontWeight="bold">
                      {data.totalEmployees || 0}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* رسم بياني حسب القسم */}
            {data.byDepartment && data.byDepartment.length > 0 && (
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>توزيع الرواتب حسب الأقسام</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.byDepartment}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="departmentName" />
                    <YAxis />
                    <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="totalGross" name="الإجمالي" fill="#8884d8" />
                    <Bar dataKey="totalNet" name="الصافي" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            )}

            {/* جدول حسب القسم */}
            {data.byDepartment && (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.100' }}>
                      <TableCell>القسم</TableCell>
                      <TableCell align="center">عدد الموظفين</TableCell>
                      <TableCell align="right">الإجمالي</TableCell>
                      <TableCell align="right">الصافي</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.byDepartment.map((dept: any, index: number) => (
                      <TableRow key={index} hover>
                        <TableCell>{dept.departmentName}</TableCell>
                        <TableCell align="center">{dept.employeeCount}</TableCell>
                        <TableCell align="right">{formatCurrency(dept.totalGross)}</TableCell>
                        <TableCell align="right">{formatCurrency(dept.totalNet)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        );

      case 'detailed':
        return (
          <Box>
            {/* جدول تفصيلي للموظفين */}
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>تفاصيل رواتب الموظفين</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.100' }}>
                      <TableCell>كود الموظف</TableCell>
                      <TableCell>اسم الموظف</TableCell>
                      <TableCell>القسم</TableCell>
                      <TableCell align="right">الراتب الأساسي</TableCell>
                      <TableCell align="right">البدلات</TableCell>
                      <TableCell align="right">الخصومات</TableCell>
                      <TableCell align="right">الصافي</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.employees?.map((emp: any, index: number) => (
                      <TableRow key={index} hover>
                        <TableCell>{emp.employeeCode}</TableCell>
                        <TableCell>{emp.employeeName}</TableCell>
                        <TableCell>{emp.department}</TableCell>
                        <TableCell align="right">{formatCurrency(emp.basicSalary || 0)}</TableCell>
                        <TableCell align="right" sx={{ color: 'success.main' }}>
                          {formatCurrency(emp.totalAllowances || 0)}
                        </TableCell>
                        <TableCell align="right" sx={{ color: 'error.main' }}>
                          {formatCurrency(emp.totalDeductions || 0)}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                          {formatCurrency(emp.netSalary || 0)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!data.employees || data.employees.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={7} align="center">
                          <Typography color="text.secondary" sx={{ py: 4 }}>
                            لا توجد بيانات للفترة المحددة
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Box>
        );

      case 'departments':
        return (
          <Box>
            {/* رسم دائري */}
            {data.departments && data.departments.length > 0 && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>توزيع التكاليف</Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={data.departments}
                          dataKey="totalCost"
                          nameKey="departmentName"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        >
                          {data.departments.map((_: any, index: number) => (
                            <Cell key={index} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>مقارنة الأقسام</Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {data.departments.map((dept: any, index: number) => (
                        <Box key={index}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="body2">{dept.departmentName}</Typography>
                            <Typography variant="body2" fontWeight="bold">
                              {formatCurrency(dept.totalCost)}
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={(dept.totalCost / data.totals.totalCost) * 100}
                            sx={{
                              height: 10,
                              borderRadius: 5,
                              bgcolor: 'grey.200',
                              '& .MuiLinearProgress-bar': {
                                bgcolor: COLORS[index % COLORS.length],
                              },
                            }}
                          />
                        </Box>
                      ))}
                    </Box>
                  </Paper>
                </Grid>
              </Grid>
            )}

            {/* جدول تفصيلي */}
            {data.departments && (
              <TableContainer component={Paper} sx={{ mt: 3 }}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.100' }}>
                      <TableCell>القسم</TableCell>
                      <TableCell align="center">الموظفين</TableCell>
                      <TableCell align="right">الأساسي</TableCell>
                      <TableCell align="right">البدلات</TableCell>
                      <TableCell align="right">الخصومات</TableCell>
                      <TableCell align="right">التأمينات</TableCell>
                      <TableCell align="right">الإجمالي</TableCell>
                      <TableCell align="right">المتوسط</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.departments.map((dept: any, index: number) => (
                      <TableRow key={index} hover>
                        <TableCell>{dept.departmentName}</TableCell>
                        <TableCell align="center">{dept.totalEmployees}</TableCell>
                        <TableCell align="right">{formatCurrency(dept.basicSalaryTotal)}</TableCell>
                        <TableCell align="right">{formatCurrency(dept.allowancesTotal)}</TableCell>
                        <TableCell align="right" sx={{ color: 'error.main' }}>
                          -{formatCurrency(dept.deductionsTotal)}
                        </TableCell>
                        <TableCell align="right">{formatCurrency(dept.gosiTotal)}</TableCell>
                        <TableCell align="right" fontWeight="bold">
                          {formatCurrency(dept.totalCost)}
                        </TableCell>
                        <TableCell align="right">{formatCurrency(dept.avgCostPerEmployee)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell><strong>الإجمالي</strong></TableCell>
                      <TableCell align="center"><strong>{data.totals?.totalEmployees}</strong></TableCell>
                      <TableCell colSpan={4}></TableCell>
                      <TableCell align="right">
                        <strong>{formatCurrency(data.totals?.totalCost || 0)}</strong>
                      </TableCell>
                      <TableCell align="right">
                        <strong>{formatCurrency(data.totals?.avgCostPerEmployee || 0)}</strong>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        );

      case 'gosi':
        return (
          <Box>
            {/* ملخص التأمينات */}
            {data.summary && (
              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} md={4}>
                  <Card sx={{ bgcolor: 'success.light' }}>
                    <CardContent>
                      <Typography variant="body2">موظفين سعوديين</Typography>
                      <Typography variant="h4" fontWeight="bold">
                        {data.summary.totalSaudiEmployees}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Card sx={{ bgcolor: 'info.light' }}>
                    <CardContent>
                      <Typography variant="body2">موظفين غير سعوديين</Typography>
                      <Typography variant="h4" fontWeight="bold">
                        {data.summary.totalNonSaudiEmployees}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Card sx={{ bgcolor: 'warning.light' }}>
                    <CardContent>
                      <Typography variant="body2">إجمالي الاشتراكات</Typography>
                      <Typography variant="h4" fontWeight="bold">
                        {formatCurrency(data.summary.grandTotal)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}

            {/* تفاصيل الاشتراكات */}
            {data.summary && (
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>تفاصيل الاشتراكات</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6} md={3}>
                    <Typography color="text.secondary">حصة الموظفين</Typography>
                    <Typography variant="h6" color="error.main">
                      {formatCurrency(data.summary.totalEmployeeContribution)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography color="text.secondary">حصة الشركة</Typography>
                    <Typography variant="h6" color="primary.main">
                      {formatCurrency(data.summary.totalEmployerContribution)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography color="text.secondary">ساند</Typography>
                    <Typography variant="h6">
                      {formatCurrency(data.summary.totalSanedContribution)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography color="text.secondary">الأخطار المهنية</Typography>
                    <Typography variant="h6">
                      {formatCurrency(data.summary.totalHazardContribution)}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            )}

            {/* جدول الموظفين */}
            {data.employees && (
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.100' }}>
                      <TableCell>الموظف</TableCell>
                      <TableCell>الهوية</TableCell>
                      <TableCell align="center">الجنسية</TableCell>
                      <TableCell align="right">الراتب الخاضع</TableCell>
                      <TableCell align="right">حصة الموظف</TableCell>
                      <TableCell align="right">حصة الشركة</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.employees.map((emp: any, index: number) => (
                      <TableRow key={index} hover>
                        <TableCell>{emp.employeeName}</TableCell>
                        <TableCell>{emp.nationalId || '-'}</TableCell>
                        <TableCell align="center">
                          <Chip
                            label={emp.isSaudi ? 'سعودي' : 'غير سعودي'}
                            size="small"
                            color={emp.isSaudi ? 'success' : 'default'}
                          />
                        </TableCell>
                        <TableCell align="right">{formatCurrency(emp.gosiEligibleSalary)}</TableCell>
                        <TableCell align="right" sx={{ color: 'error.main' }}>
                          -{formatCurrency(emp.employeeContribution)}
                        </TableCell>
                        <TableCell align="right">{formatCurrency(emp.employerContribution)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        );

      case 'bank-transfers':
        return (
          <Box>
            {/* ملخص التحويلات */}
            {data.summary && (
              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">عدد التحويلات</Typography>
                      <Typography variant="h4" fontWeight="bold">
                        {data.summary.totalTransfers}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">إجمالي المبلغ</Typography>
                      <Typography variant="h4" fontWeight="bold" color="success.main">
                        {formatCurrency(data.summary.totalAmount)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">عدد البنوك</Typography>
                      <Typography variant="h4" fontWeight="bold">
                        {data.summary.byBank?.length || 0}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}

            {/* توزيع حسب البنك */}
            {data.summary?.byBank && (
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>التوزيع حسب البنك</Typography>
                <Grid container spacing={2}>
                  {data.summary.byBank.map((bank: any, index: number) => (
                    <Grid item xs={12} md={4} key={index}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="subtitle1" fontWeight="bold">{bank.bankName}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {bank.count} تحويل
                          </Typography>
                          <Typography variant="h6" color="primary.main">
                            {formatCurrency(bank.amount)}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            )}

            {/* جدول التحويلات */}
            {data.transfers && (
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.100' }}>
                      <TableCell>رقم الموظف</TableCell>
                      <TableCell>الاسم</TableCell>
                      <TableCell>البنك</TableCell>
                      <TableCell>رقم الحساب</TableCell>
                      <TableCell>IBAN</TableCell>
                      <TableCell align="right">المبلغ</TableCell>
                      <TableCell>المرجع</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.transfers.map((transfer: any, index: number) => (
                      <TableRow key={index} hover>
                        <TableCell>{transfer.employeeCode}</TableCell>
                        <TableCell>{transfer.employeeName}</TableCell>
                        <TableCell>{transfer.bankName}</TableCell>
                        <TableCell>{transfer.accountNumber}</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                          {transfer.iban}
                        </TableCell>
                        <TableCell align="right" fontWeight="bold">
                          {formatCurrency(transfer.amount)}
                        </TableCell>
                        <TableCell>{transfer.reference}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        );

      case 'trends':
        return (
          <Box>
            {/* رسم بياني للاتجاهات */}
            {data.monthlyData && data.monthlyData.length > 0 && (
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>اتجاه الرواتب عبر الأشهر</Typography>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={data.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="totalGross"
                      name="الإجمالي"
                      stroke="#8884d8"
                      fill="#8884d8"
                      fillOpacity={0.3}
                    />
                    <Area
                      type="monotone"
                      dataKey="totalNet"
                      name="الصافي"
                      stroke="#82ca9d"
                      fill="#82ca9d"
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Paper>
            )}

            {/* معدلات النمو */}
            {data.trends && (
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} md={3}>
                  <Card>
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">نمو الرواتب</Typography>
                      <Typography
                        variant="h5"
                        fontWeight="bold"
                        color={data.trends.payrollGrowthRate >= 0 ? 'success.main' : 'error.main'}
                      >
                        {data.trends.payrollGrowthRate >= 0 ? '+' : ''}
                        {data.trends.payrollGrowthRate.toFixed(1)}%
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Card>
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">نمو الموظفين</Typography>
                      <Typography
                        variant="h5"
                        fontWeight="bold"
                        color={data.trends.headcountGrowthRate >= 0 ? 'success.main' : 'error.main'}
                      >
                        {data.trends.headcountGrowthRate >= 0 ? '+' : ''}
                        {data.trends.headcountGrowthRate.toFixed(1)}%
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Card>
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">نمو المتوسط</Typography>
                      <Typography
                        variant="h5"
                        fontWeight="bold"
                        color={data.trends.avgSalaryGrowthRate >= 0 ? 'success.main' : 'error.main'}
                      >
                        {data.trends.avgSalaryGrowthRate >= 0 ? '+' : ''}
                        {data.trends.avgSalaryGrowthRate.toFixed(1)}%
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Card>
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">التقدير السنوي</Typography>
                      <Typography variant="h5" fontWeight="bold" color="primary.main">
                        {formatCurrency(data.predictions?.yearEndEstimate || 0)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}
          </Box>
        );

      default:
        return <Alert severity="info">اختر نوع التقرير لعرض البيانات</Alert>;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* العنوان */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" color="primary">
            <ReportIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            تقارير الرواتب المتقدمة
          </Typography>
          <Typography variant="body2" color="text.secondary">
            تقارير شاملة وتحليلات متقدمة لبيانات الرواتب
          </Typography>
        </Box>
      </Box>

      {/* اختيار نوع التقرير */}
      {!selectedReport && (
        <Grid container spacing={3}>
          {REPORT_TYPES.map((report) => (
            <Grid item xs={12} sm={6} md={4} key={report.id}>
              <Card
                sx={{
                  height: '100%',
                  transition: 'all 0.3s',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: 6,
                  },
                }}
              >
                <CardActionArea
                  onClick={() => setSelectedReport(report.id)}
                  sx={{ height: '100%', p: 2 }}
                >
                  <CardContent>
                    <Box
                      sx={{
                        width: 60,
                        height: 60,
                        borderRadius: '50%',
                        bgcolor: report.color,
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 2,
                      }}
                    >
                      {report.icon}
                    </Box>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      {report.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {report.description}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* عرض التقرير */}
      {selectedReport && (
        <Box>
          {/* شريط التحكم */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item>
                <Button
                  variant="outlined"
                  onClick={() => setSelectedReport(null)}
                >
                  ← العودة
                </Button>
              </Grid>
              <Grid item xs>
                <Typography variant="h6">
                  {REPORT_TYPES.find(r => r.id === selectedReport)?.title}
                </Typography>
              </Grid>
              <Grid item>
                <FormControl size="small" sx={{ minWidth: 100, mr: 1 }}>
                  <InputLabel>السنة</InputLabel>
                  <Select
                    value={selectedYear}
                    label="السنة"
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                  >
                    {[2024, 2025, 2026].map(year => (
                      <MenuItem key={year} value={year}>{year}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 120, mr: 1 }}>
                  <InputLabel>الشهر</InputLabel>
                  <Select
                    value={selectedMonth}
                    label="الشهر"
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  >
                    {months.map((month, index) => (
                      <MenuItem key={index} value={index + 1}>{month}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item>
                <Tooltip title="تحديث">
                  <IconButton onClick={() => refetch()} color="primary">
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="تصدير PDF">
                  <IconButton color="error">
                    <PdfIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="تصدير Excel">
                  <IconButton color="success">
                    <ExcelIcon />
                  </IconButton>
                </Tooltip>
              </Grid>
            </Grid>
          </Paper>

          {/* محتوى التقرير */}
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress size={60} />
            </Box>
          ) : reportData ? (
            renderReportContent()
          ) : (
            <Alert severity="warning">
              لا توجد بيانات للفترة المحددة
            </Alert>
          )}
        </Box>
      )}
    </Box>
  );
}
