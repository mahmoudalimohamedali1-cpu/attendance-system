import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Tabs,
    Tab,
    Button,
    Chip,
    CircularProgress,
    Alert,
    Grid,
    Divider,
    Avatar,
    IconButton,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    ListItemSecondaryAction,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Paper,
} from '@mui/material';
import {
    ArrowBack,
    Person,
    CalendarMonth,
    LocationOn,
    Description,
    AttachFile,
    Schedule,
    Gavel,
    Timeline as TimelineIcon,
    Download,
    Upload,
    Add,
    Lock,
    LockOpen,
    Check,
    Close,
    Refresh,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { disciplinaryService } from '@/services/disciplinary.service';
import { Timeline } from './components/Timeline';
import { Countdown } from './components/Countdown';
import { IssueDecisionDialog } from './components/IssueDecisionDialog';
import { HRReviewDialog } from './components/HRReviewDialog';

// Status configurations
const STATUS_CONFIG: Record<string, { label: string; color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' }> = {
    SUBMITTED_TO_HR: { label: 'مرفوعة للـ HR', color: 'info' },
    HR_REJECTED: { label: 'مرفوض من HR', color: 'error' },
    HR_INFORMAL_SENT: { label: 'لفت نظر/إنذار مرسل', color: 'warning' },
    AWAITING_EMPLOYEE_INFORMAL: { label: 'انتظار رد غير رسمي', color: 'info' },
    EMPLOYEE_REJECTED_INFORMAL: { label: 'موظف رفض الإجراء', color: 'error' },
    OFFICIAL_INVESTIGATION_OPENED: { label: 'تحقيق رسمي', color: 'warning' },
    HEARING_SCHEDULED: { label: 'جلسة محددة', color: 'warning' },
    INVESTIGATION_IN_PROGRESS: { label: 'تحقيق جاري', color: 'warning' },
    AWAITING_HR_DECISION: { label: 'في انتظار قرار', color: 'secondary' },
    DECISION_ISSUED: { label: 'صدر قرار', color: 'primary' },
    AWAITING_EMPLOYEE_ACK: { label: 'في انتظار الموظف', color: 'info' },
    EMPLOYEE_OBJECTED: { label: 'اعتراض', color: 'error' },
    HR_REVIEWING_OBJECTION: { label: 'مراجعة اعتراض', color: 'error' },
    FINALIZED_APPROVED: { label: 'معتمدة', color: 'success' },
    FINALIZED_CANCELLED: { label: 'ملغاة', color: 'default' },
    FINALIZED_CONTINUE_INVESTIGATION: { label: 'استمرار التحقيق', color: 'warning' },
};

type DetailTab = 'overview' | 'attachments' | 'hearings' | 'decision' | 'timeline';

export const DisciplinaryCaseDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuthStore();

    // Role-based access: ADMIN (or future HR role) can take HR actions
    const isHR = ['ADMIN', 'HR'].includes(user?.role ?? '');
    const isEmployee = user?.role === 'EMPLOYEE';

    const [activeTab, setActiveTab] = useState<DetailTab>('overview');
    const [showDecisionDialog, setShowDecisionDialog] = useState(false);
    const [showScheduleDialog, setShowScheduleDialog] = useState(false);
    const [showObjectionDialog, setShowObjectionDialog] = useState(false);
    const [showHRReviewDialog, setShowHRReviewDialog] = useState(false);
    const [showEmployeeResponseDialog, setShowEmployeeResponseDialog] = useState(false);
    const [employeeResponseType, setEmployeeResponseType] = useState<'informal' | 'decision'>('informal');
    const [employeeResponseAction, setEmployeeResponseAction] = useState<'ACCEPT' | 'REJECT' | 'OBJECT'>('ACCEPT');
    const [employeeResponseText, setEmployeeResponseText] = useState('');

    // Schedule hearing form
    const [hearingForm, setHearingForm] = useState({
        hearingDatetime: '',
        hearingLocation: '',
    });

    // Fetch case details
    const { data: caseData, isLoading, error, refetch } = useQuery({
        queryKey: ['disciplinary-case', id],
        queryFn: () => disciplinaryService.getCase(id!),
        enabled: !!id,
    });

    // Schedule hearing mutation
    const scheduleHearingMutation = useMutation({
        mutationFn: (data: { hearingDatetime: string; hearingLocation: string }) =>
            disciplinaryService.scheduleHearing(id!, data),
        onSuccess: () => {
            refetch();
            setShowScheduleDialog(false);
            setHearingForm({ hearingDatetime: '', hearingLocation: '' });
        },
    });

    // Toggle legal hold mutation
    const toggleHoldMutation = useMutation({
        mutationFn: (hold: boolean) => disciplinaryService.toggleLegalHold(id!, hold),
        onSuccess: () => refetch(),
    });

    // Objection review mutation (HR)
    const objectionReviewMutation = useMutation({
        mutationFn: (data: { action: 'CONFIRM' | 'CANCEL' | 'CONTINUE'; reason?: string }) =>
            disciplinaryService.objectionReview(id!, { ...data, reason: data.reason || '' }),
        onSuccess: () => {
            refetch();
            setShowObjectionDialog(false);
        },
    });

    // Employee informal response mutation
    const employeeInformalMutation = useMutation({
        mutationFn: (data: { response: string; responseText?: string }) =>
            disciplinaryService.employeeResponse(id!, data),
        onSuccess: () => {
            refetch();
            setShowEmployeeResponseDialog(false);
            setEmployeeResponseText('');
        },
    });

    // Employee decision response mutation (Accept/Object)
    const employeeDecisionMutation = useMutation({
        mutationFn: (data: { action: 'ACCEPT' | 'OBJECT'; objectionText?: string }) =>
            disciplinaryService.employeeDecisionResponse(id!, data),
        onSuccess: () => {
            refetch();
            setShowEmployeeResponseDialog(false);
            setEmployeeResponseText('');
        },
    });

    if (isLoading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    if (error || !caseData) {
        return (
            <Alert severity="error" sx={{ m: 2 }}>
                فشل تحميل بيانات القضية. <Button onClick={() => refetch()}>إعادة المحاولة</Button>
            </Alert>
        );
    }

    const c = caseData as any; // Use any to access all properties

    // Action visibility based on status AND role
    const canDoHRReview = isHR && ['SUBMITTED_TO_HR', 'EMPLOYEE_REJECTED_INFORMAL'].includes(c.status);
    const canScheduleHearing = isHR && ['OFFICIAL_INVESTIGATION_OPENED', 'INVESTIGATION_IN_PROGRESS'].includes(c.status);
    const canIssueDecision = isHR && c.status === 'AWAITING_HR_DECISION';
    const canReviewObjection = isHR && ['EMPLOYEE_OBJECTED', 'HR_REVIEWING_OBJECTION'].includes(c.status);
    const canToggleHold = isHR && !['FINALIZED_APPROVED', 'FINALIZED_CANCELLED'].includes(c.status);

    // Employee action visibility
    const hasAlreadyResponded = c.employeeAckStatus !== null && c.employeeAckStatus !== undefined;
    const canRespondInformal = isEmployee && !hasAlreadyResponded && ['AWAITING_EMPLOYEE_INFORMAL', 'HR_INFORMAL_SENT', 'INFORMAL_NOTICE_ISSUED'].includes(c.status);
    const canRespondDecision = isEmployee && !hasAlreadyResponded && ['DECISION_ISSUED', 'AWAITING_EMPLOYEE_ACK'].includes(c.status);
    const objectionDeadlineRemaining = c.deadlines?.objection?.daysRemaining ?? 0;
    const canObjectDecision = canRespondDecision && objectionDeadlineRemaining > 0;

    const statusConfig = STATUS_CONFIG[c.status] || { label: c.status, color: 'default' as const };

    return (
        <Box>
            {/* Header */}
            <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                <IconButton onClick={() => navigate('/disciplinary')}>
                    <ArrowBack />
                </IconButton>
                <Box flex={1}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography variant="h5" fontWeight="bold">
                            القضية {c.caseCode}
                        </Typography>
                        <Chip label={statusConfig.label} color={statusConfig.color} />
                        {c.legalHold && (
                            <Chip icon={<Lock />} label="حجز قانوني" color="error" variant="outlined" />
                        )}
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                        {c.title}
                    </Typography>
                </Box>

                {/* Quick Actions */}
                <Box sx={{ display: 'flex', gap: 1 }}>
                    {canToggleHold && (
                        <Button
                            variant="outlined"
                            color={c.legalHold ? 'success' : 'warning'}
                            startIcon={c.legalHold ? <LockOpen /> : <Lock />}
                            onClick={() => toggleHoldMutation.mutate(!c.legalHold)}
                            disabled={toggleHoldMutation.isPending}
                        >
                            {c.legalHold ? 'إلغاء الحجز' : 'حجز قانوني'}
                        </Button>
                    )}
                    {canDoHRReview && (
                        <Button
                            variant="contained"
                            color="info"
                            onClick={() => setShowHRReviewDialog(true)}
                        >
                            مراجعة HR الأولية
                        </Button>
                    )}
                    {canScheduleHearing && (
                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={<Schedule />}
                            onClick={() => setShowScheduleDialog(true)}
                        >
                            جدولة جلسة
                        </Button>
                    )}
                    {canIssueDecision && (
                        <Button
                            variant="contained"
                            color="secondary"
                            startIcon={<Gavel />}
                            onClick={() => setShowDecisionDialog(true)}
                        >
                            إصدار قرار
                        </Button>
                    )}
                    {canReviewObjection && (
                        <Button
                            variant="contained"
                            color="error"
                            onClick={() => setShowObjectionDialog(true)}
                        >
                            مراجعة الاعتراض
                        </Button>
                    )}

                    {/* Employee Actions */}
                    {canRespondInformal && (
                        <>
                            <Button
                                variant="contained"
                                color="success"
                                startIcon={<Check />}
                                onClick={() => {
                                    setEmployeeResponseType('informal');
                                    setEmployeeResponseAction('ACCEPT');
                                    setShowEmployeeResponseDialog(true);
                                }}
                            >
                                قبول لفت النظر
                            </Button>
                            <Button
                                variant="outlined"
                                color="error"
                                startIcon={<Close />}
                                onClick={() => {
                                    setEmployeeResponseType('informal');
                                    setEmployeeResponseAction('REJECT');
                                    setShowEmployeeResponseDialog(true);
                                }}
                            >
                                رفض / الرد
                            </Button>
                        </>
                    )}

                    {canRespondDecision && (
                        <>
                            <Button
                                variant="contained"
                                color="success"
                                startIcon={<Check />}
                                onClick={() => {
                                    setEmployeeResponseType('decision');
                                    setEmployeeResponseAction('ACCEPT');
                                    setShowEmployeeResponseDialog(true);
                                }}
                            >
                                قبول القرار
                            </Button>
                            {canObjectDecision && (
                                <Button
                                    variant="outlined"
                                    color="error"
                                    onClick={() => {
                                        setEmployeeResponseType('decision');
                                        setEmployeeResponseAction('OBJECT');
                                        setShowEmployeeResponseDialog(true);
                                    }}
                                >
                                    اعتراض ({objectionDeadlineRemaining} يوم متبقي)
                                </Button>
                            )}
                        </>
                    )}
                </Box>
            </Box>

            {/* Deadlines Banner */}
            {c.deadlines && (
                <Paper sx={{ p: 2, mb: 3, bgcolor: 'warning.lighter' }}>
                    <Grid container spacing={2}>
                        {c.deadlines.decisionRemainingDays !== undefined && (
                            <Grid item xs={12} md={6}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Schedule color="warning" />
                                    <Countdown
                                        deadline={c.deadlines.decisionDeadline}
                                        title="للقرار"
                                        totalDays={c.decisionDeadlineDaysSnapshot || 30}
                                    />
                                </Box>
                            </Grid>
                        )}
                        {c.deadlines.objectionRemainingDays !== undefined && (
                            <Grid item xs={12} md={6}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Schedule color="error" />
                                    <Countdown
                                        deadline={c.deadlines.objectionDeadline}
                                        title="للاعتراض"
                                        totalDays={c.objectionWindowDaysSnapshot || 15}
                                    />
                                </Box>
                            </Grid>
                        )}
                    </Grid>
                </Paper>
            )}

            {/* Tabs */}
            <Paper sx={{ mb: 3 }}>
                <Tabs
                    value={activeTab}
                    onChange={(_, v) => setActiveTab(v)}
                    sx={{ borderBottom: 1, borderColor: 'divider' }}
                >
                    <Tab value="overview" label="نظرة عامة" icon={<Description />} iconPosition="start" />
                    <Tab value="attachments" label="المرفقات" icon={<AttachFile />} iconPosition="start" />
                    <Tab value="hearings" label="الجلسات" icon={<Schedule />} iconPosition="start" />
                    <Tab value="decision" label="القرار" icon={<Gavel />} iconPosition="start" />
                    <Tab value="timeline" label="المسار الزمني" icon={<TimelineIcon />} iconPosition="start" />
                </Tabs>
            </Paper>

            {/* Tab Content */}
            {activeTab === 'overview' && (
                <Grid container spacing={3}>
                    {/* Employee Info */}
                    <Grid item xs={12} md={6}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    <Person sx={{ mr: 1, verticalAlign: 'middle' }} />
                                    بيانات الموظف
                                </Typography>
                                <Divider sx={{ my: 2 }} />
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                    <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.main' }}>
                                        {c.employee?.firstName?.[0]}
                                    </Avatar>
                                    <Box>
                                        <Typography fontWeight="bold">
                                            {c.employee?.firstName} {c.employee?.lastName}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {c.employee?.employeeCode}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {c.employee?.jobTitle}
                                        </Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Incident Info */}
                    <Grid item xs={12} md={6}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    <CalendarMonth sx={{ mr: 1, verticalAlign: 'middle' }} />
                                    بيانات الواقعة
                                </Typography>
                                <Divider sx={{ my: 2 }} />
                                <Grid container spacing={2}>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="text.secondary">تاريخ الواقعة</Typography>
                                        <Typography>
                                            {c.incidentDate ? format(new Date(c.incidentDate), 'yyyy/MM/dd') : '-'}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="text.secondary">مكان الواقعة</Typography>
                                        <Typography>{c.incidentLocation || '-'}</Typography>
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Typography variant="caption" color="text.secondary">الوصف</Typography>
                                        <Typography sx={{ whiteSpace: 'pre-wrap' }}>
                                            {c.description || '-'}
                                        </Typography>
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Manager Info */}
                    <Grid item xs={12} md={6}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>مقدم الطلب</Typography>
                                <Divider sx={{ my: 2 }} />
                                <Typography>
                                    {c.createdByUser?.firstName} {c.createdByUser?.lastName}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {c.createdAt ? format(new Date(c.createdAt), 'yyyy/MM/dd HH:mm') : '-'}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Prior Warnings */}
                    <Grid item xs={12} md={6}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>سجل الإنذارات السابقة</Typography>
                                <Divider sx={{ my: 2 }} />
                                {c.employeeDisciplinaryRecords?.length > 0 ? (
                                    <List dense>
                                        {c.employeeDisciplinaryRecords.map((record: any, idx: number) => (
                                            <ListItem key={idx}>
                                                <ListItemText
                                                    primary={record.violationType}
                                                    secondary={format(new Date(record.violationDate), 'yyyy/MM/dd')}
                                                />
                                            </ListItem>
                                        ))}
                                    </List>
                                ) : (
                                    <Typography color="text.secondary">لا توجد سوابق</Typography>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            )}

            {activeTab === 'attachments' && (
                <Card>
                    <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6">المرفقات</Typography>
                            <Button startIcon={<Upload />} variant="outlined" disabled>
                                رفع مرفق
                            </Button>
                        </Box>
                        <Divider sx={{ mb: 2 }} />
                        {c.attachments?.length > 0 ? (
                            <List>
                                {c.attachments.map((att: any, idx: number) => (
                                    <ListItem key={idx}>
                                        <ListItemIcon>
                                            <AttachFile />
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={att.fileName}
                                            secondary={att.fileType}
                                        />
                                        <ListItemSecondaryAction>
                                            <IconButton href={att.fileUrl} target="_blank">
                                                <Download />
                                            </IconButton>
                                        </ListItemSecondaryAction>
                                    </ListItem>
                                ))}
                            </List>
                        ) : (
                            <Typography color="text.secondary" textAlign="center" py={4}>
                                لا توجد مرفقات
                            </Typography>
                        )}
                    </CardContent>
                </Card>
            )}

            {activeTab === 'hearings' && (
                <Card>
                    <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6">جلسات التحقيق</Typography>
                            {canScheduleHearing && (
                                <Button
                                    startIcon={<Add />}
                                    variant="outlined"
                                    onClick={() => setShowScheduleDialog(true)}
                                >
                                    جدولة جلسة
                                </Button>
                            )}
                        </Box>
                        <Divider sx={{ mb: 2 }} />

                        {c.hearingDatetime ? (
                            <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                                <Typography variant="subtitle2" color="text.secondary">
                                    الجلسة المجدولة
                                </Typography>
                                <Typography fontWeight="bold">
                                    {format(new Date(c.hearingDatetime), 'yyyy/MM/dd HH:mm', { locale: ar })}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    <LocationOn fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                                    {c.hearingLocation}
                                </Typography>
                            </Box>
                        ) : (
                            <Alert severity="info" sx={{ mb: 2 }}>
                                لم يتم تحديد موعد جلسة بعد
                            </Alert>
                        )}

                        <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>المحاضر</Typography>
                        {c.minutes?.length > 0 ? (
                            <List>
                                {c.minutes.map((m: any, idx: number) => (
                                    <ListItem key={idx} sx={{ bgcolor: 'grey.50', mb: 1, borderRadius: 1 }}>
                                        <ListItemText
                                            primary={`جلسة رقم ${m.sessionNo}`}
                                            secondary={m.minutesText || 'ملف مرفق'}
                                        />
                                        {m.minutesFileUrl && (
                                            <ListItemSecondaryAction>
                                                <IconButton href={m.minutesFileUrl} target="_blank">
                                                    <Download />
                                                </IconButton>
                                            </ListItemSecondaryAction>
                                        )}
                                    </ListItem>
                                ))}
                            </List>
                        ) : (
                            <Typography color="text.secondary" textAlign="center" py={4}>
                                لا توجد محاضر
                            </Typography>
                        )}
                    </CardContent>
                </Card>
            )}

            {activeTab === 'decision' && (
                <Card>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>القرار</Typography>
                        <Divider sx={{ mb: 2 }} />

                        {c.decisionType ? (
                            <Box>
                                <Grid container spacing={2}>
                                    <Grid item xs={12} md={6}>
                                        <Typography variant="caption" color="text.secondary">نوع القرار</Typography>
                                        <Typography fontWeight="bold">{c.decisionType}</Typography>
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <Typography variant="caption" color="text.secondary">تاريخ القرار</Typography>
                                        <Typography>
                                            {c.decisionCreatedAt
                                                ? format(new Date(c.decisionCreatedAt), 'yyyy/MM/dd')
                                                : '-'}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Typography variant="caption" color="text.secondary">أسباب القرار</Typography>
                                        <Typography sx={{ whiteSpace: 'pre-wrap' }}>
                                            {c.decisionReason || '-'}
                                        </Typography>
                                    </Grid>
                                </Grid>

                                {c.payrollAdjustments?.length > 0 && (
                                    <Box sx={{ mt: 3 }}>
                                        <Typography variant="subtitle2" gutterBottom>الجزاء المالي</Typography>
                                        {c.payrollAdjustments.map((adj: any, idx: number) => (
                                            <Chip
                                                key={idx}
                                                label={`${adj.penaltyUnit}: ${adj.penaltyValue}`}
                                                color="warning"
                                                sx={{ mr: 1 }}
                                            />
                                        ))}
                                    </Box>
                                )}
                            </Box>
                        ) : (
                            <Box textAlign="center" py={4}>
                                <Typography color="text.secondary" gutterBottom>
                                    لم يتم إصدار قرار بعد
                                </Typography>
                                {canIssueDecision && (
                                    <Button
                                        variant="contained"
                                        color="secondary"
                                        startIcon={<Gavel />}
                                        onClick={() => setShowDecisionDialog(true)}
                                    >
                                        إصدار قرار
                                    </Button>
                                )}
                            </Box>
                        )}
                    </CardContent>
                </Card>
            )}

            {activeTab === 'timeline' && (
                <Card>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>المسار الزمني</Typography>
                        <Divider sx={{ mb: 2 }} />
                        {c.events?.length > 0 ? (
                            <Timeline events={c.events} />
                        ) : (
                            <Typography color="text.secondary" textAlign="center" py={4}>
                                لا توجد أحداث
                            </Typography>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Schedule Hearing Dialog */}
            <Dialog open={showScheduleDialog} onClose={() => setShowScheduleDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>جدولة جلسة تحقيق</DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField
                            label="تاريخ ووقت الجلسة"
                            type="datetime-local"
                            value={hearingForm.hearingDatetime}
                            onChange={(e) => setHearingForm({ ...hearingForm, hearingDatetime: e.target.value })}
                            InputLabelProps={{ shrink: true }}
                            fullWidth
                        />
                        <TextField
                            label="مكان الجلسة"
                            value={hearingForm.hearingLocation}
                            onChange={(e) => setHearingForm({ ...hearingForm, hearingLocation: e.target.value })}
                            fullWidth
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowScheduleDialog(false)}>إلغاء</Button>
                    <Button
                        variant="contained"
                        onClick={() => scheduleHearingMutation.mutate(hearingForm)}
                        disabled={!hearingForm.hearingDatetime || !hearingForm.hearingLocation || scheduleHearingMutation.isPending}
                    >
                        {scheduleHearingMutation.isPending ? 'جاري...' : 'تأكيد'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Objection Review Dialog */}
            <Dialog open={showObjectionDialog} onClose={() => setShowObjectionDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>مراجعة الاعتراض</DialogTitle>
                <DialogContent>
                    <Typography sx={{ mb: 2 }}>
                        الموظف اعترض على القرار. اختر الإجراء المناسب:
                    </Typography>
                    {c.objectionText && (
                        <Paper sx={{ p: 2, bgcolor: 'grey.50', mb: 2 }}>
                            <Typography variant="caption" color="text.secondary">نص الاعتراض:</Typography>
                            <Typography>{c.objectionText}</Typography>
                        </Paper>
                    )}
                </DialogContent>
                <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
                    <Button
                        color="error"
                        startIcon={<Close />}
                        onClick={() => objectionReviewMutation.mutate({ action: 'CANCEL' })}
                        disabled={objectionReviewMutation.isPending}
                    >
                        إلغاء القرار
                    </Button>
                    <Button
                        color="warning"
                        startIcon={<Refresh />}
                        onClick={() => objectionReviewMutation.mutate({ action: 'CONTINUE' })}
                        disabled={objectionReviewMutation.isPending}
                    >
                        استمرار التحقيق
                    </Button>
                    <Button
                        variant="contained"
                        color="success"
                        startIcon={<Check />}
                        onClick={() => objectionReviewMutation.mutate({ action: 'CONFIRM' })}
                        disabled={objectionReviewMutation.isPending}
                    >
                        تأكيد القرار
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Issue Decision Dialog */}
            <IssueDecisionDialog
                open={showDecisionDialog}
                onClose={() => setShowDecisionDialog(false)}
                caseId={id!}
                employeePriorWarnings={c.employeeDisciplinaryRecords?.length || 0}
            />

            {/* Employee Response Dialog */}
            <Dialog
                open={showEmployeeResponseDialog}
                onClose={() => setShowEmployeeResponseDialog(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    {employeeResponseType === 'informal'
                        ? employeeResponseAction === 'ACCEPT'
                            ? 'تأكيد قبول لفت النظر'
                            : 'رفض لفت النظر / إرسال رد'
                        : employeeResponseAction === 'ACCEPT'
                            ? 'تأكيد قبول القرار'
                            : 'تقديم اعتراض على القرار'}
                </DialogTitle>
                <DialogContent>
                    {/* Show countdown warning for objection */}
                    {employeeResponseType === 'decision' && employeeResponseAction === 'OBJECT' && (
                        <Alert severity="warning" sx={{ mb: 2 }}>
                            متبقي <strong>{objectionDeadlineRemaining}</strong> يوم لتقديم الاعتراض
                        </Alert>
                    )}

                    {/* Require text for reject/object */}
                    {(employeeResponseAction === 'REJECT' || employeeResponseAction === 'OBJECT') && (
                        <TextField
                            fullWidth
                            required
                            multiline
                            rows={4}
                            label={employeeResponseAction === 'OBJECT' ? 'نص الاعتراض' : 'سبب الرفض / ردك'}
                            value={employeeResponseText}
                            onChange={(e) => setEmployeeResponseText(e.target.value)}
                            placeholder={
                                employeeResponseAction === 'OBJECT'
                                    ? 'اكتب اعتراضك بالتفصيل...'
                                    : 'اكتب ردك أو سبب الرفض...'
                            }
                            sx={{ mt: 2 }}
                        />
                    )}

                    {employeeResponseAction === 'ACCEPT' && (
                        <Typography color="text.secondary">
                            {employeeResponseType === 'informal'
                                ? 'سيتم تسجيل قبولك للفت النظر الموجه إليك.'
                                : 'سيتم تسجيل قبولك للقرار الصادر. لن تتمكن من الاعتراض بعد ذلك.'}
                        </Typography>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setShowEmployeeResponseDialog(false)}>
                        إلغاء
                    </Button>
                    <Button
                        variant="contained"
                        color={employeeResponseAction === 'ACCEPT' ? 'success' : 'error'}
                        disabled={
                            employeeInformalMutation.isPending ||
                            employeeDecisionMutation.isPending ||
                            ((employeeResponseAction === 'REJECT' || employeeResponseAction === 'OBJECT') &&
                                !employeeResponseText.trim())
                        }
                        onClick={() => {
                            if (employeeResponseType === 'informal') {
                                employeeInformalMutation.mutate({
                                    response: employeeResponseAction,
                                    responseText: employeeResponseText || undefined,
                                });
                            } else {
                                employeeDecisionMutation.mutate({
                                    action: employeeResponseAction === 'ACCEPT' ? 'ACCEPT' : 'OBJECT',
                                    objectionText: employeeResponseText || undefined,
                                });
                            }
                        }}
                    >
                        {employeeInformalMutation.isPending || employeeDecisionMutation.isPending
                            ? 'جاري...'
                            : employeeResponseAction === 'ACCEPT'
                                ? 'تأكيد القبول'
                                : employeeResponseType === 'informal'
                                    ? 'إرسال الرد'
                                    : 'إرسال الاعتراض'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* HR Initial Review Dialog */}
            <HRReviewDialog
                open={showHRReviewDialog}
                onClose={() => setShowHRReviewDialog(false)}
                caseId={id!}
                caseCode={c.caseCode}
                employeeName={`${c.employee?.firstName || ''} ${c.employee?.lastName || ''}`}
                onSuccess={() => refetch()}
            />
        </Box>
    );
};
