/**
 * صفحة إدارة المكافآت المتقدمة
 * Bonus Management Page
 */

import { useState, useEffect } from 'react';
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
  Checkbox,
  FormControlLabel,
  Autocomplete,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  EmojiEvents as BonusIcon,
  Check as ApproveIcon,
  Close as RejectIcon,
  Visibility as ViewIcon,
  TrendingUp as TrendingUpIcon,
  Group as GroupIcon,
  AttachMoney as MoneyIcon,
  Schedule as ScheduleIcon,
  RemoveCircle as DeductIcon,
  Bolt as BoltIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api.service';
import toast from 'react-hot-toast';

// أنواع المكافآت
const BONUS_TYPES = [
  { value: 'ANNUAL', label: 'مكافأة سنوية', color: '#4CAF50' },
  { value: 'QUARTERLY', label: 'مكافأة ربع سنوية', color: '#2196F3' },
  { value: 'MONTHLY', label: 'مكافأة شهرية', color: '#FF9800' },
  { value: 'PERFORMANCE', label: 'مكافأة أداء', color: '#9C27B0' },
  { value: 'EID', label: 'مكافأة العيد', color: '#E91E63' },
  { value: 'RAMADAN', label: 'مكافأة رمضان', color: '#00BCD4' },
  { value: 'SPOT', label: 'مكافأة فورية', color: '#FF5722' },
  { value: 'PROJECT', label: 'مكافأة مشروع', color: '#607D8B' },
  { value: 'ATTENDANCE', label: 'مكافأة انتظام', color: '#8BC34A' },
  { value: 'CUSTOM', label: 'مكافأة مخصصة', color: '#795548' },
];

// طرق الحساب
const CALCULATION_METHODS = [
  { value: 'FIXED_AMOUNT', label: 'مبلغ ثابت' },
  { value: 'PERCENTAGE_OF_BASIC', label: 'نسبة من الراتب الأساسي' },
  { value: 'PERCENTAGE_OF_GROSS', label: 'نسبة من الإجمالي' },
  { value: 'SALARY_MULTIPLIER', label: 'مضاعف الراتب' },
  { value: 'TIERED', label: 'شرائح متدرجة' },
];

