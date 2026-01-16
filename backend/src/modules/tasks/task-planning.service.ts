import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * Task Planning Service
 * خدمة التخطيط والتحليل للمهام
 */
@Injectable()
export class TaskPlanningService {
    constructor(private prisma: PrismaService) { }

    /**
     * Get timeline view of tasks
     * عرض الجدول الزمني للمهام
     */
    async getTimelineView(
        companyId: string,
        options?: {
            startDate?: string;
            endDate?: string;
            groupBy?: 'assignee' | 'category' | 'priority' | 'status';
            zoom?: 'day' | 'week' | 'month';
        }
    ) {
        const startDate = options?.startDate
            ? new Date(options.startDate)
            : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const endDate = options?.endDate
            ? new Date(options.endDate)
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        const groupBy = options?.groupBy || 'assignee';
        const zoom = options?.zoom || 'week';

        const tasks = await this.prisma.task.findMany({
            where: {
                companyId,
                status: { notIn: ['CANCELLED', 'DELETED' as any] },
                OR: [
                    { dueDate: { gte: startDate, lte: endDate } },
                    { startDate: { gte: startDate, lte: endDate } },
                    {
                        AND: [
                            { startDate: { lte: startDate } },
                            { dueDate: { gte: endDate } },
                        ],
                    },
                ],
            },
            include: {
                assignee: { select: { id: true, firstName: true, lastName: true, avatar: true } },
                category: { select: { id: true, name: true, color: true } },
                blockedBy: true,
                blocks: true,
            },
            orderBy: [{ startDate: 'asc' }, { dueDate: 'asc' }],
        });

        // Group tasks based on groupBy parameter
        const groups: Record<string, any[]> = {};

        for (const task of tasks) {
            let groupKey: string;
            let groupLabel: string;
            let groupColor: string = '#6B7280';

            switch (groupBy) {
                case 'assignee':
                    groupKey = task.assigneeId || 'unassigned';
                    groupLabel = task.assignee
                        ? `${task.assignee.firstName} ${task.assignee.lastName}`
                        : 'غير مسند';
                    break;
                case 'category':
                    groupKey = task.categoryId || 'uncategorized';
                    groupLabel = task.category?.name || 'بدون تصنيف';
                    groupColor = task.category?.color || '#6B7280';
                    break;
                case 'priority':
                    groupKey = task.priority;
                    const priorityLabels: Record<string, string> = {
                        'URGENT': 'عاجل',
                        'HIGH': 'عالي',
                        'MEDIUM': 'متوسط',
                        'LOW': 'منخفض',
                    };
                    const priorityColors: Record<string, string> = {
                        'URGENT': '#DC2626',
                        'HIGH': '#EA580C',
                        'MEDIUM': '#2563EB',
                        'LOW': '#16A34A',
                    };
                    groupLabel = priorityLabels[task.priority] || task.priority;
                    groupColor = priorityColors[task.priority] || '#6B7280';
                    break;
                case 'status':
                    groupKey = task.status;
                    const statusLabels: Record<string, string> = {
                        'TODO': 'للعمل',
                        'IN_PROGRESS': 'جاري العمل',
                        'IN_REVIEW': 'قيد المراجعة',
                        'COMPLETED': 'مكتمل',
                    };
                    groupLabel = statusLabels[task.status] || task.status;
                    break;
                default:
                    groupKey = 'all';
                    groupLabel = 'الكل';
            }

            if (!groups[groupKey]) {
                groups[groupKey] = [];
            }

            groups[groupKey].push({
                id: task.id,
                title: task.title,
                start: task.startDate || task.createdAt,
                end: task.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                progress: task.progress,
                status: task.status,
                priority: task.priority,
                dependencies: task.blockedBy.map(d => d.blockingTaskId),
                groupKey,
                groupLabel,
                groupColor,
            });
        }

        // Convert to array format
        const timelineData = Object.entries(groups).map(([key, items]) => ({
            groupId: key,
            groupLabel: items[0]?.groupLabel || key,
            groupColor: items[0]?.groupColor || '#6B7280',
            tasks: items,
            taskCount: items.length,
        }));

        return {
            data: timelineData,
            meta: {
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                groupBy,
                zoom,
                totalTasks: tasks.length,
                totalGroups: timelineData.length,
            },
        };
    }

