import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  ListItemIcon,
  Chip,
  Alert,
  IconButton,
  Tooltip,
  Breadcrumbs,
  Link,
} from '@mui/material';
import {
  Save,
  ArrowBack,
  Settings as SettingsIcon,
  History,
  HealthAndSafety,
  Cable,
  PlayArrow,
  CheckCircle,
  Error as ErrorIcon,
  Warning,
  Info,
  Refresh,
  OpenInNew,
  ContentCopy,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  getIntegrationDetails,
  configureIntegration,
  toggleIntegration,
  testConnection,
  getIntegrationHealth,
  getIntegrationLogs,
  type Integration,
  type IntegrationHealthResponse,
  type IntegrationLog,
  type ConfigureIntegrationDto,
} from '@/services/integrations.service';
import { IntegrationHealthMonitor } from '@/components/integrations';

/**
 * Category labels (Arabic)
 */
const categoryLabels: Record<string, string> = {
  ACCOUNTING: 'محاسبة',
  ERP: 'تخطيط موارد',
  COMMUNICATION: 'اتصالات',
  HR: 'موارد بشرية',
  PAYROLL: 'رواتب',
  BANKING: 'بنوك',
};

/**
 * Log action icons and colors
 */
const logActionConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  TEST_CONNECTION: { icon: <PlayArrow />, color: '#667eea' },
  CONFIGURE: { icon: <SettingsIcon />, color: '#10B981' },
  ENABLE: { icon: <CheckCircle />, color: '#10B981' },
  DISABLE: { icon: <ErrorIcon />, color: '#EF4444' },
  SYNC: { icon: <Refresh />, color: '#F59E0B' },
  ERROR: { icon: <Warning />, color: '#EF4444' },
  INFO: { icon: <Info />, color: '#3B82F6' },
};

/**
 * Integration Detail Page
 * Displays integration details, configuration form, health status, and activity logs
 */
