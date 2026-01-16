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
exports.CreatePolicyDto = exports.CreatePolicyRuleDto = exports.PolicyScope = exports.PolicyType = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
var PolicyType;
(function (PolicyType) {
    PolicyType["OVERTIME"] = "OVERTIME";
    PolicyType["LEAVE"] = "LEAVE";
    PolicyType["DEDUCTION"] = "DEDUCTION";
    PolicyType["ALLOWANCE"] = "ALLOWANCE";
    PolicyType["ATTENDANCE"] = "ATTENDANCE";
    PolicyType["GENERAL"] = "GENERAL";
})(PolicyType || (exports.PolicyType = PolicyType = {}));
var PolicyScope;
(function (PolicyScope) {
    PolicyScope["COMPANY"] = "COMPANY";
    PolicyScope["BRANCH"] = "BRANCH";
    PolicyScope["DEPARTMENT"] = "DEPARTMENT";
    PolicyScope["JOB_TITLE"] = "JOB_TITLE";
    PolicyScope["EMPLOYEE"] = "EMPLOYEE";
})(PolicyScope || (exports.PolicyScope = PolicyScope = {}));
class CreatePolicyRuleDto {
}
exports.CreatePolicyRuleDto = CreatePolicyRuleDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'كود القاعدة', example: 'OT_WEEKDAY' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePolicyRuleDto.prototype, "code", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'اسم القاعدة بالعربي' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePolicyRuleDto.prototype, "nameAr", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'شروط التطبيق (JSON)' }),
    (0, class_validator_1.IsObject)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CreatePolicyRuleDto.prototype, "conditions", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'نوع القيمة', enum: ['PERCENTAGE', 'FIXED', 'FORMULA'] }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePolicyRuleDto.prototype, "valueType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'القيمة أو المعادلة' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePolicyRuleDto.prototype, "value", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'ترتيب التطبيق' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreatePolicyRuleDto.prototype, "ruleOrder", void 0);
class CreatePolicyDto {
}
exports.CreatePolicyDto = CreatePolicyDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'كود السياسة', example: 'OT_POLICY_2024' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePolicyDto.prototype, "code", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'اسم السياسة بالعربي' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePolicyDto.prototype, "nameAr", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'اسم السياسة بالإنجليزي' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreatePolicyDto.prototype, "nameEn", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'وصف السياسة' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreatePolicyDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'نوع السياسة', enum: PolicyType }),
    (0, class_validator_1.IsEnum)(PolicyType),
    __metadata("design:type", String)
], CreatePolicyDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'نطاق السياسة', enum: PolicyScope }),
    (0, class_validator_1.IsEnum)(PolicyScope),
    __metadata("design:type", String)
], CreatePolicyDto.prototype, "scope", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'تاريخ بداية السياسة' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreatePolicyDto.prototype, "effectiveFrom", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'تاريخ نهاية السياسة' }),
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreatePolicyDto.prototype, "effectiveTo", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'معرف الفرع (إذا كان النطاق BRANCH)' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreatePolicyDto.prototype, "branchId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'معرف القسم (إذا كان النطاق DEPARTMENT)' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreatePolicyDto.prototype, "departmentId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'معرف الدرجة الوظيفية (إذا كان النطاق JOB_TITLE)' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreatePolicyDto.prototype, "jobTitleId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'معرف الموظف (إذا كان النطاق EMPLOYEE)' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreatePolicyDto.prototype, "employeeId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'إعدادات إضافية (JSON)' }),
    (0, class_validator_1.IsObject)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CreatePolicyDto.prototype, "settings", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'أولوية السياسة (الأعلى يُطبق أولاً)' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreatePolicyDto.prototype, "priority", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'قواعد السياسة' }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => CreatePolicyRuleDto),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], CreatePolicyDto.prototype, "rules", void 0);
//# sourceMappingURL=create-policy.dto.js.map