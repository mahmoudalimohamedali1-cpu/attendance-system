import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
    Box,
    Grid,
    Typography,
    TextField,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    InputAdornment,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    LinearProgress,
    Avatar,
    List,
    ListItem,
    ListItemText,
    Alert,
    Card,
    CardContent,
} from '@mui/material';
import {
    Search,
    Download,
    Visibility,
    Close,
    Person,
    Receipt,
    CalendarMonth,
    Print,
    People,
    AccountBalance,
    TrendingUp,
    TrendingDown,
    MonetizationOn,
} from '@mui/icons-material';
import { api } from '@/services/api.service';

interface PayslipLine {
    id: string;
    componentCode: string;
    componentName: string;
    type: 'EARNING' | 'DEDUCTION';
    amount: number;
    isFixed: boolean;
    sourceType?: string;
    component?: {
        code: string;
        nameAr: string;
        nameEn: string;
    };
}

interface Payslip {
    id: string;
    userId: string;
    user?: {
        id?: string;
        firstName: string;
        lastName: string;
        employeeCode: string;
        jobTitle?: string;
        department?: { name: string };
    };
    payrollRunId: string;
    payrollRun?: {
        month: number;
        year: number;
        status: string;
    };
    period?: {
        month: number;
        year: number;
    };
    run?: {
        id: string;
        status: string;
    };
    baseSalary: number;
    grossSalary: number;
    totalDeductions: number;
    netSalary: number;
    gosiEmployee?: number;
    gosiEmployer?: number;
    lines: PayslipLine[];
    createdAt: string;
}

interface PayrollRun {
    id: string;
    status: string;
    periodId: string;
    period: {
        id: string;
        month: number;
        year: number;
    };
}

