"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GosiModule = void 0;
const common_1 = require("@nestjs/common");
const gosi_service_1 = require("./gosi.service");
const gosi_controller_1 = require("./gosi.controller");
const prisma_module_1 = require("../../common/prisma/prisma.module");
const payslips_module_1 = require("../payslips/payslips.module");
const gosi_calculation_service_1 = require("./gosi-calculation.service");
let GosiModule = class GosiModule {
};
exports.GosiModule = GosiModule;
exports.GosiModule = GosiModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, payslips_module_1.PayslipsModule],
        controllers: [gosi_controller_1.GosiController],
        providers: [gosi_service_1.GosiService, gosi_calculation_service_1.GosiCalculationService],
        exports: [gosi_service_1.GosiService, gosi_calculation_service_1.GosiCalculationService],
    })
], GosiModule);
//# sourceMappingURL=gosi.module.js.map