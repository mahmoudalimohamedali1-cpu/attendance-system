import React, { useState, useEffect, useCallback } from 'react';
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
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    InputAdornment,
    FormControl,
    InputLabel,
    Select,
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
    Add,
    Remove,
    Close,
    Search,
    FileDownload,
    Print,
    Save,
    Sort,
    FilterList,
    CompareArrows,
    NotificationsActive,
    Category,
    Policy,
    Gavel,
} from '@mui/icons-material';
import { api, API_URL } from '@/services/api.service';
import { smartPoliciesService } from '@/services/smart-policies.service';
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

interface EmployeePreview {
    id: string;
    employeeCode: string;
    name: string;
    firstName: string;
    lastName: string;
    branch: string;
    department: string;
    jobTitle?: string;
    isSaudi: boolean;
    baseSalary: number;
    gross: number;
    deductions: number;
    deferredDeductions?: number; // الخصومات المرحلة للشهر القادم
    gosi: number;
    gosiEmployer: number;
    advances: number;
    net: number;
    earnings: { name: string; code: string; amount: number }[];
    deductionItems: { name: string; code: string; amount: number }[];
    advanceDetails: { id: string; amount: number }[];
    adjustments: any[];
    excluded: boolean;
}

interface PreviewData {
    totalEmployees: number;
    estimatedGross: number;
    estimatedDeductions: number;
    estimatedNet: number;
    byBranch: { name: string; count: number; total: number }[];
    byDepartment?: { name: string; count: number; gross: number; net: number }[];
    employees?: EmployeePreview[];
    previousMonth?: {
        gross: number;
        net: number;
        headcount: number;
    };
    gosiEnabled?: boolean;
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

