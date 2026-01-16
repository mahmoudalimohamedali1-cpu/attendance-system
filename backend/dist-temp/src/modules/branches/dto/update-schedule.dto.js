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
exports.UpdateScheduleDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
class ScheduleItem {
    constructor() {
        this.isWorkingDay = true;
    }
}
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'يوم الأسبوع (0=الأحد, 6=السبت)', minimum: 0, maximum: 6 }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(6),
    __metadata("design:type", Number)
], ScheduleItem.prototype, "dayOfWeek", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'وقت بداية الدوام', example: '09:00' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
    __metadata("design:type", String)
], ScheduleItem.prototype, "workStartTime", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'وقت نهاية الدوام', example: '17:00' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
    __metadata("design:type", String)
], ScheduleItem.prototype, "workEndTime", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'يوم عمل', default: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ScheduleItem.prototype, "isWorkingDay", void 0);
class UpdateScheduleDto {
}
exports.UpdateScheduleDto = UpdateScheduleDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'جدول العمل', type: [ScheduleItem] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => ScheduleItem),
    __metadata("design:type", Array)
], UpdateScheduleDto.prototype, "schedules", void 0);
//# sourceMappingURL=update-schedule.dto.js.map