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
var RecurringTasksScheduler_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecurringTasksScheduler = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const client_1 = require("@prisma/client");
let RecurringTasksScheduler = RecurringTasksScheduler_1 = class RecurringTasksScheduler {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(RecurringTasksScheduler_1.name);
    }
    async processRecurringTasks() {
        this.logger.log('Processing recurring tasks...');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const recurringTasks = await this.prisma.task.findMany({
            where: {
                recurrenceType: { not: null },
                status: { not: client_1.TaskStatus.COMPLETED },
                OR: [
                    { recurrenceEnd: null },
                    { recurrenceEnd: { gte: today } },
                ],
            },
            include: {
                checklists: {
                    include: { items: true },
                },
            },
        });
        let createdCount = 0;
        for (const task of recurringTasks) {
            if (this.shouldCreateNewTask(task, today)) {
                try {
                    await this.createRecurringTaskInstance(task);
                    createdCount++;
                }
                catch (error) {
                    this.logger.error(`Failed to create recurring task for ${task.id}:`, error);
                }
            }
        }
        this.logger.log(`Created ${createdCount} recurring task instances`);
    }
    shouldCreateNewTask(task, today) {
        const lastDueDate = task.dueDate ? new Date(task.dueDate) : new Date(task.createdAt);
        lastDueDate.setHours(0, 0, 0, 0);
        const daysDiff = Math.floor((today.getTime() - lastDueDate.getTime()) / (1000 * 60 * 60 * 24));
        switch (task.recurrenceType) {
            case client_1.TaskRecurrenceType.DAILY:
                return daysDiff >= 1;
            case client_1.TaskRecurrenceType.WEEKLY:
                return daysDiff >= 7;
            case client_1.TaskRecurrenceType.BIWEEKLY:
                return daysDiff >= 14;
            case client_1.TaskRecurrenceType.MONTHLY:
                return daysDiff >= 30;
            case client_1.TaskRecurrenceType.QUARTERLY:
                return daysDiff >= 90;
            case client_1.TaskRecurrenceType.YEARLY:
                return daysDiff >= 365;
            default:
                return false;
        }
    }
    async createRecurringTaskInstance(parentTask) {
        const nextDueDate = this.calculateNextDueDate(parentTask);
        const newTask = await this.prisma.task.create({
            data: {
                companyId: parentTask.companyId,
                title: parentTask.title,
                description: parentTask.description,
                status: client_1.TaskStatus.TODO,
                priority: parentTask.priority,
                categoryId: parentTask.categoryId,
                templateId: parentTask.templateId,
                dueDate: nextDueDate,
                createdById: parentTask.createdById,
                assigneeId: parentTask.assigneeId,
                tags: parentTask.tags || [],
                parentTaskId: parentTask.id,
                order: 0,
            },
        });
        if (parentTask.checklists?.length > 0) {
            for (const checklist of parentTask.checklists) {
                const newChecklist = await this.prisma.taskChecklist.create({
                    data: {
                        taskId: newTask.id,
                        title: checklist.title,
                    },
                });
                if (checklist.items?.length > 0) {
                    await this.prisma.taskChecklistItem.createMany({
                        data: checklist.items.map((item) => ({
                            checklistId: newChecklist.id,
                            content: item.content,
                            isCompleted: false,
                            order: item.order,
                        })),
                    });
                }
            }
        }
        await this.prisma.task.update({
            where: { id: parentTask.id },
            data: { dueDate: nextDueDate },
        });
        this.logger.log(`Created recurring task instance: ${newTask.id} from parent: ${parentTask.id}`);
        return newTask;
    }
    calculateNextDueDate(task) {
        const baseDate = task.dueDate ? new Date(task.dueDate) : new Date();
        const nextDate = new Date(baseDate);
        switch (task.recurrenceType) {
            case client_1.TaskRecurrenceType.DAILY:
                nextDate.setDate(nextDate.getDate() + 1);
                break;
            case client_1.TaskRecurrenceType.WEEKLY:
                nextDate.setDate(nextDate.getDate() + 7);
                break;
            case client_1.TaskRecurrenceType.BIWEEKLY:
                nextDate.setDate(nextDate.getDate() + 14);
                break;
            case client_1.TaskRecurrenceType.MONTHLY:
                nextDate.setMonth(nextDate.getMonth() + 1);
                break;
            case client_1.TaskRecurrenceType.QUARTERLY:
                nextDate.setMonth(nextDate.getMonth() + 3);
                break;
            case client_1.TaskRecurrenceType.YEARLY:
                nextDate.setFullYear(nextDate.getFullYear() + 1);
                break;
        }
        return nextDate;
    }
    async triggerManually() {
        this.logger.log('Manually triggering recurring tasks processing...');
        return this.processRecurringTasks();
    }
};
exports.RecurringTasksScheduler = RecurringTasksScheduler;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_1AM),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], RecurringTasksScheduler.prototype, "processRecurringTasks", null);
exports.RecurringTasksScheduler = RecurringTasksScheduler = RecurringTasksScheduler_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RecurringTasksScheduler);
//# sourceMappingURL=recurring-tasks.scheduler.js.map