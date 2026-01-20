import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
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
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  IconButton,

  Paper,
  Divider,
} from '@mui/material';
import {
  People,
  AccessTime,
  Warning,
  CheckCircle,
  Schedule,
  PersonOff,
  HomeWork,
  Description,
  Login,
  EventBusy,
  Add,
  BeachAccess,
  Mail,
  PhoneAndroid,
  Face,
  MonetizationOn,
  Send,
  Close,

  History,
  CloudUpload,
  Delete,
  AttachFile,
  Security as SecurityIcon,
  TrendingUp as TrendIcon,
  Refresh as RefreshIcon,
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
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { api } from '@/services/api.service';
import { useAuthStore } from '@/store/auth.store';
import { MudadComplianceCard } from '@/components/dashboard/MudadComplianceCard';
import { CalendarWidget } from '@/components/dashboard/CalendarWidget';
import { AnnouncementsBanner } from '@/components/dashboard/AnnouncementsBanner';
import { calendarEventsService, CalendarEvent as ServiceCalendarEvent } from '@/services/calendar-events.service';

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
  pendingLetters?: number;
  pendingRaises?: number;
  pendingAdvances?: number;
  pendingDataUpdates?: number;
  compliance?: {
    missingFace: number;
    suspiciousToday: number;
  };
  financials?: {
    employerGosiTotal: number;
    eosSettlementTotal: number;
    ledgerDraftAmount: number;
    ledgerPostedAmount: number;
    periodName?: string;
  };
}

interface EmployeeDashboard {
  isEmployeeDashboard: true;
  myAttendance: {
    checkedIn: boolean;
    checkInTime: string | null;
    checkOutTime: string | null;
    status: string;
    workingMinutes: number;
  } | null;
  myPendingLeaves: number;
  myPendingLetters: number;
  myPendingRaises?: number;
  myPendingAdvances?: number;
  myPendingDataUpdates?: number;
  myApprovedLeaves: number;
  remainingLeaveDays?: number;
  annualLeaveDays?: number;
}

type DashboardResponse = DashboardStats | EmployeeDashboard;

