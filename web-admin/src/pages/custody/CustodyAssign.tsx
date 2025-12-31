import { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, TextField, Button, FormControl, InputLabel, Select, MenuItem,
    CircularProgress, Alert, Grid, Breadcrumbs, Link, Autocomplete
} from '@mui/material';
import { Save, ArrowBack, Person, Inventory2, Add } from '@mui/icons-material';
import { useNavigate, useSearchParams, Link as RouterLink } from 'react-router-dom';
import custodyService, { CustodyItem } from '@/services/custody.service';
import { api } from '@/services/api.service';

interface Employee {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode?: string;
    department?: { name: string };
}

interface PaginatedResponse<T> {
    data: T[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
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

    const [form, setForm] = useState({
        employeeId: '',
        custodyItemId: preselectedItemId || '',
        expectedReturn: '',
        conditionOnAssign: 'NEW',
        notes: '',
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [empsRes, itemsRes] = await Promise.all([
                    api.get<PaginatedResponse<Employee>>('/users?status=ACTIVE&limit=1000'),
                    custodyService.getItems({ status: 'AVAILABLE' }),
                ]);
                // استخراج مصفوفة الموظفين من الكائن المُرجع
                setEmployees(empsRes.data || []);
                setAvailableItems(itemsRes.items);
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

        if (!form.custodyItemId) {
            setError('يرجى اختيار عهدة');
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            // Assign custody
            await custodyService.assignCustody({
                custodyItemId: form.custodyItemId,
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

                        {/* Item Selection */}
                        <Grid item xs={12}>
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                <Typography variant="h6" color="primary">
                                    <Inventory2 sx={{ verticalAlign: 'middle', mr: 1 }} />
                                    اختيار العهدة
                                </Typography>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<Add />}
                                    onClick={() => navigate('/custody/items/new')}
                                >
                                    إضافة عهدة جديدة
                                </Button>
                            </Box>

                            {availableItems.length === 0 ? (
                                <Alert severity="info" sx={{ mb: 2 }}>
                                    لا توجد عهد متاحة للتسليم.
                                    <Button
                                        size="small"
                                        onClick={() => navigate('/custody/items/new')}
                                        sx={{ ml: 1 }}
                                    >
                                        أضف عهدة جديدة
                                    </Button>
                                </Alert>
                            ) : (
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
                            )}
                        </Grid>

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
                                disabled={loading || availableItems.length === 0}
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
