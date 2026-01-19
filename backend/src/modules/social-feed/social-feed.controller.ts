import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { SocialFeedService, FeedOptions } from './social-feed.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { CreateCommentDto, UpdateCommentDto } from './dto/create-comment.dto';
import { PostReactionDto } from './dto/post-reaction.dto';
import { PostType } from '@prisma/client';

@ApiTags('social-feed')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('social-feed')
export class SocialFeedController {
  constructor(private readonly socialFeedService: SocialFeedService) {}

  // ==================== نقاط نهاية الفيد ====================

  @Get()
  @ApiOperation({ summary: 'جلب فيد المنشورات' })
  @ApiResponse({ status: 200, description: 'قائمة المنشورات' })
  @ApiQuery({ name: 'page', required: false, description: 'رقم الصفحة' })
  @ApiQuery({ name: 'limit', required: false, description: 'عدد المنشورات في الصفحة' })
  @ApiQuery({
    name: 'filter',
    required: false,
    description: 'نوع الفلتر',
    enum: ['all', 'department', 'team', 'pinned', 'unread', 'announcements'],
  })
  @ApiQuery({
    name: 'postType',
    required: false,
    description: 'نوع المنشور',
    enum: PostType,
  })
  async getFeed(
    @CurrentUser('id') userId: string,
    @CurrentUser('companyId') companyId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('filter') filter?: string,
    @Query('postType') postType?: PostType,
  ) {
    const options: FeedOptions = {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      filter: filter as FeedOptions['filter'],
      postType,
    };
    return this.socialFeedService.getFeed(userId, companyId, options);
  }

