import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
    CreateProjectDto,
    UpdateProjectDto,
    AddProjectMemberDto,
    CreatePhaseDto,
    CreateMilestoneDto,
    CreateRiskDto,
    CreateBudgetDto,
} from './dto/create-project.dto';

const userSelect = {
    id: true,
    firstName: true,
    lastName: true,
    email: true,
    avatar: true,
};

@Injectable()
export class ProjectsService {
    constructor(private prisma: PrismaService) {}

    // ==================== PROJECTS ====================

    async createProject(companyId: string, dto: CreateProjectDto, createdById: string) {
        const code = dto.code || await this.generateProjectCode(companyId);

        return this.prisma.project.create({
            data: {
                name: dto.name,
                nameEn: dto.nameEn,
                description: dto.description,
                code,
                color: dto.color,
                icon: dto.icon,
                programId: dto.programId,
                templateId: dto.templateId,
                ownerId: dto.ownerId,
                managerId: dto.managerId,
                sponsorId: dto.sponsorId,
                startDate: dto.startDate ? new Date(dto.startDate) : undefined,
                plannedEndDate: dto.plannedEndDate ? new Date(dto.plannedEndDate) : undefined,
                plannedBudget: dto.plannedBudget,
                budgetCurrency: dto.budgetCurrency,
                status: (dto.status as any) || 'INITIATION',
                priority: (dto.priority as any) || 'MEDIUM',
                isPublic: dto.isPublic,
                allowTimeLogging: dto.allowTimeLogging,
                requireApproval: dto.requireApproval,
                tags: dto.tags,
                companyId,
                createdById,
            },
            include: {
                owner: { select: userSelect },
                manager: { select: userSelect },
                program: true,
            },
        });
    }

