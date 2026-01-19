import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TargetingService, TargetRule } from './targeting.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PostStatus, PostType, VisibilityType, Prisma, MentionType, NotificationType } from '@prisma/client';
import { CreatePostDto, PostTargetDto, PostAttachmentDto, PostMentionDto } from './dto';
import { UpdatePostDto } from './dto';

// ==================== الواجهات (Interfaces) ====================

/**
 * خيارات جلب الفيد
 */
export interface FeedOptions {
  page?: number;
  limit?: number;
  filter?: 'all' | 'department' | 'team' | 'pinned' | 'unread' | 'announcements';
  postType?: PostType;
}

/**
 * نتيجة الفيد مع الترقيم
 */
export interface FeedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * بيانات المنشور مع العلاقات
 */
export interface PostWithRelations {
  id: string;
  companyId: string;
  authorId: string;
  type: PostType;
  title: string | null;
  titleEn: string | null;
  content: string;
  contentEn: string | null;
  visibilityType: VisibilityType;
  isPinned: boolean;
  pinnedUntil: Date | null;
  publishedAt: Date | null;
  scheduledAt: Date | null;
  expiresAt: Date | null;
  requireAcknowledge: boolean;
  hideAfterAcknowledge: boolean;
  allowComments: boolean;
  status: PostStatus;
  reachCount: number;
  impressionCount: number;
  clickCount: number;
  priority: number;
  maxImpressions: number | null;
  promotedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    avatar: string | null;
    department?: { id: string; name: string } | null;
  };
  targets: Array<{
    id: string;
    targetType: string;
    targetValue: string;
    isExclusion: boolean;
  }>;
  reactions: Array<{
    id: string;
    userId: string;
    emoji: string;
  }>;
  attachments: Array<{
    id: string;
    fileName: string;
    fileUrl: string;
    fileType: string;
    mimeType: string;
    fileSize: number;
    thumbnailUrl: string | null;
  }>;
  mentions: Array<{
    id: string;
    mentionType: string;
    mentionId: string;
  }>;
  _count: {
    comments: number;
    reactions: number;
    acknowledges: number;
  };
  // إضافة معلومات التفاعل للمستخدم الحالي
  userReaction?: string | null;
  userAcknowledged?: boolean;
}

@Injectable()
export class SocialFeedService {
  private readonly logger = new Logger(SocialFeedService.name);

  constructor(
    private prisma: PrismaService,
    private targetingService: TargetingService,
    private notificationsService: NotificationsService,
  ) {}

  // ==================== جلب الفيد ====================

