import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Grid,
    Card,
    CardContent,
    Typography,
    Button,
    Chip,
    Alert,
    LinearProgress,
    Paper,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Divider,
} from '@mui/material';
import {
    CheckCircle,
    Warning,
    Error as ErrorIcon,
    Sync,
    Schedule,
    People,
    Description,
    Refresh,
    CloudUpload,
    TrendingUp,
    Business,
} from '@mui/icons-material';
import { api } from '@/services/api.service';

interface QiwaStatus {
    saudizationRatio: {
        current: number;
        required: number;
        status: 'OK' | 'WARNING' | 'CRITICAL';
        saudiCount: number;
        totalCount: number;
    };
    contractSync: {
        status: 'SYNCED' | 'PENDING' | 'ERROR';
        lastSync?: string;
        pendingContracts: number;
        syncedContracts: number;
    };
    complianceWarnings: Array<{
        id: string;
        type: 'MISSING_CONTRACT' | 'EXPIRED_CONTRACT' | 'SAUDIZATION' | 'DATA_MISMATCH';
        severity: 'HIGH' | 'MEDIUM' | 'LOW';
        message: string;
        employeeId?: string;
        employeeName?: string;
    }>;
}

const getSaudizationColor = (status: string) => {
    switch (status) {
        case 'OK':
            return 'success';
        case 'WARNING':
            return 'warning';
        case 'CRITICAL':
            return 'error';
        default:
            return 'default';
    }
};

const getSaudizationIcon = (status: string) => {
    switch (status) {
        case 'OK':
            return <CheckCircle color="success" />;
        case 'WARNING':
            return <Warning color="warning" />;
        case 'CRITICAL':
            return <ErrorIcon color="error" />;
        default:
            return <Warning color="disabled" />;
    }
};

const getContractSyncIcon = (status: string) => {
    switch (status) {
        case 'SYNCED':
            return <CheckCircle color="success" />;
        case 'PENDING':
            return <Schedule color="warning" />;
        case 'ERROR':
            return <ErrorIcon color="error" />;
        default:
            return <Warning color="disabled" />;
    }
};

const getSeverityColor = (severity: string) => {
    switch (severity) {
        case 'HIGH':
            return 'error';
        case 'MEDIUM':
            return 'warning';
        case 'LOW':
            return 'info';
        default:
            return 'default';
    }
};

