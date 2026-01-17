import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  CircularProgress,
  Alert,
  LinearProgress,
  Chip,
  Divider,
} from '@mui/material';
import {
  CheckCircle,
  Analytics,
  Info,
  Update,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { aiPredictiveService } from '@/services/ai-predictive.service';

export const ModelAccuracy = () => {
  const { data: accuracyData, isLoading, error } = useQuery({
    queryKey: ['model-accuracy'],
    queryFn: () => aiPredictiveService.getModelAccuracy(),
    refetchInterval: 300000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error">فشل تحميل مقاييس دقة النموذج. يرجى المحاولة مرة أخرى.</Alert>
        </CardContent>
      </Card>
    );
  }

  if (!accuracyData?.metrics) {
    return (
      <Card>
        <CardContent>
          <Alert severity="info">لم يتم تدريب النموذج بعد. يرجى تدريب النموذج أولاً للحصول على مقاييس الدقة.</Alert>
        </CardContent>
      </Card>
    );
  }

  const metrics = accuracyData.metrics;
  const accuracyPercent = metrics.accuracy * 100;
  const precisionPercent = metrics.precision * 100;
  const recallPercent = metrics.recall * 100;
  const f1ScorePercent = metrics.f1Score * 100;

  // Determine overall model quality
  const getQualityStatus = (accuracy: number) => {
    if (accuracy >= 0.85) return { label: 'ممتاز', color: 'success' as const };
    if (accuracy >= 0.75) return { label: 'جيد', color: 'info' as const };
    if (accuracy >= 0.65) return { label: 'مقبول', color: 'warning' as const };
    return { label: 'يحتاج تحسين', color: 'error' as const };
  };

  const qualityStatus = getQualityStatus(metrics.accuracy);

  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
          <Box display="flex" alignItems="center">
            <Analytics sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">
              📊 مقاييس دقة النموذج
            </Typography>
          </Box>
          <Chip
            label={qualityStatus.label}
            color={qualityStatus.color}
            icon={<CheckCircle />}
            size="small"
          />
        </Box>

        <Grid container spacing={2}>
          {/* Accuracy */}
          <Grid item xs={12} sm={6}>
            <Box mb={2}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="body2" color="text.secondary">
                  الدقة الإجمالية (Accuracy)
                </Typography>
                <Typography variant="h6" color="primary.main">
                  {accuracyPercent.toFixed(2)}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={accuracyPercent}
                sx={{ height: 8, borderRadius: 1 }}
                color={qualityStatus.color}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                نسبة التوقعات الصحيحة من إجمالي التوقعات
              </Typography>
            </Box>
          </Grid>

          {/* Precision */}
          <Grid item xs={12} sm={6}>
            <Box mb={2}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="body2" color="text.secondary">
                  الدقة الموجبة (Precision)
                </Typography>
                <Typography variant="h6" color="info.main">
                  {precisionPercent.toFixed(2)}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={precisionPercent}
                sx={{ height: 8, borderRadius: 1 }}
                color="info"
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                نسبة الغيابات المتوقعة التي حدثت فعلاً
              </Typography>
            </Box>
          </Grid>

          {/* Recall */}
          <Grid item xs={12} sm={6}>
            <Box mb={2}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="body2" color="text.secondary">
                  الاستدعاء (Recall)
                </Typography>
                <Typography variant="h6" color="secondary.main">
                  {recallPercent.toFixed(2)}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={recallPercent}
                sx={{ height: 8, borderRadius: 1 }}
                color="secondary"
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                نسبة الغيابات الفعلية التي تم التنبؤ بها
              </Typography>
            </Box>
          </Grid>

          {/* F1 Score */}
          <Grid item xs={12} sm={6}>
            <Box mb={2}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="body2" color="text.secondary">
                  درجة F1 (F1 Score)
                </Typography>
                <Typography variant="h6" color="warning.main">
                  {f1ScorePercent.toFixed(2)}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={f1ScorePercent}
                sx={{ height: 8, borderRadius: 1 }}
                color="warning"
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                المتوسط التوافقي للدقة والاستدعاء
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        {/* Model Information */}
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <Box display="flex" alignItems="center">
              <Info sx={{ fontSize: 18, mr: 1, color: 'text.secondary' }} />
              <Box>
                <Typography variant="caption" color="text.secondary">
                  إصدار النموذج
                </Typography>
                <Typography variant="body2" fontWeight="medium">
                  {metrics.modelVersion}
                </Typography>
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12} sm={4}>
            <Box display="flex" alignItems="center">
              <Update sx={{ fontSize: 18, mr: 1, color: 'text.secondary' }} />
              <Box>
                <Typography variant="caption" color="text.secondary">
                  آخر تقييم
                </Typography>
                <Typography variant="body2" fontWeight="medium">
                  {format(new Date(metrics.evaluatedAt), 'PP', { locale: ar })}
                </Typography>
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12} sm={4}>
            <Box display="flex" alignItems="center">
              <Analytics sx={{ fontSize: 18, mr: 1, color: 'text.secondary' }} />
              <Box>
                <Typography variant="caption" color="text.secondary">
                  عدد التوقعات
                </Typography>
                <Typography variant="body2" fontWeight="medium">
                  {metrics.predictionCount.toLocaleString('ar-SA')}
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>

        {/* Insights */}
        <Box mt={2}>
          {metrics.accuracy >= 0.85 && (
            <Alert severity="success" sx={{ mt: 2 }}>
              <Typography variant="body2">
                ✅ النموذج يعمل بشكل ممتاز ويمكن الاعتماد عليه في اتخاذ القرارات.
              </Typography>
            </Alert>
          )}
          {metrics.accuracy >= 0.75 && metrics.accuracy < 0.85 && (
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                ℹ️ النموذج يعمل بشكل جيد. يمكن تحسين الأداء بتدريبه على المزيد من البيانات.
              </Typography>
            </Alert>
          )}
          {metrics.accuracy < 0.75 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="body2">
                ⚠️ دقة النموذج تحتاج إلى تحسين. يُنصح بإعادة التدريب على بيانات أكثر أو مراجعة جودة البيانات.
              </Typography>
            </Alert>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};
