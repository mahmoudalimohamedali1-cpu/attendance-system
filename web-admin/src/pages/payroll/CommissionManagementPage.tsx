/**
 * صفحة إدارة العمولات المتقدمة
 * Commission Management Page
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
  IconButton,
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
  Tooltip,
  InputAdornment,
  LinearProgress,
  Avatar,
} from '@mui/material';
import {
  Add as AddIcon,
  TrendingUp as TrendingUpIcon,
  Check as ApproveIcon,
  Close as RejectIcon,
  Visibility as ViewIcon,
  AttachMoney as MoneyIcon,
  People as PeopleIcon,
  Receipt as ReceiptIcon,
  Undo as UndoIcon,
  Speed as SpeedIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api.service';
import toast from 'react-hot-toast';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

// أنواع العمولات
const COMMISSION_TYPES = [
  { value: 'SALES', label: 'عمولة مبيعات', color: '#4CAF50' },
  { value: 'SERVICE', label: 'عمولة خدمات', color: '#2196F3' },
  { value: 'REFERRAL', label: 'عمولة إحالة', color: '#FF9800' },
  { value: 'PROJECT', label: 'عمولة مشروع', color: '#9C27B0' },
  { value: 'PERFORMANCE', label: 'عمولة أداء', color: '#E91E63' },
  { value: 'CUSTOM', label: 'مخصص', color: '#607D8B' },
];

// طرق الحساب
const CALCULATION_METHODS = [
  { value: 'PERCENTAGE', label: 'نسبة مئوية' },
  { value: 'FLAT_RATE', label: 'مبلغ ثابت' },
  { value: 'TIERED', label: 'شرائح متدرجة' },
  { value: 'PER_UNIT', label: 'لكل وحدة' },
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

export default function CommissionManagementPage() {
  const [tabValue, setTabValue] = useState(0);
  const [openPlanDialog, setOpenPlanDialog] = useState(false);
  const [openRecordDialog, setOpenRecordDialog] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const queryClient = useQueryClient();

  // حالة نموذج الخطة
  const [planForm, setPlanForm] = useState({
    code: '',
    nameAr: '',
    commissionType: '',
    calculationMethod: '',
    baseRate: '',
    cappedAmount: '',
  });

  // حالة نموذج تسجيل العمولة
  const [recordForm, setRecordForm] = useState({
    employeeId: '',
    planId: '',
    transactionValue: '',
    transactionRef: '',
    notes: '',
  });

  // جلب خطط العمولات
  const { data: plans, isLoading: loadingPlans } = useQuery({
    queryKey: ['commission-plans'],
    queryFn: () => api.get('/payroll-calculation/commission/plans'),
  });

  // جلب العمولات المعلقة
  const { data: pendingCommissions, isLoading: loadingPending } = useQuery({
    queryKey: ['pending-commissions'],
    queryFn: () => api.get('/payroll-calculation/commission/pending'),
  });

  // جلب تقرير العمولات
  const { data: commissionReport } = useQuery({
    queryKey: ['commission-report', dateRange],
    queryFn: () => api.get(`/payroll-calculation/commission/report?startDate=${dateRange.start}&endDate=${dateRange.end}`),
  });

  // جلب الموظفين
  const { data: employees } = useQuery({
    queryKey: ['employees-for-commission'],
    queryFn: async () => {
      const res = await api.get('/users?status=ACTIVE&limit=500');
      return (res as any)?.data || res || [];
    },
  });

  // إنشاء خطة عمولات
  const createPlanMutation = useMutation({
    mutationFn: (data: any) => api.post('/payroll-calculation/commission/plans', data),
    onSuccess: () => {
      toast.success('تم إنشاء خطة العمولات بنجاح');
      queryClient.invalidateQueries({ queryKey: ['commission-plans'] });
      setOpenPlanDialog(false);
      setPlanForm({ code: '', nameAr: '', commissionType: '', calculationMethod: '', baseRate: '', cappedAmount: '' });
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'حدث خطأ أثناء الإنشاء'),
  });

  // تسجيل عمولة
  const recordCommissionMutation = useMutation({
    mutationFn: (data: any) => api.post('/payroll-calculation/commission/record', data),
    onSuccess: () => {
      toast.success('تم تسجيل العمولة بنجاح');
      queryClient.invalidateQueries({ queryKey: ['pending-commissions'] });
      setOpenRecordDialog(false);
      setRecordForm({ employeeId: '', planId: '', transactionValue: '', transactionRef: '', notes: '' });
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'حدث خطأ أثناء التسجيل'),
  });

  // الموافقة على عمولة
  const approveMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.post(`/payroll-calculation/commission/${id}/approve`, data),
    onSuccess: () => {
      toast.success('تم الموافقة على العمولة');
      queryClient.invalidateQueries({ queryKey: ['pending-commissions'] });
      queryClient.invalidateQueries({ queryKey: ['commission-report'] });
    },
    onError: () => toast.error('حدث خطأ أثناء الموافقة'),
  });

  // استرجاع عمولة
  const clawbackMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.post(`/payroll-calculation/commission/${id}/clawback`, data),
    onSuccess: () => {
      toast.success('تم استرجاع العمولة');
      queryClient.invalidateQueries({ queryKey: ['commission-report'] });
    },
    onError: () => toast.error('حدث خطأ أثناء الاسترجاع'),
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getCommissionTypeInfo = (type: string) => {
    return COMMISSION_TYPES.find(t => t.value === type) || COMMISSION_TYPES[COMMISSION_TYPES.length - 1];
  };

  const report = commissionReport as any;

  return (
    <Box sx={{ p: 3 }}>
      {/* العنوان */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" color="primary">
            <TrendingUpIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            إدارة العمولات
          </Typography>
          <Typography variant="body2" color="text.secondary">
            إدارة خطط العمولات وتتبع الأداء
          </Typography>
        </Box>
        <Box>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setOpenRecordDialog(true)}
            sx={{ mr: 1 }}
          >
            تسجيل عمولة
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenPlanDialog(true)}
          >
            خطة جديدة
          </Button>
        </Box>
      </Box>

      {/* بطاقات الإحصائيات */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>إجمالي العمولات</Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {report?.totalAmount ? formatCurrency(report.totalAmount) : '0 ر.س'}
                  </Typography>
                </Box>
                <MoneyIcon sx={{ fontSize: 48, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>عدد المعاملات</Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {report?.totalTransactions || 0}
                  </Typography>
                </Box>
                <ReceiptIcon sx={{ fontSize: 48, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>الموظفين المستفيدين</Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {report?.uniqueEmployees || 0}
                  </Typography>
                </Box>
                <PeopleIcon sx={{ fontSize: 48, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>الخطط النشطة</Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {(plans as any[])?.length || 0}
                  </Typography>
                </Box>
                <SpeedIcon sx={{ fontSize: 48, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* التبويبات */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab label="خطط العمولات" />
          <Tab label={`المعلقة (${(pendingCommissions as any[])?.length || 0})`} />
          <Tab label="أفضل الأداء" />
          <Tab label="التحليلات" />
        </Tabs>
      </Paper>

      {/* خطط العمولات */}
      <TabPanel value={tabValue} index={0}>
        {loadingPlans ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3}>
            {(plans as any[])?.map((plan: any) => {
              const metadata = plan.metadata || {};
              const typeInfo = getCommissionTypeInfo(metadata.commissionType);

              return (
                <Grid item xs={12} md={6} lg={4} key={plan.id}>
                  <Card
                    sx={{
                      height: '100%',
                      borderLeft: `4px solid ${typeInfo.color}`,
                      transition: 'transform 0.2s',
                      '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 },
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Chip
                          label={typeInfo.label}
                          size="small"
                          sx={{ bgcolor: typeInfo.color, color: 'white' }}
                        />
                        <Chip
                          label={plan.code}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                      <Typography variant="h6" fontWeight="bold" gutterBottom>
                        {plan.nameAr}
                      </Typography>

                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          طريقة الحساب: {CALCULATION_METHODS.find(m => m.value === metadata.calculationMethod)?.label || '-'}
                        </Typography>
                        {metadata.baseRate && (
                          <Typography variant="body2" color="text.secondary">
                            المعدل: {metadata.baseRate}%
                          </Typography>
                        )}
                        {metadata.cappedAmount && (
                          <Typography variant="body2" color="text.secondary">
                            الحد الأقصى: {formatCurrency(metadata.cappedAmount)}
                          </Typography>
                        )}
                      </Box>

                      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button size="small" startIcon={<ViewIcon />}>
                          التفاصيل
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}

            {(!plans || (plans as any[]).length === 0) && (
              <Grid item xs={12}>
                <Alert severity="info">
                  لا توجد خطط عمولات. اضغط على "خطة جديدة" لإنشاء خطة.
                </Alert>
              </Grid>
            )}
          </Grid>
        )}
      </TabPanel>

      {/* العمولات المعلقة */}
      <TabPanel value={tabValue} index={1}>
        {loadingPending ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.100' }}>
                  <TableCell>الموظف</TableCell>
                  <TableCell>الخطة</TableCell>
                  <TableCell align="right">المبلغ</TableCell>
                  <TableCell>التاريخ</TableCell>
                  <TableCell align="center">الإجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(pendingCommissions as any[])?.map((commission: any) => (
                  <TableRow key={commission.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                          {commission.employee?.firstName?.[0]}
                        </Avatar>
                        <Box>
                          <Typography fontWeight="medium">
                            {commission.employee?.firstName} {commission.employee?.lastName}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {commission.employee?.employeeCode}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>{commission.reason}</TableCell>
                    <TableCell align="right">
                      <Typography fontWeight="bold" color="success.main">
                        {formatCurrency(Number(commission.totalAmount))}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {new Date(commission.createdAt).toLocaleDateString('ar-SA')}
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="موافقة">
                        <IconButton
                          color="success"
                          onClick={() => approveMutation.mutate({ id: commission.id, data: {} })}
                        >
                          <ApproveIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="رفض">
                        <IconButton color="error">
                          <RejectIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}

                {(!pendingCommissions || (pendingCommissions as any[]).length === 0) && (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography color="text.secondary" sx={{ py: 4 }}>
                        لا توجد عمولات معلقة
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </TabPanel>

      {/* أفضل الأداء */}
      <TabPanel value={tabValue} index={2}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>أفضل 10 موظفين</Typography>
              {report?.topPerformers && report.topPerformers.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={report.topPerformers} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="employeeName" type="category" width={120} />
                    <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="totalCommission" fill="#8884d8" name="إجمالي العمولات" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Alert severity="info">لا توجد بيانات للعرض</Alert>
              )}
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>قائمة المتصدرين</Typography>
              {report?.topPerformers?.map((performer: any, index: number) => (
                <Box
                  key={performer.employeeId}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 1.5,
                    mb: 1,
                    borderRadius: 2,
                    bgcolor: index === 0 ? 'warning.light' : index === 1 ? 'grey.200' : index === 2 ? 'orange.100' : 'transparent',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography
                      fontWeight="bold"
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        bgcolor: index < 3 ? 'primary.main' : 'grey.400',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                      }}
                    >
                      {index + 1}
                    </Typography>
                    <Typography fontWeight={index < 3 ? 'bold' : 'normal'}>
                      {performer.employeeName}
                    </Typography>
                  </Box>
                  <Typography fontWeight="bold" color="success.main">
                    {formatCurrency(performer.totalCommission)}
                  </Typography>
                </Box>
              ))}
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>

      {/* التحليلات */}
      <TabPanel value={tabValue} index={3}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>فلتر التاريخ</Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  type="date"
                  label="من"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
                <TextField
                  type="date"
                  label="إلى"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>ملخص الفترة</Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography color="text.secondary">الإجمالي</Typography>
                  <Typography variant="h5" fontWeight="bold" color="success.main">
                    {report?.totalAmount ? formatCurrency(report.totalAmount) : '0'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography color="text.secondary">المتوسط لكل موظف</Typography>
                  <Typography variant="h5" fontWeight="bold" color="primary.main">
                    {report?.uniqueEmployees
                      ? formatCurrency(report.totalAmount / report.uniqueEmployees)
                      : '0'}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Dialog إنشاء خطة عمولات */}
      <Dialog open={openPlanDialog} onClose={() => setOpenPlanDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>إنشاء خطة عمولات جديدة</DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="كود الخطة"
                  placeholder="SALES_COMMISSION"
                  value={planForm.code}
                  onChange={(e) => setPlanForm({ ...planForm, code: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="اسم الخطة"
                  placeholder="عمولة المبيعات"
                  value={planForm.nameAr}
                  onChange={(e) => setPlanForm({ ...planForm, nameAr: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>نوع العمولة</InputLabel>
                  <Select
                    label="نوع العمولة"
                    value={planForm.commissionType}
                    onChange={(e) => setPlanForm({ ...planForm, commissionType: e.target.value })}
                  >
                    {COMMISSION_TYPES.map(type => (
                      <MenuItem key={type.value} value={type.value}>
                        {type.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>طريقة الحساب</InputLabel>
                  <Select
                    label="طريقة الحساب"
                    value={planForm.calculationMethod}
                    onChange={(e) => setPlanForm({ ...planForm, calculationMethod: e.target.value })}
                  >
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
                  label="المعدل الأساسي"
                  type="number"
                  value={planForm.baseRate}
                  onChange={(e) => setPlanForm({ ...planForm, baseRate: e.target.value })}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">%</InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="الحد الأقصى"
                  type="number"
                  value={planForm.cappedAmount}
                  onChange={(e) => setPlanForm({ ...planForm, cappedAmount: e.target.value })}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">ر.س</InputAdornment>,
                  }}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPlanDialog(false)}>إلغاء</Button>
          <Button
            variant="contained"
            disabled={createPlanMutation.isPending || !planForm.code || !planForm.nameAr}
            onClick={() => createPlanMutation.mutate(planForm)}
          >
            {createPlanMutation.isPending ? 'جاري الإنشاء...' : 'إنشاء الخطة'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog تسجيل عمولة */}
      <Dialog open={openRecordDialog} onClose={() => setOpenRecordDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>تسجيل عمولة جديدة</DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>الموظف</InputLabel>
              <Select
                label="الموظف"
                value={recordForm.employeeId}
                onChange={(e) => setRecordForm({ ...recordForm, employeeId: e.target.value })}
              >
                {(employees as any[])?.map((emp: any) => (
                  <MenuItem key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName} - {emp.employeeCode}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>خطة العمولة</InputLabel>
              <Select
                label="خطة العمولة"
                value={recordForm.planId}
                onChange={(e) => setRecordForm({ ...recordForm, planId: e.target.value })}
              >
                {(plans as any[])?.map(plan => (
                  <MenuItem key={plan.id} value={plan.id}>
                    {plan.nameAr}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="قيمة المعاملة"
              type="number"
              value={recordForm.transactionValue}
              onChange={(e) => setRecordForm({ ...recordForm, transactionValue: e.target.value })}
              InputProps={{
                endAdornment: <InputAdornment position="end">ر.س</InputAdornment>,
              }}
            />
            <TextField
              fullWidth
              label="مرجع المعاملة"
              placeholder="رقم الفاتورة أو العقد"
              value={recordForm.transactionRef}
              onChange={(e) => setRecordForm({ ...recordForm, transactionRef: e.target.value })}
            />
            <TextField
              fullWidth
              label="ملاحظات"
              multiline
              rows={2}
              value={recordForm.notes}
              onChange={(e) => setRecordForm({ ...recordForm, notes: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRecordDialog(false)}>إلغاء</Button>
          <Button
            variant="contained"
            disabled={recordCommissionMutation.isPending || !recordForm.employeeId || !recordForm.planId || !recordForm.transactionValue}
            onClick={() => recordCommissionMutation.mutate({
              employeeId: recordForm.employeeId,
              planId: recordForm.planId,
              transactionValue: Number(recordForm.transactionValue),
              transactionRef: recordForm.transactionRef,
              notes: recordForm.notes,
            })}
          >
            {recordCommissionMutation.isPending ? 'جاري التسجيل...' : 'تسجيل العمولة'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
