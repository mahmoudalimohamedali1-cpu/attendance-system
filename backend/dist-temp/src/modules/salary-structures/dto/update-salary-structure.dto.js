"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateSalaryStructureDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const create_salary_structure_dto_1 = require("./create-salary-structure.dto");
class UpdateSalaryStructureDto extends (0, swagger_1.PartialType)(create_salary_structure_dto_1.CreateSalaryStructureDto) {
}
exports.UpdateSalaryStructureDto = UpdateSalaryStructureDto;
//# sourceMappingURL=update-salary-structure.dto.js.map