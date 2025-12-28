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
    Select,
    MenuItem,
    FormControl,
    Tooltip,
    LinearProgress,
} from '@mui/material';
import {
    CloudUpload,
    Download,
    CheckCircle,
    Warning,
    ArrowBack,
    ArrowForward,
    Refresh,
    AutoAwesome,
    AddCircle,
} from '@mui/icons-material';
import { API_URL } from '@/services/api.service';

// Interfaces
interface ColumnMapping {
    sourceColumn: string;
    targetField: string | null;
    confidence: number;
    isCustomField: boolean;
    suggestions: string[];
}

interface SmartAnalysisResult {
    fileName: string;
    headers: string[];
    mappings: {
        mappings: ColumnMapping[];
        unmappedColumns: string[];
        autoMappedCount: number;
        customFieldsCount: number;
    };
    preview: Record<string, string>[];
}

interface ImportResult {
    success: boolean;
    message: string;
    totalRows: number;
    created: number;
    updated: number;
    skipped: number;
    customFieldsAdded: number;
    errors: { row: number; field: string; message: string }[];
}

// Known fields with Arabic labels
const FIELD_LABELS: Record<string, string> = {
    first_name: 'الاسم الأول',
    last_name: 'الاسم الأخير',
    email: 'البريد الإلكتروني',
    phone: 'رقم الهاتف',
    password: 'كلمة المرور',
    employee_code: 'كود الموظف',
    national_id: 'رقم الهوية',
    iqama_number: 'رقم الإقامة',
    gosi_number: 'رقم التأمينات',
    passport_number: 'رقم الجواز',
    date_of_birth: 'تاريخ الميلاد',
    gender: 'الجنس',
    nationality: 'الجنسية',
    is_saudi: 'سعودي',
    marital_status: 'الحالة الاجتماعية',
    job_title: 'المسمى الوظيفي',
    role: 'الدور',
    hire_date: 'تاريخ التعيين',
    salary: 'الراتب',
    branch_code: 'الفرع',
    department_code: 'القسم',
    passport_expiry: 'انتهاء الجواز',
    iqama_expiry: 'انتهاء الإقامة',
};

const KNOWN_FIELDS = Object.keys(FIELD_LABELS);

const steps = ['اختيار الملف', 'مطابقة الأعمدة', 'التحقق والاستيراد', 'النتيجة'];

