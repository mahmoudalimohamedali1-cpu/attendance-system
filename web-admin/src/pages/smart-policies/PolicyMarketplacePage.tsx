import { useState, useEffect } from 'react';
import {
    Box,
    Container,
    Typography,
    Grid,
    Card,
    CardContent,
    CardActions,
    TextField,
    Button,
    Chip,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Rating,
    Avatar,
    Badge,
    InputAdornment,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Tabs,
    Tab,
    Paper,
    Divider,
    LinearProgress,
    Skeleton,
    Alert,
    Snackbar,
    Tooltip,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Slider,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
} from '@mui/material';
import {
    Search as SearchIcon,
    FilterList as FilterIcon,
    Star as StarIcon,
    StarBorder as StarBorderIcon,
    Download as DownloadIcon,
    Visibility as ViewIcon,
    Favorite as FavoriteIcon,
    FavoriteBorder as FavoriteBorderIcon,
    Share as ShareIcon,
    VerifiedUser as VerifiedIcon,
    LocalOffer as TagIcon,
    ExpandMore as ExpandMoreIcon,
    CheckCircle as CheckIcon,
    Settings as SettingsIcon,
    Close as CloseIcon,
    ShoppingCart as CartIcon,
    TrendingUp as TrendingIcon,
    NewReleases as NewIcon,
    ThumbUp as ThumbUpIcon,
    Business as BusinessIcon,
    Category as CategoryIcon,
} from '@mui/icons-material';

// ============== Types ==============

interface MarketplacePolicy {
    id: string;
    name: string;
    nameEn?: string;
    description: string;
    category: string;
    tags: string[];
    industry?: string[];
    companySize?: string[];
    stats: {
        downloads: number;
        installs: number;
        views: number;
        favorites: number;
    };
    avgRating: number;
    reviewsCount: number;
    author: {
        name: string;
        type: string;
        isVerified: boolean;
    };
    pricing: {
        type: 'FREE' | 'PREMIUM';
        price?: number;
    };
    isOfficial: boolean;
    variables: TemplateVariable[];
    version: string;
    // بيانات إضافية
    legalReference?: string;
    laborLawArticle?: string;
    difficulty?: string;
    conditions?: any[];
    actions?: any[];
    trigger?: any;
}

interface TemplateVariable {
    name: string;
    label: string;
    type: string;
    defaultValue: any;
    required: boolean;
    options?: { value: any; label: string }[];
    validation?: { min?: number; max?: number };
}

interface Category {
    id: string;
    name: string;
    nameEn: string;
    icon: string;
    count: number;
}

// ============== Sample Data ==============

const CATEGORIES: Category[] = [
    { id: 'ATTENDANCE', name: 'الحضور والانصراف', nameEn: 'Attendance', icon: '⏰', count: 12 },
    { id: 'PERFORMANCE', name: 'الأداء', nameEn: 'Performance', icon: '📈', count: 8 },
    { id: 'COMPENSATION', name: 'التعويضات', nameEn: 'Compensation', icon: '💰', count: 15 },
    { id: 'BENEFITS', name: 'المزايا', nameEn: 'Benefits', icon: '🎁', count: 6 },
    { id: 'LEAVE', name: 'الإجازات', nameEn: 'Leave', icon: '🏖️', count: 9 },
    { id: 'DISCIPLINARY', name: 'التأديب', nameEn: 'Disciplinary', icon: '⚖️', count: 7 },
    { id: 'RECOGNITION', name: 'التقدير', nameEn: 'Recognition', icon: '🏆', count: 5 },
];

