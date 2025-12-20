import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    TextField,
    Button,
    Alert,
    CircularProgress,
    Switch,
    FormControlLabel,
    Divider,
} from '@mui/material';
import { Security, Save } from '@mui/icons-material';
import { api } from '@/services/api.service';

interface GosiConfig {
    id: string;
    employeeRate: number;
    employerRate: number;
    sanedRate: number;
    hazardRate: number;
    maxCapAmount: number;
    isSaudiOnly: boolean;
    isActive: boolean;
}

export const GosiSettingsPage = () => {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        employeeRate: 9,
        employerRate: 9,
        sanedRate: 0.75,
        hazardRate: 2,
        maxCapAmount: 45000,
        isSaudiOnly: true,
        isActive: true,
    });

    const { isLoading } = useQuery<GosiConfig>({
        queryKey: ['gosi-config'],
        queryFn: async () => {
            const res = await api.get('/gosi/config/active') as GosiConfig;
            if (res) {
                setFormData({
                    employeeRate: res.employeeRate,
                    employerRate: res.employerRate,
                    sanedRate: res.sanedRate,
                    hazardRate: res.hazardRate,
                    maxCapAmount: res.maxCapAmount,
                    isSaudiOnly: res.isSaudiOnly,
                    isActive: res.isActive,
                });
            }
            return res;
        },
    });

    const mutation = useMutation({
        mutationFn: (data: typeof formData) => api.post('/gosi/config', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['gosi-config'] });
            alert('تم حفظ إعدادات التأمينات بنجاح');
        },
    });

    if (isLoading) return <CircularProgress />;

    return (
        <Box>
            <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Security color="primary" /> إعدادات التأمينات الاجتماعية (GOSI)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                ضبط نسب الاستقطاع للموظفين والشركة والحدود القصوى للتأمينات.
            </Typography>

            <Grid container spacing={3}>
                <Grid item xs={12} md={8}>
                    <Card>
                        <CardContent>
                            <Grid container spacing={3}>
                                <Grid item xs={12}>
                                    <Typography variant="subtitle1" fontWeight="bold">نسب الاستقطاع (للموظف السعودي)</Typography>
                                    <Divider sx={{ my: 1 }} />
                                </Grid>

                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        label="نسبة الموظف (%)"
                                        type="number"
                                        value={formData.employeeRate}
                                        onChange={(e) => setFormData({ ...formData, employeeRate: parseFloat(e.target.value) })}
                                        helperText="المادة: معاشات (النسبة الافتراضية 9%)"
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        label="نسبة الشركة (%)"
                                        type="number"
                                        value={formData.employerRate}
                                        onChange={(e) => setFormData({ ...formData, employerRate: parseFloat(e.target.value) })}
                                        helperText="مساهمة الشركة (النسبة الافتراضية 9%)"
                                    />
                                </Grid>

                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        label="نسبة ساند - الموظف (%)"
                                        type="number"
                                        value={formData.sanedRate}
                                        onChange={(e) => setFormData({ ...formData, sanedRate: parseFloat(e.target.value) })}
                                        helperText="نظام ساند (النسبة الحالية 0.75%)"
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        label="نسبة الأخطار المهنية (%)"
                                        type="number"
                                        value={formData.hazardRate}
                                        onChange={(e) => setFormData({ ...formData, hazardRate: parseFloat(e.target.value) })}
                                        helperText="تتحملها الشركة بالكامل (النسبة الافتراضية 2%)"
                                    />
                                </Grid>

                                <Grid item xs={12}>
                                    <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 2 }}>الحدود والضوابط</Typography>
                                    <Divider sx={{ my: 1 }} />
                                </Grid>

                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        label="الحد الأقصى للراتب الخاضع"
                                        type="number"
                                        value={formData.maxCapAmount}
                                        onChange={(e) => setFormData({ ...formData, maxCapAmount: parseFloat(e.target.value) })}
                                        helperText="الحد الأقصى المسموح به (45,000 ريال)"
                                    />
                                </Grid>

                                <Grid item xs={12} md={6}>
                                    <Box sx={{ mt: 1 }}>
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    checked={formData.isSaudiOnly}
                                                    onChange={(e) => setFormData({ ...formData, isSaudiOnly: e.target.checked })}
                                                />
                                            }
                                            label="تطبق على المواطنين السعوديين فقط"
                                        />
                                    </Box>
                                </Grid>

                                <Grid item xs={12}>
                                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                                        <Button
                                            variant="contained"
                                            startIcon={<Save />}
                                            size="large"
                                            onClick={() => mutation.mutate(formData)}
                                            disabled={mutation.isPending}
                                        >
                                            حفظ الإعدادات
                                        </Button>
                                    </Box>
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={4}>
                    <Alert severity="info" sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" fontWeight="bold">ملاحظات هامة:</Typography>
                        <ul>
                            <li>يتم حساب التأمينات على (الراتب الأساسي + بدل السكن).</li>
                            <li>البدلات التي يتم تفعيل خيار "خاضع للتأمينات" فيها ستدخل في الحساب تلقائياً.</li>
                            <li>عند تغيير النسب، ستطبق على مسيرات الرواتب الجديدة فقط.</li>
                        </ul>
                    </Alert>
                </Grid>
            </Grid>
        </Box>
    );
};
