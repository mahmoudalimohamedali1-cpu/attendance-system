import React, { useState } from 'react';
import {
    Box,
    Paper,
    Typography,
    Button,
    Chip,
    Grid,
    Card,
    CardContent,
    Avatar,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Stack,
    IconButton,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Pagination,
    useTheme,
    alpha,
    Skeleton,
    Tabs,
    Tab,
} from '@mui/material';
import {
    Add as AddIcon,
    EmojiEvents as TrophyIcon,
    Favorite as HeartIcon,
    Star as StarIcon,
    LocalFireDepartment as FireIcon,
    ThumbUp as ThumbUpIcon,
    Celebration as CelebrationIcon,
    Leaderboard as LeaderboardIcon,
    Analytics as AnalyticsIcon,
    Settings as SettingsIcon,
    Send as SendIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recognitionService, Recognition, CoreValue } from '@/services/performance.service';

// Emoji Reactions
const REACTIONS = ['👏', '🎉', '❤️', '🔥', '💪', '⭐'];

// Recognition Card
const RecognitionCard: React.FC<{ recognition: Recognition; onReact: (id: string, emoji: string) => void }> = ({ recognition, onReact }) => {
    const theme = useTheme();

    return (
        <Card sx={{
            borderRadius: 3,
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            transition: 'all 0.3s ease',
            background: `linear-gradient(145deg, ${alpha('#ffffff', 0.98)} 0%, ${alpha('#f8fafc', 0.95)} 100%)`,
            '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: `0 16px 40px ${alpha(theme.palette.primary.main, 0.12)}`,
            },
        }}>
            <CardContent sx={{ p: 3 }}>
                {/* Header */}
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
                    <Avatar
                        src={recognition.giver?.avatar}
                        sx={{
                            width: 48,
                            height: 48,
                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                            color: 'primary.main',
                            fontWeight: 700,
                        }}
                    >
                        {recognition.giver?.firstName?.[0]}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2" fontWeight={700}>
                            {recognition.giver?.firstName} {recognition.giver?.lastName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            أشاد بـ {recognition.receiver?.firstName} {recognition.receiver?.lastName}
                        </Typography>
                    </Box>
                    {recognition.coreValue && (
                        <Chip
                            size="small"
                            label={recognition.coreValue.name}
                            sx={{
                                bgcolor: alpha(recognition.coreValue.color || '#3B82F6', 0.1),
                                color: recognition.coreValue.color || '#3B82F6',
                                fontWeight: 600,
                            }}
                        />
                    )}
                </Box>

                {/* Message */}
                <Paper
                    elevation={0}
                    sx={{
                        p: 2,
                        borderRadius: 2,
                        bgcolor: alpha(theme.palette.primary.main, 0.03),
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.08)}`,
                        mb: 2,
                    }}
                >
                    <Typography variant="body2" sx={{ lineHeight: 1.8 }}>
                        {recognition.message}
                    </Typography>
                </Paper>

                {/* Points Badge */}
                {recognition.pointsAwarded > 0 && (
                    <Chip
                        icon={<StarIcon sx={{ fontSize: 16 }} />}
                        label={`+${recognition.pointsAwarded} نقطة`}
                        size="small"
                        sx={{
                            bgcolor: alpha('#F59E0B', 0.15),
                            color: '#F59E0B',
                            fontWeight: 700,
                            mb: 2,
                        }}
                    />
                )}

                {/* Reactions */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Stack direction="row" spacing={0.5}>
                        {REACTIONS.map((emoji) => {
                            const count = recognition.reactions?.filter(r => r.emoji === emoji).length || 0;
                            return (
                                <Tooltip key={emoji} title="إضافة تفاعل">
                                    <IconButton
                                        size="small"
                                        onClick={() => onReact(recognition.id, emoji)}
                                        sx={{
                                            bgcolor: count > 0 ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                                            borderRadius: 2,
                                            px: 1,
                                        }}
                                    >
                                        <Typography variant="caption">{emoji}</Typography>
                                        {count > 0 && (
                                            <Typography variant="caption" sx={{ ml: 0.5, fontWeight: 600 }}>
                                                {count}
                                            </Typography>
                                        )}
                                    </IconButton>
                                </Tooltip>
                            );
                        })}
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                        {new Date(recognition.createdAt).toLocaleDateString('ar-SA')}
                    </Typography>
                </Box>
            </CardContent>
        </Card>
    );
};

// Give Recognition Dialog
const GiveRecognitionDialog: React.FC<{
    open: boolean;
    onClose: () => void;
    onSubmit: (data: { receiverId: string; message: string; coreValueId?: string; pointsAwarded?: number }) => void;
    coreValues: CoreValue[];
}> = ({ open, onClose, onSubmit, coreValues }) => {
    const [formData, setFormData] = useState({
        receiverId: '',
        message: '',
        coreValueId: '',
        pointsAwarded: 10,
    });

    const handleSubmit = () => {
        onSubmit({
            ...formData,
            coreValueId: formData.coreValueId || undefined,
        });
        setFormData({ receiverId: '', message: '', coreValueId: '', pointsAwarded: 10 });
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CelebrationIcon color="primary" />
                    <Typography variant="h6" fontWeight={700}>إرسال تقدير 🎉</Typography>
                </Box>
            </DialogTitle>
            <DialogContent sx={{ pt: 3 }}>
                <Stack spacing={3}>
                    <TextField
                        fullWidth
                        label="معرف الموظف المستلم"
                        value={formData.receiverId}
                        onChange={(e) => setFormData({ ...formData, receiverId: e.target.value })}
                        placeholder="أدخل معرف الموظف"
                    />

                    <TextField
                        fullWidth
                        multiline
                        rows={4}
                        label="رسالة التقدير"
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        placeholder="اكتب رسالة التقدير والشكر..."
                    />

                    <FormControl fullWidth>
                        <InputLabel>القيمة المرتبطة</InputLabel>
                        <Select
                            value={formData.coreValueId}
                            label="القيمة المرتبطة"
                            onChange={(e) => setFormData({ ...formData, coreValueId: e.target.value })}
                        >
                            <MenuItem value="">بدون قيمة</MenuItem>
                            {coreValues.map((cv) => (
                                <MenuItem key={cv.id} value={cv.id}>
                                    {cv.icon} {cv.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <TextField
                        fullWidth
                        type="number"
                        label="النقاط الممنوحة"
                        value={formData.pointsAwarded}
                        onChange={(e) => setFormData({ ...formData, pointsAwarded: +e.target.value })}
                    />
                </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                <Button onClick={onClose}>إلغاء</Button>
                <Button variant="contained" onClick={handleSubmit} startIcon={<SendIcon />}>
                    إرسال التقدير
                </Button>
            </DialogActions>
        </Dialog>
    );
};

// Leaderboard
const Leaderboard: React.FC<{ period: 'week' | 'month' | 'year' }> = ({ period }) => {
    const theme = useTheme();
    const { data: leaderboard, isLoading } = useQuery({
        queryKey: ['recognition-leaderboard', period],
        queryFn: () => recognitionService.getLeaderboard(period),
    });

    const medals = ['🥇', '🥈', '🥉'];

    if (isLoading) {
        return <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 3 }} />;
    }

    return (
        <Paper sx={{ p: 3, borderRadius: 3, border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
            <Typography variant="h6" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LeaderboardIcon color="primary" /> قائمة المتميزين
            </Typography>

            <Stack spacing={1} sx={{ mt: 2 }}>
                {leaderboard?.slice(0, 10).map((item, index) => (
                    <Paper
                        key={item.userId}
                        elevation={0}
                        sx={{
                            p: 2,
                            borderRadius: 2,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                            bgcolor: index < 3 ? alpha(['#FFD700', '#C0C0C0', '#CD7F32'][index], 0.08) : alpha(theme.palette.divider, 0.03),
                            border: index < 3 ? `1px solid ${alpha(['#FFD700', '#C0C0C0', '#CD7F32'][index], 0.3)}` : 'none',
                        }}
                    >
                        <Typography variant="h5">{medals[index] || `#${index + 1}`}</Typography>
                        <Avatar sx={{ width: 36, height: 36, bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main' }}>
                            U
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle2" fontWeight={600}>User {item.userId.slice(0, 8)}...</Typography>
                        </Box>
                        <Chip
                            label={`${item.points} نقطة`}
                            size="small"
                            sx={{
                                bgcolor: alpha('#F59E0B', 0.15),
                                color: '#F59E0B',
                                fontWeight: 700,
                            }}
                        />
                    </Paper>
                ))}
            </Stack>
        </Paper>
    );
};

