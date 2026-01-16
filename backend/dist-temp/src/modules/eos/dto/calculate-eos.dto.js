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
exports.CalculateEosDto = exports.EosReason = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
var EosReason;
(function (EosReason) {
    EosReason["RESIGNATION"] = "RESIGNATION";
    EosReason["TERMINATION"] = "TERMINATION";
    EosReason["END_OF_CONTRACT"] = "END_OF_CONTRACT";
    EosReason["RETIREMENT"] = "RETIREMENT";
    EosReason["DEATH"] = "DEATH";
})(EosReason || (exports.EosReason = EosReason = {}));
class CalculateEosDto {
}
exports.CalculateEosDto = CalculateEosDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'سبب إنهاء الخدمة', enum: EosReason }),
    (0, class_validator_1.IsEnum)(EosReason),
    __metadata("design:type", String)
], CalculateEosDto.prototype, "reason", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'تاريخ آخر يوم عمل' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CalculateEosDto.prototype, "lastWorkingDay", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'تجاوز الراتب الأساسي (اختياري)', example: 10000 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CalculateEosDto.prototype, "overrideBaseSalary", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'تجاوز عدد أيام الإجازة المتبقية (اختياري)', example: 15 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CalculateEosDto.prototype, "overrideRemainingLeaveDays", void 0);
//# sourceMappingURL=calculate-eos.dto.js.map