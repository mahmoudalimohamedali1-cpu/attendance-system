import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Grid,
  LinearProgress,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  TrendingUp as TrendIcon,
  TrendingDown as TrendDownIcon,
  CheckCircle,
  Warning,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  People,
} from '@mui/icons-material';
import { qiwaService, SaudizationRatio } from '@/services/qiwa.service';

interface SaudizationCardProps {
  targetRatio?: number;
  showDetails?: boolean;
}

export const SaudizationCard = ({ targetRatio = 75, showDetails = true }: SaudizationCardProps) => {
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: saudizationData, isLoading, error, refetch } = useQuery<SaudizationRatio>({
    queryKey: ['saudization-ratio', targetRatio, refreshKey],
    queryFn: () => qiwaService.getSaudizationRatio(targetRatio),
    refetchInterval: 300000, // Refetch every 5 minutes
  });

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    refetch();
  };

  const getStatusIcon = (isCompliant: boolean, ratio: number, target: number) => {
    if (isCompliant) {
      return <CheckCircle sx={{ color: 'success.main', fontSize: 28 }} />;
    } else if (ratio >= target - 5) {
      return <Warning sx={{ color: 'warning.main', fontSize: 28 }} />;
    } else {
      return <ErrorIcon sx={{ color: 'error.main', fontSize: 28 }} />;
    }
  };

  const getProgressColor = (ratio: number, target: number): 'success' | 'warning' | 'error' => {
    if (ratio >= target) return 'success';
    if (ratio >= target - 5) return 'warning';
    return 'error';
  };

  if (isLoading) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
          <CircularProgress />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Alert severity="error">
            فشل في تحميل بيانات نسبة السعودة
            {error instanceof Error && `: ${error.message}`}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!saudizationData) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Alert severity="info">لا توجد بيانات متاحة</Alert>
        </CardContent>
      </Card>
    );
  }

  const { saudizationRatio, targetRatio: target, totalEmployees, saudiEmployees, nonSaudiEmployees, deficitCount, isCompliant } = saudizationData;
  const progressValue = Math.min(saudizationRatio, 100);
  const statusColor = getProgressColor(saudizationRatio, target);
  const statusText = qiwaService.getSaudizationStatusText(saudizationRatio, target);

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <People sx={{ color: 'primary.main', fontSize: 28 }} />
            <Typography variant="h6" component="div">
              نسبة السعودة
            </Typography>
          </Box>
          <Tooltip title="تحديث البيانات">
            <IconButton size="small" onClick={handleRefresh} sx={{ ml: 1 }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Main Ratio Display */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Box sx={{ position: 'relative', display: 'inline-flex', mb: 2 }}>
            <CircularProgress
              variant="determinate"
              value={100}
              size={120}
              thickness={4}
              sx={{ color: 'grey.200', position: 'absolute' }}
            />
            <CircularProgress
              variant="determinate"
              value={progressValue}
              size={120}
              thickness={4}
              color={statusColor}
            />
            <Box
              sx={{
                top: 0,
                left: 0,
                bottom: 0,
                right: 0,
                position: 'absolute',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
              }}
            >
              <Typography variant="h4" component="div" fontWeight="bold" color={`${statusColor}.main`}>
                {qiwaService.formatRatio(saudizationRatio)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                الحالية
              </Typography>
            </Box>
          </Box>

          {/* Target Ratio */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              الهدف:
            </Typography>
            <Typography variant="body1" fontWeight="bold">
              {target}%
            </Typography>
          </Box>

          {/* Status Chip */}
          <Chip
            icon={getStatusIcon(isCompliant, saudizationRatio, target)}
            label={statusText}
            color={statusColor}
            size="small"
            sx={{ mt: 1 }}
          />
        </Box>

        {/* Details */}
        {showDetails && (
          <>
            <Box sx={{ mb: 2 }}>
              <LinearProgress
                variant="determinate"
                value={progressValue}
                color={statusColor}
                sx={{ height: 8, borderRadius: 4, mb: 1 }}
              />
            </Box>

            <Grid container spacing={2}>
              {/* Total Employees */}
              <Grid item xs={6}>
                <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="h6" fontWeight="bold">
                    {totalEmployees}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    إجمالي الموظفين
                  </Typography>
                </Box>
              </Grid>

              {/* Saudi Employees */}
              <Grid item xs={6}>
                <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'success.50', borderRadius: 1 }}>
                  <Typography variant="h6" fontWeight="bold" color="success.main">
                    {saudiEmployees}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    موظفون سعوديون
                  </Typography>
                </Box>
              </Grid>

              {/* Non-Saudi Employees */}
              <Grid item xs={6}>
                <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'info.50', borderRadius: 1 }}>
                  <Typography variant="h6" fontWeight="bold" color="info.main">
                    {nonSaudiEmployees}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    موظفون غير سعوديين
                  </Typography>
                </Box>
              </Grid>

              {/* Deficit */}
              {deficitCount > 0 && (
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'warning.50', borderRadius: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                      <TrendDownIcon sx={{ color: 'warning.main', fontSize: 20 }} />
                      <Typography variant="h6" fontWeight="bold" color="warning.main">
                        {deficitCount}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      عجز سعوديين
                    </Typography>
                  </Box>
                </Grid>
              )}

              {/* Compliant - No Deficit */}
              {deficitCount === 0 && isCompliant && (
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'success.50', borderRadius: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                      <TrendIcon sx={{ color: 'success.main', fontSize: 20 }} />
                      <Typography variant="h6" fontWeight="bold" color="success.main">
                        +0
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      متوافق تمامًا
                    </Typography>
                  </Box>
                </Grid>
              )}
            </Grid>
          </>
        )}
      </CardContent>
    </Card>
  );
};
