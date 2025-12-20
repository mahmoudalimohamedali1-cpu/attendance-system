import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  Switch,
  FormControlLabel,
  Divider,
  CircularProgress,
  Tab,
  Tabs,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
} from '@mui/material';
import {
  Save,
  Add,
  Delete,
  Edit,
  Settings as SettingsIcon,
  CalendarMonth,
  Security,
  Notifications,
  EventNote,
  Refresh,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { api } from '@/services/api.service';

interface Holiday {
  id: string;
  name: string;
  nameEn: string;
  date: string;
  isRecurring: boolean;
}

interface LeavePolicy {
  disableLeaveCarryover: boolean;
  description: string;
}

export const SettingsPage = () => {
  const queryClient = useQueryClient();
  const [tabValue, setTabValue] = useState(0);
  const [openHolidayDialog, setOpenHolidayDialog] = useState(false);
  const [selectedHoliday, setSelectedHoliday] = useState<Holiday | null>(null);
  const [holidayForm, setHolidayForm] = useState({
    name: '',
    nameEn: '',
    date: '',
    isRecurring: false,
  });

  const [generalSettings, setGeneralSettings] = useState({
    companyName: 'شركة المثال',
    defaultTimezone: 'Africa/Cairo',
    workStartTime: '08:00',
    workEndTime: '17:00',
    lateGracePeriod: 15,
    earlyCheckInPeriod: 1440,
    enableNotifications: true,
    enableEmailAlerts: true,
    enableMockLocationDetection: false,
  });

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [disableLeaveCarryover, setDisableLeaveCarryover] = useState(false);

  // تحميل سياسة ترحيل الإجازات
  const { data: leavePolicy, isLoading: loadingLeavePolicy } = useQuery<LeavePolicy>({
    queryKey: ['leave-policy'],
    queryFn: () => api.get('/settings/leave-policy/carryover'),
  });

  // تحديث حالة الترحيل عند تحميل البيانات
  useEffect(() => {
    if (leavePolicy) {
      setDisableLeaveCarryover(leavePolicy.disableLeaveCarryover || false);
    }
  }, [leavePolicy]);

  // حفظ سياسة ترحيل الإجازات
  const saveLeavePolicyMutation = useMutation({
    mutationFn: (disableCarryover: boolean) =>
      api.post('/settings/leave-policy/carryover', { disableCarryover }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-policy'] });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
  });

  // إعادة ضبط رصيد الإجازات
  const resetLeaveBalancesMutation = useMutation({
    mutationFn: () => api.post('/settings/leave-policy/reset-balances'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-policy'] });
      alert('تم إعادة ضبط رصيد الإجازات لجميع الموظفين');
    },
  });

  // تحميل الإعدادات من الـ backend
  const { data: savedSettings, isLoading: loadingSettings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings'),
  });

  // تحديث الإعدادات المحلية عند تحميل البيانات
  useEffect(() => {
    if (savedSettings && Array.isArray(savedSettings)) {
      const settingsMap: Record<string, string> = {};
      savedSettings.forEach((s: { key: string; value: string }) => {
        settingsMap[s.key] = s.value;
      });
      
      setGeneralSettings(prev => ({
        ...prev,
        companyName: settingsMap.companyName || prev.companyName,
        defaultTimezone: settingsMap.defaultTimezone || prev.defaultTimezone,
        workStartTime: settingsMap.workStartTime || prev.workStartTime,
        workEndTime: settingsMap.workEndTime || prev.workEndTime,
        lateGracePeriod: parseInt(settingsMap.lateGracePeriod) || prev.lateGracePeriod,
        earlyCheckInPeriod: parseInt(settingsMap.earlyCheckInPeriod) || prev.earlyCheckInPeriod,
        enableNotifications: settingsMap.enableNotifications === 'true',
        enableEmailAlerts: settingsMap.enableEmailAlerts === 'true',
        enableMockLocationDetection: settingsMap.enableMockLocationDetection === 'true',
      }));
    }
  }, [savedSettings]);

  const { data: holidays, isLoading: loadingHolidays } = useQuery<Holiday[]>({
    queryKey: ['holidays'],
    queryFn: () => api.get('/settings/holidays/all'),
  });

  const createHolidayMutation = useMutation({
    mutationFn: (data: typeof holidayForm) => api.post('/settings/holidays', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      handleCloseHolidayDialog();
    },
  });

  const deleteHolidayMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/settings/holidays/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
    },
  });

  // حفظ الإعدادات العامة
  const saveSettingsMutation = useMutation({
    mutationFn: async (settings: typeof generalSettings) => {
      // حفظ كل إعداد في قاعدة البيانات
      const promises = Object.entries(settings).map(([key, value]) =>
        api.post('/settings', { key, value: String(value) })
      );
      await Promise.all(promises);
      
      // تحديث الفروع بالإعدادات الجديدة
      await api.post('/settings/bulk', {
        settings: [
          { key: 'workStartTime', value: settings.workStartTime },
          { key: 'workEndTime', value: settings.workEndTime },
          { key: 'lateGracePeriod', value: String(settings.lateGracePeriod) },
          { key: 'earlyCheckInPeriod', value: String(settings.earlyCheckInPeriod) },
        ]
      });
      
      return settings;
    },
    onSuccess: () => {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
  });

  const handleOpenHolidayDialog = (holiday?: Holiday) => {
    if (holiday) {
      setSelectedHoliday(holiday);
      setHolidayForm({
        name: holiday.name,
        nameEn: holiday.nameEn || '',
        date: holiday.date.split('T')[0],
        isRecurring: holiday.isRecurring,
      });
    } else {
      setSelectedHoliday(null);
      setHolidayForm({ name: '', nameEn: '', date: '', isRecurring: false });
    }
    setOpenHolidayDialog(true);
  };

  const handleCloseHolidayDialog = () => {
    setOpenHolidayDialog(false);
    setSelectedHoliday(null);
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        الإعدادات
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        إعدادات النظام والتكوين
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab icon={<SettingsIcon />} iconPosition="start" label="إعدادات عامة" />
          <Tab icon={<EventNote />} iconPosition="start" label="الإجازات" />
          <Tab icon={<CalendarMonth />} iconPosition="start" label="العطلات" />
          <Tab icon={<Security />} iconPosition="start" label="الأمان" />
          <Tab icon={<Notifications />} iconPosition="start" label="الإشعارات" />
        </Tabs>
      </Box>

      {/* General Settings */}
      {tabValue === 0 && loadingSettings && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      )}
      {tabValue === 0 && !loadingSettings && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>إعدادات الشركة</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="اسم الشركة"
                      value={generalSettings.companyName}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, companyName: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      select
                      label="المنطقة الزمنية"
                      value={generalSettings.defaultTimezone}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, defaultTimezone: e.target.value })}
                      SelectProps={{ native: true }}
                    >
                      <option value="Asia/Riyadh">توقيت الرياض</option>
                      <option value="Asia/Dubai">توقيت دبي</option>
                      <option value="Africa/Cairo">توقيت القاهرة</option>
                    </TextField>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>أوقات العمل الافتراضية</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      type="time"
                      label="بداية العمل"
                      value={generalSettings.workStartTime}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, workStartTime: e.target.value })}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      type="time"
                      label="نهاية العمل"
                      value={generalSettings.workEndTime}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, workEndTime: e.target.value })}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="فترة السماح للتأخير (دقيقة)"
                      value={generalSettings.lateGracePeriod}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, lateGracePeriod: parseInt(e.target.value) })}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="فترة الحضور المبكر (دقيقة)"
                      value={generalSettings.earlyCheckInPeriod}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, earlyCheckInPeriod: parseInt(e.target.value) })}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Button 
              variant="contained" 
              startIcon={saveSettingsMutation.isPending ? <CircularProgress size={20} color="inherit" /> : <Save />} 
              size="large"
              onClick={() => saveSettingsMutation.mutate(generalSettings)}
              disabled={saveSettingsMutation.isPending}
            >
              {saveSettingsMutation.isPending ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
            </Button>
            {saveSuccess && (
              <Chip 
                label="✅ تم الحفظ بنجاح!" 
                color="success" 
                sx={{ ml: 2 }} 
              />
            )}
            {saveSettingsMutation.isError && (
              <Chip 
                label="❌ فشل الحفظ" 
                color="error" 
                sx={{ ml: 2 }} 
              />
            )}
          </Grid>
        </Grid>
      )}

      {/* Leave Policy */}
      {tabValue === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>سياسة ترحيل الإجازات</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  تحكم في كيفية حساب رصيد الإجازات السنوية للموظفين
                </Typography>
                
                {loadingLeavePolicy ? (
                  <CircularProgress />
                ) : (
                  <List>
                    <ListItem>
                      <ListItemText
                        primary="شركتنا لا ترحل الإجازات"
                        secondary={
                          disableLeaveCarryover
                            ? "الرصيد يُعاد ضبطه في بداية كل سنة (21 يوم، أو 30 يوم بعد 5 سنوات خدمة)"
                            : "الأيام المتبقية تنتقل للسنة الجديدة"
                        }
                      />
                      <Switch
                        checked={disableLeaveCarryover}
                        onChange={(e) => setDisableLeaveCarryover(e.target.checked)}
                      />
                    </ListItem>
                  </List>
                )}

                <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                  <Button
                    variant="contained"
                    startIcon={saveLeavePolicyMutation.isPending ? <CircularProgress size={20} color="inherit" /> : <Save />}
                    onClick={() => saveLeavePolicyMutation.mutate(disableLeaveCarryover)}
                    disabled={saveLeavePolicyMutation.isPending}
                  >
                    حفظ السياسة
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>إعادة ضبط رصيد الإجازات</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  إعادة ضبط رصيد الإجازات يدوياً لجميع الموظفين
                </Typography>
                
                <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 1, mb: 2 }}>
                  <Typography variant="body2">
                    ⚠️ <strong>تحذير:</strong> هذا الإجراء سيؤدي إلى:
                  </Typography>
                  <Typography variant="body2" component="ul" sx={{ mt: 1, pl: 2 }}>
                    <li>إعادة ضبط الأيام المستخدمة إلى صفر</li>
                    <li>حساب الأيام السنوية بناءً على سنوات الخدمة</li>
                    <li>21 يوم للموظفين الجدد، 30 يوم بعد 5 سنوات</li>
                  </Typography>
                </Box>

                <Button
                  variant="outlined"
                  color="warning"
                  startIcon={resetLeaveBalancesMutation.isPending ? <CircularProgress size={20} /> : <Refresh />}
                  onClick={() => {
                    if (confirm('هل أنت متأكد من إعادة ضبط رصيد الإجازات لجميع الموظفين؟')) {
                      resetLeaveBalancesMutation.mutate();
                    }
                  }}
                  disabled={resetLeaveBalancesMutation.isPending || !disableLeaveCarryover}
                >
                  إعادة ضبط الرصيد الآن
                </Button>

                {!disableLeaveCarryover && (
                  <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
                    يجب تفعيل "لا ترحيل الإجازات" أولاً
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>معلومات حساب الإجازات</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                      <Typography variant="subtitle2" fontWeight="bold">النظام الحالي:</Typography>
                      <Typography variant="body2">
                        {disableLeaveCarryover
                          ? "بدون ترحيل - إعادة ضبط سنوية"
                          : "مع ترحيل - الأيام تنتقل للسنة الجديدة"}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
                      <Typography variant="subtitle2" fontWeight="bold">حساب الأيام:</Typography>
                      <Typography variant="body2">
                        • أقل من 5 سنوات خدمة: 21 يوم<br />
                        • 5 سنوات أو أكثر: 30 يوم
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Holidays */}
      {tabValue === 2 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">العطلات الرسمية</Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => handleOpenHolidayDialog()}
              >
                إضافة عطلة
              </Button>
            </Box>

            {loadingHolidays ? (
              <CircularProgress />
            ) : (
              <List>
                {holidays?.map((holiday) => (
                  <ListItem key={holiday.id} divider>
                    <ListItemText
                      primary={holiday.name}
                      secondary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {format(new Date(holiday.date), 'dd/MM/yyyy', { locale: ar })}
                          {holiday.isRecurring && (
                            <Chip label="متكررة سنوياً" size="small" color="primary" />
                          )}
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton onClick={() => handleOpenHolidayDialog(holiday)}>
                        <Edit />
                      </IconButton>
                      <IconButton
                        color="error"
                        onClick={() => {
                          if (confirm('هل أنت متأكد من الحذف؟')) {
                            deleteHolidayMutation.mutate(holiday.id);
                          }
                        }}
                      >
                        <Delete />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
                {!holidays?.length && (
                  <Typography color="text.secondary" py={2} textAlign="center">
                    لا توجد عطلات مضافة
                  </Typography>
                )}
              </List>
            )}
          </CardContent>
        </Card>
      )}

      {/* Security */}
      {tabValue === 3 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>إعدادات الأمان</Typography>
            <List>
              <ListItem>
                <ListItemText
                  primary="كشف المواقع الوهمية"
                  secondary="منع تسجيل الحضور من تطبيقات GPS الوهمية"
                />
                <Switch
                  checked={generalSettings.enableMockLocationDetection}
                  onChange={(e) => setGeneralSettings({
                    ...generalSettings,
                    enableMockLocationDetection: e.target.checked
                  })}
                />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText
                  primary="تسجيل الخروج التلقائي"
                  secondary="تسجيل خروج المستخدم بعد 30 دقيقة من عدم النشاط"
                />
                <Switch defaultChecked />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText
                  primary="المصادقة الثنائية"
                  secondary="طلب رمز تحقق إضافي عند تسجيل الدخول"
                />
                <Switch />
              </ListItem>
            </List>
          </CardContent>
        </Card>
      )}

      {/* Notifications */}
      {tabValue === 4 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>إعدادات الإشعارات</Typography>
            <List>
              <ListItem>
                <ListItemText
                  primary="إشعارات التطبيق"
                  secondary="إرسال إشعارات للموظفين عبر التطبيق"
                />
                <Switch
                  checked={generalSettings.enableNotifications}
                  onChange={(e) => setGeneralSettings({
                    ...generalSettings,
                    enableNotifications: e.target.checked
                  })}
                />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText
                  primary="تنبيهات البريد الإلكتروني"
                  secondary="إرسال تنبيهات للمدير عبر البريد الإلكتروني"
                />
                <Switch
                  checked={generalSettings.enableEmailAlerts}
                  onChange={(e) => setGeneralSettings({
                    ...generalSettings,
                    enableEmailAlerts: e.target.checked
                  })}
                />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText
                  primary="تنبيه التأخير"
                  secondary="إرسال إشعار عند تأخر موظف"
                />
                <Switch defaultChecked />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText
                  primary="تنبيه الغياب"
                  secondary="إرسال إشعار عند غياب موظف بدون إذن"
                />
                <Switch defaultChecked />
              </ListItem>
            </List>
          </CardContent>
        </Card>
      )}

      {/* Holiday Dialog */}
      <Dialog open={openHolidayDialog} onClose={handleCloseHolidayDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{selectedHoliday ? 'تعديل عطلة' : 'إضافة عطلة جديدة'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="اسم العطلة (عربي)"
                value={holidayForm.name}
                onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="اسم العطلة (إنجليزي)"
                value={holidayForm.nameEn}
                onChange={(e) => setHolidayForm({ ...holidayForm, nameEn: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="date"
                label="التاريخ"
                value={holidayForm.date}
                onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={holidayForm.isRecurring}
                    onChange={(e) => setHolidayForm({ ...holidayForm, isRecurring: e.target.checked })}
                  />
                }
                label="عطلة متكررة سنوياً"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseHolidayDialog}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={() => createHolidayMutation.mutate(holidayForm)}
            disabled={createHolidayMutation.isPending}
          >
            {createHolidayMutation.isPending ? <CircularProgress size={24} /> : 'حفظ'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
