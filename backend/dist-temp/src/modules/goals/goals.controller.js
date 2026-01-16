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
exports.GoalsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const goals_service_1 = require("./goals.service");
const client_1 = require("@prisma/client");
let GoalsController = class GoalsController {
    constructor(goalsService) {
        this.goalsService = goalsService;
    }
    async create(req, dto) {
        return this.goalsService.create(req.user.companyId, req.user.id, dto);
    }
    async findAll(req, ownerId, type, status) {
        return this.goalsService.findAll(req.user.companyId, { ownerId, type, status });
    }
    async getMyGoals(req) {
        return this.goalsService.getMyGoals(req.user.companyId, req.user.id);
    }
    async getTeamGoals(req) {
        return this.goalsService.getTeamGoals(req.user.companyId, req.user.id);
    }
    async getCompanyGoals(req) {
        return this.goalsService.getCompanyGoals(req.user.companyId);
    }
    async getAvailableDataSources() {
        return this.goalsService.getAvailableDataSources();
    }
    async syncAllAutoCalculatedGoals(req) {
        return this.goalsService.syncAllAutoCalculatedGoals(req.user.companyId);
    }
    async findById(req, id) {
        return this.goalsService.findById(req.user.companyId, id);
    }
    async update(req, id, dto) {
        return this.goalsService.update(req.user.companyId, id, dto);
    }
    async delete(req, id) {
        return this.goalsService.delete(req.user.companyId, id);
    }
    async submitForApproval(req, id) {
        return this.goalsService.submitForApproval(req.user.companyId, id);
    }
    async approveGoal(req, id) {
        return this.goalsService.approveGoal(req.user.companyId, id, req.user.id);
    }
    async rejectGoal(req, id, body) {
        return this.goalsService.rejectGoal(req.user.companyId, id, body.reason);
    }
    async createCheckIn(req, id, dto) {
        return this.goalsService.createCheckIn(req.user.companyId, id, req.user.id, dto);
    }
    async getCheckIns(req, id) {
        return this.goalsService.getCheckIns(req.user.companyId, id);
    }
    async addKeyResult(req, goalId, dto) {
        return this.goalsService.addKeyResult(req.user.companyId, goalId, dto);
    }
    async updateKeyResult(id, dto) {
        return this.goalsService.updateKeyResult(id, dto);
    }
    async deleteKeyResult(id) {
        return this.goalsService.deleteKeyResult(id);
    }
    async checkInKeyResult(req, id, dto) {
        return this.goalsService.checkInKeyResult(id, req.user.id, dto);
    }
    async syncGoalFromDataSource(req, id) {
        return this.goalsService.syncGoalFromDataSource(req.user.companyId, id);
    }
};
exports.GoalsController = GoalsController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], GoalsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('ownerId')),
    __param(2, (0, common_1.Query)('type')),
    __param(3, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], GoalsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('my'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GoalsController.prototype, "getMyGoals", null);
__decorate([
    (0, common_1.Get)('team'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GoalsController.prototype, "getTeamGoals", null);
__decorate([
    (0, common_1.Get)('company'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GoalsController.prototype, "getCompanyGoals", null);
__decorate([
    (0, common_1.Get)('data-sources/available'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], GoalsController.prototype, "getAvailableDataSources", null);
__decorate([
    (0, common_1.Post)('sync-all'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GoalsController.prototype, "syncAllAutoCalculatedGoals", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], GoalsController.prototype, "findById", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], GoalsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], GoalsController.prototype, "delete", null);
__decorate([
    (0, common_1.Post)(':id/submit'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], GoalsController.prototype, "submitForApproval", null);
__decorate([
    (0, common_1.Post)(':id/approve'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], GoalsController.prototype, "approveGoal", null);
__decorate([
    (0, common_1.Post)(':id/reject'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], GoalsController.prototype, "rejectGoal", null);
__decorate([
    (0, common_1.Post)(':id/check-in'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], GoalsController.prototype, "createCheckIn", null);
__decorate([
    (0, common_1.Get)(':id/check-ins'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], GoalsController.prototype, "getCheckIns", null);
__decorate([
    (0, common_1.Post)(':id/key-results'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], GoalsController.prototype, "addKeyResult", null);
__decorate([
    (0, common_1.Put)('key-results/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], GoalsController.prototype, "updateKeyResult", null);
__decorate([
    (0, common_1.Delete)('key-results/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], GoalsController.prototype, "deleteKeyResult", null);
__decorate([
    (0, common_1.Post)('key-results/:id/check-in'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], GoalsController.prototype, "checkInKeyResult", null);
__decorate([
    (0, common_1.Post)(':id/sync'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], GoalsController.prototype, "syncGoalFromDataSource", null);
exports.GoalsController = GoalsController = __decorate([
    (0, common_1.Controller)('goals'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [goals_service_1.GoalsService])
], GoalsController);
//# sourceMappingURL=goals.controller.js.map