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
    Timer as TimerIcon,
    Security as SecurityIcon,
    AttachMoney as AttachMoneyIcon,
    NightsStay as NightsStayIcon,
    CardGiftcard as BonusIcon,
    Percent as PercentIcon,
    AccountBalance as TaxIcon,
    CreditCard as AdvanceIcon,
    MonetizationOn as LoanIcon,
    Approval as ApprovalIcon,
    AccountBalanceWallet as BankIcon,
    History as RetroactiveIcon,
    WorkHistory as EosIcon,
    HealthAndSafety as GosiIcon,
    FlightTakeoff as VacationIcon,
    Warning as PenaltyIcon,
    Event as EventIcon,
    Email as EmailIcon,
    Language as LanguageIcon,
    TimerOff as OvertimeCapIcon,
    AutoMode as AutoPayrollIcon,
    FactCheck as AuditIcon,
    Tune as RoundingIcon,
    AccountTree as DepartmentBudgetIcon,
    Hub as CostCenterIcon,
    FileDownload as ExportFormatIcon,
} from '@mui/icons-material';
import { payrollSettingsService, PayrollSettingsData } from '../../services/payroll-settings.service';

// خيارات القوائم المنسدلة مع النصوص التعريفية
const CALC_BASE_OPTIONS = [
    { value: 'CALENDAR_DAYS', label: 'أيام التقويم', desc: 'الراتب ÷ عدد أيام الشهر الفعلية (28-31 يوم)' },
    { value: 'ACTUAL_WORKING_DAYS', label: 'أيام العمل الفعلية', desc: 'الراتب ÷ أيام العمل فقط (بدون الجمعة والسبت)' },
    { value: 'FIXED_30_DAYS', label: 'ثابت 30 يوم', desc: 'الراتب ÷ 30 دائماً (الأكثر شيوعاً في السعودية)' },
];

const HIRE_TERMINATION_METHODS = [
    { value: 'EXCLUDE_WEEKENDS', label: 'استثناء العطل', desc: 'لا يُحسب الراتب لأيام الجمعة والسبت' },
    { value: 'INCLUDE_ALL_DAYS', label: 'شمول جميع الأيام', desc: 'يُحسب الراتب لكل الأيام بما فيها العطل (Pro-rata)' },
    { value: 'PRORATE_BY_CALENDAR', label: 'التناسب التقويمي', desc: 'الراتب × (أيام العمل ÷ أيام الشهر)' },
    { value: 'EXCLUDE_FROM_PERIOD', label: 'استثناء من الدورة الحالية', desc: 'الموظفين الجدد خلال الفترة لا يُحسب راتبهم هذا الشهر' },
];

const UNPAID_LEAVE_METHODS = [
    { value: 'BASED_ON_SHIFTS', label: 'حسب المناوبات', desc: 'خصم أيام الإجازة التي تقع في أيام عمل الموظف فقط' },
    { value: 'BASED_ON_CALENDAR', label: 'حسب التقويم', desc: 'خصم كل أيام الإجازة بما فيها العطل' },
    { value: 'BASED_ON_WORKING_DAYS', label: 'أيام العمل فقط', desc: 'خصم أيام العمل الرسمية فقط (أحد-خميس)' },
];

const OVERTIME_METHODS = [
    { value: 'BASED_ON_SHIFTS', label: 'حسب المناوبات', desc: 'أجر الساعة = الراتب ÷ (ساعات المناوبة × أيام العمل)' },
    { value: 'BASED_ON_BASIC_ONLY', label: 'الراتب الأساسي', desc: 'أجر الساعة = الراتب الأساسي ÷ 240 ساعة' },
    { value: 'BASED_ON_TOTAL', label: 'إجمالي الراتب', desc: 'أجر الساعة = (الأساسي + البدلات) ÷ 240 ساعة' },
    { value: 'BASED_ON_ELIGIBLE_COMPONENTS', label: 'البدلات المؤهلة', desc: 'أجر الساعة = البدلات المحددة كـ"خاضعة للإضافي" فقط' },
];

const LEAVE_ALLOWANCE_METHODS = [
    { value: 'BASIC_SALARY', label: 'الراتب الأساسي', desc: 'بدل الإجازة = الراتب الأساسي فقط' },
    { value: 'BASIC_PLUS_HOUSING', label: 'الأساسي + السكن', desc: 'بدل الإجازة = الراتب الأساسي + بدل السكن' },
    { value: 'TOTAL_SALARY', label: 'إجمالي الراتب', desc: 'بدل الإجازة = كامل الراتب بكل البدلات' },
];

// خيارات العملات
const CURRENCY_OPTIONS = [
    { value: 'SAR', label: 'ريال سعودي (SAR)' },
    { value: 'AED', label: 'درهم إماراتي (AED)' },
    { value: 'KWD', label: 'دينار كويتي (KWD)' },
    { value: 'BHD', label: 'دينار بحريني (BHD)' },
    { value: 'OMR', label: 'ريال عماني (OMR)' },
    { value: 'QAR', label: 'ريال قطري (QAR)' },
    { value: 'EGP', label: 'جنيه مصري (EGP)' },
    { value: 'JOD', label: 'دينار أردني (JOD)' },
    { value: 'USD', label: 'دولار أمريكي (USD)' },
    { value: 'EUR', label: 'يورو (EUR)' },
];

// خيارات طريقة حساب المكافأة
const BONUS_CALCULATION_METHODS = [
    { value: 'FIXED', label: 'مبلغ ثابت', desc: 'مكافأة بمبلغ محدد لكل موظف' },
    { value: 'PERCENTAGE', label: 'نسبة من الراتب', desc: 'مكافأة = نسبة % × الراتب الشهري' },
    { value: 'PERFORMANCE_BASED', label: 'حسب الأداء', desc: 'مكافأة مرتبطة بتقييم الأداء والـ KPIs' },
];

// خيارات أساس حساب العمولة
const COMMISSION_CALCULATION_BASES = [
    { value: 'SALES', label: 'المبيعات', desc: 'عمولة = نسبة % × إجمالي المبيعات' },
    { value: 'PROFIT', label: 'الأرباح', desc: 'عمولة = نسبة % × صافي الربح' },
    { value: 'CUSTOM', label: 'مخصص', desc: 'معادلة مخصصة حسب سياسة الشركة' },
];

// خيارات طريقة حساب الضرائب
const TAX_CALCULATION_METHODS = [
    { value: 'EXEMPT', label: 'معفى', desc: 'لا يتم احتساب ضرائب (السعودية/الخليج)' },
    { value: 'FLAT_RATE', label: 'معدل ثابت', desc: 'ضريبة = نسبة ثابتة × الراتب الخاضع' },
    { value: 'PROGRESSIVE', label: 'تصاعدي', desc: 'شرائح ضريبية تزيد مع زيادة الدخل' },
];

// خيارات طريقة حساب نهاية الخدمة
const EOS_CALCULATION_METHODS = [
    { value: 'SAUDI_LABOR_LAW', label: 'نظام العمل السعودي', desc: 'نصف راتب للـ5 سنوات الأولى، راتب كامل بعدها' },
    { value: 'CUSTOM', label: 'مخصص', desc: 'معادلة مخصصة حسب سياسة الشركة' },
    { value: 'CONTRACTUAL', label: 'حسب العقد', desc: 'حسب ما هو منصوص في عقد الموظف' },
];

// خيارات طريقة صرف الإجازات
const VACATION_ENCASHMENT_METHODS = [
    { value: 'ON_TERMINATION', label: 'عند إنهاء الخدمة', desc: 'صرف رصيد الإجازات عند ترك العمل فقط' },
    { value: 'ON_REQUEST', label: 'عند الطلب', desc: 'يمكن للموظف طلب صرف رصيده أي وقت' },
    { value: 'ANNUAL', label: 'سنوياً', desc: 'صرف تلقائي للرصيد المتبقي نهاية كل سنة' },
];

