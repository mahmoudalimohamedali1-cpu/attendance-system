import { useState, useEffect } from 'react';
import {
    Box,
    Container,
    Typography,
    Button,
    Card,
    CardContent,
    TextField,
    Grid,
    Chip,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert,
    CircularProgress,
    Tooltip,
    Paper,
    Divider,
    Switch,
    FormControlLabel,
    Fade,
    Collapse,
    Snackbar,
} from '@mui/material';
import {
    Add as AddIcon,
    Psychology as AiIcon,
    CheckCircle as ActiveIcon,
    PauseCircle as PausedIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Refresh as RefreshIcon,
    AutoAwesome as SparkleIcon,
    PlayArrow as PlayIcon,
    Stop as StopIcon,
    Info as InfoIcon,
} from '@mui/icons-material';
import { smartPoliciesService, SmartPolicy, ParsedPolicyRule, SmartPolicyStatus } from '../../services/smart-policies.service';

// ترجمة الـ trigger events
const triggerEventLabels: Record<string, string> = {
    ATTENDANCE: '🕐 الحضور والانصراف',
    LEAVE: '🏖️ الإجازات',
    CUSTODY: '📦 العهد',
    PAYROLL: '💰 الرواتب',
    ANNIVERSARY: '🎂 ذكرى التوظيف',
    CONTRACT: '📄 العقود',
    DISCIPLINARY: '⚠️ الجزاءات',
    PERFORMANCE: '📊 الأداء',
    CUSTOM: '🔧 مخصص',
};

// ترجمة حالات السياسة
const statusLabels: Record<SmartPolicyStatus, { label: string; color: 'default' | 'primary' | 'success' | 'warning' | 'error' }> = {
    DRAFT: { label: 'مسودة', color: 'default' },
    PENDING: { label: 'بانتظار الموافقة', color: 'warning' },
    ACTIVE: { label: 'مفعّلة', color: 'success' },
    PAUSED: { label: 'موقوفة', color: 'error' },
    ARCHIVED: { label: 'مؤرشفة', color: 'default' },
};