    async findAllProjects(companyId: string, filters?: {
        status?: string;
        priority?: string;
        programId?: string;
        managerId?: string;
        search?: string;
        page?: number;
        limit?: number;
    }) {
        const where: any = { companyId };

        if (filters?.status) where.status = filters.status;
        if (filters?.priority) where.priority = filters.priority;
        if (filters?.programId) where.programId = filters.programId;
        if (filters?.managerId) where.managerId = filters.managerId;
        if (filters?.search) {
            where.OR = [
                { name: { contains: filters.search, mode: 'insensitive' } },
                { nameEn: { contains: filters.search, mode: 'insensitive' } },
                { code: { contains: filters.search, mode: 'insensitive' } },
            ];
        }

        const page = filters?.page || 1;
        const limit = filters?.limit || 20;
        const skip = (page - 1) * limit;

        const [projects, total] = await Promise.all([
            this.prisma.project.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    owner: { select: userSelect },
                    manager: { select: userSelect },
                    program: { select: { id: true, name: true } },
                    _count: {
                        select: {
                            members: true,
                            phases: true,
                            milestones: true,
                            risks: true,
                            tasks: true,
                        },
                    },
                },
            }),
            this.prisma.project.count({ where }),
        ]);

        return {
            data: projects,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findProjectById(companyId: string, projectId: string) {
        const project = await this.prisma.project.findFirst({
            where: { id: projectId, companyId },
            include: {
                owner: { select: userSelect },
                manager: { select: userSelect },
                sponsor: { select: userSelect },
                program: true,
                template: true,
                members: {
                    include: {
                        user: { select: userSelect },
                    },
                },
                phases: { orderBy: { order: 'asc' } },
                milestones: { orderBy: { dueDate: 'asc' } },
                risks: { orderBy: { createdAt: 'desc' } },
                budgets: true,
                tasks: {
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                },
                activities: {
                    take: 20,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        user: { select: userSelect },
                    },
                },
            },
        });

        if (!project) {
            throw new NotFoundException('المشروع غير موجود');
        }

        return project;
    }

    async updateProject(companyId: string, projectId: string, dto: UpdateProjectDto, userId: string) {
        const project = await this.prisma.project.findFirst({
            where: { id: projectId, companyId },
        });

        if (!project) {
            throw new NotFoundException('المشروع غير موجود');
        }

        const updated = await this.prisma.project.update({
            where: { id: projectId },
            data: {
                name: dto.name,
                nameEn: dto.nameEn,
                description: dto.description,
                color: dto.color,
                icon: dto.icon,
                programId: dto.programId,
                ownerId: dto.ownerId,
                managerId: dto.managerId,
                sponsorId: dto.sponsorId,
                startDate: dto.startDate ? new Date(dto.startDate) : undefined,
                plannedEndDate: dto.plannedEndDate ? new Date(dto.plannedEndDate) : undefined,
                actualEndDate: dto.actualEndDate ? new Date(dto.actualEndDate) : undefined,
                plannedBudget: dto.plannedBudget,
                actualBudget: dto.actualBudget,
                status: dto.status as any,
                healthStatus: dto.healthStatus as any,
                priority: dto.priority as any,
                progress: dto.progress,
                isPublic: dto.isPublic,
                tags: dto.tags,
            },
            include: {
                owner: { select: userSelect },
                manager: { select: userSelect },
                program: true,
            },
        });

        await this.logActivity(projectId, userId, 'PROJECT_UPDATED', 'تم تحديث بيانات المشروع');

        return updated;
    }

    async deleteProject(companyId: string, projectId: string) {
        const project = await this.prisma.project.findFirst({
            where: { id: projectId, companyId },
        });

        if (!project) {
            throw new NotFoundException('المشروع غير موجود');
        }

        return this.prisma.project.update({
            where: { id: projectId },
            data: { status: 'CANCELLED' },
        });
    }

    // ==================== PROJECT MEMBERS ====================

    async addMember(companyId: string, projectId: string, dto: AddProjectMemberDto, addedById: string) {
        const project = await this.prisma.project.findFirst({
            where: { id: projectId, companyId },
        });

        if (!project) {
            throw new NotFoundException('المشروع غير موجود');
        }

        const existingMember = await this.prisma.projectMember.findFirst({
            where: { projectId, userId: dto.userId },
        });

        if (existingMember) {
            throw new BadRequestException('المستخدم عضو بالفعل في هذا المشروع');
        }

        const member = await this.prisma.projectMember.create({
            data: {
                projectId,
                userId: dto.userId,
                role: (dto.role as any) || 'TEAM_MEMBER',
                allocationPct: dto.allocationPct,
                hourlyRate: dto.hourlyRate,
            },
            include: {
                user: { select: userSelect },
            },
        });

        await this.logActivity(projectId, addedById, 'MEMBER_ADDED', 'تمت إضافة عضو جديد للمشروع');

        return member;
    }

    async removeMember(companyId: string, projectId: string, memberId: string, removedById: string) {
        const member = await this.prisma.projectMember.findFirst({
            where: { id: memberId, project: { companyId } },
        });

        if (!member) {
            throw new NotFoundException('العضو غير موجود');
        }

        await this.prisma.projectMember.delete({
            where: { id: memberId },
        });

        await this.logActivity(projectId, removedById, 'MEMBER_REMOVED', 'تم إزالة عضو من المشروع');

        return { success: true };
    }

    async updateMember(companyId: string, memberId: string, dto: Partial<AddProjectMemberDto>) {
        const member = await this.prisma.projectMember.findFirst({
            where: { id: memberId, project: { companyId } },
        });

        if (!member) {
            throw new NotFoundException('العضو غير موجود');
        }

        return this.prisma.projectMember.update({
            where: { id: memberId },
            data: {
                role: dto.role as any,
                allocationPct: dto.allocationPct,
                hourlyRate: dto.hourlyRate,
            },
            include: {
                user: { select: userSelect },
            },
        });
    }

    // ==================== PHASES ====================

    async createPhase(companyId: string, projectId: string, dto: CreatePhaseDto, userId: string) {
        const project = await this.prisma.project.findFirst({
            where: { id: projectId, companyId },
        });

        if (!project) {
            throw new NotFoundException('المشروع غير موجود');
        }

        const maxOrder = await this.prisma.projectPhase.aggregate({
            where: { projectId },
            _max: { order: true },
        });

        const phase = await this.prisma.projectPhase.create({
            data: {
                name: dto.name,
                nameEn: dto.nameEn,
                description: dto.description,
                projectId,
                order: dto.order ?? (maxOrder._max.order || 0) + 1,
                color: dto.color,
                plannedStartDate: dto.plannedStartDate ? new Date(dto.plannedStartDate) : undefined,
                plannedEndDate: dto.plannedEndDate ? new Date(dto.plannedEndDate) : undefined,
                plannedBudget: dto.plannedBudget,
                deliverables: dto.deliverables,
                status: 'NOT_STARTED',
            },
        });

        await this.logActivity(projectId, userId, 'PHASE_CREATED', `تم إنشاء مرحلة: ${dto.name}`);

        return phase;
    }

    async updatePhase(companyId: string, phaseId: string, dto: Partial<CreatePhaseDto>, userId: string) {
        const phase = await this.prisma.projectPhase.findFirst({
            where: { id: phaseId, project: { companyId } },
            include: { project: true },
        });

        if (!phase) {
            throw new NotFoundException('المرحلة غير موجودة');
        }

        const updated = await this.prisma.projectPhase.update({
            where: { id: phaseId },
            data: {
                name: dto.name,
                nameEn: dto.nameEn,
                description: dto.description,
                order: dto.order,
                color: dto.color,
                plannedStartDate: dto.plannedStartDate ? new Date(dto.plannedStartDate) : undefined,
                plannedEndDate: dto.plannedEndDate ? new Date(dto.plannedEndDate) : undefined,
                plannedBudget: dto.plannedBudget,
                deliverables: dto.deliverables,
            },
        });

        await this.logActivity(phase.projectId, userId, 'PHASE_UPDATED', `تم تحديث مرحلة: ${phase.name}`);

        return updated;
    }

    async deletePhase(companyId: string, phaseId: string, userId: string) {
        const phase = await this.prisma.projectPhase.findFirst({
            where: { id: phaseId, project: { companyId } },
        });

        if (!phase) {
            throw new NotFoundException('المرحلة غير موجودة');
        }

        await this.prisma.projectPhase.delete({
            where: { id: phaseId },
        });

        await this.logActivity(phase.projectId, userId, 'PHASE_DELETED', 'تم حذف مرحلة');

        return { success: true };
    }

    // ==================== MILESTONES ====================

    async createMilestone(companyId: string, projectId: string, dto: CreateMilestoneDto, userId: string) {
        const project = await this.prisma.project.findFirst({
            where: { id: projectId, companyId },
        });

        if (!project) {
            throw new NotFoundException('المشروع غير موجود');
        }

        const milestone = await this.prisma.projectMilestone.create({
            data: {
                name: dto.name,
                nameEn: dto.nameEn,
                description: dto.description,
                projectId,
                dueDate: new Date(dto.dueDate),
                ownerId: dto.ownerId,
                isCritical: dto.isCritical,
                isPayment: dto.isPayment,
                paymentAmount: dto.paymentAmount,
                status: 'PENDING',
            },
            include: {
                owner: { select: userSelect },
            },
        });

        await this.logActivity(projectId, userId, 'MILESTONE_CREATED', `تم إنشاء معلم: ${dto.name}`);

        return milestone;
    }

    async updateMilestone(companyId: string, milestoneId: string, dto: Partial<CreateMilestoneDto> & { status?: string }, userId: string) {
        const milestone = await this.prisma.projectMilestone.findFirst({
            where: { id: milestoneId, project: { companyId } },
            include: { project: true },
        });

        if (!milestone) {
            throw new NotFoundException('المعلم غير موجود');
        }

        const updated = await this.prisma.projectMilestone.update({
            where: { id: milestoneId },
            data: {
                name: dto.name,
                nameEn: dto.nameEn,
                description: dto.description,
                dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
                ownerId: dto.ownerId,
                isCritical: dto.isCritical,
                isPayment: dto.isPayment,
                paymentAmount: dto.paymentAmount,
                status: dto.status as any,
            },
            include: {
                owner: { select: userSelect },
            },
        });

        await this.logActivity(milestone.projectId, userId, 'MILESTONE_UPDATED', `تم تحديث معلم: ${milestone.name}`);

        return updated;
    }

    async completeMilestone(companyId: string, milestoneId: string, userId: string) {
        const milestone = await this.prisma.projectMilestone.findFirst({
            where: { id: milestoneId, project: { companyId } },
        });

        if (!milestone) {
            throw new NotFoundException('المعلم غير موجود');
        }

        const updated = await this.prisma.projectMilestone.update({
            where: { id: milestoneId },
            data: {
                status: 'COMPLETED',
                completedDate: new Date(),
            },
        });

        await this.logActivity(milestone.projectId, userId, 'MILESTONE_COMPLETED', `تم إكمال معلم: ${milestone.name}`);
        await this.recalculateProjectProgress(milestone.projectId);

        return updated;
    }

    // ==================== RISKS ====================

    async createRisk(companyId: string, projectId: string, dto: CreateRiskDto, userId: string) {
        const project = await this.prisma.project.findFirst({
            where: { id: projectId, companyId },
        });

        if (!project) {
            throw new NotFoundException('المشروع غير موجود');
        }

        const risk = await this.prisma.projectRisk.create({
            data: {
                title: dto.title,
                description: dto.description,
                projectId,
                category: dto.category as any,
                probability: (dto.probability as any) || 'MEDIUM',
                impact: (dto.impact as any) || 'MODERATE',
                response: (dto.response as any) || 'MONITOR',
                mitigationPlan: dto.mitigationPlan,
                contingencyPlan: dto.contingencyPlan,
                ownerId: dto.ownerId,
                potentialCost: dto.potentialCost,
                status: 'OPEN',
                createdById: userId,
            },
            include: {
                owner: { select: userSelect },
                createdBy: { select: userSelect },
            },
        });

        await this.logActivity(projectId, userId, 'RISK_CREATED', `تم تحديد خطر: ${dto.title}`);

        return risk;
    }

    async updateRisk(companyId: string, riskId: string, dto: Partial<CreateRiskDto> & { status?: string }, userId: string) {
        const risk = await this.prisma.projectRisk.findFirst({
            where: { id: riskId, project: { companyId } },
            include: { project: true },
        });

        if (!risk) {
            throw new NotFoundException('الخطر غير موجود');
        }

        const updated = await this.prisma.projectRisk.update({
            where: { id: riskId },
            data: {
                title: dto.title,
                description: dto.description,
                category: dto.category as any,
                probability: dto.probability as any,
                impact: dto.impact as any,
                response: dto.response as any,
                mitigationPlan: dto.mitigationPlan,
                contingencyPlan: dto.contingencyPlan,
                ownerId: dto.ownerId,
                potentialCost: dto.potentialCost,
                status: dto.status as any,
            },
            include: {
                owner: { select: userSelect },
            },
        });

        await this.logActivity(risk.projectId, userId, 'RISK_UPDATED', `تم تحديث خطر: ${risk.title}`);

        return updated;
    }

    // ==================== BUDGETS ====================

    async createBudget(companyId: string, projectId: string, dto: CreateBudgetDto, userId: string) {
        const project = await this.prisma.project.findFirst({
            where: { id: projectId, companyId },
        });

        if (!project) {
            throw new NotFoundException('المشروع غير موجود');
        }

        const budget = await this.prisma.projectBudget.create({
            data: {
                name: dto.name,
                category: dto.category as any,
                description: dto.description,
                projectId,
                plannedAmount: dto.plannedAmount,
                currency: dto.currency || project.budgetCurrency || 'SAR',
                periodStart: dto.periodStart ? new Date(dto.periodStart) : undefined,
                periodEnd: dto.periodEnd ? new Date(dto.periodEnd) : undefined,
                status: 'DRAFT',
                createdById: userId,
            },
        });

        await this.logActivity(projectId, userId, 'BUDGET_CREATED', `تم إضافة بند ميزانية: ${dto.name}`);

        return budget;
    }

    async updateBudget(companyId: string, budgetId: string, dto: Partial<CreateBudgetDto> & { actualAmount?: number; status?: string }, userId: string) {
        const budget = await this.prisma.projectBudget.findFirst({
            where: { id: budgetId, project: { companyId } },
            include: { project: true },
        });

        if (!budget) {
            throw new NotFoundException('بند الميزانية غير موجود');
        }

        const updated = await this.prisma.projectBudget.update({
            where: { id: budgetId },
            data: {
                name: dto.name,
                category: dto.category as any,
                description: dto.description,
                plannedAmount: dto.plannedAmount,
                actualAmount: dto.actualAmount,
                periodStart: dto.periodStart ? new Date(dto.periodStart) : undefined,
                periodEnd: dto.periodEnd ? new Date(dto.periodEnd) : undefined,
                status: dto.status as any,
            },
        });

        await this.logActivity(budget.projectId, userId, 'BUDGET_UPDATED', `تم تحديث بند ميزانية: ${budget.name}`);

        return updated;
    }

    // ==================== DASHBOARD & ANALYTICS ====================

    async getProjectDashboard(companyId: string, projectId: string) {
        const project = await this.findProjectById(companyId, projectId);

        const budgetSummary = await this.prisma.projectBudget.aggregate({
            where: { projectId },
            _sum: {
                plannedAmount: true,
                actualAmount: true,
            },
        });

        const milestoneStats = await this.prisma.projectMilestone.groupBy({
            by: ['status'],
            where: { projectId },
            _count: true,
        });

        const riskStats = await this.prisma.projectRisk.groupBy({
            by: ['status'],
            where: { projectId },
            _count: true,
        });

        const taskStats = await this.prisma.task.groupBy({
            by: ['status'],
            where: { projectId },
            _count: true,
        });

        const upcomingMilestones = await this.prisma.projectMilestone.findMany({
            where: {
                projectId,
                status: { not: 'COMPLETED' },
                dueDate: { gte: new Date() },
            },
            orderBy: { dueDate: 'asc' },
            take: 5,
        });

        const highRisks = await this.prisma.projectRisk.findMany({
            where: {
                projectId,
                status: { not: 'CLOSED' },
                OR: [
                    { probability: 'HIGH' },
                    { probability: 'VERY_HIGH' },
                    { impact: 'MAJOR' },
                    { impact: 'SEVERE' },
                ],
            },
            take: 5,
        });

        return {
            project,
            budget: {
                planned: budgetSummary._sum.plannedAmount || 0,
                actual: budgetSummary._sum.actualAmount || 0,
                variance: Number(budgetSummary._sum.plannedAmount || 0) - Number(budgetSummary._sum.actualAmount || 0),
            },
            milestones: {
                stats: milestoneStats,
                upcoming: upcomingMilestones,
            },
            risks: {
                stats: riskStats,
                high: highRisks,
            },
            tasks: taskStats,
        };
    }

    async getPortfolioDashboard(companyId: string) {
        const statusDistribution = await this.prisma.project.groupBy({
            by: ['status'],
            where: { companyId },
            _count: true,
        });

        const healthDistribution = await this.prisma.project.groupBy({
            by: ['healthStatus'],
            where: { companyId },
            _count: true,
        });

        const budgetSummary = await this.prisma.project.aggregate({
            where: { companyId },
            _sum: {
                plannedBudget: true,
                actualBudget: true,
            },
        });

        const projectsByProgram = await this.prisma.program.findMany({
            where: { companyId },
            include: {
                _count: { select: { projects: true } },
            },
        });

        const recentProjects = await this.prisma.project.findMany({
            where: { companyId },
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: {
                manager: { select: userSelect },
            },
        });

        const atRiskProjects = await this.prisma.project.findMany({
            where: {
                companyId,
                healthStatus: { in: ['AT_RISK', 'OFF_TRACK'] },
            },
            include: {
                manager: { select: userSelect },
            },
        });

        const upcomingMilestones = await this.prisma.projectMilestone.findMany({
            where: {
                project: { companyId },
                status: { not: 'COMPLETED' },
                dueDate: {
                    gte: new Date(),
                    lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                },
            },
            orderBy: { dueDate: 'asc' },
            take: 10,
            include: {
                project: { select: { id: true, name: true, code: true } },
            },
        });

        const totalProjects = statusDistribution.reduce((acc: number, s) => acc + s._count, 0);
        const activeProjects = statusDistribution
            .filter((s) => !['COMPLETED', 'CANCELLED', 'ON_HOLD'].includes(s.status))
            .reduce((acc: number, s) => acc + s._count, 0);
        const completedProjects = statusDistribution.find((s) => s.status === 'COMPLETED')?._count || 0;

        return {
            summary: {
                totalProjects,
                activeProjects,
                completedProjects,
            },
            statusDistribution,
            healthDistribution,
            budget: {
                planned: budgetSummary._sum.plannedBudget || 0,
                actual: budgetSummary._sum.actualBudget || 0,
            },
            projectsByProgram,
            recentProjects,
            atRiskProjects,
            upcomingMilestones,
        };
    }

    // ==================== HELPERS ====================

    private async generateProjectCode(companyId: string): Promise<string> {
        const count = await this.prisma.project.count({ where: { companyId } });
        const year = new Date().getFullYear().toString().slice(-2);
        return `PRJ-${year}-${String(count + 1).padStart(4, '0')}`;
    }

    private async logActivity(projectId: string, userId: string, action: string, description: string) {
        await this.prisma.projectActivity.create({
            data: {
                projectId,
                userId,
                action,
                description,
            },
        });
    }

    private async recalculateProjectProgress(projectId: string) {
        const milestones = await this.prisma.projectMilestone.findMany({
            where: { projectId },
        });

        if (milestones.length === 0) return;

        const completed = milestones.filter((m) => m.status === 'COMPLETED').length;
        const progress = Math.round((completed / milestones.length) * 100);

        await this.prisma.project.update({
            where: { id: projectId },
            data: { progress },
        });
    }
}
