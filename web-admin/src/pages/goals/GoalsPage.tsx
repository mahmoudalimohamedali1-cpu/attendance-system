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
    Accordion,
    AccordionSummary,
    AccordionDetails,
    useTheme,
    alpha,
    Skeleton,
    Alert,
    FormControlLabel,
    Checkbox,
    Divider,
    Autocomplete,
} from '@mui/material';
import {
    Add as AddIcon,
    Flag as FlagIcon,
    ExpandMore as ExpandMoreIcon,
    CheckCircle as CheckIcon,
    Schedule as ScheduleIcon,
    TrendingUp as TrendingUpIcon,
    Person as PersonIcon,
    Business as BusinessIcon,
    Groups as GroupsIcon,
    AutoAwesome as AIIcon,
    Refresh as RefreshIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Send as SendIcon,
    ThumbUp as ApproveIcon,
    ThumbDown as RejectIcon,
    Star as StarIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { goalsService, performanceService, Goal } from '@/services/performance.service';
import { usersService } from '@/services/users.service';

// Status Colors
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    DRAFT: { label: 'مسودة', color: '#6B7280' },
    PENDING_APPROVAL: { label: 'في انتظار الموافقة', color: '#F59E0B' },
    APPROVED: { label: 'معتمد', color: '#3B82F6' },
    IN_PROGRESS: { label: 'قيد التنفيذ', color: '#8B5CF6' },
    ON_TRACK: { label: 'على المسار', color: '#10B981' },
    AT_RISK: { label: 'معرض للخطر', color: '#EF4444' },
    EXCEEDED: { label: 'تجاوز الهدف', color: '#059669' },
    COMPLETED: { label: 'مكتمل', color: '#14B8A6' },
    CANCELLED: { label: 'ملغي', color: '#9CA3AF' },
};

const TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    INDIVIDUAL: { label: 'فردي', icon: <PersonIcon />, color: '#3B82F6' },
    TEAM: { label: 'فريق', icon: <GroupsIcon />, color: '#8B5CF6' },
    DEPARTMENT: { label: 'قسم', icon: <BusinessIcon />, color: '#F59E0B' },
    COMPANY: { label: 'شركة', icon: <FlagIcon />, color: '#10B981' },
};

