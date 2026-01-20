import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { StartBreakDto, EndBreakDto } from '../dto/break.dto';
import { BreakStatus, BreakType } from '@prisma/client';

@Injectable()
export class BreaksService {
    constructor(private prisma: PrismaService) { }

    /**
     * بدء استراحة جديدة
     * Start a new break
     */
    async startBreak(userId: string, companyId: string, dto: StartBreakDto) {
        // التحقق من وجود سجل حضور نشط
        const attendance = await this.prisma.attendance.findFirst({
            where: {
                id: dto.attendanceId,
                userId,
                companyId,
                checkOutTime: null, // لم ينصرف بعد
            },
        });

        if (!attendance) {
            throw new NotFoundException('لم يتم العثور على سجل حضور نشط');
        }

        // التحقق من عدم وجود استراحة نشطة
        const activeBreak = await this.prisma.break.findFirst({
            where: {
                attendanceId: dto.attendanceId,
                userId,
                status: 'ACTIVE',
            },
        });

        if (activeBreak) {
            throw new BadRequestException('يوجد استراحة نشطة بالفعل. يرجى إنهاؤها أولاً');
        }

        // إنشاء استراحة جديدة
        const breakRecord = await this.prisma.break.create({
            data: {
                companyId,
                attendanceId: dto.attendanceId,
                userId,
                type: dto.type || BreakType.PERSONAL,
                status: BreakStatus.ACTIVE,
                startTime: new Date(),
                notes: dto.notes,
                // الاستراحات المدفوعة: الصلاة فقط (افتراضياً)
                isPaid: dto.type === BreakType.PRAYER,
            },
        });

        return {
            success: true,
            message: 'تم بدء الاستراحة بنجاح',
            break: breakRecord,
        };
    }

    /**
     * إنهاء استراحة نشطة
     * End an active break
     */
    async endBreak(userId: string, breakId: string, dto?: EndBreakDto) {
        // البحث عن الاستراحة
        const breakRecord = await this.prisma.break.findFirst({
            where: {
                id: breakId,
                userId,
                status: 'ACTIVE',
            },
        });

        if (!breakRecord) {
            throw new NotFoundException('لم يتم العثور على استراحة نشطة');
        }

        // حساب مدة الاستراحة بالدقائق
        const endTime = new Date();
        const durationMinutes = Math.floor(
            (endTime.getTime() - breakRecord.startTime.getTime()) / 60000
        );

        // تحديث الاستراحة
        const updatedBreak = await this.prisma.break.update({
            where: { id: breakId },
            data: {
                endTime,
                durationMinutes,
                status: BreakStatus.COMPLETED,
                notes: dto?.notes || breakRecord.notes,
            },
        });

        return {
            success: true,
            message: `تم إنهاء الاستراحة. المدة: ${durationMinutes} دقيقة`,
            break: updatedBreak,
        };
    }

    /**
     * الحصول على استراحات سجل حضور معين
     * Get breaks for a specific attendance record
     */
    async getBreaksByAttendance(attendanceId: string, userId: string) {
        const breaks = await this.prisma.break.findMany({
            where: {
                attendanceId,
                userId,
            },
            orderBy: { startTime: 'asc' },
        });

        // حساب الإجماليات
        const totalBreakMinutes = breaks
            .filter(b => b.status === 'COMPLETED')
            .reduce((sum, b) => sum + (b.durationMinutes || 0), 0);

        const paidBreakMinutes = breaks
            .filter(b => b.status === 'COMPLETED' && b.isPaid)
            .reduce((sum, b) => sum + (b.durationMinutes || 0), 0);

        const unpaidBreakMinutes = totalBreakMinutes - paidBreakMinutes;

        return {
            breaks,
            summary: {
                totalBreaks: breaks.length,
                completedBreaks: breaks.filter(b => b.status === 'COMPLETED').length,
                activeBreaks: breaks.filter(b => b.status === 'ACTIVE').length,
                totalBreakMinutes,
                paidBreakMinutes,
                unpaidBreakMinutes, // هذه ستُخصم من ساعات العمل
            },
        };
    }

    /**
     * الحصول على الاستراحة النشطة للموظف
     * Get active break for an employee
     */
    async getActiveBreak(userId: string) {
        return this.prisma.break.findFirst({
            where: {
                userId,
                status: 'ACTIVE',
            },
            include: {
                attendance: {
                    select: { id: true, date: true },
                },
            },
        });
    }

    /**
     * إلغاء استراحة نشطة
     * Cancel an active break
     */
    async cancelBreak(userId: string, breakId: string) {
        const breakRecord = await this.prisma.break.findFirst({
            where: {
                id: breakId,
                userId,
                status: 'ACTIVE',
            },
        });

        if (!breakRecord) {
            throw new NotFoundException('لم يتم العثور على استراحة نشطة');
        }

        const cancelled = await this.prisma.break.update({
            where: { id: breakId },
            data: { status: BreakStatus.CANCELLED },
        });

        return {
            success: true,
            message: 'تم إلغاء الاستراحة',
            break: cancelled,
        };
    }

    /**
     * حساب إجمالي الاستراحات غير المدفوعة لسجل حضور
     * Calculate total unpaid break minutes for an attendance record
     */
    async getUnpaidBreakMinutes(attendanceId: string): Promise<number> {
        const result = await this.prisma.break.aggregate({
            where: {
                attendanceId,
                status: 'COMPLETED',
                isPaid: false,
            },
            _sum: {
                durationMinutes: true,
            },
        });

        return result._sum.durationMinutes || 0;
    }
}
