import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    FormControl,
    FormLabel,
    RadioGroup,
    FormControlLabel,
    Radio,
    Box,
    Typography,
    Alert,
    Collapse,
    CircularProgress,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ar } from 'date-fns/locale';
import { disciplinaryService } from '@/services/disciplinary.service';

interface HRReviewDialogProps {
    open: boolean;
    onClose: () => void;
    caseId: string;
    caseCode: string;
    employeeName: string;
    onSuccess?: () => void;
}

type ReviewAction = 'REJECT' | 'INFORMAL_NOTICE' | 'INFORMAL_WARNING' | 'APPROVE_OFFICIAL';

const ACTION_LABELS: Record<ReviewAction, { label: string; description: string; color: string }> = {
    REJECT: {
        label: 'رفض الطلب',
        description: 'رفض الطلب وإغلاق القضية نهائياً',
        color: '#f44336',
    },
    INFORMAL_NOTICE: {
        label: 'لفت نظر',
        description: 'إصدار لفت نظر غير رسمي للموظف',
        color: '#ff9800',
    },
    INFORMAL_WARNING: {
        label: 'إنذار شفهي',
        description: 'إصدار إنذار شفهي غير رسمي للموظف',
        color: '#ff5722',
    },
    APPROVE_OFFICIAL: {
        label: 'فتح تحقيق رسمي',
        description: 'الموافقة على فتح تحقيق رسمي وتحديد موعد الجلسة',
        color: '#4caf50',
    },
};

export const HRReviewDialog = ({
    open,
    onClose,
    caseId,
    caseCode,
    employeeName,
    onSuccess,
}: HRReviewDialogProps) => {
    const queryClient = useQueryClient();
    const [action, setAction] = useState<ReviewAction | null>(null);
    const [reason, setReason] = useState('');
    const [hearingDatetime, setHearingDatetime] = useState<Date | null>(null);
    const [hearingLocation, setHearingLocation] = useState('');
    const [error, setError] = useState<string | null>(null);

    const mutation = useMutation({
        mutationFn: () => disciplinaryService.hrReview(caseId, {
            action: action!,
            reason,
            hearingDatetime: hearingDatetime?.toISOString(),
            hearingLocation,
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['disciplinary-cases'] });
            queryClient.invalidateQueries({ queryKey: ['disciplinary-case', caseId] });
            onSuccess?.();
            handleClose();
        },
        onError: (err: any) => {
            setError(err?.response?.data?.message || 'حدث خطأ أثناء المراجعة');
        },
    });

    const handleClose = () => {
        setAction(null);
        setReason('');
        setHearingDatetime(null);
        setHearingLocation('');
        setError(null);
        onClose();
    };

    const handleSubmit = () => {
        if (!action) {
            setError('يرجى اختيار إجراء');
            return;
        }
        if (!reason.trim()) {
            setError('يرجى إدخال السبب أو الملاحظات');
            return;
        }
        if (action === 'APPROVE_OFFICIAL' && !hearingDatetime) {
            setError('يرجى تحديد موعد الجلسة');
            return;
        }
        mutation.mutate();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="h6">مراجعة HR الأولية</Typography>
                <Typography variant="body2" color="text.secondary">
                    القضية: {caseCode} | الموظف: {employeeName}
                </Typography>
            </DialogTitle>

            <DialogContent sx={{ pt: 3 }}>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                <FormControl component="fieldset" fullWidth>
                    <FormLabel component="legend" sx={{ mb: 2, fontWeight: 'bold' }}>
                        اختر الإجراء المناسب
                    </FormLabel>
                    <RadioGroup
                        value={action || ''}
                        onChange={(e) => setAction(e.target.value as ReviewAction)}
                    >
                        {(Object.entries(ACTION_LABELS) as [ReviewAction, typeof ACTION_LABELS[ReviewAction]][]).map(
                            ([key, config]) => (
                                <Box
                                    key={key}
                                    sx={{
                                        mb: 1,
                                        p: 2,
                                        border: 1,
                                        borderColor: action === key ? config.color : 'divider',
                                        borderRadius: 2,
                                        bgcolor: action === key ? `${config.color}10` : 'transparent',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                    }}
                                    onClick={() => setAction(key)}
                                >
                                    <FormControlLabel
                                        value={key}
                                        control={<Radio />}
                                        label={
                                            <Box>
                                                <Typography fontWeight="bold">{config.label}</Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    {config.description}
                                                </Typography>
                                            </Box>
                                        }
                                        sx={{ m: 0, width: '100%' }}
                                    />
                                </Box>
                            )
                        )}
                    </RadioGroup>
                </FormControl>

                <TextField
                    label="السبب / الملاحظات *"
                    multiline
                    rows={3}
                    fullWidth
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    sx={{ mt: 3 }}
                    placeholder="أدخل سبب القرار أو أي ملاحظات إضافية..."
                />

                {/* Hearing Details for Official Investigation */}
                <Collapse in={action === 'APPROVE_OFFICIAL'}>
                    <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                        <Typography variant="subtitle2" color="primary" gutterBottom>
                            تفاصيل جلسة التحقيق
                        </Typography>
                        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ar}>
                            <DateTimePicker
                                label="موعد الجلسة *"
                                value={hearingDatetime}
                                onChange={(newValue: any) => setHearingDatetime(newValue ? new Date(newValue) : null)}
                                slotProps={{
                                    textField: {
                                        fullWidth: true,
                                        sx: { mb: 2 },
                                    },
                                }}
                                minDateTime={new Date()}
                            />
                        </LocalizationProvider>
                        <TextField
                            label="مكان الجلسة"
                            fullWidth
                            value={hearingLocation}
                            onChange={(e) => setHearingLocation(e.target.value)}
                            placeholder="مثال: قاعة الاجتماعات الرئيسية"
                        />
                    </Box>
                </Collapse>
            </DialogContent>

            <DialogActions sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                <Button onClick={handleClose} disabled={mutation.isPending}>
                    إلغاء
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={mutation.isPending || !action}
                    color={action === 'REJECT' ? 'error' : action === 'APPROVE_OFFICIAL' ? 'success' : 'warning'}
                >
                    {mutation.isPending ? <CircularProgress size={24} /> : 'تأكيد الإجراء'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
