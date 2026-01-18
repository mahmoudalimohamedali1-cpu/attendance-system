import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  CircularProgress,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  TrendingUp,
  CalendarToday,
  People,
  BusinessCenter,
  Loop,
  VerifiedUser,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { aiPredictiveService } from '@/services/ai-predictive.service';
import type { PatternInsight } from '@/types/ai-predictive.types';

const PATTERN_ICONS: Record<string, React.ReactElement> = {
  WEEKDAY: <CalendarToday />,
  POST_HOLIDAY: <TrendingUp />,
  SEASONAL: <Loop />,
  DEPARTMENT: <BusinessCenter />,
  REPEATED: <People />,
};

const PATTERN_LABELS: Record<string, string> = {
  WEEKDAY: 'نمط أيام الأسبوع',
  POST_HOLIDAY: 'نمط ما بعد الإجازة',
  SEASONAL: 'نمط موسمي',
  DEPARTMENT: 'نمط القسم',
  REPEATED: 'نمط متكرر',
};

const getConfidenceColor = (confidence: number): 'success' | 'warning' | 'error' => {
  if (confidence >= 0.8) return 'success';
  if (confidence >= 0.6) return 'warning';
  return 'error';
};

const getConfidenceLabel = (confidence: number): string => {
  if (confidence >= 0.8) return 'ثقة عالية';
  if (confidence >= 0.6) return 'ثقة متوسطة';
  return 'ثقة منخفضة';
};

export const PatternInsights = () => {
  const { data: patternsData, isLoading, error } = useQuery({
    queryKey: ['absence-patterns'],
    queryFn: () => aiPredictiveService.getPatterns(),
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
          <Alert severity="error">فشل تحميل الأنماط المكتشفة. يرجى المحاولة مرة أخرى.</Alert>
        </CardContent>
      </Card>
    );
  }

  if (!patternsData?.patterns || patternsData.patterns.length === 0) {
    return (
      <Card>
        <CardContent>
          <Alert severity="info">
            لم يتم اكتشاف أنماط غياب بعد. سيتم تحديث الأنماط تلقائياً عند توفر بيانات كافية.
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const patterns = patternsData.patterns;

  return (
    <Box>
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            🔍 الأنماط المكتشفة للغياب
          </Typography>
          <Typography variant="body2" color="text.secondary">
            آخر تحديث: {format(new Date(patternsData.detectedAt), 'PPp', { locale: ar })}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            تم اكتشاف {patterns.length} نمط/أنماط للغياب
          </Typography>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {patterns.map((pattern, index) => (
          <Grid item xs={12} md={6} key={index}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Box sx={{ color: 'primary.main' }}>
                      {PATTERN_ICONS[pattern.patternType] || <VerifiedUser />}
                    </Box>
                    <Typography variant="h6">
                      {PATTERN_LABELS[pattern.patternType] || pattern.patternType}
                    </Typography>
                  </Box>
                  <Chip
                    label={getConfidenceLabel(pattern.confidence)}
                    color={getConfidenceColor(pattern.confidence)}
                    size="small"
                    icon={<VerifiedUser />}
                  />
                </Box>

                <Typography variant="body1" color="text.primary" sx={{ mb: 2, fontWeight: 500 }}>
                  {pattern.description}
                </Typography>

                <Divider sx={{ my: 2 }} />

                <Box display="flex" alignItems="center" gap={2} mb={2}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <People fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">
                      {pattern.affectedEmployees.length} موظف متأثر
                    </Typography>
                  </Box>
                  <Box display="flex" alignItems="center" gap={1}>
                    <VerifiedUser fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">
                      دقة {(pattern.confidence * 100).toFixed(0)}%
                    </Typography>
                  </Box>
                </Box>

                {pattern.insights && pattern.insights.length > 0 && (
                  <>
                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
                      💡 رؤى وتوصيات:
                    </Typography>
                    <List dense sx={{ pl: 1 }}>
                      {pattern.insights.map((insight, insightIndex) => (
                        <ListItem key={insightIndex} sx={{ py: 0.5, px: 0 }}>
                          <ListItemText
                            primary={`• ${insight}`}
                            primaryTypographyProps={{
                              variant: 'body2',
                              color: 'text.secondary',
                            }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </>
                )}

                <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                  <Typography variant="caption" color="text.secondary">
                    تم الاكتشاف في: {format(new Date(pattern.detectedAt), 'PPp', { locale: ar })}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};
