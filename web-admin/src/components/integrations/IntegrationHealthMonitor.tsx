import React from 'react';
import { Box, Typography, Chip, CircularProgress, Tooltip } from '@mui/material';
import {
    CheckCircle as CheckCircleIcon,
    Error as ErrorIcon,
    Warning as WarningIcon,
    PowerOff as InactiveIcon,
    Refresh as RefreshIcon,
    Settings as ConfigIcon,
    Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { GlassCard } from '@/components/premium';
import type { IntegrationHealthResponse, HealthStatus } from '@/services/integrations.service';

interface IntegrationHealthMonitorProps {
    health: IntegrationHealthResponse | null;
    isLoading?: boolean;
    onRefresh?: () => void;
    compact?: boolean;
}

/**
 * Health status configuration with colors and labels
 */
const healthStatusConfig: Record<HealthStatus, {
    color: string;
    bgColor: string;
    label: string;
    labelEn: string;
    gradient: [string, string];
}> = {
    HEALTHY: {
        color: '#166534',
        bgColor: '#dcfce7',
        label: 'سليم',
        labelEn: 'Healthy',
        gradient: ['#10B981', '#059669'],
    },
    WARNING: {
        color: '#854d0e',
        bgColor: '#fef9c3',
        label: 'تحذير',
        labelEn: 'Warning',
        gradient: ['#F59E0B', '#D97706'],
    },
    ERROR: {
        color: '#991b1b',
        bgColor: '#fee2e2',
        label: 'خطأ',
        labelEn: 'Error',
        gradient: ['#EF4444', '#DC2626'],
    },
    INACTIVE: {
        color: '#374151',
        bgColor: '#f3f4f6',
        label: 'غير نشط',
        labelEn: 'Inactive',
        gradient: ['#6B7280', '#4B5563'],
    },
};

/**
 * Status icon component
 */
const HealthStatusIcon: React.FC<{ status: HealthStatus; size?: number }> = ({
    status,
    size = 24
}) => {
    const config = healthStatusConfig[status];
    const iconStyle = { fontSize: size, color: config.gradient[0] };

    switch (status) {
        case 'HEALTHY':
            return <CheckCircleIcon sx={iconStyle} />;
        case 'WARNING':
            return <WarningIcon sx={iconStyle} />;
        case 'ERROR':
            return <ErrorIcon sx={iconStyle} />;
        case 'INACTIVE':
            return <InactiveIcon sx={iconStyle} />;
        default:
            return null;
    }
};

/**
 * Format date for Arabic locale
 */
const formatLastCheck = (dateString: string): string => {
    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'الآن';
        if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
        if (diffHours < 24) return `منذ ${diffHours} ساعة`;
        if (diffDays < 7) return `منذ ${diffDays} يوم`;

        return date.toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    } catch {
        return 'غير معروف';
    }
};

/**
 * Premium Integration Health Monitor Component
 * Displays health status with visual indicators and metrics
 */
export const IntegrationHealthMonitor: React.FC<IntegrationHealthMonitorProps> = ({
    health,
    isLoading = false,
    onRefresh,
    compact = false,
}) => {
    // Loading state
    if (isLoading) {
        return (
            <GlassCard
                hoverEffect={false}
                sx={{
                    p: compact ? 2 : 3,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: compact ? 100 : 160,
                }}
            >
                <Box sx={{ textAlign: 'center' }}>
                    <CircularProgress size={32} sx={{ color: '#667eea' }} />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        جاري فحص الحالة...
                    </Typography>
                </Box>
            </GlassCard>
        );
    }

    // No health data state
    if (!health) {
        return (
            <GlassCard
                hoverEffect={false}
                sx={{
                    p: compact ? 2 : 3,
                    minHeight: compact ? 100 : 160,
                }}
            >
                <Box sx={{ textAlign: 'center', py: 2 }}>
                    <InactiveIcon sx={{ fontSize: 40, color: '#9CA3AF', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                        لا توجد بيانات صحية متاحة
                    </Typography>
                </Box>
            </GlassCard>
        );
    }

    const statusConfig = healthStatusConfig[health.status];
    const gradient = statusConfig.gradient;

    return (
        <GlassCard
            gradient
            gradientColors={gradient}
            hoverEffect={!!onRefresh}
            sx={{
                p: compact ? 2 : 3,
                minHeight: compact ? 100 : 160,
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
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
                        حالة التكامل
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                        <HealthStatusIcon status={health.status} size={28} />
                        <Typography
                            variant="h5"
                            fontWeight="bold"
                            sx={{
                                background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`,
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                            }}
                        >
                            {statusConfig.label}
                        </Typography>
                    </Box>
                </Box>

                {/* Refresh button */}
                {onRefresh && (
                    <Tooltip title="تحديث الحالة" arrow>
                        <Box
                            onClick={onRefresh}
                            sx={{
                                width: 40,
                                height: 40,
                                borderRadius: 2,
                                background: `linear-gradient(135deg, ${gradient[0]}20, ${gradient[1]}20)`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                    background: `linear-gradient(135deg, ${gradient[0]}30, ${gradient[1]}30)`,
                                    transform: 'rotate(180deg)',
                                },
                            }}
                        >
                            <RefreshIcon sx={{ color: gradient[0], fontSize: 20 }} />
                        </Box>
                    </Tooltip>
                )}
            </Box>

            {/* Message */}
            <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                    mb: 2,
                    lineHeight: 1.5,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                }}
            >
                {health.message}
            </Typography>

            {/* Metrics row */}
            {!compact && (
                <Box sx={{
                    display: 'flex',
                    gap: 1,
                    flexWrap: 'wrap',
                    mt: 'auto',
                }}>
                    {/* Config valid status */}
                    <Chip
                        icon={<ConfigIcon sx={{ fontSize: '14px !important' }} />}
                        label={health.details.configValid ? 'الإعدادات صحيحة' : 'إعدادات غير مكتملة'}
                        size="small"
                        sx={{
                            height: 26,
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            bgcolor: health.details.configValid ? '#dcfce7' : '#fee2e2',
                            color: health.details.configValid ? '#166534' : '#991b1b',
                            '& .MuiChip-icon': {
                                color: 'inherit',
                            },
                        }}
                    />

                    {/* Enabled status */}
                    <Chip
                        label={health.details.enabled ? 'مفعّل' : 'معطّل'}
                        size="small"
                        sx={{
                            height: 26,
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            bgcolor: health.details.enabled ? '#dcfce7' : '#f3f4f6',
                            color: health.details.enabled ? '#166534' : '#6b7280',
                        }}
                    />

                    {/* Provider info */}
                    <Chip
                        label={health.details.provider}
                        size="small"
                        variant="outlined"
                        sx={{
                            height: 26,
                            fontSize: '0.7rem',
                            fontWeight: 500,
                            borderColor: 'rgba(0,0,0,0.1)',
                            color: 'text.secondary',
                        }}
                    />
                </Box>
            )}

            {/* Last check timestamp */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    mt: compact ? 1 : 2,
                    pt: compact ? 1 : 1.5,
                    borderTop: '1px solid rgba(0,0,0,0.05)',
                }}
            >
                <ScheduleIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                <Typography variant="caption" color="text.secondary">
                    آخر فحص: {formatLastCheck(health.lastCheckAt)}
                </Typography>
            </Box>
        </GlassCard>
    );
};

export default IntegrationHealthMonitor;
