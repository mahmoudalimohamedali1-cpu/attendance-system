import React, { useState, useCallback } from 'react';
import {
    Box,
    Typography,
    Avatar,
    TextField,
    Button,
    IconButton,
    Chip,
    Tooltip,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Switch,
    FormControlLabel,
    Collapse,
    Alert,
    CircularProgress,
    Autocomplete,
    Paper,
} from '@mui/material';
import {
    Send,
    Image as ImageIcon,
    AttachFile,
    VideoLibrary,
    Link as LinkIcon,
    Campaign,
    Public,
    Business,
    Group,
    AdminPanelSettings,
    Lock,
    ExpandMore,
    ExpandLess,
    Close,
    Add,
    Schedule,
    PushPin,
    CheckCircle,
} from '@mui/icons-material';
import { GlassCard } from '@/components/premium';
import {
    PostType,
    VisibilityType,
    TargetType,
    CreatePostDto,
    PostAttachment,
} from '@/services/social-feed.service';

interface CreatePostProps {
    currentUser?: {
        id: string;
        name: string;
        avatar?: string;
        jobTitle?: string;
    };
    onSubmit?: (data: CreatePostDto) => Promise<void>;
    onCancel?: () => void;
    isSubmitting?: boolean;
    error?: string | null;
    availableTargets?: {
        branches?: { id: string; name: string }[];
        departments?: { id: string; name: string }[];
        teams?: { id: string; name: string }[];
        users?: { id: string; name: string; avatar?: string }[];
    };
    defaultType?: PostType;
    showAdvancedOptions?: boolean;
    /** Permission flag: can user create ANNOUNCEMENT posts? */
    canCreateAnnouncement?: boolean;
    /** Permission flag: can user pin posts? */
    canPinPost?: boolean;
}

// Post type configuration with Arabic labels
const postTypeConfig: Record<PostType, { icon: React.ReactElement; label: string; description: string; gradient: string[] }> = {
    POST: {
        icon: <Public sx={{ fontSize: 18 }} />,
        label: 'منشور عادي',
        description: 'مشاركة مع الزملاء',
        gradient: ['#3b82f6', '#1d4ed8'],
    },
    ANNOUNCEMENT: {
        icon: <Campaign sx={{ fontSize: 18 }} />,
        label: 'إعلان رسمي',
        description: 'إعلان يتطلب إقرار',
        gradient: ['#f59e0b', '#d97706'],
    },
    PROMOTED: {
        icon: <AdminPanelSettings sx={{ fontSize: 18 }} />,
        label: 'منشور مروّج',
        description: 'منشور مميز',
        gradient: ['#8b5cf6', '#7c3aed'],
    },
};

// Visibility type configuration with Arabic labels
const visibilityConfig: Record<VisibilityType, { icon: React.ReactElement; label: string; description: string }> = {
    PUBLIC: {
        icon: <Public sx={{ fontSize: 18 }} />,
        label: 'عام',
        description: 'مرئي للجميع في الشركة',
    },
    DEPARTMENT: {
        icon: <Business sx={{ fontSize: 18 }} />,
        label: 'القسم',
        description: 'مرئي لأعضاء قسمك فقط',
    },
    TEAM: {
        icon: <Group sx={{ fontSize: 18 }} />,
        label: 'الفريق',
        description: 'مرئي لأعضاء فريقك فقط',
    },
    TARGETED: {
        icon: <AdminPanelSettings sx={{ fontSize: 18 }} />,
        label: 'مستهدف',
        description: 'اختر المستهدفين يدوياً',
    },
    MANAGERS_ONLY: {
        icon: <AdminPanelSettings sx={{ fontSize: 18 }} />,
        label: 'المدراء فقط',
        description: 'مرئي للمدراء فقط',
    },
    HR_ONLY: {
        icon: <AdminPanelSettings sx={{ fontSize: 18 }} />,
        label: 'الموارد البشرية فقط',
        description: 'مرئي لقسم HR فقط',
    },
    PRIVATE: {
        icon: <Lock sx={{ fontSize: 18 }} />,
        label: 'خاص',
        description: 'مسودة خاصة',
    },
};

// Target type labels
const targetTypeLabels: Record<TargetType, string> = {
    BRANCH: 'الفرع',
    DEPARTMENT: 'القسم',
    TEAM: 'الفريق',
    USER: 'الموظف',
    ROLE: 'الدور',
    JOB_TITLE: 'المسمى الوظيفي',
    GRADE: 'الدرجة',
    CONTRACT_TYPE: 'نوع العقد',
    SHIFT: 'الوردية',
    LOCATION: 'الموقع',
    TAG: 'الوسم',
};

