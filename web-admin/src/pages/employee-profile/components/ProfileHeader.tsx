import {
    Box,
    Avatar,
    Typography,
    Chip,
    Button,
    IconButton,
    Paper,
    Grid,
} from '@mui/material';
import {
    ArrowBack,
    Edit,
    Email,
    Phone,
    LocationOn,
    CalendarMonth,
    Badge,
    WorkOutline,
    CheckCircle,
    Cancel,
    Flag,
} from '@mui/icons-material';

interface ProfileHeaderProps {
    profile: any;
    attendanceStats?: any;
    leaveBalance?: any;
    onBack: () => void;
    onEdit: () => void;
}

export const ProfileHeader = ({
    profile,
    attendanceStats,
    leaveBalance,
    onBack,
    onEdit,
}: ProfileHeaderProps) => {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ACTIVE': return 'success';
            case 'INACTIVE': return 'default';
            case 'SUSPENDED': return 'error';
            default: return 'default';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'ACTIVE': return 'نشط';
            case 'INACTIVE': return 'غير نشط';
            case 'SUSPENDED': return 'موقوف';
            default: return status;
        }
    };

    const formatYearsOfService = (years: number) => {
        if (!years) return 'جديد';
        const fullYears = Math.floor(years);
        const months = Math.round((years - fullYears) * 12);
        if (fullYears === 0) return `${months} شهر`;
        if (months === 0) return `${fullYears} سنة`;
        return `${fullYears} سنة و ${months} شهر`;
    };

    return (
        <Box
            sx={{
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            {/* Cover Background with Gradient */}
            <Box
                sx={{
                    height: 280,
                    background: `linear-gradient(135deg, #1a237e 0%, #3949ab 50%, #5c6bc0 100%)`,
                    position: 'relative',
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'url("/pattern.svg") repeat',
                        opacity: 0.1,
                    },
                }}
            >
                {/* Back Button */}
                <Box sx={{ position: 'absolute', top: 16, right: 16, zIndex: 10 }}>
                    <Button
                        startIcon={<ArrowBack />}
                        onClick={onBack}
                        sx={{
                            color: 'white',
                            bgcolor: 'rgba(255,255,255,0.1)',
                            backdropFilter: 'blur(10px)',
                            '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
                        }}
                    >
                        العودة للقائمة
                    </Button>
                </Box>

                {/* Edit Button */}
                <Box sx={{ position: 'absolute', top: 16, left: 16, zIndex: 10 }}>
                    <IconButton
                        onClick={onEdit}
                        sx={{
                            color: 'white',
                            bgcolor: 'rgba(255,255,255,0.1)',
                            backdropFilter: 'blur(10px)',
                            '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
                        }}
                    >
                        <Edit />
                    </IconButton>
                </Box>
            </Box>

            {/* Profile Info Card */}
            <Box
                sx={{
                    maxWidth: 'xl',
                    mx: 'auto',
                    px: 3,
                    mt: -12,
                    position: 'relative',
                    zIndex: 5,
                }}
            >
                <Paper
                    elevation={4}
                    sx={{
                        p: 4,
                        borderRadius: 3,
                        background: 'linear-gradient(to bottom, #ffffff 0%, #fafafa 100%)',
                    }}
                >
                    <Grid container spacing={3} alignItems="center">
                        {/* Avatar Section */}
                        <Grid item xs={12} md="auto">
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <Avatar
                                    src={profile.avatar}
                                    sx={{
                                        width: 140,
                                        height: 140,
                                        border: '4px solid white',
                                        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                                        fontSize: '3rem',
                                        bgcolor: 'primary.main',
                                    }}
                                >
                                    {profile.firstName?.[0]}
                                    {profile.lastName?.[0]}
                                </Avatar>
                                <Chip
                                    icon={profile.status === 'ACTIVE' ? <CheckCircle /> : <Cancel />}
                                    label={getStatusLabel(profile.status)}
                                    color={getStatusColor(profile.status) as any}
                                    size="small"
                                    sx={{ mt: -1.5, position: 'relative', zIndex: 1 }}
                                />
                            </Box>
                        </Grid>

                        {/* Name & Job */}
                        <Grid item xs={12} md>
                            <Box>
                                <Typography variant="h4" fontWeight="bold" color="primary.dark" gutterBottom>
                                    {profile.firstName} {profile.lastName}
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                    <WorkOutline sx={{ color: 'text.secondary', fontSize: 20 }} />
                                    <Typography variant="h6" color="text.secondary">
                                        {profile.jobTitleRef?.name || profile.jobTitle || 'لا يوجد مسمى وظيفي'}
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2 }}>
                                    {profile.branch && (
                                        <Chip
                                            icon={<LocationOn />}
                                            label={profile.branch.name}
                                            variant="outlined"
                                            size="small"
                                        />
                                    )}
                                    {profile.department && (
                                        <Chip
                                            icon={<Badge />}
                                            label={profile.department.name}
                                            variant="outlined"
                                            size="small"
                                        />
                                    )}
                                    {profile.isSaudi !== undefined && (
                                        <Chip
                                            icon={profile.isSaudi ? <Flag /> : undefined}
                                            label={profile.isSaudi ? 'سعودي' : profile.nationality || 'غير سعودي'}
                                            variant="outlined"
                                            size="small"
                                            color={profile.isSaudi ? 'success' : 'default'}
                                        />
                                    )}
                                </Box>
                            </Box>
                        </Grid>

                        {/* Contact Info */}
                        <Grid item xs={12} md="auto">
                            <Box sx={{ textAlign: { xs: 'center', md: 'left' } }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                    <Email sx={{ color: 'text.secondary', fontSize: 18 }} />
                                    <Typography variant="body2" color="text.secondary">
                                        {profile.email}
                                    </Typography>
                                </Box>
                                {profile.phone && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                        <Phone sx={{ color: 'text.secondary', fontSize: 18 }} />
                                        <Typography variant="body2" color="text.secondary" dir="ltr">
                                            {profile.phone}
                                        </Typography>
                                    </Box>
                                )}
                                {profile.hireDate && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                        <CalendarMonth sx={{ color: 'text.secondary', fontSize: 18 }} />
                                        <Typography variant="body2" color="text.secondary">
                                            منذ {formatYearsOfService(profile.yearsOfService)}
                                        </Typography>
                                    </Box>
                                )}
                                {profile.employeeCode && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Badge sx={{ color: 'text.secondary', fontSize: 18 }} />
                                        <Typography variant="body2" color="text.secondary">
                                            كود: {profile.employeeCode}
                                        </Typography>
                                    </Box>
                                )}
                            </Box>
                        </Grid>
                    </Grid>

                    {/* Quick Stats */}
                    <Grid container spacing={2} sx={{ mt: 3 }}>
                        <Grid item xs={6} sm={3}>
                            <Paper
                                sx={{
                                    p: 2,
                                    textAlign: 'center',
                                    bgcolor: 'success.50',
                                    border: '1px solid',
                                    borderColor: 'success.light',
                                    borderRadius: 2,
                                }}
                            >
                                <Typography variant="h4" fontWeight="bold" color="success.main">
                                    {attendanceStats?.presentDays || 0}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    أيام حضور
                                </Typography>
                            </Paper>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                            <Paper
                                sx={{
                                    p: 2,
                                    textAlign: 'center',
                                    bgcolor: 'error.50',
                                    border: '1px solid',
                                    borderColor: 'error.light',
                                    borderRadius: 2,
                                }}
                            >
                                <Typography variant="h4" fontWeight="bold" color="error.main">
                                    {attendanceStats?.absentDays || 0}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    أيام غياب
                                </Typography>
                            </Paper>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                            <Paper
                                sx={{
                                    p: 2,
                                    textAlign: 'center',
                                    bgcolor: 'warning.50',
                                    border: '1px solid',
                                    borderColor: 'warning.light',
                                    borderRadius: 2,
                                }}
                            >
                                <Typography variant="h4" fontWeight="bold" color="warning.main">
                                    {attendanceStats?.lateDays || 0}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    مرات تأخير
                                </Typography>
                            </Paper>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                            <Paper
                                sx={{
                                    p: 2,
                                    textAlign: 'center',
                                    bgcolor: 'info.50',
                                    border: '1px solid',
                                    borderColor: 'info.light',
                                    borderRadius: 2,
                                }}
                            >
                                <Typography variant="h4" fontWeight="bold" color="info.main">
                                    {leaveBalance?.remainingLeaveDays || profile.remainingLeaveDays || 0}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    رصيد إجازات
                                </Typography>
                            </Paper>
                        </Grid>
                    </Grid>
                </Paper>
            </Box>
        </Box>
    );
};

export default ProfileHeader;
