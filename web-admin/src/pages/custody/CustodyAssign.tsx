import { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, TextField, Button, FormControl, InputLabel, Select, MenuItem,
    CircularProgress, Alert, Grid, Breadcrumbs, Link, Autocomplete, ToggleButtonGroup, ToggleButton
} from '@mui/material';
import { Save, ArrowBack, Person, Inventory2 } from '@mui/icons-material';
import { useNavigate, useSearchParams, Link as RouterLink } from 'react-router-dom';
import custodyService, { CustodyItem, CustodyCategory } from '@/services/custody.service';
import { api } from '@/services/api.service';

interface Employee {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode?: string;
    department?: { name: string };
}

export default function CustodyAssign() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const preselectedItemId = searchParams.get('itemId');

    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [employees, setEmployees] = useState<Employee[]>([]);
    const [availableItems, setAvailableItems] = useState<CustodyItem[]>([]);
    const [categories, setCategories] = useState<CustodyCategory[]>([]);

    const [mode, setMode] = useState<'existing' | 'new'>('existing');

    const [form, setForm] = useState({
        employeeId: '',
        custodyItemId: preselectedItemId || '',
        expectedReturn: '',
        conditionOnAssign: 'NEW',
        notes: '',
        // New item fields
        categoryId: '',
        code: '',
        name: '',
        serialNumber: '',
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [emps, itemsRes, cats] = await Promise.all([
                    api.get<Employee[]>('/users?status=ACTIVE'),
                    custodyService.getItems({ status: 'AVAILABLE' }),
                    custodyService.getCategories(),
                ]);
                setEmployees(emps);
                setAvailableItems(itemsRes.items);
                setCategories(cats);
            } catch (err) {
                console.error(err);
                setError('فشل في تحميل البيانات');
            } finally {
                setFetching(false);
            }
        };
        fetchData();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            let itemId = form.custodyItemId;

            // Create new item if in new mode
            if (mode === 'new') {
                const newItem = await custodyService.createItem({
                    categoryId: form.categoryId,
                    code: form.code,
                    name: form.name,
                    serialNumber: form.serialNumber || undefined,
                    condition: form.conditionOnAssign as 'NEW' | 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR',
                });
                itemId = newItem.id;
            }

            // Assign custody
            await custodyService.assignCustody({
                custodyItemId: itemId,
                employeeId: form.employeeId,
                expectedReturn: form.expectedReturn || undefined,
                conditionOnAssign: form.conditionOnAssign,
                notes: form.notes || undefined,
            });

            setSuccess('تم تسليم العهدة بنجاح!');
            setTimeout(() => navigate('/custody'), 1500);
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.message || 'فشل في تسليم العهدة');
        } finally {
            setLoading(false);
        }
    };

    if (fetching) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    const selectedEmployee = employees.find(e => e.id === form.employeeId);
    const selectedItem = availableItems.find(i => i.id === form.custodyItemId);

    return (
        <Box p={3}>
            <Breadcrumbs sx={{ mb: 2 }}>
                <Link component={RouterLink} to="/custody" color="inherit">العهد</Link>
                <Typography color="text.primary">تسليم عهدة</Typography>
            </Breadcrumbs>

            <Box display="flex" alignItems="center" gap={2} mb={3}>
                <Button startIcon={<ArrowBack />} onClick={() => navigate(-1)}>رجوع</Button>
                <Typography variant="h5" fontWeight="bold">
                    📦 تسليم عهدة لموظف
                </Typography>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

            <Paper sx={{ p: 4 }}>
                <form onSubmit={handleSubmit}>
                    <Grid container spacing={3}>
                        {/* Employee Selection */}
                        <Grid item xs={12}>
                            <Typography variant="h6" gutterBottom color="primary">
                                <Person sx={{ verticalAlign: 'middle', mr: 1 }} />
                                اختيار الموظف
                            </Typography>
                            <Autocomplete
                                options={employees}
                                getOptionLabel={(option) => `${option.firstName} ${option.lastName} ${option.employeeCode ? `(${option.employeeCode})` : ''}`}
                                value={selectedEmployee || null}
                                onChange={(_, newValue) => setForm({ ...form, employeeId: newValue?.id || '' })}
                                renderInput={(params) => (
                                    <TextField {...params} label="الموظف" required />
                                )}
                                renderOption={(props, option) => (
                                    <li {...props}>
                                        <Box>
                                            <Typography>{option.firstName} {option.lastName}</Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {option.employeeCode} {option.department ? `- ${option.department.name}` : ''}
                                            </Typography>
                                        </Box>
                                    </li>
                                )}
                            />
                        </Grid>

                        {/* Item Selection Mode */}
                        <Grid item xs={12}>
                            <Typography variant="h6" gutterBottom color="primary">
                                <Inventory2 sx={{ verticalAlign: 'middle', mr: 1 }} />
                                اختيار العهدة
                            </Typography>
                            <ToggleButtonGroup
                                value={mode}
                                exclusive
                                onChange={(_, newMode) => newMode && setMode(newMode)}
                                sx={{ mb: 2 }}
                            >
                                <ToggleButton value="existing">عهدة موجودة</ToggleButton>
                                <ToggleButton value="new">إضافة جديدة</ToggleButton>
                            </ToggleButtonGroup>
                        </Grid>

                        {mode === 'existing' ? (
                            <Grid item xs={12}>
                                <Autocomplete
                                    options={availableItems}
                                    getOptionLabel={(option) => `${option.name} (${option.code})`}
                                    value={selectedItem || null}
                                    onChange={(_, newValue) => setForm({ ...form, custodyItemId: newValue?.id || '' })}
                                    renderInput={(params) => (
                                        <TextField {...params} label="العهدة" required />
                                    )}
                                    renderOption={(props, option) => (
                                        <li {...props}>
                                            <Box>
                                                <Typography>{option.name}</Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {option.code} - {option.category?.name || 'غير مصنف'}
                                                </Typography>
                                            </Box>
                                        </li>
                                    )}
                                />
                            </Grid>
                        ) : (
                            <>
                                <Grid item xs={12} md={6}>
                                    <FormControl fullWidth required>
                                        <InputLabel>الفئة</InputLabel>
                                        <Select
                                            value={form.categoryId}
                                            label="الفئة"
                                            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                                        >
                                            {categories.map((c) => (
                                                <MenuItem key={c.id} value={c.id}>
                                                    {c.icon || '📦'} {c.name}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        required
                                        fullWidth
                                        label="كود العهدة"
                                        value={form.code}
                                        onChange={(e) => setForm({ ...form, code: e.target.value })}
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        required
                                        fullWidth
                                        label="اسم العهدة"
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        label="الرقم التسلسلي"
                                        value={form.serialNumber}
                                        onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
                                    />
                                </Grid>
                            </>
                        )}

                        {/* Assignment Details */}
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="تاريخ الإرجاع المتوقع"
                                type="date"
                                InputLabelProps={{ shrink: true }}
                                value={form.expectedReturn}
                                onChange={(e) => setForm({ ...form, expectedReturn: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth>
                                <InputLabel>حالة العهدة عند التسليم</InputLabel>
                                <Select
                                    value={form.conditionOnAssign}
                                    label="حالة العهدة عند التسليم"
                                    onChange={(e) => setForm({ ...form, conditionOnAssign: e.target.value })}
                                >
                                    <MenuItem value="NEW">جديدة</MenuItem>
                                    <MenuItem value="EXCELLENT">ممتازة</MenuItem>
                                    <MenuItem value="GOOD">جيدة</MenuItem>
                                    <MenuItem value="FAIR">مقبولة</MenuItem>
                                    <MenuItem value="POOR">سيئة</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="ملاحظات"
                                multiline
                                rows={3}
                                value={form.notes}
                                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                            />
                        </Grid>

                        <Grid item xs={12} display="flex" justifyContent="flex-end" gap={2}>
                            <Button variant="outlined" onClick={() => navigate(-1)}>إلغاء</Button>
                            <Button
                                type="submit"
                                variant="contained"
                                size="large"
                                startIcon={loading ? <CircularProgress size={20} /> : <Save />}
                                disabled={loading}
                            >
                                {loading ? 'جاري الحفظ...' : 'تسليم العهدة'}
                            </Button>
                        </Grid>
                    </Grid>
                </form>
            </Paper>
        </Box>
    );
}
