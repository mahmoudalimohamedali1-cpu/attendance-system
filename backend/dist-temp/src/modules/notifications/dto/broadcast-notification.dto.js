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
exports.BroadcastNotificationDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
var NotificationType;
(function (NotificationType) {
    NotificationType["LATE_CHECK_IN"] = "LATE_CHECK_IN";
    NotificationType["EARLY_CHECK_OUT"] = "EARLY_CHECK_OUT";
    NotificationType["EARLY_CHECK_IN"] = "EARLY_CHECK_IN";
    NotificationType["LEAVE_APPROVED"] = "LEAVE_APPROVED";
    NotificationType["LEAVE_REJECTED"] = "LEAVE_REJECTED";
    NotificationType["SUSPICIOUS_ACTIVITY"] = "SUSPICIOUS_ACTIVITY";
    NotificationType["GENERAL"] = "GENERAL";
})(NotificationType || (NotificationType = {}));
class BroadcastNotificationDto {
}
exports.BroadcastNotificationDto = BroadcastNotificationDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'نوع الإشعار', enum: NotificationType }),
    (0, class_validator_1.IsEnum)(NotificationType),
    __metadata("design:type", String)
], BroadcastNotificationDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'عنوان الإشعار' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BroadcastNotificationDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'نص الإشعار' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BroadcastNotificationDto.prototype, "body", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'قائمة معرفات المستخدمين (اختياري - للإرسال للكل اتركه فارغاً)', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsUUID)('4', { each: true }),
    __metadata("design:type", Array)
], BroadcastNotificationDto.prototype, "userIds", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'بيانات إضافية', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], BroadcastNotificationDto.prototype, "data", void 0);
//# sourceMappingURL=broadcast-notification.dto.js.map