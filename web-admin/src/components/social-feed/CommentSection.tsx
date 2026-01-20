import React, { useState } from 'react';
import {
    Box,
    Typography,
    Avatar,
    IconButton,
    TextField,
    Button,
    Collapse,
    CircularProgress,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Divider,
} from '@mui/material';
import {
    Send,
    Reply,
    MoreVert,
    Edit,
    Delete,
    Flag,
    ExpandMore,
    ExpandLess,
    SubdirectoryArrowLeft,
} from '@mui/icons-material';
import { PostComment, PostAuthor } from '@/services/social-feed.service';

interface CommentSectionProps {
    postId: string;
    comments: PostComment[];
    totalComments: number;
    isLoading?: boolean;
    hasMore?: boolean;
    currentUserId?: string;
    currentUser?: PostAuthor;
    onAddComment?: (postId: string, content: string, parentId?: string) => Promise<void>;
    onEditComment?: (postId: string, commentId: string, content: string) => Promise<void>;
    onDeleteComment?: (postId: string, commentId: string) => Promise<void>;
    onReportComment?: (postId: string, commentId: string) => void;
    onLoadMore?: () => void;
    onLoadReplies?: (commentId: string) => void;
    maxVisibleReplies?: number;
}

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

    return date.toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' });
};

// Helper to get initials from name
const getInitials = (name: string): string => {
    if (!name) return '??';
    return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
};

interface SingleCommentProps {
    comment: PostComment;
    postId: string;
    currentUserId?: string;
    isReply?: boolean;
    onReply?: (commentId: string) => void;
    onEdit?: (commentId: string, content: string) => void;
    onDelete?: (commentId: string) => void;
    onReport?: (commentId: string) => void;
    onLoadReplies?: (commentId: string) => void;
    showReplies?: boolean;
    onToggleReplies?: () => void;
    maxVisibleReplies?: number;
}

/**
 * SingleComment Component
 * Renders a single comment with author info, content, and action buttons
 */
