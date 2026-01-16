/**
 * KPI Service
 * Full CRUD operations and score calculation for KPI Engine
 */

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
    CreateKPIDefinitionDto,
    UpdateKPIDefinitionDto,
    CreateKPIAssignmentDto,
    BulkCreateKPIAssignmentDto,
    UpdateKPIAssignmentDto,
    CreateKPIEntryDto,
    BulkCreateKPIEntryDto,
    ImportKPIEntriesDto,
    GetKPIDefinitionsQueryDto,
    GetKPIAssignmentsQueryDto,
} from './dto';

@Injectable()
export class KPIService {
    constructor(private readonly prisma: PrismaService) { }

    // ==================== KPI Definitions ====================

    async createDefinition(dto: CreateKPIDefinitionDto) {
        // Check for duplicate code in company
        const existing = await this.prisma.kPIDefinition.findUnique({
            where: {
                companyId_code: {
                    companyId: dto.companyId,
                    code: dto.code,
                },
            },
        });

        if (existing) {
            throw new BadRequestException(`KPI with code ${dto.code} already exists`);
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
                formula: dto.formula as Prisma.InputJsonValue,
                thresholds: dto.thresholds as Prisma.InputJsonValue,
                sourceType: dto.sourceType || 'MANUAL',
                frequency: dto.frequency || 'MONTHLY',
            },
            include: {
                jobFamily: true,
            },
        });
    }

    async getDefinitions(companyId: string, query: GetKPIDefinitionsQueryDto) {
        const where: Prisma.KPIDefinitionWhereInput = {
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

    async getDefinitionById(id: string) {
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
            throw new NotFoundException(`KPI Definition not found`);
        }

        return definition;
    }

    async updateDefinition(id: string, dto: UpdateKPIDefinitionDto) {
        const existing = await this.prisma.kPIDefinition.findUnique({
            where: { id },
        });

        if (!existing) {
            throw new NotFoundException(`KPI Definition not found`);
        }

        return this.prisma.kPIDefinition.update({
            where: { id },
            data: {
                ...(dto.name && { name: dto.name }),
                ...(dto.nameAr && { nameAr: dto.nameAr }),
                ...(dto.description && { description: dto.description }),
                ...(dto.unit && { unit: dto.unit }),
                ...(dto.formula && { formula: dto.formula as Prisma.InputJsonValue }),
                ...(dto.thresholds && { thresholds: dto.thresholds as Prisma.InputJsonValue }),
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

    async deleteDefinition(id: string) {
        const existing = await this.prisma.kPIDefinition.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { assignments: true },
                },
            },
        });

        if (!existing) {
            throw new NotFoundException(`KPI Definition not found`);
        }

        if (existing._count.assignments > 0) {
            // Soft delete - just deactivate
            return this.prisma.kPIDefinition.update({
                where: { id },
                data: { isActive: false },
            });
        }

        return this.prisma.kPIDefinition.delete({
            where: { id },
        });
    }

    // ==================== KPI Assignments ====================

    async createAssignment(dto: CreateKPIAssignmentDto) {
        // Check if already assigned
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
            throw new BadRequestException('This KPI is already assigned to this employee in this cycle');
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

    async bulkCreateAssignments(dto: BulkCreateKPIAssignmentDto) {
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
            } catch (error) {
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

    async getAssignments(query: GetKPIAssignmentsQueryDto) {
        const where: Prisma.KPIAssignmentWhereInput = {};

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

    async getAssignmentById(id: string) {
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
            throw new NotFoundException(`KPI Assignment not found`);
        }

        return assignment;
    }

    async updateAssignment(id: string, dto: UpdateKPIAssignmentDto) {
        const existing = await this.prisma.kPIAssignment.findUnique({
            where: { id },
        });

        if (!existing) {
            throw new NotFoundException(`KPI Assignment not found`);
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

    async deleteAssignment(id: string) {
        const existing = await this.prisma.kPIAssignment.findUnique({
            where: { id },
        });

        if (!existing) {
            throw new NotFoundException(`KPI Assignment not found`);
        }

        return this.prisma.kPIAssignment.delete({
            where: { id },
        });
    }

    // ==================== KPI Entries ====================

    async createEntry(dto: CreateKPIEntryDto, createdBy: string) {
        // Verify assignment exists
        const assignment = await this.prisma.kPIAssignment.findUnique({
            where: { id: dto.assignmentId },
        });

        if (!assignment) {
            throw new NotFoundException(`KPI Assignment not found`);
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

        // Recalculate assignment score after adding entry
        await this.calculateAssignmentScore(dto.assignmentId);

        return entry;
    }

    async bulkCreateEntries(dto: BulkCreateKPIEntryDto, createdBy: string) {
        const results = [];
        const errors = [];

        for (const entryDto of dto.entries) {
            try {
                const entry = await this.createEntry(entryDto, createdBy);
                results.push(entry);
            } catch (error) {
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

    async importEntries(dto: ImportKPIEntriesDto, createdBy: string) {
        const results = [];
        const errors = [];

        for (const item of dto.data) {
            try {
                // Find employee
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

                // Find KPI definition
                const kpiDef = await this.prisma.kPIDefinition.findFirst({
                    where: {
                        code: item.kpiCode,
                        companyId: employee.companyId,
                    },
                });

                if (!kpiDef) {
                    throw new Error(`KPI not found: ${item.kpiCode}`);
                }

                // Find assignment
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

                // Create entry
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

                // Recalculate score
                await this.calculateAssignmentScore(assignment.id);

                results.push(entry);
            } catch (error) {
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

    async getEntriesForAssignment(assignmentId: string) {
        return this.prisma.kPIEntry.findMany({
            where: { assignmentId },
            orderBy: { periodStart: 'desc' },
        });
    }

    async deleteEntry(id: string) {
        const entry = await this.prisma.kPIEntry.findUnique({
            where: { id },
        });

        if (!entry) {
            throw new NotFoundException(`KPI Entry not found`);
        }

        await this.prisma.kPIEntry.delete({
            where: { id },
        });

        // Recalculate assignment score
        await this.calculateAssignmentScore(entry.assignmentId);

        return { deleted: true };
    }

    // ==================== Score Calculation ====================

    async calculateAssignmentScore(assignmentId: string): Promise<{
        actualValue: number;
        score: number;
        ratingBand: string;
    }> {
        const assignment = await this.prisma.kPIAssignment.findUnique({
            where: { id: assignmentId },
            include: {
                kpiDefinition: true,
                entries: true,
            },
        });

        if (!assignment) {
            throw new NotFoundException(`KPI Assignment not found`);
        }

        // Calculate actual value (average of all entries)
        const entries = assignment.entries;
        if (entries.length === 0) {
            return { actualValue: 0, score: 0, ratingBand: 'NEEDS_IMPROVEMENT' };
        }

        const totalValue = entries.reduce((sum: number, e: any) => sum + Number(e.value), 0);
        const actualValue = totalValue / entries.length;

        // Calculate score based on target achievement
        const target = Number(assignment.target);
        let achievementPercent = 0;

        if (target > 0) {
            achievementPercent = (actualValue / target) * 100;
        }

        // Convert achievement to score (0-100)
        // Achievement above 100% still caps at max threshold for scoring
        const thresholds = assignment.kpiDefinition.thresholds as any;
        let score = 0;
        let ratingBand = 'NEEDS_IMPROVEMENT';

        if (achievementPercent >= thresholds.exceptional) {
            score = 95; // 90-100 range
            ratingBand = 'EXCEPTIONAL';
        } else if (achievementPercent >= thresholds.exceeds) {
            score = 85; // 80-89 range
            ratingBand = 'EXCEEDS';
        } else if (achievementPercent >= thresholds.meets) {
            score = 75; // 70-79 range
            ratingBand = 'MEETS';
        } else if (achievementPercent >= thresholds.partial) {
            score = 65; // 60-69 range
            ratingBand = 'PARTIALLY_MEETS';
        } else {
            score = Math.max(0, achievementPercent * 0.6); // Below 60
            ratingBand = 'NEEDS_IMPROVEMENT';
        }

        // Update assignment with calculated values
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

    async recalculateAllScores(cycleId: string, employeeId?: string) {
        const where: Prisma.KPIAssignmentWhereInput = { cycleId };
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

    // ==================== Analytics ====================

    async getEmployeeKPISummary(employeeId: string, cycleId?: string) {
        const where: Prisma.KPIAssignmentWhereInput = { employeeId };
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

        // Calculate weighted average score
        let totalWeightedScore = 0;
        let totalWeight = 0;

        for (const assignment of assignments) {
            if (assignment.score) {
                totalWeightedScore += Number(assignment.score) * assignment.weight;
                totalWeight += assignment.weight;
            }
        }

        const averageScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;

        // Determine rating band
        let ratingBand = 'NEEDS_IMPROVEMENT';
        if (averageScore >= 90) ratingBand = 'EXCEPTIONAL';
        else if (averageScore >= 80) ratingBand = 'EXCEEDS';
        else if (averageScore >= 70) ratingBand = 'MEETS';
        else if (averageScore >= 60) ratingBand = 'PARTIALLY_MEETS';

        return {
            employeeId,
            totalKPIs: assignments.length,
            assignmentsWithScores: assignments.filter((a: any) => a.score).length,
            averageScore: Math.round(averageScore * 100) / 100,
            ratingBand,
            assignments,
        };
    }

    async getCycleKPIOverview(cycleId: string) {
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

        // Group by department
        const byDepartment: Record<string, any[]> = {};
        const byKPI: Record<string, any[]> = {};

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

        // Calculate stats
        const scores = assignments.filter((a: any) => a.score).map((a: any) => Number(a.score));
        const avgScore = scores.length > 0 ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0;

        return {
            cycleId,
            totalAssignments: assignments.length,
            assignmentsWithScores: scores.length,
            averageScore: Math.round(avgScore * 100) / 100,
            byDepartment: Object.entries(byDepartment).map(([name, items]) => ({
                department: name,
                count: items.length,
                avgScore: Math.round(
                    items.filter(i => i.score).reduce((sum, i) => sum + Number(i.score), 0) /
                    Math.max(items.filter(i => i.score).length, 1) * 100
                ) / 100,
            })),
            byKPI: Object.entries(byKPI).map(([name, items]) => ({
                kpi: name,
                count: items.length,
                avgScore: Math.round(
                    items.filter(i => i.score).reduce((sum, i) => sum + Number(i.score), 0) /
                    Math.max(items.filter(i => i.score).length, 1) * 100
                ) / 100,
            })),
        };
    }

    // ==================== Seed Default KPIs ====================

    async seedDefaultKPIs(companyId: string) {
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
                    thresholds: kpi.thresholds as any,
                    frequency: kpi.frequency as any,
                });
                results.push(created);
            } catch (error) {
                // Skip if already exists
                console.log(`KPI ${kpi.code} already exists, skipping...`);
            }
        }

        return {
            seeded: results.length,
            kpis: results,
        };
    }
}