  @Get('search')
  @ApiOperation({ summary: 'البحث في المنشورات' })
  @ApiResponse({ status: 200, description: 'نتائج البحث' })
  @ApiQuery({ name: 'q', required: true, description: 'كلمة البحث' })
  @ApiQuery({ name: 'page', required: false, description: 'رقم الصفحة' })
  @ApiQuery({ name: 'limit', required: false, description: 'عدد النتائج في الصفحة' })
  async searchPosts(
    @CurrentUser('id') userId: string,
    @CurrentUser('companyId') companyId: string,
    @Query('q') query: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.socialFeedService.searchPosts(userId, companyId, query, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  @Get('archived')
  @ApiOperation({ summary: 'جلب المنشورات المؤرشفة للمستخدم' })
  @ApiResponse({ status: 200, description: 'قائمة المنشورات المؤرشفة' })
  @ApiQuery({ name: 'page', required: false, description: 'رقم الصفحة' })
  @ApiQuery({ name: 'limit', required: false, description: 'عدد المنشورات في الصفحة' })
  async getArchivedPosts(
    @CurrentUser('id') userId: string,
    @CurrentUser('companyId') companyId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.socialFeedService.getArchivedPosts(userId, companyId, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  @Post()
  @ApiOperation({ summary: 'إنشاء منشور جديد' })
  @ApiResponse({ status: 201, description: 'تم إنشاء المنشور بنجاح' })
  @ApiResponse({ status: 400, description: 'بيانات غير صالحة' })
  async createPost(
    @CurrentUser('id') userId: string,
    @CurrentUser('companyId') companyId: string,
    @Body() dto: CreatePostDto,
  ) {
    return this.socialFeedService.createPost(userId, companyId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'جلب منشور واحد' })
  @ApiResponse({ status: 200, description: 'تفاصيل المنشور' })
  @ApiResponse({ status: 404, description: 'المنشور غير موجود' })
  @ApiParam({ name: 'id', description: 'معرف المنشور' })
  async getPost(
    @Param('id') postId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.socialFeedService.getPost(postId, userId, companyId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'تحديث منشور' })
  @ApiResponse({ status: 200, description: 'تم تحديث المنشور بنجاح' })
  @ApiResponse({ status: 404, description: 'المنشور غير موجود' })
  @ApiResponse({ status: 403, description: 'ليس لديك صلاحية لتعديل هذا المنشور' })
  @ApiParam({ name: 'id', description: 'معرف المنشور' })
  async updatePost(
    @Param('id') postId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('companyId') companyId: string,
    @Body() dto: UpdatePostDto,
  ) {
    return this.socialFeedService.updatePost(postId, userId, companyId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'حذف منشور (أرشفة)' })
  @ApiResponse({ status: 200, description: 'تم حذف المنشور بنجاح' })
  @ApiResponse({ status: 404, description: 'المنشور غير موجود' })
  @ApiResponse({ status: 403, description: 'ليس لديك صلاحية لحذف هذا المنشور' })
  @ApiParam({ name: 'id', description: 'معرف المنشور' })
  async deletePost(
    @Param('id') postId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.socialFeedService.deletePost(postId, userId, companyId);
  }

  @Post(':id/publish')
  @ApiOperation({ summary: 'نشر منشور مسودة' })
  @ApiResponse({ status: 200, description: 'تم نشر المنشور بنجاح' })
  @ApiResponse({ status: 404, description: 'المنشور غير موجود' })
  @ApiResponse({ status: 400, description: 'المنشور منشور بالفعل' })
  @ApiParam({ name: 'id', description: 'معرف المنشور' })
  async publishPost(
    @Param('id') postId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.socialFeedService.publishPost(postId, userId, companyId);
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'استعادة منشور مؤرشف' })
  @ApiResponse({ status: 200, description: 'تم استعادة المنشور بنجاح' })
  @ApiResponse({ status: 404, description: 'المنشور المؤرشف غير موجود' })
  @ApiParam({ name: 'id', description: 'معرف المنشور' })
  async restorePost(
    @Param('id') postId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.socialFeedService.restorePost(postId, userId, companyId);
  }

  // ==================== نقاط نهاية التفاعلات ====================

  @Post(':id/react')
  @ApiOperation({ summary: 'إضافة تفاعل على منشور' })
  @ApiResponse({ status: 200, description: 'تم إضافة التفاعل بنجاح' })
  @ApiResponse({ status: 404, description: 'المنشور غير موجود' })
  @ApiResponse({ status: 400, description: 'نوع التفاعل غير صالح' })
  @ApiParam({ name: 'id', description: 'معرف المنشور' })
  async addReaction(
    @Param('id') postId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('companyId') companyId: string,
    @Body() dto: PostReactionDto,
  ) {
    return this.socialFeedService.addReaction(postId, userId, companyId, dto.emoji);
  }

  @Delete(':id/react/:emoji')
  @ApiOperation({ summary: 'إزالة تفاعل من منشور' })
  @ApiResponse({ status: 200, description: 'تم إزالة التفاعل بنجاح' })
  @ApiResponse({ status: 404, description: 'التفاعل غير موجود' })
  @ApiParam({ name: 'id', description: 'معرف المنشور' })
  @ApiParam({ name: 'emoji', description: 'نوع التفاعل' })
  async removeReaction(
    @Param('id') postId: string,
    @Param('emoji') emoji: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.socialFeedService.removeReaction(postId, userId, companyId, emoji);
  }

  @Get(':id/reactions')
  @ApiOperation({ summary: 'جلب التفاعلات على منشور' })
  @ApiResponse({ status: 200, description: 'قائمة التفاعلات' })
  @ApiResponse({ status: 404, description: 'المنشور غير موجود' })
  @ApiParam({ name: 'id', description: 'معرف المنشور' })
  async getReactions(
    @Param('id') postId: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.socialFeedService.getReactions(postId, companyId);
  }

  // ==================== نقاط نهاية التعليقات ====================

  @Get(':id/comments')
  @ApiOperation({ summary: 'جلب تعليقات منشور' })
  @ApiResponse({ status: 200, description: 'قائمة التعليقات' })
  @ApiResponse({ status: 404, description: 'المنشور غير موجود' })
  @ApiParam({ name: 'id', description: 'معرف المنشور' })
  @ApiQuery({ name: 'page', required: false, description: 'رقم الصفحة' })
  @ApiQuery({ name: 'limit', required: false, description: 'عدد التعليقات في الصفحة' })
  @ApiQuery({ name: 'parentId', required: false, description: 'معرف التعليق الأب للردود' })
  async getComments(
    @Param('id') postId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('companyId') companyId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('parentId') parentId?: string,
  ) {
    return this.socialFeedService.getComments(postId, userId, companyId, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      parentId: parentId || null,
    });
  }

  @Post(':id/comments')
  @ApiOperation({ summary: 'إضافة تعليق على منشور' })
  @ApiResponse({ status: 201, description: 'تم إضافة التعليق بنجاح' })
  @ApiResponse({ status: 404, description: 'المنشور غير موجود' })
  @ApiResponse({ status: 403, description: 'التعليقات غير مسموحة على هذا المنشور' })
  @ApiParam({ name: 'id', description: 'معرف المنشور' })
  async addComment(
    @Param('id') postId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('companyId') companyId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.socialFeedService.addComment(
      postId,
      userId,
      companyId,
      dto.content,
      dto.parentId,
      dto.mentions,
    );
  }

  @Patch(':id/comments/:commentId')
  @ApiOperation({ summary: 'تعديل تعليق' })
  @ApiResponse({ status: 200, description: 'تم تعديل التعليق بنجاح' })
  @ApiResponse({ status: 404, description: 'التعليق غير موجود' })
  @ApiResponse({ status: 403, description: 'ليس لديك صلاحية لتعديل هذا التعليق' })
  @ApiParam({ name: 'id', description: 'معرف المنشور' })
  @ApiParam({ name: 'commentId', description: 'معرف التعليق' })
  async updateComment(
    @Param('id') postId: string,
    @Param('commentId') commentId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('companyId') companyId: string,
    @Body() dto: UpdateCommentDto,
  ) {
    return this.socialFeedService.updateComment(
      commentId,
      userId,
      companyId,
      dto.content,
      dto.mentions,
    );
  }

  @Delete(':id/comments/:commentId')
  @ApiOperation({ summary: 'حذف تعليق' })
  @ApiResponse({ status: 200, description: 'تم حذف التعليق بنجاح' })
  @ApiResponse({ status: 404, description: 'التعليق غير موجود' })
  @ApiResponse({ status: 403, description: 'ليس لديك صلاحية لحذف هذا التعليق' })
  @ApiParam({ name: 'id', description: 'معرف المنشور' })
  @ApiParam({ name: 'commentId', description: 'معرف التعليق' })
  async deleteComment(
    @Param('id') postId: string,
    @Param('commentId') commentId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.socialFeedService.deleteComment(commentId, userId, companyId);
  }

  // ==================== نقاط نهاية تأكيد القراءة ====================

  @Post(':id/acknowledge')
  @ApiOperation({ summary: 'تأكيد قراءة منشور رسمي' })
  @ApiResponse({ status: 200, description: 'تم تأكيد القراءة بنجاح' })
  @ApiResponse({ status: 404, description: 'المنشور غير موجود' })
  @ApiResponse({ status: 400, description: 'هذا المنشور لا يتطلب تأكيد قراءة أو تم التأكيد مسبقاً' })
  @ApiParam({ name: 'id', description: 'معرف المنشور' })
  async acknowledgePost(
    @Param('id') postId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('companyId') companyId: string,
    @Body() body?: { note?: string },
  ) {
    return this.socialFeedService.acknowledgePost(postId, userId, companyId, {
      note: body?.note,
    });
  }

  @Get(':id/acknowledgements')
  @ApiOperation({ summary: 'جلب تأكيدات القراءة لمنشور' })
  @ApiResponse({ status: 200, description: 'قائمة تأكيدات القراءة' })
  @ApiResponse({ status: 404, description: 'المنشور غير موجود' })
  @ApiParam({ name: 'id', description: 'معرف المنشور' })
  @ApiQuery({ name: 'page', required: false, description: 'رقم الصفحة' })
  @ApiQuery({ name: 'limit', required: false, description: 'عدد النتائج في الصفحة' })
  async getAcknowledgements(
    @Param('id') postId: string,
    @CurrentUser('companyId') companyId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.socialFeedService.getAcknowledgements(postId, companyId, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  // ==================== نقاط نهاية التحليلات والتتبع ====================

  @Get(':id/analytics')
  @ApiOperation({ summary: 'جلب إحصائيات منشور' })
  @ApiResponse({ status: 200, description: 'إحصائيات المنشور' })
  @ApiResponse({ status: 404, description: 'المنشور غير موجود' })
  @ApiParam({ name: 'id', description: 'معرف المنشور' })
  async getPostAnalytics(
    @Param('id') postId: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.socialFeedService.getPostAnalytics(postId, companyId);
  }

  @Post(':id/view')
  @ApiOperation({ summary: 'تسجيل مشاهدة منشور' })
  @ApiResponse({ status: 200, description: 'تم تسجيل المشاهدة' })
  @ApiResponse({ status: 404, description: 'المنشور غير موجود' })
  @ApiParam({ name: 'id', description: 'معرف المنشور' })
  async trackView(
    @Param('id') postId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('companyId') companyId: string,
    @Body() body?: { duration?: number; deviceType?: string },
  ) {
    return this.socialFeedService.trackView(postId, userId, companyId, {
      duration: body?.duration,
      deviceType: body?.deviceType,
    });
  }

  @Post(':id/impression')
  @ApiOperation({ summary: 'تسجيل ظهور منشور' })
  @ApiResponse({ status: 200, description: 'تم تسجيل الظهور' })
  @ApiResponse({ status: 404, description: 'المنشور غير موجود' })
  @ApiParam({ name: 'id', description: 'معرف المنشور' })
  async trackImpression(
    @Param('id') postId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('companyId') companyId: string,
    @Body() body?: { source?: string; position?: number; deviceType?: string; sessionId?: string },
  ) {
    return this.socialFeedService.trackImpression(postId, userId, companyId, {
      source: body?.source,
      position: body?.position,
      deviceType: body?.deviceType,
      sessionId: body?.sessionId,
    });
  }

  @Post(':id/click')
  @ApiOperation({ summary: 'تسجيل نقرة على منشور' })
  @ApiResponse({ status: 200, description: 'تم تسجيل النقرة' })
  @ApiResponse({ status: 404, description: 'المنشور غير موجود' })
  @ApiParam({ name: 'id', description: 'معرف المنشور' })
  async trackClick(
    @Param('id') postId: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.socialFeedService.trackClick(postId, companyId);
  }

  @Post('track-impressions')
  @ApiOperation({ summary: 'تسجيل ظهورات متعددة (batch)' })
  @ApiResponse({ status: 200, description: 'تم تسجيل الظهورات' })
  async trackBatchImpressions(
    @CurrentUser('id') userId: string,
    @CurrentUser('companyId') companyId: string,
    @Body() body: { postIds: string[]; source?: string; deviceType?: string; sessionId?: string },
  ) {
    return this.socialFeedService.trackBatchImpressions(
      body.postIds,
      userId,
      companyId,
      {
        source: body.source,
        deviceType: body.deviceType,
        sessionId: body.sessionId,
      },
    );
  }

  // ==================== نقاط نهاية الإدارة (HR/Admin) ====================

  @Post(':id/pin')
  @Roles('ADMIN', 'HR')
  @ApiOperation({ summary: 'تثبيت/إلغاء تثبيت منشور' })
  @ApiResponse({ status: 200, description: 'تم تثبيت/إلغاء تثبيت المنشور' })
  @ApiResponse({ status: 404, description: 'المنشور غير موجود' })
  @ApiResponse({ status: 403, description: 'ليس لديك صلاحية' })
  @ApiParam({ name: 'id', description: 'معرف المنشور' })
  async togglePinPost(
    @Param('id') postId: string,
    @CurrentUser('companyId') companyId: string,
    @Body() body?: { pinnedUntil?: string },
  ) {
    const pinnedUntil = body?.pinnedUntil ? new Date(body.pinnedUntil) : undefined;
    return this.socialFeedService.togglePinPost(postId, companyId, pinnedUntil);
  }

  @Delete(':id/pin')
  @Roles('ADMIN', 'HR')
  @ApiOperation({ summary: 'إلغاء تثبيت منشور' })
  @ApiResponse({ status: 200, description: 'تم إلغاء تثبيت المنشور' })
  @ApiResponse({ status: 404, description: 'المنشور غير موجود' })
  @ApiResponse({ status: 403, description: 'ليس لديك صلاحية' })
  @ApiParam({ name: 'id', description: 'معرف المنشور' })
  async unpinPost(
    @Param('id') postId: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.socialFeedService.unpinPost(postId, companyId);
  }

  @Post(':id/approve')
  @Roles('ADMIN', 'HR')
  @ApiOperation({ summary: 'الموافقة على منشور معلق' })
  @ApiResponse({ status: 200, description: 'تم الموافقة على المنشور' })
  @ApiResponse({ status: 404, description: 'المنشور غير موجود أو ليس في انتظار الموافقة' })
  @ApiResponse({ status: 403, description: 'ليس لديك صلاحية' })
  @ApiParam({ name: 'id', description: 'معرف المنشور' })
  async approvePost(
    @Param('id') postId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.socialFeedService.approvePost(postId, userId, companyId);
  }

  @Post(':id/reject')
  @Roles('ADMIN', 'HR')
  @ApiOperation({ summary: 'رفض منشور معلق' })
  @ApiResponse({ status: 200, description: 'تم رفض المنشور' })
  @ApiResponse({ status: 404, description: 'المنشور غير موجود أو ليس في انتظار الموافقة' })
  @ApiResponse({ status: 403, description: 'ليس لديك صلاحية' })
  @ApiParam({ name: 'id', description: 'معرف المنشور' })
  async rejectPost(
    @Param('id') postId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('companyId') companyId: string,
    @Body() body?: { reason?: string },
  ) {
    return this.socialFeedService.rejectPost(postId, userId, companyId, body?.reason);
  }

  @Delete(':id/hard')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'حذف منشور نهائياً' })
  @ApiResponse({ status: 200, description: 'تم حذف المنشور نهائياً' })
  @ApiResponse({ status: 404, description: 'المنشور غير موجود' })
  @ApiResponse({ status: 403, description: 'ليس لديك صلاحية' })
  @ApiParam({ name: 'id', description: 'معرف المنشور' })
  async hardDeletePost(
    @Param('id') postId: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.socialFeedService.hardDeletePost(postId, companyId);
  }
}