    /**
     * Get buffer/slack time analysis
     * تحليل وقت الاحتياط/الفراغ
     */
    async getBufferTime(companyId: string, taskId?: string) {
        const where: any = {
            companyId,
            status: { notIn: ['COMPLETED', 'CANCELLED', 'DELETED' as any] },
            dueDate: { not: null },
        };

        if (taskId) {
            where.id = taskId;
        }

        const tasks = await this.prisma.task.findMany({
            where,
            include: {
                assignee: { select: { id: true, firstName: true, lastName: true } },
                blockedBy: {
                    include: {
                        blockingTask: { select: { id: true, title: true, dueDate: true, status: true } },
                    },
                },
                blocks: {
                    include: {
                        blockedTask: { select: { id: true, title: true, dueDate: true, status: true } },
                    },
                },
            },
            orderBy: { dueDate: 'asc' },
        });

        const now = new Date();
        const analysis = tasks.map(task => {
            const dueDate = task.dueDate ? new Date(task.dueDate) : null;

            // Calculate time remaining
            const timeRemaining = dueDate
                ? Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                : null;

            // Estimate work remaining (simplified)
            const estimatedWorkDays = task.estimatedHours
                ? Math.ceil(task.estimatedHours / 8)
                : Math.ceil((100 - task.progress) / 25);

            // Calculate buffer
            const bufferDays = timeRemaining !== null
                ? timeRemaining - estimatedWorkDays
                : null;

            // Check blocking dependencies
            const blockingIssues = task.blockedBy
                .filter(dep => dep.blockingTask.status !== 'COMPLETED')
                .map(dep => ({
                    taskId: dep.blockingTask.id,
                    title: dep.blockingTask.title,
                    dueDate: dep.blockingTask.dueDate,
                }));

            // Determine risk level
            let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
            if (bufferDays !== null) {
                if (bufferDays < 0) riskLevel = 'CRITICAL';
                else if (bufferDays <= 1) riskLevel = 'HIGH';
                else if (bufferDays <= 3) riskLevel = 'MEDIUM';
            }
            if (blockingIssues.length > 0) {
                riskLevel = riskLevel === 'LOW' ? 'MEDIUM' : 'HIGH';
            }

            return {
                id: task.id,
                title: task.title,
                dueDate: task.dueDate,
                progress: task.progress,
                status: task.status,
                priority: task.priority,
                assignee: task.assignee,
                analysis: {
                    daysRemaining: timeRemaining,
                    estimatedWorkDays,
                    bufferDays,
                    riskLevel,
                    isOverdue: timeRemaining !== null && timeRemaining < 0,
                    hasBlockingDependencies: blockingIssues.length > 0,
                    blockingIssues,
                    blocksCount: task.blocks.length,
                },
            };
        });

        // Summary statistics
        const summary = {
            totalTasks: analysis.length,
            critical: analysis.filter(t => t.analysis.riskLevel === 'CRITICAL').length,
            high: analysis.filter(t => t.analysis.riskLevel === 'HIGH').length,
            medium: analysis.filter(t => t.analysis.riskLevel === 'MEDIUM').length,
            low: analysis.filter(t => t.analysis.riskLevel === 'LOW').length,
            overdue: analysis.filter(t => t.analysis.isOverdue).length,
            blocked: analysis.filter(t => t.analysis.hasBlockingDependencies).length,
            averageBufferDays: analysis.length > 0
                ? Math.round(analysis.reduce((sum, t) => sum + (t.analysis.bufferDays || 0), 0) / analysis.length)
                : 0,
        };

        return { data: analysis, summary };
    }

