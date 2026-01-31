import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Badge,
  Divider,
  useTheme,
  useMediaQuery,
  CircularProgress,
  Collapse,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  People,
  AccessTime,
  Business,
  EventNote,
  Assessment,
  Settings,
  Logout,
  Person,
  Sync as SyncIcon,
  Description,
  Security,
  MonetizationOn,
  ExpandLess,
  ExpandMore,
  Payments,
  Receipt as ReceiptIcon,
  MyLocation as LocationIcon,
  AccountTree,
  AutoAwesome,
  TrendingUp,
  Star,
  EmojiEvents,
  Psychology as PsychologyIcon,
  Storefront as StorefrontIcon,
  Insights as InsightsIcon,
  Timeline as TimelineIcon,
  LocalShipping as LogisticsIcon,
  Speed as SpeedIcon,
  Link as LinkIcon,
  Forum as ForumIcon,
  AccountBalance,
} from '@mui/icons-material';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/services/api.service';
import { useSidebarBadges } from '@/contexts/SidebarBadgesContext';
import { NotificationsBell } from '@/components/notifications/NotificationsBell';

const drawerWidth = 280;

// Modern Theme Colors
const MODERN_THEME = {
  bg: '#faf8f5',
  sidebarBg: '#ffffff',
  peach: '#ffe4d6',
  cream: '#fff8f0',
  mint: '#e8f5e9',
  rose: '#ffc4d4',
  orange: '#ff8c5a',
  green: '#7dd4a8',
  textPrimary: '#2d3436',
  textSecondary: '#636e72',
  border: '#f0ebe5',
};

interface MenuItem {
  text: string;
  icon: JSX.Element;
  path: string;
  badge?: boolean;
  // Permission requirements - if undefined, always visible
  // 'ADMIN' = admin only, 'MANAGER' = admin or manager, permission codes for specific permissions
  requiredRole?: 'ADMIN' | 'MANAGER';
  requiredPermission?: string[]; // Any of these permissions grants access
}

interface MenuGroup {
  text: string;
  icon: JSX.Element;
  requiredRole?: 'ADMIN' | 'MANAGER';
  children: MenuItem[];
}

