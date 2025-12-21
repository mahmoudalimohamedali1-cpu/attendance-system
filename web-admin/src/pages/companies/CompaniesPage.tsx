import { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Alert,
    CircularProgress,
    Chip,
    IconButton,
    Tooltip,
    Grid,
    Card,
    CardContent,
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Business as CompanyIcon,
    People as UsersIcon,
    Store as BranchIcon,
} from '@mui/icons-material';
import { companiesService, Company, CreateCompanyDto } from '@/services/companies.service';

export default function CompaniesPage() {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

    const [formData, setFormData] = useState<CreateCompanyDto>({
        name: '',
        nameEn: '',
        commercialRegistration: '',
        vatNumber: '',
        email: '',
        phone: '',
        address: '',
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await companiesService.getAll();
            setCompanies(data);
            setError(null);
        } catch (err: any) {
            setError(err.response?.data?.message || 'حدث خطأ');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (company?: Company) => {
        if (company) {
            setSelectedCompany(company);
            setFormData({
                name: company.name,
                nameEn: company.nameEn || '',
                commercialRegistration: company.commercialRegistration || '',
                vatNumber: company.vatNumber || '',
                email: company.email || '',
                phone: company.phone || '',
                address: company.address || '',
            });
        } else {
            setSelectedCompany(null);
            setFormData({
                name: '',
                nameEn: '',
                commercialRegistration: '',
                vatNumber: '',
                email: '',
                phone: '',
                address: '',
            });
        }
        setDialogOpen(true);
    };

    const handleSubmit = async () => {
        try {
            if (selectedCompany) {
                await companiesService.update(selectedCompany.id, formData);
            } else {
                await companiesService.create(formData);
            }
            setDialogOpen(false);
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.message || 'حدث خطأ');
        }
    };

    const handleOpenDelete = (company: Company) => {
        setSelectedCompany(company);
        setDeleteDialogOpen(true);
    };

    const handleDelete = async () => {
        if (!selectedCompany) return;
        try {
            await companiesService.delete(selectedCompany.id);
            setDeleteDialogOpen(false);
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.message || 'حدث خطأ');
        }
    };

    const totalUsers = companies.reduce((sum, c) => sum + (c._count?.users || 0), 0);
    const totalBranches = companies.reduce((sum, c) => sum + (c._count?.branches || 0), 0);

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" p={4}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box p={3}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h5" fontWeight="bold">
                    <CompanyIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    إدارة الشركات
                </Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
                    شركة جديدة
                </Button>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {/* Stats */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={4}>
                    <Card>
                        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <CompanyIcon fontSize="large" color="primary" />
                            <Box>
                                <Typography variant="caption" color="text.secondary">الشركات</Typography>
                                <Typography variant="h4">{companies.length}</Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                    <Card>
                        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <UsersIcon fontSize="large" color="success" />
                            <Box>
                                <Typography variant="caption" color="text.secondary">إجمالي الموظفين</Typography>
                                <Typography variant="h4">{totalUsers}</Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                    <Card>
                        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <BranchIcon fontSize="large" color="warning" />
                            <Box>
                                <Typography variant="caption" color="text.secondary">إجمالي الفروع</Typography>
                                <Typography variant="h4">{totalBranches}</Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow sx={{ bgcolor: 'grey.100' }}>
                            <TableCell>الاسم</TableCell>
                            <TableCell>السجل التجاري</TableCell>
                            <TableCell>الرقم الضريبي</TableCell>
                            <TableCell>الموظفين</TableCell>
                            <TableCell>الفروع</TableCell>
                            <TableCell align="center">الحالة</TableCell>
                            <TableCell align="center">الإجراءات</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {companies.map((c) => (
                            <TableRow key={c.id} hover>
                                <TableCell>
                                    {c.name}
                                    {c.nameEn && (
                                        <Typography variant="caption" color="text.secondary" display="block">
                                            {c.nameEn}
                                        </Typography>
                                    )}
                                </TableCell>
                                <TableCell>{c.commercialRegistration || '-'}</TableCell>
                                <TableCell>{c.vatNumber || '-'}</TableCell>
                                <TableCell>{c._count?.users || 0}</TableCell>
                                <TableCell>{c._count?.branches || 0}</TableCell>
                                <TableCell align="center">
                                    <Chip
                                        label={c.isActive ? 'نشط' : 'غير نشط'}
                                        color={c.isActive ? 'success' : 'default'}
                                        size="small"
                                    />
                                </TableCell>
                                <TableCell align="center">
                                    <Tooltip title="تعديل">
                                        <IconButton size="small" onClick={() => handleOpenDialog(c)}>
                                            <EditIcon />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="حذف">
                                        <IconButton size="small" color="error" onClick={() => handleOpenDelete(c)}>
                                            <DeleteIcon />
                                        </IconButton>
                                    </Tooltip>
                                </TableCell>
                            </TableRow>
                        ))}
                        {companies.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} align="center">
                                    لا توجد شركات
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Dialog */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>{selectedCompany ? 'تعديل الشركة' : 'شركة جديدة'}</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="الاسم بالعربي"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="الاسم بالإنجليزي"
                                value={formData.nameEn}
                                onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="السجل التجاري"
                                value={formData.commercialRegistration}
                                onChange={(e) => setFormData({ ...formData, commercialRegistration: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="الرقم الضريبي"
                                value={formData.vatNumber}
                                onChange={(e) => setFormData({ ...formData, vatNumber: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="البريد الإلكتروني"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="رقم الهاتف"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="العنوان"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
                    <Button variant="contained" onClick={handleSubmit} disabled={!formData.name}>
                        {selectedCompany ? 'تحديث' : 'إنشاء'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle>حذف الشركة</DialogTitle>
                <DialogContent>
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        تحذير: سيتم حذف جميع البيانات المرتبطة بهذه الشركة!
                    </Alert>
                    <Typography>هل أنت متأكد من حذف شركة <strong>{selectedCompany?.name}</strong>؟</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>إلغاء</Button>
                    <Button variant="contained" color="error" onClick={handleDelete}>حذف</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
