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
    Switch,
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
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Snackbar,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Checkbox,
    FormControlLabel,
} from '@mui/material';
import {
    Settings as SettingsIcon,
    Business as BusinessIcon,
    Code as CodeIcon,
    LocalShipping as ShippingIcon,
    AttachMoney as MoneyIcon,
    Brush as BrushIcon,
    AccountBalance as AdminIcon,
    Tune as TuneIcon,
    Check as CheckIcon,
    Add as AddIcon,
    ExpandMore as ExpandMoreIcon,
    Group as GroupIcon,
    TrendingUp as TrendingUpIcon,
    Speed as SpeedIcon,
    Psychology as PsychologyIcon,
    Assessment as AssessmentIcon,
    Lightbulb as LightbulbIcon,
    Save as SaveIcon,
} from '@mui/icons-material';
import { companyConfigService, EvaluationTemplate, JobFamily, RoleLevel } from '../../services/company-config.service';
import { api } from '../../services/api.service';

// Company Type Icons
const COMPANY_TYPE_ICONS: Record<string, React.ReactNode> = {
    OPERATIONAL: <ShippingIcon sx={{ fontSize: 48 }} />,
    TECH: <CodeIcon sx={{ fontSize: 48 }} />,
    SALES: <MoneyIcon sx={{ fontSize: 48 }} />,
    CREATIVE: <BrushIcon sx={{ fontSize: 48 }} />,
    ADMIN: <AdminIcon sx={{ fontSize: 48 }} />,
    HYBRID: <TuneIcon sx={{ fontSize: 48 }} />,
};

// Company Type Colors
const COMPANY_TYPE_COLORS: Record<string, string> = {
    OPERATIONAL: '#FF6B35',
    TECH: '#6C5CE7',
    SALES: '#00B894',
    CREATIVE: '#E84393',
    ADMIN: '#0984E3',
    HYBRID: '#A29BFE',
};

// Company Type Arabic Names
const COMPANY_TYPE_NAMES: Record<string, string> = {
    OPERATIONAL: 'شركة تشغيلية',
    TECH: 'شركة تقنية',
    SALES: 'شركة مبيعات',
    CREATIVE: 'شركة إبداعية',
    ADMIN: 'شركة إدارية',
    HYBRID: 'شركة مختلطة',
};

// Module Icons
const MODULE_ICONS: Record<string, React.ReactNode> = {
    OKR: <TrendingUpIcon />,
    KPI: <SpeedIcon />,
    COMPETENCY: <PsychologyIcon />,
    FEEDBACK_360: <GroupIcon />,
    VALUES: <LightbulbIcon />,
    ATTENDANCE: <AssessmentIcon />,
};

