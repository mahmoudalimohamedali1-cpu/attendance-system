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
var AiChatController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiChatController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const secure_ai_chat_service_1 = require("./secure-ai-chat.service");
const security_1 = require("./security");
let AiChatController = AiChatController_1 = class AiChatController {
    constructor(chatService) {
        this.chatService = chatService;
        this.logger = new common_1.Logger(AiChatController_1.name);
    }
    async sendMessage(message, req) {
        const userId = req.user?.id;
        if (!userId) {
            return {
                success: false,
                response: 'يجب تسجيل الدخول أولاً',
            };
        }
        if (!message || message.trim().length === 0) {
            return {
                success: false,
                response: 'الرسالة مطلوبة',
            };
        }
        try {
            const result = await this.chatService.chat(userId, message);
            return {
                success: true,
                ...result,
            };
        }
        catch (error) {
            this.logger.error(`Chat error: ${error.message}`);
            return {
                success: false,
                response: 'حدث خطأ في معالجة الطلب',
            };
        }
    }
    async getHistory(req) {
        const userId = req.user?.id;
        const companyId = req.user?.companyId;
        if (!userId || !companyId) {
            return { success: false, history: [] };
        }
        try {
            const history = await this.chatService.getHistory(userId, companyId);
            return {
                success: true,
                history: history.map(msg => ({
                    role: msg.role,
                    content: msg.content,
                    timestamp: msg.timestamp,
                })),
            };
        }
        catch (error) {
            this.logger.error(`History error: ${error.message}`);
            return { success: false, history: [] };
        }
    }
    async clearHistory(req) {
        const userId = req.user?.id;
        const companyId = req.user?.companyId;
        if (!userId || !companyId) {
            return { success: false };
        }
        try {
            await this.chatService.clearHistory(userId, companyId);
            return { success: true };
        }
        catch (error) {
            this.logger.error(`Clear history error: ${error.message}`);
            return { success: false };
        }
    }
    async getSuggestions(req) {
        const role = req.user?.role || 'EMPLOYEE';
        const baseSuggestions = [
            'رصيد إجازاتي',
            'حضوري اليوم',
            'طلب إجازة',
        ];
        const adminSuggestions = [
            'حالة النظام',
            'تقرير الحضور',
            'deploy',
            'الموظفين المتأخرين',
        ];
        const hrSuggestions = [
            'تقرير الحضور',
            'طلبات الإجازات المعلقة',
            'عرض الموظفين',
        ];
        if (['ADMIN', 'SUPER_ADMIN'].includes(role)) {
            return { suggestions: [...adminSuggestions, ...baseSuggestions] };
        }
        if (role === 'HR') {
            return { suggestions: [...hrSuggestions, ...baseSuggestions] };
        }
        return { suggestions: baseSuggestions };
    }
};
exports.AiChatController = AiChatController;
__decorate([
    (0, common_1.Post)('message'),
    (0, common_1.UseGuards)(security_1.RateLimiterGuard),
    __param(0, (0, common_1.Body)('message')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AiChatController.prototype, "sendMessage", null);
__decorate([
    (0, common_1.Get)('history'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AiChatController.prototype, "getHistory", null);
__decorate([
    (0, common_1.Delete)('history'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AiChatController.prototype, "clearHistory", null);
__decorate([
    (0, common_1.Get)('suggestions'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AiChatController.prototype, "getSuggestions", null);
exports.AiChatController = AiChatController = AiChatController_1 = __decorate([
    (0, common_1.Controller)('ai-chat'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [secure_ai_chat_service_1.SecureAiChatService])
], AiChatController);
//# sourceMappingURL=ai-chat.controller.js.map