export default function EmployeeImportPage() {
    const navigate = useNavigate();
    const [activeStep, setActiveStep] = useState(0);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [analysis, setAnalysis] = useState<SmartAnalysisResult | null>(null);
    const [columnMappings, setColumnMappings] = useState<Record<string, string | null>>({});
    const [importResult, setImportResult] = useState<ImportResult | null>(null);
    const [dragOver, setDragOver] = useState(false);

    // Smart analyze file
    const analyzeMutation = useMutation({
        mutationFn: async (file: File) => {
            const formData = new FormData();
            formData.append('file', file);
            const response = await fetch(`${API_URL}/users/import/smart-analyze`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
                body: formData,
            });
            if (!response.ok) throw new Error('فشل تحليل الملف');
            return response.json();
        },
        onSuccess: (data: SmartAnalysisResult) => {
            setAnalysis(data);
            // Initialize mappings from analysis
            const initialMappings: Record<string, string | null> = {};
            data.mappings.mappings.forEach(m => {
                initialMappings[m.sourceColumn] = m.targetField;
            });
            setColumnMappings(initialMappings);
            setActiveStep(1);
        },
    });

    // Smart import
    const importMutation = useMutation({
        mutationFn: async () => {
            if (!selectedFile) throw new Error('لا يوجد ملف محدد');
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('mappings', JSON.stringify(columnMappings));
            const response = await fetch(`${API_URL}/users/import/smart-import`, {
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
            setActiveStep(3);
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
        analyzeMutation.mutate(file);
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

    // Update column mapping
    const handleMappingChange = (sourceColumn: string, targetField: string | null) => {
        setColumnMappings(prev => ({
            ...prev,
            [sourceColumn]: targetField === '' ? null : targetField,
        }));
    };

    // Start import
    const handleImport = () => {
        importMutation.mutate();
    };

    // Reset
    const handleReset = () => {
        setActiveStep(0);
        setSelectedFile(null);
        setAnalysis(null);
        setColumnMappings({});
        setImportResult(null);
    };

    // Render step content
    const renderStepContent = () => {
        switch (activeStep) {
            case 0:
                return renderFileUpload();
            case 1:
                return renderColumnMapping();
            case 2:
                return renderPreviewAndConfirm();
            case 3:
                return renderResult();
            default:
                return null;
        }
    };

    // Step 0: File Upload
    const renderFileUpload = () => (
        <Card>
            <CardContent>
                <Grid container spacing={3}>
                    {/* Upload Area */}
                    <Grid item xs={12} md={8}>
                        <Box
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            sx={{
                                border: '2px dashed',
                                borderColor: dragOver ? 'primary.main' : 'grey.300',
                                borderRadius: 2,
                                p: 6,
                                textAlign: 'center',
                                bgcolor: dragOver ? 'action.hover' : 'background.paper',
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
                            {analyzeMutation.isPending ? (
                                <>
                                    <CircularProgress size={48} sx={{ mb: 2 }} />
                                    <Typography>جاري تحليل الملف...</Typography>
                                </>
                            ) : (
                                <>
                                    <CloudUpload sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
                                    <Typography variant="h6" gutterBottom>
                                        اسحب الملف هنا أو اضغط للاختيار
                                    </Typography>
                                    <Typography color="text.secondary">
                                        يدعم ملفات CSV فقط
                                    </Typography>
                                </>
                            )}
                        </Box>
                    </Grid>

                    {/* Instructions */}
                    <Grid item xs={12} md={4}>
                        <Alert severity="info" sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>
                                ✨ الاستيراد الذكي
                            </Typography>
                            <Typography variant="body2">
                                النظام سيتعرف تلقائياً على أسماء الأعمدة ويطابقها مع الحقول المناسبة.
                            </Typography>
                        </Alert>
                        <Button
                            variant="outlined"
                            fullWidth
                            startIcon={<Download />}
                            onClick={handleDownloadTemplate}
                            sx={{ mb: 2 }}
                        >
                            تحميل القالب
                        </Button>
                        <Typography variant="body2" color="text.secondary">
                            <strong>ملاحظات:</strong>
                            <ul style={{ paddingRight: 16, margin: '8px 0' }}>
                                <li>الحقول الإلزامية: الاسم الأول، البريد الإلكتروني</li>
                                <li>الحقول الغير معروفة ستُضاف كحقول مخصصة</li>
                                <li>سيتم تحديث بيانات الموظفين الموجودين</li>
                            </ul>
                        </Typography>
                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    );

    // Step 1: Column Mapping
    const renderColumnMapping = () => {
        if (!analysis) return null;

        const customCount = Object.values(columnMappings).filter(v => v === null).length;

        return (
            <Card>
                <CardContent>
                    {/* Summary */}
                    <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
                        <Chip
                            icon={<AutoAwesome />}
                            label={`${analysis.mappings.autoMappedCount} عمود تم التعرف عليه تلقائياً`}
                            color="success"
                        />
                        <Chip
                            icon={<AddCircle />}
                            label={`${customCount} حقل مخصص جديد`}
                            color="warning"
                            variant="outlined"
                        />
                    </Box>

                    {/* Mapping Table */}
                    <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: 'grey.100' }}>
                                    <TableCell sx={{ fontWeight: 'bold' }}>عمود الملف</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>الثقة</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', width: 250 }}>الحقل المطابق</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>معاينة البيانات</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {analysis.mappings.mappings.map((mapping) => (
                                    <TableRow key={mapping.sourceColumn} hover>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight="medium">
                                                {mapping.sourceColumn}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            {mapping.confidence > 0 ? (
                                                <Tooltip title={`${Math.round(mapping.confidence * 100)}%`}>
                                                    <LinearProgress
                                                        variant="determinate"
                                                        value={mapping.confidence * 100}
                                                        color={mapping.confidence > 0.8 ? 'success' : mapping.confidence > 0.5 ? 'warning' : 'error'}
                                                        sx={{ height: 8, borderRadius: 4, width: 60 }}
                                                    />
                                                </Tooltip>
                                            ) : (
                                                <Chip label="جديد" size="small" color="warning" />
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <FormControl fullWidth size="small">
                                                <Select
                                                    value={columnMappings[mapping.sourceColumn] || ''}
                                                    onChange={(e) => handleMappingChange(
                                                        mapping.sourceColumn,
                                                        e.target.value as string | null
                                                    )}
                                                    displayEmpty
                                                >
                                                    <MenuItem value="">
                                                        <em style={{ color: '#f57c00' }}>
                                                            <AddCircle sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                                                            إضافة كحقل مخصص
                                                        </em>
                                                    </MenuItem>
                                                    <MenuItem disabled sx={{ opacity: 0.7, fontSize: 12 }}>
                                                        ── الحقول المعروفة ──
                                                    </MenuItem>
                                                    {KNOWN_FIELDS.map(field => (
                                                        <MenuItem key={field} value={field}>
                                                            {FIELD_LABELS[field]}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 200, display: 'block' }}>
                                                {analysis.preview[0]?.[mapping.sourceColumn] || '-'}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    {/* Actions */}
                    <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
                        <Button
                            variant="outlined"
                            startIcon={<ArrowBack />}
                            onClick={handleReset}
                        >
                            العودة
                        </Button>
                        <Button
                            variant="contained"
                            endIcon={<ArrowForward />}
                            onClick={() => setActiveStep(2)}
                        >
                            التالي
                        </Button>
                    </Box>
                </CardContent>
            </Card>
        );
    };

    // Step 2: Preview and Confirm
    const renderPreviewAndConfirm = () => {
        if (!analysis) return null;

        const customFields = Object.entries(columnMappings)
            .filter(([_, target]) => target === null)
            .map(([source]) => source);

        return (
            <Card>
                <CardContent>
                    {/* Summary */}
                    <Alert severity="info" sx={{ mb: 3 }}>
                        <Typography variant="subtitle2">
                            ملخص الاستيراد
                        </Typography>
                        <Typography variant="body2">
                            • سيتم استيراد <strong>{analysis.preview.length}</strong> موظف أو أكثر<br />
                            • <strong>{Object.values(columnMappings).filter(v => v !== null).length}</strong> حقل معروف<br />
                            {customFields.length > 0 && (
                                <>• <strong>{customFields.length}</strong> حقل مخصص: {customFields.join('، ')}</>
                            )}
                        </Typography>
                    </Alert>

                    {/* Preview Table */}
                    <Typography variant="subtitle2" gutterBottom>
                        معاينة البيانات (أول 5 صفوف):
                    </Typography>
                    <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 300, overflow: 'auto' }}>
                        <Table size="small" stickyHeader>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>#</TableCell>
                                    {analysis.headers.map(h => (
                                        <TableCell key={h} sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>
                                            {h}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {analysis.preview.map((row, idx) => (
                                    <TableRow key={idx} hover>
                                        <TableCell>{idx + 1}</TableCell>
                                        {analysis.headers.map(h => (
                                            <TableCell key={h}>{row[h] || '-'}</TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    {/* Actions */}
                    <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
                        <Button
                            variant="outlined"
                            startIcon={<ArrowBack />}
                            onClick={() => setActiveStep(1)}
                        >
                            العودة
                        </Button>
                        <Button
                            variant="contained"
                            color="success"
                            startIcon={importMutation.isPending ? <CircularProgress size={20} /> : <CheckCircle />}
                            onClick={handleImport}
                            disabled={importMutation.isPending}
                        >
                            {importMutation.isPending ? 'جاري الاستيراد...' : 'بدء الاستيراد'}
                        </Button>
                    </Box>
                </CardContent>
            </Card>
        );
    };

    // Step 3: Result
    const renderResult = () => {
        if (!importResult) return null;

        return (
            <Card>
                <CardContent sx={{ textAlign: 'center', py: 4 }}>
                    {importResult.success ? (
                        <>
                            <CheckCircle sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
                            <Typography variant="h5" gutterBottom color="success.main">
                                تم الاستيراد بنجاح!
                            </Typography>
                        </>
                    ) : (
                        <>
                            <Warning sx={{ fontSize: 80, color: 'warning.main', mb: 2 }} />
                            <Typography variant="h5" gutterBottom color="warning.main">
                                تم الاستيراد مع بعض المشاكل
                            </Typography>
                        </>
                    )}

                    <Typography variant="body1" sx={{ mb: 3 }}>
                        {importResult.message}
                    </Typography>

                    {/* Stats */}
                    <Grid container spacing={2} justifyContent="center" sx={{ mb: 3 }}>
                        <Grid item xs={6} sm={3}>
                            <Paper sx={{ p: 2, bgcolor: 'success.light' }}>
                                <Typography variant="h4" color="success.dark">{importResult.created}</Typography>
                                <Typography variant="body2">موظف جديد</Typography>
                            </Paper>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                            <Paper sx={{ p: 2, bgcolor: 'info.light' }}>
                                <Typography variant="h4" color="info.dark">{importResult.updated}</Typography>
                                <Typography variant="body2">تم تحديثهم</Typography>
                            </Paper>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                            <Paper sx={{ p: 2, bgcolor: 'warning.light' }}>
                                <Typography variant="h4" color="warning.dark">{importResult.customFieldsAdded}</Typography>
                                <Typography variant="body2">حقل مخصص</Typography>
                            </Paper>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                            <Paper sx={{ p: 2, bgcolor: importResult.skipped > 0 ? 'error.light' : 'grey.200' }}>
                                <Typography variant="h4" color={importResult.skipped > 0 ? 'error.dark' : 'text.secondary'}>
                                    {importResult.skipped}
                                </Typography>
                                <Typography variant="body2">تم تخطيهم</Typography>
                            </Paper>
                        </Grid>
                    </Grid>

                    {/* Errors */}
                    {importResult.errors.length > 0 && (
                        <Alert severity="error" sx={{ mb: 3, textAlign: 'right' }}>
                            <Typography variant="subtitle2" gutterBottom>
                                أخطاء ({importResult.errors.length}):
                            </Typography>
                            {importResult.errors.slice(0, 5).map((err, idx) => (
                                <Typography key={idx} variant="body2">
                                    صف {err.row}: {err.message}
                                </Typography>
                            ))}
                            {importResult.errors.length > 5 && (
                                <Typography variant="body2">
                                    و {importResult.errors.length - 5} أخطاء أخرى...
                                </Typography>
                            )}
                        </Alert>
                    )}

                    {/* Actions */}
                    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
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
        );
    };

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4" fontWeight="bold">
                        استيراد الموظفين الذكي ✨
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        استيراد الموظفين من ملف CSV مع التعرف التلقائي على الأعمدة
                    </Typography>
                </Box>
                <Button
                    variant="outlined"
                    startIcon={<ArrowBack />}
                    onClick={() => navigate('/users')}
                >
                    العودة للموظفين
                </Button>
            </Box>

            {/* Stepper */}
            <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
                {steps.map((label, index) => (
                    <Step key={label} completed={activeStep > index}>
                        <StepLabel>{label}</StepLabel>
                    </Step>
                ))}
            </Stepper>

            {/* Error Alert */}
            {(analyzeMutation.isError || importMutation.isError) && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {analyzeMutation.error?.message || importMutation.error?.message}
                </Alert>
            )}

            {/* Step Content */}
            {renderStepContent()}
        </Box>
    );
}
