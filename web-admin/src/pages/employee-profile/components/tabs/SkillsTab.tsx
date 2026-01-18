import {
    Box,
    Grid,
    Typography,
    Chip,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    MenuItem,
    Select,
    FormControl,
    InputLabel,
    IconButton,
    Alert,
    Snackbar,
    CircularProgress,
    LinearProgress,
    Tooltip,
} from '@mui/material';
import {
    Psychology,
    Add,
    Edit,
    Delete,
    Star,
    Verified,
    School,
    Code,
    Build,
    Brush,
    Language,
} from '@mui/icons-material';
import { useState } from 'react';
import { api } from '@/services/api.service';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Design Theme Colors
const theme = {
    coral: '#E8A87C',
    teal: '#41B3A3',
    navy: '#2D3748',
    white: '#FFFFFF',
    yellow: '#F5C469',
    green: '#81C784',
    red: '#E57373',
    purple: '#9575CD',
    blue: '#64B5F6',
};

interface SkillsTabProps {
    userId: string;
}

interface Skill {
    id: string;
    skillName: string;
    skillNameAr?: string;
    category?: string;
    proficiencyLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
    yearsExperience?: number;
    notes?: string;
    isVerified: boolean;
    verifiedAt?: string;
    createdAt: string;
}

interface SkillFormData {
    skillName: string;
    skillNameAr: string;
    category: string;
    proficiencyLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
    yearsExperience: string;
    notes: string;
}

const initialFormData: SkillFormData = {
    skillName: '',
    skillNameAr: '',
    category: '',
    proficiencyLevel: 'BEGINNER',
    yearsExperience: '',
    notes: '',
};

