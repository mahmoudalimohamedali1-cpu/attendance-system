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
    Tabs,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    LinearProgress,
    Stack,
    IconButton,
    Tooltip,
    Alert,
    useTheme,
    alpha,
    Skeleton,
} from '@mui/material';
import {
    Add as AddIcon,
    Assessment as AssessmentIcon,
    People as PeopleIcon,
    PlayArrow as StartIcon,
    Visibility as ViewIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    CheckCircle as CompleteIcon,
    Schedule as ScheduleIcon,
    CalendarMonth as CalendarIcon,
    TrendingUp as TrendingUpIcon,
    GridView as GridIcon,
    Refresh as RefreshIcon,
    AutoAwesome as AIIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { performanceService, ReviewCycle } from '@/services/performance.service';
import UnifiedPerformanceDashboard from './components/UnifiedPerformanceDashboard';

// Status Colors
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    DRAFT: { label: 'مسودة', color: '#6B7280' },
    PLANNING: { label: 'التخطيط', color: '#3B82F6' },
    ACTIVE: { label: 'نشط', color: '#10B981' },
    CALIBRATION: { label: 'المعايرة', color: '#F59E0B' },
    COMPLETED: { label: 'مكتمل', color: '#8B5CF6' },
    CANCELLED: { label: 'ملغي', color: '#EF4444' },
};

const TYPE_CONFIG: Record<string, { label: string; icon: string }> = {
    ANNUAL: { label: 'سنوي', icon: '📅' },
    SEMI_ANNUAL: { label: 'نصف سنوي', icon: '📆' },
    QUARTERLY: { label: 'ربع سنوي', icon: '📊' },
    PROJECT_BASED: { label: 'مشروع', icon: '🎯' },
};

// Stats Card Component
const StatsCard: React.FC<{ title: string; value: number | string; color: string; icon: React.ReactNode; subtitle?: string }> = ({
    title, value, color, icon, subtitle
}) => {
    const theme = useTheme();
    return (
        <Card sx={{
            background: `linear-gradient(145deg, ${alpha(color, 0.1)} 0%, ${alpha(color, 0.03)} 100%)`,
            border: `1px solid ${alpha(color, 0.2)}`,
            borderRadius: 3,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative',
            overflow: 'hidden',
            '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: `0 12px 28px ${alpha(color, 0.2)}`,
            },
        }}>
            <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                            {title}
                        </Typography>
                        <Typography variant="h3" fontWeight={800} sx={{ color, mt: 0.5 }}>
                            {value}
                        </Typography>
                        {subtitle && (
                            <Typography variant="caption" color="text.secondary">
                                {subtitle}
                            </Typography>
                        )}
                    </Box>
                    <Box sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: alpha(color, 0.15),
                        color: color,
                    }}>
                        {icon}
                    </Box>
                </Box>
            </CardContent>
        </Card>
    );
};

