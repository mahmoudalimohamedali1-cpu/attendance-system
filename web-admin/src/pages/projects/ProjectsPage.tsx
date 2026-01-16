import React, { useState } from 'react';
import {
    Box,
    Paper,
    Typography,
    Button,
    Chip,
    Avatar,
    LinearProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Grid,
    Card,
    CardContent,
    Tabs,
    Tab,
    Tooltip,
    Stack,
    Skeleton,
    InputAdornment,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    useTheme,
    alpha,
    Divider,
    AvatarGroup,
} from '@mui/material';
import {
    Add as AddIcon,
    Search as SearchIcon,
    FilterList as FilterIcon,
    Folder as FolderIcon,
    FolderOpen as FolderOpenIcon,
    Assignment as AssignmentIcon,
    People as PeopleIcon,
    Flag as FlagIcon,
    CalendarMonth as CalendarIcon,
    AttachMoney as MoneyIcon,
    Warning as WarningIcon,
    CheckCircle as CheckIcon,
    Pending as PendingIcon,
    Schedule as ScheduleIcon,
    TrendingUp as TrendingUpIcon,
    AccountTree as TreeIcon,
    Dashboard as DashboardIcon,
    MoreVert as MoreIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Visibility as ViewIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api.service';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

// Status configurations
const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
    INITIATION: { label: 'التأسيس', color: '#6B7280', bgColor: 'rgba(107, 114, 128, 0.1)', icon: <FolderIcon /> },
    PLANNING: { label: 'التخطيط', color: '#3B82F6', bgColor: 'rgba(59, 130, 246, 0.1)', icon: <AssignmentIcon /> },
    EXECUTION: { label: 'التنفيذ', color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.1)', icon: <TrendingUpIcon /> },
    MONITORING: { label: 'المراقبة', color: '#8B5CF6', bgColor: 'rgba(139, 92, 246, 0.1)', icon: <ScheduleIcon /> },
    CLOSING: { label: 'الإغلاق', color: '#EC4899', bgColor: 'rgba(236, 72, 153, 0.1)', icon: <PendingIcon /> },
    COMPLETED: { label: 'مكتمل', color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.1)', icon: <CheckIcon /> },
    ON_HOLD: { label: 'متوقف', color: '#F97316', bgColor: 'rgba(249, 115, 22, 0.1)', icon: <PendingIcon /> },
    CANCELLED: { label: 'ملغي', color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.1)', icon: <DeleteIcon /> },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
    CRITICAL: { label: 'حرج', color: '#DC2626', icon: '🔴' },
    HIGH: { label: 'عالي', color: '#F59E0B', icon: '🟠' },
    MEDIUM: { label: 'متوسط', color: '#3B82F6', icon: '🔵' },
    LOW: { label: 'منخفض', color: '#6B7280', icon: '⚪' },
};

const HEALTH_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
    ON_TRACK: { label: 'على المسار', color: '#10B981', icon: '✅' },
    AT_RISK: { label: 'في خطر', color: '#F59E0B', icon: '⚠️' },
    OFF_TRACK: { label: 'خارج المسار', color: '#EF4444', icon: '❌' },
    COMPLETED: { label: 'مكتمل', color: '#6B7280', icon: '✔️' },
};

interface Project {
    id: string;
    name: string;
    nameEn?: string;
    code: string;
    description?: string;
    status: string;
    priority: string;
    healthStatus?: string;
    progress: number;
    startDate?: string;
    plannedEndDate?: string;
    actualEndDate?: string;
    plannedBudget?: number;
    actualBudget?: number;
    budgetCurrency?: string;
    color?: string;
    icon?: string;
    tags?: string[];
    owner?: { id: string; name: string; email: string; avatar?: string };
    manager?: { id: string; name: string; email: string; avatar?: string };
    program?: { id: string; name: string };
    _count?: { members: number; tasks: number; phases: number; milestones: number; risks: number };
    createdAt: string;
}

