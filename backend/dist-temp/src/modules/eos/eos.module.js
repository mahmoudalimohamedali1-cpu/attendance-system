"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EosModule = void 0;
const common_1 = require("@nestjs/common");
const eos_service_1 = require("./eos.service");
const eos_controller_1 = require("./eos.controller");
const prisma_module_1 = require("../../common/prisma/prisma.module");
const leaves_module_1 = require("../leaves/leaves.module");
let EosModule = class EosModule {
};
exports.EosModule = EosModule;
exports.EosModule = EosModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, leaves_module_1.LeavesModule],
        controllers: [eos_controller_1.EosController],
        providers: [eos_service_1.EosService],
        exports: [eos_service_1.EosService],
    })
], EosModule);
//# sourceMappingURL=eos.module.js.map