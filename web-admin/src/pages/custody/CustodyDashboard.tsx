import { useState, useEffect } from 'react';
import {
    Box, Typography, Grid, Card, CardContent, Paper, Chip, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Button, CircularProgress,
    IconButton, Tooltip, Alert
} from '@mui/material';
import {
    Inventory2, CheckCircle, Build, Warning, LocalShipping,
    Refresh, Add, ArrowForward
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import custodyService, { CustodyDashboard as DashboardData } from '../../services/custody.service';

const statusColors: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
    AVAILABLE: 'success',
    ASSIGNED: 'info',
    IN_MAINTENANCE: 'warning',
    LOST: 'error',
    DAMAGED: 'error',
    DISPOSED: 'default',
    RESERVED: 'info',
};

const statusLabels: Record<string, string> = {
    AVAILABLE: 'متاحة',
    ASSIGNED: 'مسلمة',
    IN_MAINTENANCE: 'صيانة',
    LOST: 'مفقودة',
    DAMAGED: 'تالفة',
    DISPOSED: 'مستبعدة',
    RESERVED: 'محجوزة',
};

export default function CustodyDashboard() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dashboard, setDashboard] = useState<DashboardData | null>(null);

    const fetchDashboard = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await custodyService.getDashboard();
            setDashboard(data);
        } catch (err: any) {
            setError(err.response?.data?.message || 'فشل في تحميل البيانات');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboard();
    }, []);

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Box p={3}>
                <Alert severity="error" action={
                    <Button color="inherit" size="small" onClick={fetchDashboard}>
                        إعادة المحاولة
                    </Button>
                }>
                    {error}
                </Alert>
            </Box>
        );
    }

    const { summary, categoryStats, recentAssignments, pendingReturns } = dashboard || {
        summary: { total: 0, available: 0, assigned: 0, maintenance: 0, lost: 0 },
        categoryStats: [],
        recentAssignments: [],
        pendingReturns: 0,
    };

    return (
        <Box p={3}>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" fontWeight="bold">
                    📦 إدارة العهد
                </Typography>
                <Box>
                    <Tooltip title="تحديث">
                        <IconButton onClick={fetchDashboard}>
                            <Refresh />
                        </IconButton>
                    </Tooltip>
                    <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={() => navigate('/custody/items/new')}
                        sx={{ mr: 1 }}
                    >
                        إضافة عهدة
                    </Button>
                </Box>
            </Box>

            {/* Summary Cards */}
            <Grid container spacing={3} mb={3}>
                <Grid item xs={12} sm={6} md={2.4}>
                    <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
                        <CardContent>
                            <Box display="flex" alignItems="center" gap={1}>
                                <Inventory2 />
                                <Typography variant="h4">{summary.total}</Typography>
                            </Box>
                            <Typography variant="body2" sx={{ opacity: 0.9 }}>إجمالي العهد</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={2.4}>
                    <Card sx={{ bgcolor: 'success.main', color: 'white' }}>
                        <CardContent>
                            <Box display="flex" alignItems="center" gap={1}>
                                <CheckCircle />
                                <Typography variant="h4">{summary.available}</Typography>
                            </Box>
                            <Typography variant="body2" sx={{ opacity: 0.9 }}>متاحة</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={2.4}>
                    <Card sx={{ bgcolor: 'info.main', color: 'white' }}>
                        <CardContent>
                            <Box display="flex" alignItems="center" gap={1}>
                                <LocalShipping />
                                <Typography variant="h4">{summary.assigned}</Typography>
                            </Box>
                            <Typography variant="body2" sx={{ opacity: 0.9 }}>مسلمة</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={2.4}>
                    <Card sx={{ bgcolor: 'warning.main', color: 'white' }}>
                        <CardContent>
                            <Box display="flex" alignItems="center" gap={1}>
                                <Build />
                                <Typography variant="h4">{summary.maintenance}</Typography>
                            </Box>
                            <Typography variant="body2" sx={{ opacity: 0.9 }}>صيانة</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={2.4}>
                    <Card sx={{ bgcolor: 'error.main', color: 'white' }}>
                        <CardContent>
                            <Box display="flex" alignItems="center" gap={1}>
                                <Warning />
                                <Typography variant="h4">{summary.lost}</Typography>
                            </Box>
                            <Typography variant="body2" sx={{ opacity: 0.9 }}>مفقودة</Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Quick Actions & Pending */}
            <Grid container spacing={3} mb={3}>
                {/* Quick Actions */}
                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 2, height: '100%' }}>
                        <Typography variant="h6" gutterBottom>إجراءات سريعة</Typography>
                        <Box display="flex" flexDirection="column" gap={1}>
                            <Button fullWidth variant="outlined" onClick={() => navigate('/custody/items')}>
                                📋 قائمة العهد
                            </Button>
                            <Button fullWidth variant="outlined" onClick={() => navigate('/custody/categories')}>
                                📂 فئات العهد
                            </Button>
                            <Button fullWidth variant="outlined" onClick={() => navigate('/custody/assign')}>
                                ✋ تسليم عهدة
                            </Button>
                            <Button fullWidth variant="outlined" onClick={() => navigate('/custody/returns')}>
                                🔄 طلبات الإرجاع {pendingReturns > 0 && (
                                    <Chip size="small" color="error" label={pendingReturns} sx={{ ml: 1 }} />
                                )}
                            </Button>
                            <Button fullWidth variant="outlined" onClick={() => navigate('/custody/maintenance')}>
                                🔧 الصيانة
                            </Button>
                        </Box>
                    </Paper>
                </Grid>

                {/* Categories Stats */}
                <Grid item xs={12} md={8}>
                    <Paper sx={{ p: 2, height: '100%' }}>
                        <Typography variant="h6" gutterBottom>العهد حسب الفئة</Typography>
                        <Grid container spacing={2}>
                            {categoryStats.map((cat) => (
                                <Grid item xs={6} sm={4} key={cat.id}>
                                    <Card variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
                                        <Typography variant="h5">{cat._count?.items || 0}</Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {cat.icon || '📦'} {cat.name}
                                        </Typography>
                                    </Card>
                                </Grid>
                            ))}
                            {categoryStats.length === 0 && (
                                <Grid item xs={12}>
                                    <Typography color="text.secondary" textAlign="center">
                                        لا توجد فئات بعد
                                    </Typography>
                                </Grid>
                            )}
                        </Grid>
                    </Paper>
                </Grid>
            </Grid>

            {/* Recent Assignments */}
            <Paper sx={{ p: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6">آخر التسليمات</Typography>
                    <Button endIcon={<ArrowForward />} onClick={() => navigate('/custody/items')}>
                        عرض الكل
                    </Button>
                </Box>
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>العهدة</TableCell>
                                <TableCell>الموظف</TableCell>
                                <TableCell>تاريخ التسليم</TableCell>
                                <TableCell>الحالة</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {recentAssignments.map((assignment) => (
                                <TableRow key={assignment.id} hover>
                                    <TableCell>{assignment.custodyItem?.name}</TableCell>
                                    <TableCell>
                                        {assignment.employee?.firstName} {assignment.employee?.lastName}
                                    </TableCell>
                                    <TableCell>
                                        {new Date(assignment.assignedAt).toLocaleDateString('ar-SA')}
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            size="small"
                                            label={statusLabels[assignment.status] || assignment.status}
                                            color={statusColors[assignment.status] || 'default'}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                            {recentAssignments.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} align="center">
                                        لا توجد تسليمات حديثة
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Box>
    );
}