// خيارات طريقة خصم التأخير
const LATE_DEDUCTION_METHODS = [
    { value: 'PER_MINUTE', label: 'بالدقيقة', desc: 'خصم = (دقائق التأخير ÷ 60) × أجر الساعة' },
    { value: 'PER_HOUR', label: 'بالساعة', desc: 'خصم = عدد الساعات (تقريب لأعلى) × أجر الساعة' },
    { value: 'DAILY_RATE', label: 'معدل يومي', desc: 'إذا تجاوز التأخير الحد المحدد → خصم يوم كامل' },
];

// خيارات طريقة خصم الغياب
const ABSENCE_DEDUCTION_METHODS = [
    { value: 'DAILY_RATE', label: 'معدل يومي', desc: 'خصم = عدد أيام الغياب × أجر اليوم' },
    { value: 'HALF_DAY', label: 'نصف يوم', desc: 'خصم = عدد أيام الغياب × (أجر اليوم ÷ 2)' },
    { value: 'PROGRESSIVE', label: 'تصاعدي', desc: 'يوم 1 = يوم، يوم 2 = يومين، يوم 3 = 3 أيام...' },
];

// خيارات طريقة خصم الانصراف المبكر
const EARLY_DEPARTURE_METHODS = [
    { value: 'PER_MINUTE', label: 'بالدقيقة', desc: 'خصم = (دقائق الانصراف المبكر ÷ 60) × أجر الساعة' },
    { value: 'PER_HOUR', label: 'بالساعة', desc: 'خصم = عدد الساعات (تقريب لأعلى) × أجر الساعة' },
    { value: 'DAILY_RATE', label: 'معدل يومي', desc: 'إذا تجاوز الانصراف المبكر الحد → خصم يوم كامل' },
];

// خيارات لغة قسيمة الراتب
const PAYSLIP_LANGUAGE_OPTIONS = [
    { value: 'AR', label: 'العربية', desc: 'قسيمة الراتب باللغة العربية فقط' },
    { value: 'EN', label: 'الإنجليزية', desc: 'قسيمة الراتب باللغة الإنجليزية فقط' },
    { value: 'BOTH', label: 'كلاهما', desc: 'قسيمة ثنائية اللغة (عربي/إنجليزي)' },
];

// خيارات طريقة تقريب الراتب
const SALARY_ROUNDING_METHODS = [
    { value: 'NEAREST', label: 'لأقرب قيمة', desc: 'مثال: 1002.5 → 1003 أو 1002.4 → 1002' },
    { value: 'UP', label: 'تقريب للأعلى', desc: 'مثال: 1002.1 → 1003 (دائماً لصالح الموظف)' },
    { value: 'DOWN', label: 'تقريب للأسفل', desc: 'مثال: 1002.9 → 1002 (دائماً لصالح الشركة)' },
];

