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
exports.CreateLoanPaymentDto = exports.PaymentType = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
var PaymentType;
(function (PaymentType) {
    PaymentType["SALARY_DEDUCTION"] = "SALARY_DEDUCTION";
    PaymentType["MANUAL"] = "MANUAL";
    PaymentType["CASH"] = "CASH";
})(PaymentType || (exports.PaymentType = PaymentType = {}));
class CreateLoanPaymentDto {
    constructor() {
        this.paymentType = PaymentType.SALARY_DEDUCTION;
    }
}
exports.CreateLoanPaymentDto = CreateLoanPaymentDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'معرف السلفة' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateLoanPaymentDto.prototype, "advanceId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'مبلغ السداد' }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateLoanPaymentDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'تاريخ السداد' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateLoanPaymentDto.prototype, "paymentDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'نوع السداد', enum: PaymentType, default: PaymentType.SALARY_DEDUCTION }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(PaymentType),
    __metadata("design:type", String)
], CreateLoanPaymentDto.prototype, "paymentType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'معرف مسير الرواتب', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateLoanPaymentDto.prototype, "payrollRunId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'معرف قسيمة الراتب', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateLoanPaymentDto.prototype, "payslipId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'ملاحظات', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateLoanPaymentDto.prototype, "notes", void 0);
//# sourceMappingURL=create-loan-payment.dto.js.map