import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
} from '@mui/material';
import {
    Search,
    Visibility,
    Add,
    Schedule,
    CheckCircle,
    PendingActions,
    Send,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { disciplinaryService, DisciplinaryCase } from '@/services/disciplinary.service';
import { CreateInvestigationDialog } from './components/CreateInvestigationDialog';

// Tab keys for Manager view
type ManagerTabKey = 'ALL' | 'SUBMITTED' | 'IN_PROGRESS' | 'FINALIZED';

// Map tab keys to statuses (from manager perspective)
const MANAGER_TAB_STATUS_MAP: Record<ManagerTabKey, string[]> = {
    ALL: [], // Show all
    SUBMITTED: ['SUBMITTED_TO_HR'],
    IN_PROGRESS: [
        'OFFICIAL_INVESTIGATION_OPENED',
        'HEARING_SCHEDULED',
        'INVESTIGATION_IN_PROGRESS',
        'AWAITING_HR_DECISION',
        'DECISION_ISSUED',
        'AWAITING_EMPLOYEE_ACK',
        'EMPLOYEE_OBJECTED',
        'HR_REVIEWING_OBJECTION',
        'INFORMAL_NOTICE_ISSUED',
        'INFORMAL_WARNING_ISSUED',
    ],
    FINALIZED: ['FINALIZED_APPROVED', 'FINALIZED_CANCELLED'],
};

// Tab display config
const MANAGER_TAB_CONFIG: { key: ManagerTabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'ALL', label: 'الكل', icon: <PendingActions /> },
    { key: 'SUBMITTED', label: 'مرفوعة', icon: <Send /> },
    { key: 'IN_PROGRESS', label: 'جاري المعالجة', icon: <Schedule /> },
    { key: 'FINALIZED', label: 'منتهية', icon: <CheckCircle /> },
];

// Status display mapping
const STATUS_LABELS: Record<string, { label: string; color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' }> = {
    SUBMITTED_TO_HR: { label: 'مرفوعة للـ HR', color: 'info' },
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
    INFORMAL_NOTICE_ISSUED: { label: 'لفت نظر', color: 'default' },
    INFORMAL_WARNING_ISSUED: { label: 'إنذار شفهي', color: 'default' },
};

export const DisciplinaryManagerPage = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<ManagerTabKey>('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [showCreateDialog, setShowCreateDialog] = useState(false);

    // Fetch cases for manager role
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['disciplinary-cases', 'manager'],
        queryFn: () => disciplinaryService.getCases('manager'),
    });

    const cases = (data || []) as DisciplinaryCase[];

    // Filter cases by tab and search
    const filteredCases = useMemo(() => {
        const statuses = MANAGER_TAB_STATUS_MAP[activeTab];
        return cases
            .filter((c) => {
                if (statuses.length === 0) return true; // ALL tab
                return statuses.includes(c.status);
            })
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
        const counts: Record<ManagerTabKey, number> = {
            ALL: cases.length,
            SUBMITTED: 0,
            IN_PROGRESS: 0,
            FINALIZED: 0,
        };

        cases.forEach((c) => {
            if (MANAGER_TAB_STATUS_MAP.SUBMITTED.includes(c.status)) {
                counts.SUBMITTED++;
            } else if (MANAGER_TAB_STATUS_MAP.IN_PROGRESS.includes(c.status)) {
                counts.IN_PROGRESS++;
            } else if (MANAGER_TAB_STATUS_MAP.FINALIZED.includes(c.status)) {
                counts.FINALIZED++;
            }
        });

        return counts;
    }, [cases]);

    const handleOpenCase = (id: string) => {
        navigate(`/disciplinary/cases/${id}`);
    };

    const handleCreateSuccess = (caseId?: string) => {
        setShowCreateDialog(false);
        // Invalidate and refetch
        queryClient.invalidateQueries({ queryKey: ['disciplinary-cases'] });
        refetch();
        // Navigate to case details if caseId is returned
        if (caseId) {
            navigate(`/disciplinary/cases/${caseId}`);
        }
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
                        القضايا التأديبية
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        إدارة ومتابعة طلبات التحقيق المرفوعة
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<Add />}
                    onClick={() => setShowCreateDialog(true)}
                    size="large"
                >
                    فتح تحقيق جديد
                </Button>
            </Box>

            {/* Stats Cards */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                {MANAGER_TAB_CONFIG.map((tab) => (
                    <Card
                        key={tab.key}
                        sx={{
                            minWidth: 150,
                            cursor: 'pointer',
                            border: activeTab === tab.key ? 2 : 0,
                            borderColor: 'primary.main',
                        }}
                        onClick={() => setActiveTab(tab.key)}
                    >
                        <CardContent sx={{ textAlign: 'center', py: 2 }}>
                            <Typography variant="h3" fontWeight="bold" color="primary">
                                {tabCounts[tab.key]}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {tab.label}
                            </Typography>
                        </CardContent>
                    </Card>
                ))}
            </Box>

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
                                <TableCell>تاريخ الرفع</TableCell>
                                <TableCell>الحالة</TableCell>
                                <TableCell align="center">عرض</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredCases.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center">
                                        <Box py={4}>
                                            <Typography color="text.secondary" gutterBottom>
                                                لا توجد قضايا
                                            </Typography>
                                            <Button
                                                variant="outlined"
                                                startIcon={<Add />}
                                                onClick={() => setShowCreateDialog(true)}
                                            >
                                                فتح تحقيق جديد
                                            </Button>
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
                                                    ? format(new Date(caseItem.incidentDate), 'yyyy/MM/dd')
                                                    : '-'}
                                            </TableCell>
                                            <TableCell>
                                                {caseItem.createdAt
                                                    ? format(new Date(caseItem.createdAt), 'yyyy/MM/dd')
                                                    : '-'}
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    size="small"
                                                    label={statusConfig.label}
                                                    color={statusConfig.color}
                                                />
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
                onSuccess={handleCreateSuccess}
            />
        </Box>
    );
};
