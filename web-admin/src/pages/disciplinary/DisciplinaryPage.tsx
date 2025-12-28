import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Avatar,
    CircularProgress,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    Grid,
    IconButton,
    Tooltip,
    Tabs,
    Tab,
    Divider,
    Paper,
} from '@mui/material';
import {
    Visibility,
    Security,
    Add,
    Inbox,
    SupervisorAccount,
    Person,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { disciplinaryService } from '@/services/disciplinary.service';
import { Timeline } from './components/Timeline';
import { Countdown } from './components/Countdown';

export const DisciplinaryPage = () => {
    const queryClient = useQueryClient();
    const [tabValue, setTabValue] = useState(0);
    const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
    const [openDetailDialog, setOpenDetailDialog] = useState(false);

    // Tab roles: 0=HR Inbox, 1=Manager Inbox, 2=Employee Inbox
    const roleMap: any = { 0: 'HR', 1: 'MANAGER', 2: 'EMPLOYEE' };
    const currentRole = roleMap[tabValue];

    const { data: inboxData, isLoading } = useQuery<any>({
        queryKey: ['disciplinary-inbox', currentRole],
        queryFn: () => disciplinaryService.getInbox(currentRole),
    });

    const { data: selectedCase, isLoading: isCaseLoading } = useQuery<any>({
        queryKey: ['disciplinary-case', selectedCaseId],
        queryFn: () => disciplinaryService.getCase(selectedCaseId!),
        enabled: !!selectedCaseId && openDetailDialog,
    });

    const handleOpenDetail = (id: string) => {
        setSelectedCaseId(id);
        setOpenDetailDialog(true);
    };

    const statusColors: any = {
        SUBMITTED_TO_HR: 'warning',
        HR_REJECTED: 'error',
        OFFICIAL_INVESTIGATION_OPENED: 'primary',
        HEARING_SCHEDULED: 'info',
        DECISION_ISSUED: 'secondary',
        OBJECTION_PERIOD_CLOSED: 'warning',
        FINALIZED: 'success',
        CANCELLED: 'default',
    };

    const statusLabels: any = {
        SUBMITTED_TO_HR: 'قيد المراجعة الأولية',
        HR_REJECTED: 'مرفوض من HR',
        OFFICIAL_INVESTIGATION_OPENED: 'تحقيق رسمي مفتوح',
        HEARING_SCHEDULED: 'تم تحديد موعد جلسة',
        DECISION_ISSUED: 'صدر القرار',
        OBJECTION_PERIOD_CLOSED: 'انتهت فترة الاعتراض',
        FINALIZED: 'مكتمل ومرحل',
        CANCELLED: 'ملغى',
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4" fontWeight="bold">
                        الجزاءات والتحقيقات الإدارية
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        إدارة طلبات التحقيق، الجلسات، والقرارات التأديبية
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => { }}
                    sx={{ borderRadius: 2 }}
                >
                    طلب تحقيق جديد
                </Button>
            </Box>

            <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
                        <Tab icon={<SupervisorAccount />} iconPosition="start" label="صندوق HR" />
                        <Tab icon={<Inbox />} iconPosition="start" label="طلباتي كمدير" />
                        <Tab icon={<Person />} iconPosition="start" label="صندوق الموظف" />
                    </Tabs>
                </Box>

                <CardContent>
                    {isLoading ? (
                        <Box display="flex" justifyContent="center" py={8}>
                            <CircularProgress size={40} />
                        </Box>
                    ) : (
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>كود الحالة</TableCell>
                                        <TableCell>الموظف</TableCell>
                                        <TableCell>العنوان / نوع المخالفة</TableCell>
                                        <TableCell>تاريخ الواقعة</TableCell>
                                        <TableCell>المرحلة الحالية</TableCell>
                                        <TableCell>الحالة</TableCell>
                                        <TableCell align="center">الإجراءات</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {inboxData?.map((item: any) => (
                                        <TableRow key={item.id} hover>
                                            <TableCell sx={{ fontWeight: 'bold' }}>{item.caseCode}</TableCell>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 14 }}>
                                                        {item.employee?.firstName?.[0]}
                                                    </Avatar>
                                                    <Typography variant="body2">
                                                        {item.employee?.firstName} {item.employee?.lastName}
                                                    </Typography>
                                                </Box>
                                            </TableCell>
                                            <TableCell>{item.title}</TableCell>
                                            <TableCell>{format(new Date(item.incidentDate), 'dd/MM/yyyy')}</TableCell>
                                            <TableCell>
                                                <Chip label={item.stage} size="small" variant="outlined" color="primary" />
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={statusLabels[item.status] || item.status}
                                                    color={statusColors[item.status] || 'default'}
                                                    size="small"
                                                />
                                            </TableCell>
                                            <TableCell align="center">
                                                <Tooltip title="فتح التفاصيل">
                                                    <IconButton onClick={() => handleOpenDetail(item.id)}>
                                                        <Visibility color="primary" />
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {(!inboxData || inboxData.length === 0) && (
                                        <TableRow>
                                            <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                                                <Typography color="text.secondary">لا توجد حالات حالياً</Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </CardContent>
            </Card>

            {/* Detail Dialog */}
            <Dialog
                open={openDetailDialog}
                onClose={() => setOpenDetailDialog(false)}
                maxWidth="lg"
                fullWidth
                PaperProps={{ sx: { borderRadius: 3 } }}
            >
                <DialogTitle sx={{ borderBottom: '1px solid', borderColor: 'divider', pb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Security color="primary" />
                            <Typography variant="h6">تفاصيل الحالة: {(selectedCase as any)?.caseCode}</Typography>
                            {(selectedCase as any)?.isRetrospective && (
                                <Chip label="رصد بأثر رجعي" color="error" size="small" sx={{ ml: 1 }} />
                            )}
                        </Box>
                        {selectedCase && (
                            <Chip
                                label={statusLabels[(selectedCase as any).status] || (selectedCase as any).status || ''}
                                color={statusColors[(selectedCase as any).status] || 'default'}
                            />
                        )}
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ p: 0 }}>
                    {isCaseLoading ? (
                        <Box display="flex" justifyContent="center" py={8}>
                            <CircularProgress />
                        </Box>
                    ) : selectedCase && (
                        <Grid container>
                            <Grid item xs={12} md={8} sx={{ p: 3, borderRight: '1px solid', borderColor: 'divider' }}>
                                <Box sx={{ mb: 4 }}>
                                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>وصف الواقعة</Typography>
                                    <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                                        <Typography variant="body2">{(selectedCase as any).description}</Typography>
                                    </Paper>
                                </Box>

                                <Timeline events={(selectedCase as any).events} />
                            </Grid>

                            <Grid item xs={12} md={4} sx={{ p: 3, bgcolor: 'grey.50' }}>
                                <Box sx={{ mb: 3 }}>
                                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>الموظف المعني</Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                        <Avatar sx={{ width: 48, height: 48, bgcolor: 'primary.main' }}>
                                            {(selectedCase as any).employee?.firstName?.[0]}
                                        </Avatar>
                                        <Box>
                                            <Typography fontWeight="bold">{(selectedCase as any).employee?.firstName} {(selectedCase as any).employee?.lastName}</Typography>
                                            <Typography variant="caption" color="text.secondary">{(selectedCase as any).employee?.jobTitle}</Typography>
                                        </Box>
                                    </Box>
                                </Box>

                                <Box sx={{ mb: 4 }}>
                                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>المدير مقدم الطلب</Typography>
                                    <Typography variant="body2" fontWeight="medium">
                                        {(selectedCase as any).manager?.firstName} {(selectedCase as any).manager?.lastName}
                                    </Typography>
                                </Box>

                                <Divider sx={{ my: 2 }} />

                                {/* Deadlines / Countdowns */}
                                {(selectedCase as any).status === 'OFFICIAL_INVESTIGATION_OPENED' && (
                                    <Box sx={{ mb: 2 }}>
                                        <Countdown
                                            deadline={new Date(new Date((selectedCase as any).officialInvestigationOpenedAt).getTime() + (selectedCase as any).decisionDeadlineDaysSnapshot * 24 * 60 * 60 * 1000)}
                                            title="الموعد النهائي لصدور القرار"
                                            totalDays={(selectedCase as any).decisionDeadlineDaysSnapshot}
                                        />
                                    </Box>
                                )}

                                {/* Actions Section based on Role & Status */}
                                <Box sx={{ mt: 4 }}>
                                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>الإجراءات المتاحة</Typography>

                                    {/* Legal Hold Toggle (HR only, before finalization) */}
                                    {currentRole === 'HR' && !(selectedCase as any).finalizedAt && (
                                        <Box sx={{ mb: 2 }}>
                                            <Alert
                                                severity={(selectedCase as any).legalHold ? "error" : "info"}
                                                action={
                                                    <Button
                                                        color="inherit"
                                                        size="small"
                                                        onClick={() => {
                                                            const hold = !(selectedCase as any).legalHold;
                                                            disciplinaryService.toggleLegalHold((selectedCase as any).id, hold)
                                                                .then(() => queryClient.invalidateQueries({ queryKey: ['disciplinary-case', (selectedCase as any).id] }));
                                                        }}
                                                    >
                                                        {(selectedCase as any).legalHold ? "رفع الحجز" : "تفعيل الحجز"}
                                                    </Button>
                                                }
                                                sx={{ borderRadius: 2 }}
                                            >
                                                {(selectedCase as any).legalHold ? "القضية تحت الحجز القانوني (Legal Hold). لا يمكن الاعتماد النهائي حالياً." : "القضية تسير بشكل طبيعي."}
                                            </Alert>
                                        </Box>
                                    )}

                                    {currentRole === 'HR' && (selectedCase as any).status === 'SUBMITTED_TO_HR' && (
                                        <Button variant="contained" fullWidth sx={{ mb: 1 }}>مراجعة HR الأولية</Button>
                                    )}

                                    {currentRole === 'HR' && (selectedCase as any).status === 'OFFICIAL_INVESTIGATION_OPENED' && (
                                        <Button variant="contained" color="secondary" fullWidth sx={{ mb: 1 }}>إصدار قرار نهائي</Button>
                                    )}

                                    {currentRole === 'HR' && (selectedCase as any).status === 'DECISION_ISSUED' && !(selectedCase as any).finalizedAt && (
                                        <Button
                                            variant="contained"
                                            color="success"
                                            fullWidth
                                            disabled={(selectedCase as any).legalHold}
                                            onClick={() => {
                                                disciplinaryService.finalizeCase((selectedCase as any).id)
                                                    .then(() => queryClient.invalidateQueries({ queryKey: ['disciplinary-case', (selectedCase as any).id] }));
                                            }}
                                            sx={{ mb: 1 }}
                                        >
                                            الاعتماد والترحيل النهائي
                                        </Button>
                                    )}

                                    <Button variant="outlined" fullWidth onClick={() => setOpenDetailDialog(false)}>إغلاق</Button>
                                </Box>
                            </Grid>
                        </Grid>
                    )}
                </DialogContent>
            </Dialog>
        </Box>
    );
};
