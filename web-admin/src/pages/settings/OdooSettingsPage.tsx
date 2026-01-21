import React, { useState, useEffect } from 'react';
import {
    Box, Card, CardContent, Typography, Button, TextField, Grid, Alert,
    CircularProgress, Chip, IconButton, Divider, Tab, Tabs, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Paper, Dialog, DialogTitle,
    DialogContent, DialogActions, Switch, FormControlLabel, Tooltip, LinearProgress,
} from '@mui/material';
import {
    Link as LinkIcon, LinkOff, Sync, CloudDownload, CloudUpload, Person,
    AccessTime, BeachAccess, AttachMoney, CheckCircle, Error, Warning,
    Refresh, Settings, Info,
} from '@mui/icons-material';
import { integrationsApi } from '../../services/integrations.service';

interface OdooStatus {
    isConnected: boolean;
    lastSyncAt?: string;
    config?: { odooUrl: string; database: string; syncInterval: number };
}

interface OdooEmployee {
    id: number;
    name: string;
    workEmail?: string;
    departmentName?: string;
    jobTitle?: string;
    active: boolean;
}

const OdooSettingsPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState(0);
    const [status, setStatus] = useState<OdooStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [employees, setEmployees] = useState<OdooEmployee[]>([]);
    const [showConnectDialog, setShowConnectDialog] = useState(false);

    // Connection Form
    const [form, setForm] = useState({
        odooUrl: '',
        database: '',
        username: '',
        apiKey: '',
        syncInterval: 5,
        autoSync: true,
    });
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [connecting, setConnecting] = useState(false);

    useEffect(() => {
        loadStatus();
    }, []);

    const loadStatus = async () => {
        try {
            setLoading(true);
            const data = await integrationsApi.getOdooStatus();
            setStatus(data);
            if (data.config) {
                setForm(prev => ({
                    ...prev,
                    odooUrl: data.config?.odooUrl || '',
                    database: data.config?.database || '',
                    syncInterval: data.config?.syncInterval || 5,
                }));
            }
        } catch (error) {
            console.error('Failed to load Odoo status:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleTestConnection = async () => {
        try {
            setTestResult(null);
            const data = await integrationsApi.testOdooConnection({
                odooUrl: form.odooUrl,
                database: form.database,
                username: form.username,
                apiKey: form.apiKey,
            });
            setTestResult(data);
        } catch (error: any) {
            setTestResult({ success: false, message: error.response?.data?.message || 'فشل الاتصال' });
        }
    };

    const handleConnect = async () => {
        try {
            setConnecting(true);
            await integrationsApi.connectOdoo(form);
            setShowConnectDialog(false);
            loadStatus();
        } catch (error: any) {
            setTestResult({ success: false, message: error.response?.data?.message || 'فشل الربط' });
        } finally {
            setConnecting(false);
        }
    };

    const handleDisconnect = async () => {
        if (!confirm('هل أنت متأكد من فصل Odoo؟')) return;
        try {
            await integrationsApi.disconnectOdoo();
            setStatus({ isConnected: false });
        } catch (error) {
            console.error('Failed to disconnect:', error);
        }
    };

    const loadEmployees = async () => {
        try {
            const data = await integrationsApi.getOdooEmployees();
            setEmployees(data);
        } catch (error) {
            console.error('Failed to load employees:', error);
        }
    };

    const handleSyncEmployees = async () => {
        try {
            setSyncing(true);
            const data = await integrationsApi.syncOdooEmployees({ activeOnly: true, createNewUsers: false });
            alert(`تم المزامنة: ${data.updated} محدث، ${data.imported} جديد، ${data.skipped} تم تخطيه`);
            loadEmployees();
        } catch (error) {
            console.error('Sync failed:', error);
        } finally {
            setSyncing(false);
        }
    };

    const handleSyncAttendance = async () => {
        try {
            setSyncing(true);
            const data = await integrationsApi.syncOdooAttendance();
            alert(`تم إرسال ${data.pushed} سجل حضور إلى Odoo`);
        } catch (error) {
            console.error('Attendance sync failed:', error);
        } finally {
            setSyncing(false);
        }
    };

    // Leaves
    const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
    const [leaves, setLeaves] = useState<any[]>([]);

    const loadLeaveTypes = async () => {
        try {
            const data = await integrationsApi.getOdooLeaveTypes();
            setLeaveTypes(data);
        } catch (error) {
            console.error('Failed to load leave types:', error);
        }
    };

    const loadLeaves = async () => {
        try {
            const data = await integrationsApi.getOdooLeaves();
            setLeaves(data);
        } catch (error) {
            console.error('Failed to load leaves:', error);
        }
    };

    // Payroll
    const [payrollData, setPayrollData] = useState<any>(null);
    const [payrollPeriod, setPayrollPeriod] = useState({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0],
    });

    const handleExportPayroll = async () => {
        try {
            setSyncing(true);
            const data = await integrationsApi.exportOdooPayroll({
                periodStart: payrollPeriod.start,
                periodEnd: payrollPeriod.end,
            });
            setPayrollData(data);
            alert(`تم تصدير بيانات ${data.totalEmployees} موظف`);
        } catch (error) {
            console.error('Payroll export failed:', error);
        } finally {
            setSyncing(false);
        }
    };

    const handlePushPayroll = async () => {
        if (!payrollData?.data) return;
        try {
            setSyncing(true);
            const result = await integrationsApi.pushOdooPayroll({ data: payrollData.data });
            alert(`تم إرسال ${result.success} سجل إلى Odoo`);
        } catch (error) {
            console.error('Push payroll failed:', error);
        } finally {
            setSyncing(false);
        }
    };

    // Employee Mapping
    const [mappings, setMappings] = useState<any[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string>('');
    const [selectedOdooId, setSelectedOdooId] = useState<number | null>(null);

    const loadMappings = async () => {
        try {
            const data = await integrationsApi.getEmployeeMappings();
            setMappings(data);
            // Also load Odoo employees for dropdown
            if (employees.length === 0) {
                await loadEmployees();
            }
        } catch (error) {
            console.error('Failed to load mappings:', error);
        }
    };

    const handleMapEmployee = async (userId: string, odooEmployeeId: number) => {
        try {
            await integrationsApi.mapOdooEmployee({ userId, odooEmployeeId });
            await loadMappings();
            alert('تم ربط الموظف بنجاح!');
        } catch (error) {
            console.error('Mapping failed:', error);
        }
    };

    const handleUnmapEmployee = async (userId: string) => {
        if (!confirm('هل تريد فك ربط هذا الموظف؟')) return;
        try {
            await integrationsApi.unmapOdooEmployee(userId);
            await loadMappings();
            alert('تم فك الربط!');
        } catch (error) {
            console.error('Unmapping failed:', error);
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box p={3}>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box>
                    <Typography variant="h4" fontWeight="bold" display="flex" alignItems="center" gap={1}>
                        <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: '#714B67', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Typography color="white" fontWeight="bold">O</Typography>
                        </Box>
                        Odoo ERP Integration
                    </Typography>
                    <Typography color="text.secondary" mt={0.5}>
                        مزامنة الموظفين والحضور والإجازات مع Odoo
                    </Typography>
                </Box>
                <Box>
                    {status?.isConnected ? (
                        <Button variant="outlined" color="error" startIcon={<LinkOff />} onClick={handleDisconnect}>
                            فصل
                        </Button>
                    ) : (
                        <Button variant="contained" startIcon={<LinkIcon />} onClick={() => setShowConnectDialog(true)}>
                            ربط Odoo
                        </Button>
                    )}
                </Box>
            </Box>

            {/* Status Cards */}
            <Grid container spacing={3} mb={3}>
                <Grid item xs={12} md={3}>
                    <Card sx={{ bgcolor: status?.isConnected ? 'success.light' : 'grey.200' }}>
                        <CardContent>
                            <Box display="flex" alignItems="center" gap={1}>
                                {status?.isConnected ? <CheckCircle color="success" /> : <Error color="disabled" />}
                                <Typography variant="h6">حالة الاتصال</Typography>
                            </Box>
                            <Typography variant="h4" mt={1}>
                                {status?.isConnected ? 'متصل' : 'غير متصل'}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" gap={1}>
                                <AccessTime color="primary" />
                                <Typography variant="h6">آخر مزامنة</Typography>
                            </Box>
                            <Typography variant="h4" mt={1}>
                                {status?.lastSyncAt ? new Date(status.lastSyncAt).toLocaleTimeString('ar-SA') : '-'}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" gap={1}>
                                <Sync color="primary" />
                                <Typography variant="h6">فترة المزامنة</Typography>
                            </Box>
                            <Typography variant="h4" mt={1}>
                                {status?.config?.syncInterval || 5} دقائق
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" gap={1}>
                                <Info color="primary" />
                                <Typography variant="h6">قاعدة البيانات</Typography>
                            </Box>
                            <Typography variant="h5" mt={1} noWrap>
                                {status?.config?.database || '-'}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Tabs */}
            {status?.isConnected && (
                <>
                    <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2 }}>
                        <Tab icon={<Person />} label="الموظفين" />
                        <Tab icon={<LinkIcon />} label="ربط الموظفين" />
                        <Tab icon={<AccessTime />} label="الحضور" />
                        <Tab icon={<BeachAccess />} label="الإجازات" />
                        <Tab icon={<AttachMoney />} label="الرواتب" />
                        <Tab icon={<Settings />} label="الإعدادات" />
                    </Tabs>

                    {/* Employees Tab */}
                    {activeTab === 0 && (
                        <Card>
                            <CardContent>
                                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                    <Typography variant="h6">الموظفين من Odoo</Typography>
                                    <Box>
                                        <Button startIcon={<Refresh />} onClick={loadEmployees} sx={{ mr: 1 }}>
                                            تحديث
                                        </Button>
                                        <Button variant="contained" startIcon={<Sync />} onClick={handleSyncEmployees} disabled={syncing}>
                                            {syncing ? 'جاري المزامنة...' : 'مزامنة الموظفين'}
                                        </Button>
                                    </Box>
                                </Box>
                                {employees.length > 0 ? (
                                    <TableContainer component={Paper}>
                                        <Table>
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>ID</TableCell>
                                                    <TableCell>الاسم</TableCell>
                                                    <TableCell>البريد</TableCell>
                                                    <TableCell>القسم</TableCell>
                                                    <TableCell>المسمى</TableCell>
                                                    <TableCell>الحالة</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {employees.map(emp => (
                                                    <TableRow key={emp.id}>
                                                        <TableCell>{emp.id}</TableCell>
                                                        <TableCell>{emp.name}</TableCell>
                                                        <TableCell>{emp.workEmail || '-'}</TableCell>
                                                        <TableCell>{emp.departmentName || '-'}</TableCell>
                                                        <TableCell>{emp.jobTitle || '-'}</TableCell>
                                                        <TableCell>
                                                            <Chip label={emp.active ? 'نشط' : 'غير نشط'} color={emp.active ? 'success' : 'default'} size="small" />
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                ) : (
                                    <Alert severity="info">اضغط "تحديث" لجلب الموظفين من Odoo</Alert>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Employee Mapping Tab */}
                    {activeTab === 1 && (
                        <Card>
                            <CardContent>
                                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                    <Typography variant="h6">ربط الموظفين مع Odoo</Typography>
                                    <Button variant="contained" startIcon={<Refresh />} onClick={loadMappings}>
                                        تحديث القائمة
                                    </Button>
                                </Box>
                                <Alert severity="info" sx={{ mb: 2 }}>
                                    اربط موظفيك المحليين بموظفين Odoo لتفعيل مزامنة الحضور والإجازات والرواتب
                                </Alert>
                                {mappings.length > 0 ? (
                                    <TableContainer component={Paper}>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>الموظف المحلي</TableCell>
                                                    <TableCell>البريد</TableCell>
                                                    <TableCell>الوظيفة</TableCell>
                                                    <TableCell>حالة الربط</TableCell>
                                                    <TableCell>موظف Odoo</TableCell>
                                                    <TableCell>الإجراء</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {mappings.map(m => (
                                                    <TableRow key={m.userId}>
                                                        <TableCell>{m.userName}</TableCell>
                                                        <TableCell>{m.email}</TableCell>
                                                        <TableCell>{m.jobTitle || '-'}</TableCell>
                                                        <TableCell>
                                                            <Chip
                                                                label={m.isMapped ? 'مربوط' : 'غير مربوط'}
                                                                color={m.isMapped ? 'success' : 'default'}
                                                                size="small"
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            {m.isMapped ? (
                                                                <Typography variant="body2">{m.odooEmployeeName || `ID: ${m.odooEmployeeId}`}</Typography>
                                                            ) : (
                                                                <TextField
                                                                    select
                                                                    size="small"
                                                                    sx={{ minWidth: 150 }}
                                                                    SelectProps={{ native: true }}
                                                                    onChange={(e) => {
                                                                        if (e.target.value) {
                                                                            handleMapEmployee(m.userId, Number(e.target.value));
                                                                        }
                                                                    }}
                                                                    defaultValue=""
                                                                >
                                                                    <option value="">اختر موظف Odoo</option>
                                                                    {employees.map(emp => (
                                                                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                                                                    ))}
                                                                </TextField>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            {m.isMapped && (
                                                                <Button size="small" color="error" onClick={() => handleUnmapEmployee(m.userId)}>
                                                                    فك الربط
                                                                </Button>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                ) : (
                                    <Alert severity="warning">اضغط "تحديث القائمة" لعرض الموظفين</Alert>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Attendance Tab */}
                    {activeTab === 2 && (
                        <Card>
                            <CardContent>
                                <Typography variant="h6" mb={2}>مزامنة الحضور إلى Odoo</Typography>
                                <Alert severity="info" sx={{ mb: 2 }}>
                                    يتم إرسال سجلات الحضور تلقائياً كل 5 دقائق. يمكنك أيضاً المزامنة يدوياً.
                                </Alert>
                                <Button variant="contained" startIcon={<CloudUpload />} onClick={handleSyncAttendance} disabled={syncing}>
                                    {syncing ? 'جاري الإرسال...' : 'إرسال الحضور الآن'}
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {/* Leaves Tab */}
                    {activeTab === 3 && (
                        <Card>
                            <CardContent>
                                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                    <Typography variant="h6">الإجازات من Odoo</Typography>
                                    <Box>
                                        <Button startIcon={<Refresh />} onClick={loadLeaveTypes} sx={{ mr: 1 }}>
                                            أنواع الإجازات
                                        </Button>
                                        <Button variant="contained" startIcon={<CloudDownload />} onClick={loadLeaves} disabled={syncing}>
                                            جلب الإجازات
                                        </Button>
                                    </Box>
                                </Box>

                                {leaveTypes.length > 0 && (
                                    <Box mb={3}>
                                        <Typography variant="subtitle1" mb={1}>أنواع الإجازات المتاحة:</Typography>
                                        <Box display="flex" gap={1} flexWrap="wrap">
                                            {leaveTypes.map((lt: any) => (
                                                <Chip key={lt.id} label={lt.name} variant="outlined" />
                                            ))}
                                        </Box>
                                    </Box>
                                )}

                                {leaves.length > 0 ? (
                                    <TableContainer component={Paper}>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>الموظف</TableCell>
                                                    <TableCell>نوع الإجازة</TableCell>
                                                    <TableCell>من</TableCell>
                                                    <TableCell>إلى</TableCell>
                                                    <TableCell>الأيام</TableCell>
                                                    <TableCell>الحالة</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {leaves.map((leave: any) => (
                                                    <TableRow key={leave.id}>
                                                        <TableCell>{leave.employeeName}</TableCell>
                                                        <TableCell>{leave.leaveTypeName}</TableCell>
                                                        <TableCell>{leave.dateFrom?.split(' ')[0]}</TableCell>
                                                        <TableCell>{leave.dateTo?.split(' ')[0]}</TableCell>
                                                        <TableCell>{leave.numberOfDays}</TableCell>
                                                        <TableCell>
                                                            <Chip
                                                                label={leave.state === 'validate' ? 'معتمد' : leave.state === 'confirm' ? 'بانتظار' : leave.state}
                                                                color={leave.state === 'validate' ? 'success' : 'default'}
                                                                size="small"
                                                            />
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                ) : (
                                    <Alert severity="info">اضغط "جلب الإجازات" لعرض الإجازات من Odoo</Alert>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Payroll Tab */}
                    {activeTab === 4 && (
                        <Card>
                            <CardContent>
                                <Typography variant="h6" mb={2}>تصدير بيانات الرواتب</Typography>

                                <Grid container spacing={2} mb={3}>
                                    <Grid item xs={12} md={4}>
                                        <TextField
                                            fullWidth
                                            type="date"
                                            label="من تاريخ"
                                            InputLabelProps={{ shrink: true }}
                                            value={payrollPeriod.start}
                                            onChange={e => setPayrollPeriod({ ...payrollPeriod, start: e.target.value })}
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={4}>
                                        <TextField
                                            fullWidth
                                            type="date"
                                            label="إلى تاريخ"
                                            InputLabelProps={{ shrink: true }}
                                            value={payrollPeriod.end}
                                            onChange={e => setPayrollPeriod({ ...payrollPeriod, end: e.target.value })}
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={4}>
                                        <Box display="flex" gap={1} height="100%" alignItems="center">
                                            <Button variant="contained" startIcon={<CloudDownload />} onClick={handleExportPayroll} disabled={syncing}>
                                                {syncing ? 'جاري التصدير...' : 'تصدير الحضور'}
                                            </Button>
                                            {payrollData && (
                                                <Button variant="outlined" startIcon={<CloudUpload />} onClick={handlePushPayroll} disabled={syncing}>
                                                    إرسال لـ Odoo
                                                </Button>
                                            )}
                                        </Box>
                                    </Grid>
                                </Grid>

                                {payrollData && (
                                    <Box>
                                        <Alert severity="success" sx={{ mb: 2 }}>
                                            الفترة: {payrollData.periodStart} إلى {payrollData.periodEnd} |
                                            الموظفين: {payrollData.totalEmployees}
                                        </Alert>
                                        <TableContainer component={Paper}>
                                            <Table size="small">
                                                <TableHead>
                                                    <TableRow>
                                                        <TableCell>الموظف</TableCell>
                                                        <TableCell>أيام العمل</TableCell>
                                                        <TableCell>ساعات العمل</TableCell>
                                                        <TableCell>الإضافي</TableCell>
                                                        <TableCell>التأخير (د)</TableCell>
                                                        <TableCell>الخروج المبكر</TableCell>
                                                        <TableCell>الغياب</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {payrollData.data?.map((row: any) => (
                                                        <TableRow key={row.userId}>
                                                            <TableCell>{row.employeeName}</TableCell>
                                                            <TableCell>{row.workedDays}</TableCell>
                                                            <TableCell>{row.workedHours}</TableCell>
                                                            <TableCell>{row.overtimeHours}</TableCell>
                                                            <TableCell>{row.lateMinutes}</TableCell>
                                                            <TableCell>{row.earlyLeaveMinutes}</TableCell>
                                                            <TableCell>{row.absentDays}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    </Box>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Settings Tab */}
                    {activeTab === 5 && (
                        <Card>
                            <CardContent>
                                <Typography variant="h6" mb={2}>إعدادات التكامل</Typography>
                                <Grid container spacing={2}>
                                    <Grid item xs={12} md={6}>
                                        <TextField fullWidth label="رابط Odoo" value={status?.config?.odooUrl || ''} disabled />
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <TextField fullWidth label="قاعدة البيانات" value={status?.config?.database || ''} disabled />
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>
                    )}
                </>
            )}

            {/* Connect Dialog */}
            <Dialog open={showConnectDialog} onClose={() => setShowConnectDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>ربط Odoo ERP</DialogTitle>
                <DialogContent>
                    <Box mt={2}>
                        <Grid container spacing={2}>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="رابط Odoo"
                                    placeholder="https://company.odoo.com"
                                    value={form.odooUrl}
                                    onChange={e => setForm({ ...form, odooUrl: e.target.value })}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="اسم قاعدة البيانات"
                                    placeholder="company_db"
                                    value={form.database}
                                    onChange={e => setForm({ ...form, database: e.target.value })}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="اسم المستخدم / البريد"
                                    placeholder="admin@company.com"
                                    value={form.username}
                                    onChange={e => setForm({ ...form, username: e.target.value })}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    type="password"
                                    label="API Key / كلمة المرور"
                                    value={form.apiKey}
                                    onChange={e => setForm({ ...form, apiKey: e.target.value })}
                                />
                            </Grid>
                        </Grid>

                        {testResult && (
                            <Alert severity={testResult.success ? 'success' : 'error'} sx={{ mt: 2 }}>
                                {testResult.message}
                            </Alert>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowConnectDialog(false)}>إلغاء</Button>
                    <Button onClick={handleTestConnection}>اختبار الاتصال</Button>
                    <Button variant="contained" onClick={handleConnect} disabled={connecting || !testResult?.success}>
                        {connecting ? 'جاري الربط...' : 'ربط'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default OdooSettingsPage;
