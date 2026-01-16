import React from 'react';
import { Box, Typography, useTheme, alpha } from '@mui/material';
import { Groups as TeamIcon } from '@mui/icons-material';
import { TeamCollaborationDashboard } from '../tasks/components/TeamCollaborationComponents';

const TeamCollaborationPage: React.FC = () => {
    const theme = useTheme();

    return (
        <Box sx={{ p: 3, minHeight: '100vh', bgcolor: alpha(theme.palette.background.paper, 0.5) }}>
            {/* Header */}
            <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{
                    width: 48, height: 48, borderRadius: 3,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                }}>
                    <TeamIcon sx={{ color: 'white', fontSize: 28 }} />
                </Box>
                <Box>
                    <Typography variant="h4" fontWeight={800}>تعاون الفريق</Typography>
                    <Typography variant="body2" color="text.secondary">
                        أدوات التعاون • أحمال العمل • المهارات • الأداء
                    </Typography>
                </Box>
            </Box>

            {/* Main Dashboard */}
            <TeamCollaborationDashboard />
        </Box>
    );
};

export default TeamCollaborationPage;
