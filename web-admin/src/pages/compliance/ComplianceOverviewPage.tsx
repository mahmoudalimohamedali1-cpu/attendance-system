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
    ListItemSecondaryAction,
    Divider,
    Avatar,
} from '@mui/material';
import {
    CheckCircle,
    Warning,
    Error as ErrorIcon,
    ArrowForward,
    AccountBalance,
    Business,
    Description,
    CloudUpload,
    Schedule,
    Refresh,
    Download,
    TrendingUp,
} from '@mui/icons-material';
import { api } from '@/services/api.service';

interface ComplianceStatus {
    mudad: {
        status: 'NOT_STARTED' | 'PENDING' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED';
        lastSubmission?: string;
        pendingCount: number;
    };
    wps: {
        status: 'NOT_READY' | 'READY' | 'EXPORTED' | 'SUBMITTED';
        missingBankAccounts: number;
        lastExport?: string;
    };
    qiwa: {
        status: 'OK' | 'PENDING' | 'MISSING';
        missingContracts: number;
        lastSync?: string;
    };
    gosi: {
        status: 'OK' | 'PENDING' | 'MISSING';
        configMissing: boolean;
        lastReport?: string;
    };
}

interface ActionItem {
    id: string;
    type: 'WPS' | 'MUDAD' | 'QIWA' | 'GOSI';
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    title: string;
    description: string;
    action: string;
    path: string;
}

const getStatusColor = (status: string) => {
    switch (status) {
        case 'ACCEPTED':
        case 'OK':
        case 'READY':
        case 'EXPORTED':
        case 'SUBMITTED':
            return 'success';
        case 'PENDING':
            return 'warning';
        case 'NOT_STARTED':
        case 'NOT_READY':
        case 'MISSING':
            return 'error';
        case 'REJECTED':
            return 'error';
        default:
            return 'default';
    }
};

const getStatusIcon = (status: string) => {
    switch (status) {
        case 'ACCEPTED':
        case 'OK':
        case 'READY':
        case 'EXPORTED':
        case 'SUBMITTED':
            return <CheckCircle color="success" />;
        case 'PENDING':
            return <Schedule color="warning" />;
        case 'NOT_STARTED':
        case 'NOT_READY':
        case 'MISSING':
            return <ErrorIcon color="error" />;
        case 'REJECTED':
            return <ErrorIcon color="error" />;
        default:
            return <Warning color="disabled" />;
    }
};

const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
        'NOT_STARTED': 'لم يبدأ',
        'PENDING': 'قيد الانتظار',
        'SUBMITTED': 'تم الإرسال',
        'ACCEPTED': 'مقبول',
        'REJECTED': 'مرفوض',
        'NOT_READY': 'غير جاهز',
        'READY': 'جاهز',
        'EXPORTED': 'تم التصدير',
        'OK': 'مكتمل',
        'MISSING': 'ناقص',
    };
    return labels[status] || status;
};

