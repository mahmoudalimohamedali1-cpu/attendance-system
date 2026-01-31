/**
 * Reports Page - Comprehensive Reports Library
 * 70 Reports organized by category
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
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
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
  getReportsByCategory,
  getReportsByAccessLevel,
  searchReports,
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

export const ReportsPage = () => {
  const { user } = useAuthStore();
  const userRole = user?.role || 'EMPLOYEE';
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReport, setSelectedReport] = useState<ReportDefinition | null>(null);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [startDate, setStartDate] = useState<Dayjs | null>(() => dayjs().startOf('month'));
  const [endDate, setEndDate] = useState<Dayjs | null>(() => dayjs());

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

  // Handler for viewing a report
  const handleViewReport = (report: ReportDefinition) => {
    setSelectedReport(report);
    setReportDialogOpen(true);
  };

  // Handler for exporting PDF
  const handleExportPdf = async (report: ReportDefinition) => {
    try {
      const response = await fetch(
        `${API_CONFIG.BASE_URL}${report.apiEndpoint}/pdf?startDate=${startDateStr}&endDate=${endDateStr}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          },
        }
      );
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.id}-${startDateStr}-${endDateStr}.pdf`;
      a.click();
    } catch (err) {
      console.error('PDF Export failed:', err);
    }
  };

  // Handler for exporting Excel
  const handleExportExcel = async (report: ReportDefinition) => {
    try {
      const response = await fetch(
        `${API_CONFIG.BASE_URL}${report.apiEndpoint}/excel?startDate=${startDateStr}&endDate=${endDateStr}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          },
        }
      );
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.id}-${startDateStr}-${endDateStr}.xlsx`;
      a.click();
    } catch (err) {
      console.error('Excel Export failed:', err);
    }
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
                <IconButton onClick={() => setReportDialogOpen(false)}>
                  <Close />
                </IconButton>
              </Box>
            </DialogTitle>
            <Divider />
            <DialogContent sx={{ minHeight: 400, p: 4 }}>
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <CircularProgress size={40} sx={{ color: selectedReport.color, mb: 3 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  جاري تحميل بيانات التقرير...
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  الفترة: {startDateStr} إلى {endDateStr}
                </Typography>
                <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 2 }}>
                  API: {selectedReport.apiEndpoint}
                </Typography>
              </Box>
            </DialogContent>
            <Divider />
            <DialogActions sx={{ p: 2, gap: 1 }}>
              {selectedReport.exportFormats.includes('pdf') && (
                <Button
                  variant="contained"
                  startIcon={<PictureAsPdf />}
                  onClick={() => handleExportPdf(selectedReport)}
                  sx={{ bgcolor: '#f44336', '&:hover': { bgcolor: '#d32f2f' } }}
                >
                  تصدير PDF
                </Button>
              )}
              {selectedReport.exportFormats.includes('excel') && (
                <Button
                  variant="contained"
                  startIcon={<TableChart />}
                  onClick={() => handleExportExcel(selectedReport)}
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
