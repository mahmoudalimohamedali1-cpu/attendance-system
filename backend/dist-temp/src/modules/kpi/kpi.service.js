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
exports.KPIService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let KPIService = class KPIService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createDefinition(dto) {
        const existing = await this.prisma.kPIDefinition.findUnique({
            where: {
                companyId_code: {
                    companyId: dto.companyId,
                    code: dto.code,
                },
            },
        });
        if (existing) {
            throw new common_1.BadRequestException(`KPI with code ${dto.code} already exists`);
        }
        return this.prisma.kPIDefinition.create({
            data: {
                companyId: dto.companyId,
                jobFamilyId: dto.jobFamilyId,
                code: dto.code,
                name: dto.name,
                nameAr: dto.nameAr,
                description: dto.description,
                unit: dto.unit,
                formula: dto.formula,
                thresholds: dto.thresholds,
                sourceType: dto.sourceType || 'MANUAL',
                frequency: dto.frequency || 'MONTHLY',
            },
            include: {
                jobFamily: true,
            },
        });
    }
    async getDefinitions(companyId, query) {
        const where = {
            companyId,
        };
        if (query.jobFamilyId) {
            where.jobFamilyId = query.jobFamilyId;
        }
        if (query.isActive !== undefined) {
            where.isActive = query.isActive;
        }
        if (query.sourceType) {
            where.sourceType = query.sourceType;
        }
        if (query.frequency) {
            where.frequency = query.frequency;
        }
        return this.prisma.kPIDefinition.findMany({
            where,
            include: {
                jobFamily: true,
                _count: {
                    select: {
                        assignments: true,
                    },
                },
            },
            orderBy: [
                { isActive: 'desc' },
                { code: 'asc' },
            ],
        });
    }
    async getDefinitionById(id) {
        const definition = await this.prisma.kPIDefinition.findUnique({
            where: { id },
            include: {
                jobFamily: true,
                assignments: {
                    take: 10,
                    include: {
                        employee: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                employeeCode: true,
                            },
                        },
                    },
                },
            },
        });
        if (!definition) {
            throw new common_1.NotFoundException(`KPI Definition not found`);
        }
        return definition;
    }
    async updateDefinition(id, dto) {
        const existing = await this.prisma.kPIDefinition.findUnique({
            where: { id },
        });
        if (!existing) {
            throw new common_1.NotFoundException(`KPI Definition not found`);
        }
        return this.prisma.kPIDefinition.update({
            where: { id },
            data: {
                ...(dto.name && { name: dto.name }),
                ...(dto.nameAr && { nameAr: dto.nameAr }),
                ...(dto.description && { description: dto.description }),
                ...(dto.unit && { unit: dto.unit }),
                ...(dto.formula && { formula: dto.formula }),
                ...(dto.thresholds && { thresholds: dto.thresholds }),
                ...(dto.sourceType && { sourceType: dto.sourceType }),
                ...(dto.frequency && { frequency: dto.frequency }),
                ...(dto.minValue !== undefined && { minValue: dto.minValue }),
                ...(dto.maxValue !== undefined && { maxValue: dto.maxValue }),
                ...(dto.targetValue !== undefined && { targetValue: dto.targetValue }),
                ...(dto.isActive !== undefined && { isActive: dto.isActive }),
            },
            include: {
                jobFamily: true,
            },
        });
    }
    async deleteDefinition(id) {
        const existing = await this.prisma.kPIDefinition.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { assignments: true },
                },
            },
        });
        if (!existing) {
            throw new common_1.NotFoundException(`KPI Definition not found`);
        }
        if (existing._count.assignments > 0) {
            return this.prisma.kPIDefinition.update({
                where: { id },
                data: { isActive: false },
            });
        }
        return this.prisma.kPIDefinition.delete({
            where: { id },
        });
    }
    async createAssignment(dto) {
        const existing = await this.prisma.kPIAssignment.findUnique({
            where: {
                cycleId_employeeId_kpiDefinitionId: {
                    cycleId: dto.cycleId,
                    employeeId: dto.employeeId,
                    kpiDefinitionId: dto.kpiDefinitionId,
                },
            },
        });
        if (existing) {
            throw new common_1.BadRequestException('This KPI is already assigned to this employee in this cycle');
        }
        return this.prisma.kPIAssignment.create({
            data: {
                cycleId: dto.cycleId,
                employeeId: dto.employeeId,
                kpiDefinitionId: dto.kpiDefinitionId,
                target: dto.target,
                weight: dto.weight || 100,
                notes: dto.notes,
            },
            include: {
                kpiDefinition: true,
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        employeeCode: true,
                    },
                },
            },
        });
    }
    async bulkCreateAssignments(dto) {
        const results = [];
        const errors = [];
        for (const employeeId of dto.employeeIds) {
            try {
                const assignment = await this.createAssignment({
                    cycleId: dto.cycleId,
                    employeeId,
                    kpiDefinitionId: dto.kpiDefinitionId,
                    target: dto.target,
                    weight: dto.weight,
                });
                results.push(assignment);
            }
            catch (error) {
                errors.push({
                    employeeId,
                    error: error.message,
                });
            }
        }
        return {
            created: results.length,
            failed: errors.length,
            results,
            errors,
        };
    }
    async getAssignments(query) {
        const where = {};
        if (query.cycleId) {
            where.cycleId = query.cycleId;
        }
        if (query.employeeId) {
            where.employeeId = query.employeeId;
        }
        if (query.kpiDefinitionId) {
            where.kpiDefinitionId = query.kpiDefinitionId;
        }
        return this.prisma.kPIAssignment.findMany({
            where,
            include: {
                kpiDefinition: true,
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        employeeCode: true,
                        avatar: true,
                        department: {
                            select: { id: true, name: true },
                        },
                    },
                },
                cycle: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                _count: {
                    select: { entries: true },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }
    async getAssignmentById(id) {
        const assignment = await this.prisma.kPIAssignment.findUnique({
            where: { id },
            include: {
                kpiDefinition: true,
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        employeeCode: true,
                        avatar: true,
                    },
                },
                cycle: true,
                entries: {
                    orderBy: { periodStart: 'desc' },
                },
            },
        });
        if (!assignment) {
            throw new common_1.NotFoundException(`KPI Assignment not found`);
        }
        return assignment;
    }
    async updateAssignment(id, dto) {
        const existing = await this.prisma.kPIAssignment.findUnique({
            where: { id },
        });
        if (!existing) {
            throw new common_1.NotFoundException(`KPI Assignment not found`);
        }
        return this.prisma.kPIAssignment.update({
            where: { id },
            data: {
                ...(dto.target !== undefined && { target: dto.target }),
                ...(dto.weight !== undefined && { weight: dto.weight }),
                ...(dto.notes && { notes: dto.notes }),
            },
            include: {
                kpiDefinition: true,
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });
    }
    async deleteAssignment(id) {
        const existing = await this.prisma.kPIAssignment.findUnique({
            where: { id },
        });
        if (!existing) {
            throw new common_1.NotFoundException(`KPI Assignment not found`);
        }
        return this.prisma.kPIAssignment.delete({
            where: { id },
        });
    }
    async createEntry(dto, createdBy) {
        const assignment = await this.prisma.kPIAssignment.findUnique({
            where: { id: dto.assignmentId },
        });
        if (!assignment) {
            throw new common_1.NotFoundException(`KPI Assignment not found`);
        }
        const entry = await this.prisma.kPIEntry.create({
            data: {
                assignmentId: dto.assignmentId,
                periodStart: new Date(dto.periodStart),
                periodEnd: new Date(dto.periodEnd),
                value: dto.value,
                source: dto.source || 'manual',
                notes: dto.notes,
                createdBy,
            },
        });
        await this.calculateAssignmentScore(dto.assignmentId);
        return entry;
    }
    async bulkCreateEntries(dto, createdBy) {
        const results = [];
        const errors = [];
        for (const entryDto of dto.entries) {
            try {
                const entry = await this.createEntry(entryDto, createdBy);
                results.push(entry);
            }
            catch (error) {
                errors.push({
                    entry: entryDto,
                    error: error.message,
                });
            }
        }
        return {
            created: results.length,
            failed: errors.length,
            results,
            errors,
        };
    }
    async importEntries(dto, createdBy) {
        const results = [];
        const errors = [];
        for (const item of dto.data) {
            try {
                const employee = await this.prisma.user.findFirst({
                    where: item.employeeId
                        ? { id: item.employeeId }
                        : { employeeCode: item.employeeCode },
                });
                if (!employee) {
                    throw new Error(`Employee not found: ${item.employeeId || item.employeeCode}`);
                }
                if (!employee.companyId) {
                    throw new Error(`Employee ${employee.employeeCode} has no company`);
                }
                const kpiDef = await this.prisma.kPIDefinition.findFirst({
                    where: {
                        code: item.kpiCode,
                        companyId: employee.companyId,
                    },
                });
                if (!kpiDef) {
                    throw new Error(`KPI not found: ${item.kpiCode}`);
                }
                const assignment = await this.prisma.kPIAssignment.findUnique({
                    where: {
                        cycleId_employeeId_kpiDefinitionId: {
                            cycleId: dto.cycleId,
                            employeeId: employee.id,
                            kpiDefinitionId: kpiDef.id,
                        },
                    },
                });
                if (!assignment) {
                    throw new Error(`Assignment not found for employee ${employee.employeeCode} and KPI ${item.kpiCode}`);
                }
                const entry = await this.prisma.kPIEntry.create({
                    data: {
                        assignmentId: assignment.id,
                        periodStart: new Date(item.periodStart),
                        periodEnd: new Date(item.periodEnd),
                        value: item.value,
                        source: 'import',
                        createdBy,
                    },
                });
                await this.calculateAssignmentScore(assignment.id);
                results.push(entry);
            }
            catch (error) {
                errors.push({
                    item,
                    error: error.message,
                });
            }
        }
        return {
            imported: results.length,
            failed: errors.length,
            results,
            errors,
        };
    }
    async getEntriesForAssignment(assignmentId) {
        return this.prisma.kPIEntry.findMany({
            where: { assignmentId },
            orderBy: { periodStart: 'desc' },
        });
    }
    async deleteEntry(id) {
        const entry = await this.prisma.kPIEntry.findUnique({
            where: { id },
        });
        if (!entry) {
            throw new common_1.NotFoundException(`KPI Entry not found`);
        }
        await this.prisma.kPIEntry.delete({
            where: { id },
        });
        await this.calculateAssignmentScore(entry.assignmentId);
        return { deleted: true };
    }
    async calculateAssignmentScore(assignmentId) {
        const assignment = await this.prisma.kPIAssignment.findUnique({
            where: { id: assignmentId },
            include: {
                kpiDefinition: true,
                entries: true,
            },
        });
        if (!assignment) {
            throw new common_1.NotFoundException(`KPI Assignment not found`);
        }
        const entries = assignment.entries;
        if (entries.length === 0) {
            return { actualValue: 0, score: 0, ratingBand: 'NEEDS_IMPROVEMENT' };
        }
        const totalValue = entries.reduce((sum, e) => sum + Number(e.value), 0);
        const actualValue = totalValue / entries.length;
        const target = Number(assignment.target);
        let achievementPercent = 0;
        if (target > 0) {
            achievementPercent = (actualValue / target) * 100;
        }
        const thresholds = assignment.kpiDefinition.thresholds;
        let score = 0;
        let ratingBand = 'NEEDS_IMPROVEMENT';
        if (achievementPercent >= thresholds.exceptional) {
            score = 95;
            ratingBand = 'EXCEPTIONAL';
        }
        else if (achievementPercent >= thresholds.exceeds) {
            score = 85;
            ratingBand = 'EXCEEDS';
        }
        else if (achievementPercent >= thresholds.meets) {
            score = 75;
            ratingBand = 'MEETS';
        }
        else if (achievementPercent >= thresholds.partial) {
            score = 65;
            ratingBand = 'PARTIALLY_MEETS';
        }
        else {
            score = Math.max(0, achievementPercent * 0.6);
            ratingBand = 'NEEDS_IMPROVEMENT';
        }
        await this.prisma.kPIAssignment.update({
            where: { id: assignmentId },
            data: {
                actualValue,
                score,
            },
        });
        return {
            actualValue,
            score,
            ratingBand,
        };
    }
    async recalculateAllScores(cycleId, employeeId) {
        const where = { cycleId };
        if (employeeId) {
            where.employeeId = employeeId;
        }
        const assignments = await this.prisma.kPIAssignment.findMany({
            where,
            select: { id: true },
        });
        const results = [];
        for (const assignment of assignments) {
            const result = await this.calculateAssignmentScore(assignment.id);
            results.push({
                assignmentId: assignment.id,
                ...result,
            });
        }
        return {
            recalculated: results.length,
            results,
        };
    }
    async getEmployeeKPISummary(employeeId, cycleId) {
        const where = { employeeId };
        if (cycleId) {
            where.cycleId = cycleId;
        }
        const assignments = await this.prisma.kPIAssignment.findMany({
            where,
            include: {
                kpiDefinition: true,
                cycle: true,
                _count: {
                    select: { entries: true },
                },
            },
        });
        let totalWeightedScore = 0;
        let totalWeight = 0;
        for (const assignment of assignments) {
            if (assignment.score) {
                totalWeightedScore += Number(assignment.score) * assignment.weight;
                totalWeight += assignment.weight;
            }
        }
        const averageScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
        let ratingBand = 'NEEDS_IMPROVEMENT';
        if (averageScore >= 90)
            ratingBand = 'EXCEPTIONAL';
        else if (averageScore >= 80)
            ratingBand = 'EXCEEDS';
        else if (averageScore >= 70)
            ratingBand = 'MEETS';
        else if (averageScore >= 60)
            ratingBand = 'PARTIALLY_MEETS';
        return {
            employeeId,
            totalKPIs: assignments.length,
            assignmentsWithScores: assignments.filter((a) => a.score).length,
            averageScore: Math.round(averageScore * 100) / 100,
            ratingBand,
            assignments,
        };
    }
    async getCycleKPIOverview(cycleId) {
        const assignments = await this.prisma.kPIAssignment.findMany({
            where: { cycleId },
            include: {
                employee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        department: { select: { id: true, name: true } },
                    },
                },
                kpiDefinition: true,
            },
        });
        const byDepartment = {};
        const byKPI = {};
        for (const assignment of assignments) {
            const deptName = assignment.employee.department?.name || 'بدون قسم';
            if (!byDepartment[deptName]) {
                byDepartment[deptName] = [];
            }
            byDepartment[deptName].push(assignment);
            const kpiName = assignment.kpiDefinition.name;
            if (!byKPI[kpiName]) {
                byKPI[kpiName] = [];
            }
            byKPI[kpiName].push(assignment);
        }
        const scores = assignments.filter((a) => a.score).map((a) => Number(a.score));
        const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
        return {
            cycleId,
            totalAssignments: assignments.length,
            assignmentsWithScores: scores.length,
            averageScore: Math.round(avgScore * 100) / 100,
            byDepartment: Object.entries(byDepartment).map(([name, items]) => ({
                department: name,
                count: items.length,
                avgScore: Math.round(items.filter(i => i.score).reduce((sum, i) => sum + Number(i.score), 0) /
                    Math.max(items.filter(i => i.score).length, 1) * 100) / 100,
            })),
            byKPI: Object.entries(byKPI).map(([name, items]) => ({
                kpi: name,
                count: items.length,
                avgScore: Math.round(items.filter(i => i.score).reduce((sum, i) => sum + Number(i.score), 0) /
                    Math.max(items.filter(i => i.score).length, 1) * 100) / 100,
            })),
        };
    }
    async seedDefaultKPIs(companyId) {
        const defaultKPIs = [
            {
                code: 'SLA_ADHERENCE',
                name: 'SLA Adherence',
                nameAr: 'الالتزام باتفاقية الخدمة',
                unit: '%',
                thresholds: { exceptional: 98, exceeds: 95, meets: 90, partial: 85 },
                frequency: 'MONTHLY',
            },
            {
                code: 'ATTENDANCE_RATE',
                name: 'Attendance Rate',
                nameAr: 'معدل الحضور',
                unit: '%',
                thresholds: { exceptional: 98, exceeds: 95, meets: 90, partial: 80 },
                frequency: 'MONTHLY',
            },
            {
                code: 'ERROR_RATE',
                name: 'Error Rate',
                nameAr: 'معدل الأخطاء',
                unit: '%',
                thresholds: { exceptional: 2, exceeds: 5, meets: 10, partial: 15 },
                frequency: 'MONTHLY',
            },
            {
                code: 'SALES_TARGET',
                name: 'Sales Target Achievement',
                nameAr: 'تحقيق هدف المبيعات',
                unit: '%',
                thresholds: { exceptional: 120, exceeds: 110, meets: 100, partial: 80 },
                frequency: 'MONTHLY',
            },
            {
                code: 'CUSTOMER_SATISFACTION',
                name: 'Customer Satisfaction',
                nameAr: 'رضا العملاء',
                unit: 'score',
                thresholds: { exceptional: 4.5, exceeds: 4.0, meets: 3.5, partial: 3.0 },
                frequency: 'QUARTERLY',
            },
            {
                code: 'TASK_COMPLETION',
                name: 'Task Completion Rate',
                nameAr: 'معدل إنجاز المهام',
                unit: '%',
                thresholds: { exceptional: 100, exceeds: 95, meets: 85, partial: 70 },
                frequency: 'WEEKLY',
            },
            {
                code: 'RESPONSE_TIME',
                name: 'Average Response Time',
                nameAr: 'متوسط وقت الاستجابة',
                unit: 'hours',
                thresholds: { exceptional: 1, exceeds: 2, meets: 4, partial: 8 },
                frequency: 'DAILY',
            },
            {
                code: 'QUALITY_SCORE',
                name: 'Quality Score',
                nameAr: 'درجة الجودة',
                unit: 'score',
                thresholds: { exceptional: 95, exceeds: 90, meets: 80, partial: 70 },
                frequency: 'MONTHLY',
            },
        ];
        const results = [];
        for (const kpi of defaultKPIs) {
            try {
                const created = await this.createDefinition({
                    companyId,
                    ...kpi,
                    thresholds: kpi.thresholds,
                    frequency: kpi.frequency,
                });
                results.push(created);
            }
            catch (error) {
                console.log(`KPI ${kpi.code} already exists, skipping...`);
            }
        }
        return {
            seeded: results.length,
            kpis: results,
        };
    }
};
exports.KPIService = KPIService;
exports.KPIService = KPIService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], KPIService);
//# sourceMappingURL=kpi.service.js.map