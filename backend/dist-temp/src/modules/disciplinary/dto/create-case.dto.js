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
exports.CreateCaseDto = exports.ViolationType = void 0;
const class_validator_1 = require("class-validator");
var ViolationType;
(function (ViolationType) {
    ViolationType["ATTENDANCE"] = "ATTENDANCE";
    ViolationType["BEHAVIOR"] = "BEHAVIOR";
    ViolationType["PERFORMANCE"] = "PERFORMANCE";
    ViolationType["POLICY_VIOLATION"] = "POLICY_VIOLATION";
    ViolationType["SAFETY"] = "SAFETY";
    ViolationType["HARASSMENT"] = "HARASSMENT";
    ViolationType["THEFT"] = "THEFT";
    ViolationType["CONFIDENTIALITY"] = "CONFIDENTIALITY";
    ViolationType["OTHER"] = "OTHER";
})(ViolationType || (exports.ViolationType = ViolationType = {}));
class CreateCaseDto {
}
exports.CreateCaseDto = CreateCaseDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateCaseDto.prototype, "employeeId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], CreateCaseDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(ViolationType),
    __metadata("design:type", String)
], CreateCaseDto.prototype, "violationType", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateCaseDto.prototype, "incidentDate", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], CreateCaseDto.prototype, "incidentLocation", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CreateCaseDto.prototype, "involvedParties", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(5000),
    __metadata("design:type", String)
], CreateCaseDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCaseDto.prototype, "retrospectiveReason", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    __metadata("design:type", Array)
], CreateCaseDto.prototype, "attachments", void 0);
//# sourceMappingURL=create-case.dto.js.map