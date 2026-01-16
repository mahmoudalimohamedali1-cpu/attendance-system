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
exports.UpdateQiwaStatusDto = exports.RejectContractDto = exports.SignContractDto = exports.RenewContractDto = exports.TerminateContractDto = exports.UpdateContractDto = exports.CreateContractDto = exports.QiwaAuthStatus = exports.ContractStatus = exports.ContractType = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
var ContractType;
(function (ContractType) {
    ContractType["PERMANENT"] = "PERMANENT";
    ContractType["FIXED_TERM"] = "FIXED_TERM";
    ContractType["PART_TIME"] = "PART_TIME";
    ContractType["SEASONAL"] = "SEASONAL";
    ContractType["PROBATION"] = "PROBATION";
})(ContractType || (exports.ContractType = ContractType = {}));
var ContractStatus;
(function (ContractStatus) {
    ContractStatus["DRAFT"] = "DRAFT";
    ContractStatus["PENDING_EMPLOYEE"] = "PENDING_EMPLOYEE";
    ContractStatus["PENDING_EMPLOYER"] = "PENDING_EMPLOYER";
    ContractStatus["PENDING_QIWA"] = "PENDING_QIWA";
    ContractStatus["ACTIVE"] = "ACTIVE";
    ContractStatus["EXPIRED"] = "EXPIRED";
    ContractStatus["TERMINATED"] = "TERMINATED";
    ContractStatus["RENEWED"] = "RENEWED";
    ContractStatus["SUSPENDED"] = "SUSPENDED";
    ContractStatus["REJECTED"] = "REJECTED";
})(ContractStatus || (exports.ContractStatus = ContractStatus = {}));
var QiwaAuthStatus;
(function (QiwaAuthStatus) {
    QiwaAuthStatus["NOT_SUBMITTED"] = "NOT_SUBMITTED";
    QiwaAuthStatus["PENDING"] = "PENDING";
    QiwaAuthStatus["AUTHENTICATED"] = "AUTHENTICATED";
    QiwaAuthStatus["REJECTED"] = "REJECTED";
    QiwaAuthStatus["EXPIRED"] = "EXPIRED";
})(QiwaAuthStatus || (exports.QiwaAuthStatus = QiwaAuthStatus = {}));
class CreateContractDto {
}
exports.CreateContractDto = CreateContractDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'معرف الموظف' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateContractDto.prototype, "userId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'رقم العقد' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateContractDto.prototype, "contractNumber", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'نوع العقد', enum: ContractType }),
    (0, class_validator_1.IsEnum)(ContractType),
    __metadata("design:type", String)
], CreateContractDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'تاريخ البداية' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateContractDto.prototype, "startDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'تاريخ النهاية' }),
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateContractDto.prototype, "endDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'تاريخ انتهاء فترة التجربة' }),
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateContractDto.prototype, "probationEndDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'دورة صرف الراتب', default: 'MONTHLY' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateContractDto.prototype, "salaryCycle", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'الراتب الأساسي' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateContractDto.prototype, "basicSalary", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'بدل السكن' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateContractDto.prototype, "housingAllowance", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'بدل المواصلات' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateContractDto.prototype, "transportAllowance", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'بدلات أخرى' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateContractDto.prototype, "otherAllowances", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'المسمى الوظيفي في العقد' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateContractDto.prototype, "contractJobTitle", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'مقر العمل' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateContractDto.prototype, "workLocation", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'ساعات العمل الأسبوعية', default: 48 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateContractDto.prototype, "workingHoursPerWeek", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'أيام الإجازة السنوية', default: 21 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateContractDto.prototype, "annualLeaveDays", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'فترة الإشعار (بالأيام)', default: 30 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateContractDto.prototype, "noticePeriodDays", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'رابط ملف العقد' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateContractDto.prototype, "documentUrl", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'بنود إضافية' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateContractDto.prototype, "additionalTerms", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'ملاحظات داخلية' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateContractDto.prototype, "notes", void 0);
class UpdateContractDto {
}
exports.UpdateContractDto = UpdateContractDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'نوع العقد', enum: ContractType }),
    (0, class_validator_1.IsEnum)(ContractType),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateContractDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'حالة العقد', enum: ContractStatus }),
    (0, class_validator_1.IsEnum)(ContractStatus),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateContractDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'تاريخ البداية' }),
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateContractDto.prototype, "startDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'تاريخ النهاية' }),
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateContractDto.prototype, "endDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'تاريخ انتهاء فترة التجربة' }),
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateContractDto.prototype, "probationEndDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'دورة صرف الراتب' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateContractDto.prototype, "salaryCycle", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'الراتب الأساسي' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdateContractDto.prototype, "basicSalary", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'بدل السكن' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdateContractDto.prototype, "housingAllowance", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'بدل المواصلات' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdateContractDto.prototype, "transportAllowance", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'بدلات أخرى' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdateContractDto.prototype, "otherAllowances", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'المسمى الوظيفي في العقد' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateContractDto.prototype, "contractJobTitle", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'مقر العمل' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateContractDto.prototype, "workLocation", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'ساعات العمل الأسبوعية' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdateContractDto.prototype, "workingHoursPerWeek", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'أيام الإجازة السنوية' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdateContractDto.prototype, "annualLeaveDays", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'فترة الإشعار (بالأيام)' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdateContractDto.prototype, "noticePeriodDays", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'رابط ملف العقد' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateContractDto.prototype, "documentUrl", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'بنود إضافية' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateContractDto.prototype, "additionalTerms", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'ملاحظات داخلية' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateContractDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'رقم العقد في قوى' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateContractDto.prototype, "qiwaContractId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'حالة التوثيق في قوى', enum: QiwaAuthStatus }),
    (0, class_validator_1.IsEnum)(QiwaAuthStatus),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateContractDto.prototype, "qiwaStatus", void 0);
class TerminateContractDto {
}
exports.TerminateContractDto = TerminateContractDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'سبب الإنهاء' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], TerminateContractDto.prototype, "terminationReason", void 0);
class RenewContractDto {
}
exports.RenewContractDto = RenewContractDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'تاريخ انتهاء العقد الجديد' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], RenewContractDto.prototype, "newEndDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'نوع العقد الجديد', enum: ContractType }),
    (0, class_validator_1.IsEnum)(ContractType),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], RenewContractDto.prototype, "newType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'الراتب الأساسي الجديد' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], RenewContractDto.prototype, "newBasicSalary", void 0);
class SignContractDto {
}
exports.SignContractDto = SignContractDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'ملاحظات التوقيع' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], SignContractDto.prototype, "signatureNotes", void 0);
class RejectContractDto {
}
exports.RejectContractDto = RejectContractDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'سبب الرفض' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], RejectContractDto.prototype, "rejectionReason", void 0);
class UpdateQiwaStatusDto {
}
exports.UpdateQiwaStatusDto = UpdateQiwaStatusDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'رقم العقد في قوى' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateQiwaStatusDto.prototype, "qiwaContractId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'حالة التوثيق', enum: QiwaAuthStatus }),
    (0, class_validator_1.IsEnum)(QiwaAuthStatus),
    __metadata("design:type", String)
], UpdateQiwaStatusDto.prototype, "qiwaStatus", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'سبب الرفض' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateQiwaStatusDto.prototype, "rejectReason", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'تاريخ التوثيق' }),
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateQiwaStatusDto.prototype, "authDate", void 0);
//# sourceMappingURL=contract.dto.js.map