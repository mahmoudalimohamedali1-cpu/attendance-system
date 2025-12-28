import { Box, Grid, Typography, Chip, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Select, FormControl, InputLabel, IconButton } from '@mui/material';
import { Description, CloudUpload, Warning, CheckCircle, Delete, Download, Visibility } from '@mui/icons-material';
import { useState } from 'react';
import { api } from '@/services/api.service';
import { useMutation, useQueryClient } from '@tanstack/react-query';

// Design Theme Colors
const theme = {
    coral: '#E8A87C',
    teal: '#41B3A3',
    navy: '#2D3748',
    white: '#FFFFFF',
    yellow: '#F5C469',
    green: '#81C784',
    red: '#E57373',
};

interface DocumentsTabProps {
    userId: string;
    documentsData?: any;
}

export const DocumentsTab = ({ userId, documentsData }: DocumentsTabProps) => {
    const queryClient = useQueryClient();
    const [uploadOpen, setUploadOpen] = useState(false);
    const [uploadData, setUploadData] = useState({ title: '', type: 'OTHER', expiryDate: '' });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const uploadMutation = useMutation({
        mutationFn: async () => {
            const formData = new FormData();
            formData.append('title', uploadData.title);
            formData.append('type', uploadData.type);
            if (uploadData.expiryDate) formData.append('expiryDate', uploadData.expiryDate);
            if (selectedFile) formData.append('file', selectedFile);

            return api.post(`/employee-profile/${userId}/documents`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
        },
        onSuccess: () => {
            console.log('تم رفع المستند بنجاح');
            queryClient.invalidateQueries({ queryKey: ['employee-documents', userId] });
            setUploadOpen(false);
            setUploadData({ title: '', type: 'OTHER', expiryDate: '' });
            setSelectedFile(null);
        },
        onError: (err: any) => console.error(err?.response?.data?.message || 'فشل رفع المستند'),
    });

    const deleteMutation = useMutation({
        mutationFn: (docId: string) => api.delete(`/employee-profile/${userId}/documents/${docId}`),
        onSuccess: () => {
            console.log('تم حذف المستند');
            queryClient.invalidateQueries({ queryKey: ['employee-documents', userId] });
        },
        onError: (err: any) => console.error(err?.response?.data?.message || 'فشل حذف المستند'),
    });

    const getDocTypeLabel = (type: string) => {
        const types: Record<string, string> = {
            ID_CARD: 'بطاقة الهوية',
            PASSPORT: 'جواز السفر',
            IQAMA: 'الإقامة',
            DRIVING_LICENSE: 'رخصة القيادة',
            DEGREE: 'شهادة علمية',
            CONTRACT: 'عقد العمل',
            MEDICAL: 'شهادة طبية',
            OTHER: 'أخرى',
        };
        return types[type] || type;
    };

    const isExpiringSoon = (date: string | null) => {
        if (!date) return false;
        const daysUntil = Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return daysUntil <= 30 && daysUntil > 0;
    };

    const isExpired = (date: string | null) => {
        if (!date) return false;
        return new Date(date) < new Date();
    };

    const formatDate = (date: string | null) => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('ar-SA');
    };

    const documents = documentsData?.documents || [];
    const expiringDocs = documentsData?.expiringDocuments || [];

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Expiring Alert */}
            {expiringDocs.length > 0 && (
                <Box sx={{ bgcolor: `${theme.yellow}20`, borderRadius: 4, p: 3, border: `1px solid ${theme.yellow}` }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <Warning sx={{ color: theme.yellow }} />
                        <Typography variant="h6" fontWeight="bold" color={theme.navy}>مستندات قريبة الانتهاء</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        {expiringDocs.map((doc: any) => (
                            <Chip
                                key={doc.id}
                                label={`${doc.title} - ${formatDate(doc.expiryDate)}`}
                                sx={{ bgcolor: theme.yellow, color: theme.white }}
                            />
                        ))}
                    </Box>
                </Box>
            )}

            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" fontWeight="bold" color={theme.navy}>
                    المستندات ({documents.length})
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<CloudUpload />}
                    onClick={() => setUploadOpen(true)}
                    sx={{ bgcolor: theme.teal, borderRadius: 3, '&:hover': { bgcolor: theme.coral } }}
                >
                    رفع مستند
                </Button>
            </Box>

            {/* Documents Grid */}
            <Grid container spacing={3}>
                {documents.map((doc: any) => (
                    <Grid item xs={12} sm={6} md={4} key={doc.id}>
                        <Box
                            sx={{
                                bgcolor: theme.white,
                                borderRadius: 4,
                                p: 3,
                                boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
                                border: isExpired(doc.expiryDate) ? `2px solid ${theme.red}` : isExpiringSoon(doc.expiryDate) ? `2px solid ${theme.yellow}` : 'none',
                                position: 'relative',
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: `${theme.coral}20` }}>
                                    <Description sx={{ color: theme.coral }} />
                                </Box>
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="body1" fontWeight="bold" color={theme.navy} sx={{
                                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 150
                                    }}>
                                        {doc.title}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">{getDocTypeLabel(doc.type)}</Typography>
                                </Box>
                                <IconButton size="small" color="error" onClick={() => deleteMutation.mutate(doc.id)} sx={{ position: 'absolute', top: 10, left: 10 }}>
                                    <Delete fontSize="small" />
                                </IconButton>
                            </Box>

                            {doc.expiryDate && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                    {isExpired(doc.expiryDate) ? (
                                        <Chip label="منتهي" size="small" sx={{ bgcolor: theme.red, color: theme.white }} />
                                    ) : isExpiringSoon(doc.expiryDate) ? (
                                        <Chip label="قريب الانتهاء" size="small" sx={{ bgcolor: theme.yellow, color: theme.white }} />
                                    ) : (
                                        <Chip label="ساري" size="small" sx={{ bgcolor: theme.green, color: theme.white }} icon={<CheckCircle sx={{ color: theme.white }} />} />
                                    )}
                                    <Typography variant="caption" color="text.secondary">
                                        ينتهي: {formatDate(doc.expiryDate)}
                                    </Typography>
                                </Box>
                            )}

                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<Visibility />}
                                    sx={{ flex: 1, borderColor: theme.teal, color: theme.teal }}
                                    onClick={() => window.open(doc.fileUrl, '_blank')}
                                >
                                    عرض
                                </Button>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<Download />}
                                    sx={{ flex: 1, borderColor: theme.navy, color: theme.navy }}
                                    href={doc.fileUrl}
                                    download
                                >
                                    تحميل
                                </Button>
                            </Box>
                        </Box>
                    </Grid>
                ))}

                {documents.length === 0 && (
                    <Grid item xs={12}>
                        <Box sx={{ bgcolor: theme.white, borderRadius: 4, p: 6, textAlign: 'center' }}>
                            <Description sx={{ fontSize: 60, color: theme.coral, mb: 2 }} />
                            <Typography variant="h6" color="text.secondary">لا توجد مستندات</Typography>
                            <Button
                                variant="outlined"
                                startIcon={<CloudUpload />}
                                onClick={() => setUploadOpen(true)}
                                sx={{ mt: 2, borderColor: theme.teal, color: theme.teal }}
                            >
                                رفع مستند جديد
                            </Button>
                        </Box>
                    </Grid>
                )}
            </Grid>

            {/* Upload Dialog */}
            <Dialog open={uploadOpen} onClose={() => setUploadOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>رفع مستند جديد</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                        <TextField
                            label="عنوان المستند"
                            fullWidth
                            value={uploadData.title}
                            onChange={(e) => setUploadData({ ...uploadData, title: e.target.value })}
                        />
                        <FormControl fullWidth>
                            <InputLabel>نوع المستند</InputLabel>
                            <Select
                                label="نوع المستند"
                                value={uploadData.type}
                                onChange={(e) => setUploadData({ ...uploadData, type: e.target.value })}
                            >
                                <MenuItem value="ID_CARD">بطاقة الهوية</MenuItem>
                                <MenuItem value="PASSPORT">جواز السفر</MenuItem>
                                <MenuItem value="IQAMA">الإقامة</MenuItem>
                                <MenuItem value="DRIVING_LICENSE">رخصة القيادة</MenuItem>
                                <MenuItem value="DEGREE">شهادة علمية</MenuItem>
                                <MenuItem value="CONTRACT">عقد العمل</MenuItem>
                                <MenuItem value="OTHER">أخرى</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField
                            label="تاريخ الانتهاء"
                            type="date"
                            InputLabelProps={{ shrink: true }}
                            fullWidth
                            value={uploadData.expiryDate}
                            onChange={(e) => setUploadData({ ...uploadData, expiryDate: e.target.value })}
                        />
                        <Button
                            variant="outlined"
                            component="label"
                            startIcon={<CloudUpload />}
                            color={selectedFile ? "success" : "primary"}
                        >
                            {selectedFile ? `تم اختيار: ${selectedFile.name}` : "اختر ملف"}
                            <input type="file" hidden onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
                        </Button>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setUploadOpen(false)}>إلغاء</Button>
                    <Button
                        variant="contained"
                        sx={{ bgcolor: theme.teal }}
                        onClick={() => uploadMutation.mutate()}
                        disabled={uploadMutation.isPending || !selectedFile || !uploadData.title}
                    >
                        {uploadMutation.isPending ? "جاري الرفع..." : "رفع"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default DocumentsTab;
