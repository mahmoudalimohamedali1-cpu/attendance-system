"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceReviewsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const client_1 = require("@prisma/client");
let PerformanceReviewsService = class PerformanceReviewsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createCycle(companyId, dto) {
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
    async findAllCycles(companyId) {
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
    async findCycleById(companyId, id) {
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
            throw new common_1.NotFoundException('دورة التقييم غير موجودة');
        }
        return cycle;
    }
    async updateCycle(companyId, id, dto) {
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
    async startCycle(companyId, cycleId) {
        const cycle = await this.findCycleById(companyId, cycleId);
        if (cycle.status !== client_1.PerformanceReviewCycleStatus.DRAFT &&
            cycle.status !== client_1.PerformanceReviewCycleStatus.PLANNING) {
            throw new common_1.BadRequestException('لا يمكن تفعيل دورة تم تفعيلها مسبقاً');
        }
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
        const reviewsData = employees.map((emp) => ({
            companyId,
            cycleId,
            employeeId: emp.id,
            managerId: emp.managerId || emp.id,
            status: client_1.PerformanceReviewStatus.NOT_STARTED,
        }));
        await this.prisma.performanceReview.createMany({
            data: reviewsData,
            skipDuplicates: true,
        });
        return this.prisma.performanceReviewCycle.update({
            where: { id: cycleId },
            data: { status: client_1.PerformanceReviewCycleStatus.ACTIVE },
        });
    }
    async deleteCycle(companyId, id) {
        await this.findCycleById(companyId, id);
        await this.prisma.performanceReview.deleteMany({
            where: { cycleId: id },
        });
        return this.prisma.performanceReviewCycle.delete({ where: { id } });
    }
    async findAllReviews(companyId, cycleId) {
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
    async findReviewById(companyId, id) {
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
            throw new common_1.NotFoundException('التقييم غير موجود');
        }
        return review;
    }
    async getMyReview(userId, cycleId) {
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
            throw new common_1.NotFoundException('لم يتم العثور على تقييم لهذه الدورة');
        }
        return review;
    }
    async submitSelfReview(reviewId, userId, dto) {
        const review = await this.prisma.performanceReview.findFirst({
            where: { id: reviewId, employeeId: userId },
        });
        if (!review) {
            throw new common_1.NotFoundException('التقييم غير موجود أو ليس لك صلاحية');
        }
        if (review.selfSubmittedAt) {
            throw new common_1.BadRequestException('تم تقديم التقييم الذاتي مسبقاً');
        }
        return this.prisma.performanceReview.update({
            where: { id: reviewId },
            data: {
                selfRating: dto.selfRating,
                selfComments: dto.selfComments,
                selfAchievements: dto.selfAchievements,
                selfChallenges: dto.selfChallenges,
                selfSubmittedAt: new Date(),
                status: client_1.PerformanceReviewStatus.SELF_REVIEW,
            },
        });
    }
    async submitManagerReview(reviewId, managerId, dto) {
        const review = await this.prisma.performanceReview.findFirst({
            where: { id: reviewId, managerId },
        });
        if (!review) {
            throw new common_1.NotFoundException('التقييم غير موجود أو ليس لك صلاحية');
        }
        if (review.managerSubmittedAt) {
            throw new common_1.BadRequestException('تم تقديم تقييم المدير مسبقاً');
        }
        return this.prisma.performanceReview.update({
            where: { id: reviewId },
            data: {
                managerRating: dto.managerRating,
                managerComments: dto.managerComments,
                managerStrengths: dto.managerStrengths,
                managerImprovements: dto.managerImprovements,
                managerSubmittedAt: new Date(),
                status: client_1.PerformanceReviewStatus.MANAGER_REVIEW,
            },
        });
    }
    async calibrateReview(reviewId, calibratorId, dto) {
        const review = await this.prisma.performanceReview.findUnique({
            where: { id: reviewId },
        });
        if (!review) {
            throw new common_1.NotFoundException('التقييم غير موجود');
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
                status: client_1.PerformanceReviewStatus.CALIBRATION,
            },
        });
    }
    async acknowledgeReview(reviewId, userId, disagree, reason) {
        const review = await this.prisma.performanceReview.findFirst({
            where: { id: reviewId, employeeId: userId },
        });
        if (!review) {
            throw new common_1.NotFoundException('التقييم غير موجود');
        }
        return this.prisma.performanceReview.update({
            where: { id: reviewId },
            data: {
                employeeAcknowledged: true,
                employeeAcknowledgedAt: new Date(),
                employeeDisagreed: disagree,
                employeeDisagreeReason: reason,
                status: client_1.PerformanceReviewStatus.COMPLETED,
            },
        });
    }
    calculateNineBoxPosition(performance, potential) {
        const positions = {
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
        const key = `${potential}-${performance}`;
        return positions[key] || 'UNKNOWN';
    }
    async getNineBoxGrid(companyId, cycleId) {
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
        const grid = {
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
        reviews.forEach((r) => {
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
    async getCycleAnalytics(companyId, cycleId) {
        const reviews = await this.prisma.performanceReview.findMany({
            where: { companyId, cycleId },
        });
        const stats = {
            total: reviews.length,
            notStarted: reviews.filter((r) => r.status === client_1.PerformanceReviewStatus.NOT_STARTED).length,
            selfReview: reviews.filter((r) => r.status === client_1.PerformanceReviewStatus.SELF_REVIEW).length,
            managerReview: reviews.filter((r) => r.status === client_1.PerformanceReviewStatus.MANAGER_REVIEW).length,
            calibration: reviews.filter((r) => r.status === client_1.PerformanceReviewStatus.CALIBRATION).length,
            completed: reviews.filter((r) => r.status === client_1.PerformanceReviewStatus.COMPLETED).length,
        };
        const completionRate = reviews.length > 0
            ? ((stats.completed / reviews.length) * 100).toFixed(1)
            : 0;
        const ratingsWithFinal = reviews.filter((r) => r.finalRating);
        const avgRating = ratingsWithFinal.length > 0
            ? (ratingsWithFinal.reduce((sum, r) => sum + Number(r.finalRating), 0) / ratingsWithFinal.length).toFixed(2)
            : null;
        return {
            stats,
            completionRate,
            avgRating,
        };
    }
};
exports.PerformanceReviewsService = PerformanceReviewsService;
exports.PerformanceReviewsService = PerformanceReviewsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PerformanceReviewsService);
//# sourceMappingURL=performance-reviews.service.js.map