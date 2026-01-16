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
exports.LeaveQueryDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
var LeaveType;
(function (LeaveType) {
    LeaveType["ANNUAL"] = "ANNUAL";
    LeaveType["SICK"] = "SICK";
    LeaveType["PERSONAL"] = "PERSONAL";
    LeaveType["EMERGENCY"] = "EMERGENCY";
    LeaveType["WORK_FROM_HOME"] = "WORK_FROM_HOME";
    LeaveType["EARLY_LEAVE"] = "EARLY_LEAVE";
    LeaveType["OTHER"] = "OTHER";
})(LeaveType || (LeaveType = {}));
var LeaveStatus;
(function (LeaveStatus) {
    LeaveStatus["PENDING"] = "PENDING";
    LeaveStatus["APPROVED"] = "APPROVED";
    LeaveStatus["REJECTED"] = "REJECTED";
    LeaveStatus["CANCELLED"] = "CANCELLED";
})(LeaveStatus || (LeaveStatus = {}));
class LeaveQueryDto {
    constructor() {
        this.page = 1;
        this.limit = 20;
    }
}
exports.LeaveQueryDto = LeaveQueryDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'حالة الطلب', enum: LeaveStatus, required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(LeaveStatus),
    __metadata("design:type", String)
], LeaveQueryDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'نوع الإجازة', enum: LeaveType, required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(LeaveType),
    __metadata("design:type", String)
], LeaveQueryDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'معرف الموظف', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], LeaveQueryDto.prototype, "userId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'رقم الصفحة', default: 1 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], LeaveQueryDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'عدد العناصر في الصفحة', default: 20 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], LeaveQueryDto.prototype, "limit", void 0);
//# sourceMappingURL=leave-query.dto.js.map