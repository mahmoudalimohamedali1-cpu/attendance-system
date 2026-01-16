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
exports.EVALUATION_TEMPLATES = exports.UpdateCompanyConfigDto = exports.CreateCompanyConfigDto = exports.EvalPhilosophy = exports.CompanyType = void 0;
const class_validator_1 = require("class-validator");
var CompanyType;
(function (CompanyType) {
    CompanyType["OPERATIONAL"] = "OPERATIONAL";
    CompanyType["TECH"] = "TECH";
    CompanyType["SALES"] = "SALES";
    CompanyType["CREATIVE"] = "CREATIVE";
    CompanyType["ADMIN"] = "ADMIN";
    CompanyType["HYBRID"] = "HYBRID";
})(CompanyType || (exports.CompanyType = CompanyType = {}));
var EvalPhilosophy;
(function (EvalPhilosophy) {
    EvalPhilosophy["RESULTS_FIRST"] = "RESULTS_FIRST";
    EvalPhilosophy["BALANCED"] = "BALANCED";
    EvalPhilosophy["CULTURE_FIRST"] = "CULTURE_FIRST";
})(EvalPhilosophy || (exports.EvalPhilosophy = EvalPhilosophy = {}));
class CreateCompanyConfigDto {
    constructor() {
        this.companyType = CompanyType.HYBRID;
        this.philosophy = EvalPhilosophy.BALANCED;
    }
}
exports.CreateCompanyConfigDto = CreateCompanyConfigDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCompanyConfigDto.prototype, "companyId", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(CompanyType),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateCompanyConfigDto.prototype, "companyType", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(EvalPhilosophy),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateCompanyConfigDto.prototype, "philosophy", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CreateCompanyConfigDto.prototype, "enabledModules", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CreateCompanyConfigDto.prototype, "defaultWeights", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CreateCompanyConfigDto.prototype, "policies", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CreateCompanyConfigDto.prototype, "uiConfig", void 0);
class UpdateCompanyConfigDto {
}
exports.UpdateCompanyConfigDto = UpdateCompanyConfigDto;
__decorate([
    (0, class_validator_1.IsEnum)(CompanyType),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateCompanyConfigDto.prototype, "companyType", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(EvalPhilosophy),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateCompanyConfigDto.prototype, "philosophy", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], UpdateCompanyConfigDto.prototype, "enabledModules", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], UpdateCompanyConfigDto.prototype, "defaultWeights", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], UpdateCompanyConfigDto.prototype, "policies", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], UpdateCompanyConfigDto.prototype, "uiConfig", void 0);
exports.EVALUATION_TEMPLATES = {
    OPERATIONAL: {
        code: 'OPERATIONAL_CORE_V1',
        name: 'Operational Core',
        nameAr: 'القالب التشغيلي',
        modules: { KPI: true, ATTENDANCE: true, OKR: false, COMPETENCY: true, FEEDBACK_360: false, VALUES: true },
        weights: { KPI: 45, ATTENDANCE: 20, COMPETENCY: 20, VALUES: 10, MANAGER: 5 },
        policies: { minEvidenceForExceeds: 1, allowStretchGoals: false },
        uiConfig: { primaryWidgets: ['kpiBoard', 'attendanceCard'], hide: ['okrBuilder', 'peerFeedback'] },
    },
    TECH: {
        code: 'TECH_PRODUCT_V1',
        name: 'Tech Product',
        nameAr: 'القالب التقني',
        modules: { OKR: true, COMPETENCY: true, FEEDBACK_360: true, VALUES: true, DELIVERY: true, ATTENDANCE: false },
        weights: { OKR: 45, COMPETENCY: 25, FEEDBACK_360: 15, VALUES: 10, DELIVERY: 5 },
        policies: { minEvidenceForExceeds: 2, allowStretchGoals: true, anonymous360: true },
        uiConfig: { primaryWidgets: ['okrProgress', 'evidencePanel'], hide: ['attendanceCard'] },
    },
    SALES: {
        code: 'SALES_QUOTA_V1',
        name: 'Sales Quota',
        nameAr: 'قالب المبيعات',
        modules: { KPI: true, OKR: true, COMPETENCY: true, FEEDBACK_360: true, VALUES: true },
        weights: { KPI: 50, OKR: 20, COMPETENCY: 15, FEEDBACK_360: 10, VALUES: 5 },
        policies: { minEvidenceForExceeds: 2, complaintCapEnabled: true },
        uiConfig: { primaryWidgets: ['quotaBoard', 'pipelineOKR'], hide: [] },
    },
    CREATIVE: {
        code: 'CREATIVE_STUDIO_V1',
        name: 'Creative Studio',
        nameAr: 'القالب الإبداعي',
        modules: { OKR: true, COMPETENCY: true, FEEDBACK_360: true, VALUES: true, DELIVERY: true },
        weights: { OKR: 40, COMPETENCY: 30, FEEDBACK_360: 20, VALUES: 10 },
        policies: { minEvidenceForExceeds: 1, allowStretchGoals: true },
        uiConfig: { primaryWidgets: ['projectShowcase', 'feedbackCards'], hide: ['kpiBoard'] },
    },
    ADMIN: {
        code: 'CORPORATE_ADMIN_V1',
        name: 'Corporate Admin',
        nameAr: 'القالب الإداري',
        modules: { KPI: true, COMPETENCY: true, VALUES: true, ATTENDANCE: true },
        weights: { KPI: 40, COMPETENCY: 30, VALUES: 20, ATTENDANCE: 10 },
        policies: { minEvidenceForExceeds: 1 },
        uiConfig: { primaryWidgets: ['processKPI', 'complianceCard'], hide: ['okrBuilder'] },
    },
    HYBRID: {
        code: 'HYBRID_MULTI_V1',
        name: 'Hybrid Multi-Family',
        nameAr: 'القالب المختلط',
        modules: { OKR: true, KPI: true, COMPETENCY: true, FEEDBACK_360: true, VALUES: true },
        weights: { OKR: 30, KPI: 25, COMPETENCY: 25, FEEDBACK_360: 10, VALUES: 10 },
        policies: { minEvidenceForExceeds: 2, allowStretchGoals: true, anonymous360: true },
        uiConfig: { primaryWidgets: ['combinedDashboard'], hide: [] },
    },
};
//# sourceMappingURL=dto.js.map