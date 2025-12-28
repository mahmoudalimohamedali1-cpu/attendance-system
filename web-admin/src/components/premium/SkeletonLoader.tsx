import React from 'react';
import { Box, keyframes } from '@mui/material';

const shimmer = keyframes`
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
`;

interface SkeletonLoaderProps {
    variant?: 'text' | 'circular' | 'rectangular' | 'rounded' | 'card';
    width?: number | string;
    height?: number | string;
    lines?: number;
    animation?: 'shimmer' | 'pulse' | 'wave';
}

/**
 * Premium Skeleton Loader Component
 * Beautiful loading states with shimmer animation
 */
export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
    variant = 'text',
    width = '100%',
    height,
    lines = 1,
    animation = 'shimmer',
}) => {
    const getVariantStyles = () => {
        switch (variant) {
            case 'circular':
                return {
                    width: width,
                    height: height || width,
                    borderRadius: '50%',
                };
            case 'rectangular':
                return {
                    width: width,
                    height: height || 100,
                    borderRadius: 0,
                };
            case 'rounded':
                return {
                    width: width,
                    height: height || 100,
                    borderRadius: 2,
                };
            case 'card':
                return {
                    width: width,
                    height: height || 200,
                    borderRadius: 3,
                };
            case 'text':
            default:
                return {
                    width: width,
                    height: height || 20,
                    borderRadius: 1,
                };
        }
    };

    const getAnimationStyles = () => {
        switch (animation) {
            case 'pulse':
                return {
                    background: '#e0e0e0',
                    animation: 'pulse 1.5s ease-in-out infinite',
                    '@keyframes pulse': {
                        '0%, 100%': {
                            opacity: 1,
                        },
                        '50%': {
                            opacity: 0.5,
                        },
                    },
                };
            case 'wave':
                return {
                    background: `linear-gradient(90deg, #f0f0f0 0%, #e0e0e0 20%, #f0f0f0 40%, #f0f0f0 100%)`,
                    backgroundSize: '200% 100%',
                    animation: `${shimmer} 1.5s linear infinite`,
                };
            case 'shimmer':
            default:
                return {
                    background: `linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%)`,
                    backgroundSize: '200% 100%',
                    animation: `${shimmer} 1.5s linear infinite`,
                };
        }
    };

    const variantStyles = getVariantStyles();
    const animationStyles = getAnimationStyles();

    if (variant === 'text' && lines > 1) {
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, width }}>
                {Array.from({ length: lines }).map((_, index) => (
                    <Box
                        key={index}
                        sx={{
                            ...variantStyles,
                            ...animationStyles,
                            width: index === lines - 1 ? '60%' : '100%',
                        }}
                    />
                ))}
            </Box>
        );
    }

    return (
        <Box
            sx={{
                ...variantStyles,
                ...animationStyles,
            }}
        />
    );
};

/**
 * Premium Card Skeleton
 * Complete card skeleton with avatar, title, and content
 */
export const CardSkeleton: React.FC<{ showAvatar?: boolean }> = ({ showAvatar = true }) => {
    return (
        <Box
            sx={{
                p: 3,
                borderRadius: 3,
                background: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                {showAvatar && <SkeletonLoader variant="circular" width={48} height={48} />}
                <Box sx={{ flex: 1 }}>
                    <SkeletonLoader variant="text" width="60%" height={20} />
                    <Box sx={{ mt: 1 }}>
                        <SkeletonLoader variant="text" width="40%" height={14} />
                    </Box>
                </Box>
            </Box>
            <SkeletonLoader variant="text" lines={3} />
        </Box>
    );
};

/**
 * Premium Stats Skeleton
 * Skeleton for statistics cards
 */
export const StatsSkeleton: React.FC = () => {
    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                p: 2,
                borderRadius: 3,
                background: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
            }}
        >
            <SkeletonLoader variant="rounded" width={48} height={48} />
            <Box sx={{ flex: 1 }}>
                <SkeletonLoader variant="text" width={80} height={14} />
                <Box sx={{ mt: 1 }}>
                    <SkeletonLoader variant="text" width={60} height={28} />
                </Box>
            </Box>
        </Box>
    );
};

export default SkeletonLoader;
