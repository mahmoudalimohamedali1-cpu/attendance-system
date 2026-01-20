import React, { useState, useMemo } from 'react';
import {
    Box,
    Typography,
    TextField,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    FormControl,
    FormControlLabel,
    InputLabel,
    Select,
    MenuItem,
    Switch,
    Chip,
    Divider,
    CircularProgress,
    Collapse,
    Alert,
    Autocomplete,
    Avatar,
    alpha,
    useTheme,
    Grid,
} from '@mui/material';
import {
    Close,
    CalendarMonth,
    AccessTime,
    LocationOn,
    VideoCall,
    ExpandMore,
    ExpandLess,
    Add,
    Person,
    Groups,
    FilterList,
} from '@mui/icons-material';
import { GlassCard } from '@/components/premium';
import type {
    EventType,
    VisibilityType,
    TargetType,
    CreateEventDto,
    EventTargetDto,
    EventAttendeeDto,
} from '@/services/calendar-events.service';

// ==================== Props Interface ====================

interface CreateEventModalProps {
    /** Whether the modal is open */
    open: boolean;
    /** Callback when modal should close */
    onClose: () => void;
    /** Callback when event is created */
    onSubmit: (data: CreateEventDto) => Promise<void>;
    /** Whether submission is in progress */
    isSubmitting?: boolean;
    /** Initial date for the event */
    initialDate?: Date;
    /** Available users for attendee selection */
    availableUsers?: {
        id: string;
        firstName: string;
        lastName: string;
        avatar?: string | null;
        jobTitle?: string | null;
        departmentName?: string | null;
    }[];
    /** Available departments for targeting */
    availableDepartments?: { id: string; name: string }[];
    /** Available branches for targeting */
    availableBranches?: { id: string; name: string }[];
    /** Available teams for targeting */
    availableTeams?: { id: string; name: string }[];
}

// ==================== Event Type Configuration ====================

const eventTypeConfig: Record<EventType, {
    gradient: [string, string];
    bgColor: string;
    textColor: string;
    label: string;
    emoji: string;
}> = {
    MEETING: {
        gradient: ['#3b82f6', '#2563eb'],
        bgColor: '#dbeafe',
        textColor: '#1e40af',
        label: 'اجتماع',
        emoji: '📅',
    },
    INTERVIEW: {
        gradient: ['#8b5cf6', '#7c3aed'],
        bgColor: '#ede9fe',
        textColor: '#5b21b6',
        label: 'مقابلة',
        emoji: '👤',
    },
    PAYROLL: {
        gradient: ['#22c55e', '#16a34a'],
        bgColor: '#dcfce7',
        textColor: '#166534',
        label: 'رواتب',
        emoji: '💰',
    },
    HOLIDAY: {
        gradient: ['#f59e0b', '#d97706'],
        bgColor: '#fef3c7',
        textColor: '#92400e',
        label: 'إجازة',
        emoji: '🎉',
    },
    DEADLINE: {
        gradient: ['#ef4444', '#dc2626'],
        bgColor: '#fee2e2',
        textColor: '#991b1b',
        label: 'موعد نهائي',
        emoji: '⏰',
    },
    ANNOUNCEMENT: {
        gradient: ['#06b6d4', '#0891b2'],
        bgColor: '#cffafe',
        textColor: '#155e75',
        label: 'إعلان',
        emoji: '📢',
    },
    OTHER: {
        gradient: ['#64748b', '#475569'],
        bgColor: '#f1f5f9',
        textColor: '#334155',
        label: 'أخرى',
        emoji: '📌',
    },
};

// ==================== Visibility Type Configuration ====================

const visibilityTypeConfig: Record<VisibilityType, {
    label: string;
    description: string;
}> = {
    PUBLIC: {
        label: 'عام',
        description: 'متاح لجميع الموظفين',
    },
    DEPARTMENT: {
        label: 'القسم',
        description: 'متاح لموظفي القسم فقط',
    },
    TEAM: {
        label: 'الفريق',
        description: 'متاح لأعضاء الفريق فقط',
    },
    TARGETED: {
        label: 'مستهدف',
        description: 'استهداف مجموعات محددة',
    },
    MANAGERS_ONLY: {
        label: 'المديرين فقط',
        description: 'متاح للمديرين فقط',
    },
    HR_ONLY: {
        label: 'الموارد البشرية فقط',
        description: 'متاح لفريق HR فقط',
    },
    PRIVATE: {
        label: 'خاص',
        description: 'مرئي لك والمدعوين فقط',
    },
};

