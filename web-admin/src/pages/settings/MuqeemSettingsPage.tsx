import React, { useState, useEffect } from 'react';
import {
    Box, Card, CardContent, Typography, Button, TextField, Grid, Alert,
    CircularProgress, IconButton, Divider, Switch, FormControlLabel, Stack
} from '@mui/material';
import {
    Save, ArrowBack, Settings, Security, Notifications
} from '@mui/icons-material';
import { muqeemApi } from '../../services/muqeem.service';
import { useNavigate } from 'react-router-dom';

interface MuqeemConfig {
    username?: string;
    password?: string;
    isActive?: boolean;
    iqamaExpiryDays?: number;
    passportExpiryDays?: number;
    enableNotifications?: boolean;
}

const MuqeemSettingsPage: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        username: '',
        password: '',
        isActive: true,
        iqamaExpiryDays: 30,
        passportExpiryDays: 60,
        enableNotifications: true,
    });

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            setLoading(true);
            const configData = await muqeemApi.getConfig();
            const data = configData as MuqeemConfig;
            if (data) {
                setForm({
                    username: data.username || '',
                    password: data.password || '',
                    isActive: data.isActive ?? true,
                    iqamaExpiryDays: data.iqamaExpiryDays || 30,
                    passportExpiryDays: data.passportExpiryDays || 60,
                    enableNotifications: data.enableNotifications ?? true,
                });
            }
        } catch (error) {
            console.error('Failed to load Muqeem config:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            await muqeemApi.updateConfig(form);
            alert('تم حفظ الإعدادات بنجاح');
        } catch (error) {
            alert('فشل حفظ الإعدادات');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <Box p={3}><CircularProgress /></Box>;

    return (
        <Box p={3}>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box display="flex" alignItems="center" gap={2}>
                    <IconButton onClick={() => navigate(-1)}><ArrowBack /></IconButton>
                    <Box>
                        <Typography variant="h4" fontWeight="bold">إعدادات تكامل مقيم</Typography>
                        <Typography color="text.secondary">ضبط بيانات الوصول وتنبيهات الاستحقاق</Typography>
                    </Box>
                </Box>
                <Button variant="contained" startIcon={<Save />} onClick={handleSave} disabled={saving}>
                    {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
                </Button>
            </Box>

            <Grid container spacing={3}>
                {/* API Credentials */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" gap={1} mb={2}>
                                <Security color="primary" />
                                <Typography variant="h6">بيانات الوصول (API)</Typography>
                            </Box>
                            <Divider sx={{ mb: 2 }} />
                            <Stack spacing={2}>
                                <TextField
                                    fullWidth
                                    label="اسم المستخدم (قناة علم / مقيم)"
                                    value={form.username}
                                    onChange={e => setForm({ ...form, username: e.target.value })}
                                />
                                <TextField
                                    fullWidth
                                    type="password"
                                    label="كلمة السر"
                                    value={form.password}
                                    onChange={e => setForm({ ...form, password: e.target.value })}
                                />
                                <FormControlLabel
                                    control={<Switch checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} />}
                                    label="تفعيل التكامل"
                                />
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Notification Settings */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" gap={1} mb={2}>
                                <Notifications color="primary" />
                                <Typography variant="h6">إعدادات التنبيهات</Typography>
                            </Box>
                            <Divider sx={{ mb: 2 }} />
                            <Stack spacing={2}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="تنبيه قبل انتهاء الإقامة بـ (أيام)"
                                    value={form.iqamaExpiryDays}
                                    onChange={e => setForm({ ...form, iqamaExpiryDays: parseInt(e.target.value) })}
                                />
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="تنبيه قبل انتهاء الجواز بـ (أيام)"
                                    value={form.passportExpiryDays}
                                    onChange={e => setForm({ ...form, passportExpiryDays: parseInt(e.target.value) })}
                                />
                                <FormControlLabel
                                    control={<Switch checked={form.enableNotifications} onChange={e => setForm({ ...form, enableNotifications: e.target.checked })} />}
                                    label="تفعيل الإشعارات التلقائية"
                                />
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12}>
                    <Alert severity="info">
                        ملاحظة: يتم تخزين بيانات المستخدم وكلمة السر بشكل مشفر لضمان الأمان.
                        عند تفعيل التكامل، سيظهر زر "تجديد" و "إصدار تأشيرة" تلقائياً في ملف الموظف والصفحة الرئيسية لمقيم.
                    </Alert>
                </Grid>
            </Grid>
        </Box>
    );
};

export default MuqeemSettingsPage;
