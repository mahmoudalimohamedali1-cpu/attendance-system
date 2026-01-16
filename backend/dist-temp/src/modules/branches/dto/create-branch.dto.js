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
exports.CreateBranchDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class CreateBranchDto {
    constructor() {
        this.geofenceRadius = 100;
        this.timezone = 'Asia/Riyadh';
        this.workStartTime = '09:00';
        this.workEndTime = '17:00';
        this.lateGracePeriod = 10;
        this.earlyCheckInPeriod = 15;
        this.earlyCheckOutPeriod = 0;
        this.workingDays = '0,1,2,3,4';
        this.isActive = true;
    }
}
exports.CreateBranchDto = CreateBranchDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'اسم الفرع', example: 'الفرع الرئيسي' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateBranchDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'اسم الفرع بالإنجليزية', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateBranchDto.prototype, "nameEn", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'العنوان', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateBranchDto.prototype, "address", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'خط العرض', example: 24.7136 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(-90),
    (0, class_validator_1.Max)(90),
    __metadata("design:type", Number)
], CreateBranchDto.prototype, "latitude", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'خط الطول', example: 46.6753 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(-180),
    (0, class_validator_1.Max)(180),
    __metadata("design:type", Number)
], CreateBranchDto.prototype, "longitude", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'نصف قطر الحضور بالمتر', default: 100 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(10),
    (0, class_validator_1.Max)(5000),
    __metadata("design:type", Number)
], CreateBranchDto.prototype, "geofenceRadius", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'المنطقة الزمنية', default: 'Asia/Riyadh' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateBranchDto.prototype, "timezone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'وقت بداية الدوام', default: '09:00' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Matches)(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'صيغة الوقت غير صحيحة (HH:MM)' }),
    __metadata("design:type", String)
], CreateBranchDto.prototype, "workStartTime", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'وقت نهاية الدوام', default: '17:00' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Matches)(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'صيغة الوقت غير صحيحة (HH:MM)' }),
    __metadata("design:type", String)
], CreateBranchDto.prototype, "workEndTime", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'فترة السماح للتأخير (دقائق)', default: 10 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(60),
    __metadata("design:type", Number)
], CreateBranchDto.prototype, "lateGracePeriod", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'فترة السماح للحضور المبكر (دقائق)', default: 15 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(120),
    __metadata("design:type", Number)
], CreateBranchDto.prototype, "earlyCheckInPeriod", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'فترة السماح للانصراف المبكر (دقائق)', default: 0 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(60),
    __metadata("design:type", Number)
], CreateBranchDto.prototype, "earlyCheckOutPeriod", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'أيام العمل (0-6 مفصولة بفاصلة)', default: '0,1,2,3,4' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^[0-6](,[0-6])*$/, { message: 'صيغة أيام العمل غير صحيحة' }),
    __metadata("design:type", String)
], CreateBranchDto.prototype, "workingDays", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'الفرع فعال', default: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateBranchDto.prototype, "isActive", void 0);
//# sourceMappingURL=create-branch.dto.js.map