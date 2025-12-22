import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
} from '@mui/icons-material';
import { api } from '@/services/api.service';

interface PayslipLine {
    id: string;
    componentCode: string;
    componentName: string;
    type: 'EARNING' | 'DEDUCTION';
    amount: number;
    isFixed: boolean;
}

interface Payslip {
    id: string;
    userId: string;
    user: {
        firstName: string;
        lastName: string;
        employeeCode: string;
        jobTitle?: string;
        department?: { name: string };
    };
    payrollRunId: string;
    payrollRun: {
        month: number;
        year: number;
        status: string;
    };
    basicSalary: number;
    totalEarnings: number;
    totalDeductions: number;
    netSalary: number;
    gosiEmployee: number;
    gosiEmployer: number;
    lines: PayslipLine[];
    createdAt: string;
}

interface PayrollRun {
    id: string;
    status: string;
    period: {
        month: number;
        year: number;
    };
}

export default function PayslipsPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRun, setSelectedRun] = useState<string>('');
    const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);

    // Fetch payroll runs
    const { data: payrollRuns } = useQuery<PayrollRun[]>({
        queryKey: ['payroll-runs-list'],
        queryFn: async () => {
            const response = await api.get('/payroll-runs?limit=12');
            return (response as any)?.data || response || [];
        },
    });

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
        }).format(amount);
    };

    const getMonthName = (month: number) => {
        const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
            'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
        return months[month - 1] || '';
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
                                const response = await api.get(`/payroll-runs/${selectedRun}/export/excel`, { responseType: 'blob' });
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
                    <Grid item xs={12} md={4}>
                        <FormControl fullWidth>
                            <InputLabel>دورة الرواتب</InputLabel>
                            <Select
                                value={selectedRun}
                                onChange={(e) => setSelectedRun(e.target.value)}
                                label="دورة الرواتب"
                            >
                                <MenuItem value="">
                                    <em>اختر دورة الرواتب</em>
                                </MenuItem>
                                {payrollRuns?.map((run) => (
                                    <MenuItem key={run.id} value={run.id}>
                                        {getMonthName(run.period?.month)} {run.period?.year} - {run.status === 'LOCKED' ? '🔒' : '📝'}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <TextField
                            fullWidth
                            placeholder="بحث بالاسم أو الكود..."
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
                    <Grid item xs={12} md={4}>
                        <Typography variant="body2" color="text.secondary">
                            {payslips?.length || 0} قسيمة راتب
                        </Typography>
                    </Grid>
                </Grid>
            </Paper>

            {/* No Selection Message */}
            {!selectedRun && (
                <Alert severity="info" sx={{ mb: 4 }}>
                    اختر دورة الرواتب لعرض القسائم
                </Alert>
            )}

            {/* Loading */}
            {isLoading && <LinearProgress sx={{ mb: 3 }} />}

            {/* Payslips Table */}
            {selectedRun && payslips && payslips.length > 0 && (
                <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
                    <Table>
                        <TableHead sx={{ bgcolor: 'grey.100' }}>
                            <TableRow>
                                <TableCell>الموظف</TableCell>
                                <TableCell>الكود</TableCell>
                                <TableCell>القسم</TableCell>
                                <TableCell align="right">الراتب الأساسي</TableCell>
                                <TableCell align="right">الاستحقاقات</TableCell>
                                <TableCell align="right">الخصومات</TableCell>
                                <TableCell align="right">صافي الراتب</TableCell>
                                <TableCell align="center">الإجراءات</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {payslips.map((payslip) => (
                                <TableRow key={payslip.id} hover>
                                    <TableCell>
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                                                {payslip.user.firstName?.[0]}
                                            </Avatar>
                                            <Typography fontWeight="medium">
                                                {payslip.user.firstName} {payslip.user.lastName}
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Chip label={payslip.user.employeeCode} size="small" variant="outlined" />
                                    </TableCell>
                                    <TableCell>{payslip.user.department?.name || '-'}</TableCell>
                                    <TableCell align="right">{formatCurrency(payslip.basicSalary)}</TableCell>
                                    <TableCell align="right">
                                        <Typography color="success.main">
                                            +{formatCurrency(payslip.totalEarnings)}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                        <Typography color="error.main">
                                            -{formatCurrency(payslip.totalDeductions)}
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
                                        >
                                            <Visibility />
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            color="secondary"
                                            onClick={() => handleDownloadPdf(payslip.id)}
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
                                        {selectedPayslip.user.firstName?.[0]}
                                    </Avatar>
                                    <Box>
                                        <Typography variant="h6">
                                            {selectedPayslip.user.firstName} {selectedPayslip.user.lastName}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {selectedPayslip.user.employeeCode} • {selectedPayslip.user.jobTitle}
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
                                                    {getMonthName(selectedPayslip.payrollRun.month)} {selectedPayslip.payrollRun.year}
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
                                                    {selectedPayslip.user.department?.name || '-'}
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
                                                    label={selectedPayslip.payrollRun.status === 'LOCKED' ? 'مغلقة' : 'مفتوحة'}
                                                    size="small"
                                                    color={selectedPayslip.payrollRun.status === 'LOCKED' ? 'success' : 'warning'}
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
                                        <Typography fontWeight="bold">{formatCurrency(selectedPayslip.basicSalary)}</Typography>
                                    </ListItem>
                                    {selectedPayslip.lines?.filter(l => l.type === 'EARNING').map((line) => (
                                        <ListItem key={line.id} divider>
                                            <ListItemText
                                                primary={line.componentName}
                                                secondary={line.componentCode}
                                            />
                                            <Typography color="success.main">+{formatCurrency(line.amount)}</Typography>
                                        </ListItem>
                                    ))}
                                    <ListItem sx={{ bgcolor: 'success.50' }}>
                                        <ListItemText primary="إجمالي الاستحقاقات" primaryTypographyProps={{ fontWeight: 'bold' }} />
                                        <Typography fontWeight="bold" color="success.main">
                                            {formatCurrency(selectedPayslip.totalEarnings)}
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
                                                primary={line.componentName}
                                                secondary={line.componentCode}
                                            />
                                            <Typography color="error.main">-{formatCurrency(line.amount)}</Typography>
                                        </ListItem>
                                    ))}
                                    <ListItem divider>
                                        <ListItemText primary="حصة الموظف من التأمينات" secondary="GOSI Employee" />
                                        <Typography color="error.main">-{formatCurrency(selectedPayslip.gosiEmployee)}</Typography>
                                    </ListItem>
                                    <ListItem sx={{ bgcolor: 'error.50' }}>
                                        <ListItemText primary="إجمالي الخصومات" primaryTypographyProps={{ fontWeight: 'bold' }} />
                                        <Typography fontWeight="bold" color="error.main">
                                            {formatCurrency(selectedPayslip.totalDeductions)}
                                        </Typography>
                                    </ListItem>
                                </List>
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