export const SkillsTab = ({ userId }: SkillsTabProps) => {
    const queryClient = useQueryClient();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
    const [formData, setFormData] = useState<SkillFormData>(initialFormData);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success',
    });
    const [deletingSkillId, setDeletingSkillId] = useState<string | null>(null);

    // Fetch skills
    const { data: skillsData, isLoading } = useQuery<any>({
        queryKey: ['employee-skills', userId],
        queryFn: () => api.get(`/employee-profile/${userId}/skills`),
        enabled: !!userId,
    });

    // Add skill mutation
    const addMutation = useMutation({
        mutationFn: async (data: any) => {
            return api.post(`/employee-profile/${userId}/skills`, data);
        },
        onSuccess: () => {
            setSnackbar({ open: true, message: 'تم إضافة المهارة بنجاح', severity: 'success' });
            queryClient.invalidateQueries({ queryKey: ['employee-skills', userId] });
            handleCloseDialog();
        },
        onError: (err: any) => {
            setSnackbar({
                open: true,
                message: err?.response?.data?.message || 'فشل إضافة المهارة',
                severity: 'error',
            });
        },
    });

    // Update skill mutation
    const updateMutation = useMutation({
        mutationFn: async ({ skillId, data }: { skillId: string; data: any }) => {
            return api.patch(`/employee-profile/${userId}/skills/${skillId}`, data);
        },
        onSuccess: () => {
            setSnackbar({ open: true, message: 'تم تحديث المهارة بنجاح', severity: 'success' });
            queryClient.invalidateQueries({ queryKey: ['employee-skills', userId] });
            handleCloseDialog();
        },
        onError: (err: any) => {
            setSnackbar({
                open: true,
                message: err?.response?.data?.message || 'فشل تحديث المهارة',
                severity: 'error',
            });
        },
    });

    // Delete skill mutation
    const deleteMutation = useMutation({
        mutationFn: (skillId: string) => api.delete(`/employee-profile/${userId}/skills/${skillId}`),
        onSuccess: () => {
            setSnackbar({ open: true, message: 'تم حذف المهارة بنجاح', severity: 'success' });
            queryClient.invalidateQueries({ queryKey: ['employee-skills', userId] });
            setDeletingSkillId(null);
        },
        onError: (err: any) => {
            setSnackbar({
                open: true,
                message: err?.response?.data?.message || 'فشل حذف المهارة',
                severity: 'error',
            });
            setDeletingSkillId(null);
        },
    });

    const handleOpenDialog = (skill?: Skill) => {
        if (skill) {
            setEditingSkill(skill);
            setFormData({
                skillName: skill.skillName,
                skillNameAr: skill.skillNameAr || '',
                category: skill.category || '',
                proficiencyLevel: skill.proficiencyLevel,
                yearsExperience: skill.yearsExperience?.toString() || '',
                notes: skill.notes || '',
            });
        } else {
            setEditingSkill(null);
            setFormData(initialFormData);
        }
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setEditingSkill(null);
        setFormData(initialFormData);
    };

    const handleSubmit = () => {
        const submitData = {
            skillName: formData.skillName,
            skillNameAr: formData.skillNameAr || undefined,
            category: formData.category || undefined,
            proficiencyLevel: formData.proficiencyLevel,
            yearsExperience: formData.yearsExperience ? parseInt(formData.yearsExperience, 10) : undefined,
            notes: formData.notes || undefined,
        };

        if (editingSkill) {
            updateMutation.mutate({ skillId: editingSkill.id, data: submitData });
        } else {
            addMutation.mutate(submitData);
        }
    };

    const handleDelete = (skillId: string) => {
        setDeletingSkillId(skillId);
        deleteMutation.mutate(skillId);
    };

    const getProficiencyLabel = (level: string) => {
        const labels: Record<string, string> = {
            BEGINNER: 'مبتدئ',
            INTERMEDIATE: 'متوسط',
            ADVANCED: 'متقدم',
            EXPERT: 'خبير',
        };
        return labels[level] || level;
    };

    const getProficiencyColor = (level: string) => {
        const colors: Record<string, string> = {
            BEGINNER: theme.yellow,
            INTERMEDIATE: theme.blue,
            ADVANCED: theme.teal,
            EXPERT: theme.coral,
        };
        return colors[level] || theme.navy;
    };

    const getProficiencyProgress = (level: string) => {
        const progress: Record<string, number> = {
            BEGINNER: 25,
            INTERMEDIATE: 50,
            ADVANCED: 75,
            EXPERT: 100,
        };
        return progress[level] || 0;
    };

    const getCategoryIcon = (category?: string) => {
        if (!category) return <Psychology sx={{ color: theme.coral }} />;
        const lowerCategory = category.toLowerCase();
        if (lowerCategory.includes('برمج') || lowerCategory.includes('تقن') || lowerCategory.includes('code') || lowerCategory.includes('tech')) {
            return <Code sx={{ color: theme.teal }} />;
        }
        if (lowerCategory.includes('لغ') || lowerCategory.includes('lang')) {
            return <Language sx={{ color: theme.blue }} />;
        }
        if (lowerCategory.includes('تصميم') || lowerCategory.includes('design')) {
            return <Brush sx={{ color: theme.purple }} />;
        }
        if (lowerCategory.includes('إدار') || lowerCategory.includes('manage')) {
            return <School sx={{ color: theme.yellow }} />;
        }
        if (lowerCategory.includes('فني') || lowerCategory.includes('mechanic') || lowerCategory.includes('tech')) {
            return <Build sx={{ color: theme.green }} />;
        }
        return <Psychology sx={{ color: theme.coral }} />;
    };

    const skills: Skill[] = skillsData?.skills || [];
    const byCategory: Record<string, Skill[]> = skillsData?.byCategory || {};
    const stats = skillsData?.stats || { totalSkills: 0, verifiedSkills: 0, expertSkills: 0 };

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress sx={{ color: theme.coral }} />
            </Box>
        );
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Stats Overview */}
            {skills.length > 0 && (
                <Grid container spacing={2}>
                    <Grid item xs={6} sm={3}>
                        <Box sx={{ bgcolor: theme.white, borderRadius: 3, p: 2, textAlign: 'center' }}>
                            <Typography variant="h4" fontWeight="bold" color={theme.teal}>
                                {stats.totalSkills}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                إجمالي المهارات
                            </Typography>
                        </Box>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <Box sx={{ bgcolor: theme.white, borderRadius: 3, p: 2, textAlign: 'center' }}>
                            <Typography variant="h4" fontWeight="bold" color={theme.coral}>
                                {stats.expertSkills}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                مستوى خبير
                            </Typography>
                        </Box>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <Box sx={{ bgcolor: theme.white, borderRadius: 3, p: 2, textAlign: 'center' }}>
                            <Typography variant="h4" fontWeight="bold" color={theme.green}>
                                {stats.verifiedSkills}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                مهارات موثقة
                            </Typography>
                        </Box>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <Box sx={{ bgcolor: theme.white, borderRadius: 3, p: 2, textAlign: 'center' }}>
                            <Typography variant="h4" fontWeight="bold" color={theme.navy}>
                                {stats.categories}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                الفئات
                            </Typography>
                        </Box>
                    </Grid>
                </Grid>
            )}

            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" fontWeight="bold" color={theme.navy}>
                    المهارات والكفاءات ({skills.length})
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => handleOpenDialog()}
                    sx={{ bgcolor: theme.teal, borderRadius: 3, '&:hover': { bgcolor: theme.coral } }}
                >
                    إضافة مهارة
                </Button>
            </Box>

            {/* Skills by Category */}
            {Object.keys(byCategory).length > 0 ? (
                Object.entries(byCategory).map(([category, categorySkills]) => (
                    <Box key={category} sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            {getCategoryIcon(category)}
                            <Typography variant="subtitle1" fontWeight="bold" color={theme.navy}>
                                {category || 'غير مصنف'}
                            </Typography>
                            <Chip
                                label={categorySkills.length}
                                size="small"
                                sx={{ bgcolor: `${theme.teal}20`, color: theme.teal }}
                            />
                        </Box>

                        <Grid container spacing={2}>
                            {categorySkills.map((skill: Skill) => (
                                <Grid item xs={12} sm={6} md={4} key={skill.id}>
                                    <Box
                                        sx={{
                                            bgcolor: theme.white,
                                            borderRadius: 4,
                                            p: 3,
                                            boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
                                            transition: 'transform 0.2s, box-shadow 0.2s',
                                            '&:hover': {
                                                transform: 'translateY(-2px)',
                                                boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
                                            },
                                            position: 'relative',
                                        }}
                                    >
                                        {/* Actions */}
                                        <Box sx={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: 0.5 }}>
                                            <IconButton
                                                size="small"
                                                onClick={() => handleOpenDialog(skill)}
                                                sx={{ color: theme.teal }}
                                            >
                                                <Edit fontSize="small" />
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                color="error"
                                                onClick={() => handleDelete(skill.id)}
                                                disabled={deletingSkillId === skill.id}
                                            >
                                                {deletingSkillId === skill.id ? (
                                                    <CircularProgress size={16} />
                                                ) : (
                                                    <Delete fontSize="small" />
                                                )}
                                            </IconButton>
                                        </Box>

                                        {/* Verified Badge */}
                                        {skill.isVerified && (
                                            <Tooltip title="مهارة موثقة">
                                                <Verified
                                                    sx={{
                                                        position: 'absolute',
                                                        top: 10,
                                                        right: 10,
                                                        color: theme.green,
                                                    }}
                                                />
                                            </Tooltip>
                                        )}

                                        {/* Skill Name */}
                                        <Box sx={{ mb: 2 }}>
                                            <Typography variant="body1" fontWeight="bold" color={theme.navy}>
                                                {skill.skillNameAr || skill.skillName}
                                            </Typography>
                                            {skill.skillNameAr && skill.skillName && (
                                                <Typography variant="caption" color="text.secondary">
                                                    {skill.skillName}
                                                </Typography>
                                            )}
                                        </Box>

                                        {/* Proficiency Level */}
                                        <Box sx={{ mb: 2 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                                <Typography variant="caption" color="text.secondary">
                                                    مستوى الإتقان
                                                </Typography>
                                                <Chip
                                                    label={getProficiencyLabel(skill.proficiencyLevel)}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: getProficiencyColor(skill.proficiencyLevel),
                                                        color: theme.white,
                                                        fontWeight: 600,
                                                        fontSize: '0.7rem',
                                                    }}
                                                />
                                            </Box>
                                            <LinearProgress
                                                variant="determinate"
                                                value={getProficiencyProgress(skill.proficiencyLevel)}
                                                sx={{
                                                    height: 6,
                                                    borderRadius: 3,
                                                    bgcolor: `${getProficiencyColor(skill.proficiencyLevel)}20`,
                                                    '& .MuiLinearProgress-bar': {
                                                        bgcolor: getProficiencyColor(skill.proficiencyLevel),
                                                        borderRadius: 3,
                                                    },
                                                }}
                                            />
                                        </Box>

                                        {/* Experience Years */}
                                        {skill.yearsExperience !== undefined && skill.yearsExperience > 0 && (
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                                <Star sx={{ fontSize: 16, color: theme.yellow }} />
                                                <Typography variant="body2" color="text.secondary">
                                                    {skill.yearsExperience} سنوات خبرة
                                                </Typography>
                                            </Box>
                                        )}

                                        {/* Notes */}
                                        {skill.notes && (
                                            <Typography
                                                variant="caption"
                                                color="text.secondary"
                                                sx={{
                                                    display: 'block',
                                                    mt: 1,
                                                    fontStyle: 'italic',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                {skill.notes}
                                            </Typography>
                                        )}
                                    </Box>
                                </Grid>
                            ))}
                        </Grid>
                    </Box>
                ))
            ) : (
                <Box sx={{ bgcolor: theme.white, borderRadius: 4, p: 6, textAlign: 'center' }}>
                    <Psychology sx={{ fontSize: 60, color: theme.coral, mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">
                        لا توجد مهارات مسجلة
                    </Typography>
                    <Button
                        variant="outlined"
                        startIcon={<Add />}
                        onClick={() => handleOpenDialog()}
                        sx={{ mt: 2, borderColor: theme.teal, color: theme.teal }}
                    >
                        إضافة مهارة جديدة
                    </Button>
                </Box>
            )}

            {/* Add/Edit Dialog */}
            <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>{editingSkill ? 'تعديل المهارة' : 'إضافة مهارة جديدة'}</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                        <TextField
                            label="اسم المهارة (بالإنجليزية)"
                            fullWidth
                            required
                            value={formData.skillName}
                            onChange={(e) => setFormData({ ...formData, skillName: e.target.value })}
                        />
                        <TextField
                            label="اسم المهارة (بالعربية)"
                            fullWidth
                            value={formData.skillNameAr}
                            onChange={(e) => setFormData({ ...formData, skillNameAr: e.target.value })}
                        />
                        <TextField
                            label="الفئة"
                            fullWidth
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            placeholder="مثال: البرمجة، اللغات، الإدارة"
                        />
                        <FormControl fullWidth>
                            <InputLabel>مستوى الإتقان</InputLabel>
                            <Select
                                label="مستوى الإتقان"
                                value={formData.proficiencyLevel}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        proficiencyLevel: e.target.value as SkillFormData['proficiencyLevel'],
                                    })
                                }
                            >
                                <MenuItem value="BEGINNER">مبتدئ</MenuItem>
                                <MenuItem value="INTERMEDIATE">متوسط</MenuItem>
                                <MenuItem value="ADVANCED">متقدم</MenuItem>
                                <MenuItem value="EXPERT">خبير</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField
                            label="سنوات الخبرة"
                            type="number"
                            fullWidth
                            value={formData.yearsExperience}
                            onChange={(e) => setFormData({ ...formData, yearsExperience: e.target.value })}
                            inputProps={{ min: 0, max: 50 }}
                        />
                        <TextField
                            label="ملاحظات"
                            fullWidth
                            multiline
                            rows={3}
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>إلغاء</Button>
                    <Button
                        variant="contained"
                        sx={{ bgcolor: theme.teal }}
                        onClick={handleSubmit}
                        disabled={addMutation.isPending || updateMutation.isPending || !formData.skillName}
                    >
                        {addMutation.isPending || updateMutation.isPending
                            ? 'جاري الحفظ...'
                            : editingSkill
                            ? 'حفظ التعديلات'
                            : 'إضافة'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar for notifications */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                    severity={snackbar.severity}
                    variant="filled"
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default SkillsTab;