export default function SmartPoliciesPage() {
    // Snackbar state
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' | 'info' }>({
        open: false, message: '', severity: 'info'
    });
    const showSnackbar = (message: string, severity: 'success' | 'error' | 'warning' | 'info' = 'info') => {
        setSnackbar({ open: true, message, severity });
    };

    // الحالة
    const [policies, setPolicies] = useState<SmartPolicy[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ total: 0, active: 0, draft: 0, paused: 0 });

    // حوار إنشاء سياسة جديدة
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [policyText, setPolicyText] = useState('');
    const [analyzing, setAnalyzing] = useState(false);
    const [parsedRule, setParsedRule] = useState<ParsedPolicyRule | null>(null);
    const [saving, setSaving] = useState(false);

    // حوار التفاصيل
    const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
    const [selectedPolicy, setSelectedPolicy] = useState<SmartPolicy | null>(null);

    // جلب البيانات
    const fetchData = async () => {
        setLoading(true);
        try {
            const [policiesRes, statsRes] = await Promise.all([
                smartPoliciesService.getAll({ limit: 50 }),
                smartPoliciesService.getStats(),
            ]);
            setPolicies(policiesRes.data);
            setStats(statsRes.data);
        } catch (error: any) {
            console.error('Error fetching policies:', error);
            showSnackbar('حدث خطأ في جلب السياسات', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // تحليل النص بالذكاء الاصطناعي
    const handleAnalyze = async () => {
        if (!policyText.trim()) {
            showSnackbar('الرجاء كتابة نص السياسة', 'warning');
            return;
        }

        setAnalyzing(true);
        setParsedRule(null);
        try {
            const result = await smartPoliciesService.analyzePolicy(policyText);
            setParsedRule(result.parsedRule);
            showSnackbar('تم تحليل السياسة بنجاح! ✨', 'success');
        } catch (error: any) {
            console.error('Error analyzing policy:', error);
            showSnackbar(error.response?.data?.error || 'فشل في تحليل السياسة', 'error');
        } finally {
            setAnalyzing(false);
        }
    };

    // حفظ السياسة
    const handleSave = async () => {
        if (!parsedRule) return;

        setSaving(true);
        try {
            await smartPoliciesService.create({ originalText: policyText });
            showSnackbar('تم إنشاء السياسة بنجاح! 🎉', 'success');
            setCreateDialogOpen(false);
            setPolicyText('');
            setParsedRule(null);
            fetchData();
        } catch (error: any) {
            console.error('Error saving policy:', error);
            showSnackbar(error.response?.data?.error || 'فشل في حفظ السياسة', 'error');
        } finally {
            setSaving(false);
        }
    };

    // تفعيل/إيقاف سياسة
    const handleToggleActive = async (policy: SmartPolicy) => {
        try {
            if (policy.isActive) {
                await smartPoliciesService.deactivate(policy.id);
                showSnackbar('تم إيقاف السياسة', 'info');
            } else {
                await smartPoliciesService.activate(policy.id);
                showSnackbar('تم تفعيل السياسة ✅', 'success');
            }
            fetchData();
        } catch (error: any) {
            console.error('Error toggling policy:', error);
            showSnackbar('فشل في تحديث حالة السياسة', 'error');
        }
    };

    // حذف سياسة
    const handleDelete = async (id: string) => {
        if (!window.confirm('هل أنت متأكد من حذف هذه السياسة؟')) return;

        try {
            await smartPoliciesService.delete(id);
            showSnackbar('تم حذف السياسة', 'success');
            fetchData();
        } catch (error: any) {
            console.error('Error deleting policy:', error);
            showSnackbar('فشل في حذف السياسة', 'error');
        }
    };

    // عرض تفاصيل سياسة
    const handleViewDetails = (policy: SmartPolicy) => {
        setSelectedPolicy(policy);
        setDetailsDialogOpen(true);
    };

    return (
        <Container maxWidth="xl" sx={{ py: 3 }}>
            {/* العنوان والإحصائيات */}
            <Box sx={{ mb: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Box>
                        <Typography variant="h4" fontWeight="bold" gutterBottom>
                            🤖 السياسات الذكية
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            اكتب السياسة بالعربي والذكاء الاصطناعي هيفهمها ويطبقها تلقائياً
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <Button
                            variant="outlined"
                            startIcon={<RefreshIcon />}
                            onClick={fetchData}
                            disabled={loading}
                        >
                            تحديث
                        </Button>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => setCreateDialogOpen(true)}
                            sx={{
                                background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                                boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
                            }}
                        >
                            سياسة جديدة
                        </Button>
                    </Box>
                </Box>

                {/* بطاقات الإحصائيات */}
                <Grid container spacing={2}>
                    <Grid item xs={6} sm={3}>
                        <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
                            <Typography variant="h4" fontWeight="bold" color="primary">{stats.total}</Typography>
                            <Typography variant="body2" color="text.secondary">إجمالي السياسات</Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2, bgcolor: 'success.light' }}>
                            <Typography variant="h4" fontWeight="bold" color="success.dark">{stats.active}</Typography>
                            <Typography variant="body2" color="success.dark">مفعّلة</Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2, bgcolor: 'grey.100' }}>
                            <Typography variant="h4" fontWeight="bold" color="text.secondary">{stats.draft}</Typography>
                            <Typography variant="body2" color="text.secondary">مسودة</Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2, bgcolor: 'warning.light' }}>
                            <Typography variant="h4" fontWeight="bold" color="warning.dark">{stats.paused}</Typography>
                            <Typography variant="body2" color="warning.dark">موقوفة</Typography>
                        </Paper>
                    </Grid>
                </Grid>
            </Box>

            {/* قائمة السياسات */}
            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
                    <CircularProgress />
                </Box>
            ) : policies.length === 0 ? (
                <Paper sx={{ p: 5, textAlign: 'center', borderRadius: 3 }}>
                    <AiIcon sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
                    <Typography variant="h5" gutterBottom>لا توجد سياسات ذكية بعد</Typography>
                    <Typography color="text.secondary" sx={{ mb: 3 }}>
                        ابدأ بإنشاء أول سياسة ذكية واكتبها بالعربي والـ AI هيفهمها!
                    </Typography>
                    <Button
                        variant="contained"
                        size="large"
                        startIcon={<SparkleIcon />}
                        onClick={() => setCreateDialogOpen(true)}
                    >
                        إنشاء سياسة ذكية
                    </Button>
                </Paper>
            ) : (
                <Grid container spacing={3}>
                    {policies.map((policy) => (
                        <Grid item xs={12} md={6} lg={4} key={policy.id}>
                            <Card
                                sx={{
                                    height: '100%',
                                    borderRadius: 3,
                                    transition: 'transform 0.2s, box-shadow 0.2s',
                                    '&:hover': {
                                        transform: 'translateY(-4px)',
                                        boxShadow: 6,
                                    },
                                    border: policy.isActive ? '2px solid' : 'none',
                                    borderColor: 'success.main',
                                }}
                            >
                                <CardContent>
                                    {/* العنوان والحالة */}
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                        <Box sx={{ flex: 1 }}>
                                            <Typography variant="h6" fontWeight="bold" noWrap>
                                                {policy.name || 'سياسة بدون اسم'}
                                            </Typography>
                                            <Chip
                                                label={triggerEventLabels[policy.triggerEvent] || policy.triggerEvent}
                                                size="small"
                                                sx={{ mt: 0.5 }}
                                            />
                                        </Box>
                                        <Chip
                                            label={statusLabels[policy.status]?.label || policy.status}
                                            color={statusLabels[policy.status]?.color || 'default'}
                                            size="small"
                                        />
                                    </Box>

                                    {/* النص الأصلي */}
                                    <Paper
                                        sx={{
                                            p: 1.5,
                                            bgcolor: 'grey.50',
                                            borderRadius: 2,
                                            mb: 2,
                                            minHeight: 60,
                                        }}
                                    >
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                fontStyle: 'italic',
                                                display: '-webkit-box',
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: 'vertical',
                                                overflow: 'hidden',
                                            }}
                                        >
                                            "{policy.originalText}"
                                        </Typography>
                                    </Paper>

                                    {/* شرح الـ AI */}
                                    {policy.aiExplanation && (
                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                            sx={{
                                                mb: 2,
                                                display: '-webkit-box',
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: 'vertical',
                                                overflow: 'hidden',
                                            }}
                                        >
                                            💡 {policy.aiExplanation}
                                        </Typography>
                                    )}

                                    {/* إحصائيات */}
                                    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                                        <Chip
                                            label={`تم تنفيذها ${policy.executionCount} مرة`}
                                            size="small"
                                            variant="outlined"
                                        />
                                        {policy.totalAmountPaid > 0 && (
                                            <Chip
                                                label={`💰 ${policy.totalAmountPaid} ر.س`}
                                                size="small"
                                                color="success"
                                                variant="outlined"
                                            />
                                        )}
                                    </Box>

                                    <Divider sx={{ my: 1 }} />

                                    {/* الأزرار */}
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    checked={policy.isActive}
                                                    onChange={() => handleToggleActive(policy)}
                                                    color="success"
                                                />
                                            }
                                            label={policy.isActive ? 'مفعّلة' : 'موقوفة'}
                                        />
                                        <Box>
                                            <Tooltip title="التفاصيل">
                                                <IconButton onClick={() => handleViewDetails(policy)}>
                                                    <InfoIcon />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="حذف">
                                                <IconButton color="error" onClick={() => handleDelete(policy.id)}>
                                                    <DeleteIcon />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}

            {/* حوار إنشاء سياسة جديدة */}
            <Dialog
                open={createDialogOpen}
                onClose={() => !analyzing && !saving && setCreateDialogOpen(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle sx={{ pb: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <SparkleIcon color="primary" />
                        <Typography variant="h6">إنشاء سياسة ذكية جديدة</Typography>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 2 }}>
                        <Alert severity="info" sx={{ mb: 3 }}>
                            اكتب السياسة بالعربي العادي أو العامية، والذكاء الاصطناعي هيفهمها ويحولها لقاعدة قابلة للتنفيذ!
                            <br />
                            <strong>مثال:</strong> "لو الموظف رجّع العهدة قبل 16-12 ياخد 25 ريال مكافأة"
                        </Alert>

                        <TextField
                            fullWidth
                            multiline
                            rows={4}
                            label="اكتب السياسة هنا"
                            placeholder="مثال: لو الموظف اشتغل أكثر من 200 ساعة في الشهر يأخذ 100 ريال مكافأة"
                            value={policyText}
                            onChange={(e) => setPolicyText(e.target.value)}
                            disabled={analyzing}
                            sx={{ mb: 2 }}
                        />

                        <Button
                            variant="contained"
                            startIcon={analyzing ? <CircularProgress size={20} color="inherit" /> : <AiIcon />}
                            onClick={handleAnalyze}
                            disabled={analyzing || !policyText.trim()}
                            fullWidth
                            size="large"
                            sx={{
                                mb: 3,
                                background: 'linear-gradient(45deg, #9C27B0 30%, #E040FB 90%)',
                            }}
                        >
                            {analyzing ? 'جاري التحليل...' : '🪄 تحليل بالذكاء الاصطناعي'}
                        </Button>

                        {/* عرض النتيجة المحللة */}
                        <Collapse in={!!parsedRule}>
                            {parsedRule && (
                                <Paper sx={{ p: 3, bgcolor: 'success.light', borderRadius: 2 }}>
                                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <CheckCircleIcon color="success" /> الـ AI فهم السياسة!
                                    </Typography>

                                    <Grid container spacing={2}>
                                        <Grid item xs={12}>
                                            <Typography variant="subtitle2" color="text.secondary">الحدث المُفعِّل:</Typography>
                                            <Chip
                                                label={triggerEventLabels[parsedRule.trigger.event] || parsedRule.trigger.event}
                                                color="primary"
                                            />
                                        </Grid>

                                        <Grid item xs={12}>
                                            <Typography variant="subtitle2" color="text.secondary">الشروط:</Typography>
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                                {parsedRule.conditions.map((c, i) => (
                                                    <Chip
                                                        key={i}
                                                        label={`${c.field} ${c.operator} ${c.value}`}
                                                        variant="outlined"
                                                    />
                                                ))}
                                            </Box>
                                        </Grid>

                                        <Grid item xs={12}>
                                            <Typography variant="subtitle2" color="text.secondary">الإجراء:</Typography>
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                                {parsedRule.actions.map((a, i) => (
                                                    <Chip
                                                        key={i}
                                                        label={`${a.type}: ${a.value}`}
                                                        color="success"
                                                    />
                                                ))}
                                            </Box>
                                        </Grid>

                                        <Grid item xs={12}>
                                            <Typography variant="subtitle2" color="text.secondary">الشرح:</Typography>
                                            <Typography>{parsedRule.explanation}</Typography>
                                        </Grid>

                                        {parsedRule.clarificationNeeded && (
                                            <Grid item xs={12}>
                                                <Alert severity="warning">
                                                    ⚠️ {parsedRule.clarificationNeeded}
                                                </Alert>
                                            </Grid>
                                        )}
                                    </Grid>
                                </Paper>
                            )}
                        </Collapse>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3 }}>
                    <Button
                        onClick={() => { setCreateDialogOpen(false); setPolicyText(''); setParsedRule(null); }}
                        disabled={analyzing || saving}
                    >
                        إلغاء
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleSave}
                        disabled={!parsedRule || saving}
                        startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <CheckCircleIcon />}
                    >
                        {saving ? 'جاري الحفظ...' : 'حفظ السياسة'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* حوار التفاصيل */}
            <Dialog
                open={detailsDialogOpen}
                onClose={() => setDetailsDialogOpen(false)}
                maxWidth="md"
                fullWidth
            >
                {selectedPolicy && (
                    <>
                        <DialogTitle>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="h6">{selectedPolicy.name || 'تفاصيل السياسة'}</Typography>
                                <Chip
                                    label={statusLabels[selectedPolicy.status]?.label}
                                    color={statusLabels[selectedPolicy.status]?.color}
                                />
                            </Box>
                        </DialogTitle>
                        <DialogContent>
                            <Grid container spacing={2}>
                                <Grid item xs={12}>
                                    <Typography variant="subtitle2" color="text.secondary">النص الأصلي:</Typography>
                                    <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                                        <Typography>"{selectedPolicy.originalText}"</Typography>
                                    </Paper>
                                </Grid>

                                <Grid item xs={12}>
                                    <Typography variant="subtitle2" color="text.secondary">شرح الـ AI:</Typography>
                                    <Typography>{selectedPolicy.aiExplanation || 'لا يوجد شرح'}</Typography>
                                </Grid>

                                <Grid item xs={6}>
                                    <Typography variant="subtitle2" color="text.secondary">الحدث المُفعِّل:</Typography>
                                    <Chip label={triggerEventLabels[selectedPolicy.triggerEvent]} color="primary" />
                                </Grid>

                                <Grid item xs={6}>
                                    <Typography variant="subtitle2" color="text.secondary">النطاق:</Typography>
                                    <Chip label={selectedPolicy.scopeName || selectedPolicy.scopeType} />
                                </Grid>

                                <Grid item xs={6}>
                                    <Typography variant="subtitle2" color="text.secondary">عدد مرات التنفيذ:</Typography>
                                    <Typography variant="h5">{selectedPolicy.executionCount}</Typography>
                                </Grid>

                                <Grid item xs={6}>
                                    <Typography variant="subtitle2" color="text.secondary">إجمالي المبالغ:</Typography>
                                    <Typography variant="h5" color="success.main">
                                        {selectedPolicy.totalAmountPaid} ر.س
                                    </Typography>
                                </Grid>

                                <Grid item xs={12}>
                                    <Typography variant="subtitle2" color="text.secondary">القاعدة المحللة (JSON):</Typography>
                                    <Paper sx={{ p: 2, bgcolor: 'grey.900', color: 'grey.100', borderRadius: 2, overflow: 'auto' }}>
                                        <pre style={{ margin: 0, fontSize: 12 }}>
                                            {JSON.stringify(selectedPolicy.parsedRule, null, 2)}
                                        </pre>
                                    </Paper>
                                </Grid>
                            </Grid>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setDetailsDialogOpen(false)}>إغلاق</Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>

            {/* Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                    severity={snackbar.severity}
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Container>
    );
}

// أيقونة الـ CheckCircle للاستخدام داخل الملف
function CheckCircleIcon(props: any) {
    return <ActiveIcon {...props} />;
}
