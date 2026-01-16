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
exports.RecognitionController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const recognition_service_1 = require("./recognition.service");
let RecognitionController = class RecognitionController {
    constructor(recognitionService) {
        this.recognitionService = recognitionService;
    }
    async createCoreValue(req, dto) {
        return this.recognitionService.createCoreValue(req.user.companyId, dto);
    }
    async getCoreValues(req) {
        return this.recognitionService.getCoreValues(req.user.companyId);
    }
    async updateCoreValue(id, dto) {
        return this.recognitionService.updateCoreValue(id, dto);
    }
    async deleteCoreValue(id) {
        return this.recognitionService.deleteCoreValue(id);
    }
    async giveRecognition(req, dto) {
        return this.recognitionService.giveRecognition(req.user.companyId, req.user.id, dto);
    }
    async getRecognitionWall(req, page = 1, limit = 20) {
        return this.recognitionService.getRecognitionWall(req.user.companyId, +page, +limit);
    }
    async getMyRecognitions(req) {
        return this.recognitionService.getMyRecognitions(req.user.id);
    }
    async addReaction(req, id, body) {
        return this.recognitionService.addReaction(id, req.user.id, body.emoji);
    }
    async removeReaction(req, id, emoji) {
        return this.recognitionService.removeReaction(id, req.user.id, emoji);
    }
    async getLeaderboard(req, period = 'month') {
        return this.recognitionService.getLeaderboard(req.user.companyId, period);
    }
    async getRecognitionStats(req) {
        return this.recognitionService.getRecognitionStats(req.user.companyId);
    }
    async getTopCoreValues(req) {
        return this.recognitionService.getTopCoreValues(req.user.companyId);
    }
};
exports.RecognitionController = RecognitionController;
__decorate([
    (0, common_1.Post)('core-values'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], RecognitionController.prototype, "createCoreValue", null);
__decorate([
    (0, common_1.Get)('core-values'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], RecognitionController.prototype, "getCoreValues", null);
__decorate([
    (0, common_1.Put)('core-values/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], RecognitionController.prototype, "updateCoreValue", null);
__decorate([
    (0, common_1.Delete)('core-values/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RecognitionController.prototype, "deleteCoreValue", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], RecognitionController.prototype, "giveRecognition", null);
__decorate([
    (0, common_1.Get)('wall'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], RecognitionController.prototype, "getRecognitionWall", null);
__decorate([
    (0, common_1.Get)('my'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], RecognitionController.prototype, "getMyRecognitions", null);
__decorate([
    (0, common_1.Post)(':id/react'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], RecognitionController.prototype, "addReaction", null);
__decorate([
    (0, common_1.Delete)(':id/react/:emoji'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Param)('emoji')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], RecognitionController.prototype, "removeReaction", null);
__decorate([
    (0, common_1.Get)('leaderboard'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('period')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], RecognitionController.prototype, "getLeaderboard", null);
__decorate([
    (0, common_1.Get)('stats'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], RecognitionController.prototype, "getRecognitionStats", null);
__decorate([
    (0, common_1.Get)('top-values'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], RecognitionController.prototype, "getTopCoreValues", null);
exports.RecognitionController = RecognitionController = __decorate([
    (0, common_1.Controller)('recognition'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [recognition_service_1.RecognitionService])
], RecognitionController);
//# sourceMappingURL=recognition.controller.js.map