const SingleComment: React.FC<SingleCommentProps> = ({
    comment,
    postId,
    currentUserId,
    isReply = false,
    onReply,
    onEdit,
    onDelete,
    onReport,
    onLoadReplies,
    showReplies = false,
    onToggleReplies,
    maxVisibleReplies = 3,
}) => {
    const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(comment.content);

    const isOwner = currentUserId === comment.author.id;
    const hasReplies = comment.repliesCount > 0 || (comment.replies && comment.replies.length > 0);

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        event.stopPropagation();
        setMenuAnchor(event.currentTarget);
    };

    const handleMenuClose = () => {
        setMenuAnchor(null);
    };

    const handleEdit = () => {
        handleMenuClose();
        setIsEditing(true);
    };

    const handleSaveEdit = () => {
        if (editContent.trim() && editContent !== comment.content) {
            onEdit?.(comment.id, editContent.trim());
        }
        setIsEditing(false);
    };

    const handleCancelEdit = () => {
        setEditContent(comment.content);
        setIsEditing(false);
    };

    const handleDelete = () => {
        handleMenuClose();
        onDelete?.(comment.id);
    };

    const handleReport = () => {
        handleMenuClose();
        onReport?.(comment.id);
    };

    return (
        <Box
            sx={{
                display: 'flex',
                gap: 1.5,
                animation: 'fadeIn 0.3s ease',
                '@keyframes fadeIn': {
                    from: { opacity: 0, transform: 'translateY(8px)' },
                    to: { opacity: 1, transform: 'translateY(0)' },
                },
            }}
        >
            {/* Author avatar */}
            <Avatar
                src={comment.author.avatar}
                sx={{
                    width: isReply ? 32 : 36,
                    height: isReply ? 32 : 36,
                    background: 'linear-gradient(135deg, #667eea, #764ba2)',
                    fontSize: isReply ? '0.75rem' : '0.875rem',
                    fontWeight: 600,
                }}
            >
                {getInitials(comment.author.name)}
            </Avatar>

            <Box sx={{ flex: 1, minWidth: 0 }}>
                {/* Comment content box */}
                <Box
                    sx={{
                        bgcolor: 'rgba(0, 0, 0, 0.03)',
                        borderRadius: 2,
                        p: 1.5,
                        position: 'relative',
                    }}
                >
                    {/* Author name and time */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography variant="body2" fontWeight={600}>
                            {comment.author.name}
                        </Typography>
                        {comment.author.jobTitle && (
                            <Typography variant="caption" color="text.secondary">
                                • {comment.author.jobTitle}
                            </Typography>
                        )}
                    </Box>

                    {/* Content or edit field */}
                    {isEditing ? (
                        <Box sx={{ mt: 1 }}>
                            <TextField
                                fullWidth
                                multiline
                                size="small"
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                placeholder="تعديل التعليق..."
                                autoFocus
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 2,
                                        bgcolor: 'white',
                                    },
                                }}
                            />
                            <Box sx={{ display: 'flex', gap: 1, mt: 1, justifyContent: 'flex-end' }}>
                                <Button size="small" onClick={handleCancelEdit}>
                                    إلغاء
                                </Button>
                                <Button
                                    size="small"
                                    variant="contained"
                                    onClick={handleSaveEdit}
                                    disabled={!editContent.trim() || editContent === comment.content}
                                    sx={{
                                        background: 'linear-gradient(135deg, #667eea, #764ba2)',
                                        '&:hover': {
                                            background: 'linear-gradient(135deg, #764ba2, #667eea)',
                                        },
                                    }}
                                >
                                    حفظ
                                </Button>
                            </Box>
                        </Box>
                    ) : (
                        <Typography
                            variant="body2"
                            sx={{
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                            }}
                        >
                            {comment.content}
                        </Typography>
                    )}

                    {/* Menu button */}
                    <IconButton
                        size="small"
                        onClick={handleMenuOpen}
                        sx={{
                            position: 'absolute',
                            top: 4,
                            left: 4,
                            opacity: 0.5,
                            '&:hover': { opacity: 1 },
                        }}
                    >
                        <MoreVert sx={{ fontSize: 16 }} />
                    </IconButton>
                </Box>

                {/* Action buttons row */}
                {!isEditing && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.5, px: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                            {formatRelativeTime(comment.createdAt)}
                        </Typography>

                        {/* Reply button - only show for top-level comments */}
                        {!isReply && (
                            <Typography
                                variant="caption"
                                sx={{
                                    color: 'text.secondary',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    '&:hover': { color: 'primary.main' },
                                }}
                                onClick={() => onReply?.(comment.id)}
                            >
                                رد
                            </Typography>
                        )}

                        {/* Updated indicator */}
                        {comment.updatedAt !== comment.createdAt && (
                            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                (معدّل)
                            </Typography>
                        )}
                    </Box>
                )}

                {/* Replies section */}
                {hasReplies && !isReply && (
                    <Box sx={{ mt: 1 }}>
                        {/* Toggle replies button */}
                        <Button
                            size="small"
                            startIcon={
                                showReplies ? (
                                    <ExpandLess sx={{ fontSize: 16 }} />
                                ) : (
                                    <ExpandMore sx={{ fontSize: 16 }} />
                                )
                            }
                            onClick={onToggleReplies}
                            sx={{
                                color: 'text.secondary',
                                textTransform: 'none',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                '&:hover': { bgcolor: 'rgba(0,0,0,0.05)' },
                            }}
                        >
                            {showReplies
                                ? 'إخفاء الردود'
                                : `عرض ${comment.repliesCount} ${comment.repliesCount === 1 ? 'رد' : 'ردود'}`}
                        </Button>

                        {/* Replies list */}
                        <Collapse in={showReplies}>
                            <Box
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 1.5,
                                    mt: 1,
                                    pl: 2,
                                    borderRight: '2px solid rgba(0,0,0,0.08)',
                                    pr: 1,
                                }}
                            >
                                {comment.replies?.slice(0, maxVisibleReplies).map((reply) => (
                                    <SingleComment
                                        key={reply.id}
                                        comment={reply}
                                        postId={postId}
                                        currentUserId={currentUserId}
                                        isReply
                                        onEdit={onEdit}
                                        onDelete={onDelete}
                                        onReport={onReport}
                                    />
                                ))}

                                {/* Load more replies button */}
                                {comment.replies && comment.replies.length > maxVisibleReplies && (
                                    <Button
                                        size="small"
                                        onClick={() => onLoadReplies?.(comment.id)}
                                        sx={{
                                            color: 'primary.main',
                                            textTransform: 'none',
                                            fontSize: '0.75rem',
                                            '&:hover': { bgcolor: 'rgba(0,0,0,0.05)' },
                                        }}
                                    >
                                        عرض المزيد من الردود ({comment.repliesCount - maxVisibleReplies})
                                    </Button>
                                )}

                                {/* Load replies if not yet loaded */}
                                {(!comment.replies || comment.replies.length === 0) && comment.repliesCount > 0 && (
                                    <Button
                                        size="small"
                                        onClick={() => onLoadReplies?.(comment.id)}
                                        sx={{
                                            color: 'primary.main',
                                            textTransform: 'none',
                                            fontSize: '0.75rem',
                                        }}
                                    >
                                        تحميل الردود ({comment.repliesCount})
                                    </Button>
                                )}
                            </Box>
                        </Collapse>
                    </Box>
                )}

                {/* Options menu */}
                <Menu
                    anchorEl={menuAnchor}
                    open={Boolean(menuAnchor)}
                    onClose={handleMenuClose}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                    PaperProps={{
                        sx: { borderRadius: 2, minWidth: 150 },
                    }}
                >
                    {isOwner ? (
                        <>
                            <MenuItem onClick={handleEdit}>
                                <ListItemIcon>
                                    <Edit fontSize="small" />
                                </ListItemIcon>
                                <ListItemText>تعديل</ListItemText>
                            </MenuItem>
                            <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
                                <ListItemIcon>
                                    <Delete fontSize="small" color="error" />
                                </ListItemIcon>
                                <ListItemText>حذف</ListItemText>
                            </MenuItem>
                        </>
                    ) : (
                        <MenuItem onClick={handleReport} sx={{ color: 'warning.main' }}>
                            <ListItemIcon>
                                <Flag fontSize="small" color="warning" />
                            </ListItemIcon>
                            <ListItemText>إبلاغ</ListItemText>
                        </MenuItem>
                    )}
                </Menu>
            </Box>
        </Box>
    );
};

