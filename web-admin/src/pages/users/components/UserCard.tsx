import React from 'react';
import { Box, Typography, IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Chip, Tooltip } from '@mui/material';
import { Edit, Delete, Visibility, MoreVert, Email, Phone, Badge, Work, AccountBalance } from '@mui/icons-material';
import { GlassCard, InteractiveAvatar, GradientBadge } from '@/components/premium';

interface UserCardProps {
    user: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        phone?: string;
        avatar?: string;
        role: string;
        jobTitle?: string;
        department?: string;
        status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
        hireDate?: string;
    };
    onView?: (id: string) => void;
    onEdit?: (id: string) => void;
    onDelete?: (id: string) => void;
    index?: number;
}

const roleLabels: Record<string, string> = {
    ADMIN: 'مدير النظام',
    HR: 'موارد بشرية',
    MANAGER: 'مدير',
    EMPLOYEE: 'موظف',
};

const roleGradients: Record<string, [string, string]> = {
    ADMIN: ['#ef4444', '#dc2626'],
    HR: ['#8b5cf6', '#7c3aed'],
    MANAGER: ['#3b82f6', '#2563eb'],
    EMPLOYEE: ['#22c55e', '#16a34a'],
};

const statusConfig = {
    ACTIVE: { label: 'نشط', color: '#22c55e', bg: '#dcfce7' },
    INACTIVE: { label: 'غير نشط', color: '#94a3b8', bg: '#f1f5f9' },
    SUSPENDED: { label: 'موقوف', color: '#ef4444', bg: '#fee2e2' },
};

/**
 * Premium User Card Component
 * Beautiful card with hover effects and quick actions
 */
export const UserCard: React.FC<UserCardProps> = ({
    user,
    onView,
    onEdit,
    onDelete,
    index = 0,
}) => {
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

    const fullName = `${user.firstName} ${user.lastName}`;
    const status = statusConfig[user.status];
    const roleGradient = roleGradients[user.role] || roleGradients.EMPLOYEE;

    const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
        event.stopPropagation();
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const calculateYearsOfService = () => {
        if (!user.hireDate) return null;
        const years = Math.floor((Date.now() - new Date(user.hireDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        return years;
    };

    const yearsOfService = calculateYearsOfService();

    return (
        <GlassCard
            hoverEffect
            sx={{
                p: 0,
                overflow: 'hidden',
                cursor: 'pointer',
                animation: `fadeInUp 0.4s ease ${index * 0.05}s both`,
                '@keyframes fadeInUp': {
                    from: { opacity: 0, transform: 'translateY(20px)' },
                    to: { opacity: 1, transform: 'translateY(0)' },
                },
            }}
            onClick={() => onView?.(user.id)}
        >
            {/* Top gradient bar */}
            <Box
                sx={{
                    height: 4,
                    background: `linear-gradient(90deg, ${roleGradient[0]}, ${roleGradient[1]})`,
                }}
            />

            {/* Card content */}
            <Box sx={{ p: 3 }}>
                {/* Header with avatar and menu */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <InteractiveAvatar
                        src={user.avatar}
                        name={fullName}
                        size={64}
                        status={user.status === 'ACTIVE' ? 'online' : 'offline'}
                        showActions={false}
                    />

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {/* Status badge */}
                        <Box
                            sx={{
                                px: 1.5,
                                py: 0.5,
                                borderRadius: 2,
                                bgcolor: status.bg,
                                color: status.color,
                                fontSize: '0.7rem',
                                fontWeight: 600,
                            }}
                        >
                            {status.label}
                        </Box>

                        {/* Menu button */}
                        <IconButton size="small" onClick={handleMenuClick}>
                            <MoreVert fontSize="small" />
                        </IconButton>
                    </Box>
                </Box>

                {/* Name and role */}
                <Typography variant="h6" fontWeight="bold" noWrap>
                    {fullName}
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, mb: 2 }}>
                    <GradientBadge
                        label={roleLabels[user.role] || user.role}
                        variant={user.role === 'ADMIN' ? 'warning' : user.role === 'HR' ? 'purple' : user.role === 'MANAGER' ? 'info' : 'success'}
                        size="small"
                    />
                    {yearsOfService !== null && yearsOfService > 0 && (
                        <Chip
                            size="small"
                            label={`${yearsOfService} سنة`}
                            sx={{
                                height: 20,
                                fontSize: '0.65rem',
                                bgcolor: '#f1f5f9',
                                fontWeight: 500,
                            }}
                        />
                    )}
                </Box>

                {/* Info rows */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {user.jobTitle && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Work sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="caption" color="text.secondary" noWrap>
                                {user.jobTitle}
                            </Typography>
                        </Box>
                    )}

                    {user.department && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Badge sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="caption" color="text.secondary" noWrap>
                                {user.department}
                            </Typography>
                        </Box>
                    )}

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Email sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary" noWrap>
                            {user.email}
                        </Typography>
                    </Box>

                    {user.phone && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Phone sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="caption" color="text.secondary" noWrap dir="ltr">
                                {user.phone}
                            </Typography>
                        </Box>
                    )}
                </Box>

                {/* Quick actions footer */}
                <Box
                    sx={{
                        display: 'flex',
                        gap: 1,
                        mt: 3,
                        pt: 2,
                        borderTop: '1px solid rgba(0,0,0,0.05)',
                        justifyContent: 'center',
                    }}
                >
                    <Tooltip title="عرض الملف">
                        <IconButton
                            size="small"
                            onClick={(e) => { e.stopPropagation(); onView?.(user.id); }}
                            sx={{
                                bgcolor: '#dbeafe',
                                color: '#2563eb',
                                '&:hover': { bgcolor: '#bfdbfe' },
                            }}
                        >
                            <Visibility fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="تعديل">
                        <IconButton
                            size="small"
                            onClick={(e) => { e.stopPropagation(); onEdit?.(user.id); }}
                            sx={{
                                bgcolor: '#fef3c7',
                                color: '#d97706',
                                '&:hover': { bgcolor: '#fde68a' },
                            }}
                        >
                            <Edit fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="حسابات بنكية">
                        <IconButton
                            size="small"
                            onClick={(e) => e.stopPropagation()}
                            sx={{
                                bgcolor: '#dcfce7',
                                color: '#16a34a',
                                '&:hover': { bgcolor: '#bbf7d0' },
                            }}
                        >
                            <AccountBalance fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>

            {/* Context menu */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                onClick={(e) => e.stopPropagation()}
                PaperProps={{
                    sx: { borderRadius: 2, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', minWidth: 160 },
                }}
            >
                <MenuItem onClick={() => { onView?.(user.id); handleMenuClose(); }}>
                    <ListItemIcon><Visibility fontSize="small" /></ListItemIcon>
                    <ListItemText>عرض الملف</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => { onEdit?.(user.id); handleMenuClose(); }}>
                    <ListItemIcon><Edit fontSize="small" /></ListItemIcon>
                    <ListItemText>تعديل</ListItemText>
                </MenuItem>
                <MenuItem
                    onClick={() => { onDelete?.(user.id); handleMenuClose(); }}
                    sx={{ color: 'error.main' }}
                >
                    <ListItemIcon><Delete fontSize="small" sx={{ color: 'error.main' }} /></ListItemIcon>
                    <ListItemText>حذف</ListItemText>
                </MenuItem>
            </Menu>
        </GlassCard>
    );
};

export default UserCard;
