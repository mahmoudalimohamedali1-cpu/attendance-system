import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Box,
    Typography,
    Avatar,
    IconButton,
    Grid,
    Skeleton,
    Alert,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    Badge,
    CircularProgress,
    Divider,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    Snackbar,
    Tabs,
    Tab,
} from '@mui/material';
import {
    ArrowBack,
    Edit,
    Email,
    Phone,
    LocationOn,
    Work,
    CalendarMonth,
    Badge as BadgeIcon,
    Flight,
    AttachMoney,
    Description,
    Gavel,
    Inventory,
    Schedule,
    Person,
    TrendingUp,
    AccessTime,
    Save,
    Hub,
    Psychology,
    Cancel,
    CheckCircle,
    HourglassEmpty,
    Close,
} from '@mui/icons-material';
import { api } from '@/services/api.service';
import { useAuthStore } from '@/store/auth.store';

// Simple toast replacement

// Components
import { PersonalInfoTab } from './components/tabs/PersonalInfoTab';
import { EmploymentTab } from './components/tabs/EmploymentTab';
import { AttendanceTab } from './components/tabs/AttendanceTab';
import { LeavesTab } from './components/tabs/LeavesTab';
import { FinancialTab } from './components/tabs/FinancialTab';
import { DocumentsTab } from './components/tabs/DocumentsTab';
import { DisciplinaryTab } from './components/tabs/DisciplinaryTab';
import { CustodyTab } from './components/tabs/CustodyTab';
import { SkillsTab } from './components/tabs/SkillsTab';
import { CareerProgressionTab } from './components/tabs/CareerProgressionTab';
import { RequestOnBehalfModal } from './components/RequestOnBehalfModal';
import { AddCircleOutline } from '@mui/icons-material';

// Design Theme Colors
const theme = {
    coral: '#E8A87C',
    peach: '#F9DCC4',
    teal: '#41B3A3',
    navy: '#2D3748',
    lightBg: '#FDF6F0',
    white: '#FFFFFF',
    yellow: '#F5C469',
    red: '#E57373',
    green: '#81C784',
};

// Stat Card Component
const StatCard = ({ icon, label, value, color, trend }: { icon: React.ReactNode; label: string; value: string | number; color: string; trend?: string }) => (
    <Box
        sx={{
            bgcolor: theme.white,
            borderRadius: 4,
            p: 3,
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
            transition: 'transform 0.2s, box-shadow 0.2s',
            '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
            },
        }}
    >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="caption" color="text.secondary" fontWeight={500}>
                {label}
            </Typography>
            {trend && (
                <Chip
                    label={trend}
                    size="small"
                    sx={{
                        bgcolor: trend.startsWith('+') ? '#E8F5E9' : '#FFEBEE',
                        color: trend.startsWith('+') ? '#2E7D32' : '#C62828',
                        fontWeight: 600,
                        fontSize: '0.7rem',
                    }}
                />
            )}
        </Box>
        <Typography variant="h4" fontWeight="bold" color={theme.navy}>
            {value}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color }}>
            {icon}
        </Box>
    </Box>
);

// Navigation Item Component
const NavItem = ({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) => (
    <Box
        onClick={onClick}
        sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            py: 1.5,
            px: 2,
            borderRadius: 2,
            cursor: 'pointer',
            bgcolor: active ? theme.white : 'transparent',
            color: active ? theme.coral : theme.navy,
            fontWeight: active ? 600 : 400,
            boxShadow: active ? '0 2px 10px rgba(0,0,0,0.05)' : 'none',
            transition: 'all 0.2s',
            '&:hover': {
                bgcolor: active ? theme.white : 'rgba(255,255,255,0.5)',
            },
        }}
    >
        {icon}
        <Typography variant="body2" fontWeight={active ? 600 : 400}>
            {label}
        </Typography>
        {active && (
            <Box
                sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: theme.coral,
                    ml: 'auto',
                }}
            />
        )}
    </Box>
);

// Profile Update Request Types
interface ProfileUpdateRequest {
    id: string;
    fieldName: string;
    currentValue: string | null;
    requestedValue: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
    reason?: string;
    reviewNote?: string;
    rejectionReason?: string;
    createdAt: string;
    reviewer?: {
        firstName: string;
        lastName: string;
    };
}

