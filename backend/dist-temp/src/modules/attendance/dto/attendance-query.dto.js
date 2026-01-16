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
exports.AttendanceQueryDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
var AttendanceStatus;
(function (AttendanceStatus) {
    AttendanceStatus["PRESENT"] = "PRESENT";
    AttendanceStatus["LATE"] = "LATE";
    AttendanceStatus["EARLY_LEAVE"] = "EARLY_LEAVE";
    AttendanceStatus["ABSENT"] = "ABSENT";
    AttendanceStatus["ON_LEAVE"] = "ON_LEAVE";
    AttendanceStatus["WORK_FROM_HOME"] = "WORK_FROM_HOME";
})(AttendanceStatus || (AttendanceStatus = {}));
class AttendanceQueryDto {
    constructor() {
        this.page = 1;
        this.limit = 30;
    }
}
exports.AttendanceQueryDto = AttendanceQueryDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'تاريخ البداية', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], AttendanceQueryDto.prototype, "startDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'تاريخ النهاية', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], AttendanceQueryDto.prototype, "endDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'تاريخ محدد', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], AttendanceQueryDto.prototype, "date", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'البحث عن موظف', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AttendanceQueryDto.prototype, "search", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'حالة الحضور', enum: AttendanceStatus, required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(AttendanceStatus),
    __metadata("design:type", String)
], AttendanceQueryDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'معرف الفرع', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], AttendanceQueryDto.prototype, "branchId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'معرف القسم', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], AttendanceQueryDto.prototype, "departmentId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'معرف الموظف', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], AttendanceQueryDto.prototype, "userId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'رقم الصفحة', default: 1 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], AttendanceQueryDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'عدد العناصر في الصفحة', default: 30 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], AttendanceQueryDto.prototype, "limit", void 0);
//# sourceMappingURL=attendance-query.dto.js.map