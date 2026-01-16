"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoanPaymentsModule = void 0;
const common_1 = require("@nestjs/common");
const loan_payments_service_1 = require("./loan-payments.service");
const loan_payments_controller_1 = require("./loan-payments.controller");
const prisma_module_1 = require("../../common/prisma/prisma.module");
let LoanPaymentsModule = class LoanPaymentsModule {
};
exports.LoanPaymentsModule = LoanPaymentsModule;
exports.LoanPaymentsModule = LoanPaymentsModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule],
        controllers: [loan_payments_controller_1.LoanPaymentsController],
        providers: [loan_payments_service_1.LoanPaymentsService],
        exports: [loan_payments_service_1.LoanPaymentsService],
    })
], LoanPaymentsModule);
//# sourceMappingURL=loan-payments.module.js.map