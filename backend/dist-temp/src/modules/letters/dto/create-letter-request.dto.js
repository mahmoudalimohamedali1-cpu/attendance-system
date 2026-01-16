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
exports.CreateLetterRequestDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const client_1 = require("@prisma/client");
class CreateLetterRequestDto {
}
exports.CreateLetterRequestDto = CreateLetterRequestDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'نوع الخطاب', enum: client_1.LetterType }),
    (0, class_validator_1.IsEnum)(client_1.LetterType),
    __metadata("design:type", String)
], CreateLetterRequestDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'الملاحظات (حد أقصى 200 حرف)', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(200, { message: 'الملاحظات يجب ألا تتجاوز 200 حرف' }),
    __metadata("design:type", String)
], CreateLetterRequestDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'المرفقات', required: false, type: 'array' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    __metadata("design:type", Array)
], CreateLetterRequestDto.prototype, "attachments", void 0);
//# sourceMappingURL=create-letter-request.dto.js.map