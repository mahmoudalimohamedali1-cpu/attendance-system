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
var StuckDetectionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StuckDetectionService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let StuckDetectionService = StuckDetectionService_1 = class StuckDetectionService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(StuckDetectionService_1.name);
    }
    async detectStuckSubmissions() {
        this.logger.log('🔍 بدء فحص التقديمات المعلقة...');
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
        const stuckMudad = await this.prisma.mudadSubmission.findMany({
            where: {
                status: 'SUBMITTED',
                submittedAt: { lt: threeDaysAgo },
            },
            include: {
                company: { select: { name: true } },
            },
        });
        const stuckWps = await this.prisma.wpsSubmission.findMany({
            where: {
                status: 'SUBMITTED',
                submittedAt: { lt: threeDaysAgo },
            },
            include: {
                company: { select: { name: true } },
            },
        });
        const totalStuck = stuckMudad.length + stuckWps.length;
        if (totalStuck === 0) {
            this.logger.log('✅ لا توجد تقديمات معلقة');
            return;
        }
        this.logger.warn(`⚠️ تم اكتشاف ${totalStuck} تقديم معلق!`);
        const companyNotifications = new Map();
        for (const submission of stuckMudad) {
            const existing = companyNotifications.get(submission.companyId) || { mudad: 0, wps: 0 };
            existing.mudad++;
            companyNotifications.set(submission.companyId, existing);
        }
        for (const submission of stuckWps) {
            const existing = companyNotifications.get(submission.companyId) || { mudad: 0, wps: 0 };
            existing.wps++;
            companyNotifications.set(submission.companyId, existing);
        }
        for (const [companyId, counts] of companyNotifications) {
            await this.createStuckAlert(companyId, counts.mudad, counts.wps);
        }
        this.logger.log(`📤 تم إرسال ${companyNotifications.size} تنبيه للشركات`);
    }
    async createStuckAlert(companyId, mudadCount, wpsCount) {
        const message = `⚠️ يوجد ${mudadCount + wpsCount} تقديم معلق (${mudadCount} مُدد، ${wpsCount} WPS) منذ أكثر من 3 أيام`;
        this.logger.warn(`تنبيه شركة ${companyId}: ${message}`);
    }
    async manualCheck() {
        await this.detectStuckSubmissions();
        return { message: 'تم الفحص' };
    }
    async getStuckStats() {
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
        const [mudadCount, wpsCount] = await Promise.all([
            this.prisma.mudadSubmission.count({
                where: { status: 'SUBMITTED', submittedAt: { lt: threeDaysAgo } },
            }),
            this.prisma.wpsSubmission.count({
                where: { status: 'SUBMITTED', submittedAt: { lt: threeDaysAgo } },
            }),
        ]);
        return {
            mudad: mudadCount,
            wps: wpsCount,
            total: mudadCount + wpsCount,
            threshold: '3 days',
        };
    }
};
exports.StuckDetectionService = StuckDetectionService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_6_HOURS),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], StuckDetectionService.prototype, "detectStuckSubmissions", null);
exports.StuckDetectionService = StuckDetectionService = StuckDetectionService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], StuckDetectionService);
//# sourceMappingURL=stuck-detection.service.js.map