"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportsModule = void 0;
const common_1 = require("@nestjs/common");
const reports_controller_1 = require("./reports.controller");
const reports_service_1 = require("./reports.service");
const export_service_1 = require("./services/export.service");
const extended_reports_service_1 = require("./services/extended-reports.service");
const extended_reports_controller_1 = require("./controllers/extended-reports.controller");
const permissions_module_1 = require("../permissions/permissions.module");
let ReportsModule = class ReportsModule {
};
exports.ReportsModule = ReportsModule;
exports.ReportsModule = ReportsModule = __decorate([
    (0, common_1.Module)({
        imports: [permissions_module_1.PermissionsModule],
        controllers: [reports_controller_1.ReportsController, extended_reports_controller_1.ExtendedReportsController],
        providers: [reports_service_1.ReportsService, export_service_1.ExportService, extended_reports_service_1.ExtendedReportsService],
        exports: [reports_service_1.ReportsService, extended_reports_service_1.ExtendedReportsService],
    })
], ReportsModule);
//# sourceMappingURL=reports.module.js.map