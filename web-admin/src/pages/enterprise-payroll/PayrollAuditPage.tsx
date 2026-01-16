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
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    LinearProgress,
    Accordion,
    AccordionSummary,
    AccordionDetails,
} from '@mui/material';
import {
    Security as SecurityIcon,
    ExpandMore as ExpandMoreIcon,
    CheckCircle as CheckIcon,
    Warning as WarningIcon,
    Error as ErrorIcon,
    History as HistoryIcon,
    Assessment as AssessmentIcon,
    Gavel as GavelIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { enterprisePayrollService } from '../../services/enterprise-payroll.service';

// Compliance Status Badge
const StatusBadge: React.FC<{ status: 'PASS' | 'WARNING' | 'FAIL' }> = ({ status }) => {
    const config = {
        PASS: { icon: <CheckIcon />, color: 'success' as const, label: 'ناجح' },
        WARNING: { icon: <WarningIcon />, color: 'warning' as const, label: 'تحذير' },
        FAIL: { icon: <ErrorIcon />, color: 'error' as const, label: 'فشل' },
    };
    const { icon, color, label } = config[status];
    return <Chip icon={icon} label={label} color={color} size="small" />;
};

// Compliance Score Card
interface ScoreCardProps {
    score: number;
    title: string;
}

const ScoreCard: React.FC<ScoreCardProps> = ({ score, title }) => {
    const getColor = () => {
        if (score >= 90) return '#4caf50';
        if (score >= 70) return '#ff9800';
        return '#f44336';
    };

    return (
        <Card sx={{ textAlign: 'center', position: 'relative', overflow: 'visible' }}>
            <CardContent>
                <Box
                    sx={{
                        width: 120,
                        height: 120,
                        borderRadius: '50%',
                        border: `8px solid ${getColor()}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mx: 'auto',
                        mb: 2,
                    }}
                >
                    <Typography variant="h3" fontWeight="bold" sx={{ color: getColor() }}>
                        {score}
                    </Typography>
                </Box>
                <Typography variant="h6">{title}</Typography>
                <Chip
                    label={score >= 90 ? 'ممتاز' : score >= 70 ? 'جيد' : 'يحتاج تحسين'}
                    color={score >= 90 ? 'success' : score >= 70 ? 'warning' : 'error'}
                    sx={{ mt: 1 }}
                />
            </CardContent>
        </Card>
    );
};

// Audit Trail Entry Component
interface AuditEntryProps {
    entry: {
        id: string;
        timestamp: Date;
        userName: string;
        action: string;
        entityType: string;
        entityId: string;
        oldValues?: any;
        newValues?: any;
    };
}

const AuditEntry: React.FC<AuditEntryProps> = ({ entry }) => (
    <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box display="flex" alignItems="center" gap={2} width="100%">
                <HistoryIcon color="action" />
                <Box flexGrow={1}>
                    <Typography variant="subtitle2">{entry.action}</Typography>
                    <Typography variant="caption" color="text.secondary">
                        {entry.userName} - {new Date(entry.timestamp).toLocaleString('ar-SA')}
                    </Typography>
                </Box>
                <Chip label={entry.entityType} size="small" variant="outlined" />
            </Box>
        </AccordionSummary>
        <AccordionDetails>
            <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                        القيمة السابقة
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 1, bgcolor: 'error.light' }}>
                        <pre style={{ margin: 0, fontSize: 12, overflow: 'auto' }}>
                            {entry.oldValues ? JSON.stringify(entry.oldValues, null, 2) : 'N/A'}
                        </pre>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                        القيمة الجديدة
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 1, bgcolor: 'success.light' }}>
                        <pre style={{ margin: 0, fontSize: 12, overflow: 'auto' }}>
                            {entry.newValues ? JSON.stringify(entry.newValues, null, 2) : 'N/A'}
                        </pre>
                    </Paper>
                </Grid>
            </Grid>
        </AccordionDetails>
    </Accordion>
);

// Main Page Component
export const PayrollAuditPage: React.FC = () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    const [year, setYear] = useState(currentYear);
    const [month, setMonth] = useState(currentMonth);
    const [dateRange, setDateRange] = useState({
        start: new Date(currentYear, currentMonth - 2, 1).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0],
    });

    const { data: complianceScore, isLoading: loadingScore } = useQuery({
        queryKey: ['compliance-score'],
        queryFn: () => enterprisePayrollService.getComplianceScore(),
    });

    const { data: auditTrail, isLoading: loadingTrail } = useQuery({
        queryKey: ['audit-trail', dateRange],
        queryFn: () => enterprisePayrollService.getAuditTrail({
            startDate: dateRange.start,
            endDate: dateRange.end,
            limit: 50,
        }),
    });

    const { data: reconciliation, isLoading: loadingRecon } = useQuery({
        queryKey: ['reconciliation', year, month],
        queryFn: () => enterprisePayrollService.getReconciliationReport(year, month),
    });

    const months = [
        { value: 1, label: 'يناير' },
        { value: 2, label: 'فبراير' },
        { value: 3, label: 'مارس' },
        { value: 4, label: 'أبريل' },
        { value: 5, label: 'مايو' },
        { value: 6, label: 'يونيو' },
        { value: 7, label: 'يوليو' },
        { value: 8, label: 'أغسطس' },
        { value: 9, label: 'سبتمبر' },
        { value: 10, label: 'أكتوبر' },
        { value: 11, label: 'نوفمبر' },
        { value: 12, label: 'ديسمبر' },
    ];

    return (
        <Box p={3}>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box display="flex" alignItems="center" gap={2}>
                    <SecurityIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                    <Box>
                        <Typography variant="h4" fontWeight="bold">
                            التدقيق والامتثال
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Payroll Audit & Compliance
                        </Typography>
                    </Box>
                </Box>
            </Box>

            {/* Compliance Score Section */}
            <Grid container spacing={3} mb={3}>
                <Grid item xs={12} md={4}>
                    {loadingScore ? (
                        <Box display="flex" justifyContent="center" p={4}>
                            <CircularProgress />
                        </Box>
                    ) : complianceScore ? (
                        <ScoreCard score={complianceScore.overallScore} title="درجة الامتثال الإجمالية" />
                    ) : (
                        <Alert severity="error">خطأ في تحميل درجة الامتثال</Alert>
                    )}
                </Grid>
                <Grid item xs={12} md={8}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                تفاصيل الامتثال
                            </Typography>
                            <Divider sx={{ mb: 2 }} />
                            {complianceScore?.categories && complianceScore.categories.length > 0 ? (
                                <TableContainer>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>الفئة</TableCell>
                                                <TableCell>الحالة</TableCell>
                                                <TableCell>التفاصيل</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {complianceScore.categories.map((cat: any, idx: number) => (
                                                <TableRow key={idx}>
                                                    <TableCell>{cat.category}</TableCell>
                                                    <TableCell>
                                                        <StatusBadge status={cat.status} />
                                                    </TableCell>
                                                    <TableCell>{cat.details}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            ) : (
                                <Alert severity="info">لا توجد بيانات امتثال</Alert>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Reconciliation Section */}
            <Paper sx={{ p: 3, mb: 3 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6" display="flex" alignItems="center" gap={1}>
                        <GavelIcon /> تقرير المطابقة
                    </Typography>
                    <Box display="flex" gap={2}>
                        <FormControl size="small" sx={{ minWidth: 100 }}>
                            <InputLabel>الشهر</InputLabel>
                            <Select
                                value={month}
                                label="الشهر"
                                onChange={(e) => setMonth(e.target.value as number)}
                            >
                                {months.map((m) => (
                                    <MenuItem key={m.value} value={m.value}>
                                        {m.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ minWidth: 80 }}>
                            <InputLabel>السنة</InputLabel>
                            <Select
                                value={year}
                                label="السنة"
                                onChange={(e) => setYear(e.target.value as number)}
                            >
                                {[2024, 2025, 2026].map((y) => (
                                    <MenuItem key={y} value={y}>
                                        {y}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>
                </Box>
                <Divider sx={{ mb: 2 }} />
                {loadingRecon ? (
                    <Box display="flex" justifyContent="center" p={4}>
                        <CircularProgress />
                    </Box>
                ) : reconciliation ? (
                    <Grid container spacing={3}>
                        <Grid item xs={12} sm={6} md={3}>
                            <Box textAlign="center" p={2} bgcolor="grey.100" borderRadius={2}>
                                <Typography variant="body2" color="text.secondary">
                                    إجمالي الرواتب
                                </Typography>
                                <Typography variant="h5" fontWeight="bold">
                                    {(reconciliation.payrollTotal || 0).toLocaleString()} ر.س
                                </Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Box textAlign="center" p={2} bgcolor="grey.100" borderRadius={2}>
                                <Typography variant="body2" color="text.secondary">
                                    المدفوعات البنكية
                                </Typography>
                                <Typography variant="h5" fontWeight="bold">
                                    {(reconciliation.bankTotal || 0).toLocaleString()} ر.س
                                </Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Box textAlign="center" p={2} bgcolor={reconciliation.difference === 0 ? 'success.light' : 'error.light'} borderRadius={2}>
                                <Typography variant="body2" color="text.secondary">
                                    الفرق
                                </Typography>
                                <Typography variant="h5" fontWeight="bold">
                                    {(reconciliation.difference || 0).toLocaleString()} ر.س
                                </Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Box textAlign="center" p={2} bgcolor="grey.100" borderRadius={2}>
                                <Typography variant="body2" color="text.secondary">
                                    الحالة
                                </Typography>
                                <Chip
                                    label={reconciliation.isReconciled ? 'مطابق' : 'غير مطابق'}
                                    color={reconciliation.isReconciled ? 'success' : 'error'}
                                    sx={{ mt: 1 }}
                                />
                            </Box>
                        </Grid>
                    </Grid>
                ) : (
                    <Alert severity="info">لا توجد بيانات مطابقة لهذه الفترة</Alert>
                )}
            </Paper>

            {/* Audit Trail Section */}
            <Paper sx={{ p: 3 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6" display="flex" alignItems="center" gap={1}>
                        <AssessmentIcon /> سجل التدقيق
                    </Typography>
                    <Box display="flex" gap={2}>
                        <TextField
                            size="small"
                            type="date"
                            label="من تاريخ"
                            value={dateRange.start}
                            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                            InputLabelProps={{ shrink: true }}
                        />
                        <TextField
                            size="small"
                            type="date"
                            label="إلى تاريخ"
                            value={dateRange.end}
                            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Box>
                </Box>
                <Divider sx={{ mb: 2 }} />
                {loadingTrail ? (
                    <Box display="flex" justifyContent="center" p={4}>
                        <CircularProgress />
                    </Box>
                ) : auditTrail?.entries && auditTrail.entries.length > 0 ? (
                    <Box>
                        <Typography variant="body2" color="text.secondary" mb={2}>
                            إجمالي السجلات: {auditTrail.total}
                        </Typography>
                        {auditTrail.entries.map((entry: any) => (
                            <AuditEntry key={entry.id} entry={entry} />
                        ))}
                    </Box>
                ) : (
                    <Alert severity="info">لا توجد سجلات تدقيق في هذه الفترة</Alert>
                )}
            </Paper>
        </Box>
    );
};

export default PayrollAuditPage;
