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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceReviewsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const performance_reviews_service_1 = require("./performance-reviews.service");
const ai_goal_assistant_service_1 = require("./ai-goal-assistant.service");
const dto_1 = require("./dto");
let PerformanceReviewsController = class PerformanceReviewsController {
    constructor(performanceReviewsService, aiGoalAssistantService) {
        this.performanceReviewsService = performanceReviewsService;
        this.aiGoalAssistantService = aiGoalAssistantService;
    }
    async createCycle(req, dto) {
        return this.performanceReviewsService.createCycle(req.user.companyId, dto);
    }
    async findAllCycles(req) {
        return this.performanceReviewsService.findAllCycles(req.user.companyId);
    }
    async findCycleById(req, id) {
        return this.performanceReviewsService.findCycleById(req.user.companyId, id);
    }
    async updateCycle(req, id, dto) {
        return this.performanceReviewsService.updateCycle(req.user.companyId, id, dto);
    }
    async startCycle(req, id) {
        return this.performanceReviewsService.startCycle(req.user.companyId, id);
    }
    async deleteCycle(req, id) {
        return this.performanceReviewsService.deleteCycle(req.user.companyId, id);
    }
    async findAllReviews(req, cycleId) {
        return this.performanceReviewsService.findAllReviews(req.user.companyId, cycleId);
    }
    async findReviewById(req, id) {
        return this.performanceReviewsService.findReviewById(req.user.companyId, id);
    }
    async getMyReview(req, cycleId) {
        return this.performanceReviewsService.getMyReview(req.user.id, cycleId);
    }
    async submitSelfReview(req, id, dto) {
        return this.performanceReviewsService.submitSelfReview(id, req.user.id, dto);
    }
    async submitManagerReview(req, id, dto) {
        return this.performanceReviewsService.submitManagerReview(id, req.user.id, dto);
    }
    async calibrateReview(req, id, dto) {
        return this.performanceReviewsService.calibrateReview(id, req.user.id, dto);
    }
    async acknowledgeReview(req, id, body) {
        return this.performanceReviewsService.acknowledgeReview(id, req.user.id, body.disagree, body.reason);
    }
    async getNineBoxGrid(req, cycleId) {
        return this.performanceReviewsService.getNineBoxGrid(req.user.companyId, cycleId);
    }
    async getCycleAnalytics(req, cycleId) {
        return this.performanceReviewsService.getCycleAnalytics(req.user.companyId, cycleId);
    }
    async generateGoal(req, body) {
        return this.aiGoalAssistantService.generateGoal(body.prompt, body.context);
    }
    async generateOKR(req, body) {
        return this.aiGoalAssistantService.generateOKR(body.objective, body.context);
    }
};
exports.PerformanceReviewsController = PerformanceReviewsController;
__decorate([
    (0, common_1.Post)('cycles'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.CreateReviewCycleDto]),
    __metadata("design:returntype", Promise)
], PerformanceReviewsController.prototype, "createCycle", null);
__decorate([
    (0, common_1.Get)('cycles'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PerformanceReviewsController.prototype, "findAllCycles", null);
__decorate([
    (0, common_1.Get)('cycles/:id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PerformanceReviewsController.prototype, "findCycleById", null);
__decorate([
    (0, common_1.Put)('cycles/:id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, dto_1.UpdateReviewCycleDto]),
    __metadata("design:returntype", Promise)
], PerformanceReviewsController.prototype, "updateCycle", null);
__decorate([
    (0, common_1.Post)('cycles/:id/start'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PerformanceReviewsController.prototype, "startCycle", null);
__decorate([
    (0, common_1.Delete)('cycles/:id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PerformanceReviewsController.prototype, "deleteCycle", null);
__decorate([
    (0, common_1.Get)('reviews'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('cycleId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PerformanceReviewsController.prototype, "findAllReviews", null);
__decorate([
    (0, common_1.Get)('reviews/:id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PerformanceReviewsController.prototype, "findReviewById", null);
__decorate([
    (0, common_1.Get)('my-review/:cycleId'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('cycleId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PerformanceReviewsController.prototype, "getMyReview", null);
__decorate([
    (0, common_1.Post)('reviews/:id/self-review'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, dto_1.SubmitSelfReviewDto]),
    __metadata("design:returntype", Promise)
], PerformanceReviewsController.prototype, "submitSelfReview", null);
__decorate([
    (0, common_1.Post)('reviews/:id/manager-review'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, dto_1.SubmitManagerReviewDto]),
    __metadata("design:returntype", Promise)
], PerformanceReviewsController.prototype, "submitManagerReview", null);
__decorate([
    (0, common_1.Post)('reviews/:id/calibrate'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, dto_1.CalibrateReviewDto]),
    __metadata("design:returntype", Promise)
], PerformanceReviewsController.prototype, "calibrateReview", null);
__decorate([
    (0, common_1.Post)('reviews/:id/acknowledge'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], PerformanceReviewsController.prototype, "acknowledgeReview", null);
__decorate([
    (0, common_1.Get)('cycles/:id/nine-box-grid'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PerformanceReviewsController.prototype, "getNineBoxGrid", null);
__decorate([
    (0, common_1.Get)('cycles/:id/analytics'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PerformanceReviewsController.prototype, "getCycleAnalytics", null);
__decorate([
    (0, common_1.Post)('ai/generate-goal'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PerformanceReviewsController.prototype, "generateGoal", null);
__decorate([
    (0, common_1.Post)('ai/generate-okr'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PerformanceReviewsController.prototype, "generateOKR", null);
exports.PerformanceReviewsController = PerformanceReviewsController = __decorate([
    (0, common_1.Controller)('performance-reviews'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [performance_reviews_service_1.PerformanceReviewsService,
        ai_goal_assistant_service_1.AiGoalAssistantService])
], PerformanceReviewsController);
//# sourceMappingURL=performance-reviews.controller.js.map