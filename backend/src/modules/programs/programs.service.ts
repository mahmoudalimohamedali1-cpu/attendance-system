// @ts-nocheck
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateProgramDto, UpdateProgramDto } from './dto/create-program.dto';

const userSelect = {
    id: true,
    firstName: true,
    lastName: true,
    email: true,
    avatar: true,
};

@Injectable()
export class ProgramsService {
    constructor(private prisma: PrismaService) { }

    async create(companyId: string, dto: CreateProgramDto, createdById: string) {
        const code = dto.code || await this.generateProgramCode(companyId);

        return this.prisma.program.create({
            data: {
                name: dto.name,
                nameEn: dto.nameEn,
                description: dto.description,
                code,
                color: dto.color,
                icon: dto.icon,
                ownerId: dto.sponsorId, // Map sponsor to owner
                managerId: dto.managerId,
                startDate: dto.startDate ? new Date(dto.startDate) : undefined,
                endDate: dto.plannedEndDate ? new Date(dto.plannedEndDate) : undefined,
                totalBudget: dto.totalBudget,
                budgetCurrency: dto.budgetCurrency,
                status: (dto.status as any) || 'PLANNING',
                companyId,
                createdById,
            },
            include: {
                manager: { select: userSelect },
                owner: { select: userSelect },
            },
        });
    }

    async findAll(companyId: string, filters?: {
        status?: string;
        search?: string;
        page?: number;
        limit?: number;
    }) {
        const where: any = { companyId };

        if (filters?.status) where.status = filters.status;
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

        const [programs, total] = await Promise.all([
            this.prisma.program.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    manager: { select: userSelect },
                    owner: { select: userSelect },
                    _count: { select: { projects: true } },
                },
            }),
            this.prisma.program.count({ where }),
        ]);

        return {
            data: programs,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findOne(companyId: string, id: string) {
        const program = await this.prisma.program.findFirst({
            where: { id, companyId },
            include: {
                manager: { select: userSelect },
                owner: { select: userSelect },
                projects: {
                    orderBy: { createdAt: 'desc' },
                    include: {
                        manager: { select: userSelect },
                        _count: { select: { tasks: true, members: true } },
                    },
                },
            },
        });

        if (!program) {
            throw new NotFoundException('البرنامج غير موجود');
        }

        return program;
    }

    async update(companyId: string, id: string, dto: UpdateProgramDto) {
        const program = await this.prisma.program.findFirst({
            where: { id, companyId },
        });

        if (!program) {
            throw new NotFoundException('البرنامج غير موجود');
        }

        return this.prisma.program.update({
            where: { id },
            data: {
                name: dto.name,
                nameEn: dto.nameEn,
                description: dto.description,
                color: dto.color,
                icon: dto.icon,
                ownerId: dto.sponsorId,
                managerId: dto.managerId,
                startDate: dto.startDate ? new Date(dto.startDate) : undefined,
                endDate: dto.plannedEndDate ? new Date(dto.plannedEndDate) : undefined,
                totalBudget: dto.totalBudget,
                status: dto.status as any,
                healthStatus: dto.healthStatus as any,
            },
            include: {
                manager: { select: userSelect },
                owner: { select: userSelect },
            },
        });
    }

    async delete(companyId: string, id: string) {
        const program = await this.prisma.program.findFirst({
            where: { id, companyId },
            include: { _count: { select: { projects: true } } },
        });

        if (!program) {
            throw new NotFoundException('البرنامج غير موجود');
        }

        if (program._count.projects > 0) {
            // Archive instead of delete
            return this.prisma.program.update({
                where: { id },
                data: { isArchived: true, archivedAt: new Date() },
            });
        }

        return this.prisma.program.delete({
            where: { id },
        });
    }

    async getDashboard(companyId: string, programId: string) {
        const program = await this.findOne(companyId, programId);

        const projectStats = await this.prisma.project.groupBy({
            by: ['status'],
            where: { programId },
            _count: true,
        });

        const healthStats = await this.prisma.project.groupBy({
            by: ['healthStatus'],
            where: { programId },
            _count: true,
        });

        const budgetSummary = await this.prisma.project.aggregate({
            where: { programId },
            _sum: {
                plannedBudget: true,
                actualBudget: true,
            },
        });

        const upcomingMilestones = await this.prisma.projectMilestone.findMany({
            where: {
                project: { programId },
                status: { not: 'COMPLETED' },
                dueDate: { gte: new Date() },
            },
            orderBy: { dueDate: 'asc' },
            take: 10,
            include: {
                project: { select: { id: true, name: true, code: true } },
            },
        });

        const highRisks = await this.prisma.projectRisk.findMany({
            where: {
                project: { programId },
                status: { not: 'CLOSED' },
                OR: [
                    { probability: 'HIGH' },
                    { probability: 'VERY_HIGH' },
                    { impact: 'MAJOR' },
                    { impact: 'SEVERE' },
                ],
            },
            take: 10,
            include: {
                project: { select: { id: true, name: true, code: true } },
            },
        });

        return {
            program,
            projectStats,
            healthStats,
            budget: {
                total: program.totalBudget || 0,
                planned: budgetSummary._sum.plannedBudget || 0,
                actual: budgetSummary._sum.actualBudget || 0,
            },
            upcomingMilestones,
            highRisks,
        };
    }

    private async generateProgramCode(companyId: string): Promise<string> {
        const count = await this.prisma.program.count({ where: { companyId } });
        const year = new Date().getFullYear().toString().slice(-2);
        return `PGM-${year}-${String(count + 1).padStart(3, '0')}`;
    }
}
