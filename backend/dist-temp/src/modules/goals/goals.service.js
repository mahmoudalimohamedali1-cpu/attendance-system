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
exports.GoalsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const client_1 = require("@prisma/client");
let GoalsService = class GoalsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(companyId, userId, dto) {
        return this.prisma.goal.create({
            data: {
                companyId,
                ownerId: userId,
                managerId: dto.managerId,
                title: dto.title,
                titleEn: dto.titleEn,
                description: dto.description,
                type: dto.type || client_1.GoalType.INDIVIDUAL,
                status: client_1.GoalStatus.DRAFT,
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
    async findAll(companyId, filters) {
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
    async findById(companyId, id) {
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
            throw new common_1.NotFoundException('الهدف غير موجود');
        }
        return goal;
    }
    async update(companyId, id, dto) {
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
    async delete(companyId, id) {
        await this.findById(companyId, id);
        return this.prisma.goal.delete({ where: { id } });
    }
    async submitForApproval(companyId, id) {
        const goal = await this.findById(companyId, id);
        if (goal.status !== client_1.GoalStatus.DRAFT) {
            throw new common_1.BadRequestException('لا يمكن إرسال الهدف للموافقة');
        }
        return this.prisma.goal.update({
            where: { id },
            data: { status: client_1.GoalStatus.PENDING_APPROVAL },
        });
    }
    async approveGoal(companyId, id, approverId) {
        const goal = await this.findById(companyId, id);
        if (goal.status !== client_1.GoalStatus.PENDING_APPROVAL) {
            throw new common_1.BadRequestException('الهدف ليس في انتظار الموافقة');
        }
        return this.prisma.goal.update({
            where: { id },
            data: {
                status: client_1.GoalStatus.APPROVED,
                approvedBy: approverId,
                approvedAt: new Date(),
            },
        });
    }
    async rejectGoal(companyId, id, reason) {
        const goal = await this.findById(companyId, id);
        if (goal.status !== client_1.GoalStatus.PENDING_APPROVAL) {
            throw new common_1.BadRequestException('الهدف ليس في انتظار الموافقة');
        }
        return this.prisma.goal.update({
            where: { id },
            data: {
                status: client_1.GoalStatus.DRAFT,
                rejectionReason: reason,
            },
        });
    }
    async createCheckIn(companyId, goalId, userId, dto) {
        const goal = await this.findById(companyId, goalId);
        const previousValue = Number(goal.currentValue) || 0;
        const newProgress = goal.targetValue
            ? Math.round((dto.newValue / Number(goal.targetValue)) * 100)
            : 0;
        let newStatus = goal.status;
        if (newProgress >= 100) {
            newStatus = client_1.GoalStatus.EXCEEDED;
        }
        else if (newProgress >= 80) {
            newStatus = client_1.GoalStatus.ON_TRACK;
        }
        else if (newProgress >= 50) {
            newStatus = client_1.GoalStatus.IN_PROGRESS;
        }
        else if (dto.blockers) {
            newStatus = client_1.GoalStatus.AT_RISK;
        }
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
    async getCheckIns(companyId, goalId) {
        await this.findById(companyId, goalId);
        return this.prisma.goalCheckIn.findMany({
            where: { goalId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async addKeyResult(companyId, goalId, dto) {
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
    async updateKeyResult(id, dto) {
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
    async deleteKeyResult(id) {
        return this.prisma.keyResult.delete({ where: { id } });
    }
    async checkInKeyResult(keyResultId, userId, dto) {
        const keyResult = await this.prisma.keyResult.findUnique({
            where: { id: keyResultId },
        });
        if (!keyResult) {
            throw new common_1.NotFoundException('Key Result غير موجود');
        }
        const previousValue = Number(keyResult.currentValue) || 0;
        const newProgress = Math.round((dto.newValue / Number(keyResult.targetValue)) * 100);
        await this.prisma.keyResultCheckIn.create({
            data: {
                keyResultId,
                userId,
                previousValue,
                newValue: dto.newValue,
                notes: dto.notes,
            },
        });
        return this.prisma.keyResult.update({
            where: { id: keyResultId },
            data: {
                currentValue: dto.newValue,
                progress: newProgress,
            },
        });
    }
    async getCompanyGoals(companyId) {
        return this.prisma.goal.findMany({
            where: {
                companyId,
                type: client_1.GoalType.COMPANY,
                status: { in: [client_1.GoalStatus.APPROVED, client_1.GoalStatus.IN_PROGRESS, client_1.GoalStatus.ON_TRACK] },
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
    async getMyGoals(companyId, userId) {
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
    async getTeamGoals(companyId, managerId) {
        const teamMembers = await this.prisma.user.findMany({
            where: { companyId, managerId },
            select: { id: true },
        });
        const memberIds = teamMembers.map((m) => m.id);
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
    async syncGoalFromDataSource(companyId, goalId) {
        const goal = await this.findById(companyId, goalId);
        let currentValue = Number(goal.currentValue) || 0;
        let progress = Number(goal.progress) || 0;
        const startDate = goal.startDate || new Date(new Date().getFullYear(), 0, 1);
        const endDate = goal.dueDate || new Date();
        if (goal.type === 'INDIVIDUAL') {
            const tasks = await this.prisma.task.findMany({
                where: { assigneeId: goal.ownerId, createdAt: { gte: startDate, lte: endDate } },
            });
            const completedTasks = tasks.filter((t) => t.status === 'COMPLETED').length;
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
    async syncAllAutoCalculatedGoals(companyId) {
        const goals = await this.prisma.goal.findMany({
            where: { companyId, type: 'INDIVIDUAL' },
            include: { keyResults: true },
        });
        let syncedCount = 0;
        for (const goal of goals) {
            try {
                await this.syncGoalFromDataSource(companyId, goal.id);
                syncedCount++;
            }
            catch (error) {
            }
        }
        return { syncedCount, totalGoals: goals.length };
    }
};
exports.GoalsService = GoalsService;
exports.GoalsService = GoalsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], GoalsService);
//# sourceMappingURL=goals.service.js.map