// ==================== Target Type Labels ====================

const targetTypeLabels: Record<TargetType, string> = {
    BRANCH: 'الفرع',
    DEPARTMENT: 'القسم',
    TEAM: 'الفريق',
    USER: 'موظف',
    ROLE: 'الدور',
    JOB_TITLE: 'المسمى الوظيفي',
    GRADE: 'الدرجة',
    CONTRACT_TYPE: 'نوع العقد',
    SHIFT: 'الوردية',
    LOCATION: 'الموقع',
    TAG: 'الوسم',
};

// ==================== Helper Functions ====================

/**
 * Get initials from name
 */
const getInitials = (firstName: string, lastName: string): string => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
};

/**
 * Format date for input
 */
const formatDateForInput = (date: Date): string => {
    return date.toISOString().slice(0, 16);
};

/**
 * Get default end time (1 hour after start)
 */
const getDefaultEndTime = (startDate: Date): Date => {
    const endDate = new Date(startDate);
    endDate.setHours(endDate.getHours() + 1);
    return endDate;
};

// ==================== Component ====================

/**
 * CreateEventModal Component
 *
 * Modal dialog for creating new calendar events with:
 * - Event type selection with visual indicators
 * - Date/time pickers with all-day support
 * - Location and meeting link fields
 * - Bilingual title and description support
 * - Visibility/targeting options
 * - Attendee selection
 */
