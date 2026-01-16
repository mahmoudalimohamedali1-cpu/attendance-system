"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalaryAssignmentsModule = void 0;
const common_1 = require("@nestjs/common");
const salary_assignments_service_1 = require("./salary-assignments.service");
const salary_assignments_controller_1 = require("./salary-assignments.controller");
const prisma_module_1 = require("../../common/prisma/prisma.module");
let SalaryAssignmentsModule = class SalaryAssignmentsModule {
};
exports.SalaryAssignmentsModule = SalaryAssignmentsModule;
exports.SalaryAssignmentsModule = SalaryAssignmentsModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule],
        controllers: [salary_assignments_controller_1.SalaryAssignmentsController],
        providers: [salary_assignments_service_1.SalaryAssignmentsService],
        exports: [salary_assignments_service_1.SalaryAssignmentsService],
    })
], SalaryAssignmentsModule);
//# sourceMappingURL=salary-assignments.module.js.map