// Field name to Arabic translation
const fieldNameTranslations: Record<string, string> = {
    firstName: 'الاسم الأول',
    lastName: 'الاسم الأخير',
    phone: 'رقم الهاتف',
    alternativePhone: 'رقم هاتف بديل',
    nationality: 'الجنسية',
    nationalId: 'رقم الهوية / الإقامة',
    maritalStatus: 'الحالة الاجتماعية',
    address: 'العنوان',
    city: 'المدينة',
    region: 'المنطقة',
    postalCode: 'الرمز البريدي',
    country: 'البلد',
    bloodType: 'فصيلة الدم',
    emergencyPhone: 'هاتف الطوارئ',
    emergencyContactName: 'اسم جهة اتصال الطوارئ',
    iqamaNumber: 'رقم الإقامة',
    passportNumber: 'رقم الجواز',
    passportExpiryDate: 'تاريخ انتهاء الجواز',
    iqamaExpiryDate: 'تاريخ انتهاء الإقامة',
};

const getFieldNameAr = (fieldName: string): string => {
    return fieldNameTranslations[fieldName] || fieldName;
};

const getStatusInfo = (status: string) => {
    switch (status) {
        case 'PENDING':
            return { label: 'قيد المراجعة', color: '#FF9800', icon: <HourglassEmpty fontSize="small" /> };
        case 'APPROVED':
            return { label: 'موافق عليه', color: '#4CAF50', icon: <CheckCircle fontSize="small" /> };
        case 'REJECTED':
            return { label: 'مرفوض', color: '#F44336', icon: <Cancel fontSize="small" /> };
        case 'CANCELLED':
            return { label: 'ملغي', color: '#9E9E9E', icon: <Cancel fontSize="small" /> };
        default:
            return { label: status, color: '#9E9E9E', icon: null };
    }
};

export const EmployeeProfilePage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { user: currentUser } = useAuthStore();
    const [activeTab, setActiveTab] = useState(0);
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editFormData, setEditFormData] = useState<any>(null);
    const [editModalTab, setEditModalTab] = useState(0);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
        open: false,
        message: '',
        severity: 'success',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Determine if user can edit directly (ADMIN/HR) or needs approval (EMPLOYEE)
    const isAdminOrHR = currentUser?.role === 'ADMIN' || (currentUser?.role as string) === 'HR';
    const isOwnProfile = currentUser?.id === id;

    // Queries
    const { data: profile, isLoading, error } = useQuery<any>({
        queryKey: ['employee-profile', id],
        queryFn: () => api.get(`/employee-profile/${id}`),
        enabled: !!id,
    });

    // Query for pending profile update requests
    const { data: updateRequestsData } = useQuery<{ data: ProfileUpdateRequest[] }>({
        queryKey: ['profile-update-requests', id],
        queryFn: () => api.get(`/employee-profile/${id}/update-requests`),
        enabled: !!id && isOwnProfile && !isAdminOrHR,
    });

    const pendingUpdateRequests = updateRequestsData?.data?.filter(r => r.status === 'PENDING') || [];
    const allUpdateRequests = updateRequestsData?.data || [];

    // Mutation to cancel update request
    const cancelUpdateMutation = useMutation({
        mutationFn: (requestId: string) => api.delete(`/employee-profile/update-requests/${requestId}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['profile-update-requests', id] });
            setSnackbar({ open: true, message: 'تم إلغاء الطلب بنجاح', severity: 'success' });
        },
        onError: (error: any) => {
            setSnackbar({
                open: true,
                message: error?.response?.data?.message || 'حدث خطأ أثناء إلغاء الطلب',
                severity: 'error',
            });
        },
    });

    // Handle edit submit - different behavior for Admin/HR vs Employee
    const handleEditSubmit = async () => {
        if (!editFormData) return;

        setIsSubmitting(true);
        try {
            if (isAdminOrHR) {
                // Admin/HR can update directly
                await api.patch(`/employee-profile/${id}`, editFormData);
                setSnackbar({ open: true, message: 'تم تحديث البيانات بنجاح', severity: 'success' });
                setIsEditModalOpen(false);
                queryClient.invalidateQueries({ queryKey: ['employee-profile', id] });
            } else {
                // Employee creates individual update requests for each changed field
                const p = profile as any;
                const changedFields: { fieldName: string; requestedValue: string }[] = [];

                // Compare each field and collect changes
                if (editFormData.firstName !== p.firstName && editFormData.firstName) {
                    changedFields.push({ fieldName: 'firstName', requestedValue: editFormData.firstName });
                }
                if (editFormData.lastName !== p.lastName && editFormData.lastName) {
                    changedFields.push({ fieldName: 'lastName', requestedValue: editFormData.lastName });
                }
                if (editFormData.phone !== p.phone) {
                    changedFields.push({ fieldName: 'phone', requestedValue: editFormData.phone || '' });
                }
                if (editFormData.nationality !== p.nationality) {
                    changedFields.push({ fieldName: 'nationality', requestedValue: editFormData.nationality || '' });
                }
                if (editFormData.nationalId !== p.nationalId) {
                    changedFields.push({ fieldName: 'nationalId', requestedValue: editFormData.nationalId || '' });
                }

                if (changedFields.length === 0) {
                    setSnackbar({ open: true, message: 'لا توجد تغييرات لطلب تحديثها', severity: 'info' });
                    setIsSubmitting(false);
                    return;
                }

                // Check for existing pending requests for the same fields
                const pendingFieldNames = pendingUpdateRequests.map(r => r.fieldName);
                const conflictingFields = changedFields.filter(f => pendingFieldNames.includes(f.fieldName));

                if (conflictingFields.length > 0) {
                    const conflictNames = conflictingFields.map(f => getFieldNameAr(f.fieldName)).join('، ');
                    setSnackbar({
                        open: true,
                        message: `يوجد طلب تحديث معلق للحقول التالية: ${conflictNames}`,
                        severity: 'error',
                    });
                    setIsSubmitting(false);
                    return;
                }

                // Create individual update requests
                let successCount = 0;
                for (const field of changedFields) {
                    try {
                        await api.post(`/employee-profile/${id}/update-requests`, {
                            updateType: 'PERSONAL_INFO',
                            fieldName: field.fieldName,
                            requestedValue: field.requestedValue,
                        });
                        successCount++;
                    } catch (err: any) {
                        // Continue with other fields even if one fails
                    }
                }

                if (successCount > 0) {
                    setSnackbar({
                        open: true,
                        message: `تم إرسال ${successCount} طلب تحديث للمراجعة بنجاح`,
                        severity: 'success',
                    });
                    queryClient.invalidateQueries({ queryKey: ['profile-update-requests', id] });
                    setIsEditModalOpen(false);
                    setEditModalTab(0);
                } else {
                    setSnackbar({ open: true, message: 'فشل إرسال طلبات التحديث', severity: 'error' });
                }
            }
        } catch (error: any) {
            setSnackbar({
                open: true,
                message: error?.response?.data?.message || 'حدث خطأ أثناء التحديث',
                severity: 'error',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const { data: attendanceStats } = useQuery<any>({
        queryKey: ['employee-attendance-stats', id],
        queryFn: () => api.get(`/employee-profile/${id}/attendance`),
        enabled: !!id,
    });

    const { data: leaveData } = useQuery<any>({
        queryKey: ['employee-leaves', id],
        queryFn: () => api.get(`/employee-profile/${id}/leaves`),
        enabled: !!id,
    });

    const { data: salaryInfo } = useQuery<any>({
        queryKey: ['employee-salary', id],
        queryFn: () => api.get(`/employee-profile/${id}/salary`),
        enabled: !!id,
    });

    const { data: documentsData } = useQuery<any>({
        queryKey: ['employee-documents', id],
        queryFn: () => api.get(`/employee-profile/${id}/documents`),
        enabled: !!id,
    });

    const tabs = [
        { label: 'لوحة التحكم', icon: <TrendingUp fontSize="small" /> },
        { label: 'البيانات الشخصية', icon: <Person fontSize="small" /> },
        { label: 'الوظيفة', icon: <Work fontSize="small" /> },
        { label: 'الحضور', icon: <Schedule fontSize="small" /> },
        { label: 'الإجازات', icon: <Flight fontSize="small" /> },
        { label: 'المالية', icon: <AttachMoney fontSize="small" /> },
        { label: 'الوثائق', icon: <Description fontSize="small" /> },
        { label: 'المهارات', icon: <Psychology fontSize="small" /> },
        { label: 'التأديبية', icon: <Gavel fontSize="small" /> },
        { label: 'العهد', icon: <Inventory fontSize="small" /> },
        { label: 'التدرج الوظيفي', icon: <Hub fontSize="small" /> },
    ];

    const formatDate = (date: string | Date | null) => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    const calculateYears = (hireDate: string | Date | null) => {
        if (!hireDate) return 0;
        const years = (new Date().getTime() - new Date(hireDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
        return Math.floor(years * 10) / 10;
    };

    if (isLoading) {
        return (
            <Box sx={{ minHeight: '100vh', bgcolor: theme.lightBg, p: 4 }}>
                <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 4 }} />
            </Box>
        );
    }

    if (error || !profile) {
        return (
            <Box sx={{ minHeight: '100vh', bgcolor: theme.lightBg, p: 4 }}>
                <Alert severity="error" sx={{ mb: 2, borderRadius: 3 }}>
                    فشل تحميل بيانات الموظف
                </Alert>
                <Button startIcon={<ArrowBack />} onClick={() => navigate('/users')}>
                    العودة للقائمة
                </Button>
            </Box>
        );
    }

    const p = profile as any;

    // Dashboard Tab Content
    const DashboardContent = () => (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Stats Row */}
            <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        icon={<AccessTime fontSize="small" />}
                        label="أيام الحضور"
                        value={attendanceStats?.presentDays || 0}
                        color={theme.teal}
                        trend="+5%"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        icon={<Flight fontSize="small" />}
                        label="رصيد الإجازات"
                        value={`${leaveData?.remainingLeaveDays || p.remainingLeaveDays || 0} يوم`}
                        color={theme.coral}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        icon={<AttachMoney fontSize="small" />}
                        label="الراتب"
                        value={salaryInfo?.totalSalary ? `${Number(salaryInfo.totalSalary).toLocaleString()} ر.س` : '-'}
                        color={theme.yellow}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        icon={<CalendarMonth fontSize="small" />}
                        label="سنوات الخدمة"
                        value={`${calculateYears(p.hireDate)} سنة`}
                        color={theme.green}
                    />
                </Grid>
            </Grid>

            {/* Activity & Info Section */}
            <Grid container spacing={3}>
                {/* Activity Chart Placeholder */}
                <Grid item xs={12} md={8}>
                    <Box
                        sx={{
                            bgcolor: theme.white,
                            borderRadius: 4,
                            p: 3,
                            boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                            <Typography variant="h6" fontWeight="bold" color={theme.navy}>
                                نشاط الحضور
                            </Typography>
                            <Chip label="آخر 7 أيام" size="small" sx={{ bgcolor: theme.peach }} />
                        </Box>

                        {/* Simple stats display */}
                        <Grid container spacing={2}>
                            <Grid item xs={4}>
                                <Box textAlign="center" py={3}>
                                    <Typography variant="h3" fontWeight="bold" color={theme.teal}>
                                        {attendanceStats?.attendanceRate || 0}%
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        نسبة الحضور
                                    </Typography>
                                </Box>
                            </Grid>
                            <Grid item xs={4}>
                                <Box textAlign="center" py={3}>
                                    <Typography variant="h3" fontWeight="bold" color={theme.coral}>
                                        {attendanceStats?.lateDays || 0}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        أيام التأخير
                                    </Typography>
                                </Box>
                            </Grid>
                            <Grid item xs={4}>
                                <Box textAlign="center" py={3}>
                                    <Typography variant="h3" fontWeight="bold" color={theme.yellow}>
                                        {Math.floor((attendanceStats?.totalOvertimeMinutes || 0) / 60)}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        ساعات إضافية
                                    </Typography>
                                </Box>
                            </Grid>
                        </Grid>
                    </Box>
                </Grid>

                {/* Quick Info */}
                <Grid item xs={12} md={4}>
                    <Box
                        sx={{
                            bgcolor: theme.white,
                            borderRadius: 4,
                            p: 3,
                            boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
                            height: '100%',
                        }}
                    >
                        <Typography variant="h6" fontWeight="bold" color={theme.navy} mb={2}>
                            معلومات سريعة
                        </Typography>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Box sx={{ p: 1, borderRadius: 2, bgcolor: `${theme.coral}20` }}>
                                    <Work fontSize="small" sx={{ color: theme.coral }} />
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">المسمى الوظيفي</Typography>
                                    <Typography variant="body2" fontWeight={600}>{p.jobTitleRef?.name || p.jobTitle || '-'}</Typography>
                                </Box>
                            </Box>

                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Box sx={{ p: 1, borderRadius: 2, bgcolor: `${theme.teal}20` }}>
                                    <LocationOn fontSize="small" sx={{ color: theme.teal }} />
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">الفرع</Typography>
                                    <Typography variant="body2" fontWeight={600}>{p.branch?.name || '-'}</Typography>
                                </Box>
                            </Box>

                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Box sx={{ p: 1, borderRadius: 2, bgcolor: `${theme.yellow}20` }}>
                                    <BadgeIcon fontSize="small" sx={{ color: theme.yellow }} />
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">كود الموظف</Typography>
                                    <Typography variant="body2" fontWeight={600}>{p.employeeCode || '-'}</Typography>
                                </Box>
                            </Box>

                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Box sx={{ p: 1, borderRadius: 2, bgcolor: `${theme.green}20` }}>
                                    <CalendarMonth fontSize="small" sx={{ color: theme.green }} />
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">تاريخ التعيين</Typography>
                                    <Typography variant="body2" fontWeight={600}>{formatDate(p.hireDate)}</Typography>
                                </Box>
                            </Box>

                            {/* Cost Center - مركز التكلفة */}
                            {p.costCenter && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Box sx={{ p: 1, borderRadius: 2, bgcolor: '#E3F2FD' }}>
                                        <Hub fontSize="small" sx={{ color: '#1976D2' }} />
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">مركز التكلفة</Typography>
                                        <Typography variant="body2" fontWeight={600}>
                                            {p.costCenter.nameAr || p.costCenter.name || '-'}
                                        </Typography>
                                        {p.costCenter.code && (
                                            <Typography variant="caption" color="text.secondary">
                                                ({p.costCenter.code})
                                            </Typography>
                                        )}
                                    </Box>
                                </Box>
                            )}
                        </Box>
                    </Box>
                </Grid>
            </Grid>
        </Box>
    );

    return (
        <Box
            sx={{
                minHeight: '100vh',
                bgcolor: theme.coral,
                display: 'flex',
            }}
        >
            {/* Sidebar */}
            <Box
                sx={{
                    width: 280,
                    bgcolor: theme.peach,
                    p: 3,
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: '0 40px 40px 0',
                }}
            >
                {/* Logo / Back */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 4 }}>
                    <IconButton onClick={() => navigate('/users')} sx={{ color: theme.navy }}>
                        <ArrowBack />
                    </IconButton>
                    <Typography variant="h6" fontWeight="bold" color={theme.navy}>
                        الموظفين
                    </Typography>
                </Box>

                {/* Profile Card */}
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        mb: 4,
                    }}
                >
                    <Avatar
                        src={p.avatar}
                        sx={{
                            width: 100,
                            height: 100,
                            border: `4px solid ${theme.yellow}`,
                            mb: 2,
                        }}
                    >
                        {p.firstName?.[0]}{p.lastName?.[0]}
                    </Avatar>
                    <Typography variant="h6" fontWeight="bold" color={theme.navy}>
                        {p.firstName} {p.lastName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {p.jobTitleRef?.name || p.jobTitle || 'موظف'}
                    </Typography>

                    {/* Contact Icons */}
                    <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                        <IconButton
                            size="small"
                            component="a"
                            href={`mailto:${p.email}`}
                            sx={{ bgcolor: theme.white, color: theme.coral }}
                        >
                            <Email fontSize="small" />
                        </IconButton>
                        <IconButton
                            size="small"
                            component="a"
                            href={`tel:${p.phone}`}
                            sx={{ bgcolor: theme.white, color: theme.teal }}
                        >
                            <Phone fontSize="small" />
                        </IconButton>
                        <Badge
                            badgeContent={pendingUpdateRequests.length}
                            color="warning"
                            sx={{
                                '& .MuiBadge-badge': {
                                    right: 2,
                                    top: 2,
                                    fontSize: '0.65rem',
                                    minWidth: '16px',
                                    height: '16px',
                                },
                            }}
                        >
                            <IconButton
                                size="small"
                                sx={{ bgcolor: theme.white, color: theme.navy }}
                                onClick={() => {
                                    // إذا كان أدمن أو HR، يروح لصفحة المستخدمين بالتعديل
                                    if (isAdminOrHR) {
                                        navigate(`/users?edit=${id}`);
                                    } else {
                                        // إذا كان الموظف نفسه، يفتح مودال التعديل المحلي (طلب تحديث)
                                        setEditFormData({
                                            firstName: p.firstName,
                                            lastName: p.lastName,
                                            phone: p.phone,
                                            nationality: p.nationality,
                                            nationalId: p.nationalId,
                                        });
                                        setEditModalTab(pendingUpdateRequests.length > 0 ? 1 : 0);
                                        setIsEditModalOpen(true);
                                    }
                                }}
                            >
                                <Edit fontSize="small" />
                            </IconButton>
                        </Badge>
                    </Box>

                    {/* Quick Request Button */}
                    <Button
                        variant="contained"
                        fullWidth
                        startIcon={<AddCircleOutline />}
                        onClick={() => setIsRequestModalOpen(true)}
                        sx={{
                            mt: 3,
                            bgcolor: theme.navy,
                            color: theme.white,
                            borderRadius: 3,
                            py: 1,
                            textTransform: 'none',
                            fontWeight: 600,
                            '&:hover': {
                                bgcolor: theme.coral,
                            },
                        }}
                    >
                        طلب بالنيابة
                    </Button>
                </Box>

                {/* Navigation */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1 }}>
                    {tabs.map((tab, index) => (
                        <NavItem
                            key={index}
                            icon={tab.icon}
                            label={tab.label}
                            active={activeTab === index}
                            onClick={() => setActiveTab(index)}
                        />
                    ))}
                </Box>
            </Box>

            {/* Main Content */}
            <Box sx={{ flex: 1, p: 4, overflow: 'auto' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
                    <Typography variant="h4" fontWeight="bold" color={theme.white}>
                        {tabs[activeTab].label}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        {/* Status Chip */}
                        <Chip
                            label={
                                p.status === 'ACTIVE' ? 'نشط' :
                                    p.status === 'TERMINATED' ? '🚫 تم إنهاء خدماته' :
                                        p.status === 'SUSPENDED' ? 'موقوف' : 'غير نشط'
                            }
                            sx={{
                                bgcolor: p.status === 'ACTIVE' ? theme.teal :
                                    p.status === 'TERMINATED' ? '#b91c1c' :
                                        p.status === 'SUSPENDED' ? theme.red : '#9E9E9E',
                                color: theme.white,
                                fontWeight: 600,
                                fontSize: p.status === 'TERMINATED' ? '0.9rem' : 'inherit',
                            }}
                        />
                        {/* Display hire and termination dates for terminated employees */}
                        {p.status === 'TERMINATED' && (
                            <Chip
                                label={`📅 التعيين: ${formatDate(p.hireDate)} → التصفية: ${formatDate(p.terminations?.[0]?.approvedAt || p.updatedAt)}`}
                                sx={{
                                    bgcolor: '#fecaca',
                                    color: '#7f1d1d',
                                    fontWeight: 500,
                                }}
                            />
                        )}
                    </Box>
                </Box>

                {/* Content Area */}
                <Box
                    sx={{
                        bgcolor: theme.lightBg,
                        borderRadius: 4,
                        p: 4,
                        minHeight: 'calc(100vh - 180px)',
                    }}
                >
                    {activeTab === 0 && <DashboardContent />}
                    {activeTab === 1 && <PersonalInfoTab profile={profile} userId={id} />}
                    {activeTab === 2 && <EmploymentTab profile={profile} />}
                    {activeTab === 3 && <AttendanceTab userId={id!} stats={attendanceStats} />}
                    {activeTab === 4 && <LeavesTab leaveData={leaveData} />}
                    {activeTab === 5 && <FinancialTab userId={id!} salaryInfo={salaryInfo} profile={profile} />}
                    {activeTab === 6 && <DocumentsTab userId={id!} documentsData={documentsData} />}
                    {activeTab === 7 && <SkillsTab userId={id!} />}
                    {activeTab === 8 && <DisciplinaryTab profile={profile} />}
                    {activeTab === 9 && <CustodyTab profile={profile} />}
                    {activeTab === 10 && <CareerProgressionTab userId={id!} />}
                </Box>
            </Box>

            {/* Modals */}
            <RequestOnBehalfModal
                open={isRequestModalOpen}
                onClose={() => setIsRequestModalOpen(false)}
                employeeId={id!}
            />

            {/* Profile Edit Request Dialog */}
            <Dialog
                open={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setEditModalTab(0);
                }}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle sx={{ fontWeight: 600, color: theme.navy, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                        {isAdminOrHR
                            ? 'تعديل بيانات الموظف'
                            : 'طلب تحديث بيانات الملف الشخصي'}
                    </Box>
                    <IconButton
                        size="small"
                        onClick={() => {
                            setIsEditModalOpen(false);
                            setEditModalTab(0);
                        }}
                    >
                        <Close />
                    </IconButton>
                </DialogTitle>

                {/* Tabs for employees (non-admin/HR) */}
                {!isAdminOrHR && isOwnProfile && (
                    <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
                        <Tabs
                            value={editModalTab}
                            onChange={(_, newValue) => setEditModalTab(newValue)}
                            sx={{
                                '& .MuiTab-root': { fontSize: '0.875rem' },
                            }}
                        >
                            <Tab label="تعديل البيانات" />
                            <Tab
                                label={
                                    <Badge badgeContent={pendingUpdateRequests.length} color="warning" sx={{ '& .MuiBadge-badge': { right: -10 } }}>
                                        طلبات التحديث
                                    </Badge>
                                }
                            />
                        </Tabs>
                    </Box>
                )}

                <DialogContent sx={{ pt: 2 }}>
                    {/* Tab 0: Edit Form */}
                    {(isAdminOrHR || editModalTab === 0) && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <TextField
                                label="الاسم الأول"
                                fullWidth
                                value={editFormData?.firstName || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, firstName: e.target.value })}
                                disabled={isSubmitting}
                            />
                            <TextField
                                label="الاسم الأخير"
                                fullWidth
                                value={editFormData?.lastName || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, lastName: e.target.value })}
                                disabled={isSubmitting}
                            />
                            <TextField
                                label="رقم الهاتف"
                                fullWidth
                                value={editFormData?.phone || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                                disabled={isSubmitting}
                            />
                            <TextField
                                label="الجنسية"
                                fullWidth
                                value={editFormData?.nationality || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, nationality: e.target.value })}
                                disabled={isSubmitting}
                            />
                            <TextField
                                label="رقم الهوية / الإقامة"
                                fullWidth
                                value={editFormData?.nationalId || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, nationalId: e.target.value })}
                                disabled={isSubmitting}
                            />
                            {!isAdminOrHR && (
                                <Alert severity="info" sx={{ mt: 1 }}>
                                    سيتم إرسال هذه التعديلات للمراجعة من قبل إدارة الموارد البشرية.
                                </Alert>
                            )}
                        </Box>
                    )}

                    {/* Tab 1: Pending Update Requests (only for employees) */}
                    {!isAdminOrHR && editModalTab === 1 && (
                        <Box>
                            {allUpdateRequests.length === 0 ? (
                                <Alert severity="info">
                                    لا توجد طلبات تحديث سابقة
                                </Alert>
                            ) : (
                                <List sx={{ pt: 0 }}>
                                    {allUpdateRequests.map((request) => {
                                        const statusInfo = getStatusInfo(request.status);
                                        return (
                                            <Box key={request.id}>
                                                <ListItem
                                                    sx={{
                                                        bgcolor: request.status === 'PENDING' ? '#FFF8E1' : 'transparent',
                                                        borderRadius: 2,
                                                        mb: 1,
                                                        border: '1px solid',
                                                        borderColor: request.status === 'PENDING' ? '#FFE082' : 'divider',
                                                    }}
                                                >
                                                    <ListItemText
                                                        primary={
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                <Typography fontWeight={600}>
                                                                    {getFieldNameAr(request.fieldName)}
                                                                </Typography>
                                                                <Chip
                                                                    label={statusInfo.label}
                                                                    size="small"
                                                                    icon={statusInfo.icon || undefined}
                                                                    sx={{
                                                                        bgcolor: `${statusInfo.color}20`,
                                                                        color: statusInfo.color,
                                                                        fontWeight: 600,
                                                                        fontSize: '0.7rem',
                                                                    }}
                                                                />
                                                            </Box>
                                                        }
                                                        secondary={
                                                            <Box sx={{ mt: 1 }}>
                                                                <Typography variant="caption" color="text.secondary" component="div">
                                                                    القيمة الحالية: {request.currentValue || '-'}
                                                                </Typography>
                                                                <Typography variant="caption" color="primary" component="div">
                                                                    القيمة المطلوبة: {request.requestedValue}
                                                                </Typography>
                                                                <Typography variant="caption" color="text.secondary" component="div">
                                                                    تاريخ الطلب: {new Date(request.createdAt).toLocaleDateString('ar-SA')}
                                                                </Typography>
                                                                {request.status === 'REJECTED' && request.rejectionReason && (
                                                                    <Typography variant="caption" color="error" component="div">
                                                                        سبب الرفض: {request.rejectionReason}
                                                                    </Typography>
                                                                )}
                                                                {request.reviewer && (
                                                                    <Typography variant="caption" color="text.secondary" component="div">
                                                                        تمت المراجعة بواسطة: {request.reviewer.firstName} {request.reviewer.lastName}
                                                                    </Typography>
                                                                )}
                                                            </Box>
                                                        }
                                                    />
                                                    {request.status === 'PENDING' && (
                                                        <ListItemSecondaryAction>
                                                            <Button
                                                                size="small"
                                                                color="error"
                                                                onClick={() => cancelUpdateMutation.mutate(request.id)}
                                                                disabled={cancelUpdateMutation.isPending}
                                                                startIcon={cancelUpdateMutation.isPending ? <CircularProgress size={16} /> : <Cancel />}
                                                            >
                                                                إلغاء
                                                            </Button>
                                                        </ListItemSecondaryAction>
                                                    )}
                                                </ListItem>
                                            </Box>
                                        );
                                    })}
                                </List>
                            )}
                        </Box>
                    )}
                </DialogContent>

                {/* Actions - only show for edit tab */}
                {(isAdminOrHR || editModalTab === 0) && (
                    <DialogActions sx={{ px: 3, pb: 2 }}>
                        <Button
                            onClick={() => {
                                setIsEditModalOpen(false);
                                setEditModalTab(0);
                            }}
                            color="inherit"
                            disabled={isSubmitting}
                        >
                            إلغاء
                        </Button>
                        <Button
                            onClick={handleEditSubmit}
                            variant="contained"
                            disabled={isSubmitting}
                            startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : <Save />}
                            sx={{ bgcolor: theme.coral, '&:hover': { bgcolor: theme.navy } }}
                        >
                            {isSubmitting ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                        </Button>
                    </DialogActions>
                )}
            </Dialog>

            {/* Snackbar for notifications */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                    severity={snackbar.severity}
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default EmployeeProfilePage;