/**
 * CommentSection Component
 * Premium comment section with comment list, add comment form, and reply functionality
 * Supports Arabic RTL layout and nested replies
 */
export const CommentSection: React.FC<CommentSectionProps> = ({
    postId,
    comments,
    totalComments,
    isLoading = false,
    hasMore = false,
    currentUserId,
    currentUser,
    onAddComment,
    onEditComment,
    onDeleteComment,
    onReportComment,
    onLoadMore,
    onLoadReplies,
    maxVisibleReplies = 3,
}) => {
    const [newComment, setNewComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyContent, setReplyContent] = useState('');
    const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());

    const handleSubmitComment = async () => {
        if (!newComment.trim() || !onAddComment) return;

        setIsSubmitting(true);
        try {
            await onAddComment(postId, newComment.trim());
            setNewComment('');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmitReply = async (parentId: string) => {
        if (!replyContent.trim() || !onAddComment) return;

        setIsSubmitting(true);
        try {
            await onAddComment(postId, replyContent.trim(), parentId);
            setReplyContent('');
            setReplyingTo(null);
            // Auto-expand replies for the parent comment
            setExpandedReplies((prev) => new Set([...prev, parentId]));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReply = (commentId: string) => {
        setReplyingTo(commentId);
        setReplyContent('');
    };

    const handleCancelReply = () => {
        setReplyingTo(null);
        setReplyContent('');
    };

    const handleEdit = (commentId: string, content: string) => {
        onEditComment?.(postId, commentId, content);
    };

    const handleDelete = (commentId: string) => {
        onDeleteComment?.(postId, commentId);
    };

    const handleReport = (commentId: string) => {
        onReportComment?.(postId, commentId);
    };

    const toggleReplies = (commentId: string) => {
        setExpandedReplies((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(commentId)) {
                newSet.delete(commentId);
            } else {
                newSet.add(commentId);
                // Load replies if not already loaded
                const comment = comments.find((c) => c.id === commentId);
                if (comment && (!comment.replies || comment.replies.length === 0) && comment.repliesCount > 0) {
                    onLoadReplies?.(commentId);
                }
            }
            return newSet;
        });
    };

    return (
        <Box>
            {/* Comment count header */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Typography variant="subtitle2" fontWeight={600}>
                    التعليقات
                </Typography>
                <Typography
                    variant="caption"
                    sx={{
                        bgcolor: 'rgba(0, 0, 0, 0.08)',
                        px: 1,
                        py: 0.25,
                        borderRadius: 1,
                        fontWeight: 600,
                    }}
                >
                    {totalComments}
                </Typography>
            </Box>

            {/* Add comment form */}
            <Box sx={{ display: 'flex', gap: 1.5, mb: 3 }}>
                <Avatar
                    src={currentUser?.avatar}
                    sx={{
                        width: 36,
                        height: 36,
                        background: 'linear-gradient(135deg, #667eea, #764ba2)',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                    }}
                >
                    {currentUser ? getInitials(currentUser.name) : '؟'}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                    <TextField
                        fullWidth
                        multiline
                        size="small"
                        maxRows={4}
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="اكتب تعليقاً..."
                        disabled={isSubmitting}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSubmitComment();
                            }
                        }}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 3,
                                bgcolor: 'rgba(0, 0, 0, 0.02)',
                                '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.04)' },
                                '&.Mui-focused': { bgcolor: 'white' },
                            },
                        }}
                        InputProps={{
                            endAdornment: (
                                <IconButton
                                    size="small"
                                    onClick={handleSubmitComment}
                                    disabled={!newComment.trim() || isSubmitting}
                                    sx={{
                                        color: newComment.trim() ? 'primary.main' : 'text.disabled',
                                        transform: 'rotate(180deg)', // RTL flip for send icon
                                    }}
                                >
                                    {isSubmitting ? (
                                        <CircularProgress size={18} />
                                    ) : (
                                        <Send sx={{ fontSize: 18 }} />
                                    )}
                                </IconButton>
                            ),
                        }}
                    />
                </Box>
            </Box>

            {/* Comments list */}
            {comments.length === 0 && !isLoading ? (
                <Box
                    sx={{
                        py: 4,
                        textAlign: 'center',
                        color: 'text.secondary',
                    }}
                >
                    <Typography variant="body2">لا توجد تعليقات بعد</Typography>
                    <Typography variant="caption">كن أول من يعلق!</Typography>
                </Box>
            ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {comments.map((comment) => (
                        <Box key={comment.id}>
                            <SingleComment
                                comment={comment}
                                postId={postId}
                                currentUserId={currentUserId}
                                onReply={handleReply}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                                onReport={handleReport}
                                onLoadReplies={onLoadReplies}
                                showReplies={expandedReplies.has(comment.id)}
                                onToggleReplies={() => toggleReplies(comment.id)}
                                maxVisibleReplies={maxVisibleReplies}
                            />

                            {/* Reply form */}
                            {replyingTo === comment.id && (
                                <Box
                                    sx={{
                                        display: 'flex',
                                        gap: 1.5,
                                        mt: 1.5,
                                        ml: 6,
                                        animation: 'fadeIn 0.2s ease',
                                    }}
                                >
                                    <SubdirectoryArrowLeft
                                        sx={{
                                            fontSize: 20,
                                            color: 'text.secondary',
                                            transform: 'scaleX(-1)', // RTL flip
                                        }}
                                    />
                                    <Avatar
                                        src={currentUser?.avatar}
                                        sx={{
                                            width: 32,
                                            height: 32,
                                            background: 'linear-gradient(135deg, #667eea, #764ba2)',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                        }}
                                    >
                                        {currentUser ? getInitials(currentUser.name) : '؟'}
                                    </Avatar>
                                    <Box sx={{ flex: 1 }}>
                                        <TextField
                                            fullWidth
                                            multiline
                                            size="small"
                                            maxRows={3}
                                            value={replyContent}
                                            onChange={(e) => setReplyContent(e.target.value)}
                                            placeholder={`رد على ${comment.author.name}...`}
                                            disabled={isSubmitting}
                                            autoFocus
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleSubmitReply(comment.id);
                                                }
                                                if (e.key === 'Escape') {
                                                    handleCancelReply();
                                                }
                                            }}
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    borderRadius: 2,
                                                    bgcolor: 'rgba(0, 0, 0, 0.02)',
                                                    '&.Mui-focused': { bgcolor: 'white' },
                                                },
                                            }}
                                        />
                                        <Box sx={{ display: 'flex', gap: 1, mt: 1, justifyContent: 'flex-end' }}>
                                            <Button size="small" onClick={handleCancelReply} disabled={isSubmitting}>
                                                إلغاء
                                            </Button>
                                            <Button
                                                size="small"
                                                variant="contained"
                                                onClick={() => handleSubmitReply(comment.id)}
                                                disabled={!replyContent.trim() || isSubmitting}
                                                startIcon={
                                                    isSubmitting ? (
                                                        <CircularProgress size={14} color="inherit" />
                                                    ) : (
                                                        <Reply sx={{ fontSize: 16 }} />
                                                    )
                                                }
                                                sx={{
                                                    background: 'linear-gradient(135deg, #667eea, #764ba2)',
                                                    '&:hover': {
                                                        background: 'linear-gradient(135deg, #764ba2, #667eea)',
                                                    },
                                                }}
                                            >
                                                رد
                                            </Button>
                                        </Box>
                                    </Box>
                                </Box>
                            )}
                        </Box>
                    ))}
                </Box>
            )}

            {/* Loading indicator */}
            {isLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                    <CircularProgress size={24} />
                </Box>
            )}

            {/* Load more button */}
            {hasMore && !isLoading && (
                <Box sx={{ textAlign: 'center', mt: 2, pt: 2, borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                    <Button
                        onClick={onLoadMore}
                        sx={{
                            color: '#667eea',
                            fontWeight: 600,
                            '&:hover': { bgcolor: 'rgba(102, 126, 234, 0.08)' },
                        }}
                    >
                        عرض المزيد من التعليقات
                    </Button>
                </Box>
            )}

            {/* Showing count summary */}
            {comments.length > 0 && totalComments > comments.length && !hasMore && (
                <Box sx={{ textAlign: 'center', mt: 2, pt: 2, borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                    <Typography variant="caption" color="text.secondary">
                        عرض {comments.length} من {totalComments} تعليق
                    </Typography>
                </Box>
            )}
        </Box>
    );
};

export default CommentSection;
