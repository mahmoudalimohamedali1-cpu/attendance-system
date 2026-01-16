import React, { useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    Grid,
    Typography,
    CircularProgress,
    Alert,
    Button,
    Paper,
    Divider,
    Chip,
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
    Tab,
    Tabs,
    LinearProgress,
    IconButton,
    Tooltip,
} from '@mui/material';
import {
    Receipt as ReceiptIcon,
    Download as DownloadIcon,
    Visibility as ViewIcon,
    BeachAccess as LeaveIcon,
    TrendingUp as TrendingUpIcon,
    Description as DocumentIcon,
    CalendarMonth as CalendarIcon,
    Close as CloseIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { enterprisePayrollService, PayslipDetails, PayslipSummary, LeaveBalance } from '../../services/enterprise-payroll.service';

// Tab Panel Component
interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
    <div hidden={value !== index} style={{ paddingTop: 16 }}>
        {value === index && children}
    </div>
);

// Payslip Card Component
interface PayslipCardProps {
    payslip: PayslipSummary;
    onView: (id: string) => void;
}

const PayslipCard: React.FC<PayslipCardProps> = ({ payslip, onView }) => (
    <Card
        sx={{
            cursor: 'pointer',
            transition: 'all 0.2s',
            '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 },
        }}
        onClick={() => onView(payslip.id)}
    >
        <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                <Box>
                    <Typography variant="h6" fontWeight="bold">
                        {payslip.periodName}
                    </Typography>
                    <Chip
                        size="small"
                        label={payslip.status === 'PAID' ? 'مدفوع' : payslip.status === 'PENDING' ? 'معلق' : payslip.status}
                        color={payslip.status === 'PAID' ? 'success' : 'warning'}
                        sx={{ mt: 1 }}
                    />
                </Box>
                <Box textAlign="right">
                    <Typography variant="h5" fontWeight="bold" color="primary">
                        {payslip.netSalary.toLocaleString()} ر.س
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        صافي الراتب
                    </Typography>
                </Box>
            </Box>
            <Divider sx={{ my: 2 }} />
            <Grid container spacing={2}>
                <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">
                        الإجمالي
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                        {payslip.grossSalary.toLocaleString()} ر.س
                    </Typography>
                </Grid>
                <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">
                        الخصومات
                    </Typography>
                    <Typography variant="body2" fontWeight="medium" color="error">
                        -{payslip.totalDeductions.toLocaleString()} ر.س
                    </Typography>
                </Grid>
                <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">
                        تاريخ الدفع
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                        {payslip.paidDate ? new Date(payslip.paidDate).toLocaleDateString('ar-SA') : '-'}
                    </Typography>
                </Grid>
            </Grid>
        </CardContent>
    </Card>
);

// Leave Balance Card
interface LeaveBalanceCardProps {
    balance: LeaveBalance;
}

const LeaveBalanceCard: React.FC<LeaveBalanceCardProps> = ({ balance }) => {
    const usedPercent = balance.entitled > 0 ? (balance.used / balance.entitled) * 100 : 0;
    const pendingPercent = balance.entitled > 0 ? (balance.pending / balance.entitled) * 100 : 0;

    return (
        <Card>
            <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Box>
                        <Typography variant="subtitle1" fontWeight="bold">
                            {balance.typeNameAr}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {balance.typeName}
                        </Typography>
                    </Box>
                    <Chip
                        label={`${balance.remaining} يوم متبقي`}
                        color={balance.remaining > 5 ? 'success' : balance.remaining > 0 ? 'warning' : 'error'}
                        size="small"
                    />
                </Box>
                <Box mb={1}>
                    <Box display="flex" justifyContent="space-between" mb={0.5}>
                        <Typography variant="caption">مستخدم: {balance.used} يوم</Typography>
                        <Typography variant="caption">المستحق: {balance.entitled} يوم</Typography>
                    </Box>
                    <Box sx={{ position: 'relative', height: 8, borderRadius: 4, bgcolor: 'grey.200' }}>
                        <Box
                            sx={{
                                position: 'absolute',
                                left: 0,
                                top: 0,
                                height: '100%',
                                width: `${usedPercent}%`,
                                bgcolor: 'error.main',
                                borderRadius: 4,
                            }}
                        />
                        <Box
                            sx={{
                                position: 'absolute',
                                left: `${usedPercent}%`,
                                top: 0,
                                height: '100%',
                                width: `${pendingPercent}%`,
                                bgcolor: 'warning.main',
                                borderRadius: 4,
                            }}
                        />
                    </Box>
                </Box>
                {balance.pending > 0 && (
                    <Typography variant="caption" color="warning.main">
                        {balance.pending} يوم طلب معلق
                    </Typography>
                )}
                {balance.carryOver && (
                    <Typography variant="caption" display="block" color="text.secondary">
                        مرحل: {balance.carryOver} يوم
                    </Typography>
                )}
            </CardContent>
        </Card>
    );
};

