import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Box, Card, CardContent, Typography, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Paper, Chip, Button, Stack,
    CircularProgress, Alert, IconButton, Tooltip, Dialog, DialogTitle,
    DialogContent, DialogActions, Divider
} from '@mui/material';
import { Check, Close, Visibility, AttachMoney, Person } from '@mui/icons-material';
import { api } from '@/services/api.service';

// API functions
const fetchTerminations = async (status?: string) => {
    const params = status ? `?status=${status}` : '';
    return await api.get(`/eos/terminations${params}`);
};

const approveTermination = async (id: string) => {
    return await api.patch(`/eos/terminations/${id}/approve`);
};

const cancelTermination = async (id: string) => {
    return await api.patch(`/eos/terminations/${id}/cancel`);
};

// Format currency
const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ar-SA', {
        style: 'currency',
        currency: 'SAR',
        minimumFractionDigits: 2,
    }).format(value || 0);
};

// Format date
const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};

// Status chip
const StatusChip = ({ status }: { status: string }) => {
    const configs: Record<string, { label: string; color: 'warning' | 'success' | 'info' | 'error' | 'secondary' }> = {
        PENDING: { label: 'بانتظار موافقة HR', color: 'warning' },
        HR_APPROVED: { label: 'بانتظار المدير العام', color: 'info' },
        APPROVED: { label: 'تمت الموافقة النهائية', color: 'success' },
        PAID: { label: 'تم الصرف', color: 'success' },
        CANCELLED: { label: 'ملغى', color: 'error' },
    };
    const config = configs[status] || { label: status, color: 'warning' };
    return <Chip label={config.label} color={config.color as any} size="small" />;
};

// Reason labels
const REASON_LABELS: Record<string, string> = {
    RESIGNATION: 'استقالة',
    TERMINATION: 'إنهاء خدمات',
    END_OF_CONTRACT: 'انتهاء العقد',
    RETIREMENT: 'تقاعد',
    DEATH: 'وفاة',
};

