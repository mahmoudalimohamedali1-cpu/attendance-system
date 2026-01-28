import { useState, useEffect, useMemo } from 'react';
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
    Tabs,
    Tab,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    alpha,
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
    Science as TestIcon,
    Preview as PreviewIcon,
    History as HistoryIcon,
    Send as SendIcon,
    ThumbUp as ApproveIcon,
    ThumbDown as RejectIcon,
    PlaylistAddCheck as QueueIcon,
    Timeline as TimelineIcon,
    Warning as WarningIcon,
    Assignment as AuditIcon,
    MoreVert as MoreVertIcon,
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

    // 🆕 Tab Filter & Action Menu
    const [activeTab, setActiveTab] = useState<'ALL' | SmartPolicyStatus>('ALL');
    const [menuAnchor, setMenuAnchor] = useState<{ el: HTMLElement | null; policy: SmartPolicy | null }>({ el: null, policy: null });


    // حوار إنشاء سياسة جديدة
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [policyText, setPolicyText] = useState('');
    const [analyzing, setAnalyzing] = useState(false);
    const [parsedRule, setParsedRule] = useState<ParsedPolicyRule | null>(null);
    const [feasibility, setFeasibility] = useState<{
        isExecutable: boolean;
        availableFields: Array<{ field: string; source: string; dataType: string; exists: boolean; hasData: boolean }>;
        missingFields: Array<{ field: string; reason: string; suggestion: string; priority: 'HIGH' | 'MEDIUM' | 'LOW' }>;
        summary: { totalConditions: number; satisfiedConditions: number; missingConditions: number; executionReadiness: 'READY' | 'PARTIAL' | 'NOT_READY'; confidenceScore: number };
        recommendations: string[];
        warnings: string[];
    } | null>(null);
    const [saving, setSaving] = useState(false);

    // حوار التفاصيل
    const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
    const [selectedPolicy, setSelectedPolicy] = useState<SmartPolicy | null>(null);

    // Test Mode
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{
        success: boolean;
        matchedEmployees: number;
        totalAmount: number;
        sampleResults: Array<{ employeeName: string; amount: number; }>;
    } | null>(null);

    // 🧠 Self-Extending AI State
    const [extendDialogOpen, setExtendDialogOpen] = useState(false);
    const [extending, setExtending] = useState(false);
    const [extendResult, setExtendResult] = useState<{
        needsExtension: boolean;
        extended?: boolean;
        addedModels?: string[];
        message: string;
        missingFields?: Array<{ name: string; type: string; description: string }>;
        suggestedModels?: Array<{ name: string; fields: Array<{ name: string; type: string }> }>;
    } | null>(null);
    const [extendText, setExtendText] = useState('');

    // === NEW: Approval Queue State ===
    const [approvalQueue, setApprovalQueue] = useState<any[]>([]);
    const [approvalQueueLoading, setApprovalQueueLoading] = useState(false);
    const [showApprovalQueue, setShowApprovalQueue] = useState(false);

    // === NEW: Simulation State ===
    const [simulationDialogOpen, setSimulationDialogOpen] = useState(false);
    const [simulationPolicy, setSimulationPolicy] = useState<SmartPolicy | null>(null);
    const [simulationPeriod, setSimulationPeriod] = useState(new Date().toISOString().slice(0, 7));
    const [simulating, setSimulating] = useState(false);
    const [simulationResult, setSimulationResult] = useState<any>(null);

    // === NEW: Version History State ===
    const [versionDialogOpen, setVersionDialogOpen] = useState(false);
    const [versionPolicy, setVersionPolicy] = useState<SmartPolicy | null>(null);
    const [versions, setVersions] = useState<any[]>([]);
    const [versionsLoading, setVersionsLoading] = useState(false);

    // === NEW: Conflict Detection State ===
    const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
    const [conflictPolicy, setConflictPolicy] = useState<SmartPolicy | null>(null);
    const [conflictResult, setConflictResult] = useState<{
        hasConflicts: boolean;
        conflictingPolicies: any[];
        warnings: string[];
    } | null>(null);
    const [conflictsLoading, setConflictsLoading] = useState(false);

    // === NEW: Audit Log State ===
    const [auditDialogOpen, setAuditDialogOpen] = useState(false);
    const [auditPolicy, setAuditPolicy] = useState<SmartPolicy | null>(null);
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [auditLoading, setAuditLoading] = useState(false);

    // اختبار السياسة
    const handleTestPolicy = async (policy: SmartPolicy) => {
        setTesting(true);
        setTestResult(null);
        try {
            // Simulate test results (in real implementation, call backend test endpoint)
            // For now, generate sample data
            await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call

            const sampleResults = [
                { employeeName: 'أحمد محمد', amount: 150 },
                { employeeName: 'سارة أحمد', amount: 100 },
                { employeeName: 'محمد علي', amount: 200 },
            ];

            setTestResult({
                success: true,
                matchedEmployees: 15,
                totalAmount: sampleResults.reduce((sum, r) => sum + r.amount, 0),
                sampleResults,
            });
            showSnackbar('تم اختبار السياسة بنجاح! ✅', 'success');
        } catch (error: any) {
            console.error('Error testing policy:', error);
            showSnackbar('فشل في اختبار السياسة', 'error');
            setTestResult({ success: false, matchedEmployees: 0, totalAmount: 0, sampleResults: [] });
        } finally {
            setTesting(false);
        }
    };

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

    // === NEW: Fetch Approval Queue ===
    const fetchApprovalQueue = async () => {
        setApprovalQueueLoading(true);
        try {
            const result = await smartPoliciesService.getApprovalQueue();
            setApprovalQueue(result.data || []);
        } catch (error: any) {
            console.error('Error fetching approval queue:', error);
            showSnackbar('فشل في جلب قائمة الموافقات', 'error');
        } finally {
            setApprovalQueueLoading(false);
        }
    };

    // === NEW: Submit for Approval ===
    const handleSubmitForApproval = async (policy: SmartPolicy) => {
        try {
            await smartPoliciesService.submitForApproval(policy.id);
            showSnackbar('تم إرسال السياسة للموافقة ✅', 'success');
            fetchData();
        } catch (error: any) {
            console.error('Error submitting for approval:', error);
            showSnackbar(error.response?.data?.message || 'فشل في إرسال السياسة للموافقة', 'error');
        }
    };

    // === NEW: Approve Policy ===
    const handleApprove = async (policyId: string, activateNow: boolean = true) => {
        try {
            await smartPoliciesService.approve(policyId, undefined, activateNow);
            showSnackbar('تمت الموافقة على السياسة ✅', 'success');
            fetchData();
            fetchApprovalQueue();
        } catch (error: any) {
            console.error('Error approving policy:', error);
            showSnackbar('فشل في الموافقة على السياسة', 'error');
        }
    };

    // === NEW: Reject Policy ===
    const handleReject = async (policyId: string) => {
        const reason = window.prompt('سبب الرفض:');
        if (!reason) return;
        try {
            await smartPoliciesService.reject(policyId, reason);
            showSnackbar('تم رفض السياسة', 'info');
            fetchData();
            fetchApprovalQueue();
        } catch (error: any) {
            console.error('Error rejecting policy:', error);
            showSnackbar('فشل في رفض السياسة', 'error');
        }
    };

    // === NEW: Open Simulation Dialog ===
    const handleOpenSimulation = (policy: SmartPolicy) => {
        setSimulationPolicy(policy);
        setSimulationResult(null);
        setSimulationDialogOpen(true);
    };

    // === NEW: Run Simulation ===
    const handleRunSimulation = async () => {
        if (!simulationPolicy) return;
        setSimulating(true);
        try {
            const result = await smartPoliciesService.simulate(simulationPolicy.id, simulationPeriod);
            setSimulationResult(result);
            showSnackbar(`تم المحاكاة: ${result.summary.affectedEmployees} موظف متأثر`, 'success');
        } catch (error: any) {
            console.error('Error running simulation:', error);
            showSnackbar('فشل في تشغيل المحاكاة', 'error');
        } finally {
            setSimulating(false);
        }
    };

    // === NEW: Open Version History ===
    const handleOpenVersionHistory = async (policy: SmartPolicy) => {
        setVersionPolicy(policy);
        setVersionDialogOpen(true);
        setVersionsLoading(true);
        try {
            const result = await smartPoliciesService.getVersionHistory(policy.id);
            setVersions(result.data || []);
        } catch (error: any) {
            console.error('Error fetching version history:', error);
            showSnackbar('فشل في جلب تاريخ الإصدارات', 'error');
        } finally {
            setVersionsLoading(false);
        }
    };

    // === NEW: Revert to Version ===
    const handleRevertToVersion = async (versionNumber: number) => {
        if (!versionPolicy) return;
        if (!window.confirm(`هل تريد استعادة الإصدار ${versionNumber}؟`)) return;
        try {
            await smartPoliciesService.revertToVersion(versionPolicy.id, versionNumber);
            showSnackbar(`تم استعادة الإصدار ${versionNumber} ✅`, 'success');
            setVersionDialogOpen(false);
            fetchData();
        } catch (error: any) {
            console.error('Error reverting to version:', error);
            showSnackbar('فشل في استعادة الإصدار', 'error');
        }
    };

    // === NEW: Open Conflict Detection ===
    const handleOpenConflicts = async (policy: SmartPolicy) => {
        setConflictPolicy(policy);
        setConflictDialogOpen(true);
        setConflictsLoading(true);
        setConflictResult(null);
        try {
            const result = await smartPoliciesService.detectConflicts(policy.id);
            setConflictResult({
                hasConflicts: result.hasConflicts,
                conflictingPolicies: result.conflictingPolicies || [],
                warnings: result.warnings || [],
            });
        } catch (error: any) {
            console.error('Error detecting conflicts:', error);
            showSnackbar('فشل في اكتشاف التعارضات', 'error');
        } finally {
            setConflictsLoading(false);
        }
    };

    // === NEW: Open Audit Log ===
    const handleOpenAuditLog = async (policy: SmartPolicy) => {
        setAuditPolicy(policy);
        setAuditDialogOpen(true);
        setAuditLoading(true);
        try {
            const result = await smartPoliciesService.getAuditLog(policy.id);
            setAuditLogs(result.data || []);
        } catch (error: any) {
            console.error('Error fetching audit log:', error);
            showSnackbar('فشل في جلب سجل التدقيق', 'error');
        } finally {
            setAuditLoading(false);
        }
    };

    // تحليل النص بالذكاء الاصطناعي
    const handleAnalyze = async () => {
        if (!policyText.trim()) {
            showSnackbar('الرجاء كتابة نص السياسة', 'warning');
            return;
        }

        setAnalyzing(true);
        setParsedRule(null);
        setFeasibility(null);
        try {
            const result = await smartPoliciesService.analyzePolicy(policyText);
            setParsedRule(result.parsedRule);
            if (result.feasibility) {
                setFeasibility(result.feasibility);
                if (result.feasibility.isExecutable) {
                    showSnackbar('✅ تم تحليل السياسة بنجاح! السياسة جاهزة للتنفيذ', 'success');
                } else if (result.feasibility.summary.executionReadiness === 'PARTIAL') {
                    showSnackbar('⚠️ تم تحليل السياسة - بعض الشروط ناقصة', 'warning');
                } else {
                    showSnackbar('❌ السياسة تحتاج إضافات - راجع التفاصيل', 'error');
                }
            } else {
                showSnackbar('تم تحليل السياسة بنجاح! ✨', 'success');
            }
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

    // 🧠 تحليل وتوسيع النظام تلقائياً
    const handleAnalyzeAndExtend = async (confirm: boolean = false) => {
        if (!extendText.trim()) {
            showSnackbar('الرجاء كتابة وصف السياسة', 'warning');
            return;
        }

        // Prevent double-click
        if (extending) return;

        setExtending(true);
        // Only clear result for new analysis, not for confirm
        if (!confirm) {
            setExtendResult(null);
        }

        try {
            console.log('🔍 Starting auto-extend analysis...', { confirm });
            const result = await smartPoliciesService.autoExtend(extendText, confirm);
            console.log('✅ Auto-extend result:', result);

            if (result) {
                setExtendResult(result);

                if (result.needsExtension && !confirm) {
                    showSnackbar('تم اكتشاف حقول ناقصة! راجعها وأكد التوسيع 🔧', 'info');
                } else if (result.extended) {
                    showSnackbar(`🎉 تم توسيع النظام! أضفنا: ${result.addedModels?.join(', ')}`, 'success');
                } else if (!result.needsExtension) {
                    showSnackbar('✅ السياسة يمكن تنفيذها بالحقول الحالية', 'success');
                }
            }
        } catch (error: any) {
            console.error('❌ Error extending system:', error);
            console.error('❌ Error name:', error?.name);
            console.error('❌ Error message:', error?.message);
            console.error('❌ Error response:', error?.response?.data);

            // Build a useful error message
            const errorMessage =
                error?.response?.data?.message ||
                error?.message ||
                'حدث خطأ غير متوقع';

            showSnackbar(errorMessage, 'error');
        } finally {
            setExtending(false);
        }
    };

    // 🆕 Filtered policies based on active tab
    const filteredPolicies = useMemo(() => {
        if (activeTab === 'ALL') return policies;
        return policies.filter(p => p.status === activeTab);
    }, [policies, activeTab]);

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
                            variant="outlined"
                            color="secondary"
                            startIcon={<SparkleIcon />}
                            onClick={() => setExtendDialogOpen(true)}
                            sx={{
                                borderColor: '#1976d2',
                                color: '#1976d2',
                                '&:hover': {
                                    borderColor: '#1565c0',
                                    bgcolor: 'rgba(25, 118, 210, 0.04)',
                                },
                            }}
                        >
                            🧠 توسيع النظام
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

            {/* 🆕 Tabs للفلترة */}
            <Paper sx={{ mb: 3, borderRadius: 2, overflow: 'hidden' }}>
                <Tabs
                    value={activeTab}
                    onChange={(_, newValue) => setActiveTab(newValue)}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{
                        '& .MuiTab-root': {
                            fontWeight: 600,
                            minHeight: 56,
                        },
                    }}
                >
                    <Tab
                        value="ALL"
                        label={`📋 الكل (${stats.total})`}
                        sx={{ '&.Mui-selected': { bgcolor: alpha('#2196F3', 0.1) } }}
                    />
                    <Tab
                        value="ACTIVE"
                        label={`✅ مفعّلة (${stats.active})`}
                        sx={{ '&.Mui-selected': { bgcolor: alpha('#4caf50', 0.1) } }}
                    />
                    <Tab
                        value="DRAFT"
                        label={`📝 مسودة (${stats.draft})`}
                        sx={{ '&.Mui-selected': { bgcolor: alpha('#9e9e9e', 0.1) } }}
                    />
                    <Tab
                        value="PENDING"
                        label={`⏳ بانتظار الموافقة (${policies.filter(p => p.status === 'PENDING').length})`}
                        sx={{ '&.Mui-selected': { bgcolor: alpha('#ff9800', 0.1) } }}
                    />
                    <Tab
                        value="PAUSED"
                        label={`⏸️ موقوفة (${stats.paused})`}
                        sx={{ '&.Mui-selected': { bgcolor: alpha('#f44336', 0.1) } }}
                    />
                </Tabs>
            </Paper>

            {/* قائمة السياسات المفلترة */}
            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
                    <CircularProgress />
                </Box>
            ) : filteredPolicies.length === 0 ? (
                <Paper sx={{ p: 5, textAlign: 'center', borderRadius: 3 }}>
                    <AiIcon sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
                    <Typography variant="h5" gutterBottom>
                        {activeTab === 'ALL' ? 'لا توجد سياسات ذكية بعد' : `لا توجد سياسات ${statusLabels[activeTab as SmartPolicyStatus]?.label || ''}`}
                    </Typography>
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
                    {filteredPolicies.map((policy) => (
                        <Grid item xs={12} md={6} lg={4} key={policy.id}>
                            <Card sx={{
                                height: '100%',
                                borderRadius: 3,
                                transition: 'all 0.3s ease',
                                '&:hover': { transform: 'translateY(-4px)', boxShadow: 8 },
                                border: policy.isActive ? '2px solid' : 'none',
                                borderColor: policy.isActive ? 'success.main' : 'transparent',
                                background: 'linear-gradient(135deg, rgba(255,255,255,1) 0%, rgba(245,247,250,1) 100%)',
                            }}>
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
                                            label={policy.isActive ? '🟢 نشطة' : '⚪ متوقفة'}
                                        />
                                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                                            {/* Submit for Approval - only for DRAFT */}
                                            {policy.status === 'DRAFT' && (
                                                <Tooltip title="إرسال للموافقة">
                                                    <IconButton
                                                        color="primary"
                                                        size="small"
                                                        onClick={() => handleSubmitForApproval(policy)}
                                                    >
                                                        <SendIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                            {/* Approve/Reject - only for PENDING */}
                                            {policy.status === 'PENDING' && (
                                                <>
                                                    <Tooltip title="موافقة">
                                                        <IconButton
                                                            color="success"
                                                            size="small"
                                                            onClick={() => handleApprove(policy.id)}
                                                        >
                                                            <ApproveIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="رفض">
                                                        <IconButton
                                                            color="error"
                                                            size="small"
                                                            onClick={() => handleReject(policy.id)}
                                                        >
                                                            <RejectIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </>
                                            )}
                                            {/* التفاصيل */}
                                            <Tooltip title="التفاصيل">
                                                <IconButton size="small" onClick={() => handleViewDetails(policy)}>
                                                    <InfoIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            {/* قائمة المزيد */}
                                            <Tooltip title="المزيد">
                                                <IconButton
                                                    size="small"
                                                    onClick={(e) => setMenuAnchor({ el: e.currentTarget, policy })}
                                                >
                                                    <MoreVertIcon fontSize="small" />
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


            {/* 🆕 قائمة الإجراءات المنسدلة */}
            <Menu
                anchorEl={menuAnchor.el}
                open={Boolean(menuAnchor.el)}
                onClose={() => setMenuAnchor({ el: null, policy: null })}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
                <MenuItem onClick={() => { handleOpenSimulation(menuAnchor.policy!); setMenuAnchor({ el: null, policy: null }); }}>
                    <ListItemIcon><TestIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>محاكاة</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => { handleOpenVersionHistory(menuAnchor.policy!); setMenuAnchor({ el: null, policy: null }); }}>
                    <ListItemIcon><HistoryIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>تاريخ الإصدارات</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => { handleOpenConflicts(menuAnchor.policy!); setMenuAnchor({ el: null, policy: null }); }}>
                    <ListItemIcon><WarningIcon fontSize="small" color="warning" /></ListItemIcon>
                    <ListItemText>اكتشاف التعارضات</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => { handleOpenAuditLog(menuAnchor.policy!); setMenuAnchor({ el: null, policy: null }); }}>
                    <ListItemIcon><AuditIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>سجل التدقيق</ListItemText>
                </MenuItem>
                <Divider />
                <MenuItem
                    onClick={() => { handleDelete(menuAnchor.policy!.id); setMenuAnchor({ el: null, policy: null }); }}
                    sx={{ color: 'error.main' }}
                >
                    <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
                    <ListItemText>حذف</ListItemText>
                </MenuItem>
            </Menu>

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
                                background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                                boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
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

                            {/* 🎯 عرض نتيجة فحص الجاهزية */}
                            {feasibility && (
                                <Paper sx={{
                                    p: 3,
                                    mt: 2,
                                    borderRadius: 2,
                                    bgcolor: feasibility.isExecutable ? 'success.light' :
                                        feasibility.summary.executionReadiness === 'PARTIAL' ? 'warning.light' : 'error.light',
                                    border: 2,
                                    borderColor: feasibility.isExecutable ? 'success.main' :
                                        feasibility.summary.executionReadiness === 'PARTIAL' ? 'warning.main' : 'error.main',
                                }}>
                                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        {feasibility.isExecutable ? '✅ السياسة جاهزة للتنفيذ!' :
                                            feasibility.summary.executionReadiness === 'PARTIAL' ? '⚠️ السياسة جاهزة جزئياً' :
                                                '❌ السياسة تحتاج إضافات'}
                                    </Typography>

                                    {/* Progress Bar */}
                                    <Box sx={{ mb: 2 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                            <Typography variant="body2">نسبة الجاهزية</Typography>
                                            <Typography variant="body2" fontWeight="bold">
                                                {feasibility.summary.confidenceScore}%
                                            </Typography>
                                        </Box>
                                        <Box sx={{
                                            height: 10,
                                            bgcolor: 'grey.300',
                                            borderRadius: 5,
                                            overflow: 'hidden'
                                        }}>
                                            <Box sx={{
                                                height: '100%',
                                                width: `${feasibility.summary.confidenceScore}%`,
                                                bgcolor: feasibility.isExecutable ? 'success.main' :
                                                    feasibility.summary.executionReadiness === 'PARTIAL' ? 'warning.main' : 'error.main',
                                                transition: 'width 0.5s ease',
                                            }} />
                                        </Box>
                                    </Box>

                                    {/* الشروط المتوفرة */}
                                    {feasibility.availableFields.length > 0 && (
                                        <Box sx={{ mb: 2 }}>
                                            <Typography variant="subtitle2" gutterBottom>
                                                ✅ الحقول المتوفرة ({feasibility.availableFields.length}):
                                            </Typography>
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                {feasibility.availableFields.map((f, i) => (
                                                    <Chip
                                                        key={i}
                                                        label={f.field}
                                                        size="small"
                                                        color="success"
                                                        variant="outlined"
                                                        title={`المصدر: ${f.source}`}
                                                    />
                                                ))}
                                            </Box>
                                        </Box>
                                    )}

                                    {/* الحقول الناقصة */}
                                    {feasibility.missingFields.length > 0 && (
                                        <Box sx={{ mb: 2 }}>
                                            <Typography variant="subtitle2" gutterBottom color="error">
                                                ❌ الحقول الناقصة ({feasibility.missingFields.length}):
                                            </Typography>
                                            {feasibility.missingFields.map((f, i) => (
                                                <Alert key={i} severity="error" sx={{ mb: 1, py: 0 }}>
                                                    <strong>{f.field}</strong>: {f.reason}
                                                    <br />
                                                    <Typography variant="caption" color="text.secondary">
                                                        💡 {f.suggestion}
                                                    </Typography>
                                                </Alert>
                                            ))}
                                        </Box>
                                    )}

                                    {/* التحذيرات */}
                                    {feasibility.warnings.length > 0 && (
                                        <Box sx={{ mb: 2 }}>
                                            {feasibility.warnings.map((w, i) => (
                                                <Alert key={i} severity="warning" sx={{ mb: 0.5, py: 0 }}>
                                                    {w}
                                                </Alert>
                                            ))}
                                        </Box>
                                    )}

                                    {/* التوصيات */}
                                    {feasibility.recommendations.length > 0 && (
                                        <Box>
                                            <Typography variant="subtitle2" gutterBottom>
                                                💡 التوصيات:
                                            </Typography>
                                            {feasibility.recommendations.map((r, i) => (
                                                <Typography key={i} variant="body2" sx={{ mb: 0.5 }}>
                                                    {r}
                                                </Typography>
                                            ))}
                                        </Box>
                                    )}
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
                                    <Paper sx={{ p: 2, bgcolor: 'grey.900', color: 'grey.100', borderRadius: 2, overflow: 'auto', maxHeight: 200 }}>
                                        <pre style={{ margin: 0, fontSize: 12 }}>
                                            {JSON.stringify(selectedPolicy.parsedRule, null, 2)}
                                        </pre>
                                    </Paper>
                                </Grid>

                                {/* Test Mode Section */}
                                <Grid item xs={12}>
                                    <Divider sx={{ my: 2 }} />
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                        <Typography variant="h6" color="primary">
                                            🧪 وضع الاختبار (Test Mode)
                                        </Typography>
                                        <Button
                                            variant="contained"
                                            color="secondary"
                                            startIcon={testing ? <CircularProgress size={20} color="inherit" /> : <TestIcon />}
                                            onClick={() => handleTestPolicy(selectedPolicy)}
                                            disabled={testing}
                                            sx={{ background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)' }}
                                        >
                                            {testing ? 'جاري الاختبار...' : 'اختبر السياسة'}
                                        </Button>
                                    </Box>

                                    {/* Test Results */}
                                    <Collapse in={!!testResult}>
                                        {testResult && (
                                            <Paper sx={{ p: 2, bgcolor: testResult.success ? 'success.light' : 'error.light', borderRadius: 2 }}>
                                                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                                                    {testResult.success ? '✅ نتائج الاختبار' : '❌ فشل الاختبار'}
                                                </Typography>
                                                <Grid container spacing={2}>
                                                    <Grid item xs={6}>
                                                        <Typography variant="body2" color="text.secondary">الموظفين المتطابقين:</Typography>
                                                        <Typography variant="h5" fontWeight="bold">{testResult.matchedEmployees}</Typography>
                                                    </Grid>
                                                    <Grid item xs={6}>
                                                        <Typography variant="body2" color="text.secondary">إجمالي المبلغ المتوقع:</Typography>
                                                        <Typography variant="h5" fontWeight="bold" color="success.dark">
                                                            {testResult.totalAmount} ر.س
                                                        </Typography>
                                                    </Grid>
                                                    {testResult.sampleResults.length > 0 && (
                                                        <Grid item xs={12}>
                                                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                                                عينة من النتائج:
                                                            </Typography>
                                                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                                                {testResult.sampleResults.map((r, i) => (
                                                                    <Chip
                                                                        key={i}
                                                                        label={`${r.employeeName}: ${r.amount} ر.س`}
                                                                        variant="outlined"
                                                                        size="small"
                                                                    />
                                                                ))}
                                                            </Box>
                                                        </Grid>
                                                    )}
                                                </Grid>
                                            </Paper>
                                        )}
                                    </Collapse>
                                </Grid>
                            </Grid>
                        </DialogContent>
                        <DialogActions sx={{ px: 3, pb: 2 }}>
                            <Button onClick={() => { setDetailsDialogOpen(false); setTestResult(null); }}>إغلاق</Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>

            {/* 🧠 حوار توسيع النظام تلقائياً */}
            <Dialog
                open={extendDialogOpen}
                onClose={() => !extending && setExtendDialogOpen(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle sx={{ pb: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <SparkleIcon sx={{ color: '#9C27B0' }} />
                        <Typography variant="h6">🧠 توسيع النظام تلقائياً (Self-Extending AI)</Typography>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 2 }}>
                        <Alert severity="info" sx={{ mb: 3 }}>
                            اكتب السياسة أو الميزة اللي محتاجها، والذكاء الاصطناعي هيكتشف الحقول الناقصة ويضيفها للنظام تلقائياً!
                            <br />
                            <strong>مثال:</strong> "الموظف اللي عنده سيارة شركة يتخصم منه 0.5 ريال لكل كيلو زيادة عن 500"
                        </Alert>

                        <TextField
                            fullWidth
                            multiline
                            rows={3}
                            label="اكتب السياسة أو الميزة المطلوبة"
                            placeholder="مثال: تتبع استخدام سيارات الشركة للموظفين"
                            value={extendText}
                            onChange={(e) => setExtendText(e.target.value)}
                            disabled={extending}
                            sx={{ mb: 2 }}
                        />

                        <Button
                            variant="contained"
                            startIcon={extending ? <CircularProgress size={20} color="inherit" /> : <SparkleIcon />}
                            onClick={() => handleAnalyzeAndExtend(false)}
                            disabled={extending || !extendText.trim()}
                            fullWidth
                            size="large"
                            sx={{
                                mb: 3,
                                background: 'linear-gradient(45deg, #9C27B0 30%, #E040FB 90%)',
                            }}
                        >
                            {extending ? 'جاري التحليل...' : '🔍 تحليل واكتشاف الحقول الناقصة'}
                        </Button>

                        {/* عرض نتيجة التحليل */}
                        <Collapse in={!!extendResult}>
                            {extendResult && (
                                <Paper sx={{ p: 3, borderRadius: 2, bgcolor: extendResult.needsExtension ? 'warning.light' : 'success.light' }}>
                                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        {extendResult.needsExtension ? '🔧 النظام يحتاج توسيع!' : '✅ السياسة جاهزة للتنفيذ'}
                                    </Typography>

                                    {extendResult.needsExtension && (
                                        <>
                                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                                الحقول الناقصة:
                                            </Typography>
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                                                {extendResult.missingFields?.map((f, i) => (
                                                    <Chip
                                                        key={i}
                                                        label={`${f.name} (${f.type})`}
                                                        color="warning"
                                                        variant="outlined"
                                                    />
                                                ))}
                                            </Box>

                                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                                الجداول المقترحة:
                                            </Typography>
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                                                {extendResult.suggestedModels?.map((m, i) => (
                                                    <Chip
                                                        key={i}
                                                        label={m.name}
                                                        color="primary"
                                                    />
                                                ))}
                                            </Box>

                                            {!extendResult.extended && (
                                                <Button
                                                    variant="contained"
                                                    color="success"
                                                    startIcon={extending ? <CircularProgress size={20} color="inherit" /> : <CheckCircleIcon />}
                                                    onClick={() => handleAnalyzeAndExtend(true)}
                                                    disabled={extending}
                                                    fullWidth
                                                    sx={{ mt: 2 }}
                                                >
                                                    {extending ? 'جاري التوسيع...' : '✅ أكد وأضف للنظام'}
                                                </Button>
                                            )}
                                        </>
                                    )}

                                    {extendResult.extended && (
                                        <Alert severity="success" sx={{ mt: 2 }}>
                                            🎉 تم إضافة: {extendResult.addedModels?.join(', ')}
                                            <br />
                                            الآن يمكنك استخدام هذه الحقول في السياسات!
                                        </Alert>
                                    )}

                                    <Typography variant="body2" sx={{ mt: 2 }}>
                                        💬 {extendResult.message}
                                    </Typography>
                                </Paper>
                            )}
                        </Collapse>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3 }}>
                    <Button
                        onClick={() => { setExtendDialogOpen(false); setExtendText(''); setExtendResult(null); }}
                        disabled={extending}
                    >
                        إغلاق
                    </Button>
                </DialogActions>
            </Dialog>

            {/* 🧪 حوار المحاكاة */}
            <Dialog
                open={simulationDialogOpen}
                onClose={() => !simulating && setSimulationDialogOpen(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TestIcon color="secondary" />
                        <Typography variant="h6">🧪 محاكاة السياسة</Typography>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    {simulationPolicy && (
                        <Box sx={{ mt: 2 }}>
                            <Alert severity="info" sx={{ mb: 3 }}>
                                محاكاة تأثير السياسة على الموظفين بدون تطبيقها فعلياً.
                                <br />
                                <strong>السياسة:</strong> {simulationPolicy.name || simulationPolicy.originalText?.slice(0, 50)}
                            </Alert>

                            <TextField
                                fullWidth
                                type="month"
                                label="الفترة (شهر/سنة)"
                                value={simulationPeriod}
                                onChange={(e) => setSimulationPeriod(e.target.value)}
                                sx={{ mb: 3 }}
                                InputLabelProps={{ shrink: true }}
                            />

                            <Button
                                variant="contained"
                                color="secondary"
                                fullWidth
                                size="large"
                                startIcon={simulating ? <CircularProgress size={20} color="inherit" /> : <PlayIcon />}
                                onClick={handleRunSimulation}
                                disabled={simulating}
                                sx={{ mb: 3, background: 'linear-gradient(45deg, #9C27B0 30%, #E040FB 90%)' }}
                            >
                                {simulating ? 'جاري المحاكاة...' : '🚀 تشغيل المحاكاة'}
                            </Button>

                            {/* نتائج المحاكاة */}
                            <Collapse in={!!simulationResult}>
                                {simulationResult && (
                                    <Paper sx={{ p: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
                                        <Typography variant="h6" gutterBottom>📊 نتائج المحاكاة</Typography>
                                        <Grid container spacing={2}>
                                            <Grid item xs={6} sm={3}>
                                                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.light' }}>
                                                    <Typography variant="h4" color="primary.dark">{simulationResult.summary?.totalEmployees || 0}</Typography>
                                                    <Typography variant="body2">إجمالي الموظفين</Typography>
                                                </Paper>
                                            </Grid>
                                            <Grid item xs={6} sm={3}>
                                                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.light' }}>
                                                    <Typography variant="h4" color="warning.dark">{simulationResult.summary?.affectedEmployees || 0}</Typography>
                                                    <Typography variant="body2">المتأثرين</Typography>
                                                </Paper>
                                            </Grid>
                                            <Grid item xs={6} sm={3}>
                                                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.light' }}>
                                                    <Typography variant="h4" color="success.dark">{simulationResult.summary?.totalAdditions || 0}</Typography>
                                                    <Typography variant="body2">إضافات (ر.س)</Typography>
                                                </Paper>
                                            </Grid>
                                            <Grid item xs={6} sm={3}>
                                                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'error.light' }}>
                                                    <Typography variant="h4" color="error.dark">{simulationResult.summary?.totalDeductions || 0}</Typography>
                                                    <Typography variant="body2">خصومات (ر.س)</Typography>
                                                </Paper>
                                            </Grid>
                                        </Grid>

                                        {simulationResult.results?.length > 0 && (
                                            <Box sx={{ mt: 3 }}>
                                                <Typography variant="subtitle2" gutterBottom>الموظفين المتأثرين:</Typography>
                                                <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                                                    {simulationResult.results.slice(0, 10).map((r: any, i: number) => (
                                                        <Chip
                                                            key={i}
                                                            label={`${r.employeeName}: ${r.amount} ر.س`}
                                                            variant="outlined"
                                                            size="small"
                                                            color={r.type === 'ADDITION' ? 'success' : r.type === 'DEDUCTION' ? 'error' : 'default'}
                                                            sx={{ m: 0.5 }}
                                                        />
                                                    ))}
                                                    {simulationResult.results.length > 10 && (
                                                        <Chip label={`+${simulationResult.results.length - 10} آخرين`} size="small" sx={{ m: 0.5 }} />
                                                    )}
                                                </Box>
                                            </Box>
                                        )}
                                    </Paper>
                                )}
                            </Collapse>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3 }}>
                    <Button onClick={() => { setSimulationDialogOpen(false); setSimulationResult(null); }} disabled={simulating}>
                        إغلاق
                    </Button>
                </DialogActions>
            </Dialog>

            {/* 📜 حوار تاريخ الإصدارات */}
            <Dialog
                open={versionDialogOpen}
                onClose={() => setVersionDialogOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <HistoryIcon color="primary" />
                        <Typography variant="h6">📜 تاريخ الإصدارات</Typography>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    {versionPolicy && (
                        <Box sx={{ mt: 2 }}>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                السياسة: {versionPolicy.name || versionPolicy.originalText?.slice(0, 50)}
                            </Typography>
                            <Divider sx={{ my: 2 }} />

                            {versionsLoading ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                                    <CircularProgress />
                                </Box>
                            ) : versions.length === 0 ? (
                                <Alert severity="info">لا توجد إصدارات سابقة لهذه السياسة</Alert>
                            ) : (
                                <Box>
                                    {versions.map((version, index) => (
                                        <Paper key={version.id} sx={{ p: 2, mb: 2, bgcolor: index === 0 ? 'success.light' : 'grey.50' }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Box>
                                                    <Typography variant="subtitle1" fontWeight="bold">
                                                        الإصدار {version.versionNumber}
                                                        {index === 0 && <Chip label="الحالي" size="small" color="success" sx={{ ml: 1 }} />}
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary">
                                                        {version.changedByName} - {new Date(version.createdAt).toLocaleDateString('ar-SA')}
                                                    </Typography>
                                                    <Typography variant="body2">{version.changeReason}</Typography>
                                                </Box>
                                                {index !== 0 && (
                                                    <Button
                                                        variant="outlined"
                                                        size="small"
                                                        onClick={() => handleRevertToVersion(version.versionNumber)}
                                                    >
                                                        استعادة
                                                    </Button>
                                                )}
                                            </Box>
                                        </Paper>
                                    ))}
                                </Box>
                            )}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3 }}>
                    <Button onClick={() => setVersionDialogOpen(false)}>إغلاق</Button>
                </DialogActions>
            </Dialog>

            {/* 🔍 حوار اكتشاف التعارضات */}
            <Dialog
                open={conflictDialogOpen}
                onClose={() => setConflictDialogOpen(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <WarningIcon color="warning" />
                        <Typography variant="h6">🔍 اكتشاف التعارضات</Typography>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    {conflictPolicy && (
                        <Box sx={{ mt: 2 }}>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                السياسة: {conflictPolicy.name || conflictPolicy.originalText?.slice(0, 50)}
                            </Typography>
                            <Divider sx={{ my: 2 }} />

                            {conflictsLoading ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                                    <CircularProgress />
                                </Box>
                            ) : conflictResult ? (
                                <Box>
                                    {!conflictResult.hasConflicts ? (
                                        <Alert severity="success" sx={{ mb: 2 }}>
                                            ✅ لا توجد تعارضات! السياسة آمنة للتفعيل.
                                        </Alert>
                                    ) : (
                                        <>
                                            {conflictResult.warnings.map((w, i) => (
                                                <Alert key={i} severity="warning" sx={{ mb: 1 }}>{w}</Alert>
                                            ))}
                                            <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                                                السياسات المتعارضة ({conflictResult.conflictingPolicies.length}):
                                            </Typography>
                                            {conflictResult.conflictingPolicies.map((c, i) => (
                                                <Paper key={i} sx={{ p: 2, mb: 1, bgcolor: c.severity === 'HIGH' ? 'error.light' : c.severity === 'MEDIUM' ? 'warning.light' : 'grey.100' }}>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <Box>
                                                            <Typography fontWeight="bold">{c.name}</Typography>
                                                            <Typography variant="body2" color="text.secondary">{c.description}</Typography>
                                                        </Box>
                                                        <Chip label={c.severity} size="small" color={c.severity === 'HIGH' ? 'error' : c.severity === 'MEDIUM' ? 'warning' : 'default'} />
                                                    </Box>
                                                </Paper>
                                            ))}
                                        </>
                                    )}
                                </Box>
                            ) : null}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3 }}>
                    <Button onClick={() => setConflictDialogOpen(false)}>إغلاق</Button>
                </DialogActions>
            </Dialog>

            {/* 📋 حوار سجل التدقيق */}
            <Dialog
                open={auditDialogOpen}
                onClose={() => setAuditDialogOpen(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AuditIcon color="primary" />
                        <Typography variant="h6">📋 سجل التدقيق</Typography>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    {auditPolicy && (
                        <Box sx={{ mt: 2 }}>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                السياسة: {auditPolicy.name || auditPolicy.originalText?.slice(0, 50)}
                            </Typography>
                            <Divider sx={{ my: 2 }} />

                            {auditLoading ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                                    <CircularProgress />
                                </Box>
                            ) : auditLogs.length === 0 ? (
                                <Alert severity="info">لا توجد سجلات تدقيق لهذه السياسة</Alert>
                            ) : (
                                <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                                    {auditLogs.map((log, i) => (
                                        <Paper key={log.id || i} sx={{ p: 2, mb: 1, bgcolor: 'grey.50' }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <Box>
                                                    <Typography fontWeight="bold">
                                                        {log.action?.replace(/_/g, ' ')}
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary">
                                                        {log.userName} - {new Date(log.createdAt).toLocaleString('ar-SA')}
                                                    </Typography>
                                                    {log.description && (
                                                        <Typography variant="body2" sx={{ mt: 0.5 }}>{log.description}</Typography>
                                                    )}
                                                </Box>
                                                <Chip label={log.action} size="small" variant="outlined" />
                                            </Box>
                                        </Paper>
                                    ))}
                                </Box>
                            )}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3 }}>
                    <Button onClick={() => setAuditDialogOpen(false)}>إغلاق</Button>
                </DialogActions>
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
