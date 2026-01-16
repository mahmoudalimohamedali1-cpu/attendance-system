import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  Grid,
  CircularProgress,
  Chip,
  Alert,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Search,
  FilterList,
  Store,
  CheckCircle,
  Extension,
  Refresh,
} from '@mui/icons-material';
import {
  getAvailableIntegrations,
  toggleIntegration,
  type MarketplaceIntegration,
  type IntegrationCategory,
} from '@/services/integrations.service';
import { IntegrationCard } from '@/components/integrations';

/**
 * Category labels (Arabic)
 */
const categoryLabels: Record<IntegrationCategory | 'ALL', string> = {
  ALL: 'الكل',
  ACCOUNTING: 'محاسبة',
  ERP: 'تخطيط موارد',
  COMMUNICATION: 'اتصالات',
  HR: 'موارد بشرية',
  PAYROLL: 'رواتب',
  BANKING: 'بنوك',
};

/**
 * Category icons
 */
const categoryIcons: Record<IntegrationCategory, string> = {
  ACCOUNTING: '📊',
  ERP: '🏢',
  COMMUNICATION: '💬',
  HR: '👥',
  PAYROLL: '💰',
  BANKING: '🏦',
};

/**
 * Integration Marketplace Page
 * Displays catalog of available integrations with filtering and search
 */
