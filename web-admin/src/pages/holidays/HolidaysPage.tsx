import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControlLabel,
    Checkbox,
    CircularProgress,
    Alert,
    Grid,
    Tooltip,
    Paper,
    MenuItem,
    useTheme,
    alpha,
    Autocomplete,
    Switch,
    InputAdornment,
    Tabs,
    Tab,
    Collapse,
} from '@mui/material';
import {
    Add,
    Edit,
    Delete,
    CalendarMonth,
    Replay,
    Flag,
    Celebration,
    Today,
    Event,
    EventAvailable,
    FilterList,
    People,
    Business,
    AccountTree,
    AttachMoney,
    WorkOutline,
    ExpandMore,
    ExpandLess,
    Groups,
    PersonOff,
} from '@mui/icons-material';
import { format, isAfter, isBefore } from 'date-fns';
import { ar } from 'date-fns/locale';
import { api } from '@/services/api.service';

// Types
type ApplicationType = 'ALL' | 'BRANCH' | 'DEPARTMENT' | 'SPECIFIC_EMPLOYEES' | 'EXCLUDE_EMPLOYEES';

interface HolidayAssignment {
    id: string;
    assignmentType: string;
    branchId?: string;
    departmentId?: string;
    employeeId?: string;
}

interface Holiday {
    id: string;
    name: string;
    nameEn?: string;
    date: string;
    isRecurring: boolean;
    isPaid: boolean;
    applicationType: ApplicationType;
    countAsWorkDay: boolean;
    overtimeMultiplier: number;
    notes?: string;
    assignments?: HolidayAssignment[];
    companyId: string;
}

interface HolidayFormData {
    name: string;
    nameEn: string;
    date: string;
    isRecurring: boolean;
    isPaid: boolean;
    applicationType: ApplicationType;
    countAsWorkDay: boolean;
    overtimeMultiplier: number;
    notes: string;
    assignments?: {
        type: 'BRANCH' | 'DEPARTMENT' | 'EMPLOYEE';
        ids: string[];
    };
}

interface Branch {
    id: string;
    name: string;
    nameEn?: string;
}

interface Department {
    id: string;
    name: string;
    nameEn?: string;
}

interface Employee {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode?: string;
}

// العطلات الرسمية السعودية 2026
const SAUDI_OFFICIAL_HOLIDAYS = [
    { name: 'يوم التأسيس', nameEn: 'Founding Day', date: '2026-02-22', isRecurring: true },
    { name: 'عيد الفطر - اليوم الأول', nameEn: 'Eid Al-Fitr Day 1', date: '2026-03-19', isRecurring: false },
    { name: 'عيد الفطر - اليوم الثاني', nameEn: 'Eid Al-Fitr Day 2', date: '2026-03-20', isRecurring: false },
    { name: 'عيد الفطر - اليوم الثالث', nameEn: 'Eid Al-Fitr Day 3', date: '2026-03-21', isRecurring: false },
    { name: 'عيد الفطر - اليوم الرابع', nameEn: 'Eid Al-Fitr Day 4', date: '2026-03-22', isRecurring: false },
    { name: 'يوم عرفة', nameEn: 'Arafat Day', date: '2026-05-25', isRecurring: false },
    { name: 'عيد الأضحى - اليوم الأول', nameEn: 'Eid Al-Adha Day 1', date: '2026-05-26', isRecurring: false },
    { name: 'عيد الأضحى - اليوم الثاني', nameEn: 'Eid Al-Adha Day 2', date: '2026-05-27', isRecurring: false },
    { name: 'عيد الأضحى - اليوم الثالث', nameEn: 'Eid Al-Adha Day 3', date: '2026-05-28', isRecurring: false },
    { name: 'عيد الأضحى - اليوم الرابع', nameEn: 'Eid Al-Adha Day 4', date: '2026-05-29', isRecurring: false },
    { name: 'اليوم الوطني السعودي', nameEn: 'Saudi National Day', date: '2026-09-23', isRecurring: true },
];