const EosApprovalsPage: React.FC = () => {
    const queryClient = useQueryClient();
    const [selectedTermination, setSelectedTermination] = React.useState<any>(null);
    const [detailsOpen, setDetailsOpen] = React.useState(false);

    // Fetch terminations
    const { data: terminations = [], isLoading, error } = useQuery({
        queryKey: ['eos-terminations'],
        queryFn: async () => await fetchTerminations() as any[],
    });

    // Approve mutation
    const approveMutation = useMutation({
        mutationFn: approveTermination,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['eos-terminations'] });
            setDetailsOpen(false);
            alert('✅ تمت الموافقة بنجاح!');
        },
        onError: (err: any) => {
            alert(`❌ خطأ: ${err.response?.data?.message || err.message}`);
        }
    });

    // Cancel mutation
    const cancelMutation = useMutation({
        mutationFn: cancelTermination,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['eos-terminations'] });
            setDetailsOpen(false);
            alert('تم إلغاء الطلب');
        },
        onError: (err: any) => {
            alert(`❌ خطأ: ${err.response?.data?.message || err.message}`);
        }
    });

    const handleViewDetails = (termination: any) => {
        setSelectedTermination(termination);
        setDetailsOpen(true);
    };

    const handleApprove = (id: string) => {
        if (window.confirm('هل أنت متأكد من الموافقة على إنهاء الخدمات؟\n\nسيتم تغيير حالة الموظف إلى "منتهي الخدمة".')) {
            approveMutation.mutate(id);
        }
    };

    const handleCancel = (id: string) => {
        if (window.confirm('هل أنت متأكد من إلغاء طلب إنهاء الخدمات؟')) {
            cancelMutation.mutate(id);
        }
    };

    if (isLoading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return <Alert severity="error">حدث خطأ في تحميل البيانات</Alert>;
    }

    return (
        <Box p={3}>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
                <AttachMoney sx={{ verticalAlign: 'middle', mr: 1 }} />
                موافقات إنهاء الخدمات
            </Typography>
            <Typography color="text.secondary" mb={3}>
                إدارة طلبات إنهاء الخدمات والموافقة عليها
            </Typography>

            {terminations.length === 0 ? (
                <Alert severity="info">لا توجد طلبات حالياً</Alert>
            ) : (
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ bgcolor: 'primary.main' }}>
                                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>الموظف</TableCell>
                                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>سبب الإنهاء</TableCell>
                                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>آخر يوم عمل</TableCell>
                                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>صافي التسوية</TableCell>
                                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>الحالة</TableCell>
                                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>الإجراءات</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {terminations.map((t: any) => (
                                <TableRow key={t.id} hover>
                                    <TableCell>
                                        <Stack direction="row" alignItems="center" spacing={1}>
                                            <Person color="primary" />
                                            <Box>
                                                <Typography fontWeight="bold">
                                                    {t.employee?.firstName} {t.employee?.lastName}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {t.employee?.employeeNumber}
                                                </Typography>
                                            </Box>
                                        </Stack>
                                    </TableCell>
                                    <TableCell>{REASON_LABELS[t.reason] || t.reason}</TableCell>
                                    <TableCell>{formatDate(t.lastWorkingDay)}</TableCell>
                                    <TableCell>
                                        <Typography fontWeight="bold" color="primary">
                                            {formatCurrency(t.netSettlement)}
                                        </Typography>
                                    </TableCell>
                                    <TableCell><StatusChip status={t.status || (t.isConfirmed ? 'APPROVED' : 'PENDING')} /></TableCell>
                                    <TableCell>
                                        <Stack direction="row" spacing={1}>
                                            <Tooltip title="عرض التفاصيل">
                                                <IconButton size="small" onClick={() => handleViewDetails(t)}>
                                                    <Visibility />
                                                </IconButton>
                                            </Tooltip>
                                            {(!t.isConfirmed && t.status !== 'APPROVED') && (
                                                <>
                                                    <Tooltip title="الموافقة">
                                                        <IconButton
                                                            size="small"
                                                            color="success"
                                                            onClick={() => handleApprove(t.id)}
                                                            disabled={approveMutation.isPending}
                                                        >
                                                            <Check />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="إلغاء">
                                                        <IconButton
                                                            size="small"
                                                            color="error"
                                                            onClick={() => handleCancel(t.id)}
                                                            disabled={cancelMutation.isPending}
                                                        >
                                                            <Close />
                                                        </IconButton>
                                                    </Tooltip>
                                                </>
                                            )}
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Details Dialog */}
            <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    تفاصيل إنهاء الخدمات
                </DialogTitle>
                <DialogContent dividers>
                    {selectedTermination && (
                        <Stack spacing={2}>
                            <Box>
                                <Typography variant="subtitle2" color="text.secondary">الموظف</Typography>
                                <Typography fontWeight="bold">
                                    {selectedTermination.employee?.firstName} {selectedTermination.employee?.lastName}
                                </Typography>
                            </Box>
                            <Divider />
                            <Box display="flex" justifyContent="space-between">
                                <Box>
                                    <Typography variant="subtitle2" color="text.secondary">تاريخ التعيين</Typography>
                                    <Typography>{formatDate(selectedTermination.hireDate)}</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="subtitle2" color="text.secondary">آخر يوم عمل</Typography>
                                    <Typography>{formatDate(selectedTermination.lastWorkingDay)}</Typography>
                                </Box>
                            </Box>
                            <Divider />
                            <Box display="flex" justifyContent="space-between">
                                <Box>
                                    <Typography variant="subtitle2" color="text.secondary">مكافأة نهاية الخدمة</Typography>
                                    <Typography>{formatCurrency(selectedTermination.adjustedEos)}</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="subtitle2" color="text.secondary">تعويض الإجازات</Typography>
                                    <Typography>{formatCurrency(selectedTermination.leavePayout)}</Typography>
                                </Box>
                            </Box>
                            <Box display="flex" justifyContent="space-between">
                                <Box>
                                    <Typography variant="subtitle2" color="text.secondary">إجمالي الخصومات</Typography>
                                    <Typography color="error">{formatCurrency(selectedTermination.totalDeductions)}</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="subtitle2" color="text.secondary">صافي التسوية</Typography>
                                    <Typography fontWeight="bold" color="primary" variant="h6">
                                        {formatCurrency(selectedTermination.netSettlement)}
                                    </Typography>
                                </Box>
                            </Box>
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDetailsOpen(false)}>إغلاق</Button>
                    {selectedTermination && !selectedTermination.isConfirmed && (
                        <>
                            <Button
                                color="error"
                                onClick={() => handleCancel(selectedTermination.id)}
                                disabled={cancelMutation.isPending}
                            >
                                إلغاء الطلب
                            </Button>
                            <Button
                                variant="contained"
                                color="success"
                                onClick={() => handleApprove(selectedTermination.id)}
                                disabled={approveMutation.isPending}
                                startIcon={<Check />}
                            >
                                الموافقة
                            </Button>
                        </>
                    )}
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default EosApprovalsPage;
