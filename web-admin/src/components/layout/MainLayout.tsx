import { useState } from 'react';
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
} from '@mui/icons-material';
import { useAuthStore } from '@/store/auth.store';

const drawerWidth = 250;

const menuItems = [
  { text: 'لوحة التحكم', icon: <Dashboard />, path: '/dashboard' },
  { text: 'المستخدمين', icon: <People />, path: '/users' },
  { text: 'الحضور والانصراف', icon: <AccessTime />, path: '/attendance' },
  { text: 'الفروع والأقسام', icon: <Business />, path: '/branches' },
  { text: 'الإجازات', icon: <EventNote />, path: '/leaves' },
  { text: 'طلبات التحديث', icon: <SyncIcon />, path: '/data-updates', badge: true },
  { text: 'التقارير', icon: <Assessment />, path: '/reports' },
  { text: 'الإعدادات', icon: <Settings />, path: '/settings' },
];

export const MainLayout = () => {
  useTheme();
  useMediaQuery('(min-width:600px)'); // Keep for potential future use
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

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
          لوحة تحكم الإدارة
        </Typography>
      </Box>

      <List sx={{ flex: 1, py: 1 }}>
        {menuItems.map((item) => (
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
      {/* Sidebar - على اليمين (أول عنصر في RTL) */}
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
              {menuItems.find((item) => item.path === location.pathname)?.text || 'لوحة التحكم'}
            </Typography>

            <IconButton sx={{ ml: 1 }}>
              <Badge badgeContent={5} color="error">
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
