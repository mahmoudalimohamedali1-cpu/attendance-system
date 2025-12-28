import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Grid,
    Alert,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Typography,
    Box,
    Divider,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { arSA } from 'date-fns/locale';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { disciplinaryService } from '@/services/disciplinary.service';

const DECISION_TYPES = [
    { value: 'NO_VIOLATION', label: 'لا يوجد مخالفة', requiresPenalty: false },
    { value: 'NOTICE', label: 'لفت نظر', requiresPenalty: false },
    { value: 'WARNING', label: 'إنذار تحذيري', requiresPenalty: false },
    { value: 'FIRST_WARNING', label: 'إنذار أول', requiresPenalty: false },
    { value: 'SECOND_WARNING', label: 'إنذار ثاني', requiresPenalty: false },
    { value: 'FINAL_WARNING_TERMINATION', label: 'إنذار نهائي بالفصل', requiresPenalty: false, requiresPriorWarnings: true },
    { value: 'FINAL_TERMINATION_ART80', label: 'فصل نهائي وفق المادة 80', requiresPenalty: false },
    { value: 'PROMOTION_DELAY', label: 'تأخير ترقية', requiresPenalty: false },
    { value: 'SALARY_DEDUCTION', label: 'خصم من الراتب', requiresPenalty: true },
    { value: 'SUSPENSION_WITH_PAY', label: 'إيقاف مؤقت بأجر', requiresPenalty: false },
    { value: 'SUSPENSION_WITHOUT_PAY', label: 'إيقاف مؤقت بدون أجر (3-5 أيام)', requiresPenalty: true, daysRange: [3, 5] },
];

const PENALTY_UNITS = [
    { value: 'DAYS', label: 'أيام' },
    { value: 'HOURS', label: 'ساعات' },
    { value: 'AMOUNT', label: 'مبلغ ثابت (ريال)' },
];

interface IssueDecisionDialogProps {
    open: boolean;
    onClose: () => void;
    caseId: string;
    employeePriorWarnings?: number;
    payrollPeriods?: { id: string; name: string; status: string }[];
}

