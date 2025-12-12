import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from './modules/auth/decorators/public.decorator';

@ApiTags('root')
@Controller()
export class AppController {
  @Get()
  @Public()
  @ApiOperation({ summary: 'الصفحة الرئيسية' })
  getRoot() {
    return {
      message: 'مرحباً بك في نظام الحضور والانصراف',
      version: '1.0.0',
      documentation: '/api/docs',
      endpoints: {
        auth: '/api/v1/auth',
        users: '/api/v1/users',
        attendance: '/api/v1/attendance',
        branches: '/api/v1/branches',
        leaves: '/api/v1/leaves',
        reports: '/api/v1/reports',
        notifications: '/api/v1/notifications',
      },
    };
  }

  @Get('health')
  @Public()
  @ApiOperation({ summary: 'فحص حالة الخادم' })
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}