// Goal Card Component
const GoalCard: React.FC<{ goal: Goal; onEdit: (goal: Goal) => void; onCheckIn: (goal: Goal) => void; onSync?: (goal: Goal) => void }> = ({ goal, onEdit, onCheckIn, onSync }) => {
    const theme = useTheme();
    const statusConfig = STATUS_CONFIG[goal.status] || STATUS_CONFIG.DRAFT;
    const typeConfig = TYPE_CONFIG[goal.type] || TYPE_CONFIG.INDIVIDUAL;

    const progressColor = goal.progress >= 100 ? '#10B981' : goal.progress >= 70 ? '#3B82F6' : goal.progress >= 40 ? '#F59E0B' : '#EF4444';

    return (
        <Card sx={{
            borderRadius: 3,
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            transition: 'all 0.3s ease',
            position: 'relative',
            overflow: 'visible',
            '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: `0 16px 40px ${alpha(typeConfig.color, 0.15)}`,
            },
            '&::before': {
                content: '""',
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: 5,
                background: `linear-gradient(180deg, ${typeConfig.color} 0%, ${alpha(typeConfig.color, 0.5)} 100%)`,
                borderRadius: '12px 0 0 12px',
            },
        }}>
            <CardContent sx={{ pl: 3 }}>
                {/* Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ flex: 1 }}>
                        <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap', gap: 0.5 }}>
                            <Chip
                                size="small"
                                icon={typeConfig.icon as React.ReactElement}
                                label={typeConfig.label}
                                sx={{ bgcolor: alpha(typeConfig.color, 0.1), color: typeConfig.color, fontWeight: 600 }}
                            />
                            <Chip
                                size="small"
                                label={statusConfig.label}
                                sx={{ bgcolor: alpha(statusConfig.color, 0.15), color: statusConfig.color, fontWeight: 700 }}
                            />
                            {goal.weight && (
                                <Chip size="small" label={`وزن: ${goal.weight}%`} sx={{ bgcolor: alpha('#6B7280', 0.1) }} />
                            )}
                            {(goal as any).dataSource && (
                                <Chip
                                    size="small"
                                    label={`🔗 @${(goal as any).dataSource.toLowerCase()}`}
                                    sx={{
                                        bgcolor: alpha('#8B5CF6', 0.15),
                                        color: '#8B5CF6',
                                        fontWeight: 700,
                                        animation: 'pulse 2s infinite'
                                    }}
                                />
                            )}
                        </Stack>
                        <Typography variant="h6" fontWeight={700}>{goal.title}</Typography>
                        {goal.description && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, lineHeight: 1.6 }}>
                                {goal.description.slice(0, 150)}{goal.description.length > 150 ? '...' : ''}
                            </Typography>
                        )}
                    </Box>
                    <Stack direction="row" spacing={0.5}>
                        {(goal as any).dataSource && onSync && (
                            <Tooltip title="مزامنة من النظام">
                                <IconButton size="small" color="success" onClick={() => onSync(goal)}>
                                    <RefreshIcon />
                                </IconButton>
                            </Tooltip>
                        )}
                        <Tooltip title="تحديث التقدم">
                            <IconButton size="small" color="primary" onClick={() => onCheckIn(goal)}>
                                <TrendingUpIcon />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="تعديل">
                            <IconButton size="small" color="info" onClick={() => onEdit(goal)}>
                                <EditIcon />
                            </IconButton>
                        </Tooltip>
                    </Stack>
                </Box>

                {/* Progress */}
                <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                            التقدم: {goal.currentValue || 0} / {goal.targetValue || 100}
                        </Typography>
                        <Typography variant="caption" fontWeight={700} sx={{ color: progressColor }}>
                            {goal.progress}%
                        </Typography>
                    </Box>
                    <LinearProgress
                        variant="determinate"
                        value={Math.min(goal.progress, 100)}
                        sx={{
                            height: 8,
                            borderRadius: 4,
                            bgcolor: alpha(progressColor, 0.15),
                            '& .MuiLinearProgress-bar': {
                                bgcolor: progressColor,
                                borderRadius: 4,
                            },
                        }}
                    />
                </Box>

                {/* Key Results */}
                {goal.keyResults && goal.keyResults.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                            النتائج الرئيسية ({goal.keyResults.length})
                        </Typography>
                        <Stack spacing={1}>
                            {goal.keyResults.slice(0, 3).map((kr) => (
                                <Box key={kr.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <CheckIcon sx={{ fontSize: 16, color: kr.progress >= 100 ? '#10B981' : '#6B7280' }} />
                                    <Typography variant="caption" sx={{ flex: 1 }}>
                                        {kr.title}
                                    </Typography>
                                    <Chip size="small" label={`${kr.progress}%`} sx={{ height: 18, fontSize: '0.65rem' }} />
                                </Box>
                            ))}
                        </Stack>
                    </Box>
                )}

                {/* Footer */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                    {goal.dueDate && (
                        <Stack direction="row" spacing={0.5} alignItems="center">
                            <ScheduleIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="caption" color="text.secondary">
                                {new Date(goal.dueDate).toLocaleDateString('ar-SA')}
                            </Typography>
                        </Stack>
                    )}
                </Box>
            </CardContent>
        </Card>
    );
};