// خيارات صيغة تصدير الرواتب
const PAYROLL_EXPORT_FORMATS = [
    { value: 'EXCEL', label: 'Excel', desc: 'ملف Excel قابل للتعديل (.xlsx)' },
    { value: 'PDF', label: 'PDF', desc: 'ملف PDF للطباعة والأرشفة' },
    { value: 'CSV', label: 'CSV', desc: 'ملف نصي للاستيراد في أنظمة أخرى' },
    { value: 'WPS', label: 'WPS', desc: 'صيغة نظام حماية الأجور السعودي' },
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

            {/* جدول دفع الرواتب */}
            <SettingsSection
                icon={<EventIcon />}
                title="جدول دفع الرواتب"
                description="تحديد متى يتم دفع الرواتب للموظفين"
            >
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <TextField
                            select
                            label="نوع يوم الدفع"
                            fullWidth
                            value={settings.paymentDayType || 'LAST_WORKING_DAY'}
                            onChange={(e) => handleChange('paymentDayType', e.target.value)}
                            helperText={settings.paymentDayType === 'FIXED_DAY' ? 'سيتم الدفع في يوم محدد من كل شهر' : 'سيتم الدفع في آخر يوم عمل من كل شهر'}
                        >
                            <MenuItem value="LAST_WORKING_DAY">
                                <Box>
                                    <Typography variant="body2">آخر يوم عمل من كل شهر</Typography>
                                    <Typography variant="caption" color="text.secondary">يتم الدفع تلقائياً في آخر يوم عمل</Typography>
                                </Box>
                            </MenuItem>
                            <MenuItem value="FIXED_DAY">
                                <Box>
                                    <Typography variant="body2">يوم محدد من كل شهر</Typography>
                                    <Typography variant="caption" color="text.secondary">اختر يوم ثابت للدفع</Typography>
                                </Box>
                            </MenuItem>
                        </TextField>
                    </Grid>
                    {settings.paymentDayType === 'FIXED_DAY' && (
                        <Grid item xs={12} md={6}>
                            <TextField
                                label="يوم الدفع"
                                type="number"
                                fullWidth
                                value={settings.paymentDay || 28}
                                onChange={(e) => handleChange('paymentDay', parseInt(e.target.value) || 28)}
                                inputProps={{ min: 1, max: 31 }}
                                helperText="اختر يوم من 1 إلى 31 - ملاحظة: إذا كان الشهر أقصر سيتم الدفع في آخر يوم"
                            />
                        </Grid>
                    )}
                </Grid>
                <Box sx={{ mt: 2, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                    <Typography variant="body2" color="info.contrastText">
                        💡 <strong>ملاحظة:</strong> هذا الإعداد يُستخدم لتحديد تاريخ استحقاق الراتب في التقارير والتنبيهات.
                        {settings.paymentDayType === 'FIXED_DAY'
                            ? ` الرواتب ستُستحق في يوم ${settings.paymentDay || 28} من كل شهر.`
                            : ' الرواتب ستُستحق في آخر يوم عمل من كل شهر.'}
                    </Typography>
                </Box>
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
                            helperText={CALC_BASE_OPTIONS.find(o => o.value === settings.hireTerminationCalcBase)?.desc}
                        >
                            {CALC_BASE_OPTIONS.map((opt) => (
                                <MenuItem key={opt.value} value={opt.value}>
                                    <Box>
                                        <Typography variant="body2">{opt.label}</Typography>
                                        <Typography variant="caption" color="text.secondary">{opt.desc}</Typography>
                                    </Box>
                                </MenuItem>
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
                            helperText={HIRE_TERMINATION_METHODS.find(o => o.value === settings.hireTerminationMethod)?.desc}
                        >
                            {HIRE_TERMINATION_METHODS.map((opt) => (
                                <MenuItem key={opt.value} value={opt.value}>
                                    <Box>
                                        <Typography variant="body2">{opt.label}</Typography>
                                        <Typography variant="caption" color="text.secondary">{opt.desc}</Typography>
                                    </Box>
                                </MenuItem>
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
                            helperText={CALC_BASE_OPTIONS.find(o => o.value === settings.unpaidLeaveCalcBase)?.desc}
                        >
                            {CALC_BASE_OPTIONS.map((opt) => (
                                <MenuItem key={opt.value} value={opt.value}>
                                    <Box>
                                        <Typography variant="body2">{opt.label}</Typography>
                                        <Typography variant="caption" color="text.secondary">{opt.desc}</Typography>
                                    </Box>
                                </MenuItem>
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
                            helperText={UNPAID_LEAVE_METHODS.find(o => o.value === settings.unpaidLeaveMethod)?.desc}
                        >
                            {UNPAID_LEAVE_METHODS.map((opt) => (
                                <MenuItem key={opt.value} value={opt.value}>
                                    <Box>
                                        <Typography variant="body2">{opt.label}</Typography>
                                        <Typography variant="caption" color="text.secondary">{opt.desc}</Typography>
                                    </Box>
                                </MenuItem>
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
                            helperText={CALC_BASE_OPTIONS.find(o => o.value === settings.overtimeCalcBase)?.desc}
                        >
                            {CALC_BASE_OPTIONS.map((opt) => (
                                <MenuItem key={opt.value} value={opt.value}>
                                    <Box>
                                        <Typography variant="body2">{opt.label}</Typography>
                                        <Typography variant="caption" color="text.secondary">{opt.desc}</Typography>
                                    </Box>
                                </MenuItem>
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
                            helperText={OVERTIME_METHODS.find(o => o.value === settings.overtimeMethod)?.desc}
                        >
                            {OVERTIME_METHODS.map((opt) => (
                                <MenuItem key={opt.value} value={opt.value}>
                                    <Box>
                                        <Typography variant="body2">{opt.label}</Typography>
                                        <Typography variant="caption" color="text.secondary">{opt.desc}</Typography>
                                    </Box>
                                </MenuItem>
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
                            helperText={CALC_BASE_OPTIONS.find(o => o.value === settings.leaveAllowanceCalcBase)?.desc}
                        >
                            {CALC_BASE_OPTIONS.map((opt) => (
                                <MenuItem key={opt.value} value={opt.value}>
                                    <Box>
                                        <Typography variant="body2">{opt.label}</Typography>
                                        <Typography variant="caption" color="text.secondary">{opt.desc}</Typography>
                                    </Box>
                                </MenuItem>
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
                            helperText={LEAVE_ALLOWANCE_METHODS.find(o => o.value === settings.leaveAllowanceMethod)?.desc}
                        >
                            {LEAVE_ALLOWANCE_METHODS.map((opt) => (
                                <MenuItem key={opt.value} value={opt.value}>
                                    <Box>
                                        <Typography variant="body2">{opt.label}</Typography>
                                        <Typography variant="caption" color="text.secondary">{opt.desc}</Typography>
                                    </Box>
                                </MenuItem>
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

            {/* 9. معاملات الوقت الإضافي */}
            <SettingsSection
                icon={<TimerIcon />}
                title="معاملات الوقت الإضافي"
                description="تحديد معاملات حساب الوقت الإضافي للأيام العادية وعطلات نهاية الأسبوع والأعياد"
            >
                <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                        <TextField
                            label="معامل الوقت الإضافي العادي"
                            type="number"
                            fullWidth
                            value={settings.overtimeMultiplier}
                            onChange={(e) => handleChange('overtimeMultiplier', parseFloat(e.target.value) || 1.5)}
                            inputProps={{ step: 0.25, min: 1, max: 5 }}
                            helperText="مثال: 1.5 = 150% من الراتب العادي"
                        />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <TextField
                            label="معامل عطلة نهاية الأسبوع"
                            type="number"
                            fullWidth
                            value={settings.weekendOvertimeMultiplier}
                            onChange={(e) => handleChange('weekendOvertimeMultiplier', parseFloat(e.target.value) || 2.0)}
                            inputProps={{ step: 0.25, min: 1, max: 5 }}
                            helperText="مثال: 2.0 = 200% للعمل في عطلة نهاية الأسبوع"
                        />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <TextField
                            label="معامل الأعياد والعطل الرسمية"
                            type="number"
                            fullWidth
                            value={settings.holidayOvertimeMultiplier}
                            onChange={(e) => handleChange('holidayOvertimeMultiplier', parseFloat(e.target.value) || 2.0)}
                            inputProps={{ step: 0.25, min: 1, max: 5 }}
                            helperText="مثال: 2.0 = 200% للعمل في الأعياد"
                        />
                    </Grid>
                </Grid>
            </SettingsSection>

            {/* 10. فترة السماح والمناوبات الليلية */}
            <SettingsSection
                icon={<NightsStayIcon />}
                title="فترة السماح والمناوبات الليلية"
                description="إعدادات فترة السماح للتأخير وبدل المناوبات الليلية"
            >
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <TextField
                            label="فترة السماح للتأخير (بالدقائق)"
                            type="number"
                            fullWidth
                            value={settings.gracePeriodMinutes}
                            onChange={(e) => handleChange('gracePeriodMinutes', parseInt(e.target.value) || 0)}
                            inputProps={{ min: 0, max: 60 }}
                            helperText="عدد الدقائق المسموح بها للتأخير قبل احتساب خصم"
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            label="نسبة بدل المناوبة الليلية (%)"
                            type="number"
                            fullWidth
                            value={settings.nightShiftAllowancePercent}
                            onChange={(e) => handleChange('nightShiftAllowancePercent', parseFloat(e.target.value) || 0)}
                            inputProps={{ min: 0, max: 100 }}
                            helperText="نسبة إضافية للعمل في المناوبات الليلية"
                        />
                    </Grid>
                </Grid>
            </SettingsSection>

            {/* 11. حدود الخصومات */}
            <SettingsSection
                icon={<SecurityIcon />}
                title="حدود الخصومات والحد الأدنى للراتب"
                description="تحديد الحد الأقصى للخصومات والحد الأدنى للراتب الصافي"
            >
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <TextField
                            label="الحد الأقصى للخصومات (%)"
                            type="number"
                            fullWidth
                            value={settings.maxDeductionPercent}
                            onChange={(e) => handleChange('maxDeductionPercent', parseFloat(e.target.value) || 50)}
                            inputProps={{ min: 0, max: 100 }}
                            helperText="الحد الأقصى لنسبة الخصم من الراتب (مثال: 50%)"
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            label="الحد الأدنى للراتب الصافي"
                            type="number"
                            fullWidth
                            value={settings.minNetSalary}
                            onChange={(e) => handleChange('minNetSalary', parseFloat(e.target.value) || 0)}
                            inputProps={{ min: 0 }}
                            helperText="الحد الأدنى للراتب الصافي بعد الخصومات (0 = بدون حد)"
                        />
                    </Grid>
                </Grid>
            </SettingsSection>

            {/* 12. القفل التلقائي */}
            <SettingsSection
                icon={<DateRangeIcon />}
                title="القفل التلقائي للرواتب"
                description="تحديد يوم القفل التلقائي لكشوف الرواتب"
            >
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <TextField
                            label="يوم القفل التلقائي"
                            type="number"
                            fullWidth
                            value={settings.autoLockDay}
                            onChange={(e) => handleChange('autoLockDay', parseInt(e.target.value) || 0)}
                            inputProps={{ min: 0, max: 28 }}
                            helperText="0 = معطل، 1-28 = يوم القفل التلقائي من كل شهر"
                        />
                    </Grid>
                </Grid>
            </SettingsSection>

            {/* 13. إعدادات العملة */}
            <SettingsSection
                icon={<AttachMoneyIcon />}
                title="إعدادات العملة"
                description="تحديد العملة الافتراضية وتفعيل دعم العملات المتعددة"
            >
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <TextField
                            select
                            label="العملة الافتراضية"
                            fullWidth
                            value={settings.defaultCurrency}
                            onChange={(e) => handleChange('defaultCurrency', e.target.value)}
                        >
                            {CURRENCY_OPTIONS.map((opt) => (
                                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={settings.enableMultiCurrency}
                                    onChange={(e) => handleChange('enableMultiCurrency', e.target.checked)}
                                />
                            }
                            label="تفعيل دعم العملات المتعددة"
                        />
                    </Grid>
                </Grid>
            </SettingsSection>

            {/* 14. إعدادات المكافآت */}
            <SettingsSection
                icon={<BonusIcon />}
                title="إعدادات المكافآت"
                description="تفعيل وتكوين نظام المكافآت للموظفين"
            >
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={settings.enableBonusTracking}
                                    onChange={(e) => handleChange('enableBonusTracking', e.target.checked)}
                                />
                            }
                            label="تفعيل تتبع المكافآت"
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            select
                            label="طريقة حساب المكافأة"
                            fullWidth
                            value={settings.bonusCalculationMethod}
                            onChange={(e) => handleChange('bonusCalculationMethod', e.target.value)}
                            disabled={!settings.enableBonusTracking}
                            helperText={BONUS_CALCULATION_METHODS.find(o => o.value === settings.bonusCalculationMethod)?.desc}
                        >
                            {BONUS_CALCULATION_METHODS.map((opt) => (
                                <MenuItem key={opt.value} value={opt.value}>
                                    <Box>
                                        <Typography variant="body2">{opt.label}</Typography>
                                        <Typography variant="caption" color="text.secondary">{opt.desc}</Typography>
                                    </Box>
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                </Grid>
            </SettingsSection>

            {/* 15. إعدادات العمولات */}
            <SettingsSection
                icon={<PercentIcon />}
                title="إعدادات العمولات"
                description="تفعيل وتكوين نظام العمولات للمبيعات والأداء"
            >
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={settings.enableCommission}
                                    onChange={(e) => handleChange('enableCommission', e.target.checked)}
                                />
                            }
                            label="تفعيل نظام العمولات"
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            select
                            label="أساس حساب العمولة"
                            fullWidth
                            value={settings.commissionCalculationBase}
                            onChange={(e) => handleChange('commissionCalculationBase', e.target.value)}
                            disabled={!settings.enableCommission}
                            helperText={COMMISSION_CALCULATION_BASES.find(o => o.value === settings.commissionCalculationBase)?.desc}
                        >
                            {COMMISSION_CALCULATION_BASES.map((opt) => (
                                <MenuItem key={opt.value} value={opt.value}>
                                    <Box>
                                        <Typography variant="body2">{opt.label}</Typography>
                                        <Typography variant="caption" color="text.secondary">{opt.desc}</Typography>
                                    </Box>
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                </Grid>
            </SettingsSection>

            {/* 16. إعدادات البدلات */}
            <SettingsSection
                icon={<AttachMoneyIcon />}
                title="إعدادات البدلات"
                description="تكوين فئات البدلات والحدود القصوى"
            >
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={settings.enableAllowanceCategories}
                                    onChange={(e) => handleChange('enableAllowanceCategories', e.target.checked)}
                                />
                            }
                            label="تفعيل فئات البدلات المتعددة"
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            label="الحد الأقصى للبدلات (%)"
                            type="number"
                            fullWidth
                            value={settings.maxAllowancePercent}
                            onChange={(e) => handleChange('maxAllowancePercent', parseFloat(e.target.value) || 100)}
                            inputProps={{ min: 0, max: 500 }}
                            helperText="الحد الأقصى للبدلات كنسبة من الراتب الأساسي"
                        />
                    </Grid>
                </Grid>
            </SettingsSection>

            {/* 17. إعدادات الضرائب */}
            <SettingsSection
                icon={<TaxIcon />}
                title="إعدادات الضرائب"
                description="تفعيل وتكوين نظام حساب الضرائب على الرواتب"
            >
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={settings.enableTaxCalculation}
                                    onChange={(e) => handleChange('enableTaxCalculation', e.target.checked)}
                                />
                            }
                            label="تفعيل حساب الضرائب"
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            select
                            label="طريقة حساب الضرائب"
                            fullWidth
                            value={settings.taxCalculationMethod}
                            onChange={(e) => handleChange('taxCalculationMethod', e.target.value)}
                            disabled={!settings.enableTaxCalculation}
                            helperText={TAX_CALCULATION_METHODS.find(o => o.value === settings.taxCalculationMethod)?.desc}
                        >
                            {TAX_CALCULATION_METHODS.map((opt) => (
                                <MenuItem key={opt.value} value={opt.value}>
                                    <Box>
                                        <Typography variant="body2">{opt.label}</Typography>
                                        <Typography variant="caption" color="text.secondary">{opt.desc}</Typography>
                                    </Box>
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                </Grid>
            </SettingsSection>

            {/* 18. إعدادات السلفة */}
            <SettingsSection
                icon={<AdvanceIcon />}
                title="إعدادات السلفة على الراتب"
                description="تفعيل وتكوين نظام السلف على الراتب"
            >
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={settings.enableSalaryAdvance}
                                    onChange={(e) => handleChange('enableSalaryAdvance', e.target.checked)}
                                />
                            }
                            label="تفعيل نظام السلفة على الراتب"
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            label="الحد الأقصى للسلفة (%)"
                            type="number"
                            fullWidth
                            value={settings.maxAdvancePercent}
                            onChange={(e) => handleChange('maxAdvancePercent', parseFloat(e.target.value) || 50)}
                            inputProps={{ min: 0, max: 100 }}
                            helperText="الحد الأقصى للسلفة كنسبة من الراتب الشهري"
                            disabled={!settings.enableSalaryAdvance}
                        />
                    </Grid>
                </Grid>
            </SettingsSection>

            {/* 19. إعدادات خصم القروض */}
            <SettingsSection
                icon={<LoanIcon />}
                title="إعدادات خصم القروض"
                description="تفعيل وتكوين خصم القروض من الراتب"
            >
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={settings.enableLoanDeduction}
                                    onChange={(e) => handleChange('enableLoanDeduction', e.target.checked)}
                                />
                            }
                            label="تفعيل خصم القروض من الراتب"
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            label="الحد الأقصى لخصم القرض (%)"
                            type="number"
                            fullWidth
                            value={settings.maxLoanDeductionPercent}
                            onChange={(e) => handleChange('maxLoanDeductionPercent', parseFloat(e.target.value) || 30)}
                            inputProps={{ min: 0, max: 100 }}
                            helperText="الحد الأقصى لخصم القرض كنسبة من الراتب"
                            disabled={!settings.enableLoanDeduction}
                        />
                    </Grid>
                </Grid>
            </SettingsSection>

            {/* 20. إعدادات سير عمل الموافقة */}
            <SettingsSection
                icon={<ApprovalIcon />}
                title="سير عمل الموافقة على الرواتب"
                description="تفعيل وتكوين مستويات الموافقة على كشوف الرواتب"
            >
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={settings.enableApprovalWorkflow}
                                    onChange={(e) => handleChange('enableApprovalWorkflow', e.target.checked)}
                                />
                            }
                            label="تفعيل سير عمل الموافقة"
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            label="عدد مستويات الموافقة"
                            type="number"
                            fullWidth
                            value={settings.approvalLevels}
                            onChange={(e) => handleChange('approvalLevels', parseInt(e.target.value) || 1)}
                            inputProps={{ min: 1, max: 5 }}
                            helperText="عدد مستويات الموافقة المطلوبة قبل صرف الرواتب"
                            disabled={!settings.enableApprovalWorkflow}
                        />
                    </Grid>
                </Grid>
            </SettingsSection>

            {/* 21. إعدادات التحويل البنكي */}
            <SettingsSection
                icon={<BankIcon />}
                title="إعدادات التحويل البنكي"
                description="تفعيل وتكوين إعدادات التحويل البنكي للرواتب"
            >
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={settings.enableBankTransfer}
                                    onChange={(e) => handleChange('enableBankTransfer', e.target.checked)}
                                />
                            }
                            label="تفعيل التحويل البنكي"
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            label="رمز البنك الافتراضي"
                            fullWidth
                            value={settings.defaultBankCode || ''}
                            onChange={(e) => handleChange('defaultBankCode', e.target.value)}
                            helperText="رمز البنك الافتراضي للتحويلات (مثل: RIBL, SABB)"
                            disabled={!settings.enableBankTransfer}
                        />
                    </Grid>
                </Grid>
            </SettingsSection>

            {/* 22. إعدادات الدفع بأثر رجعي */}
            <SettingsSection
                icon={<RetroactiveIcon />}
                title="إعدادات الدفع بأثر رجعي"
                description="تفعيل وتكوين إعدادات الدفع بأثر رجعي"
            >
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={settings.enableRetroactivePay}
                                    onChange={(e) => handleChange('enableRetroactivePay', e.target.checked)}
                                />
                            }
                            label="تفعيل الدفع بأثر رجعي"
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            label="الحد الأقصى للأشهر"
                            type="number"
                            fullWidth
                            value={settings.retroactiveMonthsLimit}
                            onChange={(e) => handleChange('retroactiveMonthsLimit', parseInt(e.target.value) || 3)}
                            inputProps={{ min: 1, max: 12 }}
                            helperText="الحد الأقصى للأشهر التي يمكن الدفع بأثر رجعي لها"
                            disabled={!settings.enableRetroactivePay}
                        />
                    </Grid>
                </Grid>
            </SettingsSection>

            {/* 23. إعدادات مكافأة نهاية الخدمة */}
            <SettingsSection
                icon={<EosIcon />}
                title="إعدادات مكافأة نهاية الخدمة"
                description="تفعيل وتكوين حساب مكافأة نهاية الخدمة"
            >
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={settings.enableEosCalculation}
                                    onChange={(e) => handleChange('enableEosCalculation', e.target.checked)}
                                />
                            }
                            label="تفعيل حساب مكافأة نهاية الخدمة"
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            select
                            label="طريقة حساب نهاية الخدمة"
                            fullWidth
                            value={settings.eosCalculationMethod}
                            onChange={(e) => handleChange('eosCalculationMethod', e.target.value)}
                            disabled={!settings.enableEosCalculation}
                            helperText={EOS_CALCULATION_METHODS.find(o => o.value === settings.eosCalculationMethod)?.desc}
                        >
                            {EOS_CALCULATION_METHODS.map((opt) => (
                                <MenuItem key={opt.value} value={opt.value}>
                                    <Box>
                                        <Typography variant="body2">{opt.label}</Typography>
                                        <Typography variant="caption" color="text.secondary">{opt.desc}</Typography>
                                    </Box>
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                </Grid>
            </SettingsSection>

            {/* 24. إعدادات التأمينات الاجتماعية (GOSI) */}
            <SettingsSection
                icon={<GosiIcon />}
                title="إعدادات التأمينات الاجتماعية (GOSI)"
                description="تفعيل وتكوين حساب التأمينات الاجتماعية حسب نظام العمل السعودي"
            >
                <Grid container spacing={3}>
                    {/* تفعيل حساب التأمينات */}
                    <Grid item xs={12}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={settings.enableGosiCalculation}
                                    onChange={(e) => handleChange('enableGosiCalculation', e.target.checked)}
                                />
                            }
                            label="تفعيل حساب التأمينات"
                        />
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mr: 4 }}>
                            احتساب التأمينات الاجتماعية تلقائياً من الراتب الشهري
                        </Typography>
                    </Grid>

                    <Grid item xs={12}>
                        <Divider sx={{ my: 1 }}>
                            <Chip label="نسب التأمينات الأساسية (GOSI)" size="small" />
                        </Divider>
                    </Grid>

                    <Grid item xs={12} md={4}>
                        <TextField
                            label="نسبة الموظف (%)"
                            type="number"
                            fullWidth
                            value={settings.gosiEmployeePercent}
                            onChange={(e) => handleChange('gosiEmployeePercent', parseFloat(e.target.value) || 9.75)}
                            inputProps={{ step: 0.25, min: 0, max: 30 }}
                            helperText="النسبة الافتراضية: 9.75% (تقاعد 9% + ساند 0.75%)"
                            disabled={!settings.enableGosiCalculation}
                        />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <TextField
                            label="نسبة صاحب العمل (%)"
                            type="number"
                            fullWidth
                            value={settings.gosiEmployerPercent}
                            onChange={(e) => handleChange('gosiEmployerPercent', parseFloat(e.target.value) || 11.75)}
                            inputProps={{ step: 0.25, min: 0, max: 30 }}
                            helperText="النسبة الافتراضية: 11.75% (تقاعد 9% + ساند 0.75% + أخطار 2%)"
                            disabled={!settings.enableGosiCalculation}
                        />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <TextField
                            label="الحد الأقصى للراتب الخاضع للتأمينات"
                            type="number"
                            fullWidth
                            value={settings.gosiMaxSalary || 45000}
                            onChange={(e) => handleChange('gosiMaxSalary', parseFloat(e.target.value) || 45000)}
                            inputProps={{ min: 0, max: 100000 }}
                            helperText="الحد الأقصى حالياً: 45,000 ريال (حسب التأمينات)"
                            disabled={!settings.enableGosiCalculation}
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <Divider sx={{ my: 1 }}>
                            <Chip label="نظام ساند (SANED)" size="small" />
                        </Divider>
                    </Grid>

                    <Grid item xs={12} md={4}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={settings.enableSanedCalculation}
                                    onChange={(e) => handleChange('enableSanedCalculation', e.target.checked)}
                                    disabled={!settings.enableGosiCalculation}
                                />
                            }
                            label="تفعيل حساب ساند"
                        />
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mr: 4 }}>
                            نظام التأمين ضد التعطل عن العمل (للموظفين السعوديين فقط)
                        </Typography>
                    </Grid>

                    {settings.enableSanedCalculation && (
                        <>
                            <Grid item xs={12} md={4}>
                                <TextField
                                    label="نسبة ساند على الموظف (%)"
                                    type="number"
                                    fullWidth
                                    value={settings.sanedEmployeePercent || 0.75}
                                    onChange={(e) => handleChange('sanedEmployeePercent', parseFloat(e.target.value) || 0.75)}
                                    inputProps={{ step: 0.25, min: 0, max: 5 }}
                                    helperText="النسبة الحالية: 0.75%"
                                    disabled={!settings.enableGosiCalculation}
                                />
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <TextField
                                    label="نسبة ساند على صاحب العمل (%)"
                                    type="number"
                                    fullWidth
                                    value={settings.sanedEmployerPercent || 0.75}
                                    onChange={(e) => handleChange('sanedEmployerPercent', parseFloat(e.target.value) || 0.75)}
                                    inputProps={{ step: 0.25, min: 0, max: 5 }}
                                    helperText="النسبة الحالية: 0.75%"
                                    disabled={!settings.enableGosiCalculation}
                                />
                            </Grid>
                        </>
                    )}

                    <Grid item xs={12}>
                        <Divider sx={{ my: 1 }}>
                            <Chip label="الأخطار المهنية" size="small" />
                        </Divider>
                    </Grid>

                    <Grid item xs={12} md={4}>
                        <TextField
                            label="نسبة الأخطار المهنية (%)"
                            type="number"
                            fullWidth
                            value={settings.hazardRatePercent || 2.0}
                            onChange={(e) => handleChange('hazardRatePercent', parseFloat(e.target.value) || 2.0)}
                            inputProps={{ step: 0.25, min: 0, max: 10 }}
                            helperText="نسبة تأمين إصابات العمل والأمراض المهنية (على صاحب العمل فقط)"
                            disabled={!settings.enableGosiCalculation}
                        />
                    </Grid>
                </Grid>
            </SettingsSection>

            {/* 25. إعدادات صرف رصيد الإجازات */}
            <SettingsSection
                icon={<VacationIcon />}
                title="إعدادات صرف رصيد الإجازات"
                description="تفعيل وتكوين صرف رصيد الإجازات المتبقية"
            >
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={settings.enableVacationEncashment}
                                    onChange={(e) => handleChange('enableVacationEncashment', e.target.checked)}
                                />
                            }
                            label="تفعيل صرف رصيد الإجازات"
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            select
                            label="طريقة صرف الإجازات"
                            fullWidth
                            value={settings.vacationEncashmentMethod}
                            onChange={(e) => handleChange('vacationEncashmentMethod', e.target.value)}
                            disabled={!settings.enableVacationEncashment}
                            helperText={VACATION_ENCASHMENT_METHODS.find(o => o.value === settings.vacationEncashmentMethod)?.desc}
                        >
                            {VACATION_ENCASHMENT_METHODS.map((opt) => (
                                <MenuItem key={opt.value} value={opt.value}>
                                    <Box>
                                        <Typography variant="body2">{opt.label}</Typography>
                                        <Typography variant="caption" color="text.secondary">{opt.desc}</Typography>
                                    </Box>
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                </Grid>
            </SettingsSection>

            {/* 26. إعدادات عقوبات الحضور */}
            <SettingsSection
                icon={<PenaltyIcon />}
                title="إعدادات عقوبات الحضور"
                description="تفعيل وتكوين خصومات التأخير والغياب والانصراف المبكر"
            >
                <Grid container spacing={3}>
                    {/* تفعيل عقوبات الحضور */}
                    <Grid item xs={12}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={settings.enableAttendancePenalty}
                                    onChange={(e) => handleChange('enableAttendancePenalty', e.target.checked)}
                                />
                            }
                            label="تفعيل عقوبات الحضور"
                        />
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mr: 4 }}>
                            عند التفعيل، سيتم خصم التأخير والغياب والانصراف المبكر من الراتب
                        </Typography>
                    </Grid>

                    <Grid item xs={12}>
                        <Divider sx={{ my: 1 }}>
                            <Chip label="خصم التأخير" size="small" />
                        </Divider>
                    </Grid>

                    {/* طريقة خصم التأخير */}
                    <Grid item xs={12} md={4}>
                        <TextField
                            select
                            label="طريقة خصم التأخير"
                            fullWidth
                            value={settings.lateDeductionMethod}
                            onChange={(e) => handleChange('lateDeductionMethod', e.target.value)}
                            disabled={!settings.enableAttendancePenalty}
                            helperText={LATE_DEDUCTION_METHODS.find(m => m.value === settings.lateDeductionMethod)?.desc}
                        >
                            {LATE_DEDUCTION_METHODS.map((opt) => (
                                <MenuItem key={opt.value} value={opt.value}>
                                    <Box>
                                        <Typography variant="body2">{opt.label}</Typography>
                                        <Typography variant="caption" color="text.secondary">{opt.desc}</Typography>
                                    </Box>
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>

                    {/* حد التأخير - يظهر فقط عند اختيار DAILY_RATE */}
                    {settings.lateDeductionMethod === 'DAILY_RATE' && (
                        <Grid item xs={12} md={4}>
                            <TextField
                                label="حد التأخير لخصم يوم كامل (دقيقة)"
                                type="number"
                                fullWidth
                                value={settings.lateThresholdMinutes || 120}
                                onChange={(e) => handleChange('lateThresholdMinutes', parseInt(e.target.value) || 120)}
                                disabled={!settings.enableAttendancePenalty}
                                helperText="إذا تجاوز التأخير هذا الحد، يُخصم يوم كامل"
                                InputProps={{ inputProps: { min: 1, max: 480 } }}
                            />
                        </Grid>
                    )}

                    {/* الخصم التراكمي للتأخير */}
                    <Grid item xs={12} md={4}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={settings.enableCumulativeLateDeduction}
                                    onChange={(e) => handleChange('enableCumulativeLateDeduction', e.target.checked)}
                                    disabled={!settings.enableAttendancePenalty}
                                />
                            }
                            label="تفعيل الخصم التراكمي للتأخير"
                        />
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mr: 4 }}>
                            كل X مرة تأخير = خصم يوم كامل
                        </Typography>
                    </Grid>

                    {/* عدد مرات التأخير لخصم يوم - يظهر عند تفعيل الخصم التراكمي */}
                    {settings.enableCumulativeLateDeduction && (
                        <Grid item xs={12} md={4}>
                            <TextField
                                label="عدد مرات التأخير لخصم يوم"
                                type="number"
                                fullWidth
                                value={settings.lateCountForDayDeduction || 3}
                                onChange={(e) => handleChange('lateCountForDayDeduction', parseInt(e.target.value) || 3)}
                                disabled={!settings.enableAttendancePenalty}
                                helperText="عدد مرات التأخير التي تساوي خصم يوم كامل"
                                InputProps={{ inputProps: { min: 2, max: 10 } }}
                            />
                        </Grid>
                    )}

                    <Grid item xs={12}>
                        <Divider sx={{ my: 1 }}>
                            <Chip label="خصم الغياب" size="small" />
                        </Divider>
                    </Grid>

                    {/* طريقة خصم الغياب */}
                    <Grid item xs={12} md={4}>
                        <TextField
                            select
                            label="طريقة خصم الغياب"
                            fullWidth
                            value={settings.absenceDeductionMethod}
                            onChange={(e) => handleChange('absenceDeductionMethod', e.target.value)}
                            disabled={!settings.enableAttendancePenalty}
                            helperText={ABSENCE_DEDUCTION_METHODS.find(m => m.value === settings.absenceDeductionMethod)?.desc}
                        >
                            {ABSENCE_DEDUCTION_METHODS.map((opt) => (
                                <MenuItem key={opt.value} value={opt.value}>
                                    <Box>
                                        <Typography variant="body2">{opt.label}</Typography>
                                        <Typography variant="caption" color="text.secondary">{opt.desc}</Typography>
                                    </Box>
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>

                    {/* معدل الخصم التصاعدي - يظهر فقط عند اختيار PROGRESSIVE */}
                    {settings.absenceDeductionMethod === 'PROGRESSIVE' && (
                        <Grid item xs={12} md={4}>
                            <TextField
                                label="معدل الخصم التصاعدي"
                                type="number"
                                fullWidth
                                value={settings.absenceProgressiveRate || 1.0}
                                onChange={(e) => handleChange('absenceProgressiveRate', parseFloat(e.target.value) || 1.0)}
                                disabled={!settings.enableAttendancePenalty}
                                helperText="معدل مضاعفة الخصم (1.0 = عادي، 1.5 = أكثر شدة)"
                                InputProps={{ inputProps: { min: 0.5, max: 3, step: 0.25 } }}
                            />
                        </Grid>
                    )}

                    <Grid item xs={12}>
                        <Divider sx={{ my: 1 }}>
                            <Chip label="خصم الانصراف المبكر" size="small" />
                        </Divider>
                    </Grid>

                    {/* تفعيل خصم الانصراف المبكر */}
                    <Grid item xs={12} md={4}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={settings.enableEarlyDeparturePenalty}
                                    onChange={(e) => handleChange('enableEarlyDeparturePenalty', e.target.checked)}
                                    disabled={!settings.enableAttendancePenalty}
                                />
                            }
                            label="تفعيل خصم الانصراف المبكر"
                        />
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mr: 4 }}>
                            خصم عند مغادرة الموظف قبل نهاية الدوام
                        </Typography>
                    </Grid>

                    {/* طريقة خصم الانصراف المبكر */}
                    {settings.enableEarlyDeparturePenalty && (
                        <>
                            <Grid item xs={12} md={4}>
                                <TextField
                                    select
                                    label="طريقة خصم الانصراف المبكر"
                                    fullWidth
                                    value={settings.earlyDepartureDeductionMethod}
                                    onChange={(e) => handleChange('earlyDepartureDeductionMethod', e.target.value)}
                                    disabled={!settings.enableAttendancePenalty}
                                    helperText={EARLY_DEPARTURE_METHODS.find(m => m.value === settings.earlyDepartureDeductionMethod)?.desc}
                                >
                                    {EARLY_DEPARTURE_METHODS.map((opt) => (
                                        <MenuItem key={opt.value} value={opt.value}>
                                            <Box>
                                                <Typography variant="body2">{opt.label}</Typography>
                                                <Typography variant="caption" color="text.secondary">{opt.desc}</Typography>
                                            </Box>
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Grid>

                            {/* حد الانصراف المبكر - يظهر فقط عند اختيار DAILY_RATE */}
                            {settings.earlyDepartureDeductionMethod === 'DAILY_RATE' && (
                                <Grid item xs={12} md={4}>
                                    <TextField
                                        label="حد الانصراف المبكر لخصم يوم (دقيقة)"
                                        type="number"
                                        fullWidth
                                        value={settings.earlyDepartureThresholdMinutes || 120}
                                        onChange={(e) => handleChange('earlyDepartureThresholdMinutes', parseInt(e.target.value) || 120)}
                                        disabled={!settings.enableAttendancePenalty}
                                        helperText="إذا تجاوز الانصراف المبكر هذا الحد، يُخصم يوم كامل"
                                        InputProps={{ inputProps: { min: 1, max: 480 } }}
                                    />
                                </Grid>
                            )}
                        </>
                    )}
                </Grid>
            </SettingsSection>

            {/* 27. إعدادات قسيمة الراتب */}
            <SettingsSection
                icon={<EmailIcon />}
                title="إعدادات قسيمة الراتب"
                description="تفعيل وتكوين إرسال قسيمة الراتب ولغتها"
            >
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={settings.enablePayslipEmail}
                                    onChange={(e) => handleChange('enablePayslipEmail', e.target.checked)}
                                />
                            }
                            label="تفعيل إرسال قسيمة الراتب بالبريد الإلكتروني"
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            select
                            label="لغة قسيمة الراتب"
                            fullWidth
                            value={settings.payslipLanguage}
                            onChange={(e) => handleChange('payslipLanguage', e.target.value)}
                            helperText={PAYSLIP_LANGUAGE_OPTIONS.find(o => o.value === settings.payslipLanguage)?.desc}
                        >
                            {PAYSLIP_LANGUAGE_OPTIONS.map((opt) => (
                                <MenuItem key={opt.value} value={opt.value}>
                                    <Box>
                                        <Typography variant="body2">{opt.label}</Typography>
                                        <Typography variant="caption" color="text.secondary">{opt.desc}</Typography>
                                    </Box>
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                </Grid>
            </SettingsSection>

            {/* 28. إعدادات الحد الأقصى للوقت الإضافي */}
            <SettingsSection
                icon={<OvertimeCapIcon />}
                title="حدود الوقت الإضافي"
                description="تفعيل وتحديد الحد الأقصى لساعات العمل الإضافي"
            >
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={settings.enableOvertimeCap}
                                    onChange={(e) => handleChange('enableOvertimeCap', e.target.checked)}
                                />
                            }
                            label="تفعيل الحد الأقصى للوقت الإضافي"
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            label="الحد الأقصى لساعات الوقت الإضافي شهرياً"
                            type="number"
                            fullWidth
                            value={settings.maxOvertimeHoursPerMonth}
                            onChange={(e) => handleChange('maxOvertimeHoursPerMonth', Number(e.target.value))}
                            disabled={!settings.enableOvertimeCap}
                            InputProps={{ inputProps: { min: 0, max: 200 } }}
                            helperText="ساعة شهرياً"
                        />
                    </Grid>
                </Grid>
            </SettingsSection>

            {/* 29. إعدادات توليد الرواتب التلقائي */}
            <SettingsSection
                icon={<AutoPayrollIcon />}
                title="توليد الرواتب التلقائي"
                description="تفعيل التوليد التلقائي للرواتب في يوم محدد"
            >
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={settings.enableAutoPayrollGeneration}
                                    onChange={(e) => handleChange('enableAutoPayrollGeneration', e.target.checked)}
                                />
                            }
                            label="تفعيل توليد الرواتب التلقائي"
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            label="يوم توليد الرواتب التلقائي"
                            type="number"
                            fullWidth
                            value={settings.autoPayrollGenerationDay}
                            onChange={(e) => handleChange('autoPayrollGenerationDay', Number(e.target.value))}
                            disabled={!settings.enableAutoPayrollGeneration}
                            InputProps={{ inputProps: { min: 1, max: 28 } }}
                            helperText="من كل شهر"
                        />
                    </Grid>
                </Grid>
            </SettingsSection>

            {/* 30. إعدادات التدقيق والتقريب */}
            <SettingsSection
                icon={<AuditIcon />}
                title="التدقيق والتقريب"
                description="سجل تدقيق الرواتب وطريقة التقريب"
            >
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={settings.enablePayrollAuditTrail}
                                    onChange={(e) => handleChange('enablePayrollAuditTrail', e.target.checked)}
                                />
                            }
                            label="تفعيل سجل تدقيق الرواتب"
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={settings.enableSalaryRounding}
                                    onChange={(e) => handleChange('enableSalaryRounding', e.target.checked)}
                                />
                            }
                            label="تفعيل تقريب الراتب"
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            select
                            label="طريقة تقريب الراتب"
                            fullWidth
                            value={settings.salaryRoundingMethod}
                            onChange={(e) => handleChange('salaryRoundingMethod', e.target.value)}
                            disabled={!settings.enableSalaryRounding}
                            helperText={SALARY_ROUNDING_METHODS.find(o => o.value === settings.salaryRoundingMethod)?.desc}
                        >
                            {SALARY_ROUNDING_METHODS.map((opt) => (
                                <MenuItem key={opt.value} value={opt.value}>
                                    <Box>
                                        <Typography variant="body2">{opt.label}</Typography>
                                        <Typography variant="caption" color="text.secondary">{opt.desc}</Typography>
                                    </Box>
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                </Grid>
            </SettingsSection>

            {/* 31. إعدادات الميزانية ومراكز التكلفة */}
            <SettingsSection
                icon={<DepartmentBudgetIcon />}
                title="الميزانية ومراكز التكلفة"
                description="تتبع ميزانيات الأقسام ومراكز التكلفة"
            >
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={settings.enableDepartmentBudget}
                                    onChange={(e) => handleChange('enableDepartmentBudget', e.target.checked)}
                                />
                            }
                            label="تفعيل ميزانية القسم"
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={settings.enableCostCenterTracking}
                                    onChange={(e) => handleChange('enableCostCenterTracking', e.target.checked)}
                                />
                            }
                            label="تفعيل تتبع مركز التكلفة"
                        />
                    </Grid>
                </Grid>
            </SettingsSection>

            {/* 32. إعدادات تصدير الرواتب */}
            <SettingsSection
                icon={<ExportFormatIcon />}
                title="تصدير الرواتب"
                description="صيغة تصدير الرواتب الافتراضية"
            >
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <TextField
                            select
                            label="صيغة التصدير الافتراضية"
                            fullWidth
                            value={settings.defaultPayrollExportFormat}
                            onChange={(e) => handleChange('defaultPayrollExportFormat', e.target.value)}
                            helperText={PAYROLL_EXPORT_FORMATS.find(o => o.value === settings.defaultPayrollExportFormat)?.desc}
                        >
                            {PAYROLL_EXPORT_FORMATS.map((opt) => (
                                <MenuItem key={opt.value} value={opt.value}>
                                    <Box>
                                        <Typography variant="body2">{opt.label}</Typography>
                                        <Typography variant="caption" color="text.secondary">{opt.desc}</Typography>
                                    </Box>
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                </Grid>
            </SettingsSection>

            {/* 33. إعدادات الإجازة المرضية */}
            <SettingsSection
                icon={<WorkOffIcon />}
                title="إعدادات الإجازة المرضية"
                description="تحديد أيام الإجازة المرضية والخصومات حسب نظام العمل السعودي"
                defaultExpanded={false}
            >
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={settings.enableSickLeaveDeduction ?? true}
                                    onChange={(e) => handleChange('enableSickLeaveDeduction', e.target.checked)}
                                />
                            }
                            label="تفعيل خصم الإجازة المرضية"
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            label="أيام المرضى براتب كامل"
                            type="number"
                            fullWidth
                            value={settings.sickLeaveFullPayDays ?? 30}
                            onChange={(e) => handleChange('sickLeaveFullPayDays', parseInt(e.target.value))}
                            helperText="أول 30 يوم براتب كامل (100%)"
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            label="أيام المرضى براتب جزئي"
                            type="number"
                            fullWidth
                            value={settings.sickLeavePartialPayDays ?? 60}
                            onChange={(e) => handleChange('sickLeavePartialPayDays', parseInt(e.target.value))}
                            helperText="من يوم 31 إلى 90 براتب جزئي"
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            label="نسبة الراتب الجزئي (%)"
                            type="number"
                            fullWidth
                            value={settings.sickLeavePartialPayPercent ?? 75}
                            onChange={(e) => handleChange('sickLeavePartialPayPercent', parseFloat(e.target.value))}
                            helperText="75% = خصم 25% من الراتب"
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            label="أيام المرضى بدون راتب"
                            type="number"
                            fullWidth
                            value={settings.sickLeaveUnpaidDays ?? 30}
                            onChange={(e) => handleChange('sickLeaveUnpaidDays', parseInt(e.target.value))}
                            helperText="بعد 90 يوم = بدون راتب"
                        />
                    </Grid>
                </Grid>
            </SettingsSection>

            {/* 34. إعدادات ساعات العمل */}
            <SettingsSection
                icon={<AccessTimeIcon />}
                title="إعدادات ساعات العمل"
                description="تحديد ساعات وأيام العمل الأسبوعية"
                defaultExpanded={false}
            >
                <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                        <TextField
                            label="ساعات العمل اليومية"
                            type="number"
                            fullWidth
                            value={settings.dailyWorkingHours ?? 8}
                            onChange={(e) => handleChange('dailyWorkingHours', parseFloat(e.target.value))}
                            helperText="عدد ساعات العمل في اليوم"
                        />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <TextField
                            label="أيام العمل الأسبوعية"
                            type="number"
                            fullWidth
                            value={settings.weeklyWorkingDays ?? 5}
                            onChange={(e) => handleChange('weeklyWorkingDays', parseInt(e.target.value))}
                            helperText="عدد أيام العمل في الأسبوع"
                        />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <TextField
                            label="أيام العمل في الأسبوع"
                            type="number"
                            fullWidth
                            value={settings.workingDaysPerWeek ?? 5}
                            onChange={(e) => handleChange('workingDaysPerWeek', parseInt(e.target.value))}
                            helperText="للحسابات الشهرية"
                        />
                    </Grid>
                </Grid>
            </SettingsSection>

            {/* 35. إعدادات التأمينات التفصيلية */}
            <SettingsSection
                icon={<ReceiptIcon />}
                title="إعدادات التأمينات التفصيلية"
                description="تحديد البدلات الخاضعة للتأمينات"
                defaultExpanded={false}
            >
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={settings.includeHousingInGosi ?? true}
                                    onChange={(e) => handleChange('includeHousingInGosi', e.target.checked)}
                                />
                            }
                            label="تضمين بدل السكن في التأمينات"
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={settings.includeTransportInGosi ?? false}
                                    onChange={(e) => handleChange('includeTransportInGosi', e.target.checked)}
                                />
                            }
                            label="تضمين بدل المواصلات في التأمينات"
                        />
                    </Grid>
                </Grid>
            </SettingsSection>

            {/* 36. إعدادات الإجازات */}
            <SettingsSection
                icon={<BeachAccessIcon />}
                title="إعدادات الإجازات"
                description="الرصيد الافتراضي والترحيل والموافقة التلقائية"
                defaultExpanded={false}
            >
                <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                        <TextField
                            label="أيام الإجازة الافتراضية"
                            type="number"
                            fullWidth
                            value={settings.defaultLeaveDays ?? 21}
                            onChange={(e) => handleChange('defaultLeaveDays', parseInt(e.target.value))}
                            helperText="رصيد الإجازة السنوي للموظف الجديد"
                        />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <TextField
                            label="أيام ترحيل الإجازة"
                            type="number"
                            fullWidth
                            value={settings.leaveCarryOverDays ?? 5}
                            onChange={(e) => handleChange('leaveCarryOverDays', parseInt(e.target.value))}
                            helperText="الحد الأقصى للأيام المرحلة للسنة التالية"
                        />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={settings.probationLeaveEnabled ?? false}
                                    onChange={(e) => handleChange('probationLeaveEnabled', e.target.checked)}
                                />
                            }
                            label="إجازة فترة التجربة"
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={settings.autoApproveLeave ?? false}
                                    onChange={(e) => handleChange('autoApproveLeave', e.target.checked)}
                                />
                            }
                            label="موافقة تلقائية على الإجازات"
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={settings.enableOvertimeApproval ?? true}
                                    onChange={(e) => handleChange('enableOvertimeApproval', e.target.checked)}
                                />
                            }
                            label="تفعيل موافقة الساعات الإضافية"
                        />
                    </Grid>
                </Grid>
            </SettingsSection>

            {/* 37. إعدادات نهاية الخدمة التفصيلية */}
            <SettingsSection
                icon={<ReceiptIcon />}
                title="إعدادات نهاية الخدمة التفصيلية"
                description="معدلات حساب مكافأة نهاية الخدمة"
                defaultExpanded={false}
            >
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={settings.autoCalculateEos ?? true}
                                    onChange={(e) => handleChange('autoCalculateEos', e.target.checked)}
                                />
                            }
                            label="حساب نهاية الخدمة تلقائياً"
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            label="سنوات العتبة"
                            type="number"
                            fullWidth
                            value={settings.eosThresholdYears ?? 5}
                            onChange={(e) => handleChange('eosThresholdYears', parseInt(e.target.value))}
                            helperText="عدد السنوات قبل تغيير المعدل"
                        />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <TextField
                            label="معدل أول 5 سنوات"
                            type="number"
                            fullWidth
                            value={settings.eosFirstYearsRate ?? 0.5}
                            onChange={(e) => handleChange('eosFirstYearsRate', parseFloat(e.target.value))}
                            helperText="0.5 = نصف راتب لكل سنة"
                        />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <TextField
                            label="معدل بعد 5 سنوات"
                            type="number"
                            fullWidth
                            value={settings.eosLaterYearsRate ?? 1.0}
                            onChange={(e) => handleChange('eosLaterYearsRate', parseFloat(e.target.value))}
                            helperText="1.0 = راتب كامل لكل سنة"
                        />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <TextField
                            label="المعدل التعاقدي"
                            type="number"
                            fullWidth
                            value={settings.eosContractualRate ?? 1.0}
                            onChange={(e) => handleChange('eosContractualRate', parseFloat(e.target.value))}
                            helperText="للعقود الخاصة"
                        />
                    </Grid>
                </Grid>
            </SettingsSection>

            {/* 38. إعدادات العرض */}
            <SettingsSection
                icon={<ReceiptIcon />}
                title="إعدادات العرض"
                description="إعدادات عرض كشف الراتب والحسابات"
                defaultExpanded={false}
            >
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={settings.showSalaryBreakdown ?? true}
                                    onChange={(e) => handleChange('showSalaryBreakdown', e.target.checked)}
                                />
                            }
                            label="عرض تفصيل الراتب"
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={settings.showYtdTotals ?? true}
                                    onChange={(e) => handleChange('showYtdTotals', e.target.checked)}
                                />
                            }
                            label="عرض إجمالي السنة"
                        />
                    </Grid>
                </Grid>
            </SettingsSection>
        </Box >

    );
}
