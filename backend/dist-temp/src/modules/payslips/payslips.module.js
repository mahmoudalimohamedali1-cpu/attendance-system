"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayslipsModule = void 0;
const common_1 = require("@nestjs/common");
const prisma_module_1 = require("../../common/prisma/prisma.module");
const payslip_lines_service_1 = require("./payslip-lines.service");
const payslips_controller_1 = require("./payslips.controller");
const pdf_module_1 = require("../../common/pdf/pdf.module");
const permissions_module_1 = require("../permissions/permissions.module");
let PayslipsModule = class PayslipsModule {
};
exports.PayslipsModule = PayslipsModule;
exports.PayslipsModule = PayslipsModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, pdf_module_1.PdfModule, permissions_module_1.PermissionsModule],
        controllers: [payslips_controller_1.PayslipsController],
        providers: [payslip_lines_service_1.PayslipLinesService],
        exports: [payslip_lines_service_1.PayslipLinesService],
    })
], PayslipsModule);
//# sourceMappingURL=payslips.module.js.map