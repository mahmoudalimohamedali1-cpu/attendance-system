import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

// Core Modules
import { PrismaModule } from './common/prisma/prisma.module';
import { AppController } from './app.controller';

// Feature Modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { BranchesModule } from './modules/branches/branches.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { LeavesModule } from './modules/leaves/leaves.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AuditModule } from './modules/audit/audit.module';
import { SettingsModule } from './modules/settings/settings.module';
import { FaceRecognitionModule } from './modules/face-recognition/face-recognition.module';
import { DevicesModule } from './modules/devices/devices.module';
import { DataUpdateModule } from './modules/data-update/data-update.module';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Scheduler for cron jobs
    ScheduleModule.forRoot(),

    // Core
    PrismaModule,

    // Features
    AuthModule,
    UsersModule,
    BranchesModule,
    AttendanceModule,
    LeavesModule,
    NotificationsModule,
    ReportsModule,
    AuditModule,
    SettingsModule,
    FaceRecognitionModule, // التعرف على الوجه
    DevicesModule,        // إدارة الأجهزة المسجلة
    DataUpdateModule,     // طلبات تحديث البيانات
  ],
  controllers: [AppController],
})
export class AppModule {}

