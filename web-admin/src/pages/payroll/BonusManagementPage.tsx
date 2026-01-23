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
  const [selectedProgram, setSelectedProgram] = useState<any>(null);
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
            startIcon={<AddIcon />}
            onClick={() => setOpenBonusDialog(true)}
            sx={{ mr: 1 }}
          >
            إضافة مكافأة
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
                        <Button size="small" startIcon={<ViewIcon />}>
                          التفاصيل
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
    </Box>
  );
}