// Project Card Component
const ProjectCard: React.FC<{ project: Project; onClick: () => void }> = ({ project, onClick }) => {
    const theme = useTheme();
    const statusConfig = STATUS_CONFIG[project.status] || STATUS_CONFIG.INITIATION;
    const priorityConfig = PRIORITY_CONFIG[project.priority] || PRIORITY_CONFIG.MEDIUM;
    const healthConfig = HEALTH_CONFIG[project.healthStatus || 'ON_TRACK'];

    const isOverdue = project.plannedEndDate && new Date(project.plannedEndDate) < new Date() && project.status !== 'COMPLETED';
    const budgetVariance = project.plannedBudget && project.actualBudget
        ? ((project.actualBudget - project.plannedBudget) / project.plannedBudget) * 100
        : 0;

    return (
        <Card
            onClick={onClick}
            sx={{
                height: '100%',
                cursor: 'pointer',
                borderRadius: 3,
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                background: `linear-gradient(165deg, ${alpha('#ffffff', 0.98)} 0%, ${alpha('#f8fafc', 0.95)} 100%)`,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 4,
                    background: `linear-gradient(90deg, ${statusConfig.color} 0%, ${alpha(statusConfig.color, 0.6)} 100%)`,
                },
                '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: `0 16px 40px ${alpha(statusConfig.color, 0.15)}, 0 4px 12px ${alpha('#000', 0.06)}`,
                },
            }}
        >
            <CardContent sx={{ p: 2.5 }}>
                {/* Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                            {project.code}
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 700, mt: 0.5, mb: 0.5 }}>
                            {project.name}
                        </Typography>
                        {project.program && (
                            <Chip
                                size="small"
                                icon={<TreeIcon sx={{ fontSize: 14 }} />}
                                label={project.program.name}
                                sx={{ height: 22, fontSize: '0.7rem', bgcolor: alpha('#6366f1', 0.1), color: '#6366f1' }}
                            />
                        )}
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                        <Chip
                            size="small"
                            label={statusConfig.label}
                            sx={{
                                bgcolor: statusConfig.bgColor,
                                color: statusConfig.color,
                                fontWeight: 700,
                                fontSize: '0.7rem',
                            }}
                        />
                    </Box>
                </Box>

                {/* Progress */}
                <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">التقدم</Typography>
                        <Typography variant="caption" fontWeight={700}>{project.progress}%</Typography>
                    </Box>
                    <LinearProgress
                        variant="determinate"
                        value={project.progress}
                        sx={{
                            height: 6,
                            borderRadius: 3,
                            bgcolor: alpha(statusConfig.color, 0.1),
                            '& .MuiLinearProgress-bar': {
                                borderRadius: 3,
                                background: `linear-gradient(90deg, ${statusConfig.color} 0%, ${alpha(statusConfig.color, 0.7)} 100%)`,
                            },
                        }}
                    />
                </Box>

                {/* Stats Row */}
                <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
                    <Chip
                        size="small"
                        icon={<FlagIcon sx={{ fontSize: 14 }} />}
                        label={`${priorityConfig.icon} ${priorityConfig.label}`}
                        sx={{
                            bgcolor: alpha(priorityConfig.color, 0.1),
                            color: priorityConfig.color,
                            fontSize: '0.65rem',
                        }}
                    />
                    <Chip
                        size="small"
                        label={`${healthConfig.icon} ${healthConfig.label}`}
                        sx={{
                            bgcolor: alpha(healthConfig.color, 0.1),
                            color: healthConfig.color,
                            fontSize: '0.65rem',
                        }}
                    />
                    {isOverdue && (
                        <Chip
                            size="small"
                            icon={<WarningIcon sx={{ fontSize: 14 }} />}
                            label="متأخر"
                            sx={{ bgcolor: alpha('#EF4444', 0.1), color: '#EF4444', fontSize: '0.65rem' }}
                        />
                    )}
                </Stack>

                {/* Dates */}
                {project.plannedEndDate && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, color: 'text.secondary' }}>
                        <CalendarIcon sx={{ fontSize: 16 }} />
                        <Typography variant="caption">
                            {format(new Date(project.plannedEndDate), 'dd MMM yyyy', { locale: ar })}
                        </Typography>
                    </Box>
                )}

                {/* Budget */}
                {project.plannedBudget && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                        <MoneyIcon sx={{ fontSize: 16, color: budgetVariance > 10 ? '#EF4444' : '#10B981' }} />
                        <Typography variant="caption" color="text.secondary">
                            {project.actualBudget?.toLocaleString() || 0} / {project.plannedBudget.toLocaleString()} {project.budgetCurrency || 'SAR'}
                        </Typography>
                        {budgetVariance !== 0 && (
                            <Chip
                                size="small"
                                label={`${budgetVariance > 0 ? '+' : ''}${budgetVariance.toFixed(0)}%`}
                                sx={{
                                    height: 18,
                                    fontSize: '0.6rem',
                                    bgcolor: budgetVariance > 10 ? alpha('#EF4444', 0.1) : alpha('#10B981', 0.1),
                                    color: budgetVariance > 10 ? '#EF4444' : '#10B981',
                                }}
                            />
                        )}
                    </Box>
                )}

                <Divider sx={{ my: 1.5 }} />

                {/* Footer */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Stack direction="row" spacing={1}>
                        <Tooltip title="المهام">
                            <Chip size="small" icon={<AssignmentIcon sx={{ fontSize: 14 }} />} label={project._count?.tasks || 0} sx={{ height: 24 }} />
                        </Tooltip>
                        <Tooltip title="الأعضاء">
                            <Chip size="small" icon={<PeopleIcon sx={{ fontSize: 14 }} />} label={project._count?.members || 0} sx={{ height: 24 }} />
                        </Tooltip>
                        <Tooltip title="المخاطر">
                            <Chip size="small" icon={<WarningIcon sx={{ fontSize: 14 }} />} label={project._count?.risks || 0} sx={{ height: 24 }} />
                        </Tooltip>
                    </Stack>
                    {project.manager && (
                        <Tooltip title={`المدير: ${project.manager.name}`}>
                            <Avatar src={project.manager.avatar} sx={{ width: 28, height: 28, fontSize: '0.8rem' }}>
                                {project.manager.name.charAt(0)}
                            </Avatar>
                        </Tooltip>
                    )}
                </Box>
            </CardContent>
        </Card>
    );
};

