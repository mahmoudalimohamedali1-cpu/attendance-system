import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

/**
 * خدمة إعادة حساب الرواتب
 */
@Injectable()
export class PayrollRecalculationService {
  private readonly logger = new Logger(PayrollRecalculationService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * إنشاء طلب إعادة حساب
   */
  async createRecalculationRequest(
    dto: any,
    requestedById: string,
    companyId: string,
  ): Promise<any> {
    const period = await this.prisma.payrollPeriod.findFirst({
      where: {
        companyId,
        year: dto.periodYear,
        month: dto.periodMonth,
      },
    });

    if (!period) {
      throw new NotFoundException('الفترة المحددة غير موجودة');
    }

    const now = new Date();
    const effectiveDate = new Date(dto.periodYear, dto.periodMonth - 1, 1);

    const request = await this.prisma.retroPay.create({
      data: {
        companyId,
        employeeId: dto.employeeId || requestedById,
        reason: `طلب إعادة حساب: ${dto.reason}`,
        effectiveFrom: effectiveDate,
        effectiveTo: effectiveDate,
        oldAmount: 0,
        newAmount: 0,
        difference: 0,
        monthsCount: 1,
        totalAmount: 0,
        status: 'PENDING',
        notes: JSON.stringify({
          recalculationType: dto.recalculationType,
          scope: dto.scope || 'SINGLE_EMPLOYEE',
          affectedComponents: dto.affectedComponents,
          requestedById,
          requestedAt: now,
        }),
        createdById: requestedById,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        companyId,
        userId: requestedById,
        action: 'CREATE',
        entity: 'RECALCULATION',
        entityId: request.id,
        description: `طلب إعادة حساب للفترة ${dto.periodYear}/${dto.periodMonth}`,
      },
    });

    this.logger.log(`Created recalculation request: ${request.id}`);

    return {
      id: request.id,
      status: 'PENDING',
      periodYear: dto.periodYear,
      periodMonth: dto.periodMonth,
      reason: dto.reason,
      createdAt: request.createdAt,
    };
  }

  /**
   * الموافقة على طلب إعادة حساب
   */
  async approveRecalculation(
    dto: any,
    approvedById: string,
    companyId: string,
  ): Promise<any> {
    const request = await this.prisma.retroPay.findFirst({
      where: {
        id: dto.requestId,
        companyId,
        status: 'PENDING',
        reason: { startsWith: 'طلب إعادة حساب:' },
      },
    });

    if (!request) {
      throw new NotFoundException('طلب إعادة الحساب غير موجود');
    }

    const metadata = this.parseMetadata(request.notes);

    // تحديث حالة الطلب
    await this.prisma.retroPay.update({
      where: { id: dto.requestId },
      data: {
        status: 'APPROVED',
        approvedById,
        approvedAt: new Date(),
        notes: JSON.stringify({
          ...metadata,
          approvedById,
          approvedAt: new Date(),
          notes: dto.notes,
        }),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        companyId,
        userId: approvedById,
        action: 'UPDATE',
        entity: 'RECALCULATION',
        entityId: dto.requestId,
        description: 'تمت الموافقة على طلب إعادة الحساب',
      },
    });

    return {
      requestId: dto.requestId,
      status: 'APPROVED',
      message: 'تمت الموافقة على طلب إعادة الحساب',
    };
  }

  /**
   * جلب طلبات إعادة الحساب
   */
  async getRecalculationRequests(companyId: string, status?: string): Promise<any[]> {
    const requests = await this.prisma.retroPay.findMany({
      where: {
        companyId,
        reason: { startsWith: 'طلب إعادة حساب:' },
        ...(status && { status: status as any }),
      },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return requests.map(r => ({
      id: r.id,
      reason: r.reason.replace('طلب إعادة حساب: ', ''),
      status: r.status,
      metadata: this.parseMetadata(r.notes),
      employee: r.employee,
      createdAt: r.createdAt,
      approvedAt: r.approvedAt,
    }));
  }

  /**
   * رفض طلب إعادة حساب
   */
  async rejectRecalculation(
    requestId: string,
    rejectedById: string,
    reason: string,
    companyId: string,
  ): Promise<any> {
    const request = await this.prisma.retroPay.findFirst({
      where: {
        id: requestId,
        companyId,
        status: 'PENDING',
      },
    });

    if (!request) {
      throw new NotFoundException('طلب إعادة الحساب غير موجود');
    }

    const metadata = this.parseMetadata(request.notes);

    await this.prisma.retroPay.update({
      where: { id: requestId },
      data: {
        status: 'CANCELLED',
        notes: JSON.stringify({
          ...metadata,
          rejectedById,
          rejectedAt: new Date(),
          rejectionReason: reason,
        }),
      },
    });

    return { id: requestId, status: 'REJECTED', reason };
  }

  /**
   * فحص الحاجة لإعادة الحساب
   */
  async checkForRequiredRecalculations(companyId: string): Promise<any[]> {
    const requiredRecalculations: any[] = [];

    const closedPeriods = await this.prisma.payrollPeriod.findMany({
      where: {
        companyId,
        status: { in: ['FINANCE_APPROVED', 'PAID'] },
      },
      orderBy: { year: 'desc' },
      take: 12,
    });

    for (const period of closedPeriods) {
      // التحقق من وجود RetroPay entries بعد إغلاق الفترة
      const retroPayCount = await this.prisma.retroPay.count({
        where: {
          companyId,
          effectiveFrom: {
            gte: new Date(period.year, period.month - 1, 1),
            lt: new Date(period.year, period.month, 1),
          },
          createdAt: { gt: period.updatedAt },
        },
      });

      if (retroPayCount > 0) {
        requiredRecalculations.push({
          periodId: period.id,
          periodYear: period.year,
          periodMonth: period.month,
          reasons: { retroPayEntries: retroPayCount },
          suggestedAction: 'RECALCULATION_RECOMMENDED',
        });
      }
    }

    return requiredRecalculations;
  }

  private parseMetadata(value: string | null): any {
    if (!value) return {};
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
}
