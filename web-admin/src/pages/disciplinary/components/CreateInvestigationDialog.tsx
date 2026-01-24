import { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Grid,
    Alert,
    FormControl,
    Select,
    MenuItem,
    Typography,
    Box,
    Autocomplete,
    Chip,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { arSA } from 'date-fns/locale';
import { differenceInDays } from 'date-fns';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { disciplinaryService } from '@/services/disciplinary.service';
import { usersService } from '@/services/users.service';
import { Info, Warning, Person, LocationOn, CalendarMonth, Description, Group, Category, AttachFile, Delete, CloudUpload } from '@mui/icons-material';

interface CreateInvestigationDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess?: (caseId?: string) => void;
}

// أنواع المخالفات
const VIOLATION_TYPES = [
    { value: 'ATTENDANCE', label: 'تأخير / غياب / انصراف مبكر', color: '#ff9800' },
    { value: 'BEHAVIOR', label: 'سلوك غير لائق', color: '#f44336' },
    { value: 'PERFORMANCE', label: 'تقصير في العمل', color: '#9c27b0' },
    { value: 'POLICY_VIOLATION', label: 'مخالفة سياسة الشركة', color: '#2196f3' },
    { value: 'SAFETY', label: 'مخالفة السلامة المهنية', color: '#ff5722' },
    { value: 'HARASSMENT', label: 'تحرش / إساءة', color: '#d32f2f' },
    { value: 'THEFT', label: 'سرقة / اختلاس', color: '#b71c1c' },
    { value: 'CONFIDENTIALITY', label: 'إفشاء معلومات سرية', color: '#673ab7' },
    { value: 'OTHER', label: 'أخرى', color: '#607d8b' },
];

