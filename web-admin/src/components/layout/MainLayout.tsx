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
  Notifications,
  Person,
  Sync as SyncIcon,
  Description,
  Security,
  MonetizationOn,
} from '@mui/icons-material';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/services/api.service';

const drawerWidth = 250;

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

const allMenuItems: MenuItem[] = [
  { text: 'لوحة التحكم', icon: <Dashboard />, path: '/dashboard' },
  { text: 'المستخدمين', icon: <People />, path: '/users', requiredRole: 'ADMIN', requiredPermission: ['EMPLOYEES_VIEW', 'EMPLOYEES_EDIT'] },
  { text: 'الحضور والانصراف', icon: <AccessTime />, path: '/attendance', requiredPermission: ['ATTENDANCE_VIEW', 'ATTENDANCE_EDIT'] },
  { text: 'الفروع والأقسام', icon: <Business />, path: '/branches', requiredRole: 'ADMIN' },
  { text: 'الدرجات الوظيفية', icon: <Business />, path: '/job-titles', requiredRole: 'ADMIN' },
  { text: 'الرواتب', icon: <MonetizationOn />, path: '/salary', requiredRole: 'ADMIN' },
  { text: 'نهاية الخدمة', icon: <MonetizationOn />, path: '/eos', requiredRole: 'ADMIN' },
  { text: 'الفروقات', icon: <MonetizationOn />, path: '/retro-pay', requiredRole: 'ADMIN' },
  { text: 'الإجازات', icon: <EventNote />, path: '/leaves', requiredPermission: ['LEAVES_VIEW', 'LEAVES_APPROVE', 'LEAVES_APPROVE_MANAGER', 'LEAVES_APPROVE_HR'] },
  { text: 'الخطابات', icon: <Description />, path: '/letters', requiredPermission: ['LETTERS_VIEW', 'LETTERS_APPROVE', 'LETTERS_APPROVE_MANAGER', 'LETTERS_APPROVE_HR'] },
  { text: 'الزيادات', icon: <MonetizationOn />, path: '/raises', requiredPermission: ['RAISES_VIEW', 'RAISES_APPROVE', 'RAISES_APPROVE_MANAGER', 'RAISES_APPROVE_HR'] },
  { text: 'السلف', icon: <MonetizationOn />, path: '/advances', requiredPermission: ['ADVANCES_VIEW', 'ADVANCES_APPROVE_MANAGER', 'ADVANCES_APPROVE_HR'] },
  { text: 'طلبات التحديث', icon: <SyncIcon />, path: '/data-updates', badge: true, requiredRole: 'ADMIN' },
  { text: 'التقارير', icon: <Assessment />, path: '/reports' }, // Always visible - shows own reports
  { text: 'الصلاحيات', icon: <Security />, path: '/permissions', requiredRole: 'ADMIN' },
  { text: 'السياسات', icon: <Security />, path: '/policies', requiredRole: 'ADMIN' },
  { text: 'سجلات التدقيق', icon: <Security />, path: '/audit', requiredRole: 'ADMIN' },
  { text: 'الإعدادات', icon: <Settings />, path: '/settings', requiredRole: 'ADMIN' },
];

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
  const [notificationCount, setNotificationCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

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

  // Fetch notification count
  useEffect(() => {
    const fetchNotificationCount = async () => {
      try {
        const response = await api.get('/notifications/unread-count') as { count: number };
        setNotificationCount(response.count || 0);
      } catch (error) {
        console.error('Failed to fetch notification count:', error);
      }
    };
    fetchNotificationCount();
    // Refresh every 60 seconds
    const interval = setInterval(fetchNotificationCount, 60000);
    return () => clearInterval(interval);
  }, []);

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
          p: 2.5,
          background: 'linear-gradient(135deg, #1a237e 0%, #0d47a1 100%)',
          color: 'white',
        }}
      >
        <Typography variant="h6" fontWeight="bold">
          نظام الحضور
        </Typography>
        <Typography variant="caption" sx={{ opacity: 0.8 }}>
          {user?.role === 'ADMIN' ? 'لوحة تحكم الإدارة' : 'لوحة التحكم'}
        </Typography>
      </Box>

      <List sx={{ flex: 1, py: 1 }}>
        {permissionsLoading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          visibleMenuItems.map((item) => (
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
          ))
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

            <IconButton sx={{ ml: 1 }} onClick={() => navigate('/notifications')}>
              <Badge badgeContent={notificationCount} color="error">
                <Notifications color="action" />
              </Badge>
            </IconButton>

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
