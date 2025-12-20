import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Box,
    Typography,
    Button,
    TextField,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    IconButton,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert,
    CircularProgress,
    Paper,
    Divider,
} from '@mui/material';
import {
    AccountBalance,
    Add,
    Delete,
    Star,
    StarBorder,
    Security,
} from '@mui/icons-material';
import { api } from '@/services/api.service';

interface BankAccount {
    id: string;
    iban: string;
    bankName: string;
    bankCode?: string;
    isPrimary: boolean;
    verifiedAt?: string;
}

interface BankAccountsTabProps {
    userId: string;
}

export const BankAccountsTab = ({ userId }: BankAccountsTabProps) => {
    const queryClient = useQueryClient();
    const [openAdd, setOpenAdd] = useState(false);
    const [formData, setFormData] = useState({
        iban: 'SA',
        bankName: '',
        bankCode: '',
    });
    const [error, setError] = useState<string | null>(null);

    const { data: accounts = [], isLoading } = useQuery<BankAccount[]>({
        queryKey: ['bank-accounts', userId],
        queryFn: () => api.get(`/bank-accounts/user/${userId}`),
    });

    const createMutation = useMutation({
        mutationFn: (data: typeof formData) => api.post('/bank-accounts', { ...data, userId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bank-accounts', userId] });
            setOpenAdd(false);
            setFormData({ iban: 'SA', bankName: '', bankCode: '' });
            setError(null);
        },
        onError: (err: any) => setError(err.response?.data?.message || 'خطأ في إضافة الحساب'),
    });

    const setPrimaryMutation = useMutation({
        mutationFn: (id: string) => api.patch(`/bank-accounts/${id}/primary`, {}),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bank-accounts', userId] }),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/bank-accounts/${id}`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bank-accounts', userId] }),
    });

    const handleAdd = () => {
        if (!/^SA\d{22}$/.test(formData.iban)) {
            setError('رقام الـ IBAN يجب أن يبدأ بـ SA ويتبعه 22 رقماً');
            return;
        }
        createMutation.mutate(formData);
    };

    if (isLoading) return <Box display="flex" justifyContent="center" p={3}><CircularProgress /></Box>;

    return (
        <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold">الحسابات البنكية</Typography>
                <Button startIcon={<Add />} variant="contained" size="small" onClick={() => setOpenAdd(true)}>
                    إضافة حساب
                </Button>
            </Box>

            {accounts.length === 0 ? (
                <Alert severity="info">لم يتم إضافة حسابات بنكية لهذا الموظف بعد.</Alert>
            ) : (
                <Paper variant="outlined">
                    <List disablePadding>
                        {accounts.map((acc, index) => (
                            <Box key={acc.id}>
                                {index > 0 && <Divider />}
                                <ListItem
                                    secondaryAction={
                                        <Box>
                                            <IconButton
                                                color="primary"
                                                onClick={() => setPrimaryMutation.mutate(acc.id)}
                                                disabled={acc.isPrimary}
                                            >
                                                {acc.isPrimary ? <Star /> : <StarBorder />}
                                            </IconButton>
                                            <IconButton color="error" onClick={() => {
                                                if (confirm('هل أنت متأكد من حذف هذا الحساب؟')) {
                                                    deleteMutation.mutate(acc.id);
                                                }
                                            }}>
                                                <Delete />
                                            </IconButton>
                                        </Box>
                                    }
                                >
                                    <ListItemIcon>
                                        <AccountBalance color={acc.isPrimary ? "primary" : "action"} />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <Typography fontWeight="bold">{acc.bankName}</Typography>
                                                {acc.isPrimary && <Chip label="رئيسي" color="primary" size="small" />}
                                                {acc.verifiedAt && <Security color="success" sx={{ fontSize: 16 }} />}
                                            </Box>
                                        }
                                        secondary={
                                            <Typography variant="body2" sx={{ fontFamily: 'monospace', mt: 0.5 }}>
                                                {acc.iban}
                                            </Typography>
                                        }
                                    />
                                </ListItem>
                            </Box>
                        ))}
                    </List>
                </Paper>
            )}

            {/* Dialog إضافة حساب */}
            <Dialog open={openAdd} onClose={() => setOpenAdd(false)} fullWidth maxWidth="xs">
                <DialogTitle>إضافة حساب بنكي جديد</DialogTitle>
                <DialogContent dividers>
                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                    <TextField
                        fullWidth
                        label="رقم الـ IBAN"
                        placeholder="SA..."
                        value={formData.iban}
                        onChange={(e) => setFormData({ ...formData, iban: e.target.value.toUpperCase() })}
                        sx={{ mb: 2, mt: 1 }}
                        helperText="يجب أن يبدأ بـ SA ويتبعه 22 رقماً"
                    />
                    <TextField
                        fullWidth
                        label="اسم البنك"
                        value={formData.bankName}
                        onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                        sx={{ mb: 2 }}
                    />
                    <TextField
                        fullWidth
                        label="كود البنك (اختياري)"
                        value={formData.bankCode}
                        onChange={(e) => setFormData({ ...formData, bankCode: e.target.value })}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenAdd(false)}>إلغاء</Button>
                    <Button variant="contained" onClick={handleAdd} disabled={createMutation.isPending}>
                        {createMutation.isPending ? <CircularProgress size={24} /> : 'إضافة'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};