export const CreateInvestigationDialog = ({ open, onClose, onSuccess }: CreateInvestigationDialogProps) => {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        employeeId: '',
        title: '',
        violationType: '',
        incidentDate: null as Date | null,
        incidentLocation: '',
        witnessIds: [] as string[],
        description: '',
        retrospectiveReason: '',
    });
    const [attachments, setAttachments] = useState<File[]>([]);
    const [error, setError] = useState<string | null>(null);

    // جلب قائمة الموظفين
    const { data: employeesData } = useQuery({
        queryKey: ['employees-list'],
        queryFn: () => usersService.getUsers({ role: 'EMPLOYEE', limit: 500 }),
        enabled: open,
    });
    const employees = employeesData?.data || [];

    const maxIncidentAge = 30;

    const incidentAgeWarning = formData.incidentDate
        ? differenceInDays(new Date(), formData.incidentDate) > maxIncidentAge
        : false;

    const mutation = useMutation({
        mutationFn: (data: any) => disciplinaryService.createCase(data),
        onSuccess: (response: any) => {
            queryClient.invalidateQueries({ queryKey: ['disciplinary-cases'] });
            resetForm();
            onClose();
            if (onSuccess) {
                onSuccess(response?.id || response?.data?.id);
            }
        },
        onError: (err: any) => {
            setError(err.response?.data?.message || 'حدث خطأ أثناء إنشاء الطلب');
        },
    });

    const resetForm = () => {
        setFormData({
            employeeId: '',
            title: '',
            violationType: '',
            incidentDate: null,
            incidentLocation: '',
            witnessIds: [],
            description: '',
            retrospectiveReason: '',
        });
        setAttachments([]);
        setError(null);
    };

    const handleSubmit = () => {
        if (!formData.employeeId || !formData.title || !formData.incidentDate || !formData.incidentLocation || !formData.description) {
            setError('الرجاء ملء جميع الحقول المطلوبة');
            return;
        }

        if (incidentAgeWarning && !formData.retrospectiveReason) {
            setError('تاريخ الواقعة أقدم من 30 يوماً. الرجاء ذكر سبب الإدخال المتأخر');
            return;
        }

        const submitData: any = {
            employeeId: formData.employeeId,
            title: formData.title,
            incidentDate: formData.incidentDate.toISOString(),
            incidentLocation: formData.incidentLocation,
            description: formData.description,
        };

        if (formData.violationType) submitData.violationType = formData.violationType;
        if (formData.witnessIds.length > 0) {
            const witnessNames = formData.witnessIds.map(id => {
                const emp = employees.find((e: any) => e.id === id);
                return emp ? `${emp.firstName} ${emp.lastName}` : id;
            }).join(', ');
            submitData.involvedParties = { witnesses: witnessNames, witnessIds: formData.witnessIds };
        }
        if (formData.retrospectiveReason) submitData.retrospectiveReason = formData.retrospectiveReason;

        mutation.mutate(submitData);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files) {
            const newFiles = Array.from(files).filter(file => {
                // تحقق من الحجم (10MB max)
                if (file.size > 10 * 1024 * 1024) {
                    setError(`الملف ${file.name} أكبر من 10MB`);
                    return false;
                }
                return true;
            });
            setAttachments(prev => [...prev, ...newFiles]);
        }
    };

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const selectedEmployee = employees.find((e: any) => e.id === formData.employeeId);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{
                borderBottom: 1,
                borderColor: 'divider',
                background: 'linear-gradient(135deg, #1a237e 0%, #283593 100%)',
                color: 'white',
            }}>
                <Typography variant="h6" fontWeight="bold">فتح طلب تحقيق جديد</Typography>
            </DialogTitle>
            <DialogContent sx={{ pt: 3 }}>
                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={arSA}>
                    <Grid container spacing={3}>
                        {error && (
                            <Grid item xs={12}>
                                <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>
                            </Grid>
                        )}

                        {/* الموظف المعني */}
                        <Grid item xs={12} md={6}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <Person fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                                <Typography variant="subtitle2" fontWeight="bold">الموظف المعني *</Typography>
                            </Box>
                            <Autocomplete
                                options={employees}
                                getOptionLabel={(option: any) => `${option.firstName} ${option.lastName} (${option.employeeCode || '-'})`}
                                value={selectedEmployee || null}
                                onChange={(_, newValue: any) => setFormData({ ...formData, employeeId: newValue?.id || '' })}
                                renderInput={(params) => (
                                    <TextField {...params} placeholder="اختر الموظف" required />
                                )}
                                noOptionsText="لا توجد نتائج"
                            />
                        </Grid>

                        {/* عنوان القضية */}
                        <Grid item xs={12} md={6}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <Description fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                                <Typography variant="subtitle2" fontWeight="bold">عنوان القضية / نوع المخالفة *</Typography>
                            </Box>
                            <TextField
                                fullWidth
                                required
                                placeholder="مثال: تأخر متكرر عن الحضور"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            />
                        </Grid>

                        {/* تاريخ الواقعة */}
                        <Grid item xs={12} md={6}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <CalendarMonth fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                                <Typography variant="subtitle2" fontWeight="bold">تاريخ الواقعة *</Typography>
                            </Box>
                            <DatePicker
                                value={formData.incidentDate}
                                onChange={(date: any) => setFormData({ ...formData, incidentDate: date ? new Date(date) : null })}
                                slotProps={{
                                    textField: { fullWidth: true, required: true },
                                }}
                                maxDate={new Date()}
                            />
                            {incidentAgeWarning && (
                                <Alert severity="warning" sx={{ mt: 1 }} icon={<Warning fontSize="small" />}>
                                    تاريخ الواقعة أقدم من {maxIncidentAge} يوماً. يلزم ذكر سبب الإدخال المتأخر.
                                </Alert>
                            )}
                        </Grid>

                        {/* مكان الواقعة */}
                        <Grid item xs={12} md={6}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <LocationOn fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                                <Typography variant="subtitle2" fontWeight="bold">مكان الواقعة *</Typography>
                            </Box>
                            <TextField
                                fullWidth
                                required
                                placeholder="الفرع / القسم / الموقع"
                                value={formData.incidentLocation}
                                onChange={(e) => setFormData({ ...formData, incidentLocation: e.target.value })}
                            />
                        </Grid>

                        {/* تصنيف المخالفة */}
                        <Grid item xs={12} md={6}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <Category fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                                <Typography variant="subtitle2" fontWeight="bold">تصنيف المخالفة</Typography>
                            </Box>
                            <FormControl fullWidth>
                                <Select
                                    value={formData.violationType}
                                    onChange={(e) => setFormData({ ...formData, violationType: e.target.value })}
                                    displayEmpty
                                >
                                    <MenuItem value="">-- اختر التصنيف --</MenuItem>
                                    {VIOLATION_TYPES.map((type) => (
                                        <MenuItem key={type.value} value={type.value}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: type.color }} />
                                                {type.label}
                                            </Box>
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>

                        {/* أطراف المشكلة / الشهود */}
                        <Grid item xs={12} md={6}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <Group fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                                <Typography variant="subtitle2" fontWeight="bold">الشهود (اختياري)</Typography>
                            </Box>
                            <Autocomplete
                                multiple
                                options={employees.filter((e: any) => e.id !== formData.employeeId)}
                                getOptionLabel={(option: any) => `${option.firstName} ${option.lastName}`}
                                value={employees.filter((e: any) => formData.witnessIds.includes(e.id))}
                                onChange={(_, newValue: any[]) => setFormData({ ...formData, witnessIds: newValue.map((v: any) => v.id) })}
                                renderTags={(value, getTagProps) =>
                                    value.map((option: any, index: number) => (
                                        <Chip
                                            label={`${option.firstName} ${option.lastName}`}
                                            size="small"
                                            {...getTagProps({ index })}
                                            key={option.id}
                                        />
                                    ))
                                }
                                renderInput={(params) => (
                                    <TextField {...params} placeholder="اختر الشهود من الموظفين" />
                                )}
                                noOptionsText="لا توجد نتائج"
                            />
                        </Grid>

                        {/* سبب الإدخال المتأخر */}
                        {incidentAgeWarning && (
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    required
                                    label="سبب الإدخال المتأخر"
                                    value={formData.retrospectiveReason}
                                    onChange={(e) => setFormData({ ...formData, retrospectiveReason: e.target.value })}
                                    multiline
                                    rows={2}
                                    error={incidentAgeWarning && !formData.retrospectiveReason}
                                />
                            </Grid>
                        )}

                        {/* وصف الواقعة */}
                        <Grid item xs={12}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <Description fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                                <Typography variant="subtitle2" fontWeight="bold">وصف الواقعة *</Typography>
                            </Box>
                            <TextField
                                fullWidth
                                required
                                placeholder="اكتب تفاصيل الواقعة بوضوح..."
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                multiline
                                rows={5}
                                inputProps={{ maxLength: 5000 }}
                                helperText={`${formData.description.length}/5000 حرف`}
                            />
                        </Grid>

                        {/* ملاحظات مهمة */}
                        <Grid item xs={12}>
                            <Box sx={{
                                p: 2,
                                bgcolor: '#fff8e1',
                                borderRadius: 2,
                                border: '1px solid #ffe082',
                            }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                    <Info fontSize="small" sx={{ mr: 1, color: '#f9a825' }} />
                                    <Typography variant="subtitle2" fontWeight="bold" color="#f57f17">
                                        ملاحظات مهمة:
                                    </Typography>
                                </Box>
                                <Box component="ul" sx={{ m: 0, pl: 3, color: 'text.secondary' }}>
                                    <li>سيتم إرسال الطلب لقسم الموارد البشرية للمراجعة</li>
                                    <li>يمكن إرفاق ملفات بعد إنشاء الطلب</li>
                                    <li>الموظف سيتم إبلاغه بالواقعة بعد موافقة HR</li>
                                </Box>
                            </Box>
                        </Grid>

                        {/* المرفقات */}
                        <Grid item xs={12}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <AttachFile fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                                <Typography variant="subtitle2" fontWeight="bold">المرفقات (اختياري)</Typography>
                            </Box>
                            <Box
                                sx={{
                                    border: '2px dashed #ccc',
                                    borderRadius: 2,
                                    p: 3,
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
                                    transition: 'all 0.2s',
                                }}
                                onClick={() => document.getElementById('file-input')?.click()}
                            >
                                <input
                                    type="file"
                                    id="file-input"
                                    multiple
                                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                                    style={{ display: 'none' }}
                                    onChange={handleFileChange}
                                />
                                <CloudUpload sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                                <Typography variant="body2" color="text.secondary">
                                    اضغط لاختيار ملفات أو اسحبها هنا
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    (صور، PDF، Word، Excel - حد أقصى 10MB لكل ملف)
                                </Typography>
                            </Box>

                            {/* عرض الملفات المرفقة */}
                            {attachments.length > 0 && (
                                <Box sx={{ mt: 2 }}>
                                    {attachments.map((file, index) => (
                                        <Box
                                            key={index}
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                p: 1,
                                                mb: 1,
                                                bgcolor: 'grey.100',
                                                borderRadius: 1,
                                            }}
                                        >
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <AttachFile fontSize="small" />
                                                <Typography variant="body2" noWrap sx={{ maxWidth: 300 }}>
                                                    {file.name}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    ({(file.size / 1024).toFixed(1)} KB)
                                                </Typography>
                                            </Box>
                                            <Button
                                                size="small"
                                                color="error"
                                                onClick={() => removeAttachment(index)}
                                                startIcon={<Delete fontSize="small" />}
                                            >
                                                حذف
                                            </Button>
                                        </Box>
                                    ))}
                                </Box>
                            )}
                        </Grid>
                    </Grid>
                </LocalizationProvider>
            </DialogContent>
            <DialogActions sx={{ p: 2, borderTop: 1, borderColor: 'divider', gap: 1 }}>
                <Button onClick={onClose} disabled={mutation.isPending} variant="outlined">
                    إلغاء
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={mutation.isPending}
                    sx={{
                        background: 'linear-gradient(135deg, #1a237e 0%, #283593 100%)',
                        px: 4,
                    }}
                >
                    {mutation.isPending ? 'جاري الإرسال...' : 'إرسال الطلب'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