const allMenuItems: MenuItem[] = [
  // Employee Self-Service (visible to all users)
  { text: 'كشوفات راتبي', icon: <ReceiptIcon />, path: '/my-payslips' },
  { text: 'عقودي', icon: <Description />, path: '/my-contracts' },

  // Dashboard Group
  { text: 'نظرة عامة', icon: <Dashboard />, path: '/dashboard' },
  { text: 'لوحة الرواتب', icon: <Dashboard />, path: '/payroll-dashboard', requiredRole: 'ADMIN' },
  { text: 'نظرة الالتزام', icon: <Dashboard />, path: '/compliance', requiredRole: 'ADMIN' },

  // HR Management
  { text: 'المستخدمين', icon: <People />, path: '/users', requiredRole: 'ADMIN', requiredPermission: ['EMPLOYEES_VIEW', 'EMPLOYEES_EDIT'] },
  { text: 'الحضور والانصراف', icon: <AccessTime />, path: '/attendance', requiredPermission: ['ATTENDANCE_VIEW', 'ATTENDANCE_EDIT'] },
  { text: 'تتبع الموظفين', icon: <LocationIcon />, path: '/tracking', requiredRole: 'ADMIN', requiredPermission: ['ATTENDANCE_VIEW'] },
  { text: 'الهيكل التنظيمي', icon: <AccountTree />, path: '/org-structure', requiredRole: 'ADMIN' },
  { text: 'المهام', icon: <AutoAwesome />, path: '/tasks', requiredPermission: ['EMPLOYEES_VIEW', 'EMPLOYEES_EDIT'] },
  { text: '👥 تعاون الفريق', icon: <People />, path: '/team-collaboration', requiredRole: 'ADMIN' },
  { text: '📊 إدارة المشاريع', icon: <AccountTree />, path: '/projects', requiredRole: 'ADMIN' },
  { text: '📢 ساحة التواصل', icon: <ForumIcon />, path: '/social-feed' },
  { text: '🧠 المساعد الذكي', icon: <AutoAwesome />, path: '/genius-ai' },
  { text: '📊 التحليلات التنبؤية', icon: <InsightsIcon />, path: '/ai-predictive' },
  { text: 'الإجازات', icon: <EventNote />, path: '/leaves', requiredPermission: ['LEAVES_VIEW', 'LEAVES_APPROVE', 'LEAVES_APPROVE_MANAGER', 'LEAVES_APPROVE_HR'] },
  { text: 'العطلات الرسمية', icon: <EventNote />, path: '/holidays', requiredRole: 'ADMIN', requiredPermission: ['LEAVES_VIEW', 'LEAVES_APPROVE_HR'] },
  { text: 'الخطابات', icon: <Description />, path: '/letters', requiredPermission: ['LETTERS_VIEW', 'LETTERS_APPROVE', 'LETTERS_APPROVE_MANAGER', 'LETTERS_APPROVE_HR'] },
  { text: 'الجزاءات والتحقيقات', icon: <Security />, path: '/disciplinary', requiredPermission: ['DISC_MANAGER_CREATE', 'DISC_HR_REVIEW', 'DISC_HR_DECISION', 'DISC_HR_FINALIZE', 'DISC_EMPLOYEE_RESPONSE'] },
  { text: 'العهد والأصول', icon: <Business />, path: '/custody', requiredRole: 'ADMIN', requiredPermission: ['CUSTODY_VIEW', 'CUSTODY_ASSIGN', 'CUSTODY_APPROVE', 'CUSTODY_MANAGE_ITEMS', 'CUSTODY_MANAGE_CATEGORIES'] },
  { text: 'إدارة العقود', icon: <Description />, path: '/contracts', requiredPermission: ['CONTRACT_VIEW', 'CONTRACT_CREATE', 'CONTRACT_EDIT', 'CONTRACT_SEND', 'CONTRACT_EMPLOYER_SIGN', 'CONTRACT_TERMINATE', 'CONTRACT_RENEW', 'CONTRACT_QIWA_UPDATE'] },

  // Financial
  { text: 'السلف', icon: <MonetizationOn />, path: '/advances', requiredPermission: ['ADVANCES_VIEW', 'ADVANCES_APPROVE_MANAGER', 'ADVANCES_APPROVE_HR'] },
  { text: 'طلبات التحديث', icon: <SyncIcon />, path: '/data-updates', badge: true, requiredRole: 'ADMIN' },
  { text: 'طلبات تحديث البيانات', icon: <Person />, path: '/profile-update-requests', badge: true, requiredRole: 'ADMIN' },

  // Reports & Audit
  { text: 'التقارير', icon: <Assessment />, path: '/reports' },
  { text: 'سجلات التدقيق', icon: <Security />, path: '/audit', requiredRole: 'ADMIN' },

  // Settings
  { text: 'الفروع والأقسام', icon: <Business />, path: '/branches', requiredRole: 'ADMIN' },
  { text: 'الدرجات الوظيفية', icon: <Business />, path: '/job-titles', requiredRole: 'ADMIN' },
  { text: 'الأجهزة', icon: <Business />, path: '/devices', requiredRole: 'ADMIN' },
  { text: 'الصلاحيات', icon: <Security />, path: '/permissions', requiredRole: 'ADMIN' },
  { text: 'السياسات', icon: <Security />, path: '/policies', requiredRole: 'ADMIN' },
  { text: 'السياسات الذكية', icon: <AutoAwesome />, path: '/smart-policies', requiredRole: 'ADMIN' },
  { text: 'الإعدادات', icon: <Settings />, path: '/settings', requiredRole: 'ADMIN' },
];

