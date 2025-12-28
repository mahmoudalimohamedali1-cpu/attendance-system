import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Tabs,
    Tab,
    TextField,
    InputAdornment,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    IconButton,
    CircularProgress,
    Alert,
    Badge,
    Tooltip,
    Paper,
    Button,
} from '@mui/material';
import {
    Search,
    Visibility,
    Schedule,
    Warning,
    CheckCircle,
    HourglassEmpty,
    Gavel,
    PersonSearch,
    FiberNew,
    Add,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { disciplinaryService, DisciplinaryCase } from '@/services/disciplinary.service';
import { CreateInvestigationDialog } from './components/CreateInvestigationDialog';

// Tab keys for HR inbox
type TabKey =
    | 'NEW'
    | 'INFORMAL'
    | 'INVESTIGATION'
    | 'PENDING_DECISION'
    | 'AWAITING_EMPLOYEE'
    | 'OBJECTIONS'
    | 'DONE';

// Map tab keys to backend statuses
const TAB_STATUS_MAP: Record<TabKey, string[]> = {
    NEW: ['SUBMITTED_TO_HR', 'EMPLOYEE_REJECTED_INFORMAL'],
    INFORMAL: ['HR_INFORMAL_SENT', 'AWAITING_EMPLOYEE_INFORMAL'],
    INVESTIGATION: [
        'OFFICIAL_INVESTIGATION_OPENED',
        'HEARING_SCHEDULED',
        'INVESTIGATION_IN_PROGRESS',
        'FINALIZED_CONTINUE_INVESTIGATION',
    ],
    PENDING_DECISION: ['AWAITING_HR_DECISION'],
    AWAITING_EMPLOYEE: ['DECISION_ISSUED', 'AWAITING_EMPLOYEE_ACK'],
    OBJECTIONS: ['EMPLOYEE_OBJECTED', 'HR_REVIEWING_OBJECTION'],
    DONE: ['FINALIZED_APPROVED', 'FINALIZED_CANCELLED', 'HR_REJECTED'],
};

// Tab display config
const TAB_CONFIG: { key: TabKey; label: string; icon: React.ReactNode; color: string }[] = [
    { key: 'NEW', label: 'جديدة', icon: <FiberNew />, color: '#2196f3' },
    { key: 'INFORMAL', label: 'إجراءات غير رسمية', icon: <Warning />, color: '#ff5722' },
    { key: 'INVESTIGATION', label: 'تحت التحقيق', icon: <PersonSearch />, color: '#ff9800' },
    { key: 'PENDING_DECISION', label: 'في انتظار قرار', icon: <Gavel />, color: '#9c27b0' },
    { key: 'AWAITING_EMPLOYEE', label: 'في انتظار رد الموظف', icon: <HourglassEmpty />, color: '#00bcd4' },
    { key: 'OBJECTIONS', label: 'اعتراضات', icon: <Warning />, color: '#f44336' },
    { key: 'DONE', label: 'منتهية', icon: <CheckCircle />, color: '#4caf50' },
];

// Status display mapping
const STATUS_LABELS: Record<string, { label: string; color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' }> = {
    SUBMITTED_TO_HR: { label: 'مرفوعة للـ HR', color: 'info' },
    HR_REJECTED: { label: 'مرفوض من HR', color: 'error' },
    HR_INFORMAL_SENT: { label: 'لفت نظر/إنذار مرسل', color: 'warning' },
    AWAITING_EMPLOYEE_INFORMAL: { label: 'انتظار رد غير رسمي', color: 'info' },
    EMPLOYEE_REJECTED_INFORMAL: { label: 'موظف رفض الإجراء', color: 'error' },
    OFFICIAL_INVESTIGATION_OPENED: { label: 'تحقيق رسمي', color: 'warning' },
    HEARING_SCHEDULED: { label: 'جلسة محددة', color: 'warning' },
    INVESTIGATION_IN_PROGRESS: { label: 'تحقيق جاري', color: 'warning' },
    AWAITING_HR_DECISION: { label: 'في انتظار قرار', color: 'secondary' },
    DECISION_ISSUED: { label: 'صدر قرار', color: 'primary' },
    AWAITING_EMPLOYEE_ACK: { label: 'في انتظار الموظف', color: 'info' },
    EMPLOYEE_OBJECTED: { label: 'اعتراض', color: 'error' },
    HR_REVIEWING_OBJECTION: { label: 'مراجعة اعتراض', color: 'error' },
    FINALIZED_APPROVED: { label: 'معتمدة', color: 'success' },
    FINALIZED_CANCELLED: { label: 'ملغاة', color: 'default' },
    FINALIZED_CONTINUE_INVESTIGATION: { label: 'استمرار التحقيق', color: 'warning' },
    INFORMAL_NOTICE_ISSUED: { label: 'لفت نظر', color: 'default' },
    INFORMAL_WARNING_ISSUED: { label: 'إنذار شفهي', color: 'default' },
};

export const DisciplinaryHRPage = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<TabKey>('NEW');
    const [searchQuery, setSearchQuery] = useState('');
    const [showCreateDialog, setShowCreateDialog] = useState(false);

    // Fetch all cases for HR
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['disciplinary-cases', 'hr'],
        queryFn: () => disciplinaryService.getCases('hr'),
    });

    const cases = (data || []) as DisciplinaryCase[];

    // Filter cases by tab and search
    const filteredCases = useMemo(() => {
        const statuses = TAB_STATUS_MAP[activeTab];
        return cases
            .filter((c) => statuses.includes(c.status))
            .filter((c) => {
                if (!searchQuery.trim()) return true;
                const q = searchQuery.toLowerCase();
                return (
                    c.caseCode?.toLowerCase().includes(q) ||
                    c.employee?.firstName?.toLowerCase().includes(q) ||
                    c.employee?.lastName?.toLowerCase().includes(q) ||
                    c.title?.toLowerCase().includes(q)
                );
            });
    }, [cases, activeTab, searchQuery]);

    // Count cases per tab
    const tabCounts = useMemo(() => {
        const counts: Record<TabKey, number> = {
            NEW: 0,
            INFORMAL: 0,
            INVESTIGATION: 0,
            PENDING_DECISION: 0,
            AWAITING_EMPLOYEE: 0,
            OBJECTIONS: 0,
            DONE: 0,
        };

        cases.forEach((c) => {
            for (const [tabKey, statuses] of Object.entries(TAB_STATUS_MAP)) {
                if (statuses.includes(c.status)) {
                    counts[tabKey as TabKey]++;
                    break;
                }
            }
        });

        return counts;
    }, [cases]);

    const handleTabChange = (_: React.SyntheticEvent, newValue: TabKey) => {
        setActiveTab(newValue);
    };

    const handleOpenCase = (id: string) => {
        navigate(`/disciplinary/cases/${id}`);
    };

    const getDeadlineBadge = (caseItem: DisciplinaryCase) => {
        const deadlines = (caseItem as any).deadlines;
        if (!deadlines) return null;

        const { decisionRemainingDays, objectionRemainingDays } = deadlines;

        if (decisionRemainingDays !== undefined && decisionRemainingDays <= 7) {
            return (
                <Tooltip title={`${decisionRemainingDays} يوم للقرار`}>
                    <Chip
                        size="small"
                        icon={<Schedule />}
                        label={`${decisionRemainingDays} يوم`}
                        color={decisionRemainingDays <= 3 ? 'error' : 'warning'}
                    />
                </Tooltip>
            );
        }

        if (objectionRemainingDays !== undefined && objectionRemainingDays <= 5) {
            return (
                <Tooltip title={`${objectionRemainingDays} يوم للاعتراض`}>
                    <Chip
                        size="small"
                        icon={<Schedule />}
                        label={`${objectionRemainingDays} يوم`}
                        color={objectionRemainingDays <= 2 ? 'error' : 'warning'}
                    />
                </Tooltip>
            );
        }

        return null;
    };

    if (isLoading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Alert severity="error" sx={{ m: 2 }}>
                فشل تحميل البيانات. <Button onClick={() => refetch()}>إعادة المحاولة</Button>
            </Alert>
        );
    }

    return (
        <Box>
            {/* Header */}
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                    <Typography variant="h4" fontWeight="bold" gutterBottom>
                        صندوق الجزاءات - HR
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        إدارة طلبات التحقيق والقضايا التأديبية
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<Add />}
                    onClick={() => setShowCreateDialog(true)}
                    size="large"
                >
                    طلب تحقيق جديد
                </Button>
            </Box>

            {/* Tabs */}
            <Paper sx={{ mb: 3 }}>
                <Tabs
                    value={activeTab}
                    onChange={handleTabChange}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{
                        '& .MuiTab-root': {
                            minHeight: 64,
                            textTransform: 'none',
                        },
                    }}
                >
                    {TAB_CONFIG.map((tab) => (
                        <Tab
                            key={tab.key}
                            value={tab.key}
                            label={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Badge
                                        badgeContent={tabCounts[tab.key]}
                                        color={tab.key === 'OBJECTIONS' ? 'error' : 'primary'}
                                        max={99}
                                    >
                                        {tab.icon}
                                    </Badge>
                                    <Typography variant="body2">{tab.label}</Typography>
                                </Box>
                            }
                        />
                    ))}
                </Tabs>
            </Paper>

            {/* Search */}
            <Card sx={{ mb: 3 }}>
                <CardContent sx={{ py: 2 }}>
                    <TextField
                        fullWidth
                        placeholder="بحث بكود القضية أو اسم الموظف..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Search />
                                </InputAdornment>
                            ),
                        }}
                        size="small"
                    />
                </CardContent>
            </Card>

            {/* Cases Table */}
            <Card>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>كود القضية</TableCell>
                                <TableCell>الموظف</TableCell>
                                <TableCell>نوع المخالفة</TableCell>
                                <TableCell>تاريخ الواقعة</TableCell>
                                <TableCell>الحالة</TableCell>
                                <TableCell>المواعيد</TableCell>
                                <TableCell align="center">إجراء</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredCases.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center">
                                        <Box py={4}>
                                            <Typography color="text.secondary">
                                                لا توجد قضايا في هذا التبويب
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredCases.map((caseItem) => {
                                    const statusConfig = STATUS_LABELS[caseItem.status] || {
                                        label: caseItem.status,
                                        color: 'default' as const,
                                    };

                                    return (
                                        <TableRow
                                            key={caseItem.id}
                                            hover
                                            sx={{ cursor: 'pointer' }}
                                            onClick={() => handleOpenCase(caseItem.id)}
                                        >
                                            <TableCell>
                                                <Typography fontWeight="bold" color="primary">
                                                    {caseItem.caseCode}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Box>
                                                    <Typography variant="body2" fontWeight="medium">
                                                        {caseItem.employee?.firstName} {caseItem.employee?.lastName}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {caseItem.employee?.employeeCode}
                                                    </Typography>
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" sx={{ maxWidth: 200 }} noWrap>
                                                    {caseItem.title}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                {caseItem.incidentDate
                                                    ? format(new Date(caseItem.incidentDate), 'yyyy/MM/dd', { locale: ar })
                                                    : '-'}
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    size="small"
                                                    label={statusConfig.label}
                                                    color={statusConfig.color}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                {getDeadlineBadge(caseItem)}
                                            </TableCell>
                                            <TableCell align="center">
                                                <IconButton
                                                    color="primary"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleOpenCase(caseItem.id);
                                                    }}
                                                >
                                                    <Visibility />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>

            {/* Create Investigation Dialog */}
            <CreateInvestigationDialog
                open={showCreateDialog}
                onClose={() => setShowCreateDialog(false)}
                onSuccess={(caseId) => {
                    setShowCreateDialog(false);
                    queryClient.invalidateQueries({ queryKey: ['disciplinary-cases'] });
                    refetch();
                    if (caseId) {
                        navigate(`/disciplinary/cases/${caseId}`);
                    }
                }}
            />
        </Box>
    );
};
