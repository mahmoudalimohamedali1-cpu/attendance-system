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
exports.CreateLeaveRequestDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
var LeaveType;
(function (LeaveType) {
    LeaveType["ANNUAL"] = "ANNUAL";
    LeaveType["SICK"] = "SICK";
    LeaveType["PERSONAL"] = "PERSONAL";
    LeaveType["EMERGENCY"] = "EMERGENCY";
    LeaveType["NEW_BABY"] = "NEW_BABY";
    LeaveType["MARRIAGE"] = "MARRIAGE";
    LeaveType["BEREAVEMENT"] = "BEREAVEMENT";
    LeaveType["HAJJ"] = "HAJJ";
    LeaveType["EXAM"] = "EXAM";
    LeaveType["WORK_MISSION"] = "WORK_MISSION";
    LeaveType["UNPAID"] = "UNPAID";
    LeaveType["EARLY_LEAVE"] = "EARLY_LEAVE";
    LeaveType["OTHER"] = "OTHER";
})(LeaveType || (LeaveType = {}));
let AdvanceNoticeValidator = class AdvanceNoticeValidator {
    validate(startDate, args) {
        const dto = args.object;
        if (['EMERGENCY', 'SICK'].includes(dto.type)) {
            return true;
        }
        const start = new Date(startDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return start >= today;
    }
    defaultMessage() {
        return 'تاريخ البداية يجب أن يكون اليوم أو بعده (إلا للإجازات الطارئة والمرضية)';
    }
};
AdvanceNoticeValidator = __decorate([
    (0, class_validator_1.ValidatorConstraint)({ name: 'advanceNotice', async: false })
], AdvanceNoticeValidator);
let MaxDurationValidator = class MaxDurationValidator {
    validate(endDate, args) {
        const dto = args.object;
        const start = new Date(dto.startDate);
        const end = new Date(endDate);
        const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        return diffDays <= 90;
    }
    defaultMessage() {
        return 'مدة الإجازة لا يمكن أن تتجاوز 90 يوماً';
    }
};
MaxDurationValidator = __decorate([
    (0, class_validator_1.ValidatorConstraint)({ name: 'maxDuration', async: false })
], MaxDurationValidator);
class CreateLeaveRequestDto {
}
exports.CreateLeaveRequestDto = CreateLeaveRequestDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'نوع الإجازة', enum: LeaveType }),
    (0, class_validator_1.IsEnum)(LeaveType),
    __metadata("design:type", String)
], CreateLeaveRequestDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'تاريخ البداية', example: '2024-01-15' }),
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.Validate)(AdvanceNoticeValidator),
    __metadata("design:type", String)
], CreateLeaveRequestDto.prototype, "startDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'تاريخ النهاية', example: '2024-01-17' }),
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.Validate)(MaxDurationValidator),
    __metadata("design:type", String)
], CreateLeaveRequestDto.prototype, "endDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'السبب أو الملاحظات', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500, { message: 'الملاحظات يجب ألا تتجاوز 500 حرف' }),
    __metadata("design:type", String)
], CreateLeaveRequestDto.prototype, "reason", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'ملاحظات', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500, { message: 'الملاحظات يجب ألا تتجاوز 500 حرف' }),
    __metadata("design:type", String)
], CreateLeaveRequestDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'المرفقات', required: false, type: 'array' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], CreateLeaveRequestDto.prototype, "attachments", void 0);
//# sourceMappingURL=create-leave-request.dto.js.map