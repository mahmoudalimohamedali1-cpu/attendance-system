import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    Grid,
    Card,
    CardContent,
    FormControlLabel,
    Checkbox,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Chip,
    List,
    ListItem,
    ListItemText,
    TextField,
    InputAdornment,
    Autocomplete,
    Alert,
    Snackbar,
    CircularProgress,
    Divider,
    Accordion,
    AccordionSummary,
    AccordionDetails,
} from '@mui/material';
import {
    ExpandMore as ExpandMoreIcon,
    Add as AddIcon,
    Search as SearchIcon,
    Person as PersonIcon,
    Group as GroupIcon,
    Business as BranchIcon,
    Apartment as DepartmentIcon,
    Public as AllIcon,
    PersonAdd as CustomIcon,
} from '@mui/icons-material';
import {
    permissionsService,
    Permission,
    UserPermission,
    Employee,
    AddPermissionDto,
} from '@/services/permissions.service';
import { api } from '@/services/api.service';

type ScopeType = 'SELF' | 'TEAM' | 'BRANCH' | 'DEPARTMENT' | 'ALL' | 'CUSTOM';

const scopeConfig: Record<ScopeType, { icon: React.ReactNode; label: string; color: string }> = {
    SELF: { icon: <PersonIcon />, label: 'نفسه فقط', color: '#9e9e9e' },
    TEAM: { icon: <GroupIcon />, label: 'فريقه المباشر', color: '#2196f3' },
    BRANCH: { icon: <BranchIcon />, label: 'فرع معين', color: '#4caf50' },
    DEPARTMENT: { icon: <DepartmentIcon />, label: 'قسم معين', color: '#ff9800' },
    ALL: { icon: <AllIcon />, label: 'كل الموظفين', color: '#f44336' },
    CUSTOM: { icon: <CustomIcon />, label: 'موظفين محددين', color: '#9c27b0' },
};

const categoryLabels: Record<string, string> = {
    LEAVES: 'الإجازات',
    LETTERS: 'الخطابات',
    RAISES: 'الزيادات',
    ATTENDANCE: 'الحضور',
    EMPLOYEES: 'الموظفين',
    REPORTS: 'التقارير',
    SETTINGS: 'الإعدادات',
    DATA_UPDATES: 'طلبات التحديث',
    PERMISSIONS: 'الصلاحيات',
};