// Stats Card
const StatsCard: React.FC<{ title: string; value: number | string; color: string; icon: React.ReactNode }> = ({
    title, value, color, icon
}) => {
    const theme = useTheme();
    return (
        <Card sx={{
            background: `linear-gradient(145deg, ${alpha(color, 0.1)} 0%, ${alpha(color, 0.02)} 100%)`,
            border: `1px solid ${alpha(color, 0.2)}`,
            borderRadius: 3,
            transition: 'all 0.3s ease',
            '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 8px 24px ${alpha(color, 0.15)}` },
        }}>
            <CardContent sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                        <Typography variant="caption" color="text.secondary">{title}</Typography>
                        <Typography variant="h4" fontWeight={800} sx={{ color }}>{value}</Typography>
                    </Box>
                    <Box sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: alpha(color, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
                        {icon}
                    </Box>
                </Box>
            </CardContent>
        </Card>
    );
};

// Create Goal Dialog - Enhanced Version
const CreateGoalDialog: React.FC<{
    open: boolean;
    onClose: () => void;
    onSubmit: (data: Partial<Goal>) => void;
}> = ({ open, onClose, onSubmit }) => {
    const theme = useTheme();

    // Fetch employees for dropdowns
    const { data: employees = [] } = useQuery({
        queryKey: ['employees-list'],
        queryFn: () => usersService.getEmployees(),
        enabled: open,
    });

    const [formData, setFormData] = useState<any>({
        title: '',
        description: '',
        type: 'INDIVIDUAL',
        ownerId: '',
        managerId: '',
        startDate: '',
        dueDate: '',
        targetValue: 100,
        currentValue: 0,
        weight: 100,
        unit: '%',
        category: '',
        isStretch: false,
        dataSource: '',
        autoCalculated: false,
    });

    const handleSubmit = () => {
        if (!formData.title) {
            alert('يرجى إدخال عنوان الهدف');
            return;
        }
        if (!formData.ownerId) {
            alert('يرجى اختيار الموظف المستهدف');
            return;
        }
        onSubmit(formData);
        onClose();
        setTimeout(() => {
            setFormData({
                title: '', description: '', type: 'INDIVIDUAL', ownerId: '', managerId: '',
                startDate: '', dueDate: '', targetValue: 100, currentValue: 0, weight: 100,
                unit: '%', category: '', isStretch: false, dataSource: '', autoCalculated: false,
            });
        }, 100);
    };

    const categories = [
        { value: 'SALES', label: '💰 المبيعات' },
        { value: 'QUALITY', label: '✅ الجودة' },
        { value: 'EFFICIENCY', label: '⚡ الكفاءة' },
        { value: 'CUSTOMER', label: '👥 خدمة العملاء' },
        { value: 'DEVELOPMENT', label: '📈 التطوير' },
        { value: 'ATTENDANCE', label: '📊 الحضور' },
        { value: 'OTHER', label: '📌 أخرى' },
    ];

    const units = [
        { value: '%', label: 'نسبة مئوية (%)' },
        { value: 'count', label: 'عدد' },
        { value: 'SAR', label: 'ريال سعودي' },
        { value: 'hours', label: 'ساعات' },
        { value: 'days', label: 'أيام' },
    ];

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: alpha(theme.palette.primary.main, 0.03) }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FlagIcon color="primary" />
                    <Typography variant="h6" fontWeight={700}>إنشاء هدف جديد</Typography>
                </Box>
            </DialogTitle>
            <DialogContent sx={{ pt: 3 }}>
                <Stack spacing={3}>
                    {/* Section: Basic Info */}
                    <Box>
                        <Typography variant="subtitle2" fontWeight={700} color="primary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            📝 معلومات أساسية
                        </Typography>
                        <Stack spacing={2}>
                            <TextField
                                fullWidth
                                label="عنوان الهدف *"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="مثال: زيادة رضا العملاء بنسبة 20%"
                            />
                            <TextField
                                fullWidth
                                multiline
                                rows={2}
                                label="وصف الهدف"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    <FormControl fullWidth>
                                        <InputLabel>نوع الهدف</InputLabel>
                                        <Select
                                            value={formData.type}
                                            label="نوع الهدف"
                                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                        >
                                            {Object.entries(TYPE_CONFIG).map(([key, { label }]) => (
                                                <MenuItem key={key} value={key}>{label}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={6}>
                                    <FormControl fullWidth>
                                        <InputLabel>التصنيف</InputLabel>
                                        <Select
                                            value={formData.category}
                                            label="التصنيف"
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        >
                                            <MenuItem value="">-- اختر التصنيف --</MenuItem>
                                            {categories.map((cat) => (
                                                <MenuItem key={cat.value} value={cat.value}>{cat.label}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                            </Grid>
                        </Stack>
                    </Box>

                    <Divider />

                    {/* Section: Assignees */}
                    <Box>
                        <Typography variant="subtitle2" fontWeight={700} color="primary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            👥 المسؤولين
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={6}>
                                <FormControl fullWidth>
                                    <InputLabel>الموظف المستهدف *</InputLabel>
                                    <Select
                                        value={formData.ownerId}
                                        label="الموظف المستهدف *"
                                        onChange={(e) => setFormData({ ...formData, ownerId: e.target.value })}
                                    >
                                        <MenuItem value="">-- اختر الموظف --</MenuItem>
                                        {employees.map((emp: any) => (
                                            <MenuItem key={emp.id} value={emp.id}>
                                                {emp.firstName} {emp.lastName} - {emp.jobTitle || emp.employeeCode}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={6}>
                                <FormControl fullWidth>
                                    <InputLabel>المدير المُقيّم</InputLabel>
                                    <Select
                                        value={formData.managerId}
                                        label="المدير المُقيّم"
                                        onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
                                    >
                                        <MenuItem value="">-- اختر المدير --</MenuItem>
                                        {employees.filter((e: any) => e.role === 'MANAGER' || e.role === 'ADMIN' || e.role === 'HR').map((emp: any) => (
                                            <MenuItem key={emp.id} value={emp.id}>
                                                {emp.firstName} {emp.lastName}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                        </Grid>
                    </Box>

                    <Divider />

                    {/* Section: Timing */}
                    <Box>
                        <Typography variant="subtitle2" fontWeight={700} color="primary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            📅 التوقيت
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={6}>
                                <TextField
                                    fullWidth
                                    type="date"
                                    label="تاريخ البداية"
                                    value={formData.startDate}
                                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                            <Grid item xs={6}>
                                <TextField
                                    fullWidth
                                    type="date"
                                    label="تاريخ الاستحقاق"
                                    value={formData.dueDate}
                                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                        </Grid>
                    </Box>

                    <Divider />

                    {/* Section: Measurement */}
                    <Box>
                        <Typography variant="subtitle2" fontWeight={700} color="primary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            📊 القياس
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={3}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="القيمة المستهدفة"
                                    value={formData.targetValue}
                                    onChange={(e) => setFormData({ ...formData, targetValue: +e.target.value })}
                                />
                            </Grid>
                            <Grid item xs={3}>
                                <FormControl fullWidth>
                                    <InputLabel>الوحدة</InputLabel>
                                    <Select
                                        value={formData.unit}
                                        label="الوحدة"
                                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                    >
                                        {units.map((u) => (
                                            <MenuItem key={u.value} value={u.value}>{u.label}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={3}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="الوزن %"
                                    value={formData.weight}
                                    onChange={(e) => setFormData({ ...formData, weight: +e.target.value })}
                                />
                            </Grid>
                            <Grid item xs={3}>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={formData.isStretch}
                                            onChange={(e) => setFormData({ ...formData, isStretch: e.target.checked })}
                                            icon={<StarIcon />}
                                            checkedIcon={<StarIcon sx={{ color: '#F59E0B' }} />}
                                        />
                                    }
                                    label="هدف طموح"
                                    sx={{ mt: 1 }}
                                />
                            </Grid>
                        </Grid>
                    </Box>

                    <Divider />

                    {/* Section: Data Source (Smart Goals) */}
                    <Paper sx={{ p: 2, borderRadius: 2, bgcolor: alpha('#8B5CF6', 0.05), border: `1px solid ${alpha('#8B5CF6', 0.2)}` }}>
                        <Typography variant="subtitle2" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            🔗 ربط بالنظام (تقييم تلقائي)
                        </Typography>
                        <FormControl fullWidth size="small">
                            <InputLabel>مصدر البيانات</InputLabel>
                            <Select
                                value={formData.dataSource}
                                label="مصدر البيانات"
                                onChange={(e) => setFormData({
                                    ...formData,
                                    dataSource: e.target.value,
                                    autoCalculated: !!e.target.value
                                })}
                            >
                                <MenuItem value="">بدون (تحديث يدوي)</MenuItem>
                                <MenuItem value="ATTENDANCE">📊 @attendance - الحضور والانصراف</MenuItem>
                                <MenuItem value="LEAVES">🏖️ @leaves - الإجازات</MenuItem>
                                <MenuItem value="TASKS">✅ @tasks - المهام</MenuItem>
                                <MenuItem value="OVERTIME">⏰ @overtime - العمل الإضافي</MenuItem>
                                <MenuItem value="RECOGNITION">🏆 @recognition - التقدير</MenuItem>
                            </Select>
                        </FormControl>
                        {formData.dataSource && (
                            <Alert severity="info" sx={{ mt: 1, fontSize: '0.75rem' }}>
                                سيتم تحديث التقدم تلقائياً من بيانات {formData.dataSource}
                            </Alert>
                        )}
                    </Paper>
                </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                <Button onClick={onClose}>إلغاء</Button>
                <Button variant="contained" onClick={handleSubmit} startIcon={<AddIcon />}>
                    إنشاء الهدف
                </Button>
            </DialogActions>
        </Dialog>
    );
};

// Check-In Dialog for updating progress
const CheckInDialog: React.FC<{
    open: boolean;
    goal: Goal | null;
    onClose: () => void;
    onSubmit: (goalId: string, data: { progress: number; currentValue: number; notes: string }) => void;
}> = ({ open, goal, onClose, onSubmit }) => {
    const theme = useTheme();
    const [progress, setProgress] = useState(0);
    const [currentValue, setCurrentValue] = useState(0);
    const [notes, setNotes] = useState('');

    React.useEffect(() => {
        if (goal) {
            setProgress(goal.progress || 0);
            setCurrentValue(goal.currentValue || 0);
            setNotes('');
        }
    }, [goal]);

    const handleSubmit = () => {
        if (goal) {
            onSubmit(goal.id, { progress, currentValue, notes });
            onClose();
        }
    };

    if (!goal) return null;

    const progressColor = progress >= 100 ? '#10B981' : progress >= 70 ? '#3B82F6' : progress >= 40 ? '#F59E0B' : '#EF4444';

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: alpha(progressColor, 0.05) }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TrendingUpIcon sx={{ color: progressColor }} />
                    <Typography variant="h6" fontWeight={700}>تحديث التقدم</Typography>
                </Box>
            </DialogTitle>
            <DialogContent sx={{ pt: 3 }}>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>{goal.title}</Typography>

                <Box sx={{ my: 3 }}>
                    <Typography variant="caption" color="text.secondary" gutterBottom>
                        نسبة الإنجاز: {progress}%
                    </Typography>
                    <LinearProgress
                        variant="determinate"
                        value={Math.min(progress, 100)}
                        sx={{
                            height: 12,
                            borderRadius: 6,
                            bgcolor: alpha(progressColor, 0.15),
                            '& .MuiLinearProgress-bar': { bgcolor: progressColor, borderRadius: 6 },
                        }}
                    />
                </Box>

                <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={6}>
                        <TextField
                            fullWidth
                            type="number"
                            label="القيمة الحالية"
                            value={currentValue}
                            onChange={(e) => {
                                const val = +e.target.value;
                                setCurrentValue(val);
                                if (goal.targetValue) {
                                    setProgress(Math.round((val / goal.targetValue) * 100));
                                }
                            }}
                        />
                    </Grid>
                    <Grid item xs={6}>
                        <TextField
                            fullWidth
                            type="number"
                            label="نسبة التقدم %"
                            value={progress}
                            onChange={(e) => setProgress(+e.target.value)}
                        />
                    </Grid>
                </Grid>

                <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="ملاحظات التحديث"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="ما الذي تم إنجازه؟ ما هي التحديات؟"
                />

                {/* Quick Actions */}
                <Box sx={{ mt: 3 }}>
                    <Typography variant="caption" fontWeight={600} color="text.secondary">تحديث سريع:</Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                        {[25, 50, 75, 100].map((val) => (
                            <Chip
                                key={val}
                                label={`${val}%`}
                                onClick={() => setProgress(val)}
                                sx={{
                                    bgcolor: progress === val ? alpha('#3B82F6', 0.2) : 'transparent',
                                    border: `1px solid ${alpha('#3B82F6', 0.3)}`,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    '&:hover': { bgcolor: alpha('#3B82F6', 0.1) },
                                }}
                            />
                        ))}
                    </Stack>
                </Box>
            </DialogContent>
            <DialogActions sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                <Button onClick={onClose}>إلغاء</Button>
                <Button variant="contained" onClick={handleSubmit} startIcon={<CheckIcon />}>
                    حفظ التحديث
                </Button>
            </DialogActions>
        </Dialog>
    );
};

// AI Goal Generator
const AIGoalGenerator: React.FC = () => {
    const theme = useTheme();
    const [prompt, setPrompt] = useState('');
    const [generating, setGenerating] = useState(false);
    const [generatedGoal, setGeneratedGoal] = useState<any>(null);

    const handleGenerate = async () => {
        if (!prompt) return;
        setGenerating(true);
        try {
            const result = await performanceService.generateGoal(prompt);
            setGeneratedGoal(result.goal);
        } catch (error) {
            console.error('Failed to generate goal:', error);
        }
        setGenerating(false);
    };

    return (
        <Paper sx={{ p: 4, borderRadius: 3, background: `linear-gradient(135deg, ${alpha('#8B5CF6', 0.05)} 0%, ${alpha('#3B82F6', 0.05)} 100%)` }}>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
                <AIIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
                <Typography variant="h5" fontWeight={700}>مساعد الأهداف الذكي</Typography>
                <Typography variant="body2" color="text.secondary">
                    اكتب وصفاً بسيطاً وسيتم تحويله إلى هدف SMART
                </Typography>
            </Box>

            <TextField
                fullWidth
                multiline
                rows={3}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="مثال: أريد تحسين أداء فريق المبيعات وزيادة الإيرادات"
                sx={{ mb: 2 }}
            />

            <Button
                fullWidth
                variant="contained"
                size="large"
                startIcon={<AIIcon />}
                onClick={handleGenerate}
                disabled={generating || !prompt}
                sx={{ borderRadius: 2 }}
            >
                {generating ? 'جاري التوليد...' : 'توليد هدف SMART'}
            </Button>

            {generatedGoal && (
                <Paper sx={{ mt: 3, p: 3, borderRadius: 2, bgcolor: alpha('#10B981', 0.05), border: `1px solid ${alpha('#10B981', 0.2)}` }}>
                    <Typography variant="subtitle1" fontWeight={700} gutterBottom color="success.main">
                        ✨ الهدف المقترح:
                    </Typography>
                    <Typography variant="h6" fontWeight={600} gutterBottom>
                        {generatedGoal.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                        {generatedGoal.description}
                    </Typography>
                    {generatedGoal.metrics && (
                        <Box>
                            <Typography variant="caption" fontWeight={700}>مقاييس مقترحة:</Typography>
                            <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
                                {generatedGoal.metrics.map((m: string, i: number) => (
                                    <Chip key={i} size="small" label={m} sx={{ bgcolor: alpha('#10B981', 0.1) }} />
                                ))}
                            </Stack>
                        </Box>
                    )}
                    <Button variant="outlined" color="success" sx={{ mt: 2 }} startIcon={<AddIcon />}>
                        إضافة هذا الهدف
                    </Button>
                </Paper>
            )}
        </Paper>
    );
};

// Main Page
const GoalsPage: React.FC = () => {
    const theme = useTheme();
    const queryClient = useQueryClient();
    const [tabValue, setTabValue] = useState(0);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [checkInGoal, setCheckInGoal] = useState<Goal | null>(null);
    const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

    // Queries
    const { data: myGoals, isLoading: loadingMy } = useQuery({
        queryKey: ['my-goals'],
        queryFn: () => goalsService.getMyGoals(),
    });

    const { data: teamGoals, isLoading: loadingTeam } = useQuery({
        queryKey: ['team-goals'],
        queryFn: () => goalsService.getTeamGoals(),
    });

    const { data: companyGoals, isLoading: loadingCompany } = useQuery({
        queryKey: ['company-goals'],
        queryFn: () => goalsService.getCompanyGoals(),
    });

    // Mutations
    const createMutation = useMutation({
        mutationFn: (data: Partial<Goal>) => goalsService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-goals'] });
            alert('تم إنشاء الهدف بنجاح');
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<Goal> }) => goalsService.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-goals'] });
            queryClient.invalidateQueries({ queryKey: ['team-goals'] });
            alert('تم تحديث الهدف بنجاح');
        },
    });

    const handleCheckIn = (goalId: string, data: { progress: number; currentValue: number; notes: string }) => {
        // Only pass fields that exist in Goal model (notes is not in Goal schema)
        updateMutation.mutate({ id: goalId, data: { progress: data.progress, currentValue: data.currentValue } });
    };

    const syncMutation = useMutation({
        mutationFn: (goalId: string) => goalsService.syncGoal(goalId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-goals'] });
            queryClient.invalidateQueries({ queryKey: ['team-goals'] });
            alert('تم مزامنة الهدف بنجاح من بيانات النظام');
        },
        onError: () => {
            alert('فشل في المزامنة - تأكد من ربط الهدف بمصدر بيانات');
        },
    });

    const handleSync = (goal: Goal) => {
        syncMutation.mutate(goal.id);
    };

    // Stats
    const totalGoals = myGoals?.length || 0;
    const completedGoals = myGoals?.filter(g => g.status === 'COMPLETED' || g.status === 'EXCEEDED').length || 0;
    const avgProgress = totalGoals > 0 ? Math.round(myGoals!.reduce((sum, g) => sum + g.progress, 0) / totalGoals) : 0;

    const goals = tabValue === 0 ? myGoals : tabValue === 1 ? teamGoals : companyGoals;
    const isLoading = tabValue === 0 ? loadingMy : tabValue === 1 ? loadingTeam : loadingCompany;

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Box>
                    <Typography variant="h4" fontWeight={800} gutterBottom sx={{
                        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, #8B5CF6 100%)`,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}>
                        🎯 الأهداف و OKRs
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        تتبع أهدافك الفردية وأهداف الفريق والشركة
                    </Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setCreateDialogOpen(true)}
                        sx={{ borderRadius: 2, px: 3 }}
                    >
                        إنشاء هدف
                    </Button>
                </Stack>
            </Box>

            {/* Stats */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <StatsCard title="أهدافي" value={totalGoals} color="#3B82F6" icon={<FlagIcon />} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatsCard title="مكتمل" value={completedGoals} color="#10B981" icon={<CheckIcon />} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatsCard title="متوسط التقدم" value={`${avgProgress}%`} color="#8B5CF6" icon={<TrendingUpIcon />} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatsCard title="أهداف الفريق" value={teamGoals?.length || 0} color="#F59E0B" icon={<GroupsIcon />} />
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
                    <Tab icon={<PersonIcon />} label="أهدافي" iconPosition="start" />
                    <Tab icon={<GroupsIcon />} label="أهداف الفريق" iconPosition="start" />
                    <Tab icon={<BusinessIcon />} label="أهداف الشركة" iconPosition="start" />
                    <Tab icon={<AIIcon />} label="مساعد AI" iconPosition="start" />
                </Tabs>
            </Paper>

            {/* Content */}
            {tabValue < 3 ? (
                <Grid container spacing={3}>
                    {isLoading ? (
                        [...Array(6)].map((_, i) => (
                            <Grid item xs={12} md={6} key={i}>
                                <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 3 }} />
                            </Grid>
                        ))
                    ) : goals?.length === 0 ? (
                        <Grid item xs={12}>
                            <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3 }}>
                                <FlagIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                                <Typography variant="h6" color="text.secondary">لا توجد أهداف</Typography>
                                <Button variant="outlined" startIcon={<AddIcon />} sx={{ mt: 2 }} onClick={() => setCreateDialogOpen(true)}>
                                    إنشاء هدف جديد
                                </Button>
                            </Paper>
                        </Grid>
                    ) : (
                        goals?.map((goal) => (
                            <Grid item xs={12} md={6} key={goal.id}>
                                <GoalCard
                                    goal={goal}
                                    onEdit={(g) => setEditingGoal(g)}
                                    onCheckIn={(g) => setCheckInGoal(g)}
                                    onSync={handleSync}
                                />
                            </Grid>
                        ))
                    )}
                </Grid>
            ) : (
                <AIGoalGenerator />
            )}

            {/* Create Dialog */}
            <CreateGoalDialog
                open={createDialogOpen}
                onClose={() => setCreateDialogOpen(false)}
                onSubmit={(data) => createMutation.mutate(data)}
            />

            {/* Check-In Dialog */}
            <CheckInDialog
                open={!!checkInGoal}
                goal={checkInGoal}
                onClose={() => setCheckInGoal(null)}
                onSubmit={handleCheckIn}
            />

            {/* Edit Goal Dialog */}
            {editingGoal && (
                <Dialog open={!!editingGoal} onClose={() => setEditingGoal(null)} maxWidth="sm" fullWidth>
                    <DialogTitle sx={{ borderBottom: 1, borderColor: 'divider' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <EditIcon color="primary" />
                            <Typography variant="h6" fontWeight={700}>تعديل الهدف</Typography>
                        </Box>
                    </DialogTitle>
                    <DialogContent sx={{ pt: 3 }}>
                        <Stack spacing={2}>
                            <TextField
                                fullWidth
                                label="عنوان الهدف"
                                defaultValue={editingGoal.title}
                                onChange={(e) => setEditingGoal({ ...editingGoal, title: e.target.value })}
                            />
                            <TextField
                                fullWidth
                                multiline
                                rows={2}
                                label="الوصف"
                                defaultValue={editingGoal.description}
                                onChange={(e) => setEditingGoal({ ...editingGoal, description: e.target.value })}
                            />
                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    <TextField
                                        fullWidth
                                        type="number"
                                        label="القيمة المستهدفة"
                                        defaultValue={editingGoal.targetValue}
                                        onChange={(e) => setEditingGoal({ ...editingGoal, targetValue: +e.target.value })}
                                    />
                                </Grid>
                                <Grid item xs={6}>
                                    <TextField
                                        fullWidth
                                        type="number"
                                        label="الوزن %"
                                        defaultValue={editingGoal.weight}
                                        onChange={(e) => setEditingGoal({ ...editingGoal, weight: +e.target.value })}
                                    />
                                </Grid>
                            </Grid>
                        </Stack>
                    </DialogContent>
                    <DialogActions sx={{ p: 2 }}>
                        <Button onClick={() => setEditingGoal(null)}>إلغاء</Button>
                        <Button
                            variant="contained"
                            onClick={() => {
                                updateMutation.mutate({
                                    id: editingGoal.id,
                                    data: {
                                        title: editingGoal.title,
                                        description: editingGoal.description,
                                        targetValue: editingGoal.targetValue,
                                        weight: editingGoal.weight
                                    }
                                });
                                setEditingGoal(null);
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

export default GoalsPage;
