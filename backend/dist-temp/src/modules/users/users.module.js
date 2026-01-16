"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersModule = void 0;
const common_1 = require("@nestjs/common");
const users_controller_1 = require("./users.controller");
const users_service_1 = require("./users.service");
const leaves_module_1 = require("../leaves/leaves.module");
const settings_module_1 = require("../settings/settings.module");
const permissions_module_1 = require("../permissions/permissions.module");
const employee_import_controller_1 = require("./employee-import.controller");
const employee_import_service_1 = require("./services/employee-import.service");
const column_mapper_service_1 = require("./services/column-mapper.service");
const prisma_module_1 = require("../../common/prisma/prisma.module");
let UsersModule = class UsersModule {
};
exports.UsersModule = UsersModule;
exports.UsersModule = UsersModule = __decorate([
    (0, common_1.Module)({
        imports: [leaves_module_1.LeavesModule, settings_module_1.SettingsModule, permissions_module_1.PermissionsModule, prisma_module_1.PrismaModule],
        controllers: [users_controller_1.UsersController, employee_import_controller_1.EmployeeImportController],
        providers: [users_service_1.UsersService, employee_import_service_1.EmployeeImportService, column_mapper_service_1.ColumnMapperService],
        exports: [users_service_1.UsersService, employee_import_service_1.EmployeeImportService, column_mapper_service_1.ColumnMapperService],
    })
], UsersModule);
//# sourceMappingURL=users.module.js.map