export const PermissionsPage: React.FC = () => {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [permissions, setPermissions] = useState<Record<string, Permission[]>>({});
    const [userPermissions, setUserPermissions] = useState<UserPermission[]>([]);
    const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
    const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success',
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [scopeDialog, setScopeDialog] = useState<{ open: boolean; permission: Permission | null }>({
        open: false,
        permission: null,
    });
    // Multi-selection state
    const [selectedScopes, setSelectedScopes] = useState<{ self: boolean; team: boolean; all: boolean }>({
        self: false, team: false, all: false
    });
    const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
    const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
    const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        if (selectedEmployee) {
            loadUserPermissions(selectedEmployee.id);
        }
    }, [selectedEmployee]);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            const [permissionsData, employeesData, branchesData] = await Promise.all([
                permissionsService.getPermissionsByCategory(),
                api.get<{ data: Employee[] }>('/users?limit=1000'),
                api.get<{ id: string; name: string }[]>('/branches'),
            ]);
            setPermissions(permissionsData);
            setEmployees(employeesData.data || []);
            // branches API returns array directly
            setBranches(Array.isArray(branchesData) ? branchesData : []);

            // Load departments
            try {
                const depts = await api.get<{ id: string; name: string }[]>('/branches/departments/all');
                setDepartments(Array.isArray(depts) ? depts : []);
            } catch (err) {
                console.error('Failed to load departments:', err);
                setDepartments([]);
            }
        } catch (error) {
            console.error('Error loading data:', error);
            setSnackbar({ open: true, message: 'فشل في تحميل البيانات', severity: 'error' });
        }
        setLoading(false);
    };

    const loadUserPermissions = async (userId: string) => {
        try {
            const perms = await permissionsService.getUserPermissions(userId);
            setUserPermissions(perms);
        } catch {
            setUserPermissions([]);
        }
    };

    const hasPermission = (permissionCode: string): boolean => {
        return userPermissions.some((up) => up.permission.code === permissionCode);
    };

    const getPermissionScopes = (permissionCode: string): UserPermission[] => {
        return userPermissions.filter((up) => up.permission.code === permissionCode);
    };

    const handlePermissionToggle = async (permission: Permission, checked: boolean) => {
        if (!selectedEmployee) return;
        if (checked) {
            setScopeDialog({ open: true, permission });
            setSelectedScopes({ self: false, team: false, all: false });
            setSelectedBranches([]);
            setSelectedDepartments([]);
            setSelectedEmployees([]);
        } else {
            const permsToRemove = getPermissionScopes(permission.code);
            setSaving(true);
            try {
                for (const perm of permsToRemove) {
                    await permissionsService.removeUserPermission(selectedEmployee.id, perm.id);
                }
                await loadUserPermissions(selectedEmployee.id);
                setSnackbar({ open: true, message: 'تم حذف الصلاحية', severity: 'success' });
            } catch {
                setSnackbar({ open: true, message: 'فشل في حذف الصلاحية', severity: 'error' });
            }
            setSaving(false);
        }
    };

    const handleAddScope = async () => {
        if (!selectedEmployee || !scopeDialog.permission) return;
        setSaving(true);
        const permCode = scopeDialog.permission.code;
        const scopesToAdd: AddPermissionDto[] = [];

        // Simple scopes
        if (selectedScopes.self) scopesToAdd.push({ permissionCode: permCode, scope: 'SELF' });
        if (selectedScopes.team) scopesToAdd.push({ permissionCode: permCode, scope: 'TEAM' });
        if (selectedScopes.all) scopesToAdd.push({ permissionCode: permCode, scope: 'ALL' });

        // Branches
        selectedBranches.forEach(branchId => {
            scopesToAdd.push({ permissionCode: permCode, scope: 'BRANCH', branchId });
        });

        // Departments
        selectedDepartments.forEach(deptId => {
            scopesToAdd.push({ permissionCode: permCode, scope: 'DEPARTMENT', departmentId: deptId });
        });

        // Custom employees
        if (selectedEmployees.length > 0) {
            scopesToAdd.push({ permissionCode: permCode, scope: 'CUSTOM', employeeIds: selectedEmployees });
        }

        if (scopesToAdd.length === 0) {
            setSnackbar({ open: true, message: 'يرجى اختيار نطاق واحد على الأقل', severity: 'error' });
            setSaving(false);
            return;
        }

        try {
            for (const data of scopesToAdd) {
                await permissionsService.addUserPermission(selectedEmployee.id, data);
            }
            await loadUserPermissions(selectedEmployee.id);
            setScopeDialog({ open: false, permission: null });
            setSnackbar({ open: true, message: `تمت إضافة ${scopesToAdd.length} نطاق`, severity: 'success' });
        } catch {
            setSnackbar({ open: true, message: 'فشل في إضافة الصلاحية', severity: 'error' });
        }
        setSaving(false);
    };

    const handleRemoveScope = async (userPermission: UserPermission) => {
        if (!selectedEmployee) return;
        setSaving(true);
        try {
            await permissionsService.removeUserPermission(selectedEmployee.id, userPermission.id);
            await loadUserPermissions(selectedEmployee.id);
            setSnackbar({ open: true, message: 'تم حذف النطاق', severity: 'success' });
        } catch {
            setSnackbar({ open: true, message: 'فشل في حذف النطاق', severity: 'error' });
        }
        setSaving(false);
    };

    const getScopeLabel = (up: UserPermission): string => {
        if (up.scope === 'BRANCH') {
            const branch = branches.find((b) => b.id === up.branchId);
            return 'فرع: ' + (branch?.name || 'غير معروف');
        }
        if (up.scope === 'DEPARTMENT') {
            const dept = departments.find((d) => d.id === up.departmentId);
            return 'قسم: ' + (dept?.name || 'غير معروف');
        }
        if (up.scope === 'CUSTOM') {
            return 'موظفين: ' + (up.assignedEmployees?.length || 0);
        }
        return scopeConfig[up.scope as ScopeType]?.label || up.scope;
    };

    const filteredEmployees = employees.filter(
        (emp) =>
            emp.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            emp.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            emp.employeeCode?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
                إدارة صلاحيات الموظفين
            </Typography>
            <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 2, height: 'calc(100vh - 200px)', overflow: 'auto' }}>
                        <Typography variant="h6" gutterBottom>اختر موظف</Typography>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="بحث..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            sx={{ mb: 2 }}
                            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
                        />
                        <List>
                            {filteredEmployees.map((emp) => (
                                <ListItem
                                    key={emp.id}
                                    button
                                    selected={selectedEmployee?.id === emp.id}
                                    onClick={() => setSelectedEmployee(emp)}
                                    sx={{ borderRadius: 1, mb: 0.5, '&.Mui-selected': { bgcolor: 'primary.light' } }}
                                >
                                    <ListItemText
                                        primary={emp.firstName + ' ' + emp.lastName}
                                        secondary={emp.jobTitle || emp.employeeCode}
                                    />
                                </ListItem>
                            ))}
                        </List>
                    </Paper>
                </Grid>
                <Grid item xs={12} md={8}>
                    <Paper sx={{ p: 2, height: 'calc(100vh - 200px)', overflow: 'auto' }}>
                        {selectedEmployee ? (
                            <>
                                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                    <Typography variant="h6">
                                        صلاحيات: {selectedEmployee.firstName} {selectedEmployee.lastName}
                                    </Typography>
                                    {saving && <CircularProgress size={24} />}
                                </Box>
                                <Divider sx={{ mb: 2 }} />
                                {Object.entries(permissions).map(([category, perms]) => (
                                    <Accordion key={category} defaultExpanded>
                                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                            <Typography variant="subtitle1" fontWeight="bold">
                                                {categoryLabels[category] || category}
                                            </Typography>
                                        </AccordionSummary>
                                        <AccordionDetails>
                                            {perms.map((perm) => {
                                                const isChecked = hasPermission(perm.code);
                                                const scopes = getPermissionScopes(perm.code);
                                                return (
                                                    <Card key={perm.id} variant="outlined" sx={{ mb: 2 }}>
                                                        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                                                            <Box display="flex" alignItems="center" justifyContent="space-between">
                                                                <FormControlLabel
                                                                    control={
                                                                        <Checkbox
                                                                            checked={isChecked}
                                                                            onChange={(e) => handlePermissionToggle(perm, e.target.checked)}
                                                                            disabled={saving}
                                                                        />
                                                                    }
                                                                    label={
                                                                        <Box>
                                                                            <Typography variant="body1">{perm.name}</Typography>
                                                                            {perm.description && (
                                                                                <Typography variant="caption" color="text.secondary">
                                                                                    {perm.description}
                                                                                </Typography>
                                                                            )}
                                                                        </Box>
                                                                    }
                                                                />
                                                                {isChecked && (
                                                                    <Button
                                                                        size="small"
                                                                        startIcon={<AddIcon />}
                                                                        onClick={() => {
                                                                            setScopeDialog({ open: true, permission: perm });
                                                                            setSelectedScopes({ self: false, team: false, all: false });
                                                                            setSelectedBranches([]);
                                                                            setSelectedDepartments([]);
                                                                            setSelectedEmployees([]);
                                                                        }}
                                                                    >
                                                                        إضافة نطاق
                                                                    </Button>
                                                                )}
                                                            </Box>
                                                            {scopes.length > 0 && (
                                                                <Box mt={1} display="flex" gap={1} flexWrap="wrap">
                                                                    {scopes.map((scope) => (
                                                                        <Chip
                                                                            key={scope.id}
                                                                            icon={scopeConfig[scope.scope as ScopeType]?.icon as React.ReactElement}
                                                                            label={getScopeLabel(scope)}
                                                                            onDelete={() => handleRemoveScope(scope)}
                                                                            size="small"
                                                                            sx={{
                                                                                bgcolor: scopeConfig[scope.scope as ScopeType]?.color + '20',
                                                                                borderColor: scopeConfig[scope.scope as ScopeType]?.color,
                                                                            }}
                                                                            variant="outlined"
                                                                        />
                                                                    ))}
                                                                </Box>
                                                            )}
                                                        </CardContent>
                                                    </Card>
                                                );
                                            })}
                                        </AccordionDetails>
                                    </Accordion>
                                ))}
                            </>
                        ) : (
                            <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                                <Typography color="text.secondary">اختر موظف من القائمة لعرض صلاحياته</Typography>
                            </Box>
                        )}
                    </Paper>
                </Grid>
            </Grid>
            <Dialog open={scopeDialog.open} onClose={() => setScopeDialog({ open: false, permission: null })} maxWidth="sm" fullWidth>
                <DialogTitle>إضافة نطاقات لـ "{scopeDialog.permission?.name}"</DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                            يمكنك اختيار أكثر من نطاق في نفس الوقت
                        </Typography>

                        {/* Simple scopes */}
                        <Box sx={{ mb: 2 }}>
                            <FormControlLabel
                                control={<Checkbox checked={selectedScopes.self} onChange={(e) => setSelectedScopes({ ...selectedScopes, self: e.target.checked })} />}
                                label="نفسه فقط"
                            />
                            <FormControlLabel
                                control={<Checkbox checked={selectedScopes.team} onChange={(e) => setSelectedScopes({ ...selectedScopes, team: e.target.checked })} />}
                                label="فريقه المباشر (المرؤوسين)"
                            />
                            <FormControlLabel
                                control={<Checkbox checked={selectedScopes.all} onChange={(e) => setSelectedScopes({ ...selectedScopes, all: e.target.checked })} />}
                                label="كل الموظفين"
                            />
                        </Box>

                        <Divider sx={{ my: 2 }} />

                        {/* Branches multi-select */}
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>الفروع:</Typography>
                        <Autocomplete
                            multiple
                            options={branches}
                            getOptionLabel={(option) => option.name}
                            value={branches.filter(b => selectedBranches.includes(b.id))}
                            onChange={(_, value) => setSelectedBranches(value.map(v => v.id))}
                            renderInput={(params) => <TextField {...params} placeholder="اختر الفروع" size="small" />}
                            sx={{ mb: 2 }}
                        />

                        {/* Departments multi-select */}
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>الأقسام:</Typography>
                        <Autocomplete
                            multiple
                            options={departments}
                            getOptionLabel={(option) => option.name}
                            value={departments.filter(d => selectedDepartments.includes(d.id))}
                            onChange={(_, value) => setSelectedDepartments(value.map(v => v.id))}
                            renderInput={(params) => <TextField {...params} placeholder="اختر الأقسام" size="small" />}
                            sx={{ mb: 2 }}
                        />

                        {/* Custom employees multi-select */}
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>موظفين محددين:</Typography>
                        <Autocomplete
                            multiple
                            options={employees.filter((e) => e.id !== selectedEmployee?.id)}
                            getOptionLabel={(option) => option.firstName + ' ' + option.lastName}
                            value={employees.filter((e) => selectedEmployees.includes(e.id))}
                            onChange={(_, value) => setSelectedEmployees(value.map((v) => v.id))}
                            renderInput={(params) => <TextField {...params} placeholder="اختر الموظفين" size="small" />}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setScopeDialog({ open: false, permission: null })}>إلغاء</Button>
                    <Button
                        variant="contained"
                        onClick={handleAddScope}
                        disabled={saving}
                    >
                        {saving ? <CircularProgress size={20} /> : 'إضافة'}
                    </Button>
                </DialogActions>
            </Dialog>
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default PermissionsPage;
