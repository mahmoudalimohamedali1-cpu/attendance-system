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
exports.AttendanceQueryDto = exports.RequestOnBehalfDto = exports.AdvanceRequestOnBehalfDto = exports.LetterRequestOnBehalfDto = exports.LeaveRequestOnBehalfDto = exports.UpdateProfileDto = exports.UploadDocumentDto = exports.RequestOnBehalfType = exports.DocumentTypeEnum = void 0;
const class_validator_1 = require("class-validator");
var DocumentTypeEnum;
(function (DocumentTypeEnum) {
    DocumentTypeEnum["ID_CARD"] = "ID_CARD";
    DocumentTypeEnum["IQAMA"] = "IQAMA";
    DocumentTypeEnum["PASSPORT"] = "PASSPORT";
    DocumentTypeEnum["CONTRACT"] = "CONTRACT";
    DocumentTypeEnum["CERTIFICATE"] = "CERTIFICATE";
    DocumentTypeEnum["MEDICAL"] = "MEDICAL";
    DocumentTypeEnum["BANK_LETTER"] = "BANK_LETTER";
    DocumentTypeEnum["DRIVING_LICENSE"] = "DRIVING_LICENSE";
    DocumentTypeEnum["QUALIFICATION"] = "QUALIFICATION";
    DocumentTypeEnum["OTHER"] = "OTHER";
})(DocumentTypeEnum || (exports.DocumentTypeEnum = DocumentTypeEnum = {}));
var RequestOnBehalfType;
(function (RequestOnBehalfType) {
    RequestOnBehalfType["LEAVE"] = "LEAVE";
    RequestOnBehalfType["LETTER"] = "LETTER";
    RequestOnBehalfType["ADVANCE"] = "ADVANCE";
})(RequestOnBehalfType || (exports.RequestOnBehalfType = RequestOnBehalfType = {}));
class UploadDocumentDto {
}
exports.UploadDocumentDto = UploadDocumentDto;
__decorate([
    (0, class_validator_1.IsEnum)(DocumentTypeEnum),
    __metadata("design:type", String)
], UploadDocumentDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UploadDocumentDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UploadDocumentDto.prototype, "titleAr", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UploadDocumentDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UploadDocumentDto.prototype, "documentNumber", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UploadDocumentDto.prototype, "issueDate", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UploadDocumentDto.prototype, "expiryDate", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UploadDocumentDto.prototype, "issuingAuthority", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UploadDocumentDto.prototype, "notes", void 0);
class UpdateProfileDto {
}
exports.UpdateProfileDto = UpdateProfileDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateProfileDto.prototype, "firstName", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateProfileDto.prototype, "lastName", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateProfileDto.prototype, "phone", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateProfileDto.prototype, "nationality", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateProfileDto.prototype, "dateOfBirth", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateProfileDto.prototype, "gender", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateProfileDto.prototype, "maritalStatus", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateProfileDto.prototype, "nationalId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateProfileDto.prototype, "iqamaNumber", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateProfileDto.prototype, "iqamaExpiryDate", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateProfileDto.prototype, "passportNumber", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateProfileDto.prototype, "passportExpiryDate", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateProfileDto.prototype, "gosiNumber", void 0);
class LeaveRequestOnBehalfDto {
}
exports.LeaveRequestOnBehalfDto = LeaveRequestOnBehalfDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], LeaveRequestOnBehalfDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], LeaveRequestOnBehalfDto.prototype, "startDate", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], LeaveRequestOnBehalfDto.prototype, "endDate", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], LeaveRequestOnBehalfDto.prototype, "reason", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], LeaveRequestOnBehalfDto.prototype, "notes", void 0);
class LetterRequestOnBehalfDto {
}
exports.LetterRequestOnBehalfDto = LetterRequestOnBehalfDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], LetterRequestOnBehalfDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], LetterRequestOnBehalfDto.prototype, "notes", void 0);
class AdvanceRequestOnBehalfDto {
}
exports.AdvanceRequestOnBehalfDto = AdvanceRequestOnBehalfDto;
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], AdvanceRequestOnBehalfDto.prototype, "amount", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AdvanceRequestOnBehalfDto.prototype, "reason", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], AdvanceRequestOnBehalfDto.prototype, "repaymentMonths", void 0);
class RequestOnBehalfDto {
}
exports.RequestOnBehalfDto = RequestOnBehalfDto;
__decorate([
    (0, class_validator_1.IsEnum)(RequestOnBehalfType),
    __metadata("design:type", String)
], RequestOnBehalfDto.prototype, "requestType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", LeaveRequestOnBehalfDto)
], RequestOnBehalfDto.prototype, "leaveData", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", LetterRequestOnBehalfDto)
], RequestOnBehalfDto.prototype, "letterData", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", AdvanceRequestOnBehalfDto)
], RequestOnBehalfDto.prototype, "advanceData", void 0);
class AttendanceQueryDto {
}
exports.AttendanceQueryDto = AttendanceQueryDto;
__decorate([
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], AttendanceQueryDto.prototype, "startDate", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], AttendanceQueryDto.prototype, "endDate", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], AttendanceQueryDto.prototype, "page", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], AttendanceQueryDto.prototype, "limit", void 0);
//# sourceMappingURL=profile.dto.js.map