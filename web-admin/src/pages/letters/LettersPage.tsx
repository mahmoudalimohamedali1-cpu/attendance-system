import { useState } from 'react';
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
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
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
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { api } from '@/services/api.service';

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
  approverNotes: string | null;
  createdAt: string;
  attachments?: Attachment[];
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    jobTitle: string;
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
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [tabValue, setTabValue] = useState(0);
  const [selectedLetter, setSelectedLetter] = useState<LetterRequest | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [approvalNote, setApprovalNote] = useState('');

  const statusFilter = tabValue === 0 ? 'PENDING' : tabValue === 1 ? 'APPROVED' : 'REJECTED';

  const { data, isLoading, error } = useQuery<LettersResponse>({
    queryKey: ['letters', page, rowsPerPage, statusFilter],
    queryFn: () =>
      api.get(`/letters/pending/all?page=${page + 1}&limit=${rowsPerPage}&status=${statusFilter}`),
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      api.patch(`/letters/${id}/approve`, { notes }),
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

  const handleOpenDialog = (letter: LetterRequest) => {
    setSelectedLetter(letter);
    setApprovalNote('');
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedLetter(null);
    setApprovalNote('');
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'REQUEST': return 'طلب';
      case 'COMPLAINT': return 'شكوى';
      case 'CERTIFICATION': return 'تصديق';
      default: return type;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING': return 'قيد المراجعة';
      case 'APPROVED': return 'موافق عليها';
      case 'REJECTED': return 'مرفوضة';
      case 'CANCELLED': return 'ملغاة';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'warning';
      case 'APPROVED': return 'success';
      case 'REJECTED': return 'error';
      case 'CANCELLED': return 'default';
      default: return 'default';
    }
  };

  const letters = data?.data || [];
  const total = data?.pagination?.total || 0;

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
          <Tabs value={tabValue} onChange={(_, v) => { setTabValue(v); setPage(0); }}>
            <Tab
              icon={<HourglassEmpty />}
              iconPosition="start"
              label="قيد المراجعة"
            />
            <Tab
              icon={<CheckCircle />}
              iconPosition="start"
              label="موافق عليها"
            />
            <Tab
              icon={<Cancel />}
              iconPosition="start"
              label="مرفوضة"
            />
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
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>الموظف</TableCell>
                      <TableCell>نوع الخطاب</TableCell>
                      <TableCell>الملاحظات</TableCell>
                      <TableCell>الحالة</TableCell>
                      <TableCell>تاريخ الطلب</TableCell>
                      <TableCell>المرفقات</TableCell>
                      <TableCell align="center">الإجراءات</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {letters.map((letter) => (
                      <TableRow key={letter.id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar sx={{ bgcolor: 'primary.main' }}>
                              {letter.user.firstName?.[0]}
                            </Avatar>
                            <Box>
                              <Typography fontWeight="bold">
                                {letter.user.firstName} {letter.user.lastName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {letter.user.jobTitle}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={getTypeLabel(letter.type)}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{
                              maxWidth: 200,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {letter.notes || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={getStatusLabel(letter.status)}
                            color={getStatusColor(letter.status) as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {format(new Date(letter.createdAt), 'dd/MM/yyyy', { locale: ar })}
                        </TableCell>
                        <TableCell>
                          {letter.attachments && letter.attachments.length > 0 ? (
                            <Chip
                              icon={<AttachFile />}
                              label={letter.attachments.length}
                              size="small"
                              color="info"
                              variant="outlined"
                            />
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
                          {letter.status === 'PENDING' && (
                            <>
                              <Tooltip title="موافق">
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
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {letters.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} align="center">
                          <Box py={4}>
                            <Description sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                            <Typography variant="h6" color="text.secondary">
                              لا توجد خطابات
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

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
                labelRowsPerPage="عدد الصفوف في الصفحة"
                labelDisplayedRows={({ from, to, count }) =>
                  `${from}-${to} من ${count !== -1 ? count : `أكثر من ${to}`}`
                }
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Letter Details Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>تفاصيل طلب الخطاب</DialogTitle>
        <DialogContent>
          {selectedLetter && (
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">الموظف</Typography>
                  <Typography>
                    {selectedLetter.user.firstName} {selectedLetter.user.lastName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {selectedLetter.user.jobTitle}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">نوع الخطاب</Typography>
                  <Typography>{getTypeLabel(selectedLetter.type)}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">الحالة</Typography>
                  <Box>
                    <Chip
                      label={getStatusLabel(selectedLetter.status)}
                      color={getStatusColor(selectedLetter.status) as any}
                      size="small"
                    />
                  </Box>
                </Grid>
                {selectedLetter.notes && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">الملاحظات</Typography>
                    <Typography>{selectedLetter.notes}</Typography>
                  </Grid>
                )}

                {selectedLetter.attachments && selectedLetter.attachments.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary" gutterBottom>
                      المرفقات
                    </Typography>
                    <List dense>
                      {selectedLetter.attachments.map((attachment, index) => (
                        <ListItem
                          key={index}
                          secondaryAction={
                            <IconButton edge="end" aria-label="download" href={`http://72.61.239.170${attachment.url}`} target="_blank">
                              <Download />
                            </IconButton>
                          }
                        >
                          <ListItemIcon>
                            {(attachment.mimeType || attachment.mimetype || '').startsWith('image/') ? (
                              <ImageIcon />
                            ) : (attachment.mimeType || attachment.mimetype) === 'application/pdf' ? (
                              <PictureAsPdf />
                            ) : (
                              <AttachFile />
                            )}
                          </ListItemIcon>
                          <ListItemText primary={attachment.originalName || attachment.filename} />
                        </ListItem>
                      ))}
                    </List>
                  </Grid>
                )}

                {selectedLetter.status === 'PENDING' && (
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="ملاحظات (اختياري)"
                      multiline
                      rows={3}
                      value={approvalNote}
                      onChange={(e) => setApprovalNote(e.target.value)}
                      placeholder="أضف ملاحظاتك هنا..."
                    />
                  </Grid>
                )}

                {selectedLetter.approverNotes && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">ملاحظات الموافق</Typography>
                    <Typography>{selectedLetter.approverNotes}</Typography>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>إغلاق</Button>
          {selectedLetter?.status === 'PENDING' && (
            <>
              <Button
                color="error"
                onClick={() => {
                  rejectMutation.mutate({
                    id: selectedLetter.id,
                    notes: approvalNote,
                  });
                }}
                disabled={rejectMutation.isPending}
              >
                رفض
              </Button>
              <Button
                color="success"
                variant="contained"
                onClick={() => {
                  approveMutation.mutate({
                    id: selectedLetter.id,
                    notes: approvalNote,
                  });
                }}
                disabled={approveMutation.isPending}
              >
                موافق
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