const APPLICATION_TYPES: { value: ApplicationType; label: string; icon: React.ReactNode; description: string }[] = [
    { value: 'ALL', label: 'جميع الموظفين', icon: <Groups />, description: 'العطلة تطبق على كل موظفي الشركة' },
    { value: 'BRANCH', label: 'فروع محددة', icon: <Business />, description: 'العطلة تطبق على فروع مختارة فقط' },
    { value: 'DEPARTMENT', label: 'أقسام محددة', icon: <AccountTree />, description: 'العطلة تطبق على أقسام مختارة فقط' },
    { value: 'SPECIFIC_EMPLOYEES', label: 'موظفين محددين', icon: <People />, description: 'العطلة تطبق على موظفين مختارين فقط' },
    { value: 'EXCLUDE_EMPLOYEES', label: 'استثناء موظفين', icon: <PersonOff />, description: 'العطلة تطبق على الكل ماعدا موظفين مختارين' },
];

const defaultFormData: HolidayFormData = {
    name: '',
    nameEn: '',
    date: '',
    isRecurring: false,
    isPaid: true,
    applicationType: 'ALL',
    countAsWorkDay: false,
    overtimeMultiplier: 2,
    notes: '',
};

export default function HolidaysPage() {
    const theme = useTheme();
    const queryClient = useQueryClient();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedHoliday, setSelectedHoliday] = useState<Holiday | null>(null);
    const [yearFilter, setYearFilter] = useState(new Date().getFullYear());
    const [formData, setFormData] = useState<HolidayFormData>(defaultFormData);
    const [advancedOpen, setAdvancedOpen] = useState(false);
    const [selectedBranches, setSelectedBranches] = useState<Branch[]>([]);
    const [selectedDepartments, setSelectedDepartments] = useState<Department[]>([]);
    const [selectedEmployees, setSelectedEmployees] = useState<Employee[]>([]);

    // Fetch holidays
    const { data: holidays = [], isLoading, error } = useQuery({
        queryKey: ['holidays', yearFilter],
        queryFn: async () => {
            const data = await api.get<Holiday[]>(`/settings/holidays/all?year=${yearFilter}`);
            return data;
        },
    });

    // Fetch branches
    const { data: branches = [] } = useQuery({
        queryKey: ['branches'],
        queryFn: async () => api.get<Branch[]>('/branches'),
    });

    // Fetch departments
    const { data: departments = [] } = useQuery({
        queryKey: ['departments'],
        queryFn: async () => api.get<Department[]>('/departments'),
    });

    // Fetch employees
    const { data: employeesData } = useQuery({
        queryKey: ['employees-list'],
        queryFn: async () => api.get<{ data: Employee[]; pagination: any }>('/users?limit=1000'),
    });
    const employees = employeesData?.data || [];

    // Create holiday mutation
    const createMutation = useMutation({
        mutationFn: async (data: HolidayFormData) => {
            const payload: any = { ...data };
            
            // إضافة التعيينات حسب نوع التطبيق
            if (data.applicationType === 'BRANCH' && selectedBranches.length > 0) {
                payload.assignments = { type: 'BRANCH', ids: selectedBranches.map(b => b.id) };
            } else if (data.applicationType === 'DEPARTMENT' && selectedDepartments.length > 0) {
                payload.assignments = { type: 'DEPARTMENT', ids: selectedDepartments.map(d => d.id) };
            } else if ((data.applicationType === 'SPECIFIC_EMPLOYEES' || data.applicationType === 'EXCLUDE_EMPLOYEES') && selectedEmployees.length > 0) {
                payload.assignments = { type: 'EMPLOYEE', ids: selectedEmployees.map(e => e.id) };
            }

            return api.post('/settings/holidays', payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['holidays'] });
            handleCloseDialog();
        },
    });

    // Update holiday mutation
    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: HolidayFormData }) => {
            const payload: any = { ...data };
            
            if (data.applicationType === 'BRANCH' && selectedBranches.length > 0) {
                payload.assignments = { type: 'BRANCH', ids: selectedBranches.map(b => b.id) };
            } else if (data.applicationType === 'DEPARTMENT' && selectedDepartments.length > 0) {
                payload.assignments = { type: 'DEPARTMENT', ids: selectedDepartments.map(d => d.id) };
            } else if ((data.applicationType === 'SPECIFIC_EMPLOYEES' || data.applicationType === 'EXCLUDE_EMPLOYEES') && selectedEmployees.length > 0) {
                payload.assignments = { type: 'EMPLOYEE', ids: selectedEmployees.map(e => e.id) };
            } else {
                payload.assignments = { type: 'EMPLOYEE', ids: [] };
            }

            return api.patch(`/settings/holidays/${id}`, payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['holidays'] });
            handleCloseDialog();
        },
    });

    // Delete holiday mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => api.delete(`/settings/holidays/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['holidays'] });
            setDeleteDialogOpen(false);
            setSelectedHoliday(null);
        },
    });

    // Seed Saudi holidays mutation
    const seedMutation = useMutation({
        mutationFn: async () => {
            const promises = SAUDI_OFFICIAL_HOLIDAYS.map(holiday =>
                api.post('/settings/holidays', {
                    ...holiday,
                    isPaid: true,
                    applicationType: 'ALL',
                    overtimeMultiplier: 2,
                })
            );
            return Promise.allSettled(promises);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['holidays'] });
        },
    });

    // Calculate statistics
    const stats = useMemo(() => {
        const now = new Date();
        const upcoming = holidays.filter((h: Holiday) => isAfter(new Date(h.date), now));
        const recurring = holidays.filter((h: Holiday) => h.isRecurring);
        const sortedUpcoming = [...upcoming].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const nextHoliday = sortedUpcoming[0];
        const daysUntilNext = nextHoliday
            ? Math.ceil((new Date(nextHoliday.date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            : null;

        return {
            total: holidays.length,
            upcoming: upcoming.length,
            recurring: recurring.length,
            nextHoliday,
            daysUntilNext,
        };
    }, [holidays]);

    const handleOpenDialog = (holiday?: Holiday) => {
        if (holiday) {
            setSelectedHoliday(holiday);
            setFormData({
                name: holiday.name,
                nameEn: holiday.nameEn || '',
                date: holiday.date.split('T')[0],
                isRecurring: holiday.isRecurring,
                isPaid: holiday.isPaid ?? true,
                applicationType: holiday.applicationType || 'ALL',
                countAsWorkDay: holiday.countAsWorkDay ?? false,
                overtimeMultiplier: holiday.overtimeMultiplier ?? 2,
                notes: holiday.notes || '',
            });
            
            // تحميل التعيينات الحالية
            if (holiday.assignments && holiday.assignments.length > 0) {
                const assignmentType = holiday.assignments[0].assignmentType;
                if (assignmentType === 'BRANCH') {
                    const branchIds = holiday.assignments.map(a => a.branchId).filter(Boolean);
                    setSelectedBranches(branches.filter((b: Branch) => branchIds.includes(b.id)));
                } else if (assignmentType === 'DEPARTMENT') {
                    const deptIds = holiday.assignments.map(a => a.departmentId).filter(Boolean);
                    setSelectedDepartments(departments.filter((d: Department) => deptIds.includes(d.id)));
                } else if (assignmentType === 'EMPLOYEE') {
                    const empIds = holiday.assignments.map(a => a.employeeId).filter(Boolean);
                    setSelectedEmployees((employees as Employee[]).filter((e: Employee) => empIds.includes(e.id)));
                }
            }
            setAdvancedOpen(holiday.applicationType !== 'ALL');
        } else {
            setSelectedHoliday(null);
            setFormData(defaultFormData);
            setSelectedBranches([]);
            setSelectedDepartments([]);
            setSelectedEmployees([]);
            setAdvancedOpen(false);
        }
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setSelectedHoliday(null);
        setFormData(defaultFormData);
        setSelectedBranches([]);
        setSelectedDepartments([]);
        setSelectedEmployees([]);
        setAdvancedOpen(false);
    };

    const handleSubmit = () => {
        if (selectedHoliday) {
            updateMutation.mutate({ id: selectedHoliday.id, data: formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    const formatDate = (dateStr: string) => {
        try {
            return format(new Date(dateStr), 'EEEE، dd MMMM yyyy', { locale: ar });
        } catch {
            return dateStr;
        }
    };

    const getHolidayIcon = (name: string) => {
        if (name.includes('فطر')) return '🌙';
        if (name.includes('أضحى')) return '🐑';
        if (name.includes('عرفة')) return '🕋';
        if (name.includes('وطني')) return '🇸🇦';
        if (name.includes('تأسيس')) return '🏛️';
        return '🎉';
    };

    const isUpcoming = (dateStr: string) => isAfter(new Date(dateStr), new Date());

    const getApplicationLabel = (type: ApplicationType) => {
        const found = APPLICATION_TYPES.find(t => t.value === type);
        return found?.label || 'جميع الموظفين';
    };

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Typography variant="h4" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Celebration sx={{ fontSize: 40, color: 'primary.main' }} />
                        العطلات الرسمية
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mt={0.5}>
                        إدارة العطلات الرسمية وربطها بالحضور والرواتب
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <TextField
                        select
                        value={yearFilter}
                        onChange={(e) => setYearFilter(Number(e.target.value))}
                        size="small"
                        sx={{ width: 120 }}
                        InputProps={{ startAdornment: <FilterList sx={{ mr: 1, color: 'text.secondary' }} /> }}
                    >
                        {[2024, 2025, 2026, 2027, 2028].map((year) => (
                            <MenuItem key={year} value={year}>{year}</MenuItem>
                        ))}
                    </TextField>
                    <Tooltip title="إضافة العطلات السعودية الرسمية تلقائياً">
                        <Button
                            variant="outlined"
                            startIcon={<Flag />}
                            onClick={() => seedMutation.mutate()}
                            disabled={seedMutation.isPending}
                            color="success"
                        >
                            {seedMutation.isPending ? 'جاري الإضافة...' : '🇸🇦 العطلات السعودية'}
                        </Button>
                    </Tooltip>
                    <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={() => handleOpenDialog()}
                    >
                        إضافة عطلة
                    </Button>
                </Box>
            </Box>

            {/* Stats Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                {[
                    { label: 'إجمالي العطلات', value: stats.total, icon: <CalendarMonth />, color: 'primary' },
                    { label: 'عطلات قادمة', value: stats.upcoming, icon: <EventAvailable />, color: 'success' },
                    { label: 'عطلات سنوية', value: stats.recurring, icon: <Replay />, color: 'warning' },
                    { label: stats.nextHoliday?.name || 'لا توجد عطلات', value: stats.daysUntilNext !== null ? `${stats.daysUntilNext} يوم` : '-', icon: <Today />, color: stats.daysUntilNext && stats.daysUntilNext <= 7 ? 'error' : 'info' },
                ].map((stat, index) => (
                    <Grid item xs={12} sm={6} md={3} key={index}>
                        <Paper
                            elevation={0}
                            sx={{
                                p: 3,
                                background: `linear-gradient(135deg, ${alpha((theme.palette as any)[stat.color].main, 0.1)}, ${alpha((theme.palette as any)[stat.color].light, 0.05)})`,
                                borderRadius: 3,
                                border: `1px solid ${alpha((theme.palette as any)[stat.color].main, 0.2)}`,
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha((theme.palette as any)[stat.color].main, 0.15) }}>
                                    {stat.icon}
                                </Box>
                                <Box>
                                    <Typography variant="h4" fontWeight="bold">{stat.value}</Typography>
                                    <Typography variant="body2" color="text.secondary" noWrap>{stat.label}</Typography>
                                </Box>
                            </Box>
                        </Paper>
                    </Grid>
                ))}
            </Grid>

            {/* Holidays Table */}
            <Card sx={{ borderRadius: 3, overflow: 'hidden' }}>
                <CardContent sx={{ p: 0 }}>
                    {isLoading ? (
                        <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
                    ) : error ? (
                        <Alert severity="error" sx={{ m: 3 }}>فشل تحميل البيانات</Alert>
                    ) : holidays.length === 0 ? (
                        <Box sx={{ textAlign: 'center', py: 8, px: 3 }}>
                            <Celebration sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
                            <Typography variant="h6" color="text.secondary" gutterBottom>
                                لا توجد عطلات مضافة لسنة {yearFilter}
                            </Typography>
                            <Button variant="contained" startIcon={<Flag />} onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending} color="success" size="large">
                                🇸🇦 إضافة العطلات السعودية
                            </Button>
                        </Box>
                    ) : (
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                                        <TableCell sx={{ fontWeight: 'bold' }}>العطلة</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }}>التاريخ</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }}>التطبيق</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }}>الأجر</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }}>الحالة</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>الإجراءات</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {holidays.map((holiday: Holiday) => (
                                        <TableRow key={holiday.id} sx={{ '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.02) }, opacity: isUpcoming(holiday.date) ? 1 : 0.6 }}>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                    <Typography fontSize={28}>{getHolidayIcon(holiday.name)}</Typography>
                                                    <Box>
                                                        <Typography fontWeight="bold">{holiday.name}</Typography>
                                                        {holiday.nameEn && <Typography variant="caption" color="text.secondary">{holiday.nameEn}</Typography>}
                                                    </Box>
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                <Typography>{formatDate(holiday.date)}</Typography>
                                                {holiday.isRecurring && <Chip label="سنوية" size="small" icon={<Replay sx={{ fontSize: 14 }} />} sx={{ mt: 0.5 }} />}
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={getApplicationLabel(holiday.applicationType)}
                                                    size="small"
                                                    color={holiday.applicationType === 'ALL' ? 'primary' : 'secondary'}
                                                    variant="outlined"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Box>
                                                    <Chip
                                                        label={holiday.isPaid ? 'مدفوعة' : 'غير مدفوعة'}
                                                        size="small"
                                                        color={holiday.isPaid ? 'success' : 'default'}
                                                    />
                                                    {holiday.overtimeMultiplier > 1 && (
                                                        <Typography variant="caption" display="block" color="text.secondary">
                                                            عمل إضافي: {holiday.overtimeMultiplier}x
                                                        </Typography>
                                                    )}
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={isUpcoming(holiday.date) ? 'قادمة' : 'انتهت'}
                                                    color={isUpcoming(holiday.date) ? 'success' : 'default'}
                                                    size="small"
                                                />
                                            </TableCell>
                                            <TableCell align="center">
                                                <Tooltip title="تعديل">
                                                    <IconButton color="primary" onClick={() => handleOpenDialog(holiday)} size="small">
                                                        <Edit />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="حذف">
                                                    <IconButton color="error" onClick={() => { setSelectedHoliday(holiday); setDeleteDialogOpen(true); }} size="small">
                                                        <Delete />
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </CardContent>
            </Card>

            {/* Add/Edit Dialog */}
            <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogTitle sx={{ background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)}, transparent)`, borderBottom: `1px solid ${theme.palette.divider}` }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {selectedHoliday ? <Edit /> : <Add />}
                        {selectedHoliday ? 'تعديل العطلة' : 'إضافة عطلة جديدة'}
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ mt: 2 }}>
                    <Grid container spacing={2.5} sx={{ mt: 0.5 }}>
                        {/* البيانات الأساسية */}
                        <Grid item xs={12} md={6}>
                            <TextField
                                label="اسم العطلة (بالعربية)"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                                fullWidth
                                placeholder="مثال: عيد الفطر"
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                label="اسم العطلة (بالإنجليزية)"
                                value={formData.nameEn}
                                onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                                fullWidth
                                placeholder="Example: Eid Al-Fitr"
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                label="التاريخ"
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                required
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <FormControlLabel
                                    control={<Switch checked={formData.isRecurring} onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })} />}
                                    label="سنوية متكررة"
                                />
                                <FormControlLabel
                                    control={<Switch checked={formData.isPaid} onChange={(e) => setFormData({ ...formData, isPaid: e.target.checked })} color="success" />}
                                    label="مدفوعة الأجر"
                                />
                            </Box>
                        </Grid>

                        {/* الإعدادات المتقدمة */}
                        <Grid item xs={12}>
                            <Button
                                onClick={() => setAdvancedOpen(!advancedOpen)}
                                endIcon={advancedOpen ? <ExpandLess /> : <ExpandMore />}
                                sx={{ mb: 1 }}
                            >
                                إعدادات متقدمة (الحضور والرواتب)
                            </Button>
                            <Collapse in={advancedOpen}>
                                <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.primary.main, 0.02), borderRadius: 2 }}>
                                    <Grid container spacing={2}>
                                        {/* نوع التطبيق */}
                                        <Grid item xs={12}>
                                            <Typography variant="subtitle2" gutterBottom>تطبيق العطلة على:</Typography>
                                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                                {APPLICATION_TYPES.map((type) => (
                                                    <Chip
                                                        key={type.value}
                                                        icon={type.icon as any}
                                                        label={type.label}
                                                        onClick={() => setFormData({ ...formData, applicationType: type.value })}
                                                        color={formData.applicationType === type.value ? 'primary' : 'default'}
                                                        variant={formData.applicationType === type.value ? 'filled' : 'outlined'}
                                                    />
                                                ))}
                                            </Box>
                                            <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                                                {APPLICATION_TYPES.find(t => t.value === formData.applicationType)?.description}
                                            </Typography>
                                        </Grid>

                                        {/* اختيار الفروع */}
                                        {formData.applicationType === 'BRANCH' && (
                                            <Grid item xs={12}>
                                                <Autocomplete
                                                    multiple
                                                    options={branches}
                                                    value={selectedBranches}
                                                    onChange={(_, newValue) => setSelectedBranches(newValue)}
                                                    getOptionLabel={(option) => option.name}
                                                    renderInput={(params) => <TextField {...params} label="اختر الفروع" placeholder="ابحث عن فرع..." />}
                                                />
                                            </Grid>
                                        )}

                                        {/* اختيار الأقسام */}
                                        {formData.applicationType === 'DEPARTMENT' && (
                                            <Grid item xs={12}>
                                                <Autocomplete
                                                    multiple
                                                    options={departments}
                                                    value={selectedDepartments}
                                                    onChange={(_, newValue) => setSelectedDepartments(newValue)}
                                                    getOptionLabel={(option) => option.name}
                                                    renderInput={(params) => <TextField {...params} label="اختر الأقسام" placeholder="ابحث عن قسم..." />}
                                                />
                                            </Grid>
                                        )}

                                        {/* اختيار الموظفين */}
                                        {(formData.applicationType === 'SPECIFIC_EMPLOYEES' || formData.applicationType === 'EXCLUDE_EMPLOYEES') && (
                                            <Grid item xs={12}>
                                                <Autocomplete
                                                    multiple
                                                    options={employees as Employee[]}
                                                    value={selectedEmployees}
                                                    onChange={(_, newValue) => setSelectedEmployees(newValue)}
                                                    getOptionLabel={(option) => `${option.firstName} ${option.lastName}${option.employeeCode ? ` (${option.employeeCode})` : ''}`}
                                                    renderInput={(params) => (
                                                        <TextField
                                                            {...params}
                                                            label={formData.applicationType === 'EXCLUDE_EMPLOYEES' ? 'الموظفين المستثنون' : 'الموظفين المحددين'}
                                                            placeholder="ابحث عن موظف..."
                                                        />
                                                    )}
                                                />
                                            </Grid>
                                        )}

                                        {/* إعدادات العمل الإضافي */}
                                        <Grid item xs={12} md={6}>
                                            <TextField
                                                label="مضاعف العمل الإضافي"
                                                type="number"
                                                value={formData.overtimeMultiplier}
                                                onChange={(e) => setFormData({ ...formData, overtimeMultiplier: parseFloat(e.target.value) || 2 })}
                                                fullWidth
                                                InputProps={{
                                                    startAdornment: <InputAdornment position="start"><WorkOutline /></InputAdornment>,
                                                    endAdornment: <InputAdornment position="end">x</InputAdornment>,
                                                }}
                                                helperText="مثال: 2 = ضعف الأجر العادي للعمل في العطلة"
                                            />
                                        </Grid>
                                        <Grid item xs={12} md={6}>
                                            <FormControlLabel
                                                control={
                                                    <Checkbox
                                                        checked={formData.countAsWorkDay}
                                                        onChange={(e) => setFormData({ ...formData, countAsWorkDay: e.target.checked })}
                                                    />
                                                }
                                                label={
                                                    <Box>
                                                        <Typography>احتساب كيوم عمل</Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            يحسب في أيام العمل الفعلية للموظف
                                                        </Typography>
                                                    </Box>
                                                }
                                            />
                                        </Grid>

                                        {/* ملاحظات */}
                                        <Grid item xs={12}>
                                            <TextField
                                                label="ملاحظات"
                                                value={formData.notes}
                                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                                fullWidth
                                                multiline
                                                rows={2}
                                                placeholder="أي ملاحظات إضافية..."
                                            />
                                        </Grid>
                                    </Grid>
                                </Paper>
                            </Collapse>
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ p: 2.5, borderTop: `1px solid ${theme.palette.divider}` }}>
                    <Button onClick={handleCloseDialog} variant="outlined">إلغاء</Button>
                    <Button
                        variant="contained"
                        onClick={handleSubmit}
                        disabled={!formData.name || !formData.date || createMutation.isPending || updateMutation.isPending}
                    >
                        {createMutation.isPending || updateMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogTitle sx={{ color: 'error.main' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Delete />
                        تأكيد الحذف
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Typography>هل أنت متأكد من حذف العطلة "{selectedHoliday?.name}"؟</Typography>
                    <Typography variant="body2" color="text.secondary" mt={1}>لا يمكن التراجع عن هذا الإجراء.</Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setDeleteDialogOpen(false)} variant="outlined">إلغاء</Button>
                    <Button variant="contained" color="error" onClick={() => selectedHoliday && deleteMutation.mutate(selectedHoliday.id)} disabled={deleteMutation.isPending}>
                        {deleteMutation.isPending ? 'جاري الحذف...' : 'حذف'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
