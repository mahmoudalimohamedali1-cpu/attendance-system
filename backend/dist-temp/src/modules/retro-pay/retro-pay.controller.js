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
exports.RetroPayController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const retro_pay_service_1 = require("./retro-pay.service");
const create_retro_pay_dto_1 = require("./dto/create-retro-pay.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
let RetroPayController = class RetroPayController {
    constructor(service) {
        this.service = service;
    }
    create(dto, req) {
        return this.service.create(dto, req.user.id);
    }
    findAll() {
        return this.service.findAll();
    }
    getStats() {
        return this.service.getStats();
    }
    findByEmployee(employeeId) {
        return this.service.findByEmployee(employeeId);
    }
    approve(id, req) {
        return this.service.approve(id, req.user.id);
    }
    markAsPaid(id) {
        return this.service.markAsPaid(id);
    }
    cancel(id) {
        return this.service.cancel(id);
    }
};
exports.RetroPayController = RetroPayController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'إنشاء طلب فرق راتب' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_retro_pay_dto_1.CreateRetroPayDto, Object]),
    __metadata("design:returntype", void 0)
], RetroPayController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'عرض جميع طلبات الفروقات' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], RetroPayController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'إحصائيات الفروقات' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], RetroPayController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)('employee/:employeeId'),
    (0, swagger_1.ApiOperation)({ summary: 'فروقات موظف معين' }),
    __param(0, (0, common_1.Param)('employeeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RetroPayController.prototype, "findByEmployee", null);
__decorate([
    (0, common_1.Patch)(':id/approve'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'اعتماد طلب فرق' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], RetroPayController.prototype, "approve", null);
__decorate([
    (0, common_1.Patch)(':id/pay'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'تسجيل صرف الفرق' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RetroPayController.prototype, "markAsPaid", null);
__decorate([
    (0, common_1.Patch)(':id/cancel'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'إلغاء طلب فرق' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RetroPayController.prototype, "cancel", null);
exports.RetroPayController = RetroPayController = __decorate([
    (0, swagger_1.ApiTags)('Retro Pay'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('retro-pay'),
    __metadata("design:paramtypes", [retro_pay_service_1.RetroPayService])
], RetroPayController);
//# sourceMappingURL=retro-pay.controller.js.map