// Payroll submenu group
// Payroll submenu - visible to HR (for EOS approvals) and ADMIN (for full access)
const payrollGroup: MenuGroup = {
  text: 'الرواتب والمالية',
  icon: <Payments />,
  // No requiredRole - visibility controlled by individual items + HR permission check
  children: [
    { text: 'إعدادات الرواتب', icon: <Settings />, path: '/payroll-settings', requiredRole: 'ADMIN' },
    { text: 'دورات الرواتب', icon: <MonetizationOn />, path: '/salary', requiredRole: 'ADMIN' },
    { text: 'قسائم الرواتب', icon: <Description />, path: '/payslips', requiredRole: 'ADMIN' },
    { text: 'مركز تعديلات الرواتب', icon: <AccountBalance />, path: '/bonus-management', requiredRole: 'ADMIN' },
    { text: 'إدارة العمولات', icon: <TrendingUp />, path: '/commission-management', requiredRole: 'ADMIN' },
    { text: 'تقارير الرواتب', icon: <Assessment />, path: '/payroll-reports', requiredRole: 'ADMIN' },
    { text: 'الزيادات', icon: <MonetizationOn />, path: '/raises', requiredRole: 'ADMIN' },
    { text: 'الفروقات', icon: <MonetizationOn />, path: '/retro-pay', requiredRole: 'ADMIN' },
    { text: 'نهاية الخدمة', icon: <MonetizationOn />, path: '/eos', requiredRole: 'ADMIN' },
    // EOS Approvals - visible to HR for two-level approval workflow
    { text: 'موافقات الإنهاء', icon: <Security />, path: '/eos/approvals', requiredPermission: ['EMPLOYEES_VIEW'] },
    { text: 'الحسابات البنكية', icon: <MonetizationOn />, path: '/bank-accounts', requiredRole: 'ADMIN' },
    { text: 'مراكز التكلفة', icon: <AccountTree />, path: '/cost-centers', requiredRole: 'ADMIN' },
    { text: 'مركز الاستثناءات', icon: <Security />, path: '/exceptions', requiredRole: 'ADMIN' },
  ],
};

const complianceGroup: MenuGroup = {
  text: 'الالتزام الحكومي',
  icon: <Business />,
  requiredRole: 'ADMIN',
  children: [
    { text: 'تصدير WPS', icon: <MonetizationOn />, path: '/wps-export' },
    { text: 'متابعة WPS', icon: <MonetizationOn />, path: '/wps-tracking' },
    { text: 'مُدد', icon: <Business />, path: '/mudad' },
    { text: 'التأمينات GOSI', icon: <Business />, path: '/gosi' },
    { text: 'تكامل قوى', icon: <Business />, path: '/qiwa' },
    { text: '🇸🇦 السعودة ونطاقات', icon: <Business />, path: '/saudization' },
    { text: '🇸🇦 منصة مقيم', icon: <LinkIcon />, path: '/muqeem' },
    { text: 'إعدادات مقيم', icon: <Settings />, path: '/settings/muqeem' },
    { text: 'سجل الإرسالات', icon: <Security />, path: '/audit/submissions' },
  ],
};

// Performance Management submenu group
const performanceGroup: MenuGroup = {
  text: 'إدارة الأداء',
  icon: <TrendingUp />,
  requiredRole: 'ADMIN',
  children: [
    { text: 'تقييم الأداء', icon: <Assessment />, path: '/performance-reviews' },
    { text: 'الأهداف و OKRs', icon: <Star />, path: '/goals' },
    { text: 'التقدير والمكافآت', icon: <EmojiEvents />, path: '/recognition' },
  ],
};

// Smart Policies submenu group
const smartPoliciesGroup: MenuGroup = {
  text: '🤖 السياسات الذكية',
  icon: <PsychologyIcon />,
  requiredRole: 'ADMIN',
  children: [
    { text: 'إدارة السياسات', icon: <AutoAwesome />, path: '/smart-policies' },
    { text: 'لوحة التحكم', icon: <InsightsIcon />, path: '/smart-policies/dashboard' },
    { text: 'سوق السياسات', icon: <StorefrontIcon />, path: '/smart-policies/marketplace' },
    { text: 'معالج الإنشاء', icon: <TimelineIcon />, path: '/smart-policies/wizard' },
  ],
};

// Logistics submenu group
const logisticsGroup: MenuGroup = {
  text: '🚛 اللوجستيات والتوصيل',
  icon: <LogisticsIcon />,
  requiredRole: 'ADMIN',
  children: [
    { text: 'لوحة اللوجستيات', icon: <LogisticsIcon />, path: '/logistics' },
  ],
};