export const IssueDecisionDialog = ({
    open,
    onClose,
    caseId,
    employeePriorWarnings = 0,
    payrollPeriods = []
}: IssueDecisionDialogProps) => {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        decisionType: '',
        decisionReason: '',
        penaltyUnit: 'DAYS',
        penaltyValue: '',
        penaltyEffectiveDate: null as Date | null,
        payrollPeriodId: '',
    });
    const [error, setError] = useState<string | null>(null);

    const selectedDecision = DECISION_TYPES.find(d => d.value === formData.decisionType);
    const requiresPenalty = selectedDecision?.requiresPenalty || false;
    const requiresPriorWarnings = selectedDecision?.requiresPriorWarnings || false;
    const daysRange = selectedDecision?.daysRange;

    // Validation
    useEffect(() => {
        if (requiresPriorWarnings && employeePriorWarnings < 2) {
            setError('لا يمكن اختيار إنذار نهائي بالفصل بدون وجود إنذارين سابقين للموظف');
        } else {
            setError(null);
        }
    }, [formData.decisionType, employeePriorWarnings, requiresPriorWarnings]);

    const mutation = useMutation({
        mutationFn: (data: any) => disciplinaryService.issueDecision(caseId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['disciplinary-case', caseId] });
            queryClient.invalidateQueries({ queryKey: ['disciplinary-inbox'] });
            onClose();
        },
        onError: (err: any) => {
            setError(err.response?.data?.message || 'حدث خطأ أثناء إصدار القرار');
        },
    });

    const handleSubmit = () => {
        if (!formData.decisionType || !formData.decisionReason) {
            setError('الرجاء ملء جميع الحقول المطلوبة');
            return;
        }

        if (requiresPenalty) {
            if (!formData.penaltyValue || !formData.payrollPeriodId) {
                setError('الرجاء تحديد قيمة الجزاء ودورة الراتب');
                return;
            }

            const value = parseFloat(formData.penaltyValue);
            if (daysRange && (value < daysRange[0] || value > daysRange[1])) {
                setError(`عدد الأيام يجب أن يكون بين ${daysRange[0]} و ${daysRange[1]}`);
                return;
            }
        }

        if (requiresPriorWarnings && employeePriorWarnings < 2) {
            setError('لا يمكن اختيار إنذار نهائي بالفصل بدون وجود إنذارين سابقين');
            return;
        }

        mutation.mutate({
            decisionType: formData.decisionType,
            decisionReason: formData.decisionReason,
            penaltyUnit: requiresPenalty ? formData.penaltyUnit : undefined,
            penaltyValue: requiresPenalty ? parseFloat(formData.penaltyValue) : undefined,
            penaltyEffectiveDate: formData.penaltyEffectiveDate?.toISOString(),
            payrollPeriodId: requiresPenalty ? formData.payrollPeriodId : undefined,
        });
    };

    const openPayrollPeriods = payrollPeriods.filter(p => p.status !== 'LOCKED');

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="h6" fontWeight="bold">إصدار قرار التحقيق</Typography>
            </DialogTitle>
            <DialogContent sx={{ pt: 3 }}>
                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={arSA}>
                    <Grid container spacing={3}>
                        {error && (
                            <Grid item xs={12}>
                                <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>
                            </Grid>
                        )}

                        <Grid item xs={12}>
                            <FormControl fullWidth required>
                                <InputLabel>نوع القرار / العقوبة</InputLabel>
                                <Select
                                    value={formData.decisionType}
                                    onChange={(e) => setFormData({ ...formData, decisionType: e.target.value })}
                                    label="نوع القرار / العقوبة"
                                >
                                    {DECISION_TYPES.map((type) => (
                                        <MenuItem
                                            key={type.value}
                                            value={type.value}
                                            disabled={type.requiresPriorWarnings && employeePriorWarnings < 2}
                                        >
                                            {type.label}
                                            {type.requiresPriorWarnings && employeePriorWarnings < 2 && ' (يتطلب إنذارين سابقين)'}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                required
                                label="أسباب القرار / التسبيب"
                                value={formData.decisionReason}
                                onChange={(e) => setFormData({ ...formData, decisionReason: e.target.value })}
                                multiline
                                rows={3}
                            />
                        </Grid>

                        {requiresPenalty && (
                            <>
                                <Grid item xs={12}>
                                    <Divider>
                                        <Typography variant="subtitle2" color="text.secondary">
                                            تفاصيل الجزاء المالي
                                        </Typography>
                                    </Divider>
                                </Grid>

                                <Grid item xs={12} md={4}>
                                    <FormControl fullWidth required>
                                        <InputLabel>وحدة الخصم</InputLabel>
                                        <Select
                                            value={formData.penaltyUnit}
                                            onChange={(e) => setFormData({ ...formData, penaltyUnit: e.target.value })}
                                            label="وحدة الخصم"
                                            disabled={!!daysRange}
                                        >
                                            {PENALTY_UNITS.map((unit) => (
                                                <MenuItem key={unit.value} value={unit.value}>
                                                    {unit.label}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>

                                <Grid item xs={12} md={4}>
                                    <TextField
                                        fullWidth
                                        required
                                        type="number"
                                        label={daysRange ? `عدد الأيام (${daysRange[0]}-${daysRange[1]})` : 'القيمة'}
                                        value={formData.penaltyValue}
                                        onChange={(e) => setFormData({ ...formData, penaltyValue: e.target.value })}
                                        inputProps={{
                                            min: daysRange?.[0] || 0,
                                            max: daysRange?.[1] || undefined,
                                        }}
                                    />
                                </Grid>

                                <Grid item xs={12} md={4}>
                                    <DatePicker
                                        label="تاريخ سريان الجزاء"
                                        value={formData.penaltyEffectiveDate}
                                        onChange={(date: any) => setFormData({ ...formData, penaltyEffectiveDate: date ? new Date(date) : null })}
                                        slotProps={{
                                            textField: { fullWidth: true },
                                        }}
                                    />
                                </Grid>

                                <Grid item xs={12}>
                                    <FormControl fullWidth required>
                                        <InputLabel>دورة الراتب للخصم</InputLabel>
                                        <Select
                                            value={formData.payrollPeriodId}
                                            onChange={(e) => setFormData({ ...formData, payrollPeriodId: e.target.value })}
                                            label="دورة الراتب للخصم"
                                        >
                                            {openPayrollPeriods.length === 0 && (
                                                <MenuItem disabled>لا توجد دورات راتب مفتوحة</MenuItem>
                                            )}
                                            {openPayrollPeriods.map((period) => (
                                                <MenuItem key={period.id} value={period.id}>
                                                    {period.name}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                    {openPayrollPeriods.length === 0 && (
                                        <Alert severity="warning" sx={{ mt: 1 }}>
                                            لا توجد دورات راتب مفتوحة. يجب فتح دورة جديدة أو إلغاء قفل دورة موجودة.
                                        </Alert>
                                    )}
                                </Grid>
                            </>
                        )}

                        <Grid item xs={12}>
                            <Box sx={{ p: 2, bgcolor: 'warning.lighter', borderRadius: 2, border: '1px solid', borderColor: 'warning.light' }}>
                                <Typography variant="subtitle2" color="warning.dark" gutterBottom>
                                    ⚠️ تنبيه مهم
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    بعد إصدار القرار، سيتم إبلاغ الموظف وستبدأ فترة الاعتراض (15 يوم افتراضياً).
                                    عند الاعتماد النهائي، سيتم ترحيل الجزاء المالي (إن وجد) إلى كشف الراتب.
                                </Typography>
                            </Box>
                        </Grid>
                    </Grid>
                </LocalizationProvider>
            </DialogContent>
            <DialogActions sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                <Button onClick={onClose} disabled={mutation.isPending}>إلغاء</Button>
                <Button
                    variant="contained"
                    color="secondary"
                    onClick={handleSubmit}
                    disabled={mutation.isPending || (requiresPriorWarnings && employeePriorWarnings < 2)}
                >
                    {mutation.isPending ? 'جاري الإرسال...' : 'إصدار القرار'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
