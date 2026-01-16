"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanyBankAccountsModule = void 0;
const common_1 = require("@nestjs/common");
const company_bank_accounts_controller_1 = require("./company-bank-accounts.controller");
const company_bank_accounts_service_1 = require("./company-bank-accounts.service");
const prisma_module_1 = require("../../common/prisma/prisma.module");
let CompanyBankAccountsModule = class CompanyBankAccountsModule {
};
exports.CompanyBankAccountsModule = CompanyBankAccountsModule;
exports.CompanyBankAccountsModule = CompanyBankAccountsModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule],
        controllers: [company_bank_accounts_controller_1.CompanyBankAccountsController],
        providers: [company_bank_accounts_service_1.CompanyBankAccountsService],
        exports: [company_bank_accounts_service_1.CompanyBankAccountsService],
    })
], CompanyBankAccountsModule);
//# sourceMappingURL=company-bank-accounts.module.js.map