// KPI submenu group
const kpiGroup: MenuGroup = {
  text: '📊 مؤشرات الأداء KPI',
  icon: <SpeedIcon />,
  requiredRole: 'ADMIN',
  children: [
    { text: 'محرك KPI', icon: <SpeedIcon />, path: '/kpi' },
  ],
};

// Integrations submenu group
const integrationsGroup: MenuGroup = {
  text: '🔗 التكاملات',
  icon: <LinkIcon />,
  requiredRole: 'ADMIN',
  children: [
    { text: 'إدارة التكاملات', icon: <LinkIcon />, path: '/integrations' },
  ],
};

interface UserPermission {
  id: string;
  scope: string;
  permission: {
    code: string;
    name: string;
  };
}

export const MainLayout = () => {
  useTheme();
  useMediaQuery('(min-width:600px)');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [permissionsLoading, setPermissionsLoading] = useState(true);
  const [payrollOpen, setPayrollOpen] = useState(false);
  const [complianceOpen, setComplianceOpen] = useState(false);
  const [performanceOpen, setPerformanceOpen] = useState(false);
  const [smartPoliciesOpen, setSmartPoliciesOpen] = useState(false);
  const [logisticsOpen, setLogisticsOpen] = useState(false);
  const [kpiOpen, setKpiOpen] = useState(false);
  const [integrationsOpen, setIntegrationsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { badges } = useSidebarBadges();

  // Fetch user permissions on mount
  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const response = await api.get('/permissions/my') as UserPermission[];
        // Extract permission codes from user permissions (nested permission.code)
        const codes = response.map((up: UserPermission) => up.permission?.code).filter(Boolean) as string[];
        setUserPermissions(codes);
      } catch (error) {
        console.error('Failed to fetch permissions:', error);
        setUserPermissions([]);
      } finally {
        setPermissionsLoading(false);
      }
    };

    if (user) {
      fetchPermissions();
    } else {
      setPermissionsLoading(false);
    }
  }, [user]);

  // Note: Notification count is now handled by NotificationsBell component with polling

  // Filter menu items based on user role and permissions
  const visibleMenuItems = allMenuItems.filter((item) => {
    // If no requirements, always visible
    if (!item.requiredRole && !item.requiredPermission) {
      return true;
    }

    // Check role requirement
    if (item.requiredRole) {
      if (item.requiredRole === 'ADMIN' && user?.role === 'ADMIN') {
        return true;
      }
      if (item.requiredRole === 'MANAGER' && (user?.role === 'ADMIN' || user?.role === 'MANAGER')) {
        return true;
      }
      // If role requirement not met and no permission requirement, hide
      if (!item.requiredPermission) {
        return false;
      }
    }

    // Check permission requirement - any of the listed permissions grants access
    if (item.requiredPermission) {
      // Admins always have access
      if (user?.role === 'ADMIN') {
        return true;
      }
      // Check if user has any of the required permissions
      return item.requiredPermission.some((perm) => userPermissions.includes(perm));
    }

    return false;
  });

  const handleLogout = async () => {
    setAnchorEl(null);
    await logout();
    navigate('/login');
  };

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box
        sx={{
          p: 3,
          background: `linear-gradient(135deg, ${MODERN_THEME.peach} 0%, ${MODERN_THEME.cream} 100%)`,
          borderBottom: `1px solid ${MODERN_THEME.border}`,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 900, color: MODERN_THEME.textPrimary, letterSpacing: -0.5 }}>
          نظام الحضور
        </Typography>
        <Typography variant="caption" sx={{ color: MODERN_THEME.textSecondary, fontWeight: 500 }}>
          {user?.role === 'ADMIN' ? 'لوحة تحكم الإدارة' : 'لوحة التحكم'}
        </Typography>
      </Box>

      <List sx={{ flex: 1, py: 1, overflow: 'auto' }}>
        {permissionsLoading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          <>
            {/* First render items before payroll section */}
            {visibleMenuItems.slice(0, 13).map((item) => (
              <ListItem key={item.path} disablePadding sx={{ px: 1.5, mb: 0.5 }}>
                <ListItemButton
                  selected={location.pathname === item.path}
                  onClick={() => {
                    navigate(item.path);
                    setMobileOpen(false);
                  }}
                  sx={{
                    borderRadius: 3,
                    transition: 'all 0.2s ease',
                    '&.Mui-selected': {
                      bgcolor: MODERN_THEME.peach,
                      color: MODERN_THEME.orange,
                      '&:hover': { bgcolor: MODERN_THEME.cream },
                      '& .MuiListItemIcon-root': { color: MODERN_THEME.orange },
                    },
                    '&:hover': {
                      bgcolor: MODERN_THEME.cream,
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            ))}

            {/* Payroll Submenu */}
            {(user?.role === 'ADMIN' || payrollGroup.requiredRole !== 'ADMIN') && (
              <>
                <ListItem disablePadding sx={{ px: 1.5, mb: 0.5 }}>
                  <ListItemButton
                    onClick={() => setPayrollOpen(!payrollOpen)}
                    sx={{
                      borderRadius: 2,
                      bgcolor: payrollOpen ? 'action.selected' : 'transparent',
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>{payrollGroup.icon}</ListItemIcon>
                    <ListItemText primary={payrollGroup.text} />
                    {payrollOpen ? <ExpandLess /> : <ExpandMore />}
                  </ListItemButton>
                </ListItem>
                <Collapse in={payrollOpen} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {payrollGroup.children.filter((item) => {
                      // Check role requirement
                      if (item.requiredRole) {
                        if (item.requiredRole === 'ADMIN' && user?.role === 'ADMIN') return true;
                        if (item.requiredRole === 'MANAGER' && (user?.role === 'ADMIN' || user?.role === 'MANAGER')) return true;
                        if (!item.requiredPermission) return false;
                      }
                      // Check permission requirement
                      if (item.requiredPermission) {
                        if (user?.role === 'ADMIN') return true;
                        return item.requiredPermission.some((perm) => userPermissions.includes(perm));
                      }
                      return true;
                    }).map((item) => (
                      <ListItem key={item.path} disablePadding sx={{ px: 1.5, mb: 0.3 }}>
                        <ListItemButton
                          selected={location.pathname === item.path}
                          onClick={() => {
                            navigate(item.path);
                            setMobileOpen(false);
                          }}
                          sx={{
                            pl: 4,
                            borderRadius: 2,
                            '&.Mui-selected': {
                              bgcolor: 'primary.main',
                              color: 'white',
                              '&:hover': { bgcolor: 'primary.dark' },
                              '& .MuiListItemIcon-root': { color: 'white' },
                            },
                          }}
                        >
                          <ListItemIcon sx={{ minWidth: 30, '& svg': { fontSize: 18 } }}>{item.icon}</ListItemIcon>
                          <ListItemText primary={item.text} primaryTypographyProps={{ fontSize: 14 }} />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                </Collapse>
              </>
            )}

            {/* Compliance Submenu */}
            {user?.role === 'ADMIN' && (
              <>
                <ListItem disablePadding sx={{ px: 1.5, mb: 0.5 }}>
                  <ListItemButton
                    onClick={() => setComplianceOpen(!complianceOpen)}
                    sx={{
                      borderRadius: 2,
                      bgcolor: complianceOpen ? 'action.selected' : 'transparent',
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>{complianceGroup.icon}</ListItemIcon>
                    <ListItemText primary={complianceGroup.text} />
                    {badges.complianceActions > 0 && (
                      <Badge badgeContent={badges.complianceActions} color="error" sx={{ mr: 1 }} />
                    )}
                    {complianceOpen ? <ExpandLess /> : <ExpandMore />}
                  </ListItemButton>
                </ListItem>
                <Collapse in={complianceOpen} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {complianceGroup.children.map((item) => (
                      <ListItem key={item.path} disablePadding sx={{ px: 1.5, mb: 0.3 }}>
                        <ListItemButton
                          selected={location.pathname === item.path}
                          onClick={() => {
                            navigate(item.path);
                            setMobileOpen(false);
                          }}
                          sx={{
                            pl: 4,
                            borderRadius: 2,
                            '&.Mui-selected': {
                              bgcolor: 'primary.main',
                              color: 'white',
                              '&:hover': { bgcolor: 'primary.dark' },
                              '& .MuiListItemIcon-root': { color: 'white' },
                            },
                          }}
                        >
                          <ListItemIcon sx={{ minWidth: 30, '& svg': { fontSize: 18 } }}>{item.icon}</ListItemIcon>
                          <ListItemText primary={item.text} primaryTypographyProps={{ fontSize: 14 }} />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                </Collapse>
              </>
            )}

            {/* Performance Management Submenu */}
            {user?.role === 'ADMIN' && (
              <>
                <ListItem disablePadding sx={{ px: 1.5, mb: 0.5 }}>
                  <ListItemButton
                    onClick={() => setPerformanceOpen(!performanceOpen)}
                    sx={{
                      borderRadius: 2,
                      bgcolor: performanceOpen ? 'action.selected' : 'transparent',
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>{performanceGroup.icon}</ListItemIcon>
                    <ListItemText primary={performanceGroup.text} />
                    {performanceOpen ? <ExpandLess /> : <ExpandMore />}
                  </ListItemButton>
                </ListItem>
                <Collapse in={performanceOpen} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {performanceGroup.children.map((item) => (
                      <ListItem key={item.path} disablePadding sx={{ px: 1.5, mb: 0.3 }}>
                        <ListItemButton
                          selected={location.pathname === item.path}
                          onClick={() => {
                            navigate(item.path);
                            setMobileOpen(false);
                          }}
                          sx={{
                            pl: 4,
                            borderRadius: 2,
                            '&.Mui-selected': {
                              bgcolor: 'primary.main',
                              color: 'white',
                              '&:hover': { bgcolor: 'primary.dark' },
                              '& .MuiListItemIcon-root': { color: 'white' },
                            },
                          }}
                        >
                          <ListItemIcon sx={{ minWidth: 30, '& svg': { fontSize: 18 } }}>{item.icon}</ListItemIcon>
                          <ListItemText primary={item.text} primaryTypographyProps={{ fontSize: 14 }} />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                </Collapse>
              </>
            )}

            {/* Smart Policies Submenu - NEW! */}
            {user?.role === 'ADMIN' && (
              <>
                <ListItem disablePadding sx={{ px: 1.5, mb: 0.5 }}>
                  <ListItemButton
                    onClick={() => setSmartPoliciesOpen(!smartPoliciesOpen)}
                    sx={{
                      borderRadius: 2,
                      bgcolor: smartPoliciesOpen ? 'action.selected' : 'transparent',
                      background: smartPoliciesOpen ? 'linear-gradient(135deg, rgba(156,39,176,0.1) 0%, rgba(103,58,183,0.1) 100%)' : 'transparent',
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36, color: '#9C27B0' }}>{smartPoliciesGroup.icon}</ListItemIcon>
                    <ListItemText
                      primary={smartPoliciesGroup.text}
                      primaryTypographyProps={{ fontWeight: 'bold' }}
                    />
                    {smartPoliciesOpen ? <ExpandLess /> : <ExpandMore />}
                  </ListItemButton>
                </ListItem>
                <Collapse in={smartPoliciesOpen} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {smartPoliciesGroup.children.map((item) => (
                      <ListItem key={item.path} disablePadding sx={{ px: 1.5, mb: 0.3 }}>
                        <ListItemButton
                          selected={location.pathname === item.path}
                          onClick={() => {
                            navigate(item.path);
                            setMobileOpen(false);
                          }}
                          sx={{
                            pl: 4,
                            borderRadius: 2,
                            '&.Mui-selected': {
                              background: 'linear-gradient(135deg, #9C27B0 0%, #673AB7 100%)',
                              color: 'white',
                              '&:hover': { background: 'linear-gradient(135deg, #7B1FA2 0%, #512DA8 100%)' },
                              '& .MuiListItemIcon-root': { color: 'white' },
                            },
                          }}
                        >
                          <ListItemIcon sx={{ minWidth: 30, '& svg': { fontSize: 18 } }}>{item.icon}</ListItemIcon>
                          <ListItemText primary={item.text} primaryTypographyProps={{ fontSize: 14 }} />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                </Collapse>
              </>
            )}

            {/* Logistics Submenu */}
            {user?.role === 'ADMIN' && (
              <>
                <ListItem disablePadding sx={{ px: 1.5, mb: 0.5 }}>
                  <ListItemButton
                    onClick={() => setLogisticsOpen(!logisticsOpen)}
                    sx={{
                      borderRadius: 2,
                      bgcolor: logisticsOpen ? 'action.selected' : 'transparent',
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>{logisticsGroup.icon}</ListItemIcon>
                    <ListItemText primary={logisticsGroup.text} />
                    {logisticsOpen ? <ExpandLess /> : <ExpandMore />}
                  </ListItemButton>
                </ListItem>
                <Collapse in={logisticsOpen} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {logisticsGroup.children.map((item) => (
                      <ListItem key={item.path} disablePadding sx={{ px: 1.5, mb: 0.3 }}>
                        <ListItemButton
                          selected={location.pathname === item.path}
                          onClick={() => {
                            navigate(item.path);
                            setMobileOpen(false);
                          }}
                          sx={{
                            pl: 4,
                            borderRadius: 2,
                            '&.Mui-selected': {
                              bgcolor: 'primary.main',
                              color: 'white',
                              '&:hover': { bgcolor: 'primary.dark' },
                              '& .MuiListItemIcon-root': { color: 'white' },
                            },
                          }}
                        >
                          <ListItemIcon sx={{ minWidth: 30, '& svg': { fontSize: 18 } }}>{item.icon}</ListItemIcon>
                          <ListItemText primary={item.text} primaryTypographyProps={{ fontSize: 14 }} />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                </Collapse>
              </>
            )}

            {/* KPI Submenu */}
            {user?.role === 'ADMIN' && (
              <>
                <ListItem disablePadding sx={{ px: 1.5, mb: 0.5 }}>
                  <ListItemButton
                    onClick={() => setKpiOpen(!kpiOpen)}
                    sx={{
                      borderRadius: 2,
                      bgcolor: kpiOpen ? 'action.selected' : 'transparent',
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>{kpiGroup.icon}</ListItemIcon>
                    <ListItemText primary={kpiGroup.text} />
                    {kpiOpen ? <ExpandLess /> : <ExpandMore />}
                  </ListItemButton>
                </ListItem>
                <Collapse in={kpiOpen} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {kpiGroup.children.map((item) => (
                      <ListItem key={item.path} disablePadding sx={{ px: 1.5, mb: 0.3 }}>
                        <ListItemButton
                          selected={location.pathname === item.path}
                          onClick={() => {
                            navigate(item.path);
                            setMobileOpen(false);
                          }}
                          sx={{
                            pl: 4,
                            borderRadius: 2,
                            '&.Mui-selected': {
                              bgcolor: 'primary.main',
                              color: 'white',
                              '&:hover': { bgcolor: 'primary.dark' },
                              '& .MuiListItemIcon-root': { color: 'white' },
                            },
                          }}
                        >
                          <ListItemIcon sx={{ minWidth: 30, '& svg': { fontSize: 18 } }}>{item.icon}</ListItemIcon>
                          <ListItemText primary={item.text} primaryTypographyProps={{ fontSize: 14 }} />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                </Collapse>
              </>
            )}

            {/* Integrations Submenu */}
            {user?.role === 'ADMIN' && (
              <>
                <ListItem disablePadding sx={{ px: 1.5, mb: 0.5 }}>
                  <ListItemButton
                    onClick={() => setIntegrationsOpen(!integrationsOpen)}
                    sx={{
                      borderRadius: 2,
                      bgcolor: integrationsOpen ? 'action.selected' : 'transparent',
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>{integrationsGroup.icon}</ListItemIcon>
                    <ListItemText primary={integrationsGroup.text} />
                    {integrationsOpen ? <ExpandLess /> : <ExpandMore />}
                  </ListItemButton>
                </ListItem>
                <Collapse in={integrationsOpen} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {integrationsGroup.children.map((item) => (
                      <ListItem key={item.path} disablePadding sx={{ px: 1.5, mb: 0.3 }}>
                        <ListItemButton
                          selected={location.pathname === item.path}
                          onClick={() => {
                            navigate(item.path);
                            setMobileOpen(false);
                          }}
                          sx={{
                            pl: 4,
                            borderRadius: 2,
                            '&.Mui-selected': {
                              bgcolor: 'primary.main',
                              color: 'white',
                              '&:hover': { bgcolor: 'primary.dark' },
                              '& .MuiListItemIcon-root': { color: 'white' },
                            },
                          }}
                        >
                          <ListItemIcon sx={{ minWidth: 30, '& svg': { fontSize: 18 } }}>{item.icon}</ListItemIcon>
                          <ListItemText primary={item.text} primaryTypographyProps={{ fontSize: 14 }} />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                </Collapse>
              </>
            )}

            {/* Remaining items after submenus */}
            {visibleMenuItems.slice(13).map((item) => (
              <ListItem key={item.path} disablePadding sx={{ px: 1.5, mb: 0.5 }}>
                <ListItemButton
                  selected={location.pathname === item.path}
                  onClick={() => {
                    navigate(item.path);
                    setMobileOpen(false);
                  }}
                  sx={{
                    borderRadius: 2,
                    '&.Mui-selected': {
                      bgcolor: 'primary.main',
                      color: 'white',
                      '&:hover': { bgcolor: 'primary.dark' },
                      '& .MuiListItemIcon-root': { color: 'white' },
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            ))}
          </>
        )}
      </List>

      <Divider />
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          © 2024 Attendance System
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', direction: 'rtl' }}>
      {/* Sidebar */}
      <Box
        component="nav"
        sx={{
          width: { md: drawerWidth },
          flexShrink: { md: 0 },
        }}
      >
        {/* Mobile Drawer */}
        <Drawer
          variant="temporary"
          anchor="right"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
            },
          }}
        >
          {drawer}
        </Drawer>

        {/* Desktop Drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
              position: 'fixed',
              right: 0,
              left: 'auto',
              borderLeft: '1px solid',
              borderRight: 'none',
              borderColor: 'divider',
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main Content Area */}
      <Box
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          width: { md: `calc(100% - ${drawerWidth}px)` },
          marginRight: { md: 0 },
        }}
      >
        {/* AppBar */}
        <AppBar
          position="fixed"
          elevation={0}
          sx={{
            width: { md: `calc(100% - ${drawerWidth}px)` },
            right: { md: `${drawerWidth}px` },
            left: { md: 0 },
            bgcolor: 'white',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Toolbar>
            <IconButton
              color="primary"
              edge="start"
              onClick={() => setMobileOpen(true)}
              sx={{ ml: 2, display: { md: 'none' } }}
            >
              <MenuIcon />
            </IconButton>

            <Typography variant="h6" color="text.primary" fontWeight="bold" sx={{ flexGrow: 1 }}>
              {allMenuItems.find((item) => item.path === location.pathname)?.text || 'لوحة التحكم'}
            </Typography>

            <NotificationsBell />

            <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
              <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}>
                {user?.firstName?.[0] || 'U'}
              </Avatar>
            </IconButton>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={() => setAnchorEl(null)}
              transformOrigin={{ horizontal: 'left', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
            >
              <Box sx={{ px: 2, py: 1 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  {user?.firstName} {user?.lastName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {user?.email}
                </Typography>
                <Typography variant="caption" color="primary">
                  {user?.role === 'ADMIN' ? 'مدير النظام' : user?.role === 'MANAGER' ? 'مدير' : 'موظف'}
                </Typography>
              </Box>
              <Divider />
              <MenuItem onClick={() => navigate('/settings')}>
                <ListItemIcon><Person fontSize="small" /></ListItemIcon>
                الملف الشخصي
              </MenuItem>
              <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
                <ListItemIcon><Logout fontSize="small" color="error" /></ListItemIcon>
                تسجيل الخروج
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>

        {/* Page Content */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            mt: '64px',
            bgcolor: 'background.default',
            minHeight: 'calc(100vh - 64px)',
            direction: 'rtl',
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};
