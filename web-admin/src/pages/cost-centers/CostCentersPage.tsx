import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import {
    Box,
    Paper,
    Typography,
    Button,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Chip,
    Alert,
    CircularProgress,
    Card,
    CardContent,
    Grid,
    Tooltip,
    Tabs,
    Tab,
    LinearProgress,
    Collapse,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    ListItemSecondaryAction,
    FormControlLabel,
    Switch,
    Avatar,
    Autocomplete,
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Archive as ArchiveIcon,
    AccountTree as TreeIcon,
    ExpandMore,
    ExpandLess,
    Folder as FolderIcon,
    FolderOpen as FolderOpenIcon,
    Person as PersonIcon,
    AttachMoney as BudgetIcon,
    PieChart as AllocationIcon,
    Business as BusinessIcon,
    TrendingUp as TrendingUpIcon,
    TrendingDown as TrendingDownIcon,
    History as HistoryIcon,
} from '@mui/icons-material';
import { api } from '@/services/api.service';

// ==================== Error Boundary ====================

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

class CostCentersErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
    constructor(props: { children: ReactNode }) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('CostCenters Error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                    <Alert severity="error" sx={{ mb: 2 }}>
                        <Typography variant="h6">حدث خطأ في تحميل الصفحة</Typography>
                        <Typography variant="body2" sx={{ mt: 1 }}>
                            {this.state.error?.message || 'خطأ غير معروف'}
                        </Typography>
                    </Alert>
                    <Button
                        variant="contained"
                        onClick={() => window.location.reload()}
                    >
                        إعادة تحميل الصفحة
                    </Button>
                </Box>
            );
        }
        return this.props.children;
    }
}

// ==================== Types ====================

interface CostCenter {
    id: string;
    code: string;
    nameAr: string;
    nameEn?: string;
    description?: string;
    type: string;
    status: string;
    level: number;
    path?: string;
    parentId?: string;
    parent?: { id: string; code: string; nameAr: string };
    children?: CostCenter[];
    managerId?: string;
    effectiveFrom: string;
    effectiveTo?: string;
    isAllowOverbudget: boolean;
    departmentId?: string;
    department?: { id: string; name: string };
    maxHeadcount?: number;
    budgetAlertThreshold?: number;
    _count?: { users: number; allocations: number; budgets: number };
}

interface CostCenterBudget {
    id: string;
    year: number;
    month?: number;
    budgetAmount: number;
    actualAmount: number;
    variance: number;
    notes?: string;
}

interface Allocation {
    id: string;
    userId: string;
    percentage: number;
    effectiveFrom: string;
    effectiveTo?: string;
    isActive: boolean;
    user?: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
    };
}

interface Employee {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
}

interface Analytics {
    costCenter: CostCenter;
    summary: {
        directEmployees: number;
        childrenCount: number;
        allocationsCount: number;
        totalAllocationPercentage: number;
    };
    budget: {
        totalBudget: number;
        totalActual: number;
        totalVariance: number;
        utilizationRate: number;
        periods: CostCenterBudget[];
    };
}

interface DashboardKPIs {
    summary: {
        totalCostCenters: number;
        activeCostCenters: number;
        archivedCostCenters: number;
        totalHeadcount: number;
    };
    budget: {
        totalBudget: number;
        totalActual: number;
        totalVariance: number;
        overallUtilization: number;
    };
    alerts: {
        criticalCount: number;
        highCount: number;
        warningCount: number;
        centersOverBudget: number;
        topAlerts: any[];
    };
    costPerHead: number;
}

interface AuditLogEntry {
    id: string;
    action: string;
    description?: string;
    oldValue?: any;
    newValue?: any;
    createdAt: string;
    user?: {
        id: string;
        firstName: string;
        lastName: string;
    };
}

interface Department {
    id: string;
    name: string;
}

// ==================== Tree Node Component ====================

const TreeNode: React.FC<{
    node: CostCenter;
    level: number;
    onSelect: (node: CostCenter) => void;
    selectedId?: string;
}> = ({ node, level, onSelect, selectedId }) => {
    const [expanded, setExpanded] = useState(level < 2);
    const hasChildren = node.children && node.children.length > 0;

    return (
        <Box>
            <ListItem
                button
                onClick={() => onSelect(node)}
                sx={{
                    pl: level * 3,
                    bgcolor: selectedId === node.id ? 'primary.light' : 'transparent',
                    '&:hover': { bgcolor: 'action.hover' },
                    borderRadius: 1,
                    mb: 0.5,
                }}
            >
                <ListItemIcon sx={{ minWidth: 36 }}>
                    {hasChildren ? (
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}>
                            {expanded ? <ExpandLess /> : <ExpandMore />}
                        </IconButton>
                    ) : (
                        <Box sx={{ width: 36 }} />
                    )}
                </ListItemIcon>
                <ListItemIcon sx={{ minWidth: 36 }}>
                    {hasChildren ? (expanded ? <FolderOpenIcon color="primary" /> : <FolderIcon color="primary" />) : <BusinessIcon />}
                </ListItemIcon>
                <ListItemText
                    primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography fontWeight="medium">{node.nameAr}</Typography>
                            <Chip label={node.code} size="small" variant="outlined" />
                        </Box>
                    }
                    secondary={node.description || `المستوى ${node.level}`}
                />
                <ListItemSecondaryAction>
                    <Chip
                        label={node.type === 'OPERATING' ? 'تشغيلي' : node.type === 'PROJECT' ? 'مشروع' : node.type === 'OVERHEAD' ? 'تكاليف عامة' : 'إيراد'}
                        size="small"
                        color={node.type === 'OPERATING' ? 'primary' : node.type === 'PROJECT' ? 'secondary' : 'default'}
                    />
                </ListItemSecondaryAction>
            </ListItem>
            {hasChildren && (
                <Collapse in={expanded}>
                    {Array.isArray(node.children) && node.children.map((child) => (
                        <TreeNode key={child.id} node={child} level={level + 1} onSelect={onSelect} selectedId={selectedId} />
                    ))}
                </Collapse>
            )}
        </Box>
    );
};

// ==================== Main Page Component ====================

