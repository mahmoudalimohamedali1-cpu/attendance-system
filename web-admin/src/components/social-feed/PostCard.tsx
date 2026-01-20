import React, { useState } from 'react';
import {
    Box,
    Typography,
    Avatar,
    Chip,
    IconButton,
    Tooltip,
    Button,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Divider,
} from '@mui/material';
import {
    PushPin,
    Campaign,
    TrendingUp,
    MoreVert,
    Comment,
    Share,
    Bookmark,
    BookmarkBorder,
    Edit,
    Delete,
    Flag,
    CheckCircle,
    ThumbUp,
    Favorite,
    Celebration,
    SupportAgent,
    Lightbulb,
    AttachFile,
    Image as ImageIcon,
    VideoLibrary,
    Description,
    Link as LinkIcon,
    AccessTime,
    Visibility,
} from '@mui/icons-material';
import { GlassCard } from '@/components/premium';
import {
    Post,
    PostType,
    ReactionSummary,
    ReactionType,
    PostAttachment,
} from '@/services/social-feed.service';

interface PostCardProps {
    post: Post;
    onReact?: (postId: string, reactionType: ReactionType) => void;
    onComment?: (postId: string) => void;
    onShare?: (postId: string) => void;
    onAcknowledge?: (postId: string) => void;
    onEdit?: (postId: string) => void;
    onDelete?: (postId: string) => void;
    onReport?: (postId: string) => void;
    onBookmark?: (postId: string) => void;
    onClick?: (postId: string) => void;
    isBookmarked?: boolean;
    showActions?: boolean;
    compact?: boolean;
    currentUserId?: string;
}

// Post type configuration with Arabic labels
const postTypeConfig: Record<PostType, { icon: React.ReactElement; label: string; gradient: string[] }> = {
    POST: {
        icon: <Comment sx={{ fontSize: 16 }} />,
        label: 'منشور',
        gradient: ['#3b82f6', '#1d4ed8'],
    },
    ANNOUNCEMENT: {
        icon: <Campaign sx={{ fontSize: 16 }} />,
        label: 'إعلان رسمي',
        gradient: ['#f59e0b', '#d97706'],
    },
    PROMOTED: {
        icon: <TrendingUp sx={{ fontSize: 16 }} />,
        label: 'مروّج',
        gradient: ['#8b5cf6', '#7c3aed'],
    },
};

// Reaction configuration with emojis and Arabic labels
const reactionConfig: Record<ReactionType, { emoji: string; label: string; color: string }> = {
    LIKE: { emoji: '👍', label: 'إعجاب', color: '#3b82f6' },
    LOVE: { emoji: '❤️', label: 'أحببته', color: '#ef4444' },
    CELEBRATE: { emoji: '🎉', label: 'احتفال', color: '#f59e0b' },
    SUPPORT: { emoji: '🤝', label: 'دعم', color: '#10b981' },
    INSIGHTFUL: { emoji: '💡', label: 'ملهم', color: '#8b5cf6' },
};

// Reaction icons for the picker
const reactionIcons: Record<ReactionType, React.ReactElement> = {
    LIKE: <ThumbUp sx={{ fontSize: 20 }} />,
    LOVE: <Favorite sx={{ fontSize: 20 }} />,
    CELEBRATE: <Celebration sx={{ fontSize: 20 }} />,
    SUPPORT: <SupportAgent sx={{ fontSize: 20 }} />,
    INSIGHTFUL: <Lightbulb sx={{ fontSize: 20 }} />,
};

// Helper to format relative time in Arabic
const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    if (diffDays < 7) return `منذ ${diffDays} يوم`;

    return date.toLocaleDateString('ar-SA', { day: 'numeric', month: 'short', year: 'numeric' });
};

// Helper to get initials from name
const getInitials = (name: string): string => {
    return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
};

