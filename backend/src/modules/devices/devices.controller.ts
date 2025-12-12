import {
  Controller,
  Get,
  Post,
  Delete,
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
import { DevicesService } from './devices.service';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { VerifyDeviceDto } from './dto/verify-device.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { DeviceStatus } from '@prisma/client';

interface AuthenticatedRequest extends Request {
  user: { id: string; email: string; role: string };
}

@ApiTags('devices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  // ============ Employee Endpoints ============

  @Post('register')
  @ApiOperation({ summary: 'تسجيل جهاز جديد' })
  @ApiResponse({ status: 201, description: 'تم تسجيل الجهاز' })
  async registerDevice(
    @Req() req: AuthenticatedRequest,
    @Body() data: RegisterDeviceDto,
  ) {
    return this.devicesService.registerDevice(req.user.id, data);
  }

  @Post('verify')
  @ApiOperation({ summary: 'التحقق من الجهاز قبل تسجيل الحضور' })
  @ApiResponse({ status: 200, description: 'نتيجة التحقق' })
  async verifyDevice(
    @Req() req: AuthenticatedRequest,
    @Body() data: VerifyDeviceDto,
  ) {
    return this.devicesService.verifyDevice(req.user.id, data);
  }

  @Get('my-devices')
  @ApiOperation({ summary: 'قائمة أجهزتي المسجلة' })
  @ApiResponse({ status: 200, description: 'قائمة الأجهزة' })
  async getMyDevices(@Req() req: AuthenticatedRequest) {
    return this.devicesService.getUserDevices(req.user.id);
  }

  @Delete(':deviceId')
  @ApiOperation({ summary: 'حذف جهاز' })
  @ApiParam({ name: 'deviceId', description: 'معرف الجهاز' })
  @ApiResponse({ status: 200, description: 'تم الحذف' })
  async removeDevice(
    @Req() req: AuthenticatedRequest,
    @Param('deviceId') deviceId: string,
  ) {
    return this.devicesService.removeDevice(req.user.id, deviceId);
  }

  @Patch(':deviceId/set-main')
  @ApiOperation({ summary: 'تعيين جهاز كرئيسي' })
  @ApiParam({ name: 'deviceId', description: 'معرف الجهاز' })
  @ApiResponse({ status: 200, description: 'تم التعيين' })
  async setMainDevice(
    @Req() req: AuthenticatedRequest,
    @Param('deviceId') deviceId: string,
  ) {
    return this.devicesService.setMainDevice(req.user.id, deviceId);
  }

  // ============ Admin Endpoints ============

  @Get('admin/pending')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'الأجهزة المعلقة في انتظار الموافقة' })
  @ApiResponse({ status: 200, description: 'قائمة الأجهزة المعلقة' })
  async getPendingDevices() {
    return this.devicesService.getPendingDevices();
  }

  @Get('admin/all')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'جميع الأجهزة المسجلة' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: DeviceStatus })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiResponse({ status: 200, description: 'قائمة الأجهزة' })
  async getAllDevices(
    @Query('userId') userId?: string,
    @Query('status') status?: DeviceStatus,
    @Query('branchId') branchId?: string,
  ) {
    return this.devicesService.getAllDevices({ userId, status, branchId });
  }

  @Get('admin/user/:userId')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'أجهزة موظف محدد' })
  @ApiParam({ name: 'userId', description: 'معرف المستخدم' })
  @ApiResponse({ status: 200, description: 'قائمة الأجهزة' })
  async getUserDevices(@Param('userId') userId: string) {
    return this.devicesService.getUserDevices(userId);
  }

  @Patch('admin/:deviceId/approve')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'الموافقة على جهاز' })
  @ApiParam({ name: 'deviceId', description: 'معرف الجهاز' })
  @ApiResponse({ status: 200, description: 'تمت الموافقة' })
  async approveDevice(
    @Req() req: AuthenticatedRequest,
    @Param('deviceId') deviceId: string,
  ) {
    return this.devicesService.approveDevice(deviceId, req.user.id);
  }

  @Patch('admin/:deviceId/block')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'حظر جهاز' })
  @ApiParam({ name: 'deviceId', description: 'معرف الجهاز' })
  @ApiResponse({ status: 200, description: 'تم الحظر' })
  async blockDevice(
    @Req() req: AuthenticatedRequest,
    @Param('deviceId') deviceId: string,
    @Body('reason') reason?: string,
  ) {
    return this.devicesService.blockDevice(deviceId, req.user.id, reason);
  }

  @Get('admin/logs')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'سجل محاولات الوصول' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'deviceId', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'سجل المحاولات' })
  async getAccessLogs(
    @Query('userId') userId?: string,
    @Query('deviceId') deviceId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.devicesService.getAccessLogs({
      userId,
      deviceId,
      limit: limit ? parseInt(limit) : 100,
    });
  }
}

