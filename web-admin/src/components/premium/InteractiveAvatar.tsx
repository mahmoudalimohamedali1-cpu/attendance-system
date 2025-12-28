import React from 'react';
import { Avatar, Box, IconButton, Tooltip, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import { Email, Phone, Message, MoreVert, Edit, Event, Description } from '@mui/icons-material';
import { PulseIndicator } from './PulseIndicator';

type StatusType = 'online' | 'offline' | 'busy' | 'away';

interface InteractiveAvatarProps {
    src?: string;
    name: string;
    size?: number;
    status?: StatusType;
    showActions?: boolean;
    onEmail?: () => void;
    onCall?: () => void;
    onMessage?: () => void;
    onEdit?: () => void;
    onClick?: () => void;
}

/**
 * Premium Interactive Avatar Component
 * Features: Status indicator, hover effects, quick actions menu
 */
export const InteractiveAvatar: React.FC<InteractiveAvatarProps> = ({
    src,
    name,
    size = 56,
    status,
    showActions = true,
    onEmail,
    onCall,
    onMessage,
    onEdit,
    onClick,
}) => {
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
    const [hovered, setHovered] = React.useState(false);

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        event.stopPropagation();
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    return (
        <Box
            sx={{
                position: 'relative',
                display: 'inline-flex',
                cursor: onClick ? 'pointer' : 'default',
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={onClick}
        >
            {/* Avatar with gradient ring on hover */}
            <Box
                sx={{
                    position: 'relative',
                    borderRadius: '50%',
                    padding: '3px',
                    background: hovered
                        ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                        : 'transparent',
                    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
            >
                <Avatar
                    src={src}
                    alt={name}
                    sx={{
                        width: size,
                        height: size,
                        fontSize: size * 0.4,
                        fontWeight: 600,
                        background: src ? 'transparent' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        border: '3px solid white',
                        boxShadow: hovered
                            ? '0 8px 24px rgba(102, 126, 234, 0.3)'
                            : '0 4px 12px rgba(0, 0, 0, 0.1)',
                        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                        transform: hovered ? 'scale(1.05)' : 'scale(1)',
                    }}
                >
                    {getInitials(name)}
                </Avatar>

                {/* Status indicator */}
                {status && (
                    <PulseIndicator
                        status={status}
                        size={size * 0.22}
                        position="bottom-right"
                    />
                )}
            </Box>

            {/* Quick actions (visible on hover) */}
            {showActions && hovered && (
                <Box
                    sx={{
                        position: 'absolute',
                        bottom: -8,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        display: 'flex',
                        gap: 0.5,
                        background: 'white',
                        borderRadius: 2,
                        padding: '4px 8px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                        animation: 'fadeInUp 0.2s ease-out',
                        '@keyframes fadeInUp': {
                            from: {
                                opacity: 0,
                                transform: 'translateX(-50%) translateY(10px)',
                            },
                            to: {
                                opacity: 1,
                                transform: 'translateX(-50%) translateY(0)',
                            },
                        },
                    }}
                >
                    {onEmail && (
                        <Tooltip title="إرسال بريد">
                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); onEmail(); }}>
                                <Email fontSize="small" sx={{ color: '#667eea' }} />
                            </IconButton>
                        </Tooltip>
                    )}
                    {onCall && (
                        <Tooltip title="اتصال">
                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); onCall(); }}>
                                <Phone fontSize="small" sx={{ color: '#22c55e' }} />
                            </IconButton>
                        </Tooltip>
                    )}
                    {onMessage && (
                        <Tooltip title="رسالة">
                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); onMessage(); }}>
                                <Message fontSize="small" sx={{ color: '#f59e0b' }} />
                            </IconButton>
                        </Tooltip>
                    )}
                    <IconButton size="small" onClick={handleMenuOpen}>
                        <MoreVert fontSize="small" sx={{ color: '#64748b' }} />
                    </IconButton>
                </Box>
            )}

            {/* Actions menu */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                onClick={(e) => e.stopPropagation()}
                PaperProps={{
                    sx: {
                        borderRadius: 2,
                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
                        minWidth: 160,
                    },
                }}
            >
                {onEdit && (
                    <MenuItem onClick={() => { onEdit(); handleMenuClose(); }}>
                        <ListItemIcon><Edit fontSize="small" /></ListItemIcon>
                        <ListItemText>تعديل</ListItemText>
                    </MenuItem>
                )}
                <MenuItem onClick={handleMenuClose}>
                    <ListItemIcon><Event fontSize="small" /></ListItemIcon>
                    <ListItemText>جدول العمل</ListItemText>
                </MenuItem>
                <MenuItem onClick={handleMenuClose}>
                    <ListItemIcon><Description fontSize="small" /></ListItemIcon>
                    <ListItemText>المستندات</ListItemText>
                </MenuItem>
            </Menu>
        </Box>
    );
};

export default InteractiveAvatar;