// Attachment type icon helper
const getAttachmentIcon = (type: PostAttachment['type']): React.ReactElement => {
    switch (type) {
        case 'IMAGE':
            return <ImageIcon sx={{ fontSize: 16 }} />;
        case 'VIDEO':
            return <VideoLibrary sx={{ fontSize: 16 }} />;
        case 'DOCUMENT':
            return <Description sx={{ fontSize: 16 }} />;
        case 'LINK':
            return <LinkIcon sx={{ fontSize: 16 }} />;
        default:
            return <AttachFile sx={{ fontSize: 16 }} />;
    }
};

/**
 * PostCard Component
 * Premium social feed post card with author info, content, reactions, comments count, and action buttons
 * Supports Arabic RTL layout and multiple post types (POST, ANNOUNCEMENT, PROMOTED)
 */
export const PostCard: React.FC<PostCardProps> = ({
    post,
    onReact,
    onComment,
    onShare,
    onAcknowledge,
    onEdit,
    onDelete,
    onReport,
    onBookmark,
    onClick,
    isBookmarked = false,
    showActions = true,
    compact = false,
    currentUserId,
}) => {
    const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
    const [showReactionPicker, setShowReactionPicker] = useState(false);
    const [reactionAnchor, setReactionAnchor] = useState<null | HTMLElement>(null);

    const typeConfig = postTypeConfig[post.type];
    const isOwner = currentUserId === post.author.id;
    const totalReactions = post.reactions.reduce((sum, r) => sum + r.count, 0);
    const topReactions = [...post.reactions].sort((a, b) => b.count - a.count).slice(0, 3);

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        event.stopPropagation();
        setMenuAnchor(event.currentTarget);
    };

    const handleMenuClose = () => {
        setMenuAnchor(null);
    };

    const handleReactionClick = (event: React.MouseEvent<HTMLElement>) => {
        event.stopPropagation();
        setReactionAnchor(event.currentTarget);
        setShowReactionPicker(true);
    };

    const handleReactionSelect = (reactionType: ReactionType) => {
        setShowReactionPicker(false);
        setReactionAnchor(null);
        onReact?.(post.id, reactionType);
    };

    const handleCardClick = () => {
        onClick?.(post.id);
    };

    return (
        <GlassCard
            sx={{
                p: compact ? 2 : 3,
                cursor: onClick ? 'pointer' : 'default',
                position: 'relative',
                animation: 'fadeIn 0.3s ease',
                '@keyframes fadeIn': {
                    from: { opacity: 0, transform: 'translateY(10px)' },
                    to: { opacity: 1, transform: 'translateY(0)' },
                },
            }}
            onClick={handleCardClick}
            hoverEffect={!!onClick}
        >
            {/* Pinned indicator */}
            {post.isPinned && (
                <Box
                    sx={{
                        position: 'absolute',
                        top: 12,
                        left: 12,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        color: '#f59e0b',
                    }}
                >
                    <PushPin sx={{ fontSize: 16, transform: 'rotate(45deg)' }} />
                    <Typography variant="caption" fontWeight={600} color="inherit">
                        مثبت
                    </Typography>
                </Box>
            )}

            {/* Header: Author info and menu */}
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                {/* Author Avatar */}
                <Box sx={{ position: 'relative' }}>
                    <Avatar
                        src={post.author.avatar}
                        sx={{
                            width: compact ? 40 : 48,
                            height: compact ? 40 : 48,
                            background: `linear-gradient(135deg, ${typeConfig.gradient[0]}, ${typeConfig.gradient[1]})`,
                            fontSize: compact ? '0.875rem' : '1rem',
                            fontWeight: 600,
                        }}
                    >
                        {getInitials(post.author.name)}
                    </Avatar>
                    {/* Post type badge overlay */}
                    <Box
                        sx={{
                            position: 'absolute',
                            bottom: -2,
                            right: -2,
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            bgcolor: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                            color: typeConfig.gradient[0],
                        }}
                    >
                        {typeConfig.icon}
                    </Box>
                </Box>

                {/* Author details */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Typography variant="body2" fontWeight={600} noWrap>
                            {post.author.name}
                        </Typography>
                        {post.type !== 'POST' && (
                            <Chip
                                size="small"
                                label={typeConfig.label}
                                sx={{
                                    height: 20,
                                    fontSize: '0.65rem',
                                    fontWeight: 600,
                                    background: `linear-gradient(135deg, ${typeConfig.gradient[0]}, ${typeConfig.gradient[1]})`,
                                    color: 'white',
                                }}
                            />
                        )}
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.25 }}>
                        {post.author.jobTitle && (
                            <Typography variant="caption" color="text.secondary" noWrap>
                                {post.author.jobTitle}
                            </Typography>
                        )}
                        {post.author.jobTitle && post.author.department && (
                            <Typography variant="caption" color="text.secondary">
                                •
                            </Typography>
                        )}
                        {post.author.department && (
                            <Typography variant="caption" color="text.secondary" noWrap>
                                {post.author.department}
                            </Typography>
                        )}
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.25 }}>
                        <AccessTime sx={{ fontSize: 12, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary">
                            {formatRelativeTime(post.publishedAt || post.createdAt)}
                        </Typography>
                        {post.viewsCount > 0 && (
                            <>
                                <Typography variant="caption" color="text.secondary">
                                    •
                                </Typography>
                                <Visibility sx={{ fontSize: 12, color: 'text.secondary' }} />
                                <Typography variant="caption" color="text.secondary">
                                    {post.viewsCount} مشاهدة
                                </Typography>
                            </>
                        )}
                    </Box>
                </Box>

                {/* Menu button */}
                {showActions && (
                    <IconButton size="small" onClick={handleMenuOpen}>
                        <MoreVert fontSize="small" />
                    </IconButton>
                )}
            </Box>

            {/* Content */}
            <Box sx={{ mt: 2 }}>
                {post.title && (
                    <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                        {post.title}
                    </Typography>
                )}
                <Typography
                    variant="body2"
                    sx={{
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        ...(compact && {
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                        }),
                    }}
                >
                    {post.content}
                </Typography>
            </Box>

            {/* Attachments preview */}
            {post.attachments && post.attachments.length > 0 && (
                <Box sx={{ mt: 2 }}>
                    {/* Image attachments */}
                    {post.attachments.filter((a) => a.type === 'IMAGE').length > 0 && (
                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: post.attachments.filter((a) => a.type === 'IMAGE').length === 1 ? '1fr' : 'repeat(2, 1fr)',
                                gap: 1,
                                mb: 1,
                            }}
                        >
                            {post.attachments
                                .filter((a) => a.type === 'IMAGE')
                                .slice(0, 4)
                                .map((attachment, index) => (
                                    <Box
                                        key={attachment.id}
                                        sx={{
                                            position: 'relative',
                                            borderRadius: 2,
                                            overflow: 'hidden',
                                            aspectRatio: '16/9',
                                            bgcolor: 'rgba(0,0,0,0.05)',
                                        }}
                                    >
                                        <img
                                            src={attachment.thumbnailUrl || attachment.url}
                                            alt={attachment.name || 'صورة'}
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'cover',
                                            }}
                                        />
                                        {index === 3 && post.attachments!.filter((a) => a.type === 'IMAGE').length > 4 && (
                                            <Box
                                                sx={{
                                                    position: 'absolute',
                                                    inset: 0,
                                                    bgcolor: 'rgba(0,0,0,0.5)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                }}
                                            >
                                                <Typography variant="h6" color="white" fontWeight={600}>
                                                    +{post.attachments!.filter((a) => a.type === 'IMAGE').length - 4}
                                                </Typography>
                                            </Box>
                                        )}
                                    </Box>
                                ))}
                        </Box>
                    )}

                    {/* Other attachments */}
                    {post.attachments.filter((a) => a.type !== 'IMAGE').length > 0 && (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {post.attachments
                                .filter((a) => a.type !== 'IMAGE')
                                .map((attachment) => (
                                    <Chip
                                        key={attachment.id}
                                        size="small"
                                        icon={getAttachmentIcon(attachment.type)}
                                        label={attachment.name || 'ملف'}
                                        sx={{
                                            bgcolor: 'rgba(0,0,0,0.05)',
                                            '&:hover': { bgcolor: 'rgba(0,0,0,0.1)' },
                                        }}
                                    />
                                ))}
                        </Box>
                    )}
                </Box>
            )}

            {/* Reactions and comments summary */}
            {(totalReactions > 0 || post.commentsCount > 0) && (
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        mt: 2,
                        pt: 2,
                        borderTop: '1px solid rgba(0,0,0,0.05)',
                    }}
                >
                    {/* Reactions summary */}
                    {totalReactions > 0 && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                                            zIndex: 3 - index,
                                        }}
                                    >
                                        {reactionConfig[reaction.type].emoji}
                                    </Box>
                                ))}
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                                {totalReactions} تفاعل
                            </Typography>
                        </Box>
                    )}

                    {/* Comments count */}
                    {post.commentsCount > 0 && (
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                            onClick={(e) => {
                                e.stopPropagation();
                                onComment?.(post.id);
                            }}
                        >
                            {post.commentsCount} تعليق
                        </Typography>
                    )}
                </Box>
            )}

            {/* Action buttons */}
            {showActions && (
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-around',
                        mt: 2,
                        pt: 2,
                        borderTop: '1px solid rgba(0,0,0,0.05)',
                    }}
                >
                    {/* React button */}
                    <Tooltip title="تفاعل">
                        <Button
                            size="small"
                            startIcon={
                                post.userReaction ? (
                                    <Box component="span" sx={{ fontSize: '1.25rem' }}>
                                        {reactionConfig[post.userReaction].emoji}
                                    </Box>
                                ) : (
                                    <ThumbUp sx={{ fontSize: 18 }} />
                                )
                            }
                            sx={{
                                color: post.userReaction ? reactionConfig[post.userReaction].color : 'text.secondary',
                                fontWeight: post.userReaction ? 600 : 400,
                                '&:hover': { bgcolor: 'rgba(0,0,0,0.05)' },
                            }}
                            onClick={handleReactionClick}
                        >
                            {post.userReaction ? reactionConfig[post.userReaction].label : 'إعجاب'}
                        </Button>
                    </Tooltip>

                    {/* Comment button */}
                    {post.allowComments && (
                        <Tooltip title="تعليق">
                            <Button
                                size="small"
                                startIcon={<Comment sx={{ fontSize: 18 }} />}
                                sx={{
                                    color: 'text.secondary',
                                    '&:hover': { bgcolor: 'rgba(0,0,0,0.05)' },
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onComment?.(post.id);
                                }}
                            >
                                تعليق
                            </Button>
                        </Tooltip>
                    )}

                    {/* Share button */}
                    <Tooltip title="مشاركة">
                        <Button
                            size="small"
                            startIcon={<Share sx={{ fontSize: 18 }} />}
                            sx={{
                                color: 'text.secondary',
                                '&:hover': { bgcolor: 'rgba(0,0,0,0.05)' },
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                onShare?.(post.id);
                            }}
                        >
                            مشاركة
                        </Button>
                    </Tooltip>
                </Box>
            )}

            {/* Acknowledge button for announcements */}
            {post.type === 'ANNOUNCEMENT' && post.requireAcknowledge && !post.acknowledged && (
                <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                    <Button
                        variant="contained"
                        fullWidth
                        startIcon={<CheckCircle />}
                        sx={{
                            background: `linear-gradient(135deg, ${postTypeConfig.ANNOUNCEMENT.gradient[0]}, ${postTypeConfig.ANNOUNCEMENT.gradient[1]})`,
                            '&:hover': {
                                background: `linear-gradient(135deg, ${postTypeConfig.ANNOUNCEMENT.gradient[1]}, ${postTypeConfig.ANNOUNCEMENT.gradient[0]})`,
                            },
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                            onAcknowledge?.(post.id);
                        }}
                    >
                        قرأت وفهمت
                    </Button>
                </Box>
            )}

            {/* Acknowledged indicator */}
            {post.type === 'ANNOUNCEMENT' && post.requireAcknowledge && post.acknowledged && (
                <Box
                    sx={{
                        mt: 2,
                        pt: 2,
                        borderTop: '1px solid rgba(0,0,0,0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 1,
                        color: '#10b981',
                    }}
                >
                    <CheckCircle sx={{ fontSize: 18 }} />
                    <Typography variant="body2" fontWeight={600}>
                        تم الإقرار
                    </Typography>
                    {post.acknowledgedAt && (
                        <Typography variant="caption" color="text.secondary">
                            • {formatRelativeTime(post.acknowledgedAt)}
                        </Typography>
                    )}
                </Box>
            )}

            {/* Reaction picker popover */}
            <Menu
                anchorEl={reactionAnchor}
                open={showReactionPicker}
                onClose={() => {
                    setShowReactionPicker(false);
                    setReactionAnchor(null);
                }}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                        p: 1,
                    },
                }}
            >
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                    {(Object.keys(reactionConfig) as ReactionType[]).map((type) => (
                        <Tooltip key={type} title={reactionConfig[type].label}>
                            <IconButton
                                size="small"
                                onClick={() => handleReactionSelect(type)}
                                sx={{
                                    fontSize: '1.5rem',
                                    transition: 'transform 0.2s ease',
                                    bgcolor: post.userReaction === type ? `${reactionConfig[type].color}20` : 'transparent',
                                    '&:hover': {
                                        transform: 'scale(1.3)',
                                        bgcolor: `${reactionConfig[type].color}20`,
                                    },
                                }}
                            >
                                {reactionConfig[type].emoji}
                            </IconButton>
                        </Tooltip>
                    ))}
                </Box>
            </Menu>

            {/* More options menu */}
            <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={handleMenuClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                PaperProps={{
                    sx: { borderRadius: 2, minWidth: 180 },
                }}
            >
                <MenuItem
                    onClick={() => {
                        handleMenuClose();
                        onBookmark?.(post.id);
                    }}
                >
                    <ListItemIcon>
                        {isBookmarked ? <Bookmark fontSize="small" /> : <BookmarkBorder fontSize="small" />}
                    </ListItemIcon>
                    <ListItemText>{isBookmarked ? 'إزالة من المحفوظات' : 'حفظ المنشور'}</ListItemText>
                </MenuItem>

                {isOwner && (
                    <>
                        <Divider />
                        <MenuItem
                            onClick={() => {
                                handleMenuClose();
                                onEdit?.(post.id);
                            }}
                        >
                            <ListItemIcon>
                                <Edit fontSize="small" />
                            </ListItemIcon>
                            <ListItemText>تعديل</ListItemText>
                        </MenuItem>
                        <MenuItem
                            onClick={() => {
                                handleMenuClose();
                                onDelete?.(post.id);
                            }}
                            sx={{ color: 'error.main' }}
                        >
                            <ListItemIcon>
                                <Delete fontSize="small" color="error" />
                            </ListItemIcon>
                            <ListItemText>حذف</ListItemText>
                        </MenuItem>
                    </>
                )}

                {!isOwner && (
                    <>
                        <Divider />
                        <MenuItem
                            onClick={() => {
                                handleMenuClose();
                                onReport?.(post.id);
                            }}
                            sx={{ color: 'warning.main' }}
                        >
                            <ListItemIcon>
                                <Flag fontSize="small" color="warning" />
                            </ListItemIcon>
                            <ListItemText>إبلاغ</ListItemText>
                        </MenuItem>
                    </>
                )}
            </Menu>
        </GlassCard>
    );
};

export default PostCard;
