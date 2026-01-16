"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KPIController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const kpi_service_1 = require("./kpi.service");
const dto_1 = require("./dto");
let KPIController = class KPIController {
    constructor(kpiService) {
        this.kpiService = kpiService;
    }
    async createDefinition(dto) {
        return this.kpiService.createDefinition(dto);
    }
    async getDefinitions(companyId, query) {
        return this.kpiService.getDefinitions(companyId, query);
    }
    async getDefinitionById(id) {
        return this.kpiService.getDefinitionById(id);
    }
    async updateDefinition(id, dto) {
        return this.kpiService.updateDefinition(id, dto);
    }
    async deleteDefinition(id) {
        return this.kpiService.deleteDefinition(id);
    }
    async seedDefaultKPIs(companyId) {
        return this.kpiService.seedDefaultKPIs(companyId);
    }
    async createAssignment(dto) {
        return this.kpiService.createAssignment(dto);
    }
    async bulkCreateAssignments(dto) {
        return this.kpiService.bulkCreateAssignments(dto);
    }
    async getAssignments(query) {
        return this.kpiService.getAssignments(query);
    }
    async getAssignmentById(id) {
        return this.kpiService.getAssignmentById(id);
    }
    async updateAssignment(id, dto) {
        return this.kpiService.updateAssignment(id, dto);
    }
    async deleteAssignment(id) {
        return this.kpiService.deleteAssignment(id);
    }
    async createEntry(dto, req) {
        return this.kpiService.createEntry(dto, req.user.id);
    }
    async bulkCreateEntries(dto, req) {
        return this.kpiService.bulkCreateEntries(dto, req.user.id);
    }
    async importEntries(dto, req) {
        return this.kpiService.importEntries(dto, req.user.id);
    }
    async getEntriesForAssignment(assignmentId) {
        return this.kpiService.getEntriesForAssignment(assignmentId);
    }
    async deleteEntry(id) {
        return this.kpiService.deleteEntry(id);
    }
    async calculateScore(assignmentId) {
        return this.kpiService.calculateAssignmentScore(assignmentId);
    }
    async recalculateAllScores(dto) {
        return this.kpiService.recalculateAllScores(dto.cycleId, dto.employeeId);
    }
    async getEmployeeSummary(employeeId, cycleId) {
        return this.kpiService.getEmployeeKPISummary(employeeId, cycleId);
    }
    async getCycleOverview(cycleId) {
        return this.kpiService.getCycleKPIOverview(cycleId);
    }
};
exports.KPIController = KPIController;
__decorate([
    (0, common_1.Post)('definitions'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.CreateKPIDefinitionDto]),
    __metadata("design:returntype", Promise)
], KPIController.prototype, "createDefinition", null);
__decorate([
    (0, common_1.Get)('definitions/:companyId'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.GetKPIDefinitionsQueryDto]),
    __metadata("design:returntype", Promise)
], KPIController.prototype, "getDefinitions", null);
__decorate([
    (0, common_1.Get)('definitions/detail/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], KPIController.prototype, "getDefinitionById", null);
__decorate([
    (0, common_1.Put)('definitions/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.UpdateKPIDefinitionDto]),
    __metadata("design:returntype", Promise)
], KPIController.prototype, "updateDefinition", null);
__decorate([
    (0, common_1.Delete)('definitions/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], KPIController.prototype, "deleteDefinition", null);
__decorate([
    (0, common_1.Post)('definitions/seed/:companyId'),
    __param(0, (0, common_1.Param)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], KPIController.prototype, "seedDefaultKPIs", null);
__decorate([
    (0, common_1.Post)('assignments'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.CreateKPIAssignmentDto]),
    __metadata("design:returntype", Promise)
], KPIController.prototype, "createAssignment", null);
__decorate([
    (0, common_1.Post)('assignments/bulk'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.BulkCreateKPIAssignmentDto]),
    __metadata("design:returntype", Promise)
], KPIController.prototype, "bulkCreateAssignments", null);
__decorate([
    (0, common_1.Get)('assignments'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.GetKPIAssignmentsQueryDto]),
    __metadata("design:returntype", Promise)
], KPIController.prototype, "getAssignments", null);
__decorate([
    (0, common_1.Get)('assignments/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], KPIController.prototype, "getAssignmentById", null);
__decorate([
    (0, common_1.Put)('assignments/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.UpdateKPIAssignmentDto]),
    __metadata("design:returntype", Promise)
], KPIController.prototype, "updateAssignment", null);
__decorate([
    (0, common_1.Delete)('assignments/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], KPIController.prototype, "deleteAssignment", null);
__decorate([
    (0, common_1.Post)('entries'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.CreateKPIEntryDto, Object]),
    __metadata("design:returntype", Promise)
], KPIController.prototype, "createEntry", null);
__decorate([
    (0, common_1.Post)('entries/bulk'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.BulkCreateKPIEntryDto, Object]),
    __metadata("design:returntype", Promise)
], KPIController.prototype, "bulkCreateEntries", null);
__decorate([
    (0, common_1.Post)('entries/import'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.ImportKPIEntriesDto, Object]),
    __metadata("design:returntype", Promise)
], KPIController.prototype, "importEntries", null);
__decorate([
    (0, common_1.Get)('entries/:assignmentId'),
    __param(0, (0, common_1.Param)('assignmentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], KPIController.prototype, "getEntriesForAssignment", null);
__decorate([
    (0, common_1.Delete)('entries/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], KPIController.prototype, "deleteEntry", null);
__decorate([
    (0, common_1.Post)('calculate/:assignmentId'),
    __param(0, (0, common_1.Param)('assignmentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], KPIController.prototype, "calculateScore", null);
__decorate([
    (0, common_1.Post)('recalculate-all'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.RecalculateAllScoresDto]),
    __metadata("design:returntype", Promise)
], KPIController.prototype, "recalculateAllScores", null);
__decorate([
    (0, common_1.Get)('summary/employee/:employeeId'),
    __param(0, (0, common_1.Param)('employeeId')),
    __param(1, (0, common_1.Query)('cycleId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], KPIController.prototype, "getEmployeeSummary", null);
__decorate([
    (0, common_1.Get)('overview/cycle/:cycleId'),
    __param(0, (0, common_1.Param)('cycleId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], KPIController.prototype, "getCycleOverview", null);
exports.KPIController = KPIController = __decorate([
    (0, common_1.Controller)('kpi'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [kpi_service_1.KPIService])
], KPIController);
//# sourceMappingURL=kpi.controller.js.map