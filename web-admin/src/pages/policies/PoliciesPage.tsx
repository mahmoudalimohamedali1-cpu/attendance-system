import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Box, Card, Typography, Grid, TextField, Button, MenuItem,
    CircularProgress, Chip, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, IconButton,
    Dialog, DialogTitle, DialogContent, DialogActions, Select, FormControl, InputLabel,
} from '@mui/material';
import { Add, Delete, Policy as PolicyIcon, ToggleOn } from '@mui/icons-material';
import { api } from '@/services/api.service';

interface PolicyRule {
    id: string;
    code: string;
    nameAr: string;
    valueType: string;
    value: string;
    order: number;
}

interface Policy {
    id: string;
    code: string;
    nameAr: string;
    nameEn?: string;
    description?: string;
    type: string;
    scope: string;
    effectiveFrom: string;
    effectiveTo?: string;
    isActive: boolean;
    priority: number;
    rules: PolicyRule[];
}

const policyTypes = [
    { value: 'OVERTIME', label: 'الوقت الإضافي' },
    { value: 'LEAVE', label: 'الإجازات' },
    { value: 'DEDUCTION', label: 'الاستقطاعات' },
    { value: 'ALLOWANCE', label: 'البدلات' },
    { value: 'ATTENDANCE', label: 'الحضور والانصراف' },
    { value: 'GENERAL', label: 'عامة' },
];

const policyScopes = [
    { value: 'COMPANY', label: 'الشركة' },
    { value: 'BRANCH', label: 'الفرع' },
    { value: 'DEPARTMENT', label: 'القسم' },
    { value: 'JOB_TITLE', label: 'الدرجة الوظيفية' },
    { value: 'EMPLOYEE', label: 'الموظف' },
];

export const PoliciesPage = () => {
    const queryClient = useQueryClient();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [formData, setFormData] = useState({
        code: '',
        nameAr: '',
        nameEn: '',
        description: '',
        type: 'OVERTIME',
        scope: 'COMPANY',
        effectiveFrom: new Date().toISOString().split('T')[0],
        effectiveTo: '',
        priority: 0,
    });

    const { data: policies = [], isLoading } = useQuery<Policy[]>({
        queryKey: ['policies'],
        queryFn: () => api.get('/policies') as Promise<Policy[]>,
    });

    const createMutation = useMutation({
        mutationFn: (data: typeof formData) => api.post('/policies', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['policies'] });
            setDialogOpen(false);
            resetForm();
        },
    });

    const toggleMutation = useMutation({
        mutationFn: (id: string) => api.patch(`/policies/${id}/toggle`, {}),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['policies'] }),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/policies/${id}`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['policies'] }),
    });

    const resetForm = () => {
        setFormData({
            code: '', nameAr: '', nameEn: '', description: '',
            type: 'OVERTIME', scope: 'COMPANY',
            effectiveFrom: new Date().toISOString().split('T')[0],
            effectiveTo: '', priority: 0,
        });
    };

    const getTypeLabel = (type: string) => policyTypes.find(t => t.value === type)?.label || type;
    const getScopeLabel = (scope: string) => policyScopes.find(s => s.value === scope)?.label || scope;

    if (isLoading) return <CircularProgress />;

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box>
                    <Typography variant="h4" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PolicyIcon color="primary" /> محرك السياسات
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        إدارة سياسات الشركة والقواعد التطبيقية
                    </Typography>
                </Box>
                <Button variant="contained" startIcon={<Add />} onClick={() => setDialogOpen(true)}>
                    سياسة جديدة
                </Button>
            </Box>

            <Card>
                <TableContainer>
                    <Table>
                        <TableHead sx={{ bgcolor: 'grey.50' }}>
                            <TableRow>
                                <TableCell>الكود</TableCell>
                                <TableCell>الاسم</TableCell>
                                <TableCell>النوع</TableCell>
                                <TableCell>النطاق</TableCell>
                                <TableCell>تاريخ البداية</TableCell>
                                <TableCell>الأولوية</TableCell>
                                <TableCell>القواعد</TableCell>
                                <TableCell>الحالة</TableCell>
                                <TableCell align="center">الإجراءات</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {policies.map((policy) => (
                                <TableRow key={policy.id} hover>
                                    <TableCell><code>{policy.code}</code></TableCell>
                                    <TableCell>{policy.nameAr}</TableCell>
                                    <TableCell><Chip label={getTypeLabel(policy.type)} size="small" /></TableCell>
                                    <TableCell><Chip label={getScopeLabel(policy.scope)} size="small" variant="outlined" /></TableCell>
                                    <TableCell>{new Date(policy.effectiveFrom).toLocaleDateString('ar-SA')}</TableCell>
                                    <TableCell>{policy.priority}</TableCell>
                                    <TableCell>{policy.rules?.length || 0} قاعدة</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={policy.isActive ? 'مفعّل' : 'معطّل'}
                                            color={policy.isActive ? 'success' : 'default'}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell align="center">
                                        <IconButton
                                            color={policy.isActive ? 'success' : 'default'}
                                            onClick={() => toggleMutation.mutate(policy.id)}
                                            title="تفعيل/تعطيل"
                                        >
                                            <ToggleOn />
                                        </IconButton>
                                        <IconButton
                                            color="error"
                                            onClick={() => {
                                                if (window.confirm('هل تريد حذف هذه السياسة؟')) {
                                                    deleteMutation.mutate(policy.id);
                                                }
                                            }}
                                            title="حذف"
                                        >
                                            <Delete />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {policies.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={9} align="center" sx={{ py: 8 }}>
                                        <Typography color="text.secondary">لا يوجد سياسات مسجلة</Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>

            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>إضافة سياسة جديدة</DialogTitle>
                <DialogContent dividers>
                    <Grid container spacing={2} sx={{ mt: 0 }}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth label="كود السياسة" required
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                placeholder="مثال: OT_POLICY_2024"
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth label="الاسم بالعربي" required
                                value={formData.nameAr}
                                onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth>
                                <InputLabel>نوع السياسة</InputLabel>
                                <Select
                                    value={formData.type}
                                    label="نوع السياسة"
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                >
                                    {policyTypes.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth>
                                <InputLabel>النطاق</InputLabel>
                                <Select
                                    value={formData.scope}
                                    label="النطاق"
                                    onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
                                >
                                    {policyScopes.map(s => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth type="date" label="تاريخ البداية" required
                                value={formData.effectiveFrom}
                                onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth type="date" label="تاريخ النهاية (اختياري)"
                                value={formData.effectiveTo}
                                onChange={(e) => setFormData({ ...formData, effectiveTo: e.target.value })}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth type="number" label="الأولوية"
                                value={formData.priority}
                                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                                helperText="الأعلى يُطبق أولاً"
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth label="الوصف" multiline rows={2}
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
                    <Button
                        variant="contained"
                        onClick={() => createMutation.mutate(formData)}
                        disabled={!formData.code || !formData.nameAr || createMutation.isPending}
                    >
                        حفظ
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default PoliciesPage;