// Stats Card Component
const StatsCard: React.FC<{ title: string; value: number | string; icon: React.ReactNode; color: string; subtitle?: string }> = ({
    title, value, icon, color, subtitle
}) => {
    const theme = useTheme();
    return (
        <Paper
            sx={{
                p: 2.5,
                borderRadius: 3,
                background: `linear-gradient(135deg, ${alpha(color, 0.1)} 0%, ${alpha(color, 0.05)} 100%)`,
                border: `1px solid ${alpha(color, 0.2)}`,
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                    sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: alpha(color, 0.15),
                        color: color,
                    }}
                >
                    {icon}
                </Box>
                <Box>
                    <Typography variant="caption" color="text.secondary">{title}</Typography>
                    <Typography variant="h5" fontWeight={700}>{value}</Typography>
                    {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
                </Box>
            </Box>
        </Paper>
    );
};

export default function ProjectsPage() {
    const theme = useTheme();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('');
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [activeTab, setActiveTab] = useState(0);

    // Fetch projects
    const { data: projectsData, isLoading } = useQuery({
        queryKey: ['projects', searchTerm, statusFilter, priorityFilter],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (searchTerm) params.append('search', searchTerm);
            if (statusFilter) params.append('status', statusFilter);
            if (priorityFilter) params.append('priority', priorityFilter);
            const response = await api.get(`/projects?${params.toString()}`);
            return response.data;
        },
    });

    // Fetch portfolio dashboard
    const { data: dashboardData } = useQuery({
        queryKey: ['projects', 'portfolio-dashboard'],
        queryFn: async () => {
            const response = await api.get('/projects/portfolio/dashboard');
            return response.data;
        },
    });

    const projects = projectsData?.data || [];

    // Create project mutation
    const createProject = useMutation({
        mutationFn: async (data: Partial<Project>) => {
            const response = await api.post('/projects', data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            setCreateDialogOpen(false);
        },
    });

    const handleCreateProject = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        createProject.mutate({
            name: formData.get('name') as string,
            nameEn: formData.get('nameEn') as string,
            description: formData.get('description') as string,
            priority: formData.get('priority') as string,
            startDate: formData.get('startDate') as string,
            plannedEndDate: formData.get('plannedEndDate') as string,
            plannedBudget: parseFloat(formData.get('plannedBudget') as string) || undefined,
        });
    };

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4" fontWeight={700}>
                        إدارة المشاريع
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        إدارة ومتابعة جميع مشاريع المنظمة
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setCreateDialogOpen(true)}
                    sx={{
                        borderRadius: 2,
                        px: 3,
                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    }}
                >
                    مشروع جديد
                </Button>
            </Box>

            {/* Stats Overview */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <StatsCard
                        title="إجمالي المشاريع"
                        value={dashboardData?.summary?.totalProjects || 0}
                        icon={<FolderIcon />}
                        color="#6366f1"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatsCard
                        title="المشاريع النشطة"
                        value={dashboardData?.summary?.activeProjects || 0}
                        icon={<TrendingUpIcon />}
                        color="#10B981"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatsCard
                        title="المشاريع المكتملة"
                        value={dashboardData?.summary?.completedProjects || 0}
                        icon={<CheckIcon />}
                        color="#3B82F6"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatsCard
                        title="الميزانية الكلية"
                        value={`${((dashboardData?.budget?.planned || 0) / 1000000).toFixed(1)}M`}
                        icon={<MoneyIcon />}
                        color="#F59E0B"
                        subtitle="ريال سعودي"
                    />
                </Grid>
            </Grid>

            {/* Filters */}
            <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={4}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="البحث في المشاريع..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon />
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Grid>
                    <Grid item xs={6} md={3}>
                        <FormControl fullWidth size="small">
                            <InputLabel>الحالة</InputLabel>
                            <Select
                                value={statusFilter}
                                label="الحالة"
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <MenuItem value="">الكل</MenuItem>
                                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                                    <MenuItem key={key} value={key}>{config.label}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={6} md={3}>
                        <FormControl fullWidth size="small">
                            <InputLabel>الأولوية</InputLabel>
                            <Select
                                value={priorityFilter}
                                label="الأولوية"
                                onChange={(e) => setPriorityFilter(e.target.value)}
                            >
                                <MenuItem value="">الكل</MenuItem>
                                {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                                    <MenuItem key={key} value={key}>{config.icon} {config.label}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                </Grid>
            </Paper>

            {/* Tabs */}
            <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2 }}>
                <Tab icon={<FolderOpenIcon />} label="كل المشاريع" />
                <Tab icon={<DashboardIcon />} label="لوحة المحفظة" />
            </Tabs>

            {/* Projects Grid */}
            {activeTab === 0 && (
                <Grid container spacing={2}>
                    {isLoading ? (
                        [...Array(6)].map((_, i) => (
                            <Grid item xs={12} sm={6} md={4} key={i}>
                                <Skeleton variant="rectangular" height={280} sx={{ borderRadius: 3 }} />
                            </Grid>
                        ))
                    ) : projects.length === 0 ? (
                        <Grid item xs={12}>
                            <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
                                <FolderIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                                <Typography variant="h6" color="text.secondary">
                                    لا توجد مشاريع
                                </Typography>
                                <Typography variant="body2" color="text.disabled" sx={{ mb: 2 }}>
                                    ابدأ بإنشاء مشروع جديد
                                </Typography>
                                <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setCreateDialogOpen(true)}>
                                    إنشاء مشروع
                                </Button>
                            </Paper>
                        </Grid>
                    ) : (
                        projects.map((project: Project) => (
                            <Grid item xs={12} sm={6} md={4} key={project.id}>
                                <ProjectCard
                                    project={project}
                                    onClick={() => {
                                        setSelectedProject(project);
                                        setDialogOpen(true);
                                    }}
                                />
                            </Grid>
                        ))
                    )}
                </Grid>
            )}

            {/* Portfolio Dashboard Tab */}
            {activeTab === 1 && dashboardData && (
                <Grid container spacing={3}>
                    {/* Status Distribution */}
                    <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 3, borderRadius: 3 }}>
                            <Typography variant="h6" fontWeight={600} gutterBottom>
                                توزيع حالات المشاريع
                            </Typography>
                            <Stack spacing={2}>
                                {dashboardData.statusDistribution?.map((item: { status: string; _count: number }) => {
                                    const config = STATUS_CONFIG[item.status] || STATUS_CONFIG.INITIATION;
                                    const percentage = dashboardData.summary?.totalProjects
                                        ? Math.round((item._count / dashboardData.summary.totalProjects) * 100)
                                        : 0;
                                    return (
                                        <Box key={item.status}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                                <Typography variant="body2">{config.label}</Typography>
                                                <Typography variant="body2" fontWeight={600}>{item._count} ({percentage}%)</Typography>
                                            </Box>
                                            <LinearProgress
                                                variant="determinate"
                                                value={percentage}
                                                sx={{
                                                    height: 8,
                                                    borderRadius: 4,
                                                    bgcolor: alpha(config.color, 0.1),
                                                    '& .MuiLinearProgress-bar': {
                                                        bgcolor: config.color,
                                                        borderRadius: 4,
                                                    },
                                                }}
                                            />
                                        </Box>
                                    );
                                })}
                            </Stack>
                        </Paper>
                    </Grid>

                    {/* At Risk Projects */}
                    <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 3, borderRadius: 3 }}>
                            <Typography variant="h6" fontWeight={600} gutterBottom>
                                المشاريع في خطر
                            </Typography>
                            {dashboardData.atRiskProjects?.length > 0 ? (
                                <Stack spacing={2}>
                                    {dashboardData.atRiskProjects.map((project: Project) => (
                                        <Box
                                            key={project.id}
                                            sx={{
                                                p: 2,
                                                borderRadius: 2,
                                                bgcolor: alpha('#EF4444', 0.05),
                                                border: `1px solid ${alpha('#EF4444', 0.2)}`,
                                            }}
                                        >
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Box>
                                                    <Typography variant="subtitle2" fontWeight={600}>{project.name}</Typography>
                                                    <Typography variant="caption" color="text.secondary">{project.code}</Typography>
                                                </Box>
                                                <Chip
                                                    size="small"
                                                    icon={<WarningIcon sx={{ fontSize: 14 }} />}
                                                    label={HEALTH_CONFIG[project.healthStatus || 'AT_RISK']?.label}
                                                    sx={{
                                                        bgcolor: alpha('#EF4444', 0.1),
                                                        color: '#EF4444',
                                                    }}
                                                />
                                            </Box>
                                        </Box>
                                    ))}
                                </Stack>
                            ) : (
                                <Box sx={{ textAlign: 'center', py: 3 }}>
                                    <CheckIcon sx={{ fontSize: 48, color: '#10B981', mb: 1 }} />
                                    <Typography color="text.secondary">جميع المشاريع في حالة جيدة</Typography>
                                </Box>
                            )}
                        </Paper>
                    </Grid>

                    {/* Upcoming Milestones */}
                    <Grid item xs={12}>
                        <Paper sx={{ p: 3, borderRadius: 3 }}>
                            <Typography variant="h6" fontWeight={600} gutterBottom>
                                المعالم القادمة (30 يوم)
                            </Typography>
                            {dashboardData.upcomingMilestones?.length > 0 ? (
                                <TableContainer>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>المعلم</TableCell>
                                                <TableCell>المشروع</TableCell>
                                                <TableCell>تاريخ الاستحقاق</TableCell>
                                                <TableCell>الحالة</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {dashboardData.upcomingMilestones.map((milestone: any) => (
                                                <TableRow key={milestone.id}>
                                                    <TableCell>
                                                        <Typography variant="body2" fontWeight={600}>{milestone.name}</Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Chip size="small" label={milestone.project?.code} />
                                                    </TableCell>
                                                    <TableCell>
                                                        {format(new Date(milestone.dueDate), 'dd/MM/yyyy', { locale: ar })}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Chip
                                                            size="small"
                                                            label={milestone.status}
                                                            color={milestone.status === 'COMPLETED' ? 'success' : 'warning'}
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            ) : (
                                <Box sx={{ textAlign: 'center', py: 3 }}>
                                    <CalendarIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                                    <Typography color="text.secondary">لا توجد معالم قادمة</Typography>
                                </Box>
                            )}
                        </Paper>
                    </Grid>
                </Grid>
            )}

            {/* Create Project Dialog */}
            <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
                <form onSubmit={handleCreateProject}>
                    <DialogTitle>إنشاء مشروع جديد</DialogTitle>
                    <DialogContent>
                        <Grid container spacing={2} sx={{ mt: 1 }}>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    name="name"
                                    label="اسم المشروع"
                                    required
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    name="nameEn"
                                    label="اسم المشروع بالإنجليزية"
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    name="description"
                                    label="الوصف"
                                    multiline
                                    rows={3}
                                />
                            </Grid>
                            <Grid item xs={6}>
                                <FormControl fullWidth>
                                    <InputLabel>الأولوية</InputLabel>
                                    <Select name="priority" label="الأولوية" defaultValue="MEDIUM">
                                        {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                                            <MenuItem key={key} value={key}>{config.icon} {config.label}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={6}>
                                <TextField
                                    fullWidth
                                    name="plannedBudget"
                                    label="الميزانية المخططة"
                                    type="number"
                                />
                            </Grid>
                            <Grid item xs={6}>
                                <TextField
                                    fullWidth
                                    name="startDate"
                                    label="تاريخ البداية"
                                    type="date"
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                            <Grid item xs={6}>
                                <TextField
                                    fullWidth
                                    name="plannedEndDate"
                                    label="تاريخ الانتهاء المخطط"
                                    type="date"
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                        </Grid>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setCreateDialogOpen(false)}>إلغاء</Button>
                        <Button type="submit" variant="contained" disabled={createProject.isPending}>
                            {createProject.isPending ? 'جاري الإنشاء...' : 'إنشاء'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>

            {/* Project Details Dialog */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
                {selectedProject && (
                    <>
                        <DialogTitle>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Box>
                                    <Typography variant="h6">{selectedProject.name}</Typography>
                                    <Typography variant="caption" color="text.secondary">{selectedProject.code}</Typography>
                                </Box>
                            </Box>
                        </DialogTitle>
                        <DialogContent dividers>
                            <Grid container spacing={3}>
                                <Grid item xs={12} md={8}>
                                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>الوصف</Typography>
                                    <Typography>{selectedProject.description || 'لا يوجد وصف'}</Typography>
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <Stack spacing={2}>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">الحالة</Typography>
                                            <Chip
                                                label={STATUS_CONFIG[selectedProject.status]?.label}
                                                sx={{
                                                    bgcolor: STATUS_CONFIG[selectedProject.status]?.bgColor,
                                                    color: STATUS_CONFIG[selectedProject.status]?.color,
                                                    ml: 1,
                                                }}
                                            />
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">الأولوية</Typography>
                                            <Chip
                                                label={`${PRIORITY_CONFIG[selectedProject.priority]?.icon} ${PRIORITY_CONFIG[selectedProject.priority]?.label}`}
                                                sx={{ ml: 1 }}
                                            />
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">التقدم</Typography>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                                <LinearProgress
                                                    variant="determinate"
                                                    value={selectedProject.progress}
                                                    sx={{ flex: 1, height: 8, borderRadius: 4 }}
                                                />
                                                <Typography variant="body2" fontWeight={600}>{selectedProject.progress}%</Typography>
                                            </Box>
                                        </Box>
                                        {selectedProject.manager && (
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">مدير المشروع</Typography>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                                    <Avatar src={selectedProject.manager.avatar} sx={{ width: 24, height: 24 }}>
                                                        {selectedProject.manager.name.charAt(0)}
                                                    </Avatar>
                                                    <Typography variant="body2">{selectedProject.manager.name}</Typography>
                                                </Box>
                                            </Box>
                                        )}
                                    </Stack>
                                </Grid>
                            </Grid>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setDialogOpen(false)}>إغلاق</Button>
                            <Button variant="contained" startIcon={<ViewIcon />}>
                                عرض التفاصيل
                            </Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>
        </Box>
    );
}
