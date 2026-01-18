// @ts-nocheck
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TaskStatus, TaskPriority } from '@prisma/client';

// TaskRecurrenceType constants (Task.recurrenceType is String not enum)
const TaskRecurrenceType = {
    DAILY: 'DAILY',
    WEEKLY: 'WEEKLY',
    BIWEEKLY: 'BIWEEKLY',
    MONTHLY: 'MONTHLY',
    QUARTERLY: 'QUARTERLY',
    YEARLY: 'YEARLY',
} as const;

@Injectable()
export class RecurringTasksScheduler {
    private readonly logger = new Logger(RecurringTasksScheduler.name);

    constructor(private prisma: PrismaService) { }

    /**
     * Runs every day at 1:00 AM to create recurring tasks
     */
    @Cron(CronExpression.EVERY_DAY_AT_1AM)
    async processRecurringTasks() {
        this.logger.log('Processing recurring tasks...');

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Get all active recurring tasks that need to be processed
        const recurringTasks = await this.prisma.task.findMany({
            where: {
                recurrenceType: { not: null },
                status: { not: TaskStatus.COMPLETED },
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
                } catch (error) {
                    this.logger.error(`Failed to create recurring task for ${task.id}:`, error);
                }
            }
        }

        this.logger.log(`Created ${createdCount} recurring task instances`);
    }

    /**
     * Check if a new task instance should be created based on recurrence type
     */
    private shouldCreateNewTask(task: any, today: Date): boolean {
        const lastDueDate = task.dueDate ? new Date(task.dueDate) : new Date(task.createdAt);
        lastDueDate.setHours(0, 0, 0, 0);

        const daysDiff = Math.floor((today.getTime() - lastDueDate.getTime()) / (1000 * 60 * 60 * 24));

        switch (task.recurrenceType) {
            case TaskRecurrenceType.DAILY:
                return daysDiff >= 1;
            case TaskRecurrenceType.WEEKLY:
                return daysDiff >= 7;
            case TaskRecurrenceType.BIWEEKLY:
                return daysDiff >= 14;
            case TaskRecurrenceType.MONTHLY:
                return daysDiff >= 30;
            case TaskRecurrenceType.QUARTERLY:
                return daysDiff >= 90;
            case TaskRecurrenceType.YEARLY:
                return daysDiff >= 365;
            default:
                return false;
        }
    }

    /**
     * Create a new instance of the recurring task
     */
    private async createRecurringTaskInstance(parentTask: any) {
        const nextDueDate = this.calculateNextDueDate(parentTask);

        // Create new task instance
        const newTask = await this.prisma.task.create({
            data: {
                companyId: parentTask.companyId,
                title: parentTask.title,
                description: parentTask.description,
                status: TaskStatus.TODO,
                priority: parentTask.priority as TaskPriority,
                categoryId: parentTask.categoryId,
                templateId: parentTask.templateId,
                dueDate: nextDueDate,
                createdById: parentTask.createdById,
                assigneeId: parentTask.assigneeId,
                tags: parentTask.tags || [],
                parentTaskId: parentTask.id, // Link to parent recurring task
                order: 0,
            },
        });

        // Copy checklists if they exist
        if (parentTask.checklists?.length > 0) {
            for (const checklist of parentTask.checklists) {
                const newChecklist = await this.prisma.taskChecklist.create({
                    data: {
                        taskId: newTask.id,
                        title: checklist.title,
                    },
                });

                // Copy checklist items
                if (checklist.items?.length > 0) {
                    await this.prisma.taskChecklistItem.createMany({
                        data: checklist.items.map((item: any) => ({
                            checklistId: newChecklist.id,
                            content: item.content,
                            isCompleted: false, // Reset completion
                            order: item.order,
                        })),
                    });
                }
            }
        }

        // Update parent task due date to track the cycle
        await this.prisma.task.update({
            where: { id: parentTask.id },
            data: { dueDate: nextDueDate },
        });

        this.logger.log(`Created recurring task instance: ${newTask.id} from parent: ${parentTask.id}`);

        return newTask;
    }

    /**
     * Calculate the next due date based on recurrence type
     */
    private calculateNextDueDate(task: any): Date {
        const baseDate = task.dueDate ? new Date(task.dueDate) : new Date();
        const nextDate = new Date(baseDate);

        switch (task.recurrenceType) {
            case TaskRecurrenceType.DAILY:
                nextDate.setDate(nextDate.getDate() + 1);
                break;
            case TaskRecurrenceType.WEEKLY:
                nextDate.setDate(nextDate.getDate() + 7);
                break;
            case TaskRecurrenceType.BIWEEKLY:
                nextDate.setDate(nextDate.getDate() + 14);
                break;
            case TaskRecurrenceType.MONTHLY:
                nextDate.setMonth(nextDate.getMonth() + 1);
                break;
            case TaskRecurrenceType.QUARTERLY:
                nextDate.setMonth(nextDate.getMonth() + 3);
                break;
            case TaskRecurrenceType.YEARLY:
                nextDate.setFullYear(nextDate.getFullYear() + 1);
                break;
        }

        return nextDate;
    }

    /**
     * Manual trigger for testing - can be called via API
     */
    async triggerManually() {
        this.logger.log('Manually triggering recurring tasks processing...');
        return this.processRecurringTasks();
    }
}
