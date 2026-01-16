import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { GoalType, GoalStatus, User } from '@prisma/client';

@Injectable()
export class GoalsService {
    constructor(private readonly prisma: PrismaService) { }

    // ==================== Goals CRUD ====================

    async create(companyId: string, userId: string, dto: {
        title: string;
        titleEn?: string;
        description?: string;
        type?: GoalType;
        startDate?: string;
        dueDate?: string;
        targetValue?: number;
        unit?: string;
        weight?: number;
        category?: string;
        isStretch?: boolean;
        parentGoalId?: string;
        alignedCompanyGoalId?: string;
        managerId?: string;
        aiGenerated?: boolean;
        aiPrompt?: string;
    }) {
        return this.prisma.goal.create({
            data: {
                companyId,
                ownerId: userId,
                managerId: dto.managerId,
                title: dto.title,
                titleEn: dto.titleEn,
                description: dto.description,
                type: dto.type || GoalType.INDIVIDUAL,
                status: GoalStatus.DRAFT,
                startDate: dto.startDate ? new Date(dto.startDate) : null,
                dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
                targetValue: dto.targetValue,
                unit: dto.unit,
                weight: dto.weight ?? 100,
                category: dto.category,
                isStretch: dto.isStretch ?? false,
                parentGoalId: dto.parentGoalId,
                alignedCompanyGoalId: dto.alignedCompanyGoalId,
                aiGenerated: dto.aiGenerated ?? false,
                aiPrompt: dto.aiPrompt,
            },
            include: {
                keyResults: true,
            },
        });
    }

