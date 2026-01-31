import {
    Box,
    Typography,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    MenuItem,
    Select,
    FormControl,
    InputLabel,
    IconButton,
    Alert,
    Snackbar,
    CircularProgress,
    Chip,
} from '@mui/material';
import {
    TrendingUp,
    Add,
    Edit,
    Delete,
    WorkHistory,
    ArrowUpward,
    ArrowDownward,
    SwapHoriz,
    Work,
    AttachMoney,
    Close,
} from '@mui/icons-material';
import { useState } from 'react';
import { api } from '@/services/api.service';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import arSA from 'date-fns/locale/ar-SA';

// Design Theme Colors
const theme = {
    coral: '#E8A87C',
    teal: '#41B3A3',
    navy: '#2D3748',
    white: '#FFFFFF',
    yellow: '#F5C469',
    green: '#81C784',
    red: '#E57373',
    purple: '#9575CD',
    blue: '#64B5F6',
};

interface CareerProgressionTabProps {
    userId: string;
}

interface JobHistoryEntry {
    id: string;
    jobTitle: string;
    departmentName?: string;
    branchName?: string;
    changeType: 'HIRE' | 'PROMOTION' | 'DEMOTION' | 'TRANSFER' | 'TITLE_CHANGE' | 'SALARY_CHANGE';
    startDate: string;
    endDate?: string;
    salary?: number;
    notes?: string;
    reason?: string;
    department?: { id: string; name: string };
    branch?: { id: string; name: string };
    createdBy?: { firstName: string; lastName: string };
    createdAt: string;
}

interface JobHistoryFormData {
    jobTitle: string;
    departmentId: string;
    branchId: string;
    changeType: string;
    startDate: Date | null;
    endDate: Date | null;
    salary: string;
    notes: string;
    reason: string;
}

const initialFormData: JobHistoryFormData = {
    jobTitle: '',
    departmentId: '',
    branchId: '',
    changeType: 'HIRE',
    startDate: new Date(),
    endDate: null,
    salary: '',
    notes: '',
    reason: '',
};

const changeTypeLabels: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    HIRE: { label: 'تعيين جديد', icon: <Work />, color: theme.green },
    PROMOTION: { label: 'ترقية', icon: <ArrowUpward />, color: theme.teal },
    DEMOTION: { label: 'تخفيض', icon: <ArrowDownward />, color: theme.red },
    TRANSFER: { label: 'نقل', icon: <SwapHoriz />, color: theme.blue },
    TITLE_CHANGE: { label: 'تغيير مسمى', icon: <WorkHistory />, color: theme.purple },
    SALARY_CHANGE: { label: 'تغيير راتب', icon: <AttachMoney />, color: theme.yellow },
};

