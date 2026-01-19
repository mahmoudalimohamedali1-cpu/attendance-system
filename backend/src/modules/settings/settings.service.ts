// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

// نوع التطبيق للعطلات
type HolidayApplicationType = 'ALL' | 'BRANCH' | 'DEPARTMENT' | 'SPECIFIC_EMPLOYEES' | 'EXCLUDE_EMPLOYEES';

// واجهة بيانات العطلة للموظف
export interface EmployeeHolidayInfo {
  isHoliday: boolean;
  holiday?: {
    id: string;
    name: string;
    nameEn?: string;
    isPaid: boolean;
    countAsWorkDay: boolean;
    overtimeMultiplier: number;
  };
}

// واجهة إنشاء العطلة
export interface CreateHolidayData {
  name: string;
  nameEn?: string;
  date: Date;
  isRecurring?: boolean;
  isPaid?: boolean;
  applicationType?: HolidayApplicationType;
  countAsWorkDay?: boolean;
  overtimeMultiplier?: number;
  notes?: string;
  assignments?: {
    type: 'BRANCH' | 'DEPARTMENT' | 'EMPLOYEE';
    ids: string[];
  };
}

@Injectable()
export class SettingsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) { }

  async getAllSettings(companyId: string) {
    return this.prisma.systemSetting.findMany({
      where: { companyId },
    });
  }

  async getSetting(key: string, companyId: string) {
    return this.prisma.systemSetting.findFirst({
      where: { key, companyId },
    });
  }

  async setSetting(key: string, value: string, companyId: string, description?: string, userId?: string) {
    const oldSetting = await this.getSetting(key, companyId);

    const setting = await this.prisma.systemSetting.upsert({
      where: {
        key_companyId: { key, companyId }
      },
      create: { key, value, companyId, description },
      update: { value, description },
    });

    // Log audit
    await this.auditService.log(
      oldSetting ? 'UPDATE' : 'CREATE',
      'Settings',
      key,
      userId,
      oldSetting ? { value: oldSetting.value } : null,
      { value },
      `تعديل إعداد: ${key}`,
    );

    return setting;
  }

  async deleteSetting(key: string, companyId: string, userId?: string) {
    const oldSetting = await this.getSetting(key, companyId);

    const result = await this.prisma.systemSetting.delete({
      where: {
        key_companyId: { key, companyId }
      },
    });

    // Log audit
    await this.auditService.log(
      'DELETE',
      'Settings',
      key,
      userId,
      oldSetting ? { value: oldSetting.value } : null,
      null,
      `حذف إعداد: ${key}`,
    );

    return result;
  }

  async setMultipleSettings(settings: Array<{ key: string; value: string; description?: string }>, companyId: string) {
    const results = [];
    for (const setting of settings) {
      const result = await this.setSetting(setting.key, setting.value, companyId, setting.description);
      results.push(result);
    }
    return results;
  }

  // ==================== Holiday Management ====================

  /**
   * الحصول على جميع العطلات مع التعيينات
   */
  async getHolidays(companyId: string, year?: number) {
    const where: any = { companyId };

    if (year) {
      const startOfYear = new Date(year, 0, 1);
      const endOfYear = new Date(year, 11, 31);
      where.date = {
        gte: startOfYear,
        lte: endOfYear,
      };
    }

    return this.prisma.holiday.findMany({
      where,
      include: {
        holidayAssignments: true,
      },
      orderBy: { date: 'asc' },
    });
  }

  /**
   * إنشاء عطلة جديدة مع التعيينات
   */
  async createHoliday(data: CreateHolidayData, companyId: string) {
    const { assignments, ...holidayData } = data;

    return this.prisma.$transaction(async (tx) => {
      // إنشاء العطلة
      const holiday = await tx.holiday.create({
        data: {
          ...holidayData,
          companyId,
          overtimeMultiplier: data.overtimeMultiplier || 2.0,
        },
      });

      // إنشاء التعيينات إذا وجدت
      if (assignments && assignments.ids.length > 0) {
        const assignmentData = assignments.ids.map(id => ({
          holidayId: holiday.id,
          assignmentType: assignments.type,
          branchId: assignments.type === 'BRANCH' ? id : null,
          departmentId: assignments.type === 'DEPARTMENT' ? id : null,
          employeeId: assignments.type === 'EMPLOYEE' ? id : null,
        }));

        await tx.holidayAssignment.createMany({
          data: assignmentData,
        });
      }

      // إرجاع العطلة مع التعيينات
      return tx.holiday.findUnique({
        where: { id: holiday.id },
        include: { assignments: true },
      });
    });
  }

  /**
   * تحديث عطلة مع التعيينات
   */
  async updateHoliday(
    id: string,
    companyId: string,
    data: Partial<CreateHolidayData>
  ) {
    const { assignments, ...holidayData } = data;

    return this.prisma.$transaction(async (tx) => {
      // تحديث بيانات العطلة
      const updateData: any = {};
      if (holidayData.name !== undefined) updateData.name = holidayData.name;
      if (holidayData.nameEn !== undefined) updateData.nameEn = holidayData.nameEn;
      if (holidayData.date !== undefined) updateData.date = holidayData.date;
      if (holidayData.isRecurring !== undefined) updateData.isRecurring = holidayData.isRecurring;
      if (holidayData.isPaid !== undefined) updateData.isPaid = holidayData.isPaid;
      if (holidayData.applicationType !== undefined) updateData.applicationType = holidayData.applicationType;
      if (holidayData.countAsWorkDay !== undefined) updateData.countAsWorkDay = holidayData.countAsWorkDay;
      if (holidayData.overtimeMultiplier !== undefined) updateData.overtimeMultiplier = holidayData.overtimeMultiplier;
      if (holidayData.notes !== undefined) updateData.notes = holidayData.notes;

      await tx.holiday.update({
        where: { id, companyId },
        data: updateData,
      });

      // تحديث التعيينات إذا تم تمريرها
      if (assignments !== undefined) {
        // حذف التعيينات القديمة
        await tx.holidayAssignment.deleteMany({
          where: { holidayId: id },
        });

        // إنشاء التعيينات الجديدة
        if (assignments && assignments.ids.length > 0) {
          const assignmentData = assignments.ids.map(assignmentId => ({
            holidayId: id,
            assignmentType: assignments.type,
            branchId: assignments.type === 'BRANCH' ? assignmentId : null,
            departmentId: assignments.type === 'DEPARTMENT' ? assignmentId : null,
            employeeId: assignments.type === 'EMPLOYEE' ? assignmentId : null,
          }));

          await tx.holidayAssignment.createMany({
            data: assignmentData,
          });
        }
      }

      return tx.holiday.findUnique({
        where: { id },
        include: { assignments: true },
      });
    });
  }

  /**
   * حذف عطلة (التعيينات تحذف تلقائياً بسبب onDelete: Cascade)
   */
  async deleteHoliday(id: string, companyId: string) {
    return this.prisma.holiday.delete({
      where: { id, companyId },
    });
  }

  /**
   * التحقق إذا كان التاريخ عطلة (بسيط - للتوافق مع الكود القديم)
   */
  async isHoliday(date: Date, companyId?: string): Promise<boolean> {
    const holidayInfo = await this.getEmployeeHolidayInfo(date, undefined, companyId);
    return holidayInfo.isHoliday;
  }

  /**
   * الحصول على معلومات العطلة للموظف (تفصيلي)
   * يتحقق من العطلات العامة والعطلات المخصصة للموظف/القسم/الفرع
   */
  async getEmployeeHolidayInfo(
    date: Date,
    employeeId?: string,
    companyId?: string
  ): Promise<EmployeeHolidayInfo> {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const targetMonth = targetDate.getMonth() + 1;
    const targetDay = targetDate.getDate();

    // Build where clause
    const whereClause: any = {};
    if (companyId) {
      whereClause.companyId = companyId;
    }

    // البحث عن العطلات في هذا التاريخ
    const holidays = await this.prisma.holiday.findMany({
      where: whereClause,
      include: {
        assignments: true,
      },
    });

    // البحث عن عطلة تطابق التاريخ
    for (const holiday of holidays) {
      const holidayDate = new Date(holiday.date);
      const isDateMatch = holiday.isRecurring
        ? (holidayDate.getMonth() + 1 === targetMonth && holidayDate.getDate() === targetDay)
        : (holidayDate.getTime() === targetDate.getTime());

      if (!isDateMatch) continue;

      // التحقق إذا كانت العطلة تنطبق على الموظف
      const applies = await this.doesHolidayApplyToEmployee(holiday, employeeId);

      if (applies) {
        return {
          isHoliday: true,
          holiday: {
            id: holiday.id,
            name: holiday.name,
            nameEn: holiday.nameEn || undefined,
            isPaid: holiday.isPaid,
            countAsWorkDay: holiday.countAsWorkDay,
            overtimeMultiplier: Number(holiday.overtimeMultiplier),
          },
        };
      }
    }

    return { isHoliday: false };
  }

  /**
   * التحقق إذا كانت العطلة تنطبق على موظف معين
   */
  private async doesHolidayApplyToEmployee(
    holiday: any,
    employeeId?: string
  ): Promise<boolean> {
    // إذا لم يتم تحديد موظف، نفترض أن العطلة تنطبق على الجميع
    if (!employeeId) {
      return holiday.applicationType === 'ALL';
    }

    switch (holiday.applicationType) {
      case 'ALL':
        return true;

      case 'BRANCH':
        // التحقق إذا كان الموظف في أحد الفروع المحددة
        const employeeBranch = await this.prisma.user.findUnique({
          where: { id: employeeId },
          select: { branchId: true },
        });
        if (!employeeBranch?.branchId) return false;
        return holiday.assignments.some(
          (a: any) => a.assignmentType === 'BRANCH' && a.branchId === employeeBranch.branchId
        );

      case 'DEPARTMENT':
        // التحقق إذا كان الموظف في أحد الأقسام المحددة
        const employeeDept = await this.prisma.user.findUnique({
          where: { id: employeeId },
          select: { departmentId: true },
        });
        if (!employeeDept?.departmentId) return false;
        return holiday.assignments.some(
          (a: any) => a.assignmentType === 'DEPARTMENT' && a.departmentId === employeeDept.departmentId
        );

      case 'SPECIFIC_EMPLOYEES':
        // التحقق إذا كان الموظف في قائمة الموظفين المحددين
        return holiday.assignments.some(
          (a: any) => a.assignmentType === 'EMPLOYEE' && a.employeeId === employeeId
        );

      case 'EXCLUDE_EMPLOYEES':
        // العطلة تنطبق على الجميع ماعدا الموظفين المحددين
        const isExcluded = holiday.assignments.some(
          (a: any) => a.assignmentType === 'EMPLOYEE' && a.employeeId === employeeId
        );
        return !isExcluded;

      default:
        return true;
    }
  }

  /**
   * الحصول على العطلات المطبقة على موظف معين في فترة زمنية
   */
  async getEmployeeHolidaysInPeriod(
    employeeId: string,
    startDate: Date,
    endDate: Date,
    companyId: string
  ): Promise<Array<{ date: Date; holiday: EmployeeHolidayInfo['holiday'] }>> {
    const holidays: Array<{ date: Date; holiday: EmployeeHolidayInfo['holiday'] }> = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const holidayInfo = await this.getEmployeeHolidayInfo(currentDate, employeeId, companyId);
      if (holidayInfo.isHoliday && holidayInfo.holiday) {
        holidays.push({
          date: new Date(currentDate),
          holiday: holidayInfo.holiday,
        });
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return holidays;
  }

  /**
   * التحقق مما إذا كانت الشركة لا ترحل الإجازات
   * @returns true إذا كانت الشركة لا ترحل الإجازات (السنة تبدأ من الصفر)
   */
  async isLeaveCarryoverDisabled(companyId: string): Promise<boolean> {
    const setting = await this.getSetting('disableLeaveCarryover', companyId);
    return setting?.value === 'true';
  }
}