export const DashboardPage = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [openLeaveDialog, setOpenLeaveDialog] = useState(false);
  const [openLetterDialog, setOpenLetterDialog] = useState(false);
  const [openRaiseDialog, setOpenRaiseDialog] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  // Manager leave request form state
  const [leaveForm, setLeaveForm] = useState({ type: 'ANNUAL', startDate: '', endDate: '', reason: '' });
  const [letterForm, setLetterForm] = useState({ type: 'CERTIFICATION', subject: '', content: '', priority: 'NORMAL' });
  const [leaveAttachments, setLeaveAttachments] = useState<any[]>([]);
  const [letterAttachments, setLetterAttachments] = useState<any[]>([]);
  const [raiseAttachments, setRaiseAttachments] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const leaveFileInputRef = useRef<HTMLInputElement>(null);
  const letterFileInputRef = useRef<HTMLInputElement>(null);
  const raiseFileInputRef = useRef<HTMLInputElement>(null);

  // Raise form state
  const [raiseForm, setRaiseForm] = useState({ type: 'SALARY_INCREASE', amount: '', effectiveMonth: '', notes: '' });

  // Advance form state
  const [openAdvanceDialog, setOpenAdvanceDialog] = useState(false);
  const [advanceForm, setAdvanceForm] = useState({
    type: 'BANK_TRANSFER',
    amount: '',
    startDate: '',
    endDate: '',
    periodMonths: '',
    monthlyDeduction: '',
    notes: ''
  });
  const [advanceAttachments, setAdvanceAttachments] = useState<any[]>([]);
  const advanceFileInputRef = useRef<HTMLInputElement>(null);

  const { data: stats, isLoading, error } = useQuery<DashboardResponse>({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/reports/dashboard'),
    refetchInterval: 60000,
  });

  const { data: recentAttendance } = useQuery<{ data: Array<{ id: string; user: { firstName: string; lastName: string }; checkInTime: string | null; checkOutTime: string | null; status: string }> }>({
    queryKey: ['recent-attendance'],
    queryFn: () => api.get('/attendance/admin/all?limit=5'),
    enabled: !stats || !('isEmployeeDashboard' in stats),
  });

  const { data: weeklyStatsData } = useQuery<{ data: Array<{ date: string; present: number; late: number; absent: number }> }>({
    queryKey: ['weekly-stats'],
    queryFn: () => api.get('/reports/weekly-summary'),
    enabled: !stats || !('isEmployeeDashboard' in stats),
  });

  // Calendar events query for the widget
  const { data: calendarEventsData } = useQuery<ServiceCalendarEvent[]>({
    queryKey: ['calendar-events-upcoming'],
    queryFn: () => calendarEventsService.getUpcomingEvents(14), // Get events for the next 14 days
    refetchInterval: 300000, // Refetch every 5 minutes
  });

  // Transform calendar events for the widget
  const calendarEvents = (calendarEventsData || []).map((event) => ({
    id: event.id,
    title: event.title,
    startAt: new Date(event.startAt),
    endAt: new Date(event.endAt),
    type: event.eventType.toLowerCase() as 'meeting' | 'interview' | 'payroll' | 'holiday' | 'deadline' | 'announcement' | 'other',
    location: event.location || undefined,
    meetingLink: event.meetingLink || undefined,
    isAllDay: event.isAllDay,
  }));

  // Mutations for manager requests
  const leaveRequestMutation = useMutation({
    mutationFn: (formData: any) => api.post('/leaves', formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setOpenLeaveDialog(false);
      setLeaveForm({ type: 'ANNUAL', startDate: '', endDate: '', reason: '' });
      setLeaveAttachments([]);
      setSnackbar({ open: true, message: 'تم إرسال طلب الإجازة بنجاح', severity: 'success' });
    },
    onError: () => {
      setSnackbar({ open: true, message: 'فشل إرسال الطلب', severity: 'error' });
    },
  });

  const letterRequestMutation = useMutation({
    mutationFn: (formData: any) => api.post('/letters', formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setOpenLetterDialog(false);
      setLetterForm({ type: 'CERTIFICATION', subject: '', content: '', priority: 'NORMAL' });
      setLetterAttachments([]);
      setSnackbar({ open: true, message: 'تم إرسال طلب الخطاب بنجاح', severity: 'success' });
    },
    onError: () => {
      setSnackbar({ open: true, message: 'فشل إرسال الطلب', severity: 'error' });
    },
  });

  const raiseRequestMutation = useMutation({
    mutationFn: (formData: any) => api.post('/raises', formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setOpenRaiseDialog(false);
      setRaiseForm({ type: 'SALARY_INCREASE', amount: '', effectiveMonth: '', notes: '' });
      setRaiseAttachments([]);
      setSnackbar({ open: true, message: 'تم إرسال طلب الزيادة بنجاح', severity: 'success' });
    },
    onError: () => {
      setSnackbar({ open: true, message: 'فشل إرسال الطلب', severity: 'error' });
    },
  });

  const advanceRequestMutation = useMutation({
    mutationFn: (formData: any) => api.post('/advances', formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setOpenAdvanceDialog(false);
      setAdvanceForm({
        type: 'BANK_TRANSFER',
        amount: '',
        startDate: '',
        endDate: '',
        periodMonths: '',
        monthlyDeduction: '',
        notes: ''
      });
      setAdvanceAttachments([]);
      setSnackbar({ open: true, message: 'تم إرسال طلب السلفة بنجاح', severity: 'success' });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'فشل إرسال الطلب';
      setSnackbar({ open: true, message: msg, severity: 'error' });
    },
  });

  // File upload handlers
  const handleLeaveFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    const formData = new FormData();
    Array.from(files).forEach(file => formData.append('files', file));
    try {
      const response = await api.postFormData<any>('/leaves/upload-attachments', formData);
      console.log('=== UPLOAD RESPONSE ===', JSON.stringify(response, null, 2));
      if (response?.files && Array.isArray(response.files) && response.files.length > 0) {
        console.log('FILES FOUND:', response.files);
        setLeaveAttachments(prev => [...prev, ...response.files]);
        setSnackbar({ open: true, message: 'تم رفع الملفات بنجاح!', severity: 'success' });
      } else {
        console.error('NO FILES - response:', response);
        setSnackbar({ open: true, message: 'لم يتم استلام الملفات - تحقق من console', severity: 'error' });
      }
    } catch (err) {
      console.error('UPLOAD ERROR:', err);
      setSnackbar({ open: true, message: 'فشل رفع الملفات', severity: 'error' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleLetterFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    const formData = new FormData();
    Array.from(files).forEach(file => formData.append('files', file));
    try {
      const response = await api.postFormData<{ files: any[] }>('/letters/upload-attachments', formData);
      if (response?.files) {
        setLetterAttachments(prev => [...prev, ...response.files]);
        setSnackbar({ open: true, message: 'تم رفع الملفات بنجاح', severity: 'success' });
      }
    } catch {
      setSnackbar({ open: true, message: 'فشل رفع الملفات', severity: 'error' });
    } finally {
      setIsUploading(false);
    }
  };

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

  // Employee Dashboard
  if (stats && 'isEmployeeDashboard' in stats) {
    return <EmployeeDashboardView data={stats} />;
  }

  // Admin/Manager Dashboard
  const adminStats = stats as DashboardStats;
  const dashboardStats = adminStats || {
    employees: { total: 0, active: 0 },
    today: { present: 0, late: 0, earlyLeave: 0, absent: 0, workFromHome: 0 },
    pendingLeaves: 0,
    pendingLetters: 0,
  };

  const pieData = [
    { name: 'حاضر', value: dashboardStats.today.present, color: '#4caf50' },
    { name: 'متأخر', value: dashboardStats.today.late, color: '#ff9800' },
    { name: 'غائب', value: dashboardStats.today.absent, color: '#f44336' },
    { name: 'من المنزل', value: dashboardStats.today.workFromHome, color: '#9c27b0' },
  ].filter(item => item.value > 0);

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
      type: 'ops'
    },
    {
      title: 'الحضور اليوم',
      value: dashboardStats.today.present,
      subtitle: 'موظف حاضر',
      icon: <CheckCircle />,
      color: '#2e7d32',
      type: 'ops'
    },
    {
      title: 'المتأخرين',
      value: dashboardStats.today.late,
      subtitle: 'موظف متأخر',
      icon: <Schedule />,
      color: '#ed6c02',
      type: 'ops'
    },
    {
      title: 'الغياب',
      value: dashboardStats.today.absent,
      subtitle: 'موظف غائب',
      icon: <PersonOff />,
      color: '#d32f2f',
      type: 'ops'
    },
    {
      title: 'عمل من المنزل',
      value: dashboardStats.today.workFromHome,
      subtitle: 'موظف',
      icon: <HomeWork />,
      color: '#7b1fa2',
      type: 'ops'
    },
    // Requests
    {
      title: 'إجازات معلقة',
      value: dashboardStats.pendingLeaves,
      subtitle: 'قيد المراجعة',
      icon: <BeachAccess />,
      color: '#0288d1',
      type: 'req'
    },
    {
      title: 'خطابات معلقة',
      value: dashboardStats.pendingLetters || 0,
      subtitle: 'قيد المراجعة',
      icon: <Description />,
      color: '#ef5350',
      type: 'req'
    },
    {
      title: 'زيادات معلقة',
      value: dashboardStats.pendingRaises || 0,
      subtitle: 'قيد المراجعة',
      icon: <TrendIcon />,
      color: '#66bb6a',
      type: 'req'
    },
    {
      title: 'سلف معلقة',
      value: dashboardStats.pendingAdvances || 0,
      subtitle: 'قيد المراجعة',
      icon: <MonetizationOn />,
      color: '#ffa726',
      type: 'req'
    },
    {
      title: 'تحديث بيانات',
      value: dashboardStats.pendingDataUpdates || 0,
      subtitle: 'قيد المراجعة',
      icon: <RefreshIcon />,
      color: '#26c6da',
      type: 'req'
    },
    // Financials
    {
      title: 'حصة الشركة (تأمينات)',
      value: adminStats.financials?.employerGosiTotal || 0,
      subtitle: 'لهذا الشهر',
      icon: <SecurityIcon />,
      color: '#3949ab',
      type: 'fin',
      isCurrency: true
    },
    {
      title: 'تصفية مستحقات',
      value: adminStats.financials?.eosSettlementTotal || 0,
      subtitle: 'إجمالي المصروف',
      icon: <MonetizationOn />,
      color: '#e53935',
      type: 'fin',
      isCurrency: true
    },
    {
      title: 'القيود (مسودة)',
      value: adminStats.financials?.ledgerDraftAmount || 0,
      subtitle: 'بانتظار الترحيل',
      icon: <Description />,
      color: '#fb8c00',
      type: 'fin',
      isCurrency: true
    },
    {
      title: 'القيود (مُرحلة)',
      value: adminStats.financials?.ledgerPostedAmount || 0,
      subtitle: 'تم تأكيدها',
      icon: <CheckCircle />,
      color: '#43a047',
      type: 'fin',
      isCurrency: true
    },
  ];

  const opsCards = statCards.filter(c => c.type === 'ops');
  const reqCards = statCards.filter(c => c.type === 'req');
  const finCards = statCards.filter(c => c.type === 'fin');

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

      {/* Announcements Banner */}
      <AnnouncementsBanner />

      {/* Quick Actions for MANAGER role */}
      {(user?.role === 'MANAGER' || user?.role === 'ADMIN') && (
        <Paper elevation={2} sx={{ p: 3, mb: 4, borderRadius: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Add color="primary" />
            الخدمات المتاحة
          </Typography>
          <Divider sx={{ my: 2 }} />
          <Grid container spacing={2}>
            <Grid item xs={6} sm={4} md={2}>
              <Button
                fullWidth
                variant="contained"
                color="primary"
                size="large"
                startIcon={<BeachAccess />}
                onClick={() => setOpenLeaveDialog(true)}
                sx={{ py: 2, borderRadius: 2 }}
              >
                طلب إجازة
              </Button>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <Button
                fullWidth
                variant="contained"
                color="secondary"
                size="large"
                startIcon={<Mail />}
                onClick={() => setOpenLetterDialog(true)}
                sx={{ py: 2, borderRadius: 2 }}
              >
                طلب خطاب
              </Button>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <Button
                fullWidth
                variant="contained"
                color="success"
                size="large"
                startIcon={<MonetizationOn />}
                onClick={() => setOpenRaiseDialog(true)}
                sx={{ py: 2, borderRadius: 2 }}
              >
                طلب زيادة
              </Button>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <Button
                fullWidth
                variant="contained"
                color="warning"
                size="large"
                startIcon={<MonetizationOn />}
                onClick={() => setOpenAdvanceDialog(true)}
                sx={{ py: 2, borderRadius: 2, bgcolor: '#ff9800' }}
              >
                طلب سلفة
              </Button>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <Button
                fullWidth
                variant="outlined"
                color="info"
                size="large"
                startIcon={<PhoneAndroid />}
                onClick={() => navigate('/data-updates')}
                sx={{ py: 2, borderRadius: 2 }}
              >
                تحديث جهاز
              </Button>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <Button
                fullWidth
                variant="outlined"
                color="warning"
                size="large"
                startIcon={<Face />}
                onClick={() => navigate('/data-updates')}
                sx={{ py: 2, borderRadius: 2 }}
              >
                تحديث الوجه
              </Button>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Operations Summary */}
      <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ mt: 4, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <CheckCircle color="success" /> ملخص العمليات اليوم
      </Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {opsCards.map((card, index) => (
          <Grid item xs={12} sm={6} md={4} lg={2.4} key={index}>
            <Card sx={{ height: '100%', position: 'relative', overflow: 'visible', borderRadius: 3, border: `1px solid ${card.color}20` }}>
              <CardContent>
                <Box
                  sx={{
                    position: 'absolute',
                    top: -20,
                    right: 16,
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: card.color,
                    color: 'white',
                    boxShadow: `0 4px 20px 0 ${card.color}40`,
                  }}
                >
                  {card.icon}
                </Box>
                <Box sx={{ pt: 3 }}>
                  <Typography variant="h4" fontWeight="bold" color={card.color}>
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

      {/* Financial Analytics */}
      {(user?.role === 'ADMIN' || user?.role === 'HR' || user?.role === 'MANAGER' || user?.role === 'FINANCE') && finCards.length > 0 && (
        <>
          <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ mt: 4, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <MonetizationOn color="primary" /> التحليلات المالية (فترة: {adminStats.financials?.periodName})
          </Typography>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {finCards.map((card, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Card sx={{ height: '100%', position: 'relative', overflow: 'visible', borderRadius: 3, border: `1px solid ${card.color}20`, background: `linear-gradient(135deg, white 0%, ${card.color}08 100%)` }}>
                  <CardContent>
                    <Box
                      sx={{
                        position: 'absolute',
                        top: -20,
                        right: 16,
                        width: 48,
                        height: 48,
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: card.color,
                        color: 'white',
                        boxShadow: `0 4px 20px 0 ${card.color}40`,
                      }}
                    >
                      {card.icon}
                    </Box>
                    <Box sx={{ pt: 3 }}>
                      <Typography variant="h5" fontWeight="bold" color={card.color}>
                        {Number(card.value).toLocaleString('ar-SA')} {card.isCurrency ? 'ر.س' : ''}
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
        </>
      )}

      {/* Requests & Follow-ups */}
      <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ mt: 4, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Description color="primary" /> الطلبات والمراجعات المعلقة
      </Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {reqCards.map((card, index) => (
          <Grid item xs={12} sm={6} md={4} lg={2.4} key={index}>
            <Card sx={{ height: '100%', position: 'relative', overflow: 'visible', borderRadius: 3, border: `1px solid ${card.color}20`, bgcolor: `${card.color}05` }}>
              <CardContent>
                <Box
                  sx={{
                    position: 'absolute',
                    top: -20,
                    right: 16,
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: card.color,
                    color: 'white',
                    boxShadow: `0 4px 20px 0 ${card.color}40`,
                  }}
                >
                  {card.icon}
                </Box>
                <Box sx={{ pt: 3 }}>
                  <Typography variant="h4" fontWeight="bold" color={card.color}>
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

      {/* Compliance Snapshot */}
      {user?.role === 'ADMIN' && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ mt: 4, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <SecurityIcon color="info" /> الالتزام الحكومي
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Card
                sx={{
                  borderRadius: 3,
                  cursor: 'pointer',
                  border: '2px solid',
                  borderColor: 'success.light',
                  '&:hover': { boxShadow: 4 }
                }}
                onClick={() => navigate('/gosi')}
              >
                <CardContent sx={{ textAlign: 'center', py: 3 }}>
                  <CloudUpload sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                  <Typography variant="h6" fontWeight="bold">التأمينات GOSI</Typography>
                  <Chip label="مفعّل ✓" color="success" size="small" sx={{ mt: 1 }} />
                  <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
                    انقر لإدارة الإعدادات
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card
                sx={{
                  borderRadius: 3,
                  cursor: 'pointer',
                  border: '2px solid',
                  borderColor: 'warning.light',
                  '&:hover': { boxShadow: 4 }
                }}
                onClick={() => navigate('/wps-tracking')}
              >
                <CardContent sx={{ textAlign: 'center', py: 3 }}>
                  <CloudUpload sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                  <Typography variant="h6" fontWeight="bold">متابعة WPS</Typography>
                  <Chip label="تتبع الملفات" color="warning" size="small" sx={{ mt: 1 }} />
                  <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
                    انقر لعرض الحالة
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MudadComplianceCard />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card
                sx={{
                  borderRadius: 3,
                  cursor: 'pointer',
                  border: '2px solid',
                  borderColor: 'secondary.light',
                  '&:hover': { boxShadow: 4 }
                }}
                onClick={() => navigate('/contracts')}
              >
                <CardContent sx={{ textAlign: 'center', py: 3 }}>
                  <Description sx={{ fontSize: 40, color: 'secondary.main', mb: 1 }} />
                  <Typography variant="h6" fontWeight="bold">قوى - العقود</Typography>
                  <Chip label="عقود العمل" color="secondary" size="small" sx={{ mt: 1 }} />
                  <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
                    انقر لإدارة العقود
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Security & Compliance Alerts */}
      {dashboardStats.compliance && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SecurityIcon color="error" /> تنبيهات الأمن والالتزام
          </Typography>
          <Grid container spacing={2}>
            {dashboardStats.compliance.missingFace > 0 && (
              <Grid item xs={12} md={6}>
                <Alert
                  severity="warning"
                  variant="outlined"
                  icon={<Face />}
                  action={
                    <Button color="inherit" size="small" onClick={() => navigate('/users?filter=no-face')}>
                      تحسين الهوية
                    </Button>
                  }
                  sx={{ borderRadius: 2 }}
                >
                  يوجد <strong>{dashboardStats.compliance.missingFace}</strong> موظف لم يسجلوا بصمة الوجه بعد.
                </Alert>
              </Grid>
            )}
            {dashboardStats.compliance.suspiciousToday > 0 && (
              <Grid item xs={12} md={6}>
                <Alert
                  severity="error"
                  variant="outlined"
                  icon={<Warning />}
                  action={
                    <Button color="inherit" size="small" onClick={() => navigate('/exceptions')}>
                      مراجعة الآن
                    </Button>
                  }
                  sx={{ borderRadius: 2 }}
                >
                  تم رصد <strong>{dashboardStats.compliance.suspiciousToday}</strong> محاولة مشبوهة اليوم (موقع وهمي أو خارج النطاق).
                </Alert>
              </Grid>
            )}
          </Grid>
        </Box>
      )}

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
                  <RechartsTooltip />
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

        {/* Calendar Widget */}
        <Grid item xs={12} md={6} lg={4}>
          <CalendarWidget
            events={calendarEvents}
            onEventClick={(event) => {
              navigate(`/calendar?event=${event.id}`);
            }}
            onViewAll={() => navigate('/calendar')}
          />
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
                  <RechartsTooltip />
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

      {/* Manager Leave Request Dialog */}
      {(user?.role === 'MANAGER' || user?.role === 'ADMIN') && (
        <>
          <Dialog open={openLeaveDialog} onClose={() => setOpenLeaveDialog(false)} maxWidth="sm" fullWidth>
            <DialogTitle>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">طلب إجازة جديد</Typography>
                <IconButton onClick={() => setOpenLeaveDialog(false)}>
                  <Close />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>نوع الإجازة</InputLabel>
                    <Select
                      value={leaveForm.type}
                      label="نوع الإجازة"
                      onChange={(e) => setLeaveForm({ ...leaveForm, type: e.target.value })}
                    >
                      <MenuItem value="ANNUAL">سنوية</MenuItem>
                      <MenuItem value="SICK">مرضية</MenuItem>
                      <MenuItem value="EMERGENCY">طارئة</MenuItem>
                      <MenuItem value="UNPAID">بدون راتب</MenuItem>
                      <MenuItem value="PERMISSION">إذن</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="من تاريخ"
                    type="date"
                    value={leaveForm.startDate}
                    onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="إلى تاريخ"
                    type="date"
                    value={leaveForm.endDate}
                    onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="السبب"
                    multiline
                    rows={3}
                    value={leaveForm.reason}
                    onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  />
                </Grid>
                {/* File Upload Section */}
                <Grid item xs={12}>
                  <input
                    type="file"
                    ref={leaveFileInputRef}
                    style={{ display: 'none' }}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    multiple
                    onChange={(e) => handleLeaveFileUpload(e.target.files)}
                  />
                  <Button
                    variant="outlined"
                    startIcon={isUploading ? <CircularProgress size={16} /> : <CloudUpload />}
                    onClick={() => leaveFileInputRef.current?.click()}
                    disabled={isUploading}
                    sx={{ mb: 1 }}
                  >
                    {isUploading ? 'جاري الرفع...' : 'إرفاق ملفات (اختياري)'}
                  </Button>
                  {leaveAttachments.length > 0 && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {leaveAttachments.map((file, index) => (
                        <Chip
                          key={index}
                          icon={<AttachFile />}
                          label={file.originalName}
                          variant="outlined"
                          color="info"
                          onDelete={() => setLeaveAttachments(prev => prev.filter((_, i) => i !== index))}
                          deleteIcon={<Delete />}
                        />
                      ))}
                    </Box>
                  )}
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenLeaveDialog(false)}>إلغاء</Button>
              <Button
                variant="contained"
                startIcon={<Send />}
                onClick={() => leaveRequestMutation.mutate({ ...leaveForm, attachments: leaveAttachments })}
                disabled={leaveRequestMutation.isPending || !leaveForm.startDate || !leaveForm.endDate || !leaveForm.reason}
              >
                إرسال الطلب
              </Button>
            </DialogActions>
          </Dialog>

          {/* Manager Letter Request Dialog */}
          <Dialog open={openLetterDialog} onClose={() => setOpenLetterDialog(false)} maxWidth="sm" fullWidth>
            <DialogTitle>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">طلب خطاب جديد</Typography>
                <IconButton onClick={() => setOpenLetterDialog(false)}>
                  <Close />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>نوع الخطاب</InputLabel>
                    <Select
                      value={letterForm.type}
                      label="نوع الخطاب"
                      onChange={(e) => setLetterForm({ ...letterForm, type: e.target.value })}
                    >
                      <MenuItem value="CERTIFICATION">شهادة</MenuItem>
                      <MenuItem value="SALARY_CERTIFICATE">شهادة راتب</MenuItem>
                      <MenuItem value="EXPERIENCE_CERTIFICATE">شهادة خبرة</MenuItem>
                      <MenuItem value="REQUEST">طلب</MenuItem>
                      <MenuItem value="COMPLAINT">شكوى</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="الموضوع"
                    value={letterForm.subject}
                    onChange={(e) => setLetterForm({ ...letterForm, subject: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="المحتوى"
                    multiline
                    rows={4}
                    value={letterForm.content}
                    onChange={(e) => setLetterForm({ ...letterForm, content: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>الأولوية</InputLabel>
                    <Select
                      value={letterForm.priority}
                      label="الأولوية"
                      onChange={(e) => setLetterForm({ ...letterForm, priority: e.target.value })}
                    >
                      <MenuItem value="LOW">منخفضة</MenuItem>
                      <MenuItem value="NORMAL">عادية</MenuItem>
                      <MenuItem value="HIGH">عالية</MenuItem>
                      <MenuItem value="URGENT">عاجلة</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                {/* File Upload Section */}
                <Grid item xs={12}>
                  <input
                    type="file"
                    ref={letterFileInputRef}
                    style={{ display: 'none' }}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    multiple
                    onChange={(e) => handleLetterFileUpload(e.target.files)}
                  />
                  <Button
                    variant="outlined"
                    startIcon={isUploading ? <CircularProgress size={16} /> : <CloudUpload />}
                    onClick={() => letterFileInputRef.current?.click()}
                    disabled={isUploading}
                    sx={{ mb: 1 }}
                  >
                    {isUploading ? 'جاري الرفع...' : 'إرفاق ملفات (اختياري)'}
                  </Button>
                  {letterAttachments.length > 0 && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {letterAttachments.map((file, index) => (
                        <Chip
                          key={index}
                          icon={<AttachFile />}
                          label={file.originalName}
                          variant="outlined"
                          color="secondary"
                          onDelete={() => setLetterAttachments(prev => prev.filter((_, i) => i !== index))}
                          deleteIcon={<Delete />}
                        />
                      ))}
                    </Box>
                  )}
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenLetterDialog(false)}>إلغاء</Button>
              <Button
                variant="contained"
                color="secondary"
                startIcon={<Send />}
                onClick={() => letterRequestMutation.mutate({ ...letterForm, attachments: letterAttachments })}
                disabled={letterRequestMutation.isPending || !letterForm.subject || !letterForm.content}
              >
                إرسال الطلب
              </Button>
            </DialogActions>
          </Dialog>

          {/* Manager Raise Request Dialog */}
          <Dialog open={openRaiseDialog} onClose={() => setOpenRaiseDialog(false)} maxWidth="sm" fullWidth>
            <DialogTitle>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">طلب زيادة جديد</Typography>
                <IconButton onClick={() => setOpenRaiseDialog(false)}>
                  <Close />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>نوع الطلب</InputLabel>
                    <Select
                      value={raiseForm.type}
                      label="نوع الطلب"
                      onChange={(e) => setRaiseForm({ ...raiseForm, type: e.target.value })}
                    >
                      <MenuItem value="SALARY_INCREASE">زيادة راتب</MenuItem>
                      <MenuItem value="ANNUAL_LEAVE_BONUS">بدل إجازة سنوية</MenuItem>
                      <MenuItem value="BUSINESS_TRIP">رحلة عمل</MenuItem>
                      <MenuItem value="BONUS">مكافأة</MenuItem>
                      <MenuItem value="ALLOWANCE">بدل</MenuItem>
                      <MenuItem value="OTHER">أخرى</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="المبلغ (ر.س)"
                    type="number"
                    value={raiseForm.amount}
                    onChange={(e) => setRaiseForm({ ...raiseForm, amount: e.target.value })}
                    InputProps={{ inputProps: { min: 0 } }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="الزيادة لشهر"
                    type="month"
                    value={raiseForm.effectiveMonth}
                    onChange={(e) => setRaiseForm({ ...raiseForm, effectiveMonth: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="الملاحظات"
                    multiline
                    rows={3}
                    value={raiseForm.notes}
                    onChange={(e) => setRaiseForm({ ...raiseForm, notes: e.target.value })}
                    inputProps={{ maxLength: 200 }}
                    helperText={`${raiseForm.notes.length}/200`}
                  />
                </Grid>
                {/* File Upload Section */}
                <Grid item xs={12}>
                  <input
                    type="file"
                    ref={raiseFileInputRef}
                    style={{ display: 'none' }}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    multiple
                    onChange={async (e) => {
                      const files = e.target.files;
                      if (!files || files.length === 0) return;
                      setIsUploading(true);
                      const formData = new FormData();
                      Array.from(files).forEach(file => formData.append('files', file));
                      try {
                        const response = await api.postFormData<any>('/raises/upload-attachments', formData);
                        if (response?.files && Array.isArray(response.files)) {
                          setRaiseAttachments(prev => [...prev, ...response.files]);
                          setSnackbar({ open: true, message: 'تم رفع الملفات بنجاح', severity: 'success' });
                        }
                      } catch {
                        setSnackbar({ open: true, message: 'فشل رفع الملفات', severity: 'error' });
                      } finally {
                        setIsUploading(false);
                      }
                    }}
                  />
                  <Button
                    variant="outlined"
                    startIcon={isUploading ? <CircularProgress size={16} /> : <CloudUpload />}
                    onClick={() => raiseFileInputRef.current?.click()}
                    disabled={isUploading}
                    sx={{ mb: 1 }}
                  >
                    {isUploading ? 'جاري الرفع...' : 'إرفاق ملفات (اختياري)'}
                  </Button>
                  {raiseAttachments.length > 0 && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {raiseAttachments.map((file, index) => (
                        <Chip
                          key={index}
                          icon={<AttachFile />}
                          label={file.originalName}
                          variant="outlined"
                          color="success"
                          onDelete={() => setRaiseAttachments(prev => prev.filter((_, i) => i !== index))}
                          deleteIcon={<Delete />}
                        />
                      ))}
                    </Box>
                  )}
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenRaiseDialog(false)}>إلغاء</Button>
              <Button
                variant="contained"
                color="success"
                startIcon={<Send />}
                onClick={() => raiseRequestMutation.mutate({
                  type: raiseForm.type,
                  amount: parseFloat(raiseForm.amount),
                  effectiveMonth: raiseForm.effectiveMonth + '-01',
                  notes: raiseForm.notes || null,
                  attachments: raiseAttachments.length > 0 ? raiseAttachments : null,
                })}
                disabled={raiseRequestMutation.isPending || !raiseForm.amount || !raiseForm.effectiveMonth}
              >
                إرسال الطلب
              </Button>
            </DialogActions>
          </Dialog>

          {/* Manager Advance Request Dialog */}
          <Dialog open={openAdvanceDialog} onClose={() => setOpenAdvanceDialog(false)} maxWidth="sm" fullWidth>
            <DialogTitle>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">طلب سلفة جديد</Typography>
                <IconButton onClick={() => setOpenAdvanceDialog(false)}>
                  <Close />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>نوع السلفة</InputLabel>
                    <Select
                      value={advanceForm.type}
                      label="نوع السلفة"
                      onChange={(e) => setAdvanceForm({ ...advanceForm, type: e.target.value })}
                    >
                      <MenuItem value="BANK_TRANSFER">سلفة تحويل بنكي</MenuItem>
                      <MenuItem value="CASH">سلفه نقداً</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="المبلغ المطلوب"
                    type="number"
                    value={advanceForm.amount}
                    onChange={(e) => {
                      const val = e.target.value;
                      const deduction = val && advanceForm.periodMonths ? (Number(val) / Number(advanceForm.periodMonths)).toFixed(2) : '';
                      setAdvanceForm({ ...advanceForm, amount: val, monthlyDeduction: deduction });
                    }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="مدة السداد (شهور)"
                    type="number"
                    value={advanceForm.periodMonths}
                    onChange={(e) => {
                      const val = e.target.value;
                      const deduction = val && advanceForm.amount ? (Number(advanceForm.amount) / Number(val)).toFixed(2) : '';
                      setAdvanceForm({ ...advanceForm, periodMonths: val, monthlyDeduction: deduction });
                    }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="من تاريخ"
                    type="date"
                    value={advanceForm.startDate}
                    onChange={(e) => setAdvanceForm({ ...advanceForm, startDate: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="الاستقطاع الشهري"
                    type="number"
                    disabled
                    value={advanceForm.monthlyDeduction}
                    helperText="يتم حسابه تلقائياً"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="ملاحظات"
                    multiline
                    rows={2}
                    value={advanceForm.notes}
                    onChange={(e) => setAdvanceForm({ ...advanceForm, notes: e.target.value })}
                  />
                </Grid>
                {/* File Upload Section */}
                <Grid item xs={12}>
                  <input
                    type="file"
                    ref={advanceFileInputRef}
                    style={{ display: 'none' }}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    multiple
                    onChange={async (e) => {
                      const files = e.target.files;
                      if (!files || files.length === 0) return;
                      setIsUploading(true);
                      const formData = new FormData();
                      Array.from(files).forEach(file => formData.append('files', file));
                      try {
                        const response = await api.postFormData<any>('/advances/upload-attachments', formData);
                        if (response?.files && Array.isArray(response.files)) {
                          setAdvanceAttachments(prev => [...prev, ...response.files]);
                          setSnackbar({ open: true, message: 'تم رفع الملفات بنجاح', severity: 'success' });
                        }
                      } catch {
                        setSnackbar({ open: true, message: 'فشل رفع الملفات', severity: 'error' });
                      } finally {
                        setIsUploading(false);
                      }
                    }}
                  />
                  <Button
                    variant="outlined"
                    startIcon={isUploading ? <CircularProgress size={16} /> : <CloudUpload />}
                    onClick={() => advanceFileInputRef.current?.click()}
                    disabled={isUploading}
                    sx={{ mb: 1 }}
                  >
                    {isUploading ? 'جاري الرفع...' : 'إرفاق ملفات (اختياري)'}
                  </Button>
                  {advanceAttachments.length > 0 && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {advanceAttachments.map((file, index) => (
                        <Chip
                          key={index}
                          icon={<AttachFile />}
                          label={file.originalName}
                          variant="outlined"
                          color="warning"
                          onDelete={() => setAdvanceAttachments(prev => prev.filter((_, i) => i !== index))}
                          deleteIcon={<Delete />}
                        />
                      ))}
                    </Box>
                  )}
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenAdvanceDialog(false)}>إلغاء</Button>
              <Button
                variant="contained"
                color="warning"
                startIcon={<Send />}
                onClick={() => {
                  const start = new Date(advanceForm.startDate);
                  const end = new Date(start.setMonth(start.getMonth() + Number(advanceForm.periodMonths)));
                  advanceRequestMutation.mutate({
                    ...advanceForm,
                    endDate: end.toISOString().split('T')[0],
                    attachments: advanceAttachments
                  });
                }}
                disabled={advanceRequestMutation.isPending || !advanceForm.amount || !advanceForm.startDate || !advanceForm.periodMonths}
                sx={{ bgcolor: '#ff9800' }}
              >
                إرسال الطلب
              </Button>
            </DialogActions>
          </Dialog>
        </>
      )
      }

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box >
  );
};

// Enhanced Employee Dashboard Component with Quick Actions
function EmployeeDashboardView({ data }: { data: EmployeeDashboard }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [openLeaveDialog, setOpenLeaveDialog] = useState(false);
  const [openLetterDialog, setOpenLetterDialog] = useState(false);
  const [openRaiseDialog, setOpenRaiseDialog] = useState(false);
  const [openAdvanceDialog, setOpenAdvanceDialog] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  // Upload refs
  const leaveFileInputRef = useRef<HTMLInputElement>(null);
  const letterFileInputRef = useRef<HTMLInputElement>(null);
  const raiseFileInputRef = useRef<HTMLInputElement>(null);
  const advanceFileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Leave request form state
  const [leaveForm, setLeaveForm] = useState({ type: 'ANNUAL', startDate: '', endDate: '', reason: '' });
  const [leaveAttachments, setLeaveAttachments] = useState<any[]>([]);

  // Letter request form state
  const [letterForm, setLetterForm] = useState({ type: 'CERTIFICATION', subject: '', content: '', priority: 'NORMAL' });
  const [letterAttachments, setLetterAttachments] = useState<any[]>([]);

  // Raise form state
  const [raiseForm, setRaiseForm] = useState({ type: 'SALARY_INCREASE', amount: '', effectiveMonth: '', notes: '' });
  const [raiseAttachments, setRaiseAttachments] = useState<any[]>([]);

  // Advance form state
  const [advanceForm, setAdvanceForm] = useState({
    type: 'BANK_TRANSFER',
    amount: '',
    startDate: '',
    endDate: '',
    periodMonths: '',
    monthlyDeduction: '',
    notes: ''
  });
  const [advanceAttachments, setAdvanceAttachments] = useState<any[]>([]);

  // Fetch my recent requests
  const { data: myLeaves } = useQuery<{ data: Array<any> }>({
    queryKey: ['my-leaves'],
    queryFn: () => api.get('/leaves/my?limit=5'),
  });

  const { data: myLetters } = useQuery<{ data: Array<any> }>({
    queryKey: ['my-letters'],
    queryFn: () => api.get('/letters/my?limit=5'),
  });

  // Submit leave request
  const leaveRequestMutation = useMutation({
    mutationFn: (formData: any) => api.post('/leaves', formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['my-leaves'] });
      setOpenLeaveDialog(false);
      setLeaveForm({ type: 'ANNUAL', startDate: '', endDate: '', reason: '' });
      setSnackbar({ open: true, message: 'تم إرسال طلب الإجازة بنجاح', severity: 'success' });
    },
    onError: () => {
      setSnackbar({ open: true, message: 'فشل إرسال الطلب', severity: 'error' });
    },
  });

  // Submit letter request
  const letterRequestMutation = useMutation({
    mutationFn: (formData: any) => api.post('/letters', formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['my-letters'] });
      setOpenLetterDialog(false);
      setLetterForm({ type: 'CERTIFICATION', subject: '', content: '', priority: 'NORMAL' });
      setSnackbar({ open: true, message: 'تم إرسال طلب الخطاب بنجاح', severity: 'success' });
    },
    onError: () => {
      setSnackbar({ open: true, message: 'فشل إرسال الطلب', severity: 'error' });
    },
  });

  // Submit advance request
  const advanceRequestMutation = useMutation({
    mutationFn: (formData: any) => api.post('/advances', formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setOpenAdvanceDialog(false);
      setAdvanceForm({
        type: 'BANK_TRANSFER',
        amount: '',
        startDate: '',
        endDate: '',
        periodMonths: '',
        monthlyDeduction: '',
        notes: ''
      });
      setAdvanceAttachments([]);
      setSnackbar({ open: true, message: 'تم إرسال طلب السلفة بنجاح', severity: 'success' });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'فشل إرسال الطلب';
      setSnackbar({ open: true, message: msg, severity: 'error' });
    },
  });

  // Submit raise request
  const raiseRequestMutation = useMutation({
    mutationFn: (formData: any) => api.post('/raises', formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setOpenRaiseDialog(false);
      setRaiseForm({ type: 'SALARY_INCREASE', amount: '', effectiveMonth: '', notes: '' });
      setRaiseAttachments([]);
      setSnackbar({ open: true, message: 'تم إرسال طلب الزيادة بنجاح', severity: 'success' });
    },
    onError: () => {
      setSnackbar({ open: true, message: 'فشل إرسال الطلب', severity: 'error' });
    },
  });

  // Attachment Handler for Employee View
  const handleFileUpload = async (files: FileList | null, type: 'leave' | 'letter' | 'raise' | 'advance') => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    const formData = new FormData();
    Array.from(files).forEach(file => formData.append('files', file));

    let endpoint = '';
    switch (type) {
      case 'leave': endpoint = '/leaves/upload-attachments'; break;
      case 'letter': endpoint = '/letters/upload-attachments'; break;
      case 'raise': endpoint = '/raises/upload-attachments'; break;
      case 'advance': endpoint = '/advances/upload-attachments'; break;
    }

    try {
      const response = await api.postFormData<any>(endpoint, formData);
      if (response?.files && Array.isArray(response.files)) {
        if (type === 'leave') setLeaveAttachments(prev => [...prev, ...response.files]);
        if (type === 'letter') setLetterAttachments(prev => [...prev, ...response.files]);
        if (type === 'raise') setRaiseAttachments(prev => [...prev, ...response.files]);
        if (type === 'advance') setAdvanceAttachments(prev => [...prev, ...response.files]);
        setSnackbar({ open: true, message: 'تم رفع الملفات بنجاح', severity: 'success' });
      }
    } catch {
      setSnackbar({ open: true, message: 'فشل رفع الملفات', severity: 'error' });
    } finally {
      setIsUploading(false);
    }
  };

  const getLeaveTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      ANNUAL: 'سنوية',
      SICK: 'مرضية',
      EMERGENCY: 'طارئة',
      UNPAID: 'بدون راتب',
      PERMISSION: 'إذن',
    };
    return types[type] || type;
  };

  const getLetterTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      CERTIFICATION: 'شهادة',
      SALARY_CERTIFICATE: 'شهادة راتب',
      EXPERIENCE_CERTIFICATE: 'شهادة خبرة',
      REQUEST: 'طلب',
      COMPLAINT: 'شكوى',
    };
    return types[type] || type;
  };

  const getStatusLabel = (status: string) => {
    const statuses: Record<string, string> = {
      PENDING: 'قيد المراجعة',
      MGR_APPROVED: 'موافقة المدير',
      APPROVED: 'موافق عليه',
      REJECTED: 'مرفوض',
      DELAYED: 'مؤجل',
      CANCELLED: 'ملغي',
    };
    return statuses[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, 'warning' | 'info' | 'success' | 'error' | 'default'> = {
      PENDING: 'warning',
      MGR_APPROVED: 'info',
      APPROVED: 'success',
      REJECTED: 'error',
      DELAYED: 'default',
      CANCELLED: 'default',
    };
    return colors[status] || 'default';
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        لوحة التحكم الشخصية
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        مرحباً بك! يمكنك من هنا متابعة حضورك وإرسال الطلبات
      </Typography>

      <Grid container spacing={3}>
        {/* Today's Attendance */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                حضورك اليوم
              </Typography>
              {data.myAttendance ? (
                <Box>
                  <Box display="flex" alignItems="center" gap={2} mb={2}>
                    <Avatar sx={{ bgcolor: data.myAttendance.checkedIn ? 'success.main' : 'grey.400', width: 60, height: 60 }}>
                      {data.myAttendance.checkedIn ? <CheckCircle sx={{ fontSize: 32 }} /> : <Login sx={{ fontSize: 32 }} />}
                    </Avatar>
                    <Box>
                      <Typography variant="h5" fontWeight="bold">
                        {data.myAttendance.checkedIn ? 'أنت حاضر ✓' : 'لم تسجل بعد'}
                      </Typography>
                      <Typography color="text.secondary">
                        الحالة: {data.myAttendance.status || 'نشط'}
                      </Typography>
                    </Box>
                  </Box>
                  {data.myAttendance.checkInTime && (
                    <Box display="flex" gap={4}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">وقت الحضور</Typography>
                        <Typography variant="h6">{new Date(data.myAttendance.checkInTime).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</Typography>
                      </Box>
                      {data.myAttendance.checkOutTime && (
                        <Box>
                          <Typography variant="caption" color="text.secondary">وقت الانصراف</Typography>
                          <Typography variant="h6">{new Date(data.myAttendance.checkOutTime).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</Typography>
                        </Box>
                      )}
                      <Box>
                        <Typography variant="caption" color="text.secondary">ساعات العمل</Typography>
                        <Typography variant="h6">{Math.round((data.myAttendance.workingMinutes || 0) / 60 * 10) / 10} ساعة</Typography>
                      </Box>
                    </Box>
                  )}
                </Box>
              ) : (
                <Box display="flex" alignItems="center" justifyContent="center" height={150}>
                  <Typography color="text.secondary">لم تسجل حضورك اليوم</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Leave Balance */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                رصيد الإجازات
              </Typography>
              <Box display="flex" alignItems="center" justifyContent="center" py={2}>
                <Box textAlign="center">
                  <Typography variant="h2" fontWeight="bold" color="primary.main">
                    {data.remainingLeaveDays ?? '--'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    يوم متبقي من {data.annualLeaveDays ?? '--'} يوم
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={data.annualLeaveDays ? ((data.remainingLeaveDays || 0) / data.annualLeaveDays) * 100 : 0}
                    sx={{ mt: 2, height: 10, borderRadius: 5, width: 200 }}
                    color={
                      (data.remainingLeaveDays || 0) / (data.annualLeaveDays || 1) > 0.5
                        ? 'success'
                        : (data.remainingLeaveDays || 0) / (data.annualLeaveDays || 1) > 0.2
                          ? 'warning'
                          : 'error'
                    }
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12}>
          <Paper elevation={2} sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Add color="primary" />
              الخدمات المتاحة
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={6} sm={4} md={2}>
                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  size="large"
                  startIcon={<BeachAccess />}
                  onClick={() => setOpenLeaveDialog(true)}
                  sx={{ py: 2, borderRadius: 2 }}
                >
                  طلب إجازة
                </Button>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Button
                  fullWidth
                  variant="contained"
                  color="secondary"
                  size="large"
                  startIcon={<Mail />}
                  onClick={() => setOpenLetterDialog(true)}
                  sx={{ py: 2, borderRadius: 2 }}
                >
                  طلب خطاب
                </Button>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Button
                  fullWidth
                  variant="contained"
                  color="success"
                  size="large"
                  startIcon={<MonetizationOn />}
                  onClick={() => setOpenRaiseDialog(true)}
                  sx={{ py: 2, borderRadius: 2 }}
                >
                  طلب زيادة
                </Button>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Button
                  fullWidth
                  variant="contained"
                  color="warning"
                  size="large"
                  startIcon={<MonetizationOn />}
                  onClick={() => setOpenAdvanceDialog(true)}
                  sx={{ py: 2, borderRadius: 2, bgcolor: '#ff9800' }}
                >
                  طلب سلفة
                </Button>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Button
                  fullWidth
                  variant="outlined"
                  color="info"
                  size="large"
                  startIcon={<PhoneAndroid />}
                  onClick={() => navigate('/data-updates')}
                  sx={{ py: 2, borderRadius: 2 }}
                >
                  تحديث جهاز
                </Button>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Button
                  fullWidth
                  variant="outlined"
                  color="warning"
                  size="large"
                  startIcon={<Face />}
                  onClick={() => navigate('/data-updates')}
                  sx={{ py: 2, borderRadius: 2 }}
                >
                  تحديث الوجه
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* My Requests Summary */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <EventBusy color="primary" />
                ملخص طلباتي
              </Typography>
              <Grid container spacing={1} sx={{ mt: 1 }}>
                <Grid item xs={2.4}>
                  <Paper variant="outlined" sx={{ p: 1, textAlign: 'center', bgcolor: 'warning.50', minHeight: 80, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <Typography variant="h5" fontWeight="bold" color="warning.main">{data.myPendingLeaves}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>إجازات</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={2.4}>
                  <Paper variant="outlined" sx={{ p: 1, textAlign: 'center', bgcolor: 'info.50', minHeight: 80, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <Typography variant="h5" fontWeight="bold" color="info.main">{data.myPendingLetters}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>خطابات</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={2.4}>
                  <Paper variant="outlined" sx={{ p: 1, textAlign: 'center', bgcolor: 'success.50', minHeight: 80, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <Typography variant="h5" fontWeight="bold" color="success.main">{data.myPendingRaises || 0}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>زيادات</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={2.4}>
                  <Paper variant="outlined" sx={{ p: 1, textAlign: 'center', bgcolor: 'secondary.50', minHeight: 80, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <Typography variant="h5" fontWeight="bold" color="secondary.main">{data.myPendingAdvances || 0}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>سلف</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={2.4}>
                  <Paper variant="outlined" sx={{ p: 1, textAlign: 'center', bgcolor: 'primary.50', minHeight: 80, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <Typography variant="h5" fontWeight="bold" color="primary.main">{data.myPendingDataUpdates || 0}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>تحديثات</Typography>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Leaves */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <History color="primary" />
                  آخر طلبات الإجازات
                </Typography>
                <Button size="small" onClick={() => navigate('/leaves')}>عرض الكل</Button>
              </Box>
              <List dense sx={{ py: 0 }}>
                {myLeaves?.data?.slice(0, 4).map((leave: any, i: number) => (
                  <ListItem key={leave.id || i} sx={{ px: 0 }}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: getStatusColor(leave.status) + '.light', width: 36, height: 36 }}>
                        <BeachAccess sx={{ fontSize: 18 }} />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={getLeaveTypeLabel(leave.type)}
                      secondary={format(new Date(leave.startDate), 'dd/MM/yyyy', { locale: ar })}
                    />
                    <Chip label={getStatusLabel(leave.status)} size="small" color={getStatusColor(leave.status)} />
                  </ListItem>
                )) || (
                    <ListItem sx={{ px: 0 }}>
                      <ListItemText primary="لا توجد طلبات سابقة" />
                    </ListItem>
                  )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Letters */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Description color="secondary" />
                  آخر طلبات الخطابات
                </Typography>
                <Button size="small" onClick={() => navigate('/letters')}>عرض الكل</Button>
              </Box>
              <List dense sx={{ py: 0 }}>
                {myLetters?.data?.slice(0, 3).map((letter: any, i: number) => (
                  <ListItem key={letter.id || i} sx={{ px: 0 }}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: getStatusColor(letter.status) + '.light', width: 36, height: 36 }}>
                        <Mail sx={{ fontSize: 18 }} />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={letter.subject || getLetterTypeLabel(letter.type)}
                      secondary={format(new Date(letter.createdAt), 'dd/MM/yyyy', { locale: ar })}
                    />
                    <Chip label={getStatusLabel(letter.status)} size="small" color={getStatusColor(letter.status)} />
                  </ListItem>
                )) || (
                    <ListItem sx={{ px: 0 }}>
                      <ListItemText primary="لا توجد طلبات سابقة" />
                    </ListItem>
                  )}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Leave Request Dialog */}
      <Dialog open={openLeaveDialog} onClose={() => setOpenLeaveDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">طلب إجازة جديد</Typography>
            <IconButton onClick={() => setOpenLeaveDialog(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>نوع الإجازة</InputLabel>
                <Select
                  value={leaveForm.type}
                  label="نوع الإجازة"
                  onChange={(e) => setLeaveForm({ ...leaveForm, type: e.target.value })}
                >
                  <MenuItem value="ANNUAL">سنوية</MenuItem>
                  <MenuItem value="SICK">مرضية</MenuItem>
                  <MenuItem value="EMERGENCY">طارئة</MenuItem>
                  <MenuItem value="UNPAID">بدون راتب</MenuItem>
                  <MenuItem value="PERMISSION">إذن</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="من تاريخ"
                type="date"
                value={leaveForm.startDate}
                onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="إلى تاريخ"
                type="date"
                value={leaveForm.endDate}
                onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="السبب"
                multiline
                rows={3}
                value={leaveForm.reason}
                onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <input
                type="file"
                ref={leaveFileInputRef}
                style={{ display: 'none' }}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                multiple
                onChange={(e) => handleFileUpload(e.target.files, 'leave')}
              />
              <Button
                variant="outlined"
                startIcon={isUploading ? <CircularProgress size={16} /> : <CloudUpload />}
                onClick={() => leaveFileInputRef.current?.click()}
                disabled={isUploading}
              >
                إرفاق ملفات (اختياري)
              </Button>
              {leaveAttachments.length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                  {leaveAttachments.map((file, index) => (
                    <Chip key={index} label={file.originalName} size="small" onDelete={() => setLeaveAttachments(prev => prev.filter((_, i) => i !== index))} />
                  ))}
                </Box>
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenLeaveDialog(false)}>إلغاء</Button>
          <Button
            variant="contained"
            startIcon={<Send />}
            onClick={() => leaveRequestMutation.mutate(leaveForm)}
            disabled={leaveRequestMutation.isPending || !leaveForm.startDate || !leaveForm.endDate || !leaveForm.reason}
          >
            إرسال الطلب
          </Button>
        </DialogActions>
      </Dialog>

      {/* Letter Request Dialog */}
      <Dialog open={openLetterDialog} onClose={() => setOpenLetterDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">طلب خطاب جديد</Typography>
            <IconButton onClick={() => setOpenLetterDialog(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>نوع الخطاب</InputLabel>
                <Select
                  value={letterForm.type}
                  label="نوع الخطاب"
                  onChange={(e) => setLetterForm({ ...letterForm, type: e.target.value })}
                >
                  <MenuItem value="CERTIFICATION">شهادة</MenuItem>
                  <MenuItem value="SALARY_CERTIFICATE">شهادة راتب</MenuItem>
                  <MenuItem value="EXPERIENCE_CERTIFICATE">شهادة خبرة</MenuItem>
                  <MenuItem value="REQUEST">طلب</MenuItem>
                  <MenuItem value="COMPLAINT">شكوى</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="الموضوع"
                value={letterForm.subject}
                onChange={(e) => setLetterForm({ ...letterForm, subject: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="المحتوى"
                multiline
                rows={4}
                value={letterForm.content}
                onChange={(e) => setLetterForm({ ...letterForm, content: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>الأولوية</InputLabel>
                <Select
                  value={letterForm.priority}
                  label="الأولوية"
                  onChange={(e) => setLetterForm({ ...letterForm, priority: e.target.value })}
                >
                  <MenuItem value="LOW">منخفضة</MenuItem>
                  <MenuItem value="NORMAL">عادية</MenuItem>
                  <MenuItem value="HIGH">عالية</MenuItem>
                  <MenuItem value="URGENT">عاجلة</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <input
                type="file"
                ref={letterFileInputRef}
                style={{ display: 'none' }}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                multiple
                onChange={(e) => handleFileUpload(e.target.files, 'letter')}
              />
              <Button
                variant="outlined"
                startIcon={isUploading ? <CircularProgress size={16} /> : <CloudUpload />}
                onClick={() => letterFileInputRef.current?.click()}
                disabled={isUploading}
              >
                إرفاق ملفات (اختياري)
              </Button>
              {letterAttachments.length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                  {letterAttachments.map((file, index) => (
                    <Chip key={index} label={file.originalName} size="small" onDelete={() => setLetterAttachments(prev => prev.filter((_, i) => i !== index))} />
                  ))}
                </Box>
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenLetterDialog(false)}>إلغاء</Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<Send />}
            onClick={() => letterRequestMutation.mutate(letterForm)}
            disabled={letterRequestMutation.isPending || !letterForm.subject || !letterForm.content}
          >
            إرسال الطلب
          </Button>
        </DialogActions>
      </Dialog>

      {/* Raise Request Dialog */}
      <Dialog open={openRaiseDialog} onClose={() => setOpenRaiseDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">طلب زيادة جديد</Typography>
            <IconButton onClick={() => setOpenRaiseDialog(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>نوع الطلب</InputLabel>
                <Select
                  value={raiseForm.type}
                  label="نوع الطلب"
                  onChange={(e) => setRaiseForm({ ...raiseForm, type: e.target.value })}
                >
                  <MenuItem value="SALARY_INCREASE">زيادة راتب</MenuItem>
                  <MenuItem value="ANNUAL_LEAVE_BONUS">بدل إجازة سنوية</MenuItem>
                  <MenuItem value="BUSINESS_TRIP">رحلة عمل</MenuItem>
                  <MenuItem value="BONUS">مكافأة</MenuItem>
                  <MenuItem value="ALLOWANCE">بدل</MenuItem>
                  <MenuItem value="OTHER">أخرى</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="المبلغ (ر.س)"
                type="number"
                value={raiseForm.amount}
                onChange={(e) => setRaiseForm({ ...raiseForm, amount: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="الزيادة لشهر"
                type="month"
                value={raiseForm.effectiveMonth}
                onChange={(e) => setRaiseForm({ ...raiseForm, effectiveMonth: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="الملاحظات"
                multiline
                rows={3}
                value={raiseForm.notes}
                onChange={(e) => setRaiseForm({ ...raiseForm, notes: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <input
                type="file"
                ref={raiseFileInputRef}
                style={{ display: 'none' }}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                multiple
                onChange={(e) => handleFileUpload(e.target.files, 'raise')}
              />
              <Button
                variant="outlined"
                startIcon={isUploading ? <CircularProgress size={16} /> : <CloudUpload />}
                onClick={() => raiseFileInputRef.current?.click()}
                disabled={isUploading}
              >
                إرفاق ملفات (اختياري)
              </Button>
              {raiseAttachments.length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                  {raiseAttachments.map((file, index) => (
                    <Chip key={index} label={file.originalName} size="small" onDelete={() => setRaiseAttachments(prev => prev.filter((_, i) => i !== index))} />
                  ))}
                </Box>
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRaiseDialog(false)}>إلغاء</Button>
          <Button
            variant="contained"
            color="success"
            startIcon={<Send />}
            onClick={() => raiseRequestMutation.mutate({ ...raiseForm, attachments: raiseAttachments })}
            disabled={raiseRequestMutation.isPending || !raiseForm.amount}
          >
            إرسال الطلب
          </Button>
        </DialogActions>
      </Dialog>

      {/* Advance Request Dialog */}
      <Dialog open={openAdvanceDialog} onClose={() => setOpenAdvanceDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">طلب سلفة جديد</Typography>
            <IconButton onClick={() => setOpenAdvanceDialog(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>نوع السلفة</InputLabel>
                <Select
                  value={advanceForm.type}
                  label="نوع السلفة"
                  onChange={(e) => setAdvanceForm({ ...advanceForm, type: e.target.value })}
                >
                  <MenuItem value="BANK_TRANSFER">سلفة تحويل بنكي</MenuItem>
                  <MenuItem value="CASH">سلفه نقداً</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="المبلغ المطلوب"
                type="number"
                value={advanceForm.amount}
                onChange={(e) => {
                  const val = e.target.value;
                  const deduction = val && advanceForm.periodMonths ? (Number(val) / Number(advanceForm.periodMonths)).toFixed(2) : '';
                  setAdvanceForm({ ...advanceForm, amount: val, monthlyDeduction: deduction });
                }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="مدة السداد (شهور)"
                type="number"
                value={advanceForm.periodMonths}
                onChange={(e) => {
                  const val = e.target.value;
                  const deduction = val && advanceForm.amount ? (Number(advanceForm.amount) / Number(val)).toFixed(2) : '';
                  setAdvanceForm({ ...advanceForm, periodMonths: val, monthlyDeduction: deduction });
                }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="من تاريخ"
                type="date"
                value={advanceForm.startDate}
                onChange={(e) => setAdvanceForm({ ...advanceForm, startDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="الاستقطاع الشهري"
                type="number"
                disabled
                value={advanceForm.monthlyDeduction}
                helperText="يتم حسابه تلقائياً"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="ملاحظات"
                multiline
                rows={2}
                value={advanceForm.notes}
                onChange={(e) => setAdvanceForm({ ...advanceForm, notes: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <input
                type="file"
                ref={advanceFileInputRef}
                style={{ display: 'none' }}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                multiple
                onChange={(e) => handleFileUpload(e.target.files, 'advance')}
              />
              <Button
                variant="outlined"
                startIcon={isUploading ? <CircularProgress size={16} /> : <CloudUpload />}
                onClick={() => advanceFileInputRef.current?.click()}
                disabled={isUploading}
              >
                إرفاق ملفات (اختياري)
              </Button>
              {advanceAttachments.length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                  {advanceAttachments.map((file, index) => (
                    <Chip key={index} label={file.originalName} size="small" onDelete={() => setAdvanceAttachments(prev => prev.filter((_, i) => i !== index))} />
                  ))}
                </Box>
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAdvanceDialog(false)}>إلغاء</Button>
          <Button
            variant="contained"
            color="warning"
            startIcon={<Send />}
            onClick={() => {
              const start = new Date(advanceForm.startDate);
              const end = new Date(start.setMonth(start.getMonth() + Number(advanceForm.periodMonths)));
              advanceRequestMutation.mutate({
                ...advanceForm,
                endDate: end.toISOString().split('T')[0],
                attachments: advanceAttachments.length > 0 ? advanceAttachments.flat() : undefined
              });
            }}
            disabled={advanceRequestMutation.isPending || !advanceForm.amount || !advanceForm.startDate || !advanceForm.periodMonths}
            sx={{ bgcolor: '#ff9800' }}
          >
            إرسال الطلب
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
