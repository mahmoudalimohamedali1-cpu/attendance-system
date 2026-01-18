import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Chip,
  CircularProgress,
  Alert,
  Collapse,
  IconButton,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  TrendingUp,
  TrendingDown,
  Remove,
} from '@mui/icons-material';
import { aiPredictiveService } from '@/services/ai-predictive.service';
import { RiskLevel, EmployeePrediction } from '@/types/ai-predictive.types';

type Order = 'asc' | 'desc';

const COLORS = {
  [RiskLevel.LOW]: 'success',
  [RiskLevel.MEDIUM]: 'warning',
  [RiskLevel.HIGH]: 'error',
  [RiskLevel.CRITICAL]: 'error',
} as const;

const RISK_LABELS = {
  [RiskLevel.LOW]: 'منخفض',
  [RiskLevel.MEDIUM]: 'متوسط',
  [RiskLevel.HIGH]: 'عالي',
  [RiskLevel.CRITICAL]: 'حرج',
};

const getRiskIcon = (likelihood: number) => {
  if (likelihood >= 60) return <TrendingUp fontSize="small" />;
  if (likelihood <= 30) return <TrendingDown fontSize="small" />;
  return <Remove fontSize="small" />;
};

export const EmployeeRiskScores = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [order, setOrder] = useState<Order>('desc');
  const [orderBy, setOrderBy] = useState<keyof EmployeePrediction>('absenceLikelihood');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

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
          <Alert severity="error">فشل تحميل درجات المخاطر. يرجى المحاولة مرة أخرى.</Alert>
        </CardContent>
      </Card>
    );
  }

  if (!predictionsData?.predictions || predictionsData.predictions.length === 0) {
    return (
      <Card>
        <CardContent>
          <Alert severity="info">لا توجد درجات مخاطر متاحة. يرجى تدريب النموذج أولاً.</Alert>
        </CardContent>
      </Card>
    );
  }

  const predictions = predictionsData.predictions;

  const handleRequestSort = (property: keyof EmployeePrediction) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const sortedPredictions = [...predictions].sort((a, b) => {
    const aValue = a[orderBy];
    const bValue = b[orderBy];

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return order === 'asc' ? aValue - bValue : bValue - aValue;
    }

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return order === 'asc'
        ? aValue.localeCompare(bValue, 'ar')
        : bValue.localeCompare(aValue, 'ar');
    }

    return 0;
  });

  const paginatedPredictions = sortedPredictions.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const handleExpandClick = (userId: string) => {
    setExpandedRow(expandedRow === userId ? null : userId);
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            📊 درجات مخاطر الموظفين
          </Typography>
          <Typography variant="body2" color="text.secondary">
            توقعات غياب الموظفين مرتبة حسب مستوى المخاطر
          </Typography>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'employeeName'}
                    direction={orderBy === 'employeeName' ? order : 'asc'}
                    onClick={() => handleRequestSort('employeeName')}
                  >
                    اسم الموظف
                  </TableSortLabel>
                </TableCell>
                <TableCell align="center">
                  <TableSortLabel
                    active={orderBy === 'absenceLikelihood'}
                    direction={orderBy === 'absenceLikelihood' ? order : 'asc'}
                    onClick={() => handleRequestSort('absenceLikelihood')}
                  >
                    احتمال الغياب
                  </TableSortLabel>
                </TableCell>
                <TableCell align="center">
                  <TableSortLabel
                    active={orderBy === 'riskLevel'}
                    direction={orderBy === 'riskLevel' ? order : 'asc'}
                    onClick={() => handleRequestSort('riskLevel')}
                  >
                    مستوى المخاطر
                  </TableSortLabel>
                </TableCell>
                <TableCell>العوامل المساهمة</TableCell>
                <TableCell align="center">التفاصيل</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedPredictions.map((prediction) => (
                <>
                  <TableRow
                    key={prediction.userId}
                    hover
                    sx={{
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <TableCell>
                      <Typography fontWeight="medium">{prediction.employeeName}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                        {getRiskIcon(prediction.absenceLikelihood)}
                        <Typography
                          fontWeight="bold"
                          color={
                            prediction.absenceLikelihood >= 60
                              ? 'error.main'
                              : prediction.absenceLikelihood >= 30
                              ? 'warning.main'
                              : 'success.main'
                          }
                        >
                          {prediction.absenceLikelihood.toFixed(1)}%
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={RISK_LABELS[prediction.riskLevel]}
                        color={COLORS[prediction.riskLevel]}
                        size="small"
                        variant={prediction.riskLevel === RiskLevel.CRITICAL ? 'filled' : 'outlined'}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {prediction.contributingFactors.length} عامل
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        onClick={() => handleExpandClick(prediction.userId)}
                        aria-label="توسيع"
                      >
                        {expandedRow === prediction.userId ? (
                          <ExpandLessIcon />
                        ) : (
                          <ExpandMoreIcon />
                        )}
                      </IconButton>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={5}>
                      <Collapse
                        in={expandedRow === prediction.userId}
                        timeout="auto"
                        unmountOnExit
                      >
                        <Box sx={{ py: 2, px: 3, bgcolor: 'background.default' }}>
                          <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                            🔍 العوامل المساهمة في التوقع:
                          </Typography>
                          <List dense>
                            {prediction.contributingFactors.map((factor, index) => (
                              <ListItem key={index} sx={{ py: 0.5 }}>
                                <ListItemText
                                  primary={`• ${factor}`}
                                  primaryTypographyProps={{
                                    variant: 'body2',
                                    color: 'text.secondary',
                                  }}
                                />
                              </ListItem>
                            ))}
                          </List>
                          {prediction.departmentComparison && (
                            <Box sx={{ mt: 2 }}>
                              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                                📊 المقارنة مع القسم:
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {prediction.departmentComparison}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={sortedPredictions.length}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          labelRowsPerPage="عدد الصفوف:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} من ${count}`}
        />
      </CardContent>
    </Card>
  );
};
