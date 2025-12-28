import React from 'react';
import { Box, Typography, Avatar, AvatarGroup, Chip } from '@mui/material';
import { GlassCard, PulseIndicator } from '@/components/premium';

interface TeamMember {
    id: string;
    name: string;
    avatar?: string;
    status: 'online' | 'offline' | 'busy' | 'away';
    role?: string;
    currentTask?: string;
}

interface TeamAvailabilityProps {
    members: TeamMember[];
    title?: string;
    maxVisible?: number;
}

const statusLabels = {
    online: 'متاح',
    offline: 'غير متصل',
    busy: 'مشغول',
    away: 'بعيد',
};

const statusColors = {
    online: '#22c55e',
    offline: '#94a3b8',
    busy: '#ef4444',
    away: '#f59e0b',
};

/**
 * Premium Team Availability Widget
 * Real-time team status visualization
 */
export const TeamAvailability: React.FC<TeamAvailabilityProps> = ({
    members,
    title = '👥 حالة الفريق',
    maxVisible = 6,
}) => {
    const onlineCount = members.filter((m) => m.status === 'online').length;
    const busyCount = members.filter((m) => m.status === 'busy').length;
    const awayCount = members.filter((m) => m.status === 'away').length;
    const offlineCount = members.filter((m) => m.status === 'offline').length;

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <GlassCard sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" fontWeight="bold">
                    {title}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Chip
                        size="small"
                        label={`${onlineCount} متاح`}
                        sx={{
                            bgcolor: '#dcfce7',
                            color: '#166534',
                            fontWeight: 600,
                            fontSize: '0.75rem',
                        }}
                    />
                    <Chip
                        size="small"
                        label={`${busyCount + awayCount} مشغول`}
                        sx={{
                            bgcolor: '#fef3c7',
                            color: '#92400e',
                            fontWeight: 600,
                            fontSize: '0.75rem',
                        }}
                    />
                </Box>
            </Box>

            {/* Team members list */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {members.slice(0, maxVisible).map((member, index) => (
                    <Box
                        key={member.id}
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                            p: 1.5,
                            borderRadius: 2,
                            bgcolor: 'rgba(255, 255, 255, 0.5)',
                            transition: 'all 0.2s ease',
                            cursor: 'pointer',
                            animation: `fadeInUp 0.3s ease ${index * 0.05}s both`,
                            '@keyframes fadeInUp': {
                                from: { opacity: 0, transform: 'translateY(10px)' },
                                to: { opacity: 1, transform: 'translateY(0)' },
                            },
                            '&:hover': {
                                bgcolor: 'rgba(255, 255, 255, 0.8)',
                                transform: 'translateX(-4px)',
                            },
                        }}
                    >
                        {/* Avatar with status */}
                        <Box sx={{ position: 'relative' }}>
                            <Avatar
                                src={member.avatar}
                                sx={{
                                    width: 40,
                                    height: 40,
                                    bgcolor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    fontSize: '0.9rem',
                                    fontWeight: 600,
                                }}
                            >
                                {getInitials(member.name)}
                            </Avatar>
                            <Box
                                sx={{
                                    position: 'absolute',
                                    bottom: 0,
                                    right: 0,
                                    width: 12,
                                    height: 12,
                                    borderRadius: '50%',
                                    bgcolor: statusColors[member.status],
                                    border: '2px solid white',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                }}
                            />
                        </Box>

                        {/* Info */}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" fontWeight={600} noWrap>
                                {member.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" noWrap>
                                {member.currentTask || member.role || statusLabels[member.status]}
                            </Typography>
                        </Box>

                        {/* Status badge */}
                        <Box
                            sx={{
                                px: 1.5,
                                py: 0.5,
                                borderRadius: 2,
                                bgcolor: `${statusColors[member.status]}15`,
                                color: statusColors[member.status],
                                fontSize: '0.7rem',
                                fontWeight: 600,
                            }}
                        >
                            {statusLabels[member.status]}
                        </Box>
                    </Box>
                ))}
            </Box>

            {/* Show more indicator */}
            {members.length > maxVisible && (
                <Box
                    sx={{
                        mt: 2,
                        pt: 2,
                        borderTop: '1px solid rgba(0,0,0,0.05)',
                        display: 'flex',
                        justifyContent: 'center',
                    }}
                >
                    <Typography
                        variant="caption"
                        sx={{
                            color: '#667eea',
                            cursor: 'pointer',
                            fontWeight: 600,
                            '&:hover': { textDecoration: 'underline' },
                        }}
                    >
                        + {members.length - maxVisible} آخرين
                    </Typography>
                </Box>
            )}
        </GlassCard>
    );
};

export default TeamAvailability;
