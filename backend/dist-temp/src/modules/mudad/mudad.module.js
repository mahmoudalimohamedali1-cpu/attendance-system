"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MudadModule = void 0;
const common_1 = require("@nestjs/common");
const mudad_controller_1 = require("./mudad.controller");
const mudad_service_1 = require("./mudad.service");
const prisma_module_1 = require("../../common/prisma/prisma.module");
const status_log_service_1 = require("../../common/services/status-log.service");
const state_machine_service_1 = require("../../common/services/state-machine.service");
const permissions_module_1 = require("../permissions/permissions.module");
let MudadModule = class MudadModule {
};
exports.MudadModule = MudadModule;
exports.MudadModule = MudadModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, permissions_module_1.PermissionsModule],
        controllers: [mudad_controller_1.MudadController],
        providers: [mudad_service_1.MudadService, status_log_service_1.StatusLogService, state_machine_service_1.StateMachineService],
        exports: [mudad_service_1.MudadService],
    })
], MudadModule);
//# sourceMappingURL=mudad.module.js.map