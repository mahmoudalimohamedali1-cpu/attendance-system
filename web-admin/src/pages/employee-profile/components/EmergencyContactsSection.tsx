import { useState } from 'react';
import {
    Box,
    Typography,
    IconButton,
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
    Alert,
    Grid,
} from '@mui/material';
import {
    Add,
    Edit,
    Delete,
    Phone,
    Email,
    Person,
    ContactEmergency,
} from '@mui/icons-material';
import { api } from '@/services/api.service';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// Design Theme Colors
const theme = {
    coral: '#E8A87C',
    peach: '#F9DCC4',
    teal: '#41B3A3',
    navy: '#2D3748',
    white: '#FFFFFF',
    yellow: '#F5C469',
    green: '#81C784',
    red: '#E57373',
};

// نوع العلاقة مع الترجمة العربية
const relationshipTypes: Record<string, string> = {
    SPOUSE: 'زوج/زوجة',
    PARENT: 'أب/أم',
    SIBLING: 'أخ/أخت',
    CHILD: 'ابن/ابنة',
    RELATIVE: 'قريب',
    FRIEND: 'صديق',
    NEIGHBOR: 'جار',
    COLLEAGUE: 'زميل عمل',
    OTHER: 'آخر',
};

interface EmergencyContact {
    id: string;
    name: string;
    nameAr?: string;
    relationship: string;
    phone: string;
    alternatePhone?: string;
    email?: string;
    address?: string;
    city?: string;
    country?: string;
    priority: number;
    isActive: boolean;
}

interface EmergencyContactsSectionProps {
    userId: string;
}

const initialContactForm = {
    name: '',
    nameAr: '',
    relationship: 'RELATIVE',
    phone: '',
    alternatePhone: '',
    email: '',
    address: '',
    city: '',
    country: '',
    priority: 1,
};