    // Editing state for preview
    const [excludedEmployees, setExcludedEmployees] = useState<Set<string>>(new Set());
    const [adjustments, setAdjustments] = useState<Record<string, { type: 'bonus' | 'deduction'; amount: number; reason: string }[]>>({});
    const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);

    // Step 5: Running
    const [runProgress, setRunProgress] = useState(0);
    const [runStatus, setRunStatus] = useState('');
    const [runLogs, setRunLogs] = useState<string[]>([]);

    // Step 6: Results
    const [runResult, setRunResult] = useState<PayrollRun | null>(null);

    // Dialog states for adjustments
    const [adjustmentDialog, setAdjustmentDialog] = useState<{
        open: boolean;
        employeeId: string;
        employeeName: string;
        type: 'bonus' | 'deduction';
    }>({ open: false, employeeId: '', employeeName: '', type: 'bonus' });
    const [adjustmentAmount, setAdjustmentAmount] = useState('');
    const [adjustmentReason, setAdjustmentReason] = useState('');

    // Confirmation dialog for running payroll
    const [confirmRunDialog, setConfirmRunDialog] = useState(false);

    // ========== 10 New Features State ==========
    // 1. Search/Filter employees
    const [searchQuery, setSearchQuery] = useState('');

    // 2. Sort configuration
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });

    // 3. Group by mode
    const [groupBy, setGroupBy] = useState<'none' | 'branch' | 'department'>('none');

    // 4. Salary alerts/warnings
    const [salaryAlerts, setSalaryAlerts] = useState<{ employeeId: string; type: string; message: string }[]>([]);

    // 5. Show comparison details
    const [showComparison, setShowComparison] = useState(false);

    // 6. Draft saving
    const [draftSaved, setDraftSaved] = useState(false);
    const [lastDraftTime, setLastDraftTime] = useState<Date | null>(null);

    // 7. Smart Policies Impact
    const [policyImpact, setPolicyImpact] = useState<{
        loading: boolean;
        data: {
            summary: {
                totalDeductions: number;
                totalBonuses: number;
                netImpact: number;
                policiesApplied: number;
                employeesAffected: number;
            };
            byPolicy: Array<{
                policyId: string;
                policyName: string;
                timesApplied: number;
                totalAmount: number;
            }>;
        } | null;
    }>({ loading: false, data: null });

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

    // Fetch Smart Policies Impact
    const fetchPolicyImpact = useCallback(async () => {
        if (!selectedPeriodId) return;

        // Get the period details to extract month and year
        const selectedPeriod = periods.find(p => p.id === selectedPeriodId);
        if (!selectedPeriod) return;

        setPolicyImpact(prev => ({ ...prev, loading: true }));
        try {
            const response = await smartPoliciesService.getPayrollImpact(
                selectedPeriod.month,
                selectedPeriod.year
            );

            if (response.success && response.data) {
                setPolicyImpact({
                    loading: false,
                    data: {
                        summary: {
                            totalDeductions: response.data.summary?.totalDeductions || 0,
                            totalBonuses: response.data.summary?.totalBonuses || 0,
                            netImpact: response.data.summary?.netImpact || 0,
                            policiesApplied: response.data.summary?.policiesApplied || 0,
                            employeesAffected: response.data.summary?.employeesAffected || 0,
                        },
                        byPolicy: response.data.summary?.byPolicy || [],
                    },
                });
            } else {
                setPolicyImpact({ loading: false, data: null });
            }
        } catch (err) {
            console.error('Failed to fetch policy impact', err);
            setPolicyImpact({ loading: false, data: null });
        }
    }, [selectedPeriodId, periods]);

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
                    byDepartment: previewResponse.byDepartment || [],
                    employees: previewResponse.employees || [],
                    previousMonth: previewResponse.comparison?.previousMonth || undefined,
                    gosiEnabled: previewResponse.gosiEnabled,
                });
                // Reset adjustments when new preview loaded
                setExcludedEmployees(new Set());
                setAdjustments({});
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

            // Actually run the payroll with excluded employees and adjustments
            const excludedIds = Array.from(excludedEmployees);
            const adjustmentsData = Object.entries(adjustments).map(([employeeId, items]) => ({
                employeeId,
                items: items.map(item => ({
                    type: item.type,
                    amount: item.amount,
                    reason: item.reason,
                })),
            }));

            if (excludedIds.length > 0) {
                setRunLogs(prev => [...prev, `⏭️ استثناء ${excludedIds.length} موظف من المسير`]);
            }
            if (adjustmentsData.length > 0) {
                setRunLogs(prev => [...prev, `📝 تطبيق تعديلات على ${adjustmentsData.length} موظف`]);
            }

            const result = await api.post('/payroll-runs', {
                periodId: selectedPeriodId,
                branchId: selectedBranchId || undefined,
                excludedEmployeeIds: excludedIds.length > 0 ? excludedIds : undefined,
                adjustments: adjustmentsData.length > 0 ? adjustmentsData : undefined,
            }) as PayrollRun;

            clearInterval(progressInterval);
            setRunProgress(100);
            setRunStatus('تم بنجاح! ✅');
            const payslipsCount = (result as any).payslipsCount || result.payslips?.length || 0;
            setRunLogs(prev => [...prev, `✅ تم إنشاء ${payslipsCount} قسيمة راتب بنجاح!`]);
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

        // When moving FROM step 2 TO step 3 (preview), fetch preview and policy impact
        if (activeStep === 2) {
            setActiveStep(3);
            await Promise.all([fetchPreview(), fetchPolicyImpact()]);
            return;
        }

        // When on step 4, show confirmation dialog before running payroll
        if (activeStep === 4) {
            setConfirmRunDialog(true);
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

    // Safe percentage calculation to avoid division by zero
    const safePercentage = (current: number, previous: number): string => {
        if (previous === 0) return current > 0 ? '+∞' : '0';
        return ((current - previous) / previous * 100).toFixed(1);
    };

    // Handle opening adjustment dialog
    const openAdjustmentDialog = (employeeId: string, employeeName: string, type: 'bonus' | 'deduction') => {
        setAdjustmentDialog({ open: true, employeeId, employeeName, type });
        setAdjustmentAmount('');
        setAdjustmentReason('');
    };

    // Handle adding adjustment from dialog
    const handleAddAdjustment = () => {
        const amount = parseFloat(adjustmentAmount);
        if (isNaN(amount) || amount <= 0) {
            setError('يرجى إدخال مبلغ صحيح');
            return;
        }
        if (!adjustmentReason.trim()) {
            setError('يرجى إدخال سبب التعديل');
            return;
        }

        setAdjustments(prev => ({
            ...prev,
            [adjustmentDialog.employeeId]: [
                ...(prev[adjustmentDialog.employeeId] || []),
                { type: adjustmentDialog.type, amount, reason: adjustmentReason.trim() }
            ]
        }));

        setAdjustmentDialog({ open: false, employeeId: '', employeeName: '', type: 'bonus' });
        setError(null);
    };

    // Handle confirming payroll run
    const handleConfirmRun = async () => {
        setConfirmRunDialog(false);
        await runPayroll();
    };

    // ========== 10 New Features Functions ==========

    // 1. Export to Excel
    const exportToExcel = () => {
        if (!previewData?.employees) return;

        const data = getFilteredAndSortedEmployees().map(emp => ({
            'رقم الموظف': emp.employeeCode,
            'الاسم': emp.name,
            'الفرع': emp.branch,
            'القسم': emp.department,
            'الراتب الأساسي': emp.baseSalary,
            'الإجمالي': emp.gross,
            'الخصومات': emp.deductions,
            'التأمينات': emp.gosi,
            'الصافي': emp.net,
            'الحالة': excludedEmployees.has(emp.id) ? 'مستثنى' : 'مشمول',
        }));

        // Create CSV content
        const headers = Object.keys(data[0] || {}).join(',');
        const rows = data.map(row => Object.values(row).join(','));
        const csv = '\uFEFF' + [headers, ...rows].join('\n'); // BOM for Arabic

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `payroll-preview-${selectedPeriodId}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    // 2. Filter and Sort employees
    const getFilteredAndSortedEmployees = useCallback(() => {
        if (!previewData?.employees) return [];

        let filtered = previewData.employees.filter(emp => {
            if (!searchQuery) return true;
            const query = searchQuery.toLowerCase();
            return (
                emp.name.toLowerCase().includes(query) ||
                emp.employeeCode.toLowerCase().includes(query) ||
                emp.branch.toLowerCase().includes(query) ||
                emp.department.toLowerCase().includes(query)
            );
        });

        // Sort
        filtered.sort((a, b) => {
            let aVal: any = a[sortConfig.key as keyof EmployeePreview];
            let bVal: any = b[sortConfig.key as keyof EmployeePreview];

            if (typeof aVal === 'string') aVal = aVal.toLowerCase();
            if (typeof bVal === 'string') bVal = bVal.toLowerCase();

            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return filtered;
    }, [previewData?.employees, searchQuery, sortConfig]);

    // 3. Handle sort click
    const handleSort = (key: string) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    // 4. Group employees by branch/department
    const getGroupedEmployees = useCallback(() => {
        const employees = getFilteredAndSortedEmployees();
        if (groupBy === 'none') return { 'جميع الموظفين': employees };

        const grouped: Record<string, EmployeePreview[]> = {};
        employees.forEach(emp => {
            const key = groupBy === 'branch' ? emp.branch : emp.department;
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(emp);
        });

        return grouped;
    }, [getFilteredAndSortedEmployees, groupBy]);

    // 5. Detect salary alerts
    const detectSalaryAlerts = useCallback(() => {
        if (!previewData?.employees) return;

        const alerts: { employeeId: string; type: string; message: string }[] = [];
        const avgNet = previewData.estimatedNet / previewData.totalEmployees;

        previewData.employees.forEach(emp => {
            // Alert 1: Negative salary
            if (emp.net < 0) {
                alerts.push({ employeeId: emp.id, type: 'error', message: `راتب سالب: ${formatMoney(emp.net)}` });
            }
            // Alert 2: Salary too high (>3x average)
            else if (emp.net > avgNet * 3) {
                alerts.push({ employeeId: emp.id, type: 'warning', message: `راتب مرتفع جداً (${((emp.net / avgNet) * 100).toFixed(0)}% من المتوسط)` });
            }
            // Alert 3: Salary too low (<30% of average)
            else if (emp.net < avgNet * 0.3 && emp.net > 0) {
                alerts.push({ employeeId: emp.id, type: 'warning', message: `راتب منخفض جداً (${((emp.net / avgNet) * 100).toFixed(0)}% من المتوسط)` });
            }
            // Alert 4: High deductions (>50% of gross)
            if (emp.deductions > emp.gross * 0.5) {
                alerts.push({ employeeId: emp.id, type: 'warning', message: `خصومات عالية: ${((emp.deductions / emp.gross) * 100).toFixed(0)}% من الإجمالي` });
            }
        });

        setSalaryAlerts(alerts);
    }, [previewData]);

    // Run salary alerts detection when preview data changes
    useEffect(() => {
        detectSalaryAlerts();
    }, [previewData, detectSalaryAlerts]);

    // 6. Save draft to localStorage
    const saveDraft = () => {
        const draft = {
            selectedPeriodId,
            selectedBranchId,
            selectedDepartmentId,
            excludedEmployees: Array.from(excludedEmployees),
            adjustments,
            activeStep,
            savedAt: new Date().toISOString(),
        };
        localStorage.setItem('payroll-wizard-draft', JSON.stringify(draft));
        setDraftSaved(true);
        setLastDraftTime(new Date());
        setTimeout(() => setDraftSaved(false), 3000);
    };

    // 7. Load draft from localStorage
    const loadDraft = () => {
        const saved = localStorage.getItem('payroll-wizard-draft');
        if (saved) {
            const draft = JSON.parse(saved);
            setSelectedPeriodId(draft.selectedPeriodId || '');
            setSelectedBranchId(draft.selectedBranchId || '');
            setSelectedDepartmentId(draft.selectedDepartmentId || '');
            setExcludedEmployees(new Set(draft.excludedEmployees || []));
            setAdjustments(draft.adjustments || {});
            if (draft.activeStep > 0) setActiveStep(draft.activeStep);
            setLastDraftTime(draft.savedAt ? new Date(draft.savedAt) : null);
        }
    };

    // Load draft on mount
    useEffect(() => {
        loadDraft();
    }, []);

    // 8. Print preview
    const printPreview = () => {
        const printContent = document.getElementById('preview-table');
        if (!printContent) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
            <html dir="rtl">
            <head>
                <title>معاينة مسير الرواتب</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
                    th { background-color: #f5f5f5; }
                    .header { text-align: center; margin-bottom: 20px; }
                    .summary { margin-top: 20px; padding: 10px; background: #f5f5f5; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2>معاينة مسير الرواتب</h2>
                    <p>الفترة: ${getMonthName(periods.find(p => p.id === selectedPeriodId)?.month || 0)} ${periods.find(p => p.id === selectedPeriodId)?.year}</p>
                </div>
                ${printContent.outerHTML}
                <div class="summary">
                    <strong>الإجمالي:</strong> ${previewData?.totalEmployees} موظف |
                    <strong>صافي الرواتب:</strong> ${formatMoney(previewData?.estimatedNet || 0)}
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    };

    // 9. Get adjustments summary
    const getAdjustmentsSummary = () => {
        let totalBonus = 0;
        let totalDeduction = 0;
        let employeesWithAdjustments = 0;

        Object.entries(adjustments).forEach(([_, items]) => {
            if (items.length > 0) employeesWithAdjustments++;
            items.forEach(item => {
                if (item.type === 'bonus') totalBonus += item.amount;
                else totalDeduction += item.amount;
            });
        });

        return { totalBonus, totalDeduction, employeesWithAdjustments };
    };

    // 10. Get employee alert
    const getEmployeeAlert = (employeeId: string) => {
        return salaryAlerts.find(a => a.employeeId === employeeId);
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
                                {/* ========== New Features Toolbar ========== */}
                                <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
                                    <Grid container spacing={2} alignItems="center">
                                        {/* Search */}
                                        <Grid item xs={12} md={4}>
                                            <TextField
                                                fullWidth
                                                size="small"
                                                placeholder="بحث بالاسم، الكود، الفرع، القسم..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                InputProps={{
                                                    startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
                                                }}
                                            />
                                        </Grid>

                                        {/* Group By */}
                                        <Grid item xs={6} md={2}>
                                            <TextField
                                                select
                                                fullWidth
                                                size="small"
                                                value={groupBy}
                                                onChange={(e) => setGroupBy(e.target.value as any)}
                                                label="تجميع حسب"
                                            >
                                                <MenuItem value="none">بدون تجميع</MenuItem>
                                                <MenuItem value="branch">الفرع</MenuItem>
                                                <MenuItem value="department">القسم</MenuItem>
                                            </TextField>
                                        </Grid>

                                        {/* Action Buttons */}
                                        <Grid item xs={6} md={6}>
                                            <Box display="flex" gap={1} justifyContent="flex-end" flexWrap="wrap">
                                                <Button
                                                    size="small"
                                                    startIcon={<FileDownload />}
                                                    onClick={exportToExcel}
                                                    variant="outlined"
                                                >
                                                    تصدير Excel
                                                </Button>
                                                <Button
                                                    size="small"
                                                    startIcon={<Print />}
                                                    onClick={printPreview}
                                                    variant="outlined"
                                                >
                                                    طباعة
                                                </Button>
                                                <Button
                                                    size="small"
                                                    startIcon={<Save />}
                                                    onClick={saveDraft}
                                                    variant="outlined"
                                                    color={draftSaved ? 'success' : 'primary'}
                                                >
                                                    {draftSaved ? 'تم الحفظ ✓' : 'حفظ مسودة'}
                                                </Button>
                                                {salaryAlerts.length > 0 && (
                                                    <Chip
                                                        icon={<NotificationsActive />}
                                                        label={`${salaryAlerts.length} تنبيه`}
                                                        color="warning"
                                                        size="small"
                                                    />
                                                )}
                                            </Box>
                                        </Grid>
                                    </Grid>

                                    {/* Smart Policies Impact Section */}
                                    {(policyImpact.loading || policyImpact.data) && (
                                        <Paper sx={{ mt: 2, p: 2, bgcolor: 'info.50', border: '1px solid', borderColor: 'info.200', borderRadius: 2 }}>
                                            <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                                                <Gavel color="info" />
                                                <Typography variant="subtitle1" fontWeight="bold" color="info.dark">
                                                    تأثير السياسات الذكية
                                                </Typography>
                                                {policyImpact.loading && <CircularProgress size={16} />}
                                            </Box>

                                            {!policyImpact.loading && policyImpact.data && (
                                                <>
                                                    <Grid container spacing={2}>
                                                        <Grid item xs={6} sm={3}>
                                                            <Box textAlign="center" p={1} bgcolor="background.paper" borderRadius={1}>
                                                                <Typography variant="h6" fontWeight="bold" color="info.main">
                                                                    {policyImpact.data.summary.policiesApplied}
                                                                </Typography>
                                                                <Typography variant="caption" color="text.secondary">
                                                                    سياسات نشطة
                                                                </Typography>
                                                            </Box>
                                                        </Grid>
                                                        <Grid item xs={6} sm={3}>
                                                            <Box textAlign="center" p={1} bgcolor="background.paper" borderRadius={1}>
                                                                <Typography variant="h6" fontWeight="bold" color="primary.main">
                                                                    {policyImpact.data.summary.employeesAffected}
                                                                </Typography>
                                                                <Typography variant="caption" color="text.secondary">
                                                                    موظف متأثر
                                                                </Typography>
                                                            </Box>
                                                        </Grid>
                                                        <Grid item xs={6} sm={3}>
                                                            <Box textAlign="center" p={1} bgcolor="success.50" borderRadius={1}>
                                                                <Typography variant="h6" fontWeight="bold" color="success.main">
                                                                    +{formatMoney(policyImpact.data.summary.totalBonuses)}
                                                                </Typography>
                                                                <Typography variant="caption" color="text.secondary">
                                                                    مكافآت
                                                                </Typography>
                                                            </Box>
                                                        </Grid>
                                                        <Grid item xs={6} sm={3}>
                                                            <Box textAlign="center" p={1} bgcolor="error.50" borderRadius={1}>
                                                                <Typography variant="h6" fontWeight="bold" color="error.main">
                                                                    -{formatMoney(policyImpact.data.summary.totalDeductions)}
                                                                </Typography>
                                                                <Typography variant="caption" color="text.secondary">
                                                                    خصومات
                                                                </Typography>
                                                            </Box>
                                                        </Grid>
                                                    </Grid>

                                                    {/* Policy breakdown */}
                                                    {policyImpact.data.byPolicy.length > 0 && (
                                                        <Box mt={2}>
                                                            <Typography variant="body2" fontWeight="bold" mb={1}>
                                                                تفصيل حسب السياسة:
                                                            </Typography>
                                                            {policyImpact.data.byPolicy.slice(0, 4).map((policy) => (
                                                                <Box key={policy.policyId} display="flex" justifyContent="space-between" alignItems="center" py={0.5}>
                                                                    <Chip
                                                                        size="small"
                                                                        label={policy.policyName}
                                                                        variant="outlined"
                                                                        sx={{ maxWidth: 200 }}
                                                                    />
                                                                    <Typography variant="body2">
                                                                        {policy.timesApplied} مرة • {formatMoney(Math.abs(policy.totalAmount))}
                                                                    </Typography>
                                                                </Box>
                                                            ))}
                                                        </Box>
                                                    )}

                                                    {/* Net Impact Alert */}
                                                    {Math.abs(policyImpact.data.summary.netImpact) > 0 && (
                                                        <Alert
                                                            severity={policyImpact.data.summary.netImpact > 0 ? 'success' : 'warning'}
                                                            sx={{ mt: 2 }}
                                                        >
                                                            صافي تأثير السياسات الذكية: {policyImpact.data.summary.netImpact > 0 ? '+' : ''}{formatMoney(policyImpact.data.summary.netImpact)}
                                                        </Alert>
                                                    )}
                                                </>
                                            )}

                                            {!policyImpact.loading && !policyImpact.data && (
                                                <Typography variant="body2" color="text.secondary">
                                                    لا توجد سياسات ذكية نشطة لهذه الفترة
                                                </Typography>
                                            )}
                                        </Paper>
                                    )}

                                    {/* Alerts Summary */}
                                    {salaryAlerts.length > 0 && (
                                        <Alert severity="warning" sx={{ mt: 2 }}>
                                            <AlertTitle>تنبيهات الرواتب ({salaryAlerts.length})</AlertTitle>
                                            {salaryAlerts.slice(0, 3).map((alert, idx) => (
                                                <Typography key={idx} variant="body2">
                                                    • {previewData.employees?.find(e => e.id === alert.employeeId)?.name}: {alert.message}
                                                </Typography>
                                            ))}
                                            {salaryAlerts.length > 3 && (
                                                <Typography variant="body2" color="text.secondary">
                                                    و {salaryAlerts.length - 3} تنبيهات أخرى...
                                                </Typography>
                                            )}
                                        </Alert>
                                    )}

                                    {/* Adjustments Summary */}
                                    {Object.keys(adjustments).length > 0 && (
                                        <Alert severity="info" sx={{ mt: 2 }}>
                                            <AlertTitle>ملخص التعديلات</AlertTitle>
                                            <Box display="flex" gap={3}>
                                                <Typography variant="body2">
                                                    👥 {getAdjustmentsSummary().employeesWithAdjustments} موظف
                                                </Typography>
                                                {getAdjustmentsSummary().totalBonus > 0 && (
                                                    <Typography variant="body2" color="success.main">
                                                        ➕ مكافآت: {formatMoney(getAdjustmentsSummary().totalBonus)}
                                                    </Typography>
                                                )}
                                                {getAdjustmentsSummary().totalDeduction > 0 && (
                                                    <Typography variant="body2" color="error.main">
                                                        ➖ خصومات: {formatMoney(getAdjustmentsSummary().totalDeduction)}
                                                    </Typography>
                                                )}
                                            </Box>
                                        </Alert>
                                    )}

                                    {/* Draft Info */}
                                    {lastDraftTime && (
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                                            آخر حفظ: {lastDraftTime.toLocaleString('ar-SA')}
                                        </Typography>
                                    )}
                                </Paper>

                                {/* Summary Cards */}
                                <Grid container spacing={2} sx={{ mb: 3 }}>
                                    <Grid item xs={6} md={3}>
                                        <Card sx={{ bgcolor: 'primary.50', height: '100%' }}>
                                            <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
                                                <People color="primary" sx={{ fontSize: 28 }} />
                                                <Typography variant="h5" fontWeight="bold">{previewData.totalEmployees}</Typography>
                                                <Typography variant="caption" color="text.secondary">موظف</Typography>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                    <Grid item xs={6} md={3}>
                                        <Card sx={{ bgcolor: 'success.50', height: '100%' }}>
                                            <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
                                                <TrendingUp color="success" sx={{ fontSize: 28 }} />
                                                <Typography variant="h6" fontWeight="bold" color="success.main">
                                                    {formatMoney(previewData.estimatedGross)}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">إجمالي المستحقات</Typography>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                    <Grid item xs={6} md={3}>
                                        <Card sx={{ bgcolor: 'error.50', height: '100%' }}>
                                            <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
                                                <TrendingDown color="error" sx={{ fontSize: 28 }} />
                                                <Typography variant="h6" fontWeight="bold" color="error.main">
                                                    {formatMoney(previewData.estimatedDeductions)}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">إجمالي الخصومات</Typography>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                    <Grid item xs={6} md={3}>
                                        <Card sx={{ bgcolor: 'info.50', height: '100%', border: '2px solid', borderColor: 'info.main' }}>
                                            <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
                                                <AttachMoney color="info" sx={{ fontSize: 28 }} />
                                                <Typography variant="h5" fontWeight="bold" color="info.main">
                                                    {formatMoney(previewData.estimatedNet)}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">صافي الرواتب</Typography>
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
                                                {' '}({safePercentage(previewData.estimatedNet, previewData.previousMonth.net)}%)
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
                                        👥 تفاصيل الموظفين ({previewData.employees?.filter(e => !excludedEmployees.has(e.id)).length || previewData.totalEmployees})
                                        {excludedEmployees.size > 0 && (
                                            <Chip
                                                label={`${excludedEmployees.size} مستثنى`}
                                                color="warning"
                                                size="small"
                                                sx={{ ml: 1 }}
                                            />
                                        )}
                                    </Typography>
                                    <Box display="flex" gap={1}>
                                        {excludedEmployees.size > 0 && (
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                color="warning"
                                                onClick={() => setExcludedEmployees(new Set())}
                                            >
                                                إلغاء كل الاستثناءات
                                            </Button>
                                        )}
                                    </Box>
                                </Box>

                                {/* Employee Preview Table - With Real Data */}
                                <TableContainer id="preview-table" component={Paper} variant="outlined" sx={{ maxHeight: 450 }}>
                                    <Table size="small" stickyHeader>
                                        <TableHead>
                                            <TableRow sx={{ bgcolor: 'grey.100' }}>
                                                <TableCell sx={{ fontWeight: 'bold', width: 40 }}></TableCell>
                                                <TableCell sx={{ fontWeight: 'bold', width: 50, cursor: 'pointer' }} onClick={() => handleSort('employeeCode')}>
                                                    # {sortConfig.key === 'employeeCode' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                                </TableCell>
                                                <TableCell sx={{ fontWeight: 'bold', cursor: 'pointer' }} onClick={() => handleSort('name')}>
                                                    الموظف {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                                </TableCell>
                                                <TableCell sx={{ fontWeight: 'bold', cursor: 'pointer' }} onClick={() => handleSort('branch')}>
                                                    الفرع/القسم {sortConfig.key === 'branch' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 'bold', color: 'success.main', cursor: 'pointer' }} onClick={() => handleSort('gross')}>
                                                    إجمالي المستحقات {sortConfig.key === 'gross' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 'bold', color: 'error.main', cursor: 'pointer' }} onClick={() => handleSort('deductions')}>
                                                    الخصومات {sortConfig.key === 'deductions' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 'bold', color: 'info.main', cursor: 'pointer' }} onClick={() => handleSort('net')}>
                                                    صافي الراتب {sortConfig.key === 'net' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                                </TableCell>
                                                <TableCell sx={{ fontWeight: 'bold', width: 100 }}>إجراءات</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {getFilteredAndSortedEmployees().length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={8} align="center">
                                                        <Typography color="text.secondary">
                                                            {searchQuery ? 'لا توجد نتائج للبحث' : 'لا يوجد موظفين للعرض'}
                                                        </Typography>
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                Object.entries(getGroupedEmployees()).map(([groupName, groupEmployees]) => (
                                                    <React.Fragment key={groupName}>
                                                        {/* Group Header */}
                                                        {groupBy !== 'none' && (
                                                            <TableRow sx={{ bgcolor: 'primary.50' }}>
                                                                <TableCell colSpan={8}>
                                                                    <Box display="flex" alignItems="center" gap={1}>
                                                                        <Category fontSize="small" color="primary" />
                                                                        <Typography fontWeight="bold" color="primary">
                                                                            {groupName} ({groupEmployees.length} موظف)
                                                                        </Typography>
                                                                        <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                                                                            صافي: {formatMoney(groupEmployees.reduce((s, e) => s + e.net, 0))}
                                                                        </Typography>
                                                                    </Box>
                                                                </TableCell>
                                                            </TableRow>
                                                        )}
                                                        {groupEmployees.map((emp, idx) => {
                                                            const isExcluded = excludedEmployees.has(emp.id);
                                                            const empAdjustments = adjustments[emp.id] || [];
                                                            const adjustmentTotal = empAdjustments.reduce((sum, adj) =>
                                                                sum + (adj.type === 'bonus' ? adj.amount : -adj.amount), 0
                                                            );
                                                            const adjustedNet = emp.net + adjustmentTotal;
                                                            const isExpanded = expandedEmployee === emp.id;

                                                            return (
                                                                <React.Fragment key={emp.id}>
                                                                    <TableRow
                                                                        hover
                                                                        onClick={() => setExpandedEmployee(isExpanded ? null : emp.id)}
                                                                        sx={{
                                                                            opacity: isExcluded ? 0.4 : 1,
                                                                            bgcolor: isExcluded ? 'grey.50' : empAdjustments.length > 0 ? 'warning.50' : 'inherit',
                                                                            textDecoration: isExcluded ? 'line-through' : 'none',
                                                                            cursor: 'pointer',
                                                                            '&:hover': { bgcolor: 'action.hover' },
                                                                        }}
                                                                    >
                                                                        <TableCell onClick={(e) => e.stopPropagation()}>
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={!isExcluded}
                                                                                onChange={() => {
                                                                                    const newExcluded = new Set(excludedEmployees);
                                                                                    if (isExcluded) {
                                                                                        newExcluded.delete(emp.id);
                                                                                    } else {
                                                                                        newExcluded.add(emp.id);
                                                                                    }
                                                                                    setExcludedEmployees(newExcluded);
                                                                                }}
                                                                                title={isExcluded ? 'إعادة تضمين' : 'استثناء من المسير'}
                                                                            />
                                                                        </TableCell>
                                                                        <TableCell>{idx + 1}</TableCell>
                                                                        <TableCell>
                                                                            <Box display="flex" alignItems="center" gap={1}>
                                                                                {isExpanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                                                                                <Box>
                                                                                    <Box display="flex" alignItems="center" gap={0.5}>
                                                                                        <Typography variant="body2" fontWeight={500}>
                                                                                            {emp.name}
                                                                                        </Typography>
                                                                                        {getEmployeeAlert(emp.id) && (
                                                                                            <Warning
                                                                                                fontSize="small"
                                                                                                color={getEmployeeAlert(emp.id)?.type === 'error' ? 'error' : 'warning'}
                                                                                                titleAccess={getEmployeeAlert(emp.id)?.message}
                                                                                            />
                                                                                        )}
                                                                                    </Box>
                                                                                    <Typography variant="caption" color="text.secondary">
                                                                                        {emp.employeeCode} {emp.isSaudi && '🇸🇦'}
                                                                                    </Typography>
                                                                                </Box>
                                                                            </Box>
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            <Box>
                                                                                <Typography variant="body2">{emp.branch}</Typography>
                                                                                <Typography variant="caption" color="text.secondary">{emp.department}</Typography>
                                                                            </Box>
                                                                        </TableCell>
                                                                        <TableCell align="right" sx={{ color: 'success.main', fontWeight: 'bold' }}>
                                                                            {formatMoney(emp.gross + (empAdjustments.filter(a => a.type === 'bonus').reduce((s, a) => s + a.amount, 0)))}
                                                                        </TableCell>
                                                                        <TableCell align="right" sx={{ color: 'error.main' }}>
                                                                            {formatMoney(emp.deductions + (empAdjustments.filter(a => a.type === 'deduction').reduce((s, a) => s + a.amount, 0)))}
                                                                            {emp.gosi > 0 && (
                                                                                <Typography variant="caption" display="block" color="text.secondary">
                                                                                    (GOSI: {formatMoney(emp.gosi)})
                                                                                </Typography>
                                                                            )}
                                                                        </TableCell>
                                                                        <TableCell align="right" sx={{ fontWeight: 'bold', color: 'info.main', fontSize: '1rem' }}>
                                                                            {formatMoney(adjustedNet)}
                                                                            {adjustmentTotal !== 0 && (
                                                                                <Typography variant="caption" display="block" color={adjustmentTotal > 0 ? 'success.main' : 'error.main'}>
                                                                                    ({adjustmentTotal > 0 ? '+' : ''}{formatMoney(adjustmentTotal)})
                                                                                </Typography>
                                                                            )}
                                                                        </TableCell>
                                                                        <TableCell onClick={(e) => e.stopPropagation()}>
                                                                            <Box display="flex" gap={0.5}>
                                                                                <Button
                                                                                    size="small"
                                                                                    variant="outlined"
                                                                                    color="success"
                                                                                    disabled={isExcluded}
                                                                                    onClick={() => openAdjustmentDialog(emp.id, emp.name, 'bonus')}
                                                                                    sx={{ minWidth: 30, p: 0.5 }}
                                                                                    title="إضافة مكافأة"
                                                                                >
                                                                                    <Add fontSize="small" />
                                                                                </Button>
                                                                                <Button
                                                                                    size="small"
                                                                                    variant="outlined"
                                                                                    color="error"
                                                                                    disabled={isExcluded}
                                                                                    onClick={() => openAdjustmentDialog(emp.id, emp.name, 'deduction')}
                                                                                    sx={{ minWidth: 30, p: 0.5 }}
                                                                                    title="إضافة خصم"
                                                                                >
                                                                                    <Remove fontSize="small" />
                                                                                </Button>
                                                                                {empAdjustments.length > 0 && (
                                                                                    <Button
                                                                                        size="small"
                                                                                        variant="text"
                                                                                        color="warning"
                                                                                        onClick={() => {
                                                                                            setAdjustments(prev => {
                                                                                                const newAdj = { ...prev };
                                                                                                delete newAdj[emp.id];
                                                                                                return newAdj;
                                                                                            });
                                                                                        }}
                                                                                        sx={{ minWidth: 30, p: 0.5 }}
                                                                                        title="مسح التعديلات"
                                                                                    >
                                                                                        ✕
                                                                                    </Button>
                                                                                )}
                                                                            </Box>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                    {/* Expanded Details Row */}
                                                                    <TableRow>
                                                                        <TableCell colSpan={8} sx={{ p: 0, border: 0 }}>
                                                                            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                                                                <Box sx={{ p: 2, bgcolor: 'grey.50', borderBottom: '1px solid', borderColor: 'divider' }}>
                                                                                    <Grid container spacing={2}>
                                                                                        {/* Earnings */}
                                                                                        <Grid item xs={12} md={4}>
                                                                                            <Typography variant="subtitle2" fontWeight="bold" color="success.main" gutterBottom>
                                                                                                💰 المستحقات
                                                                                            </Typography>
                                                                                            {emp.earnings && emp.earnings.length > 0 ? (
                                                                                                emp.earnings.filter(e => e.amount > 0).map((e, i) => (
                                                                                                    <Box key={i} display="flex" justifyContent="space-between">
                                                                                                        <Typography variant="body2">{e.name}</Typography>
                                                                                                        <Typography variant="body2" fontWeight={500}>{formatMoney(e.amount)}</Typography>
                                                                                                    </Box>
                                                                                                ))
                                                                                            ) : (
                                                                                                <Typography variant="body2" color="text.secondary">الراتب الأساسي: {formatMoney(emp.baseSalary)}</Typography>
                                                                                            )}
                                                                                            {empAdjustments.filter(a => a.type === 'bonus').map((adj, i) => (
                                                                                                <Box key={i} display="flex" justifyContent="space-between" sx={{ color: 'success.main' }}>
                                                                                                    <Typography variant="body2">+ {adj.reason}</Typography>
                                                                                                    <Typography variant="body2" fontWeight={500}>{formatMoney(adj.amount)}</Typography>
                                                                                                </Box>
                                                                                            ))}
                                                                                            <Divider sx={{ my: 0.5 }} />
                                                                                            <Box display="flex" justifyContent="space-between" sx={{ bgcolor: 'success.50', p: 0.5, borderRadius: 1 }}>
                                                                                                <Typography variant="body2" fontWeight="bold">المجموع</Typography>
                                                                                                <Typography variant="body2" fontWeight="bold" color="success.main">{formatMoney(emp.gross)}</Typography>
                                                                                            </Box>
                                                                                        </Grid>
                                                                                        {/* Deductions */}
                                                                                        <Grid item xs={12} md={4}>
                                                                                            <Typography variant="subtitle2" fontWeight="bold" color="error.main" gutterBottom>
                                                                                                📉 الخصومات
                                                                                            </Typography>
                                                                                            {emp.deductionItems && emp.deductionItems.length > 0 ? (
                                                                                                emp.deductionItems.filter(d => d.amount > 0).map((d, i) => (
                                                                                                    <Box key={i} display="flex" justifyContent="space-between">
                                                                                                        <Typography variant="body2">{d.name}</Typography>
                                                                                                        <Typography variant="body2" fontWeight={500}>{formatMoney(d.amount)}</Typography>
                                                                                                    </Box>
                                                                                                ))
                                                                                            ) : (
                                                                                                <>
                                                                                                    {emp.gosi > 0 && (
                                                                                                        <Box display="flex" justifyContent="space-between">
                                                                                                            <Typography variant="body2">GOSI (موظف)</Typography>
                                                                                                            <Typography variant="body2" fontWeight={500}>{formatMoney(emp.gosi)}</Typography>
                                                                                                        </Box>
                                                                                                    )}
                                                                                                    {emp.advances > 0 && (
                                                                                                        <Box display="flex" justifyContent="space-between">
                                                                                                            <Typography variant="body2">سلف</Typography>
                                                                                                            <Typography variant="body2" fontWeight={500}>{formatMoney(emp.advances)}</Typography>
                                                                                                        </Box>
                                                                                                    )}
                                                                                                    {emp.deductions === 0 && emp.gosi === 0 && emp.advances === 0 && (
                                                                                                        <Typography variant="body2" color="text.secondary">لا توجد خصومات</Typography>
                                                                                                    )}
                                                                                                </>
                                                                                            )}
                                                                                            {empAdjustments.filter(a => a.type === 'deduction').map((adj, i) => (
                                                                                                <Box key={i} display="flex" justifyContent="space-between" sx={{ color: 'error.main' }}>
                                                                                                    <Typography variant="body2">- {adj.reason}</Typography>
                                                                                                    <Typography variant="body2" fontWeight={500}>{formatMoney(adj.amount)}</Typography>
                                                                                                </Box>
                                                                                            ))}
                                                                                            {emp.deductions > 0 && (
                                                                                                <>
                                                                                                    <Divider sx={{ my: 0.5 }} />
                                                                                                    <Box display="flex" justifyContent="space-between" sx={{ bgcolor: 'error.50', p: 0.5, borderRadius: 1 }}>
                                                                                                        <Typography variant="body2" fontWeight="bold">المجموع</Typography>
                                                                                                        <Typography variant="body2" fontWeight="bold" color="error.main">{formatMoney(emp.deductions)}</Typography>
                                                                                                    </Box>
                                                                                                </>
                                                                                            )}
                                                                                            {/* ✅ عرض الخصومات المرحلة إذا وجدت */}
                                                                                            {emp.deferredDeductions && emp.deferredDeductions > 0 && (
                                                                                                <Box display="flex" justifyContent="space-between" sx={{ bgcolor: 'warning.100', p: 0.5, borderRadius: 1, mt: 0.5, border: '1px solid', borderColor: 'warning.main' }}>
                                                                                                    <Typography variant="body2" fontWeight="bold" color="warning.dark">⏳ خصومات مرحلة</Typography>
                                                                                                    <Typography variant="body2" fontWeight="bold" color="warning.dark">{formatMoney(emp.deferredDeductions)}</Typography>
                                                                                                </Box>
                                                                                            )}
                                                                                        </Grid>
                                                                                        {/* Summary */}
                                                                                        <Grid item xs={12} md={4}>
                                                                                            <Typography variant="subtitle2" fontWeight="bold" color="info.main" gutterBottom>
                                                                                                📊 الملخص
                                                                                            </Typography>
                                                                                            <Box display="flex" justifyContent="space-between">
                                                                                                <Typography variant="body2">راتب العقد</Typography>
                                                                                                <Typography variant="body2" fontWeight={500}>{formatMoney(emp.baseSalary)}</Typography>
                                                                                            </Box>
                                                                                            <Box display="flex" justifyContent="space-between">
                                                                                                <Typography variant="body2">المسمى الوظيفي</Typography>
                                                                                                <Typography variant="body2" fontWeight={500}>{emp.jobTitle || 'غير محدد'}</Typography>
                                                                                            </Box>
                                                                                            {emp.isSaudi && (
                                                                                                <Box display="flex" justifyContent="space-between">
                                                                                                    <Typography variant="body2">الجنسية</Typography>
                                                                                                    <Chip label="سعودي 🇸🇦" size="small" color="success" />
                                                                                                </Box>
                                                                                            )}
                                                                                            {emp.gosiEmployer > 0 && (
                                                                                                <Box display="flex" justifyContent="space-between">
                                                                                                    <Typography variant="body2">GOSI (صاحب العمل)</Typography>
                                                                                                    <Typography variant="body2" fontWeight={500}>{formatMoney(emp.gosiEmployer)}</Typography>
                                                                                                </Box>
                                                                                            )}
                                                                                            <Divider sx={{ my: 1 }} />
                                                                                            <Box display="flex" justifyContent="space-between" sx={{ bgcolor: 'info.50', p: 1, borderRadius: 1 }}>
                                                                                                <Typography variant="body1" fontWeight="bold">صافي الراتب</Typography>
                                                                                                <Typography variant="body1" fontWeight="bold" color="info.main">{formatMoney(adjustedNet)}</Typography>
                                                                                            </Box>
                                                                                        </Grid>
                                                                                    </Grid>
                                                                                </Box>
                                                                            </Collapse>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                </React.Fragment>
                                                            );
                                                        })}
                                                    </React.Fragment>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </TableContainer>

                                {/* Adjustments Summary */}
                                {(excludedEmployees.size > 0 || Object.keys(adjustments).length > 0) && (
                                    <Alert severity="warning" sx={{ mt: 2 }}>
                                        <AlertTitle>⚠️ تعديلات مُعلقة</AlertTitle>
                                        <Box>
                                            {excludedEmployees.size > 0 && (
                                                <Typography variant="body2">
                                                    • {excludedEmployees.size} موظف مستثنى من هذا المسير
                                                </Typography>
                                            )}
                                            {Object.keys(adjustments).length > 0 && (
                                                <Typography variant="body2">
                                                    • {Object.keys(adjustments).length} موظف لديه تعديلات (مكافآت/خصومات)
                                                </Typography>
                                            )}
                                        </Box>
                                    </Alert>
                                )}

                                {/* Info Alert */}
                                <Alert severity="success" sx={{ mt: 2 }}>
                                    <AlertTitle>✅ المعاينة جاهزة</AlertTitle>
                                    تم حساب الرواتب بناءً على هياكل الرواتب وخصومات GOSI والسلف المعتمدة.
                                    {previewData.gosiEnabled && ' التأمينات الاجتماعية مفعلة.'}
                                    {' '}اضغط التالي للمتابعة.
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

            {/* Adjustment Dialog */}
            <Dialog
                open={adjustmentDialog.open}
                onClose={() => setAdjustmentDialog({ open: false, employeeId: '', employeeName: '', type: 'bonus' })}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box display="flex" alignItems="center" gap={1}>
                        {adjustmentDialog.type === 'bonus' ? (
                            <>
                                <Add color="success" />
                                <Typography>إضافة مكافأة</Typography>
                            </>
                        ) : (
                            <>
                                <Remove color="error" />
                                <Typography>إضافة خصم</Typography>
                            </>
                        )}
                    </Box>
                    <Button
                        size="small"
                        onClick={() => setAdjustmentDialog({ open: false, employeeId: '', employeeName: '', type: 'bonus' })}
                    >
                        <Close />
                    </Button>
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 1 }}>
                        <Alert severity="info" sx={{ mb: 2 }}>
                            {adjustmentDialog.type === 'bonus' ? 'إضافة مكافأة للموظف' : 'إضافة خصم على الموظف'}:
                            <strong> {adjustmentDialog.employeeName}</strong>
                        </Alert>
                        <TextField
                            fullWidth
                            label="المبلغ (ر.س)"
                            type="number"
                            value={adjustmentAmount}
                            onChange={(e) => setAdjustmentAmount(e.target.value)}
                            sx={{ mb: 2 }}
                            InputProps={{
                                startAdornment: <InputAdornment position="start">ر.س</InputAdornment>,
                            }}
                            autoFocus
                        />
                        <TextField
                            fullWidth
                            label="السبب"
                            value={adjustmentReason}
                            onChange={(e) => setAdjustmentReason(e.target.value)}
                            multiline
                            rows={2}
                            placeholder={adjustmentDialog.type === 'bonus' ? 'مثال: مكافأة أداء متميز' : 'مثال: خصم غياب بدون عذر'}
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button
                        onClick={() => setAdjustmentDialog({ open: false, employeeId: '', employeeName: '', type: 'bonus' })}
                    >
                        إلغاء
                    </Button>
                    <Button
                        variant="contained"
                        color={adjustmentDialog.type === 'bonus' ? 'success' : 'error'}
                        onClick={handleAddAdjustment}
                        startIcon={adjustmentDialog.type === 'bonus' ? <Add /> : <Remove />}
                    >
                        {adjustmentDialog.type === 'bonus' ? 'إضافة المكافأة' : 'إضافة الخصم'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Confirmation Dialog */}
            <Dialog
                open={confirmRunDialog}
                onClose={() => setConfirmRunDialog(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle sx={{ bgcolor: 'warning.light', color: 'warning.contrastText' }}>
                    <Box display="flex" alignItems="center" gap={1}>
                        <Warning />
                        <Typography variant="h6">تأكيد تشغيل مسير الرواتب</Typography>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 2 }}>
                        <Alert severity="warning" sx={{ mb: 2 }}>
                            <AlertTitle>هل أنت متأكد من تشغيل مسير الرواتب؟</AlertTitle>
                            سيتم إنشاء قسائم رواتب لجميع الموظفين المحددين.
                        </Alert>

                        {previewData && (
                            <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 2 }}>
                                <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                                    ملخص المسير:
                                </Typography>
                                <Box display="flex" justifyContent="space-between" mb={1}>
                                    <Typography variant="body2">عدد الموظفين:</Typography>
                                    <Typography variant="body2" fontWeight="bold">
                                        {previewData.totalEmployees - excludedEmployees.size}
                                    </Typography>
                                </Box>
                                <Box display="flex" justifyContent="space-between" mb={1}>
                                    <Typography variant="body2">صافي الرواتب التقديري:</Typography>
                                    <Typography variant="body2" fontWeight="bold" color="primary">
                                        {formatMoney(previewData.estimatedNet)}
                                    </Typography>
                                </Box>
                                {excludedEmployees.size > 0 && (
                                    <Box display="flex" justifyContent="space-between" mb={1}>
                                        <Typography variant="body2" color="warning.main">موظفين مستثنين:</Typography>
                                        <Typography variant="body2" fontWeight="bold" color="warning.main">
                                            {excludedEmployees.size}
                                        </Typography>
                                    </Box>
                                )}
                                {Object.keys(adjustments).length > 0 && (
                                    <Box display="flex" justifyContent="space-between">
                                        <Typography variant="body2" color="info.main">تعديلات مُعلقة:</Typography>
                                        <Typography variant="body2" fontWeight="bold" color="info.main">
                                            {Object.keys(adjustments).length} موظف
                                        </Typography>
                                    </Box>
                                )}
                            </Box>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setConfirmRunDialog(false)}>
                        إلغاء
                    </Button>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleConfirmRun}
                        startIcon={<PlayCircleFilled />}
                    >
                        تأكيد وتشغيل المسير
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default PayrollWizardPage;
