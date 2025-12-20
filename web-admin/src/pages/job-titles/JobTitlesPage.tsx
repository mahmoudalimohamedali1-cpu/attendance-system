import React, { useState, useEffect } from 'react';
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
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    FormControlLabel,
    Checkbox,
    Chip,
    Alert,
    CircularProgress,
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Work as WorkIcon,
    SupervisorAccount as ManagerIcon,
    Settings as SettingsIcon,
} from '@mui/icons-material';
import { api } from '@/services/api.service';

interface JobTitle {
    id: string;
    name: string;
    nameEn?: string;
    level: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
    isDirectManager: boolean;
    _count?: { users: number };
    createdAt: string;
}

const levelLabels: Record<string, string> = {
    ADMIN: 'مدير عام',
    MANAGER: 'مدير',
    EMPLOYEE: 'موظف',
};

const levelColors: Record<string, 'error' | 'warning' | 'default'> = {
    ADMIN: 'error',
    MANAGER: 'warning',
    EMPLOYEE: 'default',
};

interface Permission {
    id: string;
    code: string;
    name: string;
    nameEn?: string;
    category: string;
}

interface JobTitlePermission {
    id: string;
    permissionId: string;
    scope: string;
    permission: Permission;
}

const JobTitlesPage: React.FC = () => {
    const [jobTitles, setJobTitles] = useState<JobTitle[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedJobTitle, setSelectedJobTitle] = useState<JobTitle | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        nameEn: '',
        level: 'EMPLOYEE' as 'ADMIN' | 'MANAGER' | 'EMPLOYEE',
        isDirectManager: false,
    });

    // Permissions state
    const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
    const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
    const [jobTitlePermissions, setJobTitlePermissions] = useState<JobTitlePermission[]>([]);
    const [permissionsLoading, setPermissionsLoading] = useState(false);

    useEffect(() => {
        fetchJobTitles();
    }, []);

    const fetchJobTitles = async () => {
        try {
            setLoading(true);
            const data = await api.get<JobTitle[]>('/job-titles');
            setJobTitles(data as JobTitle[]);
            setError(null);
        } catch (err: any) {
            setError(err.response?.data?.message || 'حدث خطأ في تحميل البيانات');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (jobTitle?: JobTitle) => {
        if (jobTitle) {
            setSelectedJobTitle(jobTitle);
            setFormData({
                name: jobTitle.name,
                nameEn: jobTitle.nameEn || '',
                level: jobTitle.level,
                isDirectManager: jobTitle.isDirectManager,
            });
        } else {
            setSelectedJobTitle(null);
            setFormData({
                name: '',
                nameEn: '',
                level: 'EMPLOYEE',
                isDirectManager: false,
            });
        }
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setSelectedJobTitle(null);
    };

    const handleSubmit = async () => {
        try {
            if (selectedJobTitle) {
                await api.put(`/job-titles/${selectedJobTitle.id}`, formData);
            } else {
                await api.post('/job-titles', formData);
            }
            handleCloseDialog();
            fetchJobTitles();
        } catch (err: any) {
            setError(err.response?.data?.message || 'حدث خطأ في حفظ البيانات');
        }
    };

    const handleDelete = async () => {
        if (!selectedJobTitle) return;
        try {
            await api.delete(`/job-titles/${selectedJobTitle.id}`);
            setDeleteDialogOpen(false);
            setSelectedJobTitle(null);
            fetchJobTitles();
        } catch (err: any) {
            setError(err.response?.data?.message || 'حدث خطأ في حذف الدرجة الوظيفية');
            setDeleteDialogOpen(false);
        }
    };

    // Permissions functions
    const fetchAllPermissions = async () => {
        try {
            const data = await api.get<Permission[]>('/permissions');
            setAllPermissions(data as Permission[]);
        } catch (err) {
            console.error('Error fetching permissions:', err);
        }
    };

    const fetchJobTitlePermissions = async (jobTitleId: string) => {
        try {
            setPermissionsLoading(true);
            const data = await api.get<JobTitlePermission[]>(`/job-titles/${jobTitleId}/permissions`);
            setJobTitlePermissions(data as JobTitlePermission[]);
        } catch (err) {
            console.error('Error fetching job title permissions:', err);
        } finally {
            setPermissionsLoading(false);
        }
    };

    const handleOpenPermissionsDialog = async (jt: JobTitle) => {
        setSelectedJobTitle(jt);
        await fetchAllPermissions();
        await fetchJobTitlePermissions(jt.id);
        setPermissionsDialogOpen(true);
    };

    const handleTogglePermission = async (permission: Permission) => {
        if (!selectedJobTitle) return;

        const existing = jobTitlePermissions.find(p => p.permissionId === permission.id);

        try {
            if (existing) {
                await api.delete(`/job-titles/${selectedJobTitle.id}/permissions/${permission.id}`);
            } else {
                await api.post(`/job-titles/${selectedJobTitle.id}/permissions`, {
                    permissionId: permission.id,
                    scope: 'TEAM',
                });
            }
            await fetchJobTitlePermissions(selectedJobTitle.id);
        } catch (err: any) {
            setError(err.response?.data?.message || 'حدث خطأ في تحديث الصلاحيات');
        }
    };

    const isPermissionSelected = (permissionId: string) => {
        return jobTitlePermissions.some(p => p.permissionId === permissionId);
    };

    const getPermissionScope = (permissionId: string) => {
        const perm = jobTitlePermissions.find(p => p.permissionId === permissionId);
        return perm?.scope || 'TEAM';
    };

    const handleScopeChange = async (permissionId: string, newScope: string) => {
        if (!selectedJobTitle) return;

        try {
            // Remove and re-add with new scope
            await api.delete(`/job-titles/${selectedJobTitle.id}/permissions/${permissionId}`);
            await api.post(`/job-titles/${selectedJobTitle.id}/permissions`, {
                permissionId,
                scope: newScope,
            });
            await fetchJobTitlePermissions(selectedJobTitle.id);
        } catch (err: any) {
            setError(err.response?.data?.message || 'حدث خطأ في تحديث النطاق');
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h5" fontWeight="bold">
                    <WorkIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    الدرجات الوظيفية
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog()}
                >
                    إضافة درجة وظيفية
                </Button>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>الاسم</TableCell>
                            <TableCell>الاسم (إنجليزي)</TableCell>
                            <TableCell>الدرجة</TableCell>
                            <TableCell>مدير مباشر</TableCell>
                            <TableCell>عدد الموظفين</TableCell>
                            <TableCell>الإجراءات</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {jobTitles.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} align="center">
                                    <Typography color="textSecondary" py={3}>
                                        لا توجد درجات وظيفية. أضف واحدة جديدة!
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            jobTitles.map((jt) => (
                                <TableRow key={jt.id}>
                                    <TableCell>
                                        <Typography fontWeight="medium">{jt.name}</Typography>
                                    </TableCell>
                                    <TableCell>{jt.nameEn || '-'}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={levelLabels[jt.level]}
                                            color={levelColors[jt.level]}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        {jt.isDirectManager ? (
                                            <Chip
                                                icon={<ManagerIcon />}
                                                label="نعم"
                                                color="success"
                                                size="small"
                                            />
                                        ) : (
                                            <Typography color="textSecondary">لا</Typography>
                                        )}
                                    </TableCell>
                                    <TableCell>{jt._count?.users || 0}</TableCell>
                                    <TableCell>
                                        <IconButton
                                            size="small"
                                            color="primary"
                                            onClick={() => handleOpenDialog(jt)}
                                            title="تعديل"
                                        >
                                            <EditIcon />
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            color="secondary"
                                            onClick={() => handleOpenPermissionsDialog(jt)}
                                            title="إدارة الصلاحيات"
                                        >
                                            <SettingsIcon />
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            color="error"
                                            onClick={() => {
                                                setSelectedJobTitle(jt);
                                                setDeleteDialogOpen(true);
                                            }}
                                            disabled={(jt._count?.users || 0) > 0}
                                            title="حذف"
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Add/Edit Dialog */}
            <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {selectedJobTitle ? 'تعديل درجة وظيفية' : 'إضافة درجة وظيفية جديدة'}
                </DialogTitle>
                <DialogContent>
                    <Box display="flex" flexDirection="column" gap={2} mt={2}>
                        <TextField
                            label="الاسم بالعربي"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            fullWidth
                            required
                        />
                        <TextField
                            label="الاسم بالإنجليزي (اختياري)"
                            value={formData.nameEn}
                            onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                            fullWidth
                        />
                        <FormControl fullWidth>
                            <InputLabel>الدرجة</InputLabel>
                            <Select
                                value={formData.level}
                                label="الدرجة"
                                onChange={(e) =>
                                    setFormData({ ...formData, level: e.target.value as any })
                                }
                            >
                                <MenuItem value="ADMIN">مدير عام</MenuItem>
                                <MenuItem value="MANAGER">مدير</MenuItem>
                                <MenuItem value="EMPLOYEE">موظف</MenuItem>
                            </Select>
                        </FormControl>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={formData.isDirectManager}
                                    onChange={(e) =>
                                        setFormData({ ...formData, isDirectManager: e.target.checked })
                                    }
                                />
                            }
                            label={
                                <Box>
                                    <Typography>مدير مباشر</Typography>
                                    <Typography variant="caption" color="textSecondary">
                                        إذا تم تحديده، سيظهر أصحاب هذه الدرجة في قائمة "المدير المباشر" عند إضافة موظف جديد
                                    </Typography>
                                </Box>
                            }
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>إلغاء</Button>
                    <Button
                        variant="contained"
                        onClick={handleSubmit}
                        disabled={!formData.name}
                    >
                        {selectedJobTitle ? 'تحديث' : 'إضافة'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle>حذف الدرجة الوظيفية</DialogTitle>
                <DialogContent>
                    <Typography>
                        هل أنت متأكد من حذف "{selectedJobTitle?.name}"؟
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>إلغاء</Button>
                    <Button variant="contained" color="error" onClick={handleDelete}>
                        حذف
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Permissions Management Dialog */}
            <Dialog
                open={permissionsDialogOpen}
                onClose={() => setPermissionsDialogOpen(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    صلاحيات الدرجة الوظيفية: {selectedJobTitle?.name}
                </DialogTitle>
                <DialogContent>
                    {permissionsLoading ? (
                        <Box display="flex" justifyContent="center" py={4}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <Box mt={2}>
                            <Alert severity="info" sx={{ mb: 2 }}>
                                الصلاحيات المحددة هنا ستُمنح تلقائياً لكل موظف يُعيّن لهذه الدرجة الوظيفية
                            </Alert>
                            {Object.entries(
                                allPermissions.reduce((acc, perm) => {
                                    if (!acc[perm.category]) acc[perm.category] = [];
                                    acc[perm.category].push(perm);
                                    return acc;
                                }, {} as Record<string, Permission[]>)
                            ).map(([category, perms]) => (
                                <Box key={category} mb={3}>
                                    <Typography variant="subtitle1" fontWeight="bold" color="primary" mb={1}>
                                        {category}
                                    </Typography>
                                    <Box display="flex" flexWrap="wrap" gap={1}>
                                        {perms.map((perm) => (
                                            <Box
                                                key={perm.id}
                                                sx={{
                                                    border: '1px solid #e0e0e0',
                                                    borderRadius: 1,
                                                    p: 1,
                                                    m: 0.5,
                                                    bgcolor: isPermissionSelected(perm.id) ? 'action.selected' : 'transparent',
                                                    minWidth: 200,
                                                }}
                                            >
                                                <FormControlLabel
                                                    control={
                                                        <Checkbox
                                                            checked={isPermissionSelected(perm.id)}
                                                            onChange={() => handleTogglePermission(perm)}
                                                            color="primary"
                                                        />
                                                    }
                                                    label={
                                                        <Box>
                                                            <Typography variant="body2">{perm.name}</Typography>
                                                            <Typography variant="caption" color="textSecondary">
                                                                {perm.code}
                                                            </Typography>
                                                        </Box>
                                                    }
                                                    sx={{ m: 0 }}
                                                />
                                                {isPermissionSelected(perm.id) && (
                                                    <FormControl size="small" fullWidth sx={{ mt: 1 }}>
                                                        <InputLabel>النطاق</InputLabel>
                                                        <Select
                                                            value={getPermissionScope(perm.id)}
                                                            label="النطاق"
                                                            onChange={(e) => handleScopeChange(perm.id, e.target.value)}
                                                        >
                                                            <MenuItem value="TEAM">الموظفين التابعين</MenuItem>
                                                            <MenuItem value="BRANCH">موظفي الفرع</MenuItem>
                                                            <MenuItem value="DEPARTMENT">موظفي القسم</MenuItem>
                                                            <MenuItem value="ALL">كل الموظفين</MenuItem>
                                                        </Select>
                                                    </FormControl>
                                                )}
                                            </Box>
                                        ))}
                                    </Box>
                                </Box>
                            ))}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPermissionsDialogOpen(false)}>إغلاق</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default JobTitlesPage;
