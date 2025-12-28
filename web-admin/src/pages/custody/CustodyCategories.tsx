import { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Button, IconButton, TextField, Dialog, DialogTitle,
    DialogContent, DialogActions, CircularProgress, Alert, Switch, FormControlLabel,
    Chip, Snackbar, Tooltip, InputAdornment
} from '@mui/material';
import { Add, Edit, Delete, Refresh, EmojiEmotions, Save } from '@mui/icons-material';
import custodyService, { CustodyCategory } from '@/services/custody.service';

// Common emoji options for quick selection
const EMOJI_OPTIONS = ['💻', '📱', '🖨️', '🖥️', '⌨️', '🔌', '📷', '🎧', '🔧', '🚗', '🪑', '📦'];

export default function CustodyCategories() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [categories, setCategories] = useState<CustodyCategory[]>([]);
    const [dialog, setDialog] = useState<{ open: boolean; mode: 'add' | 'edit'; data: Partial<CustodyCategory> }>({
        open: false, mode: 'add', data: {}
    });

    // Toast notification state
    const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false, message: '', severity: 'success'
    });

    // Validation errors
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

    // Emoji picker state
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    const showToast = (message: string, severity: 'success' | 'error') => {
        setToast({ open: true, message, severity });
    };

    const fetchCategories = async () => {
        try {
            setLoading(true);
            const data = await custodyService.getCategories();
            setCategories(data);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'فشل في تحميل البيانات');
            showToast('فشل في تحميل الفئات', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchCategories(); }, []);

    const validateForm = (): boolean => {
        const errors: Record<string, string> = {};

        if (!dialog.data.name?.trim()) {
            errors.name = 'اسم الفئة مطلوب';
        }

        if (dialog.data.depreciationYears && dialog.data.depreciationYears < 1) {
            errors.depreciationYears = 'سنوات الإهلاك يجب أن تكون 1 أو أكثر';
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSave = async () => {
        if (!validateForm()) {
            showToast('يرجى تصحيح الأخطاء في النموذج', 'error');
            return;
        }

        try {
            setSaving(true);
            if (dialog.mode === 'add') {
                await custodyService.createCategory(dialog.data);
                showToast(`تم إنشاء الفئة "${dialog.data.name}" بنجاح! 🎉`, 'success');
            } else {
                await custodyService.updateCategory(dialog.data.id!, dialog.data);
                showToast(`تم تحديث الفئة "${dialog.data.name}" بنجاح! ✅`, 'success');
            }
            setDialog({ open: false, mode: 'add', data: {} });
            setValidationErrors({});
            fetchCategories();
        } catch (err: any) {
            showToast(err.response?.data?.message || err.message || 'فشل في الحفظ', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`هل أنت متأكد من حذف الفئة "${name}"؟`)) return;
        try {
            await custodyService.deleteCategory(id);
            showToast(`تم حذف الفئة "${name}" بنجاح`, 'success');
            fetchCategories();
        } catch (err: any) {
            showToast(err.response?.data?.message || 'فشل في الحذف', 'error');
        }
    };

    const openAddDialog = () => {
        setDialog({
            open: true,
            mode: 'add',
            data: { requiresApproval: true, requiresSerialNumber: true }
        });
        setValidationErrors({});
    };

    const openEditDialog = (cat: CustodyCategory) => {
        setDialog({ open: true, mode: 'edit', data: { ...cat } });
        setValidationErrors({});
    };

    return (
        <Box p={3}>
            {/* Toast Notification */}
            <Snackbar
                open={toast.open}
                autoHideDuration={4000}
                onClose={() => setToast(prev => ({ ...prev, open: false }))}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert
                    onClose={() => setToast(prev => ({ ...prev, open: false }))}
                    severity={toast.severity}
                    sx={{ width: '100%', fontWeight: 'bold' }}
                    variant="filled"
                >
                    {toast.message}
                </Alert>
            </Snackbar>

            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h5" fontWeight="bold">📂 فئات العهد</Typography>
                <Box display="flex" gap={1}>
                    <Tooltip title="تحديث">
                        <IconButton onClick={fetchCategories} disabled={loading}>
                            <Refresh />
                        </IconButton>
                    </Tooltip>
                    <Button variant="contained" startIcon={<Add />} onClick={openAddDialog}>
                        إضافة فئة
                    </Button>
                </Box>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Paper>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ bgcolor: 'grey.100' }}>
                                <TableCell>الأيقونة</TableCell>
                                <TableCell>الاسم</TableCell>
                                <TableCell>الوصف</TableCell>
                                <TableCell>سنوات الإهلاك</TableCell>
                                <TableCell>عدد العهد</TableCell>
                                <TableCell>تتطلب موافقة</TableCell>
                                <TableCell>تتطلب رقم تسلسلي</TableCell>
                                <TableCell align="center">إجراءات</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={8} align="center"><CircularProgress size={30} /></TableCell></TableRow>
                            ) : categories.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} align="center">
                                        <Box py={4}>
                                            <Typography color="text.secondary">لا توجد فئات</Typography>
                                            <Button variant="outlined" startIcon={<Add />} onClick={openAddDialog} sx={{ mt: 2 }}>
                                                أضف أول فئة
                                            </Button>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ) : categories.map((cat) => (
                                <TableRow key={cat.id} hover>
                                    <TableCell>
                                        <Typography fontSize={24}>{cat.icon || '📦'}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography fontWeight="bold">{cat.name}</Typography>
                                        {cat.nameEn && <Typography variant="caption" color="text.secondary">{cat.nameEn}</Typography>}
                                    </TableCell>
                                    <TableCell>{cat.description || '-'}</TableCell>
                                    <TableCell>
                                        {cat.depreciationYears ? (
                                            <Chip size="small" label={`${cat.depreciationYears} سنوات`} color="info" />
                                        ) : '-'}
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            size="small"
                                            label={cat._count?.items || 0}
                                            color={cat._count?.items ? 'primary' : 'default'}
                                        />
                                    </TableCell>
                                    <TableCell>{cat.requiresApproval ? '✅' : '❌'}</TableCell>
                                    <TableCell>{cat.requiresSerialNumber ? '✅' : '❌'}</TableCell>
                                    <TableCell align="center">
                                        <Tooltip title="تعديل">
                                            <IconButton size="small" onClick={() => openEditDialog(cat)}>
                                                <Edit />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="حذف">
                                            <IconButton
                                                size="small"
                                                color="error"
                                                onClick={() => handleDelete(cat.id, cat.name)}
                                                disabled={!!cat._count?.items}
                                            >
                                                <Delete />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* Add/Edit Dialog */}
            <Dialog
                open={dialog.open}
                onClose={() => !saving && setDialog({ ...dialog, open: false })}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle sx={{ pb: 1 }}>
                    {dialog.mode === 'add' ? '📂 إضافة فئة جديدة' : '✏️ تعديل الفئة'}
                </DialogTitle>
                <DialogContent>
                    <Box display="flex" flexDirection="column" gap={2} mt={1}>
                        <TextField
                            label="الاسم *"
                            value={dialog.data.name || ''}
                            onChange={(e) => {
                                setDialog({ ...dialog, data: { ...dialog.data, name: e.target.value } });
                                setValidationErrors(prev => ({ ...prev, name: '' }));
                            }}
                            error={!!validationErrors.name}
                            helperText={validationErrors.name}
                            disabled={saving}
                        />
                        <TextField
                            label="الاسم بالإنجليزية"
                            value={dialog.data.nameEn || ''}
                            onChange={(e) => setDialog({ ...dialog, data: { ...dialog.data, nameEn: e.target.value } })}
                            disabled={saving}
                        />
                        <TextField
                            label="الوصف"
                            multiline
                            rows={2}
                            value={dialog.data.description || ''}
                            onChange={(e) => setDialog({ ...dialog, data: { ...dialog.data, description: e.target.value } })}
                            disabled={saving}
                        />

                        {/* Enhanced Emoji Picker */}
                        <Box>
                            <TextField
                                label="الأيقونة (emoji)"
                                value={dialog.data.icon || ''}
                                onChange={(e) => setDialog({ ...dialog, data: { ...dialog.data, icon: e.target.value } })}
                                disabled={saving}
                                InputProps={{
                                    startAdornment: dialog.data.icon && (
                                        <InputAdornment position="start">
                                            <Typography fontSize={24}>{dialog.data.icon}</Typography>
                                        </InputAdornment>
                                    ),
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <Tooltip title="اختر أيقونة">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                                >
                                                    <EmojiEmotions />
                                                </IconButton>
                                            </Tooltip>
                                        </InputAdornment>
                                    )
                                }}
                            />
                            {showEmojiPicker && (
                                <Box
                                    display="flex"
                                    flexWrap="wrap"
                                    gap={1}
                                    mt={1}
                                    p={1}
                                    bgcolor="grey.100"
                                    borderRadius={1}
                                >
                                    {EMOJI_OPTIONS.map((emoji) => (
                                        <Button
                                            key={emoji}
                                            variant={dialog.data.icon === emoji ? 'contained' : 'outlined'}
                                            size="small"
                                            onClick={() => {
                                                setDialog({ ...dialog, data: { ...dialog.data, icon: emoji } });
                                                setShowEmojiPicker(false);
                                            }}
                                            sx={{ minWidth: 40, fontSize: 20 }}
                                        >
                                            {emoji}
                                        </Button>
                                    ))}
                                </Box>
                            )}
                        </Box>

                        <TextField
                            label="سنوات الإهلاك"
                            type="number"
                            value={dialog.data.depreciationYears || ''}
                            onChange={(e) => setDialog({ ...dialog, data: { ...dialog.data, depreciationYears: parseInt(e.target.value) || undefined } })}
                            error={!!validationErrors.depreciationYears}
                            helperText={validationErrors.depreciationYears || 'العمر الافتراضي للعهدة بالسنوات'}
                            disabled={saving}
                            InputProps={{ inputProps: { min: 1 } }}
                        />
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={dialog.data.requiresApproval ?? true}
                                    onChange={(e) => setDialog({ ...dialog, data: { ...dialog.data, requiresApproval: e.target.checked } })}
                                    disabled={saving}
                                />
                            }
                            label="تتطلب موافقة للتسليم"
                        />
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={dialog.data.requiresSerialNumber ?? true}
                                    onChange={(e) => setDialog({ ...dialog, data: { ...dialog.data, requiresSerialNumber: e.target.checked } })}
                                    disabled={saving}
                                />
                            }
                            label="تتطلب رقم تسلسلي"
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setDialog({ ...dialog, open: false })} disabled={saving}>
                        إلغاء
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleSave}
                        disabled={saving}
                        startIcon={saving ? <CircularProgress size={20} /> : <Save />}
                    >
                        {saving ? 'جاري الحفظ...' : 'حفظ'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
