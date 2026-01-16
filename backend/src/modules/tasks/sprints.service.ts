import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SprintStatus, Sprint, Task } from '@prisma/client';

export interface CreateSprintDto {
    name: string;
    goal?: string;
    description?: string;
    startDate?: string;
    endDate?: string;
}

export interface UpdateSprintDto {
    name?: string;
    goal?: string;
    description?: string;
    startDate?: string;
    endDate?: string;
}

export interface SprintTasksDto {
    taskIds: string[];
}

@Injectable()
export class SprintsService {
    constructor(private readonly prisma: PrismaService) {}

    /**
     * Create a new sprint
     */
    async create(companyId: string, userId: string, data: CreateSprintDto) {
        return this.prisma.sprint.create({
            data: {
                companyId,
                createdById: userId,
                name: data.name,
                goal: data.goal,
                description: data.description,
                startDate: data.startDate ? new Date(data.startDate) : null,
                endDate: data.endDate ? new Date(data.endDate) : null,
                status: SprintStatus.PLANNING,
            },
            include: {
                createdBy: {
                    select: { id: true, firstName: true, lastName: true },
                },
                _count: { select: { tasks: true } },
            },
        });
    }

    /**
     * Get all sprints for a company with statistics
     */
    async findAll(companyId: string, status?: SprintStatus) {
        const sprints = await this.prisma.sprint.findMany({
            where: {
                companyId,
                ...(status && { status }),
            },
            include: {
                createdBy: {
                    select: { id: true, firstName: true, lastName: true },
                },
                tasks: {
                    select: {
                        id: true,
                        status: true,
                        storyPoints: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return sprints.map((sprint) => {
            const totalTasks = sprint.tasks.length;
            const completedTasks = sprint.tasks.filter((t) => t.status === 'COMPLETED').length;
            const totalPoints = sprint.tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
            const completedPoints = sprint.tasks
                .filter((t) => t.status === 'COMPLETED')
                .reduce((sum, t) => sum + (t.storyPoints || 0), 0);

            return {
                id: sprint.id,
                name: sprint.name,
                goal: sprint.goal,
                description: sprint.description,
                status: sprint.status,
                startDate: sprint.startDate,
                endDate: sprint.endDate,
                startedAt: sprint.startedAt,
                completedAt: sprint.completedAt,
                plannedPoints: sprint.plannedPoints,
                completedPoints: sprint.completedPoints,
                velocity: sprint.velocity,
                createdBy: sprint.createdBy,
                createdAt: sprint.createdAt,
                stats: {
                    totalTasks,
                    completedTasks,
                    totalPoints,
                    completedPoints,
                    progressPercent: totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0,
                },
            };
        });
    }

    /**
     * Get a single sprint by ID
     */
    async findOne(companyId: string, sprintId: string) {
        const sprint = await this.prisma.sprint.findFirst({
            where: { id: sprintId, companyId },
            include: {
                createdBy: {
                    select: { id: true, firstName: true, lastName: true },
                },
                tasks: {
                    select: {
                        id: true,
                        title: true,
                        status: true,
                        priority: true,
                        storyPoints: true,
                        estimatedHours: true,
                        assigneeId: true,
                        assignee: {
                            select: { id: true, firstName: true, lastName: true, avatar: true },
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        if (!sprint) {
            throw new NotFoundException('السبرنت غير موجود');
        }

        const totalTasks = sprint.tasks.length;
        const completedTasks = sprint.tasks.filter((t) => t.status === 'COMPLETED').length;
        const totalPoints = sprint.tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
        const completedPoints = sprint.tasks
            .filter((t) => t.status === 'COMPLETED')
            .reduce((sum, t) => sum + (t.storyPoints || 0), 0);

        return {
            ...sprint,
            stats: {
                totalTasks,
                completedTasks,
                totalPoints,
                completedPoints,
                progressPercent: totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0,
            },
        };
    }

    /**
     * Update a sprint
     */
    async update(companyId: string, sprintId: string, data: UpdateSprintDto) {
        const sprint = await this.prisma.sprint.findFirst({
            where: { id: sprintId, companyId },
        });

        if (!sprint) {
            throw new NotFoundException('السبرنت غير موجود');
        }

        if (sprint.status === SprintStatus.COMPLETED) {
            throw new BadRequestException('لا يمكن تعديل سبرنت مكتمل');
        }

        return this.prisma.sprint.update({
            where: { id: sprintId },
            data: {
                ...(data.name && { name: data.name }),
                ...(data.goal !== undefined && { goal: data.goal }),
                ...(data.description !== undefined && { description: data.description }),
                ...(data.startDate && { startDate: new Date(data.startDate) }),
                ...(data.endDate && { endDate: new Date(data.endDate) }),
            },
            include: {
                createdBy: {
                    select: { id: true, firstName: true, lastName: true },
                },
                _count: { select: { tasks: true } },
            },
        });
    }

    /**
     * Delete a sprint
     */
    async delete(companyId: string, sprintId: string) {
        const sprint = await this.prisma.sprint.findFirst({
            where: { id: sprintId, companyId },
        });

        if (!sprint) {
            throw new NotFoundException('السبرنت غير موجود');
        }

        if (sprint.status === SprintStatus.ACTIVE) {
            throw new BadRequestException('لا يمكن حذف سبرنت نشط');
        }

        // Remove tasks from sprint before deleting
        await this.prisma.task.updateMany({
            where: { sprintId },
            data: { sprintId: null },
        });

        return this.prisma.sprint.delete({
            where: { id: sprintId },
        });
    }

    /**
     * Start a sprint
     */
    async start(companyId: string, sprintId: string) {
        const sprint = await this.prisma.sprint.findFirst({
            where: { id: sprintId, companyId },
            include: {
                tasks: {
                    select: { storyPoints: true },
                },
            },
        });

        if (!sprint) {
            throw new NotFoundException('السبرنت غير موجود');
        }

        if (sprint.status !== SprintStatus.PLANNING) {
            throw new BadRequestException('لا يمكن بدء سبرنت غير في مرحلة التخطيط');
        }

        // Check if there's already an active sprint
        const activeSprint = await this.prisma.sprint.findFirst({
            where: {
                companyId,
                status: SprintStatus.ACTIVE,
                id: { not: sprintId },
            },
        });

        if (activeSprint) {
            throw new BadRequestException(`يوجد سبرنت نشط بالفعل: ${activeSprint.name}`);
        }

        const plannedPoints = sprint.tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);

        return this.prisma.sprint.update({
            where: { id: sprintId },
            data: {
                status: SprintStatus.ACTIVE,
                startedAt: new Date(),
                plannedPoints,
            },
            include: {
                createdBy: {
                    select: { id: true, firstName: true, lastName: true },
                },
                _count: { select: { tasks: true } },
            },
        });
    }

    /**
     * Complete a sprint
     */
    async complete(companyId: string, sprintId: string, moveIncompleteTo?: string) {
        const sprint = await this.prisma.sprint.findFirst({
            where: { id: sprintId, companyId },
            include: {
                tasks: {
                    select: { id: true, status: true, storyPoints: true },
                },
            },
        });

        if (!sprint) {
            throw new NotFoundException('السبرنت غير موجود');
        }

        if (sprint.status !== SprintStatus.ACTIVE) {
            throw new BadRequestException('لا يمكن إكمال سبرنت غير نشط');
        }

        // Calculate completed points
        const completedPoints = sprint.tasks
            .filter((t) => t.status === 'COMPLETED')
            .reduce((sum, t) => sum + (t.storyPoints || 0), 0);

        // Calculate velocity (points per day)
        const startDate = sprint.startedAt || sprint.startDate;
        const endDate = new Date();
        let velocity: number | null = null;
        if (startDate) {
            const days = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
            velocity = Math.round((completedPoints / days) * 10) / 10;
        }

        // Move incomplete tasks to another sprint if specified
        if (moveIncompleteTo) {
            const targetSprint = await this.prisma.sprint.findFirst({
                where: { id: moveIncompleteTo, companyId },
            });

            if (!targetSprint) {
                throw new BadRequestException('السبرنت المستهدف غير موجود');
            }

            const incompleteTasks = sprint.tasks.filter((t) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED');
            await this.prisma.task.updateMany({
                where: {
                    id: { in: incompleteTasks.map((t) => t.id) },
                },
                data: { sprintId: moveIncompleteTo },
            });
        }

        return this.prisma.sprint.update({
            where: { id: sprintId },
            data: {
                status: SprintStatus.COMPLETED,
                completedAt: new Date(),
                completedPoints,
                velocity,
            },
            include: {
                createdBy: {
                    select: { id: true, firstName: true, lastName: true },
                },
                _count: { select: { tasks: true } },
            },
        });
    }

    /**
     * Cancel a sprint
     */
    async cancel(companyId: string, sprintId: string) {
        const sprint = await this.prisma.sprint.findFirst({
            where: { id: sprintId, companyId },
        });

        if (!sprint) {
            throw new NotFoundException('السبرنت غير موجود');
        }

        if (sprint.status === SprintStatus.COMPLETED) {
            throw new BadRequestException('لا يمكن إلغاء سبرنت مكتمل');
        }

        // Remove tasks from sprint
        await this.prisma.task.updateMany({
            where: { sprintId },
            data: { sprintId: null },
        });

        return this.prisma.sprint.update({
            where: { id: sprintId },
            data: { status: SprintStatus.CANCELLED },
        });
    }

    /**
     * Add tasks to sprint
     */
    async addTasks(companyId: string, sprintId: string, taskIds: string[]) {
        const sprint = await this.prisma.sprint.findFirst({
            where: { id: sprintId, companyId },
        });

        if (!sprint) {
            throw new NotFoundException('السبرنت غير موجود');
        }

        if (sprint.status === SprintStatus.COMPLETED || sprint.status === SprintStatus.CANCELLED) {
            throw new BadRequestException('لا يمكن إضافة مهام لسبرنت مكتمل أو ملغي');
        }

        await this.prisma.task.updateMany({
            where: {
                id: { in: taskIds },
                companyId,
            },
            data: { sprintId },
        });

        return this.findOne(companyId, sprintId);
    }

    /**
     * Remove tasks from sprint
     */
    async removeTasks(companyId: string, sprintId: string, taskIds: string[]) {
        const sprint = await this.prisma.sprint.findFirst({
            where: { id: sprintId, companyId },
        });

        if (!sprint) {
            throw new NotFoundException('السبرنت غير موجود');
        }

        if (sprint.status === SprintStatus.COMPLETED) {
            throw new BadRequestException('لا يمكن إزالة مهام من سبرنت مكتمل');
        }

        await this.prisma.task.updateMany({
            where: {
                id: { in: taskIds },
                sprintId,
            },
            data: { sprintId: null },
        });

        return this.findOne(companyId, sprintId);
    }

    /**
     * Get sprint burndown data
     */
    async getBurndown(companyId: string, sprintId: string) {
        const sprint = await this.prisma.sprint.findFirst({
            where: { id: sprintId, companyId },
            include: {
                tasks: {
                    select: {
                        id: true,
                        status: true,
                        storyPoints: true,
                        completedAt: true,
                    },
                },
            },
        });

        if (!sprint) {
            throw new NotFoundException('السبرنت غير موجود');
        }

        const startDate = sprint.startedAt || sprint.startDate;
        const endDate = sprint.completedAt || sprint.endDate || new Date();

        if (!startDate) {
            return { sprint, burndown: [] };
        }

        const totalPoints = sprint.tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
        const days: { date: string; remaining: number; ideal: number }[] = [];

        const currentDate = new Date(startDate);
        const end = new Date(endDate);
        const totalDays = Math.ceil((end.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
        const dailyIdealBurn = totalPoints / Math.max(1, totalDays);

        let dayIndex = 0;
        while (currentDate <= end) {
            const dateStr = currentDate.toISOString().split('T')[0];

            // Calculate remaining points for this day
            const completedByDate = sprint.tasks
                .filter((t) => t.status === 'COMPLETED' && t.completedAt && new Date(t.completedAt) <= currentDate)
                .reduce((sum, t) => sum + (t.storyPoints || 0), 0);

            days.push({
                date: dateStr,
                remaining: totalPoints - completedByDate,
                ideal: Math.max(0, totalPoints - dailyIdealBurn * dayIndex),
            });

            currentDate.setDate(currentDate.getDate() + 1);
            dayIndex++;
        }

        return { sprint, burndown: days };
    }

    /**
     * Get velocity history
     */
    async getVelocityHistory(companyId: string, limit = 10) {
        const completedSprints = await this.prisma.sprint.findMany({
            where: {
                companyId,
                status: SprintStatus.COMPLETED,
                velocity: { not: null },
            },
            orderBy: { completedAt: 'desc' },
            take: limit,
            select: {
                id: true,
                name: true,
                completedPoints: true,
                velocity: true,
                startedAt: true,
                completedAt: true,
            },
        });

        const avgVelocity =
            completedSprints.length > 0
                ? completedSprints.reduce((sum, s) => sum + (s.velocity || 0), 0) / completedSprints.length
                : 0;

        return {
            history: completedSprints.reverse(),
            averageVelocity: Math.round(avgVelocity * 10) / 10,
        };
    }

    /**
     * Get active sprint
     */
    async getActive(companyId: string) {
        const sprint = await this.prisma.sprint.findFirst({
            where: {
                companyId,
                status: SprintStatus.ACTIVE,
            },
            include: {
                createdBy: {
                    select: { id: true, firstName: true, lastName: true },
                },
                tasks: {
                    select: {
                        id: true,
                        title: true,
                        status: true,
                        priority: true,
                        storyPoints: true,
                        assignee: {
                            select: { id: true, firstName: true, lastName: true, avatar: true },
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        if (!sprint) {
            return null;
        }

        const totalTasks = sprint.tasks.length;
        const completedTasks = sprint.tasks.filter((t) => t.status === 'COMPLETED').length;
        const totalPoints = sprint.tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
        const completedPoints = sprint.tasks
            .filter((t) => t.status === 'COMPLETED')
            .reduce((sum, t) => sum + (t.storyPoints || 0), 0);

        return {
            ...sprint,
            stats: {
                totalTasks,
                completedTasks,
                totalPoints,
                completedPoints,
                progressPercent: totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0,
            },
        };
    }
}