// API fetch function
const fetchPoliciesFromAPI = async (): Promise<MarketplacePolicy[]> => {
    try {
        const response = await fetch('/api/v1/smart-policies/templates/marketplace');
        if (!response.ok) {
            throw new Error('Failed to fetch policies');
        }
        const data = await response.json();
        
        // Map API response to MarketplacePolicy format
        return (data.data || data || []).map((item: any) => {
            const parsedRule = item.parsedRule || {};
            const metadata = parsedRule.metadata || {};
            const legalCompliance = item.legalCompliance || {};
            
            // استخراج المتغيرات من metadata.variables
            const variablesObj = metadata.variables || {};
            const variables = Object.entries(variablesObj).map(([name, value]) => ({
                name,
                label: getVariableLabel(name),
                type: typeof value === 'number' ? 'NUMBER' : 'TEXT',
                defaultValue: value,
                required: true,
            }));

            // استخراج الشروط والإجراءات
            const conditions = parsedRule.conditions || [];
            const actions = parsedRule.actions || [];

            return {
                id: item.id,
                name: item.name,
                nameEn: item.nameEn,
                description: item.description,
                category: item.category,
                tags: legalCompliance.tags || metadata.tags || [],
                industry: legalCompliance.industry || metadata.industry || ['ALL'],
                companySize: ['SMALL', 'MEDIUM', 'LARGE'],
                stats: {
                    downloads: item.usageCount || 0,
                    installs: Math.floor((item.usageCount || 0) * 0.7),
                    views: (item.usageCount || 0) * 3,
                    favorites: Math.floor((item.usageCount || 0) * 0.25),
                },
                avgRating: parseFloat(item.rating) || 4.5,
                reviewsCount: item.ratingCount || 0,
                author: {
                    name: 'فريق السياسات الذكية',
                    type: item.isSystemTemplate ? 'OFFICIAL' : 'COMMUNITY',
                    isVerified: item.isSystemTemplate || false,
                },
                pricing: { type: 'FREE' as const },
                isOfficial: item.isSystemTemplate || false,
                variables,
                version: '1.0.0',
                // بيانات إضافية للعرض
                legalReference: legalCompliance.reference || metadata.legalReference,
                laborLawArticle: legalCompliance.laborLawArticle || metadata.laborLawArticle,
                difficulty: legalCompliance.difficulty || 'MEDIUM',
                conditions,
                actions,
                trigger: parsedRule.trigger,
            };
        });
    } catch (error) {
        console.error('Error fetching policies:', error);
        return [];
    }
};

// دالة مساعدة لترجمة أسماء المتغيرات
const getVariableLabel = (name: string): string => {
    const labels: Record<string, string> = {
        deductionPerMinute: 'الخصم لكل دقيقة (ريال)',
        deductionPercentage: 'نسبة الخصم (%)',
        bonusAmount: 'قيمة المكافأة (ريال)',
        dailyBonus: 'المكافأة اليومية (ريال)',
        monthlyBonus: 'المكافأة الشهرية (ريال)',
        gracePeriodMinutes: 'فترة السماح (دقيقة)',
        maxAllowedDays: 'الحد الأقصى للأيام',
        overtimeMultiplier: 'معامل العمل الإضافي',
        phoneAllowance: 'بدل الاتصالات (ريال)',
        housingPercentage: 'نسبة بدل السكن (%)',
        transportAllowance: 'بدل المواصلات (ريال)',
        hajjDays: 'أيام إجازة الحج',
        annualLeaveDays: 'أيام الإجازة السنوية',
        sickLeaveFullPayDays: 'أيام المرضي بأجر كامل',
    };
    return labels[name] || name;
};

// دالة مساعدة لترجمة أسماء الحقول
const getFieldLabel = (field: string): string => {
    const parts = field.split('.');
    const lastPart = parts[parts.length - 1];
    const labels: Record<string, string> = {
        lateMinutes: 'دقائق التأخير',
        lateDays: 'أيام التأخير',
        absentDays: 'أيام الغياب',
        presentDays: 'أيام الحضور',
        overtimeHours: 'ساعات العمل الإضافي',
        attendancePercentage: 'نسبة الحضور',
        basicSalary: 'الراتب الأساسي',
        yearsOfService: 'سنوات الخدمة',
        tenureMonths: 'أشهر الخدمة',
        absenceType: 'نوع الغياب',
        employeeStatus: 'حالة الموظف',
    };
    return labels[lastPart] || lastPart;
};

// دالة مساعدة لترجمة العوامل
const getOperatorLabel = (operator: string): string => {
    const labels: Record<string, string> = {
        EQUALS: '=',
        NOT_EQUALS: '≠',
        GREATER_THAN: '>',
        GREATER_THAN_OR_EQUALS: '≥',
        LESS_THAN: '<',
        LESS_THAN_OR_EQUALS: '≤',
        BETWEEN: 'بين',
        IN: 'ضمن',
        IS_NULL: 'فارغ',
        IS_NOT_NULL: 'غير فارغ',
    };
    return labels[operator] || operator;
};