export const EmergencyContactsSection = ({ userId }: EmergencyContactsSectionProps) => {
    const queryClient = useQueryClient();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [selectedContact, setSelectedContact] = useState<EmergencyContact | null>(null);
    const [formData, setFormData] = useState(initialContactForm);

    // Query لجلب جهات الاتصال
    const { data: contactsData, isLoading } = useQuery({
        queryKey: ['emergency-contacts', userId],
        queryFn: () => api.get(`/employee-profile/${userId}/emergency-contacts`),
        enabled: !!userId,
    });

    const contacts: EmergencyContact[] = Array.isArray(contactsData) ? contactsData : [];

    // Mutation لإنشاء جهة اتصال
    const createMutation = useMutation({
        mutationFn: (data: typeof initialContactForm) =>
            api.post(`/employee-profile/${userId}/emergency-contacts`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['emergency-contacts', userId] });
            setIsAddModalOpen(false);
            resetForm();
        },
        onError: (err: any) => {
            alert(err?.response?.data?.message || 'فشل إضافة جهة الاتصال');
        },
    });

    // Mutation لتحديث جهة اتصال
    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<typeof initialContactForm> }) =>
            api.patch(`/employee-profile/${userId}/emergency-contacts/${id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['emergency-contacts', userId] });
            setIsEditModalOpen(false);
            setSelectedContact(null);
            resetForm();
        },
        onError: (err: any) => {
            alert(err?.response?.data?.message || 'فشل تحديث جهة الاتصال');
        },
    });

    // Mutation لحذف جهة اتصال
    const deleteMutation = useMutation({
        mutationFn: (contactId: string) =>
            api.delete(`/employee-profile/${userId}/emergency-contacts/${contactId}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['emergency-contacts', userId] });
            setIsDeleteConfirmOpen(false);
            setSelectedContact(null);
        },
        onError: (err: any) => {
            alert(err?.response?.data?.message || 'فشل حذف جهة الاتصال');
        },
    });

    const resetForm = () => {
        setFormData(initialContactForm);
    };

    const handleOpenAdd = () => {
        resetForm();
        // تعيين الأولوية التالية تلقائياً
        setFormData({
            ...initialContactForm,
            priority: contacts.length + 1,
        });
        setIsAddModalOpen(true);
    };

    const handleOpenEdit = (contact: EmergencyContact) => {
        setSelectedContact(contact);
        setFormData({
            name: contact.name || '',
            nameAr: contact.nameAr || '',
            relationship: contact.relationship || 'RELATIVE',
            phone: contact.phone || '',
            alternatePhone: contact.alternatePhone || '',
            email: contact.email || '',
            address: contact.address || '',
            city: contact.city || '',
            country: contact.country || '',
            priority: contact.priority || 1,
        });
        setIsEditModalOpen(true);
    };

    const handleOpenDelete = (contact: EmergencyContact) => {
        setSelectedContact(contact);
        setIsDeleteConfirmOpen(true);
    };

    const handleCreate = () => {
        createMutation.mutate(formData);
    };

    const handleUpdate = () => {
        if (selectedContact) {
            updateMutation.mutate({ id: selectedContact.id, data: formData });
        }
    };

    const handleDelete = () => {
        if (selectedContact) {
            deleteMutation.mutate(selectedContact.id);
        }
    };

    // التحقق من إمكانية إضافة جهة اتصال جديدة (الحد الأقصى 3)
    const canAddContact = contacts.length < 3;

    return (
        <Box
            sx={{
                bgcolor: theme.white,
                borderRadius: 4,
                p: 3,
                boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
            }}
        >
            {/* العنوان وزر الإضافة */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: `${theme.red}20` }}>
                        <ContactEmergency sx={{ color: theme.red }} />
                    </Box>
                    <Typography variant="h6" fontWeight="bold" color={theme.navy}>
                        جهات الاتصال الطارئة
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={handleOpenAdd}
                    disabled={!canAddContact}
                    sx={{
                        bgcolor: theme.teal,
                        borderRadius: 3,
                        '&:hover': { bgcolor: theme.coral },
                        '&.Mui-disabled': { bgcolor: '#ccc' },
                    }}
                >
                    إضافة جهة اتصال
                </Button>
            </Box>

            {/* تنبيه الحد الأقصى */}
            {!canAddContact && (
                <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
                    تم الوصول للحد الأقصى من جهات الاتصال الطارئة (3 جهات). يمكنك تعديل أو حذف جهة اتصال موجودة لإضافة جهة جديدة.
                </Alert>
            )}

            {/* قائمة جهات الاتصال */}
            {isLoading ? (
                <Typography color="text.secondary">جاري التحميل...</Typography>
            ) : contacts.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                    <ContactEmergency sx={{ fontSize: 60, color: theme.coral, mb: 2 }} />
                    <Typography variant="body1" color="text.secondary">
                        لا توجد جهات اتصال طارئة
                    </Typography>
                    <Button
                        variant="outlined"
                        startIcon={<Add />}
                        onClick={handleOpenAdd}
                        sx={{ mt: 2, borderColor: theme.teal, color: theme.teal }}
                    >
                        إضافة جهة اتصال طارئة
                    </Button>
                </Box>
            ) : (
                <Grid container spacing={2}>
                    {contacts.map((contact) => (
                        <Grid item xs={12} key={contact.id}>
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    p: 2,
                                    borderRadius: 3,
                                    bgcolor: `${theme.peach}30`,
                                    border: `1px solid ${theme.peach}`,
                                    transition: 'all 0.2s',
                                    '&:hover': {
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                                    },
                                }}
                            >
                                {/* معلومات جهة الاتصال */}
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                                    <Box
                                        sx={{
                                            width: 48,
                                            height: 48,
                                            borderRadius: '50%',
                                            bgcolor: theme.coral,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: theme.white,
                                            fontWeight: 'bold',
                                            fontSize: '1.2rem',
                                        }}
                                    >
                                        {contact.priority}
                                    </Box>
                                    <Box sx={{ flex: 1 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                            <Person fontSize="small" sx={{ color: theme.navy }} />
                                            <Typography variant="body1" fontWeight="bold" color={theme.navy}>
                                                {contact.name}
                                                {contact.nameAr && ` (${contact.nameAr})`}
                                            </Typography>
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    bgcolor: theme.teal,
                                                    color: theme.white,
                                                    px: 1,
                                                    py: 0.25,
                                                    borderRadius: 2,
                                                    fontSize: '0.7rem',
                                                }}
                                            >
                                                {relationshipTypes[contact.relationship] || contact.relationship}
                                            </Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <Phone fontSize="small" sx={{ color: theme.teal }} />
                                                <Typography variant="body2" color="text.secondary" dir="ltr">
                                                    {contact.phone}
                                                </Typography>
                                            </Box>
                                            {contact.alternatePhone && (
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <Phone fontSize="small" sx={{ color: theme.coral }} />
                                                    <Typography variant="body2" color="text.secondary" dir="ltr">
                                                        {contact.alternatePhone}
                                                    </Typography>
                                                </Box>
                                            )}
                                            {contact.email && (
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <Email fontSize="small" sx={{ color: theme.yellow }} />
                                                    <Typography variant="body2" color="text.secondary">
                                                        {contact.email}
                                                    </Typography>
                                                </Box>
                                            )}
                                        </Box>
                                    </Box>
                                </Box>

                                {/* أزرار الإجراءات */}
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <IconButton
                                        size="small"
                                        onClick={() => handleOpenEdit(contact)}
                                        sx={{
                                            bgcolor: `${theme.teal}20`,
                                            color: theme.teal,
                                            '&:hover': { bgcolor: `${theme.teal}40` },
                                        }}
                                    >
                                        <Edit fontSize="small" />
                                    </IconButton>
                                    <IconButton
                                        size="small"
                                        onClick={() => handleOpenDelete(contact)}
                                        sx={{
                                            bgcolor: `${theme.red}20`,
                                            color: theme.red,
                                            '&:hover': { bgcolor: `${theme.red}40` },
                                        }}
                                    >
                                        <Delete fontSize="small" />
                                    </IconButton>
                                </Box>
                            </Box>
                        </Grid>
                    ))}
                </Grid>
            )}

            {/* مودال الإضافة */}
            <Dialog open={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 'bold', color: theme.navy }}>
                    إضافة جهة اتصال طارئة جديدة
                </DialogTitle>
                <DialogContent>
                    <ContactForm formData={formData} setFormData={setFormData} />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setIsAddModalOpen(false)} color="inherit">
                        إلغاء
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleCreate}
                        disabled={createMutation.isPending || !formData.name || !formData.phone}
                        sx={{ bgcolor: theme.teal, '&:hover': { bgcolor: theme.coral } }}
                    >
                        {createMutation.isPending ? 'جاري الإضافة...' : 'إضافة'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* مودال التعديل */}
            <Dialog open={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 'bold', color: theme.navy }}>
                    تعديل جهة الاتصال الطارئة
                </DialogTitle>
                <DialogContent>
                    <ContactForm formData={formData} setFormData={setFormData} />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setIsEditModalOpen(false)} color="inherit">
                        إلغاء
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleUpdate}
                        disabled={updateMutation.isPending || !formData.name || !formData.phone}
                        sx={{ bgcolor: theme.teal, '&:hover': { bgcolor: theme.coral } }}
                    >
                        {updateMutation.isPending ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* مودال تأكيد الحذف */}
            <Dialog open={isDeleteConfirmOpen} onClose={() => setIsDeleteConfirmOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 'bold', color: theme.red }}>
                    تأكيد الحذف
                </DialogTitle>
                <DialogContent>
                    <Typography>
                        هل أنت متأكد من حذف جهة الاتصال "{selectedContact?.name}"؟
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setIsDeleteConfirmOpen(false)} color="inherit">
                        إلغاء
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleDelete}
                        disabled={deleteMutation.isPending}
                        sx={{ bgcolor: theme.red, '&:hover': { bgcolor: '#c62828' } }}
                    >
                        {deleteMutation.isPending ? 'جاري الحذف...' : 'حذف'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

// مكون النموذج المشترك
const ContactForm = ({
    formData,
    setFormData,
}: {
    formData: typeof initialContactForm;
    setFormData: React.Dispatch<React.SetStateAction<typeof initialContactForm>>;
}) => {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                    <TextField
                        label="الاسم (بالإنجليزية)"
                        fullWidth
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <TextField
                        label="الاسم (بالعربية)"
                        fullWidth
                        value={formData.nameAr}
                        onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                    />
                </Grid>
            </Grid>

            <FormControl fullWidth>
                <InputLabel>نوع العلاقة *</InputLabel>
                <Select
                    label="نوع العلاقة *"
                    value={formData.relationship}
                    onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                >
                    {Object.entries(relationshipTypes).map(([value, label]) => (
                        <MenuItem key={value} value={value}>
                            {label}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                    <TextField
                        label="رقم الهاتف الأساسي"
                        fullWidth
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        dir="ltr"
                        placeholder="966xxxxxxxxx"
                    />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <TextField
                        label="رقم هاتف بديل"
                        fullWidth
                        value={formData.alternatePhone}
                        onChange={(e) => setFormData({ ...formData, alternatePhone: e.target.value })}
                        dir="ltr"
                        placeholder="966xxxxxxxxx"
                    />
                </Grid>
            </Grid>

            <TextField
                label="البريد الإلكتروني"
                type="email"
                fullWidth
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                dir="ltr"
            />

            <TextField
                label="العنوان"
                fullWidth
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />

            <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                    <TextField
                        label="المدينة"
                        fullWidth
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <TextField
                        label="الدولة"
                        fullWidth
                        value={formData.country}
                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    />
                </Grid>
            </Grid>

            <FormControl fullWidth>
                <InputLabel>الأولوية</InputLabel>
                <Select
                    label="الأولوية"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })}
                >
                    <MenuItem value={1}>1 - الأول</MenuItem>
                    <MenuItem value={2}>2 - الثاني</MenuItem>
                    <MenuItem value={3}>3 - الثالث</MenuItem>
                </Select>
            </FormControl>
        </Box>
    );
};

export default EmergencyContactsSection;
