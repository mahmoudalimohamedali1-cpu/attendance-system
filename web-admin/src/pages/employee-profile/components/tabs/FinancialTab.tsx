import { Box, Grid, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { AttachMoney, AccountBalance, Security, Receipt } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api.service';

// Design Theme Colors
const theme = {
    coral: '#E8A87C',
    teal: '#41B3A3',
    navy: '#2D3748',
    white: '#FFFFFF',
    yellow: '#F5C469',
    green: '#81C784',
    red: '#E57373',
};

interface FinancialTabProps {
    userId: string;
    salaryInfo?: any;
    profile?: any;
}

export const FinancialTab = ({ userId, salaryInfo, profile }: FinancialTabProps) => {
    const { data: payslips } = useQuery<{ data?: any[] }>({
        queryKey: ['employee-payslips', userId],
        queryFn: () => api.get(`/payslips?userId=${userId}&limit=6`),
        enabled: !!userId,
    });

    const formatCurrency = (amount: number | null) => {
        if (!amount) return '-';
        return new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(amount);
    };

    const formatDate = (date: string | Date) => new Date(date).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long' });

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Salary Cards */}
            <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                    <Box
                        sx={{
                            bgcolor: theme.teal,
                            borderRadius: 4,
                            p: 3,
                            color: theme.white,
                            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <AttachMoney />
                            <Typography variant="body1" fontWeight={500}>الراتب الإجمالي</Typography>
                        </Box>
                        <Typography variant="h3" fontWeight="bold">
                            {formatCurrency(salaryInfo?.totalSalary || profile?.salary)}
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 1, opacity: 0.9 }}>
                            الراتب الأساسي: {formatCurrency(salaryInfo?.basicSalary || profile?.salary)}
                        </Typography>
                    </Box>
                </Grid>

                <Grid item xs={12} md={4}>
                    <Box sx={{ bgcolor: theme.white, borderRadius: 4, p: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.04)', height: '100%' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <Box sx={{ p: 1, borderRadius: 2, bgcolor: `${theme.coral}20` }}>
                                <Security sx={{ color: theme.coral }} />
                            </Box>
                            <Typography variant="h6" fontWeight="bold" color={theme.navy}>التأمينات</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid #f0f0f0' }}>
                            <Typography variant="body2" color="text.secondary">رقم GOSI</Typography>
                            <Typography variant="body2" fontWeight={600}>{salaryInfo?.gosiInfo?.gosiNumber || profile?.gosiNumber || '-'}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid #f0f0f0' }}>
                            <Typography variant="body2" color="text.secondary">حصة الموظف</Typography>
                            <Typography variant="body2">{salaryInfo?.gosiInfo?.employeeContribution || 9.75}%</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                            <Typography variant="body2" color="text.secondary">حصة صاحب العمل</Typography>
                            <Typography variant="body2">{salaryInfo?.gosiInfo?.employerContribution || 11.75}%</Typography>
                        </Box>
                    </Box>
                </Grid>

                <Grid item xs={12} md={4}>
                    <Box sx={{ bgcolor: theme.white, borderRadius: 4, p: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.04)', height: '100%' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <Box sx={{ p: 1, borderRadius: 2, bgcolor: `${theme.yellow}20` }}>
                                <AccountBalance sx={{ color: theme.yellow }} />
                            </Box>
                            <Typography variant="h6" fontWeight="bold" color={theme.navy}>الحساب البنكي</Typography>
                        </Box>
                        {salaryInfo?.bankAccount ? (
                            <>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid #f0f0f0' }}>
                                    <Typography variant="body2" color="text.secondary">البنك</Typography>
                                    <Typography variant="body2" fontWeight={600}>{salaryInfo.bankAccount.bankName}</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                                    <Typography variant="body2" color="text.secondary">IBAN</Typography>
                                    <Typography variant="body2" dir="ltr" fontSize="0.7rem">{salaryInfo.bankAccount.iban}</Typography>
                                </Box>
                            </>
                        ) : (
                            <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>لا يوجد حساب مسجل</Typography>
                        )}
                    </Box>
                </Grid>
            </Grid>

            {/* Payslips Table */}
            <Box sx={{ bgcolor: theme.white, borderRadius: 4, p: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <Receipt sx={{ color: theme.teal }} />
                    <Typography variant="h6" fontWeight="bold" color={theme.navy}>آخر قسائم الرواتب</Typography>
                </Box>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 600 }}>الفترة</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>الإجمالي</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>الخصومات</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>الصافي</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {(payslips?.data || []).map((slip: any) => (
                                <TableRow key={slip.id} hover>
                                    <TableCell>{formatDate(slip.periodStart)}</TableCell>
                                    <TableCell>{formatCurrency(slip.grossSalary)}</TableCell>
                                    <TableCell sx={{ color: theme.red }}>{formatCurrency(slip.totalDeductions)}</TableCell>
                                    <TableCell>
                                        <Typography fontWeight="bold" color={theme.green}>{formatCurrency(slip.netSalary)}</Typography>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {(!payslips?.data || payslips.data.length === 0) && (
                                <TableRow>
                                    <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                                        <Typography variant="body2" color="text.secondary">لا توجد قسائم رواتب</Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>
        </Box>
    );
};

export default FinancialTab;
