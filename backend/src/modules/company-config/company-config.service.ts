import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
    CreateCompanyConfigDto,
    UpdateCompanyConfigDto,
    EVALUATION_TEMPLATES,
    CompanyType,
} from './dto';

@Injectable()
export class CompanyConfigService {
    constructor(private prisma: PrismaService) { }

    // الحصول على إعدادات الشركة
    async getByCompanyId(companyId: string) {
        const config = await this.prisma.companyConfig.findUnique({
            where: { companyId },
        });

        if (!config) {
            // إرجاع الإعدادات الافتراضية
            return this.getDefaultConfig(companyId);
        }

        return config;
    }

    // إنشاء إعدادات الشركة
    async create(dto: CreateCompanyConfigDto) {
        const existing = await this.prisma.companyConfig.findUnique({
            where: { companyId: dto.companyId },
        });

        if (existing) {
            throw new ConflictException('إعدادات الشركة موجودة بالفعل');
        }

        // الحصول على القالب المناسب
        const template = EVALUATION_TEMPLATES[dto.companyType || 'HYBRID'];

        return this.prisma.companyConfig.create({
            data: {
                companyId: dto.companyId,
                companyType: dto.companyType || 'HYBRID',
                philosophy: dto.philosophy || 'BALANCED',
                enabledModules: (dto.enabledModules || template.modules) as Prisma.InputJsonValue,
                defaultWeights: (dto.defaultWeights || template.weights) as Prisma.InputJsonValue,
                policies: (dto.policies || template.policies) as Prisma.InputJsonValue,
                uiConfig: (dto.uiConfig || template.uiConfig) as Prisma.InputJsonValue,
            },
        });
    }

    // تحديث إعدادات الشركة
    async update(companyId: string, dto: UpdateCompanyConfigDto) {
        const existing = await this.prisma.companyConfig.findUnique({
            where: { companyId },
        });

        if (!existing) {
            // إنشاء جديد إذا غير موجود
            return this.create({ companyId, ...dto });
        }

        return this.prisma.companyConfig.update({
            where: { companyId },
            data: {
                ...(dto.companyType && { companyType: dto.companyType }),
                ...(dto.philosophy && { philosophy: dto.philosophy }),
                ...(dto.enabledModules && { enabledModules: dto.enabledModules as Prisma.InputJsonValue }),
                ...(dto.defaultWeights && { defaultWeights: dto.defaultWeights as Prisma.InputJsonValue }),
                ...(dto.policies && { policies: dto.policies as Prisma.InputJsonValue }),
                ...(dto.uiConfig && { uiConfig: dto.uiConfig as Prisma.InputJsonValue }),
            },
        });
    }

    // تطبيق قالب معين
    async applyTemplate(companyId: string, companyType: CompanyType) {
        const template = EVALUATION_TEMPLATES[companyType];

        if (!template) {
            throw new NotFoundException('القالب غير موجود');
        }

        const existing = await this.prisma.companyConfig.findUnique({
            where: { companyId },
        });

        if (existing) {
            return this.prisma.companyConfig.update({
                where: { companyId },
                data: {
                    companyType,
                    enabledModules: template.modules as Prisma.InputJsonValue,
                    defaultWeights: template.weights as Prisma.InputJsonValue,
                    policies: template.policies as Prisma.InputJsonValue,
                    uiConfig: template.uiConfig as Prisma.InputJsonValue,
                },
            });
        }

        return this.prisma.companyConfig.create({
            data: {
                companyId,
                companyType,
                philosophy: 'BALANCED',
                enabledModules: template.modules as Prisma.InputJsonValue,
                defaultWeights: template.weights as Prisma.InputJsonValue,
                policies: template.policies as Prisma.InputJsonValue,
                uiConfig: template.uiConfig as Prisma.InputJsonValue,
            },
        });
    }

    // الحصول على الـ Blueprint للموظف
    async getEmployeeBlueprint(companyId: string, employeeId: string, cycleId?: string) {
        // جلب إعدادات الشركة
        const companyConfig = await this.getByCompanyId(companyId);

        // جلب الموظف مع Job Family و Role Level
        const employee = await this.prisma.user.findUnique({
            where: { id: employeeId },
            include: {
                JobFamily: true,
                RoleLevel: true,
            },
        });

        if (!employee) {
            throw new NotFoundException('الموظف غير موجود');
        }

        // بناء الـ Blueprint
        let blueprint = {
            modules: companyConfig.enabledModules as Record<string, boolean>,
            weights: companyConfig.defaultWeights as Record<string, number>,
            policies: companyConfig.policies as Record<string, unknown>,
            ui: companyConfig.uiConfig as Record<string, unknown>,
        };

        // تطبيق تجاوزات Job Family
        if (employee.JobFamily?.moduleOverrides) {
            const overrides = employee.JobFamily.moduleOverrides as Record<string, boolean>;
            blueprint.modules = { ...blueprint.modules, ...overrides };
        }

        // تطبيق تجاوزات Role Level
        if (employee.RoleLevel?.weightOverrides) {
            const overrides = employee.RoleLevel.weightOverrides as Record<string, number>;
            blueprint.weights = { ...blueprint.weights, ...overrides };
        }

        // إضافة كفاءات القيادة للمدراء
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

    // الحصول على جميع القوالب المتاحة
    getAvailableTemplates() {
        return Object.entries(EVALUATION_TEMPLATES).map(([key, template]) => ({
            type: key,
            code: template.code,
            name: template.name,
            nameAr: template.nameAr,
            modules: template.modules,
            weights: template.weights,
        }));
    }

    // الإعدادات الافتراضية
    private getDefaultConfig(companyId: string) {
        const template = EVALUATION_TEMPLATES.HYBRID;
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

    // ============ Job Families ============

    async createJobFamily(companyId: string, data: {
        code: string;
        name: string;
        nameAr?: string;
        moduleOverrides?: Record<string, boolean>;
        evidenceTypes?: string[];
    }) {
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

    async getJobFamilies(companyId: string) {
        return this.prisma.jobFamily.findMany({
            where: { companyId },
            include: { roleLevels: true },
        });
    }

    // ============ Role Levels ============

    async createRoleLevel(jobFamilyId: string, data: {
        code: string;
        name: string;
        nameAr?: string;
        rank: number;
        isManager?: boolean;
        weightOverrides?: Record<string, number>;
    }) {
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

    async getRoleLevels(jobFamilyId: string) {
        return this.prisma.roleLevel.findMany({
            where: { jobFamilyId },
            orderBy: { rank: 'asc' },
        });
    }

    // ============ Seed Templates ============

    async seedEvaluationTemplates() {
        const templates = Object.entries(EVALUATION_TEMPLATES);
        const created = [];

        for (const [type, template] of templates) {
            const existing = await this.prisma.evaluationTemplate.findUnique({
                where: { code: template.code },
            });

            if (!existing) {
                const newTemplate = await this.prisma.evaluationTemplate.create({
                    data: {
                        code: template.code,
                        companyType: type as CompanyType,
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
}
