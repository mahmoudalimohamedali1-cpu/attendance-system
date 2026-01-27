import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Chip,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  MenuItem,
  CircularProgress,
  Alert,
  Tooltip,
  FormControlLabel,
  Switch,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Search,
  Edit,
  Delete,
  PersonAdd,
  CheckCircle,
  Cancel,
  Visibility,
  FileDownload,
  Face,
  AccountBalance,
  CloudUpload,
  AccountCircle,
  AccountTree,
} from '@mui/icons-material';
import { api } from '@/services/api.service';
import { User } from '@/store/auth.store';
import { BankAccountsTab } from './components/BankAccountsTab';
import { QuickStats } from './components/QuickStats';

interface UsersResponse {
  data: User[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface Branch {
  id: string;
  name: string;
  nameEn?: string;
  isActive: boolean;
}

interface Department {
  id: string;
  name: string;
  nameEn?: string;
  branchId: string;
}

interface JobTitle {
  id: string;
  name: string;
  nameEn?: string;
  level: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
  isDirectManager: boolean;
}

interface DirectManagerUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle?: string;
  jobTitleRef?: {
    name: string;
    level: string;
  };
}

interface CostCenter {
  id: string;
  code: string;
  nameAr: string;
  nameEn?: string;
  type: string;
  status: string;
}

export const UsersPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    jobTitle: '',
    jobTitleId: '', // الدرجة الوظيفية الجديدة
    role: 'EMPLOYEE',
    status: 'ACTIVE',
    branchId: '',
    departmentId: '',
    managerId: '',
    costCenterId: '', // مركز التكلفة
    salary: '',
    hireDate: '',
    annualLeaveDays: '',
    nationality: '',
    isSaudi: true,
  });
  const [activeViewTab, setActiveViewTab] = useState(0);

  // حالة الأخطاء
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);

  // معالجة معلمة البحث "edit" لفتح نافذة التعديل تلقائياً
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const userIdToEdit = params.get('edit');

    if (userIdToEdit) {
      // جلب بيانات المستخدم لفتحه في التعديل
      const fetchAndOpenEdit = async () => {
        try {
          const user = await api.get(`/users/${userIdToEdit}`);
          if (user) {
            handleOpenDialog(user as User);
            // مسح المعلمة من الرابط حتى لا تفتح مرة أخرى عند التحديث
            const newParams = new URLSearchParams(location.search);
            newParams.delete('edit');
            navigate({ search: newParams.toString() }, { replace: true });
          }
        } catch (err) {
          console.error('Failed to fetch user for editing:', err);
        }
      };

      fetchAndOpenEdit();
    }
  }, [location.search]);

  // جلب المستخدمين
  const { data, isLoading, error } = useQuery<UsersResponse>({
    queryKey: ['users', page, rowsPerPage, search],
    queryFn: () =>
      api.get(`/users?page=${page + 1}&limit=${rowsPerPage}&search=${search}`),
  });

  // جلب الفروع
  const { data: branches } = useQuery<Branch[]>({
    queryKey: ['branches'],
    queryFn: () => api.get('/branches'),
  });

  // جلب إحصائيات المستخدمين السريعة
  const { data: quickStats, isLoading: statsLoading } = useQuery<{
    totalActive: number;
    newThisMonth: number;
    onLeaveToday: number;
    pendingApprovals: number;
  }>({
    queryKey: ['users-quick-stats'],
    queryFn: () => api.get('/dashboard/users-stats'),
    staleTime: 30000, // Cache for 30 seconds
  });

  // جلب الأقسام
  const { data: departments } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: () => api.get('/branches/departments/all'),
  });

  // جلب المديرين (MANAGER و ADMIN) - طريقة قديمة
  // const { data: managersData } = useQuery<UsersResponse>({
  //   queryKey: ['managers'],
  //   queryFn: () => api.get('/users?role=MANAGER&limit=100'),
  // });
  // const managers = managersData?.data || [];

  // جلب الدرجات الوظيفية
  const { data: jobTitles } = useQuery<JobTitle[]>({
    queryKey: ['job-titles'],
    queryFn: () => api.get('/job-titles'),
  });

  // جلب المستخدمين الذين لديهم درجة وظيفية مدير مباشر
  const { data: directManagerUsers } = useQuery<DirectManagerUser[]>({
    queryKey: ['direct-manager-users'],
    queryFn: () => api.get('/job-titles/direct-manager-users'),
  });

  // جلب مراكز التكلفة
  const { data: costCenters } = useQuery<CostCenter[]>({
    queryKey: ['cost-centers'],
    queryFn: () => api.get('/cost-centers'),
  });

  // جلب جميع المدراء (MANAGER و ADMIN) كخيار بديل
  const { data: allManagersData } = useQuery<UsersResponse>({
    queryKey: ['all-managers-for-dropdown'],
    queryFn: () => api.get('/users?limit=200&status=ACTIVE'),
  });

  // دمج المدراء - استخدم directManagerUsers إذا متوفر، وإلا استخدم جميع المدراء والمديرين
  const allAvailableManagers = useMemo(() => {
    // إذا كان هناك مستخدمين بدرجات وظيفية محددة كمدير مباشر، استخدمهم
    if (directManagerUsers && directManagerUsers.length > 0) {
      return directManagerUsers;
    }
    // وإلا استخدم جميع المستخدمين بدور MANAGER أو ADMIN
    return allManagersData?.data
      ?.filter(u => u.role === 'MANAGER' || u.role === 'ADMIN')
      ?.map(m => ({
        id: m.id,
        firstName: m.firstName,
        lastName: m.lastName,
        email: m.email,
        jobTitle: m.jobTitle,
      })) || [];
  }, [directManagerUsers, allManagersData]);

  // فلترة الأقسام حسب الفرع المختار
  const filteredDepartments = departments?.filter(
    (dept) => dept.branchId === formData.branchId
  ) || [];

  const createMutation = useMutation({
    mutationFn: (userData: typeof formData) => {
      const payload = {
        ...userData,
        salary: userData.salary ? parseFloat(userData.salary) : undefined,
        branchId: userData.branchId || undefined,
        departmentId: userData.departmentId || undefined,
        managerId: userData.managerId || undefined,
        jobTitleId: userData.jobTitleId || undefined,
        costCenterId: userData.costCenterId || undefined,
        hireDate: userData.hireDate || undefined,
        annualLeaveDays: userData.annualLeaveDays ? parseInt(userData.annualLeaveDays) : 21,
      };
      return api.post('/users', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setApiError(null);
      handleCloseDialog();
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || 'حدث خطأ أثناء إضافة المستخدم';
      // تحويل رسائل الخطأ للعربية
      let arabicError = errorMessage;
      if (typeof errorMessage === 'string') {
        if (errorMessage.includes('email must be an email')) arabicError = 'البريد الإلكتروني غير صالح';
        else if (errorMessage.includes('email already exists') || errorMessage.includes('Unique constraint')) arabicError = 'البريد الإلكتروني مستخدم بالفعل';
        else if (errorMessage.includes('password')) arabicError = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
        else if (errorMessage.includes('firstName')) arabicError = 'الاسم الأول مطلوب';
        else if (errorMessage.includes('lastName')) arabicError = 'الاسم الأخير مطلوب';
      } else if (Array.isArray(errorMessage)) {
        arabicError = errorMessage.map((msg: string) => {
          if (msg.includes('email must be an email')) return 'البريد الإلكتروني غير صالح';
          if (msg.includes('password')) return 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
          return msg;
        }).join('، ');
      }
      setApiError(arabicError);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      const payload = {
        ...data,
        salary: data.salary ? parseFloat(data.salary) : undefined,
        branchId: data.branchId || undefined,
        departmentId: data.departmentId || undefined,
        managerId: data.managerId || undefined,
        jobTitleId: data.jobTitleId || undefined,
        costCenterId: data.costCenterId || undefined,
        hireDate: data.hireDate || undefined,
      };
      if (!payload.password) {
        delete payload.password;
      }
      return api.patch(`/users/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setApiError(null);
      handleCloseDialog();
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || 'حدث خطأ أثناء تحديث المستخدم';
      let arabicError = errorMessage;
      if (typeof errorMessage === 'string') {
        if (errorMessage.includes('email must be an email')) arabicError = 'البريد الإلكتروني غير صالح';
        else if (errorMessage.includes('email already exists') || errorMessage.includes('Unique constraint')) arabicError = 'البريد الإلكتروني مستخدم بالفعل';
      }
      setApiError(arabicError);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  // إعادة تعيين الوجه
  const resetFaceMutation = useMutation({
    mutationFn: (id: string) => api.post(`/users/${id}/reset-face`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      alert('تم إعادة تعيين الوجه بنجاح. يمكن للموظف تسجيل وجهه من جديد عند الحضور القادم.');
    },
    onError: (error: any) => {
      alert(error?.response?.data?.message || 'حدث خطأ أثناء إعادة تعيين الوجه');
    },
  });

  const handleResetFace = (user: User) => {
    if (window.confirm(`هل أنت متأكد من إعادة تعيين الوجه للموظف "${user.firstName} ${user.lastName}"؟\n\nسيتم حذف صورة الوجه المسجلة وسيحتاج الموظف لتسجيل وجهه من جديد.`)) {
      resetFaceMutation.mutate(user.id);
    }
  };

  const handleOpenDialog = (user?: User) => {
    setFormErrors({});
    setApiError(null);
    if (user) {
      setSelectedUser(user);
      setFormData({
        email: user.email,
        password: '',
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone || '',
        jobTitle: user.jobTitle || '',
        jobTitleId: (user as any).jobTitleId || '',
        role: user.role,
        status: user.status || 'ACTIVE',
        branchId: user.branch?.id || '',
        departmentId: user.department?.id || '',
        managerId: user.manager?.id || '',
        costCenterId: (user as any).costCenterId || '',
        salary: user.salary ? String(user.salary) : '',
        hireDate: user.hireDate ? new Date(user.hireDate).toISOString().split('T')[0] : '',
        annualLeaveDays: user.annualLeaveDays ? String(user.annualLeaveDays) : '',
        nationality: (user as any).nationality || '',
        isSaudi: (user as any).isSaudi ?? true,
      });
    } else {
      setSelectedUser(null);
      setFormData({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        phone: '',
        jobTitle: '',
        jobTitleId: '',
        role: 'EMPLOYEE',
        status: 'ACTIVE',
        branchId: '',
        departmentId: '',
        managerId: '',
        costCenterId: '',
        salary: '',
        hireDate: '',
        annualLeaveDays: '',
        nationality: '',
        isSaudi: true,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedUser(null);
    setFormErrors({});
    setApiError(null);
  };

  // التحقق من صحة النموذج
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // الحقول الإلزامية فقط
    if (!formData.firstName.trim()) {
      errors.firstName = 'الاسم الأول مطلوب';
    }

    if (!formData.lastName.trim()) {
      errors.lastName = 'الاسم الأخير مطلوب';
    }

    if (!formData.email.trim()) {
      errors.email = 'البريد الإلكتروني مطلوب';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'البريد الإلكتروني غير صالح';
    }

    // كلمة المرور مطلوبة فقط للمستخدم الجديد
    if (!selectedUser && !formData.password) {
      errors.password = 'كلمة المرور مطلوبة';
    } else if (!selectedUser && formData.password.length < 6) {
      errors.password = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }

    setApiError(null);
    if (selectedUser) {
      updateMutation.mutate({ id: selectedUser.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  // عند تغيير الفرع، إعادة تعيين القسم
  const handleBranchChange = (branchId: string) => {
    setFormData({
      ...formData,
      branchId,
      departmentId: '', // إعادة تعيين القسم عند تغيير الفرع
    });
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'مدير النظام';
      case 'MANAGER': return 'مدير';
      case 'EMPLOYEE': return 'موظف';
      default: return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'error';
      case 'MANAGER': return 'warning';
      case 'EMPLOYEE': return 'primary';
      default: return 'default';
    }
  };

  const users = data?.data || [];
  const total = data?.pagination?.total || 0;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            إدارة المستخدمين
          </Typography>
          <Typography variant="body2" color="text.secondary">
            إضافة وتعديل وحذف المستخدمين وربطهم بالفروع
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<FileDownload />}>
            تصدير Excel
          </Button>
          <Button
            variant="outlined"
            color="success"
            startIcon={<CloudUpload />}
            onClick={() => navigate('/users/import')}
          >
            استيراد موظفين
          </Button>
          <Button
            variant="contained"
            startIcon={<PersonAdd />}
            onClick={() => handleOpenDialog()}
          >
            إضافة مستخدم
          </Button>
        </Box>
      </Box>

      {/* Quick Stats Dashboard */}
      <QuickStats
        totalActive={quickStats?.totalActive ?? 0}
        newThisMonth={quickStats?.newThisMonth ?? 0}
        onLeaveToday={quickStats?.onLeaveToday ?? 0}
        pendingApprovals={quickStats?.pendingApprovals ?? 0}
        isLoading={statsLoading}
      />


      <Card>
        <CardContent>
          <Box sx={{ mb: 3 }}>
            <TextField
              placeholder="بحث عن مستخدم..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
              sx={{ width: 300 }}
            />
          </Box>

          {isLoading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error">فشل تحميل البيانات</Alert>
          ) : (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>المستخدم</TableCell>
                      <TableCell>البريد الإلكتروني</TableCell>
                      <TableCell>المسمى الوظيفي</TableCell>
                      <TableCell>الفرع</TableCell>
                      <TableCell>القسم</TableCell>
                      <TableCell>الدور</TableCell>
                      <TableCell>الحالة</TableCell>
                      <TableCell align="center">رصيد الإجازات</TableCell>
                      <TableCell align="center">الإجراءات</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow
                        key={user.id}
                        hover
                        sx={user.status === 'TERMINATED' ? {
                          bgcolor: '#fef2f2',
                          '&:hover': { bgcolor: '#fecaca !important' },
                          '& td': { borderColor: '#fca5a5' },
                        } : {}}
                      >
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar sx={{ bgcolor: 'primary.main' }}>
                              {user.firstName?.[0]}
                            </Avatar>
                            <Box>
                              <Typography fontWeight="bold">
                                {user.firstName} {user.lastName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {user.phone}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.jobTitle || '-'}</TableCell>
                        <TableCell>
                          {user.branch?.name ? (
                            <Chip label={user.branch.name} size="small" variant="outlined" color="info" />
                          ) : (
                            <Typography variant="caption" color="text.secondary">غير محدد</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {user.department?.name ? (
                            <Chip label={user.department.name} size="small" variant="outlined" />
                          ) : (
                            <Typography variant="caption" color="text.secondary">غير محدد</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={getRoleLabel(user.role)}
                            color={getRoleColor(user.role) as 'error' | 'warning' | 'primary'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={
                              user.status === 'ACTIVE' ? <CheckCircle /> :
                                user.status === 'TERMINATED' ? <Cancel /> :
                                  user.status === 'SUSPENDED' ? <Cancel /> : undefined
                            }
                            label={
                              user.status === 'ACTIVE' ? 'نشط' :
                                user.status === 'TERMINATED' ? '🚫 تم إنهاء خدماته' :
                                  user.status === 'SUSPENDED' ? 'موقوف' : 'غير نشط'
                            }
                            color={
                              user.status === 'ACTIVE' ? 'success' :
                                user.status === 'TERMINATED' ? 'error' :
                                  user.status === 'SUSPENDED' ? 'warning' : 'default'
                            }
                            size="small"
                            variant={user.status === 'TERMINATED' ? 'filled' : 'outlined'}
                            sx={user.status === 'TERMINATED' ? {
                              bgcolor: '#b91c1c',
                              color: 'white',
                              fontWeight: 'bold',
                            } : {}}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" fontWeight="bold" color="primary">
                            {user.remainingLeaveDays ?? 0} يوم
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="البروفايل الكامل">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => navigate(`/employee-profile/${user.id}`)}
                            >
                              <AccountCircle />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="عرض سريع">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setSelectedUser(user);
                                setOpenViewDialog(true);
                              }}
                            >
                              <Visibility />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="تعديل">
                            <IconButton size="small" onClick={() => handleOpenDialog(user)}>
                              <Edit />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={user.faceRegistered ? 'إعادة تعيين الوجه' : 'لا يوجد وجه مسجل'}>
                            <span>
                              <IconButton
                                size="small"
                                color="warning"
                                disabled={!user.faceRegistered || resetFaceMutation.isPending}
                                onClick={() => handleResetFace(user)}
                              >
                                <Face />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="حذف">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => {
                                if (confirm('هل أنت متأكد من الحذف؟')) {
                                  deleteMutation.mutate(user.id);
                                }
                              }}
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

              <TablePagination
                component="div"
                count={total}
                page={page}
                onPageChange={(_, newPage) => setPage(newPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setPage(0);
                }}
                labelRowsPerPage="عدد الصفوف:"
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} من ${count}`}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>
          {selectedUser ? 'تعديل مستخدم' : 'إضافة مستخدم جديد'}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {/* عرض أخطاء API */}
          {apiError && (
            <Alert severity="error" sx={{ mb: 2, mt: 1 }} onClose={() => setApiError(null)}>
              {apiError}
            </Alert>
          )}

          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            {/* البيانات الأساسية */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="primary" gutterBottom>
                البيانات الأساسية
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="الاسم الأول *"
                value={formData.firstName}
                onChange={(e) => {
                  setFormData({ ...formData, firstName: e.target.value });
                  if (formErrors.firstName) setFormErrors({ ...formErrors, firstName: '' });
                }}
                error={!!formErrors.firstName}
                helperText={formErrors.firstName}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="الاسم الأخير *"
                value={formData.lastName}
                onChange={(e) => {
                  setFormData({ ...formData, lastName: e.target.value });
                  if (formErrors.lastName) setFormErrors({ ...formErrors, lastName: '' });
                }}
                error={!!formErrors.lastName}
                helperText={formErrors.lastName}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="البريد الإلكتروني *"
                type="email"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  if (formErrors.email) setFormErrors({ ...formErrors, email: '' });
                }}
                error={!!formErrors.email}
                helperText={formErrors.email || 'مثال: user@example.com'}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={selectedUser ? 'كلمة المرور الجديدة (اختياري)' : 'كلمة المرور *'}
                type="password"
                value={formData.password}
                onChange={(e) => {
                  setFormData({ ...formData, password: e.target.value });
                  if (formErrors.password) setFormErrors({ ...formErrors, password: '' });
                }}
                error={!!formErrors.password}
                helperText={formErrors.password || (selectedUser ? 'اتركها فارغة للإبقاء على كلمة المرور الحالية' : '6 أحرف على الأقل')}
                required={!selectedUser}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="رقم الهاتف"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+966501234567"
                helperText="اختياري"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="الجنسية"
                value={formData.nationality}
                onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                helperText="اختياري"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isSaudi}
                    onChange={(e) => setFormData({ ...formData, isSaudi: e.target.checked })}
                  />
                }
                label="موظف سعودي؟"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                select
                label="الدرجة الوظيفية"
                value={formData.jobTitleId}
                onChange={(e) => setFormData({ ...formData, jobTitleId: e.target.value })}
                helperText="اختياري - اختر الدرجة الوظيفية للموظف"
              >
                <MenuItem value="">
                  <em>بدون درجة وظيفية</em>
                </MenuItem>
                {jobTitles?.map((jt) => (
                  <MenuItem key={jt.id} value={jt.id}>
                    {jt.name} {jt.isDirectManager && '⭐'}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* الفرع والقسم */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 2 }}>
                الفرع والقسم (اختياري)
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                select
                label="الفرع"
                value={formData.branchId}
                onChange={(e) => handleBranchChange(e.target.value)}
                helperText="اختياري - اختر الفرع الذي سيعمل به الموظف"
              >
                <MenuItem value="">
                  <em>بدون فرع</em>
                </MenuItem>
                {branches?.filter(b => b.isActive).map((branch) => (
                  <MenuItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                select
                label="القسم"
                value={formData.departmentId}
                onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                disabled={!formData.branchId}
                helperText={formData.branchId ? 'اختياري - اختر القسم' : 'اختر الفرع أولاً'}
              >
                <MenuItem value="">
                  <em>بدون قسم</em>
                </MenuItem>
                {filteredDepartments.map((dept) => (
                  <MenuItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* الصلاحيات والراتب */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 2 }}>
                الصلاحيات والراتب
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                select
                label="الدور *"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                helperText="صلاحيات المستخدم في النظام"
              >
                <MenuItem value="EMPLOYEE">موظف</MenuItem>
                <MenuItem value="MANAGER">مدير</MenuItem>
                <MenuItem value="ADMIN">مدير النظام</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                select
                label="الحالة"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                helperText="حالة الحساب"
              >
                <MenuItem value="ACTIVE">نشط</MenuItem>
                <MenuItem value="INACTIVE">غير نشط</MenuItem>
                <MenuItem value="SUSPENDED">موقوف</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="الراتب الشهري"
                type="number"
                value={formData.salary}
                onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                InputProps={{
                  endAdornment: <InputAdornment position="end">ريال</InputAdornment>,
                }}
                helperText="اختياري"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="تاريخ مباشرة العمل *"
                type="date"
                value={formData.hireDate}
                onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
                helperText="مطلوب - يُحسب رصيد الإجازات تلقائياً منه (قانون العمل السعودي)"
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                select
                label="المدير المباشر"
                value={formData.managerId}
                onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
                helperText="اختياري - اختر المدير المباشر للموظف"
              >
                <MenuItem value="">لا يوجد</MenuItem>
                {allAvailableManagers?.map((manager) => (
                  <MenuItem key={manager.id} value={manager.id}>
                    {manager.firstName} {manager.lastName}
                    {manager.jobTitle && ` (${manager.jobTitle})`}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* مركز التكلفة */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 2 }}>
                <AccountTree sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                مركز التكلفة (اختياري)
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                select
                label="مركز التكلفة"
                value={formData.costCenterId}
                onChange={(e) => setFormData({ ...formData, costCenterId: e.target.value })}
                helperText="اختياري - اختر مركز التكلفة الذي سيُحسب عليه راتب الموظف"
              >
                <MenuItem value="">
                  <em>بدون مركز تكلفة</em>
                </MenuItem>
                {costCenters?.filter(cc => cc.status === 'ACTIVE').map((cc) => (
                  <MenuItem key={cc.id} value={cc.id}>
                    {cc.code} - {cc.nameAr}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* معلومة عن حساب الإجازات */}
            <Grid item xs={12}>
              <Alert severity="success" sx={{ mt: 1 }}>
                <strong>📌 حساب الإجازات تلقائياً (قانون العمل السعودي المادة 109):</strong><br />
                • أقل من 5 سنوات خدمة = 21 يوم/سنة<br />
                • 5 سنوات أو أكثر = 30 يوم/سنة<br />
                • الأشهر الجزئية تُحسب بنسبة
              </Alert>
            </Grid>

            {/* ملاحظة الحقول المطلوبة */}
            <Grid item xs={12}>
              <Alert severity="info" sx={{ mt: 1 }}>
                الحقول المميزة بـ (*) مطلوبة فقط. باقي الحقول اختيارية.
              </Alert>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseDialog}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {createMutation.isPending || updateMutation.isPending ? (
              <CircularProgress size={24} />
            ) : selectedUser ? (
              'تحديث'
            ) : (
              'إضافة'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={openViewDialog} onClose={() => setOpenViewDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>
          تفاصيل المستخدم
        </DialogTitle>
        <DialogContent dividers>
          {selectedUser && (
            <Box>
              <Tabs
                value={activeViewTab}
                onChange={(_, v) => setActiveViewTab(v)}
                sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
              >
                <Tab label="البيانات الشخصية" icon={<Visibility />} iconPosition="start" />
                <Tab label="الحسابات البنكية" icon={<AccountBalance />} iconPosition="start" />
              </Tabs>

              {activeViewTab === 0 ? (
                <Box sx={{ pt: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    {/* صورة الوجه المسجلة */}
                    {(selectedUser as any).faceData?.faceImage ? (
                      <Avatar
                        src={`data:image/jpeg;base64,${(selectedUser as any).faceData.faceImage}`}
                        sx={{ width: 80, height: 80, border: '3px solid', borderColor: 'success.main' }}
                      />
                    ) : (
                      <Avatar sx={{ width: 80, height: 80, bgcolor: 'primary.main', fontSize: 32 }}>
                        {selectedUser.firstName?.[0]}
                      </Avatar>
                    )}
                    <Box>
                      <Typography variant="h5" fontWeight="bold">
                        {selectedUser.firstName} {selectedUser.lastName}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Chip
                          label={getRoleLabel(selectedUser.role)}
                          color={getRoleColor(selectedUser.role) as 'error' | 'warning' | 'primary'}
                          size="small"
                        />
                        {(selectedUser as any).faceRegistered ? (
                          <Chip label="وجه مسجل ✓" color="success" size="small" variant="outlined" />
                        ) : (
                          <Chip label="بدون وجه" color="warning" size="small" variant="outlined" />
                        )}
                      </Box>
                    </Box>
                  </Box>

                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">البريد الإلكتروني</Typography>
                      <Typography>{selectedUser.email}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">رقم الهاتف</Typography>
                      <Typography>{selectedUser.phone || '-'}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">المسمى الوظيفي</Typography>
                      <Typography>{selectedUser.jobTitle || '-'}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">الفرع</Typography>
                      <Typography>
                        {selectedUser.branch?.name || (
                          <Typography component="span" color="text.secondary">غير محدد</Typography>
                        )}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">القسم</Typography>
                      <Typography>
                        {selectedUser.department?.name || (
                          <Typography component="span" color="text.secondary">غير محدد</Typography>
                        )}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">الحالة</Typography>
                      <Box>
                        <Chip label="نشط" color="success" size="small" />
                      </Box>
                    </Grid>
                  </Grid>
                </Box>
              ) : (
                <BankAccountsTab userId={selectedUser.id} />
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenViewDialog(false)}>إغلاق</Button>
          <Button
            variant="contained"
            onClick={() => {
              setOpenViewDialog(false);
              if (selectedUser) handleOpenDialog(selectedUser);
            }}
          >
            تعديل
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