// Helper to get initials from name
const getInitials = (name: string): string => {
    if (!name) return '??';
    return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
};

interface TargetItem {
    targetType: TargetType;
    targetValue: string;
    targetLabel: string;
    isExclusion?: boolean;
}

interface AttachmentPreview {
    id: string;
    type: 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'LINK';
    name: string;
    size?: number;
    url?: string;
    file?: File;
}

/**
 * CreatePost Component
 * Premium post creation form with content input, targeting options, and attachment upload
 */
export const CreatePost: React.FC<CreatePostProps> = ({
    currentUser,
    onSubmit,
    onCancel,
    isSubmitting = false,
    error = null,
    availableTargets,
    defaultType = 'POST',
    showAdvancedOptions = true,
    canCreateAnnouncement = false,
    canPinPost = false,
}) => {
    // Form state
    const [content, setContent] = useState('');
    const [title, setTitle] = useState('');
    const [postType, setPostType] = useState<PostType>(defaultType);
    const [visibilityType, setVisibilityType] = useState<VisibilityType>('PUBLIC');
    const [targets, setTargets] = useState<TargetItem[]>([]);
    const [attachments, setAttachments] = useState<AttachmentPreview[]>([]);

    // Advanced options state
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [isPinned, setIsPinned] = useState(false);
    const [requireAcknowledge, setRequireAcknowledge] = useState(false);
    const [allowComments, setAllowComments] = useState(true);
    const [scheduledAt, setScheduledAt] = useState<string>('');

    // Target selection state
    const [selectedTargetType, setSelectedTargetType] = useState<TargetType>('DEPARTMENT');
    const [selectedTargetValue, setSelectedTargetValue] = useState<string>('');

    // Check if form is valid
    const isValid = content.trim().length > 0;

    // Handle form submission
    const handleSubmit = useCallback(async () => {
        if (!isValid || !onSubmit) return;

        const postData: CreatePostDto = {
            type: postType,
            content: content.trim(),
            visibilityType,
            allowComments,
        };

        // Add optional fields
        if (title.trim()) {
            postData.title = title.trim();
        }

        if (postType === 'ANNOUNCEMENT') {
            postData.requireAcknowledge = requireAcknowledge;
        }

        if (isPinned) {
            postData.isPinned = true;
        }

        if (scheduledAt) {
            postData.scheduledAt = scheduledAt;
        }

        if (targets.length > 0) {
            postData.targets = targets.map((t) => ({
                targetType: t.targetType,
                targetValue: t.targetValue,
                isExclusion: t.isExclusion,
            }));
        }

        if (attachments.length > 0) {
            postData.attachmentIds = attachments.map((a) => a.id);
        }

        await onSubmit(postData);
    }, [content, title, postType, visibilityType, targets, attachments, isPinned, requireAcknowledge, allowComments, scheduledAt, isValid, onSubmit]);

    // Handle adding a target
    const handleAddTarget = useCallback(() => {
        if (!selectedTargetValue) return;

        // Find label based on target type
        let targetLabel = selectedTargetValue;
        if (selectedTargetType === 'DEPARTMENT' && availableTargets?.departments) {
            const dept = availableTargets.departments.find((d) => d.id === selectedTargetValue);
            if (dept) targetLabel = dept.name;
        } else if (selectedTargetType === 'BRANCH' && availableTargets?.branches) {
            const branch = availableTargets.branches.find((b) => b.id === selectedTargetValue);
            if (branch) targetLabel = branch.name;
        } else if (selectedTargetType === 'TEAM' && availableTargets?.teams) {
            const team = availableTargets.teams.find((t) => t.id === selectedTargetValue);
            if (team) targetLabel = team.name;
        } else if (selectedTargetType === 'USER' && availableTargets?.users) {
            const user = availableTargets.users.find((u) => u.id === selectedTargetValue);
            if (user) targetLabel = user.name;
        }

        const newTarget: TargetItem = {
            targetType: selectedTargetType,
            targetValue: selectedTargetValue,
            targetLabel,
            isExclusion: false,
        };

        // Prevent duplicates
        const exists = targets.some(
            (t) => t.targetType === newTarget.targetType && t.targetValue === newTarget.targetValue
        );
        if (!exists) {
            setTargets((prev) => [...prev, newTarget]);
        }

        setSelectedTargetValue('');
    }, [selectedTargetType, selectedTargetValue, targets, availableTargets]);

    // Handle removing a target
    const handleRemoveTarget = useCallback((index: number) => {
        setTargets((prev) => prev.filter((_, i) => i !== index));
    }, []);

    // Handle file upload (simulated - actual upload would use an upload service)
    const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files) return;

        const newAttachments: AttachmentPreview[] = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const type: AttachmentPreview['type'] = file.type.startsWith('image/')
                ? 'IMAGE'
                : file.type.startsWith('video/')
                    ? 'VIDEO'
                    : 'DOCUMENT';

            newAttachments.push({
                id: `temp-${Date.now()}-${i}`,
                type,
                name: file.name,
                size: file.size,
                file,
            });
        }

        setAttachments((prev) => [...prev, ...newAttachments]);
        event.target.value = '';
    }, []);

    // Handle removing an attachment
    const handleRemoveAttachment = useCallback((index: number) => {
        setAttachments((prev) => prev.filter((_, i) => i !== index));
    }, []);

    // Get available options for target value selection
    const getTargetOptions = useCallback(() => {
        switch (selectedTargetType) {
            case 'BRANCH':
                return availableTargets?.branches || [];
            case 'DEPARTMENT':
                return availableTargets?.departments || [];
            case 'TEAM':
                return availableTargets?.teams || [];
            case 'USER':
                return availableTargets?.users || [];
            default:
                return [];
        }
    }, [selectedTargetType, availableTargets]);

    // Format file size
    const formatFileSize = (bytes?: number): string => {
        if (!bytes) return '';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <GlassCard sx={{ p: 3 }} hoverEffect={false}>
            {/* Header with user avatar and post type selector */}
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
                <Avatar
                    src={currentUser?.avatar}
                    sx={{
                        width: 48,
                        height: 48,
                        background: 'linear-gradient(135deg, #667eea, #764ba2)',
                        fontSize: '1rem',
                        fontWeight: 600,
                    }}
                >
                    {currentUser?.name ? getInitials(currentUser.name) : '?'}
                </Avatar>

                <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" fontWeight={600}>
                        {currentUser?.name || 'مستخدم'}
                    </Typography>
                    {currentUser?.jobTitle && (
                        <Typography variant="caption" color="text.secondary">
                            {currentUser.jobTitle}
                        </Typography>
                    )}
                </Box>

                {/* Post Type Selector */}
                <Box sx={{ display: 'flex', gap: 1 }}>
                    {Object.entries(postTypeConfig)
                        .filter(([type]) => {
                            // Filter out ANNOUNCEMENT if user doesn't have permission
                            if (type === 'ANNOUNCEMENT' && !canCreateAnnouncement) return false;
                            return true;
                        })
                        .map(([type, config]) => (
                            <Tooltip key={type} title={config.description}>
                                <Chip
                                    size="small"
                                    icon={config.icon}
                                    label={config.label}
                                    onClick={() => setPostType(type as PostType)}
                                    sx={{
                                        cursor: 'pointer',
                                        fontWeight: 600,
                                        fontSize: '0.7rem',
                                        ...(postType === type
                                            ? {
                                                background: `linear-gradient(135deg, ${config.gradient[0]}, ${config.gradient[1]})`,
                                                color: 'white',
                                                '& .MuiChip-icon': { color: 'white' },
                                            }
                                            : {
                                                background: 'rgba(0, 0, 0, 0.05)',
                                                '&:hover': {
                                                    background: `linear-gradient(135deg, ${config.gradient[0]}20, ${config.gradient[1]}20)`,
                                                },
                                            }),
                                    }}
                                />
                            </Tooltip>
                        ))}
                </Box>
            </Box>

            {/* Error Alert */}
            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => { }}>
                    {error}
                </Alert>
            )}

            {/* Title (optional for announcements) */}
            {postType === 'ANNOUNCEMENT' && (
                <TextField
                    fullWidth
                    placeholder="عنوان الإعلان (اختياري)"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    variant="standard"
                    sx={{ mb: 2 }}
                    InputProps={{
                        disableUnderline: true,
                        sx: { fontSize: '1.1rem', fontWeight: 600 },
                    }}
                />
            )}

            {/* Content Input */}
            <TextField
                fullWidth
                multiline
                minRows={3}
                maxRows={10}
                placeholder={
                    postType === 'ANNOUNCEMENT'
                        ? 'اكتب نص الإعلان هنا...'
                        : 'ما الذي تريد مشاركته؟'
                }
                value={content}
                onChange={(e) => setContent(e.target.value)}
                variant="standard"
                InputProps={{
                    disableUnderline: true,
                    sx: { fontSize: '0.95rem', lineHeight: 1.6 },
                }}
                sx={{ mb: 2 }}
            />

            {/* Attachments Preview */}
            {attachments.length > 0 && (
                <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {attachments.map((attachment, index) => (
                        <Paper
                            key={attachment.id}
                            elevation={0}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                p: 1,
                                borderRadius: 2,
                                bgcolor: 'rgba(0, 0, 0, 0.05)',
                                maxWidth: 200,
                            }}
                        >
                            {attachment.type === 'IMAGE' && <ImageIcon sx={{ fontSize: 18, color: '#10b981' }} />}
                            {attachment.type === 'VIDEO' && <VideoLibrary sx={{ fontSize: 18, color: '#8b5cf6' }} />}
                            {attachment.type === 'DOCUMENT' && <AttachFile sx={{ fontSize: 18, color: '#3b82f6' }} />}
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography variant="caption" noWrap sx={{ display: 'block' }}>
                                    {attachment.name}
                                </Typography>
                                {attachment.size && (
                                    <Typography variant="caption" color="text.secondary">
                                        {formatFileSize(attachment.size)}
                                    </Typography>
                                )}
                            </Box>
                            <IconButton size="small" onClick={() => handleRemoveAttachment(index)}>
                                <Close sx={{ fontSize: 16 }} />
                            </IconButton>
                        </Paper>
                    ))}
                </Box>
            )}

            {/* Targets Preview */}
            {visibilityType === 'TARGETED' && targets.length > 0 && (
                <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ width: '100%', mb: 0.5 }}>
                        الجمهور المستهدف:
                    </Typography>
                    {targets.map((target, index) => (
                        <Chip
                            key={`${target.targetType}-${target.targetValue}`}
                            size="small"
                            label={`${targetTypeLabels[target.targetType]}: ${target.targetLabel}`}
                            onDelete={() => handleRemoveTarget(index)}
                            sx={{
                                bgcolor: target.isExclusion ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                                color: target.isExclusion ? '#ef4444' : '#3b82f6',
                                fontWeight: 500,
                            }}
                        />
                    ))}
                </Box>
            )}

            {/* Action Bar */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    pt: 2,
                    borderTop: '1px solid rgba(0, 0, 0, 0.08)',
                }}
            >
                {/* Left: Attachment buttons */}
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <input
                        type="file"
                        id="image-upload"
                        accept="image/*"
                        multiple
                        hidden
                        onChange={handleFileSelect}
                    />
                    <Tooltip title="إضافة صورة">
                        <IconButton
                            size="small"
                            component="label"
                            htmlFor="image-upload"
                            sx={{ color: '#10b981' }}
                        >
                            <ImageIcon sx={{ fontSize: 20 }} />
                        </IconButton>
                    </Tooltip>

                    <input
                        type="file"
                        id="video-upload"
                        accept="video/*"
                        multiple
                        hidden
                        onChange={handleFileSelect}
                    />
                    <Tooltip title="إضافة فيديو">
                        <IconButton
                            size="small"
                            component="label"
                            htmlFor="video-upload"
                            sx={{ color: '#8b5cf6' }}
                        >
                            <VideoLibrary sx={{ fontSize: 20 }} />
                        </IconButton>
                    </Tooltip>

                    <input
                        type="file"
                        id="file-upload"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                        multiple
                        hidden
                        onChange={handleFileSelect}
                    />
                    <Tooltip title="إرفاق ملف">
                        <IconButton
                            size="small"
                            component="label"
                            htmlFor="file-upload"
                            sx={{ color: '#3b82f6' }}
                        >
                            <AttachFile sx={{ fontSize: 20 }} />
                        </IconButton>
                    </Tooltip>

                    {/* Visibility Selector */}
                    <FormControl size="small" sx={{ minWidth: 120, ml: 1 }}>
                        <Select
                            value={visibilityType}
                            onChange={(e) => setVisibilityType(e.target.value as VisibilityType)}
                            displayEmpty
                            sx={{
                                fontSize: '0.75rem',
                                '& .MuiSelect-select': { py: 0.75, display: 'flex', alignItems: 'center', gap: 0.5 },
                            }}
                        >
                            {Object.entries(visibilityConfig).map(([type, config]) => (
                                <MenuItem key={type} value={type} sx={{ fontSize: '0.8rem' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        {config.icon}
                                        {config.label}
                                    </Box>
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>

                {/* Right: Advanced options toggle and submit */}
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    {showAdvancedOptions && (
                        <Button
                            size="small"
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            endIcon={showAdvanced ? <ExpandLess /> : <ExpandMore />}
                            sx={{ color: 'text.secondary', fontSize: '0.75rem' }}
                        >
                            خيارات متقدمة
                        </Button>
                    )}

                    {onCancel && (
                        <Button size="small" onClick={onCancel} sx={{ color: 'text.secondary' }}>
                            إلغاء
                        </Button>
                    )}

                    <Button
                        variant="contained"
                        size="small"
                        onClick={handleSubmit}
                        disabled={!isValid || isSubmitting}
                        startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : <Send />}
                        sx={{
                            background: 'linear-gradient(135deg, #667eea, #764ba2)',
                            fontWeight: 600,
                            px: 3,
                            '&:hover': {
                                background: 'linear-gradient(135deg, #5a6fd6, #6a4190)',
                            },
                            '&:disabled': {
                                background: 'rgba(0, 0, 0, 0.12)',
                            },
                        }}
                    >
                        {isSubmitting ? 'جاري النشر...' : 'نشر'}
                    </Button>
                </Box>
            </Box>

            {/* Advanced Options Panel */}
            <Collapse in={showAdvanced}>
                <Box
                    sx={{
                        mt: 2,
                        pt: 2,
                        borderTop: '1px solid rgba(0, 0, 0, 0.08)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                    }}
                >
                    {/* Targeting Section */}
                    {visibilityType === 'TARGETED' && (
                        <Box>
                            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                                استهداف الجمهور
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                <FormControl size="small" sx={{ minWidth: 120 }}>
                                    <InputLabel>نوع الاستهداف</InputLabel>
                                    <Select
                                        value={selectedTargetType}
                                        onChange={(e) => {
                                            setSelectedTargetType(e.target.value as TargetType);
                                            setSelectedTargetValue('');
                                        }}
                                        label="نوع الاستهداف"
                                    >
                                        <MenuItem value="BRANCH">{targetTypeLabels.BRANCH}</MenuItem>
                                        <MenuItem value="DEPARTMENT">{targetTypeLabels.DEPARTMENT}</MenuItem>
                                        <MenuItem value="TEAM">{targetTypeLabels.TEAM}</MenuItem>
                                        <MenuItem value="USER">{targetTypeLabels.USER}</MenuItem>
                                    </Select>
                                </FormControl>

                                <Autocomplete
                                    size="small"
                                    sx={{ minWidth: 200, flex: 1 }}
                                    options={getTargetOptions()}
                                    getOptionLabel={(option) => option.name}
                                    value={getTargetOptions().find((o) => o.id === selectedTargetValue) || null}
                                    onChange={(_, newValue) => setSelectedTargetValue(newValue?.id || '')}
                                    renderInput={(params) => (
                                        <TextField {...params} label="اختر القيمة" />
                                    )}
                                    noOptionsText="لا توجد خيارات"
                                />

                                <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={handleAddTarget}
                                    disabled={!selectedTargetValue}
                                    startIcon={<Add />}
                                >
                                    إضافة
                                </Button>
                            </Box>
                        </Box>
                    )}

                    {/* Schedule Post */}
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                        <TextField
                            type="datetime-local"
                            size="small"
                            label="جدولة النشر"
                            value={scheduledAt}
                            onChange={(e) => setScheduledAt(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            sx={{ minWidth: 200 }}
                        />
                    </Box>

                    {/* Toggle Options */}
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={isPinned}
                                    onChange={(e) => setIsPinned(e.target.checked)}
                                    size="small"
                                />
                            }
                            label={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <PushPin sx={{ fontSize: 16 }} />
                                    <Typography variant="body2">تثبيت المنشور</Typography>
                                </Box>
                            }
                        />

                        {postType === 'ANNOUNCEMENT' && (
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={requireAcknowledge}
                                        onChange={(e) => setRequireAcknowledge(e.target.checked)}
                                        size="small"
                                    />
                                }
                                label={
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <CheckCircle sx={{ fontSize: 16 }} />
                                        <Typography variant="body2">يتطلب إقرار</Typography>
                                    </Box>
                                }
                            />
                        )}

                        <FormControlLabel
                            control={
                                <Switch
                                    checked={allowComments}
                                    onChange={(e) => setAllowComments(e.target.checked)}
                                    size="small"
                                />
                            }
                            label={<Typography variant="body2">السماح بالتعليقات</Typography>}
                        />
                    </Box>
                </Box>
            </Collapse>
        </GlassCard>
    );
};

export default CreatePost;