// أنواع الخصومات
const DEDUCTION_TYPES = [
  { value: 'TASK_FAILURE', label: 'عدم إنجاز مهمة', color: '#F44336' },
  { value: 'LATE_ARRIVAL', label: 'تأخير متكرر', color: '#FF5722' },
  { value: 'ABSENCE', label: 'غياب بدون إذن', color: '#E91E63' },
  { value: 'MISCONDUCT', label: 'سوء سلوك', color: '#9C27B0' },
  { value: 'DAMAGE', label: 'تلف عهدة', color: '#673AB7' },
  { value: 'CUSTOM', label: 'خصم مخصص', color: '#607D8B' },
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

export default function BonusManagementPage() {
  const [tabValue, setTabValue] = useState(0);
  const [openProgramDialog, setOpenProgramDialog] = useState(false);
  const [openBonusDialog, setOpenBonusDialog] = useState(false);
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  const [openInstantDialog, setOpenInstantDialog] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<any>(null);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [instantForm, setInstantForm] = useState({
    employeeId: '',
    type: 'DEDUCTION' as 'DEDUCTION' | 'ADDITION',
    amount: 0,
    reason: '',
    deductionType: 'TASK_FAILURE',
    autoApprove: true,
  });
  const queryClient = useQueryClient();

  // Form State
  const [programForm, setProgramForm] = useState({
    code: '',
    nameAr: '',
    bonusType: 'MONTHLY',
    calculationMethod: 'FIXED_AMOUNT',
    fixedAmount: 0,
    percentage: 0,
    multiplier: 1,
    formula: '',
    isActive: true
  });

  const resetForm = () => {
    setProgramForm({
      code: '',
      nameAr: '',
      bonusType: 'MONTHLY',
      calculationMethod: 'FIXED_AMOUNT',
      fixedAmount: 0,
      percentage: 0,
      multiplier: 1,
      formula: '',
      isActive: true
    });
  };

  const handleCreateProgramOpen = () => {
    resetForm();
    setOpenProgramDialog(true);
  };

  // جلب برامج المكافآت
  const { data: programs, isLoading: loadingPrograms } = useQuery({
    queryKey: ['bonus-programs'],
    queryFn: () => api.get('/payroll-calculation/bonus/programs'),
  });

  // جلب الموظفين
  const { data: employeesData } = useQuery({
    queryKey: ['employees-for-bonus'],
    queryFn: async () => {
      const res = await api.get('/users?status=ACTIVE&limit=500');
      return (res as any)?.data || res || [];
    },
  });

  // جلب المكافآت المعلقة
  const { data: pendingBonuses, isLoading: loadingPending } = useQuery({
    queryKey: ['pending-bonuses'],
    queryFn: () => api.get('/payroll-calculation/bonus/pending'),
  });

  // جلب الإحصائيات
  const { data: statistics } = useQuery({
    queryKey: ['bonus-statistics'],
    queryFn: () => api.get('/payroll-calculation/bonus/statistics'),
  });

  // الموافقة على مكافأة
  const approveMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.post(`/payroll-calculation/bonus/${id}/approve`, data),
    onSuccess: () => {
      toast.success('تم الموافقة على المكافأة');
      queryClient.invalidateQueries({ queryKey: ['pending-bonuses'] });
      queryClient.invalidateQueries({ queryKey: ['bonus-statistics'] });
    },
    onError: () => toast.error('حدث خطأ أثناء الموافقة'),
  });

  // إنشاء برنامج مكافآت
  const createProgramMutation = useMutation({
    mutationFn: (data: any) => api.post('/payroll-calculation/bonus/programs', data),
    onSuccess: () => {
      toast.success('تم إنشاء برنامج المكافآت بنجاح');
      queryClient.invalidateQueries({ queryKey: ['bonus-programs'] });
      setOpenProgramDialog(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'حدث خطأ أثناء إنشاء البرنامج');
    },
  });

  // توليد مكافآت جماعية
  const generateBulkMutation = useMutation({
    mutationFn: (data: any) => api.post('/payroll-calculation/bonus/generate-bulk', data),
    onSuccess: (result: any) => {
      toast.success(`تم توليد ${result?.generated || 0} مكافأة بنجاح`);
      queryClient.invalidateQueries({ queryKey: ['pending-bonuses'] });
      queryClient.invalidateQueries({ queryKey: ['bonus-statistics'] });
      setOpenDetailsDialog(false);
      setSelectedEmployees([]);
      setSelectAll(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'حدث خطأ أثناء توليد المكافآت');
    },
  });

  // ============= الخصومات/المكافآت الفورية =============

  // جلب التسويات المعلقة
  const { data: pendingAdjustments, isLoading: loadingAdjustments } = useQuery({
    queryKey: ['pending-adjustments'],
    queryFn: () => api.get('/payroll-adjustments/pending'),
  });

  // جلب إحصائيات التسويات
  const { data: adjustmentStats } = useQuery({
    queryKey: ['adjustment-stats'],
    queryFn: () => api.get('/payroll-adjustments/stats'),
  });

  // إنشاء خصم/مكافأة فورية
  const instantAdjustmentMutation = useMutation({
    mutationFn: (data: any) => api.post('/payroll-adjustments/instant', data),
    onSuccess: (result: any) => {
      toast.success(result?.message || 'تم إنشاء التسوية بنجاح');
      queryClient.invalidateQueries({ queryKey: ['pending-adjustments'] });
      queryClient.invalidateQueries({ queryKey: ['adjustment-stats'] });
      setOpenInstantDialog(false);
      setInstantForm({
        employeeId: '',
        type: 'DEDUCTION',
        amount: 0,
        reason: '',
        deductionType: 'TASK_FAILURE',
        autoApprove: true,
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'حدث خطأ أثناء إنشاء التسوية');
    },
  });

  // اعتماد/رفض تسوية
  const approveAdjustmentMutation = useMutation({
    mutationFn: (data: any) => api.post('/payroll-adjustments/approve', data),
    onSuccess: () => {
      toast.success('تم اعتماد التسوية');
      queryClient.invalidateQueries({ queryKey: ['pending-adjustments'] });
      queryClient.invalidateQueries({ queryKey: ['adjustment-stats'] });
    },
    onError: () => toast.error('حدث خطأ'),
  });

  const handleCreateInstantAdjustment = () => {
    if (!instantForm.employeeId || !instantForm.amount || !instantForm.reason) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    instantAdjustmentMutation.mutate({
      employeeId: instantForm.employeeId,
      type: instantForm.type,
      amount: instantForm.amount,
      reason: `[${DEDUCTION_TYPES.find(t => t.value === instantForm.deductionType)?.label || 'خصم'}] ${instantForm.reason}`,
      autoApprove: instantForm.autoApprove,
    });
  };


  const handleOpenDetails = (program: any) => {
    setSelectedProgram(program);
    setSelectedEmployees([]);
    setSelectAll(false);
    setOpenDetailsDialog(true);
  };

  const handleGenerateBonuses = () => {
    if (!selectedProgram || selectedEmployees.length === 0) {
      toast.error('يرجى اختيار موظف واحد على الأقل');
      return;
    }
    generateBulkMutation.mutate({
      programId: selectedProgram.id,
      employeeIds: selectedEmployees,
      periodYear: new Date().getFullYear(),
      periodMonth: new Date().getMonth() + 1,
    });
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked && employeesData) {
      const allEmployeeIds = (employeesData as any[])?.map((e: any) => e.id) || [];
      setSelectedEmployees(allEmployeeIds);
    } else {
      setSelectedEmployees([]);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
    }).format(amount);
  };

  const getBonusTypeInfo = (type: string) => {
    return BONUS_TYPES.find(t => t.value === type) || BONUS_TYPES[BONUS_TYPES.length - 1];
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* العنوان */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" color="primary">
            <BonusIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            إدارة المكافآت
          </Typography>
          <Typography variant="body2" color="text.secondary">
            إدارة برامج المكافآت والموافقات والتقارير
          </Typography>
        </Box>
        <Box>
          <Button
            variant="outlined"
            color="warning"
            startIcon={<BoltIcon />}
            onClick={() => {
              setTabValue(3); // الانتقال لتاب الخصومات الفورية
              setOpenInstantDialog(true);
            }}
            sx={{ mr: 1 }}
          >
            مكافأة / خصم فوري ⚡
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateProgramOpen}
          >
            برنامج مكافآت جديد
          </Button>
        </Box>
      </Box>

      {/* بطاقات الإحصائيات */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>إجمالي المصروف</Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {statistics?.totalPaid ? formatCurrency(statistics.totalPaid) : '0 ر.س'}
                  </Typography>
                </Box>
                <MoneyIcon sx={{ fontSize: 48, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>بانتظار الموافقة</Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {statistics?.totalPending ? formatCurrency(statistics.totalPending) : '0 ر.س'}
                  </Typography>
                </Box>
                <ScheduleIcon sx={{ fontSize: 48, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>متوسط المكافأة</Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {statistics?.averagePerEmployee ? formatCurrency(statistics.averagePerEmployee) : '0 ر.س'}
                  </Typography>
                </Box>
                <TrendingUpIcon sx={{ fontSize: 48, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>البرامج النشطة</Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {(programs as any[])?.length || 0}
                  </Typography>
                </Box>
                <GroupIcon sx={{ fontSize: 48, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* التبويبات */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab label="برامج المكافآت" />
          <Tab label={`الموافقات المعلقة (${(pendingBonuses as any[])?.length || 0})`} />
          <Tab label="سجل المكافآت" />
          <Tab
            icon={<BoltIcon />}
            iconPosition="start"
            label={`الخصومات الفورية (${(pendingAdjustments as any[])?.length || 0})`}
          />
        </Tabs>
      </Paper>

      {/* برامج المكافآت */}
      <TabPanel value={tabValue} index={0}>
        {loadingPrograms ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3}>
            {(programs as any[])?.map((program: any) => {
              const metadata = program.metadata || {};
              const typeInfo = getBonusTypeInfo(metadata.bonusType);

              return (
                <Grid item xs={12} md={6} lg={4} key={program.id}>
                  <Card
                    sx={{
                      height: '100%',
                      borderTop: `4px solid ${typeInfo.color}`,
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
                          label={program.code}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                      <Typography variant="h6" fontWeight="bold" gutterBottom>
                        {program.nameAr}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {program.description || 'لا يوجد وصف'}
                      </Typography>

                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {metadata.fixedAmount && (
                          <Chip
                            label={`${formatCurrency(metadata.fixedAmount)}`}
                            size="small"
                            color="success"
                          />
                        )}
                        {metadata.percentage && (
                          <Chip
                            label={`${metadata.percentage}%`}
                            size="small"
                            color="info"
                          />
                        )}
                        {metadata.multiplier && (
                          <Chip
                            label={`×${metadata.multiplier} راتب`}
                            size="small"
                            color="warning"
                          />
                        )}
                      </Box>

                      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                          size="small"
                          startIcon={<ViewIcon />}
                          onClick={() => handleOpenDetails(program)}
                        >
                          التفاصيل وتوزيع المكافآت
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}

            {(!programs || (programs as any[]).length === 0) && (
              <Grid item xs={12}>
                <Alert severity="info">
                  لا توجد برامج مكافآت. اضغط على "برنامج مكافآت جديد" لإنشاء برنامج.
                </Alert>
              </Grid>
            )}
          </Grid>
        )}
      </TabPanel>

      {/* الموافقات المعلقة */}
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
                  <TableCell>نوع المكافأة</TableCell>
                  <TableCell>المبلغ</TableCell>
                  <TableCell>الفترة</TableCell>
                  <TableCell>تاريخ الطلب</TableCell>
                  <TableCell align="center">الإجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(pendingBonuses as any[])?.map((bonus: any) => {
                  const metadata = bonus.metadata || {};
                  const typeInfo = getBonusTypeInfo(metadata.bonusType);

                  return (
                    <TableRow key={bonus.id} hover>
                      <TableCell>
                        <Box>
                          <Typography fontWeight="medium">
                            {bonus.employee?.firstName} {bonus.employee?.lastName}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {bonus.employee?.employeeCode}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={typeInfo.label}
                          size="small"
                          sx={{ bgcolor: typeInfo.color, color: 'white' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight="bold" color="success.main">
                          {formatCurrency(Number(bonus.totalAmount))}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {metadata.periodYear}/{metadata.periodMonth || '-'}
                      </TableCell>
                      <TableCell>
                        {new Date(bonus.createdAt).toLocaleDateString('ar-SA')}
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="موافقة">
                          <IconButton
                            color="success"
                            onClick={() => approveMutation.mutate({ id: bonus.id, data: {} })}
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
                  );
                })}

                {(!pendingBonuses || (pendingBonuses as any[]).length === 0) && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography color="text.secondary" sx={{ py: 4 }}>
                        لا توجد مكافآت بانتظار الموافقة
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </TabPanel>

      {/* سجل المكافآت */}
      <TabPanel value={tabValue} index={2}>
        <Alert severity="info">
          سيتم عرض سجل جميع المكافآت المصروفة هنا
        </Alert>
      </TabPanel>

      {/* ⚡ الخصومات والمكافآت الفورية */}
      <TabPanel value={tabValue} index={3}>
        <Box sx={{ mb: 3 }}>
          <Button
            variant="contained"
            startIcon={<BoltIcon />}
            onClick={() => setOpenInstantDialog(true)}
            sx={{ mr: 1 }}
          >
            خصم/مكافأة فورية
          </Button>
        </Box>

        {/* بطاقات إحصائيات التسويات */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <Card sx={{ bgcolor: 'warning.light', color: 'warning.contrastText' }}>
              <CardContent>
                <Typography variant="body2">معلقة</Typography>
                <Typography variant="h4" fontWeight="bold">
                  {adjustmentStats?.pendingCount || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ bgcolor: 'success.light', color: 'success.contrastText' }}>
              <CardContent>
                <Typography variant="body2">إجمالي المكافآت</Typography>
                <Typography variant="h4" fontWeight="bold">
                  {formatCurrency(adjustmentStats?.totalAdditions || 0)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ bgcolor: 'error.light', color: 'error.contrastText' }}>
              <CardContent>
                <Typography variant="body2">إجمالي الخصومات</Typography>
                <Typography variant="h4" fontWeight="bold">
                  {formatCurrency(adjustmentStats?.totalDeductions || 0)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {loadingAdjustments ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.100' }}>
                  <TableCell>الموظف</TableCell>
                  <TableCell>النوع</TableCell>
                  <TableCell>المبلغ</TableCell>
                  <TableCell>السبب</TableCell>
                  <TableCell>التاريخ</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell align="center">الإجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(pendingAdjustments as any[])?.map((adj: any) => (
                  <TableRow key={adj.id} hover>
                    <TableCell>
                      <Box>
                        <Typography fontWeight="medium">
                          {adj.employee?.firstName} {adj.employee?.lastName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {adj.employee?.employeeCode}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={adj.adjustmentType === 'MANUAL_DEDUCTION' ? 'خصم' : 'مكافأة'}
                        size="small"
                        color={adj.adjustmentType === 'MANUAL_DEDUCTION' ? 'error' : 'success'}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography
                        fontWeight="bold"
                        color={adj.adjustmentType === 'MANUAL_DEDUCTION' ? 'error.main' : 'success.main'}
                      >
                        {adj.adjustmentType === 'MANUAL_DEDUCTION' ? '-' : '+'}
                        {formatCurrency(Number(adj.adjustedAmount || adj.amount))}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 200 }}>
                      <Typography variant="body2" noWrap>
                        {adj.reason}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {new Date(adj.createdAt).toLocaleDateString('ar-SA')}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={
                          adj.status === 'PENDING' ? 'معلق' :
                            adj.status === 'POSTED' ? 'معتمد' :
                              adj.status === 'REVERSED' ? 'ملغي' : adj.status
                        }
                        size="small"
                        color={
                          adj.status === 'PENDING' ? 'warning' :
                            adj.status === 'POSTED' ? 'success' :
                              adj.status === 'REVERSED' ? 'error' : 'default'
                        }
                      />
                    </TableCell>
                    <TableCell align="center">
                      {adj.status === 'PENDING' ? (
                        <>
                          <Tooltip title="اعتماد">
                            <IconButton
                              color="success"
                              onClick={() => approveAdjustmentMutation.mutate({
                                adjustmentId: adj.id,
                                approved: true,
                              })}
                            >
                              <ApproveIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="رفض">
                            <IconButton
                              color="error"
                              onClick={() => approveAdjustmentMutation.mutate({
                                adjustmentId: adj.id,
                                approved: false,
                              })}
                            >
                              <RejectIcon />
                            </IconButton>
                          </Tooltip>
                        </>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          تم
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}

                {(!pendingAdjustments || (pendingAdjustments as any[]).length === 0) && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography color="text.secondary" sx={{ py: 4 }}>
                        لا توجد تسويات معلقة
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </TabPanel>


      {/* Dialog إنشاء برنامج مكافآت */}
      <Dialog open={openProgramDialog} onClose={() => setOpenProgramDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>إنشاء برنامج مكافآت جديد</DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="كود البرنامج"
                  placeholder="ANNUAL_BONUS"
                  value={programForm.code}
                  onChange={(e) => setProgramForm({ ...programForm, code: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="اسم البرنامج (عربي)"
                  placeholder="مكافأة سنوية"
                  value={programForm.nameAr}
                  onChange={(e) => setProgramForm({ ...programForm, nameAr: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>نوع المكافأة</InputLabel>
                  <Select
                    label="نوع المكافأة"
                    value={programForm.bonusType}
                    onChange={(e) => setProgramForm({ ...programForm, bonusType: e.target.value })}
                  >
                    {BONUS_TYPES.map(type => (
                      <MenuItem key={type.value} value={type.value}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: type.color, mr: 1 }} />
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
                  <Select
                    label="طريقة الحساب"
                    value={programForm.calculationMethod}
                    onChange={(e) => setProgramForm({ ...programForm, calculationMethod: e.target.value })}
                  >
                    {CALCULATION_METHODS.map(method => (
                      <MenuItem key={method.value} value={method.value}>
                        {method.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {programForm.calculationMethod === 'FIXED_AMOUNT' && (
                <Grid item xs={12} md={12}>
                  <TextField
                    fullWidth
                    label="المبلغ الثابت"
                    type="number"
                    value={programForm.fixedAmount}
                    onChange={(e) => setProgramForm({ ...programForm, fixedAmount: Number(e.target.value) })}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">ر.س</InputAdornment>,
                    }}
                  />
                </Grid>
              )}

              {(programForm.calculationMethod === 'PERCENTAGE_OF_BASIC' || programForm.calculationMethod === 'PERCENTAGE_OF_GROSS') && (
                <Grid item xs={12} md={12}>
                  <TextField
                    fullWidth
                    label="النسبة المئوية"
                    type="number"
                    value={programForm.percentage}
                    onChange={(e) => setProgramForm({ ...programForm, percentage: Number(e.target.value) })}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">%</InputAdornment>,
                    }}
                  />
                </Grid>
              )}

              {programForm.calculationMethod === 'SALARY_MULTIPLIER' && (
                <Grid item xs={12} md={12}>
                  <TextField
                    fullWidth
                    label="مضاعف الراتب"
                    type="number"
                    value={programForm.multiplier}
                    onChange={(e) => setProgramForm({ ...programForm, multiplier: Number(e.target.value) })}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">شهر</InputAdornment>,
                    }}
                  />
                </Grid>
              )}

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="وصف البرنامج"
                  multiline
                  rows={3}
                  value={programForm.formula} // Using formula field as description if method is not formula
                  onChange={(e) => setProgramForm({ ...programForm, formula: e.target.value })}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenProgramDialog(false)}>إلغاء</Button>
          <Button
            variant="contained"
            disabled={createProgramMutation.isPending || !programForm.code || !programForm.nameAr}
            onClick={() => createProgramMutation.mutate(programForm)}
            startIcon={createProgramMutation.isPending ? <CircularProgress size={20} /> : null}
          >
            {createProgramMutation.isPending ? 'جاري الحفظ...' : 'إنشاء البرنامج'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog تفاصيل البرنامج وتوزيع المكافآت */}
      <Dialog open={openDetailsDialog} onClose={() => setOpenDetailsDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">تفاصيل برنامج المكافآت</Typography>
            {selectedProgram && (
              <Chip
                label={selectedProgram.code}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedProgram && (
            <Box sx={{ mt: 2 }}>
              {/* معلومات البرنامج */}
              <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">اسم البرنامج</Typography>
                    <Typography variant="h6">{selectedProgram.nameAr}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">طريقة الحساب</Typography>
                    <Typography variant="h6">
                      {CALCULATION_METHODS.find(m => m.value === selectedProgram.metadata?.calculationMethod)?.label || 'غير محدد'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="subtitle2" color="text.secondary">المبلغ الثابت</Typography>
                    <Typography>{selectedProgram.metadata?.fixedAmount ? formatCurrency(selectedProgram.metadata.fixedAmount) : '-'}</Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="subtitle2" color="text.secondary">النسبة</Typography>
                    <Typography>{selectedProgram.metadata?.percentage ? `${selectedProgram.metadata.percentage}%` : '-'}</Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="subtitle2" color="text.secondary">المضاعف</Typography>
                    <Typography>{selectedProgram.metadata?.multiplier ? `×${selectedProgram.metadata.multiplier}` : '-'}</Typography>
                  </Grid>
                </Grid>
              </Paper>

              <Divider sx={{ my: 2 }} />

              {/* اختيار الموظفين */}
              <Typography variant="h6" gutterBottom>توزيع المكافآت على الموظفين</Typography>
              <Alert severity="info" sx={{ mb: 2 }}>
                اختر الموظفين الذين تريد توليد مكافآت لهم من هذا البرنامج
              </Alert>

              <FormControlLabel
                control={
                  <Checkbox
                    checked={selectAll}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                }
                label="تحديد جميع الموظفين"
                sx={{ mb: 2 }}
              />

              <Autocomplete
                multiple
                options={(employeesData as any[]) || []}
                getOptionLabel={(option: any) => `${option.firstName} ${option.lastName} - ${option.employeeCode || ''}`}
                value={(employeesData as any[])?.filter((e: any) => selectedEmployees.includes(e.id)) || []}
                onChange={(_, newValue) => {
                  setSelectedEmployees(newValue.map((e: any) => e.id));
                  setSelectAll(false);
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="اختر الموظفين"
                    placeholder="ابحث عن موظف..."
                  />
                )}
                renderOption={(props, option: any) => (
                  <li {...props}>
                    <Box>
                      <Typography>{option.firstName} {option.lastName}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.employeeCode} - {option.jobTitle?.nameAr || ''}
                      </Typography>
                    </Box>
                  </li>
                )}
                sx={{ mb: 2 }}
              />

              {selectedEmployees.length > 0 && (
                <Alert severity="success">
                  تم تحديد {selectedEmployees.length} موظف
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDetailsDialog(false)}>إغلاق</Button>
          <Button
            variant="contained"
            color="primary"
            disabled={generateBulkMutation.isPending || selectedEmployees.length === 0}
            onClick={handleGenerateBonuses}
            startIcon={generateBulkMutation.isPending ? <CircularProgress size={20} /> : <AddIcon />}
          >
            {generateBulkMutation.isPending ? 'جاري التوليد...' : `توليد مكافآت (${selectedEmployees.length})`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ⚡ Dialog خصم/مكافأة فورية */}
      <Dialog open={openInstantDialog} onClose={() => setOpenInstantDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <BoltIcon color="warning" />
            خصم / مكافأة فورية
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Alert severity="info" sx={{ mb: 1 }}>
              سيتم تسجيل التسوية في مسيّر الشهر الحالي وتظهر تلقائياً في الراتب
            </Alert>

            {/* اختيار النوع */}
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant={instantForm.type === 'DEDUCTION' ? 'contained' : 'outlined'}
                color="error"
                startIcon={<DeductIcon />}
                onClick={() => setInstantForm({ ...instantForm, type: 'DEDUCTION' })}
                sx={{ flex: 1 }}
              >
                خصم
              </Button>
              <Button
                variant={instantForm.type === 'ADDITION' ? 'contained' : 'outlined'}
                color="success"
                startIcon={<BonusIcon />}
                onClick={() => setInstantForm({ ...instantForm, type: 'ADDITION' })}
                sx={{ flex: 1 }}
              >
                مكافأة
              </Button>
            </Box>

            {/* اختيار الموظف */}
            <Autocomplete
              options={(employeesData as any[]) || []}
              getOptionLabel={(option: any) => `${option.firstName} ${option.lastName} - ${option.employeeCode || ''}`}
              value={(employeesData as any[])?.find((e: any) => e.id === instantForm.employeeId) || null}
              onChange={(_, newValue) => {
                setInstantForm({ ...instantForm, employeeId: newValue?.id || '' });
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="اختر الموظف *"
                  placeholder="ابحث عن موظف..."
                  required
                />
              )}
            />

            {/* نوع الخصم */}
            {instantForm.type === 'DEDUCTION' && (
              <FormControl fullWidth>
                <InputLabel>سبب الخصم</InputLabel>
                <Select
                  label="سبب الخصم"
                  value={instantForm.deductionType}
                  onChange={(e) => setInstantForm({ ...instantForm, deductionType: e.target.value })}
                >
                  {DEDUCTION_TYPES.map(type => (
                    <MenuItem key={type.value} value={type.value}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: type.color, mr: 1 }} />
                        {type.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {/* المبلغ */}
            <TextField
              fullWidth
              label="المبلغ *"
              type="number"
              value={instantForm.amount || ''}
              onChange={(e) => setInstantForm({ ...instantForm, amount: Number(e.target.value) })}
              InputProps={{
                endAdornment: <InputAdornment position="end">ر.س</InputAdornment>,
              }}
              required
            />

            {/* السبب */}
            <TextField
              fullWidth
              label="السبب / التفاصيل *"
              multiline
              rows={2}
              value={instantForm.reason}
              onChange={(e) => setInstantForm({ ...instantForm, reason: e.target.value })}
              placeholder={instantForm.type === 'DEDUCTION'
                ? 'مثال: لم ينجز المهمة المطلوبة في الوقت المحدد'
                : 'مثال: إنجاز المشروع قبل الموعد'}
              required
            />

            {/* اعتماد تلقائي */}
            <FormControlLabel
              control={
                <Checkbox
                  checked={instantForm.autoApprove}
                  onChange={(e) => setInstantForm({ ...instantForm, autoApprove: e.target.checked })}
                />
              }
              label="اعتماد تلقائي (بدون مراجعة)"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenInstantDialog(false)}>إلغاء</Button>
          <Button
            variant="contained"
            color={instantForm.type === 'DEDUCTION' ? 'error' : 'success'}
            disabled={instantAdjustmentMutation.isPending || !instantForm.employeeId || !instantForm.amount || !instantForm.reason}
            onClick={handleCreateInstantAdjustment}
            startIcon={instantAdjustmentMutation.isPending ? <CircularProgress size={20} /> : <BoltIcon />}
          >
            {instantAdjustmentMutation.isPending
              ? 'جاري الحفظ...'
              : instantForm.type === 'DEDUCTION'
                ? `خصم ${instantForm.amount} ر.س`
                : `مكافأة ${instantForm.amount} ر.س`}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
