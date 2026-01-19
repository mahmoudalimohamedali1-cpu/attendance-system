import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TargetingService, TargetRule } from './targeting.service';
import { PostStatus, PostType, VisibilityType, Prisma, MentionType } from '@prisma/client';
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

    return post as PostWithRelations;
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
}
