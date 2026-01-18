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
  LinearProgress,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Warning,
  CheckCircle,
  Info,
} from '@mui/icons-material';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { aiPredictiveService } from '@/services/ai-predictive.service';
import { RiskLevel } from '@/types/ai-predictive.types';

const COLORS = {
  [RiskLevel.LOW]: '#4caf50',
  [RiskLevel.MEDIUM]: '#ff9800',
  [RiskLevel.HIGH]: '#f44336',
  [RiskLevel.CRITICAL]: '#d32f2f',
};

export const AbsenceForecast = () => {
  const { data: predictionsData, isLoading, error } = useQuery({
    queryKey: ['employee-predictions'],
    queryFn: () => aiPredictiveService.getEmployeePredictions(),
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
          <Alert severity="error">فشل تحميل التوقعات. يرجى المحاولة مرة أخرى.</Alert>
        </CardContent>
      </Card>
    );
  }

  if (!predictionsData?.predictions || predictionsData.predictions.length === 0) {
    return (
      <Card>
        <CardContent>
          <Alert severity="info">لا توجد توقعات متاحة. يرجى تدريب النموذج أولاً.</Alert>
        </CardContent>
      </Card>
    );
  }

  const predictions = predictionsData.predictions;
  const totalEmployees = predictions.length;

  const riskDistribution = predictions.reduce(
    (acc, pred) => {
      acc[pred.riskLevel] = (acc[pred.riskLevel] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const highRiskCount = (riskDistribution[RiskLevel.HIGH] || 0) + (riskDistribution[RiskLevel.CRITICAL] || 0);
  const mediumRiskCount = riskDistribution[RiskLevel.MEDIUM] || 0;
  const lowRiskCount = riskDistribution[RiskLevel.LOW] || 0;

  const averageLikelihood = predictions.reduce((sum, pred) => sum + pred.absenceLikelihood, 0) / totalEmployees;
  const expectedAbsences = Math.round((averageLikelihood / 100) * totalEmployees);
  const expectedAttendanceRate = 100 - averageLikelihood;

  const chartData = [
    { name: 'منخفض', value: lowRiskCount, color: COLORS[RiskLevel.LOW] },
    { name: 'متوسط', value: mediumRiskCount, color: COLORS[RiskLevel.MEDIUM] },
    { name: 'عالي', value: highRiskCount, color: COLORS[RiskLevel.HIGH] },
  ].filter(item => item.value > 0);

  const riskDays = predictions
    .filter(p => p.riskLevel === RiskLevel.HIGH || p.riskLevel === RiskLevel.CRITICAL)
    .length;

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              📊 توقعات الغياب على مستوى الشركة
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              آخر تحديث: {format(new Date(predictionsData.generatedAt), 'PPp', { locale: ar })}
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" mb={1}>
              <CheckCircle sx={{ color: 'success.main', mr: 1 }} />
              <Typography variant="body2" color="text.secondary">
                معدل الحضور المتوقع
              </Typography>
            </Box>
            <Typography variant="h4" color="success.main">
              {expectedAttendanceRate.toFixed(1)}%
            </Typography>
            <LinearProgress
              variant="determinate"
              value={expectedAttendanceRate}
              sx={{ mt: 2, height: 8, borderRadius: 1 }}
              color="success"
            />
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" mb={1}>
              <Warning sx={{ color: 'warning.main', mr: 1 }} />
              <Typography variant="body2" color="text.secondary">
                الغيابات المتوقعة
              </Typography>
            </Box>
            <Typography variant="h4" color="warning.main">
              {expectedAbsences}
            </Typography>
            <Typography variant="body2" color="text.secondary" mt={1}>
              من أصل {totalEmployees} موظف
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" mb={1}>
              <TrendingUp sx={{ color: 'error.main', mr: 1 }} />
              <Typography variant="body2" color="text.secondary">
                موظفين عالي المخاطر
              </Typography>
            </Box>
            <Typography variant="h4" color="error.main">
              {highRiskCount}
            </Typography>
            <Chip
              label={`${((highRiskCount / totalEmployees) * 100).toFixed(1)}% من الموظفين`}
              size="small"
              sx={{ mt: 1 }}
              color={highRiskCount > totalEmployees * 0.2 ? 'error' : 'default'}
            />
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" mb={1}>
              <Info sx={{ color: 'info.main', mr: 1 }} />
              <Typography variant="body2" color="text.secondary">
                متوسط احتمال الغياب
              </Typography>
            </Box>
            <Typography variant="h4" color="info.main">
              {averageLikelihood.toFixed(1)}%
            </Typography>
            <Box display="flex" alignItems="center" mt={1}>
              {averageLikelihood > 20 ? (
                <TrendingUp fontSize="small" color="error" />
              ) : (
                <TrendingDown fontSize="small" color="success" />
              )}
              <Typography variant="body2" color="text.secondary" ml={0.5}>
                {averageLikelihood > 20 ? 'أعلى من المعتاد' : 'ضمن المعدل الطبيعي'}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              توزيع مستويات المخاطر
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              💡 رؤى وتوصيات
            </Typography>
            <Box mt={2}>
              {highRiskCount > totalEmployees * 0.15 && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    ⚠️ نسبة عالية من الموظفين معرضون لخطر الغياب ({highRiskCount} موظف). يُنصح بمراجعة ظروف العمل واتخاذ إجراءات وقائية.
                  </Typography>
                </Alert>
              )}
              {averageLikelihood > 25 && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    🔴 متوسط احتمال الغياب مرتفع ({averageLikelihood.toFixed(1)}%). يجب التدخل الفوري من قبل الموارد البشرية.
                  </Typography>
                </Alert>
              )}
              {highRiskCount === 0 && averageLikelihood < 15 && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    ✅ معدلات الغياب المتوقعة ضمن المعدل الطبيعي. استمروا في الحفاظ على بيئة العمل الإيجابية.
                  </Typography>
                </Alert>
              )}
              {mediumRiskCount > totalEmployees * 0.3 && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    ℹ️ عدد كبير من الموظفين في فئة المخاطر المتوسطة. يُنصح بالمتابعة الدورية ومراجعة الأنماط.
                  </Typography>
                </Alert>
              )}
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};
