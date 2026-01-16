/**
 * صفحة إدارة البدلات المتقدمة
 * Allowance Management Page
 */

import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tab,
  Tabs,
  Alert,
  CircularProgress,
  Switch,
  FormControlLabel,
  InputAdornment,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Category as CategoryIcon,
  Home as HousingIcon,
  DirectionsCar as TransportIcon,
  LocalPhone as PhoneIcon,
  School as EducationIcon,
  HealthAndSafety as HealthIcon,
  Work as WorkIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api.service';
import toast from 'react-hot-toast';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#ffc658', '#8dd1e1'];

// أنواع البدلات
const ALLOWANCE_TYPES = [
  { value: 'HOUSING', label: 'بدل سكن', icon: <HousingIcon />, color: '#4CAF50' },
  { value: 'TRANSPORT', label: 'بدل نقل', icon: <TransportIcon />, color: '#2196F3' },
  { value: 'PHONE', label: 'بدل هاتف', icon: <PhoneIcon />, color: '#FF9800' },
  { value: 'EDUCATION', label: 'بدل تعليم', icon: <EducationIcon />, color: '#9C27B0' },
  { value: 'HEALTH', label: 'بدل صحي', icon: <HealthIcon />, color: '#E91E63' },
  { value: 'WORK_NATURE', label: 'بدل طبيعة عمل', icon: <WorkIcon />, color: '#00BCD4' },
  { value: 'TECHNICAL', label: 'بدل فني', icon: <SettingsIcon />, color: '#607D8B' },
  { value: 'CUSTOM', label: 'بدل مخصص', icon: <CategoryIcon />, color: '#795548' },
];

