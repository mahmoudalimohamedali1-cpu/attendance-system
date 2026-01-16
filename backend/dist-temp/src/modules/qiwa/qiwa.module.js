"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QiwaModule = void 0;
const common_1 = require("@nestjs/common");
const qiwa_controller_1 = require("./qiwa.controller");
const qiwa_service_1 = require("./qiwa.service");
const prisma_module_1 = require("../../common/prisma/prisma.module");
const permissions_module_1 = require("../permissions/permissions.module");
let QiwaModule = class QiwaModule {
};
exports.QiwaModule = QiwaModule;
exports.QiwaModule = QiwaModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, permissions_module_1.PermissionsModule],
        controllers: [qiwa_controller_1.QiwaController],
        providers: [qiwa_service_1.QiwaService],
        exports: [qiwa_service_1.QiwaService],
    })
], QiwaModule);
//# sourceMappingURL=qiwa.module.js.map