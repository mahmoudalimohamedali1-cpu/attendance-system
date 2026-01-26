import { Box, Typography, Paper, Card, CardContent } from '@mui/material';
import { Construction, AccountTree } from '@mui/icons-material';

export const CostCentersPage = () => {
    return (
        <Box sx={{ p: 3 }}>
            <Paper
                elevation={0}
                sx={{
                    p: 4,
                    textAlign: 'center',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: 4,
                    color: 'white',
                    mb: 3
                }}
            >
                <AccountTree sx={{ fontSize: 64, mb: 2, opacity: 0.9 }} />
                <Typography variant="h4" fontWeight="bold" gutterBottom>
                    مراكز التكلفة
                </Typography>
                <Typography variant="h6" sx={{ opacity: 0.9 }}>
                    Cost Centers
                </Typography>
            </Paper>

            <Card sx={{ maxWidth: 600, mx: 'auto', textAlign: 'center' }}>
                <CardContent sx={{ py: 6 }}>
                    <Construction sx={{ fontSize: 80, color: 'warning.main', mb: 3 }} />
                    <Typography variant="h4" fontWeight="bold" color="text.primary" gutterBottom>
                        🚧 قريباً
                    </Typography>
                    <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
                        الخدمة ستكون متاحة قريباً
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        نعمل على تطوير هذه الميزة لتوفير أفضل تجربة لإدارة مراكز التكلفة والميزانيات.
                    </Typography>
                    <Box sx={{ mt: 4, p: 2, bgcolor: 'grey.100', borderRadius: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                            📅 التوقع: الإصدار القادم
                        </Typography>
                    </Box>
                </CardContent>
            </Card>
        </Box>
    );
};

export default CostCentersPage;