// طرق الحساب
const CALCULATION_METHODS = [
  { value: 'FIXED', label: 'مبلغ ثابت' },
  { value: 'PERCENTAGE', label: 'نسبة من الراتب' },
  { value: 'FORMULA', label: 'معادلة مخصصة' },
];

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export default function AllowanceManagementPage() {
  const [tabValue, setTabValue] = useState(0);
  const [openDefinitionDialog, setOpenDefinitionDialog] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const queryClient = useQueryClient();

  // جلب تعريفات البدلات
  const { data: definitions, isLoading: loadingDefinitions } = useQuery({
    queryKey: ['allowance-definitions'],
    queryFn: () => api.get('/payroll-calculation/allowances/definitions'),
  });

  // جلب ملخص البدلات
  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['allowance-summary', selectedYear, selectedMonth],
    queryFn: () => api.get(`/payroll-calculation/allowances/summary?year=${selectedYear}&month=${selectedMonth}`),
  });

  // إنشاء تعريف بدل جديد
  const createDefinitionMutation = useMutation({
    mutationFn: (data: any) => api.post('/payroll-calculation/allowances/definitions', data),
    onSuccess: () => {
      toast.success('تم إنشاء تعريف البدل');
      queryClient.invalidateQueries({ queryKey: ['allowance-definitions'] });
      setOpenDefinitionDialog(false);
    },
    onError: () => toast.error('حدث خطأ أثناء الإنشاء'),
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getAllowanceTypeInfo = (type: string) => {
    return ALLOWANCE_TYPES.find(t => t.value === type) || ALLOWANCE_TYPES[ALLOWANCE_TYPES.length - 1];
  };

  const summaryData = summary as any;
  const months = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];

  // تحويل بيانات الملخص للرسم البياني
  const chartData = summaryData?.byType?.map((item: any, index: number) => ({
    name: item.name,
    value: item.total,
    color: COLORS[index % COLORS.length],
  })) || [];

  return (
    <Box sx={{ p: 3 }}>
      {/* العنوان */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" color="primary">
            <CategoryIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            إدارة البدلات
          </Typography>
          <Typography variant="body2" color="text.secondary">
            تعريف وإدارة بدلات الموظفين
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDefinitionDialog(true)}
        >
          تعريف بدل جديد
        </Button>
      </Box>

      {/* بطاقات الإحصائيات */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
            <CardContent>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>إجمالي البدلات</Typography>
              <Typography variant="h4" fontWeight="bold">
                {summaryData?.grandTotal ? formatCurrency(summaryData.grandTotal) : '0 ر.س'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', color: 'white' }}>
            <CardContent>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>عدد الموظفين</Typography>
              <Typography variant="h4" fontWeight="bold">
                {summaryData?.employeeCount || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
            <CardContent>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>متوسط البدلات</Typography>
              <Typography variant="h4" fontWeight="bold">
                {summaryData?.averagePerEmployee ? formatCurrency(summaryData.averagePerEmployee) : '0 ر.س'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
            <CardContent>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>أنواع البدلات</Typography>
              <Typography variant="h4" fontWeight="bold">
                {(definitions as any[])?.length || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* التبويبات */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab label="تعريفات البدلات" />
          <Tab label="ملخص الفترة" />
          <Tab label="التحليل البياني" />
        </Tabs>
      </Paper>

      {/* تعريفات البدلات */}
      <TabPanel value={tabValue} index={0}>
        {loadingDefinitions ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3}>
            {(definitions as any[])?.map((definition: any) => {
              const metadata = definition.metadata || {};
              const typeInfo = getAllowanceTypeInfo(metadata.allowanceType);
              
              return (
                <Grid item xs={12} sm={6} md={4} key={definition.id}>
                  <Card
                    sx={{
                      height: '100%',
                      borderTop: `4px solid ${typeInfo.color}`,
                      transition: 'all 0.3s',
                      '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 },
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <Box
                          sx={{
                            p: 1,
                            borderRadius: 1,
                            bgcolor: `${typeInfo.color}20`,
                            color: typeInfo.color,
                          }}
                        >
                          {typeInfo.icon}
                        </Box>
                        <Box>
                          <Typography variant="h6" fontWeight="bold">
                            {definition.nameAr}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {definition.code}
                          </Typography>
                        </Box>
                      </Box>
                      
                      <Divider sx={{ my: 2 }} />
                      
                      <Grid container spacing={1}>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">طريقة الحساب</Typography>
                          <Chip
                            label={CALCULATION_METHODS.find(m => m.value === metadata.calculationMethod)?.label || 'ثابت'}
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">القيمة</Typography>
                          <Typography fontWeight="bold">
                            {metadata.fixedAmount 
                              ? formatCurrency(metadata.fixedAmount)
                              : metadata.percentage 
                                ? `${metadata.percentage}%`
                                : '-'}
                          </Typography>
                        </Grid>
                      </Grid>
                      
                      <Box sx={{ mt: 2, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {definition.gosiEligible && (
                          <Chip label="GOSI" size="small" color="success" variant="outlined" />
                        )}
                        {definition.eosEligible && (
                          <Chip label="EOS" size="small" color="info" variant="outlined" />
                        )}
                        {definition.taxable && (
                          <Chip label="ضريبة" size="small" color="warning" variant="outlined" />
                        )}
                        {definition.isProrated && (
                          <Chip label="نسبي" size="small" variant="outlined" />
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
            
            {(!definitions || (definitions as any[]).length === 0) && (
              <Grid item xs={12}>
                <Alert severity="info">
                  لا توجد تعريفات بدلات. اضغط على "تعريف بدل جديد" لإنشاء تعريف.
                </Alert>
              </Grid>
            )}
          </Grid>
        )}
      </TabPanel>

      {/* ملخص الفترة */}
      <TabPanel value={tabValue} index={1}>
        <Paper sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item>
              <Typography variant="h6">اختر الفترة:</Typography>
            </Grid>
            <Grid item>
              <FormControl size="small" sx={{ minWidth: 100 }}>
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
            </Grid>
            <Grid item>
              <FormControl size="small" sx={{ minWidth: 120 }}>
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
          </Grid>
        </Paper>

        {loadingSummary ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.100' }}>
                  <TableCell>نوع البدل</TableCell>
                  <TableCell align="center">عدد الموظفين</TableCell>
                  <TableCell align="right">الإجمالي</TableCell>
                  <TableCell align="right">المتوسط</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {summaryData?.byType?.map((item: any) => (
                  <TableRow key={item.code} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getAllowanceTypeInfo(item.code.replace('ALW_', '')).icon}
                        <Typography fontWeight="medium">{item.name}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">{item.employeeCount}</TableCell>
                    <TableCell align="right">
                      <Typography fontWeight="bold" color="success.main">
                        {formatCurrency(item.total)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(item.employeeCount > 0 ? item.total / item.employeeCount : 0)}
                    </TableCell>
                  </TableRow>
                ))}
                
                {(!summaryData?.byType || summaryData.byType.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      <Typography color="text.secondary" sx={{ py: 4 }}>
                        لا توجد بيانات للفترة المحددة
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
                
                {summaryData?.byType && summaryData.byType.length > 0 && (
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell><strong>الإجمالي</strong></TableCell>
                    <TableCell align="center"><strong>{summaryData.employeeCount}</strong></TableCell>
                    <TableCell align="right">
                      <strong>{formatCurrency(summaryData.grandTotal)}</strong>
                    </TableCell>
                    <TableCell align="right">
                      <strong>{formatCurrency(summaryData.averagePerEmployee)}</strong>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </TabPanel>

      {/* التحليل البياني */}
      <TabPanel value={tabValue} index={2}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: 400 }}>
              <Typography variant="h6" gutterBottom>توزيع البدلات حسب النوع</Typography>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="90%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {chartData.map((entry: any, index: number) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Alert severity="info">لا توجد بيانات للعرض</Alert>
              )}
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: 400 }}>
              <Typography variant="h6" gutterBottom>ملخص سريع</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                {summaryData?.byType?.slice(0, 5).map((item: any, index: number) => (
                  <Box key={item.code}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2">{item.name}</Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {formatCurrency(item.total)}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        bgcolor: 'grey.200',
                        overflow: 'hidden',
                      }}
                    >
                      <Box
                        sx={{
                          height: '100%',
                          width: `${(item.total / (summaryData.grandTotal || 1)) * 100}%`,
                          bgcolor: COLORS[index % COLORS.length],
                          borderRadius: 4,
                        }}
                      />
                    </Box>
                  </Box>
                ))}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Dialog تعريف بدل جديد */}
      <Dialog open={openDefinitionDialog} onClose={() => setOpenDefinitionDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>تعريف بدل جديد</DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField fullWidth label="كود البدل" placeholder="HOUSING" required />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth label="اسم البدل (عربي)" placeholder="بدل سكن" required />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth label="اسم البدل (إنجليزي)" placeholder="Housing Allowance" />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>نوع البدل</InputLabel>
                  <Select label="نوع البدل" defaultValue="">
                    {ALLOWANCE_TYPES.map(type => (
                      <MenuItem key={type.value} value={type.value}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {type.icon}
                          {type.label}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>طريقة الحساب</InputLabel>
                  <Select label="طريقة الحساب" defaultValue="">
                    {CALCULATION_METHODS.map(method => (
                      <MenuItem key={method.value} value={method.value}>
                        {method.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="المبلغ الثابت"
                  type="number"
                  InputProps={{
                    endAdornment: <InputAdornment position="end">ر.س</InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="النسبة المئوية"
                  type="number"
                  InputProps={{
                    endAdornment: <InputAdornment position="end">%</InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  خيارات إضافية
                </Typography>
              </Grid>
              <Grid item xs={6} md={3}>
                <FormControlLabel
                  control={<Switch defaultChecked />}
                  label="يدخل في GOSI"
                />
              </Grid>
              <Grid item xs={6} md={3}>
                <FormControlLabel
                  control={<Switch />}
                  label="يدخل في EOS"
                />
              </Grid>
              <Grid item xs={6} md={3}>
                <FormControlLabel
                  control={<Switch />}
                  label="خاضع للضريبة"
                />
              </Grid>
              <Grid item xs={6} md={3}>
                <FormControlLabel
                  control={<Switch defaultChecked />}
                  label="نسبي (Pro-rated)"
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDefinitionDialog(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={() => toast.info('سيتم إضافة هذه الميزة قريباً')}
          >
            إنشاء التعريف
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
