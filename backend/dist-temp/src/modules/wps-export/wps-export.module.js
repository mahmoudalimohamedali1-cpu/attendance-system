"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WpsExportModule = void 0;
const common_1 = require("@nestjs/common");
const wps_export_service_1 = require("./wps-export.service");
const wps_export_controller_1 = require("./wps-export.controller");
const prisma_module_1 = require("../../common/prisma/prisma.module");
const wps_tracking_module_1 = require("../wps-tracking/wps-tracking.module");
let WpsExportModule = class WpsExportModule {
};
exports.WpsExportModule = WpsExportModule;
exports.WpsExportModule = WpsExportModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, (0, common_1.forwardRef)(() => wps_tracking_module_1.WpsTrackingModule)],
        controllers: [wps_export_controller_1.WpsExportController],
        providers: [wps_export_service_1.WpsExportService],
        exports: [wps_export_service_1.WpsExportService],
    })
], WpsExportModule);
//# sourceMappingURL=wps-export.module.js.map