import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import { History, TrendingUp, CheckCircle } from '@mui/icons-material';
import { api } from '@/services/api.service';

interface MudadStats {
  total: number;
  pending: number;
  prepared: number;
  submitted: number;
  accepted: number;
  rejected: number;
  resubmitRequired: number;
}

export const MudadComplianceCard = () => {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();

  const { data: stats, isLoading, error } = useQuery<MudadStats>({
    queryKey: ['mudad-stats', currentYear],
    queryFn: async () => {
      const response = await api.get(`/mudad/stats?year=${currentYear}`);
      return response as MudadStats;
    },
  });

  if (isLoading) {
    return (
      <Card
        sx={{
          borderRadius: 3,
          cursor: 'pointer',
          border: '2px solid',
          borderColor: 'primary.light',
          '&:hover': { boxShadow: 4 },
          minHeight: 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress />
      </Card>
    );
  }

  if (error) {
    return (
      <Card
        sx={{
          borderRadius: 3,
          border: '2px solid',
          borderColor: 'error.light',
          minHeight: 200,
        }}
      >
        <CardContent>
          <Alert severity="error">فشل في تحميل بيانات مُدد</Alert>
        </CardContent>
      </Card>
    );
  }

  const compliancePercentage = stats && stats.total > 0
    ? Math.round((stats.accepted / stats.total) * 100)
    : 0;

  const pendingCount = stats ? stats.pending + stats.resubmitRequired : 0;

  return (
    <Card
      sx={{
        borderRadius: 3,
        cursor: 'pointer',
        border: '2px solid',
        borderColor: 'primary.light',
        '&:hover': { boxShadow: 4 },
        background: 'linear-gradient(135deg, white 0%, rgba(25, 118, 210, 0.05) 100%)',
      }}
      onClick={() => navigate('/mudad')}
    >
      <CardContent sx={{ py: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <History sx={{ fontSize: 32, color: 'primary.main' }} />
            <Typography variant="h6" fontWeight="bold">
              مُدد - الالتزام
            </Typography>
          </Box>
          {compliancePercentage >= 90 && (
            <CheckCircle sx={{ color: 'success.main', fontSize: 24 }} />
          )}
        </Box>

        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              نسبة الالتزام
            </Typography>
            <Typography variant="h5" fontWeight="bold" color="primary">
              {compliancePercentage}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={compliancePercentage}
            sx={{
              height: 8,
              borderRadius: 4,
              bgcolor: 'grey.200',
              '& .MuiLinearProgress-bar': {
                bgcolor: compliancePercentage >= 90 ? 'success.main' : compliancePercentage >= 70 ? 'primary.main' : 'warning.main',
              },
            }}
          />
        </Box>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
          <Chip
            icon={<TrendingUp />}
            label={`${stats?.accepted || 0} مقبول`}
            color="success"
            size="small"
            variant="outlined"
          />
          {pendingCount > 0 && (
            <Chip
              label={`${pendingCount} معلق`}
              color="warning"
              size="small"
            />
          )}
        </Box>

        <Typography variant="caption" display="block" color="text.secondary" sx={{ textAlign: 'center' }}>
          انقر لعرض التفاصيل والإدارة
        </Typography>
      </CardContent>
    </Card>
  );
};
