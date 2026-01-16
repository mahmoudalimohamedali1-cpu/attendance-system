"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DisciplinaryModule = void 0;
const common_1 = require("@nestjs/common");
const disciplinary_service_1 = require("./disciplinary.service");
const disciplinary_controller_1 = require("./disciplinary.controller");
const notifications_module_1 = require("../notifications/notifications.module");
const permissions_module_1 = require("../permissions/permissions.module");
const smart_policies_module_1 = require("../smart-policies/smart-policies.module");
let DisciplinaryModule = class DisciplinaryModule {
};
exports.DisciplinaryModule = DisciplinaryModule;
exports.DisciplinaryModule = DisciplinaryModule = __decorate([
    (0, common_1.Module)({
        imports: [
            notifications_module_1.NotificationsModule,
            permissions_module_1.PermissionsModule,
            (0, common_1.forwardRef)(() => smart_policies_module_1.SmartPoliciesModule),
        ],
        controllers: [disciplinary_controller_1.DisciplinaryController],
        providers: [disciplinary_service_1.DisciplinaryService],
        exports: [disciplinary_service_1.DisciplinaryService],
    })
], DisciplinaryModule);
//# sourceMappingURL=disciplinary.module.js.map