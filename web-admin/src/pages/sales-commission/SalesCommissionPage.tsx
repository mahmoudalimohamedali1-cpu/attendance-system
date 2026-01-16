import React from 'react';
import { Box, Typography, Paper, Container } from '@mui/material';
import { MonetizationOn as CommissionIcon } from '@mui/icons-material';

const SalesCommissionPage: React.FC = () => {
    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Paper sx={{ p: 4, textAlign: 'center' }}>
                <CommissionIcon sx={{ fontSize: 64, color: 'primary.main', opacity: 0.5, mb: 2 }} />
                <Typography variant="h4" fontWeight={700} gutterBottom>
                    عمولات المبيعات
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    صفحة إدارة عمولات المبيعات - قيد التطوير
                </Typography>
            </Paper>
        </Container>
    );
};

export default SalesCommissionPage;
