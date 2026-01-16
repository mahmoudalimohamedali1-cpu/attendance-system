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
exports.UpdateManagerDto = exports.BulkUpdatePermissionsDto = exports.UpdatePermissionEmployeesDto = exports.AddUserPermissionDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const client_1 = require("@prisma/client");
class AddUserPermissionDto {
}
exports.AddUserPermissionDto = AddUserPermissionDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'كود الصلاحية', example: 'LEAVES_VIEW' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AddUserPermissionDto.prototype, "permissionCode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'نطاق الصلاحية', enum: client_1.PermissionScope }),
    (0, class_validator_1.IsEnum)(client_1.PermissionScope),
    __metadata("design:type", String)
], AddUserPermissionDto.prototype, "scope", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'معرف الفرع (إذا كان النطاق BRANCH)', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], AddUserPermissionDto.prototype, "branchId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'معرف القسم (إذا كان النطاق DEPARTMENT)', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], AddUserPermissionDto.prototype, "departmentId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'معرفات الموظفين (إذا كان النطاق CUSTOM)', required: false, type: [String] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsUUID)('4', { each: true }),
    __metadata("design:type", Array)
], AddUserPermissionDto.prototype, "employeeIds", void 0);
class UpdatePermissionEmployeesDto {
}
exports.UpdatePermissionEmployeesDto = UpdatePermissionEmployeesDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'معرفات الموظفين', type: [String] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsUUID)('4', { each: true }),
    __metadata("design:type", Array)
], UpdatePermissionEmployeesDto.prototype, "employeeIds", void 0);
class BulkUpdatePermissionsDto {
}
exports.BulkUpdatePermissionsDto = BulkUpdatePermissionsDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'قائمة الصلاحيات مع نطاقاتها',
        type: 'array',
        items: {
            type: 'object',
            properties: {
                permissionCode: { type: 'string' },
                scopes: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            scope: { type: 'string', enum: Object.values(client_1.PermissionScope) },
                            branchId: { type: 'string', nullable: true },
                            departmentId: { type: 'string', nullable: true },
                            employeeIds: { type: 'array', items: { type: 'string' }, nullable: true },
                        },
                    },
                },
            },
        },
    }),
    (0, class_validator_1.IsArray)(),
    __metadata("design:type", Array)
], BulkUpdatePermissionsDto.prototype, "permissions", void 0);
class UpdateManagerDto {
}
exports.UpdateManagerDto = UpdateManagerDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'معرف المدير المباشر', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", Object)
], UpdateManagerDto.prototype, "managerId", void 0);
//# sourceMappingURL=permissions.dto.js.map