    /**
     * Get critical path analysis
     * تحليل المسار الحرج
     */
    async getCriticalPath(companyId: string, projectId?: string) {
        const where: any = {
            companyId,
            status: { notIn: ['CANCELLED', 'DELETED' as any] },
        };

        if (projectId) {
            where.projectId = projectId;
        }

        const tasks = await this.prisma.task.findMany({
            where,
            include: {
                assignee: { select: { id: true, firstName: true, lastName: true } },
                blockedBy: true,
                blocks: true,
                category: { select: { id: true, name: true, color: true } },
            },
        });

        // Build dependency graph
        const taskMap = new Map(tasks.map(t => [t.id, t]));
        const inDegree = new Map<string, number>();
        const outDegree = new Map<string, string[]>();

        for (const task of tasks) {
            if (!inDegree.has(task.id)) inDegree.set(task.id, 0);
            if (!outDegree.has(task.id)) outDegree.set(task.id, []);

            for (const dep of task.blockedBy) {
                inDegree.set(task.id, (inDegree.get(task.id) || 0) + 1);
                const blocking = outDegree.get(dep.blockingTaskId) || [];
                blocking.push(task.id);
                outDegree.set(dep.blockingTaskId, blocking);
            }
        }

        // Find start nodes (no dependencies)
        const startNodes = tasks.filter(t => (inDegree.get(t.id) || 0) === 0);

        // Find end nodes (no dependents)
        const endNodes = tasks.filter(t => (outDegree.get(t.id) || []).length === 0);

        // Calculate earliest start/finish times (forward pass)
        const earliestStart = new Map<string, number>();
        const earliestFinish = new Map<string, number>();
        const duration = (task: any) => task.estimatedHours || 8; // Default 8 hours

        // Topological sort + forward pass
        const queue = [...startNodes.map(t => t.id)];
        const processed = new Set<string>();

        for (const id of startNodes.map(t => t.id)) {
            earliestStart.set(id, 0);
            earliestFinish.set(id, duration(taskMap.get(id)));
        }

        while (queue.length > 0) {
            const current = queue.shift()!;
            if (processed.has(current)) continue;
            processed.add(current);

            const dependents = outDegree.get(current) || [];
            for (const depId of dependents) {
                const currentFinish = earliestFinish.get(current) || 0;
                const existingStart = earliestStart.get(depId) || 0;

                if (currentFinish > existingStart) {
                    earliestStart.set(depId, currentFinish);
                    earliestFinish.set(depId, currentFinish + duration(taskMap.get(depId)));
                }

                queue.push(depId);
            }
        }

        // Find project duration
        let projectDuration = 0;
        for (const finish of earliestFinish.values()) {
            if (finish > projectDuration) projectDuration = finish;
        }

        // Calculate latest start/finish times (backward pass)
        const latestFinish = new Map<string, number>();
        const latestStart = new Map<string, number>();

        for (const id of endNodes.map(t => t.id)) {
            latestFinish.set(id, projectDuration);
            latestStart.set(id, projectDuration - duration(taskMap.get(id)));
        }

        // Calculate slack and identify critical path
        const criticalPath: string[] = [];
        const tasksWithSlack = tasks.map(task => {
            const es = earliestStart.get(task.id) || 0;
            const ef = earliestFinish.get(task.id) || 0;
            const lf = latestFinish.get(task.id) || projectDuration;
            const ls = latestStart.get(task.id) || projectDuration - duration(task);
            const slack = ls - es;
            const isCritical = slack === 0 && processed.has(task.id);

            if (isCritical) {
                criticalPath.push(task.id);
            }

            return {
                id: task.id,
                title: task.title,
                status: task.status,
                priority: task.priority,
                assignee: task.assignee,
                category: task.category,
                duration: duration(task),
                earliestStart: es,
                earliestFinish: ef,
                latestStart: ls,
                latestFinish: lf,
                slack,
                isCritical,
                dependencies: task.blockedBy.map(d => d.blockingTaskId),
                dependents: task.blocks.map(d => d.blockedTaskId),
            };
        });

        // Sort critical path by order
        const sortedCriticalPath = tasksWithSlack
            .filter(t => t.isCritical)
            .sort((a, b) => a.earliestStart - b.earliestStart);

        return {
            criticalPath: sortedCriticalPath,
            allTasks: tasksWithSlack,
            summary: {
                totalTasks: tasks.length,
                criticalTasks: sortedCriticalPath.length,
                projectDurationHours: projectDuration,
                projectDurationDays: Math.ceil(projectDuration / 8),
                startNodes: startNodes.map(t => ({ id: t.id, title: t.title })),
                endNodes: endNodes.map(t => ({ id: t.id, title: t.title })),
                averageSlackHours: tasksWithSlack.length > 0
                    ? Math.round(tasksWithSlack.reduce((sum, t) => sum + t.slack, 0) / tasksWithSlack.length)
                    : 0,
            },
        };
    }
}
