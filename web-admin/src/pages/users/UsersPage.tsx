import { useState } from 'react';
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
} from '@mui/material';
import {
  Search,
  Edit,
  Delete,
  PersonAdd,
  CheckCircle,
  Visibility,
  FileDownload,
  Face,
} from '@mui/icons-material';
import { api } from '@/services/api.service';
import { User } from '@/store/auth.store';

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

export const UsersPage = () => {
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
    role: 'EMPLOYEE',
    status: 'ACTIVE',
    branchId: '',
    departmentId: '',
    managerId: '',
    salary: '',
    hireDate: '',
  });
  
  // حالة الأخطاء
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);

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

  // جلب الأقسام
  const { data: departments } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: () => api.get('/branches/departments/all'),
  });

  // جلب المديرين (MANAGER و ADMIN)
  const { data: managersData } = useQuery<UsersResponse>({
    queryKey: ['managers'],
    queryFn: () => api.get('/users?role=MANAGER&limit=100'),
  });
  const managers = managersData?.data || [];

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
        hireDate: userData.hireDate || undefined,
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
        role: user.role,
        status: user.status || 'ACTIVE',
        branchId: user.branch?.id || '',
        departmentId: user.department?.id || '',
        managerId: user.manager?.id || '',
        salary: user.salary ? String(user.salary) : '',
        hireDate: user.hireDate ? new Date(user.hireDate).toISOString().split('T')[0] : '',
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
        role: 'EMPLOYEE',
        status: 'ACTIVE',
        branchId: '',
        departmentId: '',
        managerId: '',
        salary: '',
        hireDate: '',
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
            variant="contained"
            startIcon={<PersonAdd />}
            onClick={() => handleOpenDialog()}
          >
            إضافة مستخدم
          </Button>
        </Box>
      </Box>

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
                      <TableCell align="center">الإجراءات</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id} hover>
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
                            icon={<CheckCircle />}
                            label="نشط"
                            color="success"
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="عرض">
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
                label="المسمى الوظيفي"
                value={formData.jobTitle}
                onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                placeholder="مثال: مطور برمجيات"
                helperText="اختياري"
              />
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
                label="تاريخ التوظيف"
                type="date"
                value={formData.hireDate}
                onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
                helperText="اختياري - تاريخ بداية العمل"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                select
                label="المدير المباشر"
                value={formData.managerId}
                onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
                helperText="اختياري - المدير المسؤول عن هذا الموظف"
              >
                <MenuItem value="">لا يوجد</MenuItem>
                {managers?.map((manager) => (
                  <MenuItem key={manager.id} value={manager.id}>
                    {manager.firstName} {manager.lastName} ({getRoleLabel(manager.role)})
                  </MenuItem>
                ))}
              </TextField>
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
        <DialogContent>
          {selectedUser && (
            <Box sx={{ pt: 2 }}>
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
