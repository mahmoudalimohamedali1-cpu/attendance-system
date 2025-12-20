import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Avatar,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  Snackbar,
  Badge,
  Paper,
  Divider,
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Visibility,
  HourglassEmpty,
  ThumbUp,
  ThumbDown,
  AttachFile,
  Download,
  PictureAsPdf,
  Image as ImageIcon,
  Description,
  Inbox,
  SupervisorAccount,
  AccessTime,
  CloudUpload,
  Delete,
  Business,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { api } from '@/services/api.service';
import { API_CONFIG } from '@/config/api';

interface Attachment {
  filename: string;
  originalName: string;
  path?: string;
  url: string;
  mimetype?: string;
  mimeType?: string;
  size?: number;
}

interface LetterRequest {
  id: string;
  type: string;
  notes: string | null;
  status: string;
  currentStep?: string;
  approverNotes: string | null;
  createdAt: string;
  attachments?: Attachment[];
  hrAttachment?: Attachment;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    jobTitle?: string;
    employeeCode?: string;
    department?: { name: string };
    branch?: { name: string };
  };
  managerApprover?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface LettersResponse {
  data: LetterRequest[];
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
}

export const LettersPage = () => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [tabValue, setTabValue] = useState(0);
  const [selectedLetter, setSelectedLetter] = useState<LetterRequest | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [approvalNote, setApprovalNote] = useState('');
  const [uploadedAttachments, setUploadedAttachments] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  // Tab mapping: 0=Manager Inbox, 1=HR Inbox, 2=PENDING, 3=MGR_APPROVED, 4=APPROVED, 5=REJECTED
  const isManagerInbox = tabValue === 0;
  const isHRInbox = tabValue === 1;
  const statusFilter = tabValue === 2 ? 'PENDING' : tabValue === 3 ? 'MGR_APPROVED' : tabValue === 4 ? 'APPROVED' : 'REJECTED';

  // Manager Inbox Query
  const { data: managerInbox, isLoading: managerLoading } = useQuery<LetterRequest[]>({
    queryKey: ['letters-manager-inbox'],
    queryFn: () => api.get('/letters/inbox/manager'),
    enabled: isManagerInbox,
  });

  // HR Inbox Query
  const { data: hrInbox, isLoading: hrLoading } = useQuery<LetterRequest[]>({
    queryKey: ['letters-hr-inbox'],
    queryFn: () => api.get('/letters/inbox/hr'),
    enabled: isHRInbox,
  });

  // Regular letters query
  const { data, isLoading: regularLoading, error } = useQuery<LettersResponse>({
    queryKey: ['letters', page, rowsPerPage, statusFilter],
    queryFn: () =>
      api.get(`/letters/pending/all?page=${page + 1}&limit=${rowsPerPage}&status=${statusFilter}`),
    enabled: !isManagerInbox && !isHRInbox,
  });

  // Manager Decision Mutation
  const managerDecisionMutation = useMutation({
    mutationFn: ({ id, decision, notes }: { id: string; decision: 'APPROVED' | 'REJECTED'; notes?: string }) =>
      api.post(`/letters/${id}/manager-decision`, { decision, notes }),
    onSuccess: (_, { decision }) => {
      queryClient.invalidateQueries({ queryKey: ['letters'] });
      queryClient.invalidateQueries({ queryKey: ['letters-manager-inbox'] });
      queryClient.invalidateQueries({ queryKey: ['letters-hr-inbox'] });
      handleCloseDialog();
      setSnackbar({
        open: true,
        message: decision === 'APPROVED' ? 'تم إرسال الطلب لـ HR للموافقة النهائية وإرفاق الخطاب' : 'تم رفض الطلب',
        severity: 'success'
      });
    },
    onError: () => {
      setSnackbar({ open: true, message: 'فشل تنفيذ العملية', severity: 'error' });
    },
  });

  // HR Decision Mutation
  const hrDecisionMutation = useMutation({
    mutationFn: ({ id, decision, notes, attachments }: { id: string; decision: 'APPROVED' | 'REJECTED' | 'DELAYED'; notes?: string; attachments?: any[] }) =>
      api.post(`/letters/${id}/hr-decision`, { decision, notes, attachments }),
    onSuccess: (_, { decision }) => {
      queryClient.invalidateQueries({ queryKey: ['letters'] });
      queryClient.invalidateQueries({ queryKey: ['letters-hr-inbox'] });
      handleCloseDialog();
      const messages = {
        'APPROVED': 'تمت الموافقة على الطلب وإرفاق الخطاب',
        'REJECTED': 'تم رفض الطلب',
        'DELAYED': 'تم تأجيل الطلب',
      };
      setSnackbar({ open: true, message: messages[decision], severity: 'success' });
    },
    onError: () => {
      setSnackbar({ open: true, message: 'فشل تنفيذ العملية', severity: 'error' });
    },
  });

  // Legacy approve/reject mutations
  const approveMutation = useMutation({
    mutationFn: ({ id, notes, attachments }: { id: string; notes: string; attachments?: any[] }) =>
      api.patch(`/letters/${id}/approve`, { notes, attachments }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['letters'] });
      handleCloseDialog();
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      api.patch(`/letters/${id}/reject`, { notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['letters'] });
      handleCloseDialog();
    },
  });

  // File upload handler
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const formData = new FormData();
    Array.from(files).forEach(file => {
      formData.append('files', file);
    });

    try {
      const response = await api.postFormData<{ files: any[] }>('/letters/upload-attachments', formData);
      if (response && response.files) {
        setUploadedAttachments(prev => [...prev, ...response.files]);
        setSnackbar({ open: true, message: 'تم رفع الملفات بنجاح', severity: 'success' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'فشل رفع الملفات', severity: 'error' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleOpenDialog = (letter: LetterRequest) => {
    setSelectedLetter(letter);
    setApprovalNote('');
    setUploadedAttachments([]);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedLetter(null);
    setApprovalNote('');
    setUploadedAttachments([]);
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'CERTIFICATION': return 'شهادة';
      case 'SALARY_CERTIFICATE': return 'شهادة راتب';
      case 'EXPERIENCE_CERTIFICATE': return 'شهادة خبرة';
      case 'REQUEST': return 'طلب';
      case 'COMPLAINT': return 'شكوى';
      case 'RECOMMENDATION': return 'توصية';
      default: return type;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING': return 'قيد المراجعة';
      case 'MGR_APPROVED': return 'موافقة المدير';
      case 'MGR_REJECTED': return 'رفض المدير';
      case 'APPROVED': return 'موافق عليها';
      case 'REJECTED': return 'مرفوضة';
      case 'DELAYED': return 'مؤجل';
      case 'CANCELLED': return 'ملغاة';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'warning';
      case 'MGR_APPROVED': return 'info';
      case 'MGR_REJECTED': return 'error';
      case 'APPROVED': return 'success';
      case 'REJECTED': return 'error';
      case 'DELAYED': return 'secondary';
      case 'CANCELLED': return 'default';
      default: return 'default';
    }
  };

  // Get current data based on active tab
  const isLoading = isManagerInbox ? managerLoading : isHRInbox ? hrLoading : regularLoading;
  const letters = isManagerInbox ? (managerInbox || []) : isHRInbox ? (hrInbox || []) : (data?.data || []);
  const total = isManagerInbox || isHRInbox ? letters.length : (data?.pagination?.total || 0);

  // Render letters table
  const renderLettersTable = (lettersList: LetterRequest[], showManagerInfo = false) => (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>الموظف</TableCell>
            <TableCell>نوع الخطاب</TableCell>
            <TableCell>الملاحظات</TableCell>
            <TableCell>الحالة</TableCell>
            {showManagerInfo && <TableCell>موافقة المدير</TableCell>}
            <TableCell>تاريخ الطلب</TableCell>
            <TableCell>مرفقات</TableCell>
            <TableCell align="center">الإجراءات</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {lettersList.map((letter) => (
            <TableRow key={letter.id} hover>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'secondary.main' }}>
                    {letter.user.firstName?.[0]}
                  </Avatar>
                  <Box>
                    <Typography fontWeight="bold">
                      {letter.user.firstName} {letter.user.lastName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {letter.user.jobTitle || letter.user.email}
                    </Typography>
                  </Box>
                </Box>
              </TableCell>
              <TableCell>
                <Chip icon={<Description />} label={getTypeLabel(letter.type)} size="small" variant="outlined" />
              </TableCell>
              <TableCell>
                <Typography
                  variant="body2"
                  sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                >
                  {letter.notes || '-'}
                </Typography>
              </TableCell>
              <TableCell>
                <Chip label={getStatusLabel(letter.status)} color={getStatusColor(letter.status) as any} size="small" />
              </TableCell>
              {showManagerInfo && (
                <TableCell>
                  {letter.managerApprover ? (
                    <Typography variant="body2">
                      {letter.managerApprover.firstName} {letter.managerApprover.lastName}
                    </Typography>
                  ) : '-'}
                </TableCell>
              )}
              <TableCell>
                {format(new Date(letter.createdAt), 'dd/MM/yyyy', { locale: ar })}
              </TableCell>
              <TableCell>
                {letter.attachments && letter.attachments.length > 0 ? (
                  <Chip icon={<AttachFile />} label={letter.attachments.length} size="small" color="info" variant="outlined" />
                ) : letter.hrAttachment ? (
                  <Chip icon={<AttachFile />} label="خطاب HR" size="small" color="success" variant="outlined" />
                ) : (
                  <Typography variant="body2" color="text.secondary">-</Typography>
                )}
              </TableCell>
              <TableCell align="center">
                <Tooltip title="عرض التفاصيل">
                  <IconButton size="small" onClick={() => handleOpenDialog(letter)}>
                    <Visibility />
                  </IconButton>
                </Tooltip>
                {/* Quick actions for inbox views */}
                {isManagerInbox && (
                  <>
                    <Tooltip title="موافقة">
                      <IconButton
                        size="small"
                        color="success"
                        onClick={() => managerDecisionMutation.mutate({ id: letter.id, decision: 'APPROVED' })}
                      >
                        <ThumbUp />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="رفض">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleOpenDialog(letter)}
                      >
                        <ThumbDown />
                      </IconButton>
                    </Tooltip>
                  </>
                )}
                {isHRInbox && (
                  <>
                    <Tooltip title="موافقة نهائية وإرفاق الخطاب">
                      <IconButton
                        size="small"
                        color="success"
                        onClick={() => handleOpenDialog(letter)}
                      >
                        <ThumbUp />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="رفض">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleOpenDialog(letter)}
                      >
                        <ThumbDown />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="تأجيل">
                      <IconButton
                        size="small"
                        color="warning"
                        onClick={() => hrDecisionMutation.mutate({ id: letter.id, decision: 'DELAYED' })}
                      >
                        <AccessTime />
                      </IconButton>
                    </Tooltip>
                  </>
                )}
              </TableCell>
            </TableRow>
          ))}
          {lettersList.length === 0 && (
            <TableRow>
              <TableCell colSpan={showManagerInfo ? 9 : 8} align="center">
                <Typography color="text.secondary" py={4}>
                  لا توجد طلبات خطابات
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            إدارة الخطابات
          </Typography>
          <Typography variant="body2" color="text.secondary">
            مراجعة والموافقة على طلبات الخطابات
          </Typography>
        </Box>
      </Box>

      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={tabValue}
            onChange={(_, v) => { setTabValue(v); setPage(0); }}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab
              icon={<Badge badgeContent={managerInbox?.length || 0} color="warning"><Inbox /></Badge>}
              iconPosition="start"
              label="صندوق المدير"
            />
            <Tab
              icon={<Badge badgeContent={hrInbox?.length || 0} color="info"><SupervisorAccount /></Badge>}
              iconPosition="start"
              label="صندوق HR"
            />
            <Tab icon={<HourglassEmpty />} iconPosition="start" label="قيد المراجعة" />
            <Tab icon={<HourglassEmpty color="info" />} iconPosition="start" label="انتظار HR" />
            <Tab icon={<CheckCircle />} iconPosition="start" label="موافق عليها" />
            <Tab icon={<Cancel />} iconPosition="start" label="مرفوضة" />
          </Tabs>
        </Box>

        <CardContent>
          {isLoading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error">فشل تحميل البيانات</Alert>
          ) : (
            <>
              {/* Info banner for inbox tabs */}
              {isManagerInbox && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  هذه الطلبات تنتظر موافقتك كمدير. بعد الموافقة ستنتقل لـ HR للموافقة النهائية وإرفاق الخطاب.
                </Alert>
              )}
              {isHRInbox && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  هذه الطلبات وافق عليها المدير وتنتظر موافقتك كـ HR. <strong>يجب إرفاق الخطاب عند الموافقة.</strong>
                </Alert>
              )}

              {renderLettersTable(letters, isHRInbox)}

              {!isManagerInbox && !isHRInbox && (
                <TablePagination
                  component="div"
                  count={total}
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
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Letter Details Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">تفاصيل طلب الخطاب</Typography>
            {selectedLetter && (
              <Chip
                label={getStatusLabel(selectedLetter.status)}
                color={getStatusColor(selectedLetter.status) as any}
                size="small"
              />
            )}
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedLetter && (
            <Box sx={{ pt: 2 }}>
              {/* Employee Info Header */}
              <Paper elevation={0} sx={{ p: 2, mb: 3, bgcolor: 'secondary.50', borderRadius: 2 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ width: 64, height: 64, bgcolor: 'secondary.main', fontSize: 24 }}>
                        {selectedLetter.user.firstName?.[0]}
                      </Avatar>
                      <Box>
                        <Typography variant="h6">
                          {selectedLetter.user.firstName} {selectedLetter.user.lastName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {selectedLetter.user.jobTitle || selectedLetter.user.email}
                        </Typography>
                        {selectedLetter.user.employeeCode && (
                          <Chip
                            label={`رقم الموظف: ${selectedLetter.user.employeeCode}`}
                            size="small"
                            variant="outlined"
                            sx={{ mt: 0.5 }}
                          />
                        )}
                      </Box>
                    </Box>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: 'white' }}>
                      <Description color="secondary" />
                      <Typography variant="caption" display="block" color="text.secondary">
                        نوع الخطاب
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {getTypeLabel(selectedLetter.type)}
                      </Typography>
                    </Paper>
                  </Grid>
                  {selectedLetter.user.department && (
                    <Grid item xs={6} md={3}>
                      <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: 'white' }}>
                        <Business color="info" />
                        <Typography variant="caption" display="block" color="text.secondary">
                          القسم
                        </Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {selectedLetter.user.department.name}
                        </Typography>
                      </Paper>
                    </Grid>
                  )}
                </Grid>
              </Paper>

              <Divider sx={{ my: 2 }} />

              {/* Request Details */}
              <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2 }}>
                تفاصيل الطلب
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">نوع الخطاب</Typography>
                  <Typography>{getTypeLabel(selectedLetter.type)}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">تاريخ الطلب</Typography>
                  <Typography>
                    {format(new Date(selectedLetter.createdAt), 'dd/MM/yyyy HH:mm', { locale: ar })}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">ملاحظات الموظف</Typography>
                  <Typography>{selectedLetter.notes || 'لا توجد ملاحظات'}</Typography>
                </Grid>

                {/* Employee Attachments */}
                {selectedLetter.attachments && selectedLetter.attachments.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <AttachFile fontSize="small" />
                      مرفقات الموظف ({selectedLetter.attachments.length})
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                      {selectedLetter.attachments.map((attachment, index) => (
                        <Chip
                          key={index}
                          icon={(attachment.mimetype || attachment.mimeType || '').includes('pdf') ? <PictureAsPdf /> : <ImageIcon />}
                          label={attachment.originalName}
                          variant="outlined"
                          clickable
                          onClick={() => {
                            const relativeUrl = attachment.url || attachment.path || '';
                            const fileUrl = relativeUrl.startsWith('http') ? relativeUrl : `${API_CONFIG.FILE_BASE_URL}${relativeUrl}`;
                            window.open(fileUrl, '_blank');
                          }}
                          onDelete={() => {
                            const relativeUrl = attachment.url || attachment.path || '';
                            const fileUrl = relativeUrl.startsWith('http') ? relativeUrl : `${API_CONFIG.FILE_BASE_URL}${relativeUrl}`;
                            window.open(fileUrl, '_blank');
                          }}
                          deleteIcon={<Download />}
                          sx={{ maxWidth: 200 }}
                        />
                      ))}
                    </Box>
                  </Grid>
                )}

                {/* HR Attachment (for approved letters) */}
                {selectedLetter.hrAttachment && (
                  <Grid item xs={12}>
                    <Alert severity="success" icon={<AttachFile />}>
                      <Typography variant="subtitle2">الخطاب المرفق من HR</Typography>
                      <Chip
                        icon={<PictureAsPdf />}
                        label={selectedLetter.hrAttachment.originalName || 'خطاب HR'}
                        variant="outlined"
                        color="success"
                        clickable
                        onClick={() => {
                          const relativeUrl = selectedLetter.hrAttachment!.url || selectedLetter.hrAttachment!.path || '';
                          const fileUrl = relativeUrl.startsWith('http') ? relativeUrl : `${API_CONFIG.FILE_BASE_URL}${relativeUrl}`;
                          window.open(fileUrl, '_blank');
                        }}
                        onDelete={() => {
                          const relativeUrl = selectedLetter.hrAttachment!.url || selectedLetter.hrAttachment!.path || '';
                          const fileUrl = relativeUrl.startsWith('http') ? relativeUrl : `${API_CONFIG.FILE_BASE_URL}${relativeUrl}`;
                          window.open(fileUrl, '_blank');
                        }}
                        deleteIcon={<Download />}
                        sx={{ mt: 1 }}
                      />
                    </Alert>
                  </Grid>
                )}

                {/* HR Attachment Upload (for HR inbox) */}
                {isHRInbox && (
                  <Grid item xs={12}>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CloudUpload color="primary" />
                      إرفاق الخطاب (مطلوب للموافقة)
                    </Typography>
                    <input
                      type="file"
                      ref={fileInputRef}
                      style={{ display: 'none' }}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileUpload(e.target.files)}
                    />
                    <Button
                      variant="outlined"
                      startIcon={isUploading ? <CircularProgress size={16} /> : <CloudUpload />}
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      sx={{ mb: 1 }}
                    >
                      {isUploading ? 'جاري الرفع...' : 'رفع ملف الخطاب'}
                    </Button>

                    {/* Uploaded files display */}
                    {uploadedAttachments.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        {uploadedAttachments.map((file, index) => (
                          <Chip
                            key={index}
                            icon={<PictureAsPdf />}
                            label={file.originalName}
                            variant="outlined"
                            color="success"
                            onDelete={() => setUploadedAttachments(prev => prev.filter((_, i) => i !== index))}
                            deleteIcon={<Delete />}
                            sx={{ mr: 1, mb: 1 }}
                          />
                        ))}
                      </Box>
                    )}
                  </Grid>
                )}

                {/* Approval Notes Input */}
                {(isManagerInbox || isHRInbox || selectedLetter.status === 'PENDING') && (
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="ملاحظات (اختياري)"
                      value={approvalNote}
                      onChange={(e) => setApprovalNote(e.target.value)}
                      multiline
                      rows={2}
                    />
                  </Grid>
                )}

                {selectedLetter.approverNotes && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">ملاحظات المراجعة</Typography>
                    <Typography>{selectedLetter.approverNotes}</Typography>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>إغلاق</Button>

          {/* Manager Decision Buttons */}
          {isManagerInbox && selectedLetter && (
            <>
              <Button
                color="error"
                onClick={() => managerDecisionMutation.mutate({
                  id: selectedLetter.id,
                  decision: 'REJECTED',
                  notes: approvalNote
                })}
                disabled={managerDecisionMutation.isPending}
              >
                رفض
              </Button>
              <Button
                variant="contained"
                color="success"
                onClick={() => managerDecisionMutation.mutate({
                  id: selectedLetter.id,
                  decision: 'APPROVED',
                  notes: approvalNote
                })}
                disabled={managerDecisionMutation.isPending}
              >
                موافقة وإرسال لـ HR
              </Button>
            </>
          )}

          {/* HR Decision Buttons */}
          {isHRInbox && selectedLetter && (
            <>
              <Button
                color="error"
                onClick={() => hrDecisionMutation.mutate({
                  id: selectedLetter.id,
                  decision: 'REJECTED',
                  notes: approvalNote
                })}
                disabled={hrDecisionMutation.isPending}
              >
                رفض
              </Button>
              <Button
                color="warning"
                onClick={() => hrDecisionMutation.mutate({
                  id: selectedLetter.id,
                  decision: 'DELAYED',
                  notes: approvalNote
                })}
                disabled={hrDecisionMutation.isPending}
              >
                تأجيل
              </Button>
              <Button
                variant="contained"
                color="success"
                onClick={() => hrDecisionMutation.mutate({
                  id: selectedLetter.id,
                  decision: 'APPROVED',
                  notes: approvalNote,
                  attachments: uploadedAttachments
                })}
                disabled={hrDecisionMutation.isPending || uploadedAttachments.length === 0}
              >
                موافقة وإرفاق الخطاب
              </Button>
            </>
          )}

          {/* Legacy buttons for general view */}
          {!isManagerInbox && !isHRInbox && selectedLetter?.status === 'PENDING' && (
            <>
              <Button
                color="error"
                onClick={() => rejectMutation.mutate({ id: selectedLetter.id, notes: approvalNote })}
                disabled={rejectMutation.isPending}
              >
                رفض
              </Button>
              <Button
                variant="contained"
                color="success"
                onClick={() => approveMutation.mutate({ id: selectedLetter.id, notes: approvalNote })}
                disabled={approveMutation.isPending}
              >
                موافقة
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};
