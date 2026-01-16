import { useState } from 'react';
import {
    Box,
    Container,
    Typography,
    Stepper,
    Step,
    StepLabel,
    StepContent,
    Button,
    Paper,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Chip,
    Grid,
    Card,
    CardContent,
    Switch,
    FormControlLabel,
    Alert,
    IconButton,
    Slider,
    Divider,
    Tooltip,
    LinearProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Snackbar,
} from '@mui/material';
import {
    NavigateNext as NextIcon,
    NavigateBefore as BackIcon,
    Check as CheckIcon,
    Add as AddIcon,
    Delete as DeleteIcon,
    Info as InfoIcon,
    Preview as PreviewIcon,
    Save as SaveIcon,
    AutoAwesome as AIIcon,
    PlayArrow as PlayIcon,
    Lightbulb as LightbulbIcon,
} from '@mui/icons-material';

// ============== Types ==============

interface WizardData {
    // Step 1: Basic
    name: string;
    description: string;
    category: string;
    
    // Step 2: Trigger
    triggerEvent: string;
    triggerTiming: string;
    
    // Step 3: Conditions
    conditions: Condition[];
    conditionLogic: 'ALL' | 'ANY';
    
    // Step 4: Actions
    actions: Action[];
    
    // Step 5: Scope
    scopeType: string;
    scopeInclude: string[];
    scopeExclude: string[];
    
    // Step 6: Schedule
    effectiveFrom: string;
    effectiveTo: string;
    
    // Step 7: Advanced
    priority: number;
    requiresApproval: boolean;
    allowExceptions: boolean;
    retroactiveAllowed: boolean;
}

interface Condition {
    id: string;
    field: string;
    operator: string;
    value: string;
}

interface Action {
    id: string;
    type: string;
    valueType: string;
    value: string;
}

// ============== Constants ==============

const STEPS = [
    { label: 'المعلومات الأساسية', icon: '📝', description: 'اسم ووصف السياسة' },
    { label: 'حدث التشغيل', icon: '⚡', description: 'متى يتم تفعيل السياسة' },
    { label: 'الشروط', icon: '🔍', description: 'شروط تطبيق السياسة' },
    { label: 'الإجراءات', icon: '🎯', description: 'ماذا يحدث عند التطبيق' },
    { label: 'النطاق', icon: '👥', description: 'من يتأثر بالسياسة' },
    { label: 'الجدولة', icon: '📅', description: 'فترة سريان السياسة' },
    { label: 'إعدادات متقدمة', icon: '⚙️', description: 'خيارات إضافية' },
];

const CATEGORIES = [
    { value: 'ATTENDANCE', label: '⏰ الحضور والانصراف' },
    { value: 'PERFORMANCE', label: '📈 الأداء' },
    { value: 'COMPENSATION', label: '💰 التعويضات' },
    { value: 'LEAVE', label: '🏖️ الإجازات' },
    { value: 'DISCIPLINARY', label: '⚖️ التأديب' },
    { value: 'RECOGNITION', label: '🏆 التقدير' },
];

const TRIGGERS = [
    { value: 'ATTENDANCE', label: '⏰ عند الحضور أو الانصراف', description: 'يتم تفعيل السياسة مع كل تسجيل حضور' },
    { value: 'PAYROLL', label: '💰 عند حساب الرواتب', description: 'يتم تفعيل السياسة شهرياً مع الرواتب' },
    { value: 'LEAVE', label: '🏖️ عند طلب إجازة', description: 'يتم تفعيل السياسة مع كل طلب إجازة' },
    { value: 'PERFORMANCE', label: '📊 عند تقييم الأداء', description: 'يتم تفعيل السياسة مع نتائج التقييم' },
    { value: 'ANNIVERSARY', label: '🎂 عند ذكرى التعيين', description: 'يتم تفعيل السياسة سنوياً' },
];

const FIELDS = [
    { value: 'attendance.lateDays', label: 'أيام التأخير' },
    { value: 'attendance.absentDays', label: 'أيام الغياب' },
    { value: 'attendance.presentDays', label: 'أيام الحضور' },
    { value: 'attendance.overtimeHours', label: 'ساعات العمل الإضافي' },
    { value: 'performance.rating', label: 'تقييم الأداء' },
    { value: 'performance.targetAchievement', label: 'نسبة تحقيق الهدف' },
    { value: 'employee.tenure.years', label: 'سنوات الخدمة' },
    { value: 'contract.basicSalary', label: 'الراتب الأساسي' },
];

