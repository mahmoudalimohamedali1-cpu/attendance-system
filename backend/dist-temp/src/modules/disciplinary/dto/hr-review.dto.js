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
exports.HRReviewDto = exports.HRInitialAction = void 0;
const class_validator_1 = require("class-validator");
var HRInitialAction;
(function (HRInitialAction) {
    HRInitialAction["REJECT"] = "REJECT";
    HRInitialAction["INFORMAL_NOTICE"] = "INFORMAL_NOTICE";
    HRInitialAction["INFORMAL_WARNING"] = "INFORMAL_WARNING";
    HRInitialAction["APPROVE_OFFICIAL"] = "APPROVE_OFFICIAL";
})(HRInitialAction || (exports.HRInitialAction = HRInitialAction = {}));
class HRReviewDto {
}
exports.HRReviewDto = HRReviewDto;
__decorate([
    (0, class_validator_1.IsEnum)(HRInitialAction),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], HRReviewDto.prototype, "action", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(1000),
    __metadata("design:type", String)
], HRReviewDto.prototype, "reason", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], HRReviewDto.prototype, "hearingDatetime", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], HRReviewDto.prototype, "hearingLocation", void 0);
//# sourceMappingURL=hr-review.dto.js.map