// Payslip Detail Dialog
interface PayslipDialogProps {
    open: boolean;
    onClose: () => void;
    payslipId: string | null;
}

const PayslipDialog: React.FC<PayslipDialogProps> = ({ open, onClose, payslipId }) => {
    const { data: details, isLoading } = useQuery({
        queryKey: ['payslip-details', payslipId],
        queryFn: () => enterprisePayrollService.getPayslipDetails(payslipId!),
        enabled: !!payslipId && open,
    });

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">تفاصيل قسيمة الراتب</Typography>
                    <IconButton onClick={onClose} size="small">
                        <CloseIcon />
                    </IconButton>
                </Box>
            </DialogTitle>
            <DialogContent dividers>
                {isLoading ? (
                    <Box display="flex" justifyContent="center" p={4}>
                        <CircularProgress />
                    </Box>
                ) : details ? (
                    <Box>
                        {/* Header Info */}
                        <Grid container spacing={2} mb={3}>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="body2" color="text.secondary">
                                    اسم الموظف
                                </Typography>
                                <Typography variant="body1" fontWeight="bold">
                                    {details.employeeName}
                                </Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="body2" color="text.secondary">
                                    القسم
                                </Typography>
                                <Typography variant="body1" fontWeight="bold">
                                    {details.department || '-'}
                                </Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="body2" color="text.secondary">
                                    الفترة
                                </Typography>
                                <Typography variant="body1" fontWeight="bold">
                                    {details.month}/{details.year}
                                </Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="body2" color="text.secondary">
                                    تاريخ الدفع
                                </Typography>
                                <Typography variant="body1" fontWeight="bold">
                                    {details.paidDate ? new Date(details.paidDate).toLocaleDateString('ar-SA') : 'لم يُدفع بعد'}
                                </Typography>
                            </Grid>
                        </Grid>

                        <Divider sx={{ mb: 3 }} />

                        {/* Earnings */}
                        <Typography variant="subtitle1" fontWeight="bold" color="success.main" mb={2}>
                            الاستحقاقات
                        </Typography>
                        <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>البند</TableCell>
                                        <TableCell align="right">المبلغ</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {details.earnings?.map((item: any, idx: number) => (
                                        <TableRow key={idx}>
                                            <TableCell>{item.nameAr || item.name}</TableCell>
                                            <TableCell align="right">{item.amount.toLocaleString()} ر.س</TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow sx={{ bgcolor: 'success.light' }}>
                                        <TableCell><strong>إجمالي الاستحقاقات</strong></TableCell>
                                        <TableCell align="right"><strong>{details.grossSalary.toLocaleString()} ر.س</strong></TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </TableContainer>

                        {/* Deductions */}
                        <Typography variant="subtitle1" fontWeight="bold" color="error.main" mb={2}>
                            الخصومات
                        </Typography>
                        <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>البند</TableCell>
                                        <TableCell align="right">المبلغ</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {details.deductions?.map((item: any, idx: number) => (
                                        <TableRow key={idx}>
                                            <TableCell>{item.nameAr || item.name}</TableCell>
                                            <TableCell align="right" sx={{ color: 'error.main' }}>
                                                -{item.amount.toLocaleString()} ر.س
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow sx={{ bgcolor: 'error.light' }}>
                                        <TableCell><strong>إجمالي الخصومات</strong></TableCell>
                                        <TableCell align="right" sx={{ color: 'error.main' }}>
                                            <strong>-{details.totalDeductions.toLocaleString()} ر.س</strong>
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </TableContainer>

                        {/* Net Salary */}
                        <Paper sx={{ p: 2, bgcolor: 'primary.main', color: 'white' }}>
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Typography variant="h6">صافي الراتب</Typography>
                                <Typography variant="h4" fontWeight="bold">
                                    {details.netSalary.toLocaleString()} ر.س
                                </Typography>
                            </Box>
                        </Paper>

                        {/* Bank Details */}
                        {details.bankDetails && (
                            <Box mt={3}>
                                <Typography variant="subtitle2" color="text.secondary" mb={1}>
                                    تفاصيل الحساب البنكي
                                </Typography>
                                <Paper variant="outlined" sx={{ p: 2 }}>
                                    <Grid container spacing={2}>
                                        <Grid item xs={4}>
                                            <Typography variant="caption" color="text.secondary">البنك</Typography>
                                            <Typography>{details.bankDetails.bankName}</Typography>
                                        </Grid>
                                        <Grid item xs={4}>
                                            <Typography variant="caption" color="text.secondary">رقم الحساب</Typography>
                                            <Typography>{details.bankDetails.accountNumber}</Typography>
                                        </Grid>
                                        {details.bankDetails.iban && (
                                            <Grid item xs={4}>
                                                <Typography variant="caption" color="text.secondary">IBAN</Typography>
                                                <Typography>{details.bankDetails.iban}</Typography>
                                            </Grid>
                                        )}
                                    </Grid>
                                </Paper>
                            </Box>
                        )}
                    </Box>
                ) : (
                    <Alert severity="error">لم يتم العثور على القسيمة</Alert>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>إغلاق</Button>
                <Button variant="contained" startIcon={<DownloadIcon />} disabled={!details}>
                    تحميل PDF
                </Button>
            </DialogActions>
        </Dialog>
    );
};

// Main Page Component
export const EmployeeSelfServicePage: React.FC = () => {
    const [tabValue, setTabValue] = useState(0);
    const [selectedPayslip, setSelectedPayslip] = useState<string | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);

    const { data: payslipsData, isLoading: loadingPayslips } = useQuery({
        queryKey: ['my-payslips'],
        queryFn: () => enterprisePayrollService.getMyPayslips({ limit: 12 }),
    });

    const { data: ytdData, isLoading: loadingYTD } = useQuery({
        queryKey: ['my-ytd'],
        queryFn: () => enterprisePayrollService.getYTDSummary(),
    });

    const { data: leaveBalances, isLoading: loadingLeaves } = useQuery({
        queryKey: ['my-leaves'],
        queryFn: () => enterprisePayrollService.getLeaveBalances(),
    });

    const { data: dashboard } = useQuery({
        queryKey: ['employee-dashboard'],
        queryFn: () => enterprisePayrollService.getEmployeeDashboard(),
    });

    const handleViewPayslip = (id: string) => {
        setSelectedPayslip(id);
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setSelectedPayslip(null);
    };

    return (
        <Box p={3}>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box display="flex" alignItems="center" gap={2}>
                    <ReceiptIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                    <Box>
                        <Typography variant="h4" fontWeight="bold">
                            بوابة الموظف
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Employee Self-Service Portal
                        </Typography>
                    </Box>
                </Box>
            </Box>

            {/* Quick Stats */}
            {dashboard && (
                <Grid container spacing={3} mb={3}>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
                            <CardContent>
                                <Typography variant="body2">الراتب الحالي</Typography>
                                <Typography variant="h5" fontWeight="bold">
                                    {(dashboard.currentSalary || 0).toLocaleString()} ر.س
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{ bgcolor: 'success.main', color: 'white' }}>
                            <CardContent>
                                <Typography variant="body2">إجمالي السنة</Typography>
                                <Typography variant="h5" fontWeight="bold">
                                    {(dashboard.ytdEarnings || 0).toLocaleString()} ر.س
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{ bgcolor: 'warning.main', color: 'white' }}>
                            <CardContent>
                                <Typography variant="body2">السلف النشطة</Typography>
                                <Typography variant="h5" fontWeight="bold">
                                    {(dashboard.activeLoanBalance || 0).toLocaleString()} ر.س
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{ bgcolor: 'info.main', color: 'white' }}>
                            <CardContent>
                                <Typography variant="body2">طلبات معلقة</Typography>
                                <Typography variant="h5" fontWeight="bold">
                                    {dashboard.pendingAdvanceRequests || 0}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            )}

            {/* Tabs */}
            <Paper sx={{ mb: 3 }}>
                <Tabs
                    value={tabValue}
                    onChange={(_, v) => setTabValue(v)}
                    variant="fullWidth"
                >
                    <Tab icon={<ReceiptIcon />} label="قسائم الراتب" />
                    <Tab icon={<TrendingUpIcon />} label="ملخص السنة" />
                    <Tab icon={<LeaveIcon />} label="أرصدة الإجازات" />
                    <Tab icon={<DocumentIcon />} label="طلب مستندات" />
                </Tabs>
            </Paper>

            {/* Payslips Tab */}
            <TabPanel value={tabValue} index={0}>
                {loadingPayslips ? (
                    <Box display="flex" justifyContent="center" p={4}>
                        <CircularProgress />
                    </Box>
                ) : payslipsData?.payslips && payslipsData.payslips.length > 0 ? (
                    <Grid container spacing={3}>
                        {payslipsData.payslips.map((payslip) => (
                            <Grid item xs={12} sm={6} md={4} key={payslip.id}>
                                <PayslipCard payslip={payslip} onView={handleViewPayslip} />
                            </Grid>
                        ))}
                    </Grid>
                ) : (
                    <Alert severity="info">لا توجد قسائم راتب حتى الآن</Alert>
                )}
            </TabPanel>

            {/* YTD Summary Tab */}
            <TabPanel value={tabValue} index={1}>
                {loadingYTD ? (
                    <Box display="flex" justifyContent="center" p={4}>
                        <CircularProgress />
                    </Box>
                ) : ytdData ? (
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        ملخص السنة {ytdData.year}
                                    </Typography>
                                    <Divider sx={{ mb: 2 }} />
                                    <Grid container spacing={2}>
                                        <Grid item xs={6}>
                                            <Typography variant="body2" color="text.secondary">
                                                إجمالي الاستحقاقات
                                            </Typography>
                                            <Typography variant="h5" fontWeight="bold" color="success.main">
                                                {ytdData.totalGross.toLocaleString()} ر.س
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <Typography variant="body2" color="text.secondary">
                                                صافي المدفوع
                                            </Typography>
                                            <Typography variant="h5" fontWeight="bold" color="primary">
                                                {ytdData.totalNet.toLocaleString()} ر.س
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <Typography variant="body2" color="text.secondary">
                                                إجمالي الخصومات
                                            </Typography>
                                            <Typography variant="h5" fontWeight="bold" color="error.main">
                                                {ytdData.totalDeductions.toLocaleString()} ر.س
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <Typography variant="body2" color="text.secondary">
                                                المكافآت
                                            </Typography>
                                            <Typography variant="h5" fontWeight="bold" color="warning.main">
                                                {ytdData.totalBonuses.toLocaleString()} ر.س
                                            </Typography>
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        التفصيل الشهري
                                    </Typography>
                                    <Divider sx={{ mb: 2 }} />
                                    <TableContainer>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>الشهر</TableCell>
                                                    <TableCell align="right">الإجمالي</TableCell>
                                                    <TableCell align="right">الصافي</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {ytdData.monthlyBreakdown?.map((m: any) => (
                                                    <TableRow key={m.month}>
                                                        <TableCell>{m.month}</TableCell>
                                                        <TableCell align="right">{m.gross.toLocaleString()}</TableCell>
                                                        <TableCell align="right">{m.net.toLocaleString()}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                ) : (
                    <Alert severity="info">لا توجد بيانات للسنة الحالية</Alert>
                )}
            </TabPanel>

            {/* Leave Balances Tab */}
            <TabPanel value={tabValue} index={2}>
                {loadingLeaves ? (
                    <Box display="flex" justifyContent="center" p={4}>
                        <CircularProgress />
                    </Box>
                ) : leaveBalances && leaveBalances.length > 0 ? (
                    <Grid container spacing={3}>
                        {leaveBalances.map((balance) => (
                            <Grid item xs={12} sm={6} md={4} key={balance.type}>
                                <LeaveBalanceCard balance={balance} />
                            </Grid>
                        ))}
                    </Grid>
                ) : (
                    <Alert severity="info">لا توجد أرصدة إجازات</Alert>
                )}
            </TabPanel>

            {/* Document Request Tab */}
            <TabPanel value={tabValue} index={3}>
                <Grid container spacing={3}>
                    {[
                        { type: 'SALARY_CERTIFICATE', title: 'شهادة راتب', desc: 'شهادة رسمية بالراتب الحالي' },
                        { type: 'EXPERIENCE_LETTER', title: 'شهادة خبرة', desc: 'شهادة خبرة وظيفية' },
                        { type: 'TAX_CERTIFICATE', title: 'شهادة ضريبية', desc: 'شهادة الضريبة السنوية' },
                        { type: 'EMPLOYMENT_LETTER', title: 'خطاب تعريف', desc: 'خطاب تعريف بالوظيفة' },
                    ].map((doc) => (
                        <Grid item xs={12} sm={6} md={3} key={doc.type}>
                            <Card
                                sx={{
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    '&:hover': { transform: 'translateY(-4px)', boxShadow: 3 },
                                }}
                                onClick={() => enterprisePayrollService.requestDocument(doc.type)}
                            >
                                <CardContent sx={{ textAlign: 'center' }}>
                                    <DocumentIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
                                    <Typography variant="subtitle1" fontWeight="bold">
                                        {doc.title}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {doc.desc}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            </TabPanel>

            {/* Payslip Detail Dialog */}
            <PayslipDialog
                open={dialogOpen}
                onClose={handleCloseDialog}
                payslipId={selectedPayslip}
            />
        </Box>
    );
};

export default EmployeeSelfServicePage;
