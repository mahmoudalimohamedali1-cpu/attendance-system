import { api } from './api.service';

// Enums
export type PostType = 'POST' | 'ANNOUNCEMENT' | 'PROMOTED';
export type PostStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'PUBLISHED' | 'ARCHIVED' | 'REJECTED';
export type VisibilityType = 'PUBLIC' | 'DEPARTMENT' | 'TEAM' | 'TARGETED' | 'MANAGERS_ONLY' | 'HR_ONLY' | 'PRIVATE';
export type ReactionType = 'LIKE' | 'LOVE' | 'CELEBRATE' | 'SUPPORT' | 'INSIGHTFUL';
export type TargetType = 'BRANCH' | 'DEPARTMENT' | 'TEAM' | 'USER' | 'ROLE' | 'JOB_TITLE' | 'GRADE' | 'CONTRACT_TYPE' | 'SHIFT' | 'LOCATION' | 'TAG';
export type MentionType = 'USER' | 'TEAM' | 'DEPARTMENT';

// Interfaces
export interface PostAuthor {
    id: string;
    name: string;
    avatar?: string;
    jobTitle?: string;
    department?: string;
}

export interface PostReaction {
    id: string;
    userId: string;
    reactionType: ReactionType;
    createdAt: string;
}

export interface ReactionSummary {
    type: ReactionType;
    count: number;
    hasReacted: boolean;
}

export interface PostTarget {
    id: string;
    targetType: TargetType;
    targetValue: string;
    isExclusion: boolean;
}

export interface PostMention {
    id: string;
    mentionType: MentionType;
    mentionId: string;
    startIndex?: number;
    endIndex?: number;
}

export interface PostAttachment {
    id: string;
    type: 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'LINK';
    url: string;
    thumbnailUrl?: string;
    name?: string;
    size?: number;
    mimeType?: string;
}

export interface PostComment {
    id: string;
    postId: string;
    author: PostAuthor;
    content: string;
    parentId?: string;
    replies?: PostComment[];
    repliesCount: number;
    createdAt: string;
    updatedAt: string;
}

export interface Post {
    id: string;
    companyId: string;
    type: PostType;
    status: PostStatus;
    title?: string;
    titleEn?: string;
    content: string;
    contentEn?: string;
    author: PostAuthor;
    visibilityType: VisibilityType;
    isPinned: boolean;
    pinnedUntil?: string;
    publishedAt?: string;
    scheduledAt?: string;
    expiresAt?: string;
    requireAcknowledge: boolean;
    hideAfterAcknowledge: boolean;
    allowComments: boolean;
    acknowledged?: boolean;
    acknowledgedAt?: string;
    reactions: ReactionSummary[];
    userReaction?: ReactionType;
    commentsCount: number;
    viewsCount: number;
    reachCount: number;
    impressionCount: number;
    targets?: PostTarget[];
    attachments?: PostAttachment[];
    mentions?: PostMention[];
    createdAt: string;
    updatedAt: string;
}

export interface PostsResponse {
    items: Post[];
    total: number;
    page: number;
    limit: number;
}

export interface CommentsResponse {
    items: PostComment[];
    total: number;
    page: number;
    limit: number;
}

export interface PostAnalytics {
    postId: string;
    reachCount: number;
    impressionCount: number;
    clickCount: number;
    engagementRate: number;
    reactions: { type: ReactionType; count: number }[];
    commentsCount: number;
    acknowledgementsCount: number;
    acknowledgementsTotal: number;
    viewsByDay: { date: string; count: number }[];
    topDepartments: { department: string; viewCount: number }[];
}

export interface AudiencePreview {
    totalUsers: number;
    departments: { id: string; name: string; count: number }[];
    branches: { id: string; name: string; count: number }[];
}

// DTOs
export interface CreatePostDto {
    type?: PostType;
    title?: string;
    titleEn?: string;
    content: string;
    contentEn?: string;
    visibilityType?: VisibilityType;
    isPinned?: boolean;
    pinnedUntil?: string;
    scheduledAt?: string;
    expiresAt?: string;
    requireAcknowledge?: boolean;
    hideAfterAcknowledge?: boolean;
    allowComments?: boolean;
    targets?: { targetType: TargetType; targetValue: string; isExclusion?: boolean }[];
    attachmentIds?: string[];
    mentions?: { mentionType: MentionType; mentionId: string; startIndex?: number; endIndex?: number }[];
}

