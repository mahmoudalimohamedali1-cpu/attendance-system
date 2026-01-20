import React, { useState } from 'react';
import {
    Box,
    Button,
    IconButton,
    Tooltip,
    Popover,
    Typography,
} from '@mui/material';
import {
    ThumbUp,
    Favorite,
    Celebration,
    SupportAgent,
    Lightbulb,
} from '@mui/icons-material';
import { ReactionType, ReactionSummary } from '@/services/social-feed.service';

// Reaction configuration with emojis, Arabic labels, and colors
const reactionConfig: Record<ReactionType, { emoji: string; label: string; color: string; icon: React.ReactElement }> = {
    LIKE: { emoji: '👍', label: 'إعجاب', color: '#3b82f6', icon: <ThumbUp sx={{ fontSize: 20 }} /> },
    LOVE: { emoji: '❤️', label: 'أحببته', color: '#ef4444', icon: <Favorite sx={{ fontSize: 20 }} /> },
    CELEBRATE: { emoji: '🎉', label: 'احتفال', color: '#f59e0b', icon: <Celebration sx={{ fontSize: 20 }} /> },
    SUPPORT: { emoji: '🤝', label: 'دعم', color: '#10b981', icon: <SupportAgent sx={{ fontSize: 20 }} /> },
    INSIGHTFUL: { emoji: '💡', label: 'ملهم', color: '#8b5cf6', icon: <Lightbulb sx={{ fontSize: 20 }} /> },
};

// Available reaction types (ordered for display)
const availableReactions: ReactionType[] = ['LIKE', 'LOVE', 'CELEBRATE', 'SUPPORT', 'INSIGHTFUL'];

interface ReactionButtonProps {
    /** Current user's reaction, if any */
    userReaction?: ReactionType;
    /** Summary of all reactions on the post */
    reactions?: ReactionSummary[];
    /** Callback when user selects a reaction */
    onReact?: (reactionType: ReactionType) => void;
    /** Callback when user removes their reaction */
    onRemoveReaction?: () => void;
    /** Whether the button is disabled */
    disabled?: boolean;
    /** Size variant */
    size?: 'small' | 'medium';
    /** Whether to show the reaction count */
    showCount?: boolean;
    /** Whether to show the label text */
    showLabel?: boolean;
    /** Custom className */
    className?: string;
}

/**
 * ReactionButton Component
 * Premium reaction button with emoji picker for social feed posts
 * Supports like, love, celebrate, support, and insightful reactions
 * Follows Arabic RTL layout conventions
 */
