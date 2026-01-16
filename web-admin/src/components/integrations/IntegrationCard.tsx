import React from 'react';
import { Box, Typography, Chip, Avatar, IconButton, Tooltip } from '@mui/material';
import {
    CheckCircle as CheckCircleIcon,
    Error as ErrorIcon,
    Warning as WarningIcon,
    Settings as SettingsIcon,
    PowerSettingsNew as PowerIcon,
} from '@mui/icons-material';
import { GlassCard } from '@/components/premium';
import type { MarketplaceIntegration, IntegrationStatus, IntegrationCategory } from '@/services/integrations.service';

interface IntegrationCardProps {
    integration: MarketplaceIntegration;
    onClick?: (integration: MarketplaceIntegration) => void;
    onToggle?: (integration: MarketplaceIntegration) => void;
    onConfigure?: (integration: MarketplaceIntegration) => void;
}

/**
 * Category gradient colors for visual distinction
 */
const categoryGradients: Record<IntegrationCategory, [string, string]> = {
    ACCOUNTING: ['#10B981', '#059669'],
    ERP: ['#6366F1', '#4F46E5'],
    COMMUNICATION: ['#F59E0B', '#D97706'],
    HR: ['#EC4899', '#DB2777'],
    PAYROLL: ['#8B5CF6', '#7C3AED'],
    BANKING: ['#14B8A6', '#0D9488'],
};

/**
 * Category labels (Arabic)
 */
const categoryLabels: Record<IntegrationCategory, string> = {
    ACCOUNTING: 'محاسبة',
    ERP: 'تخطيط موارد',
    COMMUNICATION: 'اتصالات',
    HR: 'موارد بشرية',
    PAYROLL: 'رواتب',
    BANKING: 'بنوك',
};

/**
 * Status icon component
 */
const StatusIcon: React.FC<{ status: IntegrationStatus }> = ({ status }) => {
    switch (status) {
        case 'ACTIVE':
            return <CheckCircleIcon sx={{ fontSize: 16, color: '#10B981' }} />;
        case 'ERROR':
            return <ErrorIcon sx={{ fontSize: 16, color: '#EF4444' }} />;
        case 'WARNING':
            return <WarningIcon sx={{ fontSize: 16, color: '#F59E0B' }} />;
        default:
            return null;
    }
};

/**
 * Premium Integration Card Component
 * Displays integration info with glassmorphism design
 */
export const IntegrationCard: React.FC<IntegrationCardProps> = ({
    integration,
    onClick,
    onToggle,
    onConfigure,
}) => {
    const gradient = categoryGradients[integration.category] || ['#667eea', '#764ba2'];
    const categoryLabel = categoryLabels[integration.category] || integration.category;

    const handleClick = () => {
        if (onClick) {
            onClick(integration);
        }
    };

    const handleToggleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onToggle) {
            onToggle(integration);
        }
    };

    const handleConfigureClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onConfigure) {
            onConfigure(integration);
        }
    };

    return (
        <GlassCard
            gradient
            gradientColors={gradient}
            hoverEffect
            onClick={handleClick}
            sx={{
                p: 2.5,
                cursor: onClick ? 'pointer' : 'default',
                minHeight: 180,
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
            }}
        >
            {/* Header with logo and status */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                {/* Logo */}
                <Avatar
                    src={integration.logo}
                    alt={integration.name}
                    sx={{
                        width: 52,
                        height: 52,
                        borderRadius: 2,
                        bgcolor: 'white',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        '& img': {
                            objectFit: 'contain',
                            p: 0.5,
                        },
                    }}
                >
                    {integration.name.charAt(0)}
                </Avatar>

                {/* Status and actions */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {integration.installed && (
                        <>
                            <StatusIcon status={integration.status} />
                            {onConfigure && (
                                <Tooltip title="إعدادات" arrow>
                                    <IconButton
                                        size="small"
                                        onClick={handleConfigureClick}
                                        sx={{
                                            color: 'text.secondary',
                                            '&:hover': { bgcolor: 'rgba(0,0,0,0.05)' },
                                        }}
                                    >
                                        <SettingsIcon sx={{ fontSize: 18 }} />
                                    </IconButton>
                                </Tooltip>
                            )}
                            {onToggle && (
                                <Tooltip title={integration.enabled ? 'تعطيل' : 'تفعيل'} arrow>
                                    <IconButton
                                        size="small"
                                        onClick={handleToggleClick}
                                        sx={{
                                            color: integration.enabled ? '#10B981' : 'text.secondary',
                                            '&:hover': { bgcolor: 'rgba(0,0,0,0.05)' },
                                        }}
                                    >
                                        <PowerIcon sx={{ fontSize: 18 }} />
                                    </IconButton>
                                </Tooltip>
                            )}
                        </>
                    )}
                </Box>
            </Box>

            {/* Integration name */}
            <Typography
                variant="subtitle1"
                fontWeight={600}
                sx={{
                    color: 'text.primary',
                    mb: 0.5,
                    lineHeight: 1.3,
                }}
            >
                {integration.name}
            </Typography>

            {/* Description */}
            <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                    mb: 2,
                    flex: 1,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    lineHeight: 1.5,
                }}
            >
                {integration.description}
            </Typography>

            {/* Footer with category and status */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 'auto' }}>
                {/* Category badge */}
                <Chip
                    label={categoryLabel}
                    size="small"
                    sx={{
                        height: 24,
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        background: `linear-gradient(135deg, ${gradient[0]}20, ${gradient[1]}20)`,
                        border: `1px solid ${gradient[0]}40`,
                        color: gradient[1],
                    }}
                />

                {/* Installed/Enabled status */}
                {integration.installed ? (
                    <Chip
                        label={integration.enabled ? 'مفعّل' : 'معطّل'}
                        size="small"
                        sx={{
                            height: 24,
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            bgcolor: integration.enabled ? '#dcfce7' : '#f3f4f6',
                            color: integration.enabled ? '#166534' : '#6b7280',
                        }}
                    />
                ) : (
                    <Typography variant="caption" color="text.secondary" fontWeight={500}>
                        v{integration.version}
                    </Typography>
                )}
            </Box>

            {/* Developer info on hover */}
            <Box
                sx={{
                    position: 'absolute',
                    bottom: -30,
                    left: 0,
                    right: 0,
                    height: 30,
                    px: 2.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    bgcolor: 'rgba(0,0,0,0.02)',
                    borderTop: '1px solid rgba(0,0,0,0.05)',
                    opacity: 0,
                    transition: 'opacity 0.2s ease',
                    '.MuiBox-root:hover > &': {
                        opacity: 1,
                    },
                }}
            >
                <Typography variant="caption" color="text.secondary">
                    {integration.developerName}
                </Typography>
            </Box>
        </GlassCard>
    );
};

export default IntegrationCard;
