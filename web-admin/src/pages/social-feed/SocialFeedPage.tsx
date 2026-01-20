import React, { useState, useEffect, useRef } from 'react';
import {
    Box,
    Typography,
    Grid,
    CircularProgress,
    Skeleton,
    Alert,
    Snackbar,
    Drawer,
    IconButton,
    useTheme,
    alpha,
    Fab,
    Tooltip,
    Zoom,
    TextField,
    InputAdornment,
    Divider,
} from '@mui/material';
import {
    Add as AddIcon,
    DynamicFeed,
    Search,
    Close,
    KeyboardArrowUp,
    Refresh,
} from '@mui/icons-material';
import { useInfiniteQuery, useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { GlassCard } from '@/components/premium';
import { useAuthStore } from '@/store/auth.store';
import {
    socialFeedService,
    Post,
    PostComment,
    ReactionType,
    FeedOptions,
    CreatePostDto,
} from '@/services/social-feed.service';
import { PostCard } from '@/components/social-feed/PostCard';
import { CreatePost } from '@/components/social-feed/CreatePost';
import { CommentSection } from '@/components/social-feed/CommentSection';
import { FeedFilters, FeedFilterType } from '@/components/social-feed/FeedFilters';

/**
 * SocialFeedPage - Main social feed page with infinite scroll
 * Features:
 * - Infinite scroll feed with TanStack Query
 * - Filters for All, Department, Team, Pinned, Unread
 * - Create post section
 * - Post detail drawer with comments
 * - Reactions and acknowledgements
 * - Arabic RTL layout support
 */
const SocialFeedPage: React.FC = () => {
    const theme = useTheme();
    const queryClient = useQueryClient();
    const { user } = useAuthStore();
    const observerTarget = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // State
    const [activeFilter, setActiveFilter] = useState<FeedFilterType>('all');
    const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
    const [showCreatePost, setShowCreatePost] = useState(false);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    // Snackbar state
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: 'success' | 'error' | 'info';
    }>({
        open: false,
        message: '',
        severity: 'success',
    });

    // Current user for components
    const currentUser = user
        ? {
            id: user.id,
            name: `${user.firstName} ${user.lastName}`,
            avatar: user.avatar,
            jobTitle: user.jobTitle,
            department: user.department?.name,
        }
        : undefined;

    // Feed query with infinite scroll
    const {
        data: feedData,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading: isFeedLoading,
        isError: isFeedError,
        refetch: refetchFeed,
    } = useInfiniteQuery({
        queryKey: ['social-feed', activeFilter, searchQuery],
        queryFn: async ({ pageParam = 1 }) => {
            const options: FeedOptions = {
                page: pageParam,
                limit: 10,
                filter: activeFilter === 'all' ? undefined : activeFilter,
            };

            if (searchQuery.trim()) {
                return socialFeedService.searchPosts({
                    query: searchQuery,
                    page: pageParam,
                    limit: 10,
                });
            }

            return socialFeedService.getFeed(options);
        },
        getNextPageParam: (lastPage, allPages) => {
            const totalPages = Math.ceil(lastPage.total / lastPage.limit);
            const nextPage = allPages.length + 1;
            return nextPage <= totalPages ? nextPage : undefined;
        },
        initialPageParam: 1,
        staleTime: 0, // Always fetch fresh data
    });

    // Selected post detail query
    const { data: selectedPost, isLoading: isPostLoading } = useQuery({
        queryKey: ['social-feed-post', selectedPostId],
        queryFn: () => socialFeedService.getPost(selectedPostId!),
        enabled: !!selectedPostId,
    });

    // Comments query for selected post
    const {
        data: commentsData,
        fetchNextPage: fetchMoreComments,
        hasNextPage: hasMoreComments,
        isLoading: isCommentsLoading,
    } = useInfiniteQuery({
        queryKey: ['post-comments', selectedPostId],
        queryFn: async ({ pageParam = 1 }) => {
            return socialFeedService.getComments(selectedPostId!, {
                page: pageParam,
                limit: 20,
            });
        },
        getNextPageParam: (lastPage, allPages) => {
            const totalPages = Math.ceil(lastPage.total / lastPage.limit);
            const nextPage = allPages.length + 1;
            return nextPage <= totalPages ? nextPage : undefined;
        },
        initialPageParam: 1,
        enabled: !!selectedPostId,
    });

    // Flatten comments from all pages
    const comments: PostComment[] =
        commentsData?.pages.flatMap((page) => page.items) || [];
    const totalComments = commentsData?.pages[0]?.total || 0;

    // Create post mutation
    const createPostMutation = useMutation({
        mutationFn: (data: CreatePostDto) => socialFeedService.createPost(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['social-feed'] });
            setShowCreatePost(false);
            showSnackbar('تم نشر المنشور بنجاح', 'success');
        },
        onError: () => {
            showSnackbar('حدث خطأ أثناء نشر المنشور', 'error');
        },
    });

    // React to post mutation with optimistic update
    const reactMutation = useMutation({
        mutationFn: ({ postId, reactionType }: { postId: string; reactionType: ReactionType }) =>
            socialFeedService.reactToPost(postId, reactionType),
        onMutate: async ({ postId, reactionType }) => {
            // Cancel any outgoing refetches
            await queryClient.cancelQueries({ queryKey: ['social-feed'] });

            // Snapshot the previous value
            const previousData = queryClient.getQueryData(['social-feed', activeFilter, searchQuery]);

            // Optimistically update the cache
            queryClient.setQueryData(['social-feed', activeFilter, searchQuery], (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    pages: old.pages.map((page: any) => ({
                        ...page,
                        items: page.items.map((post: any) => {
                            if (post.id === postId) {
                                return {
                                    ...post,
                                    userReaction: reactionType.toLowerCase(),
                                };
                            }
                            return post;
                        }),
                    })),
                };
            });

            return { previousData };
        },
        onError: (err, variables, context) => {
            // Rollback on error
            if (context?.previousData) {
                queryClient.setQueryData(['social-feed', activeFilter, searchQuery], context.previousData);
            }
        },
        onSettled: () => {
            // Refetch to sync with server
            queryClient.invalidateQueries({ queryKey: ['social-feed'] });
        },
    });

    // Acknowledge post mutation
    const acknowledgeMutation = useMutation({
        mutationFn: (postId: string) => socialFeedService.acknowledgePost(postId),
        onSuccess: (_, postId) => {
            queryClient.invalidateQueries({ queryKey: ['social-feed'] });
            queryClient.invalidateQueries({ queryKey: ['social-feed-post', postId] });
            showSnackbar('تم الإقرار بالإعلان', 'success');
        },
        onError: () => {
            showSnackbar('حدث خطأ أثناء الإقرار', 'error');
        },
    });

    // Add comment mutation
    const addCommentMutation = useMutation({
        mutationFn: ({ postId, content, parentId }: { postId: string; content: string; parentId?: string }) =>
            socialFeedService.addComment(postId, { content, parentId }),
        onSuccess: (_, { postId }) => {
            queryClient.invalidateQueries({ queryKey: ['post-comments', postId] });
            queryClient.invalidateQueries({ queryKey: ['social-feed'] });
            queryClient.invalidateQueries({ queryKey: ['social-feed-post', postId] });
        },
        onError: () => {
            showSnackbar('حدث خطأ أثناء إضافة التعليق', 'error');
        },
    });

    // Delete comment mutation
    const deleteCommentMutation = useMutation({
        mutationFn: ({ postId, commentId }: { postId: string; commentId: string }) =>
            socialFeedService.deleteComment(postId, commentId),
        onSuccess: (_, { postId }) => {
            queryClient.invalidateQueries({ queryKey: ['post-comments', postId] });
            queryClient.invalidateQueries({ queryKey: ['social-feed'] });
            showSnackbar('تم حذف التعليق', 'success');
        },
        onError: () => {
            showSnackbar('حدث خطأ أثناء حذف التعليق', 'error');
        },
    });

    // Delete post mutation
    const deletePostMutation = useMutation({
        mutationFn: (postId: string) => socialFeedService.deletePost(postId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['social-feed'] });
            setSelectedPostId(null);
            showSnackbar('تم حذف المنشور', 'success');
        },
        onError: () => {
            showSnackbar('حدث خطأ أثناء حذف المنشور', 'error');
        },
    });

    // Track impression when post is visible
    const trackImpressionMutation = useMutation({
        mutationFn: (postId: string) => socialFeedService.trackImpression(postId),
    });

    // Flatten posts from all pages
    const posts: Post[] = feedData?.pages.flatMap((page) => page.items) || [];

    // Show snackbar helper
    const showSnackbar = (message: string, severity: 'success' | 'error' | 'info') => {
        setSnackbar({ open: true, message, severity });
    };

    // Handle filter change
    const handleFilterChange = (filter: FeedFilterType) => {
        setActiveFilter(filter);
        setSearchQuery('');
        setIsSearching(false);
    };

    // Handle post click - open detail drawer
    const handlePostClick = (postId: string) => {
        setSelectedPostId(postId);
    };

    // Handle close drawer
    const handleCloseDrawer = () => {
        setSelectedPostId(null);
    };

    // Handle reaction
    const handleReact = (postId: string, reactionType: ReactionType) => {
        console.log('handleReact called:', { postId, reactionType });
        reactMutation.mutate({ postId, reactionType });
    };

    // Handle acknowledge
    const handleAcknowledge = (postId: string) => {
        acknowledgeMutation.mutate(postId);
    };

    // Handle add comment
    const handleAddComment = async (postId: string, content: string, parentId?: string) => {
        await addCommentMutation.mutateAsync({ postId, content, parentId });
    };

    // Handle delete comment
    const handleDeleteComment = async (postId: string, commentId: string) => {
        await deleteCommentMutation.mutateAsync({ postId, commentId });
    };

    // Handle delete post
    const handleDeletePost = (postId: string) => {
        if (window.confirm('هل أنت متأكد من حذف هذا المنشور؟')) {
            deletePostMutation.mutate(postId);
        }
    };

    // Handle create post
    const handleCreatePost = async (data: CreatePostDto) => {
        await createPostMutation.mutateAsync(data);
    };

    // Handle search
    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
    };

    // Toggle search
    const toggleSearch = () => {
        setIsSearching(!isSearching);
        if (isSearching) {
            setSearchQuery('');
        }
    };

    // Scroll to top
    const scrollToTop = () => {
        scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Infinite scroll observer
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
                    fetchNextPage();
                }
            },
            { threshold: 0.1 }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => observer.disconnect();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    // Track scroll position for scroll-to-top button
    useEffect(() => {
        const handleScroll = () => {
            if (scrollContainerRef.current) {
                setShowScrollTop(scrollContainerRef.current.scrollTop > 300);
            }
        };

        const container = scrollContainerRef.current;
        container?.addEventListener('scroll', handleScroll);

        return () => container?.removeEventListener('scroll', handleScroll);
    }, []);

    // Track impressions for visible posts
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const postId = entry.target.getAttribute('data-post-id');
                        if (postId) {
                            trackImpressionMutation.mutate(postId);
                        }
                    }
                });
            },
            { threshold: 0.5 }
        );

        // Observe all post cards
        const postElements = document.querySelectorAll('[data-post-id]');
        postElements.forEach((el) => observer.observe(el));

        return () => observer.disconnect();
    }, [posts]);

    return (
        <Box
            ref={scrollContainerRef}
            sx={{
                height: 'calc(100vh - 64px)',
                overflowY: 'auto',
                p: 3,
                bgcolor: alpha(theme.palette.background.default, 0.5),
            }}
        >
            {/* Header */}
            <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box>
                        <Typography
                            variant="h4"
                            fontWeight={800}
                            gutterBottom
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                background: `linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)`,
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                            }}
                        >
                            <DynamicFeed sx={{ fontSize: 36, color: '#3b82f6' }} />
                            الأخبار والإعلانات
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            تابع آخر الأخبار والإعلانات من زملائك وفريقك
                        </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1 }}>
                        {/* Search toggle */}
                        <Tooltip title="بحث">
                            <IconButton
                                onClick={toggleSearch}
                                sx={{
                                    bgcolor: isSearching ? 'primary.main' : 'rgba(0,0,0,0.05)',
                                    color: isSearching ? 'white' : 'text.secondary',
                                    '&:hover': {
                                        bgcolor: isSearching ? 'primary.dark' : 'rgba(0,0,0,0.1)',
                                    },
                                }}
                            >
                                {isSearching ? <Close /> : <Search />}
                            </IconButton>
                        </Tooltip>

                        {/* Refresh button */}
                        <Tooltip title="تحديث">
                            <IconButton
                                onClick={() => refetchFeed()}
                                sx={{
                                    bgcolor: 'rgba(0,0,0,0.05)',
                                    '&:hover': { bgcolor: 'rgba(0,0,0,0.1)' },
                                }}
                            >
                                <Refresh />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Box>

                {/* Search field */}
                {isSearching && (
                    <Box
                        sx={{
                            mb: 2,
                            animation: 'slideDown 0.3s ease',
                            '@keyframes slideDown': {
                                from: { opacity: 0, transform: 'translateY(-10px)' },
                                to: { opacity: 1, transform: 'translateY(0)' },
                            },
                        }}
                    >
                        <TextField
                            fullWidth
                            placeholder="ابحث في المنشورات..."
                            value={searchQuery}
                            onChange={handleSearch}
                            autoFocus
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Search color="action" />
                                    </InputAdornment>
                                ),
                            }}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 3,
                                    bgcolor: 'white',
                                },
                            }}
                        />
                    </Box>
                )}

                {/* Filters */}
                <FeedFilters
                    activeFilter={activeFilter}
                    onFilterChange={handleFilterChange}
                    disabled={isFeedLoading}
                />
            </Box>

            {/* Main content grid */}
            <Grid container spacing={3}>
                {/* Left column: Create post + Feed */}
                <Grid item xs={12} lg={8}>
                    {/* Create Post Section */}
                    {showCreatePost ? (
                        <Box sx={{ mb: 3 }}>
                            <CreatePost
                                currentUser={currentUser}
                                onSubmit={handleCreatePost}
                                onCancel={() => setShowCreatePost(false)}
                                isSubmitting={createPostMutation.isPending}
                                error={createPostMutation.isError ? 'حدث خطأ أثناء نشر المنشور' : null}
                            />
                        </Box>
                    ) : (
                        <GlassCard
                            sx={{
                                p: 2,
                                mb: 3,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                    transform: 'translateY(-2px)',
                                    boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                                },
                            }}
                            onClick={() => setShowCreatePost(true)}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Box
                                    sx={{
                                        width: 44,
                                        height: 44,
                                        borderRadius: '50%',
                                        background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'white',
                                    }}
                                >
                                    <AddIcon />
                                </Box>
                                <Typography color="text.secondary">ما الذي تريد مشاركته؟</Typography>
                            </Box>
                        </GlassCard>
                    )}

                    {/* Feed posts */}
                    {isFeedLoading ? (
                        // Loading skeletons
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {[1, 2, 3].map((i) => (
                                <Skeleton
                                    key={i}
                                    variant="rectangular"
                                    height={200}
                                    sx={{ borderRadius: 3 }}
                                />
                            ))}
                        </Box>
                    ) : isFeedError ? (
                        // Error state
                        <Alert severity="error" sx={{ borderRadius: 2 }}>
                            حدث خطأ أثناء تحميل المنشورات. يرجى المحاولة مرة أخرى.
                        </Alert>
                    ) : posts.length === 0 ? (
                        // Empty state
                        <GlassCard sx={{ p: 6, textAlign: 'center' }}>
                            <DynamicFeed sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                            <Typography variant="h6" color="text.secondary" gutterBottom>
                                {searchQuery ? 'لا توجد نتائج' : 'لا توجد منشورات بعد'}
                            </Typography>
                            <Typography variant="body2" color="text.disabled">
                                {searchQuery
                                    ? 'جرب البحث بكلمات أخرى'
                                    : 'كن أول من ينشر شيئاً جديداً!'}
                            </Typography>
                        </GlassCard>
                    ) : (
                        // Posts list
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {posts.map((post) => (
                                <Box key={post.id} data-post-id={post.id}>
                                    <PostCard
                                        post={post}
                                        currentUserId={user?.id}
                                        onReact={handleReact}
                                        onComment={handlePostClick}
                                        onAcknowledge={handleAcknowledge}
                                        onDelete={handleDeletePost}
                                        onClick={handlePostClick}
                                        compact
                                    />
                                </Box>
                            ))}

                            {/* Infinite scroll trigger */}
                            <Box ref={observerTarget} sx={{ height: 1 }} />

                            {/* Loading more indicator */}
                            {isFetchingNextPage && (
                                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                                    <CircularProgress size={32} />
                                </Box>
                            )}

                            {/* End of feed message */}
                            {!hasNextPage && posts.length > 0 && (
                                <Box sx={{ textAlign: 'center', py: 3 }}>
                                    <Typography variant="body2" color="text.secondary">
                                        لقد وصلت إلى نهاية المنشورات
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                    )}
                </Grid>

                {/* Right column: Sidebar widgets */}
                <Grid item xs={12} lg={4}>
                    {/* Quick stats */}
                    <GlassCard sx={{ p: 3, mb: 3 }}>
                        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                            إحصائيات سريعة
                        </Typography>
                        <Divider sx={{ my: 2 }} />
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="body2" color="text.secondary">
                                    المنشورات اليوم
                                </Typography>
                                <Typography variant="body2" fontWeight={600}>
                                    {posts.filter((p) => {
                                        const today = new Date();
                                        const postDate = new Date(p.createdAt);
                                        return postDate.toDateString() === today.toDateString();
                                    }).length}
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="body2" color="text.secondary">
                                    إعلانات تحتاج إقرار
                                </Typography>
                                <Typography variant="body2" fontWeight={600} color="warning.main">
                                    {posts.filter((p) => p.type === 'ANNOUNCEMENT' && p.requireAcknowledge && !p.acknowledged).length}
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="body2" color="text.secondary">
                                    المنشورات المثبتة
                                </Typography>
                                <Typography variant="body2" fontWeight={600} color="primary.main">
                                    {posts.filter((p) => p.isPinned).length}
                                </Typography>
                            </Box>
                        </Box>
                    </GlassCard>

                    {/* Pinned posts preview */}
                    {posts.some((p) => p.isPinned) && (
                        <GlassCard sx={{ p: 3 }}>
                            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                                المنشورات المثبتة
                            </Typography>
                            <Divider sx={{ my: 2 }} />
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {posts
                                    .filter((p) => p.isPinned)
                                    .slice(0, 3)
                                    .map((post) => (
                                        <Box
                                            key={post.id}
                                            sx={{
                                                p: 2,
                                                borderRadius: 2,
                                                bgcolor: 'rgba(0,0,0,0.02)',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease',
                                                '&:hover': {
                                                    bgcolor: 'rgba(0,0,0,0.05)',
                                                    transform: 'translateX(-4px)',
                                                },
                                            }}
                                            onClick={() => handlePostClick(post.id)}
                                        >
                                            <Typography
                                                variant="body2"
                                                fontWeight={600}
                                                sx={{
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: 'vertical',
                                                    overflow: 'hidden',
                                                }}
                                            >
                                                {post.title || post.content}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {post.author.name}
                                            </Typography>
                                        </Box>
                                    ))}
                            </Box>
                        </GlassCard>
                    )}
                </Grid>
            </Grid>

            {/* Floating action button for quick post */}
            <Zoom in={!showCreatePost}>
                <Fab
                    color="primary"
                    aria-label="إنشاء منشور"
                    onClick={() => setShowCreatePost(true)}
                    sx={{
                        position: 'fixed',
                        bottom: 24,
                        right: 24,
                        background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                        boxShadow: '0 8px 24px rgba(59, 130, 246, 0.4)',
                        '&:hover': {
                            background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                        },
                    }}
                >
                    <AddIcon />
                </Fab>
            </Zoom>

            {/* Scroll to top button */}
            <Zoom in={showScrollTop}>
                <Fab
                    size="small"
                    aria-label="العودة للأعلى"
                    onClick={scrollToTop}
                    sx={{
                        position: 'fixed',
                        bottom: 88,
                        right: 24,
                        bgcolor: 'white',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        '&:hover': {
                            bgcolor: 'grey.100',
                        },
                    }}
                >
                    <KeyboardArrowUp />
                </Fab>
            </Zoom>

            {/* Post detail drawer */}
            <Drawer
                anchor="left"
                open={!!selectedPostId}
                onClose={handleCloseDrawer}
                PaperProps={{
                    sx: {
                        width: { xs: '100%', sm: 500, md: 600 },
                        p: 3,
                        bgcolor: alpha(theme.palette.background.default, 0.98),
                    },
                }}
            >
                {isPostLoading ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 3 }} />
                        <Skeleton variant="text" width="60%" />
                        <Skeleton variant="text" width="80%" />
                    </Box>
                ) : selectedPost ? (
                    <Box>
                        {/* Close button */}
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                            <IconButton onClick={handleCloseDrawer}>
                                <Close />
                            </IconButton>
                        </Box>

                        {/* Full post card */}
                        <PostCard
                            post={selectedPost}
                            currentUserId={user?.id}
                            onReact={handleReact}
                            onAcknowledge={handleAcknowledge}
                            onDelete={handleDeletePost}
                            compact={false}
                            showActions
                        />

                        {/* Comments section */}
                        <Box sx={{ mt: 3 }}>
                            <CommentSection
                                postId={selectedPostId!}
                                comments={comments}
                                totalComments={totalComments}
                                isLoading={isCommentsLoading}
                                hasMore={hasMoreComments}
                                currentUserId={user?.id}
                                currentUser={currentUser}
                                onAddComment={handleAddComment}
                                onDeleteComment={handleDeleteComment}
                                onLoadMore={() => fetchMoreComments()}
                            />
                        </Box>
                    </Box>
                ) : null}
            </Drawer>

            {/* Snackbar for notifications */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
                    severity={snackbar.severity}
                    sx={{ borderRadius: 2 }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default SocialFeedPage;
export { SocialFeedPage };
