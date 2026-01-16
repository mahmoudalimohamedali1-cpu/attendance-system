import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  IconButton,
  Tooltip,
  Divider,
  Badge,
} from '@mui/material';
import {
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
  CheckCircle,
  Description,
} from '@mui/icons-material';
import {
  qiwaService,
  ComplianceWarning,
  WarningLevel,
  warningLevelLabels,
  warningLevelColors,
  warningTypeLabels,
} from '@/services/qiwa.service';

interface ComplianceWarningsProps {
  showAll?: boolean;
  maxItems?: number;
}

export const ComplianceWarnings = ({ showAll = true, maxItems = 10 }: ComplianceWarningsProps) => {
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: warnings = [], isLoading, error, refetch } = useQuery<ComplianceWarning[]>({
    queryKey: ['compliance-warnings', refreshKey],
    queryFn: () => qiwaService.getComplianceWarnings(),
    refetchInterval: 300000, // Refetch every 5 minutes
  });

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    refetch();
  };

  const getWarningIcon = (level: WarningLevel) => {
    switch (level) {
      case 'CRITICAL':
      case 'ERROR':
        return <ErrorIcon sx={{ color: 'error.main', fontSize: 24 }} />;
      case 'WARNING':
        return <WarningIcon sx={{ color: 'warning.main', fontSize: 24 }} />;
      case 'INFO':
        return <InfoIcon sx={{ color: 'info.main', fontSize: 24 }} />;
      default:
        return <InfoIcon sx={{ color: 'grey.500', fontSize: 24 }} />;
    }
  };

  const getSeverityBgColor = (level: WarningLevel): string => {
    switch (level) {
      case 'CRITICAL':
      case 'ERROR':
        return 'error.50';
      case 'WARNING':
        return 'warning.50';
      case 'INFO':
        return 'info.50';
      default:
        return 'grey.50';
    }
  };

  // Sort warnings by severity
  const sortedWarnings = [...warnings].sort((a, b) => {
    const severityOrder: Record<WarningLevel, number> = {
      CRITICAL: 0,
      ERROR: 1,
      WARNING: 2,
      INFO: 3,
    };
    return severityOrder[a.level] - severityOrder[b.level];
  });

  // Limit warnings if needed
  const displayWarnings = showAll ? sortedWarnings : sortedWarnings.slice(0, maxItems);

  // Calculate summary counts
  const criticalCount = qiwaService.getCriticalWarningsCount(warnings);
  const totalAffectedContracts = qiwaService.getTotalAffectedContracts(warnings);

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
            فشل في تحميل التحذيرات
            {error instanceof Error && `: ${error.message}`}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Badge badgeContent={criticalCount} color="error">
              <WarningIcon sx={{ color: 'warning.main', fontSize: 28 }} />
            </Badge>
            <Typography variant="h6" component="div">
              تحذيرات الامتثال
            </Typography>
          </Box>
          <Tooltip title="تحديث البيانات">
            <IconButton size="small" onClick={handleRefresh} sx={{ ml: 1 }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Summary */}
        {warnings.length > 0 && (
          <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  إجمالي التحذيرات
                </Typography>
                <Typography variant="h6" fontWeight="bold">
                  {warnings.length}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  تحذيرات حرجة
                </Typography>
                <Typography variant="h6" fontWeight="bold" color="error.main">
                  {criticalCount}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  عقود متأثرة
                </Typography>
                <Typography variant="h6" fontWeight="bold" color="warning.main">
                  {totalAffectedContracts}
                </Typography>
              </Box>
            </Box>
          </Box>
        )}

        {/* No Warnings */}
        {warnings.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CheckCircle sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
            <Typography variant="h6" color="success.main" gutterBottom>
              لا توجد تحذيرات
            </Typography>
            <Typography variant="body2" color="text.secondary">
              جميع العقود والامتثالات في حالة جيدة
            </Typography>
          </Box>
        )}

        {/* Warnings List */}
        {warnings.length > 0 && (
          <List disablePadding>
            {displayWarnings.map((warning, index) => (
              <Box key={warning.id}>
                {index > 0 && <Divider sx={{ my: 1 }} />}
                <ListItem
                  sx={{
                    bgcolor: getSeverityBgColor(warning.level),
                    borderRadius: 2,
                    mb: 1,
                    alignItems: 'flex-start',
                    flexDirection: 'column',
                    gap: 1,
                    p: 2,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', width: '100%', gap: 2 }}>
                    <ListItemIcon sx={{ minWidth: 'auto', mt: 0.5 }}>
                      {getWarningIcon(warning.level)}
                    </ListItemIcon>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Chip
                          label={warningLevelLabels[warning.level]}
                          color={warningLevelColors[warning.level]}
                          size="small"
                        />
                        <Chip
                          label={warningTypeLabels[warning.type]}
                          variant="outlined"
                          size="small"
                        />
                      </Box>
                      <ListItemText
                        primary={warning.title}
                        secondary={
                          <>
                            <Typography component="span" variant="body2" display="block" sx={{ mb: 1 }}>
                              {warning.message}
                            </Typography>
                            {warning.affectedContracts.length > 0 && (
                              <Box sx={{ mt: 1 }}>
                                <Typography component="span" variant="caption" color="text.secondary">
                                  العقود المتأثرة ({warning.affectedContracts.length}):
                                </Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                                  {warning.affectedContracts.slice(0, 3).map((contract) => (
                                    <Chip
                                      key={contract.contractId}
                                      icon={<Description />}
                                      label={`${contract.employeeName} (${contract.employeeCode})`}
                                      size="small"
                                      variant="outlined"
                                      sx={{ fontSize: '0.7rem' }}
                                    />
                                  ))}
                                  {warning.affectedContracts.length > 3 && (
                                    <Chip
                                      label={`+${warning.affectedContracts.length - 3} آخرون`}
                                      size="small"
                                      variant="outlined"
                                      sx={{ fontSize: '0.7rem' }}
                                    />
                                  )}
                                </Box>
                              </Box>
                            )}
                            <Typography
                              component="span"
                              variant="body2"
                              display="block"
                              sx={{ mt: 1, fontWeight: 'bold', color: 'primary.main' }}
                            >
                              الإجراء المطلوب: {warning.actionRequired}
                            </Typography>
                          </>
                        }
                        primaryTypographyProps={{ fontWeight: 'bold', mb: 0.5 }}
                        secondaryTypographyProps={{ component: 'div' }}
                      />
                    </Box>
                  </Box>
                </ListItem>
              </Box>
            ))}
          </List>
        )}

        {/* Show More Indicator */}
        {!showAll && sortedWarnings.length > maxItems && (
          <Alert severity="info" sx={{ mt: 2 }}>
            يوجد {sortedWarnings.length - maxItems} تحذير إضافي
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
