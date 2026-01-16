"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiHrModule = void 0;
const common_1 = require("@nestjs/common");
const ai_hr_service_1 = require("./ai-hr.service");
const ai_hr_controller_1 = require("./ai-hr.controller");
const prisma_module_1 = require("../../common/prisma/prisma.module");
const ai_module_1 = require("../ai/ai.module");
let AiHrModule = class AiHrModule {
};
exports.AiHrModule = AiHrModule;
exports.AiHrModule = AiHrModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, ai_module_1.AiModule],
        controllers: [ai_hr_controller_1.AiHrController],
        providers: [ai_hr_service_1.AiHrService],
        exports: [ai_hr_service_1.AiHrService],
    })
], AiHrModule);
//# sourceMappingURL=ai-hr.module.js.map