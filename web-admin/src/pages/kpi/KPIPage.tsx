/**
 * KPI Management Page
 * Full CRUD UI for KPI Engine
 */
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Box,
    Paper,
    Typography,
    Grid,
    Card,
    CardContent,
    Button,
    Chip,
    Tabs,
    Tab,
    TextField,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert,
    CircularProgress,
    LinearProgress,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Snackbar,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Tooltip,
    Avatar,
} from '@mui/material';
import {
    Speed as SpeedIcon,
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Refresh as RefreshIcon,
    Assessment as AssessmentIcon,
    TrendingUp as TrendingUpIcon,
    Group as GroupIcon,
    Calculate as CalculateIcon,
    Upload as UploadIcon,
    Download as DownloadIcon,
    CheckCircle as CheckCircleIcon,
    Warning as WarningIcon,
} from '@mui/icons-material';
import { kpiService, KPIDefinition, KPIAssignment } from '../../services/kpi.service';
import { api } from '../../services/api.service';

// Helper functions
const getRatingColor = (score: number | undefined | null): string => {
    if (!score) return 'grey';
    if (score >= 90) return '#4CAF50'; // Exceptional - Green
    if (score >= 80) return '#2196F3'; // Exceeds - Blue
    if (score >= 70) return '#FFC107'; // Meets - Yellow
    if (score >= 60) return '#FF9800'; // Partial - Orange
    return '#F44336'; // Needs Improvement - Red
};

const getRatingLabel = (score: number | undefined | null): string => {
    if (!score) return 'لم يُحسب';
    if (score >= 90) return 'استثنائي';
    if (score >= 80) return 'يفوق التوقعات';
    if (score >= 70) return 'يلبي التوقعات';
    if (score >= 60) return 'يلبي جزئياً';
    return 'يحتاج تحسين';
};

const frequencyLabels: Record<string, string> = {
    DAILY: 'يومي',
    WEEKLY: 'أسبوعي',
    MONTHLY: 'شهري',
    QUARTERLY: 'ربع سنوي',
    YEARLY: 'سنوي',
};

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;
    return (
        <div hidden={value !== index} {...other}>
            {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
        </div>
    );
}

