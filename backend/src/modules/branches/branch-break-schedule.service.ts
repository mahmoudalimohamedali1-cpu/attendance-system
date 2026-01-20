import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * أنواع الاستراحات الثابتة
 */
export enum ScheduledBreakType {
    DHUHR_PRAYER = 'DHUHR_PRAYER',
    ASR_PRAYER = 'ASR_PRAYER',
    LUNCH = 'LUNCH',
    REST = 'REST',
    OTHER = 'OTHER',
}

export interface CreateBreakScheduleDto {
    name: string;
    nameEn?: string;
    type?: ScheduledBreakType;
    startTime: string;
    endTime: string;
    durationMinutes?: number;
    isPaid?: boolean;
    applicableDays?: string;
    isActive?: boolean;
    sortOrder?: number;
}

export interface UpdateBreakScheduleDto extends Partial<CreateBreakScheduleDto> { }

@Injectable()
export class BranchBreakScheduleService {
    constructor(private prisma: PrismaService) { }

    /**
     * إنشاء جدول استراحة جديد للفرع
     */
    async create(branchId: string, companyId: string, dto: CreateBreakScheduleDto) {
        // حساب المدة تلقائياً إن لم تُحدد
        let duration = dto.durationMinutes;
        if (!duration && dto.startTime && dto.endTime) {
            const [startH, startM] = dto.startTime.split(':').map(Number);
            const [endH, endM] = dto.endTime.split(':').map(Number);
            duration = (endH * 60 + endM) - (startH * 60 + startM);
        }

        return this.prisma.branchBreakSchedule.create({
            data: {
                branchId,
                companyId,
                name: dto.name,
                nameEn: dto.nameEn,
                type: dto.type || ScheduledBreakType.OTHER,
                startTime: dto.startTime,
                endTime: dto.endTime,
                durationMinutes: duration || 30,
                isPaid: dto.isPaid ?? true,
                applicableDays: dto.applicableDays,
                isActive: dto.isActive ?? true,
                sortOrder: dto.sortOrder || 0,
            },
        });
    }

    /**
     * الحصول على جميع استراحات الفرع
     */
    async findByBranch(branchId: string) {
        return this.prisma.branchBreakSchedule.findMany({
            where: { branchId, isActive: true },
            orderBy: { sortOrder: 'asc' },
        });
    }

    /**
     * الحصول على استراحات فرع ليوم معين
     */
    async findByBranchAndDay(branchId: string, dayOfWeek: number) {
        const breaks = await this.prisma.branchBreakSchedule.findMany({
            where: { branchId, isActive: true },
            orderBy: { sortOrder: 'asc' },
        });

        // فلترة حسب اليوم
        return breaks.filter(b => {
            if (!b.applicableDays) return true; // كل الأيام
            const days = b.applicableDays.split(',').map(Number);
            return days.includes(dayOfWeek);
        });
    }

    /**
     * تحديث جدول استراحة
     */
    async update(id: string, companyId: string, dto: UpdateBreakScheduleDto) {
        const existing = await this.prisma.branchBreakSchedule.findFirst({
            where: { id, companyId },
        });

        if (!existing) {
            throw new NotFoundException('جدول الاستراحة غير موجود');
        }

        // إعادة حساب المدة إن تغيرت الأوقات
        let duration = dto.durationMinutes;
        if (!duration && (dto.startTime || dto.endTime)) {
            const startTime = dto.startTime || existing.startTime;
            const endTime = dto.endTime || existing.endTime;
            const [startH, startM] = startTime.split(':').map(Number);
            const [endH, endM] = endTime.split(':').map(Number);
            duration = (endH * 60 + endM) - (startH * 60 + startM);
        }

        return this.prisma.branchBreakSchedule.update({
            where: { id },
            data: {
                ...dto,
                durationMinutes: duration,
            },
        });
    }

    /**
     * حذف جدول استراحة
     */
    async delete(id: string, companyId: string) {
        const existing = await this.prisma.branchBreakSchedule.findFirst({
            where: { id, companyId },
        });

        if (!existing) {
            throw new NotFoundException('جدول الاستراحة غير موجود');
        }

        await this.prisma.branchBreakSchedule.delete({ where: { id } });
        return { success: true, message: 'تم حذف جدول الاستراحة' };
    }

    /**
     * حساب إجمالي دقائق الاستراحات المدفوعة لفرع
     */
    async getTotalPaidBreakMinutes(branchId: string, dayOfWeek?: number): Promise<number> {
        const breaks = dayOfWeek !== undefined
            ? await this.findByBranchAndDay(branchId, dayOfWeek)
            : await this.findByBranch(branchId);

        return breaks
            .filter(b => b.isPaid)
            .reduce((sum, b) => sum + b.durationMinutes, 0);
    }

    /**
     * حساب إجمالي دقائق الاستراحات غير المدفوعة لفرع
     */
    async getTotalUnpaidBreakMinutes(branchId: string, dayOfWeek?: number): Promise<number> {
        const breaks = dayOfWeek !== undefined
            ? await this.findByBranchAndDay(branchId, dayOfWeek)
            : await this.findByBranch(branchId);

        return breaks
            .filter(b => !b.isPaid)
            .reduce((sum, b) => sum + b.durationMinutes, 0);
    }

    /**
     * إنشاء استراحات افتراضية لفرع جديد
     */
    async createDefaultBreaks(branchId: string, companyId: string) {
        const defaults = [
            { name: 'صلاة الظهر', nameEn: 'Dhuhr Prayer', type: ScheduledBreakType.DHUHR_PRAYER, startTime: '12:00', endTime: '12:30', isPaid: true, sortOrder: 1 },
            { name: 'استراحة الغداء', nameEn: 'Lunch Break', type: ScheduledBreakType.LUNCH, startTime: '13:00', endTime: '14:00', isPaid: false, sortOrder: 2 },
            { name: 'صلاة العصر', nameEn: 'Asr Prayer', type: ScheduledBreakType.ASR_PRAYER, startTime: '15:30', endTime: '16:00', isPaid: true, sortOrder: 3 },
        ];

        for (const def of defaults) {
            await this.create(branchId, companyId, def);
        }

        return { success: true, message: 'تم إنشاء الاستراحات الافتراضية' };
    }
}