export default function PayslipsPage() {
    const [searchParams] = useSearchParams();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRun, setSelectedRun] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);

    // Fetch payroll runs
    const { data: payrollRuns } = useQuery<PayrollRun[]>({
        queryKey: ['payroll-runs-list'],
        queryFn: async () => {
            const response = await api.get('/payroll-runs?limit=24');
            return (response as any)?.data || response || [];
        },
    });

    // Auto-select run based on periodId URL param
    useEffect(() => {
        const periodId = searchParams.get('periodId');
        if (periodId && payrollRuns && !selectedRun) {
            const matchingRun = payrollRuns.find(run => run.periodId === periodId || run.period?.id === periodId);
            if (matchingRun) {
                setSelectedRun(matchingRun.id);
            }
        }
    }, [searchParams, payrollRuns, selectedRun]);

    // Fetch payslips
    const { data: payslips, isLoading } = useQuery<Payslip[]>({
        queryKey: ['payslips', selectedRun, searchTerm],
        queryFn: async () => {
            let url = '/payslips?';
            if (selectedRun) url += `payrollRunId=${selectedRun}&`;
            if (searchTerm) url += `search=${searchTerm}&`;
            const response = await api.get(url);
            return (response as any)?.data || response || [];
        },
        enabled: !!selectedRun,
    });

    // Get selected run details
    const selectedRunDetails = useMemo(() => {
        return payrollRuns?.find(r => r.id === selectedRun);
    }, [payrollRuns, selectedRun]);

    // Calculate summary
    const summary = useMemo(() => {
        if (!payslips || payslips.length === 0) {
            return { count: 0, gross: 0, deductions: 0, net: 0, gosiTotal: 0 };
        }
        return {
            count: payslips.length,
            gross: payslips.reduce((sum, p) => sum + (p.grossSalary || 0), 0),
            deductions: payslips.reduce((sum, p) => sum + (p.totalDeductions || 0), 0),
            net: payslips.reduce((sum, p) => sum + (p.netSalary || 0), 0),
            gosiTotal: payslips.reduce((sum, p) => sum + (p.gosiEmployee || 0) + (p.gosiEmployer || 0), 0),
        };
    }, [payslips]);

    const handleViewPayslip = (payslip: Payslip) => {
        setSelectedPayslip(payslip);
        setDialogOpen(true);
    };

    const handleDownloadPdf = async (payslipId: string) => {
        try {
            const response = await api.get(`/payslips/${payslipId}/pdf`, { responseType: 'blob' });
            const blob = new Blob([response as any], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `payslip-${payslipId}.pdf`;
            link.click();
        } catch (error) {
            console.error('Failed to download PDF:', error);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('ar-SA', {
            style: 'currency',
            currency: 'SAR',
            minimumFractionDigits: 2,
        }).format(amount || 0);
    };

    const getMonthName = (month: number) => {
        const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
            'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
        return months[(month || 1) - 1] || '';
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'LOCKED': return 'success';
            case 'CALCULATED': return 'info';
            case 'DRAFT': return 'warning';
            default: return 'default';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'LOCKED': return 'مقفلة 🔒';
            case 'CALCULATED': return 'محسوبة';
            case 'DRAFT': return 'مسودة';
            default: return status;
        }
    };

    return (
        <Box>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                <Box>
                    <Typography variant="h4" fontWeight="bold" gutterBottom>
                        قسائم الرواتب
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        عرض وتحميل قسائم رواتب الموظفين
                    </Typography>
                </Box>
                {selectedRun && payslips && payslips.length > 0 && (
                    <Button
                        variant="contained"
                        startIcon={<Download />}
                        onClick={async () => {
                            try {
                                const response = await api.get(`/payroll-runs/${selectedRun}/excel`, { responseType: 'blob' });
                                const blob = new Blob([response as any], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                                const url = window.URL.createObjectURL(blob);
                                const link = document.createElement('a');
                                link.href = url;
                                link.download = `payslips-${selectedRun}.xlsx`;
                                link.click();
                            } catch (error) {
                                console.error('Failed to export:', error);
                            }
                        }}
                    >
                        تصدير الكل Excel
                    </Button>
                )}
            </Box>

            {/* Filters */}
            <Paper elevation={0} sx={{ p: 3, mb: 4, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <Grid container spacing={3} alignItems="center">
                    <Grid item xs={12} md={3}>
                        <FormControl fullWidth required>
                            <InputLabel>دورة الرواتب *</InputLabel>
                            <Select
                                value={selectedRun}
                                onChange={(e) => setSelectedRun(e.target.value)}
                                label="دورة الرواتب *"
                            >
                                <MenuItem value="">
                                    <em>اختر دورة الرواتب</em>
                                </MenuItem>
                                {payrollRuns?.map((run) => (
                                    <MenuItem key={run.id} value={run.id}>
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <span>{getMonthName(run.period?.month)} {run.period?.year}</span>
                                            <Chip
                                                label={getStatusLabel(run.status)}
                                                size="small"
                                                color={getStatusColor(run.status) as any}
                                            />
                                        </Box>
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <TextField
                            fullWidth
                            placeholder="بحث بالاسم أو الكود أو الإيميل..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Search />
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <FormControl fullWidth>
                            <InputLabel>حالة الدورة</InputLabel>
                            <Select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                label="حالة الدورة"
                            >
                                <MenuItem value="">الكل</MenuItem>
                                <MenuItem value="DRAFT">مسودة</MenuItem>
                                <MenuItem value="CALCULATED">محسوبة</MenuItem>
                                <MenuItem value="LOCKED">مقفلة</MenuItem>
                                <MenuItem value="PAID">مدفوعة</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={3}>
                        {selectedRunDetails && (
                            <Chip
                                icon={<CalendarMonth />}
                                label={`${getMonthName(selectedRunDetails.period?.month)} ${selectedRunDetails.period?.year}`}
                                color="primary"
                                variant="outlined"
                            />
                        )}
                    </Grid>
                </Grid>
            </Paper>

            {/* No Selection Message */}
            {!selectedRun && (
                <Alert severity="info" sx={{ mb: 4 }} icon={<Receipt />}>
                    <Typography fontWeight="bold">اختر دورة رواتب لعرض القسائم</Typography>
                    <Typography variant="body2">يرجى اختيار دورة الرواتب من القائمة أعلاه لعرض قسائم الموظفين</Typography>
                </Alert>
            )}

            {/* Loading */}
            {isLoading && <LinearProgress sx={{ mb: 3 }} />}

            {/* Summary Cards */}
            {selectedRun && payslips && payslips.length > 0 && (
                <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid item xs={12} sm={6} md={2.4}>
                        <Card sx={{ borderRadius: 3, bgcolor: 'primary.50', border: '1px solid', borderColor: 'primary.200' }}>
                            <CardContent>
                                <Box display="flex" alignItems="center" gap={1} mb={1}>
                                    <People color="primary" />
                                    <Typography variant="body2" color="text.secondary">عدد الموظفين</Typography>
                                </Box>
                                <Typography variant="h4" fontWeight="bold" color="primary.main">
                                    {summary.count}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={2.4}>
                        <Card sx={{ borderRadius: 3, bgcolor: 'success.50', border: '1px solid', borderColor: 'success.200' }}>
                            <CardContent>
                                <Box display="flex" alignItems="center" gap={1} mb={1}>
                                    <TrendingUp color="success" />
                                    <Typography variant="body2" color="text.secondary">إجمالي المستحقات</Typography>
                                </Box>
                                <Typography variant="h5" fontWeight="bold" color="success.main">
                                    {formatCurrency(summary.gross)}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={2.4}>
                        <Card sx={{ borderRadius: 3, bgcolor: 'error.50', border: '1px solid', borderColor: 'error.200' }}>
                            <CardContent>
                                <Box display="flex" alignItems="center" gap={1} mb={1}>
                                    <TrendingDown color="error" />
                                    <Typography variant="body2" color="text.secondary">إجمالي الخصومات</Typography>
                                </Box>
                                <Typography variant="h5" fontWeight="bold" color="error.main">
                                    {formatCurrency(summary.deductions)}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={2.4}>
                        <Card sx={{ borderRadius: 3, bgcolor: 'info.50', border: '1px solid', borderColor: 'info.200' }}>
                            <CardContent>
                                <Box display="flex" alignItems="center" gap={1} mb={1}>
                                    <MonetizationOn color="info" />
                                    <Typography variant="body2" color="text.secondary">صافي الرواتب</Typography>
                                </Box>
                                <Typography variant="h5" fontWeight="bold" color="info.main">
                                    {formatCurrency(summary.net)}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={2.4}>
                        <Card sx={{ borderRadius: 3, bgcolor: 'warning.50', border: '1px solid', borderColor: 'warning.200' }}>
                            <CardContent>
                                <Box display="flex" alignItems="center" gap={1} mb={1}>
                                    <AccountBalance color="warning" />
                                    <Typography variant="body2" color="text.secondary">إجمالي GOSI</Typography>
                                </Box>
                                <Typography variant="h5" fontWeight="bold" color="warning.main">
                                    {formatCurrency(summary.gosiTotal)}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            )}

            {/* Payslips Table */}
            {selectedRun && payslips && payslips.length > 0 && (
                <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
                    <Table>
                        <TableHead sx={{ bgcolor: 'grey.100' }}>
                            <TableRow>
                                <TableCell>الموظف</TableCell>
                                <TableCell>الكود</TableCell>
                                <TableCell>القسم</TableCell>
                                <TableCell align="right">الأساسي</TableCell>
                                <TableCell align="right">المستحقات</TableCell>
                                <TableCell align="right">الخصومات</TableCell>
                                <TableCell align="right">GOSI</TableCell>
                                <TableCell align="right">الصافي</TableCell>
                                <TableCell align="center">الإجراءات</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {payslips.map((payslip) => (
                                <TableRow key={payslip.id} hover>
                                    <TableCell>
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                                                {payslip.user?.firstName?.[0] || '?'}
                                            </Avatar>
                                            <Typography fontWeight="medium">
                                                {payslip.user?.firstName || '-'} {payslip.user?.lastName || ''}
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Chip label={payslip.user?.employeeCode || '-'} size="small" variant="outlined" />
                                    </TableCell>
                                    <TableCell>{payslip.user?.department?.name || '-'}</TableCell>
                                    <TableCell align="right">{formatCurrency(payslip.baseSalary)}</TableCell>
                                    <TableCell align="right">
                                        <Typography color="success.main">
                                            +{formatCurrency(payslip.grossSalary)}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                        <Typography color="error.main">
                                            -{formatCurrency(payslip.totalDeductions)}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                        <Typography color="warning.main" variant="body2">
                                            {formatCurrency((payslip.gosiEmployee || 0) + (payslip.gosiEmployer || 0))}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                        <Typography fontWeight="bold" color="primary.main">
                                            {formatCurrency(payslip.netSalary)}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="center">
                                        <IconButton
                                            size="small"
                                            color="primary"
                                            onClick={() => handleViewPayslip(payslip)}
                                            title="عرض التفاصيل"
                                        >
                                            <Visibility />
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            color="secondary"
                                            onClick={() => handleDownloadPdf(payslip.id)}
                                            title="تحميل PDF"
                                        >
                                            <Download />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Empty State */}
            {selectedRun && payslips && payslips.length === 0 && !isLoading && (
                <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3 }}>
                    <Receipt sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">
                        لا توجد قسائم رواتب لهذه الدورة
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mt={1}>
                        يرجى التأكد من حساب الرواتب لهذه الفترة أولاً
                    </Typography>
                </Paper>
            )}

            {/* Payslip Detail Dialog */}
            <Dialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                maxWidth="md"
                fullWidth
            >
                {selectedPayslip && (
                    <>
                        <DialogTitle>
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Box display="flex" alignItems="center" gap={2}>
                                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                                        {selectedPayslip.user?.firstName?.[0] || '?'}
                                    </Avatar>
                                    <Box>
                                        <Typography variant="h6">
                                            {selectedPayslip.user?.firstName || '-'} {selectedPayslip.user?.lastName || ''}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {selectedPayslip.user?.employeeCode || '-'} • {selectedPayslip.user?.jobTitle || '-'}
                                        </Typography>
                                    </Box>
                                </Box>
                                <IconButton onClick={() => setDialogOpen(false)}>
                                    <Close />
                                </IconButton>
                            </Box>
                        </DialogTitle>
                        <DialogContent dividers>
                            {/* Period Info */}
                            <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2 }}>
                                <Grid container spacing={2}>
                                    <Grid item xs={4}>
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <CalendarMonth color="primary" />
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">الفترة</Typography>
                                                <Typography fontWeight="bold">
                                                    {getMonthName(selectedPayslip.period?.month || selectedPayslip.payrollRun?.month || 1)} {selectedPayslip.period?.year || selectedPayslip.payrollRun?.year || ''}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={4}>
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <Person color="primary" />
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">القسم</Typography>
                                                <Typography fontWeight="bold">
                                                    {selectedPayslip.user?.department?.name || '-'}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={4}>
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <Receipt color="primary" />
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">الحالة</Typography>
                                                <Chip
                                                    label={selectedPayslip.run?.status === 'LOCKED' || selectedPayslip.payrollRun?.status === 'LOCKED' ? 'مغلقة' : 'مفتوحة'}
                                                    size="small"
                                                    color={selectedPayslip.run?.status === 'LOCKED' || selectedPayslip.payrollRun?.status === 'LOCKED' ? 'success' : 'warning'}
                                                />
                                            </Box>
                                        </Box>
                                    </Grid>
                                </Grid>
                            </Paper>

                            {/* Earnings */}
                            <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ color: 'success.main' }}>
                                الاستحقاقات
                            </Typography>
                            <Paper variant="outlined" sx={{ mb: 3, borderRadius: 2 }}>
                                <List disablePadding>
                                    <ListItem sx={{ bgcolor: 'grey.50' }}>
                                        <ListItemText primary="الراتب الأساسي" />
                                        <Typography fontWeight="bold">{formatCurrency(selectedPayslip.baseSalary)}</Typography>
                                    </ListItem>
                                    {selectedPayslip.lines?.filter(l => l.type === 'EARNING').map((line) => (
                                        <ListItem key={line.id} divider>
                                            <ListItemText
                                                primary={line.component?.nameAr || line.componentName || line.componentCode}
                                                secondary={
                                                    <Box component="span" display="flex" gap={1} alignItems="center">
                                                        <span>{line.component?.code || line.componentCode}</span>
                                                        {line.sourceType && (
                                                            <Chip label={line.sourceType} size="small" variant="outlined" />
                                                        )}
                                                    </Box>
                                                }
                                            />
                                            <Typography color="success.main">+{formatCurrency(line.amount)}</Typography>
                                        </ListItem>
                                    ))}
                                    <ListItem sx={{ bgcolor: 'success.50' }}>
                                        <ListItemText primary="إجمالي الاستحقاقات" primaryTypographyProps={{ fontWeight: 'bold' }} />
                                        <Typography fontWeight="bold" color="success.main">
                                            {formatCurrency(selectedPayslip.grossSalary)}
                                        </Typography>
                                    </ListItem>
                                </List>
                            </Paper>

                            {/* Deductions */}
                            <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ color: 'error.main' }}>
                                الخصومات
                            </Typography>
                            <Paper variant="outlined" sx={{ mb: 3, borderRadius: 2 }}>
                                <List disablePadding>
                                    {selectedPayslip.lines?.filter(l => l.type === 'DEDUCTION').map((line) => (
                                        <ListItem key={line.id} divider>
                                            <ListItemText
                                                primary={line.component?.nameAr || line.componentName || line.componentCode}
                                                secondary={
                                                    <Box component="span" display="flex" gap={1} alignItems="center">
                                                        <span>{line.component?.code || line.componentCode}</span>
                                                        {line.sourceType && (
                                                            <Chip label={line.sourceType} size="small" variant="outlined" />
                                                        )}
                                                    </Box>
                                                }
                                            />
                                            <Typography color="error.main">-{formatCurrency(line.amount)}</Typography>
                                        </ListItem>
                                    ))}
                                    <ListItem divider>
                                        <ListItemText
                                            primary="حصة الموظف من التأمينات"
                                            secondary={
                                                <Box component="span" display="flex" gap={1} alignItems="center">
                                                    <span>GOSI_EMPLOYEE</span>
                                                    <Chip label="STATUTORY" size="small" variant="outlined" />
                                                </Box>
                                            }
                                        />
                                        <Typography color="error.main">-{formatCurrency(selectedPayslip.gosiEmployee || 0)}</Typography>
                                    </ListItem>
                                    <ListItem sx={{ bgcolor: 'error.50' }}>
                                        <ListItemText primary="إجمالي الخصومات" primaryTypographyProps={{ fontWeight: 'bold' }} />
                                        <Typography fontWeight="bold" color="error.main">
                                            {formatCurrency(selectedPayslip.totalDeductions)}
                                        </Typography>
                                    </ListItem>
                                </List>
                            </Paper>

                            {/* GOSI Info */}
                            <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2, bgcolor: 'warning.50' }}>
                                <Grid container spacing={2}>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="text.secondary">حصة الموظف GOSI</Typography>
                                        <Typography fontWeight="bold" color="warning.main">
                                            {formatCurrency(selectedPayslip.gosiEmployee || 0)}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="text.secondary">حصة صاحب العمل GOSI</Typography>
                                        <Typography fontWeight="bold" color="warning.main">
                                            {formatCurrency(selectedPayslip.gosiEmployer || 0)}
                                        </Typography>
                                    </Grid>
                                </Grid>
                            </Paper>

                            {/* Net Salary */}
                            <Paper
                                sx={{
                                    p: 3,
                                    borderRadius: 2,
                                    bgcolor: 'primary.main',
                                    color: 'white',
                                    textAlign: 'center'
                                }}
                            >
                                <Typography variant="subtitle1">صافي الراتب</Typography>
                                <Typography variant="h3" fontWeight="bold">
                                    {formatCurrency(selectedPayslip.netSalary)}
                                </Typography>
                            </Paper>
                        </DialogContent>
                        <DialogActions>
                            <Button
                                startIcon={<Print />}
                                onClick={() => window.print()}
                            >
                                طباعة
                            </Button>
                            <Button
                                variant="contained"
                                startIcon={<Download />}
                                onClick={() => handleDownloadPdf(selectedPayslip.id)}
                            >
                                تحميل PDF
                            </Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>
        </Box>
    );
}
