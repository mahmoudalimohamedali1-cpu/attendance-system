import { Box, Typography, Chip } from '@mui/material';
import { TrendingUp, TrendingDown } from '@mui/icons-material';
import { AnimatedCounter } from '../../../components/common/AnimatedCounter';

// Design Theme Colors
const theme = {
    coral: '#E8A87C',
    peach: '#F9DCC4',
    teal: '#41B3A3',
    navy: '#2D3748',
    lightBg: '#FDF6F0',
    white: '#FFFFFF',
};

interface EnhancedStatCardProps {
    icon: React.ReactNode;
    label: string;
    value: number;
    color: string;
    trend?: number;
    suffix?: string;
    animated?: boolean;
}

export const EnhancedStatCard = ({
    icon,
    label,
    value,
    color,
    trend,
    suffix = '',
    animated = true,
}: EnhancedStatCardProps) => (
    <Box
        sx={{
            bgcolor: theme.white,
            borderRadius: 4,
            p: 3,
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5,
            boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative',
            overflow: 'hidden',
            '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
            },
            // Glassmorphism background effect
            '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                right: 0,
                width: '50%',
                height: '100%',
                background: `linear-gradient(135deg, ${color}10 0%, transparent 100%)`,
                borderRadius: 'inherit',
            },
        }}
    >
        {/* Header with Label & Trend */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 1 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={500}>
                {label}
            </Typography>
            {trend !== undefined && trend !== 0 && (
                <Chip
                    icon={trend > 0 ? <TrendingUp sx={{ fontSize: 14 }} /> : <TrendingDown sx={{ fontSize: 14 }} />}
                    label={`${Math.abs(trend)}%`}
                    size="small"
                    sx={{
                        bgcolor: trend > 0 ? '#E8F5E9' : '#FFEBEE',
                        color: trend > 0 ? '#2E7D32' : '#C62828',
                        fontWeight: 600,
                        fontSize: '0.7rem',
                        height: 24,
                        '& .MuiChip-icon': {
                            color: 'inherit',
                        },
                    }}
                />
            )}
        </Box>

        {/* Main Value */}
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, zIndex: 1 }}>
            <Typography variant="h3" fontWeight="bold" color={theme.navy}>
                {animated ? <AnimatedCounter value={value} /> : value.toLocaleString('ar-SA')}
            </Typography>
            {suffix && (
                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                    {suffix}
                </Typography>
            )}
        </Box>

        {/* Icon */}
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                color,
                zIndex: 1,
            }}
        >
            <Box
                sx={{
                    bgcolor: `${color}20`,
                    borderRadius: 2,
                    p: 0.75,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                {icon}
            </Box>
        </Box>
    </Box>
);

export default EnhancedStatCard;
