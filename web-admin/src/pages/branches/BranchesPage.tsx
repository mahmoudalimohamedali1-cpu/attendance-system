import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Chip,
  CircularProgress,
  Alert,
  Switch,
  FormControlLabel,
  Divider,
  List,
  ListItem,
  ListItemText,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Checkbox,
  FormGroup,
  FormLabel,
  FormControl,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Business,
  LocationOn,
  Schedule,
  People,
  AccountTree,
  MyLocation,
  Map,
} from '@mui/icons-material';
import { api } from '@/services/api.service';

interface Branch {
  id: string;
  name: string;
  nameEn: string;
  address: string;
  latitude: number;
  longitude: number;
  geofenceRadius: number;
  timezone: string;
  workStartTime: string;
  workEndTime: string;
  lateGracePeriod: number;
  earlyCheckInPeriod?: number;
  earlyCheckOutPeriod?: number;
  workingDays?: string;
  isActive: boolean;
  _count?: {
    users: number;
    departments: number;
  };
}

interface Department {
  id: string;
  name: string;
  nameEn: string;
  branchId: string;
  branch?: Branch;
  _count?: {
    users: number;
  };
}

export const BranchesPage = () => {
  const queryClient = useQueryClient();
  const [tabValue, setTabValue] = useState(0);
  
  // Branch state
  const [openBranchDialog, setOpenBranchDialog] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [branchForm, setBranchForm] = useState({
    name: '',
    nameEn: '',
    address: '',
    latitude: 24.7136,
    longitude: 46.6753,
    geofenceRadius: 100,
    timezone: 'Asia/Riyadh',
    workStartTime: '08:00',
    workEndTime: '17:00',
    lateGracePeriod: 15,
    earlyCheckInPeriod: 15,
    earlyCheckOutPeriod: 0,
    workingDays: '0,1,2,3,4', // السبت-الأربعاء
    isActive: true,
  });

  // Department state
  const [openDeptDialog, setOpenDeptDialog] = useState(false);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [deptForm, setDeptForm] = useState({
    name: '',
    nameEn: '',
    branchId: '',
    branchIds: [] as string[], // للإضافة لفروع متعددة
  });
  const [selectAllBranches, setSelectAllBranches] = useState(false);

  // Fetch branches
  const { data: branches, isLoading: loadingBranches } = useQuery<Branch[]>({
    queryKey: ['branches'],
    queryFn: () => api.get('/branches'),
  });

  // Fetch departments
  const { data: departments, isLoading: loadingDepts } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: () => api.get('/branches/departments/all'),
  });

  // Branch mutations
  const createBranchMutation = useMutation({
    mutationFn: (data: typeof branchForm) => api.post('/branches', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      handleCloseBranchDialog();
    },
  });

  const updateBranchMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof branchForm }) =>
      api.patch(`/branches/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      handleCloseBranchDialog();
    },
  });

  const deleteBranchMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/branches/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
    },
  });

  // Department mutations
  interface DeptPayload {
    name: string;
    nameEn: string;
    branchId: string;
  }
  
  const createDeptMutation = useMutation({
    mutationFn: (data: DeptPayload) => api.post('/branches/departments', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['branches'] });
    },
  });

  const updateDeptMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: DeptPayload }) =>
      api.patch(`/branches/departments/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      handleCloseDeptDialog();
    },
  });

  const deleteDeptMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/branches/departments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['branches'] });
    },
  });

  // Branch handlers
  const handleOpenBranchDialog = (branch?: Branch) => {
    if (branch) {
      setSelectedBranch(branch);
      setBranchForm({
        name: branch.name,
        nameEn: branch.nameEn || '',
        address: branch.address || '',
        latitude: Number(branch.latitude) || 24.7136,
        longitude: Number(branch.longitude) || 46.6753,
        geofenceRadius: Number(branch.geofenceRadius) || 100,
        timezone: branch.timezone || 'Asia/Riyadh',
        workStartTime: branch.workStartTime || '08:00',
        workEndTime: branch.workEndTime || '17:00',
        lateGracePeriod: Number(branch.lateGracePeriod) || 15,
        earlyCheckInPeriod: Number((branch as any).earlyCheckInPeriod) || 15,
        earlyCheckOutPeriod: Number((branch as any).earlyCheckOutPeriod) || 0,
        workingDays: (branch as any).workingDays || '0,1,2,3,4',
        isActive: branch.isActive,
      });
    } else {
      setSelectedBranch(null);
      setBranchForm({
        name: '',
        nameEn: '',
        address: '',
        latitude: 24.7136,
        longitude: 46.6753,
        geofenceRadius: 100,
        timezone: 'Asia/Riyadh',
        workStartTime: '08:00',
        workEndTime: '17:00',
        lateGracePeriod: 15,
        earlyCheckInPeriod: 15,
        earlyCheckOutPeriod: 0,
        workingDays: '0,1,2,3,4',
        isActive: true,
      });
    }
    setOpenBranchDialog(true);
  };

  const handleCloseBranchDialog = () => {
    setOpenBranchDialog(false);
    setSelectedBranch(null);
  };

  const handleSubmitBranch = () => {
    if (selectedBranch) {
      updateBranchMutation.mutate({ id: selectedBranch.id, data: branchForm });
    } else {
      createBranchMutation.mutate(branchForm);
    }
  };

  // الحصول على الموقع الحالي من المتصفح
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('المتصفح لا يدعم تحديد الموقع');
      return;
    }

    setGettingLocation(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setBranchForm({
          ...branchForm,
          latitude: parseFloat(position.coords.latitude.toFixed(6)),
          longitude: parseFloat(position.coords.longitude.toFixed(6)),
        });
        setGettingLocation(false);
        setLocationError(null);
      },
      (error) => {
        setGettingLocation(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError('تم رفض صلاحية الوصول للموقع. يرجى السماح بالوصول من إعدادات المتصفح.');
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError('الموقع غير متاح حالياً');
            break;
          case error.TIMEOUT:
            setLocationError('انتهت مهلة تحديد الموقع');
            break;
          default:
            setLocationError('حدث خطأ في تحديد الموقع');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // فتح الموقع في خرائط جوجل
  const handleOpenInMaps = () => {
    const url = `https://www.google.com/maps?q=${branchForm.latitude},${branchForm.longitude}`;
    window.open(url, '_blank');
  };

  // Department handlers
  const handleOpenDeptDialog = (dept?: Department) => {
    if (dept) {
      setSelectedDept(dept);
      setDeptForm({
        name: dept.name,
        nameEn: dept.nameEn || '',
        branchId: dept.branchId,
        branchIds: [dept.branchId],
      });
      setSelectAllBranches(false);
    } else {
      setSelectedDept(null);
      setDeptForm({
        name: '',
        nameEn: '',
        branchId: '',
        branchIds: [],
      });
      setSelectAllBranches(false);
    }
    setOpenDeptDialog(true);
  };

  const handleCloseDeptDialog = () => {
    setOpenDeptDialog(false);
    setSelectedDept(null);
    setSelectAllBranches(false);
  };

  const handleToggleBranch = (branchId: string) => {
    setDeptForm(prev => {
      const newBranchIds = prev.branchIds.includes(branchId)
        ? prev.branchIds.filter(id => id !== branchId)
        : [...prev.branchIds, branchId];
      return { ...prev, branchIds: newBranchIds };
    });
  };

  const handleSelectAllBranches = (checked: boolean) => {
    setSelectAllBranches(checked);
    if (checked && branches) {
      const activeBranchIds = branches.filter(b => b.isActive).map(b => b.id);
      setDeptForm(prev => ({ ...prev, branchIds: activeBranchIds }));
    } else {
      setDeptForm(prev => ({ ...prev, branchIds: [] }));
    }
  };

  const handleSubmitDept = async () => {
    if (selectedDept) {
      // تحديث قسم موجود (فرع واحد فقط)
      updateDeptMutation.mutate({ 
        id: selectedDept.id, 
        data: { name: deptForm.name, nameEn: deptForm.nameEn, branchId: deptForm.branchId } 
      });
    } else {
      // إنشاء قسم جديد لكل فرع محدد
      if (deptForm.branchIds.length === 0) return;
      
      try {
        for (const branchId of deptForm.branchIds) {
          await createDeptMutation.mutateAsync({
            name: deptForm.name,
            nameEn: deptForm.nameEn,
            branchId: branchId,
          });
        }
        handleCloseDeptDialog();
      } catch (error) {
        console.error('Error creating departments:', error);
      }
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            الفروع والأقسام
          </Typography>
          <Typography variant="body2" color="text.secondary">
            إدارة فروع الشركة وأقسامها
          </Typography>
        </Box>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab icon={<Business />} iconPosition="start" label="الفروع" />
          <Tab icon={<AccountTree />} iconPosition="start" label="الأقسام" />
        </Tabs>
      </Box>

      {/* Branches Tab */}
      {tabValue === 0 && (
        <>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => handleOpenBranchDialog()}
            >
              إضافة فرع
            </Button>
          </Box>

          {loadingBranches ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : (
            <Grid container spacing={3}>
              {branches?.map((branch) => (
                <Grid item xs={12} md={6} lg={4} key={branch.id}>
                  <Card sx={{ height: '100%' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
                            <Business />
                          </Avatar>
                          <Box>
                            <Typography variant="h6" fontWeight="bold">
                              {branch.name}
                            </Typography>
                            <Chip
                              label={branch.isActive ? 'نشط' : 'غير نشط'}
                              color={branch.isActive ? 'success' : 'default'}
                              size="small"
                            />
                          </Box>
                        </Box>
                        <Box>
                          <IconButton size="small" onClick={() => handleOpenBranchDialog(branch)}>
                            <Edit />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              if (confirm('هل أنت متأكد من حذف هذا الفرع؟')) {
                                deleteBranchMutation.mutate(branch.id);
                              }
                            }}
                          >
                            <Delete />
                          </IconButton>
                        </Box>
                      </Box>

                      <Divider sx={{ my: 2 }} />

                      <List dense disablePadding>
                        <ListItem disablePadding sx={{ mb: 1 }}>
                          <LocationOn sx={{ mr: 1, color: 'text.secondary' }} fontSize="small" />
                          <ListItemText
                            primary="العنوان"
                            secondary={branch.address || 'غير محدد'}
                            primaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                          />
                        </ListItem>
                        <ListItem disablePadding sx={{ mb: 1 }}>
                          <Schedule sx={{ mr: 1, color: 'text.secondary' }} fontSize="small" />
                          <ListItemText
                            primary="أوقات العمل"
                            secondary={`${branch.workStartTime} - ${branch.workEndTime}`}
                            primaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                          />
                        </ListItem>
                        <ListItem disablePadding>
                          <People sx={{ mr: 1, color: 'text.secondary' }} fontSize="small" />
                          <ListItemText
                            primary="الموظفين"
                            secondary={`${branch._count?.users || 0} موظف`}
                            primaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                          />
                        </ListItem>
                      </List>

                      <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                        <Chip
                          icon={<LocationOn />}
                          label={`${branch.geofenceRadius}م نطاق`}
                          size="small"
                          variant="outlined"
                        />
                        <Chip
                          icon={<AccountTree />}
                          label={`${branch._count?.departments || 0} قسم`}
                          size="small"
                          variant="outlined"
                          color="primary"
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}

              {branches?.length === 0 && (
                <Grid item xs={12}>
                  <Alert severity="info">لا توجد فروع. اضغط على "إضافة فرع" لإنشاء فرع جديد.</Alert>
                </Grid>
              )}
            </Grid>
          )}
        </>
      )}

      {/* Departments Tab */}
      {tabValue === 1 && (
        <>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => handleOpenDeptDialog()}
              disabled={!branches?.length}
            >
              إضافة قسم
            </Button>
          </Box>

          {loadingDepts ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : (
            <Card>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>القسم</TableCell>
                      <TableCell>الاسم بالإنجليزي</TableCell>
                      <TableCell>الفرع</TableCell>
                      <TableCell>عدد الموظفين</TableCell>
                      <TableCell align="center">الإجراءات</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {departments?.map((dept) => (
                      <TableRow key={dept.id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar sx={{ bgcolor: 'secondary.main', width: 36, height: 36 }}>
                              <AccountTree fontSize="small" />
                            </Avatar>
                            <Typography fontWeight="bold">{dept.name}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{dept.nameEn || '-'}</TableCell>
                        <TableCell>
                          <Chip
                            label={branches?.find(b => b.id === dept.branchId)?.name || 'غير محدد'}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={`${dept._count?.users || 0} موظف`}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <IconButton size="small" onClick={() => handleOpenDeptDialog(dept)}>
                            <Edit />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              if (confirm('هل أنت متأكد من حذف هذا القسم؟')) {
                                deleteDeptMutation.mutate(dept.id);
                              }
                            }}
                          >
                            <Delete />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                    {departments?.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          <Typography color="text.secondary" py={4}>
                            لا توجد أقسام. اضغط على "إضافة قسم" لإنشاء قسم جديد.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          )}
        </>
      )}

      {/* Add/Edit Branch Dialog */}
      <Dialog open={openBranchDialog} onClose={handleCloseBranchDialog} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>
          {selectedBranch ? 'تعديل الفرع' : 'إضافة فرع جديد'}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="primary" gutterBottom>
                البيانات الأساسية
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="اسم الفرع (عربي) *"
                value={branchForm.name}
                onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="اسم الفرع (إنجليزي)"
                value={branchForm.nameEn}
                onChange={(e) => setBranchForm({ ...branchForm, nameEn: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="العنوان"
                value={branchForm.address}
                onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
                multiline
                rows={2}
              />
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2 }}>
                <Typography variant="subtitle2" color="primary">
                  الموقع الجغرافي (Geofencing)
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={gettingLocation ? <CircularProgress size={16} /> : <MyLocation />}
                    onClick={handleGetCurrentLocation}
                    disabled={gettingLocation}
                    color="success"
                  >
                    {gettingLocation ? 'جاري التحديد...' : 'التقاط موقعي الحالي'}
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Map />}
                    onClick={handleOpenInMaps}
                    disabled={!branchForm.latitude || !branchForm.longitude}
                  >
                    عرض على الخريطة
                  </Button>
                </Box>
              </Box>
            </Grid>
            
            {locationError && (
              <Grid item xs={12}>
                <Alert severity="error" onClose={() => setLocationError(null)}>
                  {locationError}
                </Alert>
              </Grid>
            )}
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="خط العرض (Latitude)"
                type="number"
                value={branchForm.latitude}
                onChange={(e) => setBranchForm({ ...branchForm, latitude: parseFloat(e.target.value) })}
                inputProps={{ step: 'any' }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="خط الطول (Longitude)"
                type="number"
                value={branchForm.longitude}
                onChange={(e) => setBranchForm({ ...branchForm, longitude: parseFloat(e.target.value) })}
                inputProps={{ step: 'any' }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="نطاق Geofence (متر)"
                type="number"
                value={branchForm.geofenceRadius}
                onChange={(e) => setBranchForm({ ...branchForm, geofenceRadius: parseInt(e.target.value) })}
                helperText="المسافة المسموح بها لتسجيل الحضور"
              />
            </Grid>
            
            {branchForm.latitude && branchForm.longitude && (
              <Grid item xs={12}>
                <Alert severity="info" icon={<LocationOn />}>
                  الموقع المحدد: {Number(branchForm.latitude).toFixed(6)}, {Number(branchForm.longitude).toFixed(6)}
                  <br />
                  <Typography variant="caption" color="text.secondary">
                    سيتم السماح بتسجيل الحضور للموظفين ضمن نطاق {branchForm.geofenceRadius} متر من هذا الموقع
                  </Typography>
                </Alert>
              </Grid>
            )}

            <Grid item xs={12}>
              <Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 2 }}>
                أوقات العمل
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="وقت بداية العمل"
                type="time"
                value={branchForm.workStartTime}
                onChange={(e) => setBranchForm({ ...branchForm, workStartTime: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="وقت نهاية العمل"
                type="time"
                value={branchForm.workEndTime}
                onChange={(e) => setBranchForm({ ...branchForm, workEndTime: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="فترة السماح للتأخير (دقيقة)"
                type="number"
                value={branchForm.lateGracePeriod}
                onChange={(e) => setBranchForm({ ...branchForm, lateGracePeriod: parseInt(e.target.value) })}
                helperText="الوقت المسموح به بعد بداية الدوام"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="فترة السماح للحضور المبكر (دقيقة)"
                type="number"
                value={branchForm.earlyCheckInPeriod}
                onChange={(e) => setBranchForm({ ...branchForm, earlyCheckInPeriod: parseInt(e.target.value) })}
                helperText="الوقت المسموح به قبل بداية الدوام"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="فترة السماح للانصراف المبكر (دقيقة)"
                type="number"
                value={branchForm.earlyCheckOutPeriod}
                onChange={(e) => setBranchForm({ ...branchForm, earlyCheckOutPeriod: parseInt(e.target.value) })}
                helperText="الوقت المسموح به قبل نهاية الدوام"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="أيام العمل (0-6 مفصولة بفاصلة)"
                value={branchForm.workingDays}
                onChange={(e) => setBranchForm({ ...branchForm, workingDays: e.target.value })}
                helperText="0=السبت، 1=الأحد، 2=الإثنين، 3=الثلاثاء، 4=الأربعاء، 5=الخميس، 6=الجمعة. مثال: 0,1,2,3,4"
                placeholder="0,1,2,3,4"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={branchForm.isActive}
                    onChange={(e) => setBranchForm({ ...branchForm, isActive: e.target.checked })}
                  />
                }
                label="الفرع نشط"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseBranchDialog}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleSubmitBranch}
            disabled={createBranchMutation.isPending || updateBranchMutation.isPending || !branchForm.name}
          >
            {createBranchMutation.isPending || updateBranchMutation.isPending ? (
              <CircularProgress size={24} />
            ) : selectedBranch ? 'تحديث' : 'إضافة'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add/Edit Department Dialog */}
      <Dialog open={openDeptDialog} onClose={handleCloseDeptDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: 'secondary.main', color: 'white' }}>
          {selectedDept ? 'تعديل القسم' : 'إضافة قسم جديد'}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="اسم القسم (عربي) *"
                value={deptForm.name}
                onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                required
                placeholder="مثال: قسم تقنية المعلومات"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="اسم القسم (إنجليزي)"
                value={deptForm.nameEn}
                onChange={(e) => setDeptForm({ ...deptForm, nameEn: e.target.value })}
                placeholder="مثال: IT Department"
              />
            </Grid>
            
            {/* عند التعديل: اختيار فرع واحد فقط */}
            {selectedDept ? (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  select
                  label="الفرع *"
                  value={deptForm.branchId}
                  onChange={(e) => setDeptForm({ ...deptForm, branchId: e.target.value })}
                  required
                  SelectProps={{ native: true }}
                  helperText="اختر الفرع الذي ينتمي إليه هذا القسم"
                >
                  <option value="">اختر الفرع</option>
                  {branches?.filter(b => b.isActive).map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </TextField>
              </Grid>
            ) : (
              /* عند الإضافة: اختيار فروع متعددة */
              <Grid item xs={12}>
                <FormControl component="fieldset" fullWidth>
                  <FormLabel component="legend" sx={{ mb: 1, fontWeight: 'bold' }}>
                    اختر الفروع *
                  </FormLabel>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    يمكنك إضافة هذا القسم لعدة فروع دفعة واحدة. سيتم إنشاء نسخة من القسم في كل فرع محدد.
                  </Alert>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={selectAllBranches}
                        onChange={(e) => handleSelectAllBranches(e.target.checked)}
                        color="secondary"
                      />
                    }
                    label={<Typography fontWeight="bold">تحديد جميع الفروع</Typography>}
                    sx={{ mb: 1, borderBottom: '1px solid #eee', pb: 1 }}
                  />
                  <FormGroup>
                    {branches?.filter(b => b.isActive).map((branch) => (
                      <FormControlLabel
                        key={branch.id}
                        control={
                          <Checkbox
                            checked={deptForm.branchIds.includes(branch.id)}
                            onChange={() => handleToggleBranch(branch.id)}
                            color="secondary"
                          />
                        }
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Business fontSize="small" color="action" />
                            <Typography>{branch.name}</Typography>
                            <Chip 
                              size="small" 
                              label={`${branch._count?.users || 0} موظف`} 
                              variant="outlined"
                            />
                          </Box>
                        }
                      />
                    ))}
                  </FormGroup>
                  {deptForm.branchIds.length > 0 && (
                    <Alert severity="success" sx={{ mt: 2 }}>
                      سيتم إنشاء القسم في {deptForm.branchIds.length} فرع/فروع
                    </Alert>
                  )}
                </FormControl>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseDeptDialog}>إلغاء</Button>
          <Button
            variant="contained"
            color="secondary"
            onClick={handleSubmitDept}
            disabled={
              createDeptMutation.isPending || 
              updateDeptMutation.isPending || 
              !deptForm.name || 
              (selectedDept ? !deptForm.branchId : deptForm.branchIds.length === 0)
            }
          >
            {createDeptMutation.isPending || updateDeptMutation.isPending ? (
              <CircularProgress size={24} />
            ) : selectedDept ? 'تحديث' : `إضافة${!selectedDept && deptForm.branchIds.length > 1 ? ` (${deptForm.branchIds.length} فروع)` : ''}`}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
