import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Divider,
    IconButton,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material';
import {
    CloudDownload as DownloadIcon,
    CheckCircle as CheckIcon,
    AccountBalance as BankIcon,
    Person as PersonIcon,
    Refresh as RefreshIcon,
    FileDownload as FileIcon,
    Warning as WarningIcon,
    AddCircle as AddIcon,
    Send as SendIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { api, API_URL } from '@/services/api.service';

interface PayrollPeriod {
    id: string;
    month: number;
    year: number;
    startDate: string;
    endDate: string;
}

interface PayrollRun {
    id: string;
    runDate: string;
    status: string;
    period: PayrollPeriod;
    _count?: {
        payslips: number;
    };
}

interface WpsSummary {
    filename: string;
    recordCount: number;
    totalAmount: number;
    errors: string[];
}

interface WpsValidation {
    isReady: boolean;
    issues: {
        type: string;
        message: string;
        employeeId?: string;
    }[];
}

interface EmployeeWithoutBank {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
    email?: string;
}

// Helper function for month names
const getMonthName = (month: number) => {
    const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    return months[month - 1] || '';
};

export default function WpsExportPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
    const [selectedRunId, setSelectedRunId] = useState<string>('');
    const [validation, setValidation] = useState<WpsValidation | null>(null);
    const [summary, setSummary] = useState<WpsSummary | null>(null);
    const [missingBank, setMissingBank] = useState<EmployeeWithoutBank[]>([]);
    const [loading, setLoading] = useState(true);
    const [validating, setValidating] = useState(false);
    const [downloading, setDownloading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewContent, setPreviewContent] = useState<string>('');
    const [mudadDialogOpen, setMudadDialogOpen] = useState(false);

    useEffect(() => {
        fetchPayrollRuns();
        fetchMissingBank();
    }, []);

    // Create MUDAD submission mutation
    const createMudadMutation = useMutation({
        mutationFn: async (data: { payrollRunId: string; month: number; year: number }) => {
            return api.post('/mudad', data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['mudad'] });
            queryClient.invalidateQueries({ queryKey: ['mudad-stats'] });
            setMudadDialogOpen(false);
            // Navigate to MUDAD page to see the created submission
            navigate('/mudad');
        },
        onError: (error: any) => {
            setError(error.response?.data?.message || 'فشل في إنشاء تقديم مُدد');
        },
    });

    const fetchPayrollRuns = async () => {
        try {
            setLoading(true);
            const response = await api.get('/payroll-runs') as PayrollRun[] | { data: PayrollRun[] };
            const runs = Array.isArray(response) ? response : (response as any).data || [];

            // Filter to runs that can be exported (include DRAFT for preview, but only approved ones can actually export)
            const exportableRuns = runs.filter((r: PayrollRun) =>
                ['DRAFT', 'HR_APPROVED', 'FINANCE_APPROVED', 'LOCKED', 'PAID'].includes(r.status)
            );

            setPayrollRuns(exportableRuns);
            if (exportableRuns.length > 0) {
                setSelectedRunId(exportableRuns[0].id);
            }
        } catch (err: any) {
            console.error('Error fetching payroll runs:', err);
            setError(err.response?.data?.message || 'حدث خطأ في جلب مسيرات الرواتب');
        } finally {
            setLoading(false);
        }
    };

    const fetchMissingBank = async () => {
        try {
            const response = await api.get('/wps-export/missing-bank') as EmployeeWithoutBank[] | { data: EmployeeWithoutBank[] };
            const employees = Array.isArray(response) ? response : (response as any).data || [];
            setMissingBank(employees);
        } catch (err) {
            console.error('Error fetching missing bank:', err);
        }
    };

    const handleValidate = async () => {
        if (!selectedRunId) return;
        setValidating(true);
        setError(null);
        setValidation(null);
        setSummary(null);

        try {
            const [validationResult, summaryResult] = await Promise.all([
                api.get(`/wps-export/${selectedRunId}/validate`) as Promise<WpsValidation>,
                api.get(`/wps-export/${selectedRunId}/summary`) as Promise<WpsSummary>,
            ]);
            setValidation(validationResult);
            setSummary(summaryResult);
        } catch (err: any) {
            console.error('Validation error:', err);
            setError(err.response?.data?.message || 'حدث خطأ في التحقق من جاهزية التصدير');
        } finally {
            setValidating(false);
        }
    };

    const handleDownload = async (type: 'csv' | 'sarie') => {
        if (!selectedRunId) return;

        setDownloading(type);
        try {
            const token = localStorage.getItem('access_token');
            const endpoint = type === 'csv' ? 'csv' : 'sarie';

            const response = await fetch(`${API_URL}/wps-export/${selectedRunId}/${endpoint}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('فشل في تنزيل الملف');
            }

            const blob = await response.blob();
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = type === 'csv' ? 'WPS_Export.csv' : 'SARIE_Export.txt';

            if (contentDisposition) {
                const match = contentDisposition.match(/filename\*?=(?:UTF-8'')?([^;]+)/);
                if (match) {
                    filename = decodeURIComponent(match[1].replace(/"/g, ''));
                }
            }

            // Create download link
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

        } catch (err: any) {
            console.error('Download error:', err);
            setError(err.message || 'حدث خطأ في تنزيل الملف');
        } finally {
            setDownloading(null);
        }
    };

    const handlePreview = async () => {
        if (!selectedRunId || !summary) return;

        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`${API_URL}/wps-export/${selectedRunId}/csv`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) throw new Error('فشل في قراءة الملف');

            const text = await response.text();
            setPreviewContent(text);
            setPreviewOpen(true);
        } catch (err) {
            console.error('Preview error:', err);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('ar-SA', {
            style: 'currency',
            currency: 'SAR',
        }).format(amount);
    };

    const formatPeriod = (period: PayrollPeriod) => {
        const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
            'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
        return `${months[period.month - 1]} ${period.year}`;
    };

    const getStatusLabel = (status: string) => {
        const labels: Record<string, { label: string; color: 'success' | 'warning' | 'info' | 'error' }> = {
            'DRAFT': { label: 'مسودة', color: 'warning' },
            'HR_APPROVED': { label: 'معتمد HR', color: 'info' },
            'FINANCE_APPROVED': { label: 'معتمد المالية', color: 'success' },
            'LOCKED': { label: 'مقفل', color: 'success' },
            'PAID': { label: 'مدفوع', color: 'success' },
        };
        return labels[status] || { label: status, color: 'warning' as const };
    };

    const selectedRun = payrollRuns.find(r => r.id === selectedRunId);

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box p={3}>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box>
                    <Typography variant="h5" fontWeight="bold" display="flex" alignItems="center" gap={1}>
                        <BankIcon color="primary" />
                        تصدير ملفات WPS وحماية الأجور
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mt={0.5}>
                        تصدير ملفات الرواتب للبنوك ونظام حماية الأجور
                    </Typography>
                </Box>
                <Tooltip title="تحديث">
                    <IconButton onClick={() => { fetchPayrollRuns(); fetchMissingBank(); }}>
                        <RefreshIcon />
                    </IconButton>
                </Tooltip>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {/* Missing Bank Warning */}
            {missingBank.length > 0 && (
                <Alert
                    severity="warning"
                    sx={{ mb: 3 }}
                    action={
                        <Button
                            color="inherit"
                            size="small"
                            startIcon={<AddIcon />}
                            onClick={() => navigate('/bank-accounts')}
                        >
                            إضافة حسابات
                        </Button>
                    }
                >
                    <strong>تنبيه:</strong> يوجد {missingBank.length} موظف نشط بدون حساب بنكي. لن يتم تضمينهم في ملف WPS.
                </Alert>
            )}

            <Grid container spacing={3}>
                {/* Select Payroll Run */}
                <Grid item xs={12} md={5}>
                    <Paper sx={{ p: 3, height: '100%' }}>
                        <Typography variant="h6" gutterBottom fontWeight="bold">
                            1. اختر مسير الرواتب
                        </Typography>

                        {payrollRuns.length === 0 ? (
                            <Alert severity="info" sx={{ mt: 2 }}>
                                <Typography variant="body2">
                                    لا توجد مسيرات رواتب معتمدة للتصدير.
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    يجب أن يكون المسير في حالة "معتمد" أو "مقفل" للتصدير.
                                </Typography>
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
                                                <Box display="flex" justifyContent="space-between" width="100%" alignItems="center">
                                                    <span>{formatPeriod(run.period)}</span>
                                                    <Chip
                                                        label={`${run._count?.payslips || 0} موظف`}
                                                        size="small"
                                                        variant="outlined"
                                                    />
                                                </Box>
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>

                                {selectedRun && (
                                    <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1, mb: 2 }}>
                                        <Typography variant="body2" color="text.secondary">
                                            <strong>الفترة:</strong> {formatPeriod(selectedRun.period)}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            <strong>عدد الموظفين:</strong> {selectedRun._count?.payslips || 0}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            <strong>الحالة:</strong>{' '}
                                            <Chip
                                                label={getStatusLabel(selectedRun.status).label}
                                                color={getStatusLabel(selectedRun.status).color}
                                                size="small"
                                            />
                                        </Typography>
                                    </Box>
                                )}

                                <Button
                                    variant="contained"
                                    onClick={handleValidate}
                                    disabled={!selectedRunId || validating}
                                    fullWidth
                                    size="large"
                                >
                                    {validating ? (
                                        <>
                                            <CircularProgress size={20} sx={{ mr: 1 }} />
                                            جاري الفحص...
                                        </>
                                    ) : (
                                        '2. فحص الجاهزية للتصدير'
                                    )}
                                </Button>
                            </>
                        )}
                    </Paper>
                </Grid>

                {/* Export Actions */}
                <Grid item xs={12} md={7}>
                    <Paper sx={{ p: 3, height: '100%' }}>
                        <Typography variant="h6" gutterBottom fontWeight="bold">
                            3. تصدير الملفات
                        </Typography>

                        {!validation ? (
                            <Box sx={{ textAlign: 'center', py: 4 }}>
                                <FileIcon sx={{ fontSize: 60, color: 'grey.300', mb: 2 }} />
                                <Typography color="text.secondary">
                                    اختر مسير الرواتب واضغط "فحص الجاهزية" للمتابعة
                                </Typography>
                            </Box>
                        ) : (
                            <>
                                {/* Validation Status */}
                                <Box display="flex" alignItems="center" gap={2} mb={3}>
                                    {validation.isReady && summary && summary.recordCount > 0 ? (
                                        <Chip
                                            icon={<CheckIcon />}
                                            label="جاهز للتصدير"
                                            color="success"
                                            size="medium"
                                        />
                                    ) : summary?.recordCount === 0 ? (
                                        <Chip
                                            icon={<WarningIcon />}
                                            label="لا يوجد موظفين للتصدير"
                                            color="error"
                                            size="medium"
                                        />
                                    ) : (
                                        <Chip
                                            icon={<WarningIcon />}
                                            label={`يوجد ${validation.issues?.length || 0} مشكلة`}
                                            color="warning"
                                            size="medium"
                                        />
                                    )}
                                </Box>

                                {/* Summary Stats */}
                                {summary && (
                                    <Grid container spacing={2} sx={{ mb: 3 }}>
                                        <Grid item xs={6}>
                                            <Card variant="outlined" sx={{ bgcolor: 'primary.50' }}>
                                                <CardContent>
                                                    <Typography color="text.secondary" variant="caption">
                                                        عدد الموظفين في الملف
                                                    </Typography>
                                                    <Typography variant="h4" fontWeight="bold" color="primary">
                                                        {summary.recordCount}
                                                    </Typography>
                                                </CardContent>
                                            </Card>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <Card variant="outlined" sx={{ bgcolor: 'success.50' }}>
                                                <CardContent>
                                                    <Typography color="text.secondary" variant="caption">
                                                        إجمالي المبلغ
                                                    </Typography>
                                                    <Typography variant="h4" fontWeight="bold" color="success.dark">
                                                        {formatCurrency(summary.totalAmount)}
                                                    </Typography>
                                                </CardContent>
                                            </Card>
                                        </Grid>
                                    </Grid>
                                )}

                                {/* Errors from summary */}
                                {summary && summary.errors && summary.errors.length > 0 && (
                                    <Alert severity="warning" sx={{ mb: 2 }}>
                                        <Typography variant="body2" fontWeight="bold" gutterBottom>
                                            موظفين لم يتم تضمينهم ({summary.errors.length}):
                                        </Typography>
                                        <Box component="ul" sx={{ m: 0, pl: 2, maxHeight: 100, overflow: 'auto' }}>
                                            {summary.errors.slice(0, 5).map((err, idx) => (
                                                <li key={idx}>
                                                    <Typography variant="caption">{err}</Typography>
                                                </li>
                                            ))}
                                            {summary.errors.length > 5 && (
                                                <li>
                                                    <Typography variant="caption">
                                                        ... و {summary.errors.length - 5} آخرين
                                                    </Typography>
                                                </li>
                                            )}
                                        </Box>
                                    </Alert>
                                )}

                                <Divider sx={{ my: 2 }} />

                                {/* Download Buttons */}
                                <Grid container spacing={2}>
                                    <Grid item xs={12} sm={6}>
                                        <Button
                                            variant="contained"
                                            color="primary"
                                            startIcon={downloading === 'csv' ? <CircularProgress size={20} color="inherit" /> : <DownloadIcon />}
                                            onClick={() => handleDownload('csv')}
                                            disabled={downloading !== null || summary?.recordCount === 0}
                                            fullWidth
                                            size="large"
                                        >
                                            تنزيل ملف WPS (CSV)
                                        </Button>
                                        <Typography variant="caption" color="text.secondary" display="block" textAlign="center" mt={0.5}>
                                            لنظام حماية الأجور
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Button
                                            variant="outlined"
                                            color="primary"
                                            startIcon={downloading === 'sarie' ? <CircularProgress size={20} color="inherit" /> : <DownloadIcon />}
                                            onClick={() => handleDownload('sarie')}
                                            disabled={downloading !== null || summary?.recordCount === 0}
                                            fullWidth
                                            size="large"
                                        >
                                            تنزيل ملف SARIE
                                        </Button>
                                        <Typography variant="caption" color="text.secondary" display="block" textAlign="center" mt={0.5}>
                                            لتحويل البنك
                                        </Typography>
                                    </Grid>
                                </Grid>

                                {summary && summary.recordCount > 0 && (
                                    <>
                                        <Box textAlign="center" mt={2}>
                                            <Button
                                                variant="text"
                                                size="small"
                                                onClick={handlePreview}
                                            >
                                                معاينة محتوى الملف
                                            </Button>
                                        </Box>

                                        {/* Create MUDAD Submission Button */}
                                        <Divider sx={{ my: 3 }} />
                                        <Alert severity="info" sx={{ mb: 2 }}>
                                            <Typography variant="body2" fontWeight="bold" gutterBottom>
                                                الخطوة التالية: إنشاء تقديم مُدد
                                            </Typography>
                                            <Typography variant="caption">
                                                بعد تصدير ملف WPS، يمكنك إنشاء تقديم مُدد للإبلاغ عن الأجور لوزارة الموارد البشرية
                                            </Typography>
                                        </Alert>
                                        <Button
                                            variant="contained"
                                            color="success"
                                            startIcon={<SendIcon />}
                                            onClick={() => setMudadDialogOpen(true)}
                                            fullWidth
                                            size="large"
                                        >
                                            إنشاء تقديم مُدد
                                        </Button>
                                    </>
                                )}
                            </>
                        )}
                    </Paper>
                </Grid>

                {/* Missing Bank Employees */}
                {missingBank.length > 0 && (
                    <Grid item xs={12}>
                        <Paper sx={{ p: 3 }}>
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                <Typography variant="h6" display="flex" alignItems="center" gap={1}>
                                    <PersonIcon color="warning" />
                                    موظفين بدون حساب بنكي ({missingBank.length})
                                </Typography>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<AddIcon />}
                                    onClick={() => navigate('/bank-accounts')}
                                >
                                    إدارة الحسابات البنكية
                                </Button>
                            </Box>
                            <TableContainer sx={{ maxHeight: 300 }}>
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>كود الموظف</TableCell>
                                            <TableCell>الاسم</TableCell>
                                            <TableCell>البريد الإلكتروني</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {missingBank.map((emp) => (
                                            <TableRow key={emp.id} hover>
                                                <TableCell>
                                                    <Chip label={emp.employeeCode} size="small" variant="outlined" />
                                                </TableCell>
                                                <TableCell>{emp.firstName} {emp.lastName}</TableCell>
                                                <TableCell>{emp.email || '-'}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>
                    </Grid>
                )}
            </Grid>

            {/* Preview Dialog */}
            <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>معاينة ملف WPS</DialogTitle>
                <DialogContent>
                    <Box
                        component="pre"
                        sx={{
                            bgcolor: 'grey.100',
                            p: 2,
                            borderRadius: 1,
                            overflow: 'auto',
                            fontSize: '0.85rem',
                            direction: 'ltr',
                            textAlign: 'left',
                        }}
                    >
                        {previewContent}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPreviewOpen(false)}>إغلاق</Button>
                    <Button variant="contained" onClick={() => handleDownload('csv')}>
                        تنزيل الملف
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Create MUDAD Submission Dialog */}
            <Dialog open={mudadDialogOpen} onClose={() => setMudadDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    <Box display="flex" alignItems="center" gap={1}>
                        <SendIcon color="success" />
                        إنشاء تقديم مُدد
                    </Box>
                </DialogTitle>
                <DialogContent>
                    {selectedRunId && payrollRuns.length > 0 && (() => {
                        const selectedRun = payrollRuns.find(r => r.id === selectedRunId);
                        return selectedRun ? (
                            <>
                                <Alert severity="info" sx={{ mb: 3 }}>
                                    سيتم إنشاء تقديم مُدد لدورة الرواتب التالية:
                                </Alert>
                                <Paper sx={{ p: 3, bgcolor: 'grey.50' }}>
                                    <Grid container spacing={2}>
                                        <Grid item xs={12}>
                                            <Typography variant="body2" color="text.secondary">
                                                الفترة
                                            </Typography>
                                            <Typography variant="h6" fontWeight="bold">
                                                {getMonthName(selectedRun.period.month)} {selectedRun.period.year}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <Typography variant="body2" color="text.secondary">
                                                تاريخ البداية
                                            </Typography>
                                            <Typography variant="body1">
                                                {new Date(selectedRun.period.startDate).toLocaleDateString('ar-SA')}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <Typography variant="body2" color="text.secondary">
                                                تاريخ النهاية
                                            </Typography>
                                            <Typography variant="body1">
                                                {new Date(selectedRun.period.endDate).toLocaleDateString('ar-SA')}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <Typography variant="body2" color="text.secondary">
                                                حالة الدورة
                                            </Typography>
                                            <Chip label={selectedRun.status} size="small" color="success" />
                                        </Grid>
                                        {selectedRun._count?.payslips && (
                                            <Grid item xs={6}>
                                                <Typography variant="body2" color="text.secondary">
                                                    عدد الموظفين
                                                </Typography>
                                                <Typography variant="body1" fontWeight="bold">
                                                    {selectedRun._count.payslips}
                                                </Typography>
                                            </Grid>
                                        )}
                                    </Grid>
                                </Paper>
                                <Alert severity="warning" sx={{ mt: 2 }}>
                                    <Typography variant="caption">
                                        تأكد من تصدير ملف WPS قبل إنشاء التقديم
                                    </Typography>
                                </Alert>
                            </>
                        ) : null;
                    })()}
                    {error && (
                        <Alert severity="error" sx={{ mt: 2 }}>
                            {error}
                        </Alert>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setMudadDialogOpen(false)}>إلغاء</Button>
                    <Button
                        variant="contained"
                        color="success"
                        disabled={!selectedRunId || createMudadMutation.isPending}
                        onClick={() => {
                            const selectedRun = payrollRuns.find(r => r.id === selectedRunId);
                            if (selectedRun) {
                                createMudadMutation.mutate({
                                    payrollRunId: selectedRun.id,
                                    month: selectedRun.period.month,
                                    year: selectedRun.period.year,
                                });
                            }
                        }}
                    >
                        {createMudadMutation.isPending ? 'جارٍ الإنشاء...' : 'إنشاء التقديم'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
