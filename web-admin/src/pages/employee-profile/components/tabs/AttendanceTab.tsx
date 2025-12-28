import { Box, Grid, Typography, LinearProgress, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { Schedule, CheckCircle, Warning, AccessTime } from '@mui/icons-material';
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
    lightBg: '#FDF6F0',
};

interface AttendanceTabProps {
    userId: string;
    stats?: any;
}

export const AttendanceTab = ({ userId, stats }: AttendanceTabProps) => {
    const { data: recentAttendance } = useQuery<any>({
        queryKey: ['employee-attendance-recent', userId],
        queryFn: () => api.get(`/attendance?userId=${userId}&limit=10`),
        enabled: !!userId,
    });

    const formatTime = (time: string | null) => {
        if (!time) return '-';
        return new Date(time).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (date: string | Date) => {
        return new Date(date).toLocaleDateString('ar-SA', { weekday: 'short', month: 'short', day: 'numeric' });
    };

    const getStatusChip = (status: string) => {
        const configs: Record<string, { label: string; color: string }> = {
            PRESENT: { label: 'حاضر', color: theme.green },
            ABSENT: { label: 'غائب', color: theme.red },
            LATE: { label: 'متأخر', color: theme.yellow },
            EARLY_LEAVE: { label: 'انصراف مبكر', color: theme.coral },
        };
        const config = configs[status] || { label: status, color: theme.navy };
        return <Chip label={config.label} size="small" sx={{ bgcolor: config.color, color: theme.white, fontWeight: 600 }} />;
    };

    const attendanceRate = stats?.attendanceRate || 0;

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Stats Cards */}
            <Grid container spacing={3}>
                <Grid item xs={6} md={3}>
                    <Box sx={{ bgcolor: theme.white, borderRadius: 4, p: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.04)', textAlign: 'center' }}>
                        <Box sx={{ p: 1.5, borderRadius: '50%', bgcolor: `${theme.teal}20`, width: 50, height: 50, mx: 'auto', mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <CheckCircle sx={{ color: theme.teal }} />
                        </Box>
                        <Typography variant="h3" fontWeight="bold" color={theme.navy}>{stats?.presentDays || 0}</Typography>
                        <Typography variant="body2" color="text.secondary">أيام الحضور</Typography>
                    </Box>
                </Grid>
                <Grid item xs={6} md={3}>
                    <Box sx={{ bgcolor: theme.white, borderRadius: 4, p: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.04)', textAlign: 'center' }}>
                        <Box sx={{ p: 1.5, borderRadius: '50%', bgcolor: `${theme.red}20`, width: 50, height: 50, mx: 'auto', mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Warning sx={{ color: theme.red }} />
                        </Box>
                        <Typography variant="h3" fontWeight="bold" color={theme.navy}>{stats?.absentDays || 0}</Typography>
                        <Typography variant="body2" color="text.secondary">أيام الغياب</Typography>
                    </Box>
                </Grid>
                <Grid item xs={6} md={3}>
                    <Box sx={{ bgcolor: theme.white, borderRadius: 4, p: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.04)', textAlign: 'center' }}>
                        <Box sx={{ p: 1.5, borderRadius: '50%', bgcolor: `${theme.yellow}20`, width: 50, height: 50, mx: 'auto', mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <AccessTime sx={{ color: theme.yellow }} />
                        </Box>
                        <Typography variant="h3" fontWeight="bold" color={theme.navy}>{stats?.lateDays || 0}</Typography>
                        <Typography variant="body2" color="text.secondary">أيام التأخير</Typography>
                    </Box>
                </Grid>
                <Grid item xs={6} md={3}>
                    <Box sx={{ bgcolor: theme.white, borderRadius: 4, p: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.04)', textAlign: 'center' }}>
                        <Box sx={{ p: 1.5, borderRadius: '50%', bgcolor: `${theme.coral}20`, width: 50, height: 50, mx: 'auto', mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Schedule sx={{ color: theme.coral }} />
                        </Box>
                        <Typography variant="h3" fontWeight="bold" color={theme.navy}>{Math.floor((stats?.totalOvertimeMinutes || 0) / 60)}</Typography>
                        <Typography variant="body2" color="text.secondary">ساعات إضافية</Typography>
                    </Box>
                </Grid>
            </Grid>

            {/* Attendance Rate */}
            <Box sx={{ bgcolor: theme.white, borderRadius: 4, p: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" fontWeight="bold" color={theme.navy}>نسبة الحضور</Typography>
                    <Typography variant="h4" fontWeight="bold" color={theme.teal}>{attendanceRate}%</Typography>
                </Box>
                <LinearProgress
                    variant="determinate"
                    value={attendanceRate}
                    sx={{
                        height: 12,
                        borderRadius: 6,
                        bgcolor: `${theme.teal}20`,
                        '& .MuiLinearProgress-bar': {
                            bgcolor: theme.teal,
                            borderRadius: 6,
                        },
                    }}
                />
            </Box>

            {/* Recent Attendance */}
            <Box sx={{ bgcolor: theme.white, borderRadius: 4, p: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                <Typography variant="h6" fontWeight="bold" color={theme.navy} mb={2}>سجل الحضور الأخير</Typography>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 600 }}>التاريخ</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>الحالة</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>وقت الدخول</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>وقت الخروج</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>ساعات العمل</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {(recentAttendance?.data || []).slice(0, 7).map((att: any) => (
                                <TableRow key={att.id} hover>
                                    <TableCell>{formatDate(att.date)}</TableCell>
                                    <TableCell>{getStatusChip(att.status)}</TableCell>
                                    <TableCell>{formatTime(att.checkInTime)}</TableCell>
                                    <TableCell>{formatTime(att.checkOutTime)}</TableCell>
                                    <TableCell>{att.workingMinutes ? `${Math.floor(att.workingMinutes / 60)}:${String(att.workingMinutes % 60).padStart(2, '0')}` : '-'}</TableCell>
                                </TableRow>
                            ))}
                            {(!recentAttendance?.data || recentAttendance.data.length === 0) && (
                                <TableRow>
                                    <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                                        <Typography variant="body2" color="text.secondary">لا توجد سجلات حضور</Typography>
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

export default AttendanceTab;
