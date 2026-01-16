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
exports.CustodyQueryDto = exports.UpdateMaintenanceDto = exports.CreateMaintenanceDto = exports.RejectTransferDto = exports.ApproveTransferDto = exports.RequestTransferDto = exports.ReviewReturnDto = exports.RequestReturnDto = exports.SignAssignmentDto = exports.RejectAssignmentDto = exports.ApproveAssignmentDto = exports.AssignCustodyDto = exports.UpdateItemDto = exports.CreateItemDto = exports.UpdateCategoryCto = exports.CreateCategoryCto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class CreateCategoryCto {
}
exports.CreateCategoryCto = CreateCategoryCto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCategoryCto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCategoryCto.prototype, "nameEn", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCategoryCto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCategoryCto.prototype, "icon", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateCategoryCto.prototype, "requiresApproval", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateCategoryCto.prototype, "requiresSerialNumber", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateCategoryCto.prototype, "depreciationYears", void 0);
class UpdateCategoryCto {
}
exports.UpdateCategoryCto = UpdateCategoryCto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateCategoryCto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateCategoryCto.prototype, "nameEn", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateCategoryCto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateCategoryCto.prototype, "icon", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateCategoryCto.prototype, "requiresApproval", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateCategoryCto.prototype, "requiresSerialNumber", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], UpdateCategoryCto.prototype, "depreciationYears", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateCategoryCto.prototype, "isActive", void 0);
class CreateItemDto {
}
exports.CreateItemDto = CreateItemDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateItemDto.prototype, "categoryId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateItemDto.prototype, "code", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateItemDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateItemDto.prototype, "nameEn", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateItemDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateItemDto.prototype, "serialNumber", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateItemDto.prototype, "model", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateItemDto.prototype, "brand", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateItemDto.prototype, "barcode", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateItemDto.prototype, "purchaseDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateItemDto.prototype, "purchasePrice", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateItemDto.prototype, "warrantyExpiry", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateItemDto.prototype, "vendor", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateItemDto.prototype, "invoiceNumber", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateItemDto.prototype, "currentLocation", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateItemDto.prototype, "notes", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateItemDto.prototype, "imageUrl", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateItemDto.prototype, "branchId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['NEW', 'EXCELLENT', 'GOOD', 'FAIR', 'POOR']),
    __metadata("design:type", String)
], CreateItemDto.prototype, "condition", void 0);
class UpdateItemDto {
}
exports.UpdateItemDto = UpdateItemDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], UpdateItemDto.prototype, "categoryId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateItemDto.prototype, "code", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateItemDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateItemDto.prototype, "nameEn", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateItemDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateItemDto.prototype, "serialNumber", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateItemDto.prototype, "model", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateItemDto.prototype, "brand", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateItemDto.prototype, "barcode", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], UpdateItemDto.prototype, "purchaseDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], UpdateItemDto.prototype, "purchasePrice", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], UpdateItemDto.prototype, "warrantyExpiry", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateItemDto.prototype, "vendor", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateItemDto.prototype, "invoiceNumber", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['AVAILABLE', 'ASSIGNED', 'IN_MAINTENANCE', 'LOST', 'DAMAGED', 'DISPOSED', 'RESERVED']),
    __metadata("design:type", String)
], UpdateItemDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['NEW', 'EXCELLENT', 'GOOD', 'FAIR', 'POOR']),
    __metadata("design:type", String)
], UpdateItemDto.prototype, "condition", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateItemDto.prototype, "currentLocation", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateItemDto.prototype, "notes", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateItemDto.prototype, "imageUrl", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], UpdateItemDto.prototype, "branchId", void 0);
class AssignCustodyDto {
}
exports.AssignCustodyDto = AssignCustodyDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], AssignCustodyDto.prototype, "custodyItemId", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], AssignCustodyDto.prototype, "employeeId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], AssignCustodyDto.prototype, "expectedReturn", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['NEW', 'EXCELLENT', 'GOOD', 'FAIR', 'POOR']),
    __metadata("design:type", String)
], AssignCustodyDto.prototype, "conditionOnAssign", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AssignCustodyDto.prototype, "notes", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    __metadata("design:type", Array)
], AssignCustodyDto.prototype, "attachments", void 0);
class ApproveAssignmentDto {
}
exports.ApproveAssignmentDto = ApproveAssignmentDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], ApproveAssignmentDto.prototype, "assignmentId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ApproveAssignmentDto.prototype, "notes", void 0);
class RejectAssignmentDto {
}
exports.RejectAssignmentDto = RejectAssignmentDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], RejectAssignmentDto.prototype, "assignmentId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RejectAssignmentDto.prototype, "reason", void 0);
class SignAssignmentDto {
}
exports.SignAssignmentDto = SignAssignmentDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], SignAssignmentDto.prototype, "assignmentId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SignAssignmentDto.prototype, "signature", void 0);
class RequestReturnDto {
}
exports.RequestReturnDto = RequestReturnDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], RequestReturnDto.prototype, "assignmentId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RequestReturnDto.prototype, "returnReason", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(['NEW', 'EXCELLENT', 'GOOD', 'FAIR', 'POOR']),
    __metadata("design:type", String)
], RequestReturnDto.prototype, "conditionOnReturn", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RequestReturnDto.prototype, "damageDescription", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    __metadata("design:type", Array)
], RequestReturnDto.prototype, "attachments", void 0);
class ReviewReturnDto {
}
exports.ReviewReturnDto = ReviewReturnDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], ReviewReturnDto.prototype, "returnId", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(['APPROVED', 'REJECTED']),
    __metadata("design:type", String)
], ReviewReturnDto.prototype, "decision", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ReviewReturnDto.prototype, "reviewNotes", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], ReviewReturnDto.prototype, "estimatedCost", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ReviewReturnDto.prototype, "chargeEmployee", void 0);
class RequestTransferDto {
}
exports.RequestTransferDto = RequestTransferDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], RequestTransferDto.prototype, "custodyItemId", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], RequestTransferDto.prototype, "toEmployeeId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RequestTransferDto.prototype, "reason", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RequestTransferDto.prototype, "notes", void 0);
class ApproveTransferDto {
}
exports.ApproveTransferDto = ApproveTransferDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], ApproveTransferDto.prototype, "transferId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ApproveTransferDto.prototype, "signature", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ApproveTransferDto.prototype, "notes", void 0);
class RejectTransferDto {
}
exports.RejectTransferDto = RejectTransferDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], RejectTransferDto.prototype, "transferId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RejectTransferDto.prototype, "reason", void 0);
class CreateMaintenanceDto {
}
exports.CreateMaintenanceDto = CreateMaintenanceDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateMaintenanceDto.prototype, "custodyItemId", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(['PREVENTIVE', 'CORRECTIVE', 'EMERGENCY']),
    __metadata("design:type", String)
], CreateMaintenanceDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateMaintenanceDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateMaintenanceDto.prototype, "estimatedCost", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateMaintenanceDto.prototype, "vendor", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateMaintenanceDto.prototype, "vendorContact", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateMaintenanceDto.prototype, "vendorEmail", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    __metadata("design:type", Array)
], CreateMaintenanceDto.prototype, "attachments", void 0);
class UpdateMaintenanceDto {
}
exports.UpdateMaintenanceDto = UpdateMaintenanceDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANNOT_REPAIR']),
    __metadata("design:type", String)
], UpdateMaintenanceDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], UpdateMaintenanceDto.prototype, "actualCost", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateMaintenanceDto.prototype, "result", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['NEW', 'EXCELLENT', 'GOOD', 'FAIR', 'POOR']),
    __metadata("design:type", String)
], UpdateMaintenanceDto.prototype, "conditionAfter", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateMaintenanceDto.prototype, "invoiceNumber", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    __metadata("design:type", Array)
], UpdateMaintenanceDto.prototype, "attachments", void 0);
class CustodyQueryDto {
    constructor() {
        this.page = 1;
        this.limit = 20;
    }
}
exports.CustodyQueryDto = CustodyQueryDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['AVAILABLE', 'ASSIGNED', 'IN_MAINTENANCE', 'LOST', 'DAMAGED', 'DISPOSED', 'RESERVED']),
    __metadata("design:type", String)
], CustodyQueryDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CustodyQueryDto.prototype, "categoryId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CustodyQueryDto.prototype, "branchId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CustodyQueryDto.prototype, "employeeId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CustodyQueryDto.prototype, "search", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CustodyQueryDto.prototype, "page", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CustodyQueryDto.prototype, "limit", void 0);
//# sourceMappingURL=custody.dto.js.map