// دالة مساعدة لترجمة الإجراءات
const getActionLabel = (type: string): string => {
    const labels: Record<string, string> = {
        ADD_TO_PAYROLL: '➕ إضافة للراتب',
        DEDUCT_FROM_PAYROLL: '➖ خصم من الراتب',
        ADD_PERCENTAGE: '➕ إضافة نسبة',
        DEDUCT_PERCENTAGE: '➖ خصم نسبة',
        SET_VALUE: '📝 تعيين قيمة',
        SEND_NOTIFICATION: '🔔 إرسال إشعار',
        CREATE_TASK: '📋 إنشاء مهمة',
        UPDATE_RECORD: '✏️ تحديث سجل',
    };
    return labels[type] || type;
};

// ============== Component ==============

export default function PolicyMarketplacePage() {
    const [loading, setLoading] = useState(true);
    const [policies, setPolicies] = useState<MarketplacePolicy[]>([]);
    const [filteredPolicies, setFilteredPolicies] = useState<MarketplacePolicy[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState(0);
    const [showFilters, setShowFilters] = useState(false);
    const [favorites, setFavorites] = useState<Set<string>>(new Set());
    
    // Dialog states
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [selectedPolicy, setSelectedPolicy] = useState<MarketplacePolicy | null>(null);
    const [installOpen, setInstallOpen] = useState(false);
    const [customizations, setCustomizations] = useState<Record<string, any>>({});
    const [installing, setInstalling] = useState(false);
    
    // Snackbar
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as any });

    useEffect(() => {
        // Fetch from API
        const loadPolicies = async () => {
            setLoading(true);
            try {
                const fetchedPolicies = await fetchPoliciesFromAPI();
                setPolicies(fetchedPolicies);
                setFilteredPolicies(fetchedPolicies);
            } catch (error) {
                console.error('Failed to load policies:', error);
            } finally {
                setLoading(false);
            }
        };
        loadPolicies();
    }, []);

    useEffect(() => {
        filterPolicies();
    }, [searchQuery, selectedCategory, activeTab, policies]);

    const filterPolicies = () => {
        let filtered = [...policies];

        // Search
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(p =>
                p.name.toLowerCase().includes(query) ||
                p.description.toLowerCase().includes(query) ||
                p.tags.some(t => t.toLowerCase().includes(query))
            );
        }

        // Category
        if (selectedCategory) {
            filtered = filtered.filter(p => p.category === selectedCategory);
        }

        // Tab sorting
        switch (activeTab) {
            case 0: // الأكثر شعبية
                filtered.sort((a, b) => b.stats.downloads - a.stats.downloads);
                break;
            case 1: // الأعلى تقييماً
                filtered.sort((a, b) => b.avgRating - a.avgRating);
                break;
            case 2: // الأحدث
                filtered.sort((a, b) => b.version.localeCompare(a.version));
                break;
        }

        setFilteredPolicies(filtered);
    };

    const handleViewDetails = (policy: MarketplacePolicy) => {
        setSelectedPolicy(policy);
        setDetailsOpen(true);
    };

    const handleInstall = (policy: MarketplacePolicy) => {
        setSelectedPolicy(policy);
        // Initialize customizations with default values
        const defaults: Record<string, any> = {};
        policy.variables.forEach(v => {
            defaults[v.name] = v.defaultValue;
        });
        setCustomizations(defaults);
        setInstallOpen(true);
    };

    const handleConfirmInstall = async () => {
        if (!selectedPolicy) return;
        setInstalling(true);

        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            setSnackbar({
                open: true,
                message: `تم تثبيت "${selectedPolicy.name}" بنجاح! ✅`,
                severity: 'success',
            });
            setInstallOpen(false);
        } catch (error) {
            setSnackbar({
                open: true,
                message: 'فشل في تثبيت السياسة',
                severity: 'error',
            });
        } finally {
            setInstalling(false);
        }
    };

    const toggleFavorite = (policyId: string) => {
        const newFavorites = new Set(favorites);
        if (newFavorites.has(policyId)) {
            newFavorites.delete(policyId);
        } else {
            newFavorites.add(policyId);
        }
        setFavorites(newFavorites);
    };

    const formatNumber = (num: number) => {
        if (num >= 1000) {
            return `${(num / 1000).toFixed(1)}k`;
        }
        return num.toString();
    };

    const getCategoryIcon = (categoryId: string) => {
        const category = CATEGORIES.find(c => c.id === categoryId);
        return category?.icon || '📋';
    };

    const getCategoryName = (categoryId: string) => {
        const category = CATEGORIES.find(c => c.id === categoryId);
        return category?.name || categoryId;
    };

    return (
        <Container maxWidth="xl" sx={{ py: 3 }}>
            {/* Header */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" fontWeight="bold" gutterBottom>
                    🛒 سوق السياسات
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    اكتشف واستورد أفضل السياسات الجاهزة لشركتك
                </Typography>
            </Box>

            {/* Search & Filters */}
            <Paper sx={{ p: 3, mb: 4, borderRadius: 3 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            placeholder="ابحث عن سياسة..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon />
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <FormControl fullWidth>
                            <InputLabel>الفئة</InputLabel>
                            <Select
                                value={selectedCategory || ''}
                                onChange={(e) => setSelectedCategory(e.target.value || null)}
                                label="الفئة"
                            >
                                <MenuItem value="">الكل</MenuItem>
                                {CATEGORIES.map((cat) => (
                                    <MenuItem key={cat.id} value={cat.id}>
                                        {cat.icon} {cat.name} ({cat.count})
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={2}>
                        <Button
                            fullWidth
                            variant="outlined"
                            startIcon={<FilterIcon />}
                            onClick={() => setShowFilters(!showFilters)}
                        >
                            فلاتر متقدمة
                        </Button>
                    </Grid>
                </Grid>

                {/* Tabs */}
                <Box sx={{ mt: 3, borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
                        <Tab icon={<TrendingIcon />} label="الأكثر شعبية" />
                        <Tab icon={<StarIcon />} label="الأعلى تقييماً" />
                        <Tab icon={<NewIcon />} label="الأحدث" />
                    </Tabs>
                </Box>
            </Paper>

            {/* Categories */}
            <Box sx={{ mb: 4, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                    label="الكل"
                    onClick={() => setSelectedCategory(null)}
                    color={selectedCategory === null ? 'primary' : 'default'}
                    variant={selectedCategory === null ? 'filled' : 'outlined'}
                />
                {CATEGORIES.map((cat) => (
                    <Chip
                        key={cat.id}
                        label={`${cat.icon} ${cat.name}`}
                        onClick={() => setSelectedCategory(cat.id)}
                        color={selectedCategory === cat.id ? 'primary' : 'default'}
                        variant={selectedCategory === cat.id ? 'filled' : 'outlined'}
                    />
                ))}
            </Box>

            {/* Policies Grid */}
            {loading ? (
                <Grid container spacing={3}>
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <Grid item xs={12} sm={6} lg={4} key={i}>
                            <Skeleton variant="rectangular" height={320} sx={{ borderRadius: 3 }} />
                        </Grid>
                    ))}
                </Grid>
            ) : filteredPolicies.length === 0 ? (
                <Paper sx={{ p: 5, textAlign: 'center', borderRadius: 3 }}>
                    <Typography variant="h6" color="text.secondary">
                        لا توجد سياسات مطابقة للبحث
                    </Typography>
                    <Button
                        variant="outlined"
                        sx={{ mt: 2 }}
                        onClick={() => {
                            setSearchQuery('');
                            setSelectedCategory(null);
                        }}
                    >
                        مسح الفلاتر
                    </Button>
                </Paper>
            ) : (
                <Grid container spacing={3}>
                    {filteredPolicies.map((policy) => (
                        <Grid item xs={12} sm={6} lg={4} key={policy.id}>
                            <Card
                                sx={{
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    borderRadius: 3,
                                    transition: 'transform 0.2s, box-shadow 0.2s',
                                    '&:hover': {
                                        transform: 'translateY(-4px)',
                                        boxShadow: 6,
                                    },
                                    position: 'relative',
                                }}
                            >
                                {/* Official Badge */}
                                {policy.isOfficial && (
                                    <Chip
                                        label="رسمي"
                                        size="small"
                                        color="primary"
                                        icon={<VerifiedIcon />}
                                        sx={{
                                            position: 'absolute',
                                            top: 12,
                                            right: 12,
                                            zIndex: 1,
                                        }}
                                    />
                                )}

                                <CardContent sx={{ flexGrow: 1 }}>
                                    {/* Category & Favorite */}
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                        <Chip
                                            label={`${getCategoryIcon(policy.category)} ${getCategoryName(policy.category)}`}
                                            size="small"
                                            variant="outlined"
                                        />
                                        <IconButton
                                            size="small"
                                            onClick={() => toggleFavorite(policy.id)}
                                        >
                                            {favorites.has(policy.id) ? (
                                                <FavoriteIcon color="error" />
                                            ) : (
                                                <FavoriteBorderIcon />
                                            )}
                                        </IconButton>
                                    </Box>

                                    {/* Title & Description */}
                                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                                        {policy.name}
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                        sx={{
                                            mb: 2,
                                            display: '-webkit-box',
                                            WebkitLineClamp: 3,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden',
                                        }}
                                    >
                                        {policy.description}
                                    </Typography>

                                    {/* Tags */}
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                                        {policy.tags.slice(0, 3).map((tag, i) => (
                                            <Chip key={i} label={tag} size="small" variant="outlined" />
                                        ))}
                                        {policy.tags.length > 3 && (
                                            <Chip label={`+${policy.tags.length - 3}`} size="small" />
                                        )}
                                    </Box>

                                    {/* Rating */}
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                        <Rating value={policy.avgRating} precision={0.1} readOnly size="small" />
                                        <Typography variant="body2" color="text.secondary">
                                            {policy.avgRating} ({policy.reviewsCount})
                                        </Typography>
                                    </Box>

                                    {/* Stats */}
                                    <Box sx={{ display: 'flex', gap: 2 }}>
                                        <Tooltip title="التحميلات">
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <DownloadIcon fontSize="small" color="action" />
                                                <Typography variant="body2" color="text.secondary">
                                                    {formatNumber(policy.stats.downloads)}
                                                </Typography>
                                            </Box>
                                        </Tooltip>
                                        <Tooltip title="المشاهدات">
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <ViewIcon fontSize="small" color="action" />
                                                <Typography variant="body2" color="text.secondary">
                                                    {formatNumber(policy.stats.views)}
                                                </Typography>
                                            </Box>
                                        </Tooltip>
                                        <Tooltip title="المفضلة">
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <FavoriteIcon fontSize="small" color="action" />
                                                <Typography variant="body2" color="text.secondary">
                                                    {formatNumber(policy.stats.favorites)}
                                                </Typography>
                                            </Box>
                                        </Tooltip>
                                    </Box>

                                    {/* Author */}
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                                        <Avatar sx={{ width: 24, height: 24, fontSize: 12 }}>
                                            {policy.author.name[0]}
                                        </Avatar>
                                        <Typography variant="body2" color="text.secondary">
                                            {policy.author.name}
                                        </Typography>
                                        {policy.author.isVerified && (
                                            <VerifiedIcon fontSize="small" color="primary" />
                                        )}
                                    </Box>
                                </CardContent>

                                <CardActions sx={{ p: 2, pt: 0 }}>
                                    <Button
                                        variant="outlined"
                                        fullWidth
                                        onClick={() => handleViewDetails(policy)}
                                    >
                                        عرض التفاصيل
                                    </Button>
                                    <Button
                                        variant="contained"
                                        fullWidth
                                        startIcon={<DownloadIcon />}
                                        onClick={() => handleInstall(policy)}
                                        sx={{
                                            background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                                        }}
                                    >
                                        تثبيت
                                    </Button>
                                </CardActions>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}

            {/* Details Dialog */}
            <Dialog
                open={detailsOpen}
                onClose={() => setDetailsOpen(false)}
                maxWidth="md"
                fullWidth
            >
                {selectedPolicy && (
                    <>
                        <DialogTitle>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Box>
                                    <Typography variant="h5" fontWeight="bold">
                                        {selectedPolicy.name}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {selectedPolicy.nameEn}
                                    </Typography>
                                </Box>
                                <IconButton onClick={() => setDetailsOpen(false)}>
                                    <CloseIcon />
                                </IconButton>
                            </Box>
                        </DialogTitle>
                        <DialogContent dividers>
                            <Grid container spacing={3}>
                                {/* Main Info */}
                                <Grid item xs={12} md={8}>
                                    <Typography variant="body1" paragraph>
                                        {selectedPolicy.description}
                                    </Typography>

                                    <Divider sx={{ my: 2 }} />

                                    <Typography variant="h6" gutterBottom>
                                        ⚙️ المتغيرات القابلة للتخصيص
                                    </Typography>
                                    <List>
                                        {selectedPolicy.variables.map((v) => (
                                            <ListItem key={v.name}>
                                                <ListItemIcon>
                                                    <SettingsIcon />
                                                </ListItemIcon>
                                                <ListItemText
                                                    primary={v.label}
                                                    secondary={`الافتراضي: ${v.defaultValue} | النوع: ${v.type}`}
                                                />
                                            </ListItem>
                                        ))}
                                    </List>

                                    <Divider sx={{ my: 2 }} />

                                    <Typography variant="h6" gutterBottom>
                                        🏷️ التصنيفات
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                        {selectedPolicy.tags.map((tag, i) => (
                                            <Chip key={i} label={tag} />
                                        ))}
                                    </Box>

                                    {/* الشروط */}
                                    {selectedPolicy.conditions && selectedPolicy.conditions.length > 0 && (
                                        <>
                                            <Divider sx={{ my: 2 }} />
                                            <Typography variant="h6" gutterBottom>
                                                📋 شروط التطبيق
                                            </Typography>
                                            <List dense>
                                                {selectedPolicy.conditions.map((cond: any, i: number) => (
                                                    <ListItem key={i}>
                                                        <ListItemIcon>
                                                            <CheckIcon color="success" />
                                                        </ListItemIcon>
                                                        <ListItemText
                                                            primary={cond.description}
                                                            secondary={`${getFieldLabel(cond.field)} ${getOperatorLabel(cond.operator)} ${cond.value}`}
                                                        />
                                                    </ListItem>
                                                ))}
                                            </List>
                                        </>
                                    )}

                                    {/* الإجراءات */}
                                    {selectedPolicy.actions && selectedPolicy.actions.length > 0 && (
                                        <>
                                            <Divider sx={{ my: 2 }} />
                                            <Typography variant="h6" gutterBottom>
                                                ⚡ الإجراءات عند التطبيق
                                            </Typography>
                                            <List dense>
                                                {selectedPolicy.actions.map((action: any, i: number) => (
                                                    <ListItem key={i}>
                                                        <ListItemIcon>
                                                            {action.type?.includes('DEDUCT') ? '🔻' : '🔺'}
                                                        </ListItemIcon>
                                                        <ListItemText
                                                            primary={action.description}
                                                            secondary={`${getActionLabel(action.type)}: ${action.value} ${action.unit || ''}`}
                                                        />
                                                    </ListItem>
                                                ))}
                                            </List>
                                        </>
                                    )}

                                    {/* المرجع القانوني */}
                                    {selectedPolicy.legalReference && (
                                        <>
                                            <Divider sx={{ my: 2 }} />
                                            <Typography variant="h6" gutterBottom>
                                                ⚖️ المرجع القانوني
                                            </Typography>
                                            <Alert severity="info" icon={false}>
                                                <Typography variant="body2">
                                                    📜 {selectedPolicy.legalReference}
                                                </Typography>
                                                {selectedPolicy.laborLawArticle && (
                                                    <Chip
                                                        label={`المادة ${selectedPolicy.laborLawArticle}`}
                                                        size="small"
                                                        color="primary"
                                                        sx={{ mt: 1 }}
                                                    />
                                                )}
                                            </Alert>
                                        </>
                                    )}
                                </Grid>

                                {/* Side Info */}
                                <Grid item xs={12} md={4}>
                                    <Paper sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                                        <Typography variant="subtitle2" gutterBottom>
                                            التقييم
                                        </Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                            <Typography variant="h4" fontWeight="bold">
                                                {selectedPolicy.avgRating}
                                            </Typography>
                                            <Box>
                                                <Rating value={selectedPolicy.avgRating} precision={0.1} readOnly />
                                                <Typography variant="body2" color="text.secondary">
                                                    {selectedPolicy.reviewsCount} تقييم
                                                </Typography>
                                            </Box>
                                        </Box>

                                        <Divider sx={{ my: 2 }} />

                                        <Typography variant="subtitle2" gutterBottom>
                                            الإحصائيات
                                        </Typography>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <Typography variant="body2">التحميلات:</Typography>
                                                <Typography variant="body2" fontWeight="bold">
                                                    {formatNumber(selectedPolicy.stats.downloads)}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <Typography variant="body2">التثبيتات:</Typography>
                                                <Typography variant="body2" fontWeight="bold">
                                                    {formatNumber(selectedPolicy.stats.installs)}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <Typography variant="body2">المفضلة:</Typography>
                                                <Typography variant="body2" fontWeight="bold">
                                                    {formatNumber(selectedPolicy.stats.favorites)}
                                                </Typography>
                                            </Box>
                                        </Box>

                                        <Divider sx={{ my: 2 }} />

                                        <Typography variant="subtitle2" gutterBottom>
                                            المطور
                                        </Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Avatar>{selectedPolicy.author.name[0]}</Avatar>
                                            <Box>
                                                <Typography variant="body2" fontWeight="bold">
                                                    {selectedPolicy.author.name}
                                                </Typography>
                                                {selectedPolicy.author.isVerified && (
                                                    <Chip
                                                        label="موثق"
                                                        size="small"
                                                        color="primary"
                                                        icon={<VerifiedIcon />}
                                                    />
                                                )}
                                            </Box>
                                        </Box>

                                        <Divider sx={{ my: 2 }} />

                                        <Typography variant="subtitle2" gutterBottom>
                                            الإصدار
                                        </Typography>
                                        <Typography variant="body1">
                                            v{selectedPolicy.version}
                                        </Typography>
                                    </Paper>
                                </Grid>
                            </Grid>
                        </DialogContent>
                        <DialogActions sx={{ p: 2 }}>
                            <Button onClick={() => setDetailsOpen(false)}>
                                إغلاق
                            </Button>
                            <Button
                                variant="contained"
                                startIcon={<DownloadIcon />}
                                onClick={() => {
                                    setDetailsOpen(false);
                                    handleInstall(selectedPolicy);
                                }}
                            >
                                تثبيت السياسة
                            </Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>

            {/* Install Dialog */}
            <Dialog
                open={installOpen}
                onClose={() => !installing && setInstallOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                {selectedPolicy && (
                    <>
                        <DialogTitle>
                            <Typography variant="h6">
                                ⚙️ تخصيص وتثبيت: {selectedPolicy.name}
                            </Typography>
                        </DialogTitle>
                        <DialogContent dividers>
                            <Alert severity="info" sx={{ mb: 3 }}>
                                خصص قيم المتغيرات حسب احتياجات شركتك، ثم أكد التثبيت.
                            </Alert>

                            {selectedPolicy.variables.map((variable) => (
                                <Box key={variable.name} sx={{ mb: 3 }}>
                                    <Typography variant="subtitle2" gutterBottom>
                                        {variable.label}
                                        {variable.required && <span style={{ color: 'red' }}> *</span>}
                                    </Typography>
                                    {variable.type === 'NUMBER' ? (
                                        <TextField
                                            fullWidth
                                            type="number"
                                            value={customizations[variable.name] || ''}
                                            onChange={(e) => setCustomizations({
                                                ...customizations,
                                                [variable.name]: Number(e.target.value),
                                            })}
                                            inputProps={{
                                                min: variable.validation?.min,
                                                max: variable.validation?.max,
                                            }}
                                            helperText={
                                                variable.validation
                                                    ? `النطاق: ${variable.validation.min || 0} - ${variable.validation.max || '∞'}`
                                                    : undefined
                                            }
                                        />
                                    ) : variable.options ? (
                                        <FormControl fullWidth>
                                            <Select
                                                value={customizations[variable.name] || ''}
                                                onChange={(e) => setCustomizations({
                                                    ...customizations,
                                                    [variable.name]: e.target.value,
                                                })}
                                            >
                                                {variable.options.map((opt) => (
                                                    <MenuItem key={opt.value} value={opt.value}>
                                                        {opt.label}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    ) : (
                                        <TextField
                                            fullWidth
                                            value={customizations[variable.name] || ''}
                                            onChange={(e) => setCustomizations({
                                                ...customizations,
                                                [variable.name]: e.target.value,
                                            })}
                                        />
                                    )}
                                </Box>
                            ))}
                        </DialogContent>
                        <DialogActions sx={{ p: 2 }}>
                            <Button onClick={() => setInstallOpen(false)} disabled={installing}>
                                إلغاء
                            </Button>
                            <Button
                                variant="contained"
                                startIcon={installing ? null : <CheckIcon />}
                                onClick={handleConfirmInstall}
                                disabled={installing}
                            >
                                {installing ? 'جاري التثبيت...' : 'تأكيد التثبيت'}
                            </Button>
                        </DialogActions>
                        {installing && <LinearProgress />}
                    </>
                )}
            </Dialog>

            {/* Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                    severity={snackbar.severity}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Container>
    );
}