    async findAll(companyId: string, filters?: {
        ownerId?: string;
        type?: GoalType;
        status?: GoalStatus;
    }) {
        return this.prisma.goal.findMany({
            where: {
                companyId,
                ...(filters?.ownerId && { ownerId: filters.ownerId }),
                ...(filters?.type && { type: filters.type }),
                ...(filters?.status && { status: filters.status }),
            },
            include: {
                keyResults: true,
                childGoals: {
                    select: {
                        id: true,
                        title: true,
                        progress: true,
                        status: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findById(companyId: string, id: string) {
        const goal = await this.prisma.goal.findFirst({
            where: { id, companyId },
            include: {
                keyResults: {
                    include: { checkIns: { take: 5, orderBy: { createdAt: 'desc' } } },
                },
                checkIns: { take: 10, orderBy: { createdAt: 'desc' } },
                childGoals: true,
                parentGoal: { select: { id: true, title: true } },
                ratings: true,
            },
        });

        if (!goal) {
            throw new NotFoundException('الهدف غير موجود');
        }

        return goal;
    }

    async update(companyId: string, id: string, dto: Partial<{
        title: string;
        titleEn: string;
        description: string;
        type: GoalType;
        status: GoalStatus;
        startDate: string;
        dueDate: string;
        targetValue: number;
        currentValue: number;
        unit: string;
        progress: number;
        weight: number;
        category: string;
        isStretch: boolean;
    }>) {
        await this.findById(companyId, id);

        return this.prisma.goal.update({
            where: { id },
            data: {
                ...dto,
                startDate: dto.startDate ? new Date(dto.startDate) : undefined,
                dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
            },
            include: { keyResults: true },
        });
    }

    async delete(companyId: string, id: string) {
        await this.findById(companyId, id);
        return this.prisma.goal.delete({ where: { id } });
    }

    // ==================== Goal Approval ====================

    async submitForApproval(companyId: string, id: string) {
        const goal = await this.findById(companyId, id);

        if (goal.status !== GoalStatus.DRAFT) {
            throw new BadRequestException('لا يمكن إرسال الهدف للموافقة');
        }

        return this.prisma.goal.update({
            where: { id },
            data: { status: GoalStatus.PENDING_APPROVAL },
        });
    }

    async approveGoal(companyId: string, id: string, approverId: string) {
        const goal = await this.findById(companyId, id);

        if (goal.status !== GoalStatus.PENDING_APPROVAL) {
            throw new BadRequestException('الهدف ليس في انتظار الموافقة');
        }

        return this.prisma.goal.update({
            where: { id },
            data: {
                status: GoalStatus.APPROVED,
                approvedBy: approverId,
                approvedAt: new Date(),
            },
        });
    }

    async rejectGoal(companyId: string, id: string, reason: string) {
        const goal = await this.findById(companyId, id);

        if (goal.status !== GoalStatus.PENDING_APPROVAL) {
            throw new BadRequestException('الهدف ليس في انتظار الموافقة');
        }

        return this.prisma.goal.update({
            where: { id },
            data: {
                status: GoalStatus.DRAFT,
                rejectionReason: reason,
            },
        });
    }

    // ==================== Check-ins ====================

    async createCheckIn(companyId: string, goalId: string, userId: string, dto: {
        newValue: number;
        statusUpdate?: string;
        blockers?: string;
        nextSteps?: string;
        confidence?: number;
    }) {
        const goal = await this.findById(companyId, goalId);

        const previousValue = Number(goal.currentValue) || 0;
        const newProgress = goal.targetValue
            ? Math.round((dto.newValue / Number(goal.targetValue)) * 100)
            : 0;

        // تحديث حالة الهدف بناءً على التقدم
        let newStatus = goal.status;
        if (newProgress >= 100) {
            newStatus = GoalStatus.EXCEEDED;
        } else if (newProgress >= 80) {
            newStatus = GoalStatus.ON_TRACK;
        } else if (newProgress >= 50) {
            newStatus = GoalStatus.IN_PROGRESS;
        } else if (dto.blockers) {
            newStatus = GoalStatus.AT_RISK;
        }

        // إنشاء الـ Check-in
        const checkIn = await this.prisma.goalCheckIn.create({
            data: {
                goalId,
                userId,
                previousValue,
                newValue: dto.newValue,
                statusUpdate: dto.statusUpdate,
                blockers: dto.blockers,
                nextSteps: dto.nextSteps,
                confidence: dto.confidence,
            },
        });

        // تحديث الهدف
        await this.prisma.goal.update({
            where: { id: goalId },
            data: {
                currentValue: dto.newValue,
                progress: newProgress,
                status: newStatus,
            },
        });

        return checkIn;
    }

    async getCheckIns(companyId: string, goalId: string) {
        await this.findById(companyId, goalId);

        return this.prisma.goalCheckIn.findMany({
            where: { goalId },
            orderBy: { createdAt: 'desc' },
        });
    }

    // ==================== Key Results ====================

    async addKeyResult(companyId: string, goalId: string, dto: {
        title: string;
        description?: string;
        targetValue: number;
        unit?: string;
        dueDate?: string;
    }) {
        await this.findById(companyId, goalId);

        return this.prisma.keyResult.create({
            data: {
                goalId,
                title: dto.title,
                description: dto.description,
                targetValue: dto.targetValue,
                unit: dto.unit || '%',
                dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
            },
        });
    }

    async updateKeyResult(id: string, dto: {
        title?: string;
        description?: string;
        targetValue?: number;
        currentValue?: number;
        unit?: string;
        dueDate?: string;
    }) {
        return this.prisma.keyResult.update({
            where: { id },
            data: {
                ...dto,
                dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
                progress: dto.currentValue && dto.targetValue
                    ? Math.round((dto.currentValue / dto.targetValue) * 100)
                    : undefined,
            },
        });
    }

    async deleteKeyResult(id: string) {
        return this.prisma.keyResult.delete({ where: { id } });
    }

    async checkInKeyResult(keyResultId: string, userId: string, dto: {
        newValue: number;
        notes?: string;
    }) {
        const keyResult = await this.prisma.keyResult.findUnique({
            where: { id: keyResultId },
        });

        if (!keyResult) {
            throw new NotFoundException('Key Result غير موجود');
        }

        const previousValue = Number(keyResult.currentValue) || 0;
        const newProgress = Math.round((dto.newValue / Number(keyResult.targetValue)) * 100);

        // إنشاء الـ Check-in
        await this.prisma.keyResultCheckIn.create({
            data: {
                keyResultId,
                userId,
                previousValue,
                newValue: dto.newValue,
                notes: dto.notes,
            },
        });

        // تحديث الـ Key Result
        return this.prisma.keyResult.update({
            where: { id: keyResultId },
            data: {
                currentValue: dto.newValue,
                progress: newProgress,
            },
        });
    }

    // ==================== Company Goals (Alignment) ====================

    async getCompanyGoals(companyId: string) {
        return this.prisma.goal.findMany({
            where: {
                companyId,
                type: GoalType.COMPANY,
                status: { in: [GoalStatus.APPROVED, GoalStatus.IN_PROGRESS, GoalStatus.ON_TRACK] },
            },
            include: {
                childGoals: {
                    select: {
                        id: true,
                        title: true,
                        ownerId: true,
                        progress: true,
                    },
                },
            },
        });
    }

    // ==================== My Goals ====================

    async getMyGoals(companyId: string, userId: string) {
        return this.prisma.goal.findMany({
            where: {
                companyId,
                ownerId: userId,
            },
            include: {
                keyResults: true,
                parentGoal: { select: { id: true, title: true } },
            },
            orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
        });
    }

    async getTeamGoals(companyId: string, managerId: string) {
        // جلب IDs الموظفين التابعين للمدير
        const teamMembers = await this.prisma.user.findMany({
            where: { companyId, managerId },
            select: { id: true },
        });

        const memberIds = teamMembers.map((m: { id: string }) => m.id);

        return this.prisma.goal.findMany({
            where: {
                companyId,
                ownerId: { in: memberIds },
            },
            include: {
                keyResults: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    // ==================== Data Sources (Smart Goals @ Mentions) ====================

    getAvailableDataSources() {
        return [
            { key: 'ATTENDANCE', label: 'الحضور', labelEn: 'Attendance', icon: '📊', metrics: ['attendance_rate', 'late_count', 'absent_days'] },
            { key: 'LEAVES', label: 'الإجازات', labelEn: 'Leaves', icon: '🏖️', metrics: ['used_leave_days', 'remaining_leave_days', 'sick_leave_days'] },
            { key: 'TASKS', label: 'المهام', labelEn: 'Tasks', icon: '✅', metrics: ['completed_tasks', 'task_completion_rate', 'on_time_tasks'] },
            { key: 'OVERTIME', label: 'العمل الإضافي', labelEn: 'Overtime', icon: '⏰', metrics: ['overtime_hours', 'overtime_days'] },
            { key: 'POLICIES', label: 'السياسات', labelEn: 'Policies', icon: '📋', metrics: ['violations_count', 'deductions_total'] },
            { key: 'CUSTODY', label: 'العهد', labelEn: 'Custody', icon: '📦', metrics: ['active_custody', 'returned_custody'] },
            { key: 'RECOGNITION', label: 'التقدير', labelEn: 'Recognition', icon: '🏆', metrics: ['recognitions_received', 'recognition_points'] },
        ];
    }

    async syncGoalFromDataSource(companyId: string, goalId: string) {
        const goal = await this.findById(companyId, goalId);

        // Simplified version - just update based on progress calculation
        let currentValue = Number(goal.currentValue) || 0;
        let progress = Number(goal.progress) || 0;

        const startDate = goal.startDate || new Date(new Date().getFullYear(), 0, 1);
        const endDate = goal.dueDate || new Date();

        // حساب القيمة بناءً على نوع الهدف
        if (goal.type === 'INDIVIDUAL') {
            const tasks = await this.prisma.task.findMany({
                where: { assigneeId: goal.ownerId, createdAt: { gte: startDate, lte: endDate } },
            });
            const completedTasks = tasks.filter((t: any) => t.status === 'COMPLETED').length;
            currentValue = completedTasks;
            progress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;
        }

        return this.prisma.goal.update({
            where: { id: goalId },
            data: {
                currentValue,
                progress: Math.min(progress, 100),
            },
        });
    }

    async syncAllAutoCalculatedGoals(companyId: string) {
        // Simplified - sync goals that have key results
        const goals = await this.prisma.goal.findMany({
            where: { companyId, type: 'INDIVIDUAL' },
            include: { keyResults: true },
        });

        let syncedCount = 0;
        for (const goal of goals) {
            try {
                await this.syncGoalFromDataSource(companyId, goal.id);
                syncedCount++;
            } catch (error) {
                // تسجيل الخطأ والمتابعة
            }
        }

        return { syncedCount, totalGoals: goals.length };
    }
}

