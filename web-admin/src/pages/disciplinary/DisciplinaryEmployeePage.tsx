import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    Box,
    Card,
    CardContent,
    Typography,
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
    Button,
    Tabs,
    Tab,
    Badge,
} from '@mui/material';
import {
    Search,
    Visibility,
    AccessTime,
    CheckCircle,
    Warning,
    Pending,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { disciplinaryService, DisciplinaryCase } from '@/services/disciplinary.service';

// Tab keys for Employee view
type EmployeeTabKey = 'AWAITING_INFORMAL' | 'AWAITING_DECISION' | 'OTHER' | 'ALL';

// Map tab keys to statuses
const EMPLOYEE_TAB_STATUS_MAP: Record<EmployeeTabKey, string[]> = {
    AWAITING_INFORMAL: ['AWAITING_EMPLOYEE_INFORMAL', 'HR_INFORMAL_SENT', 'INFORMAL_NOTICE_ISSUED'],
    AWAITING_DECISION: ['DECISION_ISSUED', 'AWAITING_EMPLOYEE_ACK'],
    OTHER: [
        'SUBMITTED_TO_HR',
        'OFFICIAL_INVESTIGATION_OPENED',
        'HEARING_SCHEDULED',
        'INVESTIGATION_IN_PROGRESS',
        'AWAITING_HR_DECISION',
        'EMPLOYEE_OBJECTED',
        'HR_REVIEWING_OBJECTION',
        'FINALIZED_APPROVED',
        'FINALIZED_CANCELLED',
    ],
    ALL: [], // Show all
};

// Tab config
const EMPLOYEE_TAB_CONFIG: { key: EmployeeTabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'ALL', label: 'الكل', icon: <Pending /> },
    { key: 'AWAITING_INFORMAL', label: 'بانتظار ردك (غير رسمي)', icon: <Warning color="warning" /> },
    { key: 'AWAITING_DECISION', label: 'بانتظار ردك (قرار)', icon: <AccessTime color="error" /> },
    { key: 'OTHER', label: 'أخرى', icon: <CheckCircle /> },
];

// Status labels
const STATUS_LABELS: Record<string, { label: string; color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' }> = {
    AWAITING_EMPLOYEE_INFORMAL: { label: 'بانتظار ردك', color: 'warning' },
    HR_INFORMAL_SENT: { label: 'لفت نظر', color: 'warning' },
    INFORMAL_NOTICE_ISSUED: { label: 'لفت نظر', color: 'warning' },
    DECISION_ISSUED: { label: 'صدر قرار - بانتظار ردك', color: 'error' },
    AWAITING_EMPLOYEE_ACK: { label: 'بانتظار ردك على القرار', color: 'error' },
    SUBMITTED_TO_HR: { label: 'قيد المراجعة', color: 'info' },
    OFFICIAL_INVESTIGATION_OPENED: { label: 'تحقيق جاري', color: 'warning' },
    HEARING_SCHEDULED: { label: 'جلسة محددة', color: 'warning' },
    INVESTIGATION_IN_PROGRESS: { label: 'تحقيق جاري', color: 'warning' },
    AWAITING_HR_DECISION: { label: 'بانتظار القرار', color: 'secondary' },
    EMPLOYEE_OBJECTED: { label: 'تم الاعتراض', color: 'error' },
    HR_REVIEWING_OBJECTION: { label: 'مراجعة اعتراضك', color: 'info' },
    FINALIZED_APPROVED: { label: 'معتمدة', color: 'success' },
    FINALIZED_CANCELLED: { label: 'ملغاة', color: 'default' },
};

