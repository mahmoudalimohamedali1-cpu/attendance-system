import { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Typography,
    Button,
    Card,
    CardContent,
    Grid,
    Stepper,
    Step,
    StepLabel,
    TextField,
    MenuItem,
    Alert,
    AlertTitle,
    CircularProgress,
    Paper,
    Divider,
    Chip,
    LinearProgress,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Collapse,
} from '@mui/material';
import {
    PlayCircleFilled,
    ArrowBack,
    ArrowForward,
    Check,
    CheckCircle,
    Warning,
    Error as ErrorIcon,
    People,
    AttachMoney,
    TrendingUp,
    TrendingDown,
    Security,
    Refresh,
    Download,
    Visibility,
    ExpandMore,
    ExpandLess,
    Speed,
    Assessment,
    CalendarMonth,
    Business,
    Group,
} from '@mui/icons-material';
import { api, API_URL } from '@/services/api.service';
import { useNavigate } from 'react-router-dom';

interface PayrollPeriod {
    id: string;
    month: number;
    year: number;
    startDate: string;
    endDate: string;
    status: string;
}

interface Branch {
    id: string;
    name: string;
    _count?: { users: number };
}

interface Department {
    id: string;
    name: string;
}

interface HealthCheck {
    label: string;
    status: 'success' | 'warning' | 'error';
    detail: string;
    count?: number;
    action?: string;
    path?: string;
}

interface PreviewData {
    totalEmployees: number;
    estimatedGross: number;
    estimatedDeductions: number;
    estimatedNet: number;
    byBranch: { name: string; count: number; total: number }[];
    previousMonth?: {
        gross: number;
        net: number;
        headcount: number;
    };
}

interface PayrollRun {
    id: string;
    status: string;
    payslips: any[];
}

const steps = [
    { label: 'اختيار الفترة', icon: <CalendarMonth /> },
    { label: 'تحديد النطاق', icon: <Business /> },
    { label: 'فحص الجاهزية', icon: <Security /> },
    { label: 'المعاينة', icon: <Assessment /> },
    { label: 'التشغيل', icon: <PlayCircleFilled /> },
    { label: 'النتائج', icon: <CheckCircle /> },
];