const OPERATORS = [
    { value: 'EQUALS', label: 'يساوي' },
    { value: 'NOT_EQUALS', label: 'لا يساوي' },
    { value: 'GREATER_THAN', label: 'أكبر من' },
    { value: 'LESS_THAN', label: 'أقل من' },
    { value: 'GREATER_THAN_OR_EQUAL', label: 'أكبر من أو يساوي' },
    { value: 'LESS_THAN_OR_EQUAL', label: 'أقل من أو يساوي' },
];

const ACTION_TYPES = [
    { value: 'BONUS', label: '🎁 مكافأة' },
    { value: 'DEDUCTION', label: '📉 خصم' },
    { value: 'ALLOWANCE', label: '💵 بدل' },
    { value: 'COMMISSION', label: '📊 عمولة' },
];

const SCOPE_TYPES = [
    { value: 'ALL', label: '👥 جميع الموظفين' },
    { value: 'DEPARTMENT', label: '🏢 أقسام محددة' },
    { value: 'BRANCH', label: '📍 فروع محددة' },
    { value: 'JOB_TITLE', label: '💼 مسميات وظيفية محددة' },
];

// ============== Component ==============

export default function PolicyWizardPage() {
    const [activeStep, setActiveStep] = useState(0);
    const [data, setData] = useState<WizardData>({
        name: '',
        description: '',
        category: '',
        triggerEvent: '',
        triggerTiming: 'AFTER',
        conditions: [],
        conditionLogic: 'ALL',
        actions: [],
        scopeType: 'ALL',
        scopeInclude: [],
        scopeExclude: [],
        effectiveFrom: '',
        effectiveTo: '',
        priority: 10,
        requiresApproval: false,
        allowExceptions: true,
        retroactiveAllowed: false,
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [previewOpen, setPreviewOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as any });

    // Validate current step
    const validateStep = (step: number): boolean => {
        const newErrors: Record<string, string> = {};

        switch (step) {
            case 0: // Basic Info
                if (!data.name.trim()) newErrors.name = 'اسم السياسة مطلوب';
                if (data.name.length < 5) newErrors.name = 'الاسم يجب أن يكون 5 أحرف على الأقل';
                if (!data.category) newErrors.category = 'الفئة مطلوبة';
                break;
            case 1: // Trigger
                if (!data.triggerEvent) newErrors.triggerEvent = 'حدث التشغيل مطلوب';
                break;
            case 3: // Actions
                if (data.actions.length === 0) newErrors.actions = 'أضف إجراء واحد على الأقل';
                break;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        if (validateStep(activeStep)) {
            setActiveStep((prev) => prev + 1);
        }
    };

    const handleBack = () => {
        setActiveStep((prev) => prev - 1);
    };

    const addCondition = () => {
        setData({
            ...data,
            conditions: [
                ...data.conditions,
                { id: Date.now().toString(), field: '', operator: 'EQUALS', value: '' },
            ],
        });
    };

    const removeCondition = (id: string) => {
        setData({
            ...data,
            conditions: data.conditions.filter((c) => c.id !== id),
        });
    };

    const updateCondition = (id: string, field: keyof Condition, value: string) => {
        setData({
            ...data,
            conditions: data.conditions.map((c) =>
                c.id === id ? { ...c, [field]: value } : c
            ),
        });
    };

    const addAction = () => {
        setData({
            ...data,
            actions: [
                ...data.actions,
                { id: Date.now().toString(), type: 'BONUS', valueType: 'FIXED', value: '' },
            ],
        });
    };

    const removeAction = (id: string) => {
        setData({
            ...data,
            actions: data.actions.filter((a) => a.id !== id),
        });
    };

    const updateAction = (id: string, field: keyof Action, value: string) => {
        setData({
            ...data,
            actions: data.actions.map((a) =>
                a.id === id ? { ...a, [field]: value } : a
            ),
        });
    };

    const handleSave = async (asDraft: boolean = false) => {
        setSaving(true);
        try {
            // Simulate API call
            await new Promise((resolve) => setTimeout(resolve, 2000));
            
            setSnackbar({
                open: true,
                message: asDraft ? 'تم حفظ المسودة بنجاح! 📝' : 'تم إنشاء السياسة بنجاح! 🎉',
                severity: 'success',
            });
        } catch (error) {
            setSnackbar({
                open: true,
                message: 'حدث خطأ في الحفظ',
                severity: 'error',
            });
        } finally {
            setSaving(false);
        }
    };

    const generatePreview = () => {
        const preview: string[] = [];
        
        preview.push(`📋 السياسة: ${data.name || 'بدون اسم'}`);
        preview.push('');
        
        if (data.triggerEvent) {
            const trigger = TRIGGERS.find(t => t.value === data.triggerEvent);
            preview.push(`⚡ متى: ${trigger?.label || data.triggerEvent}`);
        }
        
        if (data.conditions.length > 0) {
            preview.push('');
            preview.push('🔍 الشروط:');
            data.conditions.forEach((c, i) => {
                const field = FIELDS.find(f => f.value === c.field);
                const op = OPERATORS.find(o => o.value === c.operator);
                preview.push(`   ${i + 1}. ${field?.label || c.field} ${op?.label || c.operator} ${c.value}`);
            });
            preview.push(`   (منطق: ${data.conditionLogic === 'ALL' ? 'جميع الشروط' : 'أي شرط'})`);
        }
        
        if (data.actions.length > 0) {
            preview.push('');
            preview.push('🎯 الإجراءات:');
            data.actions.forEach((a, i) => {
                const type = ACTION_TYPES.find(t => t.value === a.type);
                preview.push(`   ${i + 1}. ${type?.label || a.type}: ${a.value} ${a.valueType === 'PERCENTAGE' ? '%' : 'ريال'}`);
            });
        }
        
        const scope = SCOPE_TYPES.find(s => s.value === data.scopeType);
        preview.push('');
        preview.push(`👥 النطاق: ${scope?.label || data.scopeType}`);
        
        return preview.join('\n');
    };

    // Render step content
    const renderStepContent = (step: number) => {
        switch (step) {
            case 0: // Basic Info
                return (
                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="اسم السياسة"
                                placeholder="مثال: مكافأة الحضور الكامل"
                                value={data.name}
                                onChange={(e) => setData({ ...data, name: e.target.value })}
                                error={!!errors.name}
                                helperText={errors.name}
                                required
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                multiline
                                rows={3}
                                label="وصف السياسة"
                                placeholder="اشرح هدف السياسة وكيف تعمل..."
                                value={data.description}
                                onChange={(e) => setData({ ...data, description: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <FormControl fullWidth error={!!errors.category} required>
                                <InputLabel>الفئة</InputLabel>
                                <Select
                                    value={data.category}
                                    onChange={(e) => setData({ ...data, category: e.target.value })}
                                    label="الفئة"
                                >
                                    {CATEGORIES.map((cat) => (
                                        <MenuItem key={cat.value} value={cat.value}>
                                            {cat.label}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                    </Grid>
                );

            case 1: // Trigger
                return (
                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <Typography variant="subtitle1" gutterBottom>
                                اختر الحدث الذي سيُفعّل السياسة:
                            </Typography>
                            <Grid container spacing={2}>
                                {TRIGGERS.map((trigger) => (
                                    <Grid item xs={12} md={6} key={trigger.value}>
                                        <Card
                                            sx={{
                                                cursor: 'pointer',
                                                border: 2,
                                                borderColor: data.triggerEvent === trigger.value ? 'primary.main' : 'transparent',
                                                '&:hover': { borderColor: 'primary.light' },
                                            }}
                                            onClick={() => setData({ ...data, triggerEvent: trigger.value })}
                                        >
                                            <CardContent>
                                                <Typography variant="h6">{trigger.label}</Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    {trigger.description}
                                                </Typography>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>
                            {errors.triggerEvent && (
                                <Alert severity="error" sx={{ mt: 2 }}>{errors.triggerEvent}</Alert>
                            )}
                        </Grid>
                        <Grid item xs={12}>
                            <FormControl fullWidth>
                                <InputLabel>توقيت التنفيذ</InputLabel>
                                <Select
                                    value={data.triggerTiming}
                                    onChange={(e) => setData({ ...data, triggerTiming: e.target.value })}
                                    label="توقيت التنفيذ"
                                >
                                    <MenuItem value="BEFORE">قبل الحدث</MenuItem>
                                    <MenuItem value="DURING">أثناء الحدث</MenuItem>
                                    <MenuItem value="AFTER">بعد الحدث</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                    </Grid>
                );

            case 2: // Conditions
                return (
                    <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="subtitle1">
                                الشروط (اختياري):
                            </Typography>
                            <Button startIcon={<AddIcon />} onClick={addCondition}>
                                إضافة شرط
                            </Button>
                        </Box>

                        {data.conditions.length === 0 ? (
                            <Alert severity="info">
                                بدون شروط، السياسة ستُطبق على جميع الحالات. أضف شروطاً لتحديد متى تُطبق السياسة.
                            </Alert>
                        ) : (
                            <>
                                {data.conditions.map((condition, index) => (
                                    <Paper key={condition.id} sx={{ p: 2, mb: 2 }}>
                                        <Grid container spacing={2} alignItems="center">
                                            <Grid item xs={12} sm={4}>
                                                <FormControl fullWidth size="small">
                                                    <InputLabel>الحقل</InputLabel>
                                                    <Select
                                                        value={condition.field}
                                                        onChange={(e) => updateCondition(condition.id, 'field', e.target.value)}
                                                        label="الحقل"
                                                    >
                                                        {FIELDS.map((f) => (
                                                            <MenuItem key={f.value} value={f.value}>
                                                                {f.label}
                                                            </MenuItem>
                                                        ))}
                                                    </Select>
                                                </FormControl>
                                            </Grid>
                                            <Grid item xs={12} sm={3}>
                                                <FormControl fullWidth size="small">
                                                    <InputLabel>العامل</InputLabel>
                                                    <Select
                                                        value={condition.operator}
                                                        onChange={(e) => updateCondition(condition.id, 'operator', e.target.value)}
                                                        label="العامل"
                                                    >
                                                        {OPERATORS.map((op) => (
                                                            <MenuItem key={op.value} value={op.value}>
                                                                {op.label}
                                                            </MenuItem>
                                                        ))}
                                                    </Select>
                                                </FormControl>
                                            </Grid>
                                            <Grid item xs={12} sm={3}>
                                                <TextField
                                                    fullWidth
                                                    size="small"
                                                    label="القيمة"
                                                    value={condition.value}
                                                    onChange={(e) => updateCondition(condition.id, 'value', e.target.value)}
                                                />
                                            </Grid>
                                            <Grid item xs={12} sm={2}>
                                                <IconButton color="error" onClick={() => removeCondition(condition.id)}>
                                                    <DeleteIcon />
                                                </IconButton>
                                            </Grid>
                                        </Grid>
                                        {index < data.conditions.length - 1 && (
                                            <Box sx={{ mt: 2, textAlign: 'center' }}>
                                                <Chip
                                                    label={data.conditionLogic === 'ALL' ? 'و' : 'أو'}
                                                    color="primary"
                                                    size="small"
                                                />
                                            </Box>
                                        )}
                                    </Paper>
                                ))}

                                <FormControl>
                                    <Typography variant="body2" gutterBottom>منطق الشروط:</Typography>
                                    <Box sx={{ display: 'flex', gap: 2 }}>
                                        <Chip
                                            label="جميع الشروط (AND)"
                                            color={data.conditionLogic === 'ALL' ? 'primary' : 'default'}
                                            onClick={() => setData({ ...data, conditionLogic: 'ALL' })}
                                        />
                                        <Chip
                                            label="أي شرط (OR)"
                                            color={data.conditionLogic === 'ANY' ? 'primary' : 'default'}
                                            onClick={() => setData({ ...data, conditionLogic: 'ANY' })}
                                        />
                                    </Box>
                                </FormControl>
                            </>
                        )}
                    </Box>
                );

            case 3: // Actions
                return (
                    <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="subtitle1">
                                الإجراءات: *
                            </Typography>
                            <Button startIcon={<AddIcon />} onClick={addAction} variant="contained" size="small">
                                إضافة إجراء
                            </Button>
                        </Box>

                        {errors.actions && (
                            <Alert severity="error" sx={{ mb: 2 }}>{errors.actions}</Alert>
                        )}

                        {data.actions.length === 0 ? (
                            <Alert severity="warning">
                                أضف إجراء واحد على الأقل لتحديد ما يحدث عند تطبيق السياسة.
                            </Alert>
                        ) : (
                            data.actions.map((action) => (
                                <Paper key={action.id} sx={{ p: 2, mb: 2, border: 1, borderColor: 'primary.light' }}>
                                    <Grid container spacing={2} alignItems="center">
                                        <Grid item xs={12} sm={3}>
                                            <FormControl fullWidth size="small">
                                                <InputLabel>النوع</InputLabel>
                                                <Select
                                                    value={action.type}
                                                    onChange={(e) => updateAction(action.id, 'type', e.target.value)}
                                                    label="النوع"
                                                >
                                                    {ACTION_TYPES.map((t) => (
                                                        <MenuItem key={t.value} value={t.value}>
                                                            {t.label}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                        </Grid>
                                        <Grid item xs={12} sm={3}>
                                            <FormControl fullWidth size="small">
                                                <InputLabel>نوع القيمة</InputLabel>
                                                <Select
                                                    value={action.valueType}
                                                    onChange={(e) => updateAction(action.id, 'valueType', e.target.value)}
                                                    label="نوع القيمة"
                                                >
                                                    <MenuItem value="FIXED">مبلغ ثابت</MenuItem>
                                                    <MenuItem value="PERCENTAGE">نسبة مئوية</MenuItem>
                                                    <MenuItem value="FORMULA">معادلة</MenuItem>
                                                </Select>
                                            </FormControl>
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <TextField
                                                fullWidth
                                                size="small"
                                                label={action.valueType === 'FORMULA' ? 'المعادلة' : 'القيمة'}
                                                type={action.valueType === 'FORMULA' ? 'text' : 'number'}
                                                value={action.value}
                                                onChange={(e) => updateAction(action.id, 'value', e.target.value)}
                                                InputProps={{
                                                    endAdornment: action.valueType === 'PERCENTAGE' ? '%' : 
                                                        action.valueType === 'FIXED' ? 'ريال' : null,
                                                }}
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={2}>
                                            <IconButton color="error" onClick={() => removeAction(action.id)}>
                                                <DeleteIcon />
                                            </IconButton>
                                        </Grid>
                                    </Grid>
                                </Paper>
                            ))
                        )}
                    </Box>
                );

            case 4: // Scope
                return (
                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <Typography variant="subtitle1" gutterBottom>
                                نطاق التطبيق:
                            </Typography>
                            <Grid container spacing={2}>
                                {SCOPE_TYPES.map((scope) => (
                                    <Grid item xs={6} md={3} key={scope.value}>
                                        <Card
                                            sx={{
                                                cursor: 'pointer',
                                                border: 2,
                                                borderColor: data.scopeType === scope.value ? 'primary.main' : 'transparent',
                                                textAlign: 'center',
                                                '&:hover': { borderColor: 'primary.light' },
                                            }}
                                            onClick={() => setData({ ...data, scopeType: scope.value })}
                                        >
                                            <CardContent>
                                                <Typography variant="h6">{scope.label}</Typography>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>
                        </Grid>
                    </Grid>
                );

            case 5: // Schedule
                return (
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                type="date"
                                label="تاريخ البدء"
                                value={data.effectiveFrom}
                                onChange={(e) => setData({ ...data, effectiveFrom: e.target.value })}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                type="date"
                                label="تاريخ الانتهاء (اختياري)"
                                value={data.effectiveTo}
                                onChange={(e) => setData({ ...data, effectiveTo: e.target.value })}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <Alert severity="info">
                                اترك تاريخ الانتهاء فارغاً إذا كانت السياسة دائمة.
                            </Alert>
                        </Grid>
                    </Grid>
                );

            case 6: // Advanced
                return (
                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <Typography variant="subtitle1" gutterBottom>
                                الأولوية: {data.priority}
                            </Typography>
                            <Slider
                                value={data.priority}
                                onChange={(_, v) => setData({ ...data, priority: v as number })}
                                min={1}
                                max={100}
                                marks={[
                                    { value: 1, label: 'منخفضة' },
                                    { value: 50, label: 'متوسطة' },
                                    { value: 100, label: 'عالية' },
                                ]}
                            />
                            <Typography variant="body2" color="text.secondary">
                                السياسات ذات الأولوية الأعلى تُنفذ أولاً عند وجود تعارض.
                            </Typography>
                        </Grid>
                        <Grid item xs={12}>
                            <Divider sx={{ my: 2 }} />
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={data.requiresApproval}
                                        onChange={(e) => setData({ ...data, requiresApproval: e.target.checked })}
                                    />
                                }
                                label="تتطلب موافقة قبل التفعيل"
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={data.allowExceptions}
                                        onChange={(e) => setData({ ...data, allowExceptions: e.target.checked })}
                                    />
                                }
                                label="السماح بالاستثناءات"
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={data.retroactiveAllowed}
                                        onChange={(e) => setData({ ...data, retroactiveAllowed: e.target.checked })}
                                    />
                                }
                                label="السماح بالتطبيق بأثر رجعي"
                            />
                        </Grid>
                    </Grid>
                );

            default:
                return null;
        }
    };

    return (
        <Container maxWidth="lg" sx={{ py: 3 }}>
            {/* Header */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" fontWeight="bold" gutterBottom>
                    🧙 معالج إنشاء السياسات
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    أنشئ سياسة ذكية خطوة بخطوة
                </Typography>
            </Box>

            {/* Progress */}
            <Paper sx={{ p: 3, mb: 4, borderRadius: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                        الخطوة {activeStep + 1} من {STEPS.length}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                            variant="outlined"
                            startIcon={<PreviewIcon />}
                            onClick={() => setPreviewOpen(true)}
                        >
                            معاينة
                        </Button>
                        <Button
                            variant="outlined"
                            startIcon={<SaveIcon />}
                            onClick={() => handleSave(true)}
                            disabled={saving}
                        >
                            حفظ كمسودة
                        </Button>
                    </Box>
                </Box>
                <LinearProgress
                    variant="determinate"
                    value={((activeStep + 1) / STEPS.length) * 100}
                    sx={{ height: 8, borderRadius: 4 }}
                />
            </Paper>

            {/* Stepper */}
            <Grid container spacing={4}>
                <Grid item xs={12} md={3}>
                    <Paper sx={{ p: 2, borderRadius: 3 }}>
                        <Stepper activeStep={activeStep} orientation="vertical">
                            {STEPS.map((step, index) => (
                                <Step key={index}>
                                    <StepLabel
                                        StepIconComponent={() => (
                                            <Box
                                                sx={{
                                                    width: 32,
                                                    height: 32,
                                                    borderRadius: '50%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    bgcolor: index === activeStep ? 'primary.main' : 
                                                        index < activeStep ? 'success.main' : 'grey.300',
                                                    color: 'white',
                                                }}
                                            >
                                                {index < activeStep ? <CheckIcon fontSize="small" /> : step.icon}
                                            </Box>
                                        )}
                                    >
                                        <Typography
                                            variant="body2"
                                            fontWeight={index === activeStep ? 'bold' : 'normal'}
                                        >
                                            {step.label}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {step.description}
                                        </Typography>
                                    </StepLabel>
                                </Step>
                            ))}
                        </Stepper>
                    </Paper>
                </Grid>

                <Grid item xs={12} md={9}>
                    <Paper sx={{ p: 4, borderRadius: 3, minHeight: 400 }}>
                        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {STEPS[activeStep].icon} {STEPS[activeStep].label}
                        </Typography>
                        <Divider sx={{ my: 2 }} />

                        {renderStepContent(activeStep)}

                        {/* Navigation */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                            <Button
                                disabled={activeStep === 0}
                                onClick={handleBack}
                                startIcon={<BackIcon />}
                            >
                                السابق
                            </Button>
                            {activeStep === STEPS.length - 1 ? (
                                <Button
                                    variant="contained"
                                    onClick={() => handleSave(false)}
                                    disabled={saving}
                                    startIcon={saving ? null : <CheckIcon />}
                                    sx={{
                                        background: 'linear-gradient(45deg, #22c55e 30%, #4ade80 90%)',
                                    }}
                                >
                                    {saving ? 'جاري الإنشاء...' : 'إنشاء السياسة'}
                                </Button>
                            ) : (
                                <Button
                                    variant="contained"
                                    onClick={handleNext}
                                    endIcon={<NextIcon />}
                                >
                                    التالي
                                </Button>
                            )}
                        </Box>
                    </Paper>
                </Grid>
            </Grid>

            {/* Preview Dialog */}
            <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    <Typography variant="h6">👁️ معاينة السياسة</Typography>
                </DialogTitle>
                <DialogContent>
                    <Paper sx={{ p: 2, bgcolor: 'grey.100', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                        {generatePreview()}
                    </Paper>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPreviewOpen(false)}>إغلاق</Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                    severity={snackbar.severity}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Container>
    );
}
