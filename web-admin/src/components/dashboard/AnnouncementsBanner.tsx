import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Avatar,
    IconButton,
    Chip,
    Button,
    Skeleton,
} from '@mui/material';
import {
    Campaign,
    ChevronLeft,
    ChevronRight,
    PushPin,
    ThumbUp,
    Comment,
    Visibility,
} from '@mui/icons-material';
import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { socialFeedService } from '@/services/social-feed.service';

interface Post {
    id: string;
    title?: string;
    content: string;
    type: string;
    isPinned: boolean;
    author: {
        id: string;
        firstName?: string;
        lastName?: string;
        name?: string;
        avatar?: string;
        jobTitle?: string;
    };
    reactions: Array<{ type: string; count: number }>;
    commentsCount: number;
    viewsCount: number;
    createdAt: string;
}

export const AnnouncementsBanner = () => {
    const navigate = useNavigate();
    const [currentIndex, setCurrentIndex] = useState(0);

    const { data: postsData, isLoading } = useQuery({
        queryKey: ['announcements-banner'],
        queryFn: () => socialFeedService.getFeed({ page: 1, limit: 10, type: 'ANNOUNCEMENT' }),
        refetchInterval: 120000, // Refresh every 2 minutes
    });

    const announcements = postsData?.items || [];

    if (isLoading) {
        return (
            <Box sx={{ mb: 4 }}>
                <Skeleton variant="rounded" height={200} sx={{ borderRadius: 4 }} />
            </Box>
        );
    }

    if (announcements.length === 0) {
        return null;
    }

    const currentPost = announcements[currentIndex];
    const authorName = currentPost?.author?.name ||
        `${currentPost?.author?.firstName || ''} ${currentPost?.author?.lastName || ''}`.trim() ||
        'الإدارة';

    const totalReactions = currentPost?.reactions?.reduce((sum: number, r: { count: number }) => sum + r.count, 0) || 0;

    const handleNext = () => {
        setCurrentIndex((prev) => (prev + 1) % announcements.length);
    };

    const handlePrev = () => {
        setCurrentIndex((prev) => (prev - 1 + announcements.length) % announcements.length);
    };

    return (
        <Box sx={{ mb: 4 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Campaign sx={{ color: '#e91e63' }} />
                    📢 إعلانات الإدارة
                    {announcements.length > 1 && (
                        <Chip label={`${currentIndex + 1}/${announcements.length}`} size="small" sx={{ ml: 1 }} />
                    )}
                </Typography>
                <Button
                    variant="text"
                    onClick={() => navigate('/social-feed')}
                    sx={{ textTransform: 'none' }}
                >
                    عرض الكل →
                </Button>
            </Box>

            {/* Announcement Card */}
            <Card
                sx={{
                    position: 'relative',
                    overflow: 'hidden',
                    borderRadius: 4,
                    background: currentPost?.isPinned
                        ? 'linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%)'
                        : 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                    border: currentPost?.isPinned ? '2px solid #ffc107' : '1px solid #90caf9',
                    cursor: 'pointer',
                    '&:hover': {
                        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                    },
                    transition: 'all 0.3s ease',
                }}
                onClick={() => navigate('/social-feed')}
            >
                <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        {/* Author Avatar */}
                        <Avatar
                            src={currentPost?.author?.avatar}
                            sx={{
                                width: 56,
                                height: 56,
                                bgcolor: '#1976d2',
                                border: '3px solid white',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            }}
                        >
                            {authorName.charAt(0)}
                        </Avatar>

                        {/* Content */}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            {/* Author & Time */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                <Typography variant="subtitle1" fontWeight="bold">
                                    {authorName}
                                </Typography>
                                {currentPost?.author?.jobTitle && (
                                    <Chip
                                        label={currentPost.author.jobTitle}
                                        size="small"
                                        sx={{ fontSize: '0.7rem', height: 20 }}
                                    />
                                )}
                                {currentPost?.isPinned && (
                                    <Chip
                                        icon={<PushPin sx={{ fontSize: 14 }} />}
                                        label="مثبت"
                                        size="small"
                                        color="warning"
                                        sx={{ fontSize: '0.7rem', height: 22 }}
                                    />
                                )}
                                <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                                    {currentPost?.createdAt && formatDistanceToNow(new Date(currentPost.createdAt), {
                                        addSuffix: true,
                                        locale: ar
                                    })}
                                </Typography>
                            </Box>

                            {/* Title */}
                            {currentPost?.title && (
                                <Typography variant="h6" fontWeight="bold" sx={{ mb: 1 }}>
                                    {currentPost.title}
                                </Typography>
                            )}

                            {/* Content */}
                            <Typography
                                variant="body1"
                                sx={{
                                    color: 'text.secondary',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                    lineHeight: 1.6,
                                }}
                            >
                                {currentPost?.content}
                            </Typography>

                            {/* Stats */}
                            <Box sx={{ display: 'flex', gap: 3, mt: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <ThumbUp sx={{ fontSize: 16, color: '#1976d2' }} />
                                    <Typography variant="caption" color="text.secondary">
                                        {totalReactions}
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Comment sx={{ fontSize: 16, color: '#4caf50' }} />
                                    <Typography variant="caption" color="text.secondary">
                                        {currentPost?.commentsCount || 0}
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Visibility sx={{ fontSize: 16, color: '#9e9e9e' }} />
                                    <Typography variant="caption" color="text.secondary">
                                        {currentPost?.viewsCount || 0}
                                    </Typography>
                                </Box>
                            </Box>
                        </Box>
                    </Box>
                </CardContent>

                {/* Navigation Arrows */}
                {announcements.length > 1 && (
                    <>
                        <IconButton
                            onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                            sx={{
                                position: 'absolute',
                                left: 8,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                bgcolor: 'rgba(255,255,255,0.9)',
                                '&:hover': { bgcolor: 'white' },
                                boxShadow: 2,
                            }}
                            size="small"
                        >
                            <ChevronRight />
                        </IconButton>
                        <IconButton
                            onClick={(e) => { e.stopPropagation(); handleNext(); }}
                            sx={{
                                position: 'absolute',
                                right: 8,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                bgcolor: 'rgba(255,255,255,0.9)',
                                '&:hover': { bgcolor: 'white' },
                                boxShadow: 2,
                            }}
                            size="small"
                        >
                            <ChevronLeft />
                        </IconButton>
                    </>
                )}

                {/* Dots Indicator */}
                {announcements.length > 1 && (
                    <Box sx={{
                        position: 'absolute',
                        bottom: 12,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        display: 'flex',
                        gap: 0.5,
                    }}>
                        {announcements.map((_: Post, idx: number) => (
                            <Box
                                key={idx}
                                sx={{
                                    width: currentIndex === idx ? 16 : 6,
                                    height: 6,
                                    borderRadius: 3,
                                    bgcolor: currentIndex === idx ? '#1976d2' : 'rgba(0,0,0,0.2)',
                                    transition: 'all 0.3s ease',
                                    cursor: 'pointer',
                                }}
                                onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); }}
                            />
                        ))}
                    </Box>
                )}
            </Card>
        </Box>
    );
};
