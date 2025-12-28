import { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem, Grid, Typography, Tabs, Tab, Alert } from '@mui/material';
import { Flight, Description, AttachMoney } from '@mui/icons-material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api.service';

interface RequestOnBehalfModalProps {
    open: boolean;
    onClose: () => void;
    employeeId: string;
    employeeName?: string;
}

export const RequestOnBehalfModal = ({ open, onClose, employeeId, employeeName = 'الموظف' }: RequestOnBehalfModalProps) => {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState(0);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [leaveData, setLeaveData] = useState({ type: 'ANNUAL', startDate: '', endDate: '', reason: '' });
    const [letterData, setLetterData] = useState({ type: 'SALARY_DEFINITION', notes: '' });
    const [advanceData, setAdvanceData] = useState({ amount: '', reason: '', repaymentMonths: '1' });

    const mutation = useMutation({
        mutationFn: (data: any) => api.post(`/employee-profile/${employeeId}/request-on-behalf`, data),
        onSuccess: () => {
            setSuccess(true);
            queryClient.invalidateQueries({ queryKey: ['employee-profile', employeeId] });
            setTimeout(() => { onClose(); setSuccess(false); }, 1500);
        },
        onError: (err: any) => setError(err?.response?.data?.message || 'حدث خطأ'),
    });

    const handleSubmit = () => {
        setError(null);
        if (activeTab === 0) {
            mutation.mutate({ requestType: 'LEAVE', leaveData });
        } else if (activeTab === 1) {
            mutation.mutate({ requestType: 'LETTER', letterData });
        } else {
            mutation.mutate({ requestType: 'ADVANCE', advanceData: { ...advanceData, amount: parseFloat(advanceData.amount), repaymentMonths: parseInt(advanceData.repaymentMonths) } });
        }
    };

    const leaveTypes = [
        { value: 'ANNUAL', label: 'إجازة سنوية' },
        { value: 'SICK', label: 'إجازة مرضية' },
        { value: 'PERSONAL', label: 'إجازة شخصية' },
        { value: 'EMERGENCY', label: 'إجازة طارئة' },
        { value: 'HAJJ', label: 'إجازة حج' },
        { value: 'MARRIAGE', label: 'إجازة زواج' },
    ];

    const letterTypes = [
        { value: 'SALARY_DEFINITION', label: 'تعريف راتب' },
        { value: 'SERVICE_CONFIRMATION', label: 'تأكيد خدمة' },
        { value: 'EXPERIENCE', label: 'شهادة خبرة' },
        { value: 'NOC', label: 'عدم ممانعة' },
    ];

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                <Typography variant="h6" fontWeight="bold">إضافة طلب بالنيابة عن</Typography>
                <Typography variant="body2" color="primary">{employeeName}</Typography>
            </DialogTitle>

            <DialogContent>
                {success && <Alert severity="success" sx={{ mb: 2 }}>تم إنشاء الطلب بنجاح!</Alert>}
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
                    <Tab icon={<Flight />} label="إجازة" iconPosition="start" />
                    <Tab icon={<Description />} label="خطاب" iconPosition="start" />
                    <Tab icon={<AttachMoney />} label="سلفة" iconPosition="start" />
                </Tabs>

                {activeTab === 0 && (
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <TextField select fullWidth label="نوع الإجازة" value={leaveData.type} onChange={(e) => setLeaveData({ ...leaveData, type: e.target.value })}>
                                {leaveTypes.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                            </TextField>
                        </Grid>
                        <Grid item xs={6}>
                            <TextField fullWidth type="date" label="من تاريخ" InputLabelProps={{ shrink: true }} value={leaveData.startDate} onChange={(e) => setLeaveData({ ...leaveData, startDate: e.target.value })} />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField fullWidth type="date" label="إلى تاريخ" InputLabelProps={{ shrink: true }} value={leaveData.endDate} onChange={(e) => setLeaveData({ ...leaveData, endDate: e.target.value })} />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField fullWidth multiline rows={3} label="سبب الإجازة" value={leaveData.reason} onChange={(e) => setLeaveData({ ...leaveData, reason: e.target.value })} />
                        </Grid>
                    </Grid>
                )}

                {activeTab === 1 && (
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <TextField select fullWidth label="نوع الخطاب" value={letterData.type} onChange={(e) => setLetterData({ ...letterData, type: e.target.value })}>
                                {letterTypes.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                            </TextField>
                        </Grid>
                        <Grid item xs={12}>
                            <TextField fullWidth multiline rows={3} label="ملاحظات (اختياري)" value={letterData.notes} onChange={(e) => setLetterData({ ...letterData, notes: e.target.value })} />
                        </Grid>
                    </Grid>
                )}

                {activeTab === 2 && (
                    <Grid container spacing={2}>
                        <Grid item xs={6}>
                            <TextField fullWidth type="number" label="المبلغ (ر.س)" value={advanceData.amount} onChange={(e) => setAdvanceData({ ...advanceData, amount: e.target.value })} />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField select fullWidth label="عدد أشهر السداد" value={advanceData.repaymentMonths} onChange={(e) => setAdvanceData({ ...advanceData, repaymentMonths: e.target.value })}>
                                {[1, 2, 3, 4, 5, 6, 12].map((m) => <MenuItem key={m} value={String(m)}>{m} شهر</MenuItem>)}
                            </TextField>
                        </Grid>
                        <Grid item xs={12}>
                            <TextField fullWidth multiline rows={3} label="سبب السلفة" value={advanceData.reason} onChange={(e) => setAdvanceData({ ...advanceData, reason: e.target.value })} />
                        </Grid>
                    </Grid>
                )}
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose}>إلغاء</Button>
                <Button variant="contained" onClick={handleSubmit} disabled={mutation.isPending}>
                    {mutation.isPending ? 'جاري الإرسال...' : 'إرسال الطلب'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default RequestOnBehalfModal;
