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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecalculateAllScoresDto = exports.CalculateKPIScoreDto = exports.GetKPIAssignmentsQueryDto = exports.GetKPIDefinitionsQueryDto = exports.ImportKPIEntriesDto = exports.BulkCreateKPIEntryDto = exports.CreateKPIEntryDto = exports.UpdateKPIAssignmentDto = exports.BulkCreateKPIAssignmentDto = exports.CreateKPIAssignmentDto = exports.UpdateKPIDefinitionDto = exports.CreateKPIDefinitionDto = exports.KPIFrequency = exports.KPISourceType = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
var KPISourceType;
(function (KPISourceType) {
    KPISourceType["MANUAL"] = "MANUAL";
    KPISourceType["SYSTEM_SYNC"] = "SYSTEM_SYNC";
    KPISourceType["API_IMPORT"] = "API_IMPORT";
    KPISourceType["CSV_IMPORT"] = "CSV_IMPORT";
})(KPISourceType || (exports.KPISourceType = KPISourceType = {}));
var KPIFrequency;
(function (KPIFrequency) {
    KPIFrequency["DAILY"] = "DAILY";
    KPIFrequency["WEEKLY"] = "WEEKLY";
    KPIFrequency["MONTHLY"] = "MONTHLY";
    KPIFrequency["QUARTERLY"] = "QUARTERLY";
    KPIFrequency["YEARLY"] = "YEARLY";
})(KPIFrequency || (exports.KPIFrequency = KPIFrequency = {}));
class CreateKPIDefinitionDto {
}
exports.CreateKPIDefinitionDto = CreateKPIDefinitionDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateKPIDefinitionDto.prototype, "companyId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateKPIDefinitionDto.prototype, "jobFamilyId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateKPIDefinitionDto.prototype, "code", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateKPIDefinitionDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateKPIDefinitionDto.prototype, "nameAr", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateKPIDefinitionDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateKPIDefinitionDto.prototype, "unit", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], CreateKPIDefinitionDto.prototype, "formula", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], CreateKPIDefinitionDto.prototype, "thresholds", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(KPISourceType),
    __metadata("design:type", String)
], CreateKPIDefinitionDto.prototype, "sourceType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(KPIFrequency),
    __metadata("design:type", String)
], CreateKPIDefinitionDto.prototype, "frequency", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], CreateKPIDefinitionDto.prototype, "minValue", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], CreateKPIDefinitionDto.prototype, "maxValue", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], CreateKPIDefinitionDto.prototype, "targetValue", void 0);
class UpdateKPIDefinitionDto {
}
exports.UpdateKPIDefinitionDto = UpdateKPIDefinitionDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateKPIDefinitionDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateKPIDefinitionDto.prototype, "nameAr", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateKPIDefinitionDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateKPIDefinitionDto.prototype, "unit", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], UpdateKPIDefinitionDto.prototype, "formula", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], UpdateKPIDefinitionDto.prototype, "thresholds", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(KPISourceType),
    __metadata("design:type", String)
], UpdateKPIDefinitionDto.prototype, "sourceType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(KPIFrequency),
    __metadata("design:type", String)
], UpdateKPIDefinitionDto.prototype, "frequency", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], UpdateKPIDefinitionDto.prototype, "minValue", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], UpdateKPIDefinitionDto.prototype, "maxValue", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], UpdateKPIDefinitionDto.prototype, "targetValue", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateKPIDefinitionDto.prototype, "isActive", void 0);
class CreateKPIAssignmentDto {
}
exports.CreateKPIAssignmentDto = CreateKPIAssignmentDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateKPIAssignmentDto.prototype, "cycleId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateKPIAssignmentDto.prototype, "employeeId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateKPIAssignmentDto.prototype, "kpiDefinitionId", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], CreateKPIAssignmentDto.prototype, "target", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], CreateKPIAssignmentDto.prototype, "weight", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateKPIAssignmentDto.prototype, "notes", void 0);
class BulkCreateKPIAssignmentDto {
}
exports.BulkCreateKPIAssignmentDto = BulkCreateKPIAssignmentDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BulkCreateKPIAssignmentDto.prototype, "cycleId", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], BulkCreateKPIAssignmentDto.prototype, "employeeIds", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BulkCreateKPIAssignmentDto.prototype, "kpiDefinitionId", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], BulkCreateKPIAssignmentDto.prototype, "target", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], BulkCreateKPIAssignmentDto.prototype, "weight", void 0);
class UpdateKPIAssignmentDto {
}
exports.UpdateKPIAssignmentDto = UpdateKPIAssignmentDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], UpdateKPIAssignmentDto.prototype, "target", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], UpdateKPIAssignmentDto.prototype, "weight", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateKPIAssignmentDto.prototype, "notes", void 0);
class CreateKPIEntryDto {
}
exports.CreateKPIEntryDto = CreateKPIEntryDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateKPIEntryDto.prototype, "assignmentId", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateKPIEntryDto.prototype, "periodStart", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateKPIEntryDto.prototype, "periodEnd", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], CreateKPIEntryDto.prototype, "value", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateKPIEntryDto.prototype, "source", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateKPIEntryDto.prototype, "notes", void 0);
class BulkCreateKPIEntryDto {
}
exports.BulkCreateKPIEntryDto = BulkCreateKPIEntryDto;
__decorate([
    (0, class_validator_1.IsArray)(),
    __metadata("design:type", Array)
], BulkCreateKPIEntryDto.prototype, "entries", void 0);
class ImportKPIEntriesDto {
}
exports.ImportKPIEntriesDto = ImportKPIEntriesDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ImportKPIEntriesDto.prototype, "cycleId", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    __metadata("design:type", Array)
], ImportKPIEntriesDto.prototype, "data", void 0);
class GetKPIDefinitionsQueryDto {
}
exports.GetKPIDefinitionsQueryDto = GetKPIDefinitionsQueryDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GetKPIDefinitionsQueryDto.prototype, "jobFamilyId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    (0, class_transformer_1.Type)(() => Boolean),
    __metadata("design:type", Boolean)
], GetKPIDefinitionsQueryDto.prototype, "isActive", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(KPISourceType),
    __metadata("design:type", String)
], GetKPIDefinitionsQueryDto.prototype, "sourceType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(KPIFrequency),
    __metadata("design:type", String)
], GetKPIDefinitionsQueryDto.prototype, "frequency", void 0);
class GetKPIAssignmentsQueryDto {
}
exports.GetKPIAssignmentsQueryDto = GetKPIAssignmentsQueryDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GetKPIAssignmentsQueryDto.prototype, "cycleId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GetKPIAssignmentsQueryDto.prototype, "employeeId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GetKPIAssignmentsQueryDto.prototype, "kpiDefinitionId", void 0);
class CalculateKPIScoreDto {
}
exports.CalculateKPIScoreDto = CalculateKPIScoreDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CalculateKPIScoreDto.prototype, "assignmentId", void 0);
class RecalculateAllScoresDto {
}
exports.RecalculateAllScoresDto = RecalculateAllScoresDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RecalculateAllScoresDto.prototype, "cycleId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RecalculateAllScoresDto.prototype, "employeeId", void 0);
//# sourceMappingURL=index.js.map