import React from 'react';
import { Box, Typography, LinearProgress } from '@mui/material';
import { TrendingUp, TrendingDown, Lightbulb, Warning, CheckCircle, Info } from '@mui/icons-material';
import { GlassCard } from '@/components/premium';

interface Insight {
    id: string;
    type: 'positive' | 'warning' | 'info' | 'action';
    title: string;
    description: string;
    metric?: {
        value: number;
        change: number;
        unit?: string;
    };
    actionLabel?: string;
    onAction?: () => void;
}

interface QuickInsightsProps {
    insights: Insight[];
    title?: string;
    isLoading?: boolean;
}

const insightConfig = {
    positive: {
        icon: <TrendingUp />,
        gradient: ['#22c55e', '#16a34a'],
        bgColor: '#dcfce7',
        textColor: '#166534',
    },
    warning: {
        icon: <Warning />,
        gradient: ['#f59e0b', '#d97706'],
        bgColor: '#fef3c7',
        textColor: '#92400e',
    },
    info: {
        icon: <Info />,
        gradient: ['#3b82f6', '#2563eb'],
        bgColor: '#dbeafe',
        textColor: '#1e40af',
    },
    action: {
        icon: <Lightbulb />,
        gradient: ['#a855f7', '#7c3aed'],
        bgColor: '#f3e8ff',
        textColor: '#6b21a8',
    },
};

/**
 * Premium Quick Insights Widget
 * AI-powered insights and recommendations
 */
export const QuickInsights: React.FC<QuickInsightsProps> = ({
    insights,
    title = '💡 رؤى سريعة',
    isLoading = false,
}) => {
    return (
        <GlassCard sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h6" fontWeight="bold">
                    {title}
                </Typography>
                <Box
                    sx={{
                        px: 1.5,
                        py: 0.5,
                        borderRadius: 2,
                        background: 'linear-gradient(135deg, #667eea, #764ba2)',
                        color: 'white',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                    }}
                >
                    مدعوم بالذكاء الاصطناعي
                </Box>
            </Box>

            {isLoading ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {[1, 2, 3].map((i) => (
                        <Box key={i} sx={{ p: 2, borderRadius: 2, bgcolor: '#f1f5f9' }}>
                            <LinearProgress sx={{ borderRadius: 1 }} />
                        </Box>
                    ))}
                </Box>
            ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {insights.map((insight, index) => {
                        const config = insightConfig[insight.type];

                        return (
                            <Box
                                key={insight.id}
                                sx={{
                                    display: 'flex',
                                    gap: 2,
                                    p: 2,
                                    borderRadius: 2,
                                    bgcolor: config.bgColor,
                                    border: `1px solid ${config.gradient[0]}20`,
                                    transition: 'all 0.3s ease',
                                    cursor: insight.onAction ? 'pointer' : 'default',
                                    animation: `fadeIn 0.3s ease ${index * 0.1}s both`,
                                    '@keyframes fadeIn': {
                                        from: { opacity: 0, transform: 'translateY(10px)' },
                                        to: { opacity: 1, transform: 'translateY(0)' },
                                    },
                                    '&:hover': insight.onAction ? {
                                        transform: 'translateX(-4px)',
                                        boxShadow: `0 4px 12px ${config.gradient[0]}20`,
                                    } : {},
                                }}
                                onClick={insight.onAction}
                            >
                                {/* Icon */}
                                <Box
                                    sx={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: 2,
                                        background: `linear-gradient(135deg, ${config.gradient[0]}, ${config.gradient[1]})`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'white',
                                        flexShrink: 0,
                                    }}
                                >
                                    {config.icon}
                                </Box>

                                {/* Content */}
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography variant="body2" fontWeight={600} sx={{ color: config.textColor }}>
                                        {insight.title}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: config.textColor, opacity: 0.8 }}>
                                        {insight.description}
                                    </Typography>

                                    {/* Metric */}
                                    {insight.metric && (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                                            <Typography variant="h6" fontWeight="bold" sx={{ color: config.textColor }}>
                                                {insight.metric.value}{insight.metric.unit || '%'}
                                            </Typography>
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 0.3,
                                                    color: insight.metric.change >= 0 ? '#22c55e' : '#ef4444',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600,
                                                }}
                                            >
                                                {insight.metric.change >= 0 ? <TrendingUp fontSize="small" /> : <TrendingDown fontSize="small" />}
                                                {Math.abs(insight.metric.change)}%
                                            </Box>
                                        </Box>
                                    )}

                                    {/* Action button */}
                                    {insight.actionLabel && (
                                        <Box
                                            sx={{
                                                mt: 1.5,
                                                display: 'inline-flex',
                                                px: 2,
                                                py: 0.5,
                                                borderRadius: 1.5,
                                                background: `linear-gradient(135deg, ${config.gradient[0]}, ${config.gradient[1]})`,
                                                color: 'white',
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                transition: 'all 0.2s ease',
                                                '&:hover': {
                                                    transform: 'scale(1.02)',
                                                    boxShadow: `0 4px 12px ${config.gradient[0]}40`,
                                                },
                                            }}
                                        >
                                            {insight.actionLabel}
                                        </Box>
                                    )}
                                </Box>
                            </Box>
                        );
                    })}
                </Box>
            )}
        </GlassCard>
    );
};

export default QuickInsights;
