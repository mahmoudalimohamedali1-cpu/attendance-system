/**
 * Payroll Settings Page - إعدادات الرواتب
 * مستوحاة من ZenHR
 */
import { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    Grid,
    TextField,
    MenuItem,
    Switch,
    FormControlLabel,
    Button,
    Alert,
    Divider,
    CircularProgress,
    Chip,
    Accordion,
    AccordionSummary,
    AccordionDetails,
} from '@mui/material';
import {
    Save as SaveIcon,
    RestartAlt as ResetIcon,
    ExpandMore as ExpandMoreIcon,
    DateRange as DateRangeIcon,
    WorkOff as WorkOffIcon,
    AccessTime as AccessTimeIcon,
    BeachAccess as BeachAccessIcon,
    Receipt as ReceiptIcon,
    TrendingDown as TrendingDownIcon,
    Settings as SettingsIcon,
} from '@mui/icons-material';
import { payrollSettingsService, PayrollSettingsData } from '../../services/payroll-settings.service';

// خيارات القوائم المنسدلة
const CALC_BASE_OPTIONS = [
    { value: 'CALENDAR_DAYS', label: 'حساب على أساس أيام التقويم (30 يوم)' },
    { value: 'ACTUAL_WORKING_DAYS', label: 'حساب على أساس أيام العمل الفعلية' },
    { value: 'FIXED_30_DAYS', label: 'ثابت 30 يوم' },
];

const HIRE_TERMINATION_METHODS = [
    { value: 'EXCLUDE_WEEKENDS', label: 'استثناء عطلات نهاية الأسبوع' },
    { value: 'INCLUDE_ALL_DAYS', label: 'شمول جميع الأيام' },
    { value: 'PRORATE_BY_CALENDAR', label: 'التناسب حسب التقويم' },
];

const UNPAID_LEAVE_METHODS = [
    { value: 'BASED_ON_SHIFTS', label: 'على أساس مناوبات العمل' },
    { value: 'BASED_ON_CALENDAR', label: 'على أساس التقويم' },
    { value: 'BASED_ON_WORKING_DAYS', label: 'على أساس أيام العمل فقط' },
];

const OVERTIME_METHODS = [
    { value: 'BASED_ON_SHIFTS', label: 'على أساس مناوبات العمل' },
    { value: 'BASED_ON_BASIC_ONLY', label: 'على أساس الراتب الأساسي فقط' },
    { value: 'BASED_ON_TOTAL', label: 'على أساس إجمالي الراتب' },
    { value: 'BASED_ON_ELIGIBLE_COMPONENTS', label: 'على أساس البدلات الخاضعة للإضافي (ZenHR)' },
];

const LEAVE_ALLOWANCE_METHODS = [
    { value: 'BASIC_SALARY', label: 'الراتب الأساسي' },
    { value: 'BASIC_PLUS_HOUSING', label: 'الراتب الأساسي + بدل السكن' },
    { value: 'TOTAL_SALARY', label: 'إجمالي الراتب' },
];

// Section Card Component
const SettingsSection = ({
    icon,
    title,
    description,
    children,
    defaultExpanded = true,
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
    children: React.ReactNode;
    defaultExpanded?: boolean;
}) => (
    <Accordion defaultExpanded={defaultExpanded} sx={{ mb: 2, borderRadius: 2, '&:before': { display: 'none' } }}>
        <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            sx={{
                bgcolor: 'grey.50',
                borderRadius: 2,
                '&.Mui-expanded': { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{
                    p: 1,
                    borderRadius: 2,
                    bgcolor: 'primary.main',
                    color: 'white',
                    display: 'flex',
                }}>
                    {icon}
                </Box>
                <Box>
                    <Typography variant="subtitle1" fontWeight={600}>{title}</Typography>
                    <Typography variant="caption" color="text.secondary">{description}</Typography>
                </Box>
            </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 3 }}>
            {children}
        </AccordionDetails>
    </Accordion>
);