export const CreateEventModal: React.FC<CreateEventModalProps> = ({
    open,
    onClose,
    onSubmit,
    isSubmitting = false,
    initialDate,
    availableUsers = [],
    availableDepartments = [],
    availableBranches = [],
    availableTeams = [],
}) => {
    const theme = useTheme();

    // ==================== Form State ====================

    const defaultStartDate = useMemo(() => {
        if (initialDate) return initialDate;
        const date = new Date();
        date.setMinutes(0);
        date.setSeconds(0);
        date.setHours(date.getHours() + 1);
        return date;
    }, [initialDate]);

    const [title, setTitle] = useState('');
    const [titleEn, setTitleEn] = useState('');
    const [description, setDescription] = useState('');
    const [descriptionEn, setDescriptionEn] = useState('');
    const [startAt, setStartAt] = useState(formatDateForInput(defaultStartDate));
    const [endAt, setEndAt] = useState(formatDateForInput(getDefaultEndTime(defaultStartDate)));
    const [isAllDay, setIsAllDay] = useState(false);
    const [location, setLocation] = useState('');
    const [meetingLink, setMeetingLink] = useState('');
    const [eventType, setEventType] = useState<EventType>('MEETING');
    const [visibilityType, setVisibilityType] = useState<VisibilityType>('PUBLIC');
    const [targets, setTargets] = useState<EventTargetDto[]>([]);
    const [attendees, setAttendees] = useState<EventAttendeeDto[]>([]);

    // UI state
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [showEnglish, setShowEnglish] = useState(false);
    const [showTargeting, setShowTargeting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // New target form
    const [newTargetType, setNewTargetType] = useState<TargetType>('DEPARTMENT');
    const [newTargetValue, setNewTargetValue] = useState('');

    // ==================== Computed Values ====================

    const selectedEventConfig = eventTypeConfig[eventType];
    const isValid = title.trim().length > 0 && startAt && endAt && new Date(startAt) < new Date(endAt);

    // ==================== Handlers ====================

    /**
     * Handle form submission
     */
    const handleSubmit = async () => {
        if (!isValid) return;

        setError(null);

        try {
            const data: CreateEventDto = {
                title: title.trim(),
                titleEn: titleEn.trim() || undefined,
                description: description.trim() || undefined,
                descriptionEn: descriptionEn.trim() || undefined,
                startAt: new Date(startAt).toISOString(),
                endAt: new Date(endAt).toISOString(),
                isAllDay,
                location: location.trim() || undefined,
                meetingLink: meetingLink.trim() || undefined,
                eventType,
                visibilityType,
                targets: targets.length > 0 ? targets : undefined,
                attendees: attendees.length > 0 ? attendees : undefined,
            };

            await onSubmit(data);
            handleClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'حدث خطأ أثناء إنشاء الحدث');
        }
    };

    /**
     * Handle modal close
     */
    const handleClose = () => {
        if (!isSubmitting) {
            // Reset form
            setTitle('');
            setTitleEn('');
            setDescription('');
            setDescriptionEn('');
            setStartAt(formatDateForInput(defaultStartDate));
            setEndAt(formatDateForInput(getDefaultEndTime(defaultStartDate)));
            setIsAllDay(false);
            setLocation('');
            setMeetingLink('');
            setEventType('MEETING');
            setVisibilityType('PUBLIC');
            setTargets([]);
            setAttendees([]);
            setShowAdvanced(false);
            setShowEnglish(false);
            setShowTargeting(false);
            setError(null);
            onClose();
        }
    };

    /**
     * Handle all-day toggle
     */
    const handleAllDayChange = (checked: boolean) => {
        setIsAllDay(checked);
        if (checked) {
            // Set times to start and end of day
            const start = new Date(startAt);
            start.setHours(0, 0, 0, 0);
            setStartAt(formatDateForInput(start));

            const end = new Date(endAt);
            end.setHours(23, 59, 0, 0);
            setEndAt(formatDateForInput(end));
        }
    };

    /**
     * Add a target
     */
    const handleAddTarget = () => {
        if (newTargetValue) {
            setTargets([...targets, {
                targetType: newTargetType,
                targetValue: newTargetValue,
                isExclusion: false,
            }]);
            setNewTargetValue('');
        }
    };

    /**
     * Remove a target
     */
    const handleRemoveTarget = (index: number) => {
        setTargets(targets.filter((_, i) => i !== index));
    };

    /**
     * Get target options based on type
     */
    const getTargetOptions = () => {
        switch (newTargetType) {
            case 'DEPARTMENT':
                return availableDepartments.map(d => ({ value: d.id, label: d.name }));
            case 'BRANCH':
                return availableBranches.map(b => ({ value: b.id, label: b.name }));
            case 'TEAM':
                return availableTeams.map(t => ({ value: t.id, label: t.name }));
            default:
                return [];
        }
    };

    // ==================== Render ====================

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 3,
                    bgcolor: alpha(theme.palette.background.paper, 0.98),
                    backgroundImage: 'none',
                },
            }}
        >
            {/* Header with gradient */}
            <Box
                sx={{
                    background: `linear-gradient(135deg, ${selectedEventConfig.gradient[0]}, ${selectedEventConfig.gradient[1]})`,
                    color: 'white',
                    position: 'relative',
                }}
            >
                <DialogTitle sx={{ color: 'white', pb: 2, pt: 2.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ fontSize: '1.5rem' }}>{selectedEventConfig.emoji}</Box>
                        <Typography variant="h6" fontWeight={700}>
                            إنشاء حدث جديد
                        </Typography>
                    </Box>
                </DialogTitle>
                <IconButton
                    onClick={handleClose}
                    disabled={isSubmitting}
                    sx={{
                        position: 'absolute',
                        top: 12,
                        right: 12,
                        color: 'white',
                        bgcolor: 'rgba(255,255,255,0.2)',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                    }}
                >
                    <Close />
                </IconButton>
            </Box>

            <DialogContent sx={{ pt: 3 }}>
                {/* Error Alert */}
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                {/* Event Type Selection */}
                <Box sx={{ mb: 3 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={500} sx={{ mb: 1.5, display: 'block' }}>
                        نوع الحدث
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {(Object.keys(eventTypeConfig) as EventType[]).map((type) => {
                            const config = eventTypeConfig[type];
                            const isSelected = eventType === type;
                            return (
                                <Chip
                                    key={type}
                                    label={config.label}
                                    icon={<Box sx={{ fontSize: '1rem', mr: -0.5 }}>{config.emoji}</Box>}
                                    onClick={() => setEventType(type)}
                                    sx={{
                                        fontWeight: 600,
                                        transition: 'all 0.2s ease',
                                        ...(isSelected ? {
                                            background: `linear-gradient(135deg, ${config.gradient[0]}, ${config.gradient[1]})`,
                                            color: 'white',
                                            '& .MuiChip-icon': { color: 'white' },
                                        } : {
                                            bgcolor: config.bgColor,
                                            color: config.textColor,
                                            '&:hover': {
                                                bgcolor: alpha(config.gradient[0], 0.2),
                                            },
                                        }),
                                    }}
                                />
                            );
                        })}
                    </Box>
                </Box>

                {/* Title */}
                <GlassCard sx={{ p: 2.5, mb: 2 }}>
                    <TextField
                        fullWidth
                        label="عنوان الحدث"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                        placeholder="أدخل عنوان الحدث..."
                        InputProps={{
                            sx: { fontWeight: 600 },
                        }}
                    />

                    {/* English Title Toggle */}
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            mt: 1.5,
                            cursor: 'pointer',
                            color: 'primary.main',
                        }}
                        onClick={() => setShowEnglish(!showEnglish)}
                    >
                        <Typography variant="caption" fontWeight={600}>
                            {showEnglish ? 'إخفاء الترجمة الإنجليزية' : 'إضافة ترجمة إنجليزية'}
                        </Typography>
                        {showEnglish ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                    </Box>

                    <Collapse in={showEnglish}>
                        <TextField
                            fullWidth
                            label="English Title"
                            value={titleEn}
                            onChange={(e) => setTitleEn(e.target.value)}
                            placeholder="Enter event title in English..."
                            sx={{ mt: 2, direction: 'ltr' }}
                            inputProps={{ style: { textAlign: 'left' } }}
                        />
                    </Collapse>
                </GlassCard>

                {/* Date & Time */}
                <GlassCard sx={{ p: 2.5, mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <CalendarMonth sx={{ color: selectedEventConfig.textColor, fontSize: 20 }} />
                        <Typography variant="caption" color="text.secondary" fontWeight={500}>
                            التاريخ والوقت
                        </Typography>
                    </Box>

                    <FormControlLabel
                        control={
                            <Switch
                                checked={isAllDay}
                                onChange={(e) => handleAllDayChange(e.target.checked)}
                                sx={{
                                    '& .MuiSwitch-switchBase.Mui-checked': {
                                        color: selectedEventConfig.gradient[0],
                                    },
                                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                        bgcolor: selectedEventConfig.gradient[0],
                                    },
                                }}
                            />
                        }
                        label={<Typography variant="body2">طوال اليوم</Typography>}
                        sx={{ mb: 2 }}
                    />

                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="يبدأ في"
                                type={isAllDay ? 'date' : 'datetime-local'}
                                value={isAllDay ? startAt.slice(0, 10) : startAt}
                                onChange={(e) => {
                                    const value = isAllDay ? `${e.target.value}T00:00` : e.target.value;
                                    setStartAt(value);
                                }}
                                InputLabelProps={{ shrink: true }}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="ينتهي في"
                                type={isAllDay ? 'date' : 'datetime-local'}
                                value={isAllDay ? endAt.slice(0, 10) : endAt}
                                onChange={(e) => {
                                    const value = isAllDay ? `${e.target.value}T23:59` : e.target.value;
                                    setEndAt(value);
                                }}
                                InputLabelProps={{ shrink: true }}
                                required
                                error={startAt && endAt && new Date(startAt) >= new Date(endAt)}
                                helperText={startAt && endAt && new Date(startAt) >= new Date(endAt) ? 'يجب أن يكون وقت الانتهاء بعد وقت البدء' : ''}
                            />
                        </Grid>
                    </Grid>
                </GlassCard>

                {/* Location & Meeting Link */}
                <GlassCard sx={{ p: 2.5, mb: 2 }}>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="المكان"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                placeholder="أدخل موقع الحدث..."
                                InputProps={{
                                    startAdornment: <LocationOn sx={{ color: 'text.secondary', mr: 1 }} />,
                                }}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="رابط الاجتماع"
                                value={meetingLink}
                                onChange={(e) => setMeetingLink(e.target.value)}
                                placeholder="https://meet.google.com/..."
                                InputProps={{
                                    startAdornment: <VideoCall sx={{ color: 'text.secondary', mr: 1 }} />,
                                }}
                                type="url"
                            />
                        </Grid>
                    </Grid>
                </GlassCard>

                {/* Advanced Options */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        mb: 2,
                        cursor: 'pointer',
                        color: 'text.secondary',
                        '&:hover': { color: 'primary.main' },
                    }}
                    onClick={() => setShowAdvanced(!showAdvanced)}
                >
                    <Typography variant="body2" fontWeight={600}>
                        خيارات متقدمة
                    </Typography>
                    {showAdvanced ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                </Box>

                <Collapse in={showAdvanced}>
                    {/* Description */}
                    <GlassCard sx={{ p: 2.5, mb: 2 }}>
                        <TextField
                            fullWidth
                            label="الوصف"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            multiline
                            rows={3}
                            placeholder="أضف وصفاً للحدث..."
                        />

                        {showEnglish && (
                            <TextField
                                fullWidth
                                label="English Description"
                                value={descriptionEn}
                                onChange={(e) => setDescriptionEn(e.target.value)}
                                multiline
                                rows={3}
                                placeholder="Add event description in English..."
                                sx={{ mt: 2, direction: 'ltr' }}
                                inputProps={{ style: { textAlign: 'left' } }}
                            />
                        )}
                    </GlassCard>

                    {/* Visibility */}
                    <GlassCard sx={{ p: 2.5, mb: 2 }}>
                        <FormControl fullWidth>
                            <InputLabel>الرؤية</InputLabel>
                            <Select
                                value={visibilityType}
                                label="الرؤية"
                                onChange={(e) => {
                                    const value = e.target.value as VisibilityType;
                                    setVisibilityType(value);
                                    setShowTargeting(value === 'TARGETED');
                                }}
                            >
                                {(Object.keys(visibilityTypeConfig) as VisibilityType[]).map((type) => (
                                    <MenuItem key={type} value={type}>
                                        <Box>
                                            <Typography variant="body2" fontWeight={600}>
                                                {visibilityTypeConfig[type].label}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {visibilityTypeConfig[type].description}
                                            </Typography>
                                        </Box>
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        {/* Targeting Section */}
                        <Collapse in={showTargeting || visibilityType === 'TARGETED'}>
                            <Box sx={{ mt: 2, pt: 2, borderTop: '1px dashed', borderColor: 'divider' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                    <FilterList sx={{ color: 'text.secondary', fontSize: 20 }} />
                                    <Typography variant="caption" color="text.secondary" fontWeight={500}>
                                        قواعد الاستهداف
                                    </Typography>
                                </Box>

                                {/* Existing Targets */}
                                {targets.length > 0 && (
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                                        {targets.map((target, index) => (
                                            <Chip
                                                key={index}
                                                label={`${targetTypeLabels[target.targetType]}: ${target.targetValue}`}
                                                onDelete={() => handleRemoveTarget(index)}
                                                size="small"
                                                sx={{
                                                    bgcolor: selectedEventConfig.bgColor,
                                                    color: selectedEventConfig.textColor,
                                                    fontWeight: 600,
                                                }}
                                            />
                                        ))}
                                    </Box>
                                )}

                                {/* Add Target */}
                                <Grid container spacing={1} alignItems="center">
                                    <Grid item xs={4}>
                                        <FormControl fullWidth size="small">
                                            <InputLabel>النوع</InputLabel>
                                            <Select
                                                value={newTargetType}
                                                label="النوع"
                                                onChange={(e) => {
                                                    setNewTargetType(e.target.value as TargetType);
                                                    setNewTargetValue('');
                                                }}
                                            >
                                                <MenuItem value="DEPARTMENT">{targetTypeLabels.DEPARTMENT}</MenuItem>
                                                <MenuItem value="BRANCH">{targetTypeLabels.BRANCH}</MenuItem>
                                                <MenuItem value="TEAM">{targetTypeLabels.TEAM}</MenuItem>
                                            </Select>
                                        </FormControl>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <FormControl fullWidth size="small">
                                            <InputLabel>القيمة</InputLabel>
                                            <Select
                                                value={newTargetValue}
                                                label="القيمة"
                                                onChange={(e) => setNewTargetValue(e.target.value)}
                                            >
                                                {getTargetOptions().map((opt) => (
                                                    <MenuItem key={opt.value} value={opt.value}>
                                                        {opt.label}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    </Grid>
                                    <Grid item xs={2}>
                                        <Button
                                            variant="contained"
                                            size="small"
                                            onClick={handleAddTarget}
                                            disabled={!newTargetValue}
                                            sx={{
                                                minWidth: 'auto',
                                                bgcolor: selectedEventConfig.gradient[0],
                                                '&:hover': { bgcolor: selectedEventConfig.gradient[1] },
                                            }}
                                        >
                                            <Add />
                                        </Button>
                                    </Grid>
                                </Grid>
                            </Box>
                        </Collapse>
                    </GlassCard>

                    {/* Attendees */}
                    <GlassCard sx={{ p: 2.5, mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <Groups sx={{ color: 'text.secondary', fontSize: 20 }} />
                            <Typography variant="caption" color="text.secondary" fontWeight={500}>
                                المدعوون
                            </Typography>
                        </Box>

                        <Autocomplete
                            multiple
                            options={availableUsers}
                            getOptionLabel={(option) => `${option.firstName} ${option.lastName}`}
                            value={availableUsers.filter(u => attendees.some(a => a.userId === u.id))}
                            onChange={(_, newValue) => {
                                setAttendees(newValue.map(u => ({ userId: u.id })));
                            }}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    placeholder="ابحث عن موظفين لدعوتهم..."
                                    size="small"
                                />
                            )}
                            renderOption={(props, option) => (
                                <Box component="li" {...props}>
                                    <Avatar
                                        src={option.avatar || undefined}
                                        sx={{
                                            width: 32,
                                            height: 32,
                                            mr: 1.5,
                                            fontSize: '0.75rem',
                                            background: `linear-gradient(135deg, ${selectedEventConfig.gradient[0]}, ${selectedEventConfig.gradient[1]})`,
                                        }}
                                    >
                                        {getInitials(option.firstName, option.lastName)}
                                    </Avatar>
                                    <Box>
                                        <Typography variant="body2" fontWeight={600}>
                                            {option.firstName} {option.lastName}
                                        </Typography>
                                        {option.jobTitle && (
                                            <Typography variant="caption" color="text.secondary">
                                                {option.jobTitle}
                                            </Typography>
                                        )}
                                    </Box>
                                </Box>
                            )}
                            renderTags={(value, getTagProps) =>
                                value.map((option, index) => (
                                    <Chip
                                        {...getTagProps({ index })}
                                        key={option.id}
                                        avatar={
                                            <Avatar
                                                src={option.avatar || undefined}
                                                sx={{ width: 24, height: 24 }}
                                            >
                                                {getInitials(option.firstName, option.lastName)}
                                            </Avatar>
                                        }
                                        label={`${option.firstName} ${option.lastName}`}
                                        size="small"
                                        sx={{
                                            bgcolor: alpha(selectedEventConfig.gradient[0], 0.1),
                                            '& .MuiChip-avatar': {
                                                background: `linear-gradient(135deg, ${selectedEventConfig.gradient[0]}, ${selectedEventConfig.gradient[1]})`,
                                                color: 'white',
                                                fontSize: '0.6rem',
                                            },
                                        }}
                                    />
                                ))
                            }
                            noOptionsText="لا توجد نتائج"
                        />

                        {attendees.length > 0 && (
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                تم اختيار {attendees.length} مدعو
                            </Typography>
                        )}
                    </GlassCard>
                </Collapse>
            </DialogContent>

            <Divider />

            <DialogActions sx={{ p: 2.5, gap: 1 }}>
                <Button
                    onClick={handleClose}
                    disabled={isSubmitting}
                    sx={{ textTransform: 'none', fontWeight: 600 }}
                >
                    إلغاء
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={!isValid || isSubmitting}
                    startIcon={isSubmitting ? <CircularProgress size={18} color="inherit" /> : <CalendarMonth />}
                    sx={{
                        textTransform: 'none',
                        fontWeight: 600,
                        background: `linear-gradient(135deg, ${selectedEventConfig.gradient[0]}, ${selectedEventConfig.gradient[1]})`,
                        '&:hover': {
                            background: `linear-gradient(135deg, ${selectedEventConfig.gradient[1]}, ${selectedEventConfig.gradient[0]})`,
                        },
                    }}
                >
                    {isSubmitting ? 'جاري الإنشاء...' : 'إنشاء الحدث'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default CreateEventModal;