export const IntegrationDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Tab state
  const [tabValue, setTabValue] = useState(0);

  // Config form state
  const [configForm, setConfigForm] = useState<ConfigureIntegrationDto>({
    apiKey: '',
    apiSecret: '',
    webhookUrl: '',
    syncEnabled: true,
    syncInterval: 60,
    configData: {},
  });

  // Success/error states
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Fetch integration details
  const {
    data: integration,
    isLoading: loadingIntegration,
    isError: errorIntegration,
    error: integrationError,
  } = useQuery({
    queryKey: ['integration', id],
    queryFn: () => getIntegrationDetails(id!),
    enabled: !!id,
  });

  // Fetch health status
  const {
    data: health,
    isLoading: loadingHealth,
    refetch: refetchHealth,
  } = useQuery({
    queryKey: ['integration-health', id],
    queryFn: () => getIntegrationHealth(id!),
    enabled: !!id,
  });

  // Fetch activity logs
  const { data: logs, isLoading: loadingLogs } = useQuery({
    queryKey: ['integration-logs', id],
    queryFn: () => getIntegrationLogs(id!, { limit: 50 }),
    enabled: !!id,
  });

  // Update config form when integration data loads
  useEffect(() => {
    if (integration?.config) {
      const config = integration.config as Record<string, unknown>;
      setConfigForm({
        apiKey: (config.apiKey as string) || '',
        apiSecret: (config.apiSecret as string) || '',
        webhookUrl: (config.webhookUrl as string) || '',
        syncEnabled: (config.syncEnabled as boolean) ?? true,
        syncInterval: (config.syncInterval as number) || 60,
        configData: (config.configData as Record<string, unknown>) || {},
      });
    }
  }, [integration]);

  // Configure integration mutation
  const configureMutation = useMutation({
    mutationFn: (config: ConfigureIntegrationDto) =>
      configureIntegration(id!, config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integration', id] });
      queryClient.invalidateQueries({ queryKey: ['integration-health', id] });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
  });

  // Toggle integration mutation
  const toggleMutation = useMutation({
    mutationFn: (enabled: boolean) => toggleIntegration(id!, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integration', id] });
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      queryClient.invalidateQueries({ queryKey: ['integration-health', id] });
    },
  });

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: () => testConnection(id!),
    onSuccess: (result) => {
      setTestResult({
        success: result.success,
        message: result.message,
      });
      queryClient.invalidateQueries({ queryKey: ['integration-logs', id] });
      setTimeout(() => setTestResult(null), 5000);
    },
    onError: (error) => {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'فشل اختبار الاتصال',
      });
      setTimeout(() => setTestResult(null), 5000);
    },
  });

  // Handle save configuration
  const handleSaveConfig = () => {
    configureMutation.mutate(configForm);
  };

  // Handle toggle enabled
  const handleToggleEnabled = () => {
    if (integration) {
      toggleMutation.mutate(!integration.enabled);
    }
  };

  // Copy to clipboard helper
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Loading state
  if (loadingIntegration) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress size={48} />
      </Box>
    );
  }

  // Error state
  if (errorIntegration || !integration) {
    return (
      <Box>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/integrations')}
          sx={{ mb: 2 }}
        >
          العودة للتكاملات
        </Button>
        <Alert severity="error">
          {integrationError instanceof Error
            ? integrationError.message
            : 'فشل في تحميل بيانات التكامل'}
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link
          component="button"
          underline="hover"
          color="inherit"
          onClick={() => navigate('/integrations')}
          sx={{ cursor: 'pointer' }}
        >
          سوق التكاملات
        </Link>
        <Typography color="text.primary">{integration.name}</Typography>
      </Breadcrumbs>

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate('/integrations')}>
            <ArrowBack />
          </IconButton>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
              <Cable sx={{ fontSize: 28, color: 'primary.main' }} />
              <Typography variant="h4" fontWeight="bold">
                {integration.name}
              </Typography>
              <Chip
                label={integration.enabled ? 'مفعّل' : 'معطّل'}
                color={integration.enabled ? 'success' : 'default'}
                size="small"
              />
            </Box>
            <Typography variant="body2" color="text.secondary">
              {integration.provider && `مزود: ${integration.provider}`}
            </Typography>
          </Box>
        </Box>

        {/* Toggle and Test Buttons */}
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={testConnectionMutation.isPending ? <CircularProgress size={16} /> : <PlayArrow />}
            onClick={() => testConnectionMutation.mutate()}
            disabled={testConnectionMutation.isPending}
          >
            اختبار الاتصال
          </Button>
          <FormControlLabel
            control={
              <Switch
                checked={integration.enabled}
                onChange={handleToggleEnabled}
                disabled={toggleMutation.isPending}
              />
            }
            label={integration.enabled ? 'مفعّل' : 'معطّل'}
          />
        </Box>
      </Box>

      {/* Test Result Alert */}
      {testResult && (
        <Alert
          severity={testResult.success ? 'success' : 'error'}
          sx={{ mb: 3 }}
          onClose={() => setTestResult(null)}
        >
          {testResult.message}
        </Alert>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab icon={<SettingsIcon />} iconPosition="start" label="الإعدادات" />
          <Tab icon={<HealthAndSafety />} iconPosition="start" label="الحالة الصحية" />
          <Tab icon={<History />} iconPosition="start" label="سجل النشاط" />
        </Tabs>
      </Box>

      {/* Configuration Tab */}
      {tabValue === 0 && (
        <Grid container spacing={3}>
          {/* API Credentials Card */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  بيانات API
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  أدخل بيانات الاعتماد للاتصال بالخدمة
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="مفتاح API"
                      type="password"
                      value={configForm.apiKey}
                      onChange={(e) =>
                        setConfigForm({ ...configForm, apiKey: e.target.value })
                      }
                      InputProps={{
                        endAdornment: configForm.apiKey && (
                          <Tooltip title="نسخ">
                            <IconButton
                              size="small"
                              onClick={() => copyToClipboard(configForm.apiKey || '')}
                            >
                              <ContentCopy fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="كلمة سر API"
                      type="password"
                      value={configForm.apiSecret}
                      onChange={(e) =>
                        setConfigForm({ ...configForm, apiSecret: e.target.value })
                      }
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="رابط Webhook"
                      type="url"
                      placeholder="https://example.com/webhook"
                      value={configForm.webhookUrl}
                      onChange={(e) =>
                        setConfigForm({ ...configForm, webhookUrl: e.target.value })
                      }
                      InputProps={{
                        endAdornment: configForm.webhookUrl && (
                          <Tooltip title="فتح في نافذة جديدة">
                            <IconButton
                              size="small"
                              onClick={() => window.open(configForm.webhookUrl, '_blank')}
                            >
                              <OpenInNew fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        ),
                      }}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Sync Settings Card */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  إعدادات المزامنة
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  تحكم في كيفية مزامنة البيانات مع الخدمة
                </Typography>

                <List disablePadding>
                  <ListItem sx={{ px: 0 }}>
                    <ListItemText
                      primary="تفعيل المزامنة التلقائية"
                      secondary="مزامنة البيانات تلقائياً بشكل دوري"
                    />
                    <Switch
                      checked={configForm.syncEnabled}
                      onChange={(e) =>
                        setConfigForm({ ...configForm, syncEnabled: e.target.checked })
                      }
                    />
                  </ListItem>
                  <Divider />
                  <ListItem sx={{ px: 0 }}>
                    <ListItemText
                      primary="فترة المزامنة (دقيقة)"
                      secondary="الفترة بين كل عملية مزامنة"
                    />
                    <TextField
                      type="number"
                      size="small"
                      value={configForm.syncInterval}
                      onChange={(e) =>
                        setConfigForm({
                          ...configForm,
                          syncInterval: parseInt(e.target.value) || 60,
                        })
                      }
                      sx={{ width: 100 }}
                      inputProps={{ min: 5, max: 1440 }}
                      disabled={!configForm.syncEnabled}
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Integration Info Card */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  معلومات التكامل
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      المعرف
                    </Typography>
                    <Typography variant="body2" fontFamily="monospace">
                      {integration.id}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      المزود
                    </Typography>
                    <Typography variant="body2">{integration.provider || '-'}</Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      تاريخ الإنشاء
                    </Typography>
                    <Typography variant="body2">
                      {integration.createdAt
                        ? format(new Date(integration.createdAt), 'dd/MM/yyyy HH:mm', { locale: ar })
                        : '-'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      آخر تحديث
                    </Typography>
                    <Typography variant="body2">
                      {integration.updatedAt
                        ? format(new Date(integration.updatedAt), 'dd/MM/yyyy HH:mm', { locale: ar })
                        : '-'}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Save Button */}
          <Grid item xs={12}>
            <Button
              variant="contained"
              size="large"
              startIcon={
                configureMutation.isPending ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <Save />
                )
              }
              onClick={handleSaveConfig}
              disabled={configureMutation.isPending}
            >
              {configureMutation.isPending ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
            </Button>
            {saveSuccess && (
              <Chip
                label="تم الحفظ بنجاح!"
                icon={<CheckCircle />}
                color="success"
                sx={{ ml: 2 }}
              />
            )}
            {configureMutation.isError && (
              <Chip
                label="فشل الحفظ"
                icon={<ErrorIcon />}
                color="error"
                sx={{ ml: 2 }}
              />
            )}
          </Grid>
        </Grid>
      )}

      {/* Health Tab */}
      {tabValue === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <IntegrationHealthMonitor
              health={health || null}
              isLoading={loadingHealth}
              onRefresh={() => refetchHealth()}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  ملخص الحالة
                </Typography>

                {loadingHealth ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : health ? (
                  <List>
                    <ListItem>
                      <ListItemIcon>
                        {health.details.configValid ? (
                          <CheckCircle color="success" />
                        ) : (
                          <Warning color="warning" />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary="الإعدادات"
                        secondary={health.details.configValid ? 'صحيحة ومكتملة' : 'غير مكتملة'}
                      />
                    </ListItem>
                    <Divider />
                    <ListItem>
                      <ListItemIcon>
                        {health.details.enabled ? (
                          <CheckCircle color="success" />
                        ) : (
                          <ErrorIcon color="error" />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary="الحالة"
                        secondary={health.details.enabled ? 'مفعّل ويعمل' : 'معطّل'}
                      />
                    </ListItem>
                    <Divider />
                    <ListItem>
                      <ListItemIcon>
                        <Info color="info" />
                      </ListItemIcon>
                      <ListItemText
                        primary="اسم التكامل"
                        secondary={health.details.integrationName}
                      />
                    </ListItem>
                    <Divider />
                    <ListItem>
                      <ListItemIcon>
                        <Cable color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary="المزود"
                        secondary={health.details.provider}
                      />
                    </ListItem>
                  </List>
                ) : (
                  <Typography color="text.secondary" textAlign="center" py={4}>
                    لا توجد بيانات صحية متاحة
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Health Tips */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  نصائح للحفاظ على صحة التكامل
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Box sx={{ p: 2, bgcolor: 'success.light', borderRadius: 2 }}>
                      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                        تأكد من صحة بيانات API
                      </Typography>
                      <Typography variant="body2">
                        تحقق من أن مفتاح API وكلمة السر صحيحين وغير منتهيين
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Box sx={{ p: 2, bgcolor: 'info.light', borderRadius: 2 }}>
                      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                        راقب سجل النشاط
                      </Typography>
                      <Typography variant="body2">
                        تابع الأخطاء في سجل النشاط لاكتشاف المشاكل مبكراً
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 2 }}>
                      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                        اختبر الاتصال دورياً
                      </Typography>
                      <Typography variant="body2">
                        استخدم زر اختبار الاتصال للتأكد من عمل التكامل
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Activity Logs Tab */}
      {tabValue === 2 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">سجل النشاط</Typography>
              <Button
                size="small"
                startIcon={<Refresh />}
                onClick={() =>
                  queryClient.invalidateQueries({ queryKey: ['integration-logs', id] })
                }
              >
                تحديث
              </Button>
            </Box>

            {loadingLogs ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : logs && logs.length > 0 ? (
              <List>
                {logs.map((log, index) => {
                  const actionConfig = logActionConfig[log.action] || logActionConfig.INFO;
                  return (
                    <Box key={log.id}>
                      <ListItem alignItems="flex-start">
                        <ListItemIcon sx={{ minWidth: 40 }}>
                          <Box
                            sx={{
                              width: 32,
                              height: 32,
                              borderRadius: 1,
                              bgcolor: `${actionConfig.color}15`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: actionConfig.color,
                            }}
                          >
                            {actionConfig.icon}
                          </Box>
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2" fontWeight="medium">
                                {log.action}
                              </Typography>
                              <Chip
                                label={log.status}
                                size="small"
                                color={
                                  log.status === 'SUCCESS'
                                    ? 'success'
                                    : log.status === 'ERROR'
                                    ? 'error'
                                    : 'default'
                                }
                                sx={{ height: 20, fontSize: '0.7rem' }}
                              />
                            </Box>
                          }
                          secondary={
                            <Box>
                              {log.message && (
                                <Typography variant="body2" color="text.secondary">
                                  {log.message}
                                </Typography>
                              )}
                              <Typography variant="caption" color="text.disabled">
                                {format(new Date(log.createdAt), 'dd/MM/yyyy HH:mm:ss', {
                                  locale: ar,
                                })}
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                      {index < logs.length - 1 && <Divider />}
                    </Box>
                  );
                })}
              </List>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <History sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                <Typography color="text.secondary">لا توجد سجلات نشاط</Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default IntegrationDetailPage;
