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
    Card,
    CardContent,
    Alert,
    CircularProgress,
    Chip,
    Grid,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
} from '@mui/material';
import {
    CloudDownload as DownloadIcon,
    CheckCircle as CheckIcon,
    Error as ErrorIcon,
    AccountBalance as BankIcon,
    Person as PersonIcon,
} from '@mui/icons-material';
import { api } from '@/services/api.service';
import { wpsExportService, WpsValidation, WpsSummary, EmployeeWithoutBank } from '@/services/wps.service';

interface PayrollRun {
    id: string;
    name: string;
    period: {
        startDate: string;
        endDate: string;
    };
    status: string;
    totalNet: number;
    employeeCount: number;
}

export default function WpsExportPage() {
    const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
    const [selectedRunId, setSelectedRunId] = useState<string>('');
    const [validation, setValidation] = useState<WpsValidation | null>(null);
    const [summary, setSummary] = useState<WpsSummary | null>(null);
    const [missingBank, setMissingBank] = useState<EmployeeWithoutBank[]>([]);
    const [loading, setLoading] = useState(true);
    const [validating, setValidating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchPayrollRuns();
        fetchMissingBank();
    }, []);

    const fetchPayrollRuns = async () => {
        try {
            const response = await api.get('/payroll-runs') as PayrollRun[] | { data: PayrollRun[] };
            const runs = (response as any).data || response;
            // Filter approved/paid runs only
            const approvedRuns = runs.filter((r: PayrollRun) =>
                ['HR_APPROVED', 'FINANCE_APPROVED', 'PAID'].includes(r.status)
            );
            setPayrollRuns(approvedRuns);
            if (approvedRuns.length > 0) {
                setSelectedRunId(approvedRuns[0].id);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'حدث خطأ في جلب البيانات');
        } finally {
            setLoading(false);
        }
    };

    const fetchMissingBank = async () => {
        try {
            const employees = await wpsExportService.getEmployeesWithoutBank();
            setMissingBank(employees);
        } catch (err) {
            console.error('Error fetching missing bank:', err);
        }
    };

    const handleValidate = async () => {
        if (!selectedRunId) return;
        setValidating(true);
        setError(null);
        try {
            const [validationResult, summaryResult] = await Promise.all([
                wpsExportService.validate(selectedRunId),
                wpsExportService.getSummary(selectedRunId),
            ]);
            setValidation(validationResult);
            setSummary(summaryResult);
        } catch (err: any) {
            setError(err.response?.data?.message || 'حدث خطأ في التحقق');
        } finally {
            setValidating(false);
        }
    };

    const handleDownloadCsv = () => {
        if (!selectedRunId) return;
        const url = wpsExportService.downloadCsv(selectedRunId);
        window.open(url, '_blank');
    };

    const handleDownloadSarie = () => {
        if (!selectedRunId) return;
        const url = wpsExportService.downloadSarie(selectedRunId);
        window.open(url, '_blank');
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
                    <BankIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    تصدير WPS للبنوك
                </Typography>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {/* Missing Bank Alert */}
            {missingBank.length > 0 && (
                <Alert severity="warning" sx={{ mb: 3 }}>
                    يوجد {missingBank.length} موظف بدون حساب بنكي مسجل
                </Alert>
            )}

            <Grid container spacing={3}>
                {/* Select Payroll Run */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            اختر مسير الرواتب
                        </Typography>

                        {payrollRuns.length === 0 ? (
                            <Alert severity="info">
                                لا توجد مسيرات رواتب معتمدة للتصدير
                            </Alert>
                        ) : (
                            <>
                                <FormControl fullWidth sx={{ mb: 2 }}>
                                    <InputLabel>مسير الرواتب</InputLabel>
                                    <Select
                                        value={selectedRunId}
                                        label="مسير الرواتب"
                                        onChange={(e) => {
                                            setSelectedRunId(e.target.value);
                                            setValidation(null);
                                            setSummary(null);
                                        }}
                                    >
                                        {payrollRuns.map((run) => (
                                            <MenuItem key={run.id} value={run.id}>
                                                {run.name} - {formatCurrency(run.totalNet || 0)}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>

                                <Button
                                    variant="contained"
                                    onClick={handleValidate}
                                    disabled={!selectedRunId || validating}
                                    fullWidth
                                >
                                    {validating ? <CircularProgress size={24} /> : 'فحص الجاهزية'}
                                </Button>
                            </>
                        )}
                    </Paper>
                </Grid>

                {/* Export Actions */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            تصدير الملفات
                        </Typography>

                        {!validation ? (
                            <Alert severity="info">
                                اختر مسير الرواتب واضغط "فحص الجاهزية" أولاً
                            </Alert>
                        ) : (
                            <>
                                {/* Validation Status */}
                                <Box display="flex" alignItems="center" mb={2}>
                                    {validation.isReady ? (
                                        <Chip
                                            icon={<CheckIcon />}
                                            label="جاهز للتصدير"
                                            color="success"
                                        />
                                    ) : (
                                        <Chip
                                            icon={<ErrorIcon />}
                                            label="يوجد مشاكل"
                                            color="error"
                                        />
                                    )}
                                </Box>

                                {/* Summary Stats */}
                                {summary && (
                                    <Box mb={2}>
                                        <Grid container spacing={2}>
                                            <Grid item xs={6}>
                                                <Card variant="outlined">
                                                    <CardContent>
                                                        <Typography color="text.secondary" variant="caption">
                                                            عدد الموظفين
                                                        </Typography>
                                                        <Typography variant="h5">
                                                            {summary.recordCount}
                                                        </Typography>
                                                    </CardContent>
                                                </Card>
                                            </Grid>
                                            <Grid item xs={6}>
                                                <Card variant="outlined">
                                                    <CardContent>
                                                        <Typography color="text.secondary" variant="caption">
                                                            إجمالي المبلغ
                                                        </Typography>
                                                        <Typography variant="h5">
                                                            {formatCurrency(summary.totalAmount)}
                                                        </Typography>
                                                    </CardContent>
                                                </Card>
                                            </Grid>
                                        </Grid>
                                    </Box>
                                )}

                                {/* Download Buttons */}
                                <Box display="flex" gap={2}>
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        startIcon={<DownloadIcon />}
                                        onClick={handleDownloadCsv}
                                        disabled={!validation.isReady}
                                        fullWidth
                                    >
                                        تنزيل CSV
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        color="primary"
                                        startIcon={<DownloadIcon />}
                                        onClick={handleDownloadSarie}
                                        disabled={!validation.isReady}
                                        fullWidth
                                    >
                                        تنزيل SARIE
                                    </Button>
                                </Box>
                            </>
                        )}
                    </Paper>
                </Grid>

                {/* Validation Errors */}
                {validation && validation.errors.length > 0 && (
                    <Grid item xs={12}>
                        <Paper sx={{ p: 3 }}>
                            <Typography variant="h6" color="error" gutterBottom>
                                <ErrorIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                                أخطاء يجب معالجتها ({validation.errors.length})
                            </Typography>
                            <List dense>
                                {validation.errors.map((err, idx) => (
                                    <ListItem key={idx}>
                                        <ListItemIcon>
                                            <ErrorIcon color="error" fontSize="small" />
                                        </ListItemIcon>
                                        <ListItemText primary={err} />
                                    </ListItem>
                                ))}
                            </List>
                        </Paper>
                    </Grid>
                )}

                {/* Missing Bank Employees */}
                {missingBank.length > 0 && (
                    <Grid item xs={12}>
                        <Paper sx={{ p: 3 }}>
                            <Typography variant="h6" gutterBottom>
                                <PersonIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                                موظفين بدون حساب بنكي ({missingBank.length})
                            </Typography>
                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>كود الموظف</TableCell>
                                            <TableCell>الاسم</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {missingBank.slice(0, 10).map((emp) => (
                                            <TableRow key={emp.id}>
                                                <TableCell>{emp.employeeCode}</TableCell>
                                                <TableCell>{emp.firstName} {emp.lastName}</TableCell>
                                            </TableRow>
                                        ))}
                                        {missingBank.length > 10 && (
                                            <TableRow>
                                                <TableCell colSpan={2} align="center">
                                                    ... و{missingBank.length - 10} موظف آخر
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>
                    </Grid>
                )}
            </Grid>
        </Box>
    );
}
