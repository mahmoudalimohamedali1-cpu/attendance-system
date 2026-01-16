import { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Alert,
    CircularProgress,
    Tooltip,
    Grid,
    Card,
    CardContent,
    Tabs,
    Tab,
    TextField,
    MenuItem,
    LinearProgress,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material';
import {
    Download as DownloadIcon,
    Refresh as RefreshIcon,
    Warning as WarningIcon,
    CheckCircle as CheckIcon,
    Error as ErrorIcon,
    Schedule as PendingIcon,
    Business as CompanyIcon,
    Person as PersonIcon,
    Assignment as ContractIcon,
    TrendingUp as StatsIcon,
    Notifications as AlertIcon,
    CloudDownload as ExportIcon,
    FilterList as FilterIcon,
} from '@mui/icons-material';
import { api } from '@/services/api.service';

// Types
interface Contract {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    nationalId: string;
    contractType: string;
    startDate: string;
    endDate: string | null;
    qiwaStatus: string;
    qiwaContractId: string | null;
    daysUntilExpiry: number | null;
}

interface QiwaStats {
    total: number;
    pending: number;
    submitted: number;
    approved: number;
    rejected: number;
    expiringSoon: number;
}

interface ActionRequired {
    id: string;
    employeeName: string;
    employeeCode: string;
    issue: string;
    severity: 'high' | 'medium' | 'low';
    daysRemaining: number | null;
}

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;
    return (
        <div hidden={value !== index} {...other}>
            {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
        </div>
    );
}

const qiwaStatusColors: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error'> = {
    NOT_SUBMITTED: 'default',
    PENDING_APPROVAL: 'warning',
    APPROVED: 'success',
    REJECTED: 'error',
    EXPIRED: 'error',
};

const qiwaStatusLabels: Record<string, string> = {
    NOT_SUBMITTED: 'غير مرفوع',
    PENDING_APPROVAL: 'قيد الموافقة',
    APPROVED: 'معتمد',
    REJECTED: 'مرفوض',
    EXPIRED: 'منتهي',
};

