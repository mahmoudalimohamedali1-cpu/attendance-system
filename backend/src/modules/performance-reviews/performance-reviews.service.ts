import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
    CreateReviewCycleDto,
    UpdateReviewCycleDto,
    SubmitSelfReviewDto,
    SubmitManagerReviewDto,
    CalibrateReviewDto,
} from './dto';
import {
    PerformanceReviewCycleStatus,
    PerformanceReviewStatus,
    PerformanceReview,
} from '@prisma/client';

type NineBoxPositionKey = '1-1' | '1-2' | '1-3' | '2-1' | '2-2' | '2-3' | '3-1' | '3-2' | '3-3';

@Injectable()
export class PerformanceReviewsService {
    constructor(private readonly prisma: PrismaService) { }

    // ==================== Review Cycles ====================

    async createCycle(companyId: string, dto: CreateReviewCycleDto) {
        return this.prisma.performanceReviewCycle.create({
            data: {
                companyId,
                name: dto.name,
                nameEn: dto.nameEn,
                type: dto.type,
                periodStart: new Date(dto.periodStart),
                periodEnd: new Date(dto.periodEnd),
                selfReviewStart: dto.selfReviewStart ? new Date(dto.selfReviewStart) : null,
                selfReviewEnd: dto.selfReviewEnd ? new Date(dto.selfReviewEnd) : null,
                managerReviewStart: dto.managerReviewStart ? new Date(dto.managerReviewStart) : null,
                managerReviewEnd: dto.managerReviewEnd ? new Date(dto.managerReviewEnd) : null,
                feedbackStart: dto.feedbackStart ? new Date(dto.feedbackStart) : null,
                feedbackEnd: dto.feedbackEnd ? new Date(dto.feedbackEnd) : null,
                calibrationStart: dto.calibrationStart ? new Date(dto.calibrationStart) : null,
                calibrationEnd: dto.calibrationEnd ? new Date(dto.calibrationEnd) : null,
                includeSelfReview: dto.includeSelfReview ?? true,
                include360Feedback: dto.include360Feedback ?? false,
                includeGoalRating: dto.includeGoalRating ?? true,
                includeCompetencyRating: dto.includeCompetencyRating ?? true,
                goalWeight: dto.goalWeight ?? 40,
                competencyWeight: dto.competencyWeight ?? 40,
                valueWeight: dto.valueWeight ?? 20,
                competencyFrameworkId: dto.competencyFrameworkId,
            },
        });
    }

