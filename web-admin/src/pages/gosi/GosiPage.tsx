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
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Alert,
    CircularProgress,
    Chip,
    Card,
    CardContent,
    Grid,
    Tabs,
    Tab,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    LinearProgress,
    Divider,
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Shield as GosiIcon,
    CheckCircle as ActiveIcon,
    Assessment,
    Settings,
    History,
    Person,
    Download,
} from '@mui/icons-material';
import { gosiService, GosiConfig, CreateGosiConfigDto } from '@/services/gosi.service';
import { api } from '@/services/api.service';

// Types for Report
interface GosiReportEmployee {
    userId: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    nationality: string;
    basicSalary: number;
    contributionBase: number;
    employeeShare: number;
    employerShare: number;
    totalContribution: number;
}

interface GosiReport {
    runId: string;
    month: number;
    year: number;
    totalEmployees: number;
    totalContributionBase: number;
    totalEmployeeShare: number;
    totalEmployerShare: number;
    totalContribution: number;
    employees: GosiReportEmployee[];
}

interface PayrollRun {
    id: string;
    month: number;
    year: number;
    status: string;
}

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

const getMonthName = (month: number) => {
    const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    return months[month - 1] || '';
};

export default function GosiPage() {
    const [tabValue, setTabValue] = useState(0);
    const [configs, setConfigs] = useState<GosiConfig[]>([]);
    const [activeConfig, setActiveConfig] = useState<GosiConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Dialog states
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedConfig, setSelectedConfig] = useState<GosiConfig | null>(null);

    // Form state
    const [formData, setFormData] = useState<CreateGosiConfigDto>({
        employeePercentage: 9.75,
        employerPercentage: 11.75,
        maxSalary: 45000,
        effectiveFrom: new Date().toISOString().slice(0, 10),
    });

    // Report state
    const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
    const [selectedRunId, setSelectedRunId] = useState('');
    const [gosiReport, setGosiReport] = useState<GosiReport | null>(null);
    const [reportLoading, setReportLoading] = useState(false);

    useEffect(() => {
        fetchData();
        fetchPayrollRuns();
    }, []);

    useEffect(() => {
        if (selectedRunId) {
            fetchReport(selectedRunId);
        }
    }, [selectedRunId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [configsRes, activeRes] = await Promise.all([
                gosiService.getAll(),
                gosiService.getActiveConfig(),
            ]);
            setConfigs(configsRes);
            setActiveConfig(activeRes);
            setError(null);
        } catch (err: any) {
            setError(err.response?.data?.message || 'حدث خطأ');
        } finally {
            setLoading(false);
        }
    };

    const fetchPayrollRuns = async () => {
        try {
            const response = await api.get('/payroll-runs');
            setPayrollRuns((response as any)?.data || response || []);
        } catch (err) {
            console.error('Failed to fetch payroll runs:', err);
        }
    };

    const fetchReport = async (runId: string) => {
        setReportLoading(true);
        try {
            const response = await api.get(`/gosi/report/${runId}`);
            setGosiReport(response as GosiReport);
        } catch (err: any) {
            setError(err.response?.data?.message || 'فشل في جلب التقرير');
            setGosiReport(null);
        } finally {
            setReportLoading(false);
        }
    };

    const handleOpenDialog = (config?: GosiConfig) => {
        if (config) {
            setSelectedConfig(config);
            setFormData({
                employeePercentage: config.employeePercentage,
                employerPercentage: config.employerPercentage,
                maxSalary: config.maxSalary,
                effectiveFrom: config.effectiveFrom?.slice(0, 10) || '',
            });
        } else {
            setSelectedConfig(null);
            setFormData({
                employeePercentage: 9.75,
                employerPercentage: 11.75,
                maxSalary: 45000,
                effectiveFrom: new Date().toISOString().slice(0, 10),
            });
        }
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setSelectedConfig(null);
    };

    const handleSubmit = async () => {
        try {
            if (selectedConfig) {
                await gosiService.update(selectedConfig.id, formData);
            } else {
                await gosiService.create(formData);
            }
            handleCloseDialog();
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.message || 'حدث خطأ');
        }
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('ar-SA');
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('ar-SA', {
            style: 'currency',
            currency: 'SAR',
        }).format(amount);
    };

    if (loading) {
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
                    <GosiIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    التأمينات الاجتماعية (GOSI)
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog()}
                >
                    إعداد جديد
                </Button>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {/* Tabs */}
            <Paper sx={{ borderRadius: 3 }}>
                <Tabs
                    value={tabValue}
                    onChange={(_, newValue) => setTabValue(newValue)}
                    sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
                >
                    <Tab icon={<Settings />} label="الإعداد الحالي" iconPosition="start" />
                    <Tab icon={<History />} label="السجل" iconPosition="start" />
                    <Tab icon={<Assessment />} label="تقرير الشهر" iconPosition="start" />
                </Tabs>

                {/* Tab 1: Active Config */}
                <TabPanel value={tabValue} index={0}>
                    <Box p={2}>
                        {activeConfig ? (
                            <Card sx={{ bgcolor: 'success.50', border: '2px solid', borderColor: 'success.main' }}>
                                <CardContent>
                                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                        <Typography variant="h6" fontWeight="bold" color="success.main">
                                            <ActiveIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                                            الإعداد المفعّل حالياً
                                        </Typography>
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            startIcon={<EditIcon />}
                                            onClick={() => handleOpenDialog(activeConfig)}
                                        >
                                            تعديل
                                        </Button>
                                    </Box>
                                    <Divider sx={{ my: 2 }} />
                                    <Grid container spacing={3}>
                                        <Grid item xs={12} sm={6} md={3}>
                                            <Typography variant="caption" color="text.secondary">نسبة الموظف</Typography>
                                            <Typography variant="h4" fontWeight="bold" color="primary.main">
                                                {activeConfig.employeePercentage}%
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={12} sm={6} md={3}>
                                            <Typography variant="caption" color="text.secondary">نسبة صاحب العمل</Typography>
                                            <Typography variant="h4" fontWeight="bold" color="secondary.main">
                                                {activeConfig.employerPercentage}%
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={12} sm={6} md={3}>
                                            <Typography variant="caption" color="text.secondary">الحد الأقصى للراتب</Typography>
                                            <Typography variant="h4" fontWeight="bold" color="warning.main">
                                                {formatCurrency(activeConfig.maxSalary)}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={12} sm={6} md={3}>
                                            <Typography variant="caption" color="text.secondary">ساري من</Typography>
                                            <Typography variant="h4" fontWeight="bold">
                                                {formatDate(activeConfig.effectiveFrom)}
                                            </Typography>
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>
                        ) : (
                            <Alert severity="warning">
                                لا يوجد إعداد مفعّل! يرجى إضافة إعداد جديد.
                            </Alert>
                        )}

                        <Alert severity="info" sx={{ mt: 3 }}>
                            <Typography variant="body2">
                                <strong>ملاحظة:</strong> النسب أعلاه تُطبق تلقائياً عند احتساب الرواتب.
                                حصة الموظف تُخصم من راتبه، وحصة صاحب العمل تُضاف كتكلفة على الشركة.
                            </Typography>
                        </Alert>
                    </Box>
                </TabPanel>

                {/* Tab 2: History */}
                <TabPanel value={tabValue} index={1}>
                    <Box p={2}>
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow sx={{ bgcolor: 'grey.100' }}>
                                        <TableCell>نسبة الموظف</TableCell>
                                        <TableCell>نسبة صاحب العمل</TableCell>
                                        <TableCell>الحد الأقصى</TableCell>
                                        <TableCell>ساري من</TableCell>
                                        <TableCell align="center">الحالة</TableCell>
                                        <TableCell align="center">الإجراءات</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {configs.map((config) => (
                                        <TableRow key={config.id} hover>
                                            <TableCell>{config.employeePercentage}%</TableCell>
                                            <TableCell>{config.employerPercentage}%</TableCell>
                                            <TableCell>{formatCurrency(config.maxSalary)}</TableCell>
                                            <TableCell>{formatDate(config.effectiveFrom)}</TableCell>
                                            <TableCell align="center">
                                                {config.isActive ? (
                                                    <Chip label="مفعّل" color="success" size="small" icon={<ActiveIcon />} />
                                                ) : (
                                                    <Chip label="غير مفعّل" variant="outlined" size="small" />
                                                )}
                                            </TableCell>
                                            <TableCell align="center">
                                                <Button
                                                    size="small"
                                                    startIcon={<EditIcon />}
                                                    onClick={() => handleOpenDialog(config)}
                                                >
                                                    تعديل
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {configs.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                                                <Typography color="text.secondary">لا توجد إعدادات</Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                </TabPanel>

                {/* Tab 3: Monthly Report */}
                <TabPanel value={tabValue} index={2}>
                    <Box p={2}>
                        {/* Run Selector */}
                        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                            <Grid container spacing={2} alignItems="center">
                                <Grid item xs={12} md={4}>
                                    <FormControl fullWidth>
                                        <InputLabel>اختر دورة الرواتب</InputLabel>
                                        <Select
                                            value={selectedRunId}
                                            onChange={(e) => setSelectedRunId(e.target.value)}
                                            label="اختر دورة الرواتب"
                                        >
                                            <MenuItem value="">
                                                <em>اختر...</em>
                                            </MenuItem>
                                            {payrollRuns.map((run) => (
                                                <MenuItem key={run.id} value={run.id}>
                                                    {getMonthName(run.month)} {run.year} - {run.status}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                {gosiReport && (
                                    <Grid item xs={12} md={8}>
                                        <Box display="flex" gap={2} justifyContent="flex-end">
                                            <Button variant="outlined" startIcon={<Download />}>
                                                تصدير Excel
                                            </Button>
                                        </Box>
                                    </Grid>
                                )}
                            </Grid>
                        </Paper>

                        {reportLoading && <LinearProgress sx={{ mb: 3 }} />}

                        {/* Report Content */}
                        {gosiReport && (
                            <>
                                {/* Summary Cards */}
                                <Grid container spacing={2} sx={{ mb: 3 }}>
                                    <Grid item xs={6} sm={3}>
                                        <Card sx={{ textAlign: 'center', bgcolor: 'primary.50' }}>
                                            <CardContent>
                                                <Typography variant="h4" fontWeight="bold" color="primary.main">
                                                    {gosiReport.totalEmployees}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">عدد الموظفين</Typography>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                    <Grid item xs={6} sm={3}>
                                        <Card sx={{ textAlign: 'center', bgcolor: 'info.50' }}>
                                            <CardContent>
                                                <Typography variant="h5" fontWeight="bold" color="info.main">
                                                    {formatCurrency(gosiReport.totalContributionBase)}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">إجمالي الوعاء</Typography>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                    <Grid item xs={6} sm={3}>
                                        <Card sx={{ textAlign: 'center', bgcolor: 'warning.50' }}>
                                            <CardContent>
                                                <Typography variant="h5" fontWeight="bold" color="warning.main">
                                                    {formatCurrency(gosiReport.totalEmployeeShare)}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">حصة الموظفين</Typography>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                    <Grid item xs={6} sm={3}>
                                        <Card sx={{ textAlign: 'center', bgcolor: 'success.50' }}>
                                            <CardContent>
                                                <Typography variant="h5" fontWeight="bold" color="success.main">
                                                    {formatCurrency(gosiReport.totalEmployerShare)}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">حصة صاحب العمل</Typography>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                </Grid>

                                {/* Employees Table */}
                                <TableContainer component={Paper}>
                                    <Table>
                                        <TableHead sx={{ bgcolor: 'grey.100' }}>
                                            <TableRow>
                                                <TableCell>الموظف</TableCell>
                                                <TableCell>الجنسية</TableCell>
                                                <TableCell align="right">الراتب الأساسي</TableCell>
                                                <TableCell align="right">وعاء الاشتراك</TableCell>
                                                <TableCell align="right">حصة الموظف</TableCell>
                                                <TableCell align="right">حصة صاحب العمل</TableCell>
                                                <TableCell align="right">الإجمالي</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {gosiReport.employees?.map((emp) => (
                                                <TableRow key={emp.userId} hover>
                                                    <TableCell>
                                                        <Box display="flex" alignItems="center" gap={1}>
                                                            <Person color="primary" />
                                                            <Box>
                                                                <Typography fontWeight="medium">
                                                                    {emp.firstName} {emp.lastName}
                                                                </Typography>
                                                                <Typography variant="caption" color="text.secondary">
                                                                    {emp.employeeCode}
                                                                </Typography>
                                                            </Box>
                                                        </Box>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Chip
                                                            label={emp.nationality === 'SA' ? 'سعودي' : 'غير سعودي'}
                                                            size="small"
                                                            color={emp.nationality === 'SA' ? 'success' : 'default'}
                                                        />
                                                    </TableCell>
                                                    <TableCell align="right">{formatCurrency(emp.basicSalary)}</TableCell>
                                                    <TableCell align="right">{formatCurrency(emp.contributionBase)}</TableCell>
                                                    <TableCell align="right">
                                                        <Typography color="warning.main">
                                                            {formatCurrency(emp.employeeShare)}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        <Typography color="success.main">
                                                            {formatCurrency(emp.employerShare)}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        <Typography fontWeight="bold">
                                                            {formatCurrency(emp.totalContribution)}
                                                        </Typography>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {(!gosiReport.employees || gosiReport.employees.length === 0) && (
                                                <TableRow>
                                                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                                                        <Typography color="text.secondary">لا توجد بيانات</Typography>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </>
                        )}

                        {!selectedRunId && (
                            <Box textAlign="center" py={6}>
                                <Assessment sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
                                <Typography variant="h6" color="text.secondary">
                                    اختر دورة رواتب لعرض تقرير التأمينات
                                </Typography>
                            </Box>
                        )}
                    </Box>
                </TabPanel>
            </Paper>

            {/* Add/Edit Dialog */}
            <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {selectedConfig ? 'تعديل إعداد التأمينات' : 'إنشاء إعداد تأمينات جديد'}
                </DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                type="number"
                                label="نسبة الموظف %"
                                value={formData.employeePercentage}
                                onChange={(e) =>
                                    setFormData({ ...formData, employeePercentage: parseFloat(e.target.value) })
                                }
                                inputProps={{ step: 0.25, min: 0, max: 100 }}
                                helperText="النسبة المقتطعة من راتب الموظف"
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                type="number"
                                label="نسبة صاحب العمل %"
                                value={formData.employerPercentage}
                                onChange={(e) =>
                                    setFormData({ ...formData, employerPercentage: parseFloat(e.target.value) })
                                }
                                inputProps={{ step: 0.25, min: 0, max: 100 }}
                                helperText="النسبة التي يدفعها صاحب العمل"
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                type="number"
                                label="الحد الأقصى للراتب (ريال)"
                                value={formData.maxSalary}
                                onChange={(e) =>
                                    setFormData({ ...formData, maxSalary: parseFloat(e.target.value) })
                                }
                                helperText="أقصى راتب يُحسب عليه التأمينات"
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                type="date"
                                label="تاريخ البداية"
                                value={formData.effectiveFrom}
                                onChange={(e) =>
                                    setFormData({ ...formData, effectiveFrom: e.target.value })
                                }
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>إلغاء</Button>
                    <Button variant="contained" onClick={handleSubmit}>
                        {selectedConfig ? 'تحديث' : 'إنشاء'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
