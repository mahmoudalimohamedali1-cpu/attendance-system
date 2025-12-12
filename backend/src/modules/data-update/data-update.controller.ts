import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Request } from 'express';
import { DataUpdateService } from './data-update.service';
import { CreateUpdateRequestDto, UpdateRequestType } from './dto/create-update-request.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UpdateRequestStatus } from '@prisma/client';

interface AuthenticatedRequest extends Request {
  user: { id: string; email: string; role: string };
}

@ApiTags('data-update')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('data-update')
export class DataUpdateController {
  constructor(private readonly dataUpdateService: DataUpdateService) {}

  // ============ Employee Endpoints ============

  @Post('request')
  @ApiOperation({ summary: 'إنشاء طلب تحديث بيانات (وجه / جهاز / كلاهما)' })
  @ApiResponse({ status: 201, description: 'تم إرسال الطلب' })
  @ApiResponse({ status: 400, description: 'يوجد طلب معلق سابق' })
  async createRequest(
    @Req() req: AuthenticatedRequest,
    @Body() data: CreateUpdateRequestDto,
  ) {
    return this.dataUpdateService.createUpdateRequest(req.user.id, data);
  }

  @Get('my-requests')
  @ApiOperation({ summary: 'قائمة طلباتي' })
  @ApiResponse({ status: 200, description: 'قائمة الطلبات' })
  async getMyRequests(@Req() req: AuthenticatedRequest) {
    return this.dataUpdateService.getMyRequests(req.user.id);
  }

  @Patch('cancel/:requestId')
  @ApiOperation({ summary: 'إلغاء طلب معلق' })
  @ApiParam({ name: 'requestId', description: 'معرف الطلب' })
  @ApiResponse({ status: 200, description: 'تم الإلغاء' })
  async cancelRequest(
    @Req() req: AuthenticatedRequest,
    @Param('requestId') requestId: string,
  ) {
    return this.dataUpdateService.cancelRequest(req.user.id, requestId);
  }

  // ============ Admin Endpoints ============

  @Get('admin/pending')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'طلبات التحديث المعلقة' })
  @ApiResponse({ status: 200, description: 'قائمة الطلبات المعلقة' })
  async getPendingRequests() {
    return this.dataUpdateService.getPendingRequests();
  }

  @Get('admin/all')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'جميع طلبات التحديث مع فلترة' })
  @ApiQuery({ name: 'status', required: false, enum: UpdateRequestStatus })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'requestType', required: false, enum: UpdateRequestType })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'قائمة الطلبات' })
  async getAllRequests(
    @Query('status') status?: UpdateRequestStatus,
    @Query('userId') userId?: string,
    @Query('requestType') requestType?: UpdateRequestType,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.dataUpdateService.getAllRequests({
      status,
      userId,
      requestType,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  @Get('admin/:requestId')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'تفاصيل طلب تحديث مع بيانات المستخدم' })
  @ApiParam({ name: 'requestId', description: 'معرف الطلب' })
  @ApiResponse({ status: 200, description: 'تفاصيل الطلب' })
  async getRequestDetails(@Param('requestId') requestId: string) {
    return this.dataUpdateService.getRequestDetails(requestId);
  }

  @Patch('admin/:requestId/approve')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'الموافقة على طلب التحديث' })
  @ApiParam({ name: 'requestId', description: 'معرف الطلب' })
  @ApiResponse({ status: 200, description: 'تمت الموافقة' })
  async approveRequest(
    @Req() req: AuthenticatedRequest,
    @Param('requestId') requestId: string,
    @Body('note') note?: string,
  ) {
    return this.dataUpdateService.approveRequest(requestId, req.user.id, note);
  }

  @Patch('admin/:requestId/reject')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'رفض طلب التحديث' })
  @ApiParam({ name: 'requestId', description: 'معرف الطلب' })
  @ApiResponse({ status: 200, description: 'تم الرفض' })
  async rejectRequest(
    @Req() req: AuthenticatedRequest,
    @Param('requestId') requestId: string,
    @Body('reason') reason: string,
  ) {
    return this.dataUpdateService.rejectRequest(requestId, req.user.id, reason);
  }
}

