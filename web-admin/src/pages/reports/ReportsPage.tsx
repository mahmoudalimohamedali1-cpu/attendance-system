/**
 * Reports Page - Comprehensive Reports Library
 * Connected to actual backend APIs (22 working reports)
 */

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  CircularProgress,
  Alert,
  Tab,
  Tabs,
  TextField,
  InputAdornment,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Skeleton,
} from '@mui/material';
import {
  Search,
  Close,
  PictureAsPdf,
  TableChart,
  FilterList,
  Download,
  Refresh,
  Category,
  CheckCircle,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { api } from '@/services/api.service';
import { API_CONFIG } from '@/config/api';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/ar';
import { useAuthStore } from '@/store/auth.store';
import {
  REPORTS,
  REPORT_CATEGORIES,
  ReportCategory,
  ReportDefinition,
  getReportsByAccessLevel,
} from './reportDefinitions';
import { ReportCard } from './components/ReportCard';

// Theme colors
const MODERN_THEME = {
  bg: '#faf8f5',
  peach: '#ffe4d6',
  cream: '#fff8f0',
  orange: '#ff8c5a',
  textPrimary: '#2d3436',
  textSecondary: '#636e72',
  border: '#f0ebe5',
};

// Mapping between report IDs and export types for the backend
const EXPORT_TYPE_MAPPING: Record<string, string> = {
  'daily-attendance': 'attendance',
  'late-detailed': 'late',
  'absence': 'attendance',
  'early-leave': 'attendance',
  'overtime': 'attendance',
  'wfh': 'attendance',
  'branch-summary': 'attendance',
  'department-summary': 'attendance',
  'compliance': 'attendance',
  'suspicious': 'attendance',
  'payroll-summary': 'payroll',
  'gosi': 'payroll',
  'advances': 'payroll',
  'employee-list': 'employee',
  'leave-balance': 'attendance',
  'leave-requests': 'attendance',
  'custody-inventory': 'attendance',
};

export const ReportsPage = () => {
  const { user } = useAuthStore();
  const userRole = user?.role || 'EMPLOYEE';
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReport, setSelectedReport] = useState<ReportDefinition | null>(null);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [startDate, setStartDate] = useState<Dayjs | null>(() => dayjs().startOf('month'));
  const [endDate, setEndDate] = useState<Dayjs | null>(() => dayjs());
  const [exportLoading, setExportLoading] = useState<string | null>(null);

  const startDateStr = startDate?.format('YYYY-MM-DD') || '';
  const endDateStr = endDate?.format('YYYY-MM-DD') || '';

  // Filter reports based on user role, category, and search
  const filteredReports = useMemo(() => {
    let reports = getReportsByAccessLevel('ALL', userRole);

    if (selectedCategory !== 'all') {
      reports = reports.filter(r => r.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      reports = reports.filter(r =>
        r.name.includes(query) ||
        r.nameEn.toLowerCase().includes(query) ||
        r.description.includes(query)
      );
    }

    return reports;
  }, [userRole, selectedCategory, searchQuery]);

  // Get report counts by category
  const categoryCounts = useMemo(() => {
    const accessibleReports = getReportsByAccessLevel('ALL', userRole);
    const counts: Record<string, number> = { all: accessibleReports.length };
    Object.keys(REPORT_CATEGORIES).forEach(cat => {
      counts[cat] = accessibleReports.filter(r => r.category === cat).length;
    });
    return counts;
  }, [userRole]);

  // Fetch report data when dialog is open
  const {
    data: reportData,
    isLoading: reportLoading,
    error: reportError,
    refetch: refetchReport,
  } = useQuery({
    queryKey: ['report-data', selectedReport?.id, startDateStr, endDateStr],
    queryFn: async () => {
      if (!selectedReport) return null;
      const response = await api.get(selectedReport.apiEndpoint, {
        params: { startDate: startDateStr, endDate: endDateStr, limit: 100 },
      });
      return response.data;
    },
    enabled: !!selectedReport && reportDialogOpen,
    staleTime: 30000,
  });

  // Handler for viewing a report
  const handleViewReport = (report: ReportDefinition) => {
    setSelectedReport(report);
    setReportDialogOpen(true);
  };

  // Handler for exporting PDF
  const handleExportPdf = async (report: ReportDefinition) => {
    const exportType = EXPORT_TYPE_MAPPING[report.id] || 'attendance';
    setExportLoading('pdf');
    try {
      const response = await fetch(
        `${API_CONFIG.BASE_URL}/reports/export/pdf/${exportType}?startDate=${startDateStr}&endDate=${endDateStr}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          },
        }
      );
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.id}-${startDateStr}-${endDateStr}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF Export failed:', err);
      alert('فشل تصدير PDF');
    } finally {
      setExportLoading(null);
    }
  };

  // Handler for exporting Excel
  const handleExportExcel = async (report: ReportDefinition) => {
    const exportType = EXPORT_TYPE_MAPPING[report.id] || 'attendance';
    setExportLoading('excel');
    try {
      const response = await fetch(
        `${API_CONFIG.BASE_URL}/reports/export/excel/${exportType}?startDate=${startDateStr}&endDate=${endDateStr}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          },
        }
      );
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.id}-${startDateStr}-${endDateStr}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Excel Export failed:', err);
      alert('فشل تصدير Excel');
    } finally {
      setExportLoading(null);
    }
  };

  // Render report data as table
  const renderReportData = () => {
    if (reportLoading) {
      return (
        <Box sx={{ p: 4 }}>
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} height={50} sx={{ mb: 1 }} />
          ))}
        </Box>
      );
    }

    if (reportError) {
      return (
        <Alert severity="error" sx={{ m: 2 }}>
          حدث خطأ في جلب البيانات. يرجى المحاولة مرة أخرى.
        </Alert>
      );
    }

    if (!reportData) {
      return (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography color="text.secondary">لا توجد بيانات</Typography>
        </Box>
      );
    }

    // Extract data array from response (handle different response formats)
    const dataArray = reportData.data || reportData.attendances || reportData || [];
    const summary = reportData.summary || reportData.stats || {};
    const metadata = reportData.metadata || {};

    if (!Array.isArray(dataArray) || dataArray.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography color="text.secondary">لا توجد بيانات للفترة المحددة</Typography>
        </Box>
      );
    }

    // Get column headers from first item
    const firstItem = dataArray[0];
    const columns = Object.keys(firstItem).filter(key =>
      !['id', 'companyId', 'createdAt', 'updatedAt', 'userId'].includes(key) &&
      typeof firstItem[key] !== 'object'
    ).slice(0, 6);

    return (
      <Box>
        {/* Summary Section */}
        {Object.keys(summary).length > 0 && (
          <Box sx={{ mb: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
              ملخص التقرير
            </Typography>
            <Grid container spacing={2}>
              {Object.entries(summary).slice(0, 6).map(([key, value]) => (
                <Grid item xs={6} md={4} key={key}>
                  <Typography variant="caption" color="text.secondary">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {typeof value === 'number' ? value.toLocaleString('ar-SA') : String(value)}
                  </Typography>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* Data Table */}
        <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>#</TableCell>
                {columns.map(col => (
                  <TableCell key={col} sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>
                    {col.replace(/([A-Z])/g, ' $1').trim()}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {dataArray.slice(0, 50).map((row: any, index: number) => (
                <TableRow key={row.id || index} hover>
                  <TableCell>{index + 1}</TableCell>
                  {columns.map(col => (
                    <TableCell key={col}>
                      {formatCellValue(row[col])}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Metadata */}
        {metadata.totalCount && (
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              عرض {Math.min(50, dataArray.length)} من أصل {metadata.totalCount} سجل
            </Typography>
          </Box>
        )}
      </Box>
    );
  };

  // Helper function to format cell values
  const formatCellValue = (value: any): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? '✓' : '✗';
    if (value instanceof Date || (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/))) {
      try {
        return format(new Date(value), 'yyyy/MM/dd', { locale: ar });
      } catch {
        return String(value);
      }
    }
    if (typeof value === 'number') return value.toLocaleString('ar-SA');
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: MODERN_THEME.bg, p: { xs: 2, md: 4 } }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="900" color={MODERN_THEME.textPrimary} gutterBottom>
          📊 مكتبة التقارير
        </Typography>
        <Typography variant="body1" color={MODERN_THEME.textSecondary}>
          {filteredReports.length} تقرير متاح • اختر التقرير المطلوب وقم بتصديره
        </Typography>
      </Box>

      {/* Filters Bar */}
      <Card sx={{ mb: 4, borderRadius: 4, border: `1px solid ${MODERN_THEME.border}` }}>
        <CardContent sx={{ p: 3 }}>
          <Grid container spacing={3} alignItems="center">
            {/* Search */}
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="ابحث عن تقرير..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search sx={{ color: MODERN_THEME.textSecondary }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    bgcolor: 'white',
                  },
                }}
              />
            </Grid>

            {/* Date Range */}
            <Grid item xs={12} md={8}>
              <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ar">
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                  <DatePicker
                    label="من تاريخ"
                    value={startDate}
                    onChange={(newValue: any) => setStartDate(newValue)}
                    slotProps={{
                      textField: {
                        size: 'small',
                        sx: { bgcolor: 'white', borderRadius: 2, width: 180 },
                      },
                    }}
                    format="YYYY-MM-DD"
                  />
                  <DatePicker
                    label="إلى تاريخ"
                    value={endDate}
                    onChange={(newValue: any) => setEndDate(newValue)}
                    slotProps={{
                      textField: {
                        size: 'small',
                        sx: { bgcolor: 'white', borderRadius: 2, width: 180 },
                      },
                    }}
                    format="YYYY-MM-DD"
                  />
                  <Chip
                    label={userRole === 'ADMIN' ? 'صلاحيات كاملة' : userRole === 'MANAGER' ? 'صلاحيات المدير' : 'صلاحيات الموظف'}
                    color={userRole === 'ADMIN' ? 'error' : userRole === 'MANAGER' ? 'warning' : 'success'}
                    sx={{ fontWeight: 600 }}
                  />
                </Box>
              </LocalizationProvider>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Category Tabs */}
      <Paper
        sx={{
          mb: 4,
          borderRadius: 4,
          overflow: 'hidden',
          border: `1px solid ${MODERN_THEME.border}`,
        }}
      >
        <Tabs
          value={selectedCategory}
          onChange={(_, val) => setSelectedCategory(val)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            bgcolor: 'white',
            '& .MuiTab-root': {
              minHeight: 70,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: 14,
            },
            '& .Mui-selected': {
              color: `${MODERN_THEME.orange} !important`,
            },
            '& .MuiTabs-indicator': {
              bgcolor: MODERN_THEME.orange,
              height: 3,
            },
          }}
        >
          <Tab
            value="all"
            label={
              <Box sx={{ textAlign: 'center' }}>
                <Category sx={{ fontSize: 28, mb: 0.5 }} />
                <Typography variant="body2" fontWeight="bold">
                  جميع التقارير
                </Typography>
                <Chip label={categoryCounts.all} size="small" sx={{ mt: 0.5, height: 20 }} />
              </Box>
            }
          />
          {Object.entries(REPORT_CATEGORIES).map(([key, category]) => {
            const CategoryIcon = category.icon;
            return (
              <Tab
                key={key}
                value={key}
                label={
                  <Box sx={{ textAlign: 'center' }}>
                    <CategoryIcon sx={{ fontSize: 28, mb: 0.5, color: category.color }} />
                    <Typography variant="body2" fontWeight="bold">
                      {category.name}
                    </Typography>
                    <Chip
                      label={categoryCounts[key] || 0}
                      size="small"
                      sx={{ mt: 0.5, height: 20, bgcolor: `${category.color}20`, color: category.color }}
                    />
                  </Box>
                }
              />
            );
          })}
        </Tabs>
      </Paper>

      {/* Reports Grid */}
      {filteredReports.length > 0 ? (
        <Grid container spacing={3}>
          {filteredReports.map((report) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={report.id}>
              <ReportCard
                report={report}
                onView={handleViewReport}
                onExportPdf={handleExportPdf}
                onExportExcel={handleExportExcel}
              />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Box
          sx={{
            textAlign: 'center',
            py: 10,
            bgcolor: 'white',
            borderRadius: 4,
            border: `1px solid ${MODERN_THEME.border}`,
          }}
        >
          <Search sx={{ fontSize: 60, color: MODERN_THEME.textSecondary, mb: 2 }} />
          <Typography variant="h6" color={MODERN_THEME.textSecondary}>
            لم يتم العثور على تقارير
          </Typography>
          <Typography variant="body2" color={MODERN_THEME.textSecondary}>
            جرب تغيير كلمة البحث أو التصنيف
          </Typography>
        </Box>
      )}

      {/* Report Preview Dialog */}
      <Dialog
        open={reportDialogOpen}
        onClose={() => setReportDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        {selectedReport && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    sx={{
                      width: 50,
                      height: 50,
                      borderRadius: 3,
                      bgcolor: `${selectedReport.color}15`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <selectedReport.icon sx={{ fontSize: 28, color: selectedReport.color }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" fontWeight="bold">
                      {selectedReport.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedReport.description}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <IconButton onClick={() => refetchReport()} size="small" title="تحديث">
                    <Refresh />
                  </IconButton>
                  <IconButton onClick={() => setReportDialogOpen(false)}>
                    <Close />
                  </IconButton>
                </Box>
              </Box>
            </DialogTitle>
            <Divider />
            <DialogContent sx={{ minHeight: 400, p: 3 }}>
              {/* Date Range Info */}
              <Box sx={{ mb: 2, p: 2, bgcolor: '#e3f2fd', borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2">
                  📅 الفترة: {startDateStr} إلى {endDateStr}
                </Typography>
                <Chip
                  label={reportLoading ? 'جاري التحميل...' : reportError ? 'خطأ' : 'جاهز'}
                  color={reportLoading ? 'default' : reportError ? 'error' : 'success'}
                  size="small"
                  icon={reportLoading ? <CircularProgress size={14} /> : reportError ? <ErrorIcon /> : <CheckCircle />}
                />
              </Box>

              {/* Report Data */}
              {renderReportData()}
            </DialogContent>
            <Divider />
            <DialogActions sx={{ p: 2, gap: 1 }}>
              {selectedReport.exportFormats.includes('pdf') && (
                <Button
                  variant="contained"
                  startIcon={exportLoading === 'pdf' ? <CircularProgress size={16} color="inherit" /> : <PictureAsPdf />}
                  onClick={() => handleExportPdf(selectedReport)}
                  disabled={!!exportLoading}
                  sx={{ bgcolor: '#f44336', '&:hover': { bgcolor: '#d32f2f' } }}
                >
                  تصدير PDF
                </Button>
              )}
              {selectedReport.exportFormats.includes('excel') && (
                <Button
                  variant="contained"
                  startIcon={exportLoading === 'excel' ? <CircularProgress size={16} color="inherit" /> : <TableChart />}
                  onClick={() => handleExportExcel(selectedReport)}
                  disabled={!!exportLoading}
                  sx={{ bgcolor: '#4caf50', '&:hover': { bgcolor: '#388e3c' } }}
                >
                  تصدير Excel
                </Button>
              )}
              <Button variant="outlined" onClick={() => setReportDialogOpen(false)}>
                إغلاق
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Statistics Footer */}
      <Box sx={{ mt: 6, textAlign: 'center' }}>
        <Typography variant="body2" color={MODERN_THEME.textSecondary}>
          مكتبة التقارير تحتوي على {REPORTS.length} تقرير • تم تنظيمها في {Object.keys(REPORT_CATEGORIES).length} تصنيفات
        </Typography>
      </Box>
    </Box>
  );
};

export default ReportsPage;
