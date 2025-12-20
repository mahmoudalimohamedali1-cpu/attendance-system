import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreatePayrollPeriodDto } from './dto/create-payroll-period.dto';

@Injectable()
export class PayrollPeriodsService {
    constructor(private prisma: PrismaService) { }

    async create(dto: CreatePayrollPeriodDto, companyId: string) {
        const existing = await this.prisma.payrollPeriod.findFirst({
            where: {
                companyId,
                month: dto.month,
                year: dto.year
            }
        });
        if (existing) throw new ConflictException('فترة الرواتب لهذا الشهر والسنة موجودة بالفعل في هذه الشركة');

        return this.prisma.payrollPeriod.create({
            data: {
                companyId,
                month: dto.month,
                year: dto.year,
                startDate: new Date(dto.startDate),
                endDate: new Date(dto.endDate),
                status: 'DRAFT',
            }
        });
    }

    async findAll(companyId: string) {
        return this.prisma.payrollPeriod.findMany({
            where: { companyId },
            orderBy: [{ year: 'desc' }, { month: 'desc' }],
            include: {
                _count: { select: { payslips: true } }
            }
        });
    }

    async findOne(id: string, companyId: string) {
        const period = await this.prisma.payrollPeriod.findFirst({
            where: { id, companyId },
            include: {
                runs: true,
                payslips: {
                    include: {
                        employee: true
                    }
                }
            }
        });
        if (!period) throw new NotFoundException('فترة الرواتب غير موجودة');
        return period;
    }

    async updateStatus(id: string, companyId: string, status: any) {
        return this.prisma.payrollPeriod.updateMany({
            where: { id, companyId },
            data: { status }
        });
    }
}