export const IntegrationsMarketplacePage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // State for filtering and search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<IntegrationCategory | 'ALL'>('ALL');
  const [showInstalledOnly, setShowInstalledOnly] = useState(false);
  const [tabValue, setTabValue] = useState(0);

  // Fetch integrations from API
  const {
    data: integrations,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['integrations'],
    queryFn: getAvailableIntegrations,
  });

  // Toggle integration mutation
  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      toggleIntegration(id, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    },
  });

  // Filter and search integrations
  const filteredIntegrations = useMemo(() => {
    if (!integrations) return [];

    return integrations.filter((integration) => {
      // Filter by category
      if (selectedCategory !== 'ALL' && integration.category !== selectedCategory) {
        return false;
      }

      // Filter by installed status based on tab
      if (tabValue === 1 && !integration.installed) {
        return false;
      }

      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = integration.name.toLowerCase().includes(query);
        const matchesNameEn = integration.nameEn?.toLowerCase().includes(query);
        const matchesDescription = integration.description.toLowerCase().includes(query);
        const matchesDeveloper = integration.developerName?.toLowerCase().includes(query);

        if (!matchesName && !matchesNameEn && !matchesDescription && !matchesDeveloper) {
          return false;
        }
      }

      return true;
    });
  }, [integrations, selectedCategory, searchQuery, tabValue]);

  // Get category counts
  const categoryCounts = useMemo(() => {
    if (!integrations) return {};

    const counts: Record<string, number> = { ALL: integrations.length };
    integrations.forEach((integration) => {
      counts[integration.category] = (counts[integration.category] || 0) + 1;
    });
    return counts;
  }, [integrations]);

  // Get installed count
  const installedCount = useMemo(() => {
    if (!integrations) return 0;
    return integrations.filter((i) => i.installed).length;
  }, [integrations]);

  // Handle integration card click
  const handleIntegrationClick = (integration: MarketplaceIntegration) => {
    // Navigate to detail page with the integration slug
    navigate(`/integrations/${integration.slug}`);
  };

  // Handle toggle
  const handleToggle = (integration: MarketplaceIntegration) => {
    if (integration.installed) {
      toggleMutation.mutate({
        id: integration.slug,
        enabled: !integration.enabled,
      });
    }
  };

  // Handle configure click
  const handleConfigure = (integration: MarketplaceIntegration) => {
    navigate(`/integrations/${integration.slug}`);
  };

  // Categories for filter chips
  const categories: (IntegrationCategory | 'ALL')[] = [
    'ALL',
    'ACCOUNTING',
    'ERP',
    'COMMUNICATION',
    'HR',
    'PAYROLL',
    'BANKING',
  ];

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Store sx={{ fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h4" fontWeight="bold">
            سوق التكاملات
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          اكتشف وقم بتفعيل التكاملات مع أنظمة الأعمال الشائعة
        </Typography>
      </Box>

      {/* Tabs for All / Installed */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          sx={{ mb: -0.1 }}
        >
          <Tab
            icon={<Extension sx={{ fontSize: 20 }} />}
            iconPosition="start"
            label={`جميع التكاملات (${integrations?.length || 0})`}
          />
          <Tab
            icon={<CheckCircle sx={{ fontSize: 20 }} />}
            iconPosition="start"
            label={`المثبتة (${installedCount})`}
          />
        </Tabs>
      </Box>

      {/* Search and Filters */}
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          {/* Search Field */}
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              size="small"
              placeholder="البحث عن تكامل..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            />
          </Grid>

          {/* Refresh Button */}
          <Grid item xs="auto">
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={() => refetch()}
              disabled={isLoading}
              sx={{ borderRadius: 2 }}
            >
              تحديث
            </Button>
          </Grid>
        </Grid>

        {/* Category Filter Chips */}
        <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <FilterList sx={{ color: 'text.secondary', mr: 1, mt: 0.5 }} />
          {categories.map((category) => (
            <Chip
              key={category}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {category !== 'ALL' && (
                    <span>{categoryIcons[category as IntegrationCategory]}</span>
                  )}
                  <span>{categoryLabels[category]}</span>
                  {categoryCounts[category] !== undefined && (
                    <Typography
                      component="span"
                      variant="caption"
                      sx={{
                        bgcolor: selectedCategory === category ? 'white' : 'action.hover',
                        px: 0.75,
                        py: 0.25,
                        borderRadius: 1,
                        ml: 0.5,
                      }}
                    >
                      {categoryCounts[category]}
                    </Typography>
                  )}
                </Box>
              }
              onClick={() => setSelectedCategory(category)}
              variant={selectedCategory === category ? 'filled' : 'outlined'}
              color={selectedCategory === category ? 'primary' : 'default'}
              sx={{
                height: 36,
                '& .MuiChip-label': { px: 1.5 },
              }}
            />
          ))}
        </Box>
      </Box>

      {/* Error State */}
      {isError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          حدث خطأ أثناء تحميل التكاملات. الرجاء المحاولة مرة أخرى.
          {error instanceof Error && (
            <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
              {error.message}
            </Typography>
          )}
        </Alert>
      )}

      {/* Loading State */}
      {isLoading && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            py: 8,
            gap: 2,
          }}
        >
          <CircularProgress size={40} />
          <Typography color="text.secondary">جاري تحميل التكاملات...</Typography>
        </Box>
      )}

      {/* Empty State */}
      {!isLoading && !isError && filteredIntegrations.length === 0 && (
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
            px: 3,
          }}
        >
          <Extension sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            لا توجد تكاملات
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {searchQuery
              ? 'لم يتم العثور على تكاملات تطابق بحثك'
              : tabValue === 1
              ? 'لم يتم تثبيت أي تكاملات بعد'
              : 'لا توجد تكاملات متاحة حالياً'}
          </Typography>
          {(searchQuery || selectedCategory !== 'ALL') && (
            <Button
              variant="text"
              sx={{ mt: 2 }}
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('ALL');
              }}
            >
              إعادة تعيين الفلاتر
            </Button>
          )}
        </Box>
      )}

      {/* Integrations Grid */}
      {!isLoading && !isError && filteredIntegrations.length > 0 && (
        <Grid container spacing={3}>
          {filteredIntegrations.map((integration) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={integration.slug}>
              <IntegrationCard
                integration={integration}
                onClick={handleIntegrationClick}
                onToggle={integration.installed ? handleToggle : undefined}
                onConfigure={integration.installed ? handleConfigure : undefined}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Results Summary */}
      {!isLoading && !isError && filteredIntegrations.length > 0 && (
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            عرض {filteredIntegrations.length} من {integrations?.length || 0} تكامل
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default IntegrationsMarketplacePage;
