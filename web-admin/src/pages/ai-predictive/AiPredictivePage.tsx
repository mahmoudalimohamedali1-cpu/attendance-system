import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Container,
  Typography,
  Button,
  Snackbar,
  Alert,
  CircularProgress,
  Paper,
  Grid,
  Divider,
} from '@mui/material';
import {
  Psychology,
  Refresh,
  ModelTraining,
  Close,
} from '@mui/icons-material';
import { aiPredictiveService } from '@/services/ai-predictive.service';
import { AbsenceForecast } from './components/AbsenceForecast';
import { EmployeeRiskScores } from './components/EmployeeRiskScores';
import { PatternInsights } from './components/PatternInsights';
import { ModelAccuracy } from './components/ModelAccuracy';

/**
 * 🤖 صفحة التحليلات التنبؤية بالذكاء الاصطناعي
 * AI Predictive Analytics Page - Main dashboard for absence predictions
 */
export const AiPredictivePage = () => {
  const queryClient = useQueryClient();
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // 🚀 Train model mutation
  const trainModelMutation = useMutation({
    mutationFn: () => aiPredictiveService.trainModel(),
    onSuccess: (response) => {
      // Invalidate all queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['employee-predictions'] });
      queryClient.invalidateQueries({ queryKey: ['absence-patterns'] });
      queryClient.invalidateQueries({ queryKey: ['model-accuracy'] });

      setSnackbar({
        open: true,
        message: `✅ تم تدريب النموذج بنجاح! الدقة: ${(response.accuracy * 100).toFixed(2)}%`,
        severity: 'success',
      });
    },
    onError: (error: any) => {
      setSnackbar({
        open: true,
        message: `❌ فشل تدريب النموذج: ${error?.response?.data?.message || 'حدث خطأ'}`,
        severity: 'error',
      });
    },
  });

  // 🔄 Refresh all data
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['employee-predictions'] });
    queryClient.invalidateQueries({ queryKey: ['absence-patterns'] });
    queryClient.invalidateQueries({ queryKey: ['model-accuracy'] });

    setSnackbar({
      open: true,
      message: '🔄 جاري تحديث البيانات...',
      severity: 'info',
    });
  };

  // 🎓 Train model handler
  const handleTrainModel = () => {
    trainModelMutation.mutate();
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* 📋 Page Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Psychology sx={{ fontSize: 40, color: 'primary.main' }} />
            <Box>
              <Typography variant="h4" component="h1" fontWeight="bold">
                🤖 التحليلات التنبؤية بالذكاء الاصطناعي
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                توقعات الغياب وتحليل الأنماط باستخدام التعلم الآلي
              </Typography>
            </Box>
          </Box>

          {/* 🔘 Action Buttons */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={handleRefresh}
              disabled={trainModelMutation.isPending}
            >
              تحديث البيانات
            </Button>
            <Button
              variant="contained"
              startIcon={trainModelMutation.isPending ? <CircularProgress size={20} color="inherit" /> : <ModelTraining />}
              onClick={handleTrainModel}
              disabled={trainModelMutation.isPending}
            >
              {trainModelMutation.isPending ? 'جاري التدريب...' : 'تدريب النموذج'}
            </Button>
          </Box>
        </Box>

        <Divider />
      </Box>

      {/* 📊 Dashboard Content */}
      <Grid container spacing={3}>
        {/* 🎯 Absence Forecast - Full Width at Top */}
        <Grid item xs={12}>
          <AbsenceForecast />
        </Grid>

        {/* 👥 Employee Risk Scores - Left Column */}
        <Grid item xs={12} lg={8}>
          <EmployeeRiskScores />
        </Grid>

        {/* 📈 Model Accuracy - Right Column */}
        <Grid item xs={12} lg={4}>
          <ModelAccuracy />
        </Grid>

        {/* 🔍 Pattern Insights - Full Width at Bottom */}
        <Grid item xs={12}>
          <PatternInsights />
        </Grid>
      </Grid>

      {/* 📢 Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
          action={
            <Close
              fontSize="small"
              onClick={() => setSnackbar({ ...snackbar, open: false })}
              sx={{ cursor: 'pointer' }}
            />
          }
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};
