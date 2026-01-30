/**
 * صفحة تتبع الموظفين - Employee Tracking Page
 * تعرض قائمة الموظفين الحاضرين مع موقعهم وخريطة حية
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    Box,
    Paper,
    Typography,
    Grid,
    Card,
    CardContent,
    Avatar,
    Chip,
    IconButton,
    Tooltip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    CircularProgress,
    Alert,
    Badge,
    TextField,
    InputAdornment,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    List,
    ListItem,
    ListItemText,
    Divider,
    Tabs,
    Tab,
    Snackbar,
    Switch,
    FormControlLabel,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
} from '@mui/material';
import {
    MyLocation as LocationIcon,
    Warning as WarningIcon,
    CheckCircle as CheckIcon,
    Search as SearchIcon,
    Refresh as RefreshIcon,
    History as HistoryIcon,
    Person as PersonIcon,
    AccessTime as TimeIcon,
    ExitToApp as ExitIcon,
    Map as MapIcon,
    ViewModule as CardsIcon,
    Assessment as ReportIcon,
    Notifications as NotificationIcon,
    Send as SendIcon,
    VolumeUp as VolumeUpIcon,
    VolumeOff as VolumeOffIcon,
    Message as MessageIcon,
} from '@mui/icons-material';

import {
    locationTrackingService,
    ActiveEmployee,
    GeofenceExitEvent,
} from '@/services/location-tracking.service';
import LiveMapView, { Branch } from '@/components/tracking/LiveMapView';
import { api } from '@/services/api.service';
import TrackingReportsPanel from './TrackingReportsPanel';

// رسائل الإشعارات الجاهزة
const PRESET_MESSAGES = [
    { id: 'return', label: 'تنبيه العودة', message: 'يرجى العودة إلى نطاق العمل المحدد فوراً.' },
    { id: 'warning', label: 'تحذير رسمي', message: 'تم رصد خروجك من نطاق العمل. هذا تحذير رسمي.' },
    { id: 'check', label: 'استفسار', message: 'تم ملاحظة خروجك من النطاق. هل كل شيء على ما يرام؟' },
    { id: 'urgent', label: 'عاجل', message: 'يجب العودة فوراً للعمل أو التواصل مع المدير المباشر.' },
];

// مكون كارت الموظف
const EmployeeCard = ({
    employee,
    onViewHistory,
    onViewExits,
    onSendNotification,
}: {
    employee: ActiveEmployee;
    onViewHistory: (id: string) => void;
    onViewExits: (id: string) => void;
    onSendNotification: (employee: ActiveEmployee) => void;
}) => {
    const isOutside = employee.lastLocation && !employee.lastLocation?.isInsideGeofence;

    return (
        <Card
            sx={{
                background: isOutside
                    ? 'linear-gradient(135deg, #ff5252 0%, #ff1744 100%)'
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                borderRadius: 3,
                transition: 'transform 0.2s',
                '&:hover': { transform: 'translateY(-4px)' },
            }}
        >
            <CardContent>
                <Box display="flex" alignItems="center" gap={2} mb={2}>
                    <Badge
                        overlap="circular"
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        badgeContent={
                            isOutside ? (
                                <WarningIcon sx={{ fontSize: 16, color: '#fff' }} />
                            ) : (
                                <CheckIcon sx={{ fontSize: 16, color: '#4caf50' }} />
                            )
                        }
                    >
                        <Avatar
                            sx={{
                                width: 56,
                                height: 56,
                                bgcolor: 'rgba(255,255,255,0.2)',
                                fontSize: '1.5rem',
                            }}
                        >
                            {employee.firstName.charAt(0)}
                        </Avatar>
                    </Badge>
                    <Box flex={1}>
                        <Typography variant="h6" fontWeight="bold">
                            {employee.firstName} {employee.lastName}
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                            {employee.employeeCode}
                        </Typography>
                    </Box>
                </Box>

                <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
                    <Chip
                        size="small"
                        icon={<TimeIcon sx={{ color: 'white !important' }} />}
                        label={new Date(employee.checkInTime).toLocaleTimeString('ar-EG', {
                            hour: '2-digit',
                            minute: '2-digit',
                        })}
                        sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                    />
                    <Chip
                        size="small"
                        label={employee.branchName}
                        sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                    />
                    {employee.exitEvents > 0 && (
                        <Chip
                            size="small"
                            icon={<ExitIcon sx={{ color: 'white !important' }} />}
                            label={`${employee.exitEvents} خروج`}
                            sx={{ bgcolor: 'rgba(255,0,0,0.3)', color: 'white' }}
                        />
                    )}
                </Box>

                {employee.lastLocation && (
                    <Box
                        sx={{
                            bgcolor: 'rgba(0,0,0,0.2)',
                            borderRadius: 2,
                            p: 1.5,
                            mb: 2,
                        }}
                    >
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                            <LocationIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                            {isOutside ? 'خارج النطاق' : 'داخل النطاق'} -{' '}
                            {employee.lastLocation.distanceFromBranch} متر
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.7 }}>
                            آخر تحديث:{' '}
                            {new Date(employee.lastLocation.updatedAt).toLocaleTimeString('ar-EG')}
                        </Typography>
                    </Box>
                )}

                <Box display="flex" gap={1} justifyContent="flex-end">
                    <Tooltip title="سجل المواقع">
                        <IconButton
                            size="small"
                            sx={{ color: 'white' }}
                            onClick={() => onViewHistory(employee.id)}
                        >
                            <HistoryIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="أحداث الخروج">
                        <IconButton
                            size="small"
                            sx={{ color: 'white' }}
                            onClick={() => onViewExits(employee.id)}
                        >
                            <ExitIcon />
                        </IconButton>
                    </Tooltip>
                    {isOutside && (
                        <Tooltip title="إرسال إشعار">
                            <IconButton
                                size="small"
                                sx={{
                                    color: 'white',
                                    bgcolor: 'rgba(255,255,255,0.2)',
                                    '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' }
                                }}
                                onClick={() => onSendNotification(employee)}
                            >
                                <NotificationIcon />
                            </IconButton>
                        </Tooltip>
                    )}
                </Box>
            </CardContent>
        </Card>
    );
};

// الصفحة الرئيسية
export const EmployeeTrackingPage = () => {
    const [employees, setEmployees] = useState<ActiveEmployee[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
    const [exitEvents, setExitEvents] = useState<GeofenceExitEvent[]>([]);
    const [showExitsDialog, setShowExitsDialog] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [viewMode, setViewMode] = useState<'cards' | 'map' | 'reports'>('cards');
    const [branches, setBranches] = useState<Branch[]>([]);

    // Sound Alert States
    const [soundEnabled, setSoundEnabled] = useState(() => {
        const saved = localStorage.getItem('tracking-sound-enabled');
        return saved ? JSON.parse(saved) : true;
    });
    const previousOutsideIdsRef = useRef<Set<string>>(new Set());
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Notification Dialog States
    const [showNotificationDialog, setShowNotificationDialog] = useState(false);
    const [notificationTarget, setNotificationTarget] = useState<ActiveEmployee | null>(null);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [selectedPreset, setSelectedPreset] = useState('');
    const [sendingNotification, setSendingNotification] = useState(false);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

    // Initialize audio element
    useEffect(() => {
        audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleQCKs9m+mDYfIH+v1siVOS0bXZnApn8xMU1/p7CPTU9HZoydhWRNWm1+jYdxY2ZzeIR6c3N1c3d1end1eXd4eHd4d3d4d3h3d3d3d3d3');
        audioRef.current.volume = 0.5;
    }, []);

    // Save sound preference
    useEffect(() => {
        localStorage.setItem('tracking-sound-enabled', JSON.stringify(soundEnabled));
    }, [soundEnabled]);

    // Play alert sound when new employees exit geofence
    const playAlertSound = useCallback(() => {
        if (soundEnabled && audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(console.error);
        }
    }, [soundEnabled]);

    const fetchEmployees = useCallback(async () => {
        try {
            setRefreshing(true);
            const data = await locationTrackingService.getActiveEmployees();

            // Check for new outside employees
            const currentOutsideIds = new Set<string>(
                data.filter((emp: ActiveEmployee) => emp.lastLocation && !emp.lastLocation.isInsideGeofence)
                    .map((emp: ActiveEmployee) => emp.id)
            );

            // Find new exits (employees who just went outside)
            currentOutsideIds.forEach((id: string) => {
                if (!previousOutsideIdsRef.current.has(id)) {
                    playAlertSound();
                }
            });

            previousOutsideIdsRef.current = currentOutsideIds;
            setEmployees(data);
            setError(null);
        } catch (err: any) {
            setError(err.response?.data?.message || 'حدث خطأ في تحميل البيانات');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [playAlertSound]);

    // Fetch branches for map
    const fetchBranches = useCallback(async () => {
        try {
            const data = await api.get<any[]>('/branches');
            setBranches(data.map(b => ({
                id: b.id,
                name: b.name,
                latitude: b.latitude || 24.7136,
                longitude: b.longitude || 46.6753,
                geofenceRadius: b.geofenceRadius || 100,
            })));
        } catch (err) {
            console.error('Error fetching branches:', err);
        }
    }, []);

    useEffect(() => {
        fetchEmployees();
        fetchBranches();
        // تحديث كل 30 ثانية
        const interval = setInterval(fetchEmployees, 30000);
        return () => clearInterval(interval);
    }, [fetchEmployees, fetchBranches]);

    const handleViewExits = async (userId: string) => {
        try {
            setSelectedEmployee(userId);
            const events = await locationTrackingService.getExitEvents(userId);
            setExitEvents(events);
            setShowExitsDialog(true);
        } catch (err) {
            console.error('Error loading exit events:', err);
        }
    };

    const handleViewHistory = (userId: string) => {
        // يمكن فتح صفحة جديدة أو dialog للسجل
        window.open(`/employee-profile/${userId}?tab=location`, '_blank');
    };

    // Handle notification sending
    const handleOpenNotification = (employee: ActiveEmployee) => {
        setNotificationTarget(employee);
        setNotificationMessage('');
        setSelectedPreset('');
        setShowNotificationDialog(true);
    };

    const handlePresetChange = (presetId: string) => {
        setSelectedPreset(presetId);
        const preset = PRESET_MESSAGES.find(p => p.id === presetId);
        if (preset) {
            setNotificationMessage(preset.message);
        }
    };

    const handleSendNotification = async () => {
        if (!notificationTarget || !notificationMessage.trim()) return;

        setSendingNotification(true);
        try {
            await api.post('/notifications/send', {
                userId: notificationTarget.id,
                title: 'تنبيه من إدارة الموارد البشرية',
                message: notificationMessage,
                type: 'GEOFENCE_ALERT',
            });

            setSnackbar({ open: true, message: 'تم إرسال الإشعار بنجاح', severity: 'success' });
            setShowNotificationDialog(false);
        } catch (err: any) {
            setSnackbar({
                open: true,
                message: err.response?.data?.message || 'حدث خطأ في إرسال الإشعار',
                severity: 'error'
            });
        } finally {
            setSendingNotification(false);
        }
    };

    const filteredEmployees = employees.filter(
        (emp) =>
            emp.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            emp.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            emp.employeeCode.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const outsideCount = employees.filter(
        (emp) => emp.lastLocation && !emp.lastLocation.isInsideGeofence
    ).length;

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box>
                    <Typography variant="h4" fontWeight="bold" gutterBottom>
                        <MapIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                        تتبع الموظفين
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        مراقبة مواقع الموظفين الحاضرين في الوقت الفعلي
                    </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={2}>
                    <FormControlLabel
                        control={
                            <Switch
                                checked={soundEnabled}
                                onChange={(e) => setSoundEnabled(e.target.checked)}
                                color="primary"
                            />
                        }
                        label={
                            <Box display="flex" alignItems="center" gap={0.5}>
                                {soundEnabled ? <VolumeUpIcon /> : <VolumeOffIcon />}
                                <Typography variant="body2">
                                    {soundEnabled ? 'التنبيه الصوتي' : 'صامت'}
                                </Typography>
                            </Box>
                        }
                    />
                    <Tooltip title="تحديث">
                        <IconButton
                            onClick={fetchEmployees}
                            disabled={refreshing}
                            sx={{ bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' } }}
                        >
                            {refreshing ? <CircularProgress size={24} color="inherit" /> : <RefreshIcon />}
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {/* إحصائيات سريعة */}
            <Grid container spacing={3} mb={3}>
                <Grid item xs={12} sm={4}>
                    <Paper
                        sx={{
                            p: 3,
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            borderRadius: 3,
                        }}
                    >
                        <Box display="flex" alignItems="center" gap={2}>
                            <PersonIcon sx={{ fontSize: 48 }} />
                            <Box>
                                <Typography variant="h3" fontWeight="bold">
                                    {employees.length}
                                </Typography>
                                <Typography>موظف حاضر</Typography>
                            </Box>
                        </Box>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={4}>
                    <Paper
                        sx={{
                            p: 3,
                            background: 'linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)',
                            color: 'white',
                            borderRadius: 3,
                        }}
                    >
                        <Box display="flex" alignItems="center" gap={2}>
                            <CheckIcon sx={{ fontSize: 48 }} />
                            <Box>
                                <Typography variant="h3" fontWeight="bold">
                                    {employees.length - outsideCount}
                                </Typography>
                                <Typography>داخل النطاق</Typography>
                            </Box>
                        </Box>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={4}>
                    <Paper
                        sx={{
                            p: 3,
                            background:
                                outsideCount > 0
                                    ? 'linear-gradient(135deg, #ff5252 0%, #d32f2f 100%)'
                                    : 'linear-gradient(135deg, #9e9e9e 0%, #616161 100%)',
                            color: 'white',
                            borderRadius: 3,
                        }}
                    >
                        <Box display="flex" alignItems="center" gap={2}>
                            <WarningIcon sx={{ fontSize: 48 }} />
                            <Box>
                                <Typography variant="h3" fontWeight="bold">
                                    {outsideCount}
                                </Typography>
                                <Typography>خارج النطاق</Typography>
                            </Box>
                        </Box>
                    </Paper>
                </Grid>
            </Grid>

            {/* View Mode Tabs */}
            <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <Tabs
                    value={viewMode}
                    onChange={(_, v) => setViewMode(v)}
                    sx={{
                        bgcolor: 'background.paper',
                        borderRadius: 2,
                        '& .MuiTab-root': { minHeight: 48 }
                    }}
                >
                    <Tab
                        value="cards"
                        icon={<CardsIcon />}
                        iconPosition="start"
                        label="البطاقات"
                    />
                    <Tab
                        value="map"
                        icon={<MapIcon />}
                        iconPosition="start"
                        label="الخريطة"
                    />
                    <Tab
                        value="reports"
                        icon={<ReportIcon />}
                        iconPosition="start"
                        label="التقارير"
                    />
                </Tabs>

                <TextField
                    placeholder="ابحث بالاسم أو رقم الموظف..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    size="small"
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon />
                            </InputAdornment>
                        ),
                    }}
                    sx={{ flexGrow: 1, maxWidth: 400 }}
                />
            </Box>

            {/* Map View */}
            {viewMode === 'map' && (
                <LiveMapView
                    employees={filteredEmployees.map(emp => ({
                        ...emp,
                        lastLocation: emp.lastLocation ? {
                            ...emp.lastLocation,
                            updatedAt: new Date(emp.lastLocation.updatedAt),
                        } : undefined,
                        checkInTime: new Date(emp.checkInTime),
                    }))}
                    branches={branches}
                    selectedEmployeeId={selectedEmployee}
                    onEmployeeClick={(id) => setSelectedEmployee(id)}
                    height={500}
                />
            )}

            {/* Cards View */}
            {viewMode === 'cards' && (
                <>
                    {filteredEmployees.length === 0 ? (
                        <Paper sx={{ p: 4, textAlign: 'center' }}>
                            <Typography variant="h6" color="text.secondary">
                                لا يوجد موظفين حاضرين حالياً
                            </Typography>
                        </Paper>
                    ) : (
                        <Grid container spacing={3}>
                            {filteredEmployees.map((employee) => (
                                <Grid item xs={12} sm={6} md={4} lg={3} key={employee.id}>
                                    <EmployeeCard
                                        employee={employee}
                                        onViewHistory={handleViewHistory}
                                        onViewExits={handleViewExits}
                                        onSendNotification={handleOpenNotification}
                                    />
                                </Grid>
                            ))}
                        </Grid>
                    )}
                </>
            )}

            {/* Reports View */}
            {viewMode === 'reports' && (
                <TrackingReportsPanel />
            )}

            {/* Dialog أحداث الخروج */}
            <Dialog
                open={showExitsDialog}
                onClose={() => setShowExitsDialog(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    <ExitIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    أحداث الخروج من النطاق
                </DialogTitle>
                <DialogContent dividers>
                    {exitEvents.length === 0 ? (
                        <Typography color="text.secondary" textAlign="center" py={3}>
                            لا توجد أحداث خروج مسجلة
                        </Typography>
                    ) : (
                        <List>
                            {exitEvents.map((event, index) => (
                                <Box key={event.id}>
                                    <ListItem>
                                        <ListItemText
                                            primary={
                                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                                    <Typography fontWeight="bold">
                                                        خروج في {new Date(event.exitTime).toLocaleTimeString('ar-EG')}
                                                    </Typography>
                                                    <Chip
                                                        size="small"
                                                        label={`${event.distanceFromBranch} متر`}
                                                        color="error"
                                                    />
                                                </Box>
                                            }
                                            secondary={
                                                <>
                                                    {event.returnTime ? (
                                                        <Typography variant="body2" color="success.main">
                                                            ✅ عاد في {new Date(event.returnTime).toLocaleTimeString('ar-EG')}{' '}
                                                            (مدة: {event.durationMinutes} دقيقة)
                                                        </Typography>
                                                    ) : (
                                                        <Typography variant="body2" color="error.main">
                                                            ⚠️ لم يعد بعد
                                                        </Typography>
                                                    )}
                                                </>
                                            }
                                        />
                                    </ListItem>
                                    {index < exitEvents.length - 1 && <Divider />}
                                </Box>
                            ))}
                        </List>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowExitsDialog(false)}>إغلاق</Button>
                </DialogActions>
            </Dialog>

            {/* Dialog إرسال إشعار */}
            <Dialog
                open={showNotificationDialog}
                onClose={() => setShowNotificationDialog(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <NotificationIcon color="primary" />
                    إرسال إشعار للموظف
                </DialogTitle>
                <DialogContent dividers>
                    {notificationTarget && (
                        <Box mb={3}>
                            <Box display="flex" alignItems="center" gap={2} mb={2}>
                                <Avatar sx={{ bgcolor: 'error.main' }}>
                                    {notificationTarget.firstName.charAt(0)}
                                </Avatar>
                                <Box>
                                    <Typography fontWeight="bold">
                                        {notificationTarget.firstName} {notificationTarget.lastName}
                                    </Typography>
                                    <Chip
                                        size="small"
                                        label="خارج النطاق"
                                        color="error"
                                        icon={<WarningIcon />}
                                    />
                                </Box>
                            </Box>

                            <FormControl fullWidth sx={{ mb: 2 }}>
                                <InputLabel>رسالة جاهزة</InputLabel>
                                <Select
                                    value={selectedPreset}
                                    onChange={(e) => handlePresetChange(e.target.value)}
                                    label="رسالة جاهزة"
                                >
                                    <MenuItem value=""><em>اختر رسالة أو اكتب رسالتك</em></MenuItem>
                                    {PRESET_MESSAGES.map(preset => (
                                        <MenuItem key={preset.id} value={preset.id}>
                                            {preset.label}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <TextField
                                fullWidth
                                multiline
                                rows={3}
                                label="نص الإشعار"
                                value={notificationMessage}
                                onChange={(e) => setNotificationMessage(e.target.value)}
                                placeholder="اكتب نص الإشعار هنا..."
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1.5 }}>
                                            <MessageIcon />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowNotificationDialog(false)}>إلغاء</Button>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleSendNotification}
                        disabled={!notificationMessage.trim() || sendingNotification}
                        startIcon={sendingNotification ? <CircularProgress size={20} /> : <SendIcon />}
                    >
                        {sendingNotification ? 'جاري الإرسال...' : 'إرسال'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar للرسائل */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
            >
                <Alert
                    severity={snackbar.severity}
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default EmployeeTrackingPage;
