import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
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
    Paper,
    Alert,
    CircularProgress,
    Chip,
    Stepper,
    Step,
    StepLabel,
    Grid,
} from '@mui/material';
import {
    CloudUpload,
    Download,
    CheckCircle,
    Error as ErrorIcon,
    Warning,
    ArrowBack,
    ArrowForward,
    Refresh,
} from '@mui/icons-material';
import { API_URL } from '@/services/api.service';

interface ValidationResult {
    fileName: string;
    totalRows: number;
    valid: boolean;
    warnings: { row: number; message: string }[];
    errors: { row: number; field: string; message: string }[];
}

interface ImportResult {
    success: boolean;
    message: string;
    totalRows: number;
    created: number;
    updated: number;
    skipped: number;
    errors: { row: number; field: string; message: string }[];
}

const steps = ['اختيار الملف', 'التحقق من البيانات', 'الاستيراد'];

export default function EmployeeImportPage() {
    const navigate = useNavigate();
    const [activeStep, setActiveStep] = useState(0);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [validation, setValidation] = useState<ValidationResult | null>(null);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);
    const [dragOver, setDragOver] = useState(false);

    // Validate file upload
    const validateMutation = useMutation({
        mutationFn: async (file: File) => {
            const formData = new FormData();
            formData.append('file', file);
            const response = await fetch(`${API_URL}/users/import/validate`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
                body: formData,
            });
            if (!response.ok) throw new Error('فشل التحقق من الملف');
            return response.json();
        },
        onSuccess: (data: ValidationResult) => {
            setValidation(data);
            setActiveStep(1);
        },
    });

    // Import employees
    const importMutation = useMutation({
        mutationFn: async (file: File) => {
            const formData = new FormData();
            formData.append('file', file);
            const response = await fetch(`${API_URL}/users/import`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
                body: formData,
            });
            if (!response.ok) throw new Error('فشل استيراد الموظفين');
            return response.json();
        },
        onSuccess: (data: ImportResult) => {
            setImportResult(data);
            setActiveStep(2);
        },
    });

    // Download template
    const handleDownloadTemplate = async () => {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`${API_URL}/users/import/template`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'employee_import_template.csv';
        a.click();
    };

    // Handle file selection
    const handleFileSelect = (file: File) => {
        if (!file.name.endsWith('.csv')) {
            alert('الرجاء اختيار ملف CSV');
            return;
        }
        setSelectedFile(file);
        validateMutation.mutate(file);
    };

    // Drag and drop handlers
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFileSelect(file);
    }, []);

    // Start import
    const handleImport = () => {
        if (selectedFile) {
            importMutation.mutate(selectedFile);
        }
    };

    // Reset
    const handleReset = () => {
        setActiveStep(0);
        setSelectedFile(null);
        setValidation(null);
        setImportResult(null);
    };

    return (
        <Box p={3}>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                <Box>
                    <Typography variant="h4" fontWeight="bold" gutterBottom>
                        استيراد الموظفين
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        استيراد بيانات الموظفين من ملف CSV
                    </Typography>
                </Box>
                <Box display="flex" gap={2}>
                    <Button
                        variant="outlined"
                        startIcon={<ArrowBack />}
                        onClick={() => navigate('/users')}
                    >
                        العودة للموظفين
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<Download />}
                        onClick={handleDownloadTemplate}
                    >
                        تحميل القالب
                    </Button>
                </Box>
            </Box>

            {/* Stepper */}
            <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
                {steps.map((label) => (
                    <Step key={label}>
                        <StepLabel>{label}</StepLabel>
                    </Step>
                ))}
            </Stepper>

            {/* Step 1: File Selection */}
            {activeStep === 0 && (
                <Card>
                    <CardContent>
                        <Box
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            sx={{
                                border: '2px dashed',
                                borderColor: dragOver ? 'primary.main' : 'grey.300',
                                borderRadius: 3,
                                p: 6,
                                textAlign: 'center',
                                bgcolor: dragOver ? 'primary.50' : 'grey.50',
                                cursor: 'pointer',
                                transition: 'all 0.3s',
                            }}
                            onClick={() => document.getElementById('file-input')?.click()}
                        >
                            <input
                                id="file-input"
                                type="file"
                                accept=".csv"
                                hidden
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleFileSelect(file);
                                }}
                            />
                            {validateMutation.isPending ? (
                                <CircularProgress />
                            ) : (
                                <>
                                    <CloudUpload sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
                                    <Typography variant="h6" gutterBottom>
                                        اسحب الملف هنا أو اضغط للاختيار
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        يجب أن يكون الملف بصيغة CSV
                                    </Typography>
                                </>
                            )}
                        </Box>

                        <Alert severity="info" sx={{ mt: 3 }}>
                            <Typography variant="body2">
                                <strong>نصائح:</strong>
                                <ul style={{ margin: '8px 0 0 0', paddingRight: '20px' }}>
                                    <li>قم بتحميل القالب أولاً وأضف البيانات فيه</li>
                                    <li>الحقول الإلزامية: الاسم الأول، الاسم الأخير، البريد الإلكتروني</li>
                                    <li>إذا كان الموظف موجوداً بنفس البريد أو الهوية، سيتم تحديث بياناته</li>
                                    <li>كلمة المرور الافتراضية للموظفين الجدد: <code>Temp@123</code></li>
                                </ul>
                            </Typography>
                        </Alert>
                    </CardContent>
                </Card>
            )}

            {/* Step 2: Validation */}
            {activeStep === 1 && validation && (
                <Card>
                    <CardContent>
                        <Grid container spacing={2} sx={{ mb: 3 }}>
                            <Grid item xs={4}>
                                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.50' }}>
                                    <Typography variant="h4" fontWeight="bold" color="primary">
                                        {validation.totalRows}
                                    </Typography>
                                    <Typography variant="body2">إجمالي الصفوف</Typography>
                                </Paper>
                            </Grid>
                            <Grid item xs={4}>
                                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: validation.valid ? 'success.50' : 'error.50' }}>
                                    <Typography variant="h4" fontWeight="bold" color={validation.valid ? 'success.main' : 'error.main'}>
                                        {validation.errors.length}
                                    </Typography>
                                    <Typography variant="body2">أخطاء</Typography>
                                </Paper>
                            </Grid>
                            <Grid item xs={4}>
                                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.50' }}>
                                    <Typography variant="h4" fontWeight="bold" color="warning.main">
                                        {validation.warnings.length}
                                    </Typography>
                                    <Typography variant="body2">تحذيرات</Typography>
                                </Paper>
                            </Grid>
                        </Grid>

                        {validation.valid ? (
                            <Alert severity="success" icon={<CheckCircle />} sx={{ mb: 3 }}>
                                الملف جاهز للاستيراد - لا توجد أخطاء
                            </Alert>
                        ) : (
                            <Alert severity="error" icon={<ErrorIcon />} sx={{ mb: 3 }}>
                                يوجد {validation.errors.length} خطأ يجب إصلاحها قبل الاستيراد
                            </Alert>
                        )}

                        {validation.errors.length > 0 && (
                            <Box sx={{ mb: 3 }}>
                                <Typography variant="h6" gutterBottom>
                                    الأخطاء
                                </Typography>
                                <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
                                    <Table size="small" stickyHeader>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>الصف</TableCell>
                                                <TableCell>الحقل</TableCell>
                                                <TableCell>الرسالة</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {validation.errors.map((err, i) => (
                                                <TableRow key={i}>
                                                    <TableCell><Chip label={err.row} size="small" color="error" /></TableCell>
                                                    <TableCell>{err.field}</TableCell>
                                                    <TableCell>{err.message}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Box>
                        )}

                        {validation.warnings.length > 0 && (
                            <Box sx={{ mb: 3 }}>
                                <Typography variant="h6" gutterBottom>
                                    التحذيرات
                                </Typography>
                                <TableContainer component={Paper} sx={{ maxHeight: 200 }}>
                                    <Table size="small" stickyHeader>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>الصف</TableCell>
                                                <TableCell>الرسالة</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {validation.warnings.map((warn, i) => (
                                                <TableRow key={i}>
                                                    <TableCell><Chip label={warn.row} size="small" color="warning" /></TableCell>
                                                    <TableCell>{warn.message}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Box>
                        )}

                        <Box display="flex" gap={2} justifyContent="flex-end">
                            <Button variant="outlined" onClick={handleReset}>
                                اختيار ملف آخر
                            </Button>
                            <Button
                                variant="contained"
                                startIcon={importMutation.isPending ? <CircularProgress size={20} /> : <ArrowForward />}
                                onClick={handleImport}
                                disabled={!validation.valid || importMutation.isPending}
                            >
                                {importMutation.isPending ? 'جاري الاستيراد...' : 'بدء الاستيراد'}
                            </Button>
                        </Box>
                    </CardContent>
                </Card>
            )}

            {/* Step 3: Results */}
            {activeStep === 2 && importResult && (
                <Card>
                    <CardContent>
                        <Box textAlign="center" py={4}>
                            {importResult.success ? (
                                <CheckCircle sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
                            ) : (
                                <Warning sx={{ fontSize: 80, color: 'warning.main', mb: 2 }} />
                            )}
                            <Typography variant="h5" fontWeight="bold" gutterBottom>
                                {importResult.message}
                            </Typography>
                        </Box>

                        <Grid container spacing={2} sx={{ mb: 4 }}>
                            <Grid item xs={3}>
                                <Paper sx={{ p: 2, textAlign: 'center' }}>
                                    <Typography variant="h4" fontWeight="bold">{importResult.totalRows}</Typography>
                                    <Typography variant="body2" color="text.secondary">إجمالي الصفوف</Typography>
                                </Paper>
                            </Grid>
                            <Grid item xs={3}>
                                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.50' }}>
                                    <Typography variant="h4" fontWeight="bold" color="success.main">{importResult.created}</Typography>
                                    <Typography variant="body2" color="text.secondary">موظف جديد</Typography>
                                </Paper>
                            </Grid>
                            <Grid item xs={3}>
                                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'info.50' }}>
                                    <Typography variant="h4" fontWeight="bold" color="info.main">{importResult.updated}</Typography>
                                    <Typography variant="body2" color="text.secondary">تم تحديثه</Typography>
                                </Paper>
                            </Grid>
                            <Grid item xs={3}>
                                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'error.50' }}>
                                    <Typography variant="h4" fontWeight="bold" color="error.main">{importResult.skipped}</Typography>
                                    <Typography variant="body2" color="text.secondary">تم تخطيه</Typography>
                                </Paper>
                            </Grid>
                        </Grid>

                        {importResult.errors.length > 0 && (
                            <Box sx={{ mb: 3 }}>
                                <Typography variant="h6" gutterBottom>
                                    الأخطاء
                                </Typography>
                                <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>الصف</TableCell>
                                                <TableCell>الحقل</TableCell>
                                                <TableCell>الرسالة</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {importResult.errors.map((err, i) => (
                                                <TableRow key={i}>
                                                    <TableCell><Chip label={err.row} size="small" color="error" /></TableCell>
                                                    <TableCell>{err.field}</TableCell>
                                                    <TableCell>{err.message}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Box>
                        )}

                        <Box display="flex" gap={2} justifyContent="center">
                            <Button
                                variant="outlined"
                                startIcon={<Refresh />}
                                onClick={handleReset}
                            >
                                استيراد آخر
                            </Button>
                            <Button
                                variant="contained"
                                onClick={() => navigate('/users')}
                            >
                                عرض الموظفين
                            </Button>
                        </Box>
                    </CardContent>
                </Card>
            )}
        </Box>
    );
}