export default function QiwaPage() {
    const [tabValue, setTabValue] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Data
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [stats, setStats] = useState<QiwaStats | null>(null);
    const [actionsRequired, setActionsRequired] = useState<ActionRequired[]>([]);

    // Filters
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        fetchData();
    }, [statusFilter]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const status = statusFilter === 'all' ? undefined : statusFilter;

            // Fetch each API separately to handle partial failures
            let contractsData: Contract[] = [];
            let statsData: QiwaStats = { total: 0, pending: 0, submitted: 0, approved: 0, rejected: 0, expiringSoon: 0 };
            let actionsData: ActionRequired[] = [];

            try {
                const contractsRes = await api.get('/qiwa/contracts', { params: { status } });
                contractsData = (contractsRes as any).data || contractsRes as Contract[] || [];
            } catch (e) {
                console.warn('Failed to fetch contracts:', e);
            }

            try {
                const statsRes = await api.get('/qiwa/contracts/stats');
                statsData = (statsRes as any).data || statsRes as QiwaStats || { total: 0, pending: 0, submitted: 0, approved: 0, rejected: 0, expiringSoon: 0 };
            } catch (e) {
                console.warn('Failed to fetch stats:', e);
            }

            try {
                const actionsRes = await api.get('/qiwa/contracts/actions-required');
                actionsData = (actionsRes as any).data || actionsRes as ActionRequired[] || [];
            } catch (e) {
                console.warn('Failed to fetch actions:', e);
            }

            setContracts(contractsData);
            setStats(statsData);
            setActionsRequired(actionsData);
            setError(null);
        } catch (err: any) {
            setError(err.response?.data?.message || 'حدث خطأ في تحميل بيانات قوى');
            // Set empty data to prevent crashes
            setContracts([]);
            setStats({ total: 0, pending: 0, submitted: 0, approved: 0, rejected: 0, expiringSoon: 0 });
            setActionsRequired([]);
        } finally {
            setLoading(false);
        }
    };

    const handleExportCSV = async () => {
        setExporting(true);
        try {
            const response = await api.get('/qiwa/contracts/csv', {
                responseType: 'blob',
                params: { status: statusFilter === 'all' ? undefined : statusFilter },
            });

            // Create download link
            const url = window.URL.createObjectURL(new Blob([response as any]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `qiwa-contracts-${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            setSuccess('تم تحميل ملف CSV بنجاح');
        } catch (err: any) {
            setError(err.response?.data?.message || 'حدث خطأ في تصدير الملف');
        } finally {
            setExporting(false);
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'high': return 'error';
            case 'medium': return 'warning';
            case 'low': return 'info';
            default: return 'default';
        }
    };

    const getSeverityLabel = (severity: string) => {
        switch (severity) {
            case 'high': return 'عاجل';
            case 'medium': return 'متوسط';
            case 'low': return 'منخفض';
            default: return severity;
        }
    };

    if (loading && !stats) {
        return (
            <Box display="flex" justifyContent="center" p={4}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box p={3}>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h5" fontWeight="bold">
                    <CompanyIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    تكامل قوى (Qiwa)
                </Typography>
                <Box display="flex" gap={2}>
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
                        startIcon={exporting ? <CircularProgress size={20} color="inherit" /> : <DownloadIcon />}
                        onClick={handleExportCSV}
                        disabled={exporting}
                    >
                        تصدير CSV
                    </Button>
                </Box>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}
            {success && (
                <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
                    {success}
                </Alert>
            )}

            {/* Stats Cards */}
            {stats && (
                <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={12} sm={6} md={2}>
                        <Card>
                            <CardContent sx={{ textAlign: 'center' }}>
                                <ContractIcon color="primary" sx={{ fontSize: 40 }} />
                                <Typography variant="h4" fontWeight="bold">{stats.total}</Typography>
                                <Typography color="text.secondary">إجمالي العقود</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={2}>
                        <Card sx={{ bgcolor: 'grey.100' }}>
                            <CardContent sx={{ textAlign: 'center' }}>
                                <PendingIcon color="disabled" sx={{ fontSize: 40 }} />
                                <Typography variant="h4" fontWeight="bold">{stats.pending}</Typography>
                                <Typography color="text.secondary">غير مرفوع</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={2}>
                        <Card sx={{ bgcolor: 'warning.50' }}>
                            <CardContent sx={{ textAlign: 'center' }}>
                                <WarningIcon color="warning" sx={{ fontSize: 40 }} />
                                <Typography variant="h4" fontWeight="bold">{stats.submitted}</Typography>
                                <Typography color="text.secondary">قيد الموافقة</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={2}>
                        <Card sx={{ bgcolor: 'success.50' }}>
                            <CardContent sx={{ textAlign: 'center' }}>
                                <CheckIcon color="success" sx={{ fontSize: 40 }} />
                                <Typography variant="h4" fontWeight="bold">{stats.approved}</Typography>
                                <Typography color="text.secondary">معتمد</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={2}>
                        <Card sx={{ bgcolor: 'error.50' }}>
                            <CardContent sx={{ textAlign: 'center' }}>
                                <ErrorIcon color="error" sx={{ fontSize: 40 }} />
                                <Typography variant="h4" fontWeight="bold">{stats.rejected}</Typography>
                                <Typography color="text.secondary">مرفوض</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={2}>
                        <Card sx={{ bgcolor: 'warning.100' }}>
                            <CardContent sx={{ textAlign: 'center' }}>
                                <AlertIcon color="warning" sx={{ fontSize: 40 }} />
                                <Typography variant="h4" fontWeight="bold">{stats.expiringSoon}</Typography>
                                <Typography color="text.secondary">قرب الانتهاء</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            )}

            {/* Actions Required Alert */}
            {actionsRequired.length > 0 && (
                <Alert
                    severity="warning"
                    sx={{ mb: 3 }}
                    icon={<AlertIcon />}
                >
                    <Typography fontWeight="bold">
                        يوجد {actionsRequired.length} عقد يحتاج إجراء فوري
                    </Typography>
                </Alert>
            )}

            {/* Tabs */}
            <Paper sx={{ mb: 3 }}>
                <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
                    <Tab icon={<ContractIcon />} label="العقود" iconPosition="start" />
                    <Tab
                        icon={<AlertIcon />}
                        label={`إجراءات مطلوبة (${actionsRequired.length})`}
                        iconPosition="start"
                    />
                </Tabs>

                {/* Contracts Tab */}
                <TabPanel value={tabValue} index={0}>
                    <Box sx={{ p: 2 }}>
                        <Box display="flex" justifyContent="space-between" mb={2}>
                            <TextField
                                select
                                size="small"
                                label="تصفية حسب الحالة"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                sx={{ width: 200 }}
                            >
                                <MenuItem value="all">جميع الحالات</MenuItem>
                                <MenuItem value="NOT_SUBMITTED">غير مرفوع</MenuItem>
                                <MenuItem value="PENDING_APPROVAL">قيد الموافقة</MenuItem>
                                <MenuItem value="APPROVED">معتمد</MenuItem>
                                <MenuItem value="REJECTED">مرفوض</MenuItem>
                            </TextField>
                            <Typography color="text.secondary">
                                {contracts.length} عقد
                            </Typography>
                        </Box>

                        {loading && <LinearProgress sx={{ mb: 2 }} />}

                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow sx={{ bgcolor: 'grey.100' }}>
                                        <TableCell>الموظف</TableCell>
                                        <TableCell>رقم الهوية</TableCell>
                                        <TableCell>نوع العقد</TableCell>
                                        <TableCell>تاريخ البداية</TableCell>
                                        <TableCell>تاريخ الانتهاء</TableCell>
                                        <TableCell align="center">حالة قوى</TableCell>
                                        <TableCell>رقم العقد في قوى</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {contracts.map((contract) => (
                                        <TableRow
                                            key={contract.id}
                                            hover
                                            sx={{
                                                bgcolor: contract.daysUntilExpiry !== null && contract.daysUntilExpiry <= 30
                                                    ? 'warning.50'
                                                    : 'inherit'
                                            }}
                                        >
                                            <TableCell>
                                                <Typography fontWeight="bold">
                                                    {contract.firstName} {contract.lastName}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {contract.employeeCode}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>{contract.nationalId}</TableCell>
                                            <TableCell>{contract.contractType}</TableCell>
                                            <TableCell>
                                                {new Date(contract.startDate).toLocaleDateString('ar-SA')}
                                            </TableCell>
                                            <TableCell>
                                                {contract.endDate
                                                    ? new Date(contract.endDate).toLocaleDateString('ar-SA')
                                                    : 'غير محدد'
                                                }
                                                {contract.daysUntilExpiry !== null && contract.daysUntilExpiry <= 30 && (
                                                    <Chip
                                                        size="small"
                                                        label={`${contract.daysUntilExpiry} يوم`}
                                                        color="warning"
                                                        sx={{ ml: 1 }}
                                                    />
                                                )}
                                            </TableCell>
                                            <TableCell align="center">
                                                <Chip
                                                    label={qiwaStatusLabels[contract.qiwaStatus] || contract.qiwaStatus}
                                                    color={qiwaStatusColors[contract.qiwaStatus] || 'default'}
                                                    size="small"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                {contract.qiwaContractId || '-'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {contracts.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={7} align="center">
                                                لا توجد عقود مطابقة للفلتر المحدد
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                </TabPanel>

                {/* Actions Required Tab */}
                <TabPanel value={tabValue} index={1}>
                    <Box sx={{ p: 2 }}>
                        {actionsRequired.length === 0 ? (
                            <Alert severity="success" icon={<CheckIcon />}>
                                لا توجد إجراءات مطلوبة حالياً - جميع العقود في حالة جيدة ✓
                            </Alert>
                        ) : (
                            <TableContainer>
                                <Table>
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: 'grey.100' }}>
                                            <TableCell>الموظف</TableCell>
                                            <TableCell>المشكلة</TableCell>
                                            <TableCell align="center">الأولوية</TableCell>
                                            <TableCell align="center">المدة المتبقية</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {actionsRequired.map((action) => (
                                            <TableRow key={action.id} hover>
                                                <TableCell>
                                                    <Typography fontWeight="bold">
                                                        {action.employeeName}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {action.employeeCode}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>{action.issue}</TableCell>
                                                <TableCell align="center">
                                                    <Chip
                                                        label={getSeverityLabel(action.severity)}
                                                        color={getSeverityColor(action.severity) as any}
                                                        size="small"
                                                    />
                                                </TableCell>
                                                <TableCell align="center">
                                                    {action.daysRemaining !== null
                                                        ? `${action.daysRemaining} يوم`
                                                        : '-'
                                                    }
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </Box>
                </TabPanel>
            </Paper>

            {/* Help Section */}
            <Paper sx={{ p: 3, bgcolor: 'primary.50' }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                    📌 ملاحظات مهمة حول قوى
                </Typography>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        <Typography variant="body2">
                            • <strong>غير مرفوع:</strong> العقد لم يتم رفعه بعد إلى منصة قوى
                        </Typography>
                        <Typography variant="body2">
                            • <strong>قيد الموافقة:</strong> العقد تم رفعه وينتظر موافقة الموظف
                        </Typography>
                        <Typography variant="body2">
                            • <strong>معتمد:</strong> العقد معتمد من قوى ومفعّل
                        </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Typography variant="body2">
                            • <strong>مرفوض:</strong> العقد مرفوض ويحتاج مراجعة
                        </Typography>
                        <Typography variant="body2">
                            • العقود التي ستنتهي خلال 30 يوم تظهر بخلفية صفراء
                        </Typography>
                        <Typography variant="body2">
                            • استخدم زر "تصدير CSV" لتصدير البيانات بصيغة متوافقة مع قوى
                        </Typography>
                    </Grid>
                </Grid>
            </Paper>
        </Box>
    );
}
