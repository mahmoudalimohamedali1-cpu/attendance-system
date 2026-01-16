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
exports.CreatePayrollPeriodDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class CreatePayrollPeriodDto {
}
exports.CreatePayrollPeriodDto = CreatePayrollPeriodDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'الشهر (1-12)', example: 12 }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(12),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Number)
], CreatePayrollPeriodDto.prototype, "month", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'السنة', example: 2023 }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(2020),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Number)
], CreatePayrollPeriodDto.prototype, "year", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'تاريخ بداية الفترة' }),
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreatePayrollPeriodDto.prototype, "startDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'تاريخ نهاية الفترة' }),
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreatePayrollPeriodDto.prototype, "endDate", void 0);
//# sourceMappingURL=create-payroll-period.dto.js.map