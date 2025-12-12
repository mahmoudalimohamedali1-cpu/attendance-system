import {
  Controller,
  Get,
  Post,
  Delete,
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
import { FaceRecognitionService } from './face-recognition.service';
import { RegisterFaceDto } from './dto/register-face.dto';
import { VerifyFaceDto } from './dto/verify-face.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

interface AuthenticatedRequest extends Request {
  user: { id: string; email: string; role: string };
}

@ApiTags('face-recognition')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('face-recognition')
export class FaceRecognitionController {
  constructor(private readonly faceRecognitionService: FaceRecognitionService) {}

  // ============ Employee Endpoints ============

  @Post('register')
  @ApiOperation({ summary: 'تسجيل وجه المستخدم الحالي' })
  @ApiResponse({ status: 201, description: 'تم تسجيل الوجه بنجاح' })
  @ApiResponse({ status: 400, description: 'بيانات غير صالحة' })
  async registerMyFace(
    @Req() req: AuthenticatedRequest,
    @Body() data: RegisterFaceDto,
  ) {
    return this.faceRecognitionService.registerFace(req.user.id, data);
  }

  @Post('verify')
  @ApiOperation({ summary: 'التحقق من وجه المستخدم الحالي' })
  @ApiResponse({ status: 200, description: 'نتيجة التحقق' })
  async verifyMyFace(
    @Req() req: AuthenticatedRequest,
    @Body() data: VerifyFaceDto,
  ) {
    return this.faceRecognitionService.verifyFace(req.user.id, data);
  }

  @Get('status')
  @ApiOperation({ summary: 'حالة تسجيل وجه المستخدم الحالي' })
  @ApiResponse({ status: 200, description: 'حالة التسجيل' })
  async getMyFaceStatus(@Req() req: AuthenticatedRequest) {
    return this.faceRecognitionService.getFaceStatus(req.user.id);
  }

  @Delete('my-face')
  @ApiOperation({ summary: 'حذف بيانات وجه المستخدم الحالي' })
  @ApiResponse({ status: 200, description: 'تم الحذف بنجاح' })
  async deleteMyFace(@Req() req: AuthenticatedRequest) {
    return this.faceRecognitionService.deleteFaceData(req.user.id);
  }

  // ============ Admin Endpoints ============

  @Post('admin/register/:userId')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'تسجيل وجه موظف (للمسؤول)' })
  @ApiParam({ name: 'userId', description: 'معرف المستخدم' })
  @ApiResponse({ status: 201, description: 'تم تسجيل الوجه بنجاح' })
  async registerUserFace(
    @Param('userId') userId: string,
    @Body() data: RegisterFaceDto,
  ) {
    return this.faceRecognitionService.registerFace(userId, data);
  }

  @Post('admin/verify/:userId')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'التحقق من وجه موظف (للمسؤول)' })
  @ApiParam({ name: 'userId', description: 'معرف المستخدم' })
  @ApiResponse({ status: 200, description: 'نتيجة التحقق' })
  async verifyUserFace(
    @Param('userId') userId: string,
    @Body() data: VerifyFaceDto,
  ) {
    return this.faceRecognitionService.verifyFace(userId, data);
  }

  @Get('admin/status/:userId')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'حالة تسجيل وجه موظف (للمسؤول)' })
  @ApiParam({ name: 'userId', description: 'معرف المستخدم' })
  @ApiResponse({ status: 200, description: 'حالة التسجيل' })
  async getUserFaceStatus(@Param('userId') userId: string) {
    return this.faceRecognitionService.getFaceStatus(userId);
  }

  @Delete('admin/:userId')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'حذف بيانات وجه موظف (للمسؤول)' })
  @ApiParam({ name: 'userId', description: 'معرف المستخدم' })
  @ApiResponse({ status: 200, description: 'تم الحذف بنجاح' })
  async deleteUserFace(@Param('userId') userId: string) {
    return this.faceRecognitionService.deleteFaceData(userId);
  }

  @Get('admin/users')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'قائمة الموظفين وحالة تسجيل الوجه' })
  @ApiQuery({ name: 'branchId', required: false, description: 'معرف الفرع' })
  @ApiQuery({ name: 'departmentId', required: false, description: 'معرف القسم' })
  @ApiResponse({ status: 200, description: 'قائمة الموظفين' })
  async getUsersFaceStatus(
    @Query('branchId') branchId?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    return this.faceRecognitionService.getUsersFaceStatus(branchId, departmentId);
  }

  @Get('admin/logs')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'سجل محاولات التحقق' })
  @ApiQuery({ name: 'userId', required: false, description: 'معرف المستخدم' })
  @ApiQuery({ name: 'limit', required: false, description: 'عدد السجلات' })
  @ApiResponse({ status: 200, description: 'سجل المحاولات' })
  async getVerificationLogs(
    @Query('userId') userId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.faceRecognitionService.getVerificationLogs(
      userId,
      limit ? parseInt(limit) : 50,
    );
  }
}
