import React from 'react';
import { Box, BoxProps } from '@mui/material';

interface GlassCardProps extends BoxProps {
    children: React.ReactNode;
    blur?: number;
    opacity?: number;
    gradient?: boolean;
    gradientColors?: string[];
    hoverEffect?: boolean;
    glowColor?: string;
}

/**
 * Premium Glassmorphism Card Component
 * Inspired by Apple's design language and modern UI trends
 */
export const GlassCard: React.FC<GlassCardProps> = ({
    children,
    blur = 20,
    opacity = 0.7,
    gradient = false,
    gradientColors = ['#667eea', '#764ba2'],
    hoverEffect = true,
    glowColor,
    sx,
    ...props
}) => {
    return (
        <Box
            sx={{
                position: 'relative',
                background: gradient
                    ? `linear-gradient(135deg, ${gradientColors[0]}20 0%, ${gradientColors[1]}20 100%)`
                    : `rgba(255, 255, 255, ${opacity})`,
                backdropFilter: `blur(${blur}px)`,
                WebkitBackdropFilter: `blur(${blur}px)`,
                borderRadius: 3,
                border: '1px solid rgba(255, 255, 255, 0.3)',
                boxShadow: glowColor
                    ? `0 8px 32px rgba(0, 0, 0, 0.1), 0 0 40px ${glowColor}30`
                    : '0 8px 32px rgba(0, 0, 0, 0.1)',
                overflow: 'hidden',
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                ...(hoverEffect && {
                    '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: glowColor
                            ? `0 16px 48px rgba(0, 0, 0, 0.15), 0 0 60px ${glowColor}40`
                            : '0 16px 48px rgba(0, 0, 0, 0.15)',
                    },
                }),
                ...sx,
            }}
            {...props}
        >
            {/* Gradient overlay for extra depth */}
            {gradient && (
                <Box
                    sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '4px',
                        background: `linear-gradient(90deg, ${gradientColors[0]}, ${gradientColors[1]})`,
                    }}
                />
            )}
            {children}
        </Box>
    );
};

export default GlassCard;
