import React from 'react';
import { Box, Avatar, Typography, Badge, CircularProgress, Alert } from '@mui/material';
import {
    Dashboard as DashboardIcon,
    Analytics,
    Assessment,
    Comment,
    Devices,
    Logout,
    AccessTime,
    People,
    PersonOff,
    Schedule,
    TrendingUp,
    CalendarMonth,
    Assignment,
} from '@mui/icons-material';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api.service';
import { useAuthStore } from '@/store/auth.store';
import './ModernDashboard.css';

interface DashboardStats {
    employees: { total: number; active: number };
    today: {
        present: number;
        late: number;
        earlyLeave: number;
        absent: number;
        workFromHome: number;
    };
    pendingLeaves: number;
    pendingLetters?: number;
    pendingRaises?: number;
    pendingAdvances?: number;
    pendingDataUpdates?: number;
}

// Navigation items
const navItems = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: DashboardIcon, path: '/' },
    { id: 'analytics', label: 'التحليلات', icon: Analytics, path: '/reports' },
    { id: 'reports', label: 'التقارير', icon: Assessment, path: '/attendance' },
    { id: 'comments', label: 'التعليقات', icon: Comment, path: '/tasks' },
    { id: 'channels', label: 'القنوات', icon: Devices, path: '/employees' },
];

// Stat card colors (matching design)
const statColors = {
    employees: { bg: 'linear-gradient(135deg, #fff 0%, #c4e4ff 100%)', icon: '#3498db', iconBg: 'rgba(52, 152, 219, 0.15)' },
    present: { bg: 'linear-gradient(135deg, #fff 0%, #c8f0e8 100%)', icon: '#2ecc71', iconBg: 'rgba(46, 204, 113, 0.15)' },
    late: { bg: 'linear-gradient(135deg, #fff 0%, #ffd4c4 100%)', icon: '#f39c12', iconBg: 'rgba(243, 156, 18, 0.15)' },
    absent: { bg: 'linear-gradient(135deg, #fff 0%, #ffc4d4 100%)', icon: '#e74c3c', iconBg: 'rgba(231, 76, 60, 0.15)' },
};

// Chart colors
const CHART_COLORS = ['#2ecc71', '#f39c12', '#e74c3c', '#9b59b6'];

