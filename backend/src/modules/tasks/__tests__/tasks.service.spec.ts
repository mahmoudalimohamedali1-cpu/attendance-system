import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { TasksService } from '../tasks.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';

/**
 * 🧪 Tasks Service Unit Tests
 * 
 * Tests for:
 * - Task CRUD operations
 * - Kanban board management
 * - Checklists and comments
 * - Time logging
 * - Categories and templates
 * - Task dependencies
 */

const mockPrismaService = {
    task: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
    },
    taskCategory: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    },
    taskChecklist: {
        create: jest.fn(),
        findMany: jest.fn(),
    },
    taskChecklistItem: {
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
    },
    taskComment: {
        create: jest.fn(),
        delete: jest.fn(),
    },
    taskTimeLog: {
        create: jest.fn(),
        aggregate: jest.fn(),
    },
    taskTemplate: {
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    },
    taskWatcher: {
        create: jest.fn(),
        delete: jest.fn(),
    },
    taskDependency: {
        create: jest.fn(),
        delete: jest.fn(),
    },
    user: {
        findUnique: jest.fn(),
    },
};

const mockNotificationsService = {
    sendNotification: jest.fn(),
    create: jest.fn(),
};

describe('TasksService', () => {
    let service: TasksService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TasksService,
                { provide: PrismaService, useValue: mockPrismaService },
                { provide: NotificationsService, useValue: mockNotificationsService },
            ],
        }).compile();

        service = module.get<TasksService>(TasksService);
        jest.clearAllMocks();
    });

    describe('Task CRUD', () => {
        describe('createTask', () => {
            const createDto = {
                title: 'إنشاء تقرير شهري',
                description: 'إعداد التقرير المالي الشهري',
                priority: 'HIGH',
                dueDate: new Date('2026-01-20'),
                assigneeId: 'emp-123',
                categoryId: 'cat-123',
            };

            it('should create a task', async () => {
                mockPrismaService.task.create.mockResolvedValue({
                    id: 'task-123',
                    code: 'TSK-001',
                    ...createDto,
                });

                const result = await service.createTask('user-123', 'company-123', createDto);

                expect(result.id).toBe('task-123');
            });

            it('should notify assignee', async () => {
                mockPrismaService.task.create.mockResolvedValue({ id: 'task-123' });

                await service.createTask('user-123', 'company-123', createDto);

                expect(mockNotificationsService.sendNotification).toHaveBeenCalled();
            });
        });

        describe('getTasks', () => {
            it('should return paginated tasks', async () => {
                mockPrismaService.task.findMany.mockResolvedValue([
                    { id: 't1', title: 'مهمة 1' },
                    { id: 't2', title: 'مهمة 2' },
                ]);
                mockPrismaService.task.count.mockResolvedValue(10);

                const result = await service.getTasks('company-123', { page: 1, limit: 10 });

                expect(result.data).toHaveLength(2);
                expect(result.total).toBe(10);
            });

            it('should filter by status', async () => {
                mockPrismaService.task.findMany.mockResolvedValue([]);
                mockPrismaService.task.count.mockResolvedValue(0);

                await service.getTasks('company-123', { status: 'IN_PROGRESS' });

                expect(mockPrismaService.task.findMany).toHaveBeenCalledWith(
                    expect.objectContaining({
                        where: expect.objectContaining({ status: 'IN_PROGRESS' }),
                    })
                );
            });

            it('should filter by assignee', async () => {
                mockPrismaService.task.findMany.mockResolvedValue([]);
                mockPrismaService.task.count.mockResolvedValue(0);

                await service.getTasks('company-123', { assigneeId: 'emp-123' });

                expect(mockPrismaService.task.findMany).toHaveBeenCalledWith(
                    expect.objectContaining({
                        where: expect.objectContaining({ assigneeId: 'emp-123' }),
                    })
                );
            });
        });

        describe('getMyTasks', () => {
            it('should return tasks assigned to or created by user', async () => {
                mockPrismaService.task.findMany.mockResolvedValue([]);

                await service.getMyTasks('user-123', 'company-123');

                expect(mockPrismaService.task.findMany).toHaveBeenCalledWith(
                    expect.objectContaining({
                        where: expect.objectContaining({
                            OR: [
                                { assigneeId: 'user-123' },
                                { createdById: 'user-123' },
                            ],
                        }),
                    })
                );
            });
        });

        describe('getTaskById', () => {
            it('should return task with details', async () => {
                mockPrismaService.task.findFirst.mockResolvedValue({
                    id: 'task-123',
                    title: 'مهمة',
                    checklists: [],
                    comments: [],
                    timeLogs: [],
                });

                const result = await service.getTaskById('task-123', 'company-123');

                expect(result).toHaveProperty('checklists');
                expect(result).toHaveProperty('comments');
            });

            it('should throw NotFoundException', async () => {
                mockPrismaService.task.findFirst.mockResolvedValue(null);

                await expect(service.getTaskById('non-existent', 'company-123'))
                    .rejects.toThrow(NotFoundException);
            });
        });

        describe('updateTask', () => {
            beforeEach(() => {
                mockPrismaService.task.findFirst.mockResolvedValue({
                    id: 'task-123',
                    createdById: 'user-123',
                });
            });

            it('should update task', async () => {
                mockPrismaService.task.update.mockResolvedValue({
                    id: 'task-123',
                    status: 'COMPLETED',
                });

                await service.updateTask('task-123', 'company-123', 'user-123', {
                    status: 'COMPLETED',
                });

                expect(mockPrismaService.task.update).toHaveBeenCalled();
            });
        });

        describe('deleteTask', () => {
            it('should delete task', async () => {
                mockPrismaService.task.findFirst.mockResolvedValue({
                    id: 'task-123',
                    createdById: 'user-123',
                });
                mockPrismaService.task.delete.mockResolvedValue({});

                await service.deleteTask('task-123', 'company-123', 'user-123');

                expect(mockPrismaService.task.delete).toHaveBeenCalled();
            });
        });
    });

    describe('Kanban Board', () => {
        describe('getKanbanBoard', () => {
            it('should return tasks grouped by status', async () => {
                mockPrismaService.task.findMany.mockResolvedValue([
                    { id: 't1', status: 'TODO' },
                    { id: 't2', status: 'IN_PROGRESS' },
                    { id: 't3', status: 'COMPLETED' },
                ]);

                const result = await service.getKanbanBoard('company-123');

                expect(result).toHaveProperty('TODO');
                expect(result).toHaveProperty('IN_PROGRESS');
                expect(result).toHaveProperty('COMPLETED');
            });
        });

        describe('reorderTask', () => {
            it('should update task position', async () => {
                mockPrismaService.task.findFirst.mockResolvedValue({ id: 'task-123' });
                mockPrismaService.task.update.mockResolvedValue({});

                await service.reorderTask('task-123', 'company-123', 'user-123', {
                    newPosition: 2,
                    newStatus: 'IN_PROGRESS',
                });

                expect(mockPrismaService.task.update).toHaveBeenCalled();
            });
        });
    });

    describe('Checklists', () => {
        describe('addChecklist', () => {
            it('should create checklist for task', async () => {
                mockPrismaService.task.findFirst.mockResolvedValue({ id: 'task-123' });
                mockPrismaService.taskChecklist.create.mockResolvedValue({
                    id: 'cl-123',
                    title: 'قائمة المهام الفرعية',
                });

                const result = await service.addChecklist('task-123', 'company-123', 'user-123', {
                    title: 'قائمة المهام الفرعية',
                });

                expect(result.id).toBe('cl-123');
            });
        });

        describe('addChecklistItem', () => {
            it('should add item to checklist', async () => {
                mockPrismaService.taskChecklist.findFirst = jest.fn().mockResolvedValue({
                    id: 'cl-123',
                    task: { companyId: 'company-123' },
                });
                mockPrismaService.taskChecklistItem.create.mockResolvedValue({
                    id: 'item-123',
                    text: 'عنصر جديد',
                });

                const result = await service.addChecklistItem('cl-123', 'company-123', 'user-123', {
                    text: 'عنصر جديد',
                });

                expect(result.id).toBe('item-123');
            });
        });

        describe('toggleChecklistItem', () => {
            it('should toggle item completion', async () => {
                mockPrismaService.taskChecklistItem.findFirst = jest.fn().mockResolvedValue({
                    id: 'item-123',
                    checklist: { task: { id: 'task-123', companyId: 'company-123' } },
                });
                mockPrismaService.taskChecklistItem.update.mockResolvedValue({
                    isCompleted: true,
                });
                mockPrismaService.taskChecklistItem.count.mockResolvedValue(5);
                mockPrismaService.task.update.mockResolvedValue({});

                await service.toggleChecklistItem('item-123', 'company-123', 'user-123', true);

                expect(mockPrismaService.taskChecklistItem.update).toHaveBeenCalledWith(
                    expect.objectContaining({
                        data: expect.objectContaining({ isCompleted: true }),
                    })
                );
            });
        });
    });

    describe('Comments', () => {
        describe('addComment', () => {
            it('should add comment to task', async () => {
                mockPrismaService.task.findFirst.mockResolvedValue({
                    id: 'task-123',
                    watchers: [],
                });
                mockPrismaService.taskComment.create.mockResolvedValue({
                    id: 'comment-123',
                    content: 'تعليق جديد',
                });

                const result = await service.addComment('task-123', 'company-123', 'user-123', {
                    content: 'تعليق جديد',
                });

                expect(result.id).toBe('comment-123');
            });
        });

        describe('deleteComment', () => {
            it('should delete own comment', async () => {
                mockPrismaService.taskComment.findFirst = jest.fn().mockResolvedValue({
                    id: 'comment-123',
                    userId: 'user-123',
                });
                mockPrismaService.taskComment.delete.mockResolvedValue({});

                await service.deleteComment('comment-123', 'company-123', 'user-123');

                expect(mockPrismaService.taskComment.delete).toHaveBeenCalled();
            });
        });
    });

    describe('Time Logging', () => {
        describe('addTimeLog', () => {
            it('should log time spent on task', async () => {
                mockPrismaService.task.findFirst.mockResolvedValue({ id: 'task-123' });
                mockPrismaService.taskTimeLog.create.mockResolvedValue({
                    id: 'log-123',
                    minutes: 120,
                });
                mockPrismaService.taskTimeLog.aggregate.mockResolvedValue({
                    _sum: { minutes: 180 },
                });
                mockPrismaService.task.update.mockResolvedValue({});

                const result = await service.addTimeLog('task-123', 'company-123', 'user-123', {
                    minutes: 120,
                    description: 'العمل على التقرير',
                });

                expect(result.minutes).toBe(120);
            });
        });
    });

    describe('Categories', () => {
        describe('getCategories', () => {
            it('should return all categories', async () => {
                mockPrismaService.taskCategory.findMany.mockResolvedValue([
                    { id: 'cat-1', name: 'تطوير' },
                    { id: 'cat-2', name: 'تصميم' },
                ]);

                const result = await service.getCategories('company-123');

                expect(result).toHaveLength(2);
            });
        });

        describe('createCategory', () => {
            it('should create category', async () => {
                mockPrismaService.taskCategory.create.mockResolvedValue({
                    id: 'cat-123',
                    name: 'تسويق',
                    color: '#FF5733',
                });

                const result = await service.createCategory('company-123', {
                    name: 'تسويق',
                    color: '#FF5733',
                });

                expect(result.id).toBe('cat-123');
            });
        });
    });

    describe('Task Stats', () => {
        describe('getTaskStats', () => {
            it('should return task statistics', async () => {
                mockPrismaService.task.count
                    .mockResolvedValueOnce(100) // Total
                    .mockResolvedValueOnce(20)  // Todo
                    .mockResolvedValueOnce(30)  // In Progress
                    .mockResolvedValueOnce(50)  // Completed
                    .mockResolvedValueOnce(5);  // Overdue

                const result = await service.getTaskStats('company-123');

                expect(result).toHaveProperty('total');
                expect(result).toHaveProperty('completed');
                expect(result).toHaveProperty('overdue');
            });
        });
    });
});
