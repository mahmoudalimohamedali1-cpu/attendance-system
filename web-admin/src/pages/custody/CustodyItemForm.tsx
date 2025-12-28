import { useState, useEffect, useRef } from 'react';
import {
    Box, Typography, Paper, TextField, Button, FormControl, InputLabel, Select, MenuItem,
    CircularProgress, Alert, Grid, Breadcrumbs, Link, IconButton, Tooltip, Snackbar,
    Divider, Chip, InputAdornment
} from '@mui/material';
import {
    Save, ArrowBack, AutoAwesome, CloudUpload, Close as CloseIcon,
    Receipt, Store, QrCode2
} from '@mui/icons-material';
import { useNavigate, useParams, Link as RouterLink } from 'react-router-dom';
import custodyService, { CustodyCategory, CustodyItem } from '@/services/custody.service';
import { api } from '@/services/api.service';

interface Branch {
    id: string;
    name: string;
}

export default function CustodyItemForm() {
    const { id } = useParams();
    const isEdit = Boolean(id);
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(isEdit);
    const [error, setError] = useState<string | null>(null);
    const [categories, setCategories] = useState<CustodyCategory[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);

    // Toast notification state
    const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
        open: false, message: '', severity: 'info'
    });

    // Image preview state
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);

    const [form, setForm] = useState({
        categoryId: '',
        code: '',
        name: '',
        nameEn: '',
        description: '',
        serialNumber: '',
        model: '',
        brand: '',
        barcode: '',
        purchasePrice: '',
        purchaseDate: '',
        warrantyExpiry: '',
        vendor: '',
        invoiceNumber: '',
        currentLocation: '',
        branchId: '',
        notes: '',
        condition: 'NEW',
        status: 'AVAILABLE',
        imageUrl: ''
    });

    // Validation errors
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [cats, branchesRes] = await Promise.all([
                    custodyService.getCategories(),
                    api.get<Branch[]>('/branches'),
                ]);
                setCategories(cats);
                setBranches(branchesRes);

                if (isEdit && id) {
                    const item = await custodyService.getItemById(id);
                    setForm({
                        categoryId: item.categoryId || '',
                        code: item.code || '',
                        name: item.name || '',
                        nameEn: item.nameEn || '',
                        description: item.description || '',
                        serialNumber: item.serialNumber || '',
                        model: item.model || '',
                        brand: item.brand || '',
                        barcode: item.barcode || '',
                        purchasePrice: item.purchasePrice?.toString() || '',
                        purchaseDate: item.purchaseDate ? new Date(item.purchaseDate).toISOString().split('T')[0] : '',
                        warrantyExpiry: item.warrantyExpiry ? new Date(item.warrantyExpiry).toISOString().split('T')[0] : '',
                        vendor: item.vendor || '',
                        invoiceNumber: item.invoiceNumber || '',
                        currentLocation: item.currentLocation || '',
                        branchId: item.branchId || '',
                        notes: item.notes || '',
                        condition: item.condition || 'NEW',
                        status: item.status || 'AVAILABLE',
                        imageUrl: item.imageUrl || ''
                    });
                    if (item.imageUrl) {
                        setImagePreview(item.imageUrl);
                    }
                }
            } catch (err) {
                console.error(err);
                setError('فشل في تحميل البيانات');
                showToast('فشل في تحميل البيانات', 'error');
            } finally {
                setFetching(false);
            }
        };
        fetchData();
    }, [id, isEdit]);

    const showToast = (message: string, severity: 'success' | 'error' | 'info') => {
        setToast({ open: true, message, severity });
    };

    const handleCloseToast = () => {
        setToast(prev => ({ ...prev, open: false }));
    };

    // Auto-generate code based on category
    const generateCode = () => {
        const category = categories.find(c => c.id === form.categoryId);
        const prefix = category?.nameEn?.substring(0, 3).toUpperCase() ||
            category?.name?.substring(0, 3) || 'ITM';
        const timestamp = Date.now().toString().slice(-6);
        const newCode = `${prefix}-${timestamp}`;
        setForm({ ...form, code: newCode });
        showToast(`تم توليد الكود: ${newCode}`, 'info');
    };

    // Handle image upload
    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                showToast('حجم الصورة يجب أن يكون أقل من 5 ميجابايت', 'error');
                return;
            }
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
            showToast('تم تحديد الصورة بنجاح', 'info');
        }
    };

    const removeImage = () => {
        setImageFile(null);
        setImagePreview(null);
        setForm({ ...form, imageUrl: '' });
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Validate form before submit
    const validateForm = (): boolean => {
        const errors: Record<string, string> = {};

        if (!form.categoryId) {
            errors.categoryId = 'الفئة مطلوبة';
        }
        if (!form.code) {
            errors.code = 'كود العهدة مطلوب';
        }
        if (!form.name) {
            errors.name = 'اسم العهدة مطلوب';
        }
        if (form.purchasePrice && parseFloat(form.purchasePrice) <= 0) {
            errors.purchasePrice = 'سعر الشراء يجب أن يكون موجباً';
        }
        if (form.purchaseDate && form.warrantyExpiry) {
            if (new Date(form.warrantyExpiry) < new Date(form.purchaseDate)) {
                errors.warrantyExpiry = 'تاريخ انتهاء الضمان يجب أن يكون بعد تاريخ الشراء';
            }
        }

        setValidationErrors(errors);

        if (Object.keys(errors).length > 0) {
            showToast('يرجى تصحيح الأخطاء في النموذج', 'error');
            return false;
        }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Upload image first if exists
            let imageUrl = form.imageUrl;
            if (imageFile) {
                const formData = new FormData();
                formData.append('file', imageFile);
                try {
                    const uploadRes = await api.post<{ url: string }>('/uploads/image', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                    imageUrl = uploadRes.url;
                } catch (uploadErr) {
                    console.warn('Image upload failed, continuing without image:', uploadErr);
                    showToast('تعذر رفع الصورة، سيتم الحفظ بدونها', 'info');
                }
            }

            const data: Partial<CustodyItem> = {
                categoryId: form.categoryId,
                code: form.code,
                name: form.name,
                purchasePrice: form.purchasePrice ? parseFloat(form.purchasePrice) : undefined,
                purchaseDate: form.purchaseDate || undefined,
                warrantyExpiry: form.warrantyExpiry || undefined,
                nameEn: form.nameEn || undefined,
                description: form.description || undefined,
                serialNumber: form.serialNumber || undefined,
                model: form.model || undefined,
                brand: form.brand || undefined,
                barcode: form.barcode || undefined,
                vendor: form.vendor || undefined,
                invoiceNumber: form.invoiceNumber || undefined,
                currentLocation: form.currentLocation || undefined,
                branchId: form.branchId || undefined,
                notes: form.notes || undefined,
                imageUrl: imageUrl || undefined,
                condition: form.condition as 'NEW' | 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR',
                status: form.status as 'AVAILABLE' | 'ASSIGNED' | 'IN_MAINTENANCE' | 'LOST' | 'DAMAGED' | 'DISPOSED' | 'RESERVED',
            };

            if (isEdit && id) {
                await custodyService.updateItem(id, data);
                showToast('تم تحديث العهدة بنجاح! ✅', 'success');
                setTimeout(() => {
                    navigate(`/custody/items/${id}`, { replace: true });
                }, 1000);
            } else {
                const newItem = await custodyService.createItem(data);
                showToast(`تم إنشاء العهدة "${newItem.name}" بنجاح! 🎉`, 'success');
                setTimeout(() => {
                    navigate('/custody/items', {
                        replace: true,
                        state: {
                            successMessage: `تم إنشاء العهدة "${newItem.name}" بنجاح!`,
                            highlightItemId: newItem.id
                        }
                    });
                }, 1000);
            }
        } catch (err: any) {
            console.error('[CustodyItemForm] Error saving item:', err);
            const errorMsg = err.response?.data?.message || 'فشل في حفظ البيانات';
            setError(errorMsg);
            showToast(errorMsg, 'error');
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

    return (
        <Box p={3}>
            {/* Toast Notification */}
            <Snackbar
                open={toast.open}
                autoHideDuration={4000}
                onClose={handleCloseToast}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert
                    onClose={handleCloseToast}
                    severity={toast.severity}
                    sx={{ width: '100%', fontWeight: 'bold' }}
                    variant="filled"
                >
                    {toast.message}
                </Alert>
            </Snackbar>

            <Breadcrumbs sx={{ mb: 2 }}>
                <Link component={RouterLink} to="/custody" color="inherit">العهد</Link>
                <Link component={RouterLink} to="/custody/items" color="inherit">الأصول</Link>
                <Typography color="text.primary">{isEdit ? 'تعديل عهدة' : 'إضافة عهدة جديدة'}</Typography>
            </Breadcrumbs>

            <Box display="flex" alignItems="center" gap={2} mb={3}>
                <Button startIcon={<ArrowBack />} onClick={() => navigate(-1)}>رجوع</Button>
                <Typography variant="h5" fontWeight="bold">
                    {isEdit ? '📝 تعديل بيانات العهدة' : '📦 إضافة عهدة جديدة'}
                </Typography>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Paper sx={{ p: 4 }}>
                <form onSubmit={handleSubmit}>
                    <Grid container spacing={3}>
                        {/* البيانات الأساسية */}
                        <Grid item xs={12} md={6}>
                            <Typography variant="h6" gutterBottom color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                📋 البيانات الأساسية
                            </Typography>
                            <Box display="flex" flexDirection="column" gap={2}>
                                <FormControl fullWidth required error={!!validationErrors.categoryId}>
                                    <InputLabel>الفئة</InputLabel>
                                    <Select
                                        value={form.categoryId}
                                        label="الفئة"
                                        onChange={(e) => {
                                            setForm({ ...form, categoryId: e.target.value });
                                            setValidationErrors(prev => ({ ...prev, categoryId: '' }));
                                        }}
                                    >
                                        {categories.length === 0 && (
                                            <MenuItem value="" disabled>
                                                لا توجد فئات - أضف فئة أولاً
                                            </MenuItem>
                                        )}
                                        {categories.map((c) => (
                                            <MenuItem key={c.id} value={c.id}>
                                                {c.icon || '📦'} {c.name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                    {validationErrors.categoryId && (
                                        <Typography variant="caption" color="error">{validationErrors.categoryId}</Typography>
                                    )}
                                </FormControl>

                                {/* Code with auto-generate button */}
                                <Box display="flex" gap={1}>
                                    <TextField
                                        required
                                        fullWidth
                                        label="كود العهدة"
                                        value={form.code}
                                        onChange={(e) => {
                                            setForm({ ...form, code: e.target.value });
                                            setValidationErrors(prev => ({ ...prev, code: '' }));
                                        }}
                                        disabled={isEdit}
                                        error={!!validationErrors.code}
                                        helperText={validationErrors.code}
                                        InputProps={{
                                            endAdornment: !isEdit && (
                                                <InputAdornment position="end">
                                                    <Tooltip title="توليد كود تلقائي">
                                                        <IconButton onClick={generateCode} edge="end" color="primary">
                                                            <AutoAwesome />
                                                        </IconButton>
                                                    </Tooltip>
                                                </InputAdornment>
                                            )
                                        }}
                                    />
                                </Box>

                                <TextField
                                    required
                                    label="اسم العهدة (عربي)"
                                    value={form.name}
                                    onChange={(e) => {
                                        setForm({ ...form, name: e.target.value });
                                        setValidationErrors(prev => ({ ...prev, name: '' }));
                                    }}
                                    error={!!validationErrors.name}
                                    helperText={validationErrors.name}
                                />
                                <TextField
                                    label="الاسم بالإنجليزية"
                                    value={form.nameEn}
                                    onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
                                />
                                <TextField
                                    label="وصف تفصيلي"
                                    multiline
                                    rows={2}
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                />
                                <TextField
                                    label="الرقم التسلسلي (S/N)"
                                    value={form.serialNumber}
                                    onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
                                />
                                <TextField
                                    label="الباركود"
                                    value={form.barcode}
                                    onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <QrCode2 fontSize="small" />
                                            </InputAdornment>
                                        )
                                    }}
                                />
                                <Grid container spacing={2}>
                                    <Grid item xs={6}>
                                        <TextField
                                            fullWidth
                                            label="الموديل"
                                            value={form.model}
                                            onChange={(e) => setForm({ ...form, model: e.target.value })}
                                        />
                                    </Grid>
                                    <Grid item xs={6}>
                                        <TextField
                                            fullWidth
                                            label="العلامة التجارية"
                                            value={form.brand}
                                            onChange={(e) => setForm({ ...form, brand: e.target.value })}
                                        />
                                    </Grid>
                                </Grid>
                            </Box>
                        </Grid>

                        {/* بيانات الشراء والحالة */}
                        <Grid item xs={12} md={6}>
                            <Typography variant="h6" gutterBottom color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                💰 بيانات الشراء والحالة
                            </Typography>
                            <Box display="flex" flexDirection="column" gap={2}>
                                <TextField
                                    label="سعر الشراء"
                                    type="number"
                                    value={form.purchasePrice}
                                    onChange={(e) => {
                                        setForm({ ...form, purchasePrice: e.target.value });
                                        setValidationErrors(prev => ({ ...prev, purchasePrice: '' }));
                                    }}
                                    error={!!validationErrors.purchasePrice}
                                    helperText={validationErrors.purchasePrice}
                                    InputProps={{
                                        inputProps: { min: 0 }
                                    }}
                                />
                                <TextField
                                    label="تاريخ الشراء"
                                    type="date"
                                    InputLabelProps={{ shrink: true }}
                                    value={form.purchaseDate}
                                    onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
                                />
                                <TextField
                                    label="تاريخ انتهاء الضمان"
                                    type="date"
                                    InputLabelProps={{ shrink: true }}
                                    value={form.warrantyExpiry}
                                    onChange={(e) => {
                                        setForm({ ...form, warrantyExpiry: e.target.value });
                                        setValidationErrors(prev => ({ ...prev, warrantyExpiry: '' }));
                                    }}
                                    error={!!validationErrors.warrantyExpiry}
                                    helperText={validationErrors.warrantyExpiry}
                                />

                                {/* Vendor and Invoice fields */}
                                <Divider sx={{ my: 1 }}>
                                    <Chip label="بيانات المورد" size="small" />
                                </Divider>
                                <TextField
                                    label="اسم المورد"
                                    value={form.vendor}
                                    onChange={(e) => setForm({ ...form, vendor: e.target.value })}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Store fontSize="small" />
                                            </InputAdornment>
                                        )
                                    }}
                                />
                                <TextField
                                    label="رقم الفاتورة"
                                    value={form.invoiceNumber}
                                    onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Receipt fontSize="small" />
                                            </InputAdornment>
                                        )
                                    }}
                                />

                                <FormControl fullWidth>
                                    <InputLabel>الحالة الفنية</InputLabel>
                                    <Select
                                        value={form.condition}
                                        label="الحالة الفنية"
                                        onChange={(e) => setForm({ ...form, condition: e.target.value })}
                                    >
                                        <MenuItem value="NEW">🆕 جديدة</MenuItem>
                                        <MenuItem value="EXCELLENT">⭐ ممتازة</MenuItem>
                                        <MenuItem value="GOOD">👍 جيدة</MenuItem>
                                        <MenuItem value="FAIR">👌 مقبولة</MenuItem>
                                        <MenuItem value="POOR">⚠️ سيئة</MenuItem>
                                    </Select>
                                </FormControl>
                                <FormControl fullWidth>
                                    <InputLabel>الفرع</InputLabel>
                                    <Select
                                        value={form.branchId}
                                        label="الفرع"
                                        onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                                    >
                                        <MenuItem value="">بدون</MenuItem>
                                        {branches.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
                                    </Select>
                                </FormControl>
                                <TextField
                                    label="الموقع الحالي"
                                    value={form.currentLocation}
                                    onChange={(e) => setForm({ ...form, currentLocation: e.target.value })}
                                />
                            </Box>
                        </Grid>

                        {/* Image Upload Section */}
                        <Grid item xs={12}>
                            <Typography variant="h6" gutterBottom color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                📷 صورة العهدة
                            </Typography>
                            <Box
                                sx={{
                                    border: '2px dashed',
                                    borderColor: 'divider',
                                    borderRadius: 2,
                                    p: 3,
                                    textAlign: 'center',
                                    bgcolor: 'background.default',
                                    position: 'relative'
                                }}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageSelect}
                                    style={{ display: 'none' }}
                                />
                                {imagePreview ? (
                                    <Box position="relative" display="inline-block">
                                        <img
                                            src={imagePreview}
                                            alt="معاينة"
                                            style={{
                                                maxHeight: 200,
                                                maxWidth: '100%',
                                                borderRadius: 8,
                                                objectFit: 'cover'
                                            }}
                                        />
                                        <IconButton
                                            onClick={removeImage}
                                            sx={{
                                                position: 'absolute',
                                                top: -10,
                                                right: -10,
                                                bgcolor: 'error.main',
                                                color: 'white',
                                                '&:hover': { bgcolor: 'error.dark' }
                                            }}
                                            size="small"
                                        >
                                            <CloseIcon fontSize="small" />
                                        </IconButton>
                                    </Box>
                                ) : (
                                    <Box>
                                        <CloudUpload sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                                        <Typography variant="body2" color="text.secondary" gutterBottom>
                                            اسحب الصورة هنا أو انقر للاختيار
                                        </Typography>
                                        <Button
                                            variant="outlined"
                                            onClick={() => fileInputRef.current?.click()}
                                            startIcon={<CloudUpload />}
                                        >
                                            اختر صورة
                                        </Button>
                                        <Typography variant="caption" display="block" color="text.secondary" mt={1}>
                                            الحد الأقصى: 5 ميجابايت | PNG, JPG, WEBP
                                        </Typography>
                                    </Box>
                                )}
                            </Box>
                        </Grid>

                        {/* Notes */}
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="ملاحظات إضافية"
                                multiline
                                rows={3}
                                value={form.notes}
                                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                            />
                        </Grid>

                        {/* Submit Buttons */}
                        <Grid item xs={12} display="flex" justifyContent="flex-end" gap={2}>
                            <Button variant="outlined" onClick={() => navigate(-1)}>إلغاء</Button>
                            <Button
                                type="submit"
                                variant="contained"
                                size="large"
                                startIcon={loading ? <CircularProgress size={20} /> : <Save />}
                                disabled={loading}
                                sx={{ minWidth: 150 }}
                            >
                                {loading ? 'جاري الحفظ...' : 'حفظ البيانات'}
                            </Button>
                        </Grid>
                    </Grid>
                </form>
            </Paper>
        </Box>
    );
}
