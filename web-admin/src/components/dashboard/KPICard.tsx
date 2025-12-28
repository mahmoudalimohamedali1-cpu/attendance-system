import React from 'react';
import { Box, Typography } from '@mui/material';
import { TrendingUp, TrendingDown } from '@mui/icons-material';
import { GlassCard } from '@/components/premium';

interface SparklineData {
    value: number;
    date?: string;
}

interface KPICardProps {
    title: string;
    value: number | string;
    unit?: string;
    change?: number;
    changeLabel?: string;
    sparklineData?: SparklineData[];
    icon?: React.ReactNode;
    gradient?: [string, string];
    onClick?: () => void;
}

/**
 * Premium KPI Card with Sparkline
 * Animated statistics card with mini chart
 */
export const KPICard: React.FC<KPICardProps> = ({
    title,
    value,
    unit = '',
    change,
    changeLabel = 'عن الشهر الماضي',
    sparklineData = [],
    icon,
    gradient = ['#667eea', '#764ba2'],
    onClick,
}) => {
    // Calculate sparkline path
    const getSparklinePath = () => {
        if (sparklineData.length < 2) return '';

        const max = Math.max(...sparklineData.map(d => d.value));
        const min = Math.min(...sparklineData.map(d => d.value));
        const range = max - min || 1;

        const width = 100;
        const height = 40;
        const padding = 2;

        const points = sparklineData.map((d, i) => {
            const x = (i / (sparklineData.length - 1)) * (width - padding * 2) + padding;
            const y = height - ((d.value - min) / range) * (height - padding * 2) - padding;
            return `${x},${y}`;
        });

        return `M ${points.join(' L ')}`;
    };

    const isPositive = (change ?? 0) >= 0;

    return (
        <GlassCard
            gradient
            gradientColors={gradient}
            hoverEffect
            onClick={onClick}
            sx={{
                p: 3,
                cursor: onClick ? 'pointer' : 'default',
                minHeight: 160,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
            }}
        >
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                    <Typography
                        variant="caption"
                        sx={{
                            color: 'text.secondary',
                            fontWeight: 500,
                            textTransform: 'uppercase',
                            letterSpacing: 0.5,
                        }}
                    >
                        {title}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mt: 1 }}>
                        <Typography
                            variant="h4"
                            fontWeight="bold"
                            sx={{
                                background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`,
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                            }}
                        >
                            {typeof value === 'number' ? value.toLocaleString('ar-SA') : value}
                        </Typography>
                        {unit && (
                            <Typography variant="body2" color="text.secondary" fontWeight={500}>
                                {unit}
                            </Typography>
                        )}
                    </Box>
                </Box>

                {/* Icon */}
                {icon && (
                    <Box
                        sx={{
                            width: 48,
                            height: 48,
                            borderRadius: 2,
                            background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            boxShadow: `0 4px 15px ${gradient[0]}40`,
                        }}
                    >
                        {icon}
                    </Box>
                )}
            </Box>

            {/* Sparkline */}
            {sparklineData.length > 1 && (
                <Box sx={{ my: 2, height: 40, opacity: 0.6 }}>
                    <svg width="100%" height="100%" viewBox="0 0 100 40" preserveAspectRatio="none">
                        <defs>
                            <linearGradient id={`sparkline-gradient-${title}`} x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor={gradient[0]} />
                                <stop offset="100%" stopColor={gradient[1]} />
                            </linearGradient>
                        </defs>
                        <path
                            d={getSparklinePath()}
                            fill="none"
                            stroke={`url(#sparkline-gradient-${title})`}
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </Box>
            )}

            {/* Change indicator */}
            {change !== undefined && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 'auto' }}>
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.3,
                            px: 1,
                            py: 0.25,
                            borderRadius: 1,
                            bgcolor: isPositive ? '#dcfce7' : '#fee2e2',
                            color: isPositive ? '#166534' : '#991b1b',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                        }}
                    >
                        {isPositive ? <TrendingUp sx={{ fontSize: 14 }} /> : <TrendingDown sx={{ fontSize: 14 }} />}
                        {Math.abs(change)}%
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                        {changeLabel}
                    </Typography>
                </Box>
            )}
        </GlassCard>
    );
};

export default KPICard;