export default function ComplianceOverviewPage() {
    const navigate = useNavigate();
    const [refreshKey, setRefreshKey] = useState(0);

    // Fetch compliance status
    const { data: compliance, isLoading } = useQuery<ComplianceStatus>({
        queryKey: ['compliance-status', refreshKey],
        queryFn: async () => {
            // Aggregate data from multiple endpoints
            const [wpsData, usersData] = await Promise.all([
                api.get('/wps-export/status').catch(() => ({})),
                api.get('/users?status=ACTIVE&role=EMPLOYEE').catch(() => ({ data: [] })),
            ]);

            // Count missing bank accounts
            const users = (usersData as any)?.data || [];
            const missingBank = users.filter((u: any) => !u.bankAccounts?.length).length;

            return {
                mudad: {
                    status: 'PENDING',
                    pendingCount: 0,
                    lastSubmission: undefined,
                },
                wps: {
                    status: missingBank > 0 ? 'NOT_READY' : 'READY',
                    missingBankAccounts: missingBank,
                    lastExport: (wpsData as any)?.lastExport,
                },
                qiwa: {
                    status: 'OK',
                    missingContracts: 0,
                },
                gosi: {
                    status: 'OK',
                    configMissing: false,
                },
            };
        },
        refetchInterval: 60000,
    });

    // Generate action items
    const actionItems: ActionItem[] = [];

    if (compliance?.wps.missingBankAccounts && compliance.wps.missingBankAccounts > 0) {
        actionItems.push({
            id: 'wps-bank',
            type: 'WPS',
            priority: 'HIGH',
            title: 'موظفون بدون حساب بنكي',
            description: `${compliance.wps.missingBankAccounts} موظف يحتاج إضافة IBAN للتحويل`,
            action: 'إضافة الحسابات',
            path: '/bank-accounts',
        });
    }

    if (compliance?.mudad.status === 'PENDING' || compliance?.mudad.status === 'NOT_STARTED') {
        actionItems.push({
            id: 'mudad-submit',
            type: 'MUDAD',
            priority: 'MEDIUM',
            title: 'إرسال بيانات مدد',
            description: 'يجب إرسال بيانات الموظفين لمنصة مدد',
            action: 'إرسال الآن',
            path: '/audit/submissions',
        });
    }

    const complianceScore = compliance ?
        Math.round(
            ((compliance.wps.status !== 'NOT_READY' ? 25 : 0) +
                (compliance.mudad.status === 'ACCEPTED' ? 25 : compliance.mudad.status === 'SUBMITTED' ? 15 : 0) +
                (compliance.qiwa.status === 'OK' ? 25 : 0) +
                (compliance.gosi.status === 'OK' ? 25 : 0))
        ) : 0;

    return (
        <Box>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                <Box>
                    <Typography variant="h4" fontWeight="bold" gutterBottom>
                        نظرة عامة على الالتزام
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        متابعة حالة الالتزام الحكومي والتنظيمي
                    </Typography>
                </Box>
                <Button
                    variant="outlined"
                    startIcon={<Refresh />}
                    onClick={() => setRefreshKey(k => k + 1)}
                >
                    تحديث
                </Button>
            </Box>

            {isLoading && <LinearProgress sx={{ mb: 3 }} />}

            {/* Compliance Score */}
            <Paper
                elevation={0}
                sx={{
                    p: 3,
                    mb: 4,
                    borderRadius: 3,
                    background: complianceScore >= 75
                        ? 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)'
                        : complianceScore >= 50
                            ? 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)'
                            : 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)',
                }}
            >
                <Grid container alignItems="center" spacing={3}>
                    <Grid item xs={12} md={4}>
                        <Box display="flex" alignItems="center" gap={2}>
                            <Avatar
                                sx={{
                                    width: 80,
                                    height: 80,
                                    bgcolor: complianceScore >= 75 ? 'success.main' : complianceScore >= 50 ? 'warning.main' : 'error.main',
                                    fontSize: 28,
                                    fontWeight: 'bold',
                                }}
                            >
                                {complianceScore}%
                            </Avatar>
                            <Box>
                                <Typography variant="h5" fontWeight="bold">
                                    نسبة الالتزام
                                </Typography>
                                <Typography color="text.secondary">
                                    {complianceScore >= 75 ? 'ممتاز - الشركة ملتزمة' :
                                        complianceScore >= 50 ? 'متوسط - يحتاج تحسين' :
                                            'ضعيف - إجراء فوري مطلوب'}
                                </Typography>
                            </Box>
                        </Box>
                    </Grid>
                    <Grid item xs={12} md={8}>
                        <LinearProgress
                            variant="determinate"
                            value={complianceScore}
                            sx={{
                                height: 12,
                                borderRadius: 6,
                                bgcolor: 'rgba(255,255,255,0.5)',
                                '& .MuiLinearProgress-bar': {
                                    borderRadius: 6,
                                    bgcolor: complianceScore >= 75 ? 'success.main' : complianceScore >= 50 ? 'warning.main' : 'error.main',
                                }
                            }}
                        />
                    </Grid>
                </Grid>
            </Paper>

            {/* Status Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                {/* WPS */}
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ height: '100%', borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                        <CardContent>
                            <Box display="flex" alignItems="center" gap={1} mb={2}>
                                <AccountBalance color="primary" />
                                <Typography variant="h6" fontWeight="bold">WPS</Typography>
                            </Box>
                            <Box display="flex" alignItems="center" gap={1} mb={2}>
                                {getStatusIcon(compliance?.wps.status || 'NOT_READY')}
                                <Chip
                                    label={getStatusLabel(compliance?.wps.status || 'NOT_READY')}
                                    color={getStatusColor(compliance?.wps.status || 'NOT_READY') as any}
                                    size="small"
                                />
                            </Box>
                            {compliance?.wps.missingBankAccounts ? (
                                <Alert severity="warning" sx={{ mb: 2 }}>
                                    {compliance.wps.missingBankAccounts} موظف بدون IBAN
                                </Alert>
                            ) : null}
                            <Button
                                fullWidth
                                variant="outlined"
                                size="small"
                                endIcon={<ArrowForward />}
                                onClick={() => navigate('/wps-export')}
                            >
                                تصدير WPS
                            </Button>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Mudad */}
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ height: '100%', borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                        <CardContent>
                            <Box display="flex" alignItems="center" gap={1} mb={2}>
                                <CloudUpload color="secondary" />
                                <Typography variant="h6" fontWeight="bold">مدد</Typography>
                            </Box>
                            <Box display="flex" alignItems="center" gap={1} mb={2}>
                                {getStatusIcon(compliance?.mudad.status || 'NOT_STARTED')}
                                <Chip
                                    label={getStatusLabel(compliance?.mudad.status || 'NOT_STARTED')}
                                    color={getStatusColor(compliance?.mudad.status || 'NOT_STARTED') as any}
                                    size="small"
                                />
                            </Box>
                            <Typography variant="body2" color="text.secondary" mb={2}>
                                منصة الأجور - وزارة الموارد البشرية
                            </Typography>
                            <Button
                                fullWidth
                                variant="outlined"
                                size="small"
                                endIcon={<ArrowForward />}
                                onClick={() => navigate('/audit/submissions')}
                            >
                                سجل الإرسالات
                            </Button>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Qiwa */}
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ height: '100%', borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                        <CardContent>
                            <Box display="flex" alignItems="center" gap={1} mb={2}>
                                <Description color="info" />
                                <Typography variant="h6" fontWeight="bold">قوى</Typography>
                            </Box>
                            <Box display="flex" alignItems="center" gap={1} mb={2}>
                                {getStatusIcon(compliance?.qiwa.status || 'OK')}
                                <Chip
                                    label={getStatusLabel(compliance?.qiwa.status || 'OK')}
                                    color={getStatusColor(compliance?.qiwa.status || 'OK') as any}
                                    size="small"
                                />
                            </Box>
                            <Typography variant="body2" color="text.secondary" mb={2}>
                                عقود العمل الإلكترونية
                            </Typography>
                            <Button
                                fullWidth
                                variant="outlined"
                                size="small"
                                endIcon={<ArrowForward />}
                                onClick={() => navigate('/contracts')}
                            >
                                إدارة العقود
                            </Button>
                        </CardContent>
                    </Card>
                </Grid>

                {/* GOSI */}
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ height: '100%', borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                        <CardContent>
                            <Box display="flex" alignItems="center" gap={1} mb={2}>
                                <Business color="success" />
                                <Typography variant="h6" fontWeight="bold">التأمينات</Typography>
                            </Box>
                            <Box display="flex" alignItems="center" gap={1} mb={2}>
                                {getStatusIcon(compliance?.gosi.status || 'OK')}
                                <Chip
                                    label={getStatusLabel(compliance?.gosi.status || 'OK')}
                                    color={getStatusColor(compliance?.gosi.status || 'OK') as any}
                                    size="small"
                                />
                            </Box>
                            <Typography variant="body2" color="text.secondary" mb={2}>
                                المؤسسة العامة للتأمينات
                            </Typography>
                            <Button
                                fullWidth
                                variant="outlined"
                                size="small"
                                endIcon={<ArrowForward />}
                                onClick={() => navigate('/salary')}
                            >
                                تقرير GOSI
                            </Button>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Actions Required */}
            {actionItems.length > 0 && (
                <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 4 }}>
                    <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Warning color="warning" />
                        إجراءات مطلوبة ({actionItems.length})
                    </Typography>
                    <Divider sx={{ my: 2 }} />
                    <List disablePadding>
                        {actionItems.map((item) => (
                            <ListItem
                                key={item.id}
                                sx={{
                                    bgcolor: item.priority === 'HIGH' ? 'error.50' : item.priority === 'MEDIUM' ? 'warning.50' : 'grey.50',
                                    borderRadius: 2,
                                    mb: 1,
                                }}
                            >
                                <ListItemIcon>
                                    {item.type === 'WPS' && <AccountBalance color="primary" />}
                                    {item.type === 'MUDAD' && <CloudUpload color="secondary" />}
                                    {item.type === 'QIWA' && <Description color="info" />}
                                    {item.type === 'GOSI' && <Business color="success" />}
                                </ListItemIcon>
                                <ListItemText
                                    primary={item.title}
                                    secondary={item.description}
                                    primaryTypographyProps={{ fontWeight: 'bold' }}
                                />
                                <ListItemSecondaryAction>
                                    <Button
                                        variant="contained"
                                        size="small"
                                        color={item.priority === 'HIGH' ? 'error' : 'primary'}
                                        endIcon={<ArrowForward />}
                                        onClick={() => navigate(item.path)}
                                    >
                                        {item.action}
                                    </Button>
                                </ListItemSecondaryAction>
                            </ListItem>
                        ))}
                    </List>
                </Paper>
            )}

            {/* Quick Export Shortcuts */}
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Download color="primary" />
                    تصدير سريع
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Grid container spacing={2}>
                    <Grid item xs={6} sm={3}>
                        <Button
                            fullWidth
                            variant="outlined"
                            startIcon={<AccountBalance />}
                            onClick={() => navigate('/wps-export')}
                            sx={{ py: 2 }}
                        >
                            تصدير WPS
                        </Button>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <Button
                            fullWidth
                            variant="outlined"
                            startIcon={<Description />}
                            onClick={() => navigate('/contracts')}
                            sx={{ py: 2 }}
                        >
                            تصدير قوى
                        </Button>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <Button
                            fullWidth
                            variant="outlined"
                            startIcon={<Business />}
                            onClick={() => navigate('/salary')}
                            sx={{ py: 2 }}
                        >
                            تقرير GOSI
                        </Button>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <Button
                            fullWidth
                            variant="outlined"
                            startIcon={<TrendingUp />}
                            onClick={() => navigate('/reports')}
                            sx={{ py: 2 }}
                        >
                            تقارير شاملة
                        </Button>
                    </Grid>
                </Grid>
            </Paper>
        </Box>
    );
}
