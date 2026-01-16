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
exports.CreateBudgetDto = exports.CreateAllocationDto = exports.UpdateCostCenterDto = exports.CreateCostCenterDto = exports.CostCenterStatus = exports.CostCenterType = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
var CostCenterType;
(function (CostCenterType) {
    CostCenterType["OPERATING"] = "OPERATING";
    CostCenterType["PROJECT"] = "PROJECT";
    CostCenterType["OVERHEAD"] = "OVERHEAD";
    CostCenterType["REVENUE"] = "REVENUE";
})(CostCenterType || (exports.CostCenterType = CostCenterType = {}));
var CostCenterStatus;
(function (CostCenterStatus) {
    CostCenterStatus["ACTIVE"] = "ACTIVE";
    CostCenterStatus["INACTIVE"] = "INACTIVE";
    CostCenterStatus["ARCHIVED"] = "ARCHIVED";
})(CostCenterStatus || (exports.CostCenterStatus = CostCenterStatus = {}));
class CreateCostCenterDto {
}
exports.CreateCostCenterDto = CreateCostCenterDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'كود مركز التكلفة', example: 'CC-001' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCostCenterDto.prototype, "code", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'اسم مركز التكلفة بالعربية', example: 'تقنية المعلومات' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCostCenterDto.prototype, "nameAr", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'اسم مركز التكلفة بالإنجليزية', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCostCenterDto.prototype, "nameEn", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'الوصف', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCostCenterDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'نوع مركز التكلفة', enum: CostCenterType, default: CostCenterType.OPERATING }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(CostCenterType),
    __metadata("design:type", String)
], CreateCostCenterDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'معرف مركز التكلفة الأب (للهيكل الهرمي)', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCostCenterDto.prototype, "parentId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'معرف المدير المسؤول', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCostCenterDto.prototype, "managerId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'تاريخ بداية الفعالية', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateCostCenterDto.prototype, "effectiveFrom", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'تاريخ نهاية الفعالية', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateCostCenterDto.prototype, "effectiveTo", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'السماح بتجاوز الميزانية', default: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateCostCenterDto.prototype, "isAllowOverbudget", void 0);
class UpdateCostCenterDto {
}
exports.UpdateCostCenterDto = UpdateCostCenterDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'كود مركز التكلفة', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateCostCenterDto.prototype, "code", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'اسم مركز التكلفة بالعربية', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateCostCenterDto.prototype, "nameAr", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'اسم مركز التكلفة بالإنجليزية', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateCostCenterDto.prototype, "nameEn", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'الوصف', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateCostCenterDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'نوع مركز التكلفة', enum: CostCenterType, required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(CostCenterType),
    __metadata("design:type", String)
], UpdateCostCenterDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'الحالة', enum: CostCenterStatus, required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(CostCenterStatus),
    __metadata("design:type", String)
], UpdateCostCenterDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'معرف مركز التكلفة الأب', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateCostCenterDto.prototype, "parentId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'معرف المدير المسؤول', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateCostCenterDto.prototype, "managerId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'تاريخ نهاية الفعالية', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], UpdateCostCenterDto.prototype, "effectiveTo", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'السماح بتجاوز الميزانية', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateCostCenterDto.prototype, "isAllowOverbudget", void 0);
class CreateAllocationDto {
}
exports.CreateAllocationDto = CreateAllocationDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'معرف الموظف' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateAllocationDto.prototype, "userId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'معرف مركز التكلفة (يأتي من URL)', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateAllocationDto.prototype, "costCenterId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'نسبة التوزيع (0-100)', minimum: 0, maximum: 100 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], CreateAllocationDto.prototype, "percentage", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'نوع التوزيع', default: 'POSITION' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateAllocationDto.prototype, "allocationType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'تاريخ بداية الفعالية', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateAllocationDto.prototype, "effectiveFrom", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'تاريخ نهاية الفعالية', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateAllocationDto.prototype, "effectiveTo", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'سبب التوزيع', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateAllocationDto.prototype, "reason", void 0);
class CreateBudgetDto {
}
exports.CreateBudgetDto = CreateBudgetDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'معرف مركز التكلفة (يأتي من URL)', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateBudgetDto.prototype, "costCenterId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'السنة', example: 2026 }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateBudgetDto.prototype, "year", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'الشهر (1-12، اختياري للميزانية السنوية)', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(12),
    __metadata("design:type", Number)
], CreateBudgetDto.prototype, "month", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'الربع السنوي (1-4)', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(4),
    __metadata("design:type", Number)
], CreateBudgetDto.prototype, "quarter", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'مبلغ الميزانية' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateBudgetDto.prototype, "budgetAmount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'ملاحظات', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateBudgetDto.prototype, "notes", void 0);
//# sourceMappingURL=cost-center.dto.js.map