// Module Arabic Names
const MODULE_NAMES: Record<string, string> = {
    OKR: 'الأهداف والنتائج',
    KPI: 'مؤشرات الأداء',
    COMPETENCY: 'الكفاءات',
    FEEDBACK_360: 'تقييم 360°',
    VALUES: 'القيم والسلوك',
    ATTENDANCE: 'الحضور والانضباط',
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

export default function CompanyConfigPage() {
    const [tabValue, setTabValue] = useState(0);
    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [editModules, setEditModules] = useState<Record<string, boolean>>({});
    const [editWeights, setEditWeights] = useState<Record<string, number>>({});
    const [jobFamilyDialog, setJobFamilyDialog] = useState(false);
    const [roleLevelDialog, setRoleLevelDialog] = useState(false);
    const [selectedJobFamily, setSelectedJobFamily] = useState<string | null>(null);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success',
    });
    const queryClient = useQueryClient();

    // Get first available company
    const { data: companies, isLoading: companiesLoading } = useQuery({
        queryKey: ['companies-list'],
        queryFn: async () => {
            const response = await api.get('/companies');
            return Array.isArray(response) ? response : response?.data || [];
        },
    });

    const companyId = companies?.[0]?.id || '';

    // Fetch templates from API
    const { data: templates, isLoading: templatesLoading, error: templatesError } = useQuery({
        queryKey: ['company-templates'],
        queryFn: () => companyConfigService.getTemplates(),
    });

    // Fetch company config
    const { data: config, isLoading: configLoading } = useQuery({
        queryKey: ['company-config', companyId],
        queryFn: () => companyConfigService.getConfig(companyId),
        enabled: !!companyId,
    });

    // Fetch job families
    const { data: jobFamilies, isLoading: jobFamiliesLoading } = useQuery({
        queryKey: ['job-families', companyId],
        queryFn: () => companyConfigService.getJobFamilies(companyId),
        enabled: !!companyId,
    });

    // Apply template mutation
    const applyTemplateMutation = useMutation({
        mutationFn: (companyType: string) =>
            companyConfigService.applyTemplate(companyId, companyType),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['company-config'] });
            setSnackbar({ open: true, message: 'تم تطبيق القالب بنجاح!', severity: 'success' });
            // Update local state with new config
            if (data) {
                setEditModules(data.enabledModules || {});
                setEditWeights(data.defaultWeights || {});
            }
        },
        onError: () => {
            setSnackbar({ open: true, message: 'فشل تطبيق القالب', severity: 'error' });
        },
    });

    // Update config mutation
    const updateConfigMutation = useMutation({
        mutationFn: (data: { enabledModules?: Record<string, boolean>; defaultWeights?: Record<string, number> }) =>
            companyConfigService.updateConfig(companyId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['company-config'] });
            setSnackbar({ open: true, message: 'تم حفظ الإعدادات بنجاح!', severity: 'success' });
        },
        onError: () => {
            setSnackbar({ open: true, message: 'فشل حفظ الإعدادات', severity: 'error' });
        },
    });

    // Create job family mutation
    const createJobFamilyMutation = useMutation({
        mutationFn: (data: { code: string; name: string; nameAr?: string }) =>
            companyConfigService.createJobFamily(companyId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['job-families'] });
            setJobFamilyDialog(false);
            setSnackbar({ open: true, message: 'تم إنشاء عائلة الوظائف بنجاح!', severity: 'success' });
        },
        onError: () => {
            setSnackbar({ open: true, message: 'فشل إنشاء عائلة الوظائف', severity: 'error' });
        },
    });

    // Create role level mutation
    const createRoleLevelMutation = useMutation({
        mutationFn: ({ jobFamilyId, data }: { jobFamilyId: string; data: { code: string; name: string; nameAr?: string; rank: number; isManager?: boolean } }) =>
            companyConfigService.createRoleLevel(jobFamilyId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['job-families'] });
            setRoleLevelDialog(false);
            setSnackbar({ open: true, message: 'تم إنشاء مستوى الدور بنجاح!', severity: 'success' });
        },
        onError: () => {
            setSnackbar({ open: true, message: 'فشل إنشاء مستوى الدور', severity: 'error' });
        },
    });

    // Load config into edit state
    useEffect(() => {
        if (config) {
            setEditModules(config.enabledModules || {});
            setEditWeights(config.defaultWeights || {});
            setSelectedType(config.companyType);
        }
    }, [config]);

    const handleApplyTemplate = (type: string) => {
        setSelectedType(type);
        applyTemplateMutation.mutate(type);
    };

    const handleSaveModules = () => {
        updateConfigMutation.mutate({
            enabledModules: editModules,
            defaultWeights: editWeights,
        });
    };

    const handleModuleToggle = (module: string) => {
        setEditModules((prev) => ({
            ...prev,
            [module]: !prev[module],
        }));
    };

    const handleWeightChange = (module: string, value: number) => {
        setEditWeights((prev) => ({
            ...prev,
            [module]: Math.max(0, Math.min(100, value)),
        }));
    };

    // Calculate total weight
    const totalWeight = Object.entries(editWeights)
        .filter(([key]) => editModules[key])
        .reduce((sum, [, val]) => sum + (val || 0), 0);

    // Loading state
    if (companiesLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                <CircularProgress size={60} />
            </Box>
        );
    }

    // No company found
    if (!companyId) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="warning">
                    لم يتم العثور على شركة. يرجى إنشاء شركة أولاً.
                </Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
                <SettingsIcon sx={{ fontSize: 36, mr: 2, color: 'primary.main' }} />
                <Box>
                    <Typography variant="h4" fontWeight="bold">
                        إعدادات نظام التقييم
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        تكوين نظام تقييم الأداء الشامل (U-PEE) • الشركة: {companies?.[0]?.name || companyId}
                    </Typography>
                </Box>
            </Box>

            {/* Tabs */}
            <Paper sx={{ mb: 3 }}>
                <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
                    <Tab icon={<BusinessIcon />} label="نوع الشركة" />
                    <Tab icon={<TuneIcon />} label="الوحدات والأوزان" />
                    <Tab icon={<GroupIcon />} label="عائلات الوظائف" />
                </Tabs>
            </Paper>

            {/* Tab 1: Company Type */}
            <TabPanel value={tabValue} index={0}>
                <Typography variant="h6" gutterBottom>
                    اختر نوع شركتك لتطبيق القالب المناسب
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    سيتم ضبط الوحدات والأوزان تلقائياً بناءً على اختيارك
                </Typography>

                {templatesLoading && <CircularProgress />}
                {templatesError && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        فشل تحميل القوالب. تأكد من تشغيل الـ Backend وأن الـ API يعمل.
                    </Alert>
                )}

                <Grid container spacing={3}>
                    {(templates || []).map((template: EvaluationTemplate) => (
                        <Grid item xs={12} sm={6} md={4} key={template.type}>
                            <Card
                                sx={{
                                    cursor: 'pointer',
                                    transition: 'all 0.3s',
                                    border: selectedType === template.type ? 3 : 1,
                                    borderColor: selectedType === template.type
                                        ? COMPANY_TYPE_COLORS[template.type]
                                        : 'divider',
                                    transform: selectedType === template.type ? 'scale(1.02)' : 'scale(1)',
                                    '&:hover': {
                                        transform: 'scale(1.02)',
                                        boxShadow: 6,
                                    },
                                }}
                                onClick={() => handleApplyTemplate(template.type)}
                            >
                                <CardContent sx={{ textAlign: 'center', py: 4 }}>
                                    <Box
                                        sx={{
                                            width: 80,
                                            height: 80,
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            mx: 'auto',
                                            mb: 2,
                                            bgcolor: `${COMPANY_TYPE_COLORS[template.type]}20`,
                                            color: COMPANY_TYPE_COLORS[template.type],
                                        }}
                                    >
                                        {COMPANY_TYPE_ICONS[template.type]}
                                    </Box>

                                    <Typography variant="h6" fontWeight="bold">
                                        {COMPANY_TYPE_NAMES[template.type] || template.type}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                        {template.nameAr || template.name}
                                    </Typography>

                                    {/* Enabled Modules */}
                                    <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 0.5 }}>
                                        {Object.entries(template.modules || {})
                                            .filter(([, enabled]) => enabled)
                                            .map(([module]) => (
                                                <Chip
                                                    key={module}
                                                    label={MODULE_NAMES[module] || module}
                                                    size="small"
                                                    sx={{ fontSize: 10 }}
                                                />
                                            ))}
                                    </Box>

                                    {selectedType === template.type && (
                                        <Chip
                                            icon={<CheckIcon />}
                                            label="مُطبّق"
                                            color="success"
                                            sx={{ mt: 2 }}
                                        />
                                    )}

                                    {applyTemplateMutation.isPending && selectedType === template.type && (
                                        <CircularProgress size={20} sx={{ mt: 1 }} />
                                    )}
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            </TabPanel>

            {/* Tab 2: Modules & Weights */}
            <TabPanel value={tabValue} index={1}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h6">
                        تخصيص الوحدات والأوزان
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Chip
                            label={`المجموع: ${totalWeight}%`}
                            color={totalWeight === 100 ? 'success' : totalWeight > 100 ? 'error' : 'warning'}
                        />
                        <Button
                            variant="contained"
                            startIcon={updateConfigMutation.isPending ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                            onClick={handleSaveModules}
                            disabled={updateConfigMutation.isPending}
                        >
                            حفظ التغييرات
                        </Button>
                    </Box>
                </Box>

                {totalWeight !== 100 && (
                    <Alert severity={totalWeight > 100 ? 'error' : 'warning'} sx={{ mb: 3 }}>
                        مجموع الأوزان يجب أن يكون 100%. المجموع الحالي: {totalWeight}%
                    </Alert>
                )}

                <Grid container spacing={2}>
                    {Object.entries(MODULE_ICONS).map(([module, icon]) => (
                        <Grid item xs={12} md={6} key={module}>
                            <Paper
                                sx={{
                                    p: 2,
                                    opacity: editModules[module] ? 1 : 0.6,
                                    transition: 'all 0.3s',
                                    border: editModules[module] ? '2px solid' : '1px solid',
                                    borderColor: editModules[module] ? 'primary.main' : 'divider',
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <Box
                                            sx={{
                                                width: 48,
                                                height: 48,
                                                borderRadius: 2,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                bgcolor: editModules[module] ? 'primary.main' : 'grey.300',
                                                color: 'white',
                                            }}
                                        >
                                            {icon}
                                        </Box>
                                        <Box>
                                            <Typography variant="subtitle1" fontWeight="bold">
                                                {MODULE_NAMES[module]}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {module}
                                            </Typography>
                                        </Box>
                                    </Box>

                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <TextField
                                            type="number"
                                            size="small"
                                            value={editWeights[module] || 0}
                                            onChange={(e) => handleWeightChange(module, parseInt(e.target.value) || 0)}
                                            disabled={!editModules[module]}
                                            sx={{ width: 80 }}
                                            InputProps={{
                                                endAdornment: '%',
                                                inputProps: { min: 0, max: 100 }
                                            }}
                                        />
                                        <Switch
                                            checked={!!editModules[module]}
                                            onChange={() => handleModuleToggle(module)}
                                            color="primary"
                                        />
                                    </Box>
                                </Box>

                                {editModules[module] && (
                                    <Box sx={{ mt: 2 }}>
                                        <LinearProgress
                                            variant="determinate"
                                            value={Math.min((editWeights[module] || 0), 100)}
                                            sx={{ height: 8, borderRadius: 4 }}
                                        />
                                    </Box>
                                )}
                            </Paper>
                        </Grid>
                    ))}
                </Grid>
            </TabPanel>

            {/* Tab 3: Job Families */}
            <TabPanel value={tabValue} index={2}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h6">
                        عائلات الوظائف ومستويات الأدوار
                    </Typography>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setJobFamilyDialog(true)}
                    >
                        إضافة عائلة وظائف
                    </Button>
                </Box>

                {jobFamiliesLoading && <CircularProgress />}

                {!jobFamiliesLoading && (!jobFamilies || jobFamilies.length === 0) ? (
                    <Alert severity="info">
                        لم يتم تعريف عائلات وظائف بعد. أضف عائلة وظائف لتخصيص التقييم حسب نوع الوظيفة.
                    </Alert>
                ) : (
                    (jobFamilies || []).map((family: JobFamily) => (
                        <Accordion key={family.id} sx={{ mb: 2 }}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <GroupIcon color="primary" />
                                    <Box>
                                        <Typography fontWeight="bold">{family.nameAr || family.name}</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {family.code} • {family.roleLevels?.length || 0} مستويات
                                        </Typography>
                                    </Box>
                                </Box>
                            </AccordionSummary>
                            <AccordionDetails>
                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                                    <Button
                                        size="small"
                                        startIcon={<AddIcon />}
                                        onClick={() => {
                                            setSelectedJobFamily(family.id);
                                            setRoleLevelDialog(true);
                                        }}
                                    >
                                        إضافة مستوى
                                    </Button>
                                </Box>

                                {family.roleLevels && family.roleLevels.length > 0 ? (
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                        {family.roleLevels.map((level: RoleLevel) => (
                                            <Chip
                                                key={level.id}
                                                label={`${level.nameAr || level.name} (${level.code})`}
                                                color={level.isManager ? 'primary' : 'default'}
                                                variant={level.isManager ? 'filled' : 'outlined'}
                                            />
                                        ))}
                                    </Box>
                                ) : (
                                    <Typography variant="body2" color="text.secondary">
                                        لا توجد مستويات بعد
                                    </Typography>
                                )}
                            </AccordionDetails>
                        </Accordion>
                    ))
                )}
            </TabPanel>

            {/* Job Family Dialog */}
            <JobFamilyDialog
                open={jobFamilyDialog}
                onClose={() => setJobFamilyDialog(false)}
                onSubmit={(data) => createJobFamilyMutation.mutate(data)}
                loading={createJobFamilyMutation.isPending}
            />

            {/* Role Level Dialog */}
            <RoleLevelDialog
                open={roleLevelDialog}
                onClose={() => setRoleLevelDialog(false)}
                onSubmit={(data) => {
                    if (selectedJobFamily) {
                        createRoleLevelMutation.mutate({ jobFamilyId: selectedJobFamily, data });
                    }
                }}
                loading={createRoleLevelMutation.isPending}
            />

            {/* Snackbar for notifications */}
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

// Job Family Dialog Component
function JobFamilyDialog({
    open,
    onClose,
    onSubmit,
    loading,
}: {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: { code: string; name: string; nameAr?: string }) => void;
    loading: boolean;
}) {
    const [code, setCode] = useState('');
    const [name, setName] = useState('');
    const [nameAr, setNameAr] = useState('');

    const handleSubmit = () => {
        if (code && name) {
            onSubmit({ code: code.toUpperCase(), name, nameAr: nameAr || undefined });
            setCode('');
            setName('');
            setNameAr('');
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>إضافة عائلة وظائف جديدة</DialogTitle>
            <DialogContent>
                <TextField
                    fullWidth
                    label="الكود (مثلاً: SOFTWARE)"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    sx={{ mt: 2, mb: 2 }}
                    placeholder="SOFTWARE"
                />
                <TextField
                    fullWidth
                    label="الاسم بالإنجليزية"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    sx={{ mb: 2 }}
                    placeholder="Software Engineering"
                />
                <TextField
                    fullWidth
                    label="الاسم بالعربية"
                    value={nameAr}
                    onChange={(e) => setNameAr(e.target.value)}
                    placeholder="هندسة البرمجيات"
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>إلغاء</Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={!code || !name || loading}
                >
                    {loading ? <CircularProgress size={24} /> : 'إضافة'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

// Role Level Dialog Component
function RoleLevelDialog({
    open,
    onClose,
    onSubmit,
    loading,
}: {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: { code: string; name: string; nameAr?: string; rank: number; isManager?: boolean }) => void;
    loading: boolean;
}) {
    const [code, setCode] = useState('');
    const [name, setName] = useState('');
    const [nameAr, setNameAr] = useState('');
    const [rank, setRank] = useState(1);
    const [isManager, setIsManager] = useState(false);

    const handleSubmit = () => {
        if (code && name) {
            onSubmit({ code: code.toUpperCase(), name, nameAr: nameAr || undefined, rank, isManager });
            setCode('');
            setName('');
            setNameAr('');
            setRank(1);
            setIsManager(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>إضافة مستوى دور جديد</DialogTitle>
            <DialogContent>
                <TextField
                    fullWidth
                    label="الكود (مثلاً: SENIOR)"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    sx={{ mt: 2, mb: 2 }}
                    placeholder="SENIOR"
                />
                <TextField
                    fullWidth
                    label="الاسم بالإنجليزية"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    sx={{ mb: 2 }}
                    placeholder="Senior Engineer"
                />
                <TextField
                    fullWidth
                    label="الاسم بالعربية"
                    value={nameAr}
                    onChange={(e) => setNameAr(e.target.value)}
                    sx={{ mb: 2 }}
                    placeholder="مهندس أول"
                />
                <TextField
                    fullWidth
                    type="number"
                    label="الترتيب (Rank)"
                    value={rank}
                    onChange={(e) => setRank(parseInt(e.target.value) || 1)}
                    sx={{ mb: 2 }}
                    InputProps={{ inputProps: { min: 1, max: 10 } }}
                />
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={isManager}
                            onChange={(e) => setIsManager(e.target.checked)}
                        />
                    }
                    label="هل هذا مستوى إداري؟ (سيحصل على كفاءات القيادة)"
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>إلغاء</Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={!code || !name || loading}
                >
                    {loading ? <CircularProgress size={24} /> : 'إضافة'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
