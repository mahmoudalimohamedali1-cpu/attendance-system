import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Box, Card, Typography, Grid, TextField, Button, MenuItem,
    CircularProgress, Chip, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, IconButton,
    Dialog, DialogTitle, DialogContent, DialogActions, Select, FormControl, InputLabel,
    Switch, FormControlLabel, Alert,
} from '@mui/material';
import { Add, Delete, Policy as PolicyIcon, ToggleOn, Rule } from '@mui/icons-material';
import { api } from '@/services/api.service';

interface SalaryComponent {
    id: string;
    code: string;
    nameAr: string;
    type: string;
}

interface PolicyRule {
    id: string;
    code: string;
    nameAr: string;
    valueType: string;
    value: string;
    order: number;
    isActive: boolean;
    outputComponentId?: string;
    outputSign?: string;
    outputComponent?: SalaryComponent;
    conditions?: Record<string, unknown>;
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

const valueTypes = [
    { value: 'PERCENTAGE', label: 'نسبة مئوية' },
    { value: 'FIXED', label: 'مبلغ ثابت' },
    { value: 'FORMULA', label: 'معادلة' },
];

const outputSigns = [
    { value: 'EARNING', label: 'استحقاق (إضافة)' },
    { value: 'DEDUCTION', label: 'خصم (استقطاع)' },
];

export const PoliciesPage = () => {
    const queryClient = useQueryClient();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [rulesDialogOpen, setRulesDialogOpen] = useState(false);
    const [ruleFormOpen, setRuleFormOpen] = useState(false);
    const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
    const [editingRule, setEditingRule] = useState<PolicyRule | null>(null);
    const [formError, setFormError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        code: '',
        nameAr: '',
        nameEn: '',
        description: '',
        type: 'OVERTIME',
        scope: 'COMPANY',
        branchId: '',
        departmentId: '',
        jobTitleId: '',
        employeeId: '',
        effectiveFrom: new Date().toISOString().split('T')[0],
        effectiveTo: '',
        priority: 0,
        isActive: true,
    });

    const [ruleFormData, setRuleFormData] = useState({
        code: '',
        nameAr: '',
        valueType: 'PERCENTAGE',
        value: '',
        order: 0,
        outputComponentId: '',
        outputSign: 'EARNING',
        isActive: true,
    });

    const { data: policies = [], isLoading } = useQuery<Policy[]>({
        queryKey: ['policies'],
        queryFn: () => api.get('/policies') as Promise<Policy[]>,
    });

    const { data: components = [] } = useQuery<SalaryComponent[]>({
        queryKey: ['salary-components'],
        queryFn: () => api.get('/salary-components') as Promise<SalaryComponent[]>,
    });

    // Reference data for scope targeting
    const { data: branches = [] } = useQuery<any[]>({
        queryKey: ['branches'],
        queryFn: () => api.get('/branches') as Promise<any[]>,
    });

    const { data: departments = [] } = useQuery<any[]>({
        queryKey: ['departments'],
        queryFn: () => api.get('/departments') as Promise<any[]>,
    });

    const { data: jobTitles = [] } = useQuery<any[]>({
        queryKey: ['job-titles'],
        queryFn: () => api.get('/job-titles') as Promise<any[]>,
    });