export default function KPIPage() {
    const [tabValue, setTabValue] = useState(0);
    const [definitionDialog, setDefinitionDialog] = useState(false);
    const [editingDefinition, setEditingDefinition] = useState<KPIDefinition | null>(null);
    const [assignmentDialog, setAssignmentDialog] = useState(false);
    const [entryDialog, setEntryDialog] = useState(false);
    const [selectedAssignment, setSelectedAssignment] = useState<KPIAssignment | null>(null);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success',
    });
    const queryClient = useQueryClient();

    // Get companyId from localStorage user or API
    const { data: userData, isLoading: userLoading, isError: userError } = useQuery({
        queryKey: ['user-company-for-kpi'],
        queryFn: async () => {
            // First try: Get from localStorage (set during login)
            const userStr = localStorage.getItem('user');
            if (userStr) {
                try {
                    const user = JSON.parse(userStr);
                    if (user.companyId) return user.companyId;
                } catch (e) { /* ignore */ }
            }

            // Second try: Get from users API
            try {
                const response = await api.get('/users?limit=1');
                const users = Array.isArray(response) ? response : response?.data || [];
                if (users[0]?.companyId) return users[0].companyId;
            } catch (e) { /* ignore */ }

            // Fallback: Use first company from DB (admin@company.com's company)
            return '';
        },
        retry: 1,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
    const companyId = userData || '';

    // Get performance cycles
    const { data: cycles } = useQuery({
        queryKey: ['performance-cycles'],
        queryFn: async () => {
            const response = await api.get('/performance-reviews/cycles');
            return Array.isArray(response) ? response : response?.data || [];
        },
    });
    const [selectedCycleId, setSelectedCycleId] = useState('');

    // Get employees
    const { data: employees } = useQuery({
        queryKey: ['employees-for-kpi'],
        queryFn: async () => {
            const response = await api.get('/users?limit=500');
            return Array.isArray(response) ? response : response?.data || [];
        },
    });

    // Fetch KPI definitions
    const { data: definitions, isLoading: definitionsLoading, refetch: refetchDefinitions } = useQuery({
        queryKey: ['kpi-definitions', companyId],
        queryFn: () => kpiService.getDefinitions(companyId),
        enabled: !!companyId,
    });

    // Fetch KPI assignments
    const { data: assignments, isLoading: assignmentsLoading, refetch: refetchAssignments } = useQuery({
        queryKey: ['kpi-assignments', selectedCycleId],
        queryFn: () => kpiService.getAssignments({ cycleId: selectedCycleId || undefined }),
        enabled: !!companyId,
    });

    // Set default cycle
    useEffect(() => {
        if (cycles?.length && !selectedCycleId) {
            const activeCycle = cycles.find((c: any) => c.status === 'ACTIVE') || cycles[0];
            if (activeCycle) setSelectedCycleId(activeCycle.id);
        }
    }, [cycles, selectedCycleId]);

    // Mutations
    const createDefinitionMutation = useMutation({
        mutationFn: (data: any) => kpiService.createDefinition(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['kpi-definitions'] });
            setDefinitionDialog(false);
            setEditingDefinition(null);
            setSnackbar({ open: true, message: 'تم إنشاء مؤشر الأداء بنجاح!', severity: 'success' });
        },
        onError: () => setSnackbar({ open: true, message: 'فشل إنشاء مؤشر الأداء', severity: 'error' }),
    });

    const updateDefinitionMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => kpiService.updateDefinition(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['kpi-definitions'] });
            setDefinitionDialog(false);
            setEditingDefinition(null);
            setSnackbar({ open: true, message: 'تم تحديث مؤشر الأداء بنجاح!', severity: 'success' });
        },
        onError: () => setSnackbar({ open: true, message: 'فشل تحديث مؤشر الأداء', severity: 'error' }),
    });

    const deleteDefinitionMutation = useMutation({
        mutationFn: (id: string) => kpiService.deleteDefinition(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['kpi-definitions'] });
            setSnackbar({ open: true, message: 'تم حذف مؤشر الأداء', severity: 'success' });
        },
        onError: () => setSnackbar({ open: true, message: 'فشل حذف مؤشر الأداء', severity: 'error' }),
    });

    const seedKPIsMutation = useMutation({
        mutationFn: () => kpiService.seedDefaultKPIs(companyId),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['kpi-definitions'] });
            setSnackbar({ open: true, message: `تم إنشاء ${data.seeded} مؤشرات أداء افتراضية!`, severity: 'success' });
        },
        onError: () => setSnackbar({ open: true, message: 'فشل إنشاء المؤشرات الافتراضية', severity: 'error' }),
    });

    const createAssignmentMutation = useMutation({
        mutationFn: (data: any) => kpiService.createAssignment(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['kpi-assignments'] });
            setAssignmentDialog(false);
            setSnackbar({ open: true, message: 'تم تعيين المؤشر بنجاح!', severity: 'success' });
        },
        onError: () => setSnackbar({ open: true, message: 'فشل تعيين المؤشر', severity: 'error' }),
    });

    const createEntryMutation = useMutation({
        mutationFn: (data: any) => kpiService.createEntry(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['kpi-assignments'] });
            setEntryDialog(false);
            setSelectedAssignment(null);
            setSnackbar({ open: true, message: 'تم تسجيل القيمة بنجاح!', severity: 'success' });
        },
        onError: () => setSnackbar({ open: true, message: 'فشل تسجيل القيمة', severity: 'error' }),
    });

    const recalculateMutation = useMutation({
        mutationFn: () => kpiService.recalculateAllScores(selectedCycleId),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['kpi-assignments'] });
            setSnackbar({ open: true, message: `تم إعادة حساب ${data.recalculated} تعيين!`, severity: 'success' });
        },
        onError: () => setSnackbar({ open: true, message: 'فشل إعادة الحساب', severity: 'error' }),
    });

    // Loading state
    if (userLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    // Error state
    if (userError || !companyId) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="warning" sx={{ mb: 2 }}>
                    لم يتم العثور على بيانات الشركة. تأكد من تسجيل الدخول بحساب مرتبط بشركة.
                </Alert>
                <Button variant="contained" onClick={() => window.location.reload()}>
                    إعادة المحاولة
                </Button>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <SpeedIcon sx={{ fontSize: 36, mr: 2, color: 'primary.main' }} />
                    <Box>
                        <Typography variant="h4" fontWeight="bold">
                            محرك مؤشرات الأداء (KPI)
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            إدارة وتتبع مؤشرات الأداء الرئيسية للموظفين
                        </Typography>
                    </Box>
                </Box>

                <FormControl sx={{ minWidth: 200 }}>
                    <InputLabel>دورة التقييم</InputLabel>
                    <Select
                        value={selectedCycleId}
                        onChange={(e) => setSelectedCycleId(e.target.value)}
                        label="دورة التقييم"
                        size="small"
                    >
                        {(cycles || []).map((cycle: any) => (
                            <MenuItem key={cycle.id} value={cycle.id}>
                                {cycle.name}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Box>

            {/* Tabs */}
            <Paper sx={{ mb: 3 }}>
                <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
                    <Tab icon={<SpeedIcon />} label="تعريفات KPI" />
                    <Tab icon={<GroupIcon />} label="تعيينات الموظفين" />
                    <Tab icon={<AssessmentIcon />} label="نظرة عامة" />
                </Tabs>
            </Paper>

            {/* Tab 1: KPI Definitions */}
            <TabPanel value={tabValue} index={0}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h6">تعريفات مؤشرات الأداء</Typography>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <Button
                            variant="outlined"
                            startIcon={seedKPIsMutation.isPending ? <CircularProgress size={20} /> : <DownloadIcon />}
                            onClick={() => seedKPIsMutation.mutate()}
                            disabled={seedKPIsMutation.isPending}
                        >
                            إنشاء افتراضية
                        </Button>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => {
                                setEditingDefinition(null);
                                setDefinitionDialog(true);
                            }}
                        >
                            إضافة مؤشر
                        </Button>
                    </Box>
                </Box>

                {definitionsLoading ? (
                    <CircularProgress />
                ) : !definitions?.length ? (
                    <Alert severity="info">
                        لا توجد مؤشرات أداء. أضف مؤشر جديد أو استخدم زر "إنشاء افتراضية" لإضافة مؤشرات شائعة.
                    </Alert>
                ) : (
                    <Grid container spacing={2}>
                        {definitions.map((def: KPIDefinition) => (
                            <Grid item xs={12} md={6} lg={4} key={def.id}>
                                <Card sx={{
                                    opacity: def.isActive ? 1 : 0.6,
                                    border: def.isActive ? '1px solid' : '1px dashed',
                                    borderColor: def.isActive ? 'primary.main' : 'grey.400',
                                }}>
                                    <CardContent>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <Box>
                                                <Typography variant="h6" fontWeight="bold">
                                                    {def.nameAr || def.name}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {def.code} • {def.unit}
                                                </Typography>
                                            </Box>
                                            <Box>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => {
                                                        setEditingDefinition(def);
                                                        setDefinitionDialog(true);
                                                    }}
                                                >
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={() => {
                                                        if (confirm('هل أنت متأكد من حذف هذا المؤشر؟')) {
                                                            deleteDefinitionMutation.mutate(def.id);
                                                        }
                                                    }}
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Box>
                                        </Box>

                                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
                                            {def.description || 'لا يوجد وصف'}
                                        </Typography>

                                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                            <Chip size="small" label={frequencyLabels[def.frequency] || def.frequency} />
                                            <Chip size="small" variant="outlined" label={`${def._count?.assignments || 0} تعيين`} />
                                            {!def.isActive && <Chip size="small" color="error" label="غير نشط" />}
                                        </Box>

                                        <Box sx={{ mt: 2, p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
                                            <Typography variant="caption" color="text.secondary">
                                                العتبات: استثنائي ≥{def.thresholds.exceptional} | يفوق ≥{def.thresholds.exceeds} | يلبي ≥{def.thresholds.meets}
                                            </Typography>
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                )}
            </TabPanel>

            {/* Tab 2: Assignments */}
            <TabPanel value={tabValue} index={1}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h6">تعيينات مؤشرات الأداء</Typography>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <Button
                            variant="outlined"
                            startIcon={recalculateMutation.isPending ? <CircularProgress size={20} /> : <CalculateIcon />}
                            onClick={() => recalculateMutation.mutate()}
                            disabled={recalculateMutation.isPending || !selectedCycleId}
                        >
                            إعادة حساب الدرجات
                        </Button>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => setAssignmentDialog(true)}
                            disabled={!definitions?.length}
                        >
                            تعيين مؤشر
                        </Button>
                    </Box>
                </Box>

                {!selectedCycleId ? (
                    <Alert severity="warning">اختر دورة تقييم من القائمة أعلاه</Alert>
                ) : assignmentsLoading ? (
                    <CircularProgress />
                ) : !assignments?.length ? (
                    <Alert severity="info">لا توجد تعيينات لهذه الدورة. قم بتعيين مؤشرات أداء للموظفين.</Alert>
                ) : (
                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>الموظف</TableCell>
                                    <TableCell>المؤشر</TableCell>
                                    <TableCell align="center">الهدف</TableCell>
                                    <TableCell align="center">الفعلي</TableCell>
                                    <TableCell align="center">الدرجة</TableCell>
                                    <TableCell align="center">الوزن</TableCell>
                                    <TableCell align="center">الإجراءات</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {assignments.map((assignment: KPIAssignment) => (
                                    <TableRow key={assignment.id}>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Avatar src={assignment.employee?.avatar} sx={{ width: 32, height: 32 }}>
                                                    {assignment.employee?.firstName?.[0]}
                                                </Avatar>
                                                <Box>
                                                    <Typography variant="body2" fontWeight="medium">
                                                        {assignment.employee?.firstName} {assignment.employee?.lastName}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {assignment.employee?.department?.name}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">
                                                {assignment.kpiDefinition?.nameAr || assignment.kpiDefinition?.name}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {assignment.kpiDefinition?.unit}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Typography variant="body2" fontWeight="medium">
                                                {assignment.target}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Typography
                                                variant="body2"
                                                fontWeight="medium"
                                                color={assignment.actualValue ? 'inherit' : 'text.secondary'}
                                            >
                                                {assignment.actualValue?.toFixed(2) || '-'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Chip
                                                label={`${assignment.score?.toFixed(0) || 0}%`}
                                                size="small"
                                                sx={{
                                                    bgcolor: getRatingColor(assignment.score as number),
                                                    color: 'white',
                                                    fontWeight: 'bold',
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell align="center">
                                            <Typography variant="body2">{assignment.weight}%</Typography>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Tooltip title="تسجيل قيمة">
                                                <IconButton
                                                    size="small"
                                                    color="primary"
                                                    onClick={() => {
                                                        setSelectedAssignment(assignment);
                                                        setEntryDialog(true);
                                                    }}
                                                >
                                                    <AddIcon />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </TabPanel>

            {/* Tab 3: Overview */}
            <TabPanel value={tabValue} index={2}>
                <Typography variant="h6" gutterBottom>
                    نظرة عامة على الأداء
                </Typography>

                {!selectedCycleId ? (
                    <Alert severity="warning">اختر دورة تقييم لعرض الإحصائيات</Alert>
                ) : (
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={4}>
                            <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
                                <CardContent>
                                    <Typography variant="h3" fontWeight="bold">
                                        {definitions?.length || 0}
                                    </Typography>
                                    <Typography variant="body1">مؤشرات الأداء</Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Card sx={{ bgcolor: 'success.main', color: 'white' }}>
                                <CardContent>
                                    <Typography variant="h3" fontWeight="bold">
                                        {assignments?.length || 0}
                                    </Typography>
                                    <Typography variant="body1">تعيينات نشطة</Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Card sx={{ bgcolor: 'warning.main', color: 'white' }}>
                                <CardContent>
                                    <Typography variant="h3" fontWeight="bold">
                                        {assignments?.filter((a: KPIAssignment) => a.score)?.length || 0}
                                    </Typography>
                                    <Typography variant="body1">تعيينات محسوبة</Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                )}
            </TabPanel>

            {/* Definition Dialog */}
            <KPIDefinitionDialog
                open={definitionDialog}
                onClose={() => {
                    setDefinitionDialog(false);
                    setEditingDefinition(null);
                }}
                onSubmit={(data) => {
                    if (editingDefinition) {
                        updateDefinitionMutation.mutate({ id: editingDefinition.id, data });
                    } else {
                        createDefinitionMutation.mutate({ ...data, companyId });
                    }
                }}
                loading={createDefinitionMutation.isPending || updateDefinitionMutation.isPending}
                editData={editingDefinition}
            />

            {/* Assignment Dialog */}
            <KPIAssignmentDialog
                open={assignmentDialog}
                onClose={() => setAssignmentDialog(false)}
                onSubmit={(data) => createAssignmentMutation.mutate({ ...data, cycleId: selectedCycleId })}
                loading={createAssignmentMutation.isPending}
                definitions={definitions || []}
                employees={employees || []}
            />

            {/* Entry Dialog */}
            <KPIEntryDialog
                open={entryDialog}
                onClose={() => {
                    setEntryDialog(false);
                    setSelectedAssignment(null);
                }}
                onSubmit={(data) => createEntryMutation.mutate(data)}
                loading={createEntryMutation.isPending}
                assignment={selectedAssignment}
            />

            {/* Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
            >
                <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}

// KPI Definition Dialog
function KPIDefinitionDialog({
    open, onClose, onSubmit, loading, editData
}: {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
    loading: boolean;
    editData: KPIDefinition | null;
}) {
    const [code, setCode] = useState('');
    const [name, setName] = useState('');
    const [nameAr, setNameAr] = useState('');
    const [description, setDescription] = useState('');
    const [unit, setUnit] = useState('%');
    const [frequency, setFrequency] = useState('MONTHLY');
    const [exceptional, setExceptional] = useState(95);
    const [exceeds, setExceeds] = useState(85);
    const [meets, setMeets] = useState(70);
    const [partial, setPartial] = useState(60);

    useEffect(() => {
        if (editData) {
            setCode(editData.code);
            setName(editData.name);
            setNameAr(editData.nameAr || '');
            setDescription(editData.description || '');
            setUnit(editData.unit);
            setFrequency(editData.frequency);
            setExceptional(editData.thresholds.exceptional);
            setExceeds(editData.thresholds.exceeds);
            setMeets(editData.thresholds.meets);
            setPartial(editData.thresholds.partial);
        } else {
            setCode('');
            setName('');
            setNameAr('');
            setDescription('');
            setUnit('%');
            setFrequency('MONTHLY');
            setExceptional(95);
            setExceeds(85);
            setMeets(70);
            setPartial(60);
        }
    }, [editData, open]);

    const handleSubmit = () => {
        if (code && name) {
            onSubmit({
                code: code.toUpperCase(),
                name,
                nameAr: nameAr || undefined,
                description: description || undefined,
                unit,
                frequency,
                thresholds: { exceptional, exceeds, meets, partial },
            });
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{editData ? 'تعديل مؤشر الأداء' : 'إضافة مؤشر أداء جديد'}</DialogTitle>
            <DialogContent>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={6}>
                        <TextField
                            fullWidth
                            label="الكود"
                            value={code}
                            onChange={(e) => setCode(e.target.value.toUpperCase())}
                            placeholder="SLA_ADHERENCE"
                            disabled={!!editData}
                        />
                    </Grid>
                    <Grid item xs={6}>
                        <FormControl fullWidth>
                            <InputLabel>التكرار</InputLabel>
                            <Select value={frequency} onChange={(e) => setFrequency(e.target.value)} label="التكرار">
                                <MenuItem value="DAILY">يومي</MenuItem>
                                <MenuItem value="WEEKLY">أسبوعي</MenuItem>
                                <MenuItem value="MONTHLY">شهري</MenuItem>
                                <MenuItem value="QUARTERLY">ربع سنوي</MenuItem>
                                <MenuItem value="YEARLY">سنوي</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={6}>
                        <TextField fullWidth label="الاسم (English)" value={name} onChange={(e) => setName(e.target.value)} />
                    </Grid>
                    <Grid item xs={6}>
                        <TextField fullWidth label="الاسم (عربي)" value={nameAr} onChange={(e) => setNameAr(e.target.value)} />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField fullWidth multiline rows={2} label="الوصف" value={description} onChange={(e) => setDescription(e.target.value)} />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField fullWidth label="الوحدة" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="%, count, SAR, hours" />
                    </Grid>
                    <Grid item xs={12}>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>العتبات (Thresholds)</Typography>
                    </Grid>
                    <Grid item xs={3}>
                        <TextField fullWidth type="number" label="استثنائي" value={exceptional} onChange={(e) => setExceptional(+e.target.value)} size="small" />
                    </Grid>
                    <Grid item xs={3}>
                        <TextField fullWidth type="number" label="يفوق" value={exceeds} onChange={(e) => setExceeds(+e.target.value)} size="small" />
                    </Grid>
                    <Grid item xs={3}>
                        <TextField fullWidth type="number" label="يلبي" value={meets} onChange={(e) => setMeets(+e.target.value)} size="small" />
                    </Grid>
                    <Grid item xs={3}>
                        <TextField fullWidth type="number" label="جزئي" value={partial} onChange={(e) => setPartial(+e.target.value)} size="small" />
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>إلغاء</Button>
                <Button variant="contained" onClick={handleSubmit} disabled={!code || !name || loading}>
                    {loading ? <CircularProgress size={24} /> : editData ? 'تحديث' : 'إضافة'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

// KPI Assignment Dialog
function KPIAssignmentDialog({
    open, onClose, onSubmit, loading, definitions, employees
}: {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
    loading: boolean;
    definitions: KPIDefinition[];
    employees: any[];
}) {
    const [employeeId, setEmployeeId] = useState('');
    const [kpiDefinitionId, setKpiDefinitionId] = useState('');
    const [target, setTarget] = useState(100);
    const [weight, setWeight] = useState(100);

    const handleSubmit = () => {
        if (employeeId && kpiDefinitionId) {
            onSubmit({ employeeId, kpiDefinitionId, target, weight });
            setEmployeeId('');
            setKpiDefinitionId('');
            setTarget(100);
            setWeight(100);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>تعيين مؤشر أداء للموظف</DialogTitle>
            <DialogContent>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={12}>
                        <FormControl fullWidth>
                            <InputLabel>الموظف</InputLabel>
                            <Select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} label="الموظف">
                                {employees.map((emp: any) => (
                                    <MenuItem key={emp.id} value={emp.id}>
                                        {emp.firstName} {emp.lastName} - {emp.employeeCode}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12}>
                        <FormControl fullWidth>
                            <InputLabel>مؤشر الأداء</InputLabel>
                            <Select value={kpiDefinitionId} onChange={(e) => setKpiDefinitionId(e.target.value)} label="مؤشر الأداء">
                                {definitions.filter(d => d.isActive).map((def) => (
                                    <MenuItem key={def.id} value={def.id}>
                                        {def.nameAr || def.name} ({def.unit})
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={6}>
                        <TextField fullWidth type="number" label="الهدف" value={target} onChange={(e) => setTarget(+e.target.value)} />
                    </Grid>
                    <Grid item xs={6}>
                        <TextField fullWidth type="number" label="الوزن %" value={weight} onChange={(e) => setWeight(+e.target.value)} InputProps={{ inputProps: { min: 0, max: 100 } }} />
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>إلغاء</Button>
                <Button variant="contained" onClick={handleSubmit} disabled={!employeeId || !kpiDefinitionId || loading}>
                    {loading ? <CircularProgress size={24} /> : 'تعيين'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

// KPI Entry Dialog
function KPIEntryDialog({
    open, onClose, onSubmit, loading, assignment
}: {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
    loading: boolean;
    assignment: KPIAssignment | null;
}) {
    const [periodStart, setPeriodStart] = useState('');
    const [periodEnd, setPeriodEnd] = useState('');
    const [value, setValue] = useState(0);
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (open) {
            const now = new Date();
            const start = new Date(now.getFullYear(), now.getMonth(), 1);
            const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            setPeriodStart(start.toISOString().split('T')[0]);
            setPeriodEnd(end.toISOString().split('T')[0]);
            setValue(0);
            setNotes('');
        }
    }, [open]);

    const handleSubmit = () => {
        if (assignment && value !== undefined) {
            onSubmit({
                assignmentId: assignment.id,
                periodStart,
                periodEnd,
                value,
                notes: notes || undefined,
            });
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>تسجيل قيمة للمؤشر</DialogTitle>
            <DialogContent>
                {assignment && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                        المؤشر: {assignment.kpiDefinition?.nameAr || assignment.kpiDefinition?.name} • الهدف: {assignment.target}
                    </Alert>
                )}
                <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={6}>
                        <TextField fullWidth type="date" label="من تاريخ" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} InputLabelProps={{ shrink: true }} />
                    </Grid>
                    <Grid item xs={6}>
                        <TextField fullWidth type="date" label="إلى تاريخ" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} InputLabelProps={{ shrink: true }} />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField fullWidth type="number" label={`القيمة (${assignment?.kpiDefinition?.unit || ''})`} value={value} onChange={(e) => setValue(+e.target.value)} autoFocus />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField fullWidth multiline rows={2} label="ملاحظات" value={notes} onChange={(e) => setNotes(e.target.value)} />
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>إلغاء</Button>
                <Button variant="contained" onClick={handleSubmit} disabled={loading}>
                    {loading ? <CircularProgress size={24} /> : 'تسجيل'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