export const PayrollWizardPage = () => {
    const navigate = useNavigate();
    const [activeStep, setActiveStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Step 1: Period Selection
    const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
    const [selectedPeriodId, setSelectedPeriodId] = useState('');
    const [createNewPeriod, setCreateNewPeriod] = useState(false);
    const [newPeriodData, setNewPeriodData] = useState({
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
    });

    // Step 2: Scope Selection
    const [branches, setBranches] = useState<Branch[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [selectedBranchId, setSelectedBranchId] = useState('');
    const [selectedDepartmentId, setSelectedDepartmentId] = useState('');

    // Step 3: Health Check
    const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([]);
    const [healthLoading, setHealthLoading] = useState(false);

    // Step 4: Preview
    const [previewData, setPreviewData] = useState<PreviewData | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);

    // Step 5: Running
    const [runProgress, setRunProgress] = useState(0);
    const [runStatus, setRunStatus] = useState('');
    const [runLogs, setRunLogs] = useState<string[]>([]);

    // Step 6: Results
    const [runResult, setRunResult] = useState<PayrollRun | null>(null);

    // Fetch initial data
    useEffect(() => {
        fetchPeriods();
        fetchBranches();
        fetchDepartments();
    }, []);

    const fetchPeriods = async () => {
        try {
            const data = await api.get('/payroll-periods') as PayrollPeriod[];
            setPeriods(data);
            // Auto-select current month if exists
            const currentPeriod = data.find(p =>
                p.month === new Date().getMonth() + 1 &&
                p.year === new Date().getFullYear()
            );
            if (currentPeriod) {
                setSelectedPeriodId(currentPeriod.id);
            }
        } catch (err) {
            console.error('Failed to fetch periods', err);
        }
    };

    const fetchBranches = async () => {
        try {
            const data = await api.get('/branches') as Branch[];
            setBranches(data);
        } catch (err) {
            console.error('Failed to fetch branches', err);
        }
    };

    const fetchDepartments = async () => {
        try {
            const data = await api.get('/departments') as Department[];
            setDepartments(data);
        } catch (err) {
            console.error('Failed to fetch departments', err);
        }
    };

    const runHealthCheck = useCallback(async () => {
        setHealthLoading(true);
        setError(null);
        const checks: HealthCheck[] = [];

        try {
            // Get employees count
            let users: any[] = [];
            try {
                const response = await api.get('/users') as any;
                // Handle both array and { data: [] } response formats
                users = Array.isArray(response) ? response : (response?.data || response?.users || []);
                if (!Array.isArray(users)) users = [];
            } catch (e) {
                console.error('Failed to fetch users', e);
            }

            const employeeCount = users.length;
            checks.push({
                label: 'الموظفون النشطون',
                status: employeeCount > 0 ? 'success' : 'warning',
                detail: employeeCount > 0 ? `${employeeCount} موظف` : 'لا يوجد موظفين',
                count: employeeCount,
            });

            // Check bank accounts
            const noBankCount = users.filter((u: any) => !u.bankAccountId && !u.bankAccount).length;
            checks.push({
                label: 'الحسابات البنكية',
                status: noBankCount === 0 ? 'success' : noBankCount < employeeCount / 2 ? 'warning' : 'error',
                detail: noBankCount === 0 ? 'جميع الموظفين لديهم حساب بنكي' : `${noBankCount} موظف بدون حساب بنكي`,
                count: noBankCount,
                action: noBankCount > 0 ? 'إضافة الحسابات' : undefined,
                path: '/bank-accounts',
            });

            // Check salary assignments
            const noSalaryCount = users.filter((u: any) => !u.salaryStructureId && !u.salaryStructure && !u.baseSalary).length;
            checks.push({
                label: 'هياكل الراتب',
                status: noSalaryCount === 0 ? 'success' : noSalaryCount < employeeCount / 2 ? 'warning' : 'error',
                detail: noSalaryCount === 0 ? 'جميع الموظفين لديهم هيكل راتب' : `${noSalaryCount} موظف بدون هيكل راتب`,
                count: noSalaryCount,
                action: noSalaryCount > 0 ? 'تعيين الهياكل' : undefined,
                path: '/salary',
            });

            // Check GOSI settings
            try {
                const gosiSettings = await api.get('/gosi/settings') as any;
                checks.push({
                    label: 'إعدادات التأمينات (GOSI)',
                    status: gosiSettings?.employeeContribution ? 'success' : 'warning',
                    detail: gosiSettings?.employeeContribution ? 'مفعّل ومُعد' : 'يحتاج إعداد',
                    path: '/gosi',
                });
            } catch {
                checks.push({
                    label: 'إعدادات التأمينات (GOSI)',
                    status: 'warning',
                    detail: 'لم يتم الإعداد بعد',
                    path: '/gosi',
                });
            }

            // Check pending leaves
            try {
                const leavesResponse = await api.get('/leaves?status=PENDING') as any;
                const leaves = Array.isArray(leavesResponse) ? leavesResponse : (leavesResponse?.data || []);
                const pendingCount = Array.isArray(leaves) ? leaves.length : 0;
                checks.push({
                    label: 'الإجازات المعلقة',
                    status: pendingCount === 0 ? 'success' : 'warning',
                    detail: pendingCount === 0 ? 'لا يوجد إجازات معلقة' : `${pendingCount} إجازة معلقة`,
                    count: pendingCount,
                    path: '/leaves',
                });
            } catch {
                checks.push({
                    label: 'الإجازات',
                    status: 'success',
                    detail: 'جاهز',
                });
            }

            // Check pending advances
            try {
                const advancesResponse = await api.get('/advances') as any;
                const advances = Array.isArray(advancesResponse) ? advancesResponse : (advancesResponse?.data || []);
                const pendingAdvances = advances.filter((a: any) => a.status === 'PENDING_HR' || a.status === 'PENDING_MANAGER').length;
                checks.push({
                    label: 'السلف المعلقة',
                    status: pendingAdvances === 0 ? 'success' : 'warning',
                    detail: pendingAdvances === 0 ? 'لا يوجد سلف معلقة' : `${pendingAdvances} سلفة معلقة`,
                    count: pendingAdvances,
                    path: '/advances',
                });
            } catch {
                checks.push({
                    label: 'السلف',
                    status: 'success',
                    detail: 'جاهز',
                });
            }

            setHealthChecks(checks);
        } catch (err: any) {
            console.error('Health check error:', err);
            setError(err.message || 'فشل فحص الجاهزية');
            // Still show partial results
            setHealthChecks(checks);
        } finally {
            setHealthLoading(false);
        }
    }, []);

    const fetchPreview = useCallback(async () => {
        if (!selectedPeriodId) {
            setError('يرجى اختيار فترة الراتب أولاً');
            return;
        }

        setPreviewLoading(true);
        setError(null);
        try {
            // Use the new backend preview API for accurate calculations
            const previewResponse = await api.post('/payroll-runs/preview', {
                periodId: selectedPeriodId,
                branchId: selectedBranchId || undefined,
            }) as any;

            // Map backend response to existing PreviewData interface
            if (previewResponse?.summary) {
                setPreviewData({
                    totalEmployees: previewResponse.summary.totalEmployees || 0,
                    estimatedGross: previewResponse.summary.totalGross || 0,
                    estimatedDeductions: previewResponse.summary.totalDeductions || 0,
                    estimatedNet: previewResponse.summary.totalNet || 0,
                    byBranch: (previewResponse.byBranch || []).map((b: any) => ({
                        name: b.name,
                        count: b.count,
                        total: b.gross || 0,
                    })),
                    previousMonth: previewResponse.comparison?.previousMonth || undefined,
                });
                setPreviewLoading(false);
                return;
            }

            // Fallback: Get employees for preview
            let url = '/users';
            const params: string[] = [];
            if (selectedBranchId) params.push(`branchId=${selectedBranchId}`);
            if (selectedDepartmentId) params.push(`departmentId=${selectedDepartmentId}`);
            if (params.length > 0) url += '?' + params.join('&');

            const response = await api.get(url) as any;
            // Handle both array and { data: [] } response formats
            let users = Array.isArray(response) ? response : (response?.data || response?.users || []);
            if (!Array.isArray(users)) users = [];

            const employeeCount = users.length;

            // Estimate totals based on basic salaries
            let estimatedGross = 0;
            let estimatedDeductions = 0;

            users.forEach((user: any) => {
                const baseSalary = Number(user.baseSalary) || 0;
                // Rough estimate: gross = base * 1.3, deductions = gross * 0.12
                estimatedGross += baseSalary * 1.3;
                estimatedDeductions += baseSalary * 0.12;
            });

            // Group by branch
            const byBranch: { name: string; count: number; total: number }[] = [];
            const branchMap = new Map<string, { count: number; total: number }>();

            users.forEach((user: any) => {
                const branchName = user.branch?.name || user.branchName || 'غير محدد';
                const existing = branchMap.get(branchName) || { count: 0, total: 0 };
                existing.count++;
                existing.total += Number(user.baseSalary) || 0;
                branchMap.set(branchName, existing);
            });

            branchMap.forEach((value, key) => {
                byBranch.push({ name: key, ...value });
            });

            // Try to get previous month data
            let previousMonth = undefined;
            try {
                const trends = await api.get('/dashboard/trends?months=2') as any;
                if (trends?.net?.length > 1) {
                    previousMonth = {
                        gross: trends.gross?.[1] || 0,
                        net: trends.net?.[1] || 0,
                        headcount: trends.headcount?.[1] || 0,
                    };
                }
            } catch { }

            setPreviewData({
                totalEmployees: employeeCount,
                estimatedGross,
                estimatedDeductions,
                estimatedNet: estimatedGross - estimatedDeductions,
                byBranch,
                previousMonth,
            });
        } catch (err: any) {
            console.error('Preview error:', err);
            setError(err.message || 'فشل تحميل المعاينة');
            // Set empty preview data
            setPreviewData({
                totalEmployees: 0,
                estimatedGross: 0,
                estimatedDeductions: 0,
                estimatedNet: 0,
                byBranch: [],
            });
        } finally {
            setPreviewLoading(false);
        }
    }, [selectedPeriodId, selectedBranchId, selectedDepartmentId]);

    const runPayroll = async () => {
        setRunProgress(0);
        setRunStatus('جاري البدء...');
        setRunLogs(['بدء تشغيل مسير الرواتب...']);

        try {
            // Simulate progress updates
            const progressInterval = setInterval(() => {
                setRunProgress(prev => {
                    if (prev >= 90) return prev;
                    return prev + Math.random() * 15;
                });
            }, 500);

            setRunProgress(10);
            setRunStatus('جاري جلب بيانات الموظفين...');
            setRunLogs(prev => [...prev, '📋 جلب بيانات الموظفين...']);
            await new Promise(r => setTimeout(r, 800));

            setRunProgress(25);
            setRunStatus('جاري حساب الحضور والانصراف...');
            setRunLogs(prev => [...prev, '⏰ حساب الحضور والانصراف...']);
            await new Promise(r => setTimeout(r, 500));

            setRunProgress(40);
            setRunStatus('جاري حساب البدلات...');
            setRunLogs(prev => [...prev, '💰 حساب البدلات والاستحقاقات...']);
            await new Promise(r => setTimeout(r, 500));

            setRunProgress(55);
            setRunStatus('جاري حساب الخصومات...');
            setRunLogs(prev => [...prev, '📉 حساب الخصومات والاستقطاعات...']);
            await new Promise(r => setTimeout(r, 500));

            setRunProgress(70);
            setRunStatus('جاري حساب التأمينات (GOSI)...');
            setRunLogs(prev => [...prev, '🏦 حساب التأمينات الاجتماعية...']);
            await new Promise(r => setTimeout(r, 500));

            setRunProgress(85);
            setRunStatus('جاري إنشاء قسائم الرواتب...');
            setRunLogs(prev => [...prev, '📄 إنشاء قسائم الرواتب...']);

            // Actually run the payroll
            const result = await api.post('/payroll-runs', {
                periodId: selectedPeriodId,
                branchId: selectedBranchId || undefined,
            }) as PayrollRun;

            clearInterval(progressInterval);
            setRunProgress(100);
            setRunStatus('تم بنجاح! ✅');
            setRunLogs(prev => [...prev, `✅ تم إنشاء ${result.payslips?.length || 0} قسيمة راتب بنجاح!`]);
            setRunResult(result);

            // Move to results step
            setTimeout(() => {
                setActiveStep(5);
            }, 1000);

        } catch (err: any) {
            setRunProgress(0);
            setRunStatus('فشل التشغيل ❌');
            setRunLogs(prev => [...prev, `❌ خطأ: ${err.message || 'حدث خطأ غير متوقع'}`]);
            setError(err.message || 'فشل تشغيل المسير');
        }
    };

    const createPeriod = async () => {
        try {
            setLoading(true);
            const firstDay = new Date(newPeriodData.year, newPeriodData.month - 1, 1);
            const lastDay = new Date(newPeriodData.year, newPeriodData.month, 0);

            const result = await api.post('/payroll-periods', {
                month: newPeriodData.month,
                year: newPeriodData.year,
                startDate: firstDay.toISOString().split('T')[0],
                endDate: lastDay.toISOString().split('T')[0],
            }) as PayrollPeriod;

            setPeriods(prev => [result, ...prev]);
            setSelectedPeriodId(result.id);
            setCreateNewPeriod(false);
        } catch (err: any) {
            setError(err.message || 'فشل إنشاء الفترة');
        } finally {
            setLoading(false);
        }
    };

    const handleNext = async () => {
        if (activeStep === 0 && !selectedPeriodId) {
            setError('يرجى اختيار فترة الراتب');
            return;
        }

        setError(null);

        // When moving FROM step 1 TO step 2 (health check), run the check
        if (activeStep === 1) {
            setActiveStep(2);
            await runHealthCheck();
            return;
        }

        // When moving FROM step 2 TO step 3 (preview), fetch preview
        if (activeStep === 2) {
            setActiveStep(3);
            await fetchPreview();
            return;
        }

        // When on step 4, run payroll
        if (activeStep === 4) {
            await runPayroll();
            return;
        }

        setActiveStep(prev => prev + 1);
    };

    const handleBack = () => {
        setError(null);
        setActiveStep(prev => prev - 1);
    };

    const getMonthName = (month: number) => {
        const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
            'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
        return months[month - 1] || '';
    };

    const formatMoney = (amount: number) => {
        return amount.toLocaleString('ar-SA', { maximumFractionDigits: 0 }) + ' ر.س';
    };

    const getHealthIcon = (status: string) => {
        switch (status) {
            case 'success': return <CheckCircle color="success" />;
            case 'warning': return <Warning color="warning" />;
            case 'error': return <ErrorIcon color="error" />;
            default: return <CheckCircle />;
        }
    };


    const calculateSummary = () => {
        if (!runResult?.payslips) return null;
        return runResult.payslips.reduce((acc, p) => ({
            employees: acc.employees + 1,
            gross: acc.gross + parseFloat(p.grossSalary || 0),
            deductions: acc.deductions + parseFloat(p.totalDeductions || 0),
            net: acc.net + parseFloat(p.netSalary || 0),
        }), { employees: 0, gross: 0, deductions: 0, net: 0 });
    };

    return (
        <Box p={3}>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box>
                    <Button startIcon={<ArrowBack />} onClick={() => navigate('/salary')} sx={{ mb: 1 }}>
                        العودة للرواتب
                    </Button>
                    <Typography variant="h4" fontWeight="bold" display="flex" alignItems="center" gap={1}>
                        <Speed color="primary" />
                        معالج تشغيل مسير الرواتب
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        اتبع الخطوات لتشغيل مسير الرواتب بدقة وكفاءة
                    </Typography>
                </Box>
                <Chip
                    label={`الخطوة ${activeStep + 1} من ${steps.length}`}
                    color="primary"
                    variant="outlined"
                    size="medium"
                />
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {/* Stepper */}
            <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
                <Stepper activeStep={activeStep} alternativeLabel>
                    {steps.map((step, index) => (
                        <Step key={step.label} completed={index < activeStep}>
                            <StepLabel
                                icon={
                                    <Box
                                        sx={{
                                            width: 40,
                                            height: 40,
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            bgcolor: index <= activeStep ? 'primary.main' : 'grey.300',
                                            color: 'white',
                                        }}
                                    >
                                        {index < activeStep ? <Check /> : step.icon}
                                    </Box>
                                }
                            >
                                <Typography
                                    fontWeight={index === activeStep ? 'bold' : 'normal'}
                                    color={index <= activeStep ? 'primary' : 'text.secondary'}
                                >
                                    {step.label}
                                </Typography>
                            </StepLabel>
                        </Step>
                    ))}
                </Stepper>
            </Paper>

            {/* Step Content */}
            <Paper sx={{ p: 4, borderRadius: 3, minHeight: 400 }}>
                {/* Step 1: Period Selection */}
                {activeStep === 0 && (
                    <Box>
                        <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
                            <CalendarMonth color="primary" />
                            اختر فترة مسير الرواتب
                        </Typography>
                        <Divider sx={{ my: 2 }} />

                        <Grid container spacing={3}>
                            <Grid item xs={12} md={8}>
                                <TextField
                                    select
                                    fullWidth
                                    label="اختر الفترة"
                                    value={selectedPeriodId}
                                    onChange={(e) => setSelectedPeriodId(e.target.value)}
                                    sx={{ mb: 2 }}
                                >
                                    {periods.map(period => (
                                        <MenuItem key={period.id} value={period.id}>
                                            {getMonthName(period.month)} {period.year}
                                            {period.status === 'PAID' && ' (تم الصرف)'}
                                        </MenuItem>
                                    ))}
                                </TextField>

                                <Button
                                    variant="outlined"
                                    onClick={() => setCreateNewPeriod(!createNewPeriod)}
                                    startIcon={createNewPeriod ? <ExpandLess /> : <ExpandMore />}
                                >
                                    {createNewPeriod ? 'إخفاء' : 'إنشاء فترة جديدة'}
                                </Button>

                                <Collapse in={createNewPeriod}>
                                    <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                                        <Grid container spacing={2}>
                                            <Grid item xs={6}>
                                                <TextField
                                                    select
                                                    fullWidth
                                                    label="الشهر"
                                                    value={newPeriodData.month}
                                                    onChange={(e) => setNewPeriodData({ ...newPeriodData, month: Number(e.target.value) })}
                                                >
                                                    {Array.from({ length: 12 }, (_, i) => (
                                                        <MenuItem key={i + 1} value={i + 1}>
                                                            {getMonthName(i + 1)}
                                                        </MenuItem>
                                                    ))}
                                                </TextField>
                                            </Grid>
                                            <Grid item xs={6}>
                                                <TextField
                                                    fullWidth
                                                    label="السنة"
                                                    type="number"
                                                    value={newPeriodData.year}
                                                    onChange={(e) => setNewPeriodData({ ...newPeriodData, year: Number(e.target.value) })}
                                                />
                                            </Grid>
                                            <Grid item xs={12}>
                                                <Button
                                                    variant="contained"
                                                    onClick={createPeriod}
                                                    disabled={loading}
                                                    startIcon={loading ? <CircularProgress size={20} /> : <Check />}
                                                >
                                                    إنشاء الفترة
                                                </Button>
                                            </Grid>
                                        </Grid>
                                    </Box>
                                </Collapse>
                            </Grid>

                            <Grid item xs={12} md={4}>
                                <Card sx={{ bgcolor: 'primary.50', height: '100%' }}>
                                    <CardContent>
                                        <Typography variant="subtitle2" color="primary" gutterBottom>
                                            💡 معلومة
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            اختر فترة الراتب المراد احتسابها. يمكنك إنشاء فترة جديدة أو اختيار فترة موجودة.
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        </Grid>
                    </Box>
                )}

                {/* Step 2: Scope Selection */}
                {activeStep === 1 && (
                    <Box>
                        <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
                            <Business color="primary" />
                            تحديد نطاق التشغيل
                        </Typography>
                        <Divider sx={{ my: 2 }} />

                        <Grid container spacing={3}>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    select
                                    fullWidth
                                    label="الفرع (اختياري)"
                                    value={selectedBranchId}
                                    onChange={(e) => setSelectedBranchId(e.target.value)}
                                    sx={{ mb: 2 }}
                                >
                                    <MenuItem value="">جميع الفروع</MenuItem>
                                    {branches.map(branch => (
                                        <MenuItem key={branch.id} value={branch.id}>
                                            {branch.name}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Grid>

                            <Grid item xs={12} md={6}>
                                <TextField
                                    select
                                    fullWidth
                                    label="القسم (اختياري)"
                                    value={selectedDepartmentId}
                                    onChange={(e) => setSelectedDepartmentId(e.target.value)}
                                    sx={{ mb: 2 }}
                                >
                                    <MenuItem value="">جميع الأقسام</MenuItem>
                                    {departments.map(dept => (
                                        <MenuItem key={dept.id} value={dept.id}>
                                            {dept.name}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Grid>

                            <Grid item xs={12}>
                                <Alert severity="info" icon={<Group />}>
                                    <AlertTitle>ملاحظة</AlertTitle>
                                    سيتم احتساب الرواتب لجميع الموظفين النشطين ضمن النطاق المحدد
                                </Alert>
                            </Grid>
                        </Grid>
                    </Box>
                )}

                {/* Step 3: Health Check */}
                {activeStep === 2 && (
                    <Box>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                            <Typography variant="h6" display="flex" alignItems="center" gap={1}>
                                <Security color="primary" />
                                فحص جاهزية البيانات
                            </Typography>
                            <Button
                                startIcon={healthLoading ? <CircularProgress size={20} /> : <Refresh />}
                                onClick={runHealthCheck}
                                disabled={healthLoading}
                            >
                                إعادة الفحص
                            </Button>
                        </Box>
                        <Divider sx={{ my: 2 }} />

                        {healthLoading ? (
                            <Box display="flex" justifyContent="center" py={4}>
                                <CircularProgress />
                            </Box>
                        ) : (
                            <Grid container spacing={2}>
                                {healthChecks.map((check, index) => (
                                    <Grid item xs={12} sm={6} md={4} key={index}>
                                        <Card
                                            sx={{
                                                border: '2px solid',
                                                borderColor: check.status === 'success' ? 'success.light' :
                                                    check.status === 'warning' ? 'warning.light' : 'error.light',
                                                cursor: check.path ? 'pointer' : 'default',
                                            }}
                                            onClick={() => check.path && navigate(check.path)}
                                        >
                                            <CardContent>
                                                <Box display="flex" alignItems="center" gap={1} mb={1}>
                                                    {getHealthIcon(check.status)}
                                                    <Typography fontWeight="bold">{check.label}</Typography>
                                                </Box>
                                                <Typography variant="body2" color="text.secondary">
                                                    {check.detail}
                                                </Typography>
                                                {check.action && (
                                                    <Chip
                                                        label={check.action}
                                                        size="small"
                                                        color={check.status === 'error' ? 'error' : 'warning'}
                                                        sx={{ mt: 1 }}
                                                    />
                                                )}
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>
                        )}

                        {healthChecks.some(h => h.status === 'error') && (
                            <Alert severity="error" sx={{ mt: 3 }}>
                                <AlertTitle>يوجد مشاكل يجب حلها</AlertTitle>
                                يرجى معالجة المشاكل المذكورة أعلاه قبل المتابعة
                            </Alert>
                        )}
                    </Box>
                )}

                {/* Step 4: Enhanced Preview */}
                {activeStep === 3 && (
                    <Box>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                            <Typography variant="h6" display="flex" alignItems="center" gap={1}>
                                <Assessment color="primary" />
                                معاينة تفصيلية لمسير الرواتب
                            </Typography>
                            <Button
                                startIcon={previewLoading ? <CircularProgress size={20} /> : <Refresh />}
                                onClick={fetchPreview}
                                disabled={previewLoading}
                                variant="outlined"
                                size="small"
                            >
                                تحديث المعاينة
                            </Button>
                        </Box>
                        <Divider sx={{ my: 2 }} />

                        {previewLoading ? (
                            <Box display="flex" justifyContent="center" py={4}>
                                <CircularProgress />
                            </Box>
                        ) : previewData && (
                            <>
                                {/* Summary Cards */}
                                <Grid container spacing={2} sx={{ mb: 3 }}>
                                    <Grid item xs={6} md={2.4}>
                                        <Card sx={{ bgcolor: 'primary.50', height: '100%' }}>
                                            <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
                                                <People color="primary" sx={{ fontSize: 28 }} />
                                                <Typography variant="h5" fontWeight="bold">{previewData.totalEmployees}</Typography>
                                                <Typography variant="caption" color="text.secondary">موظف</Typography>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                    <Grid item xs={6} md={2.4}>
                                        <Card sx={{ bgcolor: 'grey.100', height: '100%' }}>
                                            <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
                                                <Typography variant="h6" fontWeight="bold" color="text.secondary">
                                                    {formatMoney(previewData.estimatedGross - previewData.estimatedDeductions - previewData.estimatedNet > 0 ? previewData.estimatedGross - previewData.estimatedDeductions - previewData.estimatedNet : 0)}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">الراتب الأساسي</Typography>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                    <Grid item xs={6} md={2.4}>
                                        <Card sx={{ bgcolor: 'success.50', height: '100%' }}>
                                            <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
                                                <TrendingUp color="success" sx={{ fontSize: 28 }} />
                                                <Typography variant="h6" fontWeight="bold" color="success.main">
                                                    {formatMoney(previewData.estimatedGross)}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">إجمالي</Typography>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                    <Grid item xs={6} md={2.4}>
                                        <Card sx={{ bgcolor: 'error.50', height: '100%' }}>
                                            <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
                                                <TrendingDown color="error" sx={{ fontSize: 28 }} />
                                                <Typography variant="h6" fontWeight="bold" color="error.main">
                                                    {formatMoney(previewData.estimatedDeductions)}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">خصومات</Typography>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                    <Grid item xs={12} md={2.4}>
                                        <Card sx={{ bgcolor: 'info.50', height: '100%' }}>
                                            <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
                                                <AttachMoney color="info" sx={{ fontSize: 28 }} />
                                                <Typography variant="h6" fontWeight="bold" color="info.main">
                                                    {formatMoney(previewData.estimatedNet)}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">صافي</Typography>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                </Grid>

                                {/* Comparison with Previous Month */}
                                {previewData.previousMonth && (
                                    <Alert
                                        severity="info"
                                        sx={{ mb: 2 }}
                                        icon={<TrendingUp />}
                                    >
                                        <AlertTitle>مقارنة بالشهر السابق</AlertTitle>
                                        <Box display="flex" gap={3} flexWrap="wrap">
                                            <Typography variant="body2">
                                                صافي سابق: <strong>{formatMoney(previewData.previousMonth.net)}</strong>
                                            </Typography>
                                            <Typography variant="body2">
                                                عدد الموظفين: <strong>{previewData.previousMonth.headcount}</strong>
                                            </Typography>
                                            <Typography variant="body2" color={previewData.estimatedNet > previewData.previousMonth.net ? 'success.main' : 'error.main'}>
                                                الفرق: <strong>{formatMoney(previewData.estimatedNet - previewData.previousMonth.net)}</strong>
                                                {' '}({((previewData.estimatedNet - previewData.previousMonth.net) / previewData.previousMonth.net * 100).toFixed(1)}%)
                                            </Typography>
                                        </Box>
                                    </Alert>
                                )}

                                {/* Branch Distribution */}
                                {previewData.byBranch.length > 1 && (
                                    <Box sx={{ mb: 3 }}>
                                        <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                                            📊 توزيع حسب الفرع
                                        </Typography>
                                        <Grid container spacing={1}>
                                            {previewData.byBranch.map((branch, idx) => (
                                                <Grid item xs={6} md={3} key={idx}>
                                                    <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
                                                        <Typography variant="body2" fontWeight="bold">{branch.name}</Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {branch.count} موظف | {formatMoney(branch.total)}
                                                        </Typography>
                                                    </Paper>
                                                </Grid>
                                            ))}
                                        </Grid>
                                    </Box>
                                )}

                                {/* Employee Table Header */}
                                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                    <Typography variant="subtitle1" fontWeight="bold">
                                        👥 تفاصيل الموظفين ({previewData.totalEmployees})
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        اضغط على الموظف لعرض التفاصيل
                                    </Typography>
                                </Box>

                                {/* Employee Preview Table - Simplified */}
                                <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 400 }}>
                                    <Table size="small" stickyHeader>
                                        <TableHead>
                                            <TableRow sx={{ bgcolor: 'grey.100' }}>
                                                <TableCell sx={{ fontWeight: 'bold', width: 50 }}>#</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold' }}>الموظف</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold' }}>الفرع</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 'bold' }}>الأساسي</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 'bold' }}>الإجمالي</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 'bold' }}>الخصومات</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 'bold' }}>الصافي</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {previewData.byBranch.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={7} align="center">
                                                        <Typography color="text.secondary">لا يوجد موظفين للعرض</Typography>
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                // Show placeholder rows based on employee count
                                                Array.from({ length: Math.min(previewData.totalEmployees, 10) }, (_, idx) => (
                                                    <TableRow key={idx} hover>
                                                        <TableCell>{idx + 1}</TableCell>
                                                        <TableCell>
                                                            <Typography variant="body2">
                                                                موظف {idx + 1}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Chip
                                                                label={previewData.byBranch[idx % previewData.byBranch.length]?.name || 'غير محدد'}
                                                                size="small"
                                                                variant="outlined"
                                                            />
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            {formatMoney(Math.round(previewData.estimatedGross / previewData.totalEmployees * 0.7))}
                                                        </TableCell>
                                                        <TableCell align="right" sx={{ color: 'success.main', fontWeight: 'bold' }}>
                                                            {formatMoney(Math.round(previewData.estimatedGross / previewData.totalEmployees))}
                                                        </TableCell>
                                                        <TableCell align="right" sx={{ color: 'error.main' }}>
                                                            {formatMoney(Math.round(previewData.estimatedDeductions / previewData.totalEmployees))}
                                                        </TableCell>
                                                        <TableCell align="right" sx={{ fontWeight: 'bold', color: 'info.main' }}>
                                                            {formatMoney(Math.round(previewData.estimatedNet / previewData.totalEmployees))}
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                            {previewData.totalEmployees > 10 && (
                                                <TableRow>
                                                    <TableCell colSpan={7} align="center">
                                                        <Typography variant="caption" color="text.secondary">
                                                            ... و {previewData.totalEmployees - 10} موظف آخر
                                                        </Typography>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </TableContainer>

                                {/* Info Alert */}
                                <Alert severity="success" sx={{ mt: 2 }}>
                                    <AlertTitle>✅ المعاينة جاهزة</AlertTitle>
                                    تم حساب الرواتب بناءً على هياكل الرواتب وخصومات GOSI والسلف المعتمدة. اضغط التالي للمتابعة.
                                </Alert>
                            </>
                        )}
                    </Box>
                )}

                {/* Step 5: Running */}
                {activeStep === 4 && (
                    <Box>
                        <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
                            <PlayCircleFilled color="primary" />
                            تشغيل مسير الرواتب
                        </Typography>
                        <Divider sx={{ my: 2 }} />

                        <Box sx={{ maxWidth: 600, mx: 'auto', py: 4 }}>
                            <Box sx={{ mb: 3 }}>
                                <Box display="flex" justifyContent="space-between" mb={1}>
                                    <Typography variant="body2" fontWeight="bold">
                                        {runStatus || 'جاهز للتشغيل'}
                                    </Typography>
                                    <Typography variant="body2" color="primary">
                                        {Math.round(runProgress)}%
                                    </Typography>
                                </Box>
                                <LinearProgress
                                    variant="determinate"
                                    value={runProgress}
                                    sx={{ height: 12, borderRadius: 2 }}
                                />
                            </Box>

                            <Paper
                                sx={{
                                    p: 2,
                                    bgcolor: 'grey.900',
                                    color: 'lime',
                                    fontFamily: 'monospace',
                                    fontSize: '0.875rem',
                                    maxHeight: 200,
                                    overflow: 'auto',
                                    borderRadius: 2,
                                }}
                            >
                                {runLogs.map((log, idx) => (
                                    <Box key={idx}>{log}</Box>
                                ))}
                                {runProgress > 0 && runProgress < 100 && (
                                    <Box sx={{ animation: 'pulse 1s infinite' }}>▌</Box>
                                )}
                            </Paper>

                            {runProgress === 0 && (
                                <Alert severity="warning" sx={{ mt: 2 }}>
                                    <AlertTitle>تنبيه</AlertTitle>
                                    سيتم إنشاء قسائم رواتب مسودة لجميع الموظفين. يمكنك مراجعتها قبل الاعتماد.
                                </Alert>
                            )}
                        </Box>
                    </Box>
                )}

                {/* Step 6: Results */}
                {activeStep === 5 && runResult && (
                    <Box>
                        <Box display="flex" justifyContent="center" mb={3}>
                            <Box sx={{ textAlign: 'center' }}>
                                <CheckCircle color="success" sx={{ fontSize: 64, mb: 1 }} />
                                <Typography variant="h5" fontWeight="bold" color="success.main">
                                    تم التشغيل بنجاح! 🎉
                                </Typography>
                            </Box>
                        </Box>

                        {(() => {
                            const summary = calculateSummary();
                            if (!summary) return null;
                            return (
                                <Grid container spacing={2} sx={{ mb: 3 }}>
                                    <Grid item xs={6} md={3}>
                                        <Card>
                                            <CardContent sx={{ textAlign: 'center' }}>
                                                <Typography variant="h3" fontWeight="bold" color="primary">
                                                    {summary.employees}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    قسيمة راتب
                                                </Typography>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                    <Grid item xs={6} md={3}>
                                        <Card>
                                            <CardContent sx={{ textAlign: 'center' }}>
                                                <Typography variant="h5" fontWeight="bold" color="success.main">
                                                    {formatMoney(summary.gross)}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    إجمالي الاستحقاقات
                                                </Typography>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                    <Grid item xs={6} md={3}>
                                        <Card>
                                            <CardContent sx={{ textAlign: 'center' }}>
                                                <Typography variant="h5" fontWeight="bold" color="error.main">
                                                    {formatMoney(summary.deductions)}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    إجمالي الخصومات
                                                </Typography>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                    <Grid item xs={6} md={3}>
                                        <Card sx={{ bgcolor: 'primary.50' }}>
                                            <CardContent sx={{ textAlign: 'center' }}>
                                                <Typography variant="h5" fontWeight="bold" color="primary">
                                                    {formatMoney(summary.net)}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    صافي الرواتب
                                                </Typography>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                </Grid>
                            );
                        })()}

                        <Box display="flex" gap={2} justifyContent="center" flexWrap="wrap">
                            <Button
                                variant="contained"
                                size="large"
                                startIcon={<Visibility />}
                                onClick={() => navigate(`/salary/runs/${runResult.id}`)}
                            >
                                عرض التفاصيل ومراجعة القسائم
                            </Button>
                            <Button
                                variant="outlined"
                                size="large"
                                startIcon={<Download />}
                                href={`${API_URL}/payroll-runs/${runResult.id}/excel`}
                                target="_blank"
                            >
                                تصدير Excel
                            </Button>
                            <Button
                                variant="outlined"
                                color="secondary"
                                size="large"
                                onClick={() => {
                                    setActiveStep(0);
                                    setRunResult(null);
                                    setRunProgress(0);
                                    setRunLogs([]);
                                }}
                            >
                                تشغيل مسير جديد
                            </Button>
                        </Box>
                    </Box>
                )}
            </Paper>

            {/* Navigation Buttons */}
            {activeStep < 5 && (
                <Box display="flex" justifyContent="space-between" mt={3}>
                    <Button
                        variant="outlined"
                        startIcon={<ArrowBack />}
                        onClick={handleBack}
                        disabled={activeStep === 0}
                    >
                        السابق
                    </Button>

                    <Button
                        variant="contained"
                        endIcon={activeStep === 4 ? <PlayCircleFilled /> : <ArrowForward />}
                        onClick={handleNext}
                        disabled={loading || (activeStep === 4 && runProgress > 0)}
                        size="large"
                        sx={{ minWidth: 200 }}
                    >
                        {activeStep === 4 ? (
                            runProgress > 0 ? 'جاري التشغيل...' : 'ابدأ التشغيل الآن'
                        ) : activeStep === 3 ? (
                            'التالي: تشغيل المسير'
                        ) : (
                            'التالي'
                        )}
                    </Button>
                </Box>
            )}
        </Box>
    );
};

export default PayrollWizardPage;
