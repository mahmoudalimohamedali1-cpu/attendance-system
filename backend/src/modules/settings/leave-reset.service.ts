import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SettingsService } from './settings.service';

@Injectable()
export class LeaveResetService {
  private readonly logger = new Logger(LeaveResetService.name);

  constructor(
    private prisma: PrismaService,
    private settingsService: SettingsService,
  ) { }

  /**
   * حساب أيام الإجازة السنوية بناءً على سنوات الخدمة
   * - أقل من 5 سنوات: 21 يوم
   * - 5 سنوات أو أكثر: 30 يوم
   */
  calculateAnnualLeaveDays(hireDate: Date | null): number {
    if (!hireDate) {
      return 21; // القيمة الافتراضية
    }

    const now = new Date();
    const yearsOfService = Math.floor(
      (now.getTime() - new Date(hireDate).getTime()) / (1000 * 60 * 60 * 24 * 365)
    );

    return yearsOfService >= 5 ? 30 : 21;
  }

  /**
   * إعادة ضبط رصيد الإجازات لجميع الموظفين
   * يتم تشغيلها في بداية كل سنة (1 يناير الساعة 00:01)
   */
  @Cron('1 0 1 1 *') // 1 يناير الساعة 00:01
  async resetAnnualLeaveBalances() {
    this.logger.log('🔄 بدء إعادة ضبط رصيد الإجازات السنوية لجميع الشركات...');

    try {
      // جلب جميع الشركات
      const companies = await this.prisma.company.findMany({
        select: { id: true, name: true }
      });

      let totalResetCount = 0;

      for (const company of companies) {
        // التحقق من سياسة ترحيل الإجازات لهذه الشركة
        const disableCarryover = await this.settingsService.isLeaveCarryoverDisabled(company.id);

        if (!disableCarryover) {
          this.logger.log(`✅ سياسة ترحيل الإجازات مفعلة لشركة ${company.name} - لا حاجة لإعادة الضبط`);
          continue;
        }

        // جلب جميع الموظفين النشطين في هذه الشركة
        const users = await this.prisma.user.findMany({
          where: { status: 'ACTIVE', companyId: company.id },
          select: {
            id: true,
            hireDate: true,
          },
        });

        let companyResetCount = 0;

        for (const user of users) {
          const newAnnualDays = this.calculateAnnualLeaveDays(user.hireDate);

          await this.prisma.user.update({
            where: { id: user.id },
            data: {
              annualLeaveDays: newAnnualDays,
              usedLeaveDays: 0,
              remainingLeaveDays: newAnnualDays,
            },
          });

          companyResetCount++;
        }

        totalResetCount += companyResetCount;
        this.logger.log(`✅ شركة ${company.name}: تم إعادة ضبط رصيد الإجازات لـ ${companyResetCount} موظف`);

        // تسجيل العملية في سجل التدقيق الخاص بالشركة
        await this.prisma.auditLog.create({
          data: {
            companyId: company.id,
            action: 'SETTINGS_CHANGE',
            entity: 'LeaveBalance',
            description: `إعادة ضبط رصيد الإجازات السنوية لـ ${companyResetCount} موظف`,
            newValue: { resetCount: companyResetCount, year: new Date().getFullYear() },
          },
        });
      }

      this.logger.log(`✅ الانتهاء من إعادة ضبط رصيد الإجازات لجميع الشركات. الإجمالي: ${totalResetCount}`);

      return { message: 'تم إعادة ضبط رصيد الإجازات لجميع الشركات', totalResetCount };
    } catch (error) {
      this.logger.error('❌ خطأ في إعادة ضبط رصيد الإجازات:', error);
      throw error;
    }
  }

  /**
   * إعادة ضبط رصيد الإجازات يدوياً (للمدير)
   */
  async manualResetLeaveBalances() {
    return this.resetAnnualLeaveBalances();
  }

  /**
   * تحديث أيام الإجازة لموظف معين بناءً على سنوات الخدمة
   */
  async updateUserLeaveDays(userId: string, companyId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, companyId },
      select: { hireDate: true },
    });

    if (!user) {
      throw new Error('المستخدم غير موجود');
    }

    const newAnnualDays = this.calculateAnnualLeaveDays(user.hireDate);

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        annualLeaveDays: newAnnualDays,
      },
    });
  }

  /**
   * الحصول على إحصائيات الإجازات
   */
  async getLeaveStatistics(companyId: string) {
    const disableCarryover = await this.settingsService.isLeaveCarryoverDisabled(companyId);

    const users = await this.prisma.user.findMany({
      where: { status: 'ACTIVE', companyId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        hireDate: true,
        annualLeaveDays: true,
        usedLeaveDays: true,
        remainingLeaveDays: true,
      },
    });

    const stats = users.map(user => ({
      ...user,
      yearsOfService: user.hireDate
        ? Math.floor((Date.now() - new Date(user.hireDate).getTime()) / (1000 * 60 * 60 * 24 * 365))
        : 0,
      expectedAnnualDays: this.calculateAnnualLeaveDays(user.hireDate),
    }));

    return {
      carryoverDisabled: disableCarryover,
      totalUsers: users.length,
      statistics: stats,
    };
  }
}