export default function PayrollSettingsPage() {
    const [settings, setSettings] = useState<PayrollSettingsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            setLoading(true);
            const data = await payrollSettingsService.getSettings();
            setSettings(data);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'فشل في تحميل الإعدادات');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field: keyof PayrollSettingsData, value: any) => {
        if (!settings) return;
        setSettings({ ...settings, [field]: value });
        setHasChanges(true);
        setSuccess(null);
    };

    const handleSave = async () => {
        if (!settings) return;
        try {
            setSaving(true);
            await payrollSettingsService.updateSettings(settings);
            setSuccess('تم حفظ الإعدادات بنجاح');
            setHasChanges(false);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'فشل في حفظ الإعدادات');
        } finally {
            setSaving(false);
        }
    };

    const handleReset = async () => {
        if (!confirm('هل تريد إعادة تعيين جميع الإعدادات للقيم الافتراضية؟')) return;
        try {
            setSaving(true);
            const data = await payrollSettingsService.resetToDefaults();
            setSettings(data);
            setSuccess('تم إعادة تعيين الإعدادات للقيم الافتراضية');
            setHasChanges(false);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'فشل في إعادة التعيين');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!settings) {
        return <Alert severity="error">فشل في تحميل إعدادات الرواتب</Alert>;
    }

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
                <Box>
                    <Typography variant="h4" fontWeight={700} gutterBottom>
                        إعدادات الرواتب
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        قبل أن تتمكن من حساب الرواتب، يجب أن تحدد قاعدة الاحتساب الخاصة بك للخصومات والمساهمات.
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                        variant="outlined"
                        startIcon={<ResetIcon />}
                        onClick={handleReset}
                        disabled={saving}
                    >
                        إعادة التعيين
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                        onClick={handleSave}
                        disabled={saving || !hasChanges}
                    >
                        حفظ التغييرات
                    </Button>
                </Box>
            </Box>

            {/* Alerts */}
            {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>{success}</Alert>}
            {hasChanges && (
                <Alert severity="warning" sx={{ mb: 3 }}>
                    لديك تغييرات غير محفوظة. اضغط "حفظ التغييرات" لتطبيقها.
                </Alert>
            )}

            {/* Settings Sections */}

            {/* 1. تاريخ إغلاق الرواتب */}
            <SettingsSection
                icon={<DateRangeIcon />}
                title="تاريخ إغلاق الرواتب"
                description="تحديد يوم إغلاق كشف الرواتب الشهري"
            >
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <TextField
                            label="يوم إغلاق الرواتب"
                            type="number"
                            fullWidth
                            value={settings.payrollClosingDay}
                            onChange={(e) => handleChange('payrollClosingDay', parseInt(e.target.value) || 0)}
                            inputProps={{ min: 0, max: 28 }}
                            helperText="الحد الأدنى 0 أيام والحد الأقصى 28 يومًا"
                        />
                    </Grid>
                </Grid>
            </SettingsSection>

            {/* 2. حساب التوظيف وإنهاء الخدمات */}
            <SettingsSection
                icon={<WorkOffIcon />}
                title="حساب التوظيف وإنهاء الخدمات"
                description="حدد قاعدة الاحتساب المستخدمة للتوظيف وإنهاء الخدمات في كشوف الرواتب"
            >
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <TextField
                            select
                            label="قاعدة الحساب"
                            fullWidth
                            value={settings.hireTerminationCalcBase}
                            onChange={(e) => handleChange('hireTerminationCalcBase', e.target.value)}
                        >
                            {CALC_BASE_OPTIONS.map((opt) => (
                                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            select
                            label="طريقة الحساب"
                            fullWidth
                            value={settings.hireTerminationMethod}
                            onChange={(e) => handleChange('hireTerminationMethod', e.target.value)}
                        >
                            {HIRE_TERMINATION_METHODS.map((opt) => (
                                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                </Grid>
            </SettingsSection>

            {/* 3. حساب الإجازات غير المدفوعة */}
            <SettingsSection
                icon={<BeachAccessIcon />}
                title="حساب العطل غير المدفوعة"
                description="حدد قاعدة الاحتساب المستخدمة في إدراج حركات العطل غير المدفوعة"
            >
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <TextField
                            select
                            label="قاعدة الحساب"
                            fullWidth
                            value={settings.unpaidLeaveCalcBase}
                            onChange={(e) => handleChange('unpaidLeaveCalcBase', e.target.value)}
                        >
                            {CALC_BASE_OPTIONS.map((opt) => (
                                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            select
                            label="طريقة الحساب"
                            fullWidth
                            value={settings.unpaidLeaveMethod}
                            onChange={(e) => handleChange('unpaidLeaveMethod', e.target.value)}
                        >
                            {UNPAID_LEAVE_METHODS.map((opt) => (
                                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                    <Grid item xs={12}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={settings.splitUnpaidByClosingDate}
                                    onChange={(e) => handleChange('splitUnpaidByClosingDate', e.target.checked)}
                                />
                            }
                            label="تقسيم الإجازات غير المدفوعة بناءً على تواريخ إغلاق الرواتب"
                        />
                    </Grid>
                </Grid>
            </SettingsSection>

            {/* 4. حساب ساعات العمل الإضافي */}
            <SettingsSection
                icon={<AccessTimeIcon />}
                title="حساب ساعات العمل الإضافية"
                description="حدد قاعدة الاحتساب المستخدمة في إدراج حركات العمل الإضافي"
            >
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <TextField
                            select
                            label="قاعدة الحساب"
                            fullWidth
                            value={settings.overtimeCalcBase}
                            onChange={(e) => handleChange('overtimeCalcBase', e.target.value)}
                        >
                            {CALC_BASE_OPTIONS.map((opt) => (
                                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            select
                            label="طريقة الحساب"
                            fullWidth
                            value={settings.overtimeMethod}
                            onChange={(e) => handleChange('overtimeMethod', e.target.value)}
                        >
                            {OVERTIME_METHODS.map((opt) => (
                                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                </Grid>
            </SettingsSection>

            {/* 5. حساب بدل أيام الإجازة */}
            <SettingsSection
                icon={<BeachAccessIcon />}
                title="حساب بدل أيام الإجازة"
                description="حدد قاعدة الاحتساب المستخدمة في إدراج تعويض العطل"
            >
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <TextField
                            select
                            label="قاعدة الحساب"
                            fullWidth
                            value={settings.leaveAllowanceCalcBase}
                            onChange={(e) => handleChange('leaveAllowanceCalcBase', e.target.value)}
                        >
                            {CALC_BASE_OPTIONS.map((opt) => (
                                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            select
                            label="طريقة الحساب"
                            fullWidth
                            value={settings.leaveAllowanceMethod}
                            onChange={(e) => handleChange('leaveAllowanceMethod', e.target.value)}
                        >
                            {LEAVE_ALLOWANCE_METHODS.map((opt) => (
                                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            label="مقسم الراتب اليومي للإجازات"
                            type="number"
                            fullWidth
                            value={settings.leaveDailyRateDivisor}
                            onChange={(e) => handleChange('leaveDailyRateDivisor', parseInt(e.target.value) || 30)}
                            helperText="عدد الأيام الذي يقسم عليه الراتب لحساب اليومية (عادة 30)"
                        />
                    </Grid>
                </Grid>
            </SettingsSection>

            {/* 6. قسيمة رواتب الموظف */}
            < SettingsSection
                icon={< ReceiptIcon />}
                title="قسيمة رواتب الموظف"
                description="حدد ما يظهر في قسيمة رواتب الموظفين"
            >
                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={settings.showCompanyContributions}
                                    onChange={(e) => handleChange('showCompanyContributions', e.target.checked)}
                                />
                            }
                            label="إظهار مساهمات الشركة على قسيمة الراتب"
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={settings.showClosingDateOnPayslip}
                                    onChange={(e) => handleChange('showClosingDateOnPayslip', e.target.checked)}
                                />
                            }
                            label="إظهار تاريخ إغلاق الرواتب في قسائم الرواتب"
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={settings.deductAbsenceFromBasic}
                                    onChange={(e) => handleChange('deductAbsenceFromBasic', e.target.checked)}
                                />
                            }
                            label="اقتطاع الغيابات من الراتب الأساسي المستحق"
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={settings.showActualAbsenceDays}
                                    onChange={(e) => handleChange('showActualAbsenceDays', e.target.checked)}
                                />
                            }
                            label="إظهار حساب أيام الغياب الفعلي"
                        />
                    </Grid>
                </Grid>
            </SettingsSection >

            {/* 7. أرصدة الرواتب السلبية */}
            < SettingsSection
                icon={< TrendingDownIcon />}
                title="أرصدة الرواتب السلبية"
                description="إدارة أرصدة الرواتب السلبية الناتجة عن الإجازات غير المدفوعة أو الخصومات الزائدة"
            >
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={settings.enableNegativeBalanceCarryover}
                                    onChange={(e) => handleChange('enableNegativeBalanceCarryover', e.target.checked)}
                                />
                            }
                            label="تمكين ترحيل الراتب السلبي للشهر التالي"
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={settings.settleNegativeAsTransaction}
                                    onChange={(e) => handleChange('settleNegativeAsTransaction', e.target.checked)}
                                />
                            }
                            label="تسوية الرصيد السلبي كحركة مالية خارج الرواتب"
                        />
                    </Grid>
                </Grid>
            </SettingsSection >

            {/* 8. إعدادات إضافية */}
            < SettingsSection
                icon={< SettingsIcon />}
                title="إعدادات إضافية"
                description="إعدادات متقدمة للحسابات"
                defaultExpanded={false}
            >
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <TextField
                            label="تقريب الراتب لأقرب"
                            type="number"
                            fullWidth
                            value={settings.roundSalaryToNearest}
                            onChange={(e) => handleChange('roundSalaryToNearest', parseInt(e.target.value) || 0)}
                            helperText="0 = بدون تقريب، مثال: 5 = تقريب لأقرب 5 ريال"
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            label="أيام العمل الافتراضية في الشهر"
                            type="number"
                            fullWidth
                            value={settings.defaultWorkingDaysPerMonth}
                            onChange={(e) => handleChange('defaultWorkingDaysPerMonth', parseInt(e.target.value) || 30)}
                        />
                    </Grid>
                </Grid>
            </SettingsSection >
        </Box >
    );
}