// Create Cycle Dialog
const CreateCycleDialog: React.FC<{
    open: boolean;
    onClose: () => void;
    onSubmit: (data: Partial<ReviewCycle>) => void;
}> = ({ open, onClose, onSubmit }) => {
    const [formData, setFormData] = useState<Partial<ReviewCycle>>({
        name: '',
        type: 'ANNUAL',
        periodStart: '',
        periodEnd: '',
        includeSelfReview: true,
        include360Feedback: false,
        includeGoalRating: true,
        includeCompetencyRating: true,
        goalWeight: 40,
        competencyWeight: 40,
        valueWeight: 20,
    });

    const handleSubmit = () => {
        // Convert dates to ISO 8601 format
        const payload = {
            ...formData,
            periodStart: formData.periodStart ? new Date(formData.periodStart).toISOString() : undefined,
            periodEnd: formData.periodEnd ? new Date(formData.periodEnd).toISOString() : undefined,
        };
        onSubmit(payload);
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AssessmentIcon color="primary" />
                    <Typography variant="h6" fontWeight={700}>إنشاء دورة تقييم جديدة</Typography>
                </Box>
            </DialogTitle>
            <DialogContent sx={{ pt: 3 }}>
                <Stack spacing={3}>
                    <TextField
                        fullWidth
                        label="اسم الدورة"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="مثال: تقييم الأداء السنوي 2026"
                    />

                    <FormControl fullWidth>
                        <InputLabel>نوع الدورة</InputLabel>
                        <Select
                            value={formData.type}
                            label="نوع الدورة"
                            onChange={(e) => setFormData({ ...formData, type: e.target.value as ReviewCycle['type'] })}
                        >
                            {Object.entries(TYPE_CONFIG).map(([key, { label, icon }]) => (
                                <MenuItem key={key} value={key}>{icon} {label}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <Grid container spacing={2}>
                        <Grid item xs={6}>
                            <TextField
                                fullWidth
                                type="date"
                                label="بداية الفترة"
                                value={formData.periodStart}
                                onChange={(e) => setFormData({ ...formData, periodStart: e.target.value })}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                fullWidth
                                type="date"
                                label="نهاية الفترة"
                                value={formData.periodEnd}
                                onChange={(e) => setFormData({ ...formData, periodEnd: e.target.value })}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                    </Grid>

                    <Typography variant="subtitle2" fontWeight={600} sx={{ mt: 2 }}>
                        أوزان التقييم
                    </Typography>

                    <Grid container spacing={2}>
                        <Grid item xs={4}>
                            <TextField
                                fullWidth
                                type="number"
                                label="الأهداف %"
                                value={formData.goalWeight}
                                onChange={(e) => setFormData({ ...formData, goalWeight: +e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={4}>
                            <TextField
                                fullWidth
                                type="number"
                                label="الكفاءات %"
                                value={formData.competencyWeight}
                                onChange={(e) => setFormData({ ...formData, competencyWeight: +e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={4}>
                            <TextField
                                fullWidth
                                type="number"
                                label="القيم %"
                                value={formData.valueWeight}
                                onChange={(e) => setFormData({ ...formData, valueWeight: +e.target.value })}
                            />
                        </Grid>
                    </Grid>
                </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                <Button onClick={onClose}>إلغاء</Button>
                <Button variant="contained" onClick={handleSubmit} startIcon={<AddIcon />}>
                    إنشاء الدورة
                </Button>
            </DialogActions>
        </Dialog>
    );
};

// 9-Box Grid Component - Enhanced Version
const NineBoxGrid: React.FC<{ cycleId: string }> = ({ cycleId }) => {
    const theme = useTheme();
    const [selectedBox, setSelectedBox] = useState<string | null>(null);

    const { data: gridData, isLoading } = useQuery({
        queryKey: ['nine-box-grid', cycleId],
        queryFn: () => performanceService.getNineBoxGrid(cycleId),
        enabled: !!cycleId,
    });

    const boxLabels: Record<string, {
        label: string;
        labelAr: string;
        color: string;
        icon: string;
        recommendation: string;
        gradient: string;
    }> = {
        STAR: {
            label: 'Star',
            labelAr: '⭐ النجم',
            color: '#10B981',
            icon: '⭐',
            recommendation: 'ترقية وتطوير قيادي',
            gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
        },
        FUTURE_STAR: {
            label: 'Future Star',
            labelAr: '🚀 نجم المستقبل',
            color: '#3B82F6',
            icon: '🚀',
            recommendation: 'تدريب مكثف وإرشاد',
            gradient: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)'
        },
        HIGH_POTENTIAL: {
            label: 'High Potential',
            labelAr: '💎 إمكانات عالية',
            color: '#6366F1',
            icon: '💎',
            recommendation: 'مشاريع تحديّة ومهام قيادية',
            gradient: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)'
        },
        ENIGMA: {
            label: 'Enigma',
            labelAr: '🎭 غامض',
            color: '#F59E0B',
            icon: '🎭',
            recommendation: 'فهم الدوافع وتحسين البيئة',
            gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)'
        },
        CORE_PLAYER: {
            label: 'Core Player',
            labelAr: '🎯 لاعب أساسي',
            color: '#8B5CF6',
            icon: '🎯',
            recommendation: 'تقدير وتطوير مهارات جديدة',
            gradient: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)'
        },
        POTENTIAL_GEM: {
            label: 'Potential Gem',
            labelAr: '💫 جوهرة محتملة',
            color: '#EC4899',
            icon: '💫',
            recommendation: 'تدريب تقني وفرص نمو',
            gradient: 'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)'
        },
        SOLID_PERFORMER: {
            label: 'Solid Performer',
            labelAr: '✅ أداء ثابت',
            color: '#14B8A6',
            icon: '✅',
            recommendation: 'تقدير الاستقرار والاحتفاظ',
            gradient: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)'
        },
        INCONSISTENT: {
            label: 'Inconsistent',
            labelAr: '⚠️ غير متسق',
            color: '#F97316',
            icon: '⚠️',
            recommendation: 'خطة تحسين أداء',
            gradient: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)'
        },
        UNDERPERFORMER: {
            label: 'Underperformer',
            labelAr: '🔻 أداء ضعيف',
            color: '#EF4444',
            icon: '🔻',
            recommendation: 'خطة تحسين عاجلة أو إنهاء خدمة',
            gradient: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)'
        },
    };

    const gridOrder = [
        ['HIGH_POTENTIAL', 'FUTURE_STAR', 'STAR'],
        ['POTENTIAL_GEM', 'CORE_PLAYER', 'ENIGMA'],
        ['UNDERPERFORMER', 'INCONSISTENT', 'SOLID_PERFORMER'],
    ];

    const axisLabels = {
        y: ['إمكانات عالية', 'إمكانات متوسطة', 'إمكانات منخفضة'],
        x: ['أداء منخفض', 'أداء متوسط', 'أداء عالي'],
    };

    const totalEmployees = gridData?.distribution?.reduce((sum: number, d: { count: number }) => sum + d.count, 0) || 0;

    if (isLoading) {
        return <Skeleton variant="rectangular" height={500} sx={{ borderRadius: 3 }} />;
    }

    return (
        <Box>
            {/* Stats Overview */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={4}>
                    <Paper sx={{
                        p: 2,
                        borderRadius: 2,
                        background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                        color: 'white'
                    }}>
                        <Typography variant="h4" fontWeight={800}>{totalEmployees}</Typography>
                        <Typography variant="body2">إجمالي الموظفين المُقيَّمين</Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={4}>
                    <Paper sx={{
                        p: 2,
                        borderRadius: 2,
                        background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                        color: 'white'
                    }}>
                        <Typography variant="h4" fontWeight={800}>
                            {(gridData?.grid?.STAR?.length || 0) + (gridData?.grid?.FUTURE_STAR?.length || 0) + (gridData?.grid?.HIGH_POTENTIAL?.length || 0)}
                        </Typography>
                        <Typography variant="body2">المواهب العالية (Top Talent)</Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={4}>
                    <Paper sx={{
                        p: 2,
                        borderRadius: 2,
                        background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                        color: 'white'
                    }}>
                        <Typography variant="h4" fontWeight={800}>
                            {(gridData?.grid?.UNDERPERFORMER?.length || 0) + (gridData?.grid?.INCONSISTENT?.length || 0)}
                        </Typography>
                        <Typography variant="body2">يحتاجون تطوير عاجل</Typography>
                    </Paper>
                </Grid>
            </Grid>

            {/* Main Grid */}
            <Paper sx={{
                p: 3,
                borderRadius: 3,
                background: `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.background.default, 0.9)} 100%)`,
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                boxShadow: `0 20px 60px ${alpha('#000', 0.1)}`
            }}>
                <Typography variant="h5" fontWeight={800} gutterBottom sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    mb: 3
                }}>
                    <GridIcon color="primary" sx={{ fontSize: 32 }} />
                    9-Box Grid - مصفوفة المواهب
                </Typography>

                <Box sx={{ display: 'flex', gap: 2 }}>
                    {/* Y-Axis Labels */}
                    <Box sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-around',
                        width: 80,
                        textAlign: 'right',
                        pr: 1
                    }}>
                        {axisLabels.y.map((label, i) => (
                            <Typography
                                key={i}
                                variant="caption"
                                fontWeight={600}
                                color="text.secondary"
                                sx={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}
                            >
                                {label}
                            </Typography>
                        ))}
                    </Box>

                    {/* Grid */}
                    <Box sx={{ flex: 1 }}>
                        <Grid container spacing={1.5}>
                            {gridOrder.map((row, rowIndex) => (
                                row.map((position, colIndex) => {
                                    const config = boxLabels[position];
                                    const count = gridData?.grid?.[position]?.length || 0;
                                    const percentage = totalEmployees > 0
                                        ? ((count / totalEmployees) * 100).toFixed(0)
                                        : 0;
                                    const isSelected = selectedBox === position;

                                    return (
                                        <Grid item xs={4} key={position}>
                                            <Paper
                                                elevation={isSelected ? 12 : 0}
                                                onClick={() => setSelectedBox(isSelected ? null : position)}
                                                sx={{
                                                    p: 2,
                                                    textAlign: 'center',
                                                    borderRadius: 3,
                                                    border: `3px solid ${isSelected ? config.color : alpha(config.color, 0.3)}`,
                                                    background: isSelected
                                                        ? config.gradient
                                                        : alpha(config.color, 0.08),
                                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                    cursor: 'pointer',
                                                    minHeight: 120,
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    justifyContent: 'center',
                                                    position: 'relative',
                                                    overflow: 'hidden',
                                                    '&:hover': {
                                                        transform: 'scale(1.05) translateY(-4px)',
                                                        boxShadow: `0 16px 40px ${alpha(config.color, 0.35)}`,
                                                        borderColor: config.color,
                                                    },
                                                    '&::before': {
                                                        content: '""',
                                                        position: 'absolute',
                                                        top: 0,
                                                        left: 0,
                                                        right: 0,
                                                        bottom: 0,
                                                        background: `radial-gradient(circle at top right, ${alpha(config.color, 0.2)} 0%, transparent 70%)`,
                                                        pointerEvents: 'none',
                                                    },
                                                }}
                                            >
                                                <Typography
                                                    variant="h3"
                                                    fontWeight={900}
                                                    sx={{
                                                        color: isSelected ? 'white' : config.color,
                                                        textShadow: isSelected ? '0 2px 8px rgba(0,0,0,0.3)' : 'none',
                                                    }}
                                                >
                                                    {count}
                                                </Typography>
                                                <Typography
                                                    variant="body2"
                                                    fontWeight={700}
                                                    sx={{ color: isSelected ? 'white' : 'text.primary' }}
                                                >
                                                    {config.labelAr}
                                                </Typography>
                                                <Chip
                                                    label={`${percentage}%`}
                                                    size="small"
                                                    sx={{
                                                        mt: 1,
                                                        fontWeight: 700,
                                                        bgcolor: isSelected ? alpha('#fff', 0.2) : alpha(config.color, 0.15),
                                                        color: isSelected ? 'white' : config.color,
                                                        border: `1px solid ${isSelected ? alpha('#fff', 0.3) : alpha(config.color, 0.3)}`,
                                                    }}
                                                />
                                            </Paper>
                                        </Grid>
                                    );
                                })
                            ))}
                        </Grid>

                        {/* X-Axis Labels */}
                        <Grid container spacing={1.5} sx={{ mt: 1 }}>
                            {axisLabels.x.map((label, i) => (
                                <Grid item xs={4} key={i}>
                                    <Typography
                                        variant="caption"
                                        fontWeight={600}
                                        color="text.secondary"
                                        sx={{ textAlign: 'center', display: 'block' }}
                                    >
                                        {label}
                                    </Typography>
                                </Grid>
                            ))}
                        </Grid>
                    </Box>
                </Box>

                {/* Axis Labels */}
                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        ↑ الإمكانات (Potential)
                    </Typography>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        الأداء (Performance) →
                    </Typography>
                </Box>
            </Paper>

            {/* Selected Box Details */}
            {selectedBox && (
                <Paper sx={{
                    mt: 3,
                    p: 3,
                    borderRadius: 3,
                    background: boxLabels[selectedBox].gradient,
                    color: 'white'
                }}>
                    <Typography variant="h6" fontWeight={700} gutterBottom>
                        {boxLabels[selectedBox].icon} {boxLabels[selectedBox].labelAr}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9, mb: 2 }}>
                        <strong>التوصية:</strong> {boxLabels[selectedBox].recommendation}
                    </Typography>
                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                        الموظفون ({gridData?.grid?.[selectedBox]?.length || 0}):
                    </Typography>
                    {gridData?.grid?.[selectedBox]?.length > 0 ? (
                        <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                            {gridData.grid[selectedBox].map((empId: string, i: number) => (
                                <Chip
                                    key={i}
                                    label={`موظف #${empId.slice(-4)}`}
                                    size="small"
                                    sx={{
                                        bgcolor: alpha('#fff', 0.2),
                                        color: 'white',
                                        fontWeight: 600,
                                    }}
                                />
                            ))}
                        </Stack>
                    ) : (
                        <Typography variant="body2" sx={{ opacity: 0.7 }}>
                            لا يوجد موظفون في هذه الفئة
                        </Typography>
                    )}
                </Paper>
            )}

            {/* Legend */}
            <Paper sx={{ mt: 3, p: 2, borderRadius: 2 }}>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                    📖 دليل المصفوفة
                </Typography>
                <Grid container spacing={1}>
                    {Object.entries(boxLabels).map(([key, config]) => (
                        <Grid item xs={6} sm={4} key={key}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box sx={{
                                    width: 12,
                                    height: 12,
                                    borderRadius: '50%',
                                    background: config.gradient
                                }} />
                                <Typography variant="caption" color="text.secondary">
                                    {config.labelAr}
                                </Typography>
                            </Box>
                        </Grid>
                    ))}
                </Grid>
            </Paper>
        </Box>
    );
};