export const CareerProgressionTab = ({ userId }: CareerProgressionTabProps) => {
    const queryClient = useQueryClient();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState<JobHistoryEntry | null>(null);
    const [formData, setFormData] = useState<JobHistoryFormData>(initialFormData);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success',
    });

    // Fetch job history
    const { data: jobHistory, isLoading } = useQuery<JobHistoryEntry[]>({
        queryKey: ['job-history', userId],
        queryFn: () => api.get(`/employee-profile/${userId}/job-history`),
        enabled: !!userId,
    });

    // Fetch departments and branches for dropdowns
    const { data: departments } = useQuery<any[]>({
        queryKey: ['departments'],
        queryFn: () => api.get('/departments'),
    });

    const { data: branches } = useQuery<any[]>({
        queryKey: ['branches'],
        queryFn: () => api.get('/branches'),
    });

    // Add mutation
    const addMutation = useMutation({
        mutationFn: async (data: any) => {
            return api.post(`/employee-profile/${userId}/job-history`, data);
        },
        onSuccess: () => {
            setSnackbar({ open: true, message: 'تم إضافة السجل بنجاح', severity: 'success' });
            queryClient.invalidateQueries({ queryKey: ['job-history', userId] });
            handleCloseDialog();
        },
        onError: (err: any) => {
            setSnackbar({
                open: true,
                message: err?.response?.data?.message || 'فشل إضافة السجل',
                severity: 'error',
            });
        },
    });

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: async ({ entryId, data }: { entryId: string; data: any }) => {
            return api.patch(`/employee-profile/${userId}/job-history/${entryId}`, data);
        },
        onSuccess: () => {
            setSnackbar({ open: true, message: 'تم تحديث السجل بنجاح', severity: 'success' });
            queryClient.invalidateQueries({ queryKey: ['job-history', userId] });
            handleCloseDialog();
        },
        onError: (err: any) => {
            setSnackbar({
                open: true,
                message: err?.response?.data?.message || 'فشل تحديث السجل',
                severity: 'error',
            });
        },
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: (entryId: string) => api.delete(`/employee-profile/${userId}/job-history/${entryId}`),
        onSuccess: () => {
            setSnackbar({ open: true, message: 'تم حذف السجل بنجاح', severity: 'success' });
            queryClient.invalidateQueries({ queryKey: ['job-history', userId] });
            setDeleteConfirmOpen(false);
            setDeletingId(null);
        },
        onError: (err: any) => {
            setSnackbar({
                open: true,
                message: err?.response?.data?.message || 'فشل حذف السجل',
                severity: 'error',
            });
        },
    });

    const handleOpenDialog = (entry?: JobHistoryEntry) => {
        if (entry) {
            setEditingEntry(entry);
            setFormData({
                jobTitle: entry.jobTitle,
                departmentId: entry.department?.id || '',
                branchId: entry.branch?.id || '',
                changeType: entry.changeType,
                startDate: new Date(entry.startDate),
                endDate: entry.endDate ? new Date(entry.endDate) : null,
                salary: entry.salary?.toString() || '',
                notes: entry.notes || '',
                reason: entry.reason || '',
            });
        } else {
            setEditingEntry(null);
            setFormData(initialFormData);
        }
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setEditingEntry(null);
        setFormData(initialFormData);
    };

    const handleSubmit = () => {
        const submitData = {
            jobTitle: formData.jobTitle,
            departmentId: formData.departmentId || undefined,
            branchId: formData.branchId || undefined,
            changeType: formData.changeType,
            startDate: formData.startDate?.toISOString(),
            endDate: formData.endDate?.toISOString() || undefined,
            salary: formData.salary ? parseFloat(formData.salary) : undefined,
            notes: formData.notes || undefined,
            reason: formData.reason || undefined,
        };

        if (editingEntry) {
            updateMutation.mutate({ entryId: editingEntry.id, data: submitData });
        } else {
            addMutation.mutate(submitData);
        }
    };

    const handleDeleteClick = (id: string) => {
        setDeletingId(id);
        setDeleteConfirmOpen(true);
    };

    const handleDeleteConfirm = () => {
        if (deletingId) {
            deleteMutation.mutate(deletingId);
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const entries = jobHistory || [];

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress sx={{ color: theme.coral }} />
            </Box>
        );
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" fontWeight="bold" color={theme.navy}>
                    التدرج الوظيفي ({entries.length})
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => handleOpenDialog()}
                    sx={{ bgcolor: theme.teal, borderRadius: 3, '&:hover': { bgcolor: theme.coral } }}
                >
                    إضافة سجل
                </Button>
            </Box>

            {/* Timeline */}
            {entries.length > 0 ? (
                <Box sx={{ position: 'relative', pr: 4 }}>
                    {/* Timeline line */}
                    <Box
                        sx={{
                            position: 'absolute',
                            right: 14,
                            top: 0,
                            bottom: 0,
                            width: 3,
                            bgcolor: `${theme.teal}30`,
                            borderRadius: 2,
                        }}
                    />

                    {entries.map((entry, index) => {
                        const typeInfo = changeTypeLabels[entry.changeType] || changeTypeLabels.HIRE;
                        const isLatest = index === 0;

                        return (
                            <Box
                                key={entry.id}
                                sx={{
                                    position: 'relative',
                                    mb: 3,
                                    pr: 5,
                                }}
                            >
                                {/* Timeline dot */}
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        right: 0,
                                        top: 20,
                                        width: 30,
                                        height: 30,
                                        borderRadius: '50%',
                                        bgcolor: isLatest ? typeInfo.color : theme.white,
                                        border: `3px solid ${typeInfo.color}`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        zIndex: 1,
                                    }}
                                >
                                    {React.cloneElement(typeInfo.icon as React.ReactElement, {
                                        sx: { fontSize: 16, color: isLatest ? theme.white : typeInfo.color },
                                    })}
                                </Box>

                                {/* Card */}
                                <Box
                                    sx={{
                                        bgcolor: theme.white,
                                        borderRadius: 4,
                                        p: 3,
                                        boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
                                        borderRight: `4px solid ${typeInfo.color}`,
                                        transition: 'transform 0.2s, box-shadow 0.2s',
                                        '&:hover': {
                                            transform: 'translateX(-4px)',
                                            boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
                                        },
                                    }}
                                >
                                    {/* Header */}
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                        <Box>
                                            <Typography variant="h6" fontWeight="bold" color={theme.navy}>
                                                {entry.jobTitle}
                                            </Typography>
                                            <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                                                <Chip
                                                    label={typeInfo.label}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: typeInfo.color,
                                                        color: theme.white,
                                                        fontWeight: 600,
                                                    }}
                                                />
                                                {isLatest && !entry.endDate && (
                                                    <Chip
                                                        label="المنصب الحالي"
                                                        size="small"
                                                        sx={{
                                                            bgcolor: theme.green,
                                                            color: theme.white,
                                                            fontWeight: 600,
                                                        }}
                                                    />
                                                )}
                                            </Box>
                                        </Box>

                                        {/* Actions */}
                                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                                            <IconButton
                                                size="small"
                                                onClick={() => handleOpenDialog(entry)}
                                                sx={{ color: theme.teal }}
                                            >
                                                <Edit fontSize="small" />
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                color="error"
                                                onClick={() => handleDeleteClick(entry.id)}
                                            >
                                                <Delete fontSize="small" />
                                            </IconButton>
                                        </Box>
                                    </Box>

                                    {/* Details */}
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                                        {/* Department & Branch */}
                                        {(entry.departmentName || entry.department?.name) && (
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">
                                                    القسم
                                                </Typography>
                                                <Typography variant="body2" fontWeight={500}>
                                                    {entry.departmentName || entry.department?.name}
                                                </Typography>
                                            </Box>
                                        )}
                                        {(entry.branchName || entry.branch?.name) && (
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">
                                                    الفرع
                                                </Typography>
                                                <Typography variant="body2" fontWeight={500}>
                                                    {entry.branchName || entry.branch?.name}
                                                </Typography>
                                            </Box>
                                        )}

                                        {/* Dates */}
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">
                                                الفترة
                                            </Typography>
                                            <Typography variant="body2" fontWeight={500}>
                                                {formatDate(entry.startDate)}
                                                {entry.endDate ? ` - ${formatDate(entry.endDate)}` : ' - الآن'}
                                            </Typography>
                                        </Box>

                                        {/* Salary */}
                                        {entry.salary && (
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">
                                                    الراتب
                                                </Typography>
                                                <Typography variant="body2" fontWeight={500} color={theme.green}>
                                                    {entry.salary.toLocaleString('ar-SA')} ر.س
                                                </Typography>
                                            </Box>
                                        )}
                                    </Box>

                                    {/* Reason & Notes */}
                                    {entry.reason && (
                                        <Box sx={{ mt: 2 }}>
                                            <Typography variant="caption" color="text.secondary">
                                                سبب التغيير
                                            </Typography>
                                            <Typography variant="body2">{entry.reason}</Typography>
                                        </Box>
                                    )}
                                    {entry.notes && (
                                        <Box sx={{ mt: 1 }}>
                                            <Typography variant="caption" color="text.secondary">
                                                ملاحظات
                                            </Typography>
                                            <Typography variant="body2" fontStyle="italic" color="text.secondary">
                                                {entry.notes}
                                            </Typography>
                                        </Box>
                                    )}
                                </Box>
                            </Box>
                        );
                    })}
                </Box>
            ) : (
                <Box sx={{ bgcolor: theme.white, borderRadius: 4, p: 6, textAlign: 'center' }}>
                    <TrendingUp sx={{ fontSize: 60, color: theme.coral, mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">
                        لا يوجد سجل تدرج وظيفي
                    </Typography>
                    <Button
                        variant="outlined"
                        startIcon={<Add />}
                        onClick={() => handleOpenDialog()}
                        sx={{ mt: 2, borderColor: theme.teal, color: theme.teal }}
                    >
                        إضافة أول سجل
                    </Button>
                </Box>
            )}

            {/* Add/Edit Dialog */}
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={arSA}>
                <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                    <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {editingEntry ? 'تعديل السجل' : 'إضافة سجل جديد'}
                        <IconButton onClick={handleCloseDialog} size="small">
                            <Close />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                            <TextField
                                label="المسمى الوظيفي"
                                fullWidth
                                required
                                value={formData.jobTitle}
                                onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                            />

                            <FormControl fullWidth>
                                <InputLabel>نوع التغيير</InputLabel>
                                <Select
                                    label="نوع التغيير"
                                    value={formData.changeType}
                                    onChange={(e) => setFormData({ ...formData, changeType: e.target.value })}
                                >
                                    {Object.entries(changeTypeLabels).map(([key, { label }]) => (
                                        <MenuItem key={key} value={key}>
                                            {label}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <FormControl fullWidth>
                                <InputLabel>القسم</InputLabel>
                                <Select
                                    label="القسم"
                                    value={formData.departmentId}
                                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                                >
                                    <MenuItem value="">-</MenuItem>
                                    {(departments || []).map((dept: any) => (
                                        <MenuItem key={dept.id} value={dept.id}>
                                            {dept.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <FormControl fullWidth>
                                <InputLabel>الفرع</InputLabel>
                                <Select
                                    label="الفرع"
                                    value={formData.branchId}
                                    onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                                >
                                    <MenuItem value="">-</MenuItem>
                                    {(branches || []).map((branch: any) => (
                                        <MenuItem key={branch.id} value={branch.id}>
                                            {branch.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <DatePicker
                                label="تاريخ البداية"
                                value={formData.startDate}
                                onChange={(date) => setFormData({ ...formData, startDate: date })}
                                slotProps={{ textField: { fullWidth: true } }}
                            />

                            <DatePicker
                                label="تاريخ النهاية (اختياري)"
                                value={formData.endDate}
                                onChange={(date) => setFormData({ ...formData, endDate: date })}
                                slotProps={{ textField: { fullWidth: true } }}
                            />

                            <TextField
                                label="الراتب (اختياري)"
                                type="number"
                                fullWidth
                                value={formData.salary}
                                onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                                InputProps={{ endAdornment: 'ر.س' }}
                            />

                            <TextField
                                label="سبب التغيير"
                                fullWidth
                                value={formData.reason}
                                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                            />

                            <TextField
                                label="ملاحظات"
                                fullWidth
                                multiline
                                rows={2}
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            />
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseDialog}>إلغاء</Button>
                        <Button
                            variant="contained"
                            sx={{ bgcolor: theme.teal }}
                            onClick={handleSubmit}
                            disabled={addMutation.isPending || updateMutation.isPending || !formData.jobTitle}
                        >
                            {addMutation.isPending || updateMutation.isPending
                                ? 'جاري الحفظ...'
                                : editingEntry
                                    ? 'حفظ التعديلات'
                                    : 'إضافة'}
                        </Button>
                    </DialogActions>
                </Dialog>
            </LocalizationProvider>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
                <DialogTitle>تأكيد الحذف</DialogTitle>
                <DialogContent>
                    <Typography>هل أنت متأكد من حذف هذا السجل؟</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteConfirmOpen(false)}>إلغاء</Button>
                    <Button
                        color="error"
                        variant="contained"
                        onClick={handleDeleteConfirm}
                        disabled={deleteMutation.isPending}
                    >
                        {deleteMutation.isPending ? 'جاري الحذف...' : 'حذف'}
                    </Button>
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
                    variant="filled"
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default CareerProgressionTab;