export interface UpdatePostDto {
    title?: string;
    titleEn?: string;
    content?: string;
    contentEn?: string;
    visibilityType?: VisibilityType;
    isPinned?: boolean;
    pinnedUntil?: string;
    scheduledAt?: string;
    expiresAt?: string;
    requireAcknowledge?: boolean;
    hideAfterAcknowledge?: boolean;
    allowComments?: boolean;
    targets?: { targetType: TargetType; targetValue: string; isExclusion?: boolean }[];
    attachmentIds?: string[];
    mentions?: { mentionType: MentionType; mentionId: string; startIndex?: number; endIndex?: number }[];
}

export interface CreateCommentDto {
    content: string;
    parentId?: string;
}

export interface FeedOptions {
    page?: number;
    limit?: number;
    filter?: 'all' | 'department' | 'team' | 'pinned' | 'unread' | 'announcements';
    type?: PostType;
    status?: PostStatus;
}

export interface SearchOptions {
    query: string;
    page?: number;
    limit?: number;
    type?: PostType;
}

export interface AudiencePreviewOptions {
    visibilityType: VisibilityType;
    targets?: { targetType: TargetType; targetValue: string; isExclusion?: boolean }[];
}

// Social Feed Service
export const socialFeedService = {
    // Feed
    getFeed: (options?: FeedOptions): Promise<PostsResponse> =>
        api.get<PostsResponse>('/social-feed', { params: options }),

    searchPosts: (options: SearchOptions): Promise<PostsResponse> =>
        api.get<PostsResponse>('/social-feed/search', { params: options }),

    // Post CRUD
    getPost: (id: string): Promise<Post> =>
        api.get<Post>(`/social-feed/${id}`),

    createPost: (data: CreatePostDto): Promise<Post> =>
        api.post<Post>('/social-feed', data),

    updatePost: (id: string, data: UpdatePostDto): Promise<Post> =>
        api.patch<Post>(`/social-feed/${id}`, data),

    deletePost: (id: string): Promise<{ success: boolean }> =>
        api.delete<{ success: boolean }>(`/social-feed/${id}`),

    // Reactions
    reactToPost: (postId: string, reactionType: ReactionType): Promise<{ success: boolean; reactions: ReactionSummary[] }> =>
        api.post<{ success: boolean; reactions: ReactionSummary[] }>(`/social-feed/${postId}/react`, { emoji: reactionType.toLowerCase() }),

    removeReaction: (postId: string): Promise<{ success: boolean; reactions: ReactionSummary[] }> =>
        api.delete<{ success: boolean; reactions: ReactionSummary[] }>(`/social-feed/${postId}/react`),

    // Acknowledgement
    acknowledgePost: (postId: string): Promise<{ success: boolean; acknowledgedAt: string }> =>
        api.post<{ success: boolean; acknowledgedAt: string }>(`/social-feed/${postId}/acknowledge`),

    // Comments
    getComments: (postId: string, options?: { page?: number; limit?: number }): Promise<CommentsResponse> =>
        api.get<CommentsResponse>(`/social-feed/${postId}/comments`, { params: options }),

    addComment: (postId: string, data: CreateCommentDto): Promise<PostComment> =>
        api.post<PostComment>(`/social-feed/${postId}/comments`, data),

    deleteComment: (postId: string, commentId: string): Promise<{ success: boolean }> =>
        api.delete<{ success: boolean }>(`/social-feed/${postId}/comments/${commentId}`),

    // Admin Actions
    pinPost: (postId: string, isPinned: boolean, pinnedUntil?: string): Promise<{ success: boolean }> =>
        api.post<{ success: boolean }>(`/social-feed/${postId}/pin`, { isPinned, pinnedUntil }),

    approvePost: (postId: string): Promise<{ success: boolean }> =>
        api.post<{ success: boolean }>(`/social-feed/${postId}/approve`),

    rejectPost: (postId: string, reason?: string): Promise<{ success: boolean }> =>
        api.post<{ success: boolean }>(`/social-feed/${postId}/reject`, { reason }),

    // Analytics
    getAnalytics: (postId: string): Promise<PostAnalytics> =>
        api.get<PostAnalytics>(`/social-feed/${postId}/analytics`),

    // Audience Preview
    previewAudience: (options: AudiencePreviewOptions): Promise<AudiencePreview> =>
        api.post<AudiencePreview>('/social-feed/audience-preview', options),

    // Track impression (for analytics)
    trackImpression: (postId: string): Promise<{ success: boolean }> =>
        api.post<{ success: boolean }>(`/social-feed/${postId}/impression`),
};