    async findAllCycles(companyId: string) {
        return this.prisma.performanceReviewCycle.findMany({
            where: { companyId },
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { reviews: true },
                },
            },
        });
    }

    async findCycleById(companyId: string, id: string) {
        const cycle = await this.prisma.performanceReviewCycle.findFirst({
            where: { id, companyId },
            include: {
                reviews: {
                    select: {
                        id: true,
                        employeeId: true,
                        managerId: true,
                        status: true,
                        finalRating: true,
                        nineBoxPosition: true,
                    },
                },
            },
        });

        if (!cycle) {
            throw new NotFoundException('دورة التقييم غير موجودة');
        }

        return cycle;
    }

    async updateCycle(companyId: string, id: string, dto: UpdateReviewCycleDto) {
        await this.findCycleById(companyId, id);

        return this.prisma.performanceReviewCycle.update({
            where: { id },
            data: {
                ...dto,
                periodStart: dto.periodStart ? new Date(dto.periodStart) : undefined,
                periodEnd: dto.periodEnd ? new Date(dto.periodEnd) : undefined,
                selfReviewStart: dto.selfReviewStart ? new Date(dto.selfReviewStart) : undefined,
                selfReviewEnd: dto.selfReviewEnd ? new Date(dto.selfReviewEnd) : undefined,
                managerReviewStart: dto.managerReviewStart ? new Date(dto.managerReviewStart) : undefined,
                managerReviewEnd: dto.managerReviewEnd ? new Date(dto.managerReviewEnd) : undefined,
                feedbackStart: dto.feedbackStart ? new Date(dto.feedbackStart) : undefined,
                feedbackEnd: dto.feedbackEnd ? new Date(dto.feedbackEnd) : undefined,
                calibrationStart: dto.calibrationStart ? new Date(dto.calibrationStart) : undefined,
                calibrationEnd: dto.calibrationEnd ? new Date(dto.calibrationEnd) : undefined,
            },
        });
    }

    async startCycle(companyId: string, cycleId: string) {
        const cycle = await this.findCycleById(companyId, cycleId);

        if (cycle.status !== PerformanceReviewCycleStatus.DRAFT &&
            cycle.status !== PerformanceReviewCycleStatus.PLANNING) {
            throw new BadRequestException('لا يمكن تفعيل دورة تم تفعيلها مسبقاً');
        }

        // جلب جميع الموظفين النشطين
        const employees = await this.prisma.user.findMany({
            where: {
                companyId,
                status: 'ACTIVE',
                role: { in: ['EMPLOYEE', 'MANAGER', 'HR'] },
            },
            select: {
                id: true,
                managerId: true,
            },
        });

        // إنشاء تقييم لكل موظف
        const reviewsData = employees.map((emp: { id: string; managerId: string | null }) => ({
            companyId,
            cycleId,
            employeeId: emp.id,
            managerId: emp.managerId || emp.id, // إذا لم يكن له مدير، يُقيّم نفسه
            status: PerformanceReviewStatus.NOT_STARTED,
        }));

        await this.prisma.performanceReview.createMany({
            data: reviewsData,
            skipDuplicates: true,
        });

        // تحديث حالة الدورة
        return this.prisma.performanceReviewCycle.update({
            where: { id: cycleId },
            data: { status: PerformanceReviewCycleStatus.ACTIVE },
        });
    }

    async deleteCycle(companyId: string, id: string) {
        await this.findCycleById(companyId, id);

        // Delete all related reviews first, then the cycle
        await this.prisma.performanceReview.deleteMany({
            where: { cycleId: id },
        });

        return this.prisma.performanceReviewCycle.delete({ where: { id } });
    }

    // ==================== Individual Reviews ====================

    async findAllReviews(companyId: string, cycleId?: string) {
        return this.prisma.performanceReview.findMany({
            where: {
                companyId,
                ...(cycleId && { cycleId }),
            },
            include: {
                cycle: {
                    select: { name: true, type: true, status: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findReviewById(companyId: string, id: string) {
        const review = await this.prisma.performanceReview.findFirst({
            where: { id, companyId },
            include: {
                cycle: true,
                goalRatings: {
                    include: { goal: true },
                },
                competencyRatings: {
                    include: { competency: true },
                },
                feedbackRequests: {
                    include: { responses: true },
                },
                developmentPlan: {
                    include: { goals: true },
                },
            },
        });

        if (!review) {
            throw new NotFoundException('التقييم غير موجود');
        }

        return review;
    }

    async getMyReview(userId: string, cycleId: string) {
        const review = await this.prisma.performanceReview.findFirst({
            where: {
                employeeId: userId,
                cycleId,
            },
            include: {
                cycle: true,
                goalRatings: {
                    include: { goal: true },
                },
                competencyRatings: {
                    include: { competency: true },
                },
            },
        });

        if (!review) {
            throw new NotFoundException('لم يتم العثور على تقييم لهذه الدورة');
        }

        return review;
    }

    async submitSelfReview(reviewId: string, userId: string, dto: SubmitSelfReviewDto) {
        const review = await this.prisma.performanceReview.findFirst({
            where: { id: reviewId, employeeId: userId },
        });

        if (!review) {
            throw new NotFoundException('التقييم غير موجود أو ليس لك صلاحية');
        }

        if (review.selfSubmittedAt) {
            throw new BadRequestException('تم تقديم التقييم الذاتي مسبقاً');
        }

        return this.prisma.performanceReview.update({
            where: { id: reviewId },
            data: {
                selfRating: dto.selfRating,
                selfComments: dto.selfComments,
                selfAchievements: dto.selfAchievements,
                selfChallenges: dto.selfChallenges,
                selfSubmittedAt: new Date(),
                status: PerformanceReviewStatus.SELF_REVIEW,
            },
        });
    }

    async submitManagerReview(reviewId: string, managerId: string, dto: SubmitManagerReviewDto) {
        const review = await this.prisma.performanceReview.findFirst({
            where: { id: reviewId, managerId },
        });

        if (!review) {
            throw new NotFoundException('التقييم غير موجود أو ليس لك صلاحية');
        }

        if (review.managerSubmittedAt) {
            throw new BadRequestException('تم تقديم تقييم المدير مسبقاً');
        }

        return this.prisma.performanceReview.update({
            where: { id: reviewId },
            data: {
                managerRating: dto.managerRating,
                managerComments: dto.managerComments,
                managerStrengths: dto.managerStrengths,
                managerImprovements: dto.managerImprovements,
                managerSubmittedAt: new Date(),
                status: PerformanceReviewStatus.MANAGER_REVIEW,
            },
        });
    }

    async calibrateReview(reviewId: string, calibratorId: string, dto: CalibrateReviewDto) {
        const review = await this.prisma.performanceReview.findUnique({
            where: { id: reviewId },
        });

        if (!review) {
            throw new NotFoundException('التقييم غير موجود');
        }

        const nineBoxPosition = this.calculateNineBoxPosition(dto.performanceScore, dto.potentialScore);

        return this.prisma.performanceReview.update({
            where: { id: reviewId },
            data: {
                finalRating: dto.finalRating,
                finalComments: dto.finalComments,
                calibrationNotes: dto.calibrationNotes,
                performanceScore: dto.performanceScore,
                potentialScore: dto.potentialScore,
                nineBoxPosition,
                calibratedBy: calibratorId,
                calibratedAt: new Date(),
                status: PerformanceReviewStatus.CALIBRATION,
            },
        });
    }

    async acknowledgeReview(reviewId: string, userId: string, disagree: boolean, reason?: string) {
        const review = await this.prisma.performanceReview.findFirst({
            where: { id: reviewId, employeeId: userId },
        });

        if (!review) {
            throw new NotFoundException('التقييم غير موجود');
        }

        return this.prisma.performanceReview.update({
            where: { id: reviewId },
            data: {
                employeeAcknowledged: true,
                employeeAcknowledgedAt: new Date(),
                employeeDisagreed: disagree,
                employeeDisagreeReason: reason,
                status: PerformanceReviewStatus.COMPLETED,
            },
        });
    }

    // ==================== 9-Box Grid ====================

    private calculateNineBoxPosition(performance: number, potential: number): string {
        const positions: Record<NineBoxPositionKey, string> = {
            '1-1': 'UNDERPERFORMER',
            '1-2': 'INCONSISTENT',
            '1-3': 'POTENTIAL_GEM',
            '2-1': 'SOLID_PERFORMER',
            '2-2': 'CORE_PLAYER',
            '2-3': 'HIGH_POTENTIAL',
            '3-1': 'ENIGMA',
            '3-2': 'FUTURE_STAR',
            '3-3': 'STAR',
        };

        const key = `${potential}-${performance}` as NineBoxPositionKey;
        return positions[key] || 'UNKNOWN';
    }

    async getNineBoxGrid(companyId: string, cycleId: string) {
        const reviews = await this.prisma.performanceReview.findMany({
            where: {
                companyId,
                cycleId,
                nineBoxPosition: { not: null },
            },
            select: {
                id: true,
                employeeId: true,
                performanceScore: true,
                potentialScore: true,
                nineBoxPosition: true,
                finalRating: true,
            },
        });

        // تجميع الموظفين حسب موقعهم في الـ Grid
        const grid: Record<string, string[]> = {
            STAR: [],
            FUTURE_STAR: [],
            HIGH_POTENTIAL: [],
            ENIGMA: [],
            CORE_PLAYER: [],
            POTENTIAL_GEM: [],
            SOLID_PERFORMER: [],
            INCONSISTENT: [],
            UNDERPERFORMER: [],
        };

        reviews.forEach((r: { nineBoxPosition: string | null; employeeId: string }) => {
            if (r.nineBoxPosition && grid[r.nineBoxPosition]) {
                grid[r.nineBoxPosition].push(r.employeeId);
            }
        });

        return {
            grid,
            totalReviews: reviews.length,
            distribution: Object.entries(grid).map(([position, employees]) => ({
                position,
                count: employees.length,
                percentage: reviews.length > 0 ? ((employees.length / reviews.length) * 100).toFixed(1) : 0,
            })),
        };
    }

    // ==================== Analytics ====================

    async getCycleAnalytics(companyId: string, cycleId: string) {
        const reviews = await this.prisma.performanceReview.findMany({
            where: { companyId, cycleId },
        });

        const stats = {
            total: reviews.length,
            notStarted: reviews.filter((r: PerformanceReview) => r.status === PerformanceReviewStatus.NOT_STARTED).length,
            selfReview: reviews.filter((r: PerformanceReview) => r.status === PerformanceReviewStatus.SELF_REVIEW).length,
            managerReview: reviews.filter((r: PerformanceReview) => r.status === PerformanceReviewStatus.MANAGER_REVIEW).length,
            calibration: reviews.filter((r: PerformanceReview) => r.status === PerformanceReviewStatus.CALIBRATION).length,
            completed: reviews.filter((r: PerformanceReview) => r.status === PerformanceReviewStatus.COMPLETED).length,
        };

        const completionRate = reviews.length > 0
            ? ((stats.completed / reviews.length) * 100).toFixed(1)
            : 0;

        // حساب متوسط التقييمات
        const ratingsWithFinal = reviews.filter((r: PerformanceReview) => r.finalRating);
        const avgRating = ratingsWithFinal.length > 0
            ? (ratingsWithFinal.reduce((sum: number, r: PerformanceReview) => sum + Number(r.finalRating), 0) / ratingsWithFinal.length).toFixed(2)
            : null;

        return {
            stats,
            completionRate,
            avgRating,
        };
    }
}
