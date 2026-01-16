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
exports.TaskQueryDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
const class_transformer_1 = require("class-transformer");
class TaskQueryDto {
    constructor() {
        this.page = 1;
        this.limit = 20;
        this.sortBy = 'createdAt';
        this.sortOrder = 'desc';
    }
}
exports.TaskQueryDto = TaskQueryDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'البحث في العنوان والوصف' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TaskQueryDto.prototype, "search", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: client_1.TaskStatus }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.TaskStatus),
    __metadata("design:type", String)
], TaskQueryDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: client_1.TaskPriority }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.TaskPriority),
    __metadata("design:type", String)
], TaskQueryDto.prototype, "priority", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'معرف الفئة' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], TaskQueryDto.prototype, "categoryId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'المكلف بالمهمة' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], TaskQueryDto.prototype, "assigneeId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'منشئ المهمة' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], TaskQueryDto.prototype, "createdById", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'تاريخ الاستحقاق من' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], TaskQueryDto.prototype, "dueDateFrom", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'تاريخ الاستحقاق إلى' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], TaskQueryDto.prototype, "dueDateTo", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'علامات للفلترة (مفصولة بفاصلة)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TaskQueryDto.prototype, "tags", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'رقم الصفحة', default: 1, minimum: 1 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => parseInt(value, 10)),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], TaskQueryDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'عدد العناصر في الصفحة', default: 20, minimum: 1 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => parseInt(value, 10)),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], TaskQueryDto.prototype, "limit", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'ترتيب حسب', default: 'createdAt' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TaskQueryDto.prototype, "sortBy", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'اتجاه الترتيب', enum: ['asc', 'desc'], default: 'desc' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TaskQueryDto.prototype, "sortOrder", void 0);
//# sourceMappingURL=task-query.dto.js.map