const CostCentersPage: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
    const [tree, setTree] = useState<CostCenter[]>([]);
    const [selectedCC, setSelectedCC] = useState<CostCenter | null>(null);
    const [analytics, setAnalytics] = useState<Analytics | null>(null);
    const [dashboard, setDashboard] = useState<DashboardKPIs | null>(null);
    const [activeTab, setActiveTab] = useState(0);

    // Dialog states
    const [dialogOpen, setDialogOpen] = useState(false);
    const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [form, setForm] = useState({
        code: '',
        nameAr: '',
        nameEn: '',
        description: '',
        type: 'OPERATING',
        parentId: '',
        isAllowOverbudget: false,
        departmentId: '',
        maxHeadcount: '' as string | number,
    });

    const [budgetForm, setBudgetForm] = useState({
        year: new Date().getFullYear(),
        month: null as number | null,
        budgetAmount: 0,
        notes: '',
    });

    // Allocations state
    const [allocations, setAllocations] = useState<Allocation[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [allocationDialogOpen, setAllocationDialogOpen] = useState(false);
    const [allocationForm, setAllocationForm] = useState({
        userId: '',
        percentage: 100,
    });

    // New states for additional features
    const [departments, setDepartments] = useState<Department[]>([]);
    const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);

    // Batch 2 states
    const [forecast, setForecast] = useState<any>(null);
    const [incompleteAllocations, setIncompleteAllocations] = useState<any[]>([]);
    const [headcountInfo, setHeadcountInfo] = useState<{ valid: boolean; current: number; max: number | null } | null>(null);
    const [exporting, setExporting] = useState(false);

    // Batch 3 states
    const [trendData, setTrendData] = useState<any>(null);
    const [headcountDistribution, setHeadcountDistribution] = useState<any>(null);
    const [roiData, setRoiData] = useState<any>(null);
    const [importing, setImporting] = useState(false);

    // Batch 4 states
    const [varianceAlerts, setVarianceAlerts] = useState<any>(null);
    const [salaryBreakdown, setSalaryBreakdown] = useState<any>(null);
    const [whatIfResult, setWhatIfResult] = useState<any>(null);
    const [budgetTemplates, setBudgetTemplates] = useState<any[]>([]);

    // Batch 5 states
    const [alertsDashboard, setAlertsDashboard] = useState<any>(null);
    const [transferDialogOpen, setTransferDialogOpen] = useState(false);
    const [amendDialogOpen, setAmendDialogOpen] = useState(false);
    const [transferData, setTransferData] = useState({ fromId: '', toId: '', amount: 0, month: 1, year: 2026, reason: '' });
    const [amendData, setAmendData] = useState({ month: 1, year: 2026, newAmount: 0, reason: '' });
    const [periodComparison, setPeriodComparison] = useState<any>(null);
    const [budgetStatus, setBudgetStatus] = useState<string>('DRAFT');

    // Batch 6 states
    const [costDrivers, setCostDrivers] = useState<any>(null);
    const [budgetVersions, setBudgetVersions] = useState<any>(null);
    const [changeHistory, setChangeHistory] = useState<any>(null);
    const [exportDialogOpen, setExportDialogOpen] = useState(false);
    const [historyDialogOpen, setHistoryDialogOpen] = useState(false);

    // Batch 7 states
    const [performanceScore, setPerformanceScore] = useState<any>(null);
    const [budgetCalendar, setBudgetCalendar] = useState<any>(null);
    const [drillDownData, setDrillDownData] = useState<any>(null);
    const [drillDownLevel, setDrillDownLevel] = useState<'employee' | 'month' | 'category'>('employee');
    const [drillDownDialogOpen, setDrillDownDialogOpen] = useState(false);

    // Batch 8 states
    const [dashboardSummary, setDashboardSummary] = useState<any>(null);
    const [smartAlerts, setSmartAlerts] = useState<any>(null);
    const [multiYearPlan, setMultiYearPlan] = useState<any>(null);
    const [multiYearDialogOpen, setMultiYearDialogOpen] = useState(false);

    // Batch 9 states
    const [scenarioResult, setScenarioResult] = useState<any>(null);
    const [scenarioDialogOpen, setScenarioDialogOpen] = useState(false);
    const [departmentRollup, setDepartmentRollup] = useState<any>(null);

    // Batch 10 states
    const [benchmarkData, setBenchmarkData] = useState<any>(null);
    const [approvalHistory, setApprovalHistory] = useState<any>(null);
    const [expensesSummary, setExpensesSummary] = useState<any>(null);

    // Batch 11 states
    const [forecastTrends, setForecastTrends] = useState<any>(null);
    const [healthRankings, setHealthRankings] = useState<any>(null);
    const [reallocationSuggestions, setReallocationSuggestions] = useState<any>(null);
    const [aiForecast, setAIForecast] = useState<any>(null);
    const [healthScore, setHealthScore] = useState<any>(null);

    // Fetch data
    const fetchData = async () => {
        setLoading(true);
        setError(null);

        // Initialize with empty/null values
        let listData: CostCenter[] = [];
        let treeData: CostCenter[] = [];
        let dashboardData: DashboardKPIs | null = null;

        try {
            // Fetch list
            const listRes = await api.get('/cost-centers');
            if (Array.isArray(listRes)) {
                listData = listRes;
            }
        } catch (e: any) {
            console.error('Failed to fetch cost centers list:', e);
        }

        try {
            // Fetch tree
            const treeRes = await api.get('/cost-centers/tree');
            if (Array.isArray(treeRes)) {
                treeData = treeRes;
            }
        } catch (e: any) {
            console.error('Failed to fetch cost centers tree:', e);
        }

        try {
            // Fetch dashboard
            const dashRes = await api.get('/cost-centers/dashboard');
            // Validate dashboard structure
            if (dashRes && typeof dashRes === 'object' && !Array.isArray(dashRes) &&
                dashRes.summary && dashRes.budget && dashRes.alerts) {
                dashboardData = dashRes as DashboardKPIs;
            }
        } catch (e: any) {
            console.error('Failed to fetch dashboard:', e);
        }

        // Set all states
        setCostCenters(listData);
        setTree(treeData);
        setDashboard(dashboardData);

        // Show error if no data loaded
        if (listData.length === 0 && treeData.length === 0) {
            setError('فشل في تحميل البيانات - تأكد من تسجيل الدخول');
        }

        setLoading(false);
    };

    const fetchAnalytics = async (id: string) => {
        try {
            const res = await api.get(`/cost-centers/${id}/analytics`);
            setAnalytics(res as Analytics);
            // Fetch allocations for selected cost center
            const allocRes = await api.get(`/cost-centers/${id}/allocations`);
            setAllocations(Array.isArray(allocRes) ? allocRes : []);
            // Fetch audit log for selected cost center
            fetchAuditLog(id);
        } catch (err: any) {
            console.error('Failed to fetch analytics:', err);
        }
    };

    const fetchEmployees = async () => {
        try {
            const res = await api.get('/users');
            // API may return {data: [], pagination: {}} or direct array
            if (Array.isArray(res)) {
                setEmployees(res);
            } else if (res && res.data && Array.isArray(res.data)) {
                setEmployees(res.data);
            } else {
                console.error('Employees response format unexpected:', res);
            }
        } catch (err: any) {
            console.error('Failed to fetch employees:', err);
        }
    };

    const fetchDepartments = async () => {
        try {
            const res = await api.get('/branches/departments/all');
            if (Array.isArray(res)) {
                setDepartments(res);
            }
        } catch (err: any) {
            console.error('Failed to fetch departments:', err);
        }
    };

    const fetchAuditLog = async (costCenterId: string) => {
        try {
            const res = await api.get(`/cost-centers/${costCenterId}/audit-log`);
            if (Array.isArray(res)) {
                setAuditLog(res);
            }
        } catch (err: any) {
            console.error('Failed to fetch audit log:', err);
            setAuditLog([]);
        }
    };

    // ==================== Batch 2 Functions ====================

    const fetchForecast = async (costCenterId: string) => {
        try {
            const res = await api.get(`/cost-centers/${costCenterId}/forecast`);
            setForecast(res);
        } catch (err: any) {
            console.error('Failed to fetch forecast:', err);
            setForecast(null);
        }
    };

    const fetchIncompleteAllocations = async () => {
        try {
            const res = await api.get('/cost-centers/incomplete-allocations');
            if (Array.isArray(res)) {
                setIncompleteAllocations(res);
            }
        } catch (err: any) {
            console.error('Failed to fetch incomplete allocations:', err);
        }
    };

    const validateHeadcount = async (costCenterId: string) => {
        try {
            const res = await api.get(`/cost-centers/${costCenterId}/validate-headcount`);
            setHeadcountInfo(res as { valid: boolean; current: number; max: number | null });
            return res;
        } catch (err: any) {
            console.error('Failed to validate headcount:', err);
            return { valid: true, current: 0, max: null };
        }
    };

    const handleExportBudgets = async (costCenterId: string) => {
        setExporting(true);
        try {
            const res = await api.get(`/cost-centers/${costCenterId}/export-budgets`);
            // Create downloadable JSON file
            const dataStr = JSON.stringify(res, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `budget-export-${costCenterId}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (err: any) {
            console.error('Failed to export budgets:', err);
            alert('فشل في تصدير الميزانيات');
        } finally {
            setExporting(false);
        }
    };

    // ==================== Batch 3 Functions ====================

    const fetchTrendData = async (costCenterId: string) => {
        try {
            const res = await api.get(`/cost-centers/${costCenterId}/trend-analysis?months=12`);
            setTrendData(res);
        } catch (err: any) {
            console.error('Failed to fetch trend data:', err);
            setTrendData(null);
        }
    };

    const fetchHeadcountDistribution = async () => {
        try {
            const res = await api.get('/cost-centers/headcount-distribution');
            setHeadcountDistribution(res);
        } catch (err: any) {
            console.error('Failed to fetch headcount distribution:', err);
        }
    };

    const fetchROI = async (costCenterId: string) => {
        try {
            const res = await api.get(`/cost-centers/${costCenterId}/roi`);
            setRoiData(res);
        } catch (err: any) {
            console.error('Failed to fetch ROI:', err);
            setRoiData(null);
        }
    };

    const handleImportBudgets = async (costCenterId: string, budgets: Array<{ month: number; budgetAmount: number; actualAmount?: number }>) => {
        setImporting(true);
        try {
            const res = await api.post(`/cost-centers/${costCenterId}/import-budgets`, { budgets });
            alert(`تم الاستيراد: ${res.created} جديدة، ${res.updated} محدثة`);
            if (selectedCC) fetchAnalytics(selectedCC.id);
        } catch (err: any) {
            console.error('Failed to import budgets:', err);
            alert('فشل في استيراد الميزانيات');
        } finally {
            setImporting(false);
        }
    };

    // ==================== Batch 4 Functions ====================

    const fetchVarianceAlerts = async (costCenterId: string) => {
        try {
            const res = await api.get(`/cost-centers/${costCenterId}/variance-alerts?threshold=10`);
            setVarianceAlerts(res);
        } catch (err: any) {
            console.error('Failed to fetch variance alerts:', err);
            setVarianceAlerts(null);
        }
    };

    const fetchSalaryBreakdown = async (costCenterId: string) => {
        try {
            const res = await api.get(`/cost-centers/${costCenterId}/salary-breakdown`);
            setSalaryBreakdown(res);
        } catch (err: any) {
            console.error('Failed to fetch salary breakdown:', err);
            setSalaryBreakdown(null);
        }
    };

    const runWhatIfAnalysis = async (costCenterId: string, scenario: { salaryIncrease?: number; headcountChange?: number; budgetChange?: number }) => {
        try {
            const res = await api.post(`/cost-centers/${costCenterId}/what-if`, scenario);
            setWhatIfResult(res);
        } catch (err: any) {
            console.error('Failed to run what-if:', err);
            setWhatIfResult(null);
        }
    };

    const fetchBudgetTemplates = async () => {
        try {
            const res = await api.get('/cost-centers/budget-templates');
            setBudgetTemplates(res || []);
        } catch (err: any) {
            console.error('Failed to fetch budget templates:', err);
        }
    };

    // ==================== Batch 5 Functions ====================

    const fetchAlertsDashboard = async () => {
        try {
            const res = await api.get('/cost-centers/alerts-dashboard');
            setAlertsDashboard(res);
        } catch (err: any) {
            console.error('Failed to fetch alerts dashboard:', err);
        }
    };

    const submitBudgetForApproval = async (costCenterId: string, year: number) => {
        try {
            const res = await api.post(`/cost-centers/${costCenterId}/submit-budget`, { year });
            setBudgetStatus('PENDING');
            alert('تم إرسال الميزانية للموافقة');
            return res;
        } catch (err: any) {
            console.error('Failed to submit budget:', err);
            alert('فشل في إرسال الميزانية');
        }
    };

    const approveBudget = async (costCenterId: string, year: number) => {
        try {
            const res = await api.post(`/cost-centers/${costCenterId}/approve-budget`, { year });
            setBudgetStatus('APPROVED');
            alert('تم اعتماد الميزانية');
            return res;
        } catch (err: any) {
            console.error('Failed to approve budget:', err);
            alert('فشل في اعتماد الميزانية');
        }
    };

    const rejectBudget = async (costCenterId: string, year: number, reason: string) => {
        try {
            const res = await api.post(`/cost-centers/${costCenterId}/reject-budget`, { year, reason });
            setBudgetStatus('REJECTED');
            alert('تم رفض الميزانية');
            return res;
        } catch (err: any) {
            console.error('Failed to reject budget:', err);
            alert('فشل في رفض الميزانية');
        }
    };

    const handleTransfer = async () => {
        if (!selectedCC) return;
        try {
            await api.post('/cost-centers/transfer', {
                fromId: selectedCC.id,
                toId: transferData.toId,
                amount: transferData.amount,
                month: transferData.month,
                year: transferData.year,
                reason: transferData.reason,
            });
            setTransferDialogOpen(false);
            alert('تم التحويل بنجاح');
            fetchData();
        } catch (err: any) {
            console.error('Failed to transfer:', err);
            alert('فشل في التحويل');
        }
    };

    const handleAmend = async () => {
        if (!selectedCC) return;
        try {
            await api.post(`/cost-centers/${selectedCC.id}/amend-budget`, amendData);
            setAmendDialogOpen(false);
            alert('تم تعديل الميزانية');
            fetchData();
        } catch (err: any) {
            console.error('Failed to amend:', err);
            alert('فشل في تعديل الميزانية');
        }
    };

    const lockBudget = async (costCenterId: string, year: number, lock: boolean) => {
        try {
            await api.post(`/cost-centers/${costCenterId}/lock-budget`, { year, lock });
            alert(lock ? 'تم قفل الميزانية' : 'تم فتح الميزانية');
        } catch (err: any) {
            console.error('Failed to lock/unlock:', err);
            alert('فشل في تغيير حالة القفل');
        }
    };

    const fetchPeriodComparison = async (costCenterId: string) => {
        try {
            const res = await api.get(`/cost-centers/${costCenterId}/compare-periods?year1=2025&year2=2026`);
            setPeriodComparison(res);
        } catch (err: any) {
            console.error('Failed to fetch period comparison:', err);
            setPeriodComparison(null);
        }
    };

    // ==================== Batch 6 Functions ====================

    const fetchCostDrivers = async (costCenterId: string) => {
        try {
            const res = await api.get(`/cost-centers/${costCenterId}/cost-drivers`);
            setCostDrivers(res);
        } catch (err: any) {
            console.error('Failed to fetch cost drivers:', err);
            setCostDrivers(null);
        }
    };

    const fetchBudgetVersions = async (costCenterId: string) => {
        try {
            const res = await api.get(`/cost-centers/${costCenterId}/budget-versions`);
            setBudgetVersions(res);
        } catch (err: any) {
            console.error('Failed to fetch budget versions:', err);
            setBudgetVersions(null);
        }
    };

    const fetchChangeHistory = async (costCenterId: string) => {
        try {
            const res = await api.get(`/cost-centers/${costCenterId}/change-history?limit=10`);
            setChangeHistory(res);
        } catch (err: any) {
            console.error('Failed to fetch change history:', err);
            setChangeHistory(null);
        }
    };

    const handleExport = async (format: 'json' | 'csv') => {
        try {
            const res = await api.post('/cost-centers/export', { format });
            if (format === 'csv') {
                const blob = new Blob([res.content], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = res.filename;
                a.click();
            } else {
                const blob = new Blob([JSON.stringify(res.content, null, 2)], { type: 'application/json' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = res.filename;
                a.click();
            }
            setExportDialogOpen(false);
            alert('تم تصدير التقرير بنجاح');
        } catch (err: any) {
            console.error('Failed to export:', err);
            alert('فشل في تصدير التقرير');
        }
    };

    // ==================== Batch 7 Functions ====================

    const fetchPerformanceScore = async (costCenterId: string) => {
        try {
            const res = await api.get(`/cost-centers/${costCenterId}/performance-score`);
            setPerformanceScore(res);
        } catch (err: any) {
            console.error('Failed to fetch performance score:', err);
            setPerformanceScore(null);
        }
    };

    const fetchBudgetCalendar = async () => {
        try {
            const res = await api.get('/cost-centers/budget-calendar');
            setBudgetCalendar(res);
        } catch (err: any) {
            console.error('Failed to fetch budget calendar:', err);
            setBudgetCalendar(null);
        }
    };

    const fetchDrillDown = async (costCenterId: string, level: 'employee' | 'month' | 'category') => {
        try {
            const res = await api.get(`/cost-centers/${costCenterId}/drill-down?level=${level}`);
            setDrillDownData(res);
        } catch (err: any) {
            console.error('Failed to fetch drill-down:', err);
            setDrillDownData(null);
        }
    };

    // ==================== Batch 8 Functions ====================

    const fetchDashboardSummary = async () => {
        try {
            const res = await api.get('/cost-centers/dashboard-summary');
            setDashboardSummary(res);
        } catch (err: any) {
            console.error('Failed to fetch dashboard summary:', err);
            setDashboardSummary(null);
        }
    };

    const fetchSmartAlerts = async () => {
        try {
            const res = await api.get('/cost-centers/smart-alerts');
            setSmartAlerts(res);
        } catch (err: any) {
            console.error('Failed to fetch smart alerts:', err);
            setSmartAlerts(null);
        }
    };

    const fetchMultiYearPlan = async (costCenterId: string) => {
        try {
            const res = await api.get(`/cost-centers/${costCenterId}/multi-year-plan?years=2025,2026,2027`);
            setMultiYearPlan(res);
        } catch (err: any) {
            console.error('Failed to fetch multi-year plan:', err);
            setMultiYearPlan(null);
        }
    };

    // ==================== Batch 9 Functions ====================

    const fetchSimulateScenario = async (costCenterId: string, scenarioType: 'OPTIMISTIC' | 'PESSIMISTIC' | 'REALISTIC') => {
        try {
            const res = await api.post(`/cost-centers/${costCenterId}/simulate-scenario`, { type: scenarioType });
            setScenarioResult(res);
        } catch (err: any) {
            console.error('Failed to simulate scenario:', err);
            setScenarioResult(null);
        }
    };

    const fetchDepartmentRollup = async () => {
        try {
            const res = await api.get('/cost-centers/department-rollup');
            setDepartmentRollup(res);
        } catch (err: any) {
            console.error('Failed to fetch department rollup:', err);
            setDepartmentRollup(null);
        }
    };

    // ==================== Batch 10 Functions ====================

    const fetchBenchmarkData = async () => {
        try {
            const res = await api.get('/cost-centers/benchmark');
            setBenchmarkData(res);
        } catch (err: any) {
            console.error('Failed to fetch benchmark data:', err);
            setBenchmarkData(null);
        }
    };

    const fetchApprovalHistory = async (costCenterId: string) => {
        try {
            const res = await api.get(`/cost-centers/${costCenterId}/approval-history`);
            setApprovalHistory(res);
        } catch (err: any) {
            console.error('Failed to fetch approval history:', err);
            setApprovalHistory(null);
        }
    };

    const fetchExpensesSummary = async (costCenterId: string) => {
        try {
            const res = await api.get(`/cost-centers/${costCenterId}/expense-summary`);
            setExpensesSummary(res);
        } catch (err: any) {
            console.error('Failed to fetch expenses summary:', err);
            setExpensesSummary(null);
        }
    };

    // ==================== Batch 11 Functions ====================

    const fetchForecastTrends = async () => {
        try {
            const res = await api.get('/cost-centers/forecast-trends');
            setForecastTrends(res);
        } catch (err: any) {
            console.error('Failed to fetch forecast trends:', err);
            setForecastTrends(null);
        }
    };

    const fetchHealthRankings = async () => {
        try {
            const res = await api.get('/cost-centers/health-rankings');
            setHealthRankings(res);
        } catch (err: any) {
            console.error('Failed to fetch health rankings:', err);
            setHealthRankings(null);
        }
    };

    const fetchReallocationSuggestions = async () => {
        try {
            const res = await api.get('/cost-centers/reallocation-suggestions');
            setReallocationSuggestions(res);
        } catch (err: any) {
            console.error('Failed to fetch reallocation suggestions:', err);
            setReallocationSuggestions(null);
        }
    };

    const fetchAIForecast = async (costCenterId: string) => {
        try {
            const res = await api.get(`/cost-centers/${costCenterId}/forecast-ai`);
            setAIForecast(res);
        } catch (err: any) {
            console.error('Failed to fetch AI forecast:', err);
            setAIForecast(null);
        }
    };

    const fetchHealthScoreData = async (costCenterId: string) => {
        try {
            const res = await api.get(`/cost-centers/${costCenterId}/health-score`);
            setHealthScore(res);
        } catch (err: any) {
            console.error('Failed to fetch health score:', err);
            setHealthScore(null);
        }
    };


    useEffect(() => {
        fetchData();
        fetchEmployees();
        fetchDepartments();
        fetchIncompleteAllocations(); // Batch 2
        fetchHeadcountDistribution(); // Batch 3
        fetchBudgetTemplates(); // Batch 4
        fetchAlertsDashboard(); // Batch 5
        fetchBudgetCalendar(); // Batch 7
        fetchDashboardSummary(); // Batch 8
        fetchSmartAlerts(); // Batch 8
        fetchDepartmentRollup(); // Batch 9
        fetchBenchmarkData(); // Batch 10
        fetchForecastTrends(); // Batch 11
        fetchHealthRankings(); // Batch 11
        fetchReallocationSuggestions(); // Batch 11
    }, []);

    useEffect(() => {
        if (selectedCC) {
            fetchAnalytics(selectedCC.id);
            fetchForecast(selectedCC.id); // Batch 2
            validateHeadcount(selectedCC.id); // Batch 2
            fetchTrendData(selectedCC.id); // Batch 3
            fetchROI(selectedCC.id); // Batch 3
            fetchVarianceAlerts(selectedCC.id); // Batch 4
            fetchSalaryBreakdown(selectedCC.id); // Batch 4
            fetchPeriodComparison(selectedCC.id); // Batch 5
            fetchCostDrivers(selectedCC.id); // Batch 6
            fetchBudgetVersions(selectedCC.id); // Batch 6
            fetchChangeHistory(selectedCC.id); // Batch 6
            fetchPerformanceScore(selectedCC.id); // Batch 7
            fetchDrillDown(selectedCC.id, drillDownLevel); // Batch 7
            fetchMultiYearPlan(selectedCC.id); // Batch 8
        }
    }, [selectedCC, drillDownLevel]);

    // Handlers
    const handleOpenDialog = (cc?: CostCenter) => {
        if (cc) {
            setForm({
                code: cc.code,
                nameAr: cc.nameAr,
                nameEn: cc.nameEn || '',
                description: cc.description || '',
                type: cc.type,
                parentId: cc.parentId || '',
                isAllowOverbudget: cc.isAllowOverbudget,
            });
            setSelectedCC(cc);
        } else {
            setForm({
                code: '',
                nameAr: '',
                nameEn: '',
                description: '',
                type: 'OPERATING',
                parentId: selectedCC?.id || '',
                isAllowOverbudget: false,
            });
        }
        setDialogOpen(true);
    };

    const handleSubmit = async () => {
        setSaving(true);
        setError(null);
        try {
            if (selectedCC && dialogOpen) {
                await api.patch(`/cost-centers/${selectedCC.id}`, form);
            } else {
                const data = { ...form };
                if (!data.parentId) delete (data as any).parentId;
                await api.post('/cost-centers', data);
            }
            setDialogOpen(false);
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'فشل في الحفظ');
        } finally {
            setSaving(false);
        }
    };

    const handleArchive = async (id: string) => {
        if (!confirm('هل أنت متأكد من أرشفة مركز التكلفة؟')) return;
        try {
            await api.delete(`/cost-centers/${id}`);
            fetchData();
            if (selectedCC?.id === id) setSelectedCC(null);
        } catch (err: any) {
            setError(err.response?.data?.message || 'فشل في الأرشفة');
        }
    };

    const handleSubmitBudget = async () => {
        if (!selectedCC) return;
        setSaving(true);
        try {
            await api.post(`/cost-centers/${selectedCC.id}/budgets`, budgetForm);
            setBudgetDialogOpen(false);
            fetchAnalytics(selectedCC.id);
        } catch (err: any) {
            setError(err.response?.data?.message || 'فشل في إضافة الميزانية');
        } finally {
            setSaving(false);
        }
    };

    // Render
    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box>
                    <Typography variant="h4" fontWeight="bold">
                        <TreeIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                        مراكز التكلفة
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        إدارة الهيكل الهرمي لمراكز التكلفة والميزانيات
                    </Typography>
                </Box>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
                    إضافة مركز تكلفة
                </Button>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {/* Dashboard KPIs */}
            {dashboard && (
                <Box mb={3}>
                    <Grid container spacing={2}>
                        <Grid item xs={6} sm={3} md={2}>
                            <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
                                <CardContent sx={{ py: 1.5 }}>
                                    <Typography variant="caption">مراكز التكلفة</Typography>
                                    <Typography variant="h4">{dashboard.summary.activeCostCenters}</Typography>
                                    <Typography variant="caption">نشط من {dashboard.summary.totalCostCenters}</Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={6} sm={3} md={2}>
                            <Card sx={{ bgcolor: 'info.main', color: 'white' }}>
                                <CardContent sx={{ py: 1.5 }}>
                                    <Typography variant="caption">الموظفين</Typography>
                                    <Typography variant="h4">{dashboard.summary.totalHeadcount}</Typography>
                                    <Typography variant="caption">إجمالي الموزعين</Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={6} sm={3} md={2}>
                            <Card sx={{ bgcolor: dashboard.budget.overallUtilization > 100 ? 'error.main' : dashboard.budget.overallUtilization > 80 ? 'warning.main' : 'success.main', color: 'white' }}>
                                <CardContent sx={{ py: 1.5 }}>
                                    <Typography variant="caption">استخدام الميزانية</Typography>
                                    <Typography variant="h4">{dashboard.budget.overallUtilization}%</Typography>
                                    <Typography variant="caption">{dashboard.budget.totalActual.toLocaleString()} / {dashboard.budget.totalBudget.toLocaleString()}</Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={6} sm={3} md={2}>
                            <Card sx={{ bgcolor: dashboard.alerts.criticalCount > 0 ? 'error.main' : dashboard.alerts.highCount > 0 ? 'warning.main' : 'grey.600', color: 'white' }}>
                                <CardContent sx={{ py: 1.5 }}>
                                    <Typography variant="caption">التنبيهات</Typography>
                                    <Typography variant="h4">{dashboard.alerts.criticalCount + dashboard.alerts.highCount + dashboard.alerts.warningCount}</Typography>
                                    <Typography variant="caption">{dashboard.alerts.criticalCount} حرج, {dashboard.alerts.highCount} عالي</Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={6} sm={3} md={2}>
                            <Card sx={{ bgcolor: 'secondary.main', color: 'white' }}>
                                <CardContent sx={{ py: 1.5 }}>
                                    <Typography variant="caption">التكلفة/موظف</Typography>
                                    <Typography variant="h4">{dashboard.costPerHead.toLocaleString()}</Typography>
                                    <Typography variant="caption">ريال/موظف</Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>

                    {/* Budget Alerts Banner */}
                    {dashboard.alerts && Array.isArray(dashboard.alerts.topAlerts) && dashboard.alerts.topAlerts.length > 0 && (
                        <Alert
                            severity={dashboard.alerts.criticalCount > 0 ? 'error' : 'warning'}
                            sx={{ mt: 2 }}
                        >
                            <Typography variant="subtitle2" fontWeight="bold">
                                تنبيهات الميزانية ({dashboard.alerts.centersOverBudget} مركز تجاوز الميزانية)
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                                {dashboard.alerts.topAlerts.slice(0, 3).map((alert: any, i: number) => (
                                    <Chip
                                        key={i}
                                        label={`${alert.costCenterName}: ${alert.utilizationPercent}%`}
                                        color={alert.severity === 'CRITICAL' ? 'error' : alert.severity === 'HIGH' ? 'warning' : 'default'}
                                        size="small"
                                    />
                                ))}
                            </Box>
                        </Alert>
                    )}
                </Box>
            )}

            <Grid container spacing={3}>
                {/* Tree View */}
                <Grid item xs={12} md={5}>
                    <Paper sx={{ p: 2, minHeight: 500 }}>
                        <Typography variant="h6" gutterBottom>
                            الهيكل الهرمي
                        </Typography>
                        {!Array.isArray(tree) || tree.length === 0 ? (
                            <Box textAlign="center" py={4}>
                                <Typography color="text.secondary">لا توجد مراكز تكلفة</Typography>
                                <Button startIcon={<AddIcon />} onClick={() => handleOpenDialog()} sx={{ mt: 2 }}>
                                    إنشاء أول مركز
                                </Button>
                            </Box>
                        ) : (
                            <List>
                                {tree.map((node) => (
                                    <TreeNode
                                        key={node.id}
                                        node={node}
                                        level={0}
                                        onSelect={(node) => setSelectedCC(node)}
                                        selectedId={selectedCC?.id}
                                    />
                                ))}
                            </List>
                        )}
                    </Paper>
                </Grid>

                {/* Details Panel */}
                <Grid item xs={12} md={7}>
                    {selectedCC ? (
                        <Paper sx={{ p: 2 }}>
                            {/* Header */}
                            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                                <Box>
                                    <Typography variant="h5" fontWeight="bold">
                                        {selectedCC.nameAr}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {selectedCC.code} • {selectedCC.path}
                                    </Typography>
                                </Box>
                                <Box>
                                    <IconButton onClick={() => handleOpenDialog(selectedCC)}>
                                        <EditIcon />
                                    </IconButton>
                                    <IconButton color="error" onClick={() => handleArchive(selectedCC.id)}>
                                        <ArchiveIcon />
                                    </IconButton>
                                </Box>
                            </Box>

                            {/* Summary Cards */}
                            {analytics && (
                                <Grid container spacing={2} mb={3}>
                                    <Grid item xs={6} sm={3}>
                                        <Card variant="outlined">
                                            <CardContent>
                                                <Typography variant="caption" color="text.secondary">الموظفين</Typography>
                                                <Typography variant="h4">{analytics.summary.directEmployees}</Typography>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                    <Grid item xs={6} sm={3}>
                                        <Card variant="outlined">
                                            <CardContent>
                                                <Typography variant="caption" color="text.secondary">التوزيعات</Typography>
                                                <Typography variant="h4">{analytics.summary.allocationsCount}</Typography>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                    <Grid item xs={6} sm={3}>
                                        <Card variant="outlined">
                                            <CardContent>
                                                <Typography variant="caption" color="text.secondary">نسب التوزيع</Typography>
                                                <Typography variant="h4">{analytics.summary.totalAllocationPercentage}%</Typography>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                    <Grid item xs={6} sm={3}>
                                        <Card variant="outlined">
                                            <CardContent>
                                                <Typography variant="caption" color="text.secondary">الاستخدام</Typography>
                                                <Typography variant="h4" color={analytics.budget.utilizationRate > 100 ? 'error' : 'success'}>
                                                    {analytics.budget.utilizationRate}%
                                                </Typography>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                </Grid>
                            )}

                            {/* Tabs */}
                            <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2 }}>
                                <Tab label="الميزانية" icon={<BudgetIcon />} iconPosition="start" />
                                <Tab label="التوزيعات" icon={<AllocationIcon />} iconPosition="start" />
                                <Tab label="سجل التدقيق" icon={<HistoryIcon />} iconPosition="start" />
                            </Tabs>

                            {/* Budget Tab */}
                            {activeTab === 0 && analytics && (
                                <Box>
                                    <Box display="flex" justifyContent="space-between" mb={2}>
                                        <Typography variant="h6">الميزانية</Typography>
                                        <Box>
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                onClick={() => selectedCC && handleExportBudgets(selectedCC.id)}
                                                disabled={exporting}
                                                sx={{ mr: 1 }}
                                            >
                                                {exporting ? 'جاري التصدير...' : '📥 تصدير'}
                                            </Button>
                                            <Button size="small" startIcon={<AddIcon />} onClick={() => setBudgetDialogOpen(true)}>
                                                إضافة ميزانية
                                            </Button>
                                        </Box>
                                    </Box>

                                    {/* Budget Summary */}
                                    <Grid container spacing={2} mb={3}>
                                        <Grid item xs={4}>
                                            <Box textAlign="center" p={2} bgcolor="success.light" borderRadius={2}>
                                                <Typography variant="caption">الميزانية</Typography>
                                                <Typography variant="h5">{analytics.budget.totalBudget.toLocaleString()}</Typography>
                                            </Box>
                                        </Grid>
                                        <Grid item xs={4}>
                                            <Box textAlign="center" p={2} bgcolor="info.light" borderRadius={2}>
                                                <Typography variant="caption">الفعلي</Typography>
                                                <Typography variant="h5">{analytics.budget.totalActual.toLocaleString()}</Typography>
                                            </Box>
                                        </Grid>
                                        <Grid item xs={4}>
                                            <Box textAlign="center" p={2} bgcolor={analytics.budget.totalVariance >= 0 ? 'success.light' : 'error.light'} borderRadius={2}>
                                                <Typography variant="caption">التباين</Typography>
                                                <Typography variant="h5">
                                                    {analytics.budget.totalVariance >= 0 ? <TrendingUpIcon sx={{ fontSize: 16 }} /> : <TrendingDownIcon sx={{ fontSize: 16 }} />}
                                                    {Math.abs(analytics.budget.totalVariance).toLocaleString()}
                                                </Typography>
                                            </Box>
                                        </Grid>
                                    </Grid>

                                    {/* Utilization Bar */}
                                    <Box mb={2}>
                                        <Typography variant="body2" gutterBottom>نسبة الاستخدام</Typography>
                                        <LinearProgress
                                            variant="determinate"
                                            value={Math.min(analytics.budget.utilizationRate, 100)}
                                            color={analytics.budget.utilizationRate > 100 ? 'error' : analytics.budget.utilizationRate > 80 ? 'warning' : 'success'}
                                            sx={{ height: 10, borderRadius: 5 }}
                                        />
                                    </Box>

                                    {/* Batch 2: Forecast Section */}
                                    {forecast && (
                                        <Box mt={3} p={2} bgcolor="grey.100" borderRadius={2}>
                                            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                                                📈 توقعات الميزانية
                                            </Typography>
                                            <Grid container spacing={2}>
                                                <Grid item xs={6}>
                                                    <Typography variant="body2" color="text.secondary">متوسط الشهر</Typography>
                                                    <Typography variant="h6">{forecast.monthlyAverage?.toLocaleString()} ريال</Typography>
                                                </Grid>
                                                <Grid item xs={6}>
                                                    <Typography variant="body2" color="text.secondary">المتوقع للسنة</Typography>
                                                    <Typography variant="h6">{forecast.forecastedTotal?.toLocaleString()} ريال</Typography>
                                                </Grid>
                                                <Grid item xs={6}>
                                                    <Typography variant="body2" color="text.secondary">معدل النمو</Typography>
                                                    <Typography variant="h6" color={forecast.growthRate > 0 ? 'success.main' : 'error.main'}>
                                                        {forecast.growthRate > 0 ? '+' : ''}{forecast.growthRate}%
                                                    </Typography>
                                                </Grid>
                                                <Grid item xs={6}>
                                                    <Typography variant="body2" color="text.secondary">الأشهر المتبقية</Typography>
                                                    <Typography variant="h6">{forecast.remainingMonths} شهر</Typography>
                                                </Grid>
                                            </Grid>
                                        </Box>
                                    )}

                                    {/* Batch 3: ROI Section */}
                                    {roiData && (
                                        <Box mt={3} p={2} bgcolor="primary.light" borderRadius={2}>
                                            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                                                💰 تقرير الكفاءة (ROI)
                                            </Typography>
                                            <Grid container spacing={2}>
                                                <Grid item xs={4}>
                                                    <Typography variant="body2" color="text.secondary">الكفاءة</Typography>
                                                    <Typography variant="h6" color={roiData.rating === 'EXCELLENT' ? 'success.main' : roiData.rating === 'POOR' ? 'error.main' : 'warning.main'}>
                                                        {roiData.metrics?.efficiency}%
                                                    </Typography>
                                                </Grid>
                                                <Grid item xs={4}>
                                                    <Typography variant="body2" color="text.secondary">الوفورات</Typography>
                                                    <Typography variant="h6" color={roiData.metrics?.savings >= 0 ? 'success.main' : 'error.main'}>
                                                        {roiData.metrics?.savings?.toLocaleString()} ريال
                                                    </Typography>
                                                </Grid>
                                                <Grid item xs={4}>
                                                    <Typography variant="body2" color="text.secondary">التقييم</Typography>
                                                    <Typography variant="h6">
                                                        {roiData.rating === 'EXCELLENT' ? '⭐ ممتاز' : roiData.rating === 'GOOD' ? '✅ جيد' : roiData.rating === 'FAIR' ? '⚠️ متوسط' : '❌ ضعيف'}
                                                    </Typography>
                                                </Grid>
                                            </Grid>
                                        </Box>
                                    )}

                                    {/* Batch 3: Trend Analysis */}
                                    {trendData && trendData.monthlyTrend && trendData.monthlyTrend.length > 0 && (
                                        <Box mt={3} p={2} bgcolor="grey.50" borderRadius={2}>
                                            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                                                📊 تحليل الاتجاهات ({trendData.periodMonths} شهر)
                                            </Typography>
                                            <Box display="flex" alignItems="center" gap={2} mb={2}>
                                                <Chip
                                                    label={trendData.trend === 'INCREASING' ? '📈 صاعد' : trendData.trend === 'DECREASING' ? '📉 نازل' : '➡️ مستقر'}
                                                    color={trendData.trend === 'INCREASING' ? 'error' : trendData.trend === 'DECREASING' ? 'success' : 'default'}
                                                />
                                                <Typography variant="body2">
                                                    إجمالي الفعلي: {trendData.summary?.totalActual?.toLocaleString()} ريال
                                                </Typography>
                                            </Box>
                                            <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                                                <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                                                    <thead>
                                                        <tr style={{ borderBottom: '1px solid #ddd' }}>
                                                            <th style={{ padding: '8px', textAlign: 'right' }}>الفترة</th>
                                                            <th style={{ padding: '8px', textAlign: 'right' }}>الميزانية</th>
                                                            <th style={{ padding: '8px', textAlign: 'right' }}>الفعلي</th>
                                                            <th style={{ padding: '8px', textAlign: 'right' }}>%</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {trendData.monthlyTrend.map((m: any) => (
                                                            <tr key={m.period} style={{ borderBottom: '1px solid #eee' }}>
                                                                <td style={{ padding: '6px' }}>{m.period}</td>
                                                                <td style={{ padding: '6px' }}>{m.budget.toLocaleString()}</td>
                                                                <td style={{ padding: '6px' }}>{m.actual.toLocaleString()}</td>
                                                                <td style={{ padding: '6px', color: m.utilizationPercent > 100 ? 'red' : 'green' }}>
                                                                    {m.utilizationPercent}%
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </Box>
                                        </Box>
                                    )}

                                    {/* Batch 4: Variance Alerts */}
                                    {varianceAlerts && varianceAlerts.totalAlerts > 0 && Array.isArray(varianceAlerts.alerts) && (
                                        <Box mt={3} p={2} bgcolor="error.light" borderRadius={2}>
                                            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                                                ⚠️ تنبيهات الانحراف ({varianceAlerts.totalAlerts})
                                            </Typography>
                                            {varianceAlerts.alerts.slice(0, 3).map((alert: any, idx: number) => (
                                                <Alert key={idx} severity={alert.severity === 'HIGH' ? 'error' : alert.severity === 'MEDIUM' ? 'warning' : 'info'} sx={{ mb: 1 }}>
                                                    {alert.message}
                                                </Alert>
                                            ))}
                                        </Box>
                                    )}

                                    {/* Batch 4: Salary Breakdown */}
                                    {salaryBreakdown && salaryBreakdown.totalEmployees > 0 && (
                                        <Box mt={3} p={2} bgcolor="info.light" borderRadius={2}>
                                            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                                                💼 تفصيل الرواتب ({salaryBreakdown.totalEmployees} موظف)
                                            </Typography>
                                            <Grid container spacing={2}>
                                                <Grid item xs={4}>
                                                    <Typography variant="body2" color="text.secondary">الشهري</Typography>
                                                    <Typography variant="h6">{salaryBreakdown.totalMonthlySalary?.toLocaleString()} ريال</Typography>
                                                </Grid>
                                                <Grid item xs={4}>
                                                    <Typography variant="body2" color="text.secondary">السنوي</Typography>
                                                    <Typography variant="h6">{salaryBreakdown.totalAnnualSalary?.toLocaleString()} ريال</Typography>
                                                </Grid>
                                                <Grid item xs={4}>
                                                    <Typography variant="body2" color="text.secondary">حسب الوظيفة</Typography>
                                                    {salaryBreakdown.byJobTitle?.slice(0, 3).map((j: any, idx: number) => (
                                                        <Typography key={idx} variant="caption" display="block">
                                                            {j.title}: {j.percentage}%
                                                        </Typography>
                                                    ))}
                                                </Grid>
                                            </Grid>
                                        </Box>
                                    )}

                                    {/* Batch 5: Period Comparison */}
                                    {periodComparison && (
                                        <Box mt={3} p={2} bgcolor="grey.100" borderRadius={2}>
                                            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                                                📊 مقارنة الفترات ({periodComparison.period1?.year} vs {periodComparison.period2?.year})
                                            </Typography>
                                            <Grid container spacing={2}>
                                                <Grid item xs={4}>
                                                    <Typography variant="body2" color="text.secondary">{periodComparison.period1?.year}</Typography>
                                                    <Typography variant="h6">{periodComparison.period1?.total?.toLocaleString()} ريال</Typography>
                                                </Grid>
                                                <Grid item xs={4}>
                                                    <Typography variant="body2" color="text.secondary">{periodComparison.period2?.year}</Typography>
                                                    <Typography variant="h6">{periodComparison.period2?.total?.toLocaleString()} ريال</Typography>
                                                </Grid>
                                                <Grid item xs={4}>
                                                    <Typography variant="body2" color="text.secondary">التغير</Typography>
                                                    <Typography
                                                        variant="h6"
                                                        color={periodComparison.change?.direction === 'INCREASE' ? 'error.main' : 'success.main'}
                                                    >
                                                        {periodComparison.change?.direction === 'INCREASE' ? '📈' : periodComparison.change?.direction === 'DECREASE' ? '📉' : '➡️'}
                                                        {periodComparison.change?.percent}%
                                                    </Typography>
                                                </Grid>
                                            </Grid>
                                        </Box>
                                    )}

                                    {/* Batch 5: Budget Actions */}
                                    <Box mt={3} p={2} bgcolor="primary.50" borderRadius={2} sx={{ border: '1px solid', borderColor: 'primary.light' }}>
                                        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                                            ⚙️ إجراءات الميزانية
                                        </Typography>
                                        <Box display="flex" gap={1} flexWrap="wrap">
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                color="primary"
                                                onClick={() => selectedCC && submitBudgetForApproval(selectedCC.id, 2026)}
                                            >
                                                📤 إرسال للموافقة
                                            </Button>
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                color="success"
                                                onClick={() => selectedCC && approveBudget(selectedCC.id, 2026)}
                                            >
                                                ✅ اعتماد
                                            </Button>
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                color="error"
                                                onClick={() => selectedCC && rejectBudget(selectedCC.id, 2026, 'مرفوض')}
                                            >
                                                ❌ رفض
                                            </Button>
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                onClick={() => setTransferDialogOpen(true)}
                                            >
                                                🔄 تحويل
                                            </Button>
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                onClick={() => setAmendDialogOpen(true)}
                                            >
                                                ✏️ تعديل
                                            </Button>
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                color="warning"
                                                onClick={() => selectedCC && lockBudget(selectedCC.id, 2026, true)}
                                            >
                                                🔒 قفل
                                            </Button>
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                color="info"
                                                onClick={() => setHistoryDialogOpen(true)}
                                            >
                                                📜 السجل
                                            </Button>
                                            <Button
                                                size="small"
                                                variant="contained"
                                                color="secondary"
                                                onClick={() => setExportDialogOpen(true)}
                                            >
                                                📥 تصدير
                                            </Button>
                                        </Box>
                                    </Box>

                                    {/* Batch 6: Cost Drivers */}
                                    {costDrivers && (
                                        <Box mt={3} p={2} bgcolor="warning.50" borderRadius={2} sx={{ border: '1px solid', borderColor: 'warning.light' }}>
                                            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                                                ⚡ محركات التكلفة
                                            </Typography>
                                            <Grid container spacing={2}>
                                                {costDrivers.drivers?.map((driver: any, idx: number) => (
                                                    <Grid item xs={3} key={idx}>
                                                        <Typography variant="body2" color="text.secondary">{driver.name}</Typography>
                                                        <Typography variant="h6">
                                                            {typeof driver.value === 'number' ? driver.value.toLocaleString() : driver.value}
                                                        </Typography>
                                                    </Grid>
                                                ))}
                                            </Grid>
                                            {costDrivers.summary && (
                                                <Box mt={2} pt={1} borderTop="1px dashed grey">
                                                    <Typography variant="caption">
                                                        المحرك الرئيسي: <strong>{costDrivers.summary.topDriver}</strong> |
                                                        تكلفة الموظف: <strong>{costDrivers.summary.costPerEmployee?.toLocaleString()} ريال</strong>
                                                    </Typography>
                                                </Box>
                                            )}
                                        </Box>
                                    )}

                                    {/* Batch 6: Budget Versions */}
                                    {budgetVersions && budgetVersions.versions?.length > 0 && (
                                        <Box mt={3} p={2} bgcolor="info.50" borderRadius={2} sx={{ border: '1px solid', borderColor: 'info.light' }}>
                                            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                                                📋 إصدارات الميزانية (v{budgetVersions.currentVersion})
                                            </Typography>
                                            <List dense>
                                                {budgetVersions.versions.slice(0, 3).map((v: any, idx: number) => (
                                                    <ListItem key={idx}>
                                                        <ListItemIcon><HistoryIcon fontSize="small" /></ListItemIcon>
                                                        <ListItemText
                                                            primary={`v${v.version} - ${v.action}`}
                                                            secondary={v.description}
                                                        />
                                                    </ListItem>
                                                ))}
                                            </List>
                                        </Box>
                                    )}
                                </Box>
                            )}

                            {/* Allocations Tab */}
                            {activeTab === 1 && (
                                <Box>
                                    <Box display="flex" justifyContent="space-between" mb={2}>
                                        <Box>
                                            <Typography variant="h6">التوزيعات</Typography>
                                            {headcountInfo && headcountInfo.max && (
                                                <Typography variant="caption" color={headcountInfo.valid ? 'text.secondary' : 'error'}>
                                                    👥 الموظفون: {headcountInfo.current}/{headcountInfo.max}
                                                    {!headcountInfo.valid && ' (تم الوصول للحد الأقصى!)'}
                                                </Typography>
                                            )}
                                        </Box>
                                        <Button
                                            size="small"
                                            startIcon={<AddIcon />}
                                            onClick={() => {
                                                setAllocationForm({ userId: '', percentage: 100 });
                                                setAllocationDialogOpen(true);
                                            }}
                                            disabled={headcountInfo ? !headcountInfo.valid : false}
                                        >
                                            إضافة توزيع
                                        </Button>
                                    </Box>

                                    {/* Batch 2: Headcount Warning */}
                                    {headcountInfo && !headcountInfo.valid && (
                                        <Alert severity="warning" sx={{ mb: 2 }}>
                                            ⚠️ تم الوصول للحد الأقصى من الموظفين ({headcountInfo.current}/{headcountInfo.max}). لا يمكن إضافة توزيعات جديدة.
                                        </Alert>
                                    )}

                                    {allocations.length === 0 ? (
                                        <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
                                            لا توجد توزيعات لهذا المركز
                                        </Typography>
                                    ) : (
                                        <List>
                                            {Array.isArray(allocations) && allocations.map((alloc) => (
                                                <ListItem
                                                    key={alloc.id}
                                                    sx={{ bgcolor: 'background.paper', mb: 1, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}
                                                >
                                                    <ListItemIcon>
                                                        <Avatar sx={{ width: 36, height: 36 }}>
                                                            {alloc.user?.firstName?.[0] || 'U'}
                                                        </Avatar>
                                                    </ListItemIcon>
                                                    <ListItemText
                                                        primary={`${alloc.user?.firstName || ''} ${alloc.user?.lastName || ''}`}
                                                        secondary={`${alloc.percentage}% - منذ ${new Date(alloc.effectiveFrom).toLocaleDateString('ar-SA')}`}
                                                    />
                                                    <ListItemSecondaryAction>
                                                        <Chip
                                                            label={`${alloc.percentage}%`}
                                                            color="primary"
                                                            size="small"
                                                            sx={{ mr: 1 }}
                                                        />
                                                        <IconButton
                                                            edge="end"
                                                            size="small"
                                                            color="error"
                                                            onClick={async () => {
                                                                try {
                                                                    await api.delete(`/cost-centers/allocations/${alloc.id}`);
                                                                    if (selectedCC) fetchAnalytics(selectedCC.id);
                                                                } catch (err: any) {
                                                                    setError(err.message || 'فشل في الحذف');
                                                                }
                                                            }}
                                                        >
                                                            <ArchiveIcon fontSize="small" />
                                                        </IconButton>
                                                    </ListItemSecondaryAction>
                                                </ListItem>
                                            ))}
                                        </List>
                                    )}
                                </Box>
                            )}

                            {/* Audit Log Tab */}
                            {activeTab === 2 && (
                                <Box>
                                    <Typography variant="h6" mb={2}>سجل التدقيق</Typography>
                                    {!Array.isArray(auditLog) || auditLog.length === 0 ? (
                                        <Typography color="text.secondary" textAlign="center" py={4}>
                                            لا توجد عمليات مسجلة بعد
                                        </Typography>
                                    ) : (
                                        <List>
                                            {auditLog.map((entry) => (
                                                <ListItem key={entry.id} sx={{ bgcolor: 'background.paper', mb: 1, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                                                    <ListItemText
                                                        primary={
                                                            <Box display="flex" alignItems="center" gap={1}>
                                                                <Chip
                                                                    label={entry.action}
                                                                    size="small"
                                                                    color={
                                                                        entry.action === 'CREATE' ? 'success' :
                                                                            entry.action === 'UPDATE' ? 'info' :
                                                                                entry.action === 'DELETE' || entry.action === 'ARCHIVE' ? 'error' : 'default'
                                                                    }
                                                                />
                                                                <Typography variant="body2">{entry.description || '-'}</Typography>
                                                            </Box>
                                                        }
                                                        secondary={
                                                            <Box display="flex" justifyContent="space-between" mt={1}>
                                                                <Typography variant="caption" color="text.secondary">
                                                                    {entry.user ? `${entry.user.firstName} ${entry.user.lastName}` : 'النظام'}
                                                                </Typography>
                                                                <Typography variant="caption" color="text.secondary">
                                                                    {new Date(entry.createdAt).toLocaleString('ar-SA')}
                                                                </Typography>
                                                            </Box>
                                                        }
                                                    />
                                                </ListItem>
                                            ))}
                                        </List>
                                    )}
                                </Box>
                            )}
                        </Paper>
                    ) : (
                        <Paper sx={{ p: 4, textAlign: 'center', minHeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Box>
                                <TreeIcon sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
                                <Typography variant="h6" color="text.secondary">
                                    اختر مركز تكلفة لعرض التفاصيل
                                </Typography>
                            </Box>
                        </Paper>
                    )}
                </Grid>
            </Grid>

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{selectedCC ? 'تعديل مركز تكلفة' : 'إضافة مركز تكلفة جديد'}</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={6}>
                            <TextField
                                fullWidth
                                label="الكود"
                                value={form.code}
                                onChange={(e) => setForm({ ...form, code: e.target.value })}
                                placeholder="CC-001"
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <FormControl fullWidth>
                                <InputLabel>النوع</InputLabel>
                                <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} label="النوع">
                                    <MenuItem value="OPERATING">تشغيلي</MenuItem>
                                    <MenuItem value="PROJECT">مشروع</MenuItem>
                                    <MenuItem value="OVERHEAD">تكاليف عامة</MenuItem>
                                    <MenuItem value="REVENUE">مركز إيراد</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="الاسم بالعربية"
                                value={form.nameAr}
                                onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
                                required
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="الاسم بالإنجليزية"
                                value={form.nameEn}
                                onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <FormControl fullWidth>
                                <InputLabel>مركز التكلفة الأب</InputLabel>
                                <Select
                                    value={form.parentId}
                                    onChange={(e) => setForm({ ...form, parentId: e.target.value })}
                                    label="مركز التكلفة الأب"
                                >
                                    <MenuItem value="">بدون (مستوى أول)</MenuItem>
                                    {Array.isArray(costCenters) && costCenters.filter((cc) => cc.id !== selectedCC?.id).map((cc) => (
                                        <MenuItem key={cc.id} value={cc.id}>
                                            {cc.path || cc.code} - {cc.nameAr}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={6}>
                            <FormControl fullWidth>
                                <InputLabel>القسم</InputLabel>
                                <Select
                                    value={form.departmentId}
                                    onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                                    label="القسم"
                                >
                                    <MenuItem value="">بدون قسم</MenuItem>
                                    {Array.isArray(departments) && departments.map((dept) => (
                                        <MenuItem key={dept.id} value={dept.id}>
                                            {dept.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                fullWidth
                                type="number"
                                label="الحد الأقصى للموظفين"
                                value={form.maxHeadcount}
                                onChange={(e) => setForm({ ...form, maxHeadcount: e.target.value ? parseInt(e.target.value) : '' })}
                                placeholder="مثال: 50"
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="الوصف"
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                multiline
                                rows={2}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={form.isAllowOverbudget}
                                        onChange={(e) => setForm({ ...form, isAllowOverbudget: e.target.checked })}
                                    />
                                }
                                label="السماح بتجاوز الميزانية"
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
                    <Button variant="contained" onClick={handleSubmit} disabled={saving || !form.code || !form.nameAr}>
                        {saving ? <CircularProgress size={20} /> : 'حفظ'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Budget Dialog */}
            <Dialog open={budgetDialogOpen} onClose={() => setBudgetDialogOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>إضافة ميزانية</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={6}>
                            <TextField
                                fullWidth
                                type="number"
                                label="السنة"
                                value={budgetForm.year}
                                onChange={(e) => setBudgetForm({ ...budgetForm, year: parseInt(e.target.value) })}
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <FormControl fullWidth>
                                <InputLabel>الشهر</InputLabel>
                                <Select
                                    value={budgetForm.month || ''}
                                    onChange={(e) => setBudgetForm({ ...budgetForm, month: e.target.value ? parseInt(e.target.value as string) : null })}
                                    label="الشهر"
                                >
                                    <MenuItem value="">سنوي</MenuItem>
                                    {[...Array(12)].map((_, i) => (
                                        <MenuItem key={i + 1} value={i + 1}>{i + 1}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                type="number"
                                label="مبلغ الميزانية"
                                value={budgetForm.budgetAmount}
                                onChange={(e) => setBudgetForm({ ...budgetForm, budgetAmount: parseFloat(e.target.value) })}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="ملاحظات"
                                value={budgetForm.notes}
                                onChange={(e) => setBudgetForm({ ...budgetForm, notes: e.target.value })}
                                multiline
                                rows={2}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setBudgetDialogOpen(false)}>إلغاء</Button>
                    <Button variant="contained" onClick={handleSubmitBudget} disabled={saving || budgetForm.budgetAmount <= 0}>
                        {saving ? <CircularProgress size={20} /> : 'حفظ'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Allocation Dialog */}
            <Dialog open={allocationDialogOpen} onClose={() => setAllocationDialogOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>إضافة توزيع جديد</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12}>
                            <FormControl fullWidth>
                                <InputLabel>الموظف</InputLabel>
                                <Select
                                    value={allocationForm.userId}
                                    onChange={(e) => setAllocationForm({ ...allocationForm, userId: e.target.value })}
                                    label="الموظف"
                                >
                                    {Array.isArray(employees) && employees.map((emp) => (
                                        <MenuItem key={emp.id} value={emp.id}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>
                                                    {emp.firstName?.[0]}
                                                </Avatar>
                                                {emp.firstName} {emp.lastName}
                                            </Box>
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                type="number"
                                label="النسبة المئوية"
                                value={allocationForm.percentage}
                                onChange={(e) => setAllocationForm({ ...allocationForm, percentage: parseFloat(e.target.value) })}
                                inputProps={{ min: 0, max: 100, step: 0.01 }}
                                InputProps={{ endAdornment: <Typography>%</Typography> }}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAllocationDialogOpen(false)}>إلغاء</Button>
                    <Button
                        variant="contained"
                        disabled={saving || !allocationForm.userId || allocationForm.percentage <= 0}
                        onClick={async () => {
                            if (!selectedCC) return;
                            setSaving(true);
                            try {
                                await api.post(`/cost-centers/${selectedCC.id}/allocations`, allocationForm);
                                setAllocationDialogOpen(false);
                                fetchAnalytics(selectedCC.id);
                            } catch (err: any) {
                                setError(err.message || 'فشل في إضافة التوزيع');
                            } finally {
                                setSaving(false);
                            }
                        }}
                    >
                        {saving ? <CircularProgress size={20} /> : 'حفظ'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Batch 5: Transfer Dialog */}
            <Dialog open={transferDialogOpen} onClose={() => setTransferDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>🔄 تحويل ميزانية</DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <FormControl fullWidth>
                            <InputLabel>إلى مركز تكلفة</InputLabel>
                            <Select
                                value={transferData.toId}
                                label="إلى مركز تكلفة"
                                onChange={(e) => setTransferData({ ...transferData, toId: e.target.value })}
                            >
                                {costCenters.filter(cc => cc.id !== selectedCC?.id).map(cc => (
                                    <MenuItem key={cc.id} value={cc.id}>{cc.nameAr}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <TextField
                            label="المبلغ"
                            type="number"
                            value={transferData.amount}
                            onChange={(e) => setTransferData({ ...transferData, amount: Number(e.target.value) })}
                            fullWidth
                        />
                        <TextField
                            label="الشهر"
                            type="number"
                            value={transferData.month}
                            onChange={(e) => setTransferData({ ...transferData, month: Number(e.target.value) })}
                            inputProps={{ min: 1, max: 12 }}
                            fullWidth
                        />
                        <TextField
                            label="السبب"
                            value={transferData.reason}
                            onChange={(e) => setTransferData({ ...transferData, reason: e.target.value })}
                            fullWidth
                            multiline
                            rows={2}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setTransferDialogOpen(false)}>إلغاء</Button>
                    <Button variant="contained" onClick={handleTransfer}>تحويل</Button>
                </DialogActions>
            </Dialog>

            {/* Batch 5: Amend Dialog */}
            <Dialog open={amendDialogOpen} onClose={() => setAmendDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>✏️ تعديل الميزانية</DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField
                            label="الشهر"
                            type="number"
                            value={amendData.month}
                            onChange={(e) => setAmendData({ ...amendData, month: Number(e.target.value) })}
                            inputProps={{ min: 1, max: 12 }}
                            fullWidth
                        />
                        <TextField
                            label="المبلغ الجديد"
                            type="number"
                            value={amendData.newAmount}
                            onChange={(e) => setAmendData({ ...amendData, newAmount: Number(e.target.value) })}
                            fullWidth
                        />
                        <TextField
                            label="السبب"
                            value={amendData.reason}
                            onChange={(e) => setAmendData({ ...amendData, reason: e.target.value })}
                            fullWidth
                            multiline
                            rows={2}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAmendDialogOpen(false)}>إلغاء</Button>
                    <Button variant="contained" onClick={handleAmend}>تعديل</Button>
                </DialogActions>
            </Dialog>

            {/* Batch 6: Export Dialog */}
            <Dialog open={exportDialogOpen} onClose={() => setExportDialogOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>📥 تصدير التقارير</DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Button variant="outlined" fullWidth onClick={() => handleExport('json')}>
                            تصدير JSON
                        </Button>
                        <Button variant="outlined" fullWidth onClick={() => handleExport('csv')}>
                            تصدير CSV
                        </Button>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setExportDialogOpen(false)}>إغلاق</Button>
                </DialogActions>
            </Dialog>

            {/* Batch 6: History Dialog */}
            <Dialog open={historyDialogOpen} onClose={() => setHistoryDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>📜 سجل التغييرات</DialogTitle>
                <DialogContent>
                    {changeHistory?.history?.length > 0 ? (
                        <List>
                            {changeHistory.history.map((h: any, idx: number) => (
                                <ListItem key={idx} divider>
                                    <ListItemIcon><HistoryIcon /></ListItemIcon>
                                    <ListItemText
                                        primary={`${h.action} - ${h.entityType}`}
                                        secondary={`${h.description} | ${new Date(h.timestamp).toLocaleDateString('ar-SA')}`}
                                    />
                                </ListItem>
                            ))}
                        </List>
                    ) : (
                        <Typography color="text.secondary" textAlign="center" py={4}>
                            لا توجد تغييرات مسجلة
                        </Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setHistoryDialogOpen(false)}>إغلاق</Button>
                </DialogActions>
            </Dialog>

            {/* Batch 7: Drill-down Analytics Dialog */}
            <Dialog open={drillDownDialogOpen} onClose={() => setDrillDownDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>🔍 تحليلات متعمقة</DialogTitle>
                <DialogContent>
                    <Box sx={{ mb: 2 }}>
                        <FormControl fullWidth size="small">
                            <InputLabel>مستوى التحليل</InputLabel>
                            <Select
                                value={drillDownLevel}
                                onChange={(e) => setDrillDownLevel(e.target.value as any)}
                                label="مستوى التحليل"
                            >
                                <MenuItem value="employee">حسب الموظف</MenuItem>
                                <MenuItem value="month">حسب الشهر</MenuItem>
                                <MenuItem value="category">حسب الفئة</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>

                    {drillDownData ? (
                        <Box>
                            <Typography variant="h6" sx={{ mb: 2 }}>
                                {drillDownLevel === 'employee' && '📊 توزيع الرواتب حسب الموظف'}
                                {drillDownLevel === 'month' && '📅 الأداء الشهري'}
                                {drillDownLevel === 'category' && '📁 التصنيف الوظيفي'}
                            </Typography>

                            {drillDownData.data?.map((item: any, idx: number) => (
                                <Paper key={idx} sx={{ p: 2, mb: 1, bgcolor: 'grey.50' }}>
                                    <Box display="flex" justifyContent="space-between" alignItems="center">
                                        <Typography fontWeight="bold">
                                            {item.name || item.monthName || item.category}
                                        </Typography>
                                        <Typography color="primary.main" fontWeight="bold">
                                            {item.salary?.toLocaleString() || item.totalSalary?.toLocaleString() || item.actual?.toLocaleString()} ريال
                                        </Typography>
                                    </Box>
                                    {item.percentOfTotal !== undefined && (
                                        <Box sx={{ mt: 1 }}>
                                            <LinearProgress
                                                variant="determinate"
                                                value={item.percentOfTotal}
                                                sx={{ height: 8, borderRadius: 4 }}
                                            />
                                            <Typography variant="caption" color="text.secondary">
                                                {item.percentOfTotal}% من الإجمالي
                                            </Typography>
                                        </Box>
                                    )}
                                </Paper>
                            ))}
                        </Box>
                    ) : (
                        <Typography color="text.secondary" textAlign="center" py={4}>
                            جاري التحميل...
                        </Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDrillDownDialogOpen(false)}>إغلاق</Button>
                </DialogActions>
            </Dialog>

            {/* Batch 8: Multi-Year Plan Dialog */}
            <Dialog open={multiYearDialogOpen} onClose={() => setMultiYearDialogOpen(false)} maxWidth="lg" fullWidth>
                <DialogTitle>📅 تخطيط الميزانية متعدد السنوات</DialogTitle>
                <DialogContent>
                    {multiYearPlan ? (
                        <Box>
                            <Typography variant="h6" sx={{ mb: 2 }}>{multiYearPlan.costCenterName}</Typography>

                            {/* Year Tabs */}
                            <Grid container spacing={2}>
                                {multiYearPlan.yearsComparison?.map((year: any) => (
                                    <Grid item xs={12} md={4} key={year.year}>
                                        <Paper sx={{ p: 2, textAlign: 'center', bgcolor: year.year === 2026 ? 'primary.light' : 'grey.100' }}>
                                            <Typography variant="h5" fontWeight="bold">{year.year}</Typography>
                                            <Typography variant="h4" color="primary.main">
                                                {year.totalBudget?.toLocaleString()} ريال
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                الفعلي: {year.totalActual?.toLocaleString()} ريال
                                            </Typography>
                                            <Chip
                                                label={`${year.utilization}% استخدام`}
                                                color={year.utilization > 100 ? 'error' : year.utilization > 80 ? 'warning' : 'success'}
                                                size="small"
                                                sx={{ mt: 1 }}
                                            />
                                            {year.growthRate !== 0 && (
                                                <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                                                    نمو: {year.growthRate > 0 ? '+' : ''}{year.growthRate}%
                                                </Typography>
                                            )}
                                        </Paper>
                                    </Grid>
                                ))}
                            </Grid>

                            {/* Summary */}
                            <Paper sx={{ p: 2, mt: 2, bgcolor: 'grey.50' }}>
                                <Typography variant="subtitle1" fontWeight="bold">إجمالي جميع السنوات</Typography>
                                <Typography>
                                    الميزانية: {multiYearPlan.summary?.totalBudgetAllYears?.toLocaleString()} ريال |
                                    الفعلي: {multiYearPlan.summary?.totalActualAllYears?.toLocaleString()} ريال |
                                    المتوسط السنوي: {multiYearPlan.summary?.avgYearlyBudget?.toLocaleString()} ريال
                                </Typography>
                            </Paper>
                        </Box>
                    ) : (
                        <Typography color="text.secondary" textAlign="center" py={4}>
                            جاري التحميل...
                        </Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setMultiYearDialogOpen(false)}>إغلاق</Button>
                </DialogActions>
            </Dialog>

            {/* Batch 8: Smart Alerts Dialog */}
            <Dialog open={Boolean(smartAlerts && smartAlerts.totalAlerts > 0 && false)} maxWidth="md" fullWidth>
                <DialogTitle>🔔 التنبيهات الذكية ({smartAlerts?.totalAlerts || 0})</DialogTitle>
                <DialogContent>
                    {smartAlerts?.alerts?.map((alert: any, idx: number) => (
                        <Alert
                            key={idx}
                            severity={alert.severity === 'HIGH' ? 'error' : alert.severity === 'MEDIUM' ? 'warning' : 'info'}
                            sx={{ mb: 1 }}
                        >
                            <Typography fontWeight="bold">{alert.title}</Typography>
                            <Typography variant="body2">{alert.message}</Typography>
                        </Alert>
                    ))}
                </DialogContent>
            </Dialog>
        </Box>
    );
};

// Wrap with Error Boundary for crash protection
const WrappedCostCentersPage = () => (
    <CostCentersErrorBoundary>
        <CostCentersPage />
    </CostCentersErrorBoundary>
);

export default WrappedCostCentersPage;