// Stats Card
const StatsCard: React.FC<{ title: string; value: number | string; color: string; icon: React.ReactNode; subtitle?: string }> = ({
    title, value, color, icon, subtitle
}) => {
    const theme = useTheme();
    return (
        <Card sx={{
            background: `linear-gradient(145deg, ${alpha(color, 0.1)} 0%, ${alpha(color, 0.02)} 100%)`,
            border: `1px solid ${alpha(color, 0.2)}`,
            borderRadius: 3,
            '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 8px 24px ${alpha(color, 0.15)}` },
        }}>
            <CardContent sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                        <Typography variant="caption" color="text.secondary">{title}</Typography>
                        <Typography variant="h4" fontWeight={800} sx={{ color }}>{value}</Typography>
                        {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
                    </Box>
                    <Box sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: alpha(color, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
                        {icon}
                    </Box>
                </Box>
            </CardContent>
        </Card>
    );
};

// Main Page
const RecognitionPage: React.FC = () => {
    const theme = useTheme();
    const queryClient = useQueryClient();
    const [tabValue, setTabValue] = useState(0);
    const [giveDialogOpen, setGiveDialogOpen] = useState(false);
    const [page, setPage] = useState(1);
    const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');

    // Queries
    const { data: wallData, isLoading: loadingWall } = useQuery({
        queryKey: ['recognition-wall', page],
        queryFn: () => recognitionService.getWall(page, 10),
    });

    const { data: coreValues } = useQuery({
        queryKey: ['core-values'],
        queryFn: () => recognitionService.getCoreValues(),
    });

    const { data: myRecognitions } = useQuery({
        queryKey: ['my-recognitions'],
        queryFn: () => recognitionService.getMyRecognitions(),
    });

    const { data: stats } = useQuery({
        queryKey: ['recognition-stats'],
        queryFn: () => recognitionService.getStats(),
    });

    // Mutations
    const giveMutation = useMutation({
        mutationFn: (data: { receiverId: string; message: string; coreValueId?: string; pointsAwarded?: number }) =>
            recognitionService.giveRecognition(data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recognition-wall'] }),
    });

    const reactMutation = useMutation({
        mutationFn: ({ id, emoji }: { id: string; emoji: string }) => recognitionService.addReaction(id, emoji),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recognition-wall'] }),
    });

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Box>
                    <Typography variant="h4" fontWeight={800} gutterBottom sx={{
                        background: `linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)`,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}>
                        🎉 جدار التقدير
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        شارك التقدير والشكر مع زملائك
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<CelebrationIcon />}
                    onClick={() => setGiveDialogOpen(true)}
                    sx={{
                        borderRadius: 2,
                        px: 3,
                        background: `linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)`,
                        boxShadow: `0 8px 24px ${alpha('#F59E0B', 0.3)}`,
                    }}
                >
                    أرسل تقدير
                </Button>
            </Box>

            {/* Stats */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <StatsCard title="إجمالي التقديرات" value={stats?.total || 0} color="#3B82F6" icon={<TrophyIcon />} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatsCard title="هذا الشهر" value={stats?.thisMonth || 0} color="#10B981" icon={<FireIcon />} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatsCard title="نقاطي" value={myRecognitions?.stats?.totalPointsReceived || 0} color="#F59E0B" icon={<StarIcon />} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatsCard title="نمو" value={`${stats?.growthRate || 0}%`} color="#8B5CF6" icon={<AnalyticsIcon />} subtitle="مقارنة بالشهر السابق" />
                </Grid>
            </Grid>

            {/* Tabs */}
            <Paper sx={{ borderRadius: 3, overflow: 'hidden', mb: 3 }}>
                <Tabs
                    value={tabValue}
                    onChange={(_, v) => setTabValue(v)}
                    sx={{
                        bgcolor: alpha(theme.palette.primary.main, 0.03),
                        '& .MuiTab-root': { fontWeight: 600, py: 2 },
                    }}
                >
                    <Tab icon={<CelebrationIcon />} label="جدار التقدير" iconPosition="start" />
                    <Tab icon={<LeaderboardIcon />} label="المتصدرين" iconPosition="start" />
                    <Tab icon={<SettingsIcon />} label="القيم الأساسية" iconPosition="start" />
                </Tabs>
            </Paper>

            {/* Content */}
            {tabValue === 0 && (
                <>
                    <Grid container spacing={3}>
                        {loadingWall ? (
                            [...Array(4)].map((_, i) => (
                                <Grid item xs={12} md={6} key={i}>
                                    <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 3 }} />
                                </Grid>
                            ))
                        ) : wallData?.data?.length === 0 ? (
                            <Grid item xs={12}>
                                <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3 }}>
                                    <CelebrationIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                                    <Typography variant="h6" color="text.secondary">لا توجد تقديرات بعد</Typography>
                                    <Typography variant="body2" color="text.disabled">كن أول من يرسل تقدير!</Typography>
                                </Paper>
                            </Grid>
                        ) : (
                            wallData?.data?.map((recognition) => (
                                <Grid item xs={12} md={6} key={recognition.id}>
                                    <RecognitionCard
                                        recognition={recognition}
                                        onReact={(id, emoji) => reactMutation.mutate({ id, emoji })}
                                    />
                                </Grid>
                            ))
                        )}
                    </Grid>

                    {wallData?.pagination && wallData.pagination.totalPages > 1 && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                            <Pagination
                                count={wallData.pagination.totalPages}
                                page={page}
                                onChange={(_, p) => setPage(p)}
                                color="primary"
                            />
                        </Box>
                    )}
                </>
            )}

            {tabValue === 1 && (
                <Box>
                    <FormControl sx={{ mb: 3, minWidth: 200 }}>
                        <InputLabel>الفترة</InputLabel>
                        <Select
                            value={period}
                            label="الفترة"
                            onChange={(e) => setPeriod(e.target.value as typeof period)}
                        >
                            <MenuItem value="week">هذا الأسبوع</MenuItem>
                            <MenuItem value="month">هذا الشهر</MenuItem>
                            <MenuItem value="year">هذه السنة</MenuItem>
                        </Select>
                    </FormControl>
                    <Leaderboard period={period} />
                </Box>
            )}

            {tabValue === 2 && (
                <Grid container spacing={3}>
                    {coreValues?.map((cv) => (
                        <Grid item xs={12} sm={6} md={4} key={cv.id}>
                            <Card sx={{
                                borderRadius: 3,
                                border: `2px solid ${alpha(cv.color || '#3B82F6', 0.2)}`,
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    transform: 'translateY(-4px)',
                                    boxShadow: `0 12px 28px ${alpha(cv.color || '#3B82F6', 0.2)}`,
                                },
                            }}>
                                <CardContent sx={{ textAlign: 'center', p: 4 }}>
                                    <Typography variant="h2" sx={{ mb: 2 }}>{cv.icon || '⭐'}</Typography>
                                    <Typography variant="h6" fontWeight={700} sx={{ color: cv.color }}>{cv.name}</Typography>
                                    {cv.description && (
                                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                            {cv.description}
                                        </Typography>
                                    )}
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}

            {/* Give Dialog */}
            <GiveRecognitionDialog
                open={giveDialogOpen}
                onClose={() => setGiveDialogOpen(false)}
                onSubmit={(data) => giveMutation.mutate(data)}
                coreValues={coreValues || []}
            />
        </Box>
    );
};

export default RecognitionPage;