// Main Page Component
const PerformanceReviewsPage: React.FC = () => {
    const theme = useTheme();
    const queryClient = useQueryClient();
    const [tabValue, setTabValue] = useState(0);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
    const [aiPrompt, setAiPrompt] = useState('');
    const [aiResult, setAiResult] = useState<{ goal?: { title: string; description: string; metrics: string[] } } | null>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [editingCycle, setEditingCycle] = useState<ReviewCycle | null>(null);

    // Queries
    const { data: cycles, isLoading, refetch } = useQuery({
        queryKey: ['review-cycles'],
        queryFn: () => performanceService.getCycles(),
    });

    // Mutations
    const createMutation = useMutation({
        mutationFn: (data: Partial<ReviewCycle>) => performanceService.createCycle(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['review-cycles'] });
        },
    });

    const startMutation = useMutation({
        mutationFn: (id: string) => performanceService.startCycle(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['review-cycles'] });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => performanceService.deleteCycle(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['review-cycles'] });
            alert('تم حذف الدورة بنجاح');
        },
        onError: () => {
            alert('فشل حذف الدورة');
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<ReviewCycle> }) => performanceService.updateCycle(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['review-cycles'] });
            setEditingCycle(null);
            alert('تم تحديث الدورة بنجاح');
        },
    });

    // Stats
    const activeCycles = cycles?.filter(c => c.status === 'ACTIVE').length || 0;
    const completedCycles = cycles?.filter(c => c.status === 'COMPLETED').length || 0;
    const totalReviews = cycles?.reduce((sum, c) => sum + (c._count?.reviews || 0), 0) || 0;

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Box>
                    <Typography variant="h4" fontWeight={800} gutterBottom sx={{
                        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}>
                        نظام تقييم الأداء
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        إدارة دورات التقييم، الأهداف، و 9-Box Grid للمواهب
                    </Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                    <Tooltip title="تحديث">
                        <IconButton onClick={() => refetch()} sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
                            <RefreshIcon />
                        </IconButton>
                    </Tooltip>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setCreateDialogOpen(true)}
                        sx={{
                            borderRadius: 2,
                            px: 3,
                            py: 1,
                            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                            boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.3)}`,
                        }}
                    >
                        إنشاء دورة جديدة
                    </Button>
                </Stack>
            </Box>

            {/* Stats Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <StatsCard title="الدورات النشطة" value={activeCycles} color="#10B981" icon={<AssessmentIcon />} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatsCard title="الدورات المكتملة" value={completedCycles} color="#8B5CF6" icon={<CompleteIcon />} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatsCard title="إجمالي التقييمات" value={totalReviews} color="#3B82F6" icon={<PeopleIcon />} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatsCard title="معدل الإنجاز" value="78%" color="#F59E0B" icon={<TrendingUpIcon />} />
                </Grid>
            </Grid>

            {/* Tabs */}
            <Paper sx={{ borderRadius: 3, overflow: 'hidden', mb: 3 }}>
                <Tabs
                    value={tabValue}
                    onChange={(_, v) => setTabValue(v)}
                    sx={{
                        bgcolor: alpha(theme.palette.primary.main, 0.03),
                        borderBottom: 1,
                        borderColor: 'divider',
                        '& .MuiTab-root': { fontWeight: 600, py: 2 },
                    }}
                >
                    <Tab icon={<AssessmentIcon />} label="دورات التقييم" iconPosition="start" />
                    <Tab icon={<GridIcon />} label="9-Box Grid" iconPosition="start" />
                    <Tab icon={<TrendingUpIcon />} label="الأداء الموحد" iconPosition="start" />
                    <Tab icon={<AIIcon />} label="AI Assistant" iconPosition="start" />
                </Tabs>
            </Paper>

            {/* Tab Content */}
            {tabValue === 0 && (
                <TableContainer component={Paper} sx={{ borderRadius: 3, border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.03) }}>
                                <TableCell sx={{ fontWeight: 700 }}>الدورة</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>النوع</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>الفترة</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>التقييمات</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>الإجراءات</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {isLoading ? (
                                [...Array(3)].map((_, i) => (
                                    <TableRow key={i}>
                                        {[...Array(6)].map((_, j) => (
                                            <TableCell key={j}><Skeleton /></TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : cycles?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} sx={{ textAlign: 'center', py: 6 }}>
                                        <AssessmentIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                                        <Typography variant="h6" color="text.secondary">
                                            لا توجد دورات تقييم
                                        </Typography>
                                        <Typography variant="body2" color="text.disabled">
                                            أنشئ دورة تقييم جديدة للبدء
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                cycles?.map((cycle) => {
                                    const statusConfig = STATUS_CONFIG[cycle.status];
                                    const typeConfig = TYPE_CONFIG[cycle.type];

                                    return (
                                        <TableRow key={cycle.id} hover sx={{ cursor: 'pointer' }}>
                                            <TableCell>
                                                <Box>
                                                    <Typography variant="subtitle2" fontWeight={700}>{cycle.name}</Typography>
                                                    {cycle.nameEn && (
                                                        <Typography variant="caption" color="text.secondary">{cycle.nameEn}</Typography>
                                                    )}
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    size="small"
                                                    label={`${typeConfig.icon} ${typeConfig.label}`}
                                                    sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), fontWeight: 600 }}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Stack direction="row" spacing={0.5} alignItems="center">
                                                    <CalendarIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                                    <Typography variant="body2">
                                                        {new Date(cycle.periodStart).toLocaleDateString('ar-SA')} - {new Date(cycle.periodEnd).toLocaleDateString('ar-SA')}
                                                    </Typography>
                                                </Stack>
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    size="small"
                                                    label={statusConfig.label}
                                                    sx={{
                                                        bgcolor: alpha(statusConfig.color, 0.15),
                                                        color: statusConfig.color,
                                                        fontWeight: 700,
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    size="small"
                                                    label={cycle._count?.reviews || 0}
                                                    sx={{ bgcolor: alpha('#3B82F6', 0.1), color: '#3B82F6', fontWeight: 700 }}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Stack direction="row" spacing={0.5}>
                                                    {cycle.status === 'DRAFT' && (
                                                        <Tooltip title="بدء الدورة">
                                                            <IconButton
                                                                size="small"
                                                                color="success"
                                                                onClick={() => startMutation.mutate(cycle.id)}
                                                            >
                                                                <StartIcon />
                                                            </IconButton>
                                                        </Tooltip>
                                                    )}
                                                    <Tooltip title="عرض">
                                                        <IconButton
                                                            size="small"
                                                            color="primary"
                                                            onClick={() => setSelectedCycleId(cycle.id)}
                                                        >
                                                            <ViewIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="تعديل">
                                                        <IconButton
                                                            size="small"
                                                            color="info"
                                                            onClick={() => setEditingCycle(cycle)}
                                                        >
                                                            <EditIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="حذف">
                                                        <IconButton
                                                            size="small"
                                                            color="error"
                                                            onClick={() => deleteMutation.mutate(cycle.id)}
                                                        >
                                                            <DeleteIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Stack>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {tabValue === 1 && (
                <Box>
                    {selectedCycleId ? (
                        <NineBoxGrid cycleId={selectedCycleId} />
                    ) : (
                        <Alert severity="info" sx={{ borderRadius: 2 }}>
                            اختر دورة تقييم من التبويب الأول لعرض مصفوفة 9-Box Grid
                        </Alert>
                    )}

                    {/* Cycle Selector */}
                    <FormControl fullWidth sx={{ mt: 3 }}>
                        <InputLabel>اختر دورة التقييم</InputLabel>
                        <Select
                            value={selectedCycleId || ''}
                            label="اختر دورة التقييم"
                            onChange={(e) => setSelectedCycleId(e.target.value)}
                        >
                            {cycles?.map((cycle) => (
                                <MenuItem key={cycle.id} value={cycle.id}>{cycle.name}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>
            )}

            {tabValue === 2 && (
                <Box>
                    {selectedCycleId ? (
                        <UnifiedPerformanceDashboard companyId="default" cycleId={selectedCycleId} />
                    ) : (
                        <Alert severity="info" sx={{ borderRadius: 2 }}>
                            اختر دورة تقييم لعرض لوحة الأداء الموحد (Goals 70% + KPI 30%)
                        </Alert>
                    )}

                    {/* Cycle Selector */}
                    <FormControl fullWidth sx={{ mt: 3 }}>
                        <InputLabel>اختر دورة التقييم</InputLabel>
                        <Select
                            value={selectedCycleId || ''}
                            label="اختر دورة التقييم"
                            onChange={(e) => setSelectedCycleId(e.target.value)}
                        >
                            {cycles?.map((cycle) => (
                                <MenuItem key={cycle.id} value={cycle.id}>{cycle.name}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>
            )}

            {tabValue === 3 && (
                <Paper sx={{ p: 4, borderRadius: 3, textAlign: 'center' }}>
                    <AIIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
                    <Typography variant="h5" fontWeight={700} gutterBottom>
                        مساعد الذكاء الاصطناعي للأهداف
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        اكتب وصفاً للهدف وسيقوم الذكاء الاصطناعي بتحويله إلى هدف SMART أو OKR
                    </Typography>
                    <TextField
                        fullWidth
                        multiline
                        rows={3}
                        placeholder="مثال: أريد تحسين رضا العملاء في الربع القادم"
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        sx={{ mb: 2 }}
                    />
                    <Button
                        variant="contained"
                        startIcon={<AIIcon />}
                        size="large"
                        disabled={aiLoading || !aiPrompt.trim()}
                        onClick={async () => {
                            setAiLoading(true);
                            try {
                                const result = await performanceService.generateGoal(aiPrompt);
                                setAiResult(result);
                            } catch (error) {
                                console.error('AI generation failed:', error);
                            } finally {
                                setAiLoading(false);
                            }
                        }}
                    >
                        {aiLoading ? 'جاري التوليد...' : 'توليد الهدف بالذكاء الاصطناعي'}
                    </Button>
                    {aiResult?.goal && (
                        <Paper sx={{ mt: 3, p: 3, textAlign: 'right', bgcolor: alpha(theme.palette.success.main, 0.05), border: `1px solid ${alpha(theme.palette.success.main, 0.2)}` }}>
                            <Typography variant="h6" fontWeight={700} color="success.main" gutterBottom>
                                {aiResult.goal.title}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                {aiResult.goal.description}
                            </Typography>
                            <Typography variant="subtitle2" fontWeight={600}>المقاييس:</Typography>
                            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
                                {aiResult.goal.metrics.map((metric, i) => (
                                    <Chip key={i} label={metric} size="small" color="success" variant="outlined" />
                                ))}
                            </Stack>
                        </Paper>
                    )}
                </Paper>
            )}

            {/* Create Dialog */}
            <CreateCycleDialog
                open={createDialogOpen}
                onClose={() => setCreateDialogOpen(false)}
                onSubmit={(data) => createMutation.mutate(data)}
            />

            {/* Edit Dialog */}
            {editingCycle && (
                <Dialog open={!!editingCycle} onClose={() => setEditingCycle(null)} maxWidth="sm" fullWidth>
                    <DialogTitle sx={{ fontWeight: 700 }}>تعديل دورة التقييم</DialogTitle>
                    <DialogContent>
                        <TextField
                            fullWidth
                            label="اسم الدورة"
                            defaultValue={editingCycle.name}
                            sx={{ mt: 2, mb: 2 }}
                            id="edit-cycle-name"
                        />
                        <TextField
                            fullWidth
                            label="تاريخ البداية"
                            type="date"
                            defaultValue={editingCycle.periodStart?.split('T')[0]}
                            sx={{ mb: 2 }}
                            InputLabelProps={{ shrink: true }}
                            id="edit-cycle-start"
                        />
                        <TextField
                            fullWidth
                            label="تاريخ النهاية"
                            type="date"
                            defaultValue={editingCycle.periodEnd?.split('T')[0]}
                            InputLabelProps={{ shrink: true }}
                            id="edit-cycle-end"
                        />
                    </DialogContent>
                    <DialogActions sx={{ p: 2 }}>
                        <Button onClick={() => setEditingCycle(null)}>إلغاء</Button>
                        <Button
                            variant="contained"
                            onClick={() => {
                                const name = (document.getElementById('edit-cycle-name') as HTMLInputElement)?.value;
                                const periodStart = (document.getElementById('edit-cycle-start') as HTMLInputElement)?.value;
                                const periodEnd = (document.getElementById('edit-cycle-end') as HTMLInputElement)?.value;
                                updateMutation.mutate({
                                    id: editingCycle.id,
                                    data: {
                                        name,
                                        periodStart: periodStart ? new Date(periodStart).toISOString() : undefined,
                                        periodEnd: periodEnd ? new Date(periodEnd).toISOString() : undefined,
                                    },
                                });
                            }}
                        >
                            حفظ التعديلات
                        </Button>
                    </DialogActions>
                </Dialog>
            )}
        </Box>
    );
};

export default PerformanceReviewsPage;