export const DisciplinaryEmployeePage = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<EmployeeTabKey>('ALL');
    const [searchQuery, setSearchQuery] = useState('');

    // Fetch employee cases
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['disciplinary-cases', 'employee'],
        queryFn: () => disciplinaryService.getCases('employee'),
    });

    const cases = (data || []) as DisciplinaryCase[];

    // Filter cases by tab and search
    const filteredCases = useMemo(() => {
        const statuses = EMPLOYEE_TAB_STATUS_MAP[activeTab];
        return cases
            .filter((c) => {
                if (statuses.length === 0) return true; // ALL tab
                return statuses.includes(c.status);
            })
            .filter((c) => {
                if (!searchQuery.trim()) return true;
                const q = searchQuery.toLowerCase();
                return c.caseCode?.toLowerCase().includes(q) || c.title?.toLowerCase().includes(q);
            });
    }, [cases, activeTab, searchQuery]);

    // Count cases per tab
    const tabCounts = useMemo(() => {
        const counts: Record<EmployeeTabKey, number> = {
            ALL: cases.length,
            AWAITING_INFORMAL: 0,
            AWAITING_DECISION: 0,
            OTHER: 0,
        };

        cases.forEach((c) => {
            if (EMPLOYEE_TAB_STATUS_MAP.AWAITING_INFORMAL.includes(c.status)) {
                counts.AWAITING_INFORMAL++;
            } else if (EMPLOYEE_TAB_STATUS_MAP.AWAITING_DECISION.includes(c.status)) {
                counts.AWAITING_DECISION++;
            } else if (EMPLOYEE_TAB_STATUS_MAP.OTHER.includes(c.status)) {
                counts.OTHER++;
            }
        });

        return counts;
    }, [cases]);

    const handleOpenCase = (id: string) => {
        navigate(`/disciplinary/cases/${id}`);
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
            <Box sx={{ mb: 3 }}>
                <Typography variant="h4" fontWeight="bold" gutterBottom>
                    القضايا التأديبية الخاصة بك
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    متابعة حالة القضايا والرد على الإجراءات
                </Typography>
            </Box>

            {/* Tabs */}
            <Card sx={{ mb: 3 }}>
                <Tabs
                    value={activeTab}
                    onChange={(_, v) => setActiveTab(v)}
                    sx={{ borderBottom: 1, borderColor: 'divider' }}
                    variant="scrollable"
                    scrollButtons="auto"
                >
                    {EMPLOYEE_TAB_CONFIG.map((tab) => (
                        <Tab
                            key={tab.key}
                            value={tab.key}
                            icon={
                                <Badge
                                    badgeContent={tabCounts[tab.key]}
                                    color={tab.key === 'AWAITING_DECISION' ? 'error' : tab.key === 'AWAITING_INFORMAL' ? 'warning' : 'primary'}
                                    max={99}
                                >
                                    {tab.icon}
                                </Badge>
                            }
                            iconPosition="start"
                            label={tab.label}
                        />
                    ))}
                </Tabs>
            </Card>

            {/* Urgent Alert */}
            {tabCounts.AWAITING_DECISION > 0 && activeTab !== 'AWAITING_DECISION' && (
                <Alert
                    severity="error"
                    sx={{ mb: 3 }}
                    action={
                        <Button color="inherit" size="small" onClick={() => setActiveTab('AWAITING_DECISION')}>
                            عرض
                        </Button>
                    }
                >
                    لديك {tabCounts.AWAITING_DECISION} قرار/قرارات بانتظار ردك - قد تفقد حق الاعتراض!
                </Alert>
            )}

            {/* Search */}
            <Card sx={{ mb: 3 }}>
                <CardContent sx={{ py: 2 }}>
                    <TextField
                        fullWidth
                        placeholder="بحث بكود القضية أو الموضوع..."
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
                                <TableCell>الموضوع</TableCell>
                                <TableCell>تاريخ الواقعة</TableCell>
                                <TableCell>الحالة</TableCell>
                                <TableCell>موعد الرد</TableCell>
                                <TableCell align="center">عرض</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredCases.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} align="center">
                                        <Box py={4}>
                                            <Typography color="text.secondary">
                                                {activeTab === 'ALL'
                                                    ? 'لا توجد قضايا تخصك حاليًا'
                                                    : 'لا توجد قضايا في هذا التصنيف'}
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

                                    // Check for deadline
                                    const hasUrgentDeadline =
                                        caseItem.deadlines?.objection &&
                                        caseItem.deadlines.objection.daysRemaining <= 3 &&
                                        caseItem.deadlines.objection.daysRemaining > 0;

                                    return (
                                        <TableRow
                                            key={caseItem.id}
                                            hover
                                            sx={{
                                                cursor: 'pointer',
                                                bgcolor: hasUrgentDeadline ? 'error.lighter' : undefined,
                                            }}
                                            onClick={() => handleOpenCase(caseItem.id)}
                                        >
                                            <TableCell>
                                                <Typography fontWeight="bold" color="primary">
                                                    {caseItem.caseCode}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" sx={{ maxWidth: 250 }} noWrap>
                                                    {caseItem.title}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                {caseItem.incidentDate
                                                    ? format(new Date(caseItem.incidentDate), 'yyyy/MM/dd')
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
                                                {caseItem.deadlines?.objection ? (
                                                    <Chip
                                                        size="small"
                                                        label={`${caseItem.deadlines.objection.daysRemaining} يوم`}
                                                        color={
                                                            caseItem.deadlines.objection.daysRemaining <= 3
                                                                ? 'error'
                                                                : caseItem.deadlines.objection.daysRemaining <= 7
                                                                    ? 'warning'
                                                                    : 'success'
                                                        }
                                                        variant="outlined"
                                                    />
                                                ) : (
                                                    '-'
                                                )}
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
        </Box>
    );
};
