import { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Button,
    Card,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    MenuItem,
    Chip,
    Grid,
    Alert,
    CircularProgress,
    Divider,
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    AccountTree,
    Visibility as PreviewIcon,
} from '@mui/icons-material';
import { api } from '@/services/api.service';

interface SalaryComponent {
    id: string;
    code: string;
    nameAr: string;
    type: string;
    nature: 'FIXED' | 'VARIABLE' | 'FORMULA';
    formula?: string;
}

interface SalaryStructureLine {
    id?: string;
    componentId: string;
    component?: SalaryComponent;
    amount: number;
    percentage?: number;
    priority: number;
}

interface SalaryStructure {
    id: string;
    name: string;
    description?: string;
    isActive: boolean;
    lines: SalaryStructureLine[];
    _count?: { assignments: number; lines: number };
}

export const SalaryStructuresPage = () => {
    const [structures, setStructures] = useState<SalaryStructure[]>([]);
    const [components, setComponents] = useState<SalaryComponent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [open, setOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<SalaryStructure>>({
        name: '',
        isActive: true,
        lines: [],
    });

    const [employees, setEmployees] = useState<any[]>([]);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewData, setPreviewData] = useState<any>(null);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState('');

    const fetchData = async () => {
        try {
            setLoading(true);
            const [structuresData, componentsData, employeesData] = await Promise.all([
                api.get('/salary-structures') as Promise<SalaryStructure[]>,
                api.get('/salary-components') as Promise<SalaryComponent[]>,
                api.get('/users?role=EMPLOYEE') as Promise<any[]>,
            ]);
            setStructures(structuresData);
            setComponents(componentsData);
            setEmployees(Array.isArray(employeesData) ? employeesData : (employeesData as any).data || []);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleOpen = (structure?: SalaryStructure) => {
        if (structure) {
            setEditingId(structure.id);
            setFormData(structure);
        } else {
            setEditingId(null);
            setFormData({
                name: '',
                isActive: true,
                lines: [],
            });
        }
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        setEditingId(null);
    };

    const handleAddLine = () => {
        const currentLines = formData.lines || [];
        setFormData({
            ...formData,
            lines: [
                ...currentLines,
                { componentId: '', amount: 0, priority: currentLines.length },
            ],
        });
    };

    const handleRemoveLine = (index: number) => {
        const currentLines = [...(formData.lines || [])];
        currentLines.splice(index, 1);
        setFormData({ ...formData, lines: currentLines });
    };

    const handleLineChange = (index: number, field: keyof SalaryStructureLine, value: any) => {
        const currentLines = [...(formData.lines || [])];
        currentLines[index] = { ...currentLines[index], [field]: value };
        setFormData({ ...formData, lines: currentLines });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.lines?.length) {
            setError('يرجى إدخال اسم الهيكل وإضافة مكون واحد على الأقل');
            return;
        }

        try {
            const payload = {
                ...formData,
                lines: formData.lines.map(line => ({
                    componentId: line.componentId,
                    amount: Number(line.amount),
                    percentage: line.percentage ? Number(line.percentage) : undefined,
                    priority: Number(line.priority),
                }))
            };

            if (editingId) {
                await api.patch(`/salary-structures/${editingId}`, payload);
            } else {
                await api.post('/salary-structures', payload);
            }
            handleClose();
            fetchData();
        } catch (err: any) {
            setError(err.message || 'Something went wrong');
        }
    };

    const handlePreview = async () => {
        if (!selectedEmployeeId) {
            alert('يرجى اختيار موظف للمعاينة');
            return;
        }

        try {
            setPreviewLoading(true);
            const now = new Date();
            const data = await api.get(`/payroll-calculation/preview?employeeId=${selectedEmployeeId}&month=${now.getMonth() + 1}&year=${now.getFullYear()}`);
            setPreviewData(data);
            setPreviewOpen(true);
        } catch (err: any) {
            alert('فشل في جلب المعاينة: ' + (err.message || 'خطأ غير معروف'));
        } finally {
            setPreviewLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('هل أنت متأكد من حذف هذا الهيكل؟')) {
            try {
                await api.delete(`/salary-structures/${id}`);
                fetchData();
            } catch (err: any) {
                setError(err.message || 'Failed to delete');
            }
        }
    };

    if (loading && structures.length === 0) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box>
                    <Typography variant="h5" fontWeight="bold">هياكل الرواتب</Typography>
                    <Typography variant="body2" color="text.secondary">
                        تصنيف البدلات والرواتب في مجموعات قابلة للتعيين للموظفين
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpen()}
                    sx={{ borderRadius: 2 }}
                >
                    هيكل جديد
                </Button>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

            <Grid container spacing={3}>
                {structures.map((structure) => (
                    <Grid item xs={12} md={6} key={structure.id}>
                        <Card sx={{ p: 0, borderRadius: 3, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <Box sx={{ p: 2, bgcolor: structure.isActive ? '#f0f4ff' : 'grey.100', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Box>
                                    <Typography variant="subtitle1" fontWeight="bold">{structure.name}</Typography>
                                    <Typography variant="caption" color="text.secondary">{structure.description || 'بدون وصف'}</Typography>
                                </Box>
                                <Box>
                                    <IconButton size="small" onClick={() => handleOpen(structure)} color="primary"><EditIcon fontSize="small" /></IconButton>
                                    <IconButton size="small" onClick={() => handleDelete(structure.id)} color="error"><DeleteIcon fontSize="small" /></IconButton>
                                </Box>
                            </Box>
                            <Divider />
                            <Box sx={{ p: 2, flex: 1 }}>
                                <Typography variant="body2" fontWeight="bold" gutterBottom>المكونات ({(structure.lines || []).length}):</Typography>
                                <Box display="flex" flexWrap="wrap" gap={1}>
                                    {(structure.lines || []).map((line, idx) => (
                                        <Chip
                                            key={idx}
                                            label={`${line.component?.nameAr || 'مكون'}: ${line.percentage ? `${line.percentage}%` : line.component?.nature === 'FORMULA' ? 'معادلة' : line.amount}`}
                                            size="small"
                                            variant="outlined"
                                        />
                                    ))}
                                </Box>
                            </Box>
                            <Divider />
                            <Box sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'grey.50' }}>
                                <Typography variant="caption" color="text.secondary">
                                    الموظفين المعينين: {structure._count?.assignments || 0}
                                </Typography>
                                <Chip label={structure.isActive ? 'نشط' : 'معطل'} size="small" color={structure.isActive ? 'success' : 'default'} />
                            </Box>
                        </Card>
                    </Grid>
                ))}
                {structures.length === 0 && (
                    <Grid item xs={12}>
                        <Box textAlign="center" py={8} bgcolor="white" borderRadius={3}>
                            <AccountTree sx={{ fontSize: 64, color: 'grey.200', mb: 2 }} />
                            <Typography color="text.secondary">لا توجد هياكل رواتب معرفة بعد</Typography>
                        </Box>
                    </Grid>
                )}
            </Grid>

            <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
                <DialogTitle>{editingId ? 'تعديل هيكل الراتب' : 'إنشاء هيكل راتب جديد'}</DialogTitle>
                <DialogContent dividers>
                    <Grid container spacing={2} sx={{ mt: 0 }}>
                        <Grid item xs={12} sm={8}>
                            <TextField
                                fullWidth
                                label="اسم الهيكل"
                                value={formData.name || ''}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                fullWidth
                                select
                                label="الحالة"
                                value={formData.isActive === false ? 'false' : 'true'}
                                onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'true' })}
                            >
                                <MenuItem value="true">نشط</MenuItem>
                                <MenuItem value="false">معطل</MenuItem>
                            </TextField>
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="الوصف"
                                value={formData.description || ''}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                    <Box>
                                        <Typography variant="subtitle2" fontWeight="bold">مكونات الهيكل</Typography>
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                            💡 يتم حساب النسب (٪) بناءً على <strong>إجمالي الراتب (TOTAL)</strong> المعرف في تعيين راتب كل موظف.
                                        </Typography>
                                        {formData.lines && !formData.lines.some(l => components.find(c => c.id === l.componentId)?.code === 'BASIC') && (
                                            <Alert severity="warning" sx={{ mb: 2, py: 0 }}>
                                                يفضل إضافة مكون الراتب الأساسي (BASIC) لضمان دقة العمليات النظامية.
                                            </Alert>
                                        )}
                                    </Box>
                                    <Button startIcon={<AddIcon />} size="small" onClick={handleAddLine} variant="outlined">إضافة مكون</Button>
                                </Box>

                                {/* Column Headers */}
                                {formData.lines && formData.lines.length > 0 && (
                                    <Box sx={{ display: 'flex', gap: 2, mb: 1, alignItems: 'center', px: 1 }}>
                                        <Typography variant="caption" sx={{ minWidth: 200, fontWeight: 'bold' }}>المكون</Typography>
                                        <Typography variant="caption" sx={{ width: 120, fontWeight: 'bold' }}>نوع القيمة</Typography>
                                        <Typography variant="caption" sx={{ width: 120, fontWeight: 'bold' }}>المبلغ / النسبة</Typography>
                                        <Typography variant="caption" sx={{ width: 80, fontWeight: 'bold' }}>الترتيب</Typography>
                                        <Box sx={{ width: 40 }} />
                                    </Box>
                                )}

                                {formData.lines?.map((line, index) => {
                                    const component = components.find(c => c.id === line.componentId);
                                    const valueType = line.percentage ? 'percentage' : (component?.nature === 'FORMULA' ? 'formula' : 'amount');

                                    return (
                                        <Box key={index} sx={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 1.5,
                                            mb: 1.5,
                                            p: 2,
                                            bgcolor: 'white',
                                            borderRadius: 2,
                                            border: '1px solid',
                                            borderColor: 'divider',
                                            position: 'relative'
                                        }}>
                                            <IconButton
                                                color="error"
                                                onClick={() => handleRemoveLine(index)}
                                                sx={{ position: 'absolute', top: 4, right: 4 }}
                                                size="small"
                                            >
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>

                                            <Grid container spacing={2} alignItems="center">
                                                <Grid item xs={12} sm={4}>
                                                    <TextField
                                                        select
                                                        fullWidth
                                                        label="المكون"
                                                        value={line.componentId}
                                                        onChange={(e) => handleLineChange(index, 'componentId', e.target.value)}
                                                        size="small"
                                                    >
                                                        {components.map(comp => (
                                                            <MenuItem key={comp.id} value={comp.id}>
                                                                {comp.nameAr} ({comp.code})
                                                            </MenuItem>
                                                        ))}
                                                    </TextField>
                                                </Grid>

                                                <Grid item xs={12} sm={3}>
                                                    <TextField
                                                        select
                                                        fullWidth
                                                        label="نوع القيمة"
                                                        value={valueType}
                                                        onChange={(e) => {
                                                            if (e.target.value === 'percentage') {
                                                                handleLineChange(index, 'amount', 0);
                                                                handleLineChange(index, 'percentage', line.percentage || 25);
                                                            } else if (e.target.value === 'formula') {
                                                                handleLineChange(index, 'percentage', null);
                                                                handleLineChange(index, 'amount', 0);
                                                            } else {
                                                                handleLineChange(index, 'percentage', null);
                                                                handleLineChange(index, 'amount', line.amount || 500);
                                                            }
                                                        }}
                                                        size="small"
                                                    >
                                                        <MenuItem value="amount" disabled={component?.nature === 'FORMULA'}>مبلغ ثابت</MenuItem>
                                                        <MenuItem value="percentage" disabled={component?.nature === 'FORMULA'}>نسبة % من الإجمالي (TOTAL)</MenuItem>
                                                        <MenuItem value="formula" disabled={component?.nature !== 'FORMULA'}>معادلة محسوبة</MenuItem>
                                                    </TextField>
                                                </Grid>

                                                <Grid item xs={12} sm={3}>
                                                    {valueType === 'percentage' ? (
                                                        <TextField
                                                            fullWidth
                                                            label="النسبة %"
                                                            type="number"
                                                            value={line.percentage || ''}
                                                            onChange={(e) => handleLineChange(index, 'percentage', e.target.value)}
                                                            size="small"
                                                            InputProps={{ inputProps: { min: 0, max: 100 } }}
                                                            helperText="من إجمالي الراتب (TOTAL)"
                                                        />
                                                    ) : valueType === 'formula' ? (
                                                        <TextField
                                                            fullWidth
                                                            disabled
                                                            label="المعادلة (من المكون)"
                                                            value={component?.formula || ''}
                                                            size="small"
                                                            helperText="تعدل من صفحة المكونات"
                                                        />
                                                    ) : (
                                                        <TextField
                                                            fullWidth
                                                            label="المبلغ (ريال)"
                                                            type="number"
                                                            value={line.amount || ''}
                                                            onChange={(e) => handleLineChange(index, 'amount', e.target.value)}
                                                            size="small"
                                                            InputProps={{ inputProps: { min: 0 } }}
                                                        />
                                                    )}
                                                </Grid>

                                                <Grid item xs={12} sm={2}>
                                                    <TextField
                                                        fullWidth
                                                        label="الترتيب"
                                                        type="number"
                                                        value={line.priority}
                                                        onChange={(e) => handleLineChange(index, 'priority', e.target.value)}
                                                        size="small"
                                                    />
                                                </Grid>
                                            </Grid>

                                            {component?.nature === 'VARIABLE' && (
                                                <Typography variant="caption" color="warning.main" sx={{ mt: 1 }}>
                                                    ⚠️ هذا المكوّن متغير ويُحسب من السياسات أو الإدخالات الشهرية.
                                                </Typography>
                                            )}
                                        </Box>
                                    );
                                })}

                                {(!formData.lines || formData.lines.length === 0) && (
                                    <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>
                                        لم يتم إضافة أي مكونات لهذا الهيكل بعد
                                    </Typography>
                                )}
                            </Box>
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
                    <Box display="flex" gap={1} alignItems="center">
                        <TextField
                            select
                            size="small"
                            label="موظف للمعاينة"
                            sx={{ width: 200 }}
                            value={selectedEmployeeId}
                            onChange={(e) => setSelectedEmployeeId(e.target.value)}
                        >
                            {employees?.length > 0 && employees.map(emp => (
                                <MenuItem key={emp.id} value={emp.id}>{emp.nameAr || emp.nameEn || emp.email}</MenuItem>
                            ))}
                        </TextField>
                        <Button
                            variant="outlined"
                            startIcon={previewLoading ? <CircularProgress size={20} /> : <PreviewIcon />}
                            onClick={handlePreview}
                            disabled={previewLoading || !selectedEmployeeId}
                        >
                            معاينة الحساب
                        </Button>
                    </Box>
                    <Box>
                        <Button onClick={handleClose} color="inherit" sx={{ mr: 1 }}>إلغاء</Button>
                        <Button onClick={handleSubmit} variant="contained" color="primary">
                            {editingId ? 'تحديث' : 'حفظ'}
                        </Button>
                    </Box>
                </DialogActions>
            </Dialog>

            <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>معاينة تفصيلية للحساب</DialogTitle>
                <DialogContent dividers>
                    {previewData && (
                        <Box>
                            <Typography variant="subtitle2" color="primary" gutterBottom>خطوات الحساب (Trace):</Typography>
                            {previewData.calculationTrace?.map((t: any, i: number) => (
                                <Box key={i} sx={{ mb: 1.5, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                                    <Box display="flex" justifyContent="space-between">
                                        <Typography variant="body2" fontWeight="bold">{t.description}</Typography>
                                        <Typography variant="body2" color="primary">{t.result?.toLocaleString()} ر.س</Typography>
                                    </Box>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                        {t.formula}
                                    </Typography>
                                </Box>
                            ))}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPreviewOpen(false)}>إغلاق</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};
