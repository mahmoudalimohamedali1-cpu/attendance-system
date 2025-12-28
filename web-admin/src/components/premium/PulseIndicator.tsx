import React from 'react';
import { Box, keyframes } from '@mui/material';

const pulseRing = keyframes`
  0% {
    transform: scale(0.95);
    opacity: 1;
  }
  100% {
    transform: scale(1.5);
    opacity: 0;
  }
`;

const pulse = keyframes`
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
`;

type StatusType = 'online' | 'offline' | 'busy' | 'away';

interface PulseIndicatorProps {
    status: StatusType;
    size?: number;
    showRing?: boolean;
    position?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left';
}

const statusColors: Record<StatusType, string> = {
    online: '#22c55e',
    offline: '#94a3b8',
    busy: '#ef4444',
    away: '#f59e0b',
};

const statusLabels: Record<StatusType, string> = {
    online: 'متصل',
    offline: 'غير متصل',
    busy: 'مشغول',
    away: 'بعيد',
};

/**
 * Premium Pulse Indicator Component
 * Shows animated status with pulse ring effect
 */
export const PulseIndicator: React.FC<PulseIndicatorProps> = ({
    status,
    size = 12,
    showRing = true,
    position = 'bottom-right',
}) => {
    const color = statusColors[status];
    const isOnline = status === 'online';

    const positionStyles = {
        'top-right': { top: 0, right: 0 },
        'bottom-right': { bottom: 0, right: 0 },
        'top-left': { top: 0, left: 0 },
        'bottom-left': { bottom: 0, left: 0 },
    };

    return (
        <Box
            title={statusLabels[status]}
            sx={{
                position: 'absolute',
                ...positionStyles[position],
                width: size,
                height: size,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            {/* Pulse ring animation (only for online status) */}
            {showRing && isOnline && (
                <Box
                    sx={{
                        position: 'absolute',
                        width: size,
                        height: size,
                        borderRadius: '50%',
                        backgroundColor: color,
                        animation: `${pulseRing} 1.5s ease-out infinite`,
                    }}
                />
            )}

            {/* Main indicator dot */}
            <Box
                sx={{
                    width: size,
                    height: size,
                    borderRadius: '50%',
                    backgroundColor: color,
                    border: '2px solid white',
                    boxShadow: `0 2px 4px rgba(0, 0, 0, 0.2), 0 0 0 1px ${color}40`,
                    animation: isOnline ? `${pulse} 2s ease-in-out infinite` : 'none',
                    zIndex: 1,
                }}
            />
        </Box>
    );
};

export default PulseIndicator;
