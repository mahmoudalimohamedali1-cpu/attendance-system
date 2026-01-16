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
exports.ReorderTaskDto = exports.AddDependencyDto = exports.CreateTimeLogDto = exports.BulkAssignDto = exports.AssignTaskDto = exports.UpdateCommentDto = exports.CreateCommentDto = exports.ToggleChecklistItemDto = exports.CreateChecklistItemDto = exports.CreateChecklistDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class CreateChecklistDto {
}
exports.CreateChecklistDto = CreateChecklistDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'عنوان قائمة التحقق', example: 'متطلبات التوظيف' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateChecklistDto.prototype, "title", void 0);
class CreateChecklistItemDto {
}
exports.CreateChecklistItemDto = CreateChecklistItemDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'محتوى العنصر', example: 'توقيع العقد' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateChecklistItemDto.prototype, "content", void 0);
class ToggleChecklistItemDto {
}
exports.ToggleChecklistItemDto = ToggleChecklistItemDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'حالة الإكمال' }),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ToggleChecklistItemDto.prototype, "isCompleted", void 0);
class CreateCommentDto {
}
exports.CreateCommentDto = CreateCommentDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'محتوى التعليق' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCommentDto.prototype, "content", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'معرفات المستخدمين المذكورين', type: [String] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsUUID)('4', { each: true }),
    __metadata("design:type", Array)
], CreateCommentDto.prototype, "mentions", void 0);
class UpdateCommentDto {
}
exports.UpdateCommentDto = UpdateCommentDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'المحتوى الجديد' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateCommentDto.prototype, "content", void 0);
class AssignTaskDto {
}
exports.AssignTaskDto = AssignTaskDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'معرف المستخدم المكلف' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], AssignTaskDto.prototype, "userId", void 0);
class BulkAssignDto {
}
exports.BulkAssignDto = BulkAssignDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'معرفات المستخدمين', type: [String] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsUUID)('4', { each: true }),
    __metadata("design:type", Array)
], BulkAssignDto.prototype, "userIds", void 0);
class CreateTimeLogDto {
}
exports.CreateTimeLogDto = CreateTimeLogDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'وقت البداية' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateTimeLogDto.prototype, "startTime", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'وقت النهاية' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateTimeLogDto.prototype, "endTime", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'المدة بالدقائق' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateTimeLogDto.prototype, "duration", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'الوصف' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTimeLogDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'قابل للفوترة' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateTimeLogDto.prototype, "isBillable", void 0);
class AddDependencyDto {
}
exports.AddDependencyDto = AddDependencyDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'معرف المهمة المانعة' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], AddDependencyDto.prototype, "blockingTaskId", void 0);
class ReorderTaskDto {
}
exports.ReorderTaskDto = ReorderTaskDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'الحالة الجديدة' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ReorderTaskDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'الترتيب الجديد' }),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], ReorderTaskDto.prototype, "order", void 0);
//# sourceMappingURL=task-actions.dto.js.map