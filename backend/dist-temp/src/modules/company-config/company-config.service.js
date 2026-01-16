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
exports.CompanyConfigService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const dto_1 = require("./dto");
let CompanyConfigService = class CompanyConfigService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getByCompanyId(companyId) {
        const config = await this.prisma.companyConfig.findUnique({
            where: { companyId },
        });
        if (!config) {
            return this.getDefaultConfig(companyId);
        }
        return config;
    }
    async create(dto) {
        const existing = await this.prisma.companyConfig.findUnique({
            where: { companyId: dto.companyId },
        });
        if (existing) {
            throw new common_1.ConflictException('إعدادات الشركة موجودة بالفعل');
        }
        const template = dto_1.EVALUATION_TEMPLATES[dto.companyType || 'HYBRID'];
        return this.prisma.companyConfig.create({
            data: {
                companyId: dto.companyId,
                companyType: dto.companyType || 'HYBRID',
                philosophy: dto.philosophy || 'BALANCED',
                enabledModules: (dto.enabledModules || template.modules),
                defaultWeights: (dto.defaultWeights || template.weights),
                policies: (dto.policies || template.policies),
                uiConfig: (dto.uiConfig || template.uiConfig),
            },
        });
    }
    async update(companyId, dto) {
        const existing = await this.prisma.companyConfig.findUnique({
            where: { companyId },
        });
        if (!existing) {
            return this.create({ companyId, ...dto });
        }
        return this.prisma.companyConfig.update({
            where: { companyId },
            data: {
                ...(dto.companyType && { companyType: dto.companyType }),
                ...(dto.philosophy && { philosophy: dto.philosophy }),
                ...(dto.enabledModules && { enabledModules: dto.enabledModules }),
                ...(dto.defaultWeights && { defaultWeights: dto.defaultWeights }),
                ...(dto.policies && { policies: dto.policies }),
                ...(dto.uiConfig && { uiConfig: dto.uiConfig }),
            },
        });
    }
    async applyTemplate(companyId, companyType) {
        const template = dto_1.EVALUATION_TEMPLATES[companyType];
        if (!template) {
            throw new common_1.NotFoundException('القالب غير موجود');
        }
        const existing = await this.prisma.companyConfig.findUnique({
            where: { companyId },
        });
        if (existing) {
            return this.prisma.companyConfig.update({
                where: { companyId },
                data: {
                    companyType,
                    enabledModules: template.modules,
                    defaultWeights: template.weights,
                    policies: template.policies,
                    uiConfig: template.uiConfig,
                },
            });
        }
        return this.prisma.companyConfig.create({
            data: {
                companyId,
                companyType,
                philosophy: 'BALANCED',
                enabledModules: template.modules,
                defaultWeights: template.weights,
                policies: template.policies,
                uiConfig: template.uiConfig,
            },
        });
    }
    async getEmployeeBlueprint(companyId, employeeId, cycleId) {
        const companyConfig = await this.getByCompanyId(companyId);
        const employee = await this.prisma.user.findUnique({
            where: { id: employeeId },
            include: {
                JobFamily: true,
                RoleLevel: true,
            },
        });
        if (!employee) {
            throw new common_1.NotFoundException('الموظف غير موجود');
        }
        let blueprint = {
            modules: companyConfig.enabledModules,
            weights: companyConfig.defaultWeights,
            policies: companyConfig.policies,
            ui: companyConfig.uiConfig,
        };
        if (employee.JobFamily?.moduleOverrides) {
            const overrides = employee.JobFamily.moduleOverrides;
            blueprint.modules = { ...blueprint.modules, ...overrides };
        }
        if (employee.RoleLevel?.weightOverrides) {
            const overrides = employee.RoleLevel.weightOverrides;
            blueprint.weights = { ...blueprint.weights, ...overrides };
        }
        if (employee.RoleLevel?.isManager) {
            blueprint.modules['LEADERSHIP_COMPETENCY'] = true;
        }
        return {
            employeeId,
            companyType: companyConfig.companyType,
            philosophy: companyConfig.philosophy,
            ...blueprint,
        };
    }
    getAvailableTemplates() {
        return Object.entries(dto_1.EVALUATION_TEMPLATES).map(([key, template]) => ({
            type: key,
            code: template.code,
            name: template.name,
            nameAr: template.nameAr,
            modules: template.modules,
            weights: template.weights,
        }));
    }
    getDefaultConfig(companyId) {
        const template = dto_1.EVALUATION_TEMPLATES.HYBRID;
        return {
            id: null,
            companyId,
            companyType: 'HYBRID',
            philosophy: 'BALANCED',
            enabledModules: template.modules,
            defaultWeights: template.weights,
            policies: template.policies,
            uiConfig: template.uiConfig,
            createdAt: null,
            updatedAt: null,
        };
    }
    async createJobFamily(companyId, data) {
        return this.prisma.jobFamily.create({
            data: {
                companyId,
                code: data.code,
                name: data.name,
                nameAr: data.nameAr,
                moduleOverrides: data.moduleOverrides,
                evidenceTypes: data.evidenceTypes,
            },
        });
    }
    async getJobFamilies(companyId) {
        return this.prisma.jobFamily.findMany({
            where: { companyId },
            include: { roleLevels: true },
        });
    }
    async createRoleLevel(jobFamilyId, data) {
        return this.prisma.roleLevel.create({
            data: {
                jobFamilyId,
                code: data.code,
                name: data.name,
                nameAr: data.nameAr,
                rank: data.rank,
                isManager: data.isManager || false,
                weightOverrides: data.weightOverrides,
            },
        });
    }
    async getRoleLevels(jobFamilyId) {
        return this.prisma.roleLevel.findMany({
            where: { jobFamilyId },
            orderBy: { rank: 'asc' },
        });
    }
    async seedEvaluationTemplates() {
        const templates = Object.entries(dto_1.EVALUATION_TEMPLATES);
        const created = [];
        for (const [type, template] of templates) {
            const existing = await this.prisma.evaluationTemplate.findUnique({
                where: { code: template.code },
            });
            if (!existing) {
                const newTemplate = await this.prisma.evaluationTemplate.create({
                    data: {
                        code: template.code,
                        companyType: type,
                        name: template.name,
                        nameAr: template.nameAr,
                        version: 1,
                        modules: template.modules,
                        weights: template.weights,
                        policies: template.policies,
                        uiConfig: template.uiConfig,
                        isActive: true,
                        isDefault: type === 'HYBRID',
                    },
                });
                created.push(newTemplate);
            }
        }
        return { seeded: created.length, templates: created };
    }
};
exports.CompanyConfigService = CompanyConfigService;
exports.CompanyConfigService = CompanyConfigService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CompanyConfigService);
//# sourceMappingURL=company-config.service.js.map