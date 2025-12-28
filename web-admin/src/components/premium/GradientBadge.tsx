import React from 'react';
import { Box, Typography, Chip, ChipProps } from '@mui/material';

interface GradientBadgeProps {
    label: string;
    variant?: 'primary' | 'success' | 'warning' | 'info' | 'purple' | 'orange';
    size?: 'small' | 'medium' | 'large';
    icon?: React.ReactNode;
    animated?: boolean;
}

const gradients: Record<string, [string, string]> = {
    primary: ['#667eea', '#764ba2'],
    success: ['#11998e', '#38ef7d'],
    warning: ['#f093fb', '#f5576c'],
    info: ['#4facfe', '#00f2fe'],
    purple: ['#a855f7', '#6366f1'],
    orange: ['#fb923c', '#f97316'],
};

const sizeStyles = {
    small: { px: 1.5, py: 0.25, fontSize: '0.7rem' },
    medium: { px: 2, py: 0.5, fontSize: '0.8rem' },
    large: { px: 2.5, py: 0.75, fontSize: '0.9rem' },
};

/**
 * Premium Gradient Badge Component
 * Modern badge with gradient background and optional animation
 */
export const GradientBadge: React.FC<GradientBadgeProps> = ({
    label,
    variant = 'primary',
    size = 'medium',
    icon,
    animated = false,
}) => {
    const [color1, color2] = gradients[variant];
    const styles = sizeStyles[size];

    return (
        <Box
            sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                background: `linear-gradient(135deg, ${color1}, ${color2})`,
                borderRadius: 2,
                color: 'white',
                fontWeight: 600,
                fontSize: styles.fontSize,
                px: styles.px,
                py: styles.py,
                boxShadow: `0 4px 15px ${color1}40`,
                transition: 'all 0.3s ease',
                cursor: 'default',
                ...(animated && {
                    animation: 'pulse 2s ease-in-out infinite',
                    '@keyframes pulse': {
                        '0%, 100%': {
                            boxShadow: `0 4px 15px ${color1}40`,
                        },
                        '50%': {
                            boxShadow: `0 4px 25px ${color1}60`,
                        },
                    },
                }),
                '&:hover': {
                    transform: 'scale(1.05)',
                    boxShadow: `0 6px 20px ${color1}50`,
                },
            }}
        >
            {icon && (
                <Box sx={{ display: 'flex', alignItems: 'center', fontSize: '1.1em' }}>
                    {icon}
                </Box>
            )}
            <span>{label}</span>
        </Box>
    );
};

export default GradientBadge;