export const ReactionButton: React.FC<ReactionButtonProps> = ({
    userReaction,
    reactions = [],
    onReact,
    onRemoveReaction,
    disabled = false,
    size = 'medium',
    showCount = true,
    showLabel = true,
}) => {
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const [hoveredReaction, setHoveredReaction] = useState<ReactionType | null>(null);

    const isPickerOpen = Boolean(anchorEl);
    const totalReactions = reactions.reduce((sum, r) => sum + r.count, 0);

    // Handle click on main button
    const handleButtonClick = (event: React.MouseEvent<HTMLElement>) => {
        event.stopPropagation();

        if (userReaction) {
            // If already reacted, remove reaction
            onRemoveReaction?.();
        } else {
            // Open picker to select reaction
            setAnchorEl(event.currentTarget);
        }
    };

    // Handle long press / right click to show picker even when already reacted
    const handleContextMenu = (event: React.MouseEvent<HTMLElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setAnchorEl(event.currentTarget);
    };

    // Handle selection of a reaction
    const handleReactionSelect = (reactionType: ReactionType) => {
        setAnchorEl(null);
        setHoveredReaction(null);

        if (userReaction === reactionType) {
            // If selecting same reaction, remove it
            onRemoveReaction?.();
        } else {
            // Select new reaction
            onReact?.(reactionType);
        }
    };

    // Close picker
    const handlePickerClose = () => {
        setAnchorEl(null);
        setHoveredReaction(null);
    };

    // Get display values based on current state
    const currentConfig = userReaction ? reactionConfig[userReaction] : reactionConfig.LIKE;
    const buttonColor = userReaction ? currentConfig.color : 'text.secondary';
    const buttonLabel = userReaction ? currentConfig.label : 'إعجاب';
    const buttonEmoji = userReaction ? currentConfig.emoji : null;

    const buttonSx = {
        color: buttonColor,
        fontWeight: userReaction ? 600 : 400,
        fontSize: size === 'small' ? '0.75rem' : '0.875rem',
        minWidth: size === 'small' ? 'auto' : undefined,
        px: size === 'small' ? 1 : 2,
        py: size === 'small' ? 0.5 : 1,
        borderRadius: 2,
        transition: 'all 0.2s ease',
        '&:hover': {
            bgcolor: userReaction ? `${currentConfig.color}15` : 'rgba(0,0,0,0.05)',
            transform: 'scale(1.02)',
        },
        '&:active': {
            transform: 'scale(0.98)',
        },
    };

    return (
        <>
            <Tooltip
                title={userReaction ? 'اضغط للإزالة أو اضغط مطولاً للتغيير' : 'تفاعل'}
                enterDelay={500}
            >
                <Button
                    size={size}
                    disabled={disabled}
                    onClick={handleButtonClick}
                    onContextMenu={handleContextMenu}
                    startIcon={
                        buttonEmoji ? (
                            <Box
                                component="span"
                                sx={{
                                    fontSize: size === 'small' ? '1rem' : '1.25rem',
                                    lineHeight: 1,
                                }}
                            >
                                {buttonEmoji}
                            </Box>
                        ) : (
                            <ThumbUp sx={{ fontSize: size === 'small' ? 16 : 18 }} />
                        )
                    }
                    sx={buttonSx}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {showLabel && buttonLabel}
                        {showCount && totalReactions > 0 && (
                            <Typography
                                component="span"
                                variant="caption"
                                sx={{
                                    bgcolor: 'rgba(0,0,0,0.08)',
                                    px: 0.75,
                                    py: 0.25,
                                    borderRadius: 1,
                                    fontSize: '0.7rem',
                                    fontWeight: 600,
                                }}
                            >
                                {totalReactions}
                            </Typography>
                        )}
                    </Box>
                </Button>
            </Tooltip>

            {/* Emoji Picker Popover */}
            <Popover
                open={isPickerOpen}
                anchorEl={anchorEl}
                onClose={handlePickerClose}
                anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'center',
                }}
                transformOrigin={{
                    vertical: 'bottom',
                    horizontal: 'center',
                }}
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                        p: 1,
                        bgcolor: 'background.paper',
                        overflow: 'visible',
                        animation: 'popIn 0.2s ease',
                        '@keyframes popIn': {
                            from: { opacity: 0, transform: 'scale(0.9) translateY(8px)' },
                            to: { opacity: 1, transform: 'scale(1) translateY(0)' },
                        },
                    },
                }}
            >
                <Box sx={{ display: 'flex', gap: 0.5, position: 'relative' }}>
                    {availableReactions.map((type) => {
                        const config = reactionConfig[type];
                        const isCurrentReaction = userReaction === type;
                        const isHovered = hoveredReaction === type;

                        return (
                            <Box
                                key={type}
                                sx={{
                                    position: 'relative',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                }}
                            >
                                {/* Tooltip label on hover */}
                                {isHovered && (
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            top: -32,
                                            left: '50%',
                                            transform: 'translateX(-50%)',
                                            bgcolor: 'grey.800',
                                            color: 'white',
                                            px: 1,
                                            py: 0.5,
                                            borderRadius: 1,
                                            fontSize: '0.7rem',
                                            fontWeight: 600,
                                            whiteSpace: 'nowrap',
                                            zIndex: 1,
                                            animation: 'fadeIn 0.15s ease',
                                            '@keyframes fadeIn': {
                                                from: { opacity: 0, transform: 'translateX(-50%) translateY(4px)' },
                                                to: { opacity: 1, transform: 'translateX(-50%) translateY(0)' },
                                            },
                                        }}
                                    >
                                        {config.label}
                                    </Box>
                                )}
                                <IconButton
                                    size="small"
                                    onClick={() => handleReactionSelect(type)}
                                    onMouseEnter={() => setHoveredReaction(type)}
                                    onMouseLeave={() => setHoveredReaction(null)}
                                    sx={{
                                        width: 44,
                                        height: 44,
                                        fontSize: '1.5rem',
                                        transition: 'all 0.2s ease',
                                        bgcolor: isCurrentReaction ? `${config.color}20` : 'transparent',
                                        border: isCurrentReaction ? `2px solid ${config.color}` : '2px solid transparent',
                                        transform: isHovered ? 'scale(1.3) translateY(-4px)' : 'scale(1)',
                                        '&:hover': {
                                            bgcolor: `${config.color}20`,
                                        },
                                    }}
                                >
                                    {config.emoji}
                                </IconButton>
                            </Box>
                        );
                    })}
                </Box>
            </Popover>
        </>
    );
};

/**
 * ReactionSummaryDisplay Component
 * Shows a summary of reactions with emoji icons and total count
 * Can be used alongside ReactionButton for displaying reaction stats
 */
interface ReactionSummaryDisplayProps {
    reactions: ReactionSummary[];
    maxVisible?: number;
    onClick?: () => void;
}

export const ReactionSummaryDisplay: React.FC<ReactionSummaryDisplayProps> = ({
    reactions,
    maxVisible = 3,
    onClick,
}) => {
    const totalReactions = reactions.reduce((sum, r) => sum + r.count, 0);
    const topReactions = [...reactions]
        .filter((r) => r.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, maxVisible);

    if (totalReactions === 0) {
        return null;
    }

    return (
        <Tooltip title={reactions.map((r) => `${reactionConfig[r.type].emoji} ${r.count}`).join(' • ')}>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    cursor: onClick ? 'pointer' : 'default',
                    '&:hover': onClick ? { opacity: 0.8 } : {},
                }}
                onClick={onClick}
            >
                <Box sx={{ display: 'flex', ml: -0.5 }}>
                    {topReactions.map((reaction, index) => (
                        <Box
                            key={reaction.type}
                            sx={{
                                width: 24,
                                height: 24,
                                borderRadius: '50%',
                                bgcolor: reactionConfig[reaction.type].color,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                ml: index > 0 ? -1 : 0,
                                border: '2px solid white',
                                fontSize: '0.75rem',
                                zIndex: maxVisible - index,
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                            }}
                        >
                            {reactionConfig[reaction.type].emoji}
                        </Box>
                    ))}
                </Box>
                <Typography variant="caption" color="text.secondary" fontWeight={500}>
                    {totalReactions} تفاعل
                </Typography>
            </Box>
        </Tooltip>
    );
};

export default ReactionButton;
