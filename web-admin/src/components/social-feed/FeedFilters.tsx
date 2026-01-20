import React from 'react';
import { Box, Typography, Chip, Badge } from '@mui/material';
import {
    DynamicFeed,
    Business,
    Groups,
    PushPin,
    MarkEmailUnread,
} from '@mui/icons-material';
import { GlassCard } from '@/components/premium';

/**
 * Filter types for the social feed
 */
export type FeedFilterType = 'all' | 'department' | 'team' | 'pinned' | 'unread';

interface FilterConfig {
    icon: React.ReactElement;
    label: string;
    gradient: string[];
}

interface FeedFiltersProps {
    activeFilter: FeedFilterType;
    onFilterChange: (filter: FeedFilterType) => void;
    counts?: Partial<Record<FeedFilterType, number>>;
    disabled?: boolean;
}

// Filter configuration with Arabic labels and gradients
const filterConfig: Record<FeedFilterType, FilterConfig> = {
    all: {
        icon: <DynamicFeed sx={{ fontSize: 18 }} />,
        label: 'الكل',
        gradient: ['#3b82f6', '#1d4ed8'],
    },
    department: {
        icon: <Business sx={{ fontSize: 18 }} />,
        label: 'القسم',
        gradient: ['#8b5cf6', '#7c3aed'],
    },
    team: {
        icon: <Groups sx={{ fontSize: 18 }} />,
        label: 'الفريق',
        gradient: ['#06b6d4', '#0891b2'],
    },
    pinned: {
        icon: <PushPin sx={{ fontSize: 18, transform: 'rotate(45deg)' }} />,
        label: 'المثبت',
        gradient: ['#f59e0b', '#d97706'],
    },
    unread: {
        icon: <MarkEmailUnread sx={{ fontSize: 18 }} />,
        label: 'غير المقروء',
        gradient: ['#ef4444', '#dc2626'],
    },
};

const filterOrder: FeedFilterType[] = ['all', 'department', 'team', 'pinned', 'unread'];

/**
 * FeedFilters Component
 * Premium filter tabs for the social feed with support for All, Department, Team, Pinned, and Unread filters
 * Supports Arabic RTL layout and animated transitions
 */
export const FeedFilters: React.FC<FeedFiltersProps> = ({
    activeFilter,
    onFilterChange,
    counts = {},
    disabled = false,
}) => {
    const handleFilterClick = (filter: FeedFilterType) => {
        if (!disabled && filter !== activeFilter) {
            onFilterChange(filter);
        }
    };

    return (
        <GlassCard sx={{ p: 2 }} hoverEffect={false}>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    flexWrap: 'wrap',
                }}
            >
                {filterOrder.map((filter, index) => {
                    const config = filterConfig[filter];
                    const isActive = activeFilter === filter;
                    const count = counts[filter];

                    return (
                        <Chip
                            key={filter}
                            icon={
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: isActive ? 'white' : 'text.secondary',
                                        transition: 'color 0.2s ease',
                                    }}
                                >
                                    {config.icon}
                                </Box>
                            }
                            label={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Typography
                                        variant="body2"
                                        fontWeight={isActive ? 600 : 500}
                                        sx={{
                                            color: isActive ? 'white' : 'text.primary',
                                            transition: 'color 0.2s ease',
                                        }}
                                    >
                                        {config.label}
                                    </Typography>
                                    {count !== undefined && count > 0 && (
                                        <Badge
                                            badgeContent={count > 99 ? '99+' : count}
                                            sx={{
                                                '& .MuiBadge-badge': {
                                                    position: 'relative',
                                                    transform: 'none',
                                                    ml: 0.5,
                                                    minWidth: 18,
                                                    height: 18,
                                                    fontSize: '0.65rem',
                                                    fontWeight: 600,
                                                    bgcolor: isActive
                                                        ? 'rgba(255, 255, 255, 0.3)'
                                                        : config.gradient[0],
                                                    color: 'white',
                                                },
                                            }}
                                        />
                                    )}
                                </Box>
                            }
                            onClick={() => handleFilterClick(filter)}
                            disabled={disabled}
                            sx={{
                                height: 40,
                                px: 1,
                                borderRadius: 2,
                                cursor: disabled ? 'not-allowed' : 'pointer',
                                background: isActive
                                    ? `linear-gradient(135deg, ${config.gradient[0]}, ${config.gradient[1]})`
                                    : 'rgba(0, 0, 0, 0.04)',
                                border: isActive
                                    ? 'none'
                                    : '1px solid rgba(0, 0, 0, 0.08)',
                                animation: `slideIn 0.3s ease ${index * 0.05}s both`,
                                '@keyframes slideIn': {
                                    from: { opacity: 0, transform: 'translateY(-10px)' },
                                    to: { opacity: 1, transform: 'translateY(0)' },
                                },
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                    background: isActive
                                        ? `linear-gradient(135deg, ${config.gradient[0]}, ${config.gradient[1]})`
                                        : 'rgba(0, 0, 0, 0.08)',
                                    transform: disabled ? 'none' : 'translateY(-2px)',
                                    boxShadow: disabled
                                        ? 'none'
                                        : isActive
                                          ? `0 4px 12px ${config.gradient[0]}40`
                                          : '0 2px 8px rgba(0, 0, 0, 0.1)',
                                },
                                '& .MuiChip-icon': {
                                    ml: 0.5,
                                    mr: -0.5,
                                },
                                '& .MuiChip-label': {
                                    px: 1,
                                },
                                '&.Mui-disabled': {
                                    opacity: 0.5,
                                },
                            }}
                        />
                    );
                })}
            </Box>
        </GlassCard>
    );
};

export default FeedFilters;