export default function QiwaDashboardPage() {
    const navigate = useNavigate();
    const [refreshKey, setRefreshKey] = useState(0);

    // Fetch QIWA status
    const { data: qiwaStatus, isLoading } = useQuery<QiwaStatus>({
        queryKey: ['qiwa-status', refreshKey],
        queryFn: async () => {
            // Aggregate data from multiple endpoints
            const [contractsData, usersData] = await Promise.all([
                api.get('/contracts').catch(() => ({ data: [] })),
                api.get('/users?status=ACTIVE&role=EMPLOYEE').catch(() => ({ data: [] })),
            ]);

            const contracts = (contractsData as any)?.data || [];
            const users = (usersData as any)?.data || [];

            // Calculate Saudization ratio
            const saudiCount = users.filter((u: any) => u.nationality === 'SA').length;
            const totalCount = users.length;
            const current = totalCount > 0 ? (saudiCount / totalCount) * 100 : 0;
            const required = 20; // Default required percentage

            let saudizationStatus: 'OK' | 'WARNING' | 'CRITICAL' = 'OK';
            if (current < required) {
                saudizationStatus = 'CRITICAL';
            } else if (current < required + 5) {
                saudizationStatus = 'WARNING';
            }

            // Calculate contract sync status
            const syncedContracts = contracts.filter((c: any) => c.qiwaStatus === 'SYNCED').length;
            const pendingContracts = contracts.filter((c: any) =>
                !c.qiwaStatus || c.qiwaStatus === 'PENDING'
            ).length;

            let contractSyncStatus: 'SYNCED' | 'PENDING' | 'ERROR' = 'SYNCED';
            if (pendingContracts > 0) {
                contractSyncStatus = 'PENDING';
            }

            // Generate compliance warnings
            const warnings: Array<{
                id: string;
                type: 'MISSING_CONTRACT' | 'EXPIRED_CONTRACT' | 'SAUDIZATION' | 'DATA_MISMATCH';
                severity: 'HIGH' | 'MEDIUM' | 'LOW';
                message: string;
                employeeId?: string;
                employeeName?: string;
            }> = [];

            // Check for users without contracts
            const usersWithoutContracts = users.filter((u: any) =>
                !contracts.some((c: any) => c.userId === u.id)
            );

            usersWithoutContracts.forEach((user: any) => {
                warnings.push({
                    id: `missing-contract-${user.id}`,
                    type: 'MISSING_CONTRACT',
                    severity: 'HIGH',
                    message: `الموظف ${user.firstName} ${user.lastName} ليس لديه عقد في قوى`,
                    employeeId: user.id,
                    employeeName: `${user.firstName} ${user.lastName}`,
                });
            });

            // Saudization warning if critical
            if (saudizationStatus === 'CRITICAL') {
                warnings.push({
                    id: 'saudization-critical',
                    type: 'SAUDIZATION',
                    severity: 'HIGH',
                    message: `نسبة السعودة منخفضة: ${current.toFixed(1)}% (المطلوب: ${required}%)`,
                });
            }

            return {
                saudizationRatio: {
                    current,
                    required,
                    status: saudizationStatus,
                    saudiCount,
                    totalCount,
                },
                contractSync: {
                    status: contractSyncStatus,
                    lastSync: contracts[0]?.updatedAt,
                    pendingContracts,
                    syncedContracts,
                },
                complianceWarnings: warnings,
            };
        },
        refetchInterval: 60000, // Refresh every minute
    });

    const handleRefresh = () => {
        setRefreshKey((prev) => prev + 1);
    };

    if (isLoading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <LinearProgress sx={{ width: '200px' }} />
            </Box>
        );
    }

    return (
        <Box>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" component="h1">
                    لوحة تحكم قوى
                </Typography>
                <Button
                    variant="outlined"
                    startIcon={<Refresh />}
                    onClick={handleRefresh}
                >
                    تحديث
                </Button>
            </Box>

            {/* Main Stats Cards */}
            <Grid container spacing={3} mb={3}>
                {/* Saudization Ratio Card */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                                <Typography variant="h6" component="h2">
                                    نسبة السعودة
                                </Typography>
                                {getSaudizationIcon(qiwaStatus?.saudizationRatio.status || 'OK')}
                            </Box>

                            <Box mb={2}>
                                <Box display="flex" justifyContent="space-between" mb={1}>
                                    <Typography variant="h3" color="primary">
                                        {qiwaStatus?.saudizationRatio.current.toFixed(1)}%
                                    </Typography>
                                    <Chip
                                        label={qiwaStatus?.saudizationRatio.status === 'OK' ? 'مكتمل' :
                                               qiwaStatus?.saudizationRatio.status === 'WARNING' ? 'تحذير' : 'حرج'}
                                        color={getSaudizationColor(qiwaStatus?.saudizationRatio.status || 'OK')}
                                        size="small"
                                    />
                                </Box>
                                <LinearProgress
                                    variant="determinate"
                                    value={Math.min(
                                        (qiwaStatus?.saudizationRatio.current || 0) /
                                        (qiwaStatus?.saudizationRatio.required || 1) * 100,
                                        100
                                    )}
                                    color={qiwaStatus?.saudizationRatio.status === 'OK' ? 'success' :
                                           qiwaStatus?.saudizationRatio.status === 'WARNING' ? 'warning' : 'error'}
                                    sx={{ height: 8, borderRadius: 1 }}
                                />
                            </Box>

                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    <Paper sx={{ p: 1.5, bgcolor: 'success.lighter' }}>
                                        <Typography variant="caption" color="text.secondary">
                                            موظفون سعوديون
                                        </Typography>
                                        <Typography variant="h6">
                                            {qiwaStatus?.saudizationRatio.saudiCount || 0}
                                        </Typography>
                                    </Paper>
                                </Grid>
                                <Grid item xs={6}>
                                    <Paper sx={{ p: 1.5, bgcolor: 'info.lighter' }}>
                                        <Typography variant="caption" color="text.secondary">
                                            إجمالي الموظفين
                                        </Typography>
                                        <Typography variant="h6">
                                            {qiwaStatus?.saudizationRatio.totalCount || 0}
                                        </Typography>
                                    </Paper>
                                </Grid>
                            </Grid>

                            <Box mt={2}>
                                <Typography variant="caption" color="text.secondary">
                                    النسبة المطلوبة: {qiwaStatus?.saudizationRatio.required || 0}%
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Contract Sync Status Card */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                                <Typography variant="h6" component="h2">
                                    حالة مزامنة العقود
                                </Typography>
                                {getContractSyncIcon(qiwaStatus?.contractSync.status || 'SYNCED')}
                            </Box>

                            <Box mb={2}>
                                <Chip
                                    label={
                                        qiwaStatus?.contractSync.status === 'SYNCED' ? 'تمت المزامنة' :
                                        qiwaStatus?.contractSync.status === 'PENDING' ? 'قيد الانتظار' : 'خطأ'
                                    }
                                    color={
                                        qiwaStatus?.contractSync.status === 'SYNCED' ? 'success' :
                                        qiwaStatus?.contractSync.status === 'PENDING' ? 'warning' : 'error'
                                    }
                                    sx={{ mb: 2 }}
                                />
                            </Box>

                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    <Paper sx={{ p: 1.5, bgcolor: 'success.lighter' }}>
                                        <Typography variant="caption" color="text.secondary">
                                            عقود متزامنة
                                        </Typography>
                                        <Typography variant="h6">
                                            {qiwaStatus?.contractSync.syncedContracts || 0}
                                        </Typography>
                                    </Paper>
                                </Grid>
                                <Grid item xs={6}>
                                    <Paper sx={{ p: 1.5, bgcolor: 'warning.lighter' }}>
                                        <Typography variant="caption" color="text.secondary">
                                            عقود معلقة
                                        </Typography>
                                        <Typography variant="h6">
                                            {qiwaStatus?.contractSync.pendingContracts || 0}
                                        </Typography>
                                    </Paper>
                                </Grid>
                            </Grid>

                            {qiwaStatus?.contractSync.lastSync && (
                                <Box mt={2}>
                                    <Typography variant="caption" color="text.secondary">
                                        آخر مزامنة: {new Date(qiwaStatus.contractSync.lastSync).toLocaleDateString('ar-SA')}
                                    </Typography>
                                </Box>
                            )}

                            <Box mt={2}>
                                <Button
                                    variant="contained"
                                    startIcon={<Sync />}
                                    fullWidth
                                    onClick={() => navigate('/contracts')}
                                >
                                    إدارة العقود
                                </Button>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Compliance Warnings */}
            <Card>
                <CardContent>
                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                        <Typography variant="h6" component="h2">
                            تحذيرات الامتثال
                        </Typography>
                        <Chip
                            label={`${qiwaStatus?.complianceWarnings.length || 0} تحذير`}
                            color={
                                (qiwaStatus?.complianceWarnings.length || 0) === 0 ? 'success' :
                                (qiwaStatus?.complianceWarnings.length || 0) > 5 ? 'error' : 'warning'
                            }
                        />
                    </Box>

                    {qiwaStatus?.complianceWarnings.length === 0 ? (
                        <Alert severity="success" icon={<CheckCircle />}>
                            لا توجد تحذيرات امتثال. جميع البيانات متوافقة مع متطلبات قوى.
                        </Alert>
                    ) : (
                        <List>
                            {qiwaStatus?.complianceWarnings.map((warning, index) => (
                                <Box key={warning.id}>
                                    {index > 0 && <Divider />}
                                    <ListItem>
                                        <ListItemIcon>
                                            {warning.severity === 'HIGH' ? (
                                                <ErrorIcon color="error" />
                                            ) : warning.severity === 'MEDIUM' ? (
                                                <Warning color="warning" />
                                            ) : (
                                                <Warning color="info" />
                                            )}
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={warning.message}
                                            secondary={
                                                warning.employeeName && (
                                                    <Box component="span" display="flex" alignItems="center" gap={1}>
                                                        <People fontSize="small" />
                                                        {warning.employeeName}
                                                    </Box>
                                                )
                                            }
                                        />
                                        <Chip
                                            label={
                                                warning.severity === 'HIGH' ? 'عالي' :
                                                warning.severity === 'MEDIUM' ? 'متوسط' : 'منخفض'
                                            }
                                            color={getSeverityColor(warning.severity)}
                                            size="small"
                                        />
                                    </ListItem>
                                </Box>
                            ))}
                        </List>
                    )}
                </CardContent>
            </Card>

            {/* Quick Actions */}
            <Grid container spacing={2} mt={2}>
                <Grid item xs={12} sm={6} md={3}>
                    <Button
                        variant="outlined"
                        fullWidth
                        startIcon={<Description />}
                        onClick={() => navigate('/contracts')}
                    >
                        عرض جميع العقود
                    </Button>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Button
                        variant="outlined"
                        fullWidth
                        startIcon={<People />}
                        onClick={() => navigate('/users')}
                    >
                        إدارة الموظفين
                    </Button>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Button
                        variant="outlined"
                        fullWidth
                        startIcon={<CloudUpload />}
                        onClick={() => navigate('/compliance')}
                    >
                        نظرة عامة على الامتثال
                    </Button>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Button
                        variant="outlined"
                        fullWidth
                        startIcon={<TrendingUp />}
                        onClick={() => navigate('/reports')}
                    >
                        التقارير
                    </Button>
                </Grid>
            </Grid>
        </Box>
    );
}
