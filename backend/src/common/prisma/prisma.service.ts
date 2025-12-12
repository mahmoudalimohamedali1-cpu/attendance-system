import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot clean database in production');
    }
    // Order matters due to foreign keys
    await this.auditLog.deleteMany();
    await this.notification.deleteMany();
    await this.suspiciousAttempt.deleteMany();
    await this.attendance.deleteMany();
    await this.leaveRequest.deleteMany();
    await this.workFromHome.deleteMany();
    await this.refreshToken.deleteMany();
    await this.workSchedule.deleteMany();
    await this.user.deleteMany();
    await this.department.deleteMany();
    await this.branch.deleteMany();
    await this.holiday.deleteMany();
    await this.systemSetting.deleteMany();
  }
}

