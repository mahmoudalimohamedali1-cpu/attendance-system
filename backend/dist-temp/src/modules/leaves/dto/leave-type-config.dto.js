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
exports.UpdateLeaveTypeConfigDto = exports.CreateLeaveTypeConfigDto = exports.SickPayTierDto = exports.EntitlementTierDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
var LeaveCategory;
(function (LeaveCategory) {
    LeaveCategory["BALANCED"] = "BALANCED";
    LeaveCategory["CASUAL"] = "CASUAL";
    LeaveCategory["SICK"] = "SICK";
    LeaveCategory["UNPAID"] = "UNPAID";
})(LeaveCategory || (LeaveCategory = {}));
class EntitlementTierDto {
}
exports.EntitlementTierDto = EntitlementTierDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'من سنة خدمة' }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], EntitlementTierDto.prototype, "minServiceYears", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'إلى سنة خدمة (999 = غير محدود)' }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], EntitlementTierDto.prototype, "maxServiceYears", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'عدد أيام الاستحقاق' }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], EntitlementTierDto.prototype, "entitlementDays", void 0);
class SickPayTierDto {
}
exports.SickPayTierDto = SickPayTierDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'من يوم' }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], SickPayTierDto.prototype, "fromDay", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'إلى يوم' }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], SickPayTierDto.prototype, "toDay", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'نسبة الراتب (0-100)' }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], SickPayTierDto.prototype, "paymentPercent", void 0);
class CreateLeaveTypeConfigDto {
}
exports.CreateLeaveTypeConfigDto = CreateLeaveTypeConfigDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'كود الإجازة (ANNUAL, SICK, etc.)' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateLeaveTypeConfigDto.prototype, "code", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'الاسم بالعربي' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateLeaveTypeConfigDto.prototype, "nameAr", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'الاسم بالإنجليزي' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateLeaveTypeConfigDto.prototype, "nameEn", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'الوصف' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateLeaveTypeConfigDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'تصنيف الإجازة', enum: LeaveCategory }),
    (0, class_validator_1.IsEnum)(LeaveCategory),
    __metadata("design:type", String)
], CreateLeaveTypeConfigDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'هل تعتمد على استحقاق؟', default: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateLeaveTypeConfigDto.prototype, "isEntitlementBased", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'الاستحقاق الافتراضي', default: 0 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateLeaveTypeConfigDto.prototype, "defaultEntitlement", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'الحد الأقصى للتراكم' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateLeaveTypeConfigDto.prototype, "maxBalanceCap", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'السماح بالترحيل', default: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateLeaveTypeConfigDto.prototype, "allowCarryForward", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'الحد الأقصى للأيام المرحلة' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateLeaveTypeConfigDto.prototype, "maxCarryForwardDays", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'مدة صلاحية الأيام المرحلة (بالشهور)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateLeaveTypeConfigDto.prototype, "carryForwardExpiryMonths", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'هل مدفوعة الأجر؟', default: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateLeaveTypeConfigDto.prototype, "isPaid", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'نسبة الأجر (0-100)', default: 100 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], CreateLeaveTypeConfigDto.prototype, "paymentPercentage", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'هل تتطلب مرفقات؟', default: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateLeaveTypeConfigDto.prototype, "requiresAttachment", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'المرفقات مطلوبة بعد عدد أيام' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateLeaveTypeConfigDto.prototype, "attachmentRequiredAfterDays", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'الحد الأدنى لفترة الإشعار (بالأيام)', default: 0 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateLeaveTypeConfigDto.prototype, "minNoticeDays", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'الحد الأدنى لأيام الطلب', default: 1 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateLeaveTypeConfigDto.prototype, "minRequestDays", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'الحد الأقصى لأيام الطلب' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateLeaveTypeConfigDto.prototype, "maxRequestDays", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'السماح بالرصيد السالب', default: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateLeaveTypeConfigDto.prototype, "allowNegativeBalance", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'خصم من السنوية إذا نفد الرصيد', default: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateLeaveTypeConfigDto.prototype, "deductFromAnnual", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'مرة واحدة فقط (مثل الحج)', default: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateLeaveTypeConfigDto.prototype, "isOneTimeOnly", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'ترتيب العرض', default: 0 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateLeaveTypeConfigDto.prototype, "sortOrder", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'شرائح الاستحقاق', type: [EntitlementTierDto] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => EntitlementTierDto),
    __metadata("design:type", Array)
], CreateLeaveTypeConfigDto.prototype, "entitlementTiers", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'شرائح أجر الإجازة المرضية', type: [SickPayTierDto] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => SickPayTierDto),
    __metadata("design:type", Array)
], CreateLeaveTypeConfigDto.prototype, "sickPayTiers", void 0);
class UpdateLeaveTypeConfigDto {
}
exports.UpdateLeaveTypeConfigDto = UpdateLeaveTypeConfigDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'الاسم بالعربي' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateLeaveTypeConfigDto.prototype, "nameAr", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'الاسم بالإنجليزي' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateLeaveTypeConfigDto.prototype, "nameEn", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'الوصف' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateLeaveTypeConfigDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'الاستحقاق الافتراضي' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateLeaveTypeConfigDto.prototype, "defaultEntitlement", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'الحد الأقصى للتراكم' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateLeaveTypeConfigDto.prototype, "maxBalanceCap", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'السماح بالترحيل' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateLeaveTypeConfigDto.prototype, "allowCarryForward", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'الحد الأقصى للأيام المرحلة' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateLeaveTypeConfigDto.prototype, "maxCarryForwardDays", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'هل مفعل؟' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateLeaveTypeConfigDto.prototype, "isActive", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'ترتيب العرض' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], UpdateLeaveTypeConfigDto.prototype, "sortOrder", void 0);
//# sourceMappingURL=leave-type-config.dto.js.map