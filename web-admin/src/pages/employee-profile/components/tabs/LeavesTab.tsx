import { Box, Grid, Typography, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, LinearProgress } from '@mui/material';
import { Flight, BeachAccess, LocalHospital, EventBusy } from '@mui/icons-material';

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

interface LeavesTabProps {
    leaveData?: any;
}

export const LeavesTab = ({ leaveData }: LeavesTabProps) => {
    const formatDate = (date: string | Date) => new Date(date).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric', year: 'numeric' });

    const getLeaveTypeInfo = (type: string) => {
        const types: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
            ANNUAL: { label: 'سنوية', icon: <BeachAccess />, color: theme.teal },
            SICK: { label: 'مرضية', icon: <LocalHospital />, color: theme.red },
            PERSONAL: { label: 'شخصية', icon: <EventBusy />, color: theme.yellow },
            EMERGENCY: { label: 'طارئة', icon: <Flight />, color: theme.coral },
        };
        return types[type] || { label: type, icon: <Flight />, color: theme.navy };
    };

    const getStatusChip = (status: string) => {
        const configs: Record<string, { label: string; color: string }> = {
            PENDING: { label: 'قيد المراجعة', color: theme.yellow },
            APPROVED: { label: 'موافق عليها', color: theme.green },
            REJECTED: { label: 'مرفوضة', color: theme.red },
            MGR_APPROVED: { label: 'معتمدة من المدير', color: theme.teal },
        };
        const config = configs[status] || { label: status, color: theme.navy };
        return <Chip label={config.label} size="small" sx={{ bgcolor: config.color, color: theme.white, fontWeight: 600 }} />;
    };

    const annual = leaveData?.annualLeaveDays || 21;
    const used = leaveData?.usedLeaveDays || 0;
    const remaining = leaveData?.remainingLeaveDays || annual - used;
    const usagePercentage = annual > 0 ? (used / annual) * 100 : 0;

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Leave Balance */}
            <Box sx={{ bgcolor: theme.white, borderRadius: 4, p: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                <Typography variant="h6" fontWeight="bold" color={theme.navy} mb={3}>رصيد الإجازات السنوي</Typography>

                <Grid container spacing={4} alignItems="center">
                    <Grid item xs={12} md={4}>
                        <Box textAlign="center">
                            <Typography variant="h2" fontWeight="bold" color={theme.teal}>{remaining}</Typography>
                            <Typography variant="body1" color="text.secondary">يوم متبقي</Typography>
                        </Box>
                    </Grid>
                    <Grid item xs={12} md={8}>
                        <Box sx={{ mb: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Typography variant="body2" color="text.secondary">المستخدم: {used} يوم</Typography>
                                <Typography variant="body2" color="text.secondary">الإجمالي: {annual} يوم</Typography>
                            </Box>
                            <LinearProgress
                                variant="determinate"
                                value={usagePercentage}
                                sx={{
                                    height: 16,
                                    borderRadius: 8,
                                    bgcolor: `${theme.teal}20`,
                                    '& .MuiLinearProgress-bar': {
                                        bgcolor: usagePercentage > 80 ? theme.red : theme.teal,
                                        borderRadius: 8,
                                    },
                                }}
                            />
                        </Box>
                    </Grid>
                </Grid>
            </Box>

            {/* Leave Types */}
            <Grid container spacing={3}>
                {(leaveData?.leavesByType || []).map((lt: any, index: number) => {
                    const info = getLeaveTypeInfo(lt.type);
                    return (
                        <Grid item xs={6} md={3} key={index}>
                            <Box sx={{ bgcolor: theme.white, borderRadius: 4, p: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.04)', textAlign: 'center' }}>
                                <Box sx={{ p: 1.5, borderRadius: '50%', bgcolor: `${info.color}20`, width: 50, height: 50, mx: 'auto', mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', color: info.color }}>
                                    {info.icon}
                                </Box>
                                <Typography variant="h4" fontWeight="bold" color={theme.navy}>{lt.used}</Typography>
                                <Typography variant="body2" color="text.secondary">{info.label}</Typography>
                                {lt.pending > 0 && (
                                    <Chip label={`${lt.pending} معلق`} size="small" sx={{ mt: 1, bgcolor: theme.yellow, color: theme.white }} />
                                )}
                            </Box>
                        </Grid>
                    );
                })}
            </Grid>

            {/* Leave Requests */}
            <Box sx={{ bgcolor: theme.white, borderRadius: 4, p: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                <Typography variant="h6" fontWeight="bold" color={theme.navy} mb={2}>طلبات الإجازات</Typography>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 600 }}>النوع</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>من</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>إلى</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>الأيام</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>الحالة</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {(leaveData?.requests || []).slice(0, 10).map((req: any) => {
                                const info = getLeaveTypeInfo(req.type);
                                return (
                                    <TableRow key={req.id} hover>
                                        <TableCell>
                                            <Chip label={info.label} size="small" sx={{ bgcolor: `${info.color}20`, color: info.color, fontWeight: 600 }} />
                                        </TableCell>
                                        <TableCell>{formatDate(req.startDate)}</TableCell>
                                        <TableCell>{formatDate(req.endDate)}</TableCell>
                                        <TableCell>{req.requestedDays}</TableCell>
                                        <TableCell>{getStatusChip(req.status)}</TableCell>
                                    </TableRow>
                                );
                            })}
                            {(!leaveData?.requests || leaveData.requests.length === 0) && (
                                <TableRow>
                                    <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                                        <Typography variant="body2" color="text.secondary">لا توجد طلبات إجازات</Typography>
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

export default LeavesTab;