  /**
   * جلب فيد المنشورات للمستخدم مع تطبيق قواعد الاستهداف
   */
  async getFeed(
    userId: string,
    companyId: string,
    options: FeedOptions = {},
  ): Promise<FeedResult<PostWithRelations>> {
    const { page = 1, limit = 20, filter = 'all', postType } = options;

    // بناء شرط الاستعلام الأساسي باستخدام خدمة الاستهداف
    const baseWhere = await this.targetingService.buildFeedWhereClause(
      userId,
      companyId,
    );

    // إضافة الفلاتر الإضافية
    const where: Prisma.PostWhereInput = {
      ...baseWhere,
    };

    // فلتر حسب نوع المنشور
    if (postType) {
      where.type = postType;
    }

    // فلتر حسب التصنيف المطلوب
    switch (filter) {
      case 'pinned':
        where.isPinned = true;
        break;
      case 'announcements':
        where.type = PostType.ANNOUNCEMENT;
        break;
      case 'unread':
        // المنشورات التي لم يشاهدها المستخدم
        where.views = {
          none: { userId },
        };
        break;
      case 'department':
        where.visibilityType = VisibilityType.DEPARTMENT;
        break;
      case 'team':
        where.visibilityType = VisibilityType.TEAM;
        break;
    }

    // تنفيذ الاستعلام
    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        orderBy: [
          { isPinned: 'desc' },
          { priority: 'desc' },
          { publishedAt: 'desc' },
          { createdAt: 'desc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
              department: {
                select: { id: true, name: true },
              },
            },
          },
          targets: {
            select: {
              id: true,
              targetType: true,
              targetValue: true,
              isExclusion: true,
            },
          },
          reactions: {
            select: {
              id: true,
              userId: true,
              emoji: true,
            },
          },
          attachments: {
            select: {
              id: true,
              fileName: true,
              fileUrl: true,
              fileType: true,
              mimeType: true,
              fileSize: true,
              thumbnailUrl: true,
            },
          },
          mentions: {
            select: {
              id: true,
              mentionType: true,
              mentionId: true,
            },
          },
          _count: {
            select: {
              comments: true,
              reactions: true,
              acknowledges: true,
            },
          },
        },
      }),
      this.prisma.post.count({ where }),
    ]);

    // تصفية المنشورات المستهدفة (TARGETED visibility)
    // للتأكد من أن المستخدم مستهدف فعلاً
    const filteredPosts = await this.filterTargetedPosts(
      userId,
      companyId,
      posts,
    );

    // إضافة معلومات التفاعل للمستخدم الحالي
    const postsWithUserInfo = await this.addUserInteractionInfo(
      userId,
      filteredPosts,
    );

    return {
      items: postsWithUserInfo as PostWithRelations[],
      total,
      page,
      limit,
      hasMore: page * limit < total,
    };
  }

  /**
   * تصفية المنشورات المستهدفة
   */
  private async filterTargetedPosts(
    userId: string,
    companyId: string,
    posts: any[],
  ): Promise<any[]> {
    const visiblePosts: any[] = [];

    for (const post of posts) {
      // إذا لم يكن المنشور مستهدفاً أو ليس له قواعد استهداف، أضفه مباشرة
      if (
        post.visibilityType !== VisibilityType.TARGETED ||
        post.targets.length === 0
      ) {
        visiblePosts.push(post);
        continue;
      }

      // تحقق من الاستهداف
      const result = await this.targetingService.isUserTargeted(
        userId,
        companyId,
        post.id,
      );
      if (result.isTargeted) {
        visiblePosts.push(post);
      }
    }

    return visiblePosts;
  }

  /**
   * إضافة معلومات تفاعل المستخدم الحالي
   */
  private async addUserInteractionInfo(
    userId: string,
    posts: any[],
  ): Promise<any[]> {
    if (posts.length === 0) return posts;

    const postIds = posts.map((p) => p.id);

    // جلب تفاعلات المستخدم
    const [userReactions, userAcknowledges] = await Promise.all([
      this.prisma.postReaction.findMany({
        where: {
          postId: { in: postIds },
          userId,
        },
        select: {
          postId: true,
          emoji: true,
        },
      }),
      this.prisma.postAcknowledge.findMany({
        where: {
          postId: { in: postIds },
          userId,
        },
        select: {
          postId: true,
        },
      }),
    ]);

    // تحويل إلى خرائط للوصول السريع
    const reactionsMap = new Map(
      userReactions.map((r) => [r.postId, r.emoji]),
    );
    const acknowledgesSet = new Set(userAcknowledges.map((a) => a.postId));

    // إضافة المعلومات للمنشورات
    return posts.map((post) => ({
      ...post,
      userReaction: reactionsMap.get(post.id) || null,
      userAcknowledged: acknowledgesSet.has(post.id),
    }));
  }

  // ==================== جلب منشور واحد ====================

  /**
   * جلب منشور واحد مع التحقق من الصلاحية
   */
  async getPost(
    postId: string,
    userId: string,
    companyId: string,
  ): Promise<PostWithRelations> {
    const post = await this.prisma.post.findFirst({
      where: {
        id: postId,
        companyId,
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            department: {
              select: { id: true, name: true },
            },
          },
        },
        targets: {
          select: {
            id: true,
            targetType: true,
            targetValue: true,
            isExclusion: true,
          },
        },
        reactions: {
          select: {
            id: true,
            userId: true,
            emoji: true,
          },
        },
        attachments: {
          select: {
            id: true,
            fileName: true,
            fileUrl: true,
            fileType: true,
            mimeType: true,
            fileSize: true,
            thumbnailUrl: true,
          },
        },
        mentions: {
          select: {
            id: true,
            mentionType: true,
            mentionId: true,
          },
        },
        _count: {
          select: {
            comments: true,
            reactions: true,
            acknowledges: true,
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('المنشور غير موجود');
    }

    // التحقق من صلاحية المشاهدة
    const canView = await this.canUserViewPost(userId, companyId, post);
    if (!canView) {
      throw new ForbiddenException('ليس لديك صلاحية لمشاهدة هذا المنشور');
    }

    // إضافة معلومات التفاعل للمستخدم
    const [postsWithUserInfo] = await this.addUserInteractionInfo(userId, [post]);

    return postsWithUserInfo as PostWithRelations;
  }

  /**
   * التحقق من صلاحية المشاهدة
   */
  private async canUserViewPost(
    userId: string,
    companyId: string,
    post: any,
  ): Promise<boolean> {
    // الكاتب يمكنه دائماً رؤية منشوره
    if (post.authorId === userId) {
      return true;
    }

    // المنشورات غير المنشورة لا يمكن رؤيتها من غير الكاتب
    if (post.status !== PostStatus.PUBLISHED) {
      return false;
    }

    // التحقق من الاستهداف
    const result = await this.targetingService.isUserTargeted(
      userId,
      companyId,
      post.id,
    );

    return result.isTargeted;
  }

  // ==================== إنشاء منشور ====================

  /**
   * إنشاء منشور جديد
   */
  async createPost(
    authorId: string,
    companyId: string,
    dto: CreatePostDto,
  ): Promise<PostWithRelations> {
    // تحديد حالة المنشور
    let status = PostStatus.DRAFT;
    let publishedAt: Date | null = null;

    // إذا كان هناك موعد نشر مجدول
    if (dto.scheduledAt) {
      const scheduledDate = new Date(dto.scheduledAt);
      if (scheduledDate > new Date()) {
        status = PostStatus.PENDING_APPROVAL;
      } else {
        status = PostStatus.PUBLISHED;
        publishedAt = scheduledDate;
      }
    } else {
      // نشر فوري
      status = PostStatus.PUBLISHED;
      publishedAt = new Date();
    }

    // إنشاء المنشور مع العلاقات
    const post = await this.prisma.post.create({
      data: {
        companyId,
        authorId,
        type: dto.type || PostType.POST,
        title: dto.title,
        titleEn: dto.titleEn,
        content: dto.content,
        contentEn: dto.contentEn,
        visibilityType: dto.visibilityType || VisibilityType.PUBLIC,
        isPinned: dto.isPinned || false,
        pinnedUntil: dto.pinnedUntil ? new Date(dto.pinnedUntil) : null,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        publishedAt,
        requireAcknowledge: dto.requireAcknowledge || false,
        hideAfterAcknowledge: dto.hideAfterAcknowledge || false,
        allowComments: dto.allowComments !== false,
        status,
        priority: dto.priority || 0,
        maxImpressions: dto.maxImpressions,
        promotedUntil: dto.promotedUntil ? new Date(dto.promotedUntil) : null,
        // إنشاء قواعد الاستهداف
        targets: dto.targets
          ? {
              create: dto.targets.map((target: PostTargetDto) => ({
                targetType: target.targetType,
                targetValue: target.targetValue,
                isExclusion: target.isExclusion || false,
              })),
            }
          : undefined,
        // إنشاء المرفقات
        attachments: dto.attachments
          ? {
              create: dto.attachments.map((attachment: PostAttachmentDto) => ({
                fileName: attachment.fileName,
                fileUrl: attachment.fileUrl,
                fileType: attachment.fileType,
                mimeType: attachment.mimeType,
                fileSize: attachment.fileSize,
                thumbnailUrl: attachment.thumbnailUrl,
                altText: attachment.altText,
                description: attachment.description,
              })),
            }
          : undefined,
        // إنشاء الإشارات
        mentions: dto.mentions
          ? {
              create: dto.mentions.map((mention: PostMentionDto) => ({
                mentionType: mention.mentionType as MentionType,
                mentionId: mention.mentionId,
                startIndex: mention.startIndex,
                endIndex: mention.endIndex,
              })),
            }
          : undefined,
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            department: {
              select: { id: true, name: true },
            },
          },
        },
        targets: {
          select: {
            id: true,
            targetType: true,
            targetValue: true,
            isExclusion: true,
          },
        },
        reactions: {
          select: {
            id: true,
            userId: true,
            emoji: true,
          },
        },
        attachments: {
          select: {
            id: true,
            fileName: true,
            fileUrl: true,
            fileType: true,
            mimeType: true,
            fileSize: true,
            thumbnailUrl: true,
          },
        },
        mentions: {
          select: {
            id: true,
            mentionType: true,
            mentionId: true,
          },
        },
        _count: {
          select: {
            comments: true,
            reactions: true,
            acknowledges: true,
          },
        },
      },
    });

    this.logger.log(`تم إنشاء منشور جديد: ${post.id} بواسطة ${authorId}`);

    // إرسال الإشعارات للمنشورات المنشورة
    if (post.status === PostStatus.PUBLISHED) {
      await this.sendNewPostNotifications(post, companyId, authorId);
    }

    return post as PostWithRelations;
  }

  /**
   * إرسال إشعارات المنشور الجديد
   */
  private async sendNewPostNotifications(
    post: any,
    companyId: string,
    authorId: string,
  ): Promise<void> {
    try {
      // جلب بيانات الكاتب للإشعار
      const author = await this.prisma.user.findUnique({
        where: { id: authorId },
        select: { firstName: true, lastName: true },
      });

      const authorName = author ? `${author.firstName} ${author.lastName}` : 'مستخدم';
      const postTitle = post.title || post.content.substring(0, 50) + (post.content.length > 50 ? '...' : '');
      const postTypeLabel = this.getPostTypeLabel(post.type);

      // 1. إشعار الأشخاص المذكورين في المنشور
      if (post.mentions && post.mentions.length > 0) {
        await this.sendMentionNotifications(
          companyId,
          authorId,
          authorName,
          post.id,
          post.mentions,
          'POST',
        );
      }

      // 2. إشعار الجمهور المستهدف (للإعلانات والمنشورات الهامة)
      if (post.type === PostType.ANNOUNCEMENT || post.requireAcknowledge) {
        await this.sendPostToTargetedUsersNotification(
          companyId,
          authorId,
          post.id,
          postTypeLabel,
          postTitle,
          authorName,
        );
      }
    } catch (error) {
      // لا نريد أن يفشل إنشاء المنشور بسبب فشل الإشعارات
      this.logger.error(`فشل إرسال إشعارات المنشور: ${post.id}`, error);
    }
  }

  /**
   * إرسال إشعارات للأشخاص المذكورين
   */
  private async sendMentionNotifications(
    companyId: string,
    mentionedByUserId: string,
    mentionedByName: string,
    entityId: string,
    mentions: Array<{ mentionType: string; mentionId: string }>,
    entityType: 'POST' | 'COMMENT',
  ): Promise<void> {
    try {
      // جمع معرفات المستخدمين المذكورين
      const userMentionIds = mentions
        .filter((m) => m.mentionType === MentionType.USER)
        .map((m) => m.mentionId)
        .filter((id) => id !== mentionedByUserId); // استبعاد الشخص الذي قام بالإشارة

      if (userMentionIds.length === 0) return;

      const title = entityType === 'POST'
        ? 'تمت الإشارة إليك في منشور'
        : 'تمت الإشارة إليك في تعليق';

      const body = `قام ${mentionedByName} بالإشارة إليك`;

      await this.notificationsService.createMany(
        companyId,
        userMentionIds,
        NotificationType.GENERAL,
        title,
        body,
        entityType === 'POST' ? 'POST' : 'COMMENT',
        entityId,
        { mentionedBy: mentionedByUserId },
      );

      this.logger.log(`تم إرسال إشعارات الإشارة لـ ${userMentionIds.length} مستخدم`);
    } catch (error) {
      this.logger.error('فشل إرسال إشعارات الإشارة', error);
    }
  }

  /**
   * إرسال إشعارات للجمهور المستهدف
   */
  private async sendPostToTargetedUsersNotification(
    companyId: string,
    authorId: string,
    postId: string,
    postTypeLabel: string,
    postTitle: string,
    authorName: string,
  ): Promise<void> {
    try {
      // جلب بيانات المنشور مع قواعد الاستهداف
      const post = await this.prisma.post.findUnique({
        where: { id: postId },
        include: {
          targets: {
            select: {
              targetType: true,
              targetValue: true,
              isExclusion: true,
            },
          },
        },
      });

      if (!post) return;

      // تحويل قواعد الاستهداف إلى الصيغة المطلوبة
      const targetRules: TargetRule[] = post.targets.map((t) => ({
        targetType: t.targetType,
        targetValue: t.targetValue,
        isExclusion: t.isExclusion,
      }));

      // جلب المستخدمين المستهدفين
      const targetedUsers = await this.targetingService.getTargetedUserIds(
        companyId,
        post.visibilityType,
        targetRules,
        authorId,
      );

      // استبعاد الكاتب من الإشعارات وتحديد حد أقصى
      const maxNotifications = 1000;
      const userIdsToNotify = targetedUsers
        .filter((id) => id !== authorId)
        .slice(0, maxNotifications);

      if (userIdsToNotify.length === 0) return;

      const title = `${postTypeLabel} جديد`;
      const body = `نشر ${authorName}: ${postTitle}`;

      await this.notificationsService.createMany(
        companyId,
        userIdsToNotify,
        NotificationType.GENERAL,
        title,
        body,
        'POST',
        postId,
        { authorId, postType: postTypeLabel },
      );

      this.logger.log(`تم إرسال إشعارات المنشور لـ ${userIdsToNotify.length} مستخدم`);
    } catch (error) {
      this.logger.error('فشل إرسال إشعارات الجمهور المستهدف', error);
    }
  }

  /**
   * الحصول على تسمية نوع المنشور
   */
  private getPostTypeLabel(type: PostType): string {
    const labels: Record<PostType, string> = {
      [PostType.POST]: 'منشور',
      [PostType.ANNOUNCEMENT]: 'إعلان',
      [PostType.POLICY]: 'سياسة',
      [PostType.NEWS]: 'خبر',
      [PostType.EVENT]: 'فعالية',
      [PostType.POLL]: 'استطلاع',
      [PostType.AD]: 'إعلان ترويجي',
    };
    return labels[type] || 'منشور';
  }

  // ==================== تحديث منشور ====================

  /**
   * تحديث منشور موجود
   */
  async updatePost(
    postId: string,
    userId: string,
    companyId: string,
    dto: UpdatePostDto,
  ): Promise<PostWithRelations> {
    // جلب المنشور للتحقق من الصلاحية
    const existingPost = await this.prisma.post.findFirst({
      where: {
        id: postId,
        companyId,
      },
      include: {
        targets: true,
        attachments: true,
        mentions: true,
      },
    });

    if (!existingPost) {
      throw new NotFoundException('المنشور غير موجود');
    }

    // التحقق من صلاحية التعديل
    if (existingPost.authorId !== userId) {
      // هنا يمكن إضافة فحص للأدمن/HR
      throw new ForbiddenException('ليس لديك صلاحية لتعديل هذا المنشور');
    }

    // لا يمكن تعديل المنشورات المحذوفة أو المرفوضة
    if (
      existingPost.status === PostStatus.ARCHIVED ||
      existingPost.status === PostStatus.REJECTED
    ) {
      throw new BadRequestException('لا يمكن تعديل هذا المنشور');
    }

    // تحضير بيانات التحديث
    const updateData: Prisma.PostUpdateInput = {};

    // تحديث الحقول النصية
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.titleEn !== undefined) updateData.titleEn = dto.titleEn;
    if (dto.content !== undefined) updateData.content = dto.content;
    if (dto.contentEn !== undefined) updateData.contentEn = dto.contentEn;
    if (dto.visibilityType !== undefined) updateData.visibilityType = dto.visibilityType;
    if (dto.isPinned !== undefined) updateData.isPinned = dto.isPinned;
    if (dto.pinnedUntil !== undefined) {
      updateData.pinnedUntil = dto.pinnedUntil ? new Date(dto.pinnedUntil) : null;
    }
    if (dto.expiresAt !== undefined) {
      updateData.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    }
    if (dto.requireAcknowledge !== undefined) {
      updateData.requireAcknowledge = dto.requireAcknowledge;
    }
    if (dto.hideAfterAcknowledge !== undefined) {
      updateData.hideAfterAcknowledge = dto.hideAfterAcknowledge;
    }
    if (dto.allowComments !== undefined) updateData.allowComments = dto.allowComments;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.priority !== undefined) updateData.priority = dto.priority;
    if (dto.maxImpressions !== undefined) updateData.maxImpressions = dto.maxImpressions;
    if (dto.promotedUntil !== undefined) {
      updateData.promotedUntil = dto.promotedUntil
        ? new Date(dto.promotedUntil)
        : null;
    }

    // تحديث قواعد الاستهداف إذا تم تقديمها
    if (dto.targets !== undefined) {
      // حذف القواعد القديمة وإنشاء الجديدة
      await this.prisma.postTarget.deleteMany({
        where: { postId },
      });

      if (dto.targets.length > 0) {
        await this.prisma.postTarget.createMany({
          data: dto.targets.map((target: PostTargetDto) => ({
            postId,
            targetType: target.targetType,
            targetValue: target.targetValue,
            isExclusion: target.isExclusion || false,
          })),
        });
      }
    }

    // تحديث المرفقات إذا تم تقديمها
    if (dto.attachments !== undefined) {
      await this.prisma.postAttachment.deleteMany({
        where: { postId },
      });

      if (dto.attachments.length > 0) {
        await this.prisma.postAttachment.createMany({
          data: dto.attachments.map((attachment: PostAttachmentDto) => ({
            postId,
            fileName: attachment.fileName,
            fileUrl: attachment.fileUrl,
            fileType: attachment.fileType,
            mimeType: attachment.mimeType,
            fileSize: attachment.fileSize,
            thumbnailUrl: attachment.thumbnailUrl,
            altText: attachment.altText,
            description: attachment.description,
          })),
        });
      }
    }

    // تحديث الإشارات إذا تم تقديمها
    if (dto.mentions !== undefined) {
      await this.prisma.postMention.deleteMany({
        where: { postId },
      });

      if (dto.mentions.length > 0) {
        await this.prisma.postMention.createMany({
          data: dto.mentions.map((mention: PostMentionDto) => ({
            postId,
            mentionType: mention.mentionType as MentionType,
            mentionId: mention.mentionId,
            startIndex: mention.startIndex,
            endIndex: mention.endIndex,
          })),
        });
      }
    }

    // تحديث المنشور
    const updatedPost = await this.prisma.post.update({
      where: { id: postId },
      data: updateData,
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            department: {
              select: { id: true, name: true },
            },
          },
        },
        targets: {
          select: {
            id: true,
            targetType: true,
            targetValue: true,
            isExclusion: true,
          },
        },
        reactions: {
          select: {
            id: true,
            userId: true,
            emoji: true,
          },
        },
        attachments: {
          select: {
            id: true,
            fileName: true,
            fileUrl: true,
            fileType: true,
            mimeType: true,
            fileSize: true,
            thumbnailUrl: true,
          },
        },
        mentions: {
          select: {
            id: true,
            mentionType: true,
            mentionId: true,
          },
        },
        _count: {
          select: {
            comments: true,
            reactions: true,
            acknowledges: true,
          },
        },
      },
    });

    this.logger.log(`تم تحديث المنشور: ${postId} بواسطة ${userId}`);

    return updatedPost as PostWithRelations;
  }

  // ==================== حذف منشور ====================

  /**
   * حذف منشور (أرشفة)
   */
  async deletePost(
    postId: string,
    userId: string,
    companyId: string,
  ): Promise<{ success: boolean; message: string }> {
    // جلب المنشور للتحقق من الصلاحية
    const existingPost = await this.prisma.post.findFirst({
      where: {
        id: postId,
        companyId,
      },
    });

    if (!existingPost) {
      throw new NotFoundException('المنشور غير موجود');
    }

    // التحقق من صلاحية الحذف
    if (existingPost.authorId !== userId) {
      // هنا يمكن إضافة فحص للأدمن/HR
      throw new ForbiddenException('ليس لديك صلاحية لحذف هذا المنشور');
    }

    // أرشفة المنشور بدلاً من الحذف الفعلي
    await this.prisma.post.update({
      where: { id: postId },
      data: {
        status: PostStatus.ARCHIVED,
      },
    });

    this.logger.log(`تم أرشفة المنشور: ${postId} بواسطة ${userId}`);

    return {
      success: true,
      message: 'تم حذف المنشور بنجاح',
    };
  }

  /**
   * حذف منشور نهائياً (للأدمن فقط)
   */
  async hardDeletePost(
    postId: string,
    companyId: string,
  ): Promise<{ success: boolean; message: string }> {
    // جلب المنشور للتحقق
    const existingPost = await this.prisma.post.findFirst({
      where: {
        id: postId,
        companyId,
      },
    });

    if (!existingPost) {
      throw new NotFoundException('المنشور غير موجود');
    }

    // حذف المنشور والعلاقات المرتبطة (Cascade)
    await this.prisma.post.delete({
      where: { id: postId },
    });

    this.logger.log(`تم حذف المنشور نهائياً: ${postId}`);

    return {
      success: true,
      message: 'تم حذف المنشور نهائياً',
    };
  }

  // ==================== البحث ====================

  /**
   * البحث في المنشورات
   */
  async searchPosts(
    userId: string,
    companyId: string,
    query: string,
    options: FeedOptions = {},
  ): Promise<FeedResult<PostWithRelations>> {
    const { page = 1, limit = 20 } = options;

    // بناء شرط الاستعلام الأساسي
    const baseWhere = await this.targetingService.buildFeedWhereClause(
      userId,
      companyId,
    );

    // إضافة شرط البحث
    const where: Prisma.PostWhereInput = {
      ...baseWhere,
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { titleEn: { contains: query, mode: 'insensitive' } },
        { content: { contains: query, mode: 'insensitive' } },
        { contentEn: { contains: query, mode: 'insensitive' } },
      ],
    };

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
              department: {
                select: { id: true, name: true },
              },
            },
          },
          targets: {
            select: {
              id: true,
              targetType: true,
              targetValue: true,
              isExclusion: true,
            },
          },
          reactions: {
            select: {
              id: true,
              userId: true,
              emoji: true,
            },
          },
          attachments: {
            select: {
              id: true,
              fileName: true,
              fileUrl: true,
              fileType: true,
              mimeType: true,
              fileSize: true,
              thumbnailUrl: true,
            },
          },
          mentions: {
            select: {
              id: true,
              mentionType: true,
              mentionId: true,
            },
          },
          _count: {
            select: {
              comments: true,
              reactions: true,
              acknowledges: true,
            },
          },
        },
      }),
      this.prisma.post.count({ where }),
    ]);

    // تصفية المنشورات المستهدفة
    const filteredPosts = await this.filterTargetedPosts(userId, companyId, posts);

    // إضافة معلومات التفاعل
    const postsWithUserInfo = await this.addUserInteractionInfo(userId, filteredPosts);

    return {
      items: postsWithUserInfo as PostWithRelations[],
      total,
      page,
      limit,
      hasMore: page * limit < total,
    };
  }

  // ==================== إدارة الحالة ====================

  /**
   * نشر منشور مسودة
   */
  async publishPost(
    postId: string,
    userId: string,
    companyId: string,
  ): Promise<PostWithRelations> {
    const post = await this.prisma.post.findFirst({
      where: {
        id: postId,
        companyId,
        authorId: userId,
      },
    });

    if (!post) {
      throw new NotFoundException('المنشور غير موجود');
    }

    if (post.status === PostStatus.PUBLISHED) {
      throw new BadRequestException('المنشور منشور بالفعل');
    }

    const updatedPost = await this.prisma.post.update({
      where: { id: postId },
      data: {
        status: PostStatus.PUBLISHED,
        publishedAt: new Date(),
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            department: {
              select: { id: true, name: true },
            },
          },
        },
        targets: {
          select: {
            id: true,
            targetType: true,
            targetValue: true,
            isExclusion: true,
          },
        },
        reactions: {
          select: {
            id: true,
            userId: true,
            emoji: true,
          },
        },
        attachments: {
          select: {
            id: true,
            fileName: true,
            fileUrl: true,
            fileType: true,
            mimeType: true,
            fileSize: true,
            thumbnailUrl: true,
          },
        },
        mentions: {
          select: {
            id: true,
            mentionType: true,
            mentionId: true,
          },
        },
        _count: {
          select: {
            comments: true,
            reactions: true,
            acknowledges: true,
          },
        },
      },
    });

    this.logger.log(`تم نشر المنشور: ${postId}`);

    return updatedPost as PostWithRelations;
  }

  /**
   * تثبيت/إلغاء تثبيت منشور
   */
  async togglePinPost(
    postId: string,
    companyId: string,
    pinnedUntil?: Date,
  ): Promise<PostWithRelations> {
    const post = await this.prisma.post.findFirst({
      where: {
        id: postId,
        companyId,
      },
    });

    if (!post) {
      throw new NotFoundException('المنشور غير موجود');
    }

    const updatedPost = await this.prisma.post.update({
      where: { id: postId },
      data: {
        isPinned: !post.isPinned,
        pinnedUntil: !post.isPinned ? pinnedUntil : null,
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            department: {
              select: { id: true, name: true },
            },
          },
        },
        targets: {
          select: {
            id: true,
            targetType: true,
            targetValue: true,
            isExclusion: true,
          },
        },
        reactions: {
          select: {
            id: true,
            userId: true,
            emoji: true,
          },
        },
        attachments: {
          select: {
            id: true,
            fileName: true,
            fileUrl: true,
            fileType: true,
            mimeType: true,
            fileSize: true,
            thumbnailUrl: true,
          },
        },
        mentions: {
          select: {
            id: true,
            mentionType: true,
            mentionId: true,
          },
        },
        _count: {
          select: {
            comments: true,
            reactions: true,
            acknowledges: true,
          },
        },
      },
    });

    this.logger.log(
      `تم ${updatedPost.isPinned ? 'تثبيت' : 'إلغاء تثبيت'} المنشور: ${postId}`,
    );

    return updatedPost as PostWithRelations;
  }

  /**
   * الموافقة على منشور معلق
   */
  async approvePost(
    postId: string,
    approverId: string,
    companyId: string,
  ): Promise<PostWithRelations> {
    const post = await this.prisma.post.findFirst({
      where: {
        id: postId,
        companyId,
        status: PostStatus.PENDING_APPROVAL,
      },
    });

    if (!post) {
      throw new NotFoundException('المنشور غير موجود أو ليس في انتظار الموافقة');
    }

    const updatedPost = await this.prisma.post.update({
      where: { id: postId },
      data: {
        status: PostStatus.PUBLISHED,
        publishedAt: new Date(),
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            department: {
              select: { id: true, name: true },
            },
          },
        },
        targets: {
          select: {
            id: true,
            targetType: true,
            targetValue: true,
            isExclusion: true,
          },
        },
        reactions: {
          select: {
            id: true,
            userId: true,
            emoji: true,
          },
        },
        attachments: {
          select: {
            id: true,
            fileName: true,
            fileUrl: true,
            fileType: true,
            mimeType: true,
            fileSize: true,
            thumbnailUrl: true,
          },
        },
        mentions: {
          select: {
            id: true,
            mentionType: true,
            mentionId: true,
          },
        },
        _count: {
          select: {
            comments: true,
            reactions: true,
            acknowledges: true,
          },
        },
      },
    });

    this.logger.log(`تم الموافقة على المنشور: ${postId} بواسطة ${approverId}`);

    return updatedPost as PostWithRelations;
  }

  /**
   * رفض منشور معلق
   */
  async rejectPost(
    postId: string,
    rejecterId: string,
    companyId: string,
    reason?: string,
  ): Promise<PostWithRelations> {
    const post = await this.prisma.post.findFirst({
      where: {
        id: postId,
        companyId,
        status: PostStatus.PENDING_APPROVAL,
      },
    });

    if (!post) {
      throw new NotFoundException('المنشور غير موجود أو ليس في انتظار الموافقة');
    }

    const updatedPost = await this.prisma.post.update({
      where: { id: postId },
      data: {
        status: PostStatus.REJECTED,
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            department: {
              select: { id: true, name: true },
            },
          },
        },
        targets: {
          select: {
            id: true,
            targetType: true,
            targetValue: true,
            isExclusion: true,
          },
        },
        reactions: {
          select: {
            id: true,
            userId: true,
            emoji: true,
          },
        },
        attachments: {
          select: {
            id: true,
            fileName: true,
            fileUrl: true,
            fileType: true,
            mimeType: true,
            fileSize: true,
            thumbnailUrl: true,
          },
        },
        mentions: {
          select: {
            id: true,
            mentionType: true,
            mentionId: true,
          },
        },
        _count: {
          select: {
            comments: true,
            reactions: true,
            acknowledges: true,
          },
        },
      },
    });

    this.logger.log(
      `تم رفض المنشور: ${postId} بواسطة ${rejecterId}${reason ? ` - السبب: ${reason}` : ''}`,
    );

    return updatedPost as PostWithRelations;
  }

  /**
   * تثبيت منشور
   */
  async pinPost(
    postId: string,
    companyId: string,
    pinnedUntil?: Date,
  ): Promise<PostWithRelations> {
    const post = await this.prisma.post.findFirst({
      where: {
        id: postId,
        companyId,
      },
    });

    if (!post) {
      throw new NotFoundException('المنشور غير موجود');
    }

    const updatedPost = await this.prisma.post.update({
      where: { id: postId },
      data: {
        isPinned: true,
        pinnedUntil: pinnedUntil || null,
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            department: {
              select: { id: true, name: true },
            },
          },
        },
        targets: {
          select: {
            id: true,
            targetType: true,
            targetValue: true,
            isExclusion: true,
          },
        },
        reactions: {
          select: {
            id: true,
            userId: true,
            emoji: true,
          },
        },
        attachments: {
          select: {
            id: true,
            fileName: true,
            fileUrl: true,
            fileType: true,
            mimeType: true,
            fileSize: true,
            thumbnailUrl: true,
          },
        },
        mentions: {
          select: {
            id: true,
            mentionType: true,
            mentionId: true,
          },
        },
        _count: {
          select: {
            comments: true,
            reactions: true,
            acknowledges: true,
          },
        },
      },
    });

    this.logger.log(`تم تثبيت المنشور: ${postId}`);

    return updatedPost as PostWithRelations;
  }

  /**
   * إلغاء تثبيت منشور
   */
  async unpinPost(
    postId: string,
    companyId: string,
  ): Promise<PostWithRelations> {
    const post = await this.prisma.post.findFirst({
      where: {
        id: postId,
        companyId,
      },
    });

    if (!post) {
      throw new NotFoundException('المنشور غير موجود');
    }

    const updatedPost = await this.prisma.post.update({
      where: { id: postId },
      data: {
        isPinned: false,
        pinnedUntil: null,
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            department: {
              select: { id: true, name: true },
            },
          },
        },
        targets: {
          select: {
            id: true,
            targetType: true,
            targetValue: true,
            isExclusion: true,
          },
        },
        reactions: {
          select: {
            id: true,
            userId: true,
            emoji: true,
          },
        },
        attachments: {
          select: {
            id: true,
            fileName: true,
            fileUrl: true,
            fileType: true,
            mimeType: true,
            fileSize: true,
            thumbnailUrl: true,
          },
        },
        mentions: {
          select: {
            id: true,
            mentionType: true,
            mentionId: true,
          },
        },
        _count: {
          select: {
            comments: true,
            reactions: true,
            acknowledges: true,
          },
        },
      },
    });

    this.logger.log(`تم إلغاء تثبيت المنشور: ${postId}`);

    return updatedPost as PostWithRelations;
  }

  // ==================== معاينة الجمهور ====================

  /**
   * معاينة الجمهور المستهدف قبل النشر
   */
  async previewAudience(
    authorId: string,
    companyId: string,
    visibilityType: VisibilityType,
    targets: TargetRule[],
    limit: number = 10,
  ) {
    return this.targetingService.previewTargetAudience(
      companyId,
      visibilityType,
      targets,
      authorId,
      limit,
    );
  }

  // ==================== المنشورات المؤرشفة ====================

  /**
   * جلب المنشورات المؤرشفة للمستخدم
   */
  async getArchivedPosts(
    userId: string,
    companyId: string,
    options: { page?: number; limit?: number } = {},
  ): Promise<FeedResult<PostWithRelations>> {
    const { page = 1, limit = 20 } = options;

    const where: Prisma.PostWhereInput = {
      companyId,
      authorId: userId,
      status: PostStatus.ARCHIVED,
    };

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
              department: {
                select: { id: true, name: true },
              },
            },
          },
          targets: {
            select: {
              id: true,
              targetType: true,
              targetValue: true,
              isExclusion: true,
            },
          },
          reactions: {
            select: {
              id: true,
              userId: true,
              emoji: true,
            },
          },
          attachments: {
            select: {
              id: true,
              fileName: true,
              fileUrl: true,
              fileType: true,
              mimeType: true,
              fileSize: true,
              thumbnailUrl: true,
            },
          },
          mentions: {
            select: {
              id: true,
              mentionType: true,
              mentionId: true,
            },
          },
          _count: {
            select: {
              comments: true,
              reactions: true,
              acknowledges: true,
            },
          },
        },
      }),
      this.prisma.post.count({ where }),
    ]);

    return {
      items: posts as PostWithRelations[],
      total,
      page,
      limit,
      hasMore: page * limit < total,
    };
  }

  /**
   * استعادة منشور مؤرشف
   */
  async restorePost(
    postId: string,
    userId: string,
    companyId: string,
  ): Promise<PostWithRelations> {
    const post = await this.prisma.post.findFirst({
      where: {
        id: postId,
        companyId,
        authorId: userId,
        status: PostStatus.ARCHIVED,
      },
    });

    if (!post) {
      throw new NotFoundException('المنشور المؤرشف غير موجود');
    }

    const updatedPost = await this.prisma.post.update({
      where: { id: postId },
      data: {
        status: PostStatus.DRAFT,
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            department: {
              select: { id: true, name: true },
            },
          },
        },
        targets: {
          select: {
            id: true,
            targetType: true,
            targetValue: true,
            isExclusion: true,
          },
        },
        reactions: {
          select: {
            id: true,
            userId: true,
            emoji: true,
          },
        },
        attachments: {
          select: {
            id: true,
            fileName: true,
            fileUrl: true,
            fileType: true,
            mimeType: true,
            fileSize: true,
            thumbnailUrl: true,
          },
        },
        mentions: {
          select: {
            id: true,
            mentionType: true,
            mentionId: true,
          },
        },
        _count: {
          select: {
            comments: true,
            reactions: true,
            acknowledges: true,
          },
        },
      },
    });

    this.logger.log(`تم استعادة المنشور: ${postId}`);

    return updatedPost as PostWithRelations;
  }

  // ==================== التفاعلات (Reactions) ====================

  /**
   * إضافة تفاعل على منشور
   */
  async addReaction(
    postId: string,
    userId: string,
    companyId: string,
    emoji: string,
  ): Promise<{ success: boolean; reaction: { id: string; emoji: string } }> {
    // التحقق من وجود المنشور وصلاحية المشاهدة
    const post = await this.prisma.post.findFirst({
      where: {
        id: postId,
        companyId,
        status: PostStatus.PUBLISHED,
      },
    });

    if (!post) {
      throw new NotFoundException('المنشور غير موجود');
    }

    // التحقق من صلاحية المشاهدة
    const canView = await this.canUserViewPost(userId, companyId, post);
    if (!canView) {
      throw new ForbiddenException('ليس لديك صلاحية للتفاعل مع هذا المنشور');
    }

    // التحقق من صحة الإيموجي
    const validEmojis = ['like', 'love', 'celebrate', 'support', 'insightful', 'funny'];
    if (!validEmojis.includes(emoji)) {
      throw new BadRequestException('نوع التفاعل غير صالح');
    }

    // إضافة أو تحديث التفاعل (upsert)
    const reaction = await this.prisma.postReaction.upsert({
      where: {
        postId_userId_emoji: {
          postId,
          userId,
          emoji,
        },
      },
      update: {}, // لا تغيير إذا موجود
      create: {
        postId,
        userId,
        emoji,
      },
    });

    this.logger.log(`تم إضافة تفاعل ${emoji} على المنشور: ${postId} بواسطة ${userId}`);

    return {
      success: true,
      reaction: {
        id: reaction.id,
        emoji: reaction.emoji,
      },
    };
  }

  /**
   * إزالة تفاعل من منشور
   */
  async removeReaction(
    postId: string,
    userId: string,
    companyId: string,
    emoji: string,
  ): Promise<{ success: boolean; message: string }> {
    // التحقق من وجود المنشور
    const post = await this.prisma.post.findFirst({
      where: {
        id: postId,
        companyId,
      },
    });

    if (!post) {
      throw new NotFoundException('المنشور غير موجود');
    }

    // حذف التفاعل
    const result = await this.prisma.postReaction.deleteMany({
      where: {
        postId,
        userId,
        emoji,
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('التفاعل غير موجود');
    }

    this.logger.log(`تم إزالة تفاعل ${emoji} من المنشور: ${postId} بواسطة ${userId}`);

    return {
      success: true,
      message: 'تم إزالة التفاعل بنجاح',
    };
  }

  /**
   * جلب التفاعلات على منشور مع التجميع
   */
  async getReactions(
    postId: string,
    companyId: string,
  ): Promise<{
    reactions: Array<{ emoji: string; count: number; users: Array<{ id: string; firstName: string; lastName: string; avatar: string | null }> }>;
    total: number;
  }> {
    // التحقق من وجود المنشور
    const post = await this.prisma.post.findFirst({
      where: {
        id: postId,
        companyId,
      },
    });

    if (!post) {
      throw new NotFoundException('المنشور غير موجود');
    }

    // جلب جميع التفاعلات مع بيانات المستخدمين
    const reactions = await this.prisma.postReaction.findMany({
      where: { postId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // تجميع التفاعلات حسب النوع
    const groupedReactions = new Map<string, { emoji: string; count: number; users: Array<{ id: string; firstName: string; lastName: string; avatar: string | null }> }>();

    for (const reaction of reactions) {
      const existing = groupedReactions.get(reaction.emoji);
      if (existing) {
        existing.count++;
        existing.users.push(reaction.user);
      } else {
        groupedReactions.set(reaction.emoji, {
          emoji: reaction.emoji,
          count: 1,
          users: [reaction.user],
        });
      }
    }

    return {
      reactions: Array.from(groupedReactions.values()),
      total: reactions.length,
    };
  }

  // ==================== التعليقات (Comments) ====================

  /**
   * إضافة تعليق على منشور
   */
  async addComment(
    postId: string,
    authorId: string,
    companyId: string,
    content: string,
    parentId?: string,
    mentions?: string[],
  ): Promise<{
    id: string;
    content: string;
    mentions: string[];
    parentId: string | null;
    createdAt: Date;
    author: { id: string; firstName: string; lastName: string; avatar: string | null };
  }> {
    // التحقق من وجود المنشور وصلاحية التعليق
    const post = await this.prisma.post.findFirst({
      where: {
        id: postId,
        companyId,
        status: PostStatus.PUBLISHED,
      },
    });

    if (!post) {
      throw new NotFoundException('المنشور غير موجود');
    }

    // التحقق من أن التعليقات مسموحة
    if (!post.allowComments) {
      throw new ForbiddenException('التعليقات غير مسموحة على هذا المنشور');
    }

    // التحقق من صلاحية المشاهدة
    const canView = await this.canUserViewPost(authorId, companyId, post);
    if (!canView) {
      throw new ForbiddenException('ليس لديك صلاحية للتعليق على هذا المنشور');
    }

    // التحقق من صحة المحتوى
    if (!content || content.trim().length === 0) {
      throw new BadRequestException('محتوى التعليق مطلوب');
    }

    // التحقق من وجود التعليق الأب إذا تم تحديده
    if (parentId) {
      const parentComment = await this.prisma.postComment.findFirst({
        where: {
          id: parentId,
          postId,
        },
      });

      if (!parentComment) {
        throw new NotFoundException('التعليق الأب غير موجود');
      }
    }

    // إنشاء التعليق
    const comment = await this.prisma.postComment.create({
      data: {
        postId,
        authorId,
        content: content.trim(),
        mentions: mentions || [],
        parentId: parentId || null,
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    this.logger.log(`تم إضافة تعليق على المنشور: ${postId} بواسطة ${authorId}`);

    // إرسال الإشعارات
    await this.sendCommentNotifications(
      companyId,
      post,
      comment,
      authorId,
      mentions,
      parentId,
    );

    return {
      id: comment.id,
      content: comment.content,
      mentions: comment.mentions,
      parentId: comment.parentId,
      createdAt: comment.createdAt,
      author: comment.author,
    };
  }

  /**
   * إرسال إشعارات التعليق الجديد
   */
  private async sendCommentNotifications(
    companyId: string,
    post: any,
    comment: any,
    authorId: string,
    mentions?: string[],
    parentId?: string,
  ): Promise<void> {
    try {
      const commenterName = `${comment.author.firstName} ${comment.author.lastName}`;

      // 1. إشعار صاحب المنشور (إذا لم يكن هو المعلق)
      if (post.authorId !== authorId) {
        await this.notificationsService.create({
          companyId,
          userId: post.authorId,
          type: NotificationType.GENERAL,
          title: 'تعليق جديد على منشورك',
          body: `علق ${commenterName} على منشورك`,
          entityType: 'COMMENT',
          entityId: comment.id,
          data: { postId: post.id, commenterId: authorId },
        });
      }

      // 2. إشعار صاحب التعليق الأصلي (في حالة الرد)
      if (parentId) {
        const parentComment = await this.prisma.postComment.findUnique({
          where: { id: parentId },
          select: { authorId: true },
        });

        if (parentComment && parentComment.authorId !== authorId && parentComment.authorId !== post.authorId) {
          await this.notificationsService.create({
            companyId,
            userId: parentComment.authorId,
            type: NotificationType.GENERAL,
            title: 'رد جديد على تعليقك',
            body: `رد ${commenterName} على تعليقك`,
            entityType: 'COMMENT',
            entityId: comment.id,
            data: { postId: post.id, parentCommentId: parentId, replierId: authorId },
          });
        }
      }

      // 3. إشعار الأشخاص المذكورين في التعليق
      if (mentions && mentions.length > 0) {
        const mentionObjects = mentions.map((mentionId) => ({
          mentionType: MentionType.USER,
          mentionId,
        }));

        await this.sendMentionNotifications(
          companyId,
          authorId,
          commenterName,
          comment.id,
          mentionObjects,
          'COMMENT',
        );
      }
    } catch (error) {
      // لا نريد أن يفشل إضافة التعليق بسبب فشل الإشعارات
      this.logger.error(`فشل إرسال إشعارات التعليق: ${comment.id}`, error);
    }
  }

  /**
   * جلب تعليقات منشور
   */
  async getComments(
    postId: string,
    userId: string,
    companyId: string,
    options: { page?: number; limit?: number; parentId?: string | null } = {},
  ): Promise<FeedResult<{
    id: string;
    content: string;
    mentions: string[];
    isEdited: boolean;
    parentId: string | null;
    createdAt: Date;
    updatedAt: Date;
    author: { id: string; firstName: string; lastName: string; avatar: string | null };
    _count: { replies: number };
  }>> {
    const { page = 1, limit = 20, parentId = null } = options;

    // التحقق من وجود المنشور
    const post = await this.prisma.post.findFirst({
      where: {
        id: postId,
        companyId,
      },
    });

    if (!post) {
      throw new NotFoundException('المنشور غير موجود');
    }

    // التحقق من صلاحية المشاهدة
    const canView = await this.canUserViewPost(userId, companyId, post);
    if (!canView) {
      throw new ForbiddenException('ليس لديك صلاحية لمشاهدة التعليقات');
    }

    // بناء شرط الاستعلام
    const where: Prisma.PostCommentWhereInput = {
      postId,
      parentId: parentId === null ? null : parentId,
    };

    // جلب التعليقات مع العدد
    const [comments, total] = await Promise.all([
      this.prisma.postComment.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
          _count: {
            select: {
              replies: true,
            },
          },
        },
      }),
      this.prisma.postComment.count({ where }),
    ]);

    return {
      items: comments.map((comment) => ({
        id: comment.id,
        content: comment.content,
        mentions: comment.mentions,
        isEdited: comment.isEdited,
        parentId: comment.parentId,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        author: comment.author,
        _count: comment._count,
      })),
      total,
      page,
      limit,
      hasMore: page * limit < total,
    };
  }

  /**
   * تعديل تعليق
   */
  async updateComment(
    commentId: string,
    authorId: string,
    companyId: string,
    content: string,
    mentions?: string[],
  ): Promise<{
    id: string;
    content: string;
    mentions: string[];
    isEdited: boolean;
    editedAt: Date | null;
    author: { id: string; firstName: string; lastName: string; avatar: string | null };
  }> {
    // جلب التعليق للتحقق من الصلاحية
    const comment = await this.prisma.postComment.findFirst({
      where: { id: commentId },
      include: {
        post: {
          select: { companyId: true },
        },
      },
    });

    if (!comment) {
      throw new NotFoundException('التعليق غير موجود');
    }

    // التحقق من الشركة
    if (comment.post.companyId !== companyId) {
      throw new ForbiddenException('ليس لديك صلاحية لتعديل هذا التعليق');
    }

    // التحقق من الكاتب
    if (comment.authorId !== authorId) {
      throw new ForbiddenException('يمكنك تعديل تعليقاتك فقط');
    }

    // التحقق من صحة المحتوى
    if (!content || content.trim().length === 0) {
      throw new BadRequestException('محتوى التعليق مطلوب');
    }

    // تحديث التعليق
    const updatedComment = await this.prisma.postComment.update({
      where: { id: commentId },
      data: {
        content: content.trim(),
        mentions: mentions || comment.mentions,
        isEdited: true,
        editedAt: new Date(),
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    this.logger.log(`تم تعديل التعليق: ${commentId} بواسطة ${authorId}`);

    return {
      id: updatedComment.id,
      content: updatedComment.content,
      mentions: updatedComment.mentions,
      isEdited: updatedComment.isEdited,
      editedAt: updatedComment.editedAt,
      author: updatedComment.author,
    };
  }

  /**
   * حذف تعليق
   */
  async deleteComment(
    commentId: string,
    userId: string,
    companyId: string,
  ): Promise<{ success: boolean; message: string }> {
    // جلب التعليق للتحقق من الصلاحية
    const comment = await this.prisma.postComment.findFirst({
      where: { id: commentId },
      include: {
        post: {
          select: { companyId: true, authorId: true },
        },
      },
    });

    if (!comment) {
      throw new NotFoundException('التعليق غير موجود');
    }

    // التحقق من الشركة
    if (comment.post.companyId !== companyId) {
      throw new ForbiddenException('ليس لديك صلاحية لحذف هذا التعليق');
    }

    // التحقق من الصلاحية (الكاتب أو صاحب المنشور)
    if (comment.authorId !== userId && comment.post.authorId !== userId) {
      throw new ForbiddenException('ليس لديك صلاحية لحذف هذا التعليق');
    }

    // حذف التعليق (سيحذف الردود تلقائياً بسبب Cascade)
    await this.prisma.postComment.delete({
      where: { id: commentId },
    });

    this.logger.log(`تم حذف التعليق: ${commentId} بواسطة ${userId}`);

    return {
      success: true,
      message: 'تم حذف التعليق بنجاح',
    };
  }

  // ==================== تأكيد القراءة (Acknowledgements) ====================

  /**
   * تأكيد قراءة منشور رسمي
   */
  async acknowledgePost(
    postId: string,
    userId: string,
    companyId: string,
    options?: {
      note?: string;
      deviceType?: string;
      ipAddress?: string;
    },
  ): Promise<{
    success: boolean;
    acknowledge: {
      id: string;
      acknowledgedAt: Date;
      note: string | null;
    };
  }> {
    // التحقق من وجود المنشور
    const post = await this.prisma.post.findFirst({
      where: {
        id: postId,
        companyId,
        status: PostStatus.PUBLISHED,
      },
    });

    if (!post) {
      throw new NotFoundException('المنشور غير موجود');
    }

    // التحقق من أن المنشور يتطلب تأكيد
    if (!post.requireAcknowledge) {
      throw new BadRequestException('هذا المنشور لا يتطلب تأكيد قراءة');
    }

    // التحقق من صلاحية المشاهدة
    const canView = await this.canUserViewPost(userId, companyId, post);
    if (!canView) {
      throw new ForbiddenException('ليس لديك صلاحية لتأكيد قراءة هذا المنشور');
    }

    // التحقق من عدم وجود تأكيد سابق
    const existingAcknowledge = await this.prisma.postAcknowledge.findUnique({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
    });

    if (existingAcknowledge) {
      throw new BadRequestException('تم تأكيد قراءة هذا المنشور مسبقاً');
    }

    // إنشاء تأكيد القراءة
    const acknowledge = await this.prisma.postAcknowledge.create({
      data: {
        postId,
        userId,
        note: options?.note,
        deviceType: options?.deviceType,
        ipAddress: options?.ipAddress,
      },
    });

    this.logger.log(`تم تأكيد قراءة المنشور: ${postId} بواسطة ${userId}`);

    return {
      success: true,
      acknowledge: {
        id: acknowledge.id,
        acknowledgedAt: acknowledge.acknowledgedAt,
        note: acknowledge.note,
      },
    };
  }

  /**
   * جلب تأكيدات القراءة لمنشور معين
   */
  async getAcknowledgements(
    postId: string,
    companyId: string,
    options?: {
      page?: number;
      limit?: number;
    },
  ): Promise<FeedResult<{
    id: string;
    acknowledgedAt: Date;
    note: string | null;
    deviceType: string | null;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      avatar: string | null;
      department?: { id: string; name: string } | null;
    };
  }>> {
    const { page = 1, limit = 20 } = options || {};

    // التحقق من وجود المنشور
    const post = await this.prisma.post.findFirst({
      where: {
        id: postId,
        companyId,
      },
    });

    if (!post) {
      throw new NotFoundException('المنشور غير موجود');
    }

    // جلب تأكيدات القراءة مع بيانات المستخدمين
    const [acknowledges, total] = await Promise.all([
      this.prisma.postAcknowledge.findMany({
        where: { postId },
        orderBy: { acknowledgedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
              department: {
                select: { id: true, name: true },
              },
            },
          },
        },
      }),
      this.prisma.postAcknowledge.count({ where: { postId } }),
    ]);

    return {
      items: acknowledges.map((ack) => ({
        id: ack.id,
        acknowledgedAt: ack.acknowledgedAt,
        note: ack.note,
        deviceType: ack.deviceType,
        user: ack.user,
      })),
      total,
      page,
      limit,
      hasMore: page * limit < total,
    };
  }

  /**
   * التحقق من حالة تأكيد القراءة للمستخدم
   */
  async hasUserAcknowledged(
    postId: string,
    userId: string,
  ): Promise<boolean> {
    const acknowledge = await this.prisma.postAcknowledge.findUnique({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
    });

    return !!acknowledge;
  }

  // ==================== التحليلات والتتبع (Analytics & Tracking) ====================

  /**
   * تسجيل مشاهدة منشور (View)
   * يُسجل مرة واحدة فقط لكل مستخدم
   */
  async trackView(
    postId: string,
    userId: string,
    companyId: string,
    options?: {
      duration?: number;
      deviceType?: string;
      ipAddress?: string;
    },
  ): Promise<{
    success: boolean;
    isNewView: boolean;
    viewId?: string;
  }> {
    // التحقق من وجود المنشور
    const post = await this.prisma.post.findFirst({
      where: {
        id: postId,
        companyId,
        status: PostStatus.PUBLISHED,
      },
    });

    if (!post) {
      throw new NotFoundException('المنشور غير موجود');
    }

    // التحقق من صلاحية المشاهدة
    const canView = await this.canUserViewPost(userId, companyId, post);
    if (!canView) {
      throw new ForbiddenException('ليس لديك صلاحية لمشاهدة هذا المنشور');
    }

    // محاولة إنشاء سجل مشاهدة جديد أو تحديث الموجود
    try {
      const view = await this.prisma.postView.upsert({
        where: {
          postId_userId: {
            postId,
            userId,
          },
        },
        update: {
          // تحديث مدة المشاهدة إذا تم تقديمها
          duration: options?.duration,
        },
        create: {
          postId,
          userId,
          duration: options?.duration,
          deviceType: options?.deviceType,
          ipAddress: options?.ipAddress,
        },
      });

      // التحقق من أن هذه مشاهدة جديدة (تم إنشاؤها الآن)
      const isNewView = view.viewedAt.getTime() >= Date.now() - 1000;

      // تحديث عداد الوصول إذا كانت مشاهدة جديدة
      if (isNewView) {
        await this.prisma.post.update({
          where: { id: postId },
          data: {
            reachCount: { increment: 1 },
          },
        });
      }

      return {
        success: true,
        isNewView,
        viewId: view.id,
      };
    } catch (error) {
      // في حالة التكرار (race condition)، المشاهدة موجودة مسبقاً
      return {
        success: true,
        isNewView: false,
      };
    }
  }

  /**
   * تسجيل ظهور منشور في الفيد (Impression)
   * يمكن تسجيل عدة ظهورات لنفس المستخدم
   */
  async trackImpression(
    postId: string,
    userId: string | null,
    companyId: string,
    options?: {
      source?: string;
      position?: number;
      deviceType?: string;
      sessionId?: string;
    },
  ): Promise<{
    success: boolean;
    impressionId: string;
  }> {
    // التحقق من وجود المنشور
    const post = await this.prisma.post.findFirst({
      where: {
        id: postId,
        companyId,
        status: PostStatus.PUBLISHED,
      },
    });

    if (!post) {
      throw new NotFoundException('المنشور غير موجود');
    }

    // إنشاء سجل الظهور
    const impression = await this.prisma.postImpression.create({
      data: {
        postId,
        userId,
        source: options?.source || 'FEED',
        position: options?.position,
        deviceType: options?.deviceType,
        sessionId: options?.sessionId,
      },
    });

    // تحديث عداد الظهورات
    await this.prisma.post.update({
      where: { id: postId },
      data: {
        impressionCount: { increment: 1 },
      },
    });

    return {
      success: true,
      impressionId: impression.id,
    };
  }

  /**
   * تسجيل نقرة على منشور (Click)
   */
  async trackClick(
    postId: string,
    companyId: string,
  ): Promise<{
    success: boolean;
    clickCount: number;
  }> {
    // التحقق من وجود المنشور
    const post = await this.prisma.post.findFirst({
      where: {
        id: postId,
        companyId,
        status: PostStatus.PUBLISHED,
      },
    });

    if (!post) {
      throw new NotFoundException('المنشور غير موجود');
    }

    // تحديث عداد النقرات
    const updatedPost = await this.prisma.post.update({
      where: { id: postId },
      data: {
        clickCount: { increment: 1 },
      },
      select: {
        clickCount: true,
      },
    });

    return {
      success: true,
      clickCount: updatedPost.clickCount,
    };
  }

  /**
   * جلب إحصائيات منشور
   */
  async getPostAnalytics(
    postId: string,
    companyId: string,
  ): Promise<{
    reachCount: number;
    impressionCount: number;
    clickCount: number;
    reactionsCount: number;
    commentsCount: number;
    acknowledgementsCount: number;
    acknowledgementsRequired: boolean;
    uniqueViewers: number;
    reactionsByType: Array<{ emoji: string; count: number }>;
  }> {
    // التحقق من وجود المنشور
    const post = await this.prisma.post.findFirst({
      where: {
        id: postId,
        companyId,
      },
      include: {
        _count: {
          select: {
            reactions: true,
            comments: true,
            acknowledges: true,
            views: true,
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('المنشور غير موجود');
    }

    // جلب التفاعلات مجمعة حسب النوع
    const reactionsByType = await this.prisma.postReaction.groupBy({
      by: ['emoji'],
      where: { postId },
      _count: {
        emoji: true,
      },
    });

    return {
      reachCount: post.reachCount,
      impressionCount: post.impressionCount,
      clickCount: post.clickCount,
      reactionsCount: post._count.reactions,
      commentsCount: post._count.comments,
      acknowledgementsCount: post._count.acknowledges,
      acknowledgementsRequired: post.requireAcknowledge,
      uniqueViewers: post._count.views,
      reactionsByType: reactionsByType.map((r) => ({
        emoji: r.emoji,
        count: r._count.emoji,
      })),
    };
  }

  /**
   * تسجيل ظهورات متعددة (Batch Impressions)
   * للاستخدام عند تحميل الفيد
   */
  async trackBatchImpressions(
    postIds: string[],
    userId: string | null,
    companyId: string,
    options?: {
      source?: string;
      deviceType?: string;
      sessionId?: string;
    },
  ): Promise<{
    success: boolean;
    count: number;
  }> {
    if (postIds.length === 0) {
      return { success: true, count: 0 };
    }

    // التحقق من وجود المنشورات
    const posts = await this.prisma.post.findMany({
      where: {
        id: { in: postIds },
        companyId,
        status: PostStatus.PUBLISHED,
      },
      select: { id: true },
    });

    const validPostIds = posts.map((p) => p.id);

    if (validPostIds.length === 0) {
      return { success: true, count: 0 };
    }

    // إنشاء سجلات الظهور
    const impressionsData = validPostIds.map((postId, index) => ({
      postId,
      userId,
      source: options?.source || 'FEED',
      position: index,
      deviceType: options?.deviceType,
      sessionId: options?.sessionId,
    }));

    await this.prisma.postImpression.createMany({
      data: impressionsData,
    });

    // تحديث عدادات الظهورات
    await this.prisma.post.updateMany({
      where: { id: { in: validPostIds } },
      data: {
        impressionCount: { increment: 1 },
      },
    });

    return {
      success: true,
      count: validPostIds.length,
    };
  }
}