    const { data: employees = [] } = useQuery<any[]>({
        queryKey: ['users'],
        queryFn: () => api.get('/users') as Promise<any[]>,
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
        mutationFn: (id: string) => api.patch(`/policies/${id}/toggle-active`, {}),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['policies'] }),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/policies/${id}`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['policies'] }),
    });

    // Rule mutations
    const addRuleMutation = useMutation({
        mutationFn: (data: { policyId: string; rule: typeof ruleFormData }) =>
            api.post(`/policies/${data.policyId}/rules`, data.rule),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['policies'] });
            setRuleFormOpen(false);
            resetRuleForm();
        },
    });

    const deleteRuleMutation = useMutation({
        mutationFn: (ruleId: string) => api.delete(`/policies/rules/${ruleId}`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['policies'] }),
    });

    const resetForm = () => {
        setFormData({
            code: '', nameAr: '', nameEn: '', description: '',
            type: 'OVERTIME', scope: 'COMPANY',
            branchId: '', departmentId: '', jobTitleId: '', employeeId: '',
            effectiveFrom: new Date().toISOString().split('T')[0],
            effectiveTo: '', priority: 0, isActive: true,
        });
    };

    const resetRuleForm = () => {
        setRuleFormData({
            code: '', nameAr: '', valueType: 'PERCENTAGE', value: '',
            order: 0, outputComponentId: '', outputSign: 'EARNING', isActive: true,
        });
        setEditingRule(null);
    };

    // 🔥 Validate scope targets before submission
    const handleSubmitPolicy = () => {
        setFormError(null);

        // Scope target validation
        if (formData.scope === 'BRANCH' && !formData.branchId) {
            setFormError('يجب اختيار الفرع عند تحديد النطاق على مستوى الفرع');
            return;
        }
        if (formData.scope === 'DEPARTMENT' && !formData.departmentId) {
            setFormError('يجب اختيار القسم عند تحديد النطاق على مستوى القسم');
            return;
        }
        if (formData.scope === 'JOB_TITLE' && !formData.jobTitleId) {
            setFormError('يجب اختيار الدرجة الوظيفية عند تحديد النطاق على مستوى الدرجة');
            return;
        }
        if (formData.scope === 'EMPLOYEE' && !formData.employeeId) {
            setFormError('يجب اختيار الموظف عند تحديد النطاق على مستوى الموظف');
            return;
        }

        createMutation.mutate(formData);
    };

    const openRulesDialog = (policy: Policy) => {
        setSelectedPolicy(policy);
        setRulesDialogOpen(true);
    };

    const openAddRuleForm = () => {
        resetRuleForm();
        setRuleFormOpen(true);
    };

    const getTypeLabel = (type: string) => policyTypes.find(t => t.value === type)?.label || type;
    const getScopeLabel = (scope: string) => policyScopes.find(s => s.value === scope)?.label || scope;
    const getValueTypeLabel = (type: string) => valueTypes.find(t => t.value === type)?.label || type;

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
                                    <TableCell>
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            startIcon={<Rule />}
                                            onClick={() => openRulesDialog(policy)}
                                        >
                                            {policy.rules?.length || 0} قاعدة
                                        </Button>
                                    </TableCell>
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

            {/* Create Policy Dialog */}
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
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        scope: e.target.value,
                                        branchId: '',
                                        departmentId: '',
                                        jobTitleId: '',
                                        employeeId: '',
                                    })}
                                >
                                    {policyScopes.map(s => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>

                        {/* Dynamic Scope Target Selection */}
                        {formData.scope === 'BRANCH' && (
                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth>
                                    <InputLabel>اختر الفرع</InputLabel>
                                    <Select
                                        value={formData.branchId}
                                        label="اختر الفرع"
                                        onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                                    >
                                        {branches.map((b: any) => (
                                            <MenuItem key={b.id} value={b.id}>{b.nameAr || b.name}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                        )}

                        {formData.scope === 'DEPARTMENT' && (
                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth>
                                    <InputLabel>اختر القسم</InputLabel>
                                    <Select
                                        value={formData.departmentId}
                                        label="اختر القسم"
                                        onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                                    >
                                        {departments.map((d: any) => (
                                            <MenuItem key={d.id} value={d.id}>{d.nameAr || d.name}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                        )}

                        {formData.scope === 'JOB_TITLE' && (
                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth>
                                    <InputLabel>اختر الدرجة الوظيفية</InputLabel>
                                    <Select
                                        value={formData.jobTitleId}
                                        label="اختر الدرجة الوظيفية"
                                        onChange={(e) => setFormData({ ...formData, jobTitleId: e.target.value })}
                                    >
                                        {jobTitles.map((j: any) => (
                                            <MenuItem key={j.id} value={j.id}>{j.nameAr || j.name}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                        )}

                        {formData.scope === 'EMPLOYEE' && (
                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth>
                                    <InputLabel>اختر الموظف</InputLabel>
                                    <Select
                                        value={formData.employeeId}
                                        label="اختر الموظف"
                                        onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                                    >
                                        {employees.map((emp: any) => (
                                            <MenuItem key={emp.id} value={emp.id}>
                                                {emp.firstName} {emp.lastName} ({emp.employeeCode || emp.email})
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                        )}
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
                        <Grid item xs={12} sm={6}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={formData.isActive}
                                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                    />
                                }
                                label="مفعّلة"
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
                    {formError && (
                        <Alert severity="error" sx={{ mt: 2 }}>
                            {formError}
                        </Alert>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
                    <Button
                        variant="contained"
                        onClick={handleSubmitPolicy}
                        disabled={!formData.code || !formData.nameAr || createMutation.isPending}
                    >
                        حفظ
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Rules Management Dialog */}
            <Dialog open={rulesDialogOpen} onClose={() => setRulesDialogOpen(false)} maxWidth="lg" fullWidth>
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                        <Typography variant="h6">قواعد السياسة: {selectedPolicy?.nameAr}</Typography>
                        <Typography variant="caption" color="text.secondary">
                            كود: {selectedPolicy?.code}
                        </Typography>
                    </Box>
                    <Button variant="contained" size="small" startIcon={<Add />} onClick={openAddRuleForm}>
                        إضافة قاعدة
                    </Button>
                </DialogTitle>
                <DialogContent dividers>
                    <Alert severity="info" sx={{ mb: 2 }}>
                        القواعد يتم تنفيذها بالترتيب. أول قاعدة تتطابق شروطها هي التي تُطبق.
                    </Alert>
                    <TableContainer>
                        <Table size="small">
                            <TableHead sx={{ bgcolor: 'grey.100' }}>
                                <TableRow>
                                    <TableCell>الترتيب</TableCell>
                                    <TableCell>الكود</TableCell>
                                    <TableCell>الاسم</TableCell>
                                    <TableCell>نوع القيمة</TableCell>
                                    <TableCell>القيمة</TableCell>
                                    <TableCell>المكوّن الناتج</TableCell>
                                    <TableCell>النوع</TableCell>
                                    <TableCell>الحالة</TableCell>
                                    <TableCell align="center">إجراءات</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {selectedPolicy?.rules?.map((rule, index) => (
                                    <TableRow key={rule.id} hover>
                                        <TableCell>{index + 1}</TableCell>
                                        <TableCell><code>{rule.code}</code></TableCell>
                                        <TableCell>{rule.nameAr}</TableCell>
                                        <TableCell>
                                            <Chip label={getValueTypeLabel(rule.valueType)} size="small" />
                                        </TableCell>
                                        <TableCell>
                                            <strong>{rule.value}</strong>
                                            {rule.valueType === 'PERCENTAGE' && '%'}
                                        </TableCell>
                                        <TableCell>
                                            {rule.outputComponent ? (
                                                <Chip
                                                    label={rule.outputComponent.nameAr}
                                                    size="small"
                                                    variant="outlined"
                                                    color="primary"
                                                />
                                            ) : (
                                                <Typography variant="caption" color="text.secondary">-</Typography>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={rule.outputSign === 'EARNING' ? 'استحقاق' : 'خصم'}
                                                size="small"
                                                color={rule.outputSign === 'EARNING' ? 'success' : 'error'}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={rule.isActive ? 'مفعّل' : 'معطّل'}
                                                size="small"
                                                color={rule.isActive ? 'success' : 'default'}
                                            />
                                        </TableCell>
                                        <TableCell align="center">
                                            <IconButton
                                                size="small"
                                                color="error"
                                                onClick={() => {
                                                    if (window.confirm('هل تريد حذف هذه القاعدة؟')) {
                                                        deleteRuleMutation.mutate(rule.id);
                                                    }
                                                }}
                                            >
                                                <Delete fontSize="small" />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {(!selectedPolicy?.rules || selectedPolicy.rules.length === 0) && (
                                    <TableRow>
                                        <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                                            <Typography color="text.secondary">لا يوجد قواعد لهذه السياسة</Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRulesDialogOpen(false)}>إغلاق</Button>
                </DialogActions>
            </Dialog>

            {/* Add/Edit Rule Dialog */}
            <Dialog open={ruleFormOpen} onClose={() => setRuleFormOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {editingRule ? 'تعديل قاعدة' : 'إضافة قاعدة جديدة'}
                </DialogTitle>
                <DialogContent dividers>
                    <Grid container spacing={2} sx={{ mt: 0 }}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth label="كود القاعدة" required
                                value={ruleFormData.code}
                                onChange={(e) => setRuleFormData({ ...ruleFormData, code: e.target.value })}
                                placeholder="مثال: OT_WEEKDAY"
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth label="الاسم" required
                                value={ruleFormData.nameAr}
                                onChange={(e) => setRuleFormData({ ...ruleFormData, nameAr: e.target.value })}
                                placeholder="مثال: إضافي أيام العمل"
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth>
                                <InputLabel>نوع القيمة</InputLabel>
                                <Select
                                    value={ruleFormData.valueType}
                                    label="نوع القيمة"
                                    onChange={(e) => setRuleFormData({ ...ruleFormData, valueType: e.target.value })}
                                >
                                    {valueTypes.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth label="القيمة" required
                                value={ruleFormData.value}
                                onChange={(e) => setRuleFormData({ ...ruleFormData, value: e.target.value })}
                                placeholder={ruleFormData.valueType === 'PERCENTAGE' ? '150' : '500'}
                                helperText={ruleFormData.valueType === 'PERCENTAGE' ? 'مثال: 150 يعني 150%' : 'المبلغ بالريال'}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth>
                                <InputLabel>المكوّن الناتج</InputLabel>
                                <Select
                                    value={ruleFormData.outputComponentId}
                                    label="المكوّن الناتج"
                                    onChange={(e) => setRuleFormData({ ...ruleFormData, outputComponentId: e.target.value })}
                                >
                                    <MenuItem value="">-- بدون ربط --</MenuItem>
                                    {components.map(c => (
                                        <MenuItem key={c.id} value={c.id}>
                                            {c.nameAr} ({c.code})
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth>
                                <InputLabel>نوع الناتج</InputLabel>
                                <Select
                                    value={ruleFormData.outputSign}
                                    label="نوع الناتج"
                                    onChange={(e) => setRuleFormData({ ...ruleFormData, outputSign: e.target.value })}
                                >
                                    {outputSigns.map(s => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth type="number" label="الترتيب"
                                value={ruleFormData.order}
                                onChange={(e) => setRuleFormData({ ...ruleFormData, order: parseInt(e.target.value) || 0 })}
                                helperText="القواعد تُنفذ بهذا الترتيب"
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={ruleFormData.isActive}
                                        onChange={(e) => setRuleFormData({ ...ruleFormData, isActive: e.target.checked })}
                                    />
                                }
                                label="مفعّلة"
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRuleFormOpen(false)}>إلغاء</Button>
                    <Button
                        variant="contained"
                        onClick={() => {
                            if (selectedPolicy) {
                                addRuleMutation.mutate({ policyId: selectedPolicy.id, rule: ruleFormData });
                            }
                        }}
                        disabled={!ruleFormData.code || !ruleFormData.nameAr || !ruleFormData.value || addRuleMutation.isPending}
                    >
                        حفظ
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default PoliciesPage;