export const ModernDashboardView: React.FC = () => {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [activeNav, setActiveNav] = React.useState('dashboard');

    // Fetch dashboard data
    const { data: stats, isLoading, error } = useQuery<DashboardStats>({
        queryKey: ['dashboard'],
        queryFn: () => api.get('/reports/dashboard'),
        refetchInterval: 60000,
    });

    // Weekly stats for chart
    const { data: weeklyStatsData } = useQuery<{ data: Array<{ date: string; present: number; late: number; absent: number }> }>({
        queryKey: ['weekly-stats'],
        queryFn: () => api.get('/reports/weekly-summary'),
    });

    // Recent attendance for activity feed
    const { data: recentAttendance } = useQuery<{ data: Array<{ id: string; user: { firstName: string; lastName: string; avatar?: string }; checkInTime: string | null; status: string }> }>({
        queryKey: ['recent-attendance'],
        queryFn: () => api.get('/attendance/admin/all?limit=5'),
    });

    if (isLoading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" sx={{ background: '#faf8f5' }}>
                <CircularProgress size={60} sx={{ color: '#ff8c5a' }} />
            </Box>
        );
    }

    if (error) {
        return (
            <Box p={4} sx={{ background: '#faf8f5', minHeight: '100vh' }}>
                <Alert severity="error">فشل تحميل البيانات. تأكد من أن الخادم يعمل.</Alert>
            </Box>
        );
    }

    const dashboardStats = stats || {
        employees: { total: 0, active: 0 },
        today: { present: 0, late: 0, earlyLeave: 0, absent: 0, workFromHome: 0 },
        pendingLeaves: 0,
    };

    // Prepare chart data
    const weeklyChartData = weeklyStatsData?.data?.map(item => ({
        name: new Date(item.date).toLocaleDateString('ar-EG', { weekday: 'short' }),
        الحضور: item.present || 0,
        التأخير: item.late || 0,
    })) || [
            { name: 'السبت', الحضور: 45, التأخير: 5 },
            { name: 'الأحد', الحضور: 52, التأخير: 8 },
            { name: 'الإثنين', الحضور: 48, التأخير: 6 },
            { name: 'الثلاثاء', الحضور: 55, التأخير: 4 },
            { name: 'الأربعاء', الحضور: 50, التأخير: 7 },
            { name: 'الخميس', الحضور: 42, التأخير: 3 },
        ];

    const pieData = [
        { name: 'حاضر', value: dashboardStats.today.present, color: '#2ecc71' },
        { name: 'متأخر', value: dashboardStats.today.late, color: '#f39c12' },
        { name: 'غائب', value: dashboardStats.today.absent, color: '#e74c3c' },
        { name: 'من المنزل', value: dashboardStats.today.workFromHome, color: '#9b59b6' },
    ].filter(item => item.value > 0);

    const attendanceRate = dashboardStats.employees.total > 0
        ? Math.round((dashboardStats.today.present / dashboardStats.employees.total) * 100)
        : 0;

    // Top performers (mock data - can be replaced with real API)
    const topPerformers = [
        { name: 'ليلى حسن', role: 'مديرة المشاريع', percentage: 95 },
        { name: 'أحمد خالد', role: 'مطور أول', percentage: 92 },
        { name: 'فاطمة يوسف', role: 'محللة بيانات', percentage: 88 },
    ];

    return (
        <Box className="modern-dashboard">
            {/* Sidebar - Right Side (RTL) */}
            <Box className="dashboard-sidebar">
                {/* Profile */}
                <Box className="sidebar-profile">
                    <Avatar
                        src={user?.avatar || undefined}
                        sx={{
                            width: 80,
                            height: 80,
                            margin: '0 auto 12px',
                            border: '3px solid #ffd4c4',
                        }}
                    >
                        {user?.firstName?.charAt(0)}
                    </Avatar>
                    <Typography className="sidebar-name">
                        {user?.firstName} {user?.lastName}
                    </Typography>
                    <Typography className="sidebar-role">
                        {user?.role === 'ADMIN' ? 'مدير النظام' : user?.role === 'HR' ? 'الموارد البشرية' : user?.role === 'MANAGER' ? 'مدير' : 'موظف'}
                    </Typography>
                </Box>

                {/* Navigation */}
                <Box className="sidebar-nav">
                    {navItems.map((item) => (
                        <Box
                            key={item.id}
                            className={`nav-item ${activeNav === item.id ? 'active' : ''}`}
                            onClick={() => {
                                setActiveNav(item.id);
                                navigate(item.path);
                            }}
                        >
                            <item.icon className="nav-icon" />
                            <span>{item.label}</span>
                        </Box>
                    ))}
                </Box>

                {/* Logout */}
                <Box className="sidebar-logout" onClick={() => navigate('/login')}>
                    <Logout sx={{ fontSize: 20 }} />
                    <span>تسجيل الخروج</span>
                </Box>
            </Box>

            {/* Main Content */}
            <Box className="dashboard-main">
                {/* Header */}
                <Box className="dashboard-header">
                    <Box className="dashboard-title">
                        لوحة التحكم
                        <Badge
                            badgeContent={dashboardStats.pendingLeaves + (dashboardStats.pendingLetters || 0)}
                            sx={{
                                '& .MuiBadge-badge': {
                                    background: '#ff8c5a',
                                    color: 'white',
                                }
                            }}
                        >
                            <Box sx={{ width: 8 }} />
                        </Badge>
                    </Box>
                </Box>

                {/* Quick Actions */}
                <Box className="quick-actions">
                    <Box className="action-pill" onClick={() => navigate('/attendance')}>
                        <AccessTime sx={{ fontSize: 18 }} />
                        تسجيل الدخول
                    </Box>
                    <Box className="action-pill" onClick={() => navigate('/leaves')}>
                        <CalendarMonth sx={{ fontSize: 18 }} />
                        جدولة إجازة
                    </Box>
                    <Box className="action-pill" onClick={() => navigate('/tasks')}>
                        <Assignment sx={{ fontSize: 18 }} />
                        عرض المهام
                    </Box>
                </Box>

                {/* Stats Row */}
                <Box className="stats-row">
                    {/* Employees */}
                    <Box className="stat-card" sx={{ background: statColors.employees.bg }}>
                        <Box className="stat-icon" sx={{ background: statColors.employees.iconBg }}>
                            <People sx={{ color: statColors.employees.icon }} />
                        </Box>
                        <Typography className="stat-value">{dashboardStats.employees.total}</Typography>
                        <Typography className="stat-label">الموظفين</Typography>
                    </Box>

                    {/* Present */}
                    <Box className="stat-card" sx={{ background: statColors.present.bg }}>
                        <Box className="stat-icon" sx={{ background: statColors.present.iconBg }}>
                            <TrendingUp sx={{ color: statColors.present.icon }} />
                        </Box>
                        <Typography className="stat-value">{dashboardStats.today.present}</Typography>
                        <Typography className="stat-label">الحاضرين</Typography>
                    </Box>

                    {/* Late */}
                    <Box className="stat-card" sx={{ background: statColors.late.bg }}>
                        <Box className="stat-icon" sx={{ background: statColors.late.iconBg }}>
                            <Schedule sx={{ color: statColors.late.icon }} />
                        </Box>
                        <Typography className="stat-value">{dashboardStats.today.late}</Typography>
                        <Typography className="stat-label">المتأخرين</Typography>
                    </Box>

                    {/* Absent */}
                    <Box className="stat-card" sx={{ background: statColors.absent.bg }}>
                        <Box className="stat-icon" sx={{ background: statColors.absent.iconBg }}>
                            <PersonOff sx={{ color: statColors.absent.icon }} />
                        </Box>
                        <Typography className="stat-value">{dashboardStats.today.absent}</Typography>
                        <Typography className="stat-label">الغائبين</Typography>
                    </Box>
                </Box>

                {/* Charts Section */}
                <Box className="charts-section">
                    {/* Activity Chart */}
                    <Box className="chart-card">
                        <Box className="chart-header">
                            <Typography className="chart-title">النشاط</Typography>
                            <select className="chart-selector">
                                <option>آخر 7 أيام</option>
                                <option>آخر 30 يوم</option>
                                <option>هذا الشهر</option>
                            </select>
                        </Box>
                        <ResponsiveContainer width="100%" height={220}>
                            <AreaChart data={weeklyChartData}>
                                <defs>
                                    <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ffd4c4" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#ffd4c4" stopOpacity={0.1} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0ebe5" />
                                <XAxis dataKey="name" stroke="#636e72" fontSize={12} />
                                <YAxis stroke="#636e72" fontSize={12} />
                                <Tooltip
                                    contentStyle={{
                                        background: 'white',
                                        border: 'none',
                                        borderRadius: 12,
                                        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="الحضور"
                                    stroke="#ff8c5a"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorPresent)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </Box>

                    {/* Donut Chart + Top Performers */}
                    <Box className="chart-card">
                        <Typography className="chart-title" sx={{ mb: 2 }}>أفضل الموظفين</Typography>
                        {topPerformers.map((performer, index) => (
                            <Box key={index} className="performer-item">
                                <Avatar sx={{ width: 44, height: 44, bgcolor: CHART_COLORS[index % CHART_COLORS.length] }}>
                                    {performer.name.charAt(0)}
                                </Avatar>
                                <Box className="performer-info">
                                    <Typography className="performer-name">{performer.name}</Typography>
                                    <Typography className="performer-role">{performer.role}</Typography>
                                </Box>
                                <Typography className="performer-percentage">{performer.percentage}%</Typography>
                            </Box>
                        ))}
                    </Box>
                </Box>

                {/* Promo Card */}
                <Box className="promo-card">
                    <Box className="promo-content">
                        <Typography variant="h5" fontWeight={700} color="#2d3436" mb={2}>
                            طوّر فريقك
                        </Typography>
                        <Box
                            component="button"
                            className="promo-button"
                            onClick={() => navigate('/employees')}
                        >
                            الآن
                        </Box>
                    </Box>
                    <Box sx={{
                        width: 120,
                        height: 80,
                        background: 'linear-gradient(135deg, #ff8c5a 0%, #ffd4c4 50%, #c8f0e8 100%)',
                        borderRadius: '50%',
                        opacity: 0.6
                    }} />
                </Box>

                {/* Channels / Quick Stats */}
                <Box className="channels-card">
                    <Box className="channels-info">
                        <Typography variant="h6" fontWeight={700}>القنوات</Typography>
                        <Typography variant="body2" color="text.secondary">
                            إحصائيات الأسبوع
                        </Typography>
                    </Box>

                    <Box className="channel-item">
                        <Typography className="channel-name">الإجازات</Typography>
                        <Typography className="channel-change positive">+{dashboardStats.pendingLeaves || 0}</Typography>
                    </Box>

                    <Box className="channel-item">
                        <Typography className="channel-name">الخطابات</Typography>
                        <Typography className="channel-change positive">+{dashboardStats.pendingLetters || 0}</Typography>
                    </Box>

                    <Box className="channel-item">
                        <Typography className="channel-name">الزيادات</Typography>
                        <Typography className="channel-change positive">+{dashboardStats.pendingRaises || 0}</Typography>
                    </Box>

                    <Box className="channel-item">
                        <Typography className="channel-name">السلف</Typography>
                        <Typography className="channel-change positive">+{dashboardStats.pendingAdvances || 0}</Typography>
                    </Box>

                    <Box
                        sx={{
                            background: '#4ecca3',
                            color: 'white',
                            padding: '16px 24px',
                            borderRadius: 16,
                            cursor: 'pointer',
                            fontWeight: 600,
                            '&:hover': { background: '#3dbb8f' }
                        }}
                        onClick={() => navigate('/reports')}
                    >
                        عرض الكل
                    </Box>
                </Box>
            </Box>
        </Box>
    );
};

export default ModernDashboardView;
