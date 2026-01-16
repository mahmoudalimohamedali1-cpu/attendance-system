"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantInterceptor = void 0;
const common_1 = require("@nestjs/common");
let TenantInterceptor = class TenantInterceptor {
    intercept(context, next) {
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        if (!user) {
            return next.handle();
        }
        let companyId = user.companyId;
        if (user.isSuperAdmin && request.headers['x-company-id']) {
            companyId = request.headers['x-company-id'];
        }
        if (companyId) {
            request['tenantId'] = companyId;
            if (['POST', 'PUT', 'PATCH'].includes(request.method) && request.body) {
                if (typeof request.body === 'object' && !Array.isArray(request.body)) {
                    if (request.body.companyId && request.body.companyId !== companyId && !user.isSuperAdmin) {
                        throw new common_1.ForbiddenException('لا يمكنك تنفيذ هذا الإجراء لشركة أخرى');
                    }
                    request.body.companyId = companyId;
                }
            }
            if (request.method === 'GET') {
                request.query = request.query || {};
            }
        }
        return next.handle();
    }
};
exports.TenantInterceptor = TenantInterceptor;
exports.TenantInterceptor = TenantInterceptor = __decorate([
    (0, common_1.Injectable)()
], TenantInterceptor);
//# sourceMappingURL=tenant.interceptor.js.map