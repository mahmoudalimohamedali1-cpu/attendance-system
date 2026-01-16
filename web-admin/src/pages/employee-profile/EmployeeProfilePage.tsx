import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
} from '@mui/material';
import {
    ArrowBack,
    Edit,
    Email,
    Phone,
    LocationOn,
    Work,
    CalendarMonth,
    Badge,
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

export const EmployeeProfilePage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { user: currentUser } = useAuthStore();
    const [activeTab, setActiveTab] = useState(0);
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editFormData, setEditFormData] = useState<any>(null);

    // Queries
    const { data: profile, isLoading, error } = useQuery<any>({
        queryKey: ['employee-profile', id],
        queryFn: () => api.get(`/employee-profile/${id}`),
        enabled: !!id,
    });

    const handleEditSubmit = async () => {
        try {
            await api.patch(`/employee-profile/${id}`, editFormData);
            const successMsg = currentUser?.role === 'ADMIN' || (currentUser?.role as string) === 'HR'
                ? 'تم تحديث البيانات بنجاح'
                : 'تم إرسال طلب التحديث للمراجعة بنجاح';
            alert(successMsg);
            setIsEditModalOpen(false);
            // إعادة جلب البيانات
            queryClient.invalidateQueries({ queryKey: ['employee-profile', id] });
        } catch (error: any) {
            alert(error?.response?.data?.message || 'حدث خطأ أثناء التحديث');
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
        { label: 'التأديبية', icon: <Gavel fontSize="small" /> },
        { label: 'العهد', icon: <Inventory fontSize="small" /> },
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
                                    <Badge fontSize="small" sx={{ color: theme.yellow }} />
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
                        <IconButton
                            size="small"
                            sx={{ bgcolor: theme.white, color: theme.navy }}
                            onClick={() => {
                                // إذا كان أدمن أو HR، يروح لصفحة المستخدمين بالتعديل
                                if (currentUser?.role === 'ADMIN' || (currentUser?.role as string) === 'HR') {
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
                                    setIsEditModalOpen(true);
                                }
                            }}
                        >
                            <Edit fontSize="small" />
                        </IconButton>
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
                {/* Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
                    <Typography variant="h4" fontWeight="bold" color={theme.white}>
                        {tabs[activeTab].label}
                    </Typography>
                    <Chip
                        label={p.status === 'ACTIVE' ? 'نشط' : 'غير نشط'}
                        sx={{
                            bgcolor: p.status === 'ACTIVE' ? theme.teal : theme.red,
                            color: theme.white,
                            fontWeight: 600,
                        }}
                    />
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
                    {activeTab === 1 && <PersonalInfoTab profile={profile} />}
                    {activeTab === 2 && <EmploymentTab profile={profile} />}
                    {activeTab === 3 && <AttendanceTab userId={id!} stats={attendanceStats} />}
                    {activeTab === 4 && <LeavesTab leaveData={leaveData} />}
                    {activeTab === 5 && <FinancialTab userId={id!} salaryInfo={salaryInfo} profile={profile} />}
                    {activeTab === 6 && <DocumentsTab userId={id!} documentsData={documentsData} />}
                    {activeTab === 7 && <DisciplinaryTab profile={profile} />}
                    {activeTab === 8 && <CustodyTab profile={profile} />}
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
                onClose={() => setIsEditModalOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle sx={{ fontWeight: 600, color: theme.navy }}>
                    {currentUser?.role === 'ADMIN' || (currentUser?.role as string) === 'HR'
                        ? 'تعديل بيانات الموظف'
                        : 'طلب تحديث بيانات الملف الشخصي'}
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField
                            label="الاسم الأول"
                            fullWidth
                            value={editFormData?.firstName || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, firstName: e.target.value })}
                        />
                        <TextField
                            label="الاسم الأخير"
                            fullWidth
                            value={editFormData?.lastName || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, lastName: e.target.value })}
                        />
                        <TextField
                            label="رقم الهاتف"
                            fullWidth
                            value={editFormData?.phone || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                        />
                        <TextField
                            label="الجنسية"
                            fullWidth
                            value={editFormData?.nationality || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, nationality: e.target.value })}
                        />
                        <TextField
                            label="رقم الهوية / الإقامة"
                            fullWidth
                            value={editFormData?.nationalId || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, nationalId: e.target.value })}
                        />
                        {!(currentUser?.role === 'ADMIN' || (currentUser?.role as string) === 'HR') && (
                            <Alert severity="info" sx={{ mt: 1 }}>
                                سيتم إرسال هذه التعديلات للمراجعة من قبل إدارة الموارد البشرية.
                            </Alert>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setIsEditModalOpen(false)} color="inherit">
                        إلغاء
                    </Button>
                    <Button
                        onClick={handleEditSubmit}
                        variant="contained"
                        startIcon={<Save />}
                        sx={{ bgcolor: theme.coral, '&:hover': { bgcolor: theme.navy } }}
                    >
                        حفظ التعديلات
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default